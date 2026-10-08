#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "lexer.h"
#include "repl.h"

static void fatal_lex_error(int line, const char *msg) {
    fprintf(stderr, "Line %d: %s\n", line, msg);
    coral_fatal();
}

static void push_token(TokenList *list, Token tok) {
    if (list->count == list->capacity) {
        list->capacity = list->capacity == 0 ? 64 : list->capacity * 2;
        list->items = realloc(list->items, sizeof(Token) * list->capacity);
    }
    list->items[list->count++] = tok;
}

static char *dup_range(const char *start, int len) {
    char *out = malloc(len + 1);
    memcpy(out, start, len);
    out[len] = '\0';
    return out;
}

typedef struct {
    const char *word;
    TokenType type;
} Keyword;

static const Keyword KEYWORDS[] = {
    {"return", TOK_RETURN},
    {"if", TOK_IF},
    {"else", TOK_ELSE},
    {"display", TOK_DISPLAY},
    {"repeat", TOK_REPEAT},
    {"times", TOK_TIMES},
    {"be", TOK_BE},
    {"called", TOK_CALLED},
    {"create", TOK_CREATE},
    {"update", TOK_UPDATE},
    {"change", TOK_CHANGE},
    {"delete", TOK_DELETE},
    {"remove", TOK_REMOVE},
    {"task", TOK_TASK},
    {"using", TOK_USING},
    {"report", TOK_REPORT},
    {"run", TOK_RUN},
    {"add", TOK_ADD},
    {"to", TOK_TO},
    {"then", TOK_THEN},
    {"now", TOK_NOW},
    {"until", TOK_UNTIL},
    {"count", TOK_COUNT},
    {"list", TOK_LIST},
    {"last", TOK_LAST},
    {"first", TOK_FIRST},
    {"random", TOK_RANDOM},
    {"put", TOK_PUT},
    {"into", TOK_INTO},
    {"it", TOK_IT},
    {"and", TOK_AND},
    {"or", TOK_OR},
};
static const int KEYWORD_COUNT = sizeof(KEYWORDS) / sizeof(KEYWORDS[0]);

static TokenType keyword_lookup(const char *text) {
    for (int i = 0; i < KEYWORD_COUNT; i++) {
        if (strcmp(KEYWORDS[i].word, text) == 0) return KEYWORDS[i].type;
    }
    return TOK_IDENT;
}

/* Decodes the small set of backslash escapes we support inside "..." strings. */
static char *decode_string(const char *start, int len, int line) {
    char *out = malloc(len + 1);
    int o = 0;
    for (int i = 0; i < len; i++) {
        char c = start[i];
        if (c == '\\' && i + 1 < len) {
            char next = start[++i];
            switch (next) {
                case 'n': out[o++] = '\n'; break;
                case 't': out[o++] = '\t'; break;
                case 'r': out[o++] = '\r'; break;
                case '"': out[o++] = '"'; break;
                case '\\': out[o++] = '\\'; break;
                default:
                    fatal_lex_error(line, "that escape sequence in the string isn't recognized");
            }
        } else {
            out[o++] = c;
        }
    }
    out[o] = '\0';
    return out;
}

/* Indentation model: each token is stamped with the raw leading-whitespace
 * character count of the line it starts on (tabs and spaces both just
 * count as 1 — no tab-stop math, since the parser only ever compares
 * "deeper than this specific header's indent", never expects exact
 * alignment between sibling lines). A line that produces no real token
 * (blank, or a dropped comment) never stamps anything, which is exactly
 * what makes blank/comment lines not count toward indentation tracking.
 *
 * Shared by lex() and lex_with_comments() -- `keep_comments` is the only
 * difference between them: a '//' comment either gets pushed as a
 * TOK_COMMENT token (its text being everything after '//') or silently
 * skipped, same as blank space. Everything else about scanning is
 * identical, so this one function is the only place either behavior can
 * drift from the other. */
