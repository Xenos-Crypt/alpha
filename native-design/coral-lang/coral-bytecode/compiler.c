#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "compiler.h"
#include "opcodes.h"

/* This file only ever runs ahead of time (compiling a script, not
 * executing one), so "can't compile this yet" is reported the same blunt
 * way c/parser.c's own syntax errors are: print and exit, no recovery.
 * Not the same code path as c/value.h's runtime_error (that's a VM/
 * interpreter concern, for errors found *while running* a program) --
 * this is a compile_error, for constructs Phase 1 simply doesn't compile
 * yet. See coral-bytecode/README.md for exactly what that is. */
static void compile_error(int line, const char *what) {
    fprintf(stderr, "coral-bytecode: line %d: %s isn't compilable yet (Phase 1 only -- see coral-bytecode/README.md)\n",
            line, what);
    exit(1);
}

static void emit(Chunk *chunk, unsigned char byte, int line) {
    chunk_write(chunk, byte, line);
}

static void emit_two(Chunk *chunk, unsigned char a, unsigned char b, int line) {
    emit(chunk, a, line);
    emit(chunk, b, line);
}

/* Every constant-taking opcode here has a single-byte operand, so the
 * pool is capped at 256 entries -- generous for anything Phase 1 can
 * even compile (no loops/functions yet to blow it up with repeated
 * constants), revisit (a u16 operand, same two-byte-offset shape
 * OP_JUMP/OP_JUMP_IF_FALSE already use) only once a real program
 * actually needs more. */
static unsigned char add_constant(Chunk *chunk, Value value, int line) {
    int index = chunk_add_constant(chunk, value);
    if (index > 255) {
        compile_error(line, "a chunk with more than 256 constants");
    }
    return (unsigned char)index;
}

static unsigned char identifier_constant(Chunk *chunk, const char *name, int line) {
    return add_constant(chunk, string_value(strdup(name)), line);
}

/* Emits a jump opcode with a placeholder (0xFFFF) offset and returns the
 * byte offset of that placeholder, to be handed to patch_jump once the
 * real target is known -- the standard "backpatch" technique for a
 * single forward-pass compiler that doesn't know a jump's length until
 * it's finished compiling what comes after it. */
static int emit_jump(Chunk *chunk, unsigned char op, int line) {
    emit(chunk, op, line);
    emit_two(chunk, 0xFF, 0xFF, line);
    return chunk->count - 2;
}

static void patch_jump(Chunk *chunk, int placeholder_offset, int line) {
    int jump_len = chunk->count - (placeholder_offset + 2);
    if (jump_len > 0xFFFF) {
        compile_error(line, "a jump further than 65535 bytes");
    }
    chunk->code[placeholder_offset] = (unsigned char)((jump_len >> 8) & 0xFF);
    chunk->code[placeholder_offset + 1] = (unsigned char)(jump_len & 0xFF);
}

/* Emits OP_LOOP jumping back to `loop_start` (a byte offset previously
 * recorded in the chunk, e.g. right before a loop's condition check) --
 * the backward counterpart of emit_jump/patch_jump, computed immediately
 * since (unlike a forward jump) the target is already known. */
static void emit_loop(Chunk *chunk, int loop_start, int line) {
    emit(chunk, OP_LOOP, line);
    int offset = (chunk->count + 2) - loop_start;
    if (offset > 0xFFFF) {
        compile_error(line, "a loop body longer than 65535 bytes");
    }
    emit_two(chunk, (unsigned char)((offset >> 8) & 0xFF), (unsigned char)(offset & 0xFF), line);
}

/* The function table lives on the root chunk only (the one `compile()`
 * is called with) -- a function body compiles into its OWN Chunk (for
 * its own locals-via-Env, see vm.c), but every call site anywhere in the
 * program, including from inside another function's body, needs to
 * resolve the SAME table, not a copy scoped to whichever chunk happens to
 * be mid-compile. A file-scope global keeps every compile_* signature
 * unchanged rather than threading a second Chunk* through all of them for
 * a value that's the same for the whole compile() call. */
static Chunk *g_root = NULL;

static void compile_expr(Node *node, Chunk *chunk);
static void compile_stmt(Node *stmt, Chunk *chunk);
static void compile_block(NodeList *stmts, Chunk *chunk);
static void compile_block_value(NodeList *stmts, Chunk *chunk);

/* The small, deliberately short builtin list this compiler knows -- see
 * opcodes.h's OP_CALL_BUILTIN comment and vm.c's call_builtin, which this
 * id numbering must stay in sync with. -1 if `name` isn't one of them. */
