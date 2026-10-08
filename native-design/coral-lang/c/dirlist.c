#include <windows.h>
#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "dirlist.h"

DirEntries list_dir(const char *path) {
    DirEntries result = {0};
    char search[MAX_PATH + 8];
    snprintf(search, sizeof(search), "%s\\*", path);

    WIN32_FIND_DATAA data;
    HANDLE h = FindFirstFileA(search, &data);
    if (h == INVALID_HANDLE_VALUE) {
        result.count = -1;
        return result;
    }

    int cap = 0;
    do {
        if (strcmp(data.cFileName, ".") == 0 || strcmp(data.cFileName, "..") == 0) continue;
        if (result.count == cap) {
            cap = cap == 0 ? 16 : cap * 2;
            result.entries = realloc(result.entries, sizeof(DirEntry) * cap);
        }
        size_t len = strlen(data.cFileName);
        char *name = malloc(len + 1);
        memcpy(name, data.cFileName, len + 1);
        result.entries[result.count].name = name;
        result.entries[result.count].is_dir = (data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) ? 1 : 0;
        result.count++;
    } while (FindNextFileA(h, &data));
    FindClose(h);

    return result;
}

static int reg_set_string(HKEY key, const char *name, const char *value) {
    return RegSetValueExA(key, name, 0, REG_SZ, (const BYTE *)value, (DWORD)strlen(value) + 1) == ERROR_SUCCESS;
}

int register_ccc_protocol(void) {
    char exe_path[MAX_PATH];
    if (GetModuleFileNameA(NULL, exe_path, MAX_PATH) == 0) return 0;

    HKEY root_key;
    if (RegCreateKeyExA(HKEY_CURRENT_USER, "Software\\Classes\\ccc", 0, NULL, 0, KEY_WRITE, NULL, &root_key, NULL) != ERROR_SUCCESS) return 0;
    int ok = reg_set_string(root_key, NULL, "URL:ccc Protocol");
    ok = ok && reg_set_string(root_key, "URL Protocol", "");
    RegCloseKey(root_key);
    if (!ok) return 0;

    HKEY command_key;
    if (RegCreateKeyExA(HKEY_CURRENT_USER, "Software\\Classes\\ccc\\shell\\open\\command", 0, NULL, 0, KEY_WRITE, NULL, &command_key, NULL) != ERROR_SUCCESS) return 0;
    char command[MAX_PATH + 64];
    snprintf(command, sizeof(command), "\"%s\" --open-ccc-url \"%%1\"", exe_path);
    ok = reg_set_string(command_key, NULL, command);
    RegCloseKey(command_key);
    return ok;
}

int open_ccc_url(const char *ccc_url) {
    const char *prefix = "ccc://";
    size_t prefix_len = strlen(prefix);
    if (strncmp(ccc_url, prefix, prefix_len) != 0) return 0;
    const char *rest = ccc_url + prefix_len;
    char http_url[2048];
    /* "localhost" makes most browsers try the IPv6 loopback (::1)
     * first, wait for our IPv4-only listener to not answer there, THEN
     * fall back to IPv4 -- a real several-second delay opening what
     * should be instant (confirmed via netstat showing a real, never-
     * answered SYN_SENT to [::1]:PORT). Every ccc:// URL this project
     * ever generates points at our own loopback server, so rewriting
     * "localhost" to the literal 127.0.0.1 here is always correct, not
     * a guess -- it just skips hostname resolution entirely. */
    if (strncmp(rest, "localhost", 9) == 0) {
        snprintf(http_url, sizeof(http_url), "http://127.0.0.1%s", rest + 9);
    } else {
        snprintf(http_url, sizeof(http_url), "http://%s", rest);
    }
    HINSTANCE result = ShellExecuteA(NULL, "open", http_url, NULL, NULL, SW_SHOWNORMAL);
    return (INT_PTR)result > 32; /* ShellExecute's own success convention */
}

int clipboard_set_text(const char *text) {
    if (!OpenClipboard(NULL)) return 0;
    EmptyClipboard();
    size_t len = strlen(text) + 1;
    HGLOBAL mem = GlobalAlloc(GMEM_MOVEABLE, len);
    if (mem == NULL) { CloseClipboard(); return 0; }
    char *dst = GlobalLock(mem);
    memcpy(dst, text, len);
    GlobalUnlock(mem);
    if (SetClipboardData(CF_TEXT, mem) == NULL) {
        GlobalFree(mem);
        CloseClipboard();
        return 0;
    }
    CloseClipboard();
    return 1;
}
