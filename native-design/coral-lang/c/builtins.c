#include "project_search.h"
#include "json_value.h"
#include "native_jobs.h"
#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <direct.h> /* _mkdir -- safe to include directly here, unlike <windows.h>
                     * itself (see dirlist.h's comment on the TokenType collision) --
                     * direct.h doesn't touch anything Coral's lexer.h also defines. */

#include "builtins.h"
#include "interp.h"
#include "lexer.h"
#include "dirlist.h"
#include "backend.h" /* creal-lang/c/backend.h, found via build.ps1's -I -- see the ui* builtins below */

/* ask(prompt) — prompt is optional. Prints it with no trailing newline (so
 * typed input lands right after it, like a normal CLI prompt), reads one
 * line, trims surrounding spaces/tabs, and returns it as a number if the
 * whole trimmed line parses as one, otherwise as a string — so
 * `age = ask("Age? ")` can go straight into `age >= 18` with no separate
 * conversion step. Moved here unchanged from interp.c's old eval_ask,
 * just adapted to receive already-evaluated args instead of evaluating
 * them itself. */
static Value builtin_ask(Node *node, Value *args, int argc) {
    (void)node;
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

/* readFile(path) -> the whole file as a string. Fatal on a missing/
 * unreadable file, matching the rest of the language's "every failure is
 * fatal" model -- there's no try/catch to hand a recoverable error to. */
static Value builtin_read_file(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'readFile' needs a string path here");
    }
    FILE *f = fopen(args[0].as.string, "rb");
    if (f == NULL) {
        runtime_error(node->line, "couldn't open '%s' to read it", args[0].as.string);
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

/* writeFile(path, content) -> nil. Always overwrites; fatal on failure. */
static Value builtin_write_file(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'writeFile' needs a string path here");
    }
    if (args[1].type != VAL_STRING) {
        runtime_error(node->line, "'writeFile' needs string content here");
    }
    FILE *f = fopen(args[0].as.string, "wb");
    if (f == NULL) {
        runtime_error(node->line, "couldn't open '%s' to write it", args[0].as.string);
    }
    fwrite(args[1].as.string, 1, strlen(args[1].as.string), f);
    fclose(f);
    return nil_value();
}

/* length(x) -> item count for an array, character count for a string. */
static Value builtin_length(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type == VAL_ARRAY) return number_value(args[0].as.array->count);
    if (args[0].type == VAL_STRING) return number_value((double)strlen(args[0].as.string));
    runtime_error(node->line, "'length' only works on an array or a string");
}

/* append(arr, value) -> nil. Mutates arr in place (arrays have reference
 * semantics, see value.h) -- every other variable holding the same array
 * sees the new item too, not just the one append was called through. */
static Value builtin_append(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_ARRAY) {
        runtime_error(node->line, "'append' needs an array as its first argument");
    }
    array_push(args[0].as.array, args[1]);
    return nil_value();
}

/* substring(s, start, end) -> s[start..end), end exclusive (same convention
 * as most languages' slicing) -- a range, unlike s[i]'s single character
 * (see interp.c's ND_INDEX). Fatal on an out-of-range request, matching
 * every other indexing operation in this language rather than silently
 * clamping. */
static Value builtin_substring(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'substring' needs a string here");
    }
    if (args[1].type != VAL_NUMBER || args[2].type != VAL_NUMBER) {
        runtime_error(node->line, "'substring' needs numbers for start and end");
    }
    int len = (int)strlen(args[0].as.string);
    int start = (int)args[1].as.number;
    int end = (int)args[2].as.number;
    if (start < 0 || end > len || start > end) {
        runtime_error(node->line, "substring(%d, %d) is out of range for a string of length %d", start, end, len);
    }
    int n = end - start;
    char *out = malloc((size_t)n + 1);
    memcpy(out, args[0].as.string + start, (size_t)n);
    out[n] = '\0';
    return string_value(out);
}

/* indexOf(haystack, needle) -> the 1-based position of the first
 * occurrence of needle in haystack, or 0 if it isn't found -- 0 reads
 * naturally as "not found" right next to 1-based indexing (no valid
 * index is ever 0 or negative), the same way other languages use -1
 * against their own 0-based indexing. An empty needle matches at
 * position 1, same as an empty pattern trivially matching the start of
 * any string. */