static int builtin_id(const char *name) {
    if (strcmp(name, "length") == 0) return 0;
    if (strcmp(name, "append") == 0) return 1;
    if (strcmp(name, "randomInt") == 0) return 2;
    if (strcmp(name, "substring") == 0) return 3;
    if (strcmp(name, "indexOf") == 0) return 4;
    if (strcmp(name, "ask") == 0) return 5;
    if (strcmp(name, "readFile") == 0) return 6;
    if (strcmp(name, "writeFile") == 0) return 7;
    if (strcmp(name, "listDir") == 0) return 8;
    if (strcmp(name, "deleteFile") == 0) return 9;
    if (strcmp(name, "renameFile") == 0) return 10;
    if (strcmp(name, "makeDir") == 0) return 11;
    if (strcmp(name, "jsonEncode") == 0) return 12;
    if (strcmp(name, "jsonDecode") == 0) return 13;
    if (strcmp(name, "field") == 0) return 14;
    if (strcmp(name, "kindOf") == 0) return 15;
    if (strcmp(name, "uriEncode") == 0) return 16;
    if (strcmp(name, "runCommand") == 0) return 17;
    if (strcmp(name, "tokenize") == 0) return 18;
    if (strcmp(name, "samePath") == 0) return 19;
    if (strcmp(name, "nativeStart") == 0) return 20;
    if (strcmp(name, "nativePoll") == 0) return 21;
    if (strcmp(name, "nativeCancel") == 0) return 22;
    if (strcmp(name, "uiLoad") == 0) return 23;
    if (strcmp(name, "uiSetText") == 0) return 24;
    if (strcmp(name, "uiGetText") == 0) return 25;
    if (strcmp(name, "uiSetDesign") == 0) return 26;
    if (strcmp(name, "uiSetColor") == 0) return 27;
    if (strcmp(name, "uiSetDeviceFrame") == 0) return 28;
    if (strcmp(name, "uiAddText") == 0) return 29;
    if (strcmp(name, "uiRemoveElement") == 0) return 30;
    if (strcmp(name, "uiSetHighlight") == 0) return 31;
    if (strcmp(name, "uiTogglePanel") == 0) return 32;
    if (strcmp(name, "uiPanelMenu") == 0) return 33;
    if (strcmp(name, "uiSetVisible") == 0) return 34;
    if (strcmp(name, "uiIsVisible") == 0) return 35;
    if (strcmp(name, "uiGoToLine") == 0) return 36;
    if (strcmp(name, "uiToggleRail") == 0) return 37;
    if (strcmp(name, "uiToggleMoving") == 0) return 38;
    if (strcmp(name, "uiScrollTabs") == 0) return 39;
    if (strcmp(name, "uiRevealTab") == 0) return 40;
    if (strcmp(name, "uiSetMatch") == 0) return 41;
    if (strcmp(name, "uiSetSearchResult") == 0) return 42;
    if (strcmp(name, "uiSetClipboardText") == 0) return 43;
    if (strcmp(name, "registerCccProtocol") == 0) return 44;
    if (strcmp(name, "uiStartWebServer") == 0) return 45;
    if (strcmp(name, "searchProject") == 0) return 46;
    if (strcmp(name, "uiShowMenu") == 0) return 47;
    if (strcmp(name, "uiModalInputText") == 0) return 48;
    if (strcmp(name, "uiOnClick") == 0) return 49;
    if (strcmp(name, "uiOnRightClick") == 0) return 50;
    if (strcmp(name, "uiOnChange") == 0) return 51;
    if (strcmp(name, "uiShowConfirm") == 0) return 52;
    if (strcmp(name, "uiShowPrompt") == 0) return 53;
    if (strcmp(name, "uiOnTick") == 0) return 54;
    if (strcmp(name, "uiRun") == 0) return 55;
    if (strcmp(name, "include") == 0) return 56;
    if (strcmp(name, "uiEmbedApp") == 0) return 57;
    /* xenos-os only (see vm_builtins_xenos.c) -- fetch() is syscall-
     * backed HTTP (no TLS), and winCreate/winPixel/winRect/winText/
     * winPresent/winPollChar are the gfxwin.rs graphics-window syscalls
     * (10-15), the same ones c/xenos/builtins_xenos.c already exposes to
     * the tree-walker. Compiling successfully on every platform (this
     * table is shared) doesn't mean these do anything at runtime
     * anywhere but xenos -- see vm.h's own note on that. */
    if (strcmp(name, "fetch") == 0) return 58;
    if (strcmp(name, "winCreate") == 0) return 59;
    if (strcmp(name, "winPixel") == 0) return 60;
    if (strcmp(name, "winRect") == 0) return 61;
    if (strcmp(name, "winText") == 0) return 62;
    if (strcmp(name, "winPresent") == 0) return 63;
    if (strcmp(name, "winPollChar") == 0) return 64;
    /* xenos-os only, same caveat as fetch/win* above -- syscall 16, the
     * one way a script reaches the handful of shell commands that need
     * real kernel access (meminfo/disktest/nettest/ping/udptest/tcptest/
     * ls/cat) no other syscall exposes. See shell::run_privileged and
     * SHELL.CO (seeded by xtask) for the actual command dispatch, which
     * lives in Coral now, not here -- this is just the privileged leaf
     * calls that dispatch can't do itself. */
    if (strcmp(name, "sysCommand") == 0) return 65;

    /* scene3d* -- Coral's binding to Scene3D (creal-lang/c/scene3d.h), the
     * 3D counterpart to the ui* builtins above's UIBackend binding. See
     * vm_builtins_win.c's call_builtin for cases 66-74, and scene3d.h for
     * what each one actually does. */
    if (strcmp(name, "scene3dInit") == 0) return 66;
    if (strcmp(name, "scene3dLoadMesh") == 0) return 67;
    if (strcmp(name, "scene3dLoadTexture") == 0) return 68;
    if (strcmp(name, "scene3dSpawn") == 0) return 69;
    if (strcmp(name, "scene3dSetTransform") == 0) return 70;
    if (strcmp(name, "scene3dSetTexture") == 0) return 71;
    if (strcmp(name, "scene3dSetCamera") == 0) return 72;
    if (strcmp(name, "scene3dSetLightDir") == 0) return 73;
    if (strcmp(name, "scene3dRun") == 0) return 74;
    if (strcmp(name, "scene3dOnTick") == 0) return 75;
    if (strcmp(name, "scene3dSetInput") == 0) return 76;
    if (strcmp(name, "scene3dSetMaterial") == 0) return 77;
    return -1;
}

