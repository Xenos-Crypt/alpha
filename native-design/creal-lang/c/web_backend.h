#ifndef CREAL_WEB_BACKEND_H
#define CREAL_WEB_BACKEND_H

/* A real (if intentionally small) second Creal backend: instead of GDI
 * pixels, this one emits real HTML for a real localhost URL, so a #web
 * -tagged app actually has something to open in a browser -- not just
 * the fake browser-window CHROME draw_browser_concept puts around the
 * same desktop bitmap.
 *
 * Two transports, both real, deliberately kept side by side ("both, if
 * one fails do the other" per the user's own framing):
 *   - Plain HTTP: every clickable element is a real `<a href="/click/
 *     ID">`, so a click is an ordinary browser navigation -- works with
 *     JavaScript disabled, or as a fallback if the WebSocket below
 *     never connects. A full page reload per click, but a real one.
 *   - WebSocket (the "always live" upgrade): the same page also opens
 *     a `ws://` connection; a click sends `click:ID` over it instead of
 *     navigating, the server runs the SAME real Coral handler, and
 *     pushes the freshly re-rendered body back over the SAME open
 *     socket -- no reload, no re-fetch. Pushed to every OTHER connected
 *     client too (see g_web_clients), so two browser tabs open on the
 *     same app stay in sync live.
 * The button markup always carries both an `href` and an `onclick` --
 * onclick wins (and cancels the navigation) whenever a live socket is
 * actually connected; the href is what runs if it isn't.
 *
 * Only row/column/text/button/spacer are serialized -- this project's
 * actual example apps (tic-tac-toe, etc.) only ever use those, and
 * honestly rendering nothing for a textarea/input/image/device here
 * beats silently guessing at a translation for something this MVP
 * hasn't actually built.
 *
 * Threading: accept() runs on one dedicated thread; each WebSocket
 * connection that upgrades gets its OWN thread (so one slow/idle
 * browser tab never blocks another). None of these threads ever touch
 * an Element, a Coral Value, or any of win32_backend.c's own g_*
 * arrays directly -- every dispatch crosses back to the MAIN thread via
 * PostMessage(WM_APP_WEB_REQUEST), the same way a WM_TIMER tick already
 * safely calls into Coral (see g_tick_handler). g_web_dispatch_lock
 * serializes that hand-off across however many worker threads exist at
 * once, so exactly one request is ever "in flight" into Coral at a
 * time regardless of how many browser tabs are open. */

#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdarg.h>

typedef struct { char *buf; size_t cap; size_t len; } StrBuf;

static void sb_init(StrBuf *sb) {
    sb->cap = 4096;
    sb->buf = malloc(sb->cap);
    sb->buf[0] = '\0';
    sb->len = 0;
}
static void sb_append(StrBuf *sb, const char *s) {
    size_t n = strlen(s);
    while (sb->len + n + 1 > sb->cap) sb->cap *= 2;
    sb->buf = realloc(sb->buf, sb->cap);
    memcpy(sb->buf + sb->len, s, n + 1);
    sb->len += n;
}
static void sb_appendf(StrBuf *sb, const char *fmt, ...) {
    char tmp[1024];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(tmp, sizeof(tmp), fmt, ap);
    va_end(ap);
    sb_append(sb, tmp);
}
static void html_escape_append(StrBuf *sb, const char *text) {
    for (const char *p = text; *p; p++) {
        if (*p == '<') sb_append(sb, "&lt;");
        else if (*p == '>') sb_append(sb, "&gt;");
        else if (*p == '&') sb_append(sb, "&amp;");
        else { char c[2] = {*p, '\0'}; sb_append(sb, c); }
    }
}

/* ---- SHA1 + base64, needed only for the WebSocket handshake's
 * Sec-WebSocket-Accept header (RFC 6455 -- no library available for
 * this in a plain MinGW/Win32 build, so it's implemented directly;
 * this is the ENTIRE reason this file needs either). ---- */