static Value builtin_index_of(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'indexOf' needs two strings here");
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

/* listDir(path) -> an array of [name: "...", isDir: true|false] objects
 * for the given directory's entries (bare names, not full paths).
 * Fatal if the directory can't be opened at all (matching this
 * project's fatal-on-error model), but an empty directory is not an
 * error, just an empty array. The actual Windows calls live in
 * dirlist.c, kept deliberately separate from this file -- see
 * dirlist.h for why <windows.h> can never share a file with Coral's own
 * lexer.h. */
static Value builtin_list_dir(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'listDir' needs a string path here");
    }
    DirEntries entries = list_dir(args[0].as.string);
    if (entries.count < 0) {
        runtime_error(node->line, "couldn't open directory '%s'", args[0].as.string);
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

/* Recursively deletes everything inside `path` before removing `path`
 * itself -- built on the same list_dir() listDir() already uses, so no
 * new Windows-specific isolation concern beyond what dirlist.c already
 * handles. `list_dir` returning count<0 means `path` couldn't be opened
 * AS A DIRECTORY, which covers both "doesn't exist" and "is a plain
 * file" -- the latter falls through to a normal remove(). Returns 1 on
 * full success, 0 if anything along the way failed. */
static int delete_recursive(const char *path) {
    DirEntries entries = list_dir(path);
    if (entries.count < 0) return remove(path) == 0;
    int ok = 1;
    for (int i = 0; i < entries.count; i++) {
        char child[1024];
        snprintf(child, sizeof(child), "%s/%s", path, entries.entries[i].name);
        if (!delete_recursive(child)) ok = 0;
    }
    /* remove() only deletes FILES on Windows -- an emptied directory
     * itself needs _rmdir(), or this silently fails every time. */
    if (ok && _rmdir(path) != 0) ok = 0;
    return ok;
}

/* deleteFile(path) -> true/false. Deletes a plain file OR (recursively)
 * a directory and everything inside it. Deliberately NOT fatal on
 * failure, unlike this project's usual convention -- a caller like
 * editor.co wants to report "couldn't delete that" to the user, not
 * crash the whole editor over a permissions error or a file some other
 * program has open. Pair with uiConfirm before calling this for
 * anything the user didn't just explicitly ask to remove. */
static Value builtin_delete_file(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'deleteFile' needs a string path here");
    }
    return bool_value(delete_recursive(args[0].as.string));
}

/* renameFile(oldPath, newPath) -> true/false. Also works to MOVE a file
 * or folder -- rename() across directories on the same volume is a real
 * move, not a copy+delete. Not fatal on failure, same reasoning as
 * deleteFile above. */
static Value builtin_rename_file(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'renameFile' needs two string paths: the old one, then the new one");
    }
    return bool_value(rename(args[0].as.string, args[1].as.string) == 0);
}

/* makeDir(path) -> true/false. Creates ONE new directory -- the
 * immediate parent must already exist, matching mkdir's own real-world
 * behavior. Not fatal on failure. */
static Value builtin_make_dir(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'makeDir' needs a string path here");
    }
    return bool_value(_mkdir(args[0].as.string) == 0);
}

/* uiSetClipboardText(text) -> true/false. See dirlist.c's
 * clipboard_set_text for why the actual Windows clipboard calls live
 * there and not in this file. */
static Value builtin_ui_set_clipboard_text(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiSetClipboardText' needs a string");
    }
    return bool_value(clipboard_set_text(args[0].as.string));
}

/* runCommand(command) -> [exitCode: N, output: "..."] -- spawns
 * `command` through the system shell (via _popen, so pipes/redirection
 * typed in the command string work exactly like they would at a real
 * prompt), capturing everything it writes to stdout. Named "runCommand",
 * not the shorter "run" the plan originally sketched -- 'run' is
 * already a reserved keyword (`[.run] name [.using] args`), so a bare
 * `run("...")` call could never actually be written/parsed as a plain
 * function call at all. _popen/_pclose are plain MSVCRT functions
 * declared in <stdio.h> -- no <windows.h> needed, so no risk of the
 * TokenType collision dirlist.c/dirlist.h exist to dodge (see
 * dirlist.h's own comment). Fatal if the process couldn't even be
 * started at all (matching this project's fatal-on-error model), but a
 * NON-ZERO exit code is not an error here -- that's exactly what
 * exitCode is for, letting the caller inspect it instead. stderr is NOT
 * captured -- a real limitation, not an oversight: _popen only exposes
 * one pipe, and capturing both streams separately needs real
 * CreateProcess plumbing, deferred until something actually needs it. */
static Value builtin_run_command(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'run' needs a string command here");
    }
    FILE *pipe = _popen(args[0].as.string, "r");
    if (pipe == NULL) {
        runtime_error(node->line, "couldn't run '%s'", args[0].as.string);
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

/* randomInt(n) -> a random integer in [1, n], 1-based to match every
 * other index in this language -- backs {arr[.random]} (see
 * parse_brace_read), picking a uniformly random element by picking a
 * random valid index into it. Seeded once per run, lazily, on first use
 * rather than at program startup, so a program that never touches
 * .random doesn't burn a time() call for nothing. */
static Value builtin_random_int(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_NUMBER) {
        runtime_error(node->line, "'randomInt' needs a number here");
    }
    int n = (int)args[0].as.number;
    if (n < 1) {
        runtime_error(node->line, "'randomInt' needs a positive number here");
    }
    static int seeded = 0;
    if (!seeded) {
        srand((unsigned)time(NULL));
        seeded = 1;
    }
    return number_value(rand() % n + 1);
}

/* Short, highlighter-friendly category for a token -- collapses Coral's
 * many specific keyword TokenTypes (TOK_IF, TOK_TASK, TOK_USING, ...)
 * down to one "keyword" bucket, same idea for operators/punctuation, so
 * a highlighter written in Coral just switches on a handful of category
 * strings instead of every individual keyword. TOK_EOF never reaches
 * here (builtin_tokenize stops before it); TOK_COMMENT/TOK_STRING/
 * TOK_NUMBER/TOK_IDENT each get their own category since a highlighter
 * near-certainly wants to color each of those differently. */
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
            return "eof"; /* unreachable in practice, see builtin_tokenize */
        default:
            return "keyword"; /* every TOK_RETURN/TOK_IF/TOK_TASK/.../TOK_OR keyword */
    }
}

