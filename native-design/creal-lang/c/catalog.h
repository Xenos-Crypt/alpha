#ifndef CREAL_CATALOG_H
#define CREAL_CATALOG_H

typedef struct {
    char *key;
    char *value;
} DesignProp;

typedef struct {
    char *name;   /* e.g. "frost1" — the filename minus ".design" */
    char *family; /* e.g. "frost" — the folder it lives in */
    DesignProp *props;
    int prop_count;
} Design;

typedef struct {
    Design *items;
    int count;
} Catalog;

/* Scans dir_path for one level of family folders (design/element/frost/,
 * design/element/ice/, ...), each holding *.design files — one variant
 * per file, named just by number (the folder already says the family).
 * See design/c.txt and SYNTAX_v0.1.md's "using" section for the property
 * keys a .design file can set. */
Catalog load_catalog(const char *dir_path);

/* Case-insensitive lookup by design name (e.g. "frost1"). NULL if the
 * catalog doesn't have a design by that name (yet) — callers should show
 * that honestly, not silently fall back, matching how `using` already
 * behaves when the whole catalog was empty. */
const Design *catalog_find(const Catalog *cat, const char *name);

/* Looks up a property on a design; NULL if it doesn't set that key. */
const char *design_prop(const Design *d, const char *key);

#endif