typedef struct { unsigned int h[5]; unsigned long long len; unsigned char buf[64]; int buf_len; } Sha1Ctx;
static unsigned int sha1_rol(unsigned int v, int b) { return (v << b) | (v >> (32 - b)); }
static void sha1_block(Sha1Ctx *ctx, const unsigned char *p) {
    unsigned int w[80];
    for (int i = 0; i < 16; i++) w[i] = (unsigned int)p[i*4]<<24 | (unsigned int)p[i*4+1]<<16 | (unsigned int)p[i*4+2]<<8 | (unsigned int)p[i*4+3];
    for (int i = 16; i < 80; i++) w[i] = sha1_rol(w[i-3]^w[i-8]^w[i-14]^w[i-16], 1);
    unsigned int a=ctx->h[0],b=ctx->h[1],c=ctx->h[2],d=ctx->h[3],e=ctx->h[4];
    for (int i = 0; i < 80; i++) {
        unsigned int f, k;
        if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
        else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        unsigned int temp = sha1_rol(a,5) + f + e + k + w[i];
        e=d; d=c; c=sha1_rol(b,30); b=a; a=temp;
    }
    ctx->h[0]+=a; ctx->h[1]+=b; ctx->h[2]+=c; ctx->h[3]+=d; ctx->h[4]+=e;
}
static void sha1_init(Sha1Ctx *ctx) { ctx->h[0]=0x67452301;ctx->h[1]=0xEFCDAB89;ctx->h[2]=0x98BADCFE;ctx->h[3]=0x10325476;ctx->h[4]=0xC3D2E1F0;ctx->len=0;ctx->buf_len=0; }
static void sha1_update(Sha1Ctx *ctx, const unsigned char *data, size_t len) {
    ctx->len += len;
    while (len > 0) {
        size_t take = 64 - (size_t)ctx->buf_len;
        if (take > len) take = len;
        memcpy(ctx->buf + ctx->buf_len, data, take);
        ctx->buf_len += (int)take; data += take; len -= take;
        if (ctx->buf_len == 64) { sha1_block(ctx, ctx->buf); ctx->buf_len = 0; }
    }
}
static void sha1_final(Sha1Ctx *ctx, unsigned char out[20]) {
    unsigned long long bitlen = ctx->len * 8;
    unsigned char pad = 0x80;
    sha1_update(ctx, &pad, 1);
    unsigned char zero = 0;
    while (ctx->buf_len != 56) sha1_update(ctx, &zero, 1);
    unsigned char lenbytes[8];
    for (int i = 0; i < 8; i++) lenbytes[i] = (unsigned char)(bitlen >> (56 - i*8));
    /* direct copy, bypassing sha1_update's padding loop, since buf_len==56 now */
    memcpy(ctx->buf + 56, lenbytes, 8);
    sha1_block(ctx, ctx->buf);
    for (int i = 0; i < 5; i++) { out[i*4]=(unsigned char)(ctx->h[i]>>24); out[i*4+1]=(unsigned char)(ctx->h[i]>>16); out[i*4+2]=(unsigned char)(ctx->h[i]>>8); out[i*4+3]=(unsigned char)ctx->h[i]; }
}
static void base64_encode(const unsigned char *data, size_t len, char *out) {
    static const char *tbl = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    size_t i = 0, o = 0;
    for (; i + 3 <= len; i += 3) {
        unsigned int v = (unsigned int)data[i]<<16 | (unsigned int)data[i+1]<<8 | data[i+2];
        out[o++]=tbl[(v>>18)&63]; out[o++]=tbl[(v>>12)&63]; out[o++]=tbl[(v>>6)&63]; out[o++]=tbl[v&63];
    }
    size_t rem = len - i;
    if (rem == 1) {
        unsigned int v = (unsigned int)data[i]<<16;
        out[o++]=tbl[(v>>18)&63]; out[o++]=tbl[(v>>12)&63]; out[o++]='='; out[o++]='=';
    } else if (rem == 2) {
        unsigned int v = (unsigned int)data[i]<<16 | (unsigned int)data[i+1]<<8;
        out[o++]=tbl[(v>>18)&63]; out[o++]=tbl[(v>>12)&63]; out[o++]=tbl[(v>>6)&63]; out[o++]='=';
    }
    out[o] = '\0';
}
static void compute_websocket_accept(const char *client_key, char out_b64[64]) {
    static const char *guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    char combined[256];
    snprintf(combined, sizeof(combined), "%s%s", client_key, guid);
    Sha1Ctx ctx; sha1_init(&ctx);
    sha1_update(&ctx, (const unsigned char *)combined, strlen(combined));
    unsigned char digest[20];
    sha1_final(&ctx, digest);
    base64_encode(digest, 20, out_b64);
}

