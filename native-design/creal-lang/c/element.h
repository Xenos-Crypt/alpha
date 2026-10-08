#ifndef CREAL_ELEMENT_H
#define CREAL_ELEMENT_H

typedef struct {
    char *key;
    char *value;
} Attr;

typedef struct Element Element;

/* An indented block of child elements right below this one -- "row"/
 * "column" are the only types that actually do anything with children
 * during layout (see win32_backend.c's tree-walking paint pass), but
 * the data model itself doesn't restrict children to those two types,
 * same way Coral's own AST doesn't restrict which statements can hold a
 * body. A leaf element (text/button/image/input/textarea) with no
 * indented lines under it just has child_count == 0, exactly like
 * every element in a flat, unindented .cr file always has. */
struct Element {
    char *type;    /* "text", "button", "image", "input", "textarea", "row", "column" */
    char *content; /* NULL if this element has none (e.g. input) */
    Attr *attrs;
    int attr_count;
    int line;
    Element *children;
    int child_count;
    /* A stable identity for this element's runtime state (g_rects,
     * g_buffers, etc. in win32_backend.c), assigned once when the
     * element is created -- either during the initial parse-time walk,
     * or (for one added later via the add_text backend call, letting
     * Coral create elements it didn't know about at uiLoad time) at
     * that moment. Deliberately NOT "position in a flattened snapshot
     * of the tree": a `children` array can be realloc'd to grow (adding
     * a new element does exactly that), which would silently invalidate
     * every position-based index for every OTHER element in that same
     * array the instant one more gets appended. A monotonically
     * increasing id assigned at creation and never reused sidesteps
     * that entirely -- growing the tree only ever hands out a new id,
     * never disturbs any existing one. */
    int runtime_id;
};

typedef struct {
    Element *items;
    int count;
} ElementList;

/* Reads and parses a whole .cr file into a TREE of elements: a line
 * indented deeper than the element right above it becomes that
 * element's child (same indentation model as Coral's own block bodies
 * -- see lexer.h's Token.indent). The returned list is always the
 * top-level elements only; nested ones hang off their parent's
 * `children`. A fully flat file (every line at the same indentation,
 * e.g. examples/hello.cr) produces a tree with zero children anywhere,
 * identical in shape to what this function returned before B2 added
 * nesting at all -- verified explicitly, not just assumed. */
ElementList parse_creal_file(const char *path);

/* Looks up an attribute by name; returns NULL if the element doesn't have it. */
const char *element_attr(const Element *el, const char *key);

#endif
