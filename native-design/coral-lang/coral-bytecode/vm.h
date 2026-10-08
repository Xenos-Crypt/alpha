#ifndef CORAL_BYTECODE_VM_H
#define CORAL_BYTECODE_VM_H

#include "chunk.h"

#define STACK_MAX 256

/* Globals live in a plain c/value.h Env (parent == NULL) -- the same
 * structure and the same env_assign/env_get "no let/const, first
 * assignment and reassignment both just work" semantics c/interp.c's
 * tree-walker already uses for ND_IDENTIFIER/ND_ASSIGN, including the
 * closest-spelled-name suggestion on a miss. Reusing it rather than a
 * VM-owned table keeps that behavior identical for free.
 *
 * Declared here (not just in vm.c) so a platform-specific builtins file
 * (vm_builtins_win.c, vm_builtins_xenos.c -- see call_builtin's own
 * comment below) can see it too, without either one needing to be the
 * sole owner of the VM's internals. */
typedef struct {
    Value stack[STACK_MAX];
    int stack_top;
    Env *globals;
    Env *current_env;  /* the env OP_GET_GLOBAL/OP_SET_GLOBAL actually use
                         * -- globals at the top level, a fresh per-call Env
                         * while a function body is running (see
                         * call_function below), same "env" parameter
                         * c/interp.c's eval/exec_stmt thread everywhere. */
    Chunk *root;        /* owns the one shared function table -- see
                          * chunk.h's FuncDecl comment and compiler.c's
                          * g_root for why there's only one. */
} VM;

/* Phase 2: the VM loop that actually executes a compiled Chunk, matching
 * c/coral.exe's tree-walking behavior exactly (same output, same runtime
 * errors via c/value.h's runtime_error) -- see README.md. Phase 3 added
 * real reference-counted reclamation (memory.h) on top, so this no
 * longer leaks on purpose the way it did at first. */
void vm_interpret(Chunk *chunk);

/* Exposed (not `static`) so a platform-specific builtins file can call
 * back into the VM: run() for include()/uiEmbedApp's "compile a second
 * program and execute it" cases, call_function() for a ui* callback
 * trampoline invoking a resolved func_index. Both still live in vm.c --
 * only their visibility changed. */
Value run(VM *vm, Chunk *chunk);
Value call_function(VM *vm, int func_index, Value *args, int argc, int line);

/* The small builtin dispatch table (see opcodes.h's OP_CALL_BUILTIN) --
 * deliberately NOT defined in vm.c itself, since which builtins exist at
 * all is a platform decision (file I/O/JSON/UI/native-jobs on a normal
 * desktop build via vm_builtins_win.c; a much smaller syscall-backed set
 * on xenos-os via vm_builtins_xenos.c, see that file's own comment) --
 * vm.c's `run()` calls this by id by name alone, with zero knowledge of
 * which builtins are actually behind it on a given platform. An id with
 * no case on whichever platform file is actually linked in is a genuine
 * runtime error ("unknown builtin"), not a silent gap -- see compiler.c's
 * builtin_id, which stays the same shared table on every platform (a
 * name compiling successfully doesn't guarantee it does anything at
 * runtime on every platform; it guarantees the compiler recognizes the
 * name as A builtin, same as any other "fails loudly, not silently"
 * policy in this project). */
Value call_builtin(VM *vm, unsigned char id, Value *args, int argc, int line);

#endif
