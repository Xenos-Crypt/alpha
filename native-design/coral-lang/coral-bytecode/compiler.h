#ifndef CORAL_BYTECODE_COMPILER_H
#define CORAL_BYTECODE_COMPILER_H

#include "../c/ast.h"
#include "chunk.h"

/* Compiles a full program (as returned by c/parser.h's parse_program)
 * into `chunk`, which the caller owns (chunk_init it first, chunk_free it
 * when done). Exits the process with a line-numbered message on anything
 * not yet supported -- same "fatal, no recovery" contract the tree-walker
 * itself already has for runtime errors (see c/value.h's runtime_error),
 * not a new convention invented here. See coral-bytecode/README.md for
 * exactly what's supported so far. */
void compile(NodeList program, Chunk *chunk);

/* See compiler.c's own comment -- lets a function table (`root`) and the
 * chunk actually being compiled into (`target`) differ, for `include`'s
 * sake. `compile` above is just `compile_into(program, chunk, chunk)`. */
void compile_into(NodeList program, Chunk *root, Chunk *target);

#endif