/* ---- WebSocket framing (RFC 6455), server<->browser text frames only
 * -- no fragmentation, no binary, no >64KiB payloads: everything this
 * app ever sends or receives is one HTML fragment or one short
 * "click:ID" string, comfortably inside the 16-bit extended-length
 * frame format. ---- */
static int ws_send_text(SOCKET sock, const char *text) {
    size_t len = strlen(text);
    unsigned char header[10];
    int hlen;
    if (len <= 125) { header[0]=0x81; header[1]=(unsigned char)len; hlen=2; }
    else { header[0]=0x81; header[1]=126; header[2]=(unsigned char)(len>>8); header[3]=(unsigned char)len; hlen=4; }
    if (send(sock, (const char *)header, hlen, 0) <= 0) return 0;
    if (len > 0 && send(sock, text, (int)len, 0) <= 0) return 0;
    return 1;
}
/* Reads exactly one masked client->server text frame into `out` (caller-
 * sized buffer); returns 0 on disconnect/error/close-frame/unsupported
 * frame, 1 on a successfully decoded text frame. */
static int ws_recv_text(SOCKET sock, char *out, size_t out_cap) {
    unsigned char hdr[2];
    if (recv(sock, (char *)hdr, 2, MSG_WAITALL) != 2) return 0;
    int opcode = hdr[0] & 0x0F;
    int masked = (hdr[1] & 0x80) != 0;
    unsigned long long paylen = hdr[1] & 0x7F;
    if (paylen == 126) {
        unsigned char ext[2];
        if (recv(sock, (char *)ext, 2, MSG_WAITALL) != 2) return 0;
        paylen = (unsigned int)ext[0]<<8 | ext[1];
    } else if (paylen == 127) {
        return 0; /* nothing this app sends is ever remotely this large -- treat as protocol error */
    }
    unsigned char mask[4] = {0,0,0,0};
    if (masked) { if (recv(sock, (char *)mask, 4, MSG_WAITALL) != 4) return 0; }
    if (paylen >= out_cap) return 0;
    if (paylen > 0 && recv(sock, out, (int)paylen, MSG_WAITALL) != (int)paylen) return 0;
    if (masked) for (unsigned long long i = 0; i < paylen; i++) out[i] ^= mask[i % 4];
    out[paylen] = '\0';
    return opcode == 0x1; /* 0x1 = text frame; 0x8 (close) and everything else politely ignored/dropped */
}

static int g_web_root_device_index = -1; /* -1 = serve g_elements' top level; otherwise a device element's runtime_id whose CHILDREN get served (see uiEmbedApp/uiStartWebServer) */
static HANDLE g_web_thread = NULL;
static HANDLE g_web_response_ready = NULL;
static CRITICAL_SECTION g_web_dispatch_lock;
static int g_web_dispatch_lock_init = 0;
static char g_web_request_path[1536] = "/";
static char *g_web_response_html = NULL;
static int g_web_request_body_only = 0; /* set by dispatch_click_and_render -- see handle_web_request */

#define MAX_WS_CLIENTS 16
static SOCKET g_web_clients[MAX_WS_CLIENTS];
static int g_web_client_count = 0;
static CRITICAL_SECTION g_web_clients_lock;
static int g_web_clients_lock_init = 0;

