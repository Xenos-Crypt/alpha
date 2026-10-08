#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "parser.h"
#include "repl.h"

/* This prototype does not free the token stream: AST nodes borrow their
 * text/string pointers directly from tokens rather than duplicating them,
 * and the whole process exits right after the program runs, so the OS
 * reclaims everything. */

typedef struct {
    TokenList tokens;
    int pos;
} Parser;

static Token *peek(Parser *p) { return &p->tokens.items[p->pos]; }
static Token *advance(Parser *p) { return &p->tokens.items[p->pos++]; }
static int check(Parser *p, TokenType type) { return peek(p)->type == type; }

static void fatal_parse_error(int line, const char *fmt, ...) __attribute__((noreturn));
static void fatal_parse_error(int line, const char *fmt, ...) {
    va_list args;
    va_start(args, fmt);
    fprintf(stderr, "Line %d: ", line);
    vfprintf(stderr, fmt, args);
    fprintf(stderr, "\n");
    va_end(args);
    coral_fatal();
}

static Token *expect(Parser *p, TokenType type) {
    if (check(p, type)) return advance(p);
    Token *t = peek(p);
    fatal_parse_error(t->line, "expected %s here, but found %s instead",
                       token_type_name(type), token_type_name(t->type));
    return NULL; /* unreachable */
}

/* A block-opening construct (a function definition, 'if ...', 'else')
 * must be followed by a line indented deeper than itself. */
static void require_body(Parser *p, Token *header_tok, const char *construct) {
    if (check(p, TOK_EOF) || peek(p)->indent <= header_tok->indent) {
        fatal_parse_error(header_tok->line,
                           "'%s' needs an indented block after it — the next line needs to start further right than this one",
                           construct);
    }
}

static Node *parse_statement(Parser *p);
static Node *parse_expression(Parser *p);
static Node *parse_expr_or_assignment(Parser *p);
static Node *parse_equality(Parser *p);
static Node *parse_now_repeat(Parser *p, NodeList body, Node *setup_stmt);

/* Consumes statements as long as they're indented deeper than
 * header_indent. Siblings don't need to match each other's exact column —
 * only each be deeper than the header — which is what makes this more
 * forgiving than Python's indentation rules.
 *
 * Also assembles step chains: `STEP (then STEP)*`, where the first step
 * has no leading 'then' and every step after it does. chain_start tracks
 * the index (into stmts) where the run of steps currently building up
 * began -- it resets to "right here" every time a non-chained statement is
 * parsed, and stays put across chained ones, so it always marks the start
 * of the maximal run of then-steps ending at the statement just parsed.
 * A 'now repeat ...' line claims that whole run as its loop body (see
 * parse_now_repeat) instead of leaving those statements in this block --
 * if the run is empty (nothing chained right before it), that's the
 * "syntax error, empty body" case the addendum calls for. A step chain
 * NOT followed by 'now repeat' is left completely alone here: its steps
 * already sit in stmts as ordinary statements that just run once, in
 * order -- 'then' is otherwise a no-op to this loop. */
static NodeList parse_block_body(Parser *p, int header_indent) {
    NodeList stmts = {0};
    int chain_start = 0;
    while (!check(p, TOK_EOF) && peek(p)->indent > header_indent) {
        if (check(p, TOK_NOW)) {
            if (chain_start == stmts.count) {
                fatal_parse_error(peek(p)->line,
                    "'now repeat' needs a step chain (a statement, then any number of 'then ...' steps) right before it");
            }
            NodeList body = {0};
            for (int i = chain_start; i < stmts.count; i++) {
                nodelist_push(&body, stmts.items[i]);
            }
            Node *setup_stmt = chain_start > 0 ? stmts.items[chain_start - 1] : NULL;
            stmts.count = chain_start; /* the chain's steps now belong to the loop body, not this block directly */
            nodelist_push(&stmts, parse_now_repeat(p, body, setup_stmt));
            chain_start = stmts.count;
            continue;
        }
        int chained = check(p, TOK_THEN);
        if (chained) {
            if (stmts.count == chain_start) {
                fatal_parse_error(peek(p)->line, "'then' needs a preceding step to continue here");
            }
            advance(p);
        }
        nodelist_push(&stmts, parse_statement(p));
        if (!chained) chain_start = stmts.count - 1;
    }
    return stmts;
}

/* No 'fn' keyword: `add a, b = a + b` defines a function (bare
 * comma-separated params before '='), `name = expr` assigns a variable
 * (zero params before '='). parse_ident_statement below is what tells
 * these apart via one token of lookahead. A function's body is either
 * the single expression right after '=' on the same line (implicitly
 * returned — see interp.c's tail-value propagation), or, if '=' has
 * nothing after it on that line, the indented block that follows, whose
 * own last-executed expression becomes the return value the same way.
 * Zero-parameter functions aren't expressible yet — with no params to
 * distinguish it from a plain assignment, `greet = ...` just looks like
 * assigning to a variable named greet. Not hit by any real program yet;
 * would need its own marker (e.g. requiring `greet() = ...`) if it comes
 * up later. */
