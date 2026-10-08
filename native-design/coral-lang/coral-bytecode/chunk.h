#ifndef CORAL_BYTECODE_CHUNK_H
#define CORAL_BYTECODE_CHUNK_H

#include "../c/value.h"

/* A compiled unit: a flat byte array of opcodes + operands (see
 * opcodes.h), a parallel line-number array (one entry per byte in
 * `code`, for error messages -- simple and wasteful rather than
 * run-length-encoded, matching this project's existing TokenList/
 * NodeList "simple growable array" style; revisit only if chunk size
 * ever actually matters), and a constant pool (`Value`s baked in by the
 * compiler -- number/string/bool/nil literals, and every global
 * variable's name as a string constant for OP_*_GLOBAL to reference).
 *
 * Reuses `c/`'s own `Value` type directly for constants rather than
 * defining a separate one -- this is still Phase 1 (compile and
 * disassemble, not execute yet, see coral-bytecode/README.md), so there
 * is no VM-owned memory/refcounting model to keep separate from the
 * tree-walker's yet. That distinction becomes real in the Phase 3 memory
 * work, not before. */
/* A compiled [.task]/function: its own Chunk (a call runs it the same way
 * the top-level program runs, just with a fresh Env for parameters/locals
 * instead of globals -- see vm.c's call handling), plus the param names
 * OP_CALL needs to bind arguments to. Looked up by name at compile time
 * (every call site is a plain name, matching this language's own "calls
 * are always to a named task" shape -- see compiler.c's compile_call),
 * so there's no need to represent a function as a runtime Value at all. */
typedef struct {
    char *name;
    char **params;
    int param_count;
    struct Chunk *body;
} FuncDecl;

typedef struct Chunk {
    unsigned char *code;
    int *lines;
    int count;
    int capacity;

    Value *constants;
    int constant_count;
    int constant_capacity;

    FuncDecl *functions;
    int function_count;
    int function_capacity;
} Chunk;

void chunk_init(Chunk *chunk);
void chunk_free(Chunk *chunk);

/* Registers a compiled function in `chunk`'s function table (every chunk
 * -- the top-level program's and each function body's own -- gets its own
 * table copy; see compiler.c's compile() prepass for why that's fine).
 * Takes ownership of `params` and `body`. Returns its table index, the
 * operand OP_CALL needs. */
int chunk_add_function(Chunk *chunk, const char *name, char **params, int param_count, struct Chunk *body);

/* -1 if no function by that name is registered. */
int chunk_find_function(Chunk *chunk, const char *name);

/* Appends one raw byte (an opcode or an operand byte) with the source
 * line it came from. */
void chunk_write(Chunk *chunk, unsigned char byte, int line);

/* Adds `value` to the constant pool and returns its index -- callers
 * needing that index to fit in a single operand byte (every current
 * opcode's constant operand is u8) are responsible for checking it
 * against 255 themselves; see compiler.c's own bounded-pool comment. */
int chunk_add_constant(Chunk *chunk, Value value);

#endif