/* tokenize(source) -> an array of [type: "...", text: "...", line: N,
 * start: N, end: N] objects, one per real token in `source` (comments
 * included) -- backs a syntax highlighter written in Coral itself.
 * Reuses the language's actual lexer (lex_with_comments) rather than a
 * simplified reimplementation, so highlighting can never drift from what
 * Coral really parses something as. `text` is the decoded string content
 * for a TOK_STRING (escape sequences already resolved, matching what the
 * string actually evaluates to -- not literally the original source
 * characters between the quotes) and the raw source text for everything
 * else. `start`/`end` are 1-based (matching Coral's own indexing
 * convention -- see [[the addendum's `{name[N]}` design]]) BYTE offsets
 * into `source` spanning the token's raw source span -- for a string or
 * comment this deliberately covers the surrounding quotes / `//`, even
 * though `text` above has already stripped them, since a highlighter
 * colors what's on screen, not the decoded value. */
static Value builtin_tokenize(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'tokenize' needs a string here");
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

/* uiLoad/uiSetText/uiGetText/uiOnClick/uiRun -- the Coral<->Creal bridge.
 * A Coral script never touches Win32 (or even knows it exists): every one
 * of these just forwards to win32_backend(), the same UIBackend a future
 * second rendering backend would also implement (see backend.h). Creal's
 * window/render code is linked directly into coral.exe for this (see
 * build.ps1) rather than the two staying separate processes. */

static Value builtin_ui_load(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiLoad' needs a string path here");
    }
    win32_backend()->load(args[0].as.string);
    return nil_value();
}

static Value builtin_ui_toggle_panel(Node *node, Value *args, int argc) {
    (void)argc;
    if(args[0].type!=VAL_STRING)runtime_error(node->line,"'uiTogglePanel' needs a panel id string");
    win32_backend()->toggle_panel(args[0].as.string);return nil_value();
}
static Value builtin_ui_panel_menu(Node *node, Value *args, int argc) {
    (void)argc;
    if(args[0].type!=VAL_STRING)runtime_error(node->line,"'uiPanelMenu' needs an anchor id string");
    win32_backend()->panel_menu(args[0].as.string);return nil_value();
}

static Value search_hits_value(SearchHit *hits,int count) {
    ArrayObj *array=array_new();
    for(int i=0;i<count;i++) {
        ObjectObj *hit=object_new();object_set(hit,"path",string_value(strdup(hits[i].path)));
        object_set(hit,"text",string_value(strdup(hits[i].text)));object_set(hit,"term",string_value(strdup(hits[i].term)));
        object_set(hit,"line",number_value(hits[i].line));object_set(hit,"score",number_value(hits[i].score));array_push(array,object_value(hit));
    }
    return array_value(array);
}
static Value builtin_search_project(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_STRING)runtime_error(node->line,"searchProject needs a root and query string");
    SearchResult result=project_search(args[0].as.string,args[1].as.string);ObjectObj *object=object_new();
    object_set(object,"exact",search_hits_value(result.exact,result.exact_count));
    object_set(object,"suggested",search_hits_value(result.suggested,result.suggested_count));
    object_set(object,"limited",bool_value(result.limited));object_set(object,"files",number_value(result.files));
    free_search_result(&result);return object_value(object);
}
static Value builtin_ui_set_visible(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING)runtime_error(node->line,"uiSetVisible needs an element id");
    win32_backend()->set_visible(args[0].as.string,is_truthy(args[1]));return nil_value();
}
static Value builtin_ui_is_visible(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING)runtime_error(node->line,"uiIsVisible needs an element id");
    return bool_value(win32_backend()->is_visible(args[0].as.string));
}
static Value builtin_ui_go_to_line(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_NUMBER)runtime_error(node->line,"uiGoToLine needs an id and line number");
    int line=args[1].as.number<1?1:args[1].as.number>1000000?1000000:(int)args[1].as.number;
    win32_backend()->go_to_line(args[0].as.string,line);return nil_value();
}
static Value builtin_ui_toggle_rail(Node *node,Value *args,int argc) {
    (void)node;(void)args;(void)argc;return bool_value(win32_backend()->toggle_rail());
}
static Value builtin_ui_toggle_moving(Node *node,Value *args,int argc) {
    (void)node;(void)args;(void)argc;return bool_value(win32_backend()->toggle_moving());
}

static Value builtin_ui_scroll_tabs(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_NUMBER)runtime_error(node->line,"uiScrollTabs needs id and distance");
    double d=args[1].as.number;if(d>10000)d=10000;if(d< -10000)d=-10000;
    win32_backend()->scroll_tabs(args[0].as.string,(int)d);return nil_value();
}
static Value builtin_ui_reveal_tab(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING)runtime_error(node->line,"uiRevealTab needs id");
    win32_backend()->reveal_tab(args[0].as.string);return nil_value();
}
static Value builtin_ui_set_match(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_STRING)runtime_error(node->line,"uiSetMatch needs id and query");
    win32_backend()->set_match(args[0].as.string,args[1].as.string);return nil_value();
}
static Value builtin_ui_set_search_result(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_STRING||args[2].type!=VAL_NUMBER||args[3].type!=VAL_STRING)runtime_error(node->line,"uiSetSearchResult needs id, path, line and term");
    double line=args[2].as.number;if(line<0)line=0;if(line>1000000)line=1000000;
    win32_backend()->set_search_result(args[0].as.string,args[1].as.string,(int)line,args[3].as.string);return nil_value();
}

static Value builtin_ui_set_text(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'uiSetText' needs two strings here: an element id, then the new text");
    }
    win32_backend()->set_text(args[0].as.string, args[1].as.string);
    return nil_value();
}

/* Copies the backend's text immediately -- get_text's own pointer is only
 * guaranteed valid until the next mutation of that element (see
 * backend.h), and a Coral VAL_STRING needs to own its own buffer anyway
 * (see value.h). */
