#define WINVER 0x0600
#define _WIN32_WINNT 0x0600
#define WIN32_LEAN_AND_MEAN /* excludes <winsock.h> from windows.h so web_backend.h's <winsock2.h> (needed for the
                              * real HTTP server backing uiStartWebServer) doesn't collide with it -- GDI/User32,
                              * everything else this file actually uses, are unaffected by this define. */

#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "backend.h"
#include "element.h"
#include "catalog.h"
#include "edit.h"
#include "prose.h"
#include "scene3d.h"

#define CARET_TIMER_ID 1
#define WM_APP_WEB_REQUEST (WM_APP + 50) /* posted by web_backend.h's server thread -- see its own comment */

static ElementList g_elements;   /* top-level elements only -- walk into ->children for the rest */
/* Every element ever created (at load, or later via add_text) gets the
 * next id here, once, forever -- see element.h's own comment on
 * Element.runtime_id for why this replaced an earlier "position in a
 * flattened snapshot" scheme (that scheme broke the instant an element
 * could be added after the snapshot was taken, since appending to a
 * `children` array reallocates it). Every per-element runtime array
 * below is indexed BY this id, sized to hold at least g_next_runtime_id
 * entries (see ensure_state_capacity) -- growing the tree only ever
 * claims a new id at the end, so an existing id's slot in any of these
 * arrays never moves or gets reinterpreted. */
static int g_next_runtime_id = 0;
static int g_state_capacity = 0; /* current allocated length of every array below */
static RECT *g_rects = NULL;     /* one screen rect per element, filled in during paint */
static int g_pressed = -1;       /* index of the button currently held down, -1 = none */
static int g_hovered = -1;       /* index of the button the mouse is currently over, -1 = none */
static Catalog g_catalog;        /* loaded once at startup from design/element/ next to this exe */
static TextBuffer **g_buffers = NULL; /* one per element, NULL except for "textarea" elements */
static int g_focused_index = -1; /* index of the textarea currently receiving keystrokes, -1 = none */
static int g_selecting_index = -1; /* index of a textarea being drag-selected in (mouse still down), -1 = none */
static int g_embed_device_index = -1; /* runtime_id of the device element a subsequent uiLoad should attach to, -1 = normal (real-window) uiLoad */
static char g_web_display_url[160] = ""; /* real address-bar text for the LIVE "web" frame (see paint_embedded_app) -- set by win32_start_web_server (web_backend.h) once uiStartWebServer actually starts listening */
static int g_caret_visible = 1;  /* toggled by CARET_TIMER_ID for the blink */
static HWND g_hwnd = NULL;
static UIClickHandler g_tick_handler;
static void *g_tick_userdata;
static void win32_on_tick(UIClickHandler handler,void *userdata,int milliseconds) {
    g_tick_handler=handler;g_tick_userdata=userdata;
    if(g_hwnd)SetTimer(g_hwnd,4,milliseconds<30?30:milliseconds,NULL);
}
static int g_workspace = 0;
static int g_custom_chrome = 0;
static int g_view_height = 900;
static int g_view_width = 1440;
static int g_follow_caret = 0;

#include "panel_layout.h"

/* Parallel to g_elements, like g_rects/g_buffers -- NULL except for an
 * element that's had on_click registered on it (see UIBackend.on_click).
 * Fired from WM_LBUTTONUP, not WM_LBUTTONDOWN: a "click" is a press AND a
 * release landing on the same element, not just a press (see WndProc). */
static UIClickHandler *g_click_handlers = NULL;
static void **g_click_userdata = NULL;

/* Same idea, for a right-click/context-menu handler -- backs a new
 * on_right_click UIBackend method + uiOnRightClick builtin, entirely
 * separate from g_click_handlers since an element can reasonably want
 * a different action on left vs. right click (a file's left-click opens
 * it, right-click shows a menu). Fired from WM_RBUTTONDOWN directly
 * (no press/release distinction the way a left click has -- a context
 * menu wants to open on the down-click, matching every native
 * Windows app). */
static UIClickHandler *g_rightclick_handlers = NULL;
static void **g_rightclick_userdata = NULL;
/* The screen-coordinate point of the most recent right click, so a
 * Coral-side handler calling uiShowMenu shortly after doesn't have to
 * pass coordinates through the language at all -- geometry stays a
 * backend concern, matching every other ui* builtin. */
static POINT g_last_rightclick_screen;

/* An IN-APP modal (confirm or text-prompt), drawn with this file's own
 * GDI helpers (fill_panel/draw_label/the same font choices everything
 * else uses) directly on top of the normal layout -- replaces the
 * earlier native MessageBoxA/hand-rolled-EDIT-dialog approach, which
 * looked like a plain Windows dialog dropped on top of Cryptic's own
 * dark theme, not part of the app. While a modal is active it takes
 * ALL mouse/keyboard input (checked first, before any normal hit-
 * testing -- see WM_LBUTTONDOWN/WM_CHAR/WM_KEYDOWN), the same
 * "modal blocks everything else" property a native dialog had, just
 * implemented as ordinary state in this window instead of a second
 * HWND. `on_primary`/`on_secondary` reuse the exact same
 * UIClickHandler trampoline every ordinary uiOnClick binding already
 * does -- a modal's Yes/OK or No/Cancel is really just "call this
 * Coral function", nothing new needed there. */
typedef enum { MODAL_NONE = 0, MODAL_CONFIRM, MODAL_PROMPT } ModalKind;
static ModalKind g_modal_kind = MODAL_NONE;
static char g_modal_message[512];
static TextBuffer *g_modal_input = NULL;
static UIClickHandler g_modal_on_primary = NULL, g_modal_on_secondary = NULL;
static void *g_modal_primary_data = NULL, *g_modal_secondary_data = NULL;
static RECT g_modal_primary_rect, g_modal_secondary_rect, g_modal_input_rect;

/* Parallel to g_click_handlers -- NULL except for an element that's had
 * its design overridden at runtime via set_design (the Coral-facing
 * uiSetDesign builtin). layout_element checks this FIRST, falling back
 * to the element's own static `using` attribute only when it's NULL, so
 * a runtime override always wins once one has been set. Never freed
 * when overwritten by a later call, matching this project's "never
 * free anything" convention elsewhere (see edit.c) -- set_design isn't
 * called anywhere near often enough (unlike a per-keystroke text edit)
 * for that to matter in practice. */
static char **g_design_override = NULL;

/* Same idea as g_design_override, for a "text" element's CONTENT rather
 * than its design -- set_text always worked on a textarea's live buffer
 * (g_buffers), but had no way at all to change a plain "text" element's
 * displayed string, since Element is parse-time-immutable and nothing
 * parallel existed for content the way g_buffers already did for a
 * textarea. layout_element checks this first, falling back to the
 * element's own static content only when it's NULL. */
static char **g_text_override = NULL;

/* Same idea again, for a "text" element's COLOR -- lets Coral highlight
 * e.g. the currently-selected file in a sidebar list without needing a
 * whole catalog design (uiSetDesign) just to change one color. An empty
 * string (not NULL) means "clear the override, go back to the static
 * `color` attribute" -- see win32_set_color. */
static char **g_color_override = NULL;
static char **g_frame_override = NULL; /* per-element "device" chrome choice -- NULL = "phone" (see win32_set_device_frame) */

/* Current scroll position (pixels scrolled down), one per element --
 * only meaningful for a "column" that also has a `height:` attribute
 * (see layout_element), everything else just carries an unused 0.
 * Mutated by WM_MOUSEWHEEL (see scrollable_at_rec), clamped to a valid
 * range by layout_element itself every repaint (recomputed from
 * scratch each time, same as everything else this file draws -- if the
 * content shrinks, the clamp catches up on the very next paint). */
static int *g_scroll_offset = NULL;

/* One resolved (start, end, COLORREF) run for set_highlight -- backend.h's
 * HighlightSpan carries a color NAME instead of a COLORREF, to keep that
 * header Win32-free; the name is resolved to an actual COLORREF once,
 * here, at set_highlight time (via parse_color, defined below) rather
 * than on every repaint. */
typedef struct {
    int start;
    int end;
    COLORREF color;
} ResolvedSpan;

/* One dynamically-sized ResolvedSpan array per element, NULL/0 except for
 * a textarea that's had set_highlight called on it. Like g_design_override
 * et al., overwriting a previous highlight just leaks the old array
 * (matches this project's "never free" convention) -- fine in practice
 * since this is called once per file-open, not per keystroke, unlike
 * g_buffers' in-place text editing. */
typedef struct { char *needle,*path; int line; } SearchDecoration;
static SearchDecoration *g_search;
static ResolvedSpan **g_highlight_spans = NULL;
static int *g_highlight_count = NULL;

typedef struct {
    const char *name;
    COLORREF color;
} NamedColor;

static const NamedColor COLOR_TABLE[] = {
    {"white", RGB(255, 255, 255)},
    {"black", RGB(0, 0, 0)},
    {"red", RGB(220, 50, 50)},
    {"green", RGB(46, 204, 113)},
    {"blue", RGB(52, 120, 246)},
    {"yellow", RGB(241, 196, 15)},
    {"orange", RGB(230, 126, 34)},
    {"purple", RGB(155, 89, 182)},
    {"pink", RGB(255, 105, 180)},
    {"gray", RGB(128, 128, 128)},
    {"grey", RGB(128, 128, 128)},
    {"cyan", RGB(26, 188, 156)},
};
static const int COLOR_TABLE_COUNT = sizeof(COLOR_TABLE) / sizeof(COLOR_TABLE[0]);

typedef enum { BORDER_SOFT, BORDER_SHARP, BORDER_NONE } BorderStyle;

/* Whatever the window background actually is (paint_elements fills the
 * client rect with this) — glass colors are pre-blended against it, since
 * plain GDI has no real per-pixel alpha compositing to fall back on. */
static const COLORREF BG_COLOR = RGB(18, 18, 20);

/* Accepts either a named color or a #hex code, same property either way
 * (SYNTAX_v0.1.md's "color and shape are real properties" section). */
static COLORREF parse_color(const char *value, COLORREF fallback) {
    if (value == NULL) return fallback;
    if (value[0] == '#') {
        unsigned int r, g, b;
        if (strlen(value) == 7 && sscanf(value + 1, "%02x%02x%02x", &r, &g, &b) == 3) {
            return RGB(r, g, b);
        }
        return fallback;
    }
    for (int i = 0; i < COLOR_TABLE_COUNT; i++) {
        if (_stricmp(value, COLOR_TABLE[i].name) == 0) return COLOR_TABLE[i].color;
    }
    return fallback;
}

/* A catalog design's `tint:` is a mood, not a literal color — cool/warm/
 * neutral — so it can mean something once there are many families, not
 * just "here's an RGB triple" (SYNTAX_v0.1.md's "using" section). */
static COLORREF tint_from_name(const char *name, COLORREF fallback) {
    if (name == NULL) return fallback;
    if (_stricmp(name, "cool") == 0) return RGB(150, 190, 230);
    if (_stricmp(name, "warm") == 0) return RGB(235, 195, 150);
    if (_stricmp(name, "neutral") == 0) return RGB(205, 205, 210);
    return fallback;
}

static COLORREF blend_color(COLORREF fg, COLORREF bg, double alpha) {
    int r = (int)(GetRValue(fg) * alpha + GetRValue(bg) * (1.0 - alpha));
    int g = (int)(GetGValue(fg) * alpha + GetGValue(bg) * (1.0 - alpha));
    int b = (int)(GetBValue(fg) * alpha + GetBValue(bg) * (1.0 - alpha));
    return RGB(r, g, b);
}

/* One of the small fixed v0.1 shape names — not yet a numeric corner
 * radius, see SYNTAX_v0.1.md. Unrecognized/missing falls back to a plain
 * rectangle ("default look"). Used both to clip the glass fill and to
 * stroke the shape's outline, so the region and the outline always agree. */
static HRGN shape_region(RECT r, const char *shape) {
    if (shape != NULL && _stricmp(shape, "circle") == 0) {
        return CreateEllipticRgn(r.left, r.top, r.right, r.bottom);
    } else if (shape != NULL && _stricmp(shape, "pill") == 0) {
        int radius = r.bottom - r.top;
        return CreateRoundRectRgn(r.left, r.top, r.right + 1, r.bottom + 1, radius, radius);
    } else if (shape != NULL && _stricmp(shape, "rounded") == 0) {
        return CreateRoundRectRgn(r.left, r.top, r.right + 1, r.bottom + 1, 16, 16);
    }
    return CreateRectRgn(r.left, r.top, r.right, r.bottom);
}

static void stroke_shape_outline(HDC hdc, RECT r, const char *shape) {
    if (shape != NULL && _stricmp(shape, "circle") == 0) {
        Ellipse(hdc, r.left, r.top, r.right, r.bottom);
    } else if (shape != NULL && _stricmp(shape, "pill") == 0) {
        int radius = r.bottom - r.top;
        RoundRect(hdc, r.left, r.top, r.right, r.bottom, radius, radius);
    } else if (shape != NULL && _stricmp(shape, "rounded") == 0) {
        RoundRect(hdc, r.left, r.top, r.right, r.bottom, 16, 16);
    } else {
        Rectangle(hdc, r.left, r.top, r.right, r.bottom);
    }
}

/* Frosted-glass fill: a soft top-to-bottom gradient, blended toward the
 * window background rather than truly transparent (plain GDI has no real
 * per-pixel alpha to composite against whatever's behind it), clipped to
 * the element's own shape so rounded/pill/circle corners stay glass, not
 * square. `pressed` reads as compression (denser fill, brighter rim);
 * `hovered` is a small brighten, only meaningful when the design that's
 * `using`-ing this element actually opted into it (see design/c.txt).
 * `alpha_mult` is how `surface: solid` gets denser than the translucent
 * default; `border`/`shadow` come straight from the resolved design. */
static void draw_glass_shape(HDC hdc, RECT r, COLORREF accent, const char *shape,
                              int pressed, int hovered, double alpha_mult,
                              BorderStyle border_style, int shadow) {
    COLORREF frost_white = RGB(235, 245, 255);
    COLORREF frost_tint = RGB(190, 215, 235);
    COLORREF tint = pressed ? blend_color(frost_tint, accent, 0.55) : accent;

    double top_alpha = (pressed ? 0.32 : 0.20) * alpha_mult;
    double bot_alpha = (pressed ? 0.22 : 0.12) * alpha_mult;
    if (hovered && !pressed) {
        top_alpha += 0.08;
        bot_alpha += 0.06;
    }
    if (top_alpha > 1.0) top_alpha = 1.0;
    if (bot_alpha > 1.0) bot_alpha = 1.0;

    if (shadow) {
        RECT sr = {r.left + 3, r.top + 5, r.right + 3, r.bottom + 5};
        HRGN srgn = shape_region(sr, shape);
        COLORREF scol = blend_color(RGB(0, 0, 0), BG_COLOR, 0.35);
        HBRUSH sbrush = CreateSolidBrush(scol);
        FillRgn(hdc, srgn, sbrush);
        DeleteObject(sbrush);
        DeleteObject(srgn);
    }

    COLORREF top_col = blend_color(blend_color(tint, frost_white, 0.5), BG_COLOR, top_alpha);
    COLORREF bot_col = blend_color(blend_color(tint, frost_white, 0.5), BG_COLOR, bot_alpha);

    HRGN region = shape_region(r, shape);
    SelectClipRgn(hdc, region);

    TRIVERTEX vert[2] = {0};
    vert[0].x = r.left;
    vert[0].y = r.top;
    vert[0].Red = (COLOR16)(GetRValue(top_col) << 8);
    vert[0].Green = (COLOR16)(GetGValue(top_col) << 8);
    vert[0].Blue = (COLOR16)(GetBValue(top_col) << 8);
    vert[1].x = r.right;
    vert[1].y = r.bottom;
    vert[1].Red = (COLOR16)(GetRValue(bot_col) << 8);
    vert[1].Green = (COLOR16)(GetGValue(bot_col) << 8);
    vert[1].Blue = (COLOR16)(GetBValue(bot_col) << 8);
    GRADIENT_RECT grect = {0, 1};
    GradientFill(hdc, vert, 2, &grect, 1, GRADIENT_FILL_RECT_V);

    /* A thin inset highlight near the top edge — the "soft inner sheen" a
     * real frosted-glass surface catches, doing more to sell "frost" than
     * a strong tint would. Brighter/lower while pressed, as if the
     * highlight sank into the surface under the compression. */
    int inset = (r.right - r.left) / 6;
    int hl_y = pressed ? r.top + 6 : r.top + 4;
    COLORREF hl_col = blend_color(frost_white, BG_COLOR, pressed ? 0.55 : 0.38);
    HPEN hl_pen = CreatePen(PS_SOLID, 1, hl_col);
    HPEN old_hl_pen = SelectObject(hdc, hl_pen);
    MoveToEx(hdc, r.left + inset, hl_y, NULL);
    LineTo(hdc, r.right - inset, hl_y);
    SelectObject(hdc, old_hl_pen);
    DeleteObject(hl_pen);

    SelectClipRgn(hdc, NULL);
    DeleteObject(region);

    if (border_style != BORDER_NONE) {
        int width = (border_style == BORDER_SHARP) ? 2 : 1;
        double border_alpha = (border_style == BORDER_SHARP) ? 0.8 : (pressed ? 0.55 : 0.35);
        COLORREF border_col = blend_color(frost_white, BG_COLOR, border_alpha);
        HPEN pen = CreatePen(PS_SOLID, width, border_col);
        HPEN old_pen = SelectObject(hdc, pen);
        HBRUSH old_brush = SelectObject(hdc, GetStockObject(NULL_BRUSH));
        stroke_shape_outline(hdc, r, shape);
        SelectObject(hdc, old_pen);
        SelectObject(hdc, old_brush);
        DeleteObject(pen);
    }
}

