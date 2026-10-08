/* Standalone headless test for edit.c's TextBuffer -- not part of creal.exe
 * itself, not built by build.ps1. Exists because this environment has no
 * visible desktop for creal.exe's actual GUI window to appear on, so the
 * editing logic (the real substance of B1) is verified directly here
 * instead of by eye. Build/run:
 *   gcc -std=c11 -Wall -Wextra -O2 -o edit_test.exe edit_test.c edit.c
 *   .\edit_test.exe
 */
#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "edit.h"

static int failures = 0;

static void check_str(const char *label, const char *got, const char *want) {
    if (strcmp(got, want) != 0) {
        printf("FAIL %s: got \"%s\", want \"%s\"\n", label, got, want);
        failures++;
    } else {
        printf("ok   %s\n", label);
    }
}

static void check_int(const char *label, int got, int want) {
    if (got != want) {
        printf("FAIL %s: got %d, want %d\n", label, got, want);
        failures++;
    } else {
        printf("ok   %s\n", label);
    }
}

int main(void) {
    /* Basic insert/typing, starting empty. */
    TextBuffer *tb = textbuffer_create(NULL);
    check_int("empty buffer length", tb->length, 0);
    check_int("empty buffer caret", tb->caret, 0);
    const char *hi = "Hi!";
    for (size_t i = 0; i < strlen(hi); i++) textbuffer_insert_char(tb, hi[i]);
    check_str("typed text", tb->text, "Hi!");
    check_int("caret after typing", tb->caret, 3);
    textbuffer_free(tb);

    /* Insert in the middle, not just at the end. */
    tb = textbuffer_create("Hllo");
    tb->caret = 1;
    textbuffer_insert_char(tb, 'e');
    check_str("mid-insert", tb->text, "Hello");
    check_int("mid-insert caret", tb->caret, 2);
    textbuffer_free(tb);

    /* Backspace and forward-delete. */
    tb = textbuffer_create("Hello");
    tb->caret = 5;
    textbuffer_backspace(tb);
    check_str("backspace", tb->text, "Hell");
    check_int("backspace caret", tb->caret, 4);
    textbuffer_backspace(tb);
    textbuffer_backspace(tb);
    textbuffer_backspace(tb);
    textbuffer_backspace(tb); /* one more than remains -- must be a no-op, not underflow */
    check_str("backspace to empty and past it", tb->text, "");
    check_int("backspace past empty caret", tb->caret, 0);
    textbuffer_free(tb);

    tb = textbuffer_create("Hello");
    tb->caret = 0;
    textbuffer_delete_forward(tb);
    check_str("delete-forward", tb->text, "ello");
    check_int("delete-forward caret unchanged", tb->caret, 0);
    tb->caret = tb->length;
    textbuffer_delete_forward(tb); /* at end -- must be a no-op */
    check_str("delete-forward at end is no-op", tb->text, "ello");
    textbuffer_free(tb);

    /* Left/right movement, including clamping at both ends. */
    tb = textbuffer_create("abc");
    tb->caret = 0;
    textbuffer_move_left(tb);
    check_int("move_left clamps at 0", tb->caret, 0);
    textbuffer_move_right(tb);
    textbuffer_move_right(tb);
    textbuffer_move_right(tb);
    textbuffer_move_right(tb); /* one past the end -- must clamp at length */
    check_int("move_right clamps at length", tb->caret, 3);
    textbuffer_free(tb);

    /* Multi-line: home/end within a line. */
    tb = textbuffer_create("abc\ndefgh\nij");
    tb->caret = 6; /* the 'e' in "defgh" (line 2, col 1) */
    textbuffer_move_home(tb);
    check_int("home moves to line start", tb->caret, 4);
    tb->caret = 6;
    textbuffer_move_end(tb);
    check_int("end moves to line end", tb->caret, 9); /* just before the second '\n' */
    textbuffer_free(tb);

    /* Up/down preserving column where possible, and clamping to a shorter
     * line's actual length otherwise -- the real point of this whole
     * mechanism, since a naive "same byte offset" approach would land
     * mid-word or past a shorter line's end. Lines: "abc" (0-2), "de" (4-5),
     * "fghij" (7-11). */
    tb = textbuffer_create("abc\nde\nfghij");
    tb->caret = 2; /* 'c', column 2 of line 0 */
    textbuffer_move_down(tb);
    check_int("down onto a shorter line clamps to its end", tb->caret, 6); /* "de" is only 2 chars, col 2 = end */
    textbuffer_move_down(tb);
    check_int("down keeps column when the next line is long enough", tb->caret, 9); /* "fghij" col 2 = 'h' */
    textbuffer_move_up(tb);
    check_int("up back onto the short line still clamps", tb->caret, 6);
    textbuffer_move_up(tb);
    check_int("up onto the first line", tb->caret, 2);
    textbuffer_move_up(tb); /* already on the first line -- must go to absolute start, not underflow */
    check_int("up from the first line goes to buffer start", tb->caret, 0);
    textbuffer_free(tb);

    /* Growth past the initial small capacity actually works (not just
     * within one realloc's headroom) -- insert enough characters to force
     * several doublings, matching this project's growable-array pattern
     * elsewhere (NodeList/TokenList). */
    tb = textbuffer_create(NULL);
    for (int i = 0; i < 500; i++) textbuffer_insert_char(tb, 'x');
    check_int("grows past many reallocs", tb->length, 500);
    int all_x = 1;
    for (int i = 0; i < 500; i++) if (tb->text[i] != 'x') all_x = 0;
    check_int("content intact after growth", all_x, 1);
    textbuffer_free(tb);

    printf("\n%s (%d failure%s)\n", failures == 0 ? "ALL PASSED" : "SOME FAILED",
           failures, failures == 1 ? "" : "s");
    return failures == 0 ? 0 : 1;
}
