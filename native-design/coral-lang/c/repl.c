#include <stdlib.h>

#include "repl.h"

int g_repl_mode = 0;
jmp_buf g_repl_recover_point;

void coral_fatal(void) {
    if (g_repl_mode) {
        longjmp(g_repl_recover_point, 1);
    }
    exit(1);
}
