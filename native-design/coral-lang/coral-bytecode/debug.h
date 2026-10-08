#ifndef CORAL_BYTECODE_DEBUG_H
#define CORAL_BYTECODE_DEBUG_H

#include "chunk.h"

/* Prints every instruction in `chunk` in order, offset/line/opcode name/
 * decoded operand, to stdout -- the actual Phase 1 deliverable: with no
 * VM yet to execute a chunk, this is how a compiled chunk gets checked
 * for correctness, by a human reading it. See coral-bytecode/main.c. */
void disassemble_chunk(Chunk *chunk, const char *name);

/* Disassembles exactly one instruction starting at `offset`, prints it,
 * and returns the offset of the next instruction -- the building block
 * disassemble_chunk loops with; exposed separately since a future VM's
 * own debug/trace mode will want to disassemble just the one instruction
 * it's about to execute, not a whole chunk at once. */
int disassemble_instruction(Chunk *chunk, int offset);

#endif
