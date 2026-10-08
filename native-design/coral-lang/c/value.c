#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "value.h"
#include "repl.h"

void runtime_error(int line, const char *fmt, ...) {
    va_list args;
    va_start(args, fmt);
    fprintf(stderr, "Line %d: ", line);
    vfprintf(stderr, fmt, args);
    fprintf(stderr, "\n");
    va_end(args);
    coral_fatal();
}

Value nil_value(void) { Value v; v.type = VAL_NIL; return v; }
Value bool_value(int b) { Value v; v.type = VAL_BOOL; v.as.boolean = b; return v; }
Value number_value(double n) { Value v; v.type = VAL_NUMBER; v.as.number = n; return v; }
Value string_value(char *s) { Value v; v.type = VAL_STRING; v.as.string = s; return v; }
Value array_value(ArrayObj *arr) { Value v; v.type = VAL_ARRAY; v.as.array = arr; return v; }
Value object_value(ObjectObj *obj) { Value v; v.type = VAL_OBJECT; v.as.object = obj; return v; }

ArrayObj *array_new(void) {
    ArrayObj *arr = malloc(sizeof(ArrayObj));
    arr->items = NULL;
    arr->count = 0;
    arr->capacity = 0;
    arr->list_cursor = 1;
    arr->refcount = 1; /* see the field's own comment in value.h -- this
                         * interpreter never reads or changes it again */
    return arr;
}

void array_push(ArrayObj *arr, Value v) {
    if (arr->count == arr->capacity) {
        arr->capacity = arr->capacity == 0 ? 8 : arr->capacity * 2;
        arr->items = realloc(arr->items, sizeof(Value) * arr->capacity);
    }
    arr->items[arr->count++] = v;
}

ObjectObj *object_new(void) {
    ObjectObj *obj = malloc(sizeof(ObjectObj));
    obj->keys = NULL;
    obj->values = NULL;
    obj->count = 0;
    obj->capacity = 0;
    obj->refcount = 1; /* see ArrayObj's own comment in value.h */
    return obj;
}

void object_set(ObjectObj *obj, const char *key, Value v) {
    for (int i = 0; i < obj->count; i++) {
        if (strcmp(obj->keys[i], key) == 0) {
            obj->values[i] = v;
            return;
        }
    }
    if (obj->count == obj->capacity) {
        obj->capacity = obj->capacity == 0 ? 8 : obj->capacity * 2;
        obj->keys = realloc(obj->keys, sizeof(char *) * obj->capacity);
        obj->values = realloc(obj->values, sizeof(Value) * obj->capacity);
    }
    obj->keys[obj->count] = strdup(key);
    obj->values[obj->count] = v;
    obj->count++;
}

Value *object_get(ObjectObj *obj, const char *key) {
    for (int i = 0; i < obj->count; i++) {
        if (strcmp(obj->keys[i], key) == 0) return &obj->values[i];
    }
    return NULL;
}

Env *env_new(Env *parent) {
    Env *env = calloc(1, sizeof(Env));
    env->parent = parent;
    return env;
}

static EnvEntry *find_local(Env *env, const char *name) {
    for (int i = 0; i < env->count; i++) {
        if (strcmp(env->entries[i].name, name) == 0) return &env->entries[i];
    }
    return NULL;
}

void env_assign(Env *env, const char *name, Value value) {
    /* Walks the WHOLE scope chain looking for an existing binding first
     * -- not just env's own scope -- so [.change]/'=' inside a function
     * can update a variable declared OUTSIDE it (a global, most often)
     * instead of silently creating a same-named LOCAL shadow that
     * vanishes the instant the function returns, leaving the real
     * variable untouched. A binding found zero hops up (i.e. already in
     * env's own scope) is updated exactly as before -- this only changes
     * behavior for a name that exists further OUT, which previously had
     * no way to be reached from here at all. Only creates a fresh
     * binding, in env's own innermost scope, when the name isn't found
     * anywhere in the chain. */
    for (Env *e = env; e != NULL; e = e->parent) {
        EnvEntry *existing = find_local(e, name);
        if (existing != NULL) {
            existing->value = value;
            return;
        }
    }
    if (env->count == env->capacity) {
        env->capacity = env->capacity == 0 ? 8 : env->capacity * 2;
        env->entries = realloc(env->entries, sizeof(EnvEntry) * env->capacity);
    }
    env->entries[env->count].name = strdup(name);
    env->entries[env->count].value = value;
    env->count++;
}

/* Damerau-Levenshtein (optimal string alignment) edit distance: insert,
 * delete, substitute, and adjacent transposition all cost 1. Plain
 * Levenshtein scores a swapped-letter typo like "usre" vs "user" as 2
 * (two substitutions), which is exactly the kind of common typo this
 * suggestion exists to catch — transposition support is what makes it
 * actually catch it. Full table, not the rolling two-row version, since
 * transposition needs to look back two rows; fine for short identifiers,
 * this never runs on a hot path. */
