#ifndef CORAL_DIRLIST_H
#define CORAL_DIRLIST_H

typedef struct {
    char *name;  /* owned, heap-allocated, bare filename (no path) */
    int is_dir;  /* 1 if this entry is itself a directory, 0 for a file */
} DirEntry;

typedef struct {
    DirEntry *entries; /* owned, heap-allocated */
    int count;         /* -1 if the directory couldn't be opened at all --
                         * distinguishes "doesn't exist" from "exists but
                         * empty" (count == 0), so builtins.c's listDir can
                         * report the two differently. */
} DirEntries;

/* Lists the entries of the directory at `path` -- both files and
 * subdirectories, each tagged with which it is -- excluding "." and
 * "..". Isolated into its own translation unit on purpose, deliberately
 * never including <windows.h> in the same file as Coral's own lexer.h:
 * <winnt.h> defines TokenType as an enum CONSTANT (part of the
 * security-token API), which collides with Coral's own `typedef enum
 * {...} TokenType` the instant both land in one file -- the exact same
 * collision creal-lang's lexer.h renamed its own TokenType to dodge,
 * worked around here the same way catalog.c already keeps its Windows
 * calls in a file that never touches Coral's lexer.h at all. */
DirEntries list_dir(const char *path);

/* Puts `text` on the system clipboard as plain text (CF_TEXT) -- backs
 * uiSetClipboardText (builtins.c). Lives here rather than in builtins.c
 * itself for the exact same <windows.h>/TokenType collision reason
 * list_dir does (see above); returns 1 on success, 0 on failure (the
 * clipboard is real shared system state another app can be holding
 * open, so failure is a normal, non-fatal outcome here, unlike this
 * project's usual fatal-on-error convention). */
int clipboard_set_text(const char *text);

/* Registers "ccc://" as a REAL Windows URL protocol pointing at THIS
 * running coral.exe, under HKEY_CURRENT_USER\Software\Classes\ccc --
 * the standard per-user registration path, which (unlike
 * HKEY_CLASSES_ROOT directly) needs no admin elevation, since it only
 * affects the current Windows user. Once registered, clicking a
 * ccc://host:port/path link ANYWHERE on this machine (a browser, a
 * chat app, another Coral app's own text) launches
 * `coral.exe --open-ccc-url "ccc://host:port/path"` -- see main.c's own
 * check for that flag, which resolves the URL to a real
 * http://host:port/path and opens it in the user's actual default
 * browser, since a real browser has no native way to fetch a ccc://
 * address itself. Returns 1 on success, 0 on failure (e.g. the
 * registry write was denied) -- non-fatal, matching
 * clipboard_set_text's own convention for "real machine state something
 * else could interfere with." */
int register_ccc_protocol(void);

/* The other half of register_ccc_protocol: called (see main.c) when
 * Windows launches coral.exe with `--open-ccc-url ccc://host:port/path`
 * because the user clicked a real ccc:// link somewhere. A real
 * browser has no idea what "ccc" means, so this rewrites it to the
 * equivalent http://host:port/path (the exact scheme uiStartWebServer's
 * own loopback server actually speaks) and hands THAT to the user's
 * real default browser via ShellExecute. Returns 1 on success. */
int open_ccc_url(const char *ccc_url);

#endif