static void compile_call(Node *node, Chunk *chunk) {
    NodeList *args = &node->as.call.args;
    int bid = builtin_id(node->as.call.callee);
    if (bid != -1) {
        if (args->count > 255) {
            compile_error(node->line, "a call with more than 255 arguments");
        }
        for (int i = 0; i < args->count; i++) {
            compile_expr(args->items[i], chunk);
        }
        emit(chunk, OP_CALL_BUILTIN, node->line);
        emit_two(chunk, (unsigned char)bid, (unsigned char)args->count, node->line);
        return;
    }

    int index = chunk_find_function(g_root, node->as.call.callee);
    if (index == -1) {
        /* Not resolvable YET -- could still be a real task that only
         * gets registered into g_root's function table once an
         * include() actually runs, at VM runtime, further up this same
         * program (see README.md's own note on this gap). Rather than
         * refusing to compile, fall back to OP_CALL_BY_NAME: re-resolve
         * the name at the call site, when it actually executes, by
         * which time include() (if any) has had its chance to register
         * it. If it's STILL unresolvable then, that's a genuine runtime
         * error (matching the tree-walker's own env_get failure for an
         * undefined name) -- not a silent miscompile either way. */
        if (args->count > 255) {
            compile_error(node->line, "a call with more than 255 arguments");
        }
        for (int i = 0; i < args->count; i++) {
            compile_expr(args->items[i], chunk);
        }
        emit(chunk, OP_CALL_BY_NAME, node->line);
        emit_two(chunk, identifier_constant(chunk, node->as.call.callee, node->line), (unsigned char)args->count, node->line);
        return;
    }
    FuncDecl *fn = &g_root->functions[index];
    if (args->count != fn->param_count) {
        compile_error(node->line, "a call with the wrong number of arguments");
    }
    for (int i = 0; i < args->count; i++) {
        compile_expr(args->items[i], chunk);
    }
    emit(chunk, OP_CALL, node->line);
    emit_two(chunk, (unsigned char)index, (unsigned char)args->count, node->line);
}

/* Reserves a function's table slot with an empty body -- see
 * register_functions' two-pass comment for why this has to happen before
 * ANY body (including this function's own, for self-recursion) is
 * compiled: chunk_find_function needs every name resolvable up front,
 * not just the ones compiled so far. */
static void declare_function(Node *stmt) {
    Chunk *body = malloc(sizeof(Chunk));
    chunk_init(body);
    int param_count = stmt->as.func_decl.param_count;
    char **params = malloc(sizeof(char *) * (size_t)(param_count > 0 ? param_count : 1));
    for (int i = 0; i < param_count; i++) {
        params[i] = strdup(stmt->as.func_decl.params[i]);
    }
    chunk_add_function(g_root, stmt->as.func_decl.name, params, param_count, body);
}

