#include <stdlib.h>

#include "memory.h"

void retain(Value v) {
    if (v.type == VAL_ARRAY) {
        v.as.array->refcount++;
    } else if (v.type == VAL_OBJECT) {
        v.as.object->refcount++;
    }
}

void release(Value v) {
    if (v.type == VAL_ARRAY) {
        ArrayObj *arr = v.as.array;
        if (--arr->refcount > 0) return;
        for (int i = 0; i < arr->count; i++) {
            release(arr->items[i]);
        }
        free(arr->items);
        free(arr);
    } else if (v.type == VAL_OBJECT) {
        ObjectObj *obj = v.as.object;
        if (--obj->refcount > 0) return;
        for (int i = 0; i < obj->count; i++) {
            release(obj->values[i]);
            free(obj->keys[i]);
        }
        free(obj->keys);
        free(obj->values);
        free(obj);
    }
    /* Every other ValueType (nil/bool/number/string/function) isn't
     * refcounted -- see memory.h's own comment on why strings are out of
     * scope for now -- so retain/release are plain no-ops for them. */
}

void env_destroy(Env *env) {
    for (int i = 0; i < env->count; i++) {
        release(env->entries[i].value);
        free(env->entries[i].name);
    }
    free(env->entries);
    free(env);
}
