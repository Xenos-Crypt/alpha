#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "interp.h"
#include "value.h"
#include "builtins.h"

typedef enum { EXEC_NORMAL, EXEC_RETURN } ExecResult;

static Value eval(Node *node, Env *env);
static ExecResult exec_stmt(Node *stmt, Env *env, Value *out_value);

/* exec_stmt always writes *some* value into out_value — nil for
 * assignments/function-defs/display, the expression's value for a bare
 * expression statement, whatever the taken branch produced for an `if`.
 * That means exec_block doesn't need to special-case "the last
 * statement": by the time the loop ends normally (no explicit `return`
 * hit), out_value already holds whatever the *last* statement produced,
 * which is exactly the function's implicit return value — the same
 * mechanism that lets `if` in tail position propagate a branch's trailing
 * expression value all the way out. No `return` needed for the common
 * case; explicit `return` still works for bailing out early. */
static ExecResult exec_block(NodeList *stmts, Env *env, Value *out_value) {
    *out_value = nil_value();
    for (int i = 0; i < stmts->count; i++) {
        ExecResult r = exec_stmt(stmts->items[i], env, out_value);
        if (r == EXEC_RETURN) return EXEC_RETURN;
    }
    return EXEC_NORMAL;
}

/* Builtins (ask, readFile, writeFile, ...) live in builtins.c/find_builtin
 * now, not as hardcoded strcmp special cases here -- this is the real
 * dispatch table the old ask-only strcmp was flagged as not a good
 * long-term fit for. Arguments are evaluated exactly once, up front,
 * shared by both the builtin path and the user-defined-function path
 * below (the old code only evaluated once per path because ask's args
 * were evaluated inside eval_ask itself; a real table needs one shared
 * evaluation point so a future builtin doesn't have to duplicate it). */
/* Shared by eval_call's `name(...)` path and call_function's exported
 * entry point (see interp.h) -- factored out so a native callback with a
 * VAL_FUNCTION value already in hand (no call-site Node at all, see
 * builtins.c's UI click handler) can invoke it exactly the same way an
 * ordinary Coral call does. `callee_name`/`line` are only used for error
 * messages -- pass whatever makes sense at the call site. */
static Value call_function_value(Value callee, Value *args, int argc, const char *callee_name, int line) {
    if (callee.type != VAL_FUNCTION) {
        runtime_error(line, "'%s' isn't a function, so it can't be called", callee_name);
    }

    Node *decl = callee.as.func->decl;
    if (argc != decl->as.func_decl.param_count) {
        runtime_error(line, "'%s' expects %d argument(s), but got %d",
                       callee_name, decl->as.func_decl.param_count, argc);
    }

    Env *call_env = env_new(callee.as.func->closure);
    for (int i = 0; i < argc; i++) {
        env_assign(call_env, decl->as.func_decl.params[i], args[i]);
    }

    Value return_value;
    exec_block(&decl->as.func_decl.body, call_env, &return_value);
    return return_value;
}

Value call_function(Value fn, Value *args, int argc, int line) {
    return call_function_value(fn, args, argc, "<function>", line);
}

static Value eval_call(Node *node, Env *env) {
    NodeList *arg_nodes = &node->as.call.args;
    int argc = arg_nodes->count;
    Value *args = argc > 0 ? malloc(sizeof(Value) * (size_t)argc) : NULL;
    for (int i = 0; i < argc; i++) {
        args[i] = eval(arg_nodes->items[i], env);
    }

    const Builtin *builtin = find_builtin(node->as.call.callee);
    if (builtin != NULL) {
        if (argc < builtin->min_arity || (builtin->max_arity >= 0 && argc > builtin->max_arity)) {
            if (builtin->min_arity == builtin->max_arity) {
                runtime_error(node->line, "'%s' expects %d argument(s), but got %d",
                               node->as.call.callee, builtin->min_arity, argc);
            } else {
                runtime_error(node->line, "'%s' expects between %d and %d argument(s), but got %d",
                               node->as.call.callee, builtin->min_arity, builtin->max_arity, argc);
            }
        }
        Value result = builtin->fn(node, args, argc);
        free(args);
        return result;
    }

    Value callee = env_get(env, node->as.call.callee, node->line);
    Value result = call_function_value(callee, args, argc, node->as.call.callee, node->line);
    free(args);
    return result;
}