static void ws_clients_add(SOCKET s) {
    EnterCriticalSection(&g_web_clients_lock);
    if (g_web_client_count < MAX_WS_CLIENTS) g_web_clients[g_web_client_count++] = s;
    LeaveCriticalSection(&g_web_clients_lock);
}
static void ws_clients_remove(SOCKET s) {
    EnterCriticalSection(&g_web_clients_lock);
    for (int i = 0; i < g_web_client_count; i++) {
        if (g_web_clients[i] == s) { g_web_clients[i] = g_web_clients[g_web_client_count-1]; g_web_client_count--; break; }
    }
    LeaveCriticalSection(&g_web_clients_lock);
}
/* Pushes the current app state to every live-connected browser tab --
 * what makes two tabs open on the same app stay in sync with no
 * reload, not just the one that triggered the change. `skip` avoids
 * sending it twice to whichever socket just triggered this itself
 * (that one gets its own direct reply right after). */
static void ws_broadcast_except(const char *html, SOCKET skip) {
    EnterCriticalSection(&g_web_clients_lock);
    for (int i = 0; i < g_web_client_count; i++) {
        if (g_web_clients[i] != skip) ws_send_text(g_web_clients[i], html);
    }
    LeaveCriticalSection(&g_web_clients_lock);
}

static void serialize_element_html(StrBuf *sb, Element *el) {
    int rid = el->runtime_id;
    const char *color = (g_color_override[rid] && g_color_override[rid][0]) ? g_color_override[rid] : element_attr(el, "color");
    const char *bg = element_attr(el, "background");
    const char *content = g_text_override[rid] ? g_text_override[rid] : el->content;
    const char *id = element_attr(el, "id");

    if (strcmp(el->type, "row") == 0 || strcmp(el->type, "column") == 0) {
        sb_appendf(sb, "<div style=\"display:flex;flex-direction:%s;gap:8px;align-items:flex-start;%s%s%s\">",
            strcmp(el->type, "row") == 0 ? "row" : "column",
            bg ? "background:" : "", bg ? bg : "", bg ? ";padding:8px;border-radius:8px;" : "");
        for (int i = 0; i < el->child_count; i++) serialize_element_html(sb, &el->children[i]);
        sb_append(sb, "</div>");
    } else if (strcmp(el->type, "button") == 0 || g_click_handlers[rid] != NULL) {
        /* onclick wins (and cancels the real navigation) whenever a live
         * socket is connected; href is what actually runs if it isn't --
         * see this file's own top comment on why both exist at once. */
        sb_appendf(sb, "<a class=\"cbtn\" href=\"/click/%s\" onclick=\"return cccClick('%s');\" style=\"color:%s;background:%s;\">",
            id ? id : "", id ? id : "", color ? color : "#fff", bg ? bg : "#333");
        html_escape_append(sb, content ? content : "");
        sb_append(sb, "</a>");
    } else if (strcmp(el->type, "text") == 0) {
        sb_appendf(sb, "<div style=\"color:%s;padding:4px;\">", color ? color : "#eee");
        html_escape_append(sb, content ? content : "");
        sb_append(sb, "</div>");
    } else if (strcmp(el->type, "spacer") == 0) {
        sb_append(sb, "<div style=\"width:8px;height:8px;\"></div>");
    }
    /* textarea/input/image/device/etc: deliberately not serialized -- see
     * this file's own top comment on why an honest gap beats a guess. */
}

/* Just the app's own content -- reused both inside the full page (on
 * first load) and as the raw text of every WebSocket push afterward,
 * so the client's one `document.getElementById('cccRoot').innerHTML =
 * event.data` handles both "reconnected" and "someone clicked
 * something" identically. */
static char *render_body_html(void) {
    StrBuf sb;
    sb_init(&sb);
    Element *items = g_elements.items;
    int count = g_elements.count;
    if (g_web_root_device_index >= 0) {
        Element *dev = element_by_runtime(g_elements.items, g_elements.count, g_web_root_device_index);
        items = dev != NULL ? dev->children : NULL;
        count = dev != NULL ? dev->child_count : 0;
    }
    for (int i = 0; i < count; i++) serialize_element_html(&sb, &items[i]);
    return sb.buf;
}