static TokenList lex_impl(const char *source, int keep_comments) {
    TokenList list = {0};
    int line = 1;
    const char *p = source;

    int at_line_start = 1;
    int col = 0;         /* whitespace characters seen so far at the start of this line */
    int line_indent = 0; /* indent stamped onto every token once the line's first real token appears */

    while (*p != '\0') {
        char c = *p;

        if (c == '\n') {
            line++;
            p++;
            at_line_start = 1;
            col = 0;
            continue;
        }
        if (at_line_start && (c == ' ' || c == '\t')) { col++; p++; continue; }
        if (!at_line_start && (c == ' ' || c == '\t' || c == '\r')) { p++; continue; }
        if (at_line_start && c == '\r') { p++; continue; }

        if (at_line_start) {
            line_indent = col;
            at_line_start = 0;
        }

        /* Every branch below reads a token starting exactly here, at the
         * current `p` -- captured once, in this one place, rather than
         * separately per branch, so `start` can't drift out of sync with
         * whichever branch actually fires. */
        const char *tok_start = p;

        if (c == '/' && p[1] == '/') {
            const char *start = p + 2;
            while (*p != '\0' && *p != '\n') p++;
            if (keep_comments) {
                char *text = dup_range(start, (int)(p - start));
                push_token(&list, (Token){TOK_COMMENT, text, 0, NULL, line, line_indent, (int)(tok_start - source), (int)(p - tok_start)});
            }
            continue; /* comment-only or trailing comment — never stamps a REAL token */
        }

        if (isdigit((unsigned char)c)) {
            const char *start = p;
            while (isdigit((unsigned char)*p)) p++;
            if (*p == '.' && isdigit((unsigned char)p[1])) {
                p++;
                while (isdigit((unsigned char)*p)) p++;
            }
            char *text = dup_range(start, (int)(p - start));
            push_token(&list, (Token){TOK_NUMBER, text, atof(text), NULL, line, line_indent, (int)(tok_start - source), (int)(p - tok_start)});
            continue;
        }

        if (c == '"') {
            const char *start = ++p; /* skip opening quote */
            while (*p != '\0' && *p != '"') {
                if (*p == '\\') p++; /* skip escaped char so an escaped quote doesn't end the string */
                p++;
            }
            if (*p != '"') fatal_lex_error(line, "this string is missing its closing \"");
            char *decoded = decode_string(start, (int)(p - start), line);
            p++; /* skip closing quote */
            push_token(&list, (Token){TOK_STRING, NULL, 0, decoded, line, line_indent, (int)(tok_start - source), (int)(p - tok_start)});
            continue;
        }

        if (isalpha((unsigned char)c) || c == '_') {
            const char *start = p;
            while (isalnum((unsigned char)*p) || *p == '_') p++;
            char *text = dup_range(start, (int)(p - start));
            TokenType type = keyword_lookup(text);
            push_token(&list, (Token){type, text, 0, NULL, line, line_indent, (int)(tok_start - source), (int)(p - tok_start)});
            continue;
        }

        if (c == '=' && p[1] == '=') { push_token(&list, (Token){TOK_EQEQ, dup_range(p, 2), 0, NULL, line, line_indent, (int)(tok_start - source), 2}); p += 2; continue; }
        if (c == '!' && p[1] == '=') { push_token(&list, (Token){TOK_NEQ, dup_range(p, 2), 0, NULL, line, line_indent, (int)(tok_start - source), 2}); p += 2; continue; }
        if (c == '<' && p[1] == '=') { push_token(&list, (Token){TOK_LE, dup_range(p, 2), 0, NULL, line, line_indent, (int)(tok_start - source), 2}); p += 2; continue; }
        if (c == '>' && p[1] == '=') { push_token(&list, (Token){TOK_GE, dup_range(p, 2), 0, NULL, line, line_indent, (int)(tok_start - source), 2}); p += 2; continue; }

        TokenType single;
        switch (c) {
            case '=': single = TOK_EQ; break;
            case '<': single = TOK_LT; break;
            case '>': single = TOK_GT; break;
            case '+': single = TOK_PLUS; break;
            case '-': single = TOK_MINUS; break;
            case '*': single = TOK_STAR; break;
            case '/': single = TOK_SLASH; break;
            case '(': single = TOK_LPAREN; break;
            case ')': single = TOK_RPAREN; break;
            case '[': single = TOK_LBRACKET; break;
            case ']': single = TOK_RBRACKET; break;
            case '{': single = TOK_LBRACE; break;
            case '}': single = TOK_RBRACE; break;
            case '.': single = TOK_DOT; break;
            case ',': single = TOK_COMMA; break;
            case ':': single = TOK_COLON; break;
            default: {
                char msg[80];
                snprintf(msg, sizeof(msg), "'%c' isn't a character Coral understands here", c);
                fatal_lex_error(line, msg);
                single = TOK_EOF; /* unreachable, silences uninitialized warning */
            }
        }
        push_token(&list, (Token){single, dup_range(p, 1), 0, NULL, line, line_indent, (int)(tok_start - source), 1});
        p++;
    }

    push_token(&list, (Token){TOK_EOF, NULL, 0, NULL, line, 0, (int)(p - source), 0});
    return list;
}