static Value builtin_ui_get_text(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiGetText' needs a string id here");
    }
    return string_value(strdup(win32_backend()->get_text(args[0].as.string)));
}

/* uiSetDesign(id, designName) -- switches which catalog design an
 * element renders with, at runtime (a static `using name` attribute in
 * a .cr file only ever sets this once, when the file is first parsed).
 * Backs '[.change] "id" to [.designName]' (see parser.c's parse_change),
 * the surface syntax the user actually wanted -- this builtin is what
 * that desugars to, same relationship 'add VALUE to {array}' has to the
 * 'append' builtin. */
static Value builtin_ui_set_design(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'uiSetDesign' needs two strings here: an element id, then a design name");
    }
    win32_backend()->set_design(args[0].as.string, args[1].as.string);
    return nil_value();
}

/* uiSetColor(id, colorName) -- changes a "text" element's color
 * directly, without needing a whole catalog design just to change one
 * color (see uiSetDesign above for that heavier option). Pass "" (an
 * empty string, not omitting the argument -- this builtin always takes
 * exactly 2) to clear the override and go back to whatever color the
 * .cr file originally gave the element. */
static Value builtin_ui_set_color(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'uiSetColor' needs two strings here: an element id, then a color name (or \"\" to reset)");
    }
    win32_backend()->set_color(args[0].as.string, args[1].as.string);
    return nil_value();
}

/* uiSetDeviceFrame(id, frame) -- "phone" (default)/"web"/"desktop", the
 * chrome a `device` element previews its app inside (see backend.h's
 * own comment and editor.co's onRun, which sets this from a #web/#app/
 * #desktop tag on the previewed app's own .co file). */
static Value builtin_ui_set_device_frame(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'uiSetDeviceFrame' needs two strings here: an element id, then \"phone\", \"web\", or \"desktop\"");
    }
    win32_backend()->set_device_frame(args[0].as.string, args[1].as.string);
    return nil_value();
}

/* registerCccProtocol() -> true/false. One-time (per Windows user, not
 * per run -- the registry write persists) setup registering "ccc://"
 * as a real clickable URL scheme that launches THIS coral.exe -- see
 * dirlist.c's register_ccc_protocol and main.c's own --open-ccc-url
 * handling for the other half. Non-fatal on failure (a registry write
 * being denied is real, expected machine state, not a bug), matching
 * uiSetClipboardText's own convention. */
static Value builtin_register_ccc_protocol(Node *node, Value *args, int argc) {
    (void)node; (void)args; (void)argc;
    return bool_value(register_ccc_protocol());
}

/* uiStartWebServer(port, rootDeviceId) -- starts (once per process; a
 * later call just repoints which device's embedded app it serves) the
 * real loopback HTTP server backing a #web app's actual URL. See
 * backend.h/web_backend.h for what it can and can't do yet -- full-
 * page-reload-per-click over plain HTTP today, not the live-push
 * transport this is meant to grow into. */
static Value builtin_ui_start_web_server(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_NUMBER || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'uiStartWebServer' needs a port number, then a device element id (or \"\" for the top-level app)");
    }
    win32_backend()->start_web_server((int)args[0].as.number, args[1].as.string);
    return nil_value();
}

/* uiAddText(containerId, id, content) -- creates a brand-new "text"
 * element, appended as the last child of the element with id
 * containerId (a row/column from B2 is the sensible target). What
 * actually makes an unbounded list -- like a file tree with however
 * many files there turn out to be -- possible: every other ui* builtin
 * only ever mutates an element the .cr file already declared. */
static Value builtin_ui_add_text(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING || args[2].type != VAL_STRING) {
        runtime_error(node->line, "'uiAddText' needs three strings here: a container id, a new id, then the text content");
    }
    win32_backend()->add_text(args[0].as.string, args[1].as.string, args[2].as.string);
    return nil_value();
}

/* uiRemoveElement(id) -- backs the new '[.remove] EXPR' surface syntax
 * (parser.c's parse_remove). What uiAddText's own comment used to flag
 * as a real gap: until now, "removing" something Coral had added meant
 * blanking its text and leaving an inert, still-clickable element
 * behind forever. Fatal if no element has `id`, same convention as
 * every other by-id ui* builtin. */
static Value builtin_ui_remove_element(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiRemoveElement' needs a string element id here");
    }
    win32_backend()->remove_element(args[0].as.string);
    return nil_value();
}

/* uiSetHighlight(id, spans) -- recolors a textarea token-by-token, e.g.
 * with tokenize()'s own output run through a small type->color lookup in
 * Coral. `spans` is an array of [start: N, end: N, color: "..."] objects
 * -- 1-based inclusive byte offsets, the same convention tokenize()
 * already returns (see its own comment), so a Coral-side highlighter can
 * pass tokenize()'s objects straight through with a `color` field added,
 * no offset translation needed. An empty array clears any existing
 * highlight. Converts to a plain C array of HighlightSpan here, at the
 * boundary, rather than teaching win32_backend.c anything about Coral's
 * ObjectObj -- backend.h only ever sees the small, backend-agnostic
 * HighlightSpan struct it already declares. */