static Node *parse_func_def(Parser *p) {
    Token *name_tok = advance(p);

    char **params = NULL;
    int param_count = 0, param_cap = 0;
    for (;;) {
        Token *param_tok = expect(p, TOK_IDENT);
        if (param_count == param_cap) {
            param_cap = param_cap == 0 ? 4 : param_cap * 2;
            params = realloc(params, sizeof(char *) * param_cap);
        }
        params[param_count++] = param_tok->text;
        if (!check(p, TOK_COMMA)) break;
        advance(p);
    }

    /* '=' is only needed for the same-line single-expression shorthand
     * (`add a, b = a + b`) — an indented block needs nothing after the
     * params at all, the same way `if condition` needs no trailing ':'. */
    if (check(p, TOK_EQ)) {
        advance(p);
        if (!check(p, TOK_EOF) && peek(p)->line == name_tok->line) {
            Node *expr = parse_expression(p);
            NodeList body = {0};
            nodelist_push(&body, make_expr_stmt(expr, expr->line));
            return make_func_decl(name_tok->text, params, param_count, body, name_tok->line);
        }
        /* '=' with nothing after it on the same line — falls through to
         * the indented-block form below, same as omitting '=' entirely. */
    }

    require_body(p, name_tok, name_tok->text);
    NodeList body = parse_block_body(p, name_tok->indent);
    return make_func_decl(name_tok->text, params, param_count, body, name_tok->line);
}

/* Dispatches on one token of lookahead past the leading name: another
 * bare name means a function definition (`add a, b = ...`); anything
 * else (an '=', a '(', an operator, end of statement) falls back to the
 * ordinary expression/assignment path, which already handles
 * `name = expr` and bare expression statements like `greet("Ari")`. */
static Node *parse_ident_statement(Parser *p) {
    Token *next = &p->tokens.items[p->pos + 1];
    if (next->type == TOK_IDENT) {
        return parse_func_def(p);
    }
    return parse_expr_or_assignment(p);
}

static Node *parse_if(Parser *p) {
    Token *if_tok = advance(p);
    int header_indent = if_tok->indent;

    Node *cond = parse_expression(p);

    /* One-line form: `if COND then ACTION [else ACTION]`. A 'then' on the
     * SAME line as the condition means this; a standalone 'then' starting
     * its own fresh line is a step-chain step (unrelated construct) --
     * confirmed directly with the user these really are the same word
     * used the same way ("if X, then Y" / "do this, then do this"), and
     * position (same-line vs standalone) is the only thing that tells
     * them apart, not two different keyword meanings. */
    if (check(p, TOK_THEN) && peek(p)->line == if_tok->line) {
        advance(p);
        NodeList then_body = {0};
        nodelist_push(&then_body, parse_statement(p));
        int branch_cap = 2, branch_count = 1;
        IfBranch *branches = malloc(sizeof(IfBranch) * branch_cap);
        branches[0] = (IfBranch){cond, then_body};
        if (check(p, TOK_ELSE)) {
            advance(p);
            NodeList else_body = {0};
            nodelist_push(&else_body, parse_statement(p));
            branches[branch_count++] = (IfBranch){NULL, else_body};
        }
        return make_if(branches, branch_count, if_tok->line);
    }

    int branch_cap = 2, branch_count = 0;
    IfBranch *branches = malloc(sizeof(IfBranch) * branch_cap);

    require_body(p, if_tok, "if");
    NodeList body = parse_block_body(p, header_indent);
    branches[branch_count++] = (IfBranch){cond, body};

    while (check(p, TOK_ELSE) && peek(p)->indent == header_indent) {
        Token *else_tok = advance(p);
        if (branch_count == branch_cap) {
            branch_cap *= 2;
            branches = realloc(branches, sizeof(IfBranch) * branch_cap);
        }
        if (check(p, TOK_IF)) {
            advance(p);
            Node *cond2 = parse_expression(p);
            require_body(p, else_tok, "else if");
            NodeList body2 = parse_block_body(p, header_indent);
            branches[branch_count++] = (IfBranch){cond2, body2};
        } else {
            require_body(p, else_tok, "else");
            NodeList else_body = parse_block_body(p, header_indent);
            branches[branch_count++] = (IfBranch){NULL, else_body};
            break;
        }
    }
    return make_if(branches, branch_count, if_tok->line);
}

/* Shared by the bare 'return VALUE' keyword and its bracket-dot
 * '[.return]' alias below -- header_tok is whichever leading token
 * establishes the line to check "is there a same-line value" against. */
static Node *parse_return_body(Parser *p, Token *header_tok) {
    Node *expr = NULL;
    /* A value only belongs to this return if it's on the same physical
     * line — otherwise it's the start of whatever statement comes next. */
    if (!check(p, TOK_EOF) && peek(p)->line == header_tok->line) {
        expr = parse_expression(p);
    }
    return make_return(expr, header_tok->line);
}

static Node *parse_return(Parser *p) {
    Token *ret_tok = advance(p);
    return parse_return_body(p, ret_tok);
}

static Node *parse_display(Parser *p) {
    Token *display_tok = advance(p);
    NodeList args = {0};
    nodelist_push(&args, parse_expression(p));
    while (check(p, TOK_COMMA)) {
        advance(p);
        nodelist_push(&args, parse_expression(p));
    }
    return make_display(args, display_tok->line);
}

/* repeat count times [if condition] <indented block>. The 'if', when
 * present, is checked once before the loop starts, not once per
 * iteration -- "repeat X 20 times if condition" reads as "if condition,
 * (then) repeat X 20 times", not "keep re-checking condition on every one
 * of the 20 passes". A false condition skips the block entirely (0 runs);
 * there's no loop variable, unlike a for-each -- this is a fixed-count
 * repeat, not iteration over anything. */
/* Shared by the bare 'repeat N times' keyword and its bracket-dot
 * '[.repeat]' alias below -- header_tok is whichever leading token's
 * line/indent the body and same-line 'if' check against. Deliberately
 * NOT how 'now repeat until ...' works -- there, 'now' is the word that
 * starts the statement (repeat is just the second word of that fixed
 * phrase), so 'now' is what could get bracketed, never 'repeat' itself;
 * confirmed with the user this fixed-count form is the only 'repeat'
 * that ever gets '[.repeat]' treatment. */
