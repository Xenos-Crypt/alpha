#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../c/value.h"
#include "memory.h"
#include "opcodes.h"
#include "vm.h"

/* VM is declared in vm.h now, not here -- see that file's own comment on
 * why: a platform-specific builtins file (vm_builtins_win.c,
 * vm_builtins_xenos.c) needs to see it too. call_builtin itself lives in
 * whichever one of those is actually linked in for a given platform, not
 * in this file -- see vm.h's own comment on call_builtin. */

static void push(VM *vm, Value value) {
    if (vm->stack_top == STACK_MAX) {
        fprintf(stderr, "coral-vm: stack overflow\n");
        exit(1);
    }
    vm->stack[vm->stack_top++] = value;
}

static Value pop(VM *vm) {
    return vm->stack[--vm->stack_top];
}

static Value peek(VM *vm, int distance) {
    return vm->stack[vm->stack_top - 1 - distance];
}

/* Walks the whole scope chain looking for an EXISTING binding, same reach
 * as env_assign's own walk -- but returns NULL on a miss instead of
 * creating one, and never prints anything, unlike env_get. Needed only to
 * find (and release) whatever value a name is ABOUT to be overwritten
 * with; c/value.c's equivalent helper (find_local) is static, but Env's
 * fields are public (see value.h), so this needs no changes there. */
static Value *env_try_get(Env *env, const char *name) {
    for (Env *e = env; e != NULL; e = e->parent) {
        for (int i = 0; i < e->count; i++) {
            if (strcmp(e->entries[i].name, name) == 0) return &e->entries[i].value;
        }
    }
    return NULL;
}

/* Binds `value` (already carrying its own owned unit, popped straight off
 * the VM stack -- see memory.h's own comment on ownership moving by pure
 * transfer) into `name`, releasing whatever value it's replacing first.
 * Used everywhere a name gets (re)bound at the Env level: OP_SET_GLOBAL. */
static void env_transfer(Env *env, const char *name, Value value) {
    Value *existing = env_try_get(env, name);
    if (existing != NULL) {
        release(*existing);
    }
    env_assign(env, name, value);
}

/* Mirrors c/interp.c's eval_binary == / != exactly, including VAL_OBJECT
 * falling through to "never equal" (the tree-walker never gives object
 * equality its own case either) -- see that function's own comment. */
static int values_equal(Value left, Value right) {
    if (left.type != right.type) return 0;
    switch (left.type) {
        case VAL_NIL: return 1;
        case VAL_BOOL: return left.as.boolean == right.as.boolean;
        case VAL_NUMBER: return left.as.number == right.as.number;
        case VAL_STRING: return strcmp(left.as.string, right.as.string) == 0;
        case VAL_FUNCTION: return left.as.func == right.as.func;
        case VAL_ARRAY: return left.as.array == right.as.array;
        default: return 0;
    }
}

/* Reads a line number for the instruction the VM is currently executing --
 * runtime_error's own line-number argument, same as every runtime_error
 * call in c/interp.c already does with a Node's ->line. */
static int current_line(Chunk *chunk, int ip) {
    return chunk->lines[ip - 1];
}

static void binary_add(VM *vm, Chunk *chunk, int ip) {
    Value right = pop(vm);
    Value left = pop(vm);
    if (left.type == VAL_STRING || right.type == VAL_STRING) {
        char *ls = to_display_string(left);
        char *rs = to_display_string(right);
        char *combined = malloc(strlen(ls) + strlen(rs) + 1);
        strcpy(combined, ls);
        strcat(combined, rs);
        free(ls);
        free(rs);
        push(vm, string_value(combined));
        return;
    }
    if (left.type != VAL_NUMBER || right.type != VAL_NUMBER) {
        runtime_error(current_line(chunk, ip), "'+' needs two numbers or two strings here");
    }
    push(vm, number_value(left.as.number + right.as.number));
}