/* An explicit opt-in effect (`effect: snow` on an element), not something
 * every pressed button gets automatically — baking a literal snowflake
 * into the base material conflated "click feedback" with "what Frost is."
 * Drawn on top of a pressed button's glass fill: six radiating arms with
 * small branch ticks, plain GDI line drawing. */
static void draw_snowflake(HDC hdc, RECT r) {
    int cx = (r.left + r.right) / 2;
    int cy = (r.top + r.bottom) / 2;
    int arm = (r.bottom - r.top) / 2 - 6;
    if (arm < 8) arm = 8;

    HPEN pen = CreatePen(PS_SOLID, 2, RGB(235, 248, 255));
    HPEN old_pen = SelectObject(hdc, pen);

    for (int k = 0; k < 6; k++) {
        double angle = k * (3.14159265358979 / 3.0);
        double c = cos(angle), s = sin(angle);
        int ex = cx + (int)(arm * c);
        int ey = cy + (int)(arm * s);
        MoveToEx(hdc, cx, cy, NULL);
        LineTo(hdc, ex, ey);

        int bx = cx + (int)(arm * 0.55 * c);
        int by = cy + (int)(arm * 0.55 * s);
        double a1 = angle + 0.6, a2 = angle - 0.6;
        MoveToEx(hdc, bx, by, NULL);
        LineTo(hdc, bx + (int)(arm * 0.28 * cos(a1)), by + (int)(arm * 0.28 * sin(a1)));
        MoveToEx(hdc, bx, by, NULL);
        LineTo(hdc, bx + (int)(arm * 0.28 * cos(a2)), by + (int)(arm * 0.28 * sin(a2)));
    }

    SelectObject(hdc, old_pen);
    DeleteObject(pen);
}

static void draw_label(HDC hdc, RECT r, const char *text, COLORREF color, const char *size, UINT format) {
    int point_size = 18;
    if (size != NULL) {
        if (_stricmp(size, "large") == 0) point_size = 28;
        else if (_stricmp(size, "small") == 0) point_size = g_workspace ? 11 : 13;
        else if (_stricmp(size, "tiny") == 0) point_size = 10;
        else if (_stricmp(size, "brand") == 0) point_size = 14;
        else if (_stricmp(size, "display") == 0) point_size = 28;
        else if (_stricmp(size, "heading") == 0) point_size = 20;
        else if (_stricmp(size, "body") == 0) point_size = 14;
    }
    HFONT font = CreateFontA(-point_size, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                              DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                              CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, "Segoe UI");
    HFONT old_font = SelectObject(hdc, font);
    SetTextColor(hdc, color);
    SetBkMode(hdc, TRANSPARENT);
    DrawTextA(hdc, text, -1, &r, format | DT_NOPREFIX);
    SelectObject(hdc, old_font);
    DeleteObject(font);
}

/* Like draw_label, but colors each byte range in `spans` (1-based
 * inclusive, see backend.h's HighlightSpan/win32_set_highlight) with its
 * own color instead of one uniform color for the whole string -- backs
 * syntax highlighting for a textarea. Hand-rolled line/run layout instead
 * of a single DrawTextA call, since DrawTextA has no per-character color
 * API at all; reuses draw_caret's existing technique of measuring runs
 * with GetTextExtentPoint32A to find each one's on-screen x position.
 * Never word-wrapped, matching draw_label's own textarea usage (see
 * draw_caret's comment on why) -- a long line can overflow `r`
 * horizontally exactly like plain draw_label already does; vertical
 * overflow is clipped to `r` here (draw_label relies on DrawTextA's own
 * implicit clipping for that, which this hand-rolled path has to do
 * explicitly instead). */
#include "match_paint.h"

static void draw_label_highlighted(HDC hdc, RECT r, const char *text, COLORREF default_color,
                                    const char *size, const ResolvedSpan *spans, int span_count, const char *needle) {
    int point_size = g_workspace ? 13 : 18;
    if (size != NULL) {
        if (_stricmp(size, "large") == 0) point_size = 28;
        else if (_stricmp(size, "small") == 0) point_size = 13;
    }
    HFONT font = CreateFontA(-point_size, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                              DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                              CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, g_workspace ? "Consolas" : "Segoe UI");
    HFONT old_font = SelectObject(hdc, font);
    SetBkMode(hdc, TRANSPARENT);

    TEXTMETRICA tm;
    GetTextMetricsA(hdc, &tm);
    int line_height = tm.tmHeight + tm.tmExternalLeading;

    int saved_dc = SaveDC(hdc);
    IntersectClipRect(hdc, r.left, r.top, r.right, r.bottom);

    int len = (int)strlen(text);
    int line_y = r.top;
    int pos = 0; /* 0-based byte offset of the current line's first character */
    while (pos <= len) {
        const char *nl = strchr(text + pos, '\n');
        int line_end = nl != NULL ? (int)(nl - text) : len; /* 0-based, exclusive */
        int x = r.left;
        if(line_y+line_height>=r.top && line_y<r.bottom)
            paint_matches(hdc,text+pos,line_end-pos,needle,x,line_y,line_height);
        int col = pos;
        while (col < line_end) {
            /* Spans arrive in source order and never overlap (one
             * tokenize() pass) -- find the one covering `col`, if any,
             * and how far the CURRENT run (same color) extends before
             * either that span ends or the next one begins. */
            COLORREF run_color = default_color;
            int run_end = line_end; /* 0-based, exclusive */
            for (int s = 0; s < span_count; s++) {
                int sstart = spans[s].start - 1; /* 1-based inclusive -> 0-based inclusive */
                int send = spans[s].end - 1;
                if (col >= sstart && col <= send) {
                    run_color = spans[s].color;
                    if (send + 1 < run_end) run_end = send + 1;
                    break;
                }
                if (sstart > col && sstart < run_end) run_end = sstart;
            }
            int run_len = run_end - col;
            if (run_len <= 0) run_len = 1; /* defensive -- keeps this loop from ever spinning in place */
            SetTextColor(hdc, run_color);
            TextOutA(hdc, x, line_y, text + col, run_len);
            SIZE extent;
            GetTextExtentPoint32A(hdc, text + col, run_len, &extent);
            x += extent.cx;
            col += run_len;
        }
        if (nl == NULL) break;
        pos = line_end + 1;
        line_y += line_height;
    }

    RestoreDC(hdc, saved_dc);
    SelectObject(hdc, old_font);
    DeleteObject(font);
}

/* Only shown when `using name` doesn't resolve to anything in the catalog
 * — say so rather than silently falling back, same "shown loudly"
 * convention as the unknown-element-type case below. Once a design is
 * actually found (see design/element/), this doesn't fire at all. */
static void draw_using_note(HDC hdc, RECT r, const char *design_name) {
    char note[128];
    snprintf(note, sizeof(note), "using %s (not in the catalog yet)", design_name);
    RECT note_r = {r.left, r.top - 18, r.right, r.top};
    draw_label(hdc, note_r, note, RGB(170, 140, 230), "small", DT_LEFT | DT_SINGLELINE | DT_VCENTER);
}

/* Fills the selected range's background, drawn BEFORE the text itself
 * (both call sites below draw this, then the label, then the caret) so
 * glyphs render on top of it rather than being covered -- text drawing
 * already runs with SetBkMode(TRANSPARENT), so painting order is what
 * makes that layering work, not any special blending here. Walks one
 * line at a time (same per-prefix GetTextExtentPoint32A measuring as
 * draw_caret/caret_pos_from_point) since a selection spanning multiple
 * lines needs one rect per line, not one rect for the whole range. */
static void draw_selection(HDC hdc, RECT text_r, const TextBuffer *tb) {
    if (!textbuffer_has_selection(tb)) return;
    int start = textbuffer_selection_start(tb), end = textbuffer_selection_end(tb);

    HFONT font = CreateFontA(g_workspace ? -13 : -18, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                              DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                              CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, g_workspace ? "Consolas" : "Segoe UI");
    HFONT old_font = SelectObject(hdc, font);
    TEXTMETRICA tm; GetTextMetricsA(hdc, &tm);
    int line_height = tm.tmHeight + tm.tmExternalLeading;
    HBRUSH brush = CreateSolidBrush(RGB(45, 90, 140));

    int pos = start;
    while (pos <= end) {
        int line_start = pos;
        while (line_start > 0 && tb->text[line_start - 1] != '\n') line_start--;
        int line_index = 0;
        for (int i = 0; i < line_start; i++) if (tb->text[i] == '\n') line_index++;
        int line_end = line_start;
        while (tb->text[line_end] != '\0' && tb->text[line_end] != '\n') line_end++;
        int seg_start = pos;
        int seg_end = end < line_end ? end : line_end;

        char pre_stack[256];
        int pre_len = seg_start - line_start;
        char *pre = pre_len < (int)sizeof(pre_stack) ? pre_stack : malloc((size_t)pre_len + 1);
        memcpy(pre, tb->text + line_start, (size_t)pre_len); pre[pre_len] = '\0';
        SIZE pre_extent; GetTextExtentPoint32A(hdc, pre, pre_len, &pre_extent);
        if (pre != pre_stack) free(pre);

        char seg_stack[256];
        int seg_len = seg_end - seg_start;
        char *seg = seg_len < (int)sizeof(seg_stack) ? seg_stack : malloc((size_t)seg_len + 1);
        memcpy(seg, tb->text + seg_start, (size_t)seg_len); seg[seg_len] = '\0';
        SIZE seg_extent; GetTextExtentPoint32A(hdc, seg, seg_len, &seg_extent);
        if (seg != seg_stack) free(seg);

        int x = text_r.left + pre_extent.cx;
        int y = text_r.top + line_index * line_height;
        int width = seg_extent.cx > 0 ? seg_extent.cx : (pos < end ? 4 : 0); /* a bare 4px sliver marks a selected blank line */
        if (width > 0) {
            RECT sel_rect = {x, y, x + width, y + line_height};
            FillRect(hdc, &sel_rect, brush);
        }
        pos = line_end + 1;
        if (line_end >= tb->length) break;
    }

    DeleteObject(brush);
    SelectObject(hdc, old_font);
    DeleteObject(font);
}

/* Hand-drawn, not the native CreateCaret/ShowCaret API -- fits this file's
 * existing "recompute everything from scratch every repaint" model (see
 * paint_elements' own comment) better than a stateful native caret would.
 * Measures with the exact same font draw_label uses for textarea bodies, so
 * the caret always lands on the real character boundary rather than an
 * approximation. Line/column math is exact because the textarea body is
 * deliberately never word-wrapped (see paint_elements) -- wrapped lines
 * would need pixel-width knowledge this buffer doesn't have. */
static void draw_caret(HDC hdc, RECT text_r, const TextBuffer *tb) {
    if (!g_caret_visible) return;

    HFONT font = CreateFontA(g_workspace ? -13 : -18, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                              DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                              CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, g_workspace ? "Consolas" : "Segoe UI");
    HFONT old_font = SelectObject(hdc, font);

    int line_start = tb->caret;
    while (line_start > 0 && tb->text[line_start - 1] != '\n') line_start--;
    int line_index = 0;
    for (int i = 0; i < line_start; i++) {
        if (tb->text[i] == '\n') line_index++;
    }

    int col_len = tb->caret - line_start;
    char stack_buf[256];
    char *col_buf = col_len < (int)sizeof(stack_buf) ? stack_buf : malloc((size_t)col_len + 1);
    memcpy(col_buf, tb->text + line_start, (size_t)col_len);
    col_buf[col_len] = '\0';

    SIZE extent;
    GetTextExtentPoint32A(hdc, col_buf, col_len, &extent);
    if (col_buf != stack_buf) free(col_buf);

    TEXTMETRICA tm;
    GetTextMetricsA(hdc, &tm);
    int line_height = tm.tmHeight + tm.tmExternalLeading;

    int cx = text_r.left + extent.cx;
    int cy = text_r.top + line_index * line_height;

    HPEN pen = CreatePen(PS_SOLID, 1, RGB(240, 240, 245));
    HPEN old_pen = SelectObject(hdc, pen);
    MoveToEx(hdc, cx, cy, NULL);
    LineTo(hdc, cx, cy + line_height);
    SelectObject(hdc, old_pen);
    DeleteObject(pen);

    SelectObject(hdc, old_font);
    DeleteObject(font);
}

/* Inverse of draw_caret's own line/column math: given a click point and
 * the exact rect the text was actually drawn into (code_r for workspace
 * mode, text_r otherwise -- same rect layout_element passes draw_caret),
 * finds the character offset in `text` closest to that click. Needs a
 * real HDC to measure column widths against, which WM_LBUTTONDOWN
 * doesn't have on hand -- callers bracket this with GetDC/ReleaseDC.
 * Same per-prefix GetTextExtentPoint32A measuring technique draw_caret
 * already uses, just run in reverse: walk every candidate cut point on
 * the target line and keep whichever's on-screen x is closest to the
 * click, rather than looking up one specific caret's x from its index. */
/* The exact area_r a click/drag needs to feed caret_pos_from_point --
 * factored out of WM_LBUTTONDOWN's own inline computation so
 * WM_MOUSEMOVE's drag-to-select handling can compute the identical rect
 * for the SAME element without copy-pasting it a second time and
 * risking the two silently drifting apart later. Returns an empty rect
 * (all zero) for a prose element, whose word-wrapped layout this
 * doesn't apply to at all -- callers already special-case prose before
 * ever reaching here (see WM_LBUTTONDOWN), so this is just documenting
 * that this function isn't meant to be called for one. */
static RECT text_area_rect_for(int index) {
    RECT rr = g_rects[index];
    RECT text_r = {rr.left + 10, rr.top + 8, rr.right - 10, rr.bottom - 8};
    Element *fel = element_by_runtime(g_elements.items, g_elements.count, index);
    if (fel != NULL && element_attr(fel, "minimap") != NULL) text_r.right -= 48;
    RECT area_r = text_r;
    if (g_workspace) {
        area_r.left = rr.left + 52;
        area_r.top = text_r.top - g_scroll_offset[index];
    }
    return area_r;
}

static int caret_pos_from_point(HDC hdc, RECT area_r, const char *text, POINT click) {
    HFONT font = CreateFontA(g_workspace ? -13 : -18, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                              DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                              CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, g_workspace ? "Consolas" : "Segoe UI");
    HFONT old_font = SelectObject(hdc, font);
    TEXTMETRICA tm;
    GetTextMetricsA(hdc, &tm);
    int line_height = tm.tmHeight + tm.tmExternalLeading;
    if (line_height <= 0) line_height = 1;

    int target_line = (click.y - area_r.top) / line_height;
    if (target_line < 0) target_line = 0;

    int len = (int)strlen(text);
    int line_start = 0, line_end = len, line_index = 0, found = 0;
    for (int i = 0; i <= len; i++) {
        if (i == len || text[i] == '\n') {
            if (line_index == target_line) { line_end = i; found = 1; break; }
            if (i == len) break;
            line_start = i + 1;
            line_index++;
        }
    }
    if (!found) { line_start = len; line_end = len; } /* click past the last line -- snap to end */

    int best_pos = line_start;
    int best_dist = abs(click.x - area_r.left);
    for (int i = line_start; i <= line_end; i++) {
        int col_len = i - line_start;
        char stack_buf[256];
        char *col_buf = col_len < (int)sizeof(stack_buf) ? stack_buf : malloc((size_t)col_len + 1);
        memcpy(col_buf, text + line_start, (size_t)col_len);
        col_buf[col_len] = '\0';
        SIZE extent;
        GetTextExtentPoint32A(hdc, col_buf, col_len, &extent);
        if (col_buf != stack_buf) free(col_buf);
        int dist = abs(click.x - (area_r.left + extent.cx));
        if (dist < best_dist) { best_dist = dist; best_pos = i; }
    }

    SelectObject(hdc, old_font);
    DeleteObject(font);
    return best_pos;
}

/* Resolves what a shaped element (button/input/image) should actually
 * look like: either the design `using name` points at (if the catalog has
 * it), or the element's own hand-set properties. SYNTAX_v0.1.md's "using"
 * section: these are the two real ways to style something, not stackable
 * — `using`, when it resolves, replaces hand-set background/etc outright. */
typedef struct {
    COLORREF accent;
    double alpha_mult;
    BorderStyle border_style;
    int shadow;
    int hover_enabled;
} ResolvedStyle;

static ResolvedStyle resolve_style(const Element *el, const Design *design, COLORREF default_accent) {
    ResolvedStyle s;
    s.alpha_mult = 1.0;
    s.border_style = BORDER_SOFT;
    s.shadow = 0;
    s.hover_enabled = 0;

    if (design != NULL) {
        s.accent = tint_from_name(design_prop(design, "tint"), default_accent);
        const char *surface = design_prop(design, "surface");
        if (surface != NULL && _stricmp(surface, "solid") == 0) s.alpha_mult = 2.6;
        const char *border_prop = design_prop(design, "border");
        if (border_prop != NULL && _stricmp(border_prop, "sharp") == 0) s.border_style = BORDER_SHARP;
        else if (border_prop != NULL && _stricmp(border_prop, "none") == 0) s.border_style = BORDER_NONE;
        const char *shadow_prop = design_prop(design, "shadow");
        if (shadow_prop != NULL && _stricmp(shadow_prop, "soft") == 0) s.shadow = 1;
        const char *hover_prop = design_prop(design, "hover");
        s.hover_enabled = (hover_prop != NULL && _stricmp(hover_prop, "brighten") == 0);
    } else {
        s.accent = parse_color(element_attr(el, "background"), default_accent);
    }
    return s;
}