TokenList lex(const char *source) {
    return lex_impl(source, 0);
}

TokenList lex_with_comments(const char *source) {
    return lex_impl(source, 1);
}

void free_tokens(TokenList *list) {
    for (int i = 0; i < list->count; i++) {
        free(list->items[i].text);
        free(list->items[i].string);
    }
    free(list->items);
}

const char *token_type_name(TokenType type) {
    switch (type) {
        case TOK_NUMBER: return "a number";
        case TOK_STRING: return "a string";
        case TOK_IDENT: return "a name";
        case TOK_RETURN: return "'return'";
        case TOK_IF: return "'if'";
        case TOK_ELSE: return "'else'";
        case TOK_DISPLAY: return "'display'";
        case TOK_REPEAT: return "'repeat'";
        case TOK_TIMES: return "'times'";
        case TOK_BE: return "'be'";
        case TOK_CALLED: return "'called'";
        case TOK_CREATE: return "'create'";
        case TOK_UPDATE: return "'update'";
        case TOK_CHANGE: return "'change'";
        case TOK_DELETE: return "'delete'";
        case TOK_REMOVE: return "'remove'";
        case TOK_TASK: return "'task'";
        case TOK_USING: return "'using'";
        case TOK_REPORT: return "'report'";
        case TOK_RUN: return "'run'";
        case TOK_ADD: return "'add'";
        case TOK_TO: return "'to'";
        case TOK_THEN: return "'then'";
        case TOK_NOW: return "'now'";
        case TOK_UNTIL: return "'until'";
        case TOK_COUNT: return "'count'";
        case TOK_LIST: return "'list'";
        case TOK_LAST: return "'last'";
        case TOK_FIRST: return "'first'";
        case TOK_RANDOM: return "'random'";
        case TOK_PUT: return "'put'";
        case TOK_INTO: return "'into'";
        case TOK_IT: return "'it'";
        case TOK_AND: return "'and'";
        case TOK_OR: return "'or'";
        case TOK_EQEQ: return "'=='";
        case TOK_NEQ: return "'!='";
        case TOK_LE: return "'<='";
        case TOK_GE: return "'>='";
        case TOK_EQ: return "'='";
        case TOK_LT: return "'<'";
        case TOK_GT: return "'>'";
        case TOK_PLUS: return "'+'";
        case TOK_MINUS: return "'-'";
        case TOK_STAR: return "'*'";
        case TOK_SLASH: return "'/'";
        case TOK_LPAREN: return "'('";
        case TOK_RPAREN: return "')'";
        case TOK_LBRACKET: return "'['";
        case TOK_RBRACKET: return "']'";
        case TOK_LBRACE: return "'{'";
        case TOK_RBRACE: return "'}'";
        case TOK_DOT: return "'.'";
        case TOK_COMMA: return "','";
        case TOK_COLON: return "':'";
        case TOK_COMMENT: return "a comment";
        case TOK_EOF: return "the end of the file";
    }
    return "something unexpected";
}