static Node *parse_repeat_body(Parser *p, Token *header_tok) {
    int header_indent = header_tok->indent;

    Node *count = parse_expression(p);
    expect(p, TOK_TIMES);

    Node *condition = NULL;
    if (check(p, TOK_IF)) {
        advance(p);
        condition = parse_expression(p);
    }

    require_body(p, header_tok, "repeat");
    NodeList body = parse_block_body(p, header_indent);
    return make_repeat(count, condition, body, header_tok->line);
}

static Node *parse_repeat(Parser *p) {
    Token *repeat_tok = advance(p);
    return parse_repeat_body(p, repeat_tok);
}

/* Parses "[ . KEYWORD ]" -- the shared shape behind [.create]/[.change]
 * (and [.count], once loops land). Returns the opening '[' token, for its
 * line number, having consumed all four tokens. */
static Token *expect_bracket_dot(Parser *p, TokenType keyword_type) {
    Token *open = expect(p, TOK_LBRACKET);
    expect(p, TOK_DOT);
    expect(p, keyword_type);
    expect(p, TOK_RBRACKET);
    return open;
}

/* [.repeat] N times [if COND] -- bracket-dot alias for the bare 'repeat'
 * keyword above, same ND_REPEAT node either way. Only this fixed-count
 * form ever gets bracketed -- 'now repeat until ...'/'now repeat
 * {arr[.list]} until ...' keep 'repeat' bare, since there 'now' is the
 * word that starts the statement. */
static Node *parse_bracket_repeat(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_REPEAT);
    return parse_repeat_body(p, open);
}

/* [.return] VALUE -- bracket-dot alias for the bare 'return' keyword,
 * same ND_RETURN node either way. [.report] VALUE (see parse_report
 * below) does the exact same job with a different word; both are kept,
 * same as how [.change]/'=' and 'display'/[.display] both still work. */
static Node *parse_bracket_return(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_RETURN);
    return parse_return_body(p, open);
}

/* {name} / {name[N]} / {name[.count]} / {name[.first]} / {name[.last]} /
 * {name[.random]} / {name[.list]} / {name.field} -- the mandatory "read
 * a value" wrapper. .count desugars straight to a call of the existing
 * `length` builtin (pure parser-level sugar, zero interpreter changes).
 * .first/.last/.random each desugar to an ND_INDEX -- the actual FIRST/
 * LAST/a random ELEMENT, not an index number (an earlier version of
 * .last returned the last valid index instead, matching .count exactly
 * in a 1-based world -- redefined at the user's request, since always
 * needing a double index like {arr[{arr[.last]}]} just to reach the
 * element itself was the whole reason to want this sugar). .list is
 * genuinely new surface, not sugar -- see ND_LIST_READ. A bare '.field'
 * (the dot sitting OUTSIDE any '[...]', unlike these which always sit
 * INSIDE one) reads an object's field -- see ND_FIELD_ACCESS. Both
 * kinds of postfix chain freely and in any order, so {data[1].name} and
 * {person.pets[1]} both just work. */
static Node *parse_brace_read(Parser *p) {
    expect(p, TOK_LBRACE);
    Token *name_tok = expect(p, TOK_IDENT);
    Node *expr = make_identifier(name_tok->text, name_tok->line);
    /* loops, so chained indexing like {grid[1][1]} (a 2D access) works,
     * mirroring parse_call's postfix '[' loop above */
    while (check(p, TOK_LBRACKET) || check(p, TOK_DOT)) {
        if (check(p, TOK_DOT)) {
            advance(p);
            Token *field_tok = expect(p, TOK_IDENT);
            expr = make_field_access(expr, field_tok->text, name_tok->line);
            continue;
        }
        advance(p);
        if (check(p, TOK_DOT)) {
            advance(p); /* consume the '.' itself -- these all lex as TWO tokens, not one */
            if (check(p, TOK_COUNT)) {
                advance(p);
                expect(p, TOK_RBRACKET);
                NodeList args = {0};
                nodelist_push(&args, expr);
                expr = make_call("length", args, name_tok->line);
            } else if (check(p, TOK_FIRST)) {
                advance(p);
                expect(p, TOK_RBRACKET);
                expr = make_index(expr, make_number(1, name_tok->line), name_tok->line);
            } else if (check(p, TOK_LAST)) {
                advance(p);
                expect(p, TOK_RBRACKET);
                NodeList args = {0};
                nodelist_push(&args, expr);
                Node *length_call = make_call("length", args, name_tok->line);
                expr = make_index(expr, length_call, name_tok->line);
            } else if (check(p, TOK_RANDOM)) {
                advance(p);
                expect(p, TOK_RBRACKET);
                NodeList len_args = {0};
                nodelist_push(&len_args, expr);
                Node *length_call = make_call("length", len_args, name_tok->line);
                NodeList rand_args = {0};
                nodelist_push(&rand_args, length_call);
                Node *rand_call = make_call("randomInt", rand_args, name_tok->line);
                expr = make_index(expr, rand_call, name_tok->line);
            } else if (check(p, TOK_LIST)) {
                /* {name[.list]} -- NOT sugar for an existing builtin like
                 * .count/.last are, since the cursor is live per-array
                 * mutable state (see ArrayObj.list_cursor), not a pure
                 * function of the array's current contents. */
                advance(p);
                expect(p, TOK_RBRACKET);
                expr = make_list_read(expr, name_tok->line);
            } else {
                fatal_parse_error(peek(p)->line, "expected '.count', '.first', '.last', '.random', or '.list' here");
            }
        } else {
            Node *idx = parse_expression(p);
            expect(p, TOK_RBRACKET);
            expr = make_index(expr, idx, name_tok->line);
        }
    }
    expect(p, TOK_RBRACE);
    return expr;
}

