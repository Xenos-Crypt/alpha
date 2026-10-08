#ifndef CORAL_BYTECODE_OPCODES_H
#define CORAL_BYTECODE_OPCODES_H

/* Phase 1 of coral-vm's bytecode: just enough opcodes to compile the
 * subset of Coral covered so far (numbers/strings/booleans/nil,
 * variables, arithmetic, comparisons, and/or, unary -, if/else,
 * display) -- see coral-bytecode/README.md for the full phased plan and
 * why functions/loops/arrays/objects are deliberately not here yet.
 *
 * A stack machine, not registers (see that same README for why): every
 * instruction either pushes a value, or pops its operand(s) and pushes
 * the result, with the VM's own value stack as the only place operands
 * live. One byte per opcode; operands (if any) are the bytes
 * immediately following it in the chunk -- see each opcode's own comment
 * for its operand shape. */
typedef enum {
    OP_CONSTANT,   /* u8 constant-pool index. Pushes constants[index]. */
    OP_NIL,
    OP_TRUE,
    OP_FALSE,
    OP_POP,        /* Discards the top of the stack. */
    OP_DUP,        /* Pushes a copy of the top of the stack, without
                     * popping it -- loops need to inspect a counter/
                     * condition repeatedly while keeping the original
                     * value live underneath for the next iteration. */

    OP_GET_GLOBAL,    /* u8 constant index (a string, the name). Pushes
                        * its current value, or a runtime error if unset. */
    OP_SET_GLOBAL,    /* u8 constant index (a string, the name). Pops the
                        * top of the stack and binds it to that name --
                        * creating it if it doesn't exist yet, updating it
                        * otherwise, same `env_assign` "no let/const,
                        * first assignment and reassignment both just
                        * work" semantics the tree-walker already has.
                        * Coral has no assignment-as-expression (`x = y =
                        * 1` isn't valid -- ND_ASSIGN only appears as a
                        * statement, see c/interp.c's eval() vs exec_stmt
                        * split), so unlike most stack-VM "set" opcodes
                        * this one doesn't need to leave the value behind
                        * on the stack for an enclosing expression. */

    OP_ADD,
    OP_SUBTRACT,
    OP_MULTIPLY,
    OP_DIVIDE,
    OP_EQUAL,
    OP_NOT_EQUAL,
    OP_LESS,
    OP_GREATER,
    OP_LESS_EQUAL,
    OP_GREATER_EQUAL,
    OP_NEGATE,     /* Pops a number, pushes its negation. */

    OP_DISPLAY,    /* u8 arg count N. The VM pops N values (compiled/
                     * pushed left to right, so they come off the stack
                     * in reverse) and prints them space-separated, in
                     * their original left-to-right order, with a
                     * trailing newline -- same as the tree-walker's
                     * ND_DISPLAY. Restoring that order is the VM's job
                     * (Phase 2), not the compiler's. */

    OP_JUMP,            /* u16 (big-endian) forward offset from just past
                          * this instruction's own operand. Unconditional. */
    OP_JUMP_IF_FALSE,   /* u16 forward offset, same shape as OP_JUMP.
                          * Peeks (does not pop) the top of the stack --
                          * `and`/`or`'s short-circuit compilation and
                          * `if`/`else` both rely on the condition value
                          * staying on the stack across this check. */
    OP_LOOP,            /* u16 BACKWARD offset from just past this
                          * instruction's own operand -- every loop
                          * (repeat/now repeat) jumps back to its own
                          * condition check with this instead of OP_JUMP,
                          * which can only go forward. Unconditional. */

    OP_CALL,       /* u8 function-table index, u8 argument count N. Pops N
                     * argument values (pushed left to right, so --
                     * same reversal as OP_DISPLAY -- they come off the
                     * stack in reverse) and pushes the function's return
                     * value (OP_NIL/falling off the end of the body if it
                     * never OP_RETURNs, matching the tree-walker). Every
                     * call site names its callee directly (this
                     * language's own shape -- see compiler.c's
                     * compile_call), so the function is resolved once, at
                     * compile time, by name -- no runtime function value
                     * needed. */

    OP_CALL_BY_NAME, /* u8 constant-pool index (the callee's name, a
                       * string), u8 argument count N. The fallback for a
                       * call compile_call couldn't resolve to a function-
                       * table index yet (see its own comment) -- e.g. a
                       * task only `include()` will register, further up
                       * the SAME program, before this instruction ever
                       * runs. Re-resolves the name via
                       * chunk_find_function at the call site, when it
                       * actually executes; a name still unresolved then
                       * is a genuine runtime error, matching the tree-
                       * walker's own env_get failure for an undefined
                       * name. Same argument-order/return-value handling
                       * as OP_CALL otherwise. */

    OP_BUILD_ARRAY,  /* u8 item count N. Pops N values (pushed left to
                       * right, reverses them back on the way off the
                       * stack same as OP_DISPLAY/OP_CALL) into a fresh
                       * array, pushes it. */
    OP_INDEX_GET,    /* Pops index, then target. 1-based on the way in
                       * (translated to 0-based internally, matching
                       * c/interp.c's ND_INDEX exactly, including its error
                       * messages) -- works on an array (pushes the item)
                       * or a string (pushes a length-1 string). */
    OP_INDEX_SET,    /* Pops value, then index, then target (array only).
                       * No value left on the stack -- this language has no
                       * assignment-as-expression, see OP_SET_GLOBAL's own
                       * comment for why that's fine here too. */
    OP_INDEX_DELETE, /* Pops index, then target (array only). Shifts every
                       * later item down one slot, same as
                       * c/interp.c's ND_INDEX_DELETE. No value pushed. */
    OP_LIST_READ,    /* Pops target (array only), pushes its current
                       * 1-based '.list' cursor position as a number. */
    OP_LIST_RESET,   /* Pops target (array only), sets its '.list' cursor
                       * to 1. No value pushed -- a 'now repeat {arr[.list]}
                       * until ...' loop's own setup step, see
                       * compiler.c's compile_now_repeat. */
    OP_LIST_ADVANCE, /* Pops target (array only), increments its '.list'
                       * cursor by 1. No value pushed -- run once per pass
                       * of that same loop, after its body. */

    OP_BUILD_OBJECT, /* u8 field count N, followed by N u8 constant-pool
                       * indices (each field's key, a string -- compile-
                       * time known, so these ride along as bytecode
                       * operands rather than the stack). Pops N values
                       * (pushed left to right by each field's value
                       * expression, reversed back on the way off the
                       * stack same as OP_DISPLAY/OP_CALL) and zips them
                       * with the N keys in forward order, pushes the
                       * resulting object. */
    OP_FIELD_GET,    /* u8 constant-pool index (the field name). Pops
                       * target, pushes its field's value -- a runtime
                       * error if target isn't an object or has no such
                       * field, matching c/interp.c's ND_FIELD_ACCESS. */
    OP_FIELD_SET,    /* u8 constant-pool index (the field name). Pops
                       * value, then target (object only); adds the field
                       * if it doesn't already exist rather than erroring,
                       * matching c/interp.c's ND_FIELD_ASSIGN. No value
                       * left on the stack, same as OP_SET_GLOBAL/
                       * OP_INDEX_SET. */

    OP_CALL_BUILTIN, /* u8 builtin id (see vm.c's call_builtin), u8 arg
                       * count N. Same argument-order handling as OP_CALL.
                       * A small, deliberately short list (length/append/
                       * randomInt) -- just enough for array literals'
                       * .count/.first/.last/.random sugar (see
                       * c/parser.c's parse_brace_read) to work; the much
                       * larger file/UI/process builtin surface in
                       * c/builtins.c stays a clean compile_error for now,
                       * same policy as everywhere else here. */

    OP_RETURN,     /* Pops the top of the stack as this chunk's result and
                     * ends execution of it -- for a function body that's
                     * its return value, for the top-level program it's
                     * discarded (see compiler.c's compile(), which always
                     * emits OP_NIL just before the program's own final
                     * OP_RETURN so both cases push something). */
} OpCode;

#endif