static char *render_web_page(void) {
    char *body = render_body_html();
    StrBuf sb;
    sb_init(&sb);
    sb_append(&sb,
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>Creal App</title>"
        "<style>body{background:#06121e;font-family:system-ui,sans-serif;margin:0;padding:20px;}"
        "a.cbtn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;"
        "border-radius:10px;padding:14px;margin:2px;font-weight:600;min-width:60px;min-height:40px;}"
        "</style></head><body>"
        "<div id=\"cccRoot\">");
    sb_append(&sb, body);
    free(body);
    sb_append(&sb, "</div>"
        /* The ENTIRE live-update client: connect, on message replace
         * cccRoot's contents, and route every click through the socket
         * first -- falling back to the real href (returning true) the
         * instant the socket isn't open, so the plain-HTTP path above
         * still works with this script blocked, failed, or absent. */
        "<script>"
        "var ccc = null;"
        "try { ccc = new WebSocket('ws://' + location.host + '/'); "
        "ccc.onmessage = function(e) { document.getElementById('cccRoot').innerHTML = e.data; }; } catch (err) {}"
        "function cccClick(id) {"
        "  if (ccc && ccc.readyState === 1) { ccc.send('click:' + id); return false; }"
        "  return true;"
        "}"
        "</script>"
        "</body></html>");
    return sb.buf;
}

/* Non-fatal id lookup for a request coming off the network -- a stale
 * or hand-typed URL must never crash the whole app the way
 * find_element_by_id's fatal exit(1) would. */
static int find_element_by_id_safe(const char *id) {
    Element *el = find_element_ptr(g_elements.items, g_elements.count, id);
    return el != NULL ? el->runtime_id : -1;
}

/* Runs the real click handler for `id` (if any) on the MAIN thread and
 * returns the freshly re-rendered body HTML -- shared by the plain-
 * HTTP path (whole page) and the WebSocket path (body fragment only).
 * g_web_dispatch_lock is held across the WHOLE round trip by the
 * caller, not just the PostMessage, so two worker threads can never
 * interleave their requests into this one shared hand-off. */
static char *dispatch_click_and_render(const char *id) {
    snprintf(g_web_request_path, sizeof(g_web_request_path), "/click/%s", id != NULL ? id : "");
    g_web_request_body_only = 1;
    g_web_response_html = NULL;
    PostMessage(g_hwnd, WM_APP_WEB_REQUEST, 0, 0);
    WaitForSingleObject(g_web_response_ready, INFINITE);
    g_web_request_body_only = 0;
    char *result = g_web_response_html;
    g_web_response_html = NULL;
    return result != NULL ? result : strdup("");
}

/* One dedicated thread per upgraded WebSocket connection -- see this
 * file's own top comment on why (one slow tab must never block
 * another). Loops until the browser tab closes or sends a close frame. */
static DWORD WINAPI ws_client_thread(LPVOID param) {
    SOCKET client = (SOCKET)(intptr_t)param;
    ws_clients_add(client);
    char msg[1024];
    while (ws_recv_text(client, msg, sizeof(msg))) {
        if (strncmp(msg, "click:", 6) == 0) {
            EnterCriticalSection(&g_web_dispatch_lock);
            char *body = dispatch_click_and_render(msg + 6);
            EnterCriticalSection(&g_web_clients_lock);
            ws_send_text(client, body);
            LeaveCriticalSection(&g_web_clients_lock);
            ws_broadcast_except(body, client);
            LeaveCriticalSection(&g_web_dispatch_lock);
            free(body);
        }
    }
    ws_clients_remove(client);
    closesocket(client);
    return 0;
}