/* The closing line of a step chain -- 'body' is the run of then-steps
 * parse_block_body already popped out for us, and 'setup_stmt' (possibly
 * NULL) is whatever statement sat immediately before that run, needed
 * only by the 'count' flavor to find its counter variable. All three
 * flavors are checked before every pass, including the very first --
 * confirmed with the user this is checked-before, not do-until: if the
 * stopping condition already holds before the loop starts, the body runs
 * zero times even though it's written above the 'now repeat' line. */
static Node *parse_now_repeat(Parser *p, NodeList body, Node *setup_stmt) {
    Token *now_tok = advance(p); /* 'now' */
    expect(p, TOK_REPEAT);

    if (check(p, TOK_COUNT)) {
        advance(p);
        parse_expression(p); /* START -- restated for readability, unused; see parse_count_setup */
        expect(p, TOK_TO);
        Node *end = parse_expression(p);
        if (setup_stmt == NULL || setup_stmt->type != ND_ASSIGN) {
            fatal_parse_error(now_tok->line,
                "'now repeat count' needs a '[.count] START to END and put it into VAR' line right before its step chain");
        }
        return make_now_repeat(NOW_REPEAT_COUNT, NULL, NULL, setup_stmt->as.assign.name, end, body, now_tok->line);
    }

    if (check(p, TOK_LBRACE)) {
        Node *list_expr = parse_brace_read(p);
        if (list_expr->type != ND_LIST_READ) {
            fatal_parse_error(now_tok->line, "expected '{name[.list]}' here");
        }
        expect(p, TOK_UNTIL);
        Node *cond = parse_expression(p);
        return make_now_repeat(NOW_REPEAT_LIST_UNTIL, cond, list_expr->as.list_read.target, NULL, NULL, body, now_tok->line);
    }

    expect(p, TOK_UNTIL);
    Node *cond = parse_expression(p);
    return make_now_repeat(NOW_REPEAT_UNTIL, cond, NULL, NULL, NULL, body, now_tok->line);
}

/* True (without consuming anything) if the tokens starting here are
 * exactly '[' '.' keyword ']' -- the same shape expect_bracket_dot
 * consumes, used where a bracket-dot phrase is OPTIONAL and the caller
 * needs to know it's coming before committing to parse it (e.g. a task
 * with no params has no '[.using]' clause at all). */
static int peek_bracket_dot(Parser *p, TokenType keyword) {
    return check(p, TOK_LBRACKET) &&
           p->tokens.items[p->pos + 1].type == TOK_DOT &&
           p->tokens.items[p->pos + 2].type == keyword;
}

/* Greedily consumes one or more TOK_IDENT tokens on the same source
 * line as `line`, joining them with single spaces into one malloc'd
 * name -- lets a task's name read as an ordinary multi-word English
 * phrase ("make sandwich") instead of a joined-together identifier
 * ("makeSandwich"). Stops at the first token that isn't a same-line
 * TOK_IDENT, which is always unambiguous: every keyword that can follow
 * a task's name ('[.using]', or nothing before the body/end of line) is
 * a bracket-dot phrase, never a bare word that could be mistaken for
 * another word of the name. */
static char *parse_multiword_name(Parser *p, int line) {
    size_t len = 0, cap = 32;
    char *name = malloc(cap);
    name[0] = '\0';
    int first = 1;
    while (check(p, TOK_IDENT) && peek(p)->line == line) {
        Token *word = advance(p);
        size_t word_len = strlen(word->text);
        size_t needed = len + word_len + (first ? 0 : 1) + 1;
        if (needed > cap) {
            while (needed > cap) cap *= 2;
            name = realloc(name, cap);
        }
        if (!first) name[len++] = ' ';
        memcpy(name + len, word->text, word_len);
        len += word_len;
        name[len] = '\0';
        first = 0;
    }
    if (first) {
        fatal_parse_error(line, "expected a name here");
    }
    return name;
}

/* [.create] name -- declares an empty variable, and only that. Holds
 * nil until something is put into it; reading it before that warns
 * rather than crashing (see interp.c's ND_IDENTIFIER case) -- confirmed
 * directly with the user as the wanted behavior, not silently-empty and
 * not fatal. */
static Node *parse_create(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_CREATE);
    Token *name_tok = expect(p, TOK_IDENT);
    return make_assign(name_tok->text, make_nil(open->line), open->line);
}

/* [.update] VALUE be called name -- declares a variable WITH an initial
 * value, or reassigns it if 'name' already exists ('make VALUE be
 * called name' always could double as either, since env_assign just
 * updates an existing binding in place rather than requiring a fresh
 * one -- see value.c). This used to be a separate bare 'make VALUE be
 * called name' keyword; at the user's request 'make' has been fully
 * retired (it's not a keyword at all anymore -- lexes as a plain
 * TOK_IDENT, usable as an ordinary word in a task name or anywhere
 * else) and its job split into its own bracket-dot keyword here, kept
 * deliberately separate from [.create] (which only ever declares empty)
 * rather than folded into it -- [.create] name and [.update] VALUE be
 * called name are two different jobs, not two shapes of the same one.
 * Every existing example that used bare 'make' has been rewritten to
 * '[.update]'. */
static Node *parse_update(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_UPDATE);
    Node *value = parse_expression(p);
    expect(p, TOK_BE);
    expect(p, TOK_CALLED);
    Token *name_tok = expect(p, TOK_IDENT);
    return make_assign(name_tok->text, value, open->line);
}