/* Compiles one [.task]'s body into the Chunk declare_function already
 * reserved for it. Falling off the end without an explicit
 * [.report]/[.return] pushes nil, same as exec_block's
 * EXEC_NORMAL-with-nil-result default in c/interp.c. */
static void compile_function_decl(Node *stmt) {
    int index = chunk_find_function(g_root, stmt->as.func_decl.name);
    Chunk *body = g_root->functions[index].body;
    compile_block_value(&stmt->as.func_decl.body, body);
    emit(body, OP_RETURN, stmt->line);
}

/* `and`/`or` are short-circuiting (see c/interp.c's eval_binary), which a
 * stack machine expresses with jumps at compile time rather than a
 * runtime "and"/"or" opcode -- there's nothing for a VM to short-circuit
 * once both operands have already been unconditionally evaluated and
 * pushed, so the branching has to happen *between* compiling the left
 * and right operands, not after. */
static void compile_and(Node *node, Chunk *chunk) {
    compile_expr(node->as.binary.left, chunk);
    int end_jump = emit_jump(chunk, OP_JUMP_IF_FALSE, node->line);
    emit(chunk, OP_POP, node->line);
    compile_expr(node->as.binary.right, chunk);
    patch_jump(chunk, end_jump, node->line);
}

static void compile_or(Node *node, Chunk *chunk) {
    compile_expr(node->as.binary.left, chunk);
    int else_jump = emit_jump(chunk, OP_JUMP_IF_FALSE, node->line);
    int end_jump = emit_jump(chunk, OP_JUMP, node->line);
    patch_jump(chunk, else_jump, node->line);
    emit(chunk, OP_POP, node->line);
    compile_expr(node->as.binary.right, chunk);
    patch_jump(chunk, end_jump, node->line);
}

static void compile_binary(Node *node, Chunk *chunk) {
    const char *op = node->as.binary.op;
    if (strcmp(op, "and") == 0) {
        compile_and(node, chunk);
        return;
    }
    if (strcmp(op, "or") == 0) {
        compile_or(node, chunk);
        return;
    }

    compile_expr(node->as.binary.left, chunk);
    compile_expr(node->as.binary.right, chunk);

    if (strcmp(op, "+") == 0) emit(chunk, OP_ADD, node->line);
    else if (strcmp(op, "-") == 0) emit(chunk, OP_SUBTRACT, node->line);
    else if (strcmp(op, "*") == 0) emit(chunk, OP_MULTIPLY, node->line);
    else if (strcmp(op, "/") == 0) emit(chunk, OP_DIVIDE, node->line);
    else if (strcmp(op, "==") == 0) emit(chunk, OP_EQUAL, node->line);
    else if (strcmp(op, "!=") == 0) emit(chunk, OP_NOT_EQUAL, node->line);
    else if (strcmp(op, "<") == 0) emit(chunk, OP_LESS, node->line);
    else if (strcmp(op, ">") == 0) emit(chunk, OP_GREATER, node->line);
    else if (strcmp(op, "<=") == 0) emit(chunk, OP_LESS_EQUAL, node->line);
    else if (strcmp(op, ">=") == 0) emit(chunk, OP_GREATER_EQUAL, node->line);
    else compile_error(node->line, op);
}

