#ifndef CORAL_VALUE_H
#define CORAL_VALUE_H

#include "ast.h"

typedef struct Env Env;

typedef enum {
    VAL_NIL,
    VAL_BOOL,
    VAL_NUMBER,
    VAL_STRING,
    VAL_FUNCTION,
    VAL_ARRAY,
    VAL_OBJECT,
} ValueType;

typedef struct {
    Node *decl; /* ND_FUNC_DECL */
    Env *closure;
} FunctionObj;

typedef struct Value Value; /* forward declaration -- ArrayObj holds Value*
                              * before Value itself is fully defined below */

/* Reference semantics on purpose -- every Value that holds this ArrayObj
 * shares the same backing storage, so `arr[i] = v` (or a builtin like
 * `append`) is visible through every other name/variable pointing at the
 * same array, not just the one it was mutated through. Growth doubles,
 * same pattern as this project's other growable arrays (NodeList,
 * TokenList). */
typedef struct {
    Value *items;
    int count;
    int capacity;
    int list_cursor; /* 1-based cursor for 'now repeat {arr[.list]} until ...'
                       * -- reset to 1 when such a loop starts over this
                       * array, incremented by the loop mechanism itself
                       * after each pass, never touched by user code directly */
    int refcount;    /* Set to 1 here and never touched again by this tree-
                       * walking interpreter (which never frees anything --
                       * see the top-level README's "known simplification").
                       * coral-vm/memory.c is the only code that reads or
                       * changes this field, as part of Phase 3's reference-
                       * counted memory model; living here on the shared
                       * struct (rather than a coral-vm-only fork of it) costs
                       * this interpreter nothing since it's simply never
                       * touched. */
} ArrayObj;

/* Reference semantics, same rationale as ArrayObj above -- a [.change] on
 * a field is visible through every other variable holding the same
 * object. `keys[i]` is owned (heap-allocated, unlike an AST identifier's
 * borrowed text) since it can come from a builtin like parseJson at
 * runtime, not just from source text a token already owns. Field order
 * is preserved (insertion order), matching how the literal that built it
 * was written -- objects here are a small ordered list of pairs, not a
 * hash map; nothing in this language creates enough fields for that to
 * matter. */
typedef struct {
    char **keys;
    Value *values;
    int count;
    int capacity;
    int refcount; /* see ArrayObj's own comment on this same field */
} ObjectObj;

struct Value {
    ValueType type;
    union {
        int boolean;
        double number;
        char *string; /* owned, heap-allocated */
        FunctionObj *func;
        ArrayObj *array;
        ObjectObj *object;
    } as;
};

typedef struct {
    char *name;
    Value value;
} EnvEntry;

struct Env {
    Env *parent;
    EnvEntry *entries;
    int count;
    int capacity;
};

Env *env_new(Env *parent);

/* Walks the whole scope chain (like env_get) looking for an existing
 * binding to update in place -- including one declared OUTSIDE the
 * current function, e.g. a global -- falling back to creating a fresh
 * binding in env's own (innermost) scope only if the name doesn't exist
 * anywhere yet. No declare/const distinction — `name = value` behaves
 * the same whether it's the first assignment or the hundredth. */
void env_assign(Env *env, const char *name, Value value);

/* Walks the scope chain. On a miss, suggests the closest-spelled name
 * currently in scope (if any) rather than a bare "undefined" error. */
Value env_get(Env *env, const char *name, int line);

int is_truthy(Value value);
char *to_display_string(Value value); /* caller owns and should free the result */

Value nil_value(void);
Value bool_value(int b);
Value number_value(double n);
Value string_value(char *s); /* takes ownership of s */
Value array_value(ArrayObj *arr); /* takes ownership of arr */
Value object_value(ObjectObj *obj); /* takes ownership of obj */

ArrayObj *array_new(void);
void array_push(ArrayObj *arr, Value v);

ObjectObj *object_new(void);
/* Adds a new field, or overwrites the value of an existing one (by name,
 * first match) -- either way the object still owns `key` afterward
 * (copies it if it's a new field), so the caller's own copy is never
 * kept past this call. */
void object_set(ObjectObj *obj, const char *key, Value v);
/* NULL if `obj` has no field by that name -- callers needing a "does it
 * exist" answer without a runtime_error should check for NULL themselves
 * before deciding how to report a miss to the user. */
Value *object_get(ObjectObj *obj, const char *key);

void runtime_error(int line, const char *fmt, ...) __attribute__((noreturn));

#endif
