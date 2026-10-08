/* The full desktop-build builtin table (see vm.h's own comment on why
 * call_builtin lives in a platform-specific file, not vm.c itself) --
 * file I/O, JSON, async native jobs, and Creal's full ui* window-backend
 * surface. The much smaller xenos-os counterpart is
 * vm_builtins_xenos.c -- see that file's own comment for why it can't
 * just be this same file with a few things missing (no libc, no Win32,
 * no Creal). Builtin ids here must stay in sync with compiler.c's
 * builtin_id -- that table is shared across every platform, since a
 * name resolving at compile time doesn't mean it does anything at
 * runtime on every platform (see vm.h's own note on that). */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include <direct.h> /* _mkdir/_rmdir -- see c/builtins.c's own comment on why */

#include "../../creal-lang/c/backend.h"
#include "../../creal-lang/c/scene3d.h"
#include "../c/dirlist.h"
#include "../c/json_value.h"
#include "../c/lexer.h"
#include "../c/native_jobs.h"
#include "../c/parser.h"
#include "../c/project_search.h"
#include "../c/value.h"
#include "compiler.h"
#include "memory.h"
#include "vm.h"

/* Mirrors c/builtins.c's own delete_recursive exactly (that one's static,
 * not exported) -- recursively deletes everything inside `path` before
 * removing `path` itself, built on the same list_dir() listDir() uses. */
static int delete_recursive(const char *path) {
    DirEntries entries = list_dir(path);
    if (entries.count < 0) return remove(path) == 0;
    int ok = 1;
    for (int i = 0; i < entries.count; i++) {
        char child[1024];
        snprintf(child, sizeof(child), "%s/%s", path, entries.entries[i].name);
        if (!delete_recursive(child)) ok = 0;
    }
    if (ok && _rmdir(path) != 0) ok = 0;
    return ok;
}

/* Mirrors c/builtins.c's own token_category_name exactly (that one's
 * static, not exported) -- the short, highlighter-friendly category for
 * a token that builtin "tokenize" groups every keyword/operator/
 * punctuation TokenType down into. */
static const char *token_category_name(TokenType type) {
    switch (type) {
        case TOK_NUMBER: return "number";
        case TOK_STRING: return "string";
        case TOK_IDENT: return "identifier";
        case TOK_COMMENT: return "comment";
        case TOK_EQEQ: case TOK_NEQ: case TOK_LE: case TOK_GE: case TOK_EQ:
        case TOK_LT: case TOK_GT: case TOK_PLUS: case TOK_MINUS:
        case TOK_STAR: case TOK_SLASH:
            return "operator";
        case TOK_LPAREN: case TOK_RPAREN: case TOK_LBRACKET: case TOK_RBRACKET:
        case TOK_LBRACE: case TOK_RBRACE: case TOK_DOT: case TOK_COMMA:
        case TOK_COLON:
            return "punctuation";
        case TOK_EOF:
            return "eof";
        default:
            return "keyword";
    }
}

/* Bundles what a ui* callback trampoline needs once win32_backend.c fires
 * it, deep inside its own message loop with no VM call frame anywhere on
 * the C stack -- the owning VM itself (still alive the whole time, since
 * uiRun's call_builtin case is itself a frame further down that same
 * stack, blocked inside win32_backend()->run()), the callback's resolved
 * func_index (looked up by name once, at registration time, via
 * chunk_find_function -- not a runtime function VALUE, since this VM
 * never has one; see README.md's own note on why that's fine here), the
 * one string argument every UIClickHandler-shaped callback gets (an
 * element id for click/change, "" for confirm/prompt/tick, matching
 * c/builtins.c's own ClickBinding/run_click_binding exactly), and a line
 * number purely for error messages. Leaked deliberately, matching this
 * project's "never free anything" model for this kind of long-lived
 * registration -- same as c/builtins.c's own ClickBinding. */
typedef struct {
    VM *vm;
    int func_index;
    char *arg;
    int line;
} VmCallback;

static void run_vm_callback(void *userdata) {
    VmCallback *cb = (VmCallback *)userdata;
    Value arg = string_value(strdup(cb->arg));
    Value result = call_function(cb->vm, cb->func_index, &arg, 1, cb->line);
    release(result); /* discarded -- matches run_click_binding's own callback-return-value handling */
}

static int resolve_callback(VM *vm, const char *name, int line) {
    int index = chunk_find_function(vm->root, name);
    if (index == -1) {
        runtime_error(line, "'%s' isn't a function, so it can't be used as a callback", name);
    }
    return index;
}

static VmCallback *make_callback(VM *vm, int func_index, const char *arg, int line) {
    VmCallback *cb = malloc(sizeof(VmCallback));
    cb->vm = vm;
    cb->func_index = func_index;
    cb->arg = strdup(arg);
    cb->line = line;
    return cb;
}

