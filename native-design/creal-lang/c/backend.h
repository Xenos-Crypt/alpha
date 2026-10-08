#ifndef CREAL_BACKEND_H
#define CREAL_BACKEND_H

/* Creal's rendering target is meant to be swappable eventually (web/desktop,
 * not just this phone OS's own screen) -- so parsing a .cr file into an
 * Element tree (element.c) stays completely backend-agnostic, and turning
 * that tree into pixels goes through this small interface instead of
 * anything calling Win32/GDI directly. Today's Win32 code (win32_backend.c)
 * is the FIRST implementation of this interface, not something baked in as
 * the only option -- a future backend means writing a new .c file that
 * fills in a UIBackend the same shape as this one, with zero changes to
 * element.c, edit.c, or any .cr/.cs script. */

typedef void (*UIClickHandler)(void *userdata);

/* One colored run inside a textarea's text, for set_highlight below.
 * `start`/`end` are 1-BASED INCLUSIVE byte offsets into that element's
 * current text -- deliberately the same convention tokenize() (see
 * coral-lang's builtins.c) already returns, so a Coral-side highlighter
 * can hand tokenize()'s own start/end straight through with no
 * translation. `color` is a color NAME (the same string space set_color
 * already takes, e.g. "yellow"), not a backend color type -- keeps this
 * header free of any Win32 (or other backend's) color representation. */
typedef struct {
    int start;
    int end;
    const char *color;
} HighlightSpan;