static void compile_expr(Node *node, Chunk *chunk) {
    switch (node->type) {
        case ND_NUMBER:
            emit_two(chunk, OP_CONSTANT, add_constant(chunk, number_value(node->as.number.value), node->line), node->line);
            return;
        case ND_STRING:
            emit_two(chunk, OP_CONSTANT, add_constant(chunk, string_value(strdup(node->as.string.value)), node->line), node->line);
            return;
        case ND_NIL:
            emit(chunk, OP_NIL, node->line);
            return;
        case ND_IDENTIFIER:
            emit_two(chunk, OP_GET_GLOBAL, identifier_constant(chunk, node->as.identifier.name, node->line), node->line);
            return;
        case ND_UNARY:
            if (strcmp(node->as.unary.op, "-") != 0) {
                compile_error(node->line, node->as.unary.op);
            }
            compile_expr(node->as.unary.operand, chunk);
            emit(chunk, OP_NEGATE, node->line);
            return;
        case ND_BINARY:
            compile_binary(node, chunk);
            return;
        case ND_CALL:
            compile_call(node, chunk);
            return;
        case ND_ARRAY_LITERAL: {
            NodeList *items = &node->as.array_literal.items;
            if (items->count > 255) {
                compile_error(node->line, "an array literal with more than 255 items");
            }
            for (int i = 0; i < items->count; i++) {
                compile_expr(items->items[i], chunk);
            }
            emit_two(chunk, OP_BUILD_ARRAY, (unsigned char)items->count, node->line);
            return;
        }
        case ND_INDEX:
            compile_expr(node->as.index.target, chunk);
            compile_expr(node->as.index.index, chunk);
            emit(chunk, OP_INDEX_GET, node->line);
            return;
        case ND_LIST_READ:
            compile_expr(node->as.list_read.target, chunk);
            emit(chunk, OP_LIST_READ, node->line);
            return;
        case ND_OBJECT_LITERAL: {
            int count = node->as.object_literal.count;
            if (count > 255) {
                compile_error(node->line, "an object literal with more than 255 fields");
            }
            for (int i = 0; i < count; i++) {
                compile_expr(node->as.object_literal.values[i], chunk);
            }
            emit_two(chunk, OP_BUILD_OBJECT, (unsigned char)count, node->line);
            for (int i = 0; i < count; i++) {
                emit(chunk, identifier_constant(chunk, node->as.object_literal.keys[i], node->line), node->line);
            }
            return;
        }
        case ND_FIELD_ACCESS:
            compile_expr(node->as.field_access.target, chunk);
            emit_two(chunk, OP_FIELD_GET, identifier_constant(chunk, node->as.field_access.field, node->line), node->line);
            return;
        default:
            compile_error(node->line, "this kind of expression");
    }
}

static void compile_stmt(Node *stmt, Chunk *chunk);

static void compile_block(NodeList *stmts, Chunk *chunk) {
    for (int i = 0; i < stmts->count; i++) {
        compile_stmt(stmts->items[i], chunk);
    }
}

/* Mirrors c/interp.c's own ND_IF exactly, including evaluating each
 * branch's condition (if any -- NULL marks the trailing `else`) in turn
 * and running the first one that's truthy: a chain of
 * `condition ? jump-to-body : fall-through-to-next-condition`, each
 * body ending with a jump past every remaining branch.
 *
 * `as_value`: see compile_block_value's own comment -- when this `if` is
 * itself in tail position inside a function body, each branch has to
 * leave exactly one value on the stack (its own tail value) rather than
 * discarding everything, AND the "no branch matched, no trailing else"
 * fallthrough has to push nil, matching exec_stmt's ND_IF case setting
 * *out_value = nil_value() in that same situation.
 *
 * OP_JUMP_IF_FALSE only *peeks* its condition (see opcodes.h) -- the
 * taken-branch side pops it explicitly (the OP_POP right below), but
 * landing HERE (the condition was false, falling through to the next
 * branch/else) leaves that same bool still sitting on the stack unless
 * popped here too. Missed originally: harmless-looking at the top level
 * (nothing was depth-sensitive enough to notice extra junk sitting under
 * live values), but fatal inside a function body -- the leaked bool
 * stayed buried under every value pushed afterward for the rest of that
 * call, so by the time an unrelated OP_RETURN higher up popped "the"
 * return value, it was actually popping stale junk pushed below a
 * caller's own operand, corrupting it. Found via factorial(5)-style
 * recursion producing "needs two numbers" instead of 120. */
static void compile_if_generic(Node *stmt, Chunk *chunk, int as_value) {
    int *end_jumps = malloc(sizeof(int) * (size_t)stmt->as.if_stmt.branch_count);
    int end_jump_count = 0;
    int prev_condition_jump = -1;
    int saw_else = 0;

    for (int i = 0; i < stmt->as.if_stmt.branch_count; i++) {
        IfBranch *branch = &stmt->as.if_stmt.branches[i];
        if (prev_condition_jump != -1) {
            patch_jump(chunk, prev_condition_jump, stmt->line);
            emit(chunk, OP_POP, stmt->line);
        }
        if (branch->condition != NULL) {
            compile_expr(branch->condition, chunk);
            prev_condition_jump = emit_jump(chunk, OP_JUMP_IF_FALSE, stmt->line);
            emit(chunk, OP_POP, stmt->line);
            if (as_value) compile_block_value(&branch->body, chunk);
            else compile_block(&branch->body, chunk);
            end_jumps[end_jump_count++] = emit_jump(chunk, OP_JUMP, stmt->line);
        } else {
            /* The trailing `else` -- always taken if reached, so no
             * condition to compile or jump over. */
            if (as_value) compile_block_value(&branch->body, chunk);
            else compile_block(&branch->body, chunk);
            prev_condition_jump = -1;
            saw_else = 1;
        }
    }
    if (prev_condition_jump != -1) {
        patch_jump(chunk, prev_condition_jump, stmt->line);
        emit(chunk, OP_POP, stmt->line);
    }
    if (as_value && !saw_else) {
        emit(chunk, OP_NIL, stmt->line);
    }
    for (int i = 0; i < end_jump_count; i++) {
        patch_jump(chunk, end_jumps[i], stmt->line);
    }
    free(end_jumps);
}

