#ifndef CREAL_EDIT_H
#define CREAL_EDIT_H

/* A flat, mutable, growable text buffer plus a caret position. Deliberately
 * has no Win32 calls anywhere in this file (see main.c's WM_CHAR/WM_KEYDOWN
 * handlers and draw_caret for the Win32-specific adapter that translates
 * keyboard events into calls on this and paints the result) -- a future
 * rendering backend (web, etc.) would reuse this file unchanged and only
 * need its own adapter translating its own key events the same way.
 *
 * Lines are just runs of text separated by '\n' -- no word-wrap tracking
 * here, so up/down movement and the caret's own line/column math are exact
 * (matching main.c's textarea render, which deliberately doesn't word-wrap
 * either, for the same reason: wrapped lines would need this buffer to know
 * about pixel widths, which is a rendering concern, not a data concern). */
typedef struct {
    char *text;     /* owned, heap-allocated, always NUL-terminated */
    int length;     /* not counting the NUL */
    int capacity;
    int caret;      /* index into text, 0..length */
    int selection_anchor; /* -1 = no selection; otherwise the OTHER end
                            * of the selected range from `caret` -- e.g.
                            * shift+Left just moves caret left, leaving
                            * anchor where it started, so the selected
                            * range is always [min(caret,anchor),
                            * max(caret,anchor)). Deliberately a second
                            * plain index rather than a separate
                            * start/end pair: every existing caret-moving
                            * function (move_left, move_up, ...) already
                            * works unchanged as "move the live end of
                            * the selection." */
} TextBuffer;

/* `initial` may be NULL (starts empty). Caret starts at 0. */
TextBuffer *textbuffer_create(const char *initial);
void textbuffer_free(TextBuffer *tb);

/* All mutations do in-place memmove within existing capacity and only
 * realloc-grow (doubling, same pattern as this project's other growable
 * arrays) -- never allocate a fresh buffer per keystroke. This is the one
 * place this project bends its usual "never free anything" simplicity,
 * since a live editing session is the first thing here that repeatedly
 * mutates one structure over and over within a single run. */
void textbuffer_insert_char(TextBuffer *tb, char c);
void textbuffer_backspace(TextBuffer *tb);       /* deletes the char before the caret */
void textbuffer_delete_forward(TextBuffer *tb);  /* deletes the char at the caret */

/* Replaces the whole buffer's contents (e.g. a backend's set_text) and
 * moves the caret to the end -- same "reuse existing capacity when it's
 * already big enough" growth as every other mutation here. */
void textbuffer_set_text(TextBuffer *tb, const char *text);

void textbuffer_move_left(TextBuffer *tb);
void textbuffer_move_right(TextBuffer *tb);
void textbuffer_move_up(TextBuffer *tb);    /* keeps column where possible, like any real editor */
void textbuffer_move_down(TextBuffer *tb);
void textbuffer_move_home(TextBuffer *tb);  /* start of the current line */
void textbuffer_move_end(TextBuffer *tb);   /* end of the current line */

/* Selection. `has_selection` is false for a zero-width range (caret ==
 * anchor) as well as anchor == -1 -- a real, empty selection behaves the
 * same as no selection everywhere a caller checks this, so there's only
 * ever one thing to test. `selection_start`/`selection_end` are the
 * normalized (start <= end) bounds; callers never need to compare caret
 * vs anchor themselves. `selected_text` returns a freshly malloc'd
 * NUL-terminated copy (caller frees) -- unlike get_text's backend-owned
 * pointer convention, since this one's meant to go straight to the
 * clipboard or be spliced elsewhere, both of which outlive the next
 * buffer mutation. */
int textbuffer_has_selection(const TextBuffer *tb);
int textbuffer_selection_start(const TextBuffer *tb);
int textbuffer_selection_end(const TextBuffer *tb);
char *textbuffer_selected_text(const TextBuffer *tb);
/* Deletes the selected range (a no-op if there isn't one) and clears
 * it, leaving the caret at the deletion point -- what every "typed a
 * character / pasted / cut while text was selected" case reduces to. */
void textbuffer_delete_selection(TextBuffer *tb);
void textbuffer_clear_selection(TextBuffer *tb);   /* anchor = -1, no text change */
void textbuffer_select_all(TextBuffer *tb);        /* anchor = 0, caret = length */
/* Starts (or keeps extending, if one is already live) a selection whose
 * live end is the caret -- called right before whichever move_* the
 * shift was held for, or right after a click-drag's caret_pos_from_point,
 * so that move_*'s usual caret-only update also grows the selection. */
void textbuffer_extend_selection(TextBuffer *tb);

#endif