/* [.task] name words [.using] param1, param2 -- function declaration,
 * header + indented block (same shape as if/now repeat: no colon, body
 * follows on indented lines). The leading '[.task]' keyword is itself
 * the disambiguator (unlike the older bare `name param = expr` form,
 * which needs at least one param just to tell a function def apart from
 * a plain assignment -- see parse_func_def above), so a zero-param
 * function is expressible here too: '[.task] name' with no '[.using]'
 * clause at all. The name can be several plain words in a row (see
 * parse_multiword_name) -- reads as an ordinary English phrase ("make
 * sandwich") rather than a joined-together identifier ("makeSandwich").
 * Params themselves are bare names, not {braced} -- consistent with
 * every other spot that declares a new binding ([.create] name,
 * [.update] VALUE be called name), where {} is reserved for *reading* a
 * value, never for naming one. '[.using]' is deliberately the same word the
 * call site uses ([.run] name words [.using] args) -- "this task uses
 * bread and cheese" / "run make sandwich using wheat and cheddar" is one
 * consistent idea, not two unrelated keywords. */
static Node *parse_task_def(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_TASK);
    char *name = parse_multiword_name(p, open->line);

    char **params = NULL;
    int param_count = 0, param_cap = 0;
    if (peek_bracket_dot(p, TOK_USING)) {
        expect_bracket_dot(p, TOK_USING);
        for (;;) {
            Token *param_tok = expect(p, TOK_IDENT);
            if (param_count == param_cap) {
                param_cap = param_cap == 0 ? 4 : param_cap * 2;
                params = realloc(params, sizeof(char *) * param_cap);
            }
            params[param_count++] = param_tok->text;
            if (!check(p, TOK_COMMA)) break;
            advance(p);
        }
    }

    require_body(p, open, name);
    NodeList body = parse_block_body(p, open->indent);
    return make_func_decl(name, params, param_count, body, open->line);
}

/* [.report] VALUE -- returns VALUE from the enclosing function. Same
 * ND_RETURN node the older bare 'return VALUE' keyword already produces
 * (see parse_return below) -- this is purely new surface syntax joining
 * the [.create]/[.change] bracket-dot family, not a new interpreter
 * concept. Both spellings keep working side by side, same as how
 * [.change] and the older bare '=' both still work. */
static Node *parse_report(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_REPORT);
    Node *expr = NULL;
    if (!check(p, TOK_EOF) && peek(p)->line == open->line) {
        expr = parse_expression(p);
    }
    return make_return(expr, open->line);
}

/* [.display] X, Y, ... -- joins the [.create]/[.change]/[.task]/[.report]
 * bracket-dot family, producing the exact same ND_DISPLAY node the older
 * bare 'display' keyword does. Both spellings keep working side by side,
 * same as [.change]/'='. */
static Node *parse_bracket_display(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_DISPLAY);
    NodeList args = {0};
    nodelist_push(&args, parse_expression(p));
    while (check(p, TOK_COMMA)) {
        advance(p);
        nodelist_push(&args, parse_expression(p));
    }
    return make_display(args, open->line);
}

/* [.change] {target} to VALUE -- assignment/mutation, target is {name} or
 * {name[N]}. Dispatches to a plain assign or an index-assign depending on
 * what parse_brace_read actually produced -- the exact same dispatch
 * parse_expr_or_assignment below already does for the older `=` form. */
static Node *parse_change(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_CHANGE);

    /* '[.change] "id" to VALUE' -- a UI element, referenced by its
     * literal string id (never a {}-wrapped Coral variable -- an
     * element's id was never a Coral binding, so {} would try, and
     * fail, to look one up), switching which catalog design it renders
     * with. Desugars to a call of the uiSetDesign builtin, the same
     * relationship 'add VALUE to {array}' has to 'append'. Checked
     * before parse_brace_read below, which would otherwise choke
     * expecting '{'. */
    if (check(p, TOK_STRING)) {
        Token *id_tok = advance(p);
        expect(p, TOK_TO);
        Node *value = parse_expression(p);
        NodeList args = {0};
        nodelist_push(&args, make_string(id_tok->string, id_tok->line));
        nodelist_push(&args, value);
        return make_expr_stmt(make_call("uiSetDesign", args, open->line), open->line);
    }

    Node *target = parse_brace_read(p);
    expect(p, TOK_TO);
    Node *value = parse_expression(p);
    if (target->type == ND_IDENTIFIER) {
        return make_assign(target->as.identifier.name, value, open->line);
    }
    if (target->type == ND_INDEX) {
        return make_index_assign(target->as.index.target, target->as.index.index, value, open->line);
    }
    if (target->type == ND_FIELD_ACCESS) {
        return make_field_assign(target->as.field_access.target, target->as.field_access.field, value, open->line);
    }
    fatal_parse_error(open->line, "'[.change]' needs a plain {name}, {name[index]}, or {name.field} here");
    return NULL; /* unreachable */
}

/* [.delete] {name[index]} -- removes that item from the array, shifting
 * everything after it down one slot (see interp.c's ND_INDEX_DELETE).
 * Always position-based (never "find this value and remove it") --
 * confirmed directly with the user. Only accepts an indexed target, not
 * a plain {name} or {name.field} -- deleting a whole variable or object
 * field isn't what this does (there's nothing to shift for those). Since
 * .first/.last/.random all desugar to an ND_INDEX at parse time (see
 * parse_brace_read), {name[.first]}/{name[.last]}/{name[.random]} all
 * work here too, deleting by position exactly like a literal {name[N]}
 * would -- not by matching the value they'd read as. */
static Node *parse_delete(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_DELETE);
    Node *target = parse_brace_read(p);
    if (target->type == ND_INDEX) {
        return make_index_delete(target->as.index.target, target->as.index.index, open->line);
    }
    fatal_parse_error(open->line, "'[.delete]' needs an indexed spot like {name[index]} here");
    return NULL; /* unreachable */
}