static DWORD WINAPI web_server_thread(LPVOID param) {
    int port = (int)(intptr_t)param;
    WSADATA wsa;
    WSAStartup(MAKEWORD(2, 2), &wsa);
    SOCKET listen_sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK); /* loopback only -- a local dev preview, not exposed off this machine */
    addr.sin_port = htons((u_short)port);
    if (bind(listen_sock, (struct sockaddr *)&addr, sizeof(addr)) != 0) return 1;
    if (listen(listen_sock, 8) != 0) return 1;

    for (;;) {
        SOCKET client = accept(listen_sock, NULL, NULL);
        if (client == INVALID_SOCKET) break;
        char buf[2048];
        int n = recv(client, buf, sizeof(buf) - 1, 0);
        if (n <= 0) { closesocket(client); continue; }
        buf[n] = '\0';

        char path[512] = "/";
        char *p = strstr(buf, "GET ");
        if (p != NULL) {
            p += 4;
            char *end = strchr(p, ' ');
            if (end != NULL) {
                size_t len = (size_t)(end - p);
                if (len >= sizeof(path)) len = sizeof(path) - 1;
                memcpy(path, p, len);
                path[len] = '\0';
            }
        }

        /* A WebSocket upgrade request carries its own key header;
         * anything else (a plain page load, or a fallback /click/ID
         * navigation) is handled the original one-shot HTTP way. */
        char *key_line = strstr(buf, "Sec-WebSocket-Key:");
        if (key_line != NULL) {
            key_line += strlen("Sec-WebSocket-Key:");
            while (*key_line == ' ') key_line++;
            char key[128];
            int ki = 0;
            while (key_line[ki] != '\r' && key_line[ki] != '\n' && ki < (int)sizeof(key) - 1) { key[ki] = key_line[ki]; ki++; }
            key[ki] = '\0';
            char accept_key[64];
            compute_websocket_accept(key, accept_key);
            char response[512];
            snprintf(response, sizeof(response),
                "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n",
                accept_key);
            send(client, response, (int)strlen(response), 0);
            CreateThread(NULL, 0, ws_client_thread, (LPVOID)(intptr_t)client, 0, NULL);
            continue; /* this connection now belongs to its own thread; keep accepting others */
        }

        snprintf(g_web_request_path, sizeof(g_web_request_path), "%s", path);
        EnterCriticalSection(&g_web_dispatch_lock);
        g_web_response_html = NULL;
        PostMessage(g_hwnd, WM_APP_WEB_REQUEST, 0, 0);
        WaitForSingleObject(g_web_response_ready, INFINITE);
        char *body = g_web_response_html;
        g_web_response_html = NULL;
        LeaveCriticalSection(&g_web_dispatch_lock);

        const char *safe_body = body != NULL ? body : "<html><body>error</body></html>";
        int body_len = (int)strlen(safe_body);
        char header[256];
        snprintf(header, sizeof(header),
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: %d\r\nConnection: close\r\n\r\n",
            body_len);
        send(client, header, (int)strlen(header), 0);
        send(client, safe_body, body_len, 0);
        closesocket(client);
        free(body);
    }
    return 0;
}

/* Runs on the MAIN thread only -- see this file's own top comment.
 * Still used for the plain-HTTP path (GET / and GET /click/ID); the
 * WebSocket path calls dispatch_click_and_render directly instead,
 * since it only ever needs the body fragment, never the whole page. */
static void handle_web_request(void) {
    if (strncmp(g_web_request_path, "/click/", 7) == 0) {
        int idx = find_element_by_id_safe(g_web_request_path + 7);
        if (idx >= 0 && g_click_handlers[idx] != NULL) g_click_handlers[idx](g_click_userdata[idx]);
    }
    g_web_response_html = g_web_request_body_only ? render_body_html() : render_web_page();
    SetEvent(g_web_response_ready);
}

static void win32_start_web_server(int port, const char *root_device_id) {
    g_web_root_device_index = (root_device_id != NULL && root_device_id[0] != '\0') ? find_element_by_id(root_device_id) : -1;
    snprintf(g_web_display_url, sizeof(g_web_display_url), "ccc://localhost:%d/", port);
    if (g_hwnd != NULL) InvalidateRect(g_hwnd, NULL, FALSE);
    if (g_web_response_ready == NULL) g_web_response_ready = CreateEvent(NULL, FALSE, FALSE, NULL);
    if (!g_web_dispatch_lock_init) { InitializeCriticalSection(&g_web_dispatch_lock); g_web_dispatch_lock_init = 1; }
    if (!g_web_clients_lock_init) { InitializeCriticalSection(&g_web_clients_lock); g_web_clients_lock_init = 1; }
    if (g_web_thread == NULL) {
        g_web_thread = CreateThread(NULL, 0, web_server_thread, (LPVOID)(intptr_t)port, 0, NULL);
    }
}

#endif