static Value builtin_ui_set_highlight(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_ARRAY) {
        runtime_error(node->line,
            "'uiSetHighlight' needs a string id, then an array of [start, end, color] objects");
    }
    ArrayObj *spans_arr = args[1].as.array;
    HighlightSpan *spans = spans_arr->count > 0 ? malloc(sizeof(HighlightSpan) * spans_arr->count) : NULL;
    for (int i = 0; i < spans_arr->count; i++) {
        Value item = spans_arr->items[i];
        if (item.type != VAL_OBJECT) {
            runtime_error(node->line, "'uiSetHighlight' needs each span to be a [start, end, color] object");
        }
        Value *start = object_get(item.as.object, "start");
        Value *end = object_get(item.as.object, "end");
        Value *color = object_get(item.as.object, "color");
        if (start == NULL || end == NULL || color == NULL ||
            start->type != VAL_NUMBER || end->type != VAL_NUMBER || color->type != VAL_STRING) {
            runtime_error(node->line,
                "'uiSetHighlight' needs each span to have a numeric start/end and a string color");
        }
        spans[i].start = (int)start->as.number;
        spans[i].end = (int)end->as.number;
        spans[i].color = color->as.string; /* borrowed -- win32_set_highlight strdup's it before this call returns */
    }
    win32_backend()->set_highlight(args[0].as.string, spans, spans_arr->count);
    free(spans);
    return nil_value();
}

/* Bundles what the click trampoline needs once Win32 fires it, deep
 * inside win32_backend.c's own message loop with no Coral call-site Node
 * anywhere on the stack -- the resolved FunctionObj value (looked up by
 * name once, at registration time, not re-resolved per click), the
 * clicked element's own id (handed to the callback as its one argument --
 * see the addendum's note on why zero-parameter Coral functions aren't
 * supported yet), and a line number purely for error messages. Leaked
 * deliberately, matching this project's "never free anything" model. */
typedef struct {
    Value fn;
    char *id;
    int line;
} ClickBinding;

static void run_click_binding(void *userdata) {
    ClickBinding *binding = (ClickBinding *)userdata;
    Value arg = string_value(strdup(binding->id));
    call_function(binding->fn, &arg, 1, binding->line);
}

static Value builtin_ui_on_click(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiOnClick' needs a string element id as its first argument");
    }
    if (args[1].type != VAL_STRING) {
        runtime_error(node->line,
            "'uiOnClick' needs the callback's function name as a string, e.g. uiOnClick(\"saveBtn\", \"onSave\")");
    }
    Value fn = env_get(get_globals(), args[1].as.string, node->line);
    if (fn.type != VAL_FUNCTION) {
        runtime_error(node->line, "'%s' isn't a function, so it can't be used as a click handler", args[1].as.string);
    }
    ClickBinding *binding = malloc(sizeof(ClickBinding));
    binding->fn = fn;
    binding->id = strdup(args[0].as.string);
    binding->line = node->line;
    win32_backend()->on_click(args[0].as.string, run_click_binding, binding);
    return nil_value();
}

/* uiOnRightClick(id, fnName) -- same shape as uiOnClick, reusing the
 * exact same ClickBinding/run_click_binding trampoline, just registered
 * on the backend's SEPARATE right-click table (win32_on_right_click)
 * instead of the left-click one. Lets a file/folder Explorer row (say)
 * open normally on left-click but show a context menu on right-click. */
static Value builtin_ui_on_right_click(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiOnRightClick' needs a string element id as its first argument");
    }
    if (args[1].type != VAL_STRING) {
        runtime_error(node->line,
            "'uiOnRightClick' needs the callback's function name as a string, e.g. uiOnRightClick(\"file1\", \"onFileMenu\")");
    }
    Value fn = env_get(get_globals(), args[1].as.string, node->line);
    if (fn.type != VAL_FUNCTION) {
        runtime_error(node->line, "'%s' isn't a function, so it can't be used as a right-click handler", args[1].as.string);
    }
    ClickBinding *binding = malloc(sizeof(ClickBinding));
    binding->fn = fn;
    binding->id = strdup(args[0].as.string);
    binding->line = node->line;
    win32_backend()->on_right_click(args[0].as.string, run_click_binding, binding);
    return nil_value();
}

/* uiShowMenu(labels) -- shows a native popup menu (at the last right
 * click's position, see backend.h's show_menu) with one entry per
 * string in `labels`, blocking until the user picks one or dismisses
 * it. Returns the 1-based index chosen, or 0 for none -- matching
 * Coral's own indexing convention, so the caller's own `labels[N]` on
 * the returned N needs no translation. */
static Value builtin_ui_show_menu(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_ARRAY) {
        runtime_error(node->line, "'uiShowMenu' needs an array of label strings");
    }
    ArrayObj *arr = args[0].as.array;
    const char **labels = arr->count > 0 ? malloc(sizeof(char *) * arr->count) : NULL;
    for (int i = 0; i < arr->count; i++) {
        if (arr->items[i].type != VAL_STRING) {
            runtime_error(node->line, "'uiShowMenu' needs every label to be a string");
        }
        labels[i] = arr->items[i].as.string;
    }
    int chosen = win32_backend()->show_menu(labels, arr->count);
    free(labels);
    return number_value(chosen);
}

/* uiShowConfirm(message, onYesFn, onNoFn) -- an IN-APP yes/no modal
 * (drawn with Cryptic's own theme, not a native MessageBoxA -- see
 * backend.h's show_confirm) for guarding a destructive action (Delete)
 * on a real answer rather than proceeding unconditionally. Unlike the
 * blocking native dialog this replaced, this returns immediately: the
 * named Coral function fires LATER, whenever the user actually clicks
 * Yes or No, via the exact same ClickBinding/run_click_binding
 * trampoline uiOnClick already uses (the callback's one argument is
 * just "", since there's no clicked-element id the way a real uiOnClick
 * has -- callbacks that don't need it can simply ignore it). */
