#include <stdlib.h>
#include <string.h>

#include "chunk.h"

void chunk_init(Chunk *chunk) {
    chunk->code = NULL;
    chunk->lines = NULL;
    chunk->count = 0;
    chunk->capacity = 0;
    chunk->constants = NULL;
    chunk->constant_count = 0;
    chunk->constant_capacity = 0;
    chunk->functions = NULL;
    chunk->function_count = 0;
    chunk->function_capacity = 0;
}

void chunk_free(Chunk *chunk) {
    free(chunk->code);
    free(chunk->lines);
    free(chunk->constants);
    /* Function bodies/names/params are deliberately left alone -- same
     * "leak on purpose, proving correctness comes first" stance Phase 2
     * already takes (see vm.c), and a function can outlive the chunk that
     * declared it for as long as the program runs anyway. */
    chunk_init(chunk);
}

int chunk_add_function(Chunk *chunk, const char *name, char **params, int param_count, struct Chunk *body) {
    if (chunk->function_count + 1 > chunk->function_capacity) {
        chunk->function_capacity = chunk->function_capacity < 8 ? 8 : chunk->function_capacity * 2;
        chunk->functions = realloc(chunk->functions, (size_t)chunk->function_capacity * sizeof(FuncDecl));
    }
    FuncDecl *fn = &chunk->functions[chunk->function_count];
    fn->name = strdup(name);
    fn->params = params;
    fn->param_count = param_count;
    fn->body = body;
    return chunk->function_count++;
}

int chunk_find_function(Chunk *chunk, const char *name) {
    for (int i = 0; i < chunk->function_count; i++) {
        if (strcmp(chunk->functions[i].name, name) == 0) return i;
    }
    return -1;
}

void chunk_write(Chunk *chunk, unsigned char byte, int line) {
    if (chunk->count + 1 > chunk->capacity) {
        chunk->capacity = chunk->capacity < 8 ? 8 : chunk->capacity * 2;
        chunk->code = realloc(chunk->code, (size_t)chunk->capacity * sizeof(unsigned char));
        chunk->lines = realloc(chunk->lines, (size_t)chunk->capacity * sizeof(int));
    }
    chunk->code[chunk->count] = byte;
    chunk->lines[chunk->count] = line;
    chunk->count++;
}

int chunk_add_constant(Chunk *chunk, Value value) {
    if (chunk->constant_count + 1 > chunk->constant_capacity) {
        chunk->constant_capacity = chunk->constant_capacity < 8 ? 8 : chunk->constant_capacity * 2;
        chunk->constants = realloc(chunk->constants, (size_t)chunk->constant_capacity * sizeof(Value));
    }
    chunk->constants[chunk->constant_count] = value;
    return chunk->constant_count++;
}
