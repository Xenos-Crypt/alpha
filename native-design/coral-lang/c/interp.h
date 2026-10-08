#ifndef CORAL_INTERP_H
#define CORAL_INTERP_H

#include "ast.h"
#include "value.h"

/* Runs a parsed program (a list of top-level statements) to completion. */
void run_program(NodeList program);

/* REPL support (see main.c's run_repl) -- both act against the same
 * persistent global scope across many calls, unlike run_program above
 * which always starts fresh. run_repl_chunk executes a chunk of
 * statements (declarations, assignments, display, ...); eval_repl_expr
 * evaluates a single expression and hands back its value, for a
 * read-only 'what is EXPR' query rather than running a statement. */
void run_repl_chunk(NodeList chunk);
Value eval_repl_expr(Node *expr);

/* The top-level scope run_program executes the program in -- exposed so a
 * builtin (see builtins.c's ui* functions) can look up a Coral function by
 * name outside of normal call evaluation, e.g. to resolve a callback
 * registered by uiOnClick. NULL until run_program has started. */
Env *get_globals(void);

/* Runs `program` under a BRAND NEW, isolated global scope (env_new(NULL)),
 * swapping get_globals() to it for the duration and restoring whatever it
 * was before on return -- for real embedded interactivity in the device
 * preview (see win32_backend.c's uiEmbedApp): the previewed app's own
 * tasks/globals must never collide with (or see) the host editor's own,
 * since a click on the embedded app has to run ITS logic, not whatever a
 * same-named task in the editor happens to mean. Every closure the child
 * program creates (including ones handed to uiOnClick, which resolves and
 * stores the actual FunctionObj at registration time -- see builtins.c)
 * captures this new env permanently, so a later click on the embedded app
 * runs correctly in ITS scope even though get_globals() has long since
 * been restored to the host's own by the time that click fires -- nothing
 * about dispatching a click needs to swap globals again. Returns the new
 * env, in case a caller ever needs to keep a handle on it (nothing does
 * yet). */
Env *run_program_isolated(NodeList program);

/* Calls an already-resolved VAL_FUNCTION value with already-evaluated
 * args, the same machinery eval_call uses for an ordinary `name(...)`
 * call -- exposed so a native callback (a UI click handler firing from
 * deep inside Win32's message loop, see builtins.c) can call back into a
 * user-defined Coral function without going through a Node/eval_call at
 * all. `line` is only used for its error messages. */
Value call_function(Value fn, Value *args, int argc, int line);

#endif