static Value builtin_ui_show_confirm(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiShowConfirm' needs a string message");
    }
    if (args[1].type != VAL_STRING || args[2].type != VAL_STRING) {
        runtime_error(node->line, "'uiShowConfirm' needs two function-name strings: onYes, then onNo");
    }
    Value yes_fn = env_get(get_globals(), args[1].as.string, node->line);
    Value no_fn = env_get(get_globals(), args[2].as.string, node->line);
    if (yes_fn.type != VAL_FUNCTION || no_fn.type != VAL_FUNCTION) {
        runtime_error(node->line, "'uiShowConfirm' needs both callbacks to be real functions");
    }
    ClickBinding *yes_binding = malloc(sizeof(ClickBinding));
    yes_binding->fn = yes_fn; yes_binding->id = strdup(""); yes_binding->line = node->line;
    ClickBinding *no_binding = malloc(sizeof(ClickBinding));
    no_binding->fn = no_fn; no_binding->id = strdup(""); no_binding->line = node->line;
    win32_backend()->show_confirm(args[0].as.string, run_click_binding, yes_binding, run_click_binding, no_binding);
    return nil_value();
}

/* uiShowPrompt(message, initial, onOkFn, onCancelFn) -- an IN-APP text-
 * input modal, same theme-consistency motivation as uiShowConfirm.
 * `onOkFn` fires once the user confirms; read what they typed via
 * uiModalInputText() from INSIDE that callback (a UIClickHandler has no
 * return channel of its own to hand the text back through directly). */
static Value builtin_ui_show_prompt(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'uiShowPrompt' needs two strings: a message, then the initial value");
    }
    if (args[2].type != VAL_STRING || args[3].type != VAL_STRING) {
        runtime_error(node->line, "'uiShowPrompt' needs two function-name strings: onOk, then onCancel");
    }
    Value ok_fn = env_get(get_globals(), args[2].as.string, node->line);
    Value cancel_fn = env_get(get_globals(), args[3].as.string, node->line);
    if (ok_fn.type != VAL_FUNCTION || cancel_fn.type != VAL_FUNCTION) {
        runtime_error(node->line, "'uiShowPrompt' needs both callbacks to be real functions");
    }
    ClickBinding *ok_binding = malloc(sizeof(ClickBinding));
    ok_binding->fn = ok_fn; ok_binding->id = strdup(""); ok_binding->line = node->line;
    ClickBinding *cancel_binding = malloc(sizeof(ClickBinding));
    cancel_binding->fn = cancel_fn; cancel_binding->id = strdup(""); cancel_binding->line = node->line;
    win32_backend()->show_prompt(args[0].as.string, args[1].as.string, run_click_binding, ok_binding, run_click_binding, cancel_binding);
    return nil_value();
}

/* uiModalInputText() -- the prompt modal's current/final entered text.
 * Only meaningful called from inside an onOk callback (see
 * uiShowPrompt above). */
static Value builtin_ui_modal_input_text(Node *node, Value *args, int argc) {
    (void)node; (void)args; (void)argc;
    return string_value(strdup(win32_backend()->modal_input_text()));
}

static Value builtin_ui_on_change(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING) {
        runtime_error(node->line, "'uiOnChange' needs a string element id as its first argument");
    }
    if (args[1].type != VAL_STRING) {
        runtime_error(node->line,
            "'uiOnChange' needs the callback's function name as a string, e.g. uiOnChange(\"saveBtn\", \"onSave\")");
    }
    Value fn = env_get(get_globals(), args[1].as.string, node->line);
    if (fn.type != VAL_FUNCTION) {
        runtime_error(node->line, "'%s' isn't a function, so it can't be used as a click handler", args[1].as.string);
    }
    ClickBinding *binding = malloc(sizeof(ClickBinding));
    binding->fn = fn;
    binding->id = strdup(args[0].as.string);
    binding->line = node->line;
    win32_backend()->on_change(args[0].as.string, run_click_binding, binding);
    return nil_value();
}

static Value builtin_ui_run(Node *node, Value *args, int argc) {
    (void)node;
    (void)args;
    (void)argc;
    win32_backend()->run();
    native_shutdown();
    return nil_value();
}


static Value builtin_json_encode(Node *node,Value *args,int argc) {
    (void)argc;char *s=json_encode(args[0]);if(!s)runtime_error(node->line,"Value cannot be encoded as bounded JSON");return string_value(s);
}
static Value builtin_json_decode(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING)runtime_error(node->line,"jsonDecode needs a string");
    Value value;char error[256];int ok=json_decode(args[0].as.string,&value,error,sizeof(error));ObjectObj *r=object_new();
    object_set(r,"ok",bool_value(ok));object_set(r,"value",value);object_set(r,"error",string_value(strdup(error)));return object_value(r);
}
static Value builtin_field(Node *node,Value *args,int argc) {
    (void)node;(void)argc;if(args[0].type!=VAL_OBJECT||args[1].type!=VAL_STRING)return nil_value();Value *v=object_get(args[0].as.object,args[1].as.string);return v?*v:nil_value();
}
static Value builtin_kind(Node *node,Value *args,int argc) {
    (void)node;(void)argc;const char *names[]={"nil","bool","number","string","function","array","object"};return string_value(strdup(names[args[0].type]));
}
static Value builtin_native_start(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_OBJECT)runtime_error(node->line,"nativeStart needs a kind and options object");return native_start(args[0].as.string,args[1]);
}
static Value builtin_same_path(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_STRING)runtime_error(node->line,"samePath needs two paths");
    return bool_value(native_same_path(args[0].as.string,args[1].as.string));
}
static Value builtin_native_poll(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_NUMBER)runtime_error(node->line,"nativePoll needs a job id");return native_poll((int)args[0].as.number);
}
static Value builtin_native_cancel(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_NUMBER)runtime_error(node->line,"nativeCancel needs a job id");native_cancel((int)args[0].as.number);return nil_value();
}
static Value builtin_uri_encode(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING)runtime_error(node->line,"uriEncode needs text");
    const unsigned char *s=(unsigned char*)args[0].as.string;char *out=malloc(strlen((char*)s)*3+1),*p=out;
    for(;*s;s++){if((*s>='a'&&*s<='z')||(*s>='A'&&*s<='Z')||(*s>='0'&&*s<='9')||strchr("-_.~",*s))*p++=(char)*s;else{sprintf(p,"%%%02X",*s);p+=3;}}*p=0;return string_value(out);
}
static Value builtin_include(Node *node,Value *args,int argc) {
    Value source=builtin_read_file(node,args,argc);NodeList program=parse_program(lex(source.as.string));run_repl_chunk(program);return nil_value();
}