/* [.remove] EXPR -- removes a Creal UI element by id, sugar for a call
 * of the new `uiRemoveElement` builtin (same relationship '[.change]
 * "id" to [.designName]' has to `uiSetDesign`). Deliberately a plain
 * EXPR, not a bracketed string like [.change]'s id target -- unlike
 * that case, the id here is almost always a runtime value (e.g. a
 * closed tab's own stored {closing.tabId}), not a source-level literal,
 * so this needs the full expression grammar ({name} reads included),
 * not just a bare string token. */
static Node *parse_remove(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_REMOVE);
    Node *target = parse_expression(p);
    NodeList args = {0};
    nodelist_push(&args, target);
    return make_expr_stmt(make_call("uiRemoveElement", args, open->line), open->line);
}

/* add VALUE to {array} -- append, sugar for a call of the existing
 * `append` builtin, wrapped as a statement the same way a bare call
 * already is in parse_expr_or_assignment. */
static Node *parse_add(Parser *p) {
    Token *add_tok = advance(p);
    Node *value = parse_expression(p);
    expect(p, TOK_TO);
    Node *array_expr = parse_brace_read(p);
    NodeList args = {0};
    nodelist_push(&args, array_expr);
    nodelist_push(&args, value);
    Node *call = make_call("append", args, add_tok->line);
    return make_expr_stmt(call, add_tok->line);
}

/* [.count] START to END and put it into VAR -- the setup line that must
 * run once, immediately before a step chain closed by 'now repeat count
 * START to END' (see parse_now_repeat). Pure sugar for `make START be
 * called VAR`: END is only read here so the line reads naturally as
 * "count START to END" -- it's never used, since the loop that actually
 * walks the range is the closing 'now repeat count START to END' line,
 * which needs its own copy of END anyway (the range is deliberately
 * stated in both places, not a typo to collapse -- see the addendum).
 * Because this desugars to a plain ND_ASSIGN, an ordinary `make START be
 * called VAR` line works exactly as well as a setup line -- not a bug,
 * just an honest consequence of it being pure sugar.
 *
 * START/END are parsed at parse_equality, not the full parse_expression --
 * 'and' is both this line's fixed glue word and the real logical-and
 * operator (see parse_and), so letting END parse at full expression
 * precedence would swallow the literal 'and' right after it as an
 * operator and then choke trying to parse 'put' as its right-hand side. */
static Node *parse_count_setup(Parser *p) {
    Token *open = expect_bracket_dot(p, TOK_COUNT);
    Node *start = parse_equality(p);
    expect(p, TOK_TO);
    parse_equality(p); /* END -- parsed and discarded, see comment above */
    expect(p, TOK_AND);
    expect(p, TOK_PUT);
    expect(p, TOK_IT);
    expect(p, TOK_INTO);
    Token *var_tok = expect(p, TOK_IDENT);
    return make_assign(var_tok->text, start, open->line);
}

/* A statement starting with '[' is either a dot-command ([.create]/
 * [.change]/[.count]) or just a plain array literal appearing bare as a
 * statement (rare, but parse_expr_or_assignment -> parse_primary's
 * existing TOK_LBRACKET case already handles that generically, so just
 * fall through to it when the token after '[' isn't a '.'). */
static Node *parse_bracket_statement(Parser *p) {
    if (p->tokens.items[p->pos + 1].type == TOK_DOT) {
        TokenType keyword = p->tokens.items[p->pos + 2].type;
        if (keyword == TOK_CREATE) return parse_create(p);
        if (keyword == TOK_UPDATE) return parse_update(p);
        if (keyword == TOK_CHANGE) return parse_change(p);
        if (keyword == TOK_DELETE) return parse_delete(p);
        if (keyword == TOK_REMOVE) return parse_remove(p);
        if (keyword == TOK_COUNT) return parse_count_setup(p);
        if (keyword == TOK_TASK) return parse_task_def(p);
        if (keyword == TOK_REPORT) return parse_report(p);
        if (keyword == TOK_RETURN) return parse_bracket_return(p);
        if (keyword == TOK_REPEAT) return parse_bracket_repeat(p);
        if (keyword == TOK_DISPLAY) return parse_bracket_display(p);
    }
    return parse_expr_or_assignment(p);
}

static Node *parse_expr_or_assignment(Parser *p) {
    int line = peek(p)->line;
    Node *expr = parse_expression(p);
    if (check(p, TOK_EQ)) {
        advance(p);
        Node *value = parse_expression(p);
        if (expr->type == ND_IDENTIFIER) {
            return make_assign(expr->as.identifier.name, value, line);
        }
        if (expr->type == ND_INDEX) {
            return make_index_assign(expr->as.index.target, expr->as.index.index, value, line);
        }
        fatal_parse_error(line, "the left side of '=' needs to be a plain name or an indexed spot like arr[i], not an expression");
    }
    return make_expr_stmt(expr, line);
}

static Node *parse_statement(Parser *p) {
    Token *t = peek(p);
    switch (t->type) {
        case TOK_IF: return parse_if(p);
        case TOK_RETURN: return parse_return(p);
        case TOK_DISPLAY: return parse_display(p);
        case TOK_REPEAT: return parse_repeat(p);
        case TOK_ADD: return parse_add(p);
        case TOK_LBRACKET: return parse_bracket_statement(p);
        case TOK_IDENT: return parse_ident_statement(p);
        default: return parse_expr_or_assignment(p);
    }
}

/* ---- expressions, loosest to tightest binding ---- */

static Node *parse_or(Parser *p);
static Node *parse_and(Parser *p);
static Node *parse_equality(Parser *p);
static Node *parse_comparison(Parser *p);
static Node *parse_additive(Parser *p);
static Node *parse_multiplicative(Parser *p);
static Node *parse_unary(Parser *p);
static Node *parse_call(Parser *p);
static Node *parse_primary(Parser *p);

