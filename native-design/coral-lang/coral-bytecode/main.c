#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../c/lexer.h"
#include "../c/parser.h"
#include "../c/repl.h"
#include "chunk.h"
#include "compiler.h"
#include "debug.h"
#include "vm.h"

/* repl.h declares g_repl_mode/g_repl_recover_point/coral_fatal, which
 * c/parser.c's fatal_parse_error (used for a real syntax error in the
 * input .co file) calls into -- linking against c/repl.c directly rather
 * than redefining these here keeps that error path identical to the
 * tree-walker's own (print and exit, no recovery), consistent with this
 * being a plain one-shot CLI tool. */

static char *read_file(const char *path) {
    FILE *f = fopen(path, "rb");
    if (f == NULL) {
        fprintf(stderr, "Could not open '%s'\n", path);
        exit(1);
    }
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);

    char *buf = malloc((size_t)size + 1);
    fread(buf, 1, (size_t)size, f);
    buf[size] = '\0';
    fclose(f);
    return buf;
}

int main(int argc, char **argv) {
    /* Phase 2: default is now run it, matching c/coral.exe's own
     * "compile and go" usage -- `--disasm` keeps Phase 1's read-the-
     * bytecode-yourself verification path available on demand. */
    int disasm = argc == 3 && strcmp(argv[2], "--disasm") == 0;
    if (argc != 2 && !disasm) {
        fprintf(stderr, "usage: coral-bytecode file.co [--disasm]\n");
        return 1;
    }

    char *source = read_file(argv[1]);
    TokenList tokens = lex(source);
    NodeList program = parse_program(tokens);

    Chunk chunk;
    chunk_init(&chunk);
    compile(program, &chunk);

    if (disasm) {
        disassemble_chunk(&chunk, argv[1]);
    } else {
        vm_interpret(&chunk);
    }

    chunk_free(&chunk);

    return 0;
}
