#include <stdio.h>
#include <stdlib.h>

#include "debug.h"
#include "opcodes.h"

static int simple_instruction(const char *name, int offset) {
    printf("%s\n", name);
    return offset + 1;
}

static int constant_instruction(const char *name, Chunk *chunk, int offset) {
    unsigned char index = chunk->code[offset + 1];
    char *display = to_display_string(chunk->constants[index]);
    printf("%-18s %4d '%s'\n", name, index, display);
    free(display);
    return offset + 2;
}

static int jump_instruction(const char *name, int sign, Chunk *chunk, int offset) {
    unsigned int jump_len = (unsigned int)(chunk->code[offset + 1] << 8) | chunk->code[offset + 2];
    printf("%-18s %4d -> %d\n", name, offset, offset + 3 + (int)jump_len * sign);
    return offset + 3;
}

int disassemble_instruction(Chunk *chunk, int offset) {
    printf("%04d ", offset);
    if (offset > 0 && chunk->lines[offset] == chunk->lines[offset - 1]) {
        printf("   | ");
    } else {
        printf("%4d ", chunk->lines[offset]);
    }

    unsigned char instruction = chunk->code[offset];
    switch (instruction) {
        case OP_CONSTANT: return constant_instruction("OP_CONSTANT", chunk, offset);
        case OP_NIL: return simple_instruction("OP_NIL", offset);
        case OP_TRUE: return simple_instruction("OP_TRUE", offset);
        case OP_FALSE: return simple_instruction("OP_FALSE", offset);
        case OP_POP: return simple_instruction("OP_POP", offset);
        case OP_DUP: return simple_instruction("OP_DUP", offset);
        case OP_GET_GLOBAL: return constant_instruction("OP_GET_GLOBAL", chunk, offset);
        case OP_SET_GLOBAL: return constant_instruction("OP_SET_GLOBAL", chunk, offset);
        case OP_ADD: return simple_instruction("OP_ADD", offset);
        case OP_SUBTRACT: return simple_instruction("OP_SUBTRACT", offset);
        case OP_MULTIPLY: return simple_instruction("OP_MULTIPLY", offset);
        case OP_DIVIDE: return simple_instruction("OP_DIVIDE", offset);
        case OP_EQUAL: return simple_instruction("OP_EQUAL", offset);
        case OP_NOT_EQUAL: return simple_instruction("OP_NOT_EQUAL", offset);
        case OP_LESS: return simple_instruction("OP_LESS", offset);
        case OP_GREATER: return simple_instruction("OP_GREATER", offset);
        case OP_LESS_EQUAL: return simple_instruction("OP_LESS_EQUAL", offset);
        case OP_GREATER_EQUAL: return simple_instruction("OP_GREATER_EQUAL", offset);
        case OP_NEGATE: return simple_instruction("OP_NEGATE", offset);
        case OP_DISPLAY: {
            unsigned char argc = chunk->code[offset + 1];
            printf("%-18s %4d\n", "OP_DISPLAY", argc);
            return offset + 2;
        }
        case OP_BUILD_ARRAY: {
            unsigned char n = chunk->code[offset + 1];
            printf("%-18s %4d\n", "OP_BUILD_ARRAY", n);
            return offset + 2;
        }
        case OP_INDEX_GET: return simple_instruction("OP_INDEX_GET", offset);
        case OP_INDEX_SET: return simple_instruction("OP_INDEX_SET", offset);
        case OP_INDEX_DELETE: return simple_instruction("OP_INDEX_DELETE", offset);
        case OP_LIST_READ: return simple_instruction("OP_LIST_READ", offset);
        case OP_LIST_RESET: return simple_instruction("OP_LIST_RESET", offset);
        case OP_LIST_ADVANCE: return simple_instruction("OP_LIST_ADVANCE", offset);
        case OP_BUILD_OBJECT: {
            unsigned char count = chunk->code[offset + 1];
            printf("%-18s %4d\n", "OP_BUILD_OBJECT", count);
            return offset + 2 + count;
        }
        case OP_FIELD_GET: return constant_instruction("OP_FIELD_GET", chunk, offset);
        case OP_FIELD_SET: return constant_instruction("OP_FIELD_SET", chunk, offset);
        case OP_CALL_BUILTIN: {
            unsigned char id = chunk->code[offset + 1];
            unsigned char argc = chunk->code[offset + 2];
            printf("%-18s %4d argc=%d\n", "OP_CALL_BUILTIN", id, argc);
            return offset + 3;
        }
        case OP_JUMP: return jump_instruction("OP_JUMP", 1, chunk, offset);
        case OP_JUMP_IF_FALSE: return jump_instruction("OP_JUMP_IF_FALSE", 1, chunk, offset);
        case OP_LOOP: return jump_instruction("OP_LOOP", -1, chunk, offset);
        case OP_CALL: {
            unsigned char func_index = chunk->code[offset + 1];
            unsigned char argc = chunk->code[offset + 2];
            printf("%-18s %4d argc=%d\n", "OP_CALL", func_index, argc);
            return offset + 3;
        }
        case OP_CALL_BY_NAME: {
            unsigned char name_index = chunk->code[offset + 1];
            unsigned char argc = chunk->code[offset + 2];
            char *name = to_display_string(chunk->constants[name_index]);
            printf("%-18s %4d '%s' argc=%d\n", "OP_CALL_BY_NAME", name_index, name, argc);
            free(name);
            return offset + 3;
        }
        case OP_RETURN: return simple_instruction("OP_RETURN", offset);
        default:
            printf("unknown opcode %d\n", instruction);
            return offset + 1;
    }
}

void disassemble_chunk(Chunk *chunk, const char *name) {
    printf("== %s ==\n", name);
    for (int offset = 0; offset < chunk->count;) {
        offset = disassemble_instruction(chunk, offset);
    }
    for (int i = 0; i < chunk->function_count; i++) {
        char fn_name[256];
        snprintf(fn_name, sizeof(fn_name), "fn %s", chunk->functions[i].name);
        disassemble_chunk(chunk->functions[i].body, fn_name);
    }
}
