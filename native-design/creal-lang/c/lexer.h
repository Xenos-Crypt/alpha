#ifndef CREAL_LEXER_H
#define CREAL_LEXER_H

/* Named CrealTokenType, not TokenType — the Windows SDK's <winnt.h>
 * already uses "TokenType" as an enum constant (_TOKEN_INFORMATION_CLASS,
 * part of the security-token API), which collides with a plain typedef of
 * the same name once a file includes both <windows.h> and this header
 * (catalog.c does, to scan the catalog directory). */
typedef enum {
    TOK_IDENT,
    TOK_STRING,
    TOK_HEX,
    TOK_NUMBER, /* a bare numeric attribute value, e.g. `height: 300` --
                 * stored as raw text in Token.text (no decoded numeric
                 * field, unlike Coral's own TOK_NUMBER), since every
                 * consumer here (element_attr/design_prop) just hands
                 * back a string either way and expects the caller
                 * (e.g. win32_backend.c's atoi(height_attr)) to parse
                 * it -- adding one avoids needing to write attribute
                 * values that happen to be numbers as quoted strings. */
    TOK_COLON,
    TOK_EOF
} CrealTokenType;

typedef struct {
    CrealTokenType type;
    char *text; /* owned; the identifier, decoded string, or hex code including '#' */
    int line;
    int indent; /* indentation width (raw char count) of the line this token starts on --
                  * same model as Coral's own lexer.h, ported here for B2's row/column
                  * containers: a child element's lines sit deeper-indented than their
                  * container's own line, exactly like a Coral block's body does. */
} Token;

typedef struct {
    Token *items;
    int count;
    int capacity;
} TokenList;

/* Named creal_lex, not lex -- once this file links into coral.exe
 * alongside Coral's own lexer.c (see the Coral<->Creal bridge), a plain
 * `lex` would collide at link time with Coral's global `TokenList
 * lex(const char *)`, which has the same name and signature but a
 * completely incompatible Token/TokenList layout. Same kind of rename
 * CrealTokenType already needed to dodge <windows.h>, just against a
 * different collision. */
TokenList creal_lex(const char *source);

#endif