static void compile_if(Node *stmt, Chunk *chunk) {
    compile_if_generic(stmt, chunk, 0);
}

/* Compiles a function body (or any block whose final value matters) so
 * that exactly one value is left on the stack at the end -- the implicit
 * return value c/interp.c's exec_block produces by letting each
 * statement overwrite a single *out_value slot (see that function's own
 * comment). Mirrored here by keeping exactly one value on the VM stack:
 * every statement here pushes its "out_value" (an expression statement's
 * own value; nil for assignment/display/func-decl; an `if`'s taken-branch
 * tail value), and each iteration but the first starts by popping the
 * previous statement's value, since it's been superseded. An explicit
 * [.return]/return always ends the chunk outright (same as exec_block
 * stopping dead on EXEC_RETURN), so nothing after it in the same block is
 * compiled -- it would be unreachable anyway. */
static void compile_block_value(NodeList *stmts, Chunk *chunk) {
    if (stmts->count == 0) {
        emit(chunk, OP_NIL, 0);
        return;
    }
    for (int i = 0; i < stmts->count; i++) {
        Node *stmt = stmts->items[i];
        if (i > 0) {
            emit(chunk, OP_POP, stmt->line);
        }
        if (stmt->type == ND_RETURN) {
            compile_stmt(stmt, chunk);
            return;
        }
        if (stmt->type == ND_EXPR_STMT) {
            compile_expr(stmt->as.expr_stmt.expr, chunk);
        } else if (stmt->type == ND_IF) {
            compile_if_generic(stmt, chunk, 1);
        } else {
            compile_stmt(stmt, chunk);
            emit(chunk, OP_NIL, stmt->line);
        }
    }
}

/* repeat COUNT times [if CONDITION] <body> -- the `if` (if present) is
 * checked ONCE, before the loop starts (not per iteration, see
 * c/interp.c's own ND_REPEAT case), then COUNT itself is evaluated once
 * and kept live on the stack as a down-counter: OP_DUP so the `> 0` check
 * each pass doesn't consume the counter itself, decrementing by 1 after
 * each body run via plain OP_SUBTRACT. Falls through to "statement,
 * discard everything" (compile_block, not compile_block_value) --
 * c/interp.c always writes nil for a loop's own out_value regardless of
 * what ran inside it, so this never needs an as_value variant the way
 * compile_if does. */
static void compile_repeat(Node *stmt, Chunk *chunk) {
    int skip_jump = -1;
    if (stmt->as.repeat.condition != NULL) {
        compile_expr(stmt->as.repeat.condition, chunk);
        skip_jump = emit_jump(chunk, OP_JUMP_IF_FALSE, stmt->line);
        emit(chunk, OP_POP, stmt->line);
    }

    compile_expr(stmt->as.repeat.count, chunk);
    int loop_start = chunk->count;
    emit(chunk, OP_DUP, stmt->line);
    unsigned char zero_index = add_constant(chunk, number_value(0.0), stmt->line);
    emit_two(chunk, OP_CONSTANT, zero_index, stmt->line);
    emit(chunk, OP_GREATER, stmt->line);
    int body_jump = emit_jump(chunk, OP_JUMP_IF_FALSE, stmt->line);
    emit(chunk, OP_POP, stmt->line);

    compile_block(&stmt->as.repeat.body, chunk);

    unsigned char one_index = add_constant(chunk, number_value(1.0), stmt->line);
    emit_two(chunk, OP_CONSTANT, one_index, stmt->line);
    emit(chunk, OP_SUBTRACT, stmt->line);
    emit_loop(chunk, loop_start, stmt->line);

    patch_jump(chunk, body_jump, stmt->line);
    emit(chunk, OP_POP, stmt->line);  /* the false-condition path's bool */
    emit(chunk, OP_POP, stmt->line);  /* the counter itself, now unused */

    if (skip_jump != -1) {
        /* The path that actually ran the loop above has to jump past the
         * guard's own false-path pop below -- that pop belongs ONLY to
         * the path that skipped the loop entirely, which is why it can't
         * just sit at a single shared landing point the way the true
         * path would also fall into. */
        int end_jump = emit_jump(chunk, OP_JUMP, stmt->line);
        patch_jump(chunk, skip_jump, stmt->line);
        emit(chunk, OP_POP, stmt->line);  /* the outer `if`'s false-path bool */
        patch_jump(chunk, end_jump, stmt->line);
    }
}