/* Covers - * / < > <= >= -- every remaining binary numeric op, all of
 * which share eval_binary's own "both operands must be numbers" guard. */
static void binary_numeric(VM *vm, Chunk *chunk, int ip, OpCode op) {
    Value right = pop(vm);
    Value left = pop(vm);
    if (left.type != VAL_NUMBER || right.type != VAL_NUMBER) {
        runtime_error(current_line(chunk, ip), "that operator needs two numbers here");
    }
    double a = left.as.number, b = right.as.number;
    switch (op) {
        case OP_SUBTRACT: push(vm, number_value(a - b)); return;
        case OP_MULTIPLY: push(vm, number_value(a * b)); return;
        case OP_DIVIDE:
            if (b == 0.0) runtime_error(current_line(chunk, ip), "can't divide by zero");
            push(vm, number_value(a / b));
            return;
        case OP_LESS: push(vm, bool_value(a < b)); return;
        case OP_GREATER: push(vm, bool_value(a > b)); return;
        case OP_LESS_EQUAL: push(vm, bool_value(a <= b)); return;
        case OP_GREATER_EQUAL: push(vm, bool_value(a >= b)); return;
        default: return; /* unreachable, callers only pass the ops above */
    }
}

/* 1-based to the user, 0-based in storage, translated at this one spot --
 * matches c/interp.c's ND_INDEX comment exactly, including reporting the
 * user's own 1-based number (not the translated one) on an out-of-range
 * error. Shared by OP_INDEX_GET/SET/DELETE so all three stay consistent. */
static int to_0based_index(Value idx_val, int line) {
    if (idx_val.type != VAL_NUMBER) {
        runtime_error(line, "an index needs to be a number here");
    }
    return (int)idx_val.as.number - 1;
}

/* Runs one [.task] call: a fresh Env (parented to globals, not to the
 * caller's env -- every task compiled so far is a top-level declaration,
 * same scope c/interp.c's ND_FUNC_DECL closes over for one) holding just
 * the bound parameters, then `run`s the function's own compiled body
 * Chunk against it, same as running the top-level program against
 * globals. Argument count mismatch is checked here (not at compile time)
 * to match c/interp.c's call_function_value, including its exact message. */
Value call_function(VM *vm, int func_index, Value *args, int argc, int line) {
    FuncDecl *fn = &vm->root->functions[func_index];
    if (argc != fn->param_count) {
        runtime_error(line, "'%s' expects %d argument(s), but got %d", fn->name, fn->param_count, argc);
    }

    Env *call_env = env_new(vm->globals);
    for (int i = 0; i < argc; i++) {
        env_assign(call_env, fn->params[i], args[i]);
    }

    Env *saved_env = vm->current_env;
    vm->current_env = call_env;
    Value result = run(vm, fn->body);
    vm->current_env = saved_env;

    /* retain BEFORE destroying the frame: `result` might alias one of
     * call_env's own bindings (returning a local variable, the common
     * case), and env_destroy is about to release every one of them
     * unconditionally. This retain is what makes the value coming back
     * out of this call an owned unit again -- the same "copy of an
     * existing owned value" retain OP_GET_GLOBAL/OP_INDEX_GET/OP_FIELD_GET
     * do, just for a function's return value instead of a variable read.
     * See memory.h's comment for the general rule. */
    retain(result);
    env_destroy(call_env);
    return result;
}

