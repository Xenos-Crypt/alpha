#ifndef CORAL_PARSER_H
#define CORAL_PARSER_H

#include "ast.h"
#include "lexer.h"

/* Parses a full token stream into a program (list of top-level statements).
 * Exits the process with a line-numbered message on a syntax error — see
 * the note in parser.c about why this prototype doesn't use error recovery. */
NodeList parse_program(TokenList tokens);

/* Parses exactly one expression, erroring if anything but EOF follows it
 * -- used by the REPL's 'what is EXPR' query, see main.c. */
Node *parse_expression_only(TokenList tokens);

#endif