/* now repeat until COND / now repeat {arr[.list]} until COND / now
 * repeat count START to END -- all three check their stopping condition
 * BEFORE every pass, including the first (see c/interp.c's own long
 * comment on ND_NOW_REPEAT). LIST_UNTIL resets the array's cursor once
 * before the loop (OP_LIST_RESET) and advances it once per pass
 * (OP_LIST_ADVANCE, after the body) -- the condition itself is a plain
 * expression (typically reading that same cursor via {arr[.list]}, i.e.
 * ND_LIST_READ), not special-cased here, same as UNTIL's condition. */
static void compile_now_repeat(Node *stmt, Chunk *chunk) {
    if (stmt->as.now_repeat.kind == NOW_REPEAT_LIST_UNTIL) {
        compile_expr(stmt->as.now_repeat.list_target, chunk);
        emit(chunk, OP_LIST_RESET, stmt->line);
    }

    int loop_start = chunk->count;

    if (stmt->as.now_repeat.kind == NOW_REPEAT_COUNT) {
        const char *name = stmt->as.now_repeat.counter_name;
        emit_two(chunk, OP_GET_GLOBAL, identifier_constant(chunk, name, stmt->line), stmt->line);
        compile_expr(stmt->as.now_repeat.count_end, chunk);
        emit(chunk, OP_LESS_EQUAL, stmt->line);
    } else { /* UNTIL and LIST_UNTIL both just check a plain user condition */
        compile_expr(stmt->as.now_repeat.condition, chunk);
    }

    /* COUNT's pushed condition (cur <= end) means "keep going" -- the
     * opposite sense from UNTIL's "stop" below, so it needs the opposite
     * jump shape too: fall through (true) to run the body, jump past it
     * (false) to stop. Same "both paths pop their own peeked bool" shape
     * as compile_repeat's counter check, for the same reason. */
    if (stmt->as.now_repeat.kind == NOW_REPEAT_COUNT) {
        int exit_jump = emit_jump(chunk, OP_JUMP_IF_FALSE, stmt->line);
        emit(chunk, OP_POP, stmt->line);  /* true path: pop the condition bool */

        compile_block(&stmt->as.now_repeat.body, chunk);

        emit_two(chunk, OP_GET_GLOBAL, identifier_constant(chunk, stmt->as.now_repeat.counter_name, stmt->line), stmt->line);
        unsigned char one_index = add_constant(chunk, number_value(1.0), stmt->line);
        emit_two(chunk, OP_CONSTANT, one_index, stmt->line);
        emit(chunk, OP_ADD, stmt->line);
        emit_two(chunk, OP_SET_GLOBAL, identifier_constant(chunk, stmt->as.now_repeat.counter_name, stmt->line), stmt->line);
        emit_loop(chunk, loop_start, stmt->line);

        patch_jump(chunk, exit_jump, stmt->line);
        emit(chunk, OP_POP, stmt->line);  /* false path: pop the condition bool */
        return;
    }

    /* UNTIL/LIST_UNTIL: condition true -> stop (pop it, fall through to
     * end); condition false -> jump into the body (popping it there
     * instead), same "both paths pop their own peeked bool" shape
     * compile_if_generic uses, for the same reason (see that function's
     * long comment). */
    int to_body = emit_jump(chunk, OP_JUMP_IF_FALSE, stmt->line);
    emit(chunk, OP_POP, stmt->line);
    int to_end = emit_jump(chunk, OP_JUMP, stmt->line);
    patch_jump(chunk, to_body, stmt->line);
    emit(chunk, OP_POP, stmt->line);

    compile_block(&stmt->as.now_repeat.body, chunk);

    if (stmt->as.now_repeat.kind == NOW_REPEAT_LIST_UNTIL) {
        compile_expr(stmt->as.now_repeat.list_target, chunk);
        emit(chunk, OP_LIST_ADVANCE, stmt->line);
    }

    emit_loop(chunk, loop_start, stmt->line);

    patch_jump(chunk, to_end, stmt->line);
}

