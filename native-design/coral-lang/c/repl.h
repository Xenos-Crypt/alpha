#ifndef CORAL_REPL_H
#define CORAL_REPL_H

#include <setjmp.h>

/* Set to 1 for the lifetime of a REPL session (see main.c's run_repl),
 * left 0 for an ordinary `coral file.co` run. Every fatal lex/parse/
 * runtime error (lexer.c's fatal_lex_error, parser.c's
 * fatal_parse_error, value.c's runtime_error) already prints its
 * message before reaching coral_fatal() below -- this flag decides what
 * happens next: unwind back to the REPL loop so one bad line doesn't
 * end the whole session, or exit the process, which is exactly right
 * for a one-shot file run. */
extern int g_repl_mode;
extern jmp_buf g_repl_recover_point;

/* The shared tail of every fatal error path. REPL mode longjmps back to
 * whatever set g_repl_recover_point (main.c's run_repl, once per chunk);
 * otherwise this is just exit(1), unchanged from before the REPL existed. */
void coral_fatal(void) __attribute__((noreturn));

#endif
