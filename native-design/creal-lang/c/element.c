#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "element.h"
#include "lexer.h"

static void fatal_parse_error(int line, const char *msg) {
    fprintf(stderr, "Line %d: %s\n", line, msg);
    exit(1);
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

static void push_element(ElementList *list, Element el) {
    list->items = realloc(list->items, sizeof(Element) * (list->count + 1));
    list->items[list->count++] = el;
}

static void push_attr(Element *el, char *key, char *value) {
    el->attrs = realloc(el->attrs, sizeof(Attr) * (el->attr_count + 1));
    el->attrs[el->attr_count].key = key;
    el->attrs[el->attr_count].value = value;
    el->attr_count++;
}

/* Parses every element indented strictly deeper than `container_indent`,
 * recursing into a fresh call (with THIS element's own indent as the new
 * floor) whenever the line right after an element sits deeper than that
 * element itself -- the exact same shape as Coral's parse_block_body.
 * container_indent == -1 at the top level (parse_creal_file below)
 * matches every real line's indent (>= 0), so a fully flat file is
 * parsed as one top-level list with zero children anywhere, exactly
 * reproducing this function's pre-B2 behavior. */
static ElementList parse_elements(TokenList *tokens, int *pos, int container_indent) {
    ElementList list = {0};

    while (tokens->items[*pos].type != TOK_EOF && tokens->items[*pos].indent > container_indent) {
        Token *type_tok = &tokens->items[*pos];
        if (type_tok->type != TOK_IDENT) {
            fatal_parse_error(type_tok->line, "expected an element type (like 'text' or 'button') here");
        }
        Element el = {0};
        el.type = type_tok->text;
        el.line = type_tok->line;
        int el_indent = type_tok->indent;
        (*pos)++;

        if (tokens->items[*pos].type == TOK_STRING && tokens->items[*pos].line == el.line) {
            el.content = tokens->items[*pos].text;
            (*pos)++;
        }

        while (tokens->items[*pos].line == el.line && tokens->items[*pos].type == TOK_IDENT) {
            char *key = tokens->items[*pos].text;
            (*pos)++;

            /* `using name` has no colon — it's a catalog reference, not a
             * key: value property (SYNTAX_v0.1.md's "using" section). */
            if (strcmp(key, "using") == 0) {
                Token *val_tok = &tokens->items[*pos];
                if (val_tok->line != el.line || val_tok->type != TOK_IDENT) {
                    fatal_parse_error(el.line, "expected a design name after 'using', like 'using frost1'");
                }
                push_attr(&el, key, val_tok->text);
                (*pos)++;
                continue;
            }

            if (tokens->items[*pos].type != TOK_COLON || tokens->items[*pos].line != el.line) {
                fatal_parse_error(el.line, "expected ':' after an attribute name");
            }
            (*pos)++;
            Token *val_tok = &tokens->items[*pos];
            if (val_tok->line != el.line ||
                (val_tok->type != TOK_IDENT && val_tok->type != TOK_STRING &&
                 val_tok->type != TOK_HEX && val_tok->type != TOK_NUMBER)) {
                fatal_parse_error(el.line, "expected a value after ':'");
            }
            push_attr(&el, key, val_tok->text);
            (*pos)++;
        }

        if (tokens->items[*pos].type != TOK_EOF && tokens->items[*pos].indent > el_indent) {
            ElementList children = parse_elements(tokens, pos, el_indent);
            el.children = children.items;
            el.child_count = children.count;
        }

        push_element(&list, el);
    }

    return list;
}

ElementList parse_creal_file(const char *path) {
    char *source = read_file(path);
    TokenList tokens = creal_lex(source);
    int pos = 0;
    return parse_elements(&tokens, &pos, -1);
}

const char *element_attr(const Element *el, const char *key) {
    for (int i = 0; i < el->attr_count; i++) {
        if (strcmp(el->attrs[i].key, key) == 0) return el->attrs[i].value;
    }
    return NULL;
}