static int levenshtein(const char *a, const char *b) {
    int la = (int)strlen(a), lb = (int)strlen(b);
    int rows = la + 1, cols = lb + 1;
    int *d = malloc(sizeof(int) * rows * cols);
#define D(i, j) d[(i) * cols + (j)]

    for (int i = 0; i <= la; i++) D(i, 0) = i;
    for (int j = 0; j <= lb; j++) D(0, j) = j;

    for (int i = 1; i <= la; i++) {
        for (int j = 1; j <= lb; j++) {
            int cost = (a[i - 1] == b[j - 1]) ? 0 : 1;
            int del = D(i - 1, j) + 1;
            int ins = D(i, j - 1) + 1;
            int sub = D(i - 1, j - 1) + cost;
            int m = del < ins ? del : ins;
            if (sub < m) m = sub;
            if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) {
                int trans = D(i - 2, j - 2) + cost;
                if (trans < m) m = trans;
            }
            D(i, j) = m;
        }
    }
    int result = D(la, lb);
#undef D
    free(d);
    return result;
}

static const char *suggest_name(Env *env, const char *name) {
    const char *best = NULL;
    int best_dist = 1000000;
    for (Env *e = env; e != NULL; e = e->parent) {
        for (int i = 0; i < e->count; i++) {
            const char *candidate = e->entries[i].name;
            int dist = levenshtein(name, candidate);
            if (dist < best_dist) {
                best_dist = dist;
                best = candidate;
            }
        }
    }
    int name_len = (int)strlen(name);
    int threshold = name_len <= 4 ? 1 : (name_len <= 8 ? 2 : 3);
    return (best != NULL && best_dist <= threshold) ? best : NULL;
}

Value env_get(Env *env, const char *name, int line) {
    for (Env *e = env; e != NULL; e = e->parent) {
        EnvEntry *entry = find_local(e, name);
        if (entry != NULL) return entry->value;
    }
    const char *suggestion = suggest_name(env, name);
    if (suggestion != NULL) {
        runtime_error(line, "'%s' isn't defined. Did you mean '%s'?", name, suggestion);
    } else {
        runtime_error(line, "'%s' isn't defined", name);
    }
    return nil_value(); /* unreachable */
}

int is_truthy(Value value) {
    switch (value.type) {
        case VAL_NIL: return 0;
        case VAL_BOOL: return value.as.boolean;
        case VAL_NUMBER: return value.as.number != 0.0;
        case VAL_STRING: return value.as.string[0] != '\0';
        case VAL_FUNCTION: return 1;
        case VAL_ARRAY: return value.as.array->count != 0;
        case VAL_OBJECT: return value.as.object->count != 0;
    }
    return 0;
}

/* Grows *dst (realloc-doubling *cap, same pattern as everything else
 * growable here) and appends `more` onto the end at *len, keeping dst
 * NUL-terminated throughout -- the small shared building block behind
 * VAL_ARRAY's "[item, item, ...]" formatting below. */
static void str_append(char **dst, size_t *len, size_t *cap, const char *more) {
    size_t more_len = strlen(more);
    if (*len + more_len + 1 > *cap) {
        while (*len + more_len + 1 > *cap) *cap *= 2;
        *dst = realloc(*dst, *cap);
    }
    memcpy(*dst + *len, more, more_len + 1); /* +1 copies the NUL too */
    *len += more_len;
}

/* Always returns a freshly malloc'd string — the caller (print, or string
 * concatenation) is expected to free it once done. */
char *to_display_string(Value value) {
    char buf[64];
    switch (value.type) {
        case VAL_NIL:
            return strdup("nil");
        case VAL_BOOL:
            return strdup(value.as.boolean ? "true" : "false");
        case VAL_NUMBER: {
            double n = value.as.number;
            if (n == (long long)n) {
                snprintf(buf, sizeof(buf), "%lld", (long long)n);
            } else {
                snprintf(buf, sizeof(buf), "%g", n);
            }
            return strdup(buf);
        }
        case VAL_STRING:
            return strdup(value.as.string);
        case VAL_FUNCTION:
            return strdup("<function>");
        case VAL_ARRAY: {
            size_t cap = 32, len = 0;
            char *out = malloc(cap);
            out[0] = '\0';
            str_append(&out, &len, &cap, "[");
            for (int i = 0; i < value.as.array->count; i++) {
                if (i > 0) str_append(&out, &len, &cap, ", ");
                char *item_str = to_display_string(value.as.array->items[i]);
                str_append(&out, &len, &cap, item_str);
                free(item_str);
            }
            str_append(&out, &len, &cap, "]");
            return out;
        }
        case VAL_OBJECT: {
            size_t cap = 32, len = 0;
            char *out = malloc(cap);
            out[0] = '\0';
            str_append(&out, &len, &cap, "[");
            for (int i = 0; i < value.as.object->count; i++) {
                if (i > 0) str_append(&out, &len, &cap, ", ");
                str_append(&out, &len, &cap, value.as.object->keys[i]);
                str_append(&out, &len, &cap, ": ");
                char *val_str = to_display_string(value.as.object->values[i]);
                str_append(&out, &len, &cap, val_str);
                free(val_str);
            }
            str_append(&out, &len, &cap, "]");
            return out;
        }
    }
    return strdup("");
}