static Value eval_binary(Node *node, Env *env) {
    const char *op = node->as.binary.op;

    if (strcmp(op, "and") == 0) {
        Value left = eval(node->as.binary.left, env);
        if (!is_truthy(left)) return bool_value(0);
        return bool_value(is_truthy(eval(node->as.binary.right, env)));
    }
    if (strcmp(op, "or") == 0) {
        Value left = eval(node->as.binary.left, env);
        if (is_truthy(left)) return bool_value(1);
        return bool_value(is_truthy(eval(node->as.binary.right, env)));
    }

    Value left = eval(node->as.binary.left, env);
    Value right = eval(node->as.binary.right, env);

    if (strcmp(op, "+") == 0) {
        if (left.type == VAL_STRING || right.type == VAL_STRING) {
            char *ls = to_display_string(left);
            char *rs = to_display_string(right);
            char *combined = malloc(strlen(ls) + strlen(rs) + 1);
            strcpy(combined, ls);
            strcat(combined, rs);
            free(ls);
            free(rs);
            return string_value(combined);
        }
        if (left.type != VAL_NUMBER || right.type != VAL_NUMBER) {
            runtime_error(node->line, "'+' needs two numbers or two strings here");
        }
        return number_value(left.as.number + right.as.number);
    }

    if (strcmp(op, "==") == 0 || strcmp(op, "!=") == 0) {
        int equal;
        if (left.type != right.type) {
            equal = 0;
        } else {
            switch (left.type) {
                case VAL_NIL: equal = 1; break;
                case VAL_BOOL: equal = left.as.boolean == right.as.boolean; break;
                case VAL_NUMBER: equal = left.as.number == right.as.number; break;
                case VAL_STRING: equal = strcmp(left.as.string, right.as.string) == 0; break;
                case VAL_FUNCTION: equal = left.as.func == right.as.func; break;
                case VAL_ARRAY: equal = left.as.array == right.as.array; break;
                default: equal = 0;
            }
        }
        return bool_value(strcmp(op, "==") == 0 ? equal : !equal);
    }

    if (left.type != VAL_NUMBER || right.type != VAL_NUMBER) {
        runtime_error(node->line, "'%s' needs two numbers here", op);
    }

    if (strcmp(op, "-") == 0) return number_value(left.as.number - right.as.number);
    if (strcmp(op, "*") == 0) return number_value(left.as.number * right.as.number);
    if (strcmp(op, "/") == 0) {
        if (right.as.number == 0.0) runtime_error(node->line, "can't divide by zero");
        return number_value(left.as.number / right.as.number);
    }
    if (strcmp(op, "<") == 0) return bool_value(left.as.number < right.as.number);
    if (strcmp(op, ">") == 0) return bool_value(left.as.number > right.as.number);
    if (strcmp(op, "<=") == 0) return bool_value(left.as.number <= right.as.number);
    if (strcmp(op, ">=") == 0) return bool_value(left.as.number >= right.as.number);

    runtime_error(node->line, "'%s' isn't an operator Coral knows", op);
    return nil_value(); /* unreachable */
}

