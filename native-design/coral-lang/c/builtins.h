#ifndef CORAL_BUILTINS_H
#define CORAL_BUILTINS_H

#include "ast.h"
#include "value.h"

/* args are already-evaluated; node is kept only for line-number error
 * reporting inside the builtin's own body. */
typedef Value (*BuiltinFn)(Node *node, Value *args, int argc);

typedef struct {
    const char *name;
    int min_arity;
    int max_arity; /* -1 means unbounded */
    BuiltinFn fn;
} Builtin;

/* Returns NULL if `name` isn't a registered builtin -- callers fall back
 * to looking it up as a user-defined function in that case. */
const Builtin *find_builtin(const char *name);

#endif
