#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "lexer.h"

static void fatal_lex_error(int line, const char *msg) {
    fprintf(stderr, "Line %d: %s\n", line, msg);
    exit(1);
}

static void push_token(TokenList *list, Token tok) {
    if (list->count == list->capacity) {
        list->capacity = list->capacity == 0 ? 64 : list->capacity * 2;
        list->items = realloc(list->items, sizeof(Token) * list->capacity);
    }
    list->items[list->count++] = tok;
}

static char *dup_range(const char *start, int len) {
    char *out = malloc(len + 1);
    memcpy(out, start, len);
    out[len] = '\0';
    return out;
}

/* Indentation model ported directly from Coral's own lexer.c: each token
 * is stamped with the raw leading-whitespace character count of the line
 * it starts on (tabs and spaces both just count as 1). A line that
 * produces no real token (blank, or comment-only) never stamps anything,
 * which is exactly what makes such lines not count toward indentation
 * tracking -- see element.c's parse_creal_file, which compares a
 * candidate child line's indent against its container's. */
TokenList creal_lex(const char *source) {
    TokenList list = {0};
    int line = 1;
    const char *p = source;

    int at_line_start = 1;
    int col = 0;         /* whitespace characters seen so far at the start of this line */
    int line_indent = 0; /* indent stamped onto every token once the line's first real token appears */

    while (*p != '\0') {
        char c = *p;

        if (c == '\n') {
            line++;
            p++;
            at_line_start = 1;
            col = 0;
            continue;
        }
        if (at_line_start && (c == ' ' || c == '\t')) { col++; p++; continue; }
        if (!at_line_start && (c == ' ' || c == '\t' || c == '\r')) { p++; continue; }
        if (at_line_start && c == '\r') { p++; continue; }

        if (c == '/' && p[1] == '/') {
            while (*p != '\0' && *p != '\n') p++;
            continue; /* comment-only or trailing comment — never stamps a token */
        }

        if (at_line_start) {
            line_indent = col;
            at_line_start = 0;
        }

        if (c == '"') {
            const char *start = ++p;
            while (*p != '\0' && *p != '"') {
                if (*p == '\\') p++;
                p++;
            }
            if (*p != '"') fatal_lex_error(line, "this string is missing its closing \"");
            char *text = dup_range(start, (int)(p - start));
            p++;
            push_token(&list, (Token){TOK_STRING, text, line, line_indent});
            continue;
        }

        if (c == '#') {
            const char *start = p;
            p++;
            while (isxdigit((unsigned char)*p)) p++;
            if (p - start < 4) fatal_lex_error(line, "a color code needs at least 3 hex digits after '#'");
            push_token(&list, (Token){TOK_HEX, dup_range(start, (int)(p - start)), line, line_indent});
            continue;
        }

        if (isdigit((unsigned char)c)) {
            const char *start = p;
            while (isdigit((unsigned char)*p)) p++;
            if (*p == '.' && isdigit((unsigned char)p[1])) {
                p++;
                while (isdigit((unsigned char)*p)) p++;
            }
            push_token(&list, (Token){TOK_NUMBER, dup_range(start, (int)(p - start)), line, line_indent});
            continue;
        }

        if (c == ':') {
            push_token(&list, (Token){TOK_COLON, dup_range(p, 1), line, line_indent});
            p++;
            continue;
        }

        if (isalpha((unsigned char)c) || c == '_') {
            const char *start = p;
            while (isalnum((unsigned char)*p) || *p == '_') p++;
            push_token(&list, (Token){TOK_IDENT, dup_range(start, (int)(p - start)), line, line_indent});
            continue;
        }

        char msg[80];
        snprintf(msg, sizeof(msg), "'%c' isn't a character Creal understands here", c);
        fatal_lex_error(line, msg);
    }

    push_token(&list, (Token){TOK_EOF, NULL, line, 0});
    return list;
}