static Node *parse_expression(Parser *p) { return parse_or(p); }

static Node *parse_or(Parser *p) {
    Node *left = parse_and(p);
    while (check(p, TOK_OR)) {
        Token *op = advance(p);
        Node *right = parse_and(p);
        left = make_binary(op->text, left, right, op->line);
    }
    return left;
}

static Node *parse_and(Parser *p) {
    Node *left = parse_equality(p);
    while (check(p, TOK_AND)) {
        Token *op = advance(p);
        Node *right = parse_equality(p);
        left = make_binary(op->text, left, right, op->line);
    }
    return left;
}

static Node *parse_equality(Parser *p) {
    Node *left = parse_comparison(p);
    while (check(p, TOK_EQEQ) || check(p, TOK_NEQ)) {
        Token *op = advance(p);
        Node *right = parse_comparison(p);
        left = make_binary(op->text, left, right, op->line);
    }
    return left;
}

static Node *parse_comparison(Parser *p) {
    Node *left = parse_additive(p);
    while (check(p, TOK_LT) || check(p, TOK_GT) || check(p, TOK_LE) || check(p, TOK_GE)) {
        Token *op = advance(p);
        Node *right = parse_additive(p);
        left = make_binary(op->text, left, right, op->line);
    }
    return left;
}

static Node *parse_additive(Parser *p) {
    Node *left = parse_multiplicative(p);
    while (check(p, TOK_PLUS) || check(p, TOK_MINUS)) {
        Token *op = advance(p);
        Node *right = parse_multiplicative(p);
        left = make_binary(op->text, left, right, op->line);
    }
    return left;
}

static Node *parse_multiplicative(Parser *p) {
    Node *left = parse_unary(p);
    while (check(p, TOK_STAR) || check(p, TOK_SLASH)) {
        Token *op = advance(p);
        Node *right = parse_unary(p);
        left = make_binary(op->text, left, right, op->line);
    }
    return left;
}

static Node *parse_unary(Parser *p) {
    if (check(p, TOK_MINUS)) {
        Token *op = advance(p);
        Node *operand = parse_unary(p);
        return make_unary(op->text, operand, op->line);
    }
    return parse_call(p);
}

/* NUMBER/STRING/IDENT are exactly the tokens parse_primary treats as a
 * literal/name — the same set that can stand alone as a bare call
 * argument below. */
static int starts_bare_arg(Parser *p) {
    TokenType t = peek(p)->type;
    return t == TOK_NUMBER || t == TOK_STRING || t == TOK_IDENT;
}

/* A call is either `name(arg, arg, ...)` (any number of arguments,
 * always available) or, for exactly one simple argument, `name arg` with
 * no parens at all — `ask "Age? "`, `describe age`. The bare form only
 * takes a single primary (a name, number, or string — not a further
 * expression), and binds tighter than every infix operator, so
 * `describe age + "."` reads as `(describe age) + "."`, not
 * `describe(age + ".")`. Multiple arguments still need parens: there's
 * no unambiguous bare reading of `f x, y`, let alone `f x y`.
 *
 * This only fires inside expression parsing, which creates one narrow
 * gap: a statement that *starts* with `name othername` — both bare
 * identifiers — is read as a function definition first (see
 * parse_ident_statement's own lookahead), not a call, so `greet who`
 * alone on a line tries to define a function called greet instead of
 * calling it. A bare call with a string/number argument as a whole
 * statement is unaffected (`greet "Ari"` works fine — the second token
 * isn't TOK_IDENT, so the definition lookahead never fires), and a bare
 * call with an identifier argument works fine anywhere *inside* a larger
 * expression (`x = greet who`, `display greet who`). Not hit by any
 * example written so far; left as a known gap rather than solved here. */
static Node *parse_call(Parser *p) {
    Node *expr = parse_primary(p);
    for (;;) {
        /* Both branches below require the '[' or '(' to be on the SAME
         * line as the expression so far -- otherwise a '[' that actually
         * starts the NEXT statement (an array literal, [.create],
         * [.change], ...) gets wrongly swallowed as "index the previous
         * line's expression". Found by testing: `display {x[.count]}`
         * followed by a `[.change] ...` line on the next row made this
         * loop try to parse '.change] ...' as an index expression and
         * choke on the '.', since nothing here checked line numbers the
         * way the bare-arg-call check just below already does. */
        if (check(p, TOK_LBRACKET) && peek(p)->line == expr->line) {
            advance(p);
            Node *idx = parse_expression(p);
            expect(p, TOK_RBRACKET);
            expr = make_index(expr, idx, expr->line);
            continue; /* loops, so arr[0][1] (indexing a grid) just works */
        }
        if (check(p, TOK_LPAREN) && peek(p)->line == expr->line) {
            advance(p);
            NodeList args = {0};
            if (!check(p, TOK_RPAREN)) {
                nodelist_push(&args, parse_expression(p));
                while (check(p, TOK_COMMA)) {
                    advance(p);
                    nodelist_push(&args, parse_expression(p));
                }
            }
            expect(p, TOK_RPAREN);
            if (expr->type != ND_IDENTIFIER) {
                fatal_parse_error(expr->line, "only a plain name can be called like a function");
            }
            expr = make_call(expr->as.identifier.name, args, expr->line);
            continue;
        }
        if (expr->type == ND_IDENTIFIER && starts_bare_arg(p) && peek(p)->line == expr->line) {
            Node *arg = parse_primary(p);
            NodeList args = {0};
            nodelist_push(&args, arg);
            expr = make_call(expr->as.identifier.name, args, expr->line);
            continue;
        }
        break;
    }
    return expr;
}