static void compile_stmt(Node *stmt, Chunk *chunk) {
    switch (stmt->type) {
        case ND_ASSIGN:
            compile_expr(stmt->as.assign.expr, chunk);
            emit_two(chunk, OP_SET_GLOBAL, identifier_constant(chunk, stmt->as.assign.name, stmt->line), stmt->line);
            return;
        case ND_IF:
            compile_if(stmt, chunk);
            return;
        case ND_REPEAT:
            compile_repeat(stmt, chunk);
            return;
        case ND_NOW_REPEAT:
            compile_now_repeat(stmt, chunk);
            return;
        case ND_DISPLAY: {
            NodeList *args = &stmt->as.display.args;
            if (args->count > 255) {
                compile_error(stmt->line, "a display with more than 255 arguments");
            }
            for (int i = 0; i < args->count; i++) {
                compile_expr(args->items[i], chunk);
            }
            emit_two(chunk, OP_DISPLAY, (unsigned char)args->count, stmt->line);
            return;
        }
        case ND_EXPR_STMT:
            compile_expr(stmt->as.expr_stmt.expr, chunk);
            emit(chunk, OP_POP, stmt->line);
            return;
        case ND_INDEX_ASSIGN:
            compile_expr(stmt->as.index_assign.target, chunk);
            compile_expr(stmt->as.index_assign.index, chunk);
            compile_expr(stmt->as.index_assign.value, chunk);
            emit(chunk, OP_INDEX_SET, stmt->line);
            return;
        case ND_FIELD_ASSIGN:
            compile_expr(stmt->as.field_assign.target, chunk);
            compile_expr(stmt->as.field_assign.value, chunk);
            emit_two(chunk, OP_FIELD_SET, identifier_constant(chunk, stmt->as.field_assign.field, stmt->line), stmt->line);
            return;
        case ND_INDEX_DELETE:
            /* Shares ND_INDEX's {target, index} field shape -- see
             * ast.h's own comment on ND_INDEX_DELETE -- so it reads
             * through `as.index`, not a distinct union member. */
            compile_expr(stmt->as.index.target, chunk);
            compile_expr(stmt->as.index.index, chunk);
            emit(chunk, OP_INDEX_DELETE, stmt->line);
            return;
        case ND_FUNC_DECL:
            /* No bytecode at the declaration site itself -- compile()'s
             * two-pass prepass (register_functions) already reserved and
             * compiled every task's body before the main program is
             * compiled at all, so every call site (including one
             * textually earlier in the program, inside another task's
             * body, or this task calling itself) can already resolve it
             * by name. */
            return;
        case ND_RETURN:
            if (stmt->as.ret.expr != NULL) {
                compile_expr(stmt->as.ret.expr, chunk);
            } else {
                emit(chunk, OP_NIL, stmt->line);
            }
            emit(chunk, OP_RETURN, stmt->line);
            return;
        default:
            compile_error(stmt->line, "this kind of statement");
    }
}

/* Two passes over every top-level [.task], so a call can reference a
 * task regardless of textual order -- declared further down the file,
 * calling itself recursively, or two tasks calling each other (all three
 * happen in examples/tictactoe.co). Pass 1 reserves every task's name and
 * param list (declare_function) before pass 2 compiles ANY body
 * (compile_function_decl) -- a single combined pass would fail to
 * resolve a call to a task whose own declare+compile hadn't run yet.
 * Only looks at the program's top level, matching every example on hand
 * (no task has ever been declared nested inside another one); a nested
 * one would simply fail ND_CALL's "unknown task" lookup rather than being
 * silently miscompiled. */
static void register_functions(NodeList *stmts) {
    for (int i = 0; i < stmts->count; i++) {
        if (stmts->items[i]->type == ND_FUNC_DECL) {
            declare_function(stmts->items[i]);
        }
    }
    for (int i = 0; i < stmts->count; i++) {
        if (stmts->items[i]->type == ND_FUNC_DECL) {
            compile_function_decl(stmts->items[i]);
        }
    }
}

/* Compiles `program`'s top-level statements into `target`, registering
 * any [.task]s it declares into `root`'s function table instead of
 * `target`'s own -- the same table every ordinary call already resolves
 * against. `root == target` for an ordinary whole-program compile (what
 * `compile` below does); `include(path)` (see vm.c's call_builtin) wants
 * `root` to be the ALREADY-RUNNING program's function table and `target`
 * to be a fresh throwaway chunk for just the included file's own
 * top-level code, so a task the included file declares becomes callable
 * from the rest of the program exactly like one declared directly in it,
 * while the included file's own top-level statements run once, as their
 * own self-contained unit, matching the tree-walker's run_repl_chunk
 * (compile-and-run-into-the-same-globals) semantics `include` mirrors. */
void compile_into(NodeList program, Chunk *root, Chunk *target) {
    g_root = root;
    register_functions(&program);
    compile_block(&program, target);
    emit(target, OP_NIL, program.count > 0 ? program.items[program.count - 1]->line : 0);
    emit(target, OP_RETURN, program.count > 0 ? program.items[program.count - 1]->line : 0);
}

void compile(NodeList program, Chunk *chunk) {
    compile_into(program, chunk, chunk);
}