/* Lays out and draws ONE element -- at any tree depth -- within the
 * horizontal band [x, x+width), starting at vertical position `y`. Uses
 * the element's own stable runtime_id (assigned once at creation, see
 * element.h) to index every per-element runtime array -- NOT a position
 * counted off during this walk, since that would silently go stale the
 * instant an element gets added to the tree between one repaint and the
 * next. Leaf types (text/button/input/textarea/image/unknown) draw
 * exactly as this project's v0.1 layout always did and report back the
 * vertical space they consumed (their own height plus the usual 16px
 * gap). "row"/"column" don't draw anything themselves -- B2's whole
 * point -- they just subdivide their own (x, width, y) band among their
 * children (side by side for row, stacked for column) and report back
 * whatever total space those children ended up consuming, so a
 * container nests exactly like a leaf element from ITS OWN parent's
 * point of view; nesting a row inside a column (or vice versa) falls
 * out of this for free, with no extra cases needed. Every element still
 * gets a recorded rect in g_rects, container or leaf, so hit-testing
 * keeps working uniformly no matter how deep it sits. */
/* Workspace geometry stays declarative in .cr files. Legacy documents
 * retain their existing spacing. vh is a percentage of client height. */
static int dimension(const Element *el, const char *key, int fallback) {
    if (!strcmp(key,"width") && g_rail_collapsed && (element_attr(el,"rail") || element_attr(el,"railwidth"))) return 44;
    const char *value = element_attr(el, key);
    if (!value) return fallback;
    char *end;
    long n = strtol(value, &end, 10);
    if (end == value || n < 0 || n > 10000) return fallback;
    if (strncmp(end, "vh", 2) == 0 || strncmp(end, "vw", 2) == 0 || strncmp(end, "ph", 2) == 0) {
        n = n * (end[0] == 'p' ? g_parent_height : end[1] == 'w' ? g_view_width : g_view_height) / 100;
        end += 2;
        if (*end == '+' || *end == '-') {
            char *offset_end;
            long offset = strtol(end, &offset_end, 10);
            if (offset_end == end || *offset_end) return fallback;
            if (offset > 10000 || offset < -10000) return fallback;
            n += offset;
        } else if (*end) return fallback;
    } else if (*end) return fallback;
    if (n < 0) n = 0;
    return n > 10000 ? 10000 : (int)n;
}
static int element_padding(const Element *el, int width) {
    int n = dimension(el, "padding", 0);
    return n > width / 4 ? width / 4 : n;
}
static int element_weight(const Element *el) {
    int n = dimension(el, "weight", 1);
    return n > 0 ? n : 1;
}
static int g_tab_reveal=-1;
static int is_tab_row(const Element *el) {
    const char *flow=element_attr(el,"flow");return flow&&!strcmp(flow,"tabs");
}
static int row_child_width(const Element *el, int child, int width) {
    if (!panel_visible(&el->children[child])) return 0;
    const char *flow = element_attr(el, "flow");
    if (flow && strcmp(flow, "tabs") == 0) {
        const Element *item = &el->children[child];
        const char *label = g_text_override[item->runtime_id] ? g_text_override[item->runtime_id] : item->content;
        if(label&&!strcmp(label,"[x]"))return 26;
        const char *name=label?strrchr(label,'/'):NULL;
        int n=(int)strlen(name?name+1:label?label:"");
        int desired=n*7+28;
        return desired<96?96:desired>170?170:desired;
    }
    int spacing = dimension(el, "spacing", 0);
    int visible_count=0;
    for(int i=0;i<el->child_count;i++)if(panel_visible(&el->children[i]))visible_count++;
    int fixed = spacing * (visible_count > 0 ? visible_count - 1 : 0), weights = 0;
    for (int i=0;i<el->child_count;i++) {
        if(!panel_visible(&el->children[i]))continue;
        int requested = dimension(&el->children[i], "width", 0);
        if (requested) fixed += requested;
        else weights += element_weight(&el->children[i]);
    }
    int available = width - fixed;
    if (available < 0) available = 0;
    int requested = dimension(&el->children[child], "width", 0);
    return requested ? requested : weights ? available * element_weight(&el->children[child]) / weights : 0;
}
static int leaf_height(const Element *el) {
    const char *size = element_attr(el, "size");
    if (strcmp(el->type, "input") == 0) return dimension(el,"height",34);
    if (strcmp(el->type, "device") == 0) return dimension(el, "height", 420);
    if (strcmp(el->type, "scene3d") == 0) return dimension(el, "height", 400);
    if (strcmp(el->type, "meter") == 0) return dimension(el, "height", 4);
    if (strcmp(el->type, "logo") == 0) return dimension(el, "height", 28);
    if (strcmp(el->type, "spacer") == 0) return dimension(el, "height", 6);
    if (strcmp(el->type, "textarea") == 0) {
        int h = dimension(el, "height", 160); return h < 40 ? 40 : h;
    }
    if (strcmp(el->type, "button") == 0) return dimension(el, "height", g_workspace ? 32 : 48);
    if (strcmp(el->type, "text") == 0)
        return dimension(el, "height", size && strcmp(size, "large") == 0 ? 48 : size && strcmp(size, "small") == 0 ? 22 : g_workspace ? 24 : 32);
    return strcmp(el->type, "image") == 0 ? 120 : strcmp(el->type, "input") == 0 ? 44 : 30;
}
static int measure_element(const Element *el, int width) {
    if (!panel_visible(el)) return 0;
    if ((!strcmp(el->type,"row") || !strcmp(el->type,"column")) && element_attr(el,"height")) {
        int pad=element_padding(el,width),height=dimension(el,"height",0);
        if(!strcmp(el->type,"column") && element_attr(el,"shrink")) {
            int content=0;
            for(int i=0;i<el->child_count;i++)content+=measure_element(&el->children[i],width-2*pad);
            if(content<height)height=content;
        }
        return height+2*pad;
    }
    int pad = element_padding(el, width), h = 0;
    width -= pad * 2;
    if (strcmp(el->type, "column") == 0) {
        if (element_attr(el, "height")) h = dimension(el, "height", 0);
        else for (int i = 0; i < el->child_count; i++) h += measure_element(&el->children[i], width);
    } else if (strcmp(el->type, "row") == 0) {
        for (int i = 0; i < el->child_count; i++) {
            int ch = measure_element(&el->children[i], row_child_width(el, i, width));
            if (ch > h) h = ch;
        }
    } else if (strcmp(el->type, "spacer") == 0) h = leaf_height(el);
    else h = leaf_height(el) + dimension(el, "gap", g_workspace ? 6 : 16);
    return h + pad * 2;
}
static void fill_panel(HDC hdc, RECT r, COLORREF color, const char *border) {
    HBRUSH brush = CreateSolidBrush(color);
    if (border) {
        HPEN pen = CreatePen(PS_SOLID, 1, parse_color(border, RGB(27, 46, 69)));
        HPEN previous_pen = SelectObject(hdc, pen);
        HBRUSH previous_brush = SelectObject(hdc, brush);
        RoundRect(hdc, r.left, r.top, r.right, r.bottom, 6, 6);
        SelectObject(hdc, previous_brush); SelectObject(hdc, previous_pen);
        DeleteObject(pen);
    } else FillRect(hdc, &r, brush);
    DeleteObject(brush);
}

#include "workspace_art.h"
#include "panel_split.h"

static int layout_element_inner(HDC hdc, Element *el, int x, int width, int y);
static int layout_element(HDC hdc, Element *el, int x, int width, int y) {
    if (!panel_visible(el)) return 0;
    int saved_height=g_parent_height;
    int result=layout_element_inner(hdc,el,x,width,y);
    g_parent_height=saved_height;
    return result;
}
/* Real, live, clickable rendering for a device element an app has been
 * uiEmbedApp'd into (device_el->child_count > 0) -- a plain, REAL-
 * pixel-coordinate frame (no XFORM phone silhouette the way
 * draw_device_concept uses, which would make its logical coordinates
 * disagree with WM_LBUTTONDOWN's real, untransformed client-pixel
 * ones), then a genuine nested layout pass over the embedded app's own
 * top-level elements confined to the content sub-rect below that
 * chrome. Reuses layout_element itself (this function IS
 * layout_element_inner, called recursively here exactly like the
 * "row"/"column" branches already do for their own children) so the
 * embedded elements get REAL g_rects entries written in real screen
 * space -- which is what makes clicking them work at all: button_at/
 * focusable_at/rightclickable_at already recurse into every element's
 * `.children` unconditionally (see clickable_at_rec), so once the
 * embedded tree is spliced in as literal children (see win32_load's
 * embed branch) and laid out for real here, hit-testing needs no
 * changes of its own to find them. */
static void paint_embedded_app(HDC hdc, RECT outer, Element *device_el, const char *frame) {
    fill_panel(hdc, outer, RGB(10, 14, 22), "#26314a");
    RECT content = outer;
    RECT chrome;
    if (strcmp(frame, "web") == 0) {
        /* Same look as the static draw_browser_concept fallback (tab
         * dots + a real address bar) -- this is the LIVE version, so
         * the address bar shows the app's actual running URL
         * (g_web_display_url, set once uiStartWebServer really starts
         * listening) instead of a placeholder "localhost". */
        chrome = (RECT){outer.left, outer.top, outer.right, outer.top + 34};
        fill_panel(hdc, chrome, RGB(28, 33, 44), NULL);
        HBRUSH dot = CreateSolidBrush(RGB(90, 96, 112));
        for (int i = 0; i < 3; i++) { RECT d = {outer.left+12+i*16, outer.top+13, outer.left+20+i*16, outer.top+21}; FillRect(hdc, &d, dot); }
        DeleteObject(dot);
        RECT addr = {outer.left + 64, outer.top + 6, outer.right - 12, outer.top + 28};
        fill_panel(hdc, addr, RGB(12, 16, 24), "#1c2330");
        RECT addr_label = {addr.left + 10, addr.top, addr.right - 10, addr.bottom};
        draw_label(hdc, addr_label, g_web_display_url[0] ? g_web_display_url : "localhost", RGB(150, 162, 184), "tiny", DT_LEFT | DT_SINGLELINE | DT_VCENTER);
        content.top = chrome.bottom + 4;
    } else if (strcmp(frame, "desktop") == 0) {
        chrome = (RECT){outer.left, outer.top, outer.right, outer.top + 26};
        fill_panel(hdc, chrome, RGB(24, 29, 40), NULL);
        content.top = chrome.bottom + 2;
    } else {
        chrome = (RECT){outer.left, outer.top, outer.right, outer.top + 20};
        fill_panel(hdc, chrome, RGB(6, 10, 18), NULL);
        content.top = chrome.bottom + 2;
    }
    content.left += 4; content.right -= 4; content.bottom -= 4;
    if (content.right <= content.left || content.bottom <= content.top) return;

    int saved = SaveDC(hdc);
    IntersectClipRect(hdc, content.left, content.top, content.right, content.bottom);
    int cw = content.right - content.left;
    int cy = content.top;
    for (int i = 0; i < device_el->child_count; i++) {
        cy += layout_element(hdc, &device_el->children[i], content.left, cw, cy);
    }
    RestoreDC(hdc, saved);
}

/* A "scene3d" element's whole paint: lazy-init the embedded 3D context
 * the first time one is painted (sized to ITS rect, not resized again
 * after -- a known limitation, see scene3d.h's own note on
 * init_embedded), tick it forward by real elapsed time, and blit its
 * last frame straight into this HDC with SetDIBitsToDevice -- ordinary
 * GDI content drawn before/after this call (the title bar, a HUD text
 * line under it, anything) composites with it normally in the same
 * paint pass, which a child HWND could not do (see gl_embed_test.c's
 * own comment on why render-to-texture was chosen over that). Starts
 * the dedicated repaint timer (id 2, otherwise unused) on first call so
 * this keeps animating even with no clicks -- a 3D view that only
 * repaints when something else invalidates the window would look
 * frozen the rest of the time. */
static int g_scene3d_ready = 0;
static DWORD g_scene3d_last_tick = 0;

/* Scans a freshly parsed element tree for a "scene3d" element and, if
 * found, creates the embedded GL context EAGERLY -- right here, during
 * uiLoad(), not lazily on first paint. Without this, a Coral script that
 * calls scene3dLoadMesh/scene3dSpawn right after uiLoad() (the natural
 * way to write one, building the scene before uiRun() blocks) would be
 * calling into GL function pointers that are still NULL, since paint
 * (and the lazy init it used to do) doesn't happen until uiRun()'s
 * message loop starts pumping WM_PAINT. The exact pixel width isn't
 * known yet at this point (layout hasn't run) -- this uses the
 * element's declared height attribute and a fixed default width, a
 * known imprecision noted in scene3d.h's own init_embedded comment. */
static int g_scene3d_present = 0; /* declared ahead of paint_scene3d/layout so both this scan and the lazy-init guard agree on "already started" */
static void scan_for_scene3d(Element *items, int count) {
    for (int i = 0; i < count; i++) {
        if (strcmp(items[i].type, "scene3d") == 0 && !g_scene3d_present) {
            g_scene3d_present = 1;
            int h = dimension(&items[i], "height", 400);
            scene3d_backend()->init_embedded(640, h);
        }
        if (items[i].child_count > 0) scan_for_scene3d(items[i].children, items[i].child_count);
    }
}

static void paint_scene3d(HDC hdc, RECT r) {
    // init_embedded already ran eagerly in scan_for_scene3d (during uiLoad, before
    // this first paint) -- just start the continuous-repaint timer once, here.
    if (!g_scene3d_ready) {
        g_scene3d_ready = 1;
        g_scene3d_last_tick = GetTickCount();
        if (g_hwnd) SetTimer(g_hwnd, 2, 16, NULL);
    }
    DWORD now = GetTickCount();
    float dt = (now - g_scene3d_last_tick) / 1000.0f;
    if (dt > 0.2f) dt = 0.2f; // clamp a long stall (window drag, breakpoint, ...) instead of a huge animation jump
    g_scene3d_last_tick = now;
    int viewW=r.right-r.left,viewH=r.bottom-r.top;if(viewW<1||viewH<1)return;
    scene3d_backend()->resize_embedded(viewW,viewH);
    scene3d_backend()->set_embedded_host(g_hwnd,r.left,r.top,viewW,viewH);
    scene3d_backend()->tick_embedded(dt);

    int bw = scene3d_backend()->get_embedded_width(), bh = scene3d_backend()->get_embedded_height();
    BITMAPINFO bmi = {0};
    bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bmi.bmiHeader.biWidth = bw;
    bmi.bmiHeader.biHeight = -bh; // negative = top-down source, matching get_pixels_bgra()'s own row order
    bmi.bmiHeader.biPlanes = 1;
    bmi.bmiHeader.biBitCount = 32;
    bmi.bmiHeader.biCompression = BI_RGB;
    StretchDIBits(hdc,r.left,r.top,viewW,viewH,0,0,bw,bh,scene3d_backend()->get_pixels_bgra(),&bmi,DIB_RGB_COLORS,SRCCOPY);
}

