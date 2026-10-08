#include <setjmp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "interp.h"
#include "lexer.h"
#include "parser.h"
#include "repl.h"
#include "value.h"
#include "dirlist.h"

static char *trim(char *s) {
    while (*s == ' ' || *s == '\t' || *s == '\n' || *s == '\r') s++;
    if (*s == '\0') return s;
    char *end = s + strlen(s) - 1;
    while (end > s && (*end == ' ' || *end == '\t' || *end == '\n' || *end == '\r')) *end-- = '\0';
    return s;
}

static int is_blank_line(const char *line) {
    for (const char *c = line; *c; c++) {
        if (*c != ' ' && *c != '\t' && *c != '\n' && *c != '\r') return 0;
    }
    return 1;
}

static void grow_and_append(char *volatile *buf, size_t *len, size_t *cap, const char *more) {
    size_t more_len = strlen(more);
    if (*len + more_len + 1 > *cap) {
        while (*len + more_len + 1 > *cap) *cap *= 2;
        *buf = realloc(*buf, *cap);
    }
    memcpy(*buf + *len, more, more_len + 1);
    *len += more_len;
}

/* A tiny interactive loop: 'what is EXPR' evaluates EXPR immediately and
 * prints it (a read-only peek, see interp.c's eval_repl_expr) without
 * needing display/[.display] at all; anything else is accumulated line
 * by line into a chunk and run once a blank line is typed (Coral's
 * indentation-sensitive grammar has no other reliable way to know a
 * multi-line construct like [.task]/[.repeat]/if is finished, short of
 * that explicit signal). Every chunk runs against the same persistent
 * global scope, so a variable or task defined in one chunk is still
 * there for the next one. A bad line prints its error (via the usual
 * fatal_lex_error/fatal_parse_error/runtime_error paths) and returns to
 * the prompt instead of exiting -- see repl.h's coral_fatal.
 *
 * Known limitation, inherited on purpose rather than solved here: this
 * codebase never frees an AST/token stream, on the assumption a program
 * exits soon after running (see parser.c's own note on this). A REPL
 * doesn't exit between chunks, so a very long session does leak memory
 * per chunk -- acceptable for an interactive tool used in bursts, not
 * revisited unless it actually becomes a problem in practice. */
static void run_repl(void) {
    g_repl_mode = 1;
    printf("Coral REPL. Type Coral code; a blank line runs it.\n");
    printf("'what is EXPR' evaluates EXPR immediately. Type 'exit' to quit.\n");

    char line[4096];
    for (;;) {
        printf("> ");
        fflush(stdout);
        if (fgets(line, sizeof(line), stdin) == NULL) {
            printf("\n");
            return; /* EOF, e.g. Ctrl+D / Ctrl+Z */
        }

        /* Checked on a COPY, never on `line` itself: trim() mutates its
         * argument in place (nulling out trailing whitespace/newline),
         * and `line` still needs its real trailing '\n' intact below,
         * to correctly separate it from whatever line comes after it
         * once it's appended into a multi-line chunk. */
        char probe[sizeof(line)];
        strcpy(probe, line);
        char *trimmed = trim(probe);
        if (strcmp(trimmed, "exit") == 0 || strcmp(trimmed, "quit") == 0) {
            return;
        }
        if (trimmed[0] == '\0') {
            continue; /* a stray blank line at a fresh prompt does nothing */
        }

        if (strncmp(trimmed, "what is ", 8) == 0) {
            char *expr_src = trimmed + 8;
            if (setjmp(g_repl_recover_point) == 0) {
                TokenList tokens = lex(expr_src);
                Node *expr = parse_expression_only(tokens);
                Value v = eval_repl_expr(expr);
                char *s = to_display_string(v);
                printf("%s\n", s);
                free(s);
            }
            continue;
        }

        size_t cap = 256, len = 0;
        char *volatile buf = malloc(cap);
        buf[0] = '\0';
        grow_and_append(&buf, &len, &cap, line);

        for (;;) {
            printf(". ");
            fflush(stdout);
            if (fgets(line, sizeof(line), stdin) == NULL) break; /* EOF ends the chunk */
            if (is_blank_line(line)) break;
            grow_and_append(&buf, &len, &cap, line);
        }

        if (setjmp(g_repl_recover_point) == 0) {
            TokenList tokens = lex(buf);
            NodeList chunk = parse_program(tokens);
            run_repl_chunk(chunk);
        }
        free(buf);
    }
}

static char *read_file(const char *path) {
    FILE *f = fopen(path, "rb");
    if (f == NULL) {
        fprintf(stderr, "Could not open '%s'\n", path);
        exit(1);
    }
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);

    char *buf = malloc(size + 1);
    fread(buf, 1, size, f);
    buf[size] = '\0';
    fclose(f);
    return buf;
}

int main(int argc, char **argv) {
    /* Windows launches us this way when the user clicks a real ccc://
     * link anywhere on the machine, once register_ccc_protocol has run
     * (see dirlist.c) -- resolve it to the equivalent http:// address
     * and hand it to the real default browser, then exit; this is
     * never a normal ".co script" invocation. */
    if (argc == 3 && strcmp(argv[1], "--open-ccc-url") == 0) {
        if (!open_ccc_url(argv[2])) {
            fprintf(stderr, "couldn't open '%s'\n", argv[2]);
            return 1;
        }
        return 0;
    }
    if (argc == 1) {
        run_repl();
        return 0;
    }
    if (argc != 2) {
        fprintf(stderr, "usage: coral [file.co]\n");
        return 1;
    }

    char *source = read_file(argv[1]);
    TokenList tokens = lex(source);
    NodeList program = parse_program(tokens);
    run_program(program);

    return 0;
}
