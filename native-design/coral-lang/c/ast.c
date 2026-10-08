#include <stdlib.h>

#include "ast.h"

void nodelist_push(NodeList *list, Node *node) {
    if (list->count == list->capacity) {
        list->capacity = list->capacity == 0 ? 4 : list->capacity * 2;
        list->items = realloc(list->items, sizeof(Node *) * list->capacity);
    }
    list->items[list->count++] = node;
}

static Node *alloc_node(NodeType type, int line) {
    Node *n = calloc(1, sizeof(Node));
    n->type = type;
    n->line = line;
    return n;
}

Node *make_number(double value, int line) {
    Node *n = alloc_node(ND_NUMBER, line);
    n->as.number.value = value;
    return n;
}

Node *make_string(char *value, int line) {
    Node *n = alloc_node(ND_STRING, line);
    n->as.string.value = value;
    return n;
}

Node *make_nil(int line) {
    return alloc_node(ND_NIL, line);
}

Node *make_identifier(char *name, int line) {
    Node *n = alloc_node(ND_IDENTIFIER, line);
    n->as.identifier.name = name;
    return n;
}

Node *make_unary(char *op, Node *operand, int line) {
    Node *n = alloc_node(ND_UNARY, line);
    n->as.unary.op = op;
    n->as.unary.operand = operand;
    return n;
}

Node *make_binary(char *op, Node *left, Node *right, int line) {
    Node *n = alloc_node(ND_BINARY, line);
    n->as.binary.op = op;
    n->as.binary.left = left;
    n->as.binary.right = right;
    return n;
}

Node *make_call(char *callee, NodeList args, int line) {
    Node *n = alloc_node(ND_CALL, line);
    n->as.call.callee = callee;
    n->as.call.args = args;
    return n;
}

Node *make_assign(char *name, Node *expr, int line) {
    Node *n = alloc_node(ND_ASSIGN, line);
    n->as.assign.name = name;
    n->as.assign.expr = expr;
    return n;
}

Node *make_func_decl(char *name, char **params, int param_count, NodeList body, int line) {
    Node *n = alloc_node(ND_FUNC_DECL, line);
    n->as.func_decl.name = name;
    n->as.func_decl.params = params;
    n->as.func_decl.param_count = param_count;
    n->as.func_decl.body = body;
    return n;
}

Node *make_return(Node *expr, int line) {
    Node *n = alloc_node(ND_RETURN, line);
    n->as.ret.expr = expr;
    return n;
}

Node *make_if(IfBranch *branches, int branch_count, int line) {
    Node *n = alloc_node(ND_IF, line);
    n->as.if_stmt.branches = branches;
    n->as.if_stmt.branch_count = branch_count;
    return n;
}

Node *make_display(NodeList args, int line) {
    Node *n = alloc_node(ND_DISPLAY, line);
    n->as.display.args = args;
    return n;
}

Node *make_repeat(Node *count, Node *condition, NodeList body, int line) {
    Node *n = alloc_node(ND_REPEAT, line);
    n->as.repeat.count = count;
    n->as.repeat.condition = condition;
    n->as.repeat.body = body;
    return n;
}

Node *make_array_literal(NodeList items, int line) {
    Node *n = alloc_node(ND_ARRAY_LITERAL, line);
    n->as.array_literal.items = items;
    return n;
}

Node *make_index(Node *target, Node *index, int line) {
    Node *n = alloc_node(ND_INDEX, line);
    n->as.index.target = target;
    n->as.index.index = index;
    return n;
}

Node *make_index_assign(Node *target, Node *index, Node *value, int line) {
    Node *n = alloc_node(ND_INDEX_ASSIGN, line);
    n->as.index_assign.target = target;
    n->as.index_assign.index = index;
    n->as.index_assign.value = value;
    return n;
}

Node *make_index_delete(Node *target, Node *index, int line) {
    Node *n = alloc_node(ND_INDEX_DELETE, line);
    n->as.index.target = target;
    n->as.index.index = index;
    return n;
}

Node *make_expr_stmt(Node *expr, int line) {
    Node *n = alloc_node(ND_EXPR_STMT, line);
    n->as.expr_stmt.expr = expr;
    return n;
}

Node *make_list_read(Node *target, int line) {
    Node *n = alloc_node(ND_LIST_READ, line);
    n->as.list_read.target = target;
    return n;
}

Node *make_now_repeat(NowRepeatKind kind, Node *condition, Node *list_target,
                       char *counter_name, Node *count_end, NodeList body, int line) {
    Node *n = alloc_node(ND_NOW_REPEAT, line);
    n->as.now_repeat.kind = kind;
    n->as.now_repeat.condition = condition;
    n->as.now_repeat.list_target = list_target;
    n->as.now_repeat.counter_name = counter_name;
    n->as.now_repeat.count_end = count_end;
    n->as.now_repeat.body = body;
    return n;
}

Node *make_object_literal(char **keys, Node **values, int count, int line) {
    Node *n = alloc_node(ND_OBJECT_LITERAL, line);
    n->as.object_literal.keys = keys;
    n->as.object_literal.values = values;
    n->as.object_literal.count = count;
    return n;
}

Node *make_field_access(Node *target, char *field, int line) {
    Node *n = alloc_node(ND_FIELD_ACCESS, line);
    n->as.field_access.target = target;
    n->as.field_access.field = field;
    return n;
}

Node *make_field_assign(Node *target, char *field, Node *value, int line) {
    Node *n = alloc_node(ND_FIELD_ASSIGN, line);
    n->as.field_assign.target = target;
    n->as.field_assign.field = field;
    n->as.field_assign.value = value;
    return n;
}