static int layout_element_inner(HDC hdc, Element *el, int x, int width, int y) {
    int allocated_height=dimension(el,"height",g_parent_height);
    if(element_attr(el,"shrink"))allocated_height=measure_element(el,width)-2*element_padding(el,width);
    int my_index = el->runtime_id;
    const char *shape = element_attr(el, "shape");
    const char *size = element_attr(el, "size");
    const char *using_name = (g_design_override[my_index] != NULL)
                                  ? g_design_override[my_index]
                                  : element_attr(el, "using");
    const Design *design = (using_name != NULL) ? catalog_find(&g_catalog, using_name) : NULL;
    int note_gap = (using_name != NULL && design == NULL) ? 20 : 0; /* room for the "not in catalog" note */
    y += note_gap;

    int padding = element_padding(el, width);
    int gap = dimension(el, "gap", g_workspace ? 6 : 16);
    if ((strcmp(el->type, "row") == 0 || strcmp(el->type, "column") == 0) && element_attr(el, "background")) {
        RECT panel = {x, y, x + width, y + measure_element(el, width)};
        fill_panel(hdc, panel, parse_color(element_attr(el, "background"), BG_COLOR), element_attr(el, "border"));
    }
    x += padding; y += padding; width -= padding * 2;
    RECT r = {0, 0, 0, 0};
    int content_height = 0;

    if (strcmp(el->type, "row") == 0 || strcmp(el->type, "column") == 0) {
        if (element_attr(el,"height")) g_parent_height=allocated_height;
        if (element_attr(el,"split")) {
            content_height=layout_split(hdc,el,x,y,width,allocated_height);
        } else if (el->child_count == 0) {
            content_height = element_attr(el,"height") ? allocated_height : 0;
        } else if (strcmp(el->type, "row") == 0) {
            int max_h = 0;
            int cx = x, tab_saved=0;
            if(is_tab_row(el)) {
                int total=0,reveal_left=-1,reveal_right=0;
                for(int i=0;i<el->child_count;i++) {
                    int w=row_child_width(el,i,width);
                    if(el->children[i].runtime_id==g_tab_reveal) {
                        reveal_left=total;reveal_right=total+w;
                        if(i+1<el->child_count)reveal_right+=row_child_width(el,i+1,width);
                    }
                    total+=w;
                }
                int *offset=&g_scroll_offset[my_index],limit=total>width?total-width:0;
                if(reveal_left>=0) {
                    if(reveal_left<*offset)*offset=reveal_left;
                    if(reveal_right>*offset+width)*offset=reveal_right-width;
                    g_tab_reveal=-1;
                }
                if(*offset>limit)*offset=limit;
                if(*offset<0)*offset=0;
                cx-=*offset;
                tab_saved=SaveDC(hdc);IntersectClipRect(hdc,x,y,x+width,y+allocated_height);
            }
            for (int i = 0; i < el->child_count; i++) {
                if(!panel_visible(&el->children[i]))continue;
                int slot_width = row_child_width(el, i, width);
                int h = layout_element(hdc, &el->children[i], cx, slot_width, y);
                if (h > max_h) max_h = h;
                cx += slot_width + dimension(el, "spacing", 0);
            }
            if(tab_saved)RestoreDC(hdc,tab_saved);
            content_height = element_attr(el,"height") ? allocated_height : max_h;
        } else { /* column */
            const char *height_attr = element_attr(el, "height");
            if (height_attr == NULL) {
                /* No `height:` -- auto-sizes to its content exactly like
                 * before B2's containers had any notion of scrolling at
                 * all: no clipping, no limit, every child always fully
                 * visible. */
                int cy = y;
                for (int i = 0; i < el->child_count; i++) {
                    cy += layout_element(hdc, &el->children[i], x, width, cy);
                }
                content_height = cy - y;
            } else {
                /* `height: N` -- a FIXED viewport instead of auto-sizing:
                 * children are drawn shifted up by the current scroll
                 * offset and clipped to this element's own (x, width, N)
                 * band, so content past the bottom is invisible rather
                 * than pushing this column (and everything after it in
                 * ITS OWN parent) taller. The true total content height
                 * is only known AFTER laying out every child, same "no
                 * separate measure pass" approach as everything else
                 * here (see this function's own top comment) -- the
                 * scroll offset is clamped using that total for the
                 * NEXT repaint, not this one; if content shrinks, the
                 * clamp catches up one frame late, which is invisible
                 * in practice for a mouse-wheel-driven scroll. */
                int viewport_h = allocated_height;
                int *scroll = &g_scroll_offset[my_index];

                /* SaveDC/RestoreDC, not a manual SelectClipRgn(hdc, NULL),
                 * is the correct GDI idiom for "temporarily narrow the
                 * clip, then put back EXACTLY what was there before" --
                 * IntersectClipRect narrows whatever clip already existed
                 * rather than replacing it outright, and GdiFlush forces
                 * everything drawn under the narrowed clip to actually be
                 * rasterized before that clip goes away. Good practice
                 * regardless, but NOTE this alone does not fully explain
                 * a real rendering bug hit while building this: a child
                 * element that already existed in the ORIGINAL .cr parse
                 * (before this column's `children` array was ever grown)
                 * could silently fail to render at all once a LATER
                 * uiAddText call reallocated that same array. The actual
                 * fix was structural, not this clip code -- see
                 * examples/sidebar/sidebar.cr: a scrollable `height:`
                 * column should start with ZERO statically-declared
                 * children and be populated entirely via uiAddText,
                 * keeping any hand-written labels as siblings one level
                 * up instead of inside it. */
                int saved_dc = SaveDC(hdc);
                IntersectClipRect(hdc, x, y, x + width, y + viewport_h);

                int cy = y - *scroll;
                for (int i = 0; i < el->child_count; i++) {
                    if(element_attr(&el->children[i],"anchor")) {
                        layout_element(hdc,&el->children[i],x,width,y+viewport_h-measure_element(&el->children[i],width));
                    } else cy += layout_element(hdc, &el->children[i], x, width, cy);
                }
                int total_content_h = (cy + *scroll) - y;

                GdiFlush();
                RestoreDC(hdc, saved_dc);

                int max_scroll = total_content_h - viewport_h;
                if (max_scroll < 0) max_scroll = 0;
                if (*scroll > max_scroll) *scroll = max_scroll;
                if (*scroll < 0) *scroll = 0;

                content_height = viewport_h;
            }
        }
        r = (RECT){x, y, x + width, y + content_height};
    } else if (strcmp(el->type, "logo") == 0) {
        int h = leaf_height(el);
        r = (RECT){x, y, x + width, y + h};
        draw_cryptic_mark(hdc, r);
        content_height = h + gap;
    } else if (strcmp(el->type, "device") == 0) {
        int h = leaf_height(el);
        r = (RECT){x, y, x + width, y + h};
        const char *frame = g_frame_override[my_index] != NULL ? g_frame_override[my_index] : "phone";
        if (el->child_count > 0) paint_embedded_app(hdc, r, el, frame);
        else if (strcmp(frame, "web") == 0) draw_browser_concept(hdc, r, element_attr(el, "apppreview"));
        else if (strcmp(frame, "desktop") == 0) draw_desktop_concept(hdc, r, element_attr(el, "apppreview"));
        else draw_device_concept(hdc, r, element_attr(el, "wallpaper"), element_attr(el, "apppreview"));
        content_height = h + gap;
    } else if (strcmp(el->type, "scene3d") == 0) {
        int h = leaf_height(el);
        r = (RECT){x, y, x + width, y + h};
        paint_scene3d(hdc, r);
        content_height = h + gap;
    } else if (strcmp(el->type, "meter") == 0) {
        int h=leaf_height(el),value=dimension(el,"value",55);if(value>100)value=100;
        r=(RECT){x,y,x+width,y+h};fill_panel(hdc,r,parse_color(element_attr(el,"background"),RGB(37,57,49)),NULL);
        RECT fill={x,y,x+width*value/100,y+h};fill_panel(hdc,fill,parse_color(element_attr(el,"color"),RGB(183,207,171)),NULL);content_height=h+gap;
    } else if (strcmp(el->type, "spacer") == 0) {
        int h = leaf_height(el);
        r = (RECT){x, y, x + width, y + h};
        content_height = h;
    } else if (strcmp(el->type, "text") == 0) {
        int h = leaf_height(el);
        if (g_workspace && !size) size = "small";
        r = (RECT){x, y, x + width, y + h};
        const char *color_source = (g_color_override[my_index] != NULL && g_color_override[my_index][0] != '\0')
                                        ? g_color_override[my_index]
                                        : element_attr(el, "color");
        COLORREF color = parse_color(color_source, RGB(230, 230, 230));
        const char *text_content = (g_text_override[my_index] != NULL) ? g_text_override[my_index] : el->content;
        const char *align = element_attr(el, "align");
        UINT flags = align ? (strcmp(align, "left") == 0 ? DT_LEFT : strcmp(align, "right") == 0 ? DT_RIGHT : DT_CENTER) : (g_workspace ? DT_LEFT : DT_CENTER);
        const char *background = element_attr(el, "background");
        if (background) fill_panel(hdc, r, parse_color(background, BG_COLOR), element_attr(el, "border"));
        int active = g_workspace && g_color_override[my_index] && _stricmp(g_color_override[my_index], "#55beff") == 0;
        if (active) {
            fill_panel(hdc, r, RGB(17, 39, 64), NULL);
            RECT accent = {r.left, r.bottom-2, r.right, r.bottom};
            fill_panel(hdc, accent, RGB(63, 144, 255), NULL);
        }
        if (g_hovered == my_index && g_click_handlers[my_index]) fill_panel(hdc, r, RGB(19, 41, 65), NULL);
        const char *effect = element_attr(el, "effect");
        if (effect && strcmp(effect, "glitch") == 0) {
            int shift = (GetTickCount() / 130) % 7 == 0 ? 5 : 1;
            RECT ghost = r; OffsetRect(&ghost, shift, 0);
            draw_label(hdc, ghost, text_content ? text_content : "", RGB(239, 70, 180), size, flags | DT_SINGLELINE | DT_VCENTER);
            OffsetRect(&ghost, -shift * 2, 1);
            draw_label(hdc, ghost, text_content ? text_content : "", RGB(40, 220, 255), size, flags | DT_SINGLELINE | DT_VCENTER);
        }
        RECT label_r = r;
        const char *icon = element_attr(el, "icon");
        COLORREF icon_color=color;
        const char *role=element_attr(el,"role");
        if (role && text_content && strcmp(text_content,"[x]") != 0) {
            if(strcmp(role,"file")==0) {
                const char *slash=strrchr(text_content,'/');
                if(slash)text_content=slash+1;
                icon="code";
            } else if(strcmp(role,"tree")==0) {
                int indent=0;while(text_content[indent]==' ')indent++;
                text_content+=indent;label_r.left+=indent*4;
                if(strncmp(text_content,"[+] ",4)==0 || strncmp(text_content,"[-] ",4)==0) {
                    RECT arrow=label_r;arrow.right=arrow.left+10;
                    draw_label(hdc,arrow,text_content[1]=='+' ? ">" : "v",RGB(125,154,188),"tiny",DT_LEFT|DT_SINGLELINE|DT_VCENTER);
                    text_content+=4;label_r.left+=7;icon="folder";icon_color=RGB(182,163,107);
                } else icon="files";
            }
            const char *ext=strrchr(text_content,'.');
            if(ext && strcmp(ext,".co")==0) icon_color=RGB(190,121,223);
            else if(ext && strcmp(ext,".cr")==0)icon_color=RGB(69,143,238);
        }
        if (icon) {
            int collapsed=g_rail_collapsed && element_attr(el,"railitem");
            draw_workspace_icon(hdc,icon,collapsed?r.left+(width-18)/2:label_r.left+4,r.top+(h-18)/2,18,icon_color);
            label_r.left += !strcmp(icon,"xenos")?23:26;
            if(collapsed)text_content="";
        }
        else if (active || background) label_r.left += 7;
        if(g_search[my_index].path)draw_search_result(hdc,r,text_content?text_content:"",&g_search[my_index]);
        else draw_label(hdc, label_r, text_content ? text_content : "", color, size, flags | DT_SINGLELINE | DT_VCENTER | DT_END_ELLIPSIS);
        content_height = h + gap;
    } else if (strcmp(el->type, "button") == 0) {
        int h = leaf_height(el);
        r = (RECT){x, y, x + width, y + h};
        int pressed = (g_pressed == my_index);
        int hovered = (g_hovered == my_index);
        ResolvedStyle style = resolve_style(el, design, RGB(52, 120, 246));
        if (g_workspace) {
            COLORREF bg = style.accent;
            if (pressed) bg = blend_color(RGB(0,0,0), bg, .2);
            else if (hovered) bg = blend_color(RGB(120,170,230), bg, .15);
            fill_panel(hdc, r, bg, element_attr(el, "border"));
        } else draw_glass_shape(hdc, r, style.accent, shape, pressed, hovered && style.hover_enabled,
                          style.alpha_mult, style.border_style, style.shadow);
        COLORREF textcol = parse_color(element_attr(el, "color"), RGB(255, 255, 255));
        RECT label_r = r;
        const char *icon = element_attr(el, "icon");
        if (icon) { draw_workspace_icon(hdc, icon, r.left+8, r.top+(h-16)/2, 16, textcol); label_r.left += 28; }
        draw_label(hdc, label_r, g_text_override[my_index] ? g_text_override[my_index] : el->content ? el->content : "", textcol, size, DT_CENTER | DT_SINGLELINE | DT_VCENTER | DT_END_ELLIPSIS);
        const char *effect = element_attr(el, "effect");
        if (pressed && effect != NULL && _stricmp(effect, "snow") == 0) draw_snowflake(hdc, r);
        if (using_name != NULL && design == NULL) draw_using_note(hdc, r, using_name);
        content_height = h + gap;
    } else if (strcmp(el->type, "input") == 0) {
        int h=leaf_height(el);r=(RECT){x,y,x+width,y+h};
        fill_panel(hdc,r,parse_color(element_attr(el,"background"),RGB(12,29,47)),g_focused_index==my_index?"#3e8bda":"#29415d");
        TextBuffer *tb=g_buffers[my_index];const char *value=tb?tb->text:"";
        const char *placeholder=element_attr(el,"placeholder");
        HFONT font=CreateFontA(-13,0,0,0,FW_NORMAL,FALSE,FALSE,FALSE,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,0,"Segoe UI");
        HFONT old=SelectObject(hdc,font);SIZE caret={0},textsize={0};
        GetTextExtentPoint32A(hdc,value,tb?tb->caret:0,&caret);GetTextExtentPoint32A(hdc,"M",1,&textsize);
        int offset=caret.cx>width-26?caret.cx-(width-26):0;
        int saved=SaveDC(hdc);IntersectClipRect(hdc,x+8,y+2,x+width-8,y+h-2);
        SetBkMode(hdc,TRANSPARENT);SetTextColor(hdc,*value?RGB(210,229,248):RGB(126,154,186));
        const char *shown=*value?value:placeholder?placeholder:"";
        TextOutA(hdc,x+10-offset,y+(h-textsize.cy)/2,shown,(int)strlen(shown));
        if(g_focused_index==my_index&&g_caret_visible) {
            RECT caret_rect={x+10+caret.cx-offset,y+7,x+11+caret.cx-offset,y+h-7};
            HBRUSH brush=CreateSolidBrush(RGB(173,216,255));FillRect(hdc,&caret_rect,brush);DeleteObject(brush);
        }
        RestoreDC(hdc,saved);SelectObject(hdc,old);DeleteObject(font);content_height=h+gap;
    } else if (strcmp(el->type, "textarea") == 0) {
        int h = leaf_height(el);
        r = (RECT){x, y, x + width, y + h};
        ResolvedStyle style = resolve_style(el, design, RGB(40, 42, 48));
        draw_glass_shape(hdc, r, style.accent, shape, 0, 0, style.alpha_mult, style.border_style, style.shadow);
        TextBuffer *tb = g_buffers[my_index];
        RECT text_r = {r.left + 10, r.top + 8, r.right - 10, r.bottom - 8};
        if (element_attr(el, "minimap")) text_r.right -= 48;
        const char *body_text = (tb != NULL && tb->text != NULL) ? tb->text : "";
        if(element_attr(el,"prose")) {
            fill_panel(hdc,r,RGB(10,25,43),"#263b59");
            HFONT font=CreateFontA(-12,0,0,0,FW_NORMAL,0,0,0,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,0,"Segoe UI");
            HGDIOBJ old=SelectObject(hdc,font);RECT measured={0,0,text_r.right-text_r.left,0};
            wchar_t *wrapped=wrap_prose(hdc,body_text,text_r.right-text_r.left);
            DrawTextW(hdc,wrapped,-1,&measured,DT_CALCRECT|DT_NOPREFIX);
            int limit=measured.bottom-(text_r.bottom-text_r.top);if(limit<0)limit=0;
            if(g_scroll_offset[my_index]>limit)g_scroll_offset[my_index]=limit;
            if(g_scroll_offset[my_index]<0)g_scroll_offset[my_index]=0;
            int saved=SaveDC(hdc);IntersectClipRect(hdc,text_r.left,text_r.top,text_r.right,text_r.bottom);
            RECT prose=text_r;prose.top-=g_scroll_offset[my_index];prose.bottom=prose.top+measured.bottom;
            SetBkMode(hdc,TRANSPARENT);SetTextColor(hdc,RGB(194,212,235));DrawTextW(hdc,wrapped,-1,&prose,DT_NOPREFIX);
            free(wrapped);RestoreDC(hdc,saved);SelectObject(hdc,old);DeleteObject(font);
        } else if (g_workspace) {
            fill_panel(hdc, r, RGB(6, 17, 29), "#1b2e45");
        if (element_attr(el, "minimap")) {
            RECT mini = {r.right-48, r.top+6, r.right-4, r.bottom-6};
            draw_source_minimap(hdc, mini, g_buffers[my_index] ? g_buffers[my_index]->text : "",
                g_highlight_spans[my_index], g_highlight_count[my_index]);
        }
            HFONT font = CreateFontA(-13, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, DEFAULT_PITCH, "Consolas");
            HFONT previous = SelectObject(hdc, font);
            TEXTMETRICA tm; GetTextMetricsA(hdc, &tm);
            int line_h = tm.tmHeight + tm.tmExternalLeading;
            int lines = 1, caret_line = 0;
            for (int i = 0; body_text[i]; i++) if (body_text[i] == '\n') { lines++; if (tb && i < tb->caret) caret_line++; }
            int visible = h - 16;
            int max_scroll = lines * line_h - visible;
            if (max_scroll < 0) max_scroll = 0;
            int *scroll = &g_scroll_offset[my_index];
            if (g_follow_caret && g_focused_index == my_index) {
                if (caret_line * line_h < *scroll) *scroll = caret_line * line_h;
                if ((caret_line + 1) * line_h > *scroll + visible) *scroll = (caret_line + 1) * line_h - visible;
                g_follow_caret = 0;
            }
            if (*scroll > max_scroll) *scroll = max_scroll;
            if (*scroll < 0) *scroll = 0;
            int saved = SaveDC(hdc);
            IntersectClipRect(hdc, text_r.left, text_r.top, text_r.right, text_r.bottom);
            SetBkMode(hdc, TRANSPARENT); SetTextColor(hdc, RGB(72, 98, 124));
            for (int line = *scroll / line_h; line < lines && line * line_h - *scroll < visible; line++) {
                char number[32]; snprintf(number, sizeof(number), "%d", line + 1);
                RECT nr = {r.left + 4, r.top + 8 + line * line_h - *scroll, r.left + 40, r.top + 8 + (line + 1) * line_h - *scroll};
                DrawTextA(hdc, number, -1, &nr, DT_RIGHT | DT_SINGLELINE | DT_NOPREFIX);
            }
            RECT code_r = {r.left + 52, text_r.top - *scroll, text_r.right, text_r.bottom};
            IntersectClipRect(hdc, code_r.left, text_r.top, code_r.right, text_r.bottom);
            if (tb) draw_selection(hdc, code_r, tb);
            draw_label_highlighted(hdc, code_r, body_text, RGB(198, 213, 231), NULL,
                g_highlight_spans[my_index], g_highlight_count[my_index], g_search[my_index].needle);
            if (g_focused_index == my_index && tb) draw_caret(hdc, code_r, tb);
            RestoreDC(hdc, saved);
            SelectObject(hdc, previous); DeleteObject(font);
        } else {
        /* No DT_WORDBREAK on purpose -- see draw_caret's comment on why
         * the textarea body is never word-wrapped. No DT_SINGLELINE
         * either, so embedded '\n's still break lines normally. */
        if (tb != NULL) draw_selection(hdc, text_r, tb);
        if (g_highlight_count[my_index] > 0) {
            draw_label_highlighted(hdc, text_r, body_text, RGB(225, 225, 230), size,
                                    g_highlight_spans[my_index], g_highlight_count[my_index], g_search[my_index].needle);
        } else {
            draw_label(hdc, text_r, body_text, RGB(225, 225, 230), size, DT_LEFT | DT_TOP);
        }
        if (g_focused_index == my_index && tb != NULL) draw_caret(hdc, text_r, tb);
        }
        if (using_name != NULL && design == NULL) draw_using_note(hdc, r, using_name);
        content_height = h + gap;
    } else if (strcmp(el->type, "image") == 0) {
        int h = 120;
        int w = width < 200 ? width : 200;
        int ix = x + (width - w) / 2;
        r = (RECT){ix, y, ix + w, y + h};
        ResolvedStyle style = resolve_style(el, design, RGB(70, 75, 85));
        draw_glass_shape(hdc, r, style.accent, shape, 0, 0, style.alpha_mult, style.border_style, style.shadow);
        draw_label(hdc, r, "IMAGE\n(not loaded yet)", RGB(190, 195, 205), "small", DT_CENTER | DT_WORDBREAK);
        if (using_name != NULL && design == NULL) draw_using_note(hdc, r, using_name);
        content_height = h + gap;
    } else {
        /* unknown element type — shown loudly, not silently skipped */
        int h = 30;
        r = (RECT){x, y, x + width, y + h};
        char msg[256];
        snprintf(msg, sizeof(msg), "unknown element '%s' (line %d)", el->type, el->line);
        draw_label(hdc, r, msg, RGB(255, 90, 90), "small", DT_LEFT | DT_SINGLELINE | DT_VCENTER);
        content_height = h + gap;
    }

    if (g_rects != NULL) g_rects[my_index] = r;
    return note_gap + content_height + padding * 2;
}

