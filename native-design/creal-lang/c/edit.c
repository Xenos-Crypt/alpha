#include <stdlib.h>
#include <string.h>

#include "edit.h"

static void ensure_capacity(TextBuffer *tb, int extra) {
    if (tb->length + extra + 1 <= tb->capacity) return;
    int new_cap = tb->capacity == 0 ? 64 : tb->capacity;
    while (new_cap < tb->length + extra + 1) new_cap *= 2;
    tb->text = realloc(tb->text, (size_t)new_cap);
    tb->capacity = new_cap;
}

TextBuffer *textbuffer_create(const char *initial) {
    TextBuffer *tb = malloc(sizeof(TextBuffer));
    tb->text = NULL;
    tb->length = 0;
    tb->capacity = 0;
    tb->caret = 0;
    tb->selection_anchor = -1;

    int len = initial != NULL ? (int)strlen(initial) : 0;
    ensure_capacity(tb, len);
    if (len > 0) memcpy(tb->text, initial, (size_t)len);
    tb->length = len;
    tb->text[tb->length] = '\0';
    return tb;
}

void textbuffer_free(TextBuffer *tb) {
    if (tb == NULL) return;
    free(tb->text);
    free(tb);
}

void textbuffer_insert_char(TextBuffer *tb, char c) {
    if (textbuffer_has_selection(tb)) textbuffer_delete_selection(tb);
    ensure_capacity(tb, 1);
    memmove(tb->text + tb->caret + 1, tb->text + tb->caret, (size_t)(tb->length - tb->caret));
    tb->text[tb->caret] = c;
    tb->length++;
    tb->caret++;
    tb->text[tb->length] = '\0';
}

void textbuffer_backspace(TextBuffer *tb) {
    if (textbuffer_has_selection(tb)) { textbuffer_delete_selection(tb); return; }
    if (tb->caret == 0) return;
    memmove(tb->text + tb->caret - 1, tb->text + tb->caret, (size_t)(tb->length - tb->caret));
    tb->length--;
    tb->caret--;
    tb->text[tb->length] = '\0';
}

void textbuffer_delete_forward(TextBuffer *tb) {
    if (textbuffer_has_selection(tb)) { textbuffer_delete_selection(tb); return; }
    if (tb->caret >= tb->length) return;
    memmove(tb->text + tb->caret, tb->text + tb->caret + 1, (size_t)(tb->length - tb->caret - 1));
    tb->length--;
    tb->text[tb->length] = '\0';
}

void textbuffer_set_text(TextBuffer *tb, const char *text) {
    int len = text != NULL ? (int)strlen(text) : 0;
    tb->length = 0; /* measure ensure_capacity's growth from empty, not the old contents */
    ensure_capacity(tb, len);
    if (len > 0) memcpy(tb->text, text, (size_t)len);
    tb->length = len;
    tb->text[tb->length] = '\0';
    tb->caret = tb->length;
    tb->selection_anchor = -1;
}

int textbuffer_has_selection(const TextBuffer *tb) {
    return tb->selection_anchor >= 0 && tb->selection_anchor != tb->caret;
}

int textbuffer_selection_start(const TextBuffer *tb) {
    return tb->selection_anchor < tb->caret ? tb->selection_anchor : tb->caret;
}

int textbuffer_selection_end(const TextBuffer *tb) {
    return tb->selection_anchor < tb->caret ? tb->caret : tb->selection_anchor;
}

char *textbuffer_selected_text(const TextBuffer *tb) {
    if (!textbuffer_has_selection(tb)) return strdup("");
    int start = textbuffer_selection_start(tb), end = textbuffer_selection_end(tb);
    char *out = malloc((size_t)(end - start) + 1);
    memcpy(out, tb->text + start, (size_t)(end - start));
    out[end - start] = '\0';
    return out;
}

void textbuffer_delete_selection(TextBuffer *tb) {
    if (!textbuffer_has_selection(tb)) return;
    int start = textbuffer_selection_start(tb), end = textbuffer_selection_end(tb);
    memmove(tb->text + start, tb->text + end, (size_t)(tb->length - end));
    tb->length -= (end - start);
    tb->text[tb->length] = '\0';
    tb->caret = start;
    tb->selection_anchor = -1;
}

void textbuffer_clear_selection(TextBuffer *tb) {
    tb->selection_anchor = -1;
}

void textbuffer_select_all(TextBuffer *tb) {
    tb->selection_anchor = 0;
    tb->caret = tb->length;
}

void textbuffer_extend_selection(TextBuffer *tb) {
    if (tb->selection_anchor < 0) tb->selection_anchor = tb->caret;
}

void textbuffer_move_left(TextBuffer *tb) {
    if (tb->caret > 0) tb->caret--;
}

void textbuffer_move_right(TextBuffer *tb) {
    if (tb->caret < tb->length) tb->caret++;
}

static int line_start_of(const TextBuffer *tb, int pos) {
    while (pos > 0 && tb->text[pos - 1] != '\n') pos--;
    return pos;
}

static int line_end_of(const TextBuffer *tb, int pos) {
    while (pos < tb->length && tb->text[pos] != '\n') pos++;
    return pos;
}

void textbuffer_move_home(TextBuffer *tb) {
    tb->caret = line_start_of(tb, tb->caret);
}

void textbuffer_move_end(TextBuffer *tb) {
    tb->caret = line_end_of(tb, tb->caret);
}

void textbuffer_move_up(TextBuffer *tb) {
    int ls = line_start_of(tb, tb->caret);
    if (ls == 0) {
        tb->caret = 0;
        return;
    }
    int col = tb->caret - ls;
    int prev_line_end = ls - 1; /* the '\n' that separates the two lines */
    int prev_line_start = line_start_of(tb, prev_line_end);
    int prev_line_len = prev_line_end - prev_line_start;
    tb->caret = prev_line_start + (col < prev_line_len ? col : prev_line_len);
}

void textbuffer_move_down(TextBuffer *tb) {
    int ls = line_start_of(tb, tb->caret);
    int col = tb->caret - ls;
    int le = line_end_of(tb, tb->caret);
    if (le >= tb->length) return; /* already on the last line */
    int next_line_start = le + 1;
    int next_line_end = line_end_of(tb, next_line_start);
    int next_line_len = next_line_end - next_line_start;
    tb->caret = next_line_start + (col < next_line_len ? col : next_line_len);
}