Value run(VM *vm, Chunk *chunk) {
    int ip = 0;
    for (;;) {
        unsigned char instruction = chunk->code[ip++];
        switch (instruction) {
            case OP_CONSTANT: {
                unsigned char index = chunk->code[ip++];
                push(vm, chunk->constants[index]);
                break;
            }
            case OP_NIL: push(vm, nil_value()); break;
            case OP_TRUE: push(vm, bool_value(1)); break;
            case OP_FALSE: push(vm, bool_value(0)); break;
            case OP_POP: release(pop(vm)); break;
            case OP_DUP: {
                Value v = peek(vm, 0);
                retain(v);
                push(vm, v);
                break;
            }

            case OP_GET_GLOBAL: {
                unsigned char index = chunk->code[ip++];
                const char *name = chunk->constants[index].as.string;
                Value v = env_get(vm->current_env, name, current_line(chunk, ip));
                /* Same one-line warning as c/interp.c's ND_IDENTIFIER case
                 * -- a nil-valued variable reads as "never assigned". */
                if (v.type == VAL_NIL) {
                    fprintf(stderr, "warning: {%s} hasn't been given a value yet, using empty\n", name);
                }
                retain(v); /* a new, independent stack copy of the var's own owned reference */
                push(vm, v);
                break;
            }
            case OP_SET_GLOBAL: {
                unsigned char index = chunk->code[ip++];
                const char *name = chunk->constants[index].as.string;
                env_transfer(vm->current_env, name, pop(vm));
                break;
            }

            case OP_ADD: binary_add(vm, chunk, ip); break;
            case OP_SUBTRACT: binary_numeric(vm, chunk, ip, OP_SUBTRACT); break;
            case OP_MULTIPLY: binary_numeric(vm, chunk, ip, OP_MULTIPLY); break;
            case OP_DIVIDE: binary_numeric(vm, chunk, ip, OP_DIVIDE); break;
            case OP_LESS: binary_numeric(vm, chunk, ip, OP_LESS); break;
            case OP_GREATER: binary_numeric(vm, chunk, ip, OP_GREATER); break;
            case OP_LESS_EQUAL: binary_numeric(vm, chunk, ip, OP_LESS_EQUAL); break;
            case OP_GREATER_EQUAL: binary_numeric(vm, chunk, ip, OP_GREATER_EQUAL); break;
            case OP_EQUAL: {
                Value right = pop(vm);
                Value left = pop(vm);
                int equal = values_equal(left, right);
                release(left);
                release(right);
                push(vm, bool_value(equal));
                break;
            }
            case OP_NOT_EQUAL: {
                Value right = pop(vm);
                Value left = pop(vm);
                int equal = values_equal(left, right);
                release(left);
                release(right);
                push(vm, bool_value(!equal));
                break;
            }
            case OP_NEGATE: {
                Value v = pop(vm);
                if (v.type != VAL_NUMBER) {
                    runtime_error(current_line(chunk, ip), "'-' needs a number here");
                }
                push(vm, number_value(-v.as.number));
                break;
            }

            case OP_DISPLAY: {
                unsigned char argc = chunk->code[ip++];
                /* Compiled/pushed left to right, so they come off the
                 * stack in reverse -- collect into a local array first so
                 * they can be printed in their original order, same as
                 * c/interp.c's ND_DISPLAY. */
                Value args[256];
                for (int i = argc - 1; i >= 0; i--) {
                    args[i] = pop(vm);
                }
                for (int i = 0; i < argc; i++) {
                    char *s = to_display_string(args[i]);
                    fputs(s, stdout);
                    free(s);
                    if (i + 1 < argc) fputc(' ', stdout);
                }
                fputc('\n', stdout);
                for (int i = 0; i < argc; i++) {
                    release(args[i]);
                }
                break;
            }

            case OP_BUILD_ARRAY: {
                unsigned char n = chunk->code[ip++];
                Value items[256];
                for (int i = n - 1; i >= 0; i--) {
                    items[i] = pop(vm);
                }
                ArrayObj *arr = array_new();
                for (int i = 0; i < n; i++) {
                    array_push(arr, items[i]);
                }
                push(vm, array_value(arr));
                break;
            }
            case OP_INDEX_GET: {
                Value idx_val = pop(vm);
                Value target = pop(vm);
                int idx = to_0based_index(idx_val, current_line(chunk, ip));
                int user_idx = (int)idx_val.as.number;
                if (target.type == VAL_ARRAY) {
                    if (idx < 0 || idx >= target.as.array->count) {
                        runtime_error(current_line(chunk, ip), "index %d is out of range for an array of length %d",
                                      user_idx, target.as.array->count);
                    }
                    Value item = target.as.array->items[idx];
                    retain(item); /* a new, independent stack copy of the array's own owned slot */
                    release(target);
                    push(vm, item);
                } else if (target.type == VAL_STRING) {
                    int len = (int)strlen(target.as.string);
                    if (idx < 0 || idx >= len) {
                        runtime_error(current_line(chunk, ip), "index %d is out of range for a string of length %d", user_idx, len);
                    }
                    char *ch = malloc(2);
                    ch[0] = target.as.string[idx];
                    ch[1] = '\0';
                    release(target);
                    push(vm, string_value(ch));
                } else {
                    runtime_error(current_line(chunk, ip), "only arrays and strings can be indexed with [ ], not this");
                }
                break;
            }
            case OP_INDEX_SET: {
                Value value = pop(vm);
                Value idx_val = pop(vm);
                Value target = pop(vm);
                int idx = to_0based_index(idx_val, current_line(chunk, ip));
                int user_idx = (int)idx_val.as.number;
                if (target.type != VAL_ARRAY) {
                    runtime_error(current_line(chunk, ip), "only an array's items can be assigned with [ ], not this");
                }
                if (idx < 0 || idx >= target.as.array->count) {
                    runtime_error(current_line(chunk, ip), "index %d is out of range for an array of length %d",
                                  user_idx, target.as.array->count);
                }
                release(target.as.array->items[idx]); /* the slot's old owned value, being replaced */
                target.as.array->items[idx] = value;   /* `value` arrives already owning its unit -- transfer, no retain */
                release(target); /* this statement's own stack copy of the array reference is done */
                break;
            }
            case OP_INDEX_DELETE: {
                Value idx_val = pop(vm);
                Value target = pop(vm);
                int idx = to_0based_index(idx_val, current_line(chunk, ip));
                int user_idx = (int)idx_val.as.number;
                if (target.type != VAL_ARRAY) {
                    runtime_error(current_line(chunk, ip), "only an array's items can be removed with [.delete], not this");
                }
                ArrayObj *arr = target.as.array;
                if (idx < 0 || idx >= arr->count) {
                    runtime_error(current_line(chunk, ip), "index %d is out of range for an array of length %d", user_idx, arr->count);
                }
                release(arr->items[idx]); /* leaving the array's ownership, nothing takes over */
                memmove(&arr->items[idx], &arr->items[idx + 1], sizeof(Value) * (size_t)(arr->count - idx - 1));
                arr->count--;
                release(target);
                break;
            }
            case OP_LIST_READ: {
                Value target = pop(vm);
                if (target.type != VAL_ARRAY) {
                    runtime_error(current_line(chunk, ip), "'.list' only works on an array");
                }
                int cursor = target.as.array->list_cursor;
                release(target);
                push(vm, number_value(cursor));
                break;
            }
            case OP_LIST_RESET: {
                Value target = pop(vm);
                if (target.type != VAL_ARRAY) {
                    runtime_error(current_line(chunk, ip), "'now repeat' over '.list' needs an array here");
                }
                target.as.array->list_cursor = 1;
                release(target);
                break;
            }
            case OP_LIST_ADVANCE: {
                Value target = pop(vm);
                if (target.type != VAL_ARRAY) {
                    runtime_error(current_line(chunk, ip), "'now repeat' over '.list' needs an array here");
                }
                target.as.array->list_cursor++;
                release(target);
                break;
            }

            case OP_BUILD_OBJECT: {
                unsigned char count = chunk->code[ip++];
                Value values[256];
                for (int i = count - 1; i >= 0; i--) {
                    values[i] = pop(vm);
                }
                ObjectObj *obj = object_new();
                for (int i = 0; i < count; i++) {
                    unsigned char key_index = chunk->code[ip++];
                    object_set(obj, chunk->constants[key_index].as.string, values[i]);
                }
                push(vm, object_value(obj));
                break;
            }
            case OP_FIELD_GET: {
                unsigned char key_index = chunk->code[ip++];
                const char *field = chunk->constants[key_index].as.string;
                Value target = pop(vm);
                if (target.type != VAL_OBJECT) {
                    runtime_error(current_line(chunk, ip), "only an object's fields can be read with '.', not this");
                }
                Value *value = object_get(target.as.object, field);
                if (value == NULL) {
                    runtime_error(current_line(chunk, ip), "this object has no field called '%s'", field);
                }
                Value result = *value;
                retain(result); /* a new, independent stack copy of the object's own owned field */
                release(target);
                push(vm, result);
                break;
            }
            case OP_FIELD_SET: {
                unsigned char key_index = chunk->code[ip++];
                const char *field = chunk->constants[key_index].as.string;
                Value value = pop(vm);
                Value target = pop(vm);
                if (target.type != VAL_OBJECT) {
                    runtime_error(current_line(chunk, ip), "only an object's fields can be changed with [.change], not this");
                }
                Value *existing = object_get(target.as.object, field);
                if (existing != NULL) {
                    release(*existing); /* the field's old owned value, being replaced */
                }
                object_set(target.as.object, field, value); /* `value` arrives already owning its unit -- transfer, no retain */
                release(target); /* this statement's own stack copy of the object reference is done */
                break;
            }

            case OP_CALL_BUILTIN: {
                unsigned char id = chunk->code[ip++];
                unsigned char argc = chunk->code[ip++];
                Value args[256];
                for (int i = argc - 1; i >= 0; i--) {
                    args[i] = pop(vm);
                }
                push(vm, call_builtin(vm, id, args, argc, current_line(chunk, ip)));
                break;
            }

            case OP_JUMP: {
                unsigned int offset = (unsigned int)(chunk->code[ip] << 8) | chunk->code[ip + 1];
                ip += 2 + (int)offset;
                break;
            }
            case OP_JUMP_IF_FALSE: {
                unsigned int offset = (unsigned int)(chunk->code[ip] << 8) | chunk->code[ip + 1];
                ip += 2;
                if (!is_truthy(peek(vm, 0))) {
                    ip += (int)offset;
                }
                break;
            }
            case OP_LOOP: {
                unsigned int offset = (unsigned int)(chunk->code[ip] << 8) | chunk->code[ip + 1];
                ip += 2 - (int)offset;
                break;
            }

            case OP_CALL: {
                unsigned char func_index = chunk->code[ip++];
                unsigned char argc = chunk->code[ip++];
                Value args[256];
                for (int i = argc - 1; i >= 0; i--) {
                    args[i] = pop(vm);
                }
                Value result = call_function(vm, func_index, args, argc, current_line(chunk, ip));
                push(vm, result);
                break;
            }
            case OP_CALL_BY_NAME: {
                unsigned char name_index = chunk->code[ip++];
                unsigned char argc = chunk->code[ip++];
                const char *name = chunk->constants[name_index].as.string;
                Value args[256];
                for (int i = argc - 1; i >= 0; i--) {
                    args[i] = pop(vm);
                }
                int func_index = chunk_find_function(vm->root, name);
                if (func_index == -1) {
                    runtime_error(current_line(chunk, ip), "'%s' isn't defined", name);
                }
                Value result = call_function(vm, func_index, args, argc, current_line(chunk, ip));
                push(vm, result);
                break;
            }

            case OP_RETURN:
                return pop(vm);

            default:
                fprintf(stderr, "coral-vm: unknown opcode %d\n", instruction);
                exit(1);
        }
    }
}

void vm_interpret(Chunk *chunk) {
    VM vm;
    vm.stack_top = 0;
    vm.globals = env_new(NULL);
    vm.current_env = vm.globals;
    vm.root = chunk;
    run(&vm, chunk);
}