/* v0.1 layout: a single centered column, stacked top to bottom, width
 * capped and margins computed from the current client rect — this is
 * the whole "auto-adapts to screen size" story for now (resize the
 * window, the column re-centers and re-wraps on the next WM_PAINT).
 * Nested row/column containers (B2) subdivide their own slot instead of
 * this top-level stack, see layout_element above. */
static void paint_workbench_overlay(HDC dc);

/* Draws the in-app modal (see g_modal_kind's own comment) as the very
 * LAST thing painted, on top of the whole normal layout including
 * paint_workbench_overlay's own drag/tooltip overlays -- a centered
 * glass panel, a dimmed backdrop behind it (msimg32's AlphaBlend, same
 * library the frosted-glass button rendering already links against),
 * the message, an EDIT-style input box with a real caret for a prompt,
 * and two buttons whose hit rects are recorded here (g_modal_primary_
 * rect/g_modal_secondary_rect) for WM_LBUTTONDOWN to test against. */
static void paint_modal(HDC hdc, RECT client) {
    if (g_modal_kind == MODAL_NONE) return;

    HDC dim_dc = CreateCompatibleDC(hdc);
    HBITMAP dim_bmp = CreateCompatibleBitmap(hdc, 1, 1);
    HBITMAP old_bmp = SelectObject(dim_dc, dim_bmp);
    SetPixel(dim_dc, 0, 0, RGB(0, 0, 0));
    BLENDFUNCTION blend = {AC_SRC_OVER, 0, 130, 0};
    AlphaBlend(hdc, client.left, client.top, client.right - client.left, client.bottom - client.top,
        dim_dc, 0, 0, 1, 1, blend);
    SelectObject(dim_dc, old_bmp);
    DeleteObject(dim_bmp);
    DeleteDC(dim_dc);

    int w = 420, h = g_modal_kind == MODAL_PROMPT ? 176 : 140;
    RECT box = {(client.right - client.left - w) / 2, (client.bottom - client.top - h) / 2, 0, 0};
    box.right = box.left + w;
    box.bottom = box.top + h;
    fill_panel(hdc, box, RGB(16, 28, 45), "#3a557c");

    RECT msg_r = {box.left + 18, box.top + 16, box.right - 18, box.top + 64};
    draw_label(hdc, msg_r, g_modal_message, RGB(214, 226, 244), "small", DT_LEFT | DT_TOP | DT_WORDBREAK);

    if (g_modal_kind == MODAL_PROMPT) {
        RECT input_r = {box.left + 18, box.top + 70, box.right - 18, box.top + 70 + 30};
        g_modal_input_rect = input_r;
        fill_panel(hdc, input_r, RGB(10, 20, 33), "#3a557c");
        RECT text_r = {input_r.left + 8, input_r.top, input_r.right - 8, input_r.bottom};
        draw_label(hdc, text_r, g_modal_input->text, RGB(224, 234, 248), "small", DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        if (g_caret_visible) {
            HFONT font = CreateFontA(-16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, DEFAULT_PITCH, "Segoe UI");
            HFONT old_font = SelectObject(hdc, font);
            SIZE extent;
            GetTextExtentPoint32A(hdc, g_modal_input->text, g_modal_input->caret, &extent);
            int cx = text_r.left + extent.cx;
            HPEN pen = CreatePen(PS_SOLID, 1, RGB(230, 236, 248));
            HPEN old_pen = SelectObject(hdc, pen);
            MoveToEx(hdc, cx, input_r.top + 5, NULL);
            LineTo(hdc, cx, input_r.bottom - 5);
            SelectObject(hdc, old_pen);
            DeleteObject(pen);
            SelectObject(hdc, old_font);
            DeleteObject(font);
        }
    }

    RECT primary_r = {box.right - 176, box.bottom - 44, box.right - 96, box.bottom - 14};
    RECT secondary_r = {box.right - 88, box.bottom - 44, box.right - 18, box.bottom - 14};
    g_modal_primary_rect = primary_r;
    g_modal_secondary_rect = secondary_r;
    fill_panel(hdc, primary_r, RGB(38, 88, 148), NULL);
    draw_label(hdc, primary_r, g_modal_kind == MODAL_PROMPT ? "OK" : "Yes", RGB(232, 242, 255), "small", DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    fill_panel(hdc, secondary_r, RGB(32, 42, 58), NULL);
    draw_label(hdc, secondary_r, g_modal_kind == MODAL_PROMPT ? "Cancel" : "No", RGB(202, 212, 228), "small", DT_CENTER | DT_VCENTER | DT_SINGLELINE);
}

static void paint_elements(HDC hdc, RECT client) {
    g_view_height = client.bottom - client.top;
    g_view_width = client.right - client.left;
    g_parent_height=g_view_height;g_split_count=0;
    memset(g_rects,0,sizeof(RECT)*g_state_capacity);
    HBRUSH bg = CreateSolidBrush(g_workspace ? RGB(5, 14, 25) : BG_COLOR);
    FillRect(hdc, &client, bg);
    DeleteObject(bg);

    int content_width = (client.right - client.left) - 80;
    if (content_width > 420) content_width = 420;
    if (content_width < 120) content_width = 120;
    int x = client.left + ((client.right - client.left) - content_width) / 2;
    int y = client.top + 40;
    if (g_workspace) { x = 8; y = 8; content_width = client.right - 16; }
    if (content_width < 120) content_width = 120;

    for (int i = 0; i < g_elements.count; i++) {
        y += layout_element(hdc, &g_elements.items[i], x, content_width, y);
    }
    paint_workbench_overlay(hdc);
    paint_modal(hdc, client);
}

/* Recursively matches by TYPE at whatever point in the tree, returning
 * the runtime_id of the first hit (or -1) -- replaces the old flat-array
 * scan now that there's no flat array to scan (see g_next_runtime_id's
 * comment). Shared by button_at/focusable_at below via `type`. */
static int element_at_rec(Element *elements, int count, const char *type, POINT pt) {
    for (int i = 0; i < count; i++) {
        if (!panel_visible(&elements[i])) continue;
        if ((strcmp(elements[i].type, "column") == 0 || is_tab_row(&elements[i])) && element_attr(&elements[i], "height") &&
            !PtInRect(&g_rects[elements[i].runtime_id], pt)) continue;
        if (!element_attr(&elements[i],"readonly") && strcmp(elements[i].type, type) == 0 && PtInRect(&g_rects[elements[i].runtime_id], pt)) {
            return elements[i].runtime_id;
        }
        int found = element_at_rec(elements[i].children, elements[i].child_count, type, pt);
        if (found != -1) return found;
    }
    return -1;
}

/* A "button" is always a click target; any OTHER element type only
 * becomes one once uiOnClick has actually registered a handler on it --
 * lets a dynamically-created "text" element (a file-list entry from
 * uiAddText, say) be clickable without turning every plain label in
 * every .cr file into one just because it happens to share that type.
 * g_click_handlers is always safely readable here (zeroed up to
 * g_state_capacity by ensure_state_capacity) even for an element
 * nothing has registered a handler on yet. */
static int clickable_at_rec(Element *elements, int count, POINT pt) {
    for (int i = 0; i < count; i++) {
        if (!panel_visible(&elements[i])) continue;
        if ((strcmp(elements[i].type, "column") == 0 || is_tab_row(&elements[i])) && element_attr(&elements[i], "height") &&
            !PtInRect(&g_rects[elements[i].runtime_id], pt)) continue;
        int rid = elements[i].runtime_id;
        int is_button = strcmp(elements[i].type, "button") == 0 || element_attr(&elements[i],"railitem");
        int has_handler = g_click_handlers[rid] != NULL;
        if ((is_button || has_handler) && PtInRect(&g_rects[rid], pt)) {
            return rid;
        }
        int found = clickable_at_rec(elements[i].children, elements[i].child_count, pt);
        if (found != -1) return found;
    }
    return -1;
}

static int button_at(POINT pt) {
    if (g_rects == NULL) return -1;
    return clickable_at_rec(g_elements.items, g_elements.count, pt);
}

/* Same recursive shape as clickable_at_rec, checked against
 * g_rightclick_handlers instead -- an element only becomes a right-click
 * target once something has actually registered on_right_click for it
 * (unlike left clicks, nothing gets this "for free" by being a button). */
/* Checks CHILDREN before the element itself -- the opposite order from
 * clickable_at_rec, and deliberately so: that one never had to care,
 * since nothing registers a left-click handler on a CONTAINER (only
 * leaf rows/buttons do, so there was never a parent/child conflict to
 * resolve). Right-click introduces the first real case of that: a
 * container like "fileList" wanting its OWN handler as an empty-space/
 * background fallback (e.g. "New File" at the workspace root) while its
 * individual row children ALSO have their own, more specific handlers.
 * Since a container's rect always encloses its children's rects,
 * checking self-first would make the container's handler win for EVERY
 * point inside it, including on top of a row -- checking children first
 * gives the innermost/most-specific match priority instead, falling
 * back to the container only when no child claimed that point. */
static int rightclickable_at_rec(Element *elements, int count, POINT pt) {
    for (int i = 0; i < count; i++) {
        if (!panel_visible(&elements[i])) continue;
        if ((strcmp(elements[i].type, "column") == 0 || is_tab_row(&elements[i])) && element_attr(&elements[i], "height") &&
            !PtInRect(&g_rects[elements[i].runtime_id], pt)) continue;
        int found = rightclickable_at_rec(elements[i].children, elements[i].child_count, pt);
        if (found != -1) return found;
        int rid = elements[i].runtime_id;
        if (g_rightclick_handlers[rid] != NULL && PtInRect(&g_rects[rid], pt)) return rid;
    }
    return -1;
}

static int rightclickable_at(POINT pt) {
    if (g_rects == NULL) return -1;
    return rightclickable_at_rec(g_elements.items, g_elements.count, pt);
}

/* Separate from button_at() rather than merged into it -- a button hit
 * means "start a press" (g_pressed, SetCapture), a textarea hit means
 * "give it keyboard focus", and those are different enough state machines
 * that a single combined function would need to return which kind of hit
 * it was anyway. Only matches "textarea" for now, since "input" has no
 * TextBuffer behind it yet (out of scope here, see the plan) -- matching
 * "input" too is a one-line addition once it gets one. */
static int focusable_at(POINT pt) {
    if (g_rects == NULL) return -1;
    int result=element_at_rec(g_elements.items,g_elements.count,"input",pt);
    return result>=0?result:element_at_rec(g_elements.items, g_elements.count, "textarea", pt);
}

/* Finds the innermost "column" with a `height:` attribute (the only
 * kind of element layout_element actually treats as scrollable) whose
 * rect contains `pt` -- checks children FIRST so a scrollable nested
 * inside another scrollable would prefer the inner one, though nothing
 * here is tested with that nesting yet. Returns NULL, not a runtime_id,
 * since the caller (WM_MOUSEWHEEL) needs to mutate g_scroll_offset at
 * the found element's own id. */
static Element *scrollable_at_rec(Element *elements, int count, POINT pt) {
    for (int i = 0; i < count; i++) {
        if (!panel_visible(&elements[i])) continue;
        if ((strcmp(elements[i].type, "column") == 0 || is_tab_row(&elements[i])) && element_attr(&elements[i], "height") &&
            !PtInRect(&g_rects[elements[i].runtime_id], pt)) continue;
        Element *found = scrollable_at_rec(elements[i].children, elements[i].child_count, pt);
        if (found != NULL) return found;
        int is_scrollable = is_tab_row(&elements[i]) || (strcmp(elements[i].type, "column") == 0 && !element_attr(&elements[i], "split") && element_attr(&elements[i], "height") != NULL) || (g_workspace && strcmp(elements[i].type, "textarea") == 0);
        if (is_scrollable && PtInRect(&g_rects[elements[i].runtime_id], pt)) {
            return &elements[i];
        }
    }
    return NULL;
}

/* Recursively matches by 'id' ATTRIBUTE anywhere in the tree -- NULL on
 * a miss, letting callers decide how loudly to complain (find_element_by_id
 * below is fatal; a backend call that wants to create a new child under
 * an existing container needs a plain pointer instead, and can raise its
 * own error naming which id it was looking for). */
static Element *find_element_ptr(Element *elements, int count, const char *id) {
    for (int i = 0; i < count; i++) {
        const char *el_id = element_attr(&elements[i], "id");
        if (el_id != NULL && strcmp(el_id, id) == 0) return &elements[i];
        Element *found = find_element_ptr(elements[i].children, elements[i].child_count, id);
        if (found != NULL) return found;
    }
    return NULL;
}

/* Fatal on a miss, matching this project's fatal-on-misuse convention
 * elsewhere (Coral's runtime_error, Creal's own fatal_parse_error) --
 * set_text/get_text/on_click are meant to be driven by a Coral script
 * once the bridge exists, and a script naming an id that isn't on screen
 * is a real bug worth stopping loudly for, not silently ignoring. */
static int find_element_by_id(const char *id) {
    Element *el = find_element_ptr(g_elements.items, g_elements.count, id);
    if (el == NULL) {
        fprintf(stderr, "no element with id '%s'\n", id);
        exit(1);
    }
    return el->runtime_id;
}

#include "web_backend.h"
#include "workbench.h"

static void reset_panel_layout(void) {
    cancel_split_drag();g_split_hover=-1;g_split_count=0;
    restore_positions();g_move_pending=g_move_source=g_move_target=-1;
    for(int i=0;i<g_next_runtime_id;i++) {
        g_panes[i].share=0;
        if(g_panes[i].dockable)g_panes[i].hidden=g_panes[i].initial_hidden;
    }
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
static void win32_toggle_panel(const char *id) {
    Element *panel=find_element_ptr(g_elements.items,g_elements.count,id);
    if(!panel || !element_attr(panel,"panel")) {
        fprintf(stderr,"'%s' is not a named panel\n",id);exit(1);
    }
    cancel_split_drag();g_split_hover=-1;g_split_count=0;
    win32_set_visible(id,g_panes[panel->runtime_id].hidden);
    if(g_panes[panel->runtime_id].hidden && element_by_runtime(panel,1,g_focused_index))g_focused_index=-1;
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
static void append_panel_menu(HMENU menu,Element *items,int count,int *ids,int *length) {
    for(int i=0;i<count;i++) {
        const char *label=element_attr(&items[i],"panel");
        if(label) {
            ids[*length]=items[i].runtime_id;
            AppendMenuA(menu,MF_OWNERDRAW|(g_panes[ids[*length]].hidden?MF_UNCHECKED:MF_CHECKED),1001+*length,label);
            (*length)++;
        }
        append_panel_menu(menu,items[i].children,items[i].child_count,ids,length);
    }
}
static void win32_panel_menu(const char *anchor_id) {
    int anchor=find_element_by_id(anchor_id),length=0;
    int *ids=malloc(sizeof(int)*g_next_runtime_id);HMENU menu=CreatePopupMenu();
    append_panel_menu(menu,g_elements.items,g_elements.count,ids,&length);
    AppendMenuA(menu,MF_OWNERDRAW,0,NULL);AppendMenuA(menu,MF_OWNERDRAW,1,"Reset layout");
    HBRUSH menu_bg=CreateSolidBrush(RGB(10,25,41));MENUINFO info={0};info.cbSize=sizeof(info);info.fMask=MIM_BACKGROUND;info.hbrBack=menu_bg;SetMenuInfo(menu,&info);
    POINT pt={g_rects[anchor].left,g_rects[anchor].bottom};ClientToScreen(g_hwnd,&pt);
    g_pressed=-1;ReleaseCapture();
    int command=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY|TPM_LEFTALIGN,pt.x,pt.y,0,g_hwnd,NULL);
    DestroyMenu(menu);DeleteObject(menu_bg);
    if(command==1)reset_panel_layout();
    else if(command>=1001 && command<1001+length) {
        Element *panel=element_by_runtime(g_elements.items,g_elements.count,ids[command-1001]);
        win32_toggle_panel(element_attr(panel,"id"));
    }
    free(ids);
}

static void win32_on_right_click(const char *id, UIClickHandler handler, void *userdata) {
    int i = find_element_by_id(id);
    g_rightclick_handlers[i] = handler;
    g_rightclick_userdata[i] = userdata;
}

/* Native TrackPopupMenu, same mechanism win32_panel_menu already uses,
 * just with caller-supplied labels instead of a hardcoded panel list --
 * this is what makes the menu's actual CONTENTS a Coral-side decision
 * (a right-click handler builds whatever labels make sense for what got
 * clicked) rather than another hardcoded native menu. Opens at the last
 * WM_RBUTTONDOWN's screen position (see g_last_rightclick_screen) since
 * a context menu is a "wherever you right-clicked" popup, not anchored
 * to any one element's rect the way the Panels dropdown is. Returns the
 * 1-based index of the chosen label, or 0 if the menu was dismissed
 * without a choice -- matches Coral's own 1-based indexing convention,
 * so `labels[.list]}` picking the same index straight back out of the
 * array Coral built the menu from needs no translation either way. */
static int win32_show_menu(const char **labels, int count) {
    HMENU menu = CreatePopupMenu();
    for (int i = 0; i < count; i++) {
        AppendMenuA(menu, MF_OWNERDRAW, 1000 + i, labels[i]);
    }
    HBRUSH menu_bg = CreateSolidBrush(RGB(10, 25, 41));
    MENUINFO info = {0};
    info.cbSize = sizeof(info);
    info.fMask = MIM_BACKGROUND;
    info.hbrBack = menu_bg;
    SetMenuInfo(menu, &info);
    g_pressed = -1;
    ReleaseCapture();
    int command = TrackPopupMenu(menu, TPM_RETURNCMD | TPM_NONOTIFY | TPM_LEFTALIGN,
        g_last_rightclick_screen.x, g_last_rightclick_screen.y, 0, g_hwnd, NULL);
    DestroyMenu(menu);
    DeleteObject(menu_bg);
    if (command < 1000 || command >= 1000 + count) return 0;
    return command - 1000 + 1;
}

/* Real Windows clipboard access for Ctrl+C/X/V in a textarea/input --
 * separate from uiSetClipboardText (coral-lang's builtins.c, backed by
 * dirlist.c's clipboard_set_text) since that one lives in the OTHER
 * project's build entirely, isolated there for a <windows.h>/Coral-
 * TokenType collision that doesn't exist here (this file already
 * includes <windows.h> directly, being pure Win32 with no Coral parser
 * of its own to collide with). CF_TEXT (not Unicode) throughout,
 * matching this whole project's byte-string (not wide-char) convention
 * everywhere else. */
static void win32_clipboard_set_text(const char *text) {
    if (!OpenClipboard(NULL)) return;
    EmptyClipboard();
    size_t len = strlen(text) + 1;
    HGLOBAL mem = GlobalAlloc(GMEM_MOVEABLE, len);
    if (mem != NULL) {
        memcpy(GlobalLock(mem), text, len);
        GlobalUnlock(mem);
        SetClipboardData(CF_TEXT, mem);
    }
    CloseClipboard();
}

/* Returns a freshly malloc'd copy (caller frees), or NULL if the
 * clipboard has no text on it -- never a dangling pointer into the
 * clipboard's own global memory, which GlobalUnlock/CloseClipboard
 * below would leave unsafe to keep referencing. */
static char *win32_clipboard_get_text(void) {
    if (!OpenClipboard(NULL)) return NULL;
    HANDLE h = GetClipboardData(CF_TEXT);
    char *result = NULL;
    if (h != NULL) {
        char *locked = GlobalLock(h);
        if (locked != NULL) { result = strdup(locked); GlobalUnlock(h); }
    }
    CloseClipboard();
    return result;
}

/* Ends whichever modal is active (if any), WITHOUT running either
 * callback -- shared by both the primary/secondary click handling below
 * and anything that needs to force-dismiss a modal (there's currently
 * nothing that does, but keeping the "stop being modal" step separate
 * from "and now call a handler" avoids ever forgetting one when the
 * other runs). */
static void close_modal(void) {
    g_modal_kind = MODAL_NONE;
    g_modal_on_primary = g_modal_on_secondary = NULL;
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

/* uiShowConfirm's backend half -- an in-app yes/no modal (see
 * g_modal_kind's own comment for why this replaced a native
 * MessageBoxA). `on_yes`/`on_no` are the SAME UIClickHandler shape
 * every uiOnClick binding already uses; WM_LBUTTONDOWN calls whichever
 * one matches the button clicked, then close_modal(). */
static void win32_show_confirm(const char *message, UIClickHandler on_yes, void *yes_data, UIClickHandler on_no, void *no_data) {
    g_modal_kind = MODAL_CONFIRM;
    snprintf(g_modal_message, sizeof(g_modal_message), "%s", message);
    g_modal_on_primary = on_yes; g_modal_primary_data = yes_data;
    g_modal_on_secondary = on_no; g_modal_secondary_data = no_data;
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

/* uiShowPrompt's backend half -- an in-app text-input modal. Reuses
 * edit.c's own TextBuffer for the input field (g_modal_input), the same
 * data structure every textarea/input element's live text already is,
 * rather than inventing a second text-editing representation just for
 * this. `on_ok`'s userdata is a PromptBinding (builtins.c) that reads
 * g_modal_input's final text back out via a separate builtin
 * (uiModalInputText) once the callback fires -- UIClickHandler itself
 * has no return channel, so the entered text can't just be handed back
 * as a call argument the way a click's element id is. */
static void win32_show_prompt(const char *message, const char *initial, UIClickHandler on_ok, void *ok_data, UIClickHandler on_cancel, void *cancel_data) {
    g_modal_kind = MODAL_PROMPT;
    snprintf(g_modal_message, sizeof(g_modal_message), "%s", message);
    g_modal_input = textbuffer_create(initial);
    textbuffer_move_end(g_modal_input);
    g_modal_on_primary = on_ok; g_modal_primary_data = ok_data;
    g_modal_on_secondary = on_cancel; g_modal_secondary_data = cancel_data;
    g_caret_visible = 1;
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

/* uiModalInputText's backend half -- the prompt's current (or, once
 * closed, final) text. Only meaningful to call from inside an on_ok
 * callback, before anything else has a chance to open a NEW modal and
 * replace g_modal_input out from under it. */
static const char *win32_modal_input_text(void) {
    return g_modal_input != NULL ? g_modal_input->text : "";
}

/* Recursively finds and splices OUT the element whose 'id' attribute
 * matches, from whichever children array (or the top-level g_elements
 * list -- both are just an Element* plus a count, so one function
 * handles both) actually holds it. A straight memmove shrinking that
 * array's count by one, mirroring how Coral's own '[.delete] {arr[i]}'
 * removes an array element (interp.c) and edit.c's textbuffer_delete_
 * forward removes a character -- same "shift everything after it down
 * one slot" shape throughout this whole codebase. Returns 1 if
 * something was removed, 0 on a miss. Does NOT touch any runtime_id-
 * indexed array (g_rects, g_buffers, ...) -- see remove_element's own
 * comment in backend.h for why that's fine to leave orphaned. */
static int remove_element_rec(Element *elements, int *count, const char *id) {
    for (int i = 0; i < *count; i++) {
        const char *el_id = element_attr(&elements[i], "id");
        if (el_id != NULL && strcmp(el_id, id) == 0) {
            memmove(&elements[i], &elements[i + 1], sizeof(Element) * (size_t)(*count - i - 1));
            (*count)--;
            return 1;
        }
    }
    for (int i = 0; i < *count; i++) {
        if (remove_element_rec(elements[i].children, &elements[i].child_count, id)) return 1;
    }
    return 0;
}

static const char *window_action(Element *items, int count, int rid) {
    for (int i=0;i<count;i++) {
        if (items[i].runtime_id == rid) return element_attr(&items[i], "action");
        const char *found=window_action(items[i].children,items[i].child_count,rid);
        if(found)return found;
    }
    return NULL;
}

static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_NCCALCSIZE:
            if (g_custom_chrome && wParam) return 0;
            break;
        case WM_NCHITTEST:
            if (g_custom_chrome) {
                POINT pt={(short)LOWORD(lParam),(short)HIWORD(lParam)};
                ScreenToClient(hwnd,&pt);RECT client;GetClientRect(hwnd,&client);
                int left=pt.x<6,right=pt.x>=client.right-6,top=pt.y<6,bottom=pt.y>=client.bottom-6;
                if (!IsZoomed(hwnd)) {
                    if(top&&left)return HTTOPLEFT;
                    if(top&&right)return HTTOPRIGHT;
                    if(bottom&&left)return HTBOTTOMLEFT;
                    if(bottom&&right)return HTBOTTOMRIGHT;
                    if(top)return HTTOP;
                    if(bottom)return HTBOTTOM;
                    if(left)return HTLEFT;
                    if(right)return HTRIGHT;
                }
                if(pt.y<44 && button_at(pt)==-1)return HTCAPTION;
                return HTCLIENT;
            }
            break;
        case WM_MEASUREITEM: {
            MEASUREITEMSTRUCT *item=(MEASUREITEMSTRUCT*)lParam;
            if(item->CtlType==ODT_MENU){item->itemWidth=236;item->itemHeight=item->itemID==0?8:30;return TRUE;}
            break;
        }
        case WM_DRAWITEM: {
            DRAWITEMSTRUCT *item=(DRAWITEMSTRUCT*)lParam;
            if(item->CtlType==ODT_MENU) {
                RECT r=item->rcItem;fill_panel(item->hDC,r,item->itemState&ODS_SELECTED?RGB(27,58,88):RGB(10,25,41),NULL);
                if(item->itemID==0){r.top=(r.top+r.bottom)/2;r.bottom=r.top+1;fill_panel(item->hDC,r,RGB(36,58,80),NULL);}
                else {
                    if(item->itemState&ODS_CHECKED)draw_workspace_icon(item->hDC,"check",r.left+9,r.top+7,16,RGB(84,186,255));
                    r.left+=34;draw_label(item->hDC,r,(const char*)item->itemData,RGB(205,224,245),"small",DT_LEFT|DT_VCENTER|DT_SINGLELINE);
                }
                return TRUE;
            }
            break;
        }
        case WM_SIZE:
            cancel_split_drag();g_move_pending=g_move_source=g_move_target=-1;g_split_count=0;InvalidateRect(hwnd,NULL,FALSE);break;
        case WM_CAPTURECHANGED:
            g_split_dragging=0;g_move_pending=g_move_source=g_move_target=-1;g_pressed=-1;InvalidateRect(hwnd,NULL,FALSE);return 0;
        case WM_SETCURSOR:
            if(LOWORD(lParam)==HTCLIENT) {
                POINT pt;GetCursorPos(&pt);ScreenToClient(hwnd,&pt);
                if(g_move_source>=0 || (g_moving&&dock_at_rec(g_elements.items,g_elements.count,pt,1)>=0&&button_at(pt)<0)){SetCursor(LoadCursor(NULL,IDC_SIZEALL));return TRUE;}
                int divider=split_at(pt);
                if(g_split_dragging||divider>=0) {
                    int vertical=g_split_dragging?g_drag_split.vertical:g_split_handles[divider].vertical;
                    SetCursor(LoadCursor(NULL,vertical?IDC_SIZENS:IDC_SIZEWE));return TRUE;
                }
            }
            break;
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            RECT client;
            GetClientRect(hwnd, &client);
            int width = client.right, height = client.bottom;
            if (width > 0 && height > 0) {
                HDC buffer = CreateCompatibleDC(hdc);
                HBITMAP bitmap = CreateCompatibleBitmap(hdc, width, height);
                HBITMAP previous = SelectObject(buffer, bitmap);
                paint_elements(buffer, client);
                BitBlt(hdc, 0, 0, width, height, buffer, 0, 0, SRCCOPY);
                SelectObject(buffer, previous); DeleteObject(bitmap); DeleteDC(buffer);
            }
            EndPaint(hwnd, &ps);
            return 0;
        }
        case WM_PRINTCLIENT: {
            RECT client; GetClientRect(hwnd, &client);
            paint_elements((HDC)wParam, client);
            return 0;
        }
        case WM_ERASEBKGND: return 1;
        case WM_GETMINMAXINFO:
            if (g_workspace) {
                MINMAXINFO *limits = (MINMAXINFO *)lParam;
                MONITORINFO monitor = {0};
                monitor.cbSize = sizeof(monitor);
                if (GetMonitorInfo(MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), &monitor)) {
                    limits->ptMaxPosition.x = monitor.rcWork.left - monitor.rcMonitor.left;
                    limits->ptMaxPosition.y = monitor.rcWork.top - monitor.rcMonitor.top;
                    limits->ptMaxSize.x = monitor.rcWork.right - monitor.rcWork.left;
                    limits->ptMaxSize.y = monitor.rcWork.bottom - monitor.rcWork.top;
                }
                limits->ptMinTrackSize.x = 1000;
                limits->ptMinTrackSize.y = 720;
                return 0;
            }
            break;
        case WM_LBUTTONDOWN: {
            POINT pt = {(short)LOWORD(lParam), (short)HIWORD(lParam)};
            /* A modal takes ALL input while it's up -- checked before
             * anything else this handler does (splits, panel moving,
             * ordinary button/textarea hit-testing), the same "blocks
             * everything else" property a native modal dialog had.
             * Clicking inside the input box (prompt only) just refocuses
             * the caret at the click's column; clicking either button
             * fires that button's callback, THEN closes the modal --
             * callback first, since a handler like the Delete confirm's
             * "Yes" often needs to read state (uiModalInputText, or just
             * the pending action stashed before the modal opened) that
             * closing would have no reason to disturb, but doing it in
             * this order costs nothing and reads more obviously correct. */
            if (g_modal_kind != MODAL_NONE) {
                if (PtInRect(&g_modal_primary_rect, pt)) {
                    UIClickHandler h = g_modal_on_primary; void *d = g_modal_primary_data;
                    close_modal();
                    if (h != NULL) h(d);
                } else if (PtInRect(&g_modal_secondary_rect, pt)) {
                    UIClickHandler h = g_modal_on_secondary; void *d = g_modal_secondary_data;
                    close_modal();
                    if (h != NULL) h(d);
                } else if (g_modal_kind == MODAL_PROMPT && PtInRect(&g_modal_input_rect, pt)) {
                    /* Always exactly one line (a prompt input never
                     * contains '\n' -- WM_CHAR below refuses it), so this
                     * just finds the closest column directly rather than
                     * reusing caret_pos_from_point's multi-line search,
                     * which also hardcodes ITS font choice to g_workspace
                     * rather than this modal's own fixed Segoe UI 16. */
                    HDC hdc = GetDC(hwnd);
                    HFONT font = CreateFontA(-16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                        DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, DEFAULT_PITCH, "Segoe UI");
                    HFONT old_font = SelectObject(hdc, font);
                    int text_left = g_modal_input_rect.left + 8;
                    int len = (int)strlen(g_modal_input->text);
                    int best_pos = 0, best_dist = abs(pt.x - text_left);
                    for (int i = 0; i <= len; i++) {
                        SIZE extent;
                        GetTextExtentPoint32A(hdc, g_modal_input->text, i, &extent);
                        int dist = abs(pt.x - (text_left + extent.cx));
                        if (dist < best_dist) { best_dist = dist; best_pos = i; }
                    }
                    g_modal_input->caret = best_pos;
                    SelectObject(hdc, old_font);
                    DeleteObject(font);
                    ReleaseDC(hwnd, hdc);
                    g_caret_visible = 1;
                    InvalidateRect(hwnd, NULL, FALSE);
                }
                return 0;
            }
            int divider=split_at(pt);
            if(divider>=0){begin_split_drag(divider,pt);return 0;}
            int hit = button_at(pt);
            if(g_moving) {
                int panel=dock_at_rec(g_elements.items,g_elements.count,pt,1);
                Element *target=hit>=0?element_by_runtime(g_elements.items,g_elements.count,hit):NULL;
                int control=target&&(!strcmp(target->type,"button")||(target->content&&!strcmp(target->content,"[x]")));
                if(panel>=0&&!control){g_move_pending=panel;g_move_origin=pt;g_pressed=hit;SetCapture(hwnd);return 0;}
            }
            if (hit != -1) {
                g_pressed = hit;
                SetCapture(hwnd);
                InvalidateRect(hwnd, NULL, FALSE);
            } else {
                int focus_hit = focusable_at(pt);
                /* Re-position the caret on every click into the SAME
                 * already-focused textarea too, not only the first click
                 * that gives it focus -- otherwise clicking a second spot
                 * in text you're already editing would silently do nothing. */
                if (focus_hit != -1 && g_buffers[focus_hit] != NULL) {
                    TextBuffer *fb = g_buffers[focus_hit];
                    int old_caret = fb->caret;
                    Element *fel = element_by_runtime(g_elements.items, g_elements.count, focus_hit);
                    if (fel != NULL && element_attr(fel, "prose") != NULL) {
                        /* Prose panels word-wrap their text (see wrap_prose)
                         * instead of drawing it split on literal '\n's, so
                         * caret_pos_from_point's line/column math doesn't
                         * apply there -- keep the old end-of-text behavior
                         * for that one display mode, and leave selection/
                         * drag unarmed rather than feeding it math that
                         * assumes un-wrapped lines. */
                        fb->caret = fb->length;
                    } else {
                        RECT area_r = text_area_rect_for(focus_hit);
                        HDC click_hdc = GetDC(hwnd);
                        fb->caret = caret_pos_from_point(click_hdc, area_r, fb->text, pt);
                        ReleaseDC(hwnd, click_hdc);
                        /* Shift+click extends whatever selection already
                         * exists (starting one from the OLD caret position
                         * if there wasn't one yet); a plain click always
                         * starts fresh. Either way this also arms drag-to-
                         * select -- WM_MOUSEMOVE grows the same selection
                         * further as long as the button stays down. */
                        if (GetKeyState(VK_SHIFT) & 0x8000) {
                            if (fb->selection_anchor < 0) fb->selection_anchor = old_caret;
                        } else {
                            fb->selection_anchor = -1;
                        }
                        g_selecting_index = focus_hit;
                        SetCapture(hwnd);
                    }
                    g_follow_caret = 1;
                }
                if (focus_hit != g_focused_index) {
                    g_focused_index = focus_hit;
                    g_caret_visible = 1;
                    InvalidateRect(hwnd, NULL, FALSE);
                } else if (focus_hit != -1) {
                    InvalidateRect(hwnd, NULL, FALSE);
                }
            }
            return 0;
        }
        case WM_RBUTTONDOWN: {
            POINT pt = {(short)LOWORD(lParam), (short)HIWORD(lParam)};
            int rc_hit = rightclickable_at(pt);
            if (rc_hit != -1) {
                POINT screen_pt = pt;
                ClientToScreen(hwnd, &screen_pt);
                g_last_rightclick_screen = screen_pt;
                if (g_rightclick_handlers[rc_hit] != NULL) {
                    g_rightclick_handlers[rc_hit](g_rightclick_userdata[rc_hit]);
                }
            }
            return 0;
        }
        case WM_LBUTTONUP: {
            if (g_selecting_index != -1) { g_selecting_index = -1; ReleaseCapture(); return 0; }
            if(g_move_pending>=0){g_move_pending=-1;if(g_pressed<0){ReleaseCapture();return 0;}}
            if(g_move_source>=0) {
                int source=g_move_source,target=g_move_target;g_move_pending=g_move_source=g_move_target=-1;ReleaseCapture();
                swap_panels(source,target);InvalidateRect(hwnd,NULL,FALSE);return 0;
            }
            if(g_split_dragging) {
                move_split_drag((POINT){(short)LOWORD(lParam),(short)HIWORD(lParam)});
                cancel_split_drag();InvalidateRect(hwnd,NULL,FALSE);return 0;
            }
            if (g_pressed != -1) {
                POINT pt = {(short)LOWORD(lParam), (short)HIWORD(lParam)};
                /* A "click" (as opposed to a press) only fires when the
                 * release lands back on the same element the press started
                 * on -- pressing, dragging off, and releasing elsewhere is
                 * a cancelled press, not a click, same as most UI toolkits. */
                if (button_at(pt) == g_pressed) {
                    const char *action=window_action(g_elements.items,g_elements.count,g_pressed);
                    if(action && strcmp(action,"minimize")==0) ShowWindow(hwnd,SW_MINIMIZE);
                    else if(action && strcmp(action,"maximize")==0) ShowWindow(hwnd,IsZoomed(hwnd)?SW_RESTORE:SW_MAXIMIZE);
                    else if(action && strcmp(action,"close")==0) PostMessage(hwnd,WM_CLOSE,0,0);
                    else if(g_click_handlers[g_pressed]) g_click_handlers[g_pressed](g_click_userdata[g_pressed]);
                }
                g_pressed = -1;
                ReleaseCapture();
                InvalidateRect(hwnd, NULL, FALSE);
            }
            return 0;
        }
        case WM_MOUSEMOVE: {
            POINT pt = {(short)LOWORD(lParam), (short)HIWORD(lParam)};
            if (g_selecting_index != -1 && g_buffers[g_selecting_index] != NULL) {
                TextBuffer *fb = g_buffers[g_selecting_index];
                if (fb->selection_anchor < 0) fb->selection_anchor = fb->caret; /* the drag itself is what starts the selection if the mouse moved before we got here */
                RECT area_r = text_area_rect_for(g_selecting_index);
                HDC hdc = GetDC(hwnd);
                fb->caret = caret_pos_from_point(hdc, area_r, fb->text, pt);
                ReleaseDC(hwnd, hdc);
                g_caret_visible = 1;
                InvalidateRect(hwnd, NULL, FALSE);
                return 0;
            }
            if(g_move_pending>=0&&(abs(pt.x-g_move_origin.x)>=5||abs(pt.y-g_move_origin.y)>=5)) {
                g_move_source=g_move_pending;g_move_pending=-1;g_pressed=-1;
            }
            if(g_move_source>=0){g_move_target=dock_at_rec(g_elements.items,g_elements.count,pt,0);InvalidateRect(hwnd,NULL,FALSE);return 0;}
            if(g_split_dragging){move_split_drag(pt);return 0;}
            int divider=split_at(pt);
            if(divider!=g_split_hover){g_split_hover=divider;InvalidateRect(hwnd,NULL,FALSE);}
            int hit = button_at(pt);
            if (hit != g_hovered) {
                g_hovered = hit;
                InvalidateRect(hwnd, NULL, FALSE);
            }
            TRACKMOUSEEVENT tme = {0};
            tme.cbSize = sizeof(tme);
            tme.dwFlags = TME_LEAVE;
            tme.hwndTrack = hwnd;
            TrackMouseEvent(&tme);
            return 0;
        }
        case WM_MOUSELEAVE: {
            if(g_split_hover!=-1){g_split_hover=-1;InvalidateRect(hwnd,NULL,FALSE);}
            if (g_hovered != -1) {
                g_hovered = -1;
                InvalidateRect(hwnd, NULL, FALSE);
            }
            return 0;
        }
        case WM_MOUSEWHEEL: {
            /* Unlike every other mouse message, WM_MOUSEWHEEL's position
             * arrives in SCREEN coordinates, not client -- ScreenToClient
             * puts it in the same space g_rects/hit-testing already use. */
            POINT pt = {(short)LOWORD(lParam), (short)HIWORD(lParam)};
            ScreenToClient(hwnd, &pt);
            int delta = (short)HIWORD(wParam); /* +120 per notch up, -120 down */
            Element *target = scrollable_at_rec(g_elements.items, g_elements.count, pt);
            if (target != NULL) {
                int *scroll = &g_scroll_offset[target->runtime_id];
                *scroll -= delta / 3; /* scale from 120/notch down to a comfortable pixel step */
                if (*scroll < 0) *scroll = 0; /* upper bound is clamped by layout_element itself, next repaint */
                InvalidateRect(hwnd, NULL, FALSE);
            }
            return 0;
        }
        case WM_CHAR: {
            if (g_modal_kind == MODAL_PROMPT) {
                char c = (char)wParam;
                if ((unsigned char)c >= 32) {
                    textbuffer_insert_char(g_modal_input, c);
                    g_caret_visible = 1;
                    InvalidateRect(hwnd, NULL, FALSE);
                }
                return 0;
            }
            if (g_modal_kind == MODAL_CONFIRM) return 0;
            if (g_focused_index == -1 || g_buffers[g_focused_index] == NULL) break;
            char c = (char)wParam;
            /* Backspace arrives here too (as 0x08) but is handled in
             * WM_KEYDOWN via VK_BACK instead, to avoid inserting it AND
             * deleting for the same keypress. Enter arrives as '\r' here;
             * textarea wants '\n' so up/down and line-splitting agree with
             * how the buffer itself defines a line (see edit.c). */
            if (c == '\b') break;
            if (c == '\r') c = '\n';
            Element *focused=element_by_runtime(g_elements.items,g_elements.count,g_focused_index);
            if(focused && !strcmp(focused->type,"input") && (c=='\n'||c=='\t'))return 0;
            if ((unsigned char)c >= 32 || c == '\n' || c == '\t') {
                textbuffer_insert_char(g_buffers[g_focused_index], c);
                queue_change(g_focused_index);
                g_highlight_count[g_focused_index] = 0;
                g_follow_caret = 1;
                g_caret_visible = 1;
                InvalidateRect(hwnd, NULL, FALSE);
            }
            return 0;
        }
        case WM_KEYDOWN: {
            if (g_modal_kind != MODAL_NONE) {
                if (wParam == VK_RETURN || wParam == VK_ESCAPE) {
                    UIClickHandler h = wParam == VK_RETURN ? g_modal_on_primary : g_modal_on_secondary;
                    void *d = wParam == VK_RETURN ? g_modal_primary_data : g_modal_secondary_data;
                    close_modal();
                    if (h != NULL) h(d);
                    return 0;
                }
                if (g_modal_kind == MODAL_PROMPT) {
                    switch (wParam) {
                        case VK_BACK:   textbuffer_backspace(g_modal_input); break;
                        case VK_DELETE: textbuffer_delete_forward(g_modal_input); break;
                        case VK_LEFT:   textbuffer_move_left(g_modal_input); break;
                        case VK_RIGHT:  textbuffer_move_right(g_modal_input); break;
                        case VK_HOME:   textbuffer_move_home(g_modal_input); break;
                        case VK_END:    textbuffer_move_end(g_modal_input); break;
                        default: return 0;
                    }
                    g_caret_visible = 1;
                    InvalidateRect(hwnd, NULL, FALSE);
                }
                return 0;
            }
            if(wParam==VK_ESCAPE&&(g_move_pending>=0||g_move_source>=0||g_split_dragging)){g_move_pending=g_move_source=g_move_target=-1;cancel_split_drag();return 0;}
            if (g_focused_index == -1 || g_buffers[g_focused_index] == NULL) break;
            TextBuffer *tb = g_buffers[g_focused_index];
            int ctrl_down = (GetKeyState(VK_CONTROL) & 0x8000) != 0;
            int shift_down = (GetKeyState(VK_SHIFT) & 0x8000) != 0;
            if (ctrl_down) {
                switch (wParam) {
                    case 'A': textbuffer_select_all(tb); g_caret_visible = 1; InvalidateRect(hwnd, NULL, FALSE); return 0;
                    case 'C': case 'X': {
                        char *sel = textbuffer_selected_text(tb);
                        win32_clipboard_set_text(sel);
                        free(sel);
                        if (wParam == 'X' && textbuffer_has_selection(tb)) {
                            textbuffer_delete_selection(tb);
                            g_highlight_count[g_focused_index] = 0;
                            queue_change(g_focused_index);
                        }
                        g_follow_caret = 1; g_caret_visible = 1;
                        InvalidateRect(hwnd, NULL, FALSE);
                        return 0;
                    }
                    case 'V': {
                        char *pasted = win32_clipboard_get_text();
                        if (pasted != NULL) {
                            for (const char *p = pasted; *p; p++) {
                                if (*p == '\r') continue; /* CRLF -> '\n', matching WM_CHAR's own Enter translation */
                                textbuffer_insert_char(tb, *p);
                            }
                            free(pasted);
                            g_highlight_count[g_focused_index] = 0;
                            queue_change(g_focused_index);
                        }
                        g_follow_caret = 1; g_caret_visible = 1;
                        InvalidateRect(hwnd, NULL, FALSE);
                        return 0;
                    }
                    default: break;
                }
            }
            /* Any plain movement key without Shift collapses a live
             * selection first (standard editor behavior -- Right with a
             * selection jumps to its end, not "move one char past
             * wherever the caret happened to be"); Shift instead grows
             * one from wherever the caret currently sits, the first time
             * it's held. */
            int is_move_key = wParam==VK_LEFT||wParam==VK_RIGHT||wParam==VK_UP||wParam==VK_DOWN||wParam==VK_HOME||wParam==VK_END;
            if (is_move_key) {
                if (shift_down) textbuffer_extend_selection(tb);
                else textbuffer_clear_selection(tb);
            }
            switch (wParam) {
                case VK_BACK:   textbuffer_backspace(tb); break;
                case VK_DELETE: textbuffer_delete_forward(tb); break;
                case VK_LEFT:   textbuffer_move_left(tb); break;
                case VK_RIGHT:  textbuffer_move_right(tb); break;
                case VK_UP:     textbuffer_move_up(tb); break;
                case VK_DOWN:   textbuffer_move_down(tb); break;
                case VK_HOME:   textbuffer_move_home(tb); break;
                case VK_END:    textbuffer_move_end(tb); break;
                default: return DefWindowProcA(hwnd, msg, wParam, lParam);
            }
            if (wParam == VK_BACK || wParam == VK_DELETE) {g_highlight_count[g_focused_index] = 0;queue_change(g_focused_index);}
            g_follow_caret = 1;
            g_caret_visible = 1;
            InvalidateRect(hwnd, NULL, FALSE);
            return 0;
        }
        case WM_TIMER: {
            if(wParam==4){if(g_tick_handler)g_tick_handler(g_tick_userdata);return 0;}
            if(wParam==3) {
                KillTimer(hwnd,3);int id=g_pending_change;g_pending_change=-1;
                if(id>=0&&g_change_handlers[id])g_change_handlers[id](g_change_userdata[id]);
                return 0;
            }
            if (wParam == 2) { InvalidateRect(hwnd, NULL, FALSE); return 0; }
            if (wParam == CARET_TIMER_ID) {
                g_caret_visible = !g_caret_visible;
                if (g_focused_index != -1) InvalidateRect(hwnd, NULL, FALSE);
            }
            return 0;
        }
        case WM_APP_WEB_REQUEST:
            handle_web_request();
            return 0;
        case WM_DESTROY:
            KillTimer(hwnd, CARET_TIMER_ID);
            KillTimer(hwnd, 2);KillTimer(hwnd,3);KillTimer(hwnd,4);
            PostQuitMessage(0);
            return 0;
    }
    return DefWindowProcA(hwnd, msg, wParam, lParam);
}

/* Assigns every element in the tree the next runtime_id, once -- called
 * over the WHOLE tree at initial load; a later add_text call assigns
 * just its own one new id the same way (see win32_add_text). Traversal
 * order doesn't matter for correctness here (unlike the old flat-array
 * scheme) since nothing depends on WHICH id an element gets, only that
 * every element gets a distinct one before it's ever painted or looked
 * up. */
static void assign_runtime_ids(Element *elements, int count) {
    for (int i = 0; i < count; i++) {
        elements[i].runtime_id = g_next_runtime_id++;
        assign_runtime_ids(elements[i].children, elements[i].child_count);
    }
}

/* Grows every per-element runtime array to at least g_next_runtime_id
 * entries, zeroing the newly-added slots (NULL for pointers, an empty
 * RECT for g_rects) -- called right after g_next_runtime_id advances,
 * whether that's the initial load (many new ids at once) or a single
 * add_text call (one new id). Doubling growth, same pattern as every
 * other growable array in this project. */
static void ensure_state_capacity(void) {
    if (g_next_runtime_id <= g_state_capacity) return;
    int new_cap = g_state_capacity == 0 ? 16 : g_state_capacity;
    while (new_cap < g_next_runtime_id) new_cap *= 2;

    g_search = realloc(g_search,sizeof(SearchDecoration)*new_cap);
    g_panes = realloc(g_panes,sizeof(PaneState)*new_cap);
    g_split_handles = realloc(g_split_handles,sizeof(SplitHandle)*new_cap);
    g_change_handlers=realloc(g_change_handlers,sizeof(UIClickHandler)*new_cap);
    g_change_userdata=realloc(g_change_userdata,sizeof(void*)*new_cap);
    g_rects = realloc(g_rects, sizeof(RECT) * new_cap);
    g_buffers = realloc(g_buffers, sizeof(TextBuffer *) * new_cap);
    g_click_handlers = realloc(g_click_handlers, sizeof(UIClickHandler) * new_cap);
    g_click_userdata = realloc(g_click_userdata, sizeof(void *) * new_cap);
    g_rightclick_handlers = realloc(g_rightclick_handlers, sizeof(UIClickHandler) * new_cap);
    g_rightclick_userdata = realloc(g_rightclick_userdata, sizeof(void *) * new_cap);
    g_design_override = realloc(g_design_override, sizeof(char *) * new_cap);
    g_text_override = realloc(g_text_override, sizeof(char *) * new_cap);
    g_color_override = realloc(g_color_override, sizeof(char *) * new_cap);
    g_frame_override = realloc(g_frame_override, sizeof(char *) * new_cap);
    g_scroll_offset = realloc(g_scroll_offset, sizeof(int) * new_cap);
    g_highlight_spans = realloc(g_highlight_spans, sizeof(ResolvedSpan *) * new_cap);
    g_highlight_count = realloc(g_highlight_count, sizeof(int) * new_cap);

    for (int i = g_state_capacity; i < new_cap; i++) {
        RECT empty = {0, 0, 0, 0};
        g_search[i]=(SearchDecoration){0};
        g_panes[i]=(PaneState){0};
        g_change_handlers[i]=NULL;g_change_userdata[i]=NULL;
        g_rects[i] = empty;
        g_buffers[i] = NULL;
        g_click_handlers[i] = NULL;
        g_click_userdata[i] = NULL;
        g_rightclick_handlers[i] = NULL;
        g_rightclick_userdata[i] = NULL;
        g_design_override[i] = NULL;
        g_text_override[i] = NULL;
        g_color_override[i] = NULL;
        g_frame_override[i] = NULL;
        g_scroll_offset[i] = 0;
        g_highlight_spans[i] = NULL;
        g_highlight_count[i] = 0;
    }
    g_state_capacity = new_cap;
}

/* Creates a TextBuffer for every "textarea" in the tree -- walked
 * recursively since there's no more flat array to loop over directly. */
static void init_buffers_rec(Element *elements, int count) {
    for (int i = 0; i < count; i++) {
        if (strcmp(elements[i].type, "textarea") == 0 || strcmp(elements[i].type,"input")==0) {
            g_buffers[elements[i].runtime_id] = textbuffer_create(elements[i].content);
        }
        init_buffers_rec(elements[i].children, elements[i].child_count);
    }
}

static void win32_load(const char *path) {
    if (g_embed_device_index != -1) {
        /* An embedded app's own uiLoad -- attach its tree as real
         * children of the target device element instead of replacing
         * g_elements (which is the HOST's whole UI) or creating a
         * second real window. Extends the SAME g_next_runtime_id
         * counter the host's own elements use, so the shared g_rects/
         * g_buffers/g_click_handlers/etc. arrays can index the child's
         * elements safely alongside the host's with zero collision --
         * see element.h's runtime_id comment for why that's always
         * true of a freshly assigned id regardless of which tree it
         * ends up living in. */
        ElementList child = parse_creal_file(path);
        assign_runtime_ids(child.items, child.count);
        ensure_state_capacity();
        init_buffers_rec(child.items, child.count);
        Element *device_el = element_by_runtime(g_elements.items, g_elements.count, g_embed_device_index);
        if (device_el != NULL) {
            device_el->children = child.items;
            device_el->child_count = child.count;
        }
        return;
    }
    g_elements = parse_creal_file(path);
    scan_for_scene3d(g_elements.items, g_elements.count);
    g_workspace = g_elements.count > 0 && element_attr(&g_elements.items[0], "workspace") != NULL;
    if (g_workspace) {
        /* Render the workspace in physical pixels; retain legacy app scaling. */
        typedef BOOL (WINAPI *SetDpiContext)(HANDLE);
        SetDpiContext set_dpi = (SetDpiContext)(void *)GetProcAddress(GetModuleHandleA("user32.dll"), "SetProcessDpiAwarenessContext");
        if (set_dpi) set_dpi((HANDLE)-4);
        else SetProcessDPIAware();
    }
    assign_runtime_ids(g_elements.items, g_elements.count);
    ensure_state_capacity();
    init_buffers_rec(g_elements.items, g_elements.count);
    remember_positions(g_elements.items,g_elements.count,-1);

    char exe_path[MAX_PATH];
    GetModuleFileNameA(NULL, exe_path, MAX_PATH);
    char *last_slash = strrchr(exe_path, '\\');
    if (last_slash != NULL) *last_slash = '\0';
    char catalog_dir[MAX_PATH + 32];
    snprintf(catalog_dir, sizeof(catalog_dir), "%s\\..\\design\\element", exe_path);
    g_catalog = load_catalog(catalog_dir);

    /* coral.exe links this same file in but lives in a SIBLING project
     * directory (coral-lang\c\), not next to Creal's own design\ folder
     * -- '..\design\element' from there resolves to a nonexistent
     * coral-lang\design\element, silently loading an empty catalog
     * (load_catalog's own behavior on a missing directory, see
     * catalog.c). Falls back to the known sibling layout (device-root\
     * coral-lang and device-root\creal-lang side by side) only when the
     * first lookup found nothing, so standalone creal.exe's own
     * behavior is completely unchanged -- it always finds its designs
     * on the first try and never reaches this fallback. */
    if (g_catalog.count == 0) {
        snprintf(catalog_dir, sizeof(catalog_dir), "%s\\..\\..\\creal-lang\\design\\element", exe_path);
        g_catalog = load_catalog(catalog_dir);
    }

    HINSTANCE hInstance = GetModuleHandle(NULL);
    const char *CLASS_NAME = "CrealWindow";

    WNDCLASSA wc = {0};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    RegisterClassA(&wc);

    g_workspace = g_elements.count > 0 && element_attr(&g_elements.items[0], "workspace") != NULL;
    g_custom_chrome = g_workspace && element_attr(&g_elements.items[0], "chrome") != NULL;
    const char *window_title=g_workspace?element_attr(&g_elements.items[0],"title"):NULL;
    int initial_width=g_workspace?dimension(&g_elements.items[0],"windowwidth",1440):480;
    int initial_height=g_workspace?dimension(&g_elements.items[0],"windowheight",950):640;
    DWORD window_style = g_custom_chrome ? WS_POPUP | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU : WS_OVERLAPPEDWINDOW;
    g_hwnd = CreateWindowExA(
        0, CLASS_NAME, window_title ? window_title : g_workspace ? "Cryptic" : "Creal", window_style,
        CW_USEDEFAULT, CW_USEDEFAULT, initial_width, initial_height,
        NULL, NULL, hInstance, NULL);
    if (g_hwnd == NULL) {
        fprintf(stderr, "could not create the window\n");
        exit(1);
    }

    if (!getenv("CREAL_CAPTURE_HIDDEN")) ShowWindow(g_hwnd, SW_SHOW);
    SetTimer(g_hwnd, CARET_TIMER_ID, 530, NULL);
    if (g_workspace) SetTimer(g_hwnd, 2, 130, NULL);
}

static void win32_set_text(const char *id, const char *value) {
    Element *el = find_element_ptr(g_elements.items, g_elements.count, id);
    if (el == NULL) {
        fprintf(stderr, "no element with id '%s'\n", id);
        exit(1);
    }
    int i = el->runtime_id;
    if (g_buffers[i] != NULL) {
        textbuffer_set_text(g_buffers[i], value);
        g_scroll_offset[i] = element_attr(el,"autoscroll")?100000000:0;
        g_highlight_count[i] = 0;
    } else if (strcmp(el->type, "text") == 0 || strcmp(el->type, "button") == 0) {
        g_text_override[i] = strdup(value);
    } else {
        fprintf(stderr, "element '%s' has no text buffer or label to set\n", id);
        exit(1);
    }
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

static const char *win32_get_text(const char *id) {
    Element *el = find_element_ptr(g_elements.items, g_elements.count, id);
    if (el == NULL) {
        fprintf(stderr, "no element with id '%s'\n", id);
        exit(1);
    }
    int i = el->runtime_id;
    if (g_buffers[i] != NULL) {
        return g_buffers[i]->text;
    }
    if (strcmp(el->type, "text") == 0 || strcmp(el->type, "button") == 0) {
        if (g_text_override[i] != NULL) return g_text_override[i];
        return el->content != NULL ? el->content : "";
    }
    fprintf(stderr, "element '%s' has no text buffer or label to read\n", id);
    exit(1);
}

static void win32_on_click(const char *id, UIClickHandler handler, void *userdata) {
    int i = find_element_by_id(id);
    g_click_handlers[i] = handler;
    g_click_userdata[i] = userdata;
}

static void win32_set_design(const char *id, const char *design_name) {
    int i = find_element_by_id(id);
    g_design_override[i] = strdup(design_name);
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

/* Changes a "text" element's color directly -- a lighter-weight
 * alternative to set_design for when Coral just wants to change one
 * color (e.g. highlighting the selected entry in a file list), without
 * needing a whole catalog design entry. An EMPTY string (not a NULL
 * pointer -- that's reserved for "never touched", see g_color_override's
 * own comment) clears the override, going back to the element's static
 * `color` attribute. */
static void win32_set_color(const char *id, const char *color_name) {
    int i = find_element_by_id(id);
    g_color_override[i] = strdup(color_name);
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

static void win32_set_device_frame(const char *id, const char *frame) {
    int i = find_element_by_id(id);
    g_frame_override[i] = strdup(frame);
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

static void win32_set_embed_target(const char *id) {
    g_embed_device_index = (id != NULL && id[0] != '\0') ? find_element_by_id(id) : -1;
}

/* Fatal if `id` isn't a textarea, unlike set_text/set_color which also
 * accept a plain "text" element -- token-range highlighting only makes
 * sense against a textarea's live buffer (see backend.h). Resolves each
 * span's color NAME to a COLORREF once here (via parse_color), so
 * draw_label_highlighted's per-repaint work is pure drawing, no string
 * comparisons. */
static void win32_set_highlight(const char *id, const HighlightSpan *spans, int count) {
    Element *el = find_element_ptr(g_elements.items, g_elements.count, id);
    if (el == NULL) {
        fprintf(stderr, "no element with id '%s'\n", id);
        exit(1);
    }
    int i = el->runtime_id;
    if (g_buffers[i] == NULL) {
        fprintf(stderr, "element '%s' isn't a textarea, so it has no text to highlight\n", id);
        exit(1);
    }
    ResolvedSpan *resolved = count > 0 ? malloc(sizeof(ResolvedSpan) * count) : NULL;
    for (int k = 0; k < count; k++) {
        resolved[k].start = spans[k].start;
        resolved[k].end = spans[k].end;
        resolved[k].color = parse_color(spans[k].color, RGB(225, 225, 230));
    }
    g_highlight_spans[i] = resolved;
    g_highlight_count[i] = count;
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

/* Looks the element up FIRST (fatal on a miss, same convention as every
 * other by-id backend call) purely to capture its runtime_id before
 * removing it -- needed so g_focused_index/g_pressed/g_hovered (each a
 * single runtime_id, or -1) can be reset if any of them happened to be
 * pointing at the very element just removed. Concretely matters for the
 * exact case this was built for: a tab's own close button removing that
 * tab out from under a click that's still mid-flight on it (WM_LBUTTONUP
 * already unconditionally resets g_pressed right after the click handler
 * returns -- see WndProc -- but g_focused_index/g_hovered have no such
 * unconditional reset, and would otherwise keep referencing a runtime_id
 * that no longer resolves to anything reachable in the tree). */
static void win32_remove_element(const char *id) {
    Element *el = find_element_ptr(g_elements.items, g_elements.count, id);
    if (el == NULL) {
        fprintf(stderr, "no element with id '%s'\n", id);
        exit(1);
    }
    int removed_id = el->runtime_id;
    free(g_search[removed_id].needle);free(g_search[removed_id].path);
    g_search[removed_id]=(SearchDecoration){0};
    remove_element_rec(g_elements.items, &g_elements.count, id);
    if (g_focused_index == removed_id) g_focused_index = -1;
    if (g_pressed == removed_id) g_pressed = -1;
    if (g_hovered == removed_id) g_hovered = -1;
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

/* Appends a brand-new "text" element as the last child of the element
 * whose id matches `container_id` (a "row"/"column" is the sensible
 * target, though nothing enforces that) -- what makes an unbounded file
 * tree (or any other "however many items there turn out to be" list)
 * actually possible from Coral, instead of pre-declaring a fixed number
 * of slots in the .cr file and hoping there are never more items than
 * slots. `container->children` is realloc'd to grow, which is exactly
 * why every OTHER lookup in this file re-resolves an Element* fresh
 * every time (via find_element_ptr) rather than caching one across
 * calls -- a cached pointer into any children array would go stale the
 * moment this function (or another call to it) reallocates that array.
 * The new element gets its own id attribute (so a later uiSetText/
 * uiOnClick/etc. can address it) and the next runtime_id, exactly like
 * every element parsed at load time got one. */
static void win32_add_text(const char *container_id, const char *id, const char *content) {
    Element *container = find_element_ptr(g_elements.items, g_elements.count, container_id);
    if (container == NULL) {
        fprintf(stderr, "no element with id '%s'\n", container_id);
        exit(1);
    }
    container->children = realloc(container->children, sizeof(Element) * (container->child_count + 1));
    Element *child = &container->children[container->child_count];
    memset(child, 0, sizeof(Element));
    child->type = strdup("text");
    child->content = strdup(content);
    child->attrs = malloc(sizeof(Attr) * 4);
    child->attrs[0].key = strdup("id");
    child->attrs[0].value = strdup(id);
    child->attr_count = 1;
    const char *item_height = element_attr(container, "itemheight");
    const char *item_gap = element_attr(container, "itemgap");
    if (item_height) child->attrs[child->attr_count++] = (Attr){strdup("height"), strdup(item_height)};
    if (item_gap) child->attrs[child->attr_count++] = (Attr){strdup("gap"), strdup(item_gap)};
    const char *item_role = element_attr(container, "itemrole");
    if (item_role) child->attrs[child->attr_count++] = (Attr){strdup("role"), strdup(item_role)};
    child->runtime_id = g_next_runtime_id++;
    container->child_count++;
    ensure_state_capacity();
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
}

/* Optional developer capture. Rendering happens on the UI thread into its own
 * DIB, avoiding cross-process HDC ownership problems with hidden windows. */
static void capture_preview_bmp(const char *path) {
    RECT r;GetClientRect(g_hwnd,&r);int w=r.right,h=r.bottom;
    if(w<1||h<1)return;
    BITMAPINFO info={0};info.bmiHeader.biSize=sizeof(BITMAPINFOHEADER);info.bmiHeader.biWidth=w;info.bmiHeader.biHeight=-h;info.bmiHeader.biPlanes=1;info.bmiHeader.biBitCount=32;info.bmiHeader.biCompression=BI_RGB;
    HDC ref=GetDC(g_hwnd),dc=CreateCompatibleDC(ref);void *pixels=NULL;
    HBITMAP bitmap=CreateDIBSection(ref,&info,DIB_RGB_COLORS,&pixels,NULL,0);
    if(!bitmap||!dc){fprintf(stderr,"Creal capture allocation failed\n");exit(1);}
    HGDIOBJ old=SelectObject(dc,bitmap);paint_elements(dc,r);GdiFlush();
    FILE *f=fopen(path,"wb");if(!f){fprintf(stderr,"Creal capture path unavailable\n");exit(1);}
    BITMAPFILEHEADER header={0};header.bfType=0x4d42;header.bfOffBits=sizeof(header)+sizeof(info.bmiHeader);header.bfSize=header.bfOffBits+(DWORD)w*h*4;
    fwrite(&header,sizeof(header),1,f);fwrite(&info.bmiHeader,sizeof(info.bmiHeader),1,f);fwrite(pixels,(size_t)w*h*4,1,f);fclose(f);
    SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);ReleaseDC(g_hwnd,ref);
}
static void win32_run(void) {
    /* An embedded app's own uiRun -- the host's message loop is already
     * pumping (that's literally how we got here, mid-callback, to run
     * this embedded app's top-level script at all), so starting a
     * second nested GetMessage loop here would just freeze everything
     * outside this one app until IT quit, which a real embedded preview
     * must never do. */
    if (g_embed_device_index != -1) return;
    const char *capture_path=getenv("CREAL_CAPTURE_PATH");
    if(capture_path&&*capture_path){capture_preview_bmp(capture_path);DestroyWindow(g_hwnd);return;}
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
}

static const UIBackend WIN32_BACKEND = {
    win32_load,
    win32_set_text,
    win32_get_text,
    win32_on_click,
    win32_set_design,
    win32_add_text,
    win32_set_color,
    win32_set_highlight,
    win32_remove_element,
    win32_run,
    win32_toggle_panel,
    win32_panel_menu,
    win32_set_visible,win32_is_visible,win32_on_change,win32_go_to_line,win32_toggle_rail,win32_toggle_moving,
    win32_scroll_tabs,win32_reveal_tab,win32_set_match,win32_set_search_result,win32_on_tick,
    win32_on_right_click,win32_show_menu,win32_show_confirm,win32_show_prompt,win32_modal_input_text,
    win32_set_device_frame,
    win32_set_embed_target,
    win32_start_web_server,
};

const UIBackend *win32_backend(void) {
    return &WIN32_BACKEND;
}