/* uiEmbedApp(deviceId, coPath) -- real, live, clickable app embedding
 * in the device preview (see backend.h's set_embed_target and
 * win32_backend.c's paint_embedded_app). Runs coPath as a genuinely
 * separate, isolated Coral program (run_program_isolated -- its own
 * fresh global scope, so its tasks/globals can never collide with or
 * see the HOST script's own), whose own uiLoad/uiOnClick/uiRun calls
 * attach a real live app to `deviceId` instead of the usual real
 * window, because set_embed_target below is active for the whole time
 * that isolated program's top-level runs.
 *
 * The embedded app's own script almost certainly calls uiLoad with a
 * path relative to ITS OWN directory (e.g. `uiLoad("tictactoe.cr")`,
 * exactly what running it standalone from that directory would need)
 * -- but the actual process cwd throughout is the HOST script's own
 * directory. _chdir to coPath's directory before running it (and back
 * again after) makes every relative path the embedded script touches
 * (uiLoad, any readFile/writeFile it does) resolve exactly the way it
 * would running standalone, with no rewriting of the script itself. */
static Value builtin_ui_embed_app(Node *node, Value *args, int argc) {
    (void)argc;
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING) {
        runtime_error(node->line, "'uiEmbedApp' needs two strings here: a device element id, then a path to the app's .co file");
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
        runtime_error(node->line, "'uiEmbedApp' couldn't read the current directory");
    }
    if (_chdir(dir) != 0) {
        runtime_error(node->line, "'uiEmbedApp' couldn't find the directory for '%s'", co_path);
    }

    FILE *f = fopen(base, "rb");
    if (f == NULL) {
        _chdir(saved_cwd);
        runtime_error(node->line, "'uiEmbedApp' couldn't open '%s'", co_path);
    }
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    rewind(f);
    char *source = malloc((size_t)size + 1);
    fread(source, 1, (size_t)size, f);
    source[size] = '\0';
    fclose(f);

    /* A leading "#web"/"#app"/"#desktop" platform tag (see editor.co's
     * detectPlatformFrame) is metadata for the HOST to read as plain
     * text, never something the embedded script itself is meant to
     * execute -- Coral's lexer has no '#' syntax at all, so handing it
     * straight to lex() below is a fatal parse error the instant a
     * tagged app gets embedded (hit for real: this crashed the whole
     * editor the first time Run tried to embed a tagged app). Skip
     * past that one line before parsing, same as if it were never
     * there. */
    char *program_source = source;
    if (program_source[0] == '#') {
        char *newline = strchr(program_source, '\n');
        program_source = (newline != NULL) ? newline + 1 : program_source + strlen(program_source);
    }

    win32_backend()->set_embed_target(device_id);
    NodeList program = parse_program(lex(program_source));
    run_program_isolated(program);
    win32_backend()->set_embed_target("");
    _chdir(saved_cwd);
    return nil_value();
}
static Value builtin_ui_tick(Node *node,Value *args,int argc) {
    (void)argc;if(args[0].type!=VAL_STRING||args[1].type!=VAL_NUMBER)runtime_error(node->line,"uiOnTick needs a callback name and interval");
    Value fn=env_get(get_globals(),args[0].as.string,node->line);if(fn.type!=VAL_FUNCTION)runtime_error(node->line,"Timer callback is not a task");
    ClickBinding *binding=malloc(sizeof(ClickBinding));binding->fn=fn;binding->id=strdup("tick");binding->line=node->line;
    win32_backend()->on_tick(run_click_binding,binding,(int)args[1].as.number);return nil_value();
}