static Value eval(Node *node, Env *env) {
    switch (node->type) {
        case ND_NUMBER:
            return number_value(node->as.number.value);
        case ND_STRING:
            return string_value(strdup(node->as.string.value));
        case ND_NIL:
            return nil_value();
        case ND_IDENTIFIER: {
            Value v = env_get(env, node->as.identifier.name, node->line);
            /* [.create] name leaves a variable holding nil until something is
             * put into it -- reading it before that isn't fatal (the plan's
             * "just treat it as empty" default), but the mistake shouldn't
             * pass completely silently either, so it gets a one-line warning
             * every time, not just once. */
            if (v.type == VAL_NIL) {
                fprintf(stderr, "warning: {%s} hasn't been given a value yet, using empty\n",
                        node->as.identifier.name);
            }
            return v;
        }
        case ND_UNARY: {
            Value v = eval(node->as.unary.operand, env);
            if (strcmp(node->as.unary.op, "-") == 0) {
                if (v.type != VAL_NUMBER) runtime_error(node->line, "'-' needs a number here");
                return number_value(-v.as.number);
            }
            runtime_error(node->line, "'%s' isn't a unary operator Coral knows", node->as.unary.op);
        }
        case ND_BINARY:
            return eval_binary(node, env);
        case ND_CALL:
            return eval_call(node, env);
        case ND_ARRAY_LITERAL: {
            ArrayObj *arr = array_new();
            NodeList *items = &node->as.array_literal.items;
            for (int i = 0; i < items->count; i++) {
                array_push(arr, eval(items->items[i], env));
            }
            return array_value(arr);
        }
        case ND_INDEX: {
            Value target = eval(node->as.index.target, env);
            Value idx_val = eval(node->as.index.index, env);
            if (idx_val.type != VAL_NUMBER) {
                runtime_error(node->line, "an index needs to be a number here");
            }
            /* Coral's indices are 1-based to the user (index 1 = first item);
             * storage underneath stays 0-based, so every real access
             * translates at this boundary rather than changing ArrayObj/
             * C-string storage itself. Error messages report the user's own
             * 1-based number (user_idx), never the translated idx. */
            int user_idx = (int)idx_val.as.number;
            int idx = user_idx - 1;
            if (target.type == VAL_ARRAY) {
                if (idx < 0 || idx >= target.as.array->count) {
                    runtime_error(node->line, "index %d is out of range for an array of length %d",
                                   user_idx, target.as.array->count);
                }
                return target.as.array->items[idx];
            }
            if (target.type == VAL_STRING) {
                int len = (int)strlen(target.as.string);
                if (idx < 0 || idx >= len) {
                    runtime_error(node->line, "index %d is out of range for a string of length %d", user_idx, len);
                }
                char *ch = malloc(2);
                ch[0] = target.as.string[idx];
                ch[1] = '\0';
                return string_value(ch);
            }
            runtime_error(node->line, "only arrays and strings can be indexed with [ ], not this");
        }
        case ND_LIST_READ: {
            Value target = eval(node->as.list_read.target, env);
            if (target.type != VAL_ARRAY) {
                runtime_error(node->line, "'.list' only works on an array");
            }
            return number_value(target.as.array->list_cursor);
        }
        case ND_OBJECT_LITERAL: {
            ObjectObj *obj = object_new();
            for (int i = 0; i < node->as.object_literal.count; i++) {
                Value v = eval(node->as.object_literal.values[i], env);
                object_set(obj, node->as.object_literal.keys[i], v);
            }
            return object_value(obj);
        }
        case ND_FIELD_ACCESS: {
            Value target = eval(node->as.field_access.target, env);
            if (target.type != VAL_OBJECT) {
                runtime_error(node->line, "only an object's fields can be read with '.', not this");
            }
            Value *field = object_get(target.as.object, node->as.field_access.field);
            if (field == NULL) {
                runtime_error(node->line, "this object has no field called '%s'", node->as.field_access.field);
            }
            return *field;
        }
        default:
            runtime_error(node->line, "this isn't a valid expression");
    }
    return nil_value(); /* unreachable */
}

/* Every branch sets *out_value explicitly, even to nil — exec_block
 * relies on whatever the *last* call here left behind, so a case that
 * forgot to touch it would leak the previous statement's value through
 * as this one's, corrupting tail-value propagation. */
