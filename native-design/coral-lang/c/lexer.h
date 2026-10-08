#ifndef CORAL_LEXER_H
#define CORAL_LEXER_H

typedef enum {
    TOK_NUMBER,
    TOK_STRING,
    TOK_IDENT,
    TOK_RETURN,
    TOK_IF,
    TOK_ELSE,
    TOK_DISPLAY,
    TOK_REPEAT,
    TOK_TIMES,
    TOK_BE,
    TOK_CALLED,
    TOK_CREATE,
    TOK_UPDATE,
    TOK_CHANGE,
    TOK_DELETE,
    TOK_REMOVE,
    TOK_TASK,
    TOK_USING,
    TOK_REPORT,
    TOK_RUN,
    TOK_ADD,
    TOK_TO,
    TOK_THEN,
    TOK_NOW,
    TOK_UNTIL,
    TOK_COUNT,
    TOK_LIST,
    TOK_LAST,
    TOK_FIRST,
    TOK_RANDOM,
    TOK_PUT,
    TOK_INTO,
    TOK_IT,
    TOK_AND,
    TOK_OR,
    TOK_EQEQ,
    TOK_NEQ,
    TOK_LE,
    TOK_GE,
    TOK_EQ,
    TOK_LT,
    TOK_GT,
    TOK_PLUS,
    TOK_MINUS,
    TOK_STAR,
    TOK_SLASH,
    TOK_LPAREN,
    TOK_RPAREN,
    TOK_LBRACKET,
    TOK_RBRACKET,
    TOK_LBRACE,
    TOK_RBRACE,
    TOK_DOT,
    TOK_COMMA,
    TOK_COLON,
    TOK_COMMENT, /* only ever produced by lex_with_comments, never by lex --
                  * see both functions' comments in lexer.c */
    TOK_EOF
} TokenType;

typedef struct {
    TokenType type;
    char *text;    /* raw lexeme, owned — used for identifiers and as the operator symbol */
    double number; /* valid when type == TOK_NUMBER */
    char *string;  /* decoded contents, owned, valid when type == TOK_STRING */
    int line;
    int indent;    /* indentation width (raw char count) of the line this token starts on */
    int start;     /* byte offset of the token's first character in the original source
                     * (comment/string tokens include their `//`/`"` delimiters in this
                     * range, even though `text`/`string` above store the delimiter-
                     * stripped content) -- exists for tokenize() (see builtins.c), which
                     * a highlighter needs to know exact source spans, not just text. */
    int length;    /* byte length of that same source span -- NOT always strlen(text)/
                     * strlen(string), since those are delimiter-stripped/escape-decoded
                     * for comments and strings while this always measures raw source. */
} Token;

typedef struct {
    Token *items;
    int count;
    int capacity;
} TokenList;

TokenList lex(const char *source);
/* Same scanner as lex(), except a '//' comment is pushed as a TOK_COMMENT
 * token (holding the text after '//') instead of being silently dropped.
 * Exists only for tokenize() (see builtins.c), which backs syntax
 * highlighting -- a highlighter needs to know where comments are, but
 * every other caller (the real parser, the REPL) has never needed to
 * see them and keeps using lex() completely unchanged. */
TokenList lex_with_comments(const char *source);
void free_tokens(TokenList *list);
const char *token_type_name(TokenType type);

#endif