/* scene3dOnTick's counterpart to VmCallback/run_vm_callback above: a
 * Scene3DTickHandler (scene3d.h) takes a float dt instead of
 * UIClickHandler's no-argument shape, so it gets its own lean callback
 * struct (no string arg -- there's nothing for a per-frame tick to pass
 * besides dt) and its own trampoline, matching scene3d_gl.c's call site
 * exactly (`g_tickHandler(g_tickUserdata, dt)`). */
typedef struct {
    VM *vm;
    int func_index;
    int line;
} TickCallback;

static void run_vm_tick_callback(void *userdata, float dt) {
    TickCallback *cb = (TickCallback *)userdata;
    Value arg = number_value(dt);
    Value result = call_function(cb->vm, cb->func_index, &arg, 1, cb->line);
    release(result);
}

Value call_builtin(VM *vm, unsigned char id, Value *args, int argc, int line) {
    (void)argc;
    switch (id) {
        case 0: /* length */
            if (args[0].type == VAL_ARRAY) {
                int n = args[0].as.array->count;
                release(args[0]);
                return number_value(n);
            }
            if (args[0].type == VAL_STRING) return number_value((double)strlen(args[0].as.string));
            runtime_error(line, "'length' only works on an array or a string");
        case 1: /* append(arr, value) -- value transfers into arr, not released */
            if (args[0].type != VAL_ARRAY) {
                runtime_error(line, "'append' needs an array as its first argument");
            }
            array_push(args[0].as.array, args[1]);
            release(args[0]);
            return nil_value();
        case 2: { /* randomInt(n) */
            if (args[0].type != VAL_NUMBER) {
                runtime_error(line, "'randomInt' needs a number here");
            }
            int n = (int)args[0].as.number;
            if (n < 1) {
                runtime_error(line, "'randomInt' needs a positive number here");
            }
            static int seeded = 0;
            if (!seeded) {
                srand((unsigned)time(NULL));
                seeded = 1;
            }
            return number_value(rand() % n + 1);
        }
        case 3: { /* substring(s, start, end) -- end exclusive */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'substring' needs a string here");
            }
            if (args[1].type != VAL_NUMBER || args[2].type != VAL_NUMBER) {
                runtime_error(line, "'substring' needs numbers for start and end");
            }
            int len = (int)strlen(args[0].as.string);
            int start = (int)args[1].as.number;
            int end = (int)args[2].as.number;
            if (start < 0 || end > len || start > end) {
                runtime_error(line, "substring(%d, %d) is out of range for a string of length %d", start, end, len);
            }
            int n = end - start;
            char *out = malloc((size_t)n + 1);
            memcpy(out, args[0].as.string + start, (size_t)n);
            out[n] = '\0';
            return string_value(out);
        }
        case 4: { /* indexOf(haystack, needle) -> 1-based position, 0 if not found */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'indexOf' needs two strings here");
            }
            if (args[1].as.string[0] == '\0') {
                return number_value(1);
            }
            const char *found = strstr(args[0].as.string, args[1].as.string);
            if (found == NULL) {
                return number_value(0);
            }
            return number_value((double)(found - args[0].as.string) + 1);
        }
        case 5: { /* ask(prompt) -- prompt is optional (argc 0 or 1) */
            if (argc == 1) {
                char *s = to_display_string(args[0]);
                fputs(s, stdout);
                free(s);
                fflush(stdout);
            }
            size_t cap = 128, len = 0;
            char *buf = malloc(cap);
            int c;
            while ((c = fgetc(stdin)) != EOF && c != '\n') {
                if (len + 1 >= cap) {
                    cap *= 2;
                    buf = realloc(buf, cap);
                }
                buf[len++] = (char)c;
            }
            buf[len] = '\0';
            if (len > 0 && buf[len - 1] == '\r') buf[--len] = '\0';

            char *start = buf;
            while (*start == ' ' || *start == '\t') start++;
            char *end = buf + len;
            while (end > start && (end[-1] == ' ' || end[-1] == '\t')) end--;
            *end = '\0';

            if (start < end) {
                char *endptr;
                double n = strtod(start, &endptr);
                if (endptr == end) {
                    free(buf);
                    return number_value(n);
                }
            }
            Value result = string_value(strdup(start));
            free(buf);
            return result;
        }
        case 6: { /* readFile(path) -> whole file as a string */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'readFile' needs a string path here");
            }
            FILE *f = fopen(args[0].as.string, "rb");
            if (f == NULL) {
                runtime_error(line, "couldn't open '%s' to read it", args[0].as.string);
            }
            fseek(f, 0, SEEK_END);
            long size = ftell(f);
            fseek(f, 0, SEEK_SET);
            char *buf = malloc((size_t)size + 1);
            size_t got = fread(buf, 1, (size_t)size, f);
            buf[got] = '\0';
            fclose(f);
            return string_value(buf);
        }
        case 7: { /* writeFile(path, content) -> nil, always overwrites */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'writeFile' needs a string path here");
            }
            if (args[1].type != VAL_STRING) {
                runtime_error(line, "'writeFile' needs string content here");
            }
            FILE *f = fopen(args[0].as.string, "wb");
            if (f == NULL) {
                runtime_error(line, "couldn't open '%s' to write it", args[0].as.string);
            }
            fwrite(args[1].as.string, 1, strlen(args[1].as.string), f);
            fclose(f);
            return nil_value();
        }
        case 8: { /* listDir(path) -> array of [name: "...", isDir: true|false] */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'listDir' needs a string path here");
            }
            DirEntries entries = list_dir(args[0].as.string);
            if (entries.count < 0) {
                runtime_error(line, "couldn't open directory '%s'", args[0].as.string);
            }
            ArrayObj *result = array_new();
            for (int i = 0; i < entries.count; i++) {
                ObjectObj *obj = object_new();
                object_set(obj, "name", string_value(entries.entries[i].name));
                object_set(obj, "isDir", bool_value(entries.entries[i].is_dir));
                array_push(result, object_value(obj));
            }
            return array_value(result);
        }
        case 9: /* deleteFile(path) -> true/false; not fatal on failure */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'deleteFile' needs a string path here");
            }
            return bool_value(delete_recursive(args[0].as.string));
        case 10: /* renameFile(oldPath, newPath) -> true/false */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'renameFile' needs two string paths: the old one, then the new one");
            }
            return bool_value(rename(args[0].as.string, args[1].as.string) == 0);
        case 11: /* makeDir(path) -> true/false */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'makeDir' needs a string path here");
            }
            return bool_value(_mkdir(args[0].as.string) == 0);
        case 12: { /* jsonEncode(value) -> string, fatal if unencodable */
            char *s = json_encode(args[0]);
            release(args[0]);
            if (s == NULL) {
                runtime_error(line, "Value cannot be encoded as bounded JSON");
            }
            return string_value(s);
        }
        case 13: { /* jsonDecode(text) -> [ok: bool, value: ..., error: string] */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "jsonDecode needs a string");
            }
            Value value;
            char error[256];
            int ok = json_decode(args[0].as.string, &value, error, sizeof(error));
            release(args[0]);
            ObjectObj *r = object_new();
            object_set(r, "ok", bool_value(ok));
            object_set(r, "value", value);
            object_set(r, "error", string_value(strdup(error)));
            return object_value(r);
        }
        case 14: { /* field(obj, name) -> obj's field, or nil if missing/not an object */
            if (args[0].type != VAL_OBJECT || args[1].type != VAL_STRING) {
                release(args[0]);
                return nil_value();
            }
            Value *v = object_get(args[0].as.object, args[1].as.string);
            Value result = v != NULL ? *v : nil_value();
            retain(result); /* a new, independent copy of the object's own owned field */
            release(args[0]);
            return result;
        }
        case 15: { /* kindOf(x) -> "nil"/"bool"/"number"/"string"/"function"/"array"/"object" */
            static const char *names[] = {"nil", "bool", "number", "string", "function", "array", "object"};
            const char *name = names[args[0].type];
            release(args[0]);
            return string_value(strdup(name));
        }
        case 16: { /* uriEncode(text) -> percent-encoded string */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "uriEncode needs text");
            }
            const unsigned char *s = (unsigned char *)args[0].as.string;
            char *out = malloc(strlen((char *)s) * 3 + 1);
            char *p = out;
            for (; *s; s++) {
                if ((*s >= 'a' && *s <= 'z') || (*s >= 'A' && *s <= 'Z') || (*s >= '0' && *s <= '9') || strchr("-_.~", *s)) {
                    *p++ = (char)*s;
                } else {
                    sprintf(p, "%%%02X", *s);
                    p += 3;
                }
            }
            *p = 0;
            return string_value(out);
        }
        case 17: { /* runCommand(cmd) -> [exitCode: number, output: string] */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'run' needs a string command here");
            }
            FILE *pipe = _popen(args[0].as.string, "r");
            if (pipe == NULL) {
                runtime_error(line, "couldn't run '%s'", args[0].as.string);
            }
            size_t cap = 256, len = 0;
            char *output = malloc(cap);
            output[0] = '\0';
            char buf[256];
            while (fgets(buf, sizeof(buf), pipe) != NULL) {
                size_t buf_len = strlen(buf);
                if (len + buf_len + 1 > cap) {
                    while (len + buf_len + 1 > cap) cap *= 2;
                    output = realloc(output, cap);
                }
                memcpy(output + len, buf, buf_len + 1);
                len += buf_len;
            }
            int exit_code = _pclose(pipe);
            ObjectObj *result = object_new();
            object_set(result, "exitCode", number_value(exit_code));
            object_set(result, "output", string_value(output));
            return object_value(result);
        }
        case 18: { /* tokenize(source) -> array of [type, text, line, start, end] */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'tokenize' needs a string here");
            }
            TokenList tokens = lex_with_comments(args[0].as.string);
            ArrayObj *result = array_new();
            for (int i = 0; i < tokens.count; i++) {
                Token *t = &tokens.items[i];
                if (t->type == TOK_EOF) break;
                const char *text = (t->type == TOK_STRING) ? t->string : t->text;
                ObjectObj *obj = object_new();
                object_set(obj, "type", string_value(strdup(token_category_name(t->type))));
                object_set(obj, "text", string_value(strdup(text != NULL ? text : "")));
                object_set(obj, "line", number_value(t->line));
                object_set(obj, "start", number_value(t->start + 1));
                object_set(obj, "end", number_value(t->start + t->length));
                array_push(result, object_value(obj));
            }
            return array_value(result);
        }
        case 19: /* samePath(a, b) -> true/false, same file even via different paths */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "samePath needs two paths");
            }
            return bool_value(native_same_path(args[0].as.string, args[1].as.string));
        case 20: /* nativeStart(kind, options) -> starts an async job, returns its handle */
            if (args[0].type != VAL_STRING || args[1].type != VAL_OBJECT) {
                runtime_error(line, "nativeStart needs a kind and options object");
            }
            return native_start(args[0].as.string, args[1]);
        case 21: /* nativePoll(id) -> that job's current status/result */
            if (args[0].type != VAL_NUMBER) {
                runtime_error(line, "nativePoll needs a job id");
            }
            return native_poll((int)args[0].as.number);
        case 22: /* nativeCancel(id) -> nil */
            if (args[0].type != VAL_NUMBER) {
                runtime_error(line, "nativeCancel needs a job id");
            }
            native_cancel((int)args[0].as.number);
            return nil_value();

        case 23: /* uiLoad(path) -> nil */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'uiLoad' needs a string path here");
            }
            win32_backend()->load(args[0].as.string);
            return nil_value();
        case 24: /* uiSetText(id, text) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiSetText' needs two strings here: an element id, then the new text");
            }
            win32_backend()->set_text(args[0].as.string, args[1].as.string);
            return nil_value();
        case 25: /* uiGetText(id) -> string, copied immediately (backend's pointer is short-lived) */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'uiGetText' needs a string id here");
            }
            return string_value(strdup(win32_backend()->get_text(args[0].as.string)));
        case 26: /* uiSetDesign(id, designName) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiSetDesign' needs two strings here: an element id, then a design name");
            }
            win32_backend()->set_design(args[0].as.string, args[1].as.string);
            return nil_value();
        case 27: /* uiSetColor(id, colorName) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiSetColor' needs two strings here: an element id, then a color name (or \"\" to reset)");
            }
            win32_backend()->set_color(args[0].as.string, args[1].as.string);
            return nil_value();
        case 28: /* uiSetDeviceFrame(id, frame) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiSetDeviceFrame' needs two strings here: an element id, then \"phone\", \"web\", or \"desktop\"");
            }
            win32_backend()->set_device_frame(args[0].as.string, args[1].as.string);
            return nil_value();
        case 29: /* uiAddText(containerId, id, content) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING || args[2].type != VAL_STRING) {
                runtime_error(line, "'uiAddText' needs three strings here: a container id, a new id, then the text content");
            }
            win32_backend()->add_text(args[0].as.string, args[1].as.string, args[2].as.string);
            return nil_value();
        case 30: /* uiRemoveElement(id) -> nil */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'uiRemoveElement' needs a string element id here");
            }
            win32_backend()->remove_element(args[0].as.string);
            return nil_value();
        case 31: { /* uiSetHighlight(id, spans) -> nil; spans: array of [start, end, color] objects */
            if (args[0].type != VAL_STRING || args[1].type != VAL_ARRAY) {
                runtime_error(line, "'uiSetHighlight' needs a string id, then an array of [start, end, color] objects");
            }
            ArrayObj *spans_arr = args[1].as.array;
            HighlightSpan *spans = spans_arr->count > 0 ? malloc(sizeof(HighlightSpan) * (size_t)spans_arr->count) : NULL;
            for (int i = 0; i < spans_arr->count; i++) {
                Value item = spans_arr->items[i];
                if (item.type != VAL_OBJECT) {
                    runtime_error(line, "'uiSetHighlight' needs each span to be a [start, end, color] object");
                }
                Value *start = object_get(item.as.object, "start");
                Value *end = object_get(item.as.object, "end");
                Value *color = object_get(item.as.object, "color");
                if (start == NULL || end == NULL || color == NULL ||
                    start->type != VAL_NUMBER || end->type != VAL_NUMBER || color->type != VAL_STRING) {
                    runtime_error(line, "'uiSetHighlight' needs each span to have a numeric start/end and a string color");
                }
                spans[i].start = (int)start->as.number;
                spans[i].end = (int)end->as.number;
                spans[i].color = color->as.string;
            }
            win32_backend()->set_highlight(args[0].as.string, spans, spans_arr->count);
            free(spans);
            release(args[1]);
            return nil_value();
        }
        case 32: /* uiTogglePanel(id) -> nil */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'uiTogglePanel' needs a panel id string");
            }
            win32_backend()->toggle_panel(args[0].as.string);
            return nil_value();
        case 33: /* uiPanelMenu(anchorId) -> nil */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'uiPanelMenu' needs an anchor id string");
            }
            win32_backend()->panel_menu(args[0].as.string);
            return nil_value();
        case 34: /* uiSetVisible(id, visible) -> nil */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "uiSetVisible needs an element id");
            }
            win32_backend()->set_visible(args[0].as.string, is_truthy(args[1]));
            return nil_value();
        case 35: /* uiIsVisible(id) -> bool */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "uiIsVisible needs an element id");
            }
            return bool_value(win32_backend()->is_visible(args[0].as.string));
        case 36: { /* uiGoToLine(id, line) -> nil, clamped to [1, 1000000] */
            if (args[0].type != VAL_STRING || args[1].type != VAL_NUMBER) {
                runtime_error(line, "uiGoToLine needs an id and line number");
            }
            int go_line = args[1].as.number < 1 ? 1 : args[1].as.number > 1000000 ? 1000000 : (int)args[1].as.number;
            win32_backend()->go_to_line(args[0].as.string, go_line);
            return nil_value();
        }
        case 37: /* uiToggleRail() -> bool */
            return bool_value(win32_backend()->toggle_rail());
        case 38: /* uiToggleMoving() -> bool */
            return bool_value(win32_backend()->toggle_moving());
        case 39: { /* uiScrollTabs(id, delta) -> nil, delta clamped to [-10000, 10000] */
            if (args[0].type != VAL_STRING || args[1].type != VAL_NUMBER) {
                runtime_error(line, "uiScrollTabs needs id and distance");
            }
            double d = args[1].as.number;
            if (d > 10000) d = 10000;
            if (d < -10000) d = -10000;
            win32_backend()->scroll_tabs(args[0].as.string, (int)d);
            return nil_value();
        }
        case 40: /* uiRevealTab(id) -> nil */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "uiRevealTab needs id");
            }
            win32_backend()->reveal_tab(args[0].as.string);
            return nil_value();
        case 41: /* uiSetMatch(id, query) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "uiSetMatch needs id and query");
            }
            win32_backend()->set_match(args[0].as.string, args[1].as.string);
            return nil_value();
        case 42: { /* uiSetSearchResult(id, path, line, term) -> nil, line clamped to [0, 1000000] */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING || args[2].type != VAL_NUMBER || args[3].type != VAL_STRING) {
                runtime_error(line, "uiSetSearchResult needs id, path, line and term");
            }
            double result_line = args[2].as.number;
            if (result_line < 0) result_line = 0;
            if (result_line > 1000000) result_line = 1000000;
            win32_backend()->set_search_result(args[0].as.string, args[1].as.string, (int)result_line, args[3].as.string);
            return nil_value();
        }
        case 43: /* uiSetClipboardText(text) -> bool */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'uiSetClipboardText' needs a string");
            }
            return bool_value(clipboard_set_text(args[0].as.string));
        case 44: /* registerCccProtocol() -> bool, not fatal on failure */
            return bool_value(register_ccc_protocol());
        case 45: /* uiStartWebServer(port, rootDeviceId) -> nil */
            if (args[0].type != VAL_NUMBER || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiStartWebServer' needs a port number, then a device element id (or \"\" for the top-level app)");
            }
            win32_backend()->start_web_server((int)args[0].as.number, args[1].as.string);
            return nil_value();
        case 46: { /* searchProject(root, query) -> [exact, suggested, limited, files] */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "searchProject needs a root and query string");
            }
            SearchResult result = project_search(args[0].as.string, args[1].as.string);
            ObjectObj *object = object_new();
            ArrayObj *exact = array_new();
            for (int i = 0; i < result.exact_count; i++) {
                ObjectObj *hit = object_new();
                object_set(hit, "path", string_value(strdup(result.exact[i].path)));
                object_set(hit, "text", string_value(strdup(result.exact[i].text)));
                object_set(hit, "term", string_value(strdup(result.exact[i].term)));
                object_set(hit, "line", number_value(result.exact[i].line));
                object_set(hit, "score", number_value(result.exact[i].score));
                array_push(exact, object_value(hit));
            }
            ArrayObj *suggested = array_new();
            for (int i = 0; i < result.suggested_count; i++) {
                ObjectObj *hit = object_new();
                object_set(hit, "path", string_value(strdup(result.suggested[i].path)));
                object_set(hit, "text", string_value(strdup(result.suggested[i].text)));
                object_set(hit, "term", string_value(strdup(result.suggested[i].term)));
                object_set(hit, "line", number_value(result.suggested[i].line));
                object_set(hit, "score", number_value(result.suggested[i].score));
                array_push(suggested, object_value(hit));
            }
            object_set(object, "exact", array_value(exact));
            object_set(object, "suggested", array_value(suggested));
            object_set(object, "limited", bool_value(result.limited));
            object_set(object, "files", number_value(result.files));
            free_search_result(&result);
            return object_value(object);
        }
        case 47: { /* uiShowMenu(labels) -> 1-based chosen index, 0 for none */
            if (args[0].type != VAL_ARRAY) {
                runtime_error(line, "'uiShowMenu' needs an array of label strings");
            }
            ArrayObj *arr = args[0].as.array;
            const char **labels = arr->count > 0 ? malloc(sizeof(char *) * (size_t)arr->count) : NULL;
            for (int i = 0; i < arr->count; i++) {
                if (arr->items[i].type != VAL_STRING) {
                    runtime_error(line, "'uiShowMenu' needs every label to be a string");
                }
                labels[i] = arr->items[i].as.string;
            }
            int chosen = win32_backend()->show_menu(labels, arr->count);
            free(labels);
            release(args[0]);
            return number_value(chosen);
        }
        case 48: /* uiModalInputText() -> string, only meaningful inside an uiShowPrompt onOk callback */
            return string_value(strdup(win32_backend()->modal_input_text()));
        case 49: /* uiOnClick(id, fnName) -> nil; fnName resolved to a func_index once, here */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiOnClick' needs a string element id, then the callback's function name as a string, e.g. uiOnClick(\"saveBtn\", \"onSave\")");
            }
            win32_backend()->on_click(args[0].as.string, run_vm_callback,
                make_callback(vm, resolve_callback(vm, args[1].as.string, line), args[0].as.string, line));
            return nil_value();
        case 50: /* uiOnRightClick(id, fnName) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiOnRightClick' needs a string element id, then the callback's function name as a string, e.g. uiOnRightClick(\"file1\", \"onFileMenu\")");
            }
            win32_backend()->on_right_click(args[0].as.string, run_vm_callback,
                make_callback(vm, resolve_callback(vm, args[1].as.string, line), args[0].as.string, line));
            return nil_value();
        case 51: /* uiOnChange(id, fnName) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiOnChange' needs a string element id, then the callback's function name as a string, e.g. uiOnChange(\"saveBtn\", \"onSave\")");
            }
            win32_backend()->on_change(args[0].as.string, run_vm_callback,
                make_callback(vm, resolve_callback(vm, args[1].as.string, line), args[0].as.string, line));
            return nil_value();
        case 52: /* uiShowConfirm(message, onYesFnName, onNoFnName) -> nil; callback's one arg is "" */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING || args[2].type != VAL_STRING) {
                runtime_error(line, "'uiShowConfirm' needs a string message, then two function-name strings: onYes, then onNo");
            }
            win32_backend()->show_confirm(args[0].as.string,
                run_vm_callback, make_callback(vm, resolve_callback(vm, args[1].as.string, line), "", line),
                run_vm_callback, make_callback(vm, resolve_callback(vm, args[2].as.string, line), "", line));
            return nil_value();
        case 53: /* uiShowPrompt(message, initial, onOkFnName, onCancelFnName) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING || args[2].type != VAL_STRING || args[3].type != VAL_STRING) {
                runtime_error(line, "'uiShowPrompt' needs two strings (message, initial value), then two function-name strings: onOk, then onCancel");
            }
            win32_backend()->show_prompt(args[0].as.string, args[1].as.string,
                run_vm_callback, make_callback(vm, resolve_callback(vm, args[2].as.string, line), "", line),
                run_vm_callback, make_callback(vm, resolve_callback(vm, args[3].as.string, line), "", line));
            return nil_value();
        case 54: /* uiOnTick(fnName, milliseconds) -> nil; callback's one arg is "" */
            if (args[0].type != VAL_STRING || args[1].type != VAL_NUMBER) {
                runtime_error(line, "uiOnTick needs a callback name and interval");
            }
            win32_backend()->on_tick(run_vm_callback,
                make_callback(vm, resolve_callback(vm, args[0].as.string, line), "", line), (int)args[1].as.number);
            return nil_value();
        case 55: /* uiRun() -> nil; blocks pumping the event loop until the window closes */
            win32_backend()->run();
            native_shutdown();
            return nil_value();

        case 56: { /* include(path) -> nil; compiles+runs path's top level
                     * into THIS VM's own globals, registering any [.task]s
                     * it declares into the shared (root) function table --
                     * see compiler.c's compile_into. Mirrors c/builtins.c's
                     * own include (parse + run_repl_chunk against the same
                     * persistent g_globals), just via compiled bytecode
                     * instead of handing the included script to a second,
                     * separate tree-walking pass. */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'include' needs a string path here");
            }
            FILE *f = fopen(args[0].as.string, "rb");
            if (f == NULL) {
                runtime_error(line, "couldn't open '%s' to read it", args[0].as.string);
            }
            fseek(f, 0, SEEK_END);
            long size = ftell(f);
            fseek(f, 0, SEEK_SET);
            char *source = malloc((size_t)size + 1);
            size_t got = fread(source, 1, (size_t)size, f);
            source[got] = '\0';
            fclose(f);
            release(args[0]);

            NodeList program = parse_program(lex(source));
            Chunk *target = malloc(sizeof(Chunk));
            chunk_init(target);
            compile_into(program, vm->root, target);

            Env *saved_env = vm->current_env;
            vm->current_env = vm->globals;
            Value result = run(vm, target);
            vm->current_env = saved_env;
            release(result);
            return nil_value();
        }

        case 57: { /* uiEmbedApp(deviceId, path) -> nil; runs an ISOLATED
                     * second program (its own globals, its own function
                     * table, its own stack -- a totally separate VM, not
                     * sharing anything with the one running this call)
                     * whose uiAddText/uiSetText (etc.) calls land inside the
                     * device element `deviceId` instead of a new window,
                     * via win32_backend()'s set_embed_target. Mirrors
                     * c/builtins.c's own uiEmbedApp (which runs the
                     * embedded script through run_program_isolated, a
                     * fresh child Env, on the SAME tree-walker); here it's
                     * a fresh VM instead, since "isolated" for a bytecode
                     * VM means its own function table too, not just its
                     * own variables. */
            if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
                runtime_error(line, "'uiEmbedApp' needs two strings here: a device element id, then a path to the app's .co file");
            }
            const char *device_id = args[0].as.string;
            const char *co_path = args[1].as.string;

            char dir[1024], base[1024];
            const char *last_slash = strrchr(co_path, '/');
            const char *last_backslash = strrchr(co_path, '\\');
            if (last_backslash != NULL && (last_slash == NULL || last_backslash > last_slash)) last_slash = last_backslash;
            if (last_slash != NULL) {
                size_t dir_len = (size_t)(last_slash - co_path);
                memcpy(dir, co_path, dir_len);
                dir[dir_len] = '\0';
                snprintf(base, sizeof(base), "%s", last_slash + 1);
            } else {
                snprintf(dir, sizeof(dir), ".");
                snprintf(base, sizeof(base), "%s", co_path);
            }

            char saved_cwd[1024];
            if (_getcwd(saved_cwd, sizeof(saved_cwd)) == NULL) {
                runtime_error(line, "'uiEmbedApp' couldn't read the current directory");
            }
            if (_chdir(dir) != 0) {
                runtime_error(line, "'uiEmbedApp' couldn't find the directory for '%s'", co_path);
            }

            FILE *f = fopen(base, "rb");
            if (f == NULL) {
                _chdir(saved_cwd);
                runtime_error(line, "'uiEmbedApp' couldn't open '%s'", co_path);
            }
            fseek(f, 0, SEEK_END);
            long size = ftell(f);
            rewind(f);
            char *source = malloc((size_t)size + 1);
            fread(source, 1, (size_t)size, f);
            source[size] = '\0';
            fclose(f);

            /* Same leading "#web"/"#app"/"#desktop" platform-tag skip as
             * c/builtins.c's own uiEmbedApp -- metadata for the HOST to
             * read as plain text, never something the embedded script
             * itself should try to parse (Coral's lexer has no '#'
             * syntax at all). */
            char *program_source = source;
            if (program_source[0] == '#') {
                char *newline = strchr(program_source, '\n');
                program_source = (newline != NULL) ? newline + 1 : program_source + strlen(program_source);
            }

            win32_backend()->set_embed_target(device_id);
            NodeList program = parse_program(lex(program_source));
            Chunk *sub_root = malloc(sizeof(Chunk));
            chunk_init(sub_root);
            compile(program, sub_root);

            VM sub_vm;
            sub_vm.stack_top = 0;
            sub_vm.globals = env_new(NULL);
            sub_vm.current_env = sub_vm.globals;
            sub_vm.root = sub_root;
            release(run(&sub_vm, sub_root));
            win32_backend()->set_embed_target("");
            _chdir(saved_cwd);
            return nil_value();
        }

        /* scene3d* -- Coral's binding to Scene3D (creal-lang/c/scene3d.h),
         * the 3D counterpart to the ui* cases above's UIBackend binding.
         * Every number argument comes through as a C double (VAL_NUMBER)
         * and gets narrowed to float/int here -- scene3d.h's own float
         * signatures are a GL-pipeline convention, not something Coral
         * callers need to think about. */
        case 66: /* scene3dInit(title, width, height) -> nil */
            if (args[0].type != VAL_STRING || args[1].type != VAL_NUMBER || args[2].type != VAL_NUMBER) {
                runtime_error(line, "'scene3dInit' needs a string title, then width and height numbers");
            }
            scene3d_backend()->init(args[0].as.string, (int)args[1].as.number, (int)args[2].as.number);
            return nil_value();
        case 67: /* scene3dLoadMesh(objPath) -> mesh id (number) */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'scene3dLoadMesh' needs a string .obj path");
            }
            return number_value(scene3d_backend()->load_mesh(args[0].as.string));
        case 68: /* scene3dLoadTexture(bmpPath) -> texture id (number) */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'scene3dLoadTexture' needs a string .bmp path");
            }
            return number_value(scene3d_backend()->load_texture(args[0].as.string));
        case 69: /* scene3dSpawn(meshId, x, y, z, sx, sy, sz, r, g, b) -> object id (number); sx/sy/sz are PER-AXIS scale, not uniform */
            for (int i = 0; i < 10; i++) if (args[i].type != VAL_NUMBER) {
                runtime_error(line, "'scene3dSpawn' needs 10 numbers: meshId, x, y, z, sx, sy, sz, r, g, b");
            }
            return number_value(scene3d_backend()->spawn((int)args[0].as.number, (float)args[1].as.number, (float)args[2].as.number, (float)args[3].as.number,
                (float)args[4].as.number, (float)args[5].as.number, (float)args[6].as.number, (float)args[7].as.number, (float)args[8].as.number, (float)args[9].as.number));
        case 70: /* scene3dSetTransform(objectId, x, y, z, sx, sy, sz, yaw) -> nil */
            for (int i = 0; i < 8; i++) if (args[i].type != VAL_NUMBER) {
                runtime_error(line, "'scene3dSetTransform' needs 8 numbers: objectId, x, y, z, sx, sy, sz, yaw");
            }
            scene3d_backend()->set_transform((int)args[0].as.number, (float)args[1].as.number, (float)args[2].as.number, (float)args[3].as.number,
                (float)args[4].as.number, (float)args[5].as.number, (float)args[6].as.number, (float)args[7].as.number);
            return nil_value();
        case 71: /* scene3dSetTexture(objectId, textureId) -> nil; textureId -1 clears back to flat color */
            if (args[0].type != VAL_NUMBER || args[1].type != VAL_NUMBER) {
                runtime_error(line, "'scene3dSetTexture' needs two numbers: objectId, textureId");
            }
            scene3d_backend()->set_texture((int)args[0].as.number, (int)args[1].as.number);
            return nil_value();
        case 72: /* scene3dSetCamera(x, y, z, yaw, pitch) -> nil */
            for (int i = 0; i < 5; i++) if (args[i].type != VAL_NUMBER) {
                runtime_error(line, "'scene3dSetCamera' needs 5 numbers: x, y, z, yaw, pitch");
            }
            scene3d_backend()->set_camera((float)args[0].as.number, (float)args[1].as.number, (float)args[2].as.number, (float)args[3].as.number, (float)args[4].as.number);
            return nil_value();
        case 73: /* scene3dSetLightDir(x, y, z) -> nil */
            if (args[0].type != VAL_NUMBER || args[1].type != VAL_NUMBER || args[2].type != VAL_NUMBER) {
                runtime_error(line, "'scene3dSetLightDir' needs 3 numbers: x, y, z");
            }
            scene3d_backend()->set_light_dir((float)args[0].as.number, (float)args[1].as.number, (float)args[2].as.number);
            return nil_value();
        case 74: /* scene3dRun() -> nil; blocks rendering (free WASD+mouse camera live) until the window closes */
            scene3d_backend()->run();
            return nil_value();
        case 75: { /* scene3dOnTick(fnName) -> nil; fnName called once per rendered frame with dt (a number, seconds) as its one argument */
            if (args[0].type != VAL_STRING) {
                runtime_error(line, "'scene3dOnTick' needs the callback's function name as a string, e.g. scene3dOnTick(\"onFrame\")");
            }
            TickCallback *tcb = malloc(sizeof(TickCallback));
            tcb->vm = vm; tcb->func_index = resolve_callback(vm, args[0].as.string, line); tcb->line = line;
            scene3d_backend()->on_tick(run_vm_tick_callback, tcb);
            return nil_value();
        }

        case 77:
            if(argc!=4||args[0].type!=VAL_NUMBER||args[1].type!=VAL_NUMBER||args[2].type!=VAL_NUMBER||args[3].type!=VAL_NUMBER)runtime_error(line,"scene3dSetMaterial requires object, roughness, metalness, opacity");
            scene3d_backend()->set_material((int)args[0].as.number,(float)args[1].as.number,(float)args[2].as.number,(float)args[3].as.number);return nil_value();
        case 76:
            if(argc!=1||args[0].type!=VAL_NUMBER)runtime_error(line,"scene3dSetInput requires one number (0 or 1)");
            scene3d_backend()->set_input_enabled(args[0].as.number!=0);return nil_value();
        default:
            runtime_error(line, "coral-vm: unknown builtin %d", id);
    }
    return nil_value(); /* unreachable */
}
