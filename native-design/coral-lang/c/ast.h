#ifndef CORAL_AST_H
#define CORAL_AST_H

typedef struct Node Node;

typedef struct {
    Node **items;
    int count;
    int capacity;
} NodeList;

typedef enum {
    ND_NUMBER,
    ND_STRING,
    ND_NIL,      /* the literal "nothing yet" value -- currently only reachable via
                  * [.create]'s desugaring; not writable directly by the user */
    ND_IDENTIFIER,
    ND_UNARY,
    ND_BINARY,
    ND_CALL,
    ND_ASSIGN,   /* name = expr — both first assignment and reassignment; no let/const */
    ND_FUNC_DECL,
    ND_RETURN,
    ND_IF,
    ND_DISPLAY,  /* dedicated statement syntax, not a function call: display expr (, expr)* */
    ND_REPEAT,   /* repeat count times [if condition] <indented block> */
    ND_ARRAY_LITERAL, /* [expr, expr, ...] */
    ND_INDEX,          /* target[index] -- as an expression (read) */
    ND_INDEX_ASSIGN,   /* target[index] = value -- as a statement (write) */
    ND_INDEX_DELETE,   /* removes target[index] from the array, shifting
                         * everything after it down one slot -- via
                         * '[.delete] {target[index]}'. Only ever position-
                         * based (never "find this value and remove it") --
                         * confirmed with the user. */
    ND_EXPR_STMT,
    ND_LIST_READ,      /* {name[.list]} -- current 1-based cursor position (a
                         * number) of a 'now repeat {name[.list]} until ...'
                         * loop over this array; see ND_NOW_REPEAT */
    ND_NOW_REPEAT,     /* 'now repeat ...', all three flavors -- see NowRepeatKind */
    ND_OBJECT_LITERAL, /* [key: expr, key: expr, ...] -- disambiguated from
                         * ND_ARRAY_LITERAL at parse time by the leading
                         * IDENT ':', see parse_primary */
    ND_FIELD_ACCESS,   /* {target.field} -- as an expression (read); chains
                         * with ND_INDEX in either order, e.g. {data[1].name}
                         * or {person.pets[1]} */
    ND_FIELD_ASSIGN,   /* target.field = value -- as a statement (write),
                         * via '[.change] {target.field} to value'. Adds the
                         * field if it doesn't already exist rather than
                         * erroring, matching this language's general
                         * "make/change" flexibility. */
} NodeType;

/* One IfStmt branch: condition == NULL marks the trailing `else`. */
typedef struct {
    Node *condition;
    NodeList body;
} IfBranch;

/* The three closing forms of a step chain -- see parse_block_body for how
 * the body (the then-chained steps right above the 'now repeat' line) gets
 * assembled, and the addendum's "Loops" section for the full design. */
typedef enum {
    NOW_REPEAT_UNTIL,      /* now repeat until COND */
    NOW_REPEAT_LIST_UNTIL, /* now repeat {arr[.list]} until COND */
    NOW_REPEAT_COUNT,      /* now repeat count START to END */
} NowRepeatKind;

struct Node {
    NodeType type;
    int line;
    union {
        struct { double value; } number;
        struct { char *value; } string;
        struct { char *name; } identifier;
        struct { char *op; Node *operand; } unary;
        struct { char *op; Node *left; Node *right; } binary;
        struct { char *callee; NodeList args; } call;
        struct { char *name; Node *expr; } assign;
        struct { char *name; char **params; int param_count; NodeList body; } func_decl;
        struct { Node *expr; /* NULL for a bare `return` */ } ret;
        struct { IfBranch *branches; int branch_count; } if_stmt;
        struct { NodeList args; } display;
        struct { Node *count; Node *condition; /* NULL if there's no 'if' clause */ NodeList body; } repeat;
        struct { NodeList items; } array_literal;
        struct { Node *target; Node *index; } index;
        struct { Node *target; Node *index; Node *value; } index_assign;
        struct { Node *expr; } expr_stmt;
        struct { Node *target; } list_read;
        struct {
            NowRepeatKind kind;
            Node *condition;    /* UNTIL / LIST_UNTIL: checked before every pass, loop stops once true */
            Node *list_target;  /* LIST_UNTIL only: the array whose .list cursor drives this loop */
            char *counter_name; /* COUNT only: pulled from the '[.count] ... and put it into VAR' line right before the chain */
            Node *count_end;    /* COUNT only: END, re-evaluated every pass */
            NodeList body;
        } now_repeat;
        /* keys/values are parallel arrays (same convention as func_decl's
         * params), not a NodeList of pairs -- keys are plain owned strings
         * (borrowed from the IDENT token, same as every other identifier
         * text in this AST), not Nodes themselves. */
        struct { char **keys; Node **values; int count; } object_literal;
        struct { Node *target; char *field; } field_access;
        struct { Node *target; char *field; Node *value; } field_assign;
    } as;
};

void nodelist_push(NodeList *list, Node *node);

Node *make_number(double value, int line);
Node *make_string(char *value, int line);
Node *make_nil(int line);
Node *make_identifier(char *name, int line);
Node *make_unary(char *op, Node *operand, int line);
Node *make_binary(char *op, Node *left, Node *right, int line);
Node *make_call(char *callee, NodeList args, int line);
Node *make_assign(char *name, Node *expr, int line);
Node *make_func_decl(char *name, char **params, int param_count, NodeList body, int line);
Node *make_return(Node *expr, int line);
Node *make_if(IfBranch *branches, int branch_count, int line);
Node *make_display(NodeList args, int line);
Node *make_repeat(Node *count, Node *condition, NodeList body, int line);
Node *make_array_literal(NodeList items, int line);
Node *make_index(Node *target, Node *index, int line);
Node *make_index_assign(Node *target, Node *index, Node *value, int line);
Node *make_index_delete(Node *target, Node *index, int line); /* shares ND_INDEX's {target, index} shape -- see ast.h */
Node *make_expr_stmt(Node *expr, int line);
Node *make_list_read(Node *target, int line);
Node *make_now_repeat(NowRepeatKind kind, Node *condition, Node *list_target,
                       char *counter_name, Node *count_end, NodeList body, int line);
Node *make_object_literal(char **keys, Node **values, int count, int line);
Node *make_field_access(Node *target, char *field, int line);
Node *make_field_assign(Node *target, char *field, Node *value, int line);

#endif