typedef struct {
    /* Parses the .cr file at `path` into an Element tree and creates the
     * window/surface for it. Does not pump events -- see run(). Fatal (like
     * every other error path in this project) if the file can't be parsed. */
    void (*load)(const char *path);

    /* Replaces / reads the live text of the textarea (or, once one exists,
     * input) element whose 'id' attribute matches `id`. Fatal if no such
     * element exists. get_text's returned pointer is backend-owned and only
     * valid until the next mutation of that element -- callers that need to
     * keep the value should copy it immediately, not hold the pointer. */
    void (*set_text)(const char *id, const char *value);
    const char *(*get_text)(const char *id);

    /* Registers `handler` (called with `userdata`) to run whenever the
     * element whose 'id' attribute matches `id` is clicked -- a press and
     * release both landing on that same element. Fatal if no such element
     * exists. Only "button" elements actually generate click events today
     * (see win32_backend.c's hit-testing), but on_click itself doesn't
     * restrict by type, so a future clickable element type needs no change
     * here. */
    void (*on_click)(const char *id, UIClickHandler handler, void *userdata);

    /* Changes which catalog design (a file under design/element/, resolved
     * via catalog_find) -- the same thing a static `using name` attribute in
     * a .cr file resolves at parse time) the element whose 'id' matches
     * `id` renders with, overriding whatever `using`/hand-set properties
     * it started with. Fatal if no such element exists; NOT fatal if
     * `design_name` isn't in the catalog (matches the existing "using
     * note" convention drawn for a static `using` that doesn't resolve
     * -- see win32_backend.c's draw_using_note). Takes effect on the
     * next repaint. */
    void (*set_design)(const char *id, const char *design_name);

    /* Creates a brand-new "text" element with the given id and content,
     * appended as the last child of the element whose 'id' matches
     * `container_id` (a "row"/"column" is the sensible target, though
     * nothing enforces that). What makes an unbounded, "however many
     * items there turn out to be" list possible from Coral at all --
     * every other function here only ever mutates an element the .cr
     * file already declared; this is the one way to add something new.
     * Fatal if no element has `container_id`. Takes effect on the next
     * repaint. */
    void (*add_text)(const char *container_id, const char *id, const char *content);

    /* Changes a "text" element's color directly -- a lighter-weight
     * alternative to set_design for when only one color needs to
     * change (e.g. highlighting the selected entry in a file list),
     * without needing a whole catalog design entry. Pass an EMPTY
     * string to clear the override and go back to the element's static
     * `color` attribute. Fatal if no element has `id`. Takes effect on
     * the next repaint. */
    void (*set_color)(const char *id, const char *color_name);

    /* Recolors a textarea's text token-by-token instead of uniformly --
     * backs syntax highlighting. `spans` need not (and in practice won't)
     * cover every byte of the text; any byte not covered by a span keeps
     * the element's plain uniform text color. Spans reference byte
     * offsets into the text as it stood at the time of the call -- they
     * go stale (silently start coloring the wrong characters) the moment
     * that text changes via set_text or live editing, since nothing here
     * re-tokenizes automatically; a caller that wants highlighting to
     * track edits has to re-tokenize and call this again itself. Passing
     * `count` 0 clears any existing highlight, reverting to plain
     * uniform color. Fatal if `id` isn't a textarea. Takes effect on the
     * next repaint. */
    void (*set_highlight)(const char *id, const HighlightSpan *spans, int count);

    /* The counterpart add_text was always missing: actually removes the
     * element whose 'id' matches from the tree (wherever in it lives,
     * however deeply nested), splicing it out of its parent's children
     * (or the top-level list) rather than just hiding it. Before this,
     * "removing" something Coral had added meant blanking its text via
     * set_text and leaving an inert, still-clickable, still-taking-up-
     * layout-space element behind forever -- that workaround is gone
     * now that this exists for real. Fatal if no element has `id`.
     * Deliberately does NOT reclaim or reuse that element's runtime_id
     * slot in any of this file's per-element arrays (g_rects, g_buffers,
     * g_click_handlers, ...) -- runtime_id assignment is one-way by
     * design (see element.h), so that slot just becomes permanently
     * unreachable, same "never free, never reuse" convention already
     * applied to those arrays elsewhere. Takes effect on the next
     * repaint. */
    void (*remove_element)(const char *id);

    /* Blocks, pumping the event loop, until the window closes. */
    void (*run)(void);
    /* Named panels can be hidden without discarding their buffers or handlers.
     * panel_menu opens a checked visibility menu plus a layout reset command. */
    void (*toggle_panel)(const char *id);
    void (*panel_menu)(const char *anchor_id);
    void (*set_visible)(const char *id,int visible);
    int (*is_visible)(const char *id);
    void (*on_change)(const char *id,UIClickHandler handler,void *userdata);
    void (*go_to_line)(const char *id,int line);
    int (*toggle_rail)(void);
    int (*toggle_moving)(void);
    void (*scroll_tabs)(const char *id,int delta);
    void (*reveal_tab)(const char *id);
    void (*set_match)(const char *id,const char *query);
    void (*set_search_result)(const char *id,const char *path,int line,const char *term);
    void (*on_tick)(UIClickHandler handler,void *userdata,int milliseconds);

    /* Registers `handler` to run on a RIGHT click (WM_RBUTTONDOWN
     * directly -- no press/release distinction, matching every native
     * Windows app's own context-menu behavior) landing on the element
     * whose 'id' matches `id`. Entirely separate from on_click, since an
     * element reasonably wants different behavior for each (a file's
     * left-click opens it, right-click shows a context menu). */
    void (*on_right_click)(const char *id, UIClickHandler handler, void *userdata);
    /* Shows a native popup menu at the most recent right click's screen
     * position with these `count` labels, blocking until the user picks
     * one or dismisses it. Returns the 1-based index of the chosen
     * label (matching Coral's own indexing convention), or 0 for no
     * choice -- the menu's actual CONTENTS are entirely a Coral-side
     * decision (a right-click handler builds whatever labels make sense
     * for what got clicked), unlike panel_menu's fixed layout list. */
    int (*show_menu)(const char **labels, int count);

    /* An IN-APP modal yes/no confirmation, drawn with this app's own
     * theme (not a native MessageBoxA) -- for a destructive action
     * (Delete) that needs a real answer before proceeding. Unlike a
     * blocking native dialog, this returns immediately: `on_yes`/
     * `on_no` (the same UIClickHandler shape on_click already uses)
     * fire later, whenever the user actually clicks a button in the
     * modal, at which point the caller's own logic should continue. */
    void (*show_confirm)(const char *message, UIClickHandler on_yes, void *yes_data, UIClickHandler on_no, void *no_data);
    /* Same idea for a text-input prompt (Win32 has no built-in "input
     * box" even natively, and this needed to match the confirm modal's
     * own theme regardless). `on_ok` fires once the user confirms --
     * read the entered text via modal_input_text() from INSIDE that
     * callback, since UIClickHandler itself has no return channel. */
    void (*show_prompt)(const char *message, const char *initial, UIClickHandler on_ok, void *ok_data, UIClickHandler on_cancel, void *cancel_data);
    /* The prompt modal's current (or, once closed, final) entered text.
     * Only meaningful called from inside an on_ok callback. */
    const char *(*modal_input_text)(void);

    /* Which chrome a "device" element draws around its rendered preview
     * -- "phone" (the default, unchanged from before this existed),
     * "web" (a browser window with an address bar), or "desktop" (a
     * plain titled window) -- letting Coral declare what kind of app is
     * actually being previewed instead of every app always looking like
     * a phone screen regardless of what it targets. Fatal if no element
     * has `id`, matching set_color/set_design; an unrecognized frame
     * name falls back to "phone" rather than failing, same "shown
     * loudly but not fatally" spirit as an unresolved `using` design. */
    void (*set_device_frame)(const char *id, const char *frame);

    /* Everything past this point exists ONLY for real, live, clickable
     * app embedding in the device preview -- see coral-lang's
     * builtins.c (uiEmbedApp) for the orchestration, since running an
     * ISOLATED second Coral program (its own lex/parse/interpret) is
     * something this Coral-agnostic file can never do itself (it's
     * linked into plain creal.exe too, which has no Coral interpreter
     * at all).
     *
     * set_embed_target(id) marks element `id` as the one a subsequent
     * uiLoad call should attach its parsed tree to (as real children,
     * not a new window) instead of creating a real window the normal
     * top-level uiLoad always has; NULL/"" clears it, back to normal
     * uiLoad behavior. A subsequent uiRun call also becomes a no-op
     * while a target is set, since the host's own message loop is
     * already pumping -- an embedded app calling uiRun (every .co
     * written to run standalone still does) must never try to start a
     * SECOND, nested one. */
    void (*set_embed_target)(const char *id);

    /* Real HTTP server (loopback only), started once per process, for a
     * #web-tagged app -- see web_backend.h for the whole design (full-
     * page-reload-per-click, zero JavaScript, real Coral logic on every
     * request; a live-push WebSocket transport is a planned next step,
     * not built yet). root_device_id: "" serves the top-level loaded
     * app; a device element's id serves whatever's been uiEmbedApp'd
     * into it instead (see win32_backend.c's paint_embedded_app for the
     * same "these are just an element's real children" idea, reused
     * here for HTML instead of GDI). Calling this again just repoints
     * root_device_id -- the listener itself only ever starts once. */
    void (*start_web_server)(int port, const char *root_device_id);
} UIBackend;

/* The Win32/GDI backend -- today's (and for now, only) implementation. */
const UIBackend *win32_backend(void);

#endif