static ExecResult exec_stmt(Node *stmt, Env *env, Value *out_value) {
    switch (stmt->type) {
        case ND_ASSIGN: {
            Value v = eval(stmt->as.assign.expr, env);
            env_assign(env, stmt->as.assign.name, v);
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        case ND_FUNC_DECL: {
            FunctionObj *fn = malloc(sizeof(FunctionObj));
            fn->decl = stmt;
            fn->closure = env;
            Value v;
            v.type = VAL_FUNCTION;
            v.as.func = fn;
            env_assign(env, stmt->as.func_decl.name, v);
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        case ND_IF: {
            /* Runs directly in the enclosing env, not a fresh child scope --
             * see the long comment on env_assign's walk-up behavior at
             * ND_REPEAT below for why. A branch used to get its own
             * env_new(env), which meant `x = x + 1` inside an if silently
             * created a throwaway local shadow instead of ever updating the
             * real x -- invisible here because a branch only ever runs
             * once, but the exact same mechanism made repeat's loop counter
             * never actually advance (caught while testing arrays). */
            for (int i = 0; i < stmt->as.if_stmt.branch_count; i++) {
                IfBranch *branch = &stmt->as.if_stmt.branches[i];
                if (branch->condition == NULL || is_truthy(eval(branch->condition, env))) {
                    return exec_block(&branch->body, env, out_value);
                }
            }
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        case ND_RETURN: {
            *out_value = stmt->as.ret.expr != NULL ? eval(stmt->as.ret.expr, env) : nil_value();
            return EXEC_RETURN;
        }
        case ND_DISPLAY: {
            NodeList *args = &stmt->as.display.args;
            for (int i = 0; i < args->count; i++) {
                Value v = eval(args->items[i], env);
                char *s = to_display_string(v);
                fputs(s, stdout);
                free(s);
                if (i + 1 < args->count) fputc(' ', stdout);
            }
            fputc('\n', stdout);
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        case ND_EXPR_STMT: {
            *out_value = eval(stmt->as.expr_stmt.expr, env);
            return EXEC_NORMAL;
        }
        case ND_INDEX_ASSIGN: {
            Value target = eval(stmt->as.index_assign.target, env);
            Value idx_val = eval(stmt->as.index_assign.index, env);
            if (idx_val.type != VAL_NUMBER) {
                runtime_error(stmt->line, "an index needs to be a number here");
            }
            if (target.type != VAL_ARRAY) {
                runtime_error(stmt->line, "only an array's items can be assigned with [ ], not this");
            }
            int user_idx = (int)idx_val.as.number;
            int idx = user_idx - 1; /* 1-based to the user, 0-based in storage -- see ND_INDEX */
            if (idx < 0 || idx >= target.as.array->count) {
                runtime_error(stmt->line, "index %d is out of range for an array of length %d",
                               user_idx, target.as.array->count);
            }
            target.as.array->items[idx] = eval(stmt->as.index_assign.value, env);
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        case ND_INDEX_DELETE: {
            Value target = eval(stmt->as.index.target, env);
            Value idx_val = eval(stmt->as.index.index, env);
            if (idx_val.type != VAL_NUMBER) {
                runtime_error(stmt->line, "an index needs to be a number here");
            }
            if (target.type != VAL_ARRAY) {
                runtime_error(stmt->line, "only an array's items can be removed with [.delete], not this");
            }
            int user_idx = (int)idx_val.as.number;
            int idx = user_idx - 1; /* 1-based to the user, 0-based in storage -- see ND_INDEX */
            ArrayObj *arr = target.as.array;
            if (idx < 0 || idx >= arr->count) {
                runtime_error(stmt->line, "index %d is out of range for an array of length %d", user_idx, arr->count);
            }
            memmove(&arr->items[idx], &arr->items[idx + 1], sizeof(Value) * (size_t)(arr->count - idx - 1));
            arr->count--;
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        case ND_FIELD_ASSIGN: {
            Value target = eval(stmt->as.field_assign.target, env);
            if (target.type != VAL_OBJECT) {
                runtime_error(stmt->line, "only an object's fields can be changed with [.change], not this");
            }
            Value value = eval(stmt->as.field_assign.value, env);
            object_set(target.as.object, stmt->as.field_assign.field, value);
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        case ND_REPEAT: {
            if (stmt->as.repeat.condition != NULL && !is_truthy(eval(stmt->as.repeat.condition, env))) {
                *out_value = nil_value();
                return EXEC_NORMAL;
            }
            Value count_val = eval(stmt->as.repeat.count, env);
            if (count_val.type != VAL_NUMBER) {
                runtime_error(stmt->line, "'repeat' needs a number of times here");
            }
            int n = (int)count_val.as.number;
            for (int i = 0; i < n; i++) {
                /* Runs in the enclosing env directly, NOT a fresh
                 * env_new(env) per iteration -- env_assign only ever
                 * creates-or-updates in the exact Env it's given, it never
                 * walks up to find an existing outer binding (see its own
                 * doc comment in value.h). A per-iteration child scope
                 * meant a loop-body assignment like `i = i + 1` silently
                 * created a new local `i` in that throwaway scope every
                 * time instead of ever updating the real one -- the outer
                 * counter never advanced, and `i * i` stayed stuck at its
                 * starting value for every single iteration. Matches
                 * Python's model: only a function call gets a genuinely
                 * new scope (see eval_call's call_env); if/repeat blocks
                 * don't introduce one of their own. */
                Value discard;
                ExecResult r = exec_block(&stmt->as.repeat.body, env, &discard);
                if (r == EXEC_RETURN) {
                    *out_value = discard;
                    return EXEC_RETURN;
                }
            }
            /* Like every other loop-shaped statement: writes nil, not the
             * last iteration's value -- ill-defined when n is 0. */
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        /* All three 'now repeat' flavors check their stopping condition
         * before every pass, including the very first -- if it already
         * holds when the loop is reached, the body (written textually
         * *above* the 'now repeat' line, since it's the step chain that
         * line claimed) runs zero times. Runs directly in the enclosing
         * env, same reasoning as ND_REPEAT above: a per-iteration
         * env_new(env) would make a loop-body counter update silently
         * shadow instead of ever advancing the real variable. */
        case ND_NOW_REPEAT: {
            switch (stmt->as.now_repeat.kind) {
                case NOW_REPEAT_UNTIL: {
                    for (;;) {
                        if (is_truthy(eval(stmt->as.now_repeat.condition, env))) break;
                        Value discard;
                        ExecResult r = exec_block(&stmt->as.now_repeat.body, env, &discard);
                        if (r == EXEC_RETURN) {
                            *out_value = discard;
                            return EXEC_RETURN;
                        }
                    }
                    break;
                }
                case NOW_REPEAT_LIST_UNTIL: {
                    Value coll = eval(stmt->as.now_repeat.list_target, env);
                    if (coll.type != VAL_ARRAY) {
                        runtime_error(stmt->line, "'now repeat' over '.list' needs an array here");
                    }
                    coll.as.array->list_cursor = 1;
                    for (;;) {
                        if (is_truthy(eval(stmt->as.now_repeat.condition, env))) break;
                        Value discard;
                        ExecResult r = exec_block(&stmt->as.now_repeat.body, env, &discard);
                        if (r == EXEC_RETURN) {
                            *out_value = discard;
                            return EXEC_RETURN;
                        }
                        coll.as.array->list_cursor++;
                    }
                    break;
                }
                case NOW_REPEAT_COUNT: {
                    const char *counter_name = stmt->as.now_repeat.counter_name;
                    for (;;) {
                        Value cur = env_get(env, counter_name, stmt->line);
                        Value end_val = eval(stmt->as.now_repeat.count_end, env);
                        if (cur.type != VAL_NUMBER || end_val.type != VAL_NUMBER) {
                            runtime_error(stmt->line, "'now repeat count' needs numbers here");
                        }
                        if (!(cur.as.number <= end_val.as.number)) break;
                        Value discard;
                        ExecResult r = exec_block(&stmt->as.now_repeat.body, env, &discard);
                        if (r == EXEC_RETURN) {
                            *out_value = discard;
                            return EXEC_RETURN;
                        }
                        Value advanced = env_get(env, counter_name, stmt->line);
                        env_assign(env, counter_name, number_value(advanced.as.number + 1));
                    }
                    break;
                }
            }
            *out_value = nil_value();
            return EXEC_NORMAL;
        }
        default:
            runtime_error(stmt->line, "this isn't a statement Coral knows how to run");
    }
    return EXEC_NORMAL; /* unreachable */
}

static Env *g_globals = NULL;

Env *get_globals(void) {
    return g_globals;
}

void run_program(NodeList program) {
    g_globals = env_new(NULL);
    Value discard;
    exec_block(&program, g_globals, &discard);
}

Env *run_program_isolated(NodeList program) {
    Env *saved = g_globals;
    Env *child = env_new(NULL);
    g_globals = child;
    Value discard;
    exec_block(&program, g_globals, &discard);
    g_globals = saved;
    return child;
}

/* Runs one REPL chunk against the persistent global scope -- unlike
 * run_program above, this creates g_globals only the FIRST time (a REPL
 * has no single "start of the program" moment; every chunk needs to see
 * what every earlier chunk already defined, not a fresh scope). See
 * main.c's run_repl. */
void run_repl_chunk(NodeList chunk) {
    if (g_globals == NULL) g_globals = env_new(NULL);
    Value discard;
    exec_block(&chunk, g_globals, &discard);
}

/* Evaluates a single expression against the persistent global scope
 * (creating it if this is the very first thing the REPL session runs),
 * for the REPL's 'what is EXPR' query -- a read-only peek at a value,
 * printed by main.c's run_repl, that doesn't go through [.display]/
 * display at all. */
Value eval_repl_expr(Node *expr) {
    if (g_globals == NULL) g_globals = env_new(NULL);
    return eval(expr, g_globals);
}
