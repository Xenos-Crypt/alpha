#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "catalog.h"
#include "lexer.h"

static char *dup_str(const char *s) {
    size_t len = strlen(s);
    char *out = malloc(len + 1);
    memcpy(out, s, len + 1);
    return out;
}

static char *strip_extension(const char *filename) {
    char *out = dup_str(filename);
    char *dot = strrchr(out, '.');
    if (dot != NULL) *dot = '\0';
    return out;
}

static char *read_file(const char *path) {
    FILE *f = fopen(path, "rb");
    if (f == NULL) return NULL;
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = malloc(size + 1);
    fread(buf, 1, size, f);
    buf[size] = '\0';
    fclose(f);
    return buf;
}

/* A design file is just `key: value` lines — no element type, no content
 * string, since a catalog entry isn't a UI element (SYNTAX_v0.1.md's
 * "using" section). Reuses the same lexer Creal's own .cr files use.
 * Malformed files warn to stderr and stop parsing that one file, rather
 * than taking down catalog loading for every other design. */
static void parse_design_props(Design *d, const char *path) {
    char *source = read_file(path);
    if (source == NULL) {
        fprintf(stderr, "warning: could not read catalog file '%s'\n", path);
        return;
    }
    TokenList tokens = creal_lex(source);
    int pos = 0;
    while (tokens.items[pos].type != TOK_EOF) {
        if (tokens.items[pos].type != TOK_IDENT) {
            fprintf(stderr, "warning: %s: expected a property name, skipping rest of file\n", path);
            return;
        }
        char *key = tokens.items[pos].text;
        pos++;
        if (tokens.items[pos].type != TOK_COLON) {
            fprintf(stderr, "warning: %s: expected ':' after '%s', skipping rest of file\n", path, key);
            return;
        }
        pos++;
        Token *val_tok = &tokens.items[pos];
        if (val_tok->type != TOK_IDENT && val_tok->type != TOK_STRING &&
            val_tok->type != TOK_HEX && val_tok->type != TOK_NUMBER) {
            fprintf(stderr, "warning: %s: expected a value after '%s:', skipping rest of file\n", path, key);
            return;
        }
        d->props = realloc(d->props, sizeof(DesignProp) * (d->prop_count + 1));
        d->props[d->prop_count].key = key;
        d->props[d->prop_count].value = val_tok->text;
        d->prop_count++;
        pos++;
    }
}

static void push_design(Catalog *cat, Design d) {
    cat->items = realloc(cat->items, sizeof(Design) * (cat->count + 1));
    cat->items[cat->count++] = d;
}

Catalog load_catalog(const char *dir_path) {
    Catalog cat = {0};
    char search[MAX_PATH + 8];
    snprintf(search, sizeof(search), "%s\\*", dir_path);

    WIN32_FIND_DATAA fam_data;
    HANDLE fam_h = FindFirstFileA(search, &fam_data);
    if (fam_h == INVALID_HANDLE_VALUE) return cat; /* no catalog/ yet — fine, `using` just finds nothing */

    do {
        if (!(fam_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) continue;
        if (strcmp(fam_data.cFileName, ".") == 0 || strcmp(fam_data.cFileName, "..") == 0) continue;

        char fam_search[MAX_PATH * 2];
        snprintf(fam_search, sizeof(fam_search), "%s\\%s\\*.design", dir_path, fam_data.cFileName);

        WIN32_FIND_DATAA file_data;
        HANDLE file_h = FindFirstFileA(fam_search, &file_data);
        if (file_h == INVALID_HANDLE_VALUE) continue;

        do {
            Design d = {0};
            /* A file only holds its variant number ("1.design"), not the
             * family name — the folder it's filed under already says
             * that (design/c.txt). `using frost1` is family + variant
             * stuck together, so reconstruct that here rather than
             * requiring the file itself to repeat "frost". */
            char *variant = strip_extension(file_data.cFileName);
            char combined[512];
            snprintf(combined, sizeof(combined), "%s%s", fam_data.cFileName, variant);
            d.name = dup_str(combined);
            d.family = dup_str(fam_data.cFileName);

            char full_path[MAX_PATH * 3];
            snprintf(full_path, sizeof(full_path), "%s\\%s\\%s", dir_path, fam_data.cFileName, file_data.cFileName);
            parse_design_props(&d, full_path);

            push_design(&cat, d);
        } while (FindNextFileA(file_h, &file_data));
        FindClose(file_h);
    } while (FindNextFileA(fam_h, &fam_data));
    FindClose(fam_h);

    return cat;
}

const Design *catalog_find(const Catalog *cat, const char *name) {
    for (int i = 0; i < cat->count; i++) {
        if (_stricmp(cat->items[i].name, name) == 0) return &cat->items[i];
    }
    return NULL;
}

const char *design_prop(const Design *d, const char *key) {
    for (int i = 0; i < d->prop_count; i++) {
        if (strcmp(d->props[i].key, key) == 0) return d->props[i].value;
    }
    return NULL;
}