static Value builtin_validate_args(Node *node,Value *args,int argc) {
    (void)node;(void)argc;Value schema=args[0],v=args[1];char error[256]="";
    if(schema.type!=VAL_OBJECT||v.type!=VAL_OBJECT)return string_value(strdup("Arguments must be an object"));
    Value *required=object_get(schema.as.object,"required"),*properties=object_get(schema.as.object,"properties");
    if(required&&required->type==VAL_ARRAY)for(int i=0;i<required->as.array->count;i++) {
        Value key=required->as.array->items[i];if(key.type==VAL_STRING&&!object_get(v.as.object,key.as.string)){snprintf(error,sizeof(error),"Missing argument: %s",key.as.string);return string_value(strdup(error));}
    }
    if(properties&&properties->type==VAL_OBJECT)for(int i=0;i<properties->as.object->count;i++) {
        const char *key=properties->as.object->keys[i];Value *present=object_get(v.as.object,key);if(!present)continue;
        Value def=properties->as.object->values[i];Value *type=def.type==VAL_OBJECT?object_get(def.as.object,"type"):NULL;if(!type||type->type!=VAL_STRING)continue;
        const char *t=type->as.string;int valid=(!strcmp(t,"string")&&present->type==VAL_STRING)||(!strcmp(t,"array")&&present->type==VAL_ARRAY)||(!strcmp(t,"object")&&present->type==VAL_OBJECT)||(!strcmp(t,"number")&&present->type==VAL_NUMBER)||(!strcmp(t,"boolean")&&present->type==VAL_BOOL);
        if(valid&&present->type==VAL_ARRAY) {
            Value *items=object_get(def.as.object,"items");Value *it=items&&items->type==VAL_OBJECT?object_get(items->as.object,"type"):NULL;
            if(it&&it->type==VAL_STRING&&!strcmp(it->as.string,"string"))for(int n=0;n<present->as.array->count;n++)if(present->as.array->items[n].type!=VAL_STRING)valid=0;
        }
        if(!valid){snprintf(error,sizeof(error),"Invalid argument type: %s",key);return string_value(strdup(error));}
    }
    return string_value(strdup(""));
}

static const Builtin BUILTINS[] = {
    { "validateArgs",2,2,builtin_validate_args },
    { "jsonEncode",1,1,builtin_json_encode },
    { "jsonDecode",1,1,builtin_json_decode },
    { "field",2,2,builtin_field },
    { "kindOf",1,1,builtin_kind },
    { "nativeStart",2,2,builtin_native_start },
    { "samePath",2,2,builtin_same_path },
    { "nativePoll",1,1,builtin_native_poll },
    { "nativeCancel",1,1,builtin_native_cancel },
    { "uriEncode",1,1,builtin_uri_encode },
    { "include",1,1,builtin_include },
    { "uiEmbedApp", 2, 2, builtin_ui_embed_app },
    { "uiOnTick",2,2,builtin_ui_tick },
    { "searchProject", 2, 2, builtin_search_project },
    { "uiSetVisible", 2, 2, builtin_ui_set_visible },
    { "uiIsVisible", 1, 1, builtin_ui_is_visible },
    { "uiGoToLine", 2, 2, builtin_ui_go_to_line },
    { "uiToggleRail", 0, 0, builtin_ui_toggle_rail },
    { "uiToggleMoving", 0, 0, builtin_ui_toggle_moving },
    { "uiScrollTabs", 2, 2, builtin_ui_scroll_tabs },
    { "uiRevealTab", 1, 1, builtin_ui_reveal_tab },
    { "uiSetMatch", 2, 2, builtin_ui_set_match },
    { "uiSetSearchResult", 4, 4, builtin_ui_set_search_result },
    { "uiOnChange", 2, 2, builtin_ui_on_change },

    { "ask",        0, 1, builtin_ask },
    { "readFile",   1, 1, builtin_read_file },
    { "writeFile",  2, 2, builtin_write_file },
    { "length",     1, 1, builtin_length },
    { "append",     2, 2, builtin_append },
    { "substring",  3, 3, builtin_substring },
    { "indexOf",    2, 2, builtin_index_of },
    { "listDir",    1, 1, builtin_list_dir },
    { "runCommand", 1, 1, builtin_run_command },
    { "randomInt",  1, 1, builtin_random_int },
    { "tokenize",   1, 1, builtin_tokenize },
    { "uiLoad",     1, 1, builtin_ui_load },
    { "uiTogglePanel", 1, 1, builtin_ui_toggle_panel },
    { "uiPanelMenu", 1, 1, builtin_ui_panel_menu },
    { "uiSetText",  2, 2, builtin_ui_set_text },
    { "uiGetText",  1, 1, builtin_ui_get_text },
    { "uiOnClick",  2, 2, builtin_ui_on_click },
    { "uiSetDesign", 2, 2, builtin_ui_set_design },
    { "uiSetColor", 2, 2, builtin_ui_set_color },
    { "uiSetDeviceFrame", 2, 2, builtin_ui_set_device_frame },
    { "uiStartWebServer", 2, 2, builtin_ui_start_web_server },
    { "registerCccProtocol", 0, 0, builtin_register_ccc_protocol },
    { "uiAddText",  3, 3, builtin_ui_add_text },
    { "uiSetHighlight", 2, 2, builtin_ui_set_highlight },
    { "uiRemoveElement", 1, 1, builtin_ui_remove_element },
    { "uiRun",      0, 0, builtin_ui_run },
    { "uiOnRightClick", 2, 2, builtin_ui_on_right_click },
    { "uiShowMenu", 1, 1, builtin_ui_show_menu },
    { "uiShowConfirm", 3, 3, builtin_ui_show_confirm },
    { "uiShowPrompt", 4, 4, builtin_ui_show_prompt },
    { "uiModalInputText", 0, 0, builtin_ui_modal_input_text },
    { "deleteFile", 1, 1, builtin_delete_file },
    { "renameFile", 2, 2, builtin_rename_file },
    { "makeDir",    1, 1, builtin_make_dir },
    { "uiSetClipboardText", 1, 1, builtin_ui_set_clipboard_text },
};
static const int BUILTIN_COUNT = sizeof(BUILTINS) / sizeof(BUILTINS[0]);

const Builtin *find_builtin(const char *name) {
    for (int i = 0; i < BUILTIN_COUNT; i++) {
        if (strcmp(BUILTINS[i].name, name) == 0) return &BUILTINS[i];
    }
    return NULL;
}
