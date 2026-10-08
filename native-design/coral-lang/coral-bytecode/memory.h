#ifndef CORAL_BYTECODE_MEMORY_H
#define CORAL_BYTECODE_MEMORY_H

#include "../c/value.h"

/* Phase 3: reference counting. Every refcounted Value (VAL_ARRAY/
 * VAL_OBJECT -- see the README's own note on why strings are out of
 * scope for now) carries exactly one "owned unit" for as long as
 * something keeps it reachable: a variable binding, a container slot
 * (array item/object field), or -- transiently -- a VM stack slot. retain/
 * release are how that unit moves: retain when a value is COPIED into a
 * new, independently-lived slot (reading a variable, reading an array
 * item/object field, OP_DUP, a function's return value crossing back into
 * its caller); release when a slot's owned unit is discarded with nothing
 * taking it over (OP_POP, an overwritten variable/array slot/object
 * field, a deleted array element, a destroyed call frame). Everywhere a
 * value's own unit simply MOVES from one slot to another without being
 * duplicated or dropped (a popped argument binding into a function's
 * parameter, an array/object literal taking ownership of its already-
 * stack-owned items) needs neither call -- see vm.c's opcode handlers for
 * exactly which case each one is. Reference cycles are a known, accepted
 * gap (see coral-bytecode/README.md): release() simply decrements and
 * recurses, with no cycle detection, so a cycle's members keep each other
 * above zero forever instead of crashing -- a leak, not a crash. */
void retain(Value v);
void release(Value v);

/* Frees a function call's Env after it returns: releases every binding's
 * value, then the entries array and the Env struct itself. The env's own
 * fields are public in c/value.h, so this needs no changes to c/value.c --
 * c/ stays untouched except for the inert `refcount` field itself. Never
 * call this on vm.c's `globals` Env -- it lives for the whole program. */
void env_destroy(Env *env);

#endif