static Node *parse_primary(Parser *p) {
    Token *t = peek(p);
    switch (t->type) {
        case TOK_NUMBER:
            advance(p);
            return make_number(t->number, t->line);
        case TOK_STRING:
            advance(p);
            return make_string(t->string, t->line);
        case TOK_IDENT:
            /* A bare identifier is still parsed here so calls keep working
             * (`describe age`, `add(2, 3)` -- parse_call needs an
             * ND_IDENTIFIER to recognize as a callee name). Reading a
             * variable's own VALUE is meant to always go through {name}
             * (see parse_brace_read) instead -- this path doesn't hard-
             * reject a bare read the way the design calls for, see the
             * plan's addendum for why that's a deliberate simplification
             * rather than an oversight. */
            advance(p);
            return make_identifier(t->text, t->line);
        case TOK_LBRACE:
            return parse_brace_read(p);
        case TOK_LPAREN: {
            advance(p);
            Node *expr = parse_expression(p);
            expect(p, TOK_RPAREN);
            return expr;
        }
        case TOK_LBRACKET: {
            /* [.run] name words [.using] arg1, arg2 -- natural-language
             * call syntax, usable anywhere an expression is (display
             * [.run] ..., x = [.run] ..., nested inside another call's
             * arguments, ...), not just as a standalone statement. Joins
             * the [.create]/[.change]/[.task]/[.report]/[.display]
             * bracket-dot family -- an earlier draft left this as a bare
             * 'run' keyword with no brackets, which read as an
             * inconsistent outlier once every other keyword-phrase here
             * got the same treatment; confirmed with the user brackets
             * belong here too. The name can be several plain words (see
             * parse_multiword_name), matching a same-named [.task]'s own
             * multi-word name. Produces the exact same ND_CALL node the
             * older name(args) syntax already does; both spellings keep
             * working side by side, same as [.change]/'='. */
            /* [.designName] -- pure sugar for the plain string
             * "designName", used to flag "this is a Creal catalog design
             * reference" at the call site (see '[.change] "id" to
             * [.designName]' in parse_change) the same way {} flags "this
             * is a variable read" -- purely cosmetic, [.frost1] and
             * "frost1" produce the identical AST node. Told apart from
             * every other '[.keyword]' construct by TOK_IDENT specifically
             * (a design name is never one of Coral's own reserved words,
             * which all lex as their own distinct token type, never
             * TOK_IDENT) at this exact position, so there's no ambiguity
             * with [.run]/[.task]/etc. below. */
            if (p->tokens.items[p->pos + 1].type == TOK_DOT &&
                p->tokens.items[p->pos + 2].type == TOK_IDENT &&
                p->tokens.items[p->pos + 3].type == TOK_RBRACKET) {
                Token *bracket_open = advance(p); /* '[' */
                advance(p);                       /* '.' */
                Token *name_tok = advance(p);      /* the design name itself */
                advance(p);                       /* ']' */
                return make_string(name_tok->text, bracket_open->line);
            }
            if (peek_bracket_dot(p, TOK_RUN)) {
                Token *open = expect_bracket_dot(p, TOK_RUN);
                char *name = parse_multiword_name(p, open->line);
                NodeList args = {0};
                if (peek_bracket_dot(p, TOK_USING)) {
                    expect_bracket_dot(p, TOK_USING);
                    nodelist_push(&args, parse_expression(p));
                    while (check(p, TOK_COMMA)) {
                        advance(p);
                        nodelist_push(&args, parse_expression(p));
                    }
                }
                return make_call(name, args, open->line);
            }
            Token *open = advance(p);
            /* An object literal starts with IDENT ':' (a field name, then
             * its value); anything else -- including an empty '[]', which
             * stays an (empty) array, there being no field to distinguish
             * it by -- is a plain array literal. Same brackets either way,
             * told apart by this one token of lookahead. */
            if (check(p, TOK_IDENT) && p->tokens.items[p->pos + 1].type == TOK_COLON) {
                char **keys = NULL;
                Node **values = NULL;
                int count = 0, cap = 0;
                for (;;) {
                    Token *key_tok = expect(p, TOK_IDENT);
                    expect(p, TOK_COLON);
                    Node *val = parse_expression(p);
                    if (count == cap) {
                        cap = cap == 0 ? 4 : cap * 2;
                        keys = realloc(keys, sizeof(char *) * cap);
                        values = realloc(values, sizeof(Node *) * cap);
                    }
                    keys[count] = key_tok->text;
                    values[count] = val;
                    count++;
                    if (!check(p, TOK_COMMA)) break;
                    advance(p);
                }
                expect(p, TOK_RBRACKET);
                return make_object_literal(keys, values, count, open->line);
            }

            NodeList items = {0};
            if (!check(p, TOK_RBRACKET)) {
                nodelist_push(&items, parse_expression(p));
                while (check(p, TOK_COMMA)) {
                    advance(p);
                    nodelist_push(&items, parse_expression(p));
                }
            }
            expect(p, TOK_RBRACKET);
            return make_array_literal(items, open->line);
        }
        default:
            fatal_parse_error(t->line, "didn't expect %s here", token_type_name(t->type));
            return NULL; /* unreachable */
    }
}

NodeList parse_program(TokenList tokens) {
    Parser p = {tokens, 0};
    return parse_block_body(&p, -1);
}

/* Parses a single expression from a token stream and requires nothing
 * but EOF after it -- used by the REPL's 'what is EXPR' query (see
 * main.c's run_repl), which only ever wants to evaluate one value, not
 * run a whole program. */
Node *parse_expression_only(TokenList tokens) {
    Parser p = {tokens, 0};
    Node *expr = parse_expression(&p);
    if (!check(&p, TOK_EOF)) {
        fatal_parse_error(peek(&p)->line, "expected just one expression here");
    }
    return expr;
}
