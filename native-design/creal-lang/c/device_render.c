/* Standalone, non-interactive renderer: parses one .cr file (an "app"
 * being built in Cryptic) and rasterizes it to a BMP file, at a given
 * size, with no window and no live event loop -- reuses the exact same
 * parse/layout/paint code path win32_backend.c uses for a real window
 * (same as workspace_test.c already does for its own render checks),
 * just pointed at an ARBITRARY caller-supplied .cr instead of a
 * hardcoded editor fixture.
 *
 * This is what makes the device-preview panel's "app was already
 * copied, so it still shows even disconnected" idea real: Cryptic (via
 * runCommand) shells out to this tool whenever the previewed app's .cr
 * changes, and the resulting BMP is the durable copy -- the preview
 * panel just loads and stretches whatever BMP is on disk (see
 * draw_device_concept in workspace_art.h), so it keeps showing the last
 * successfully rendered look even if this tool, or the app's own source,
 * is unavailable on a later run. */
#include "win32_backend.c"

int main(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "usage: device_render <app.cr> <out.bmp> [width] [height]\n");
        return 1;
    }
    int width = argc > 3 ? atoi(argv[3]) : 320;
    int height = argc > 4 ? atoi(argv[4]) : 640;
    if (width < 40) width = 40;
    if (height < 80) height = 80;

    g_elements = parse_creal_file(argv[1]);
    assign_runtime_ids(g_elements.items, g_elements.count);
    ensure_state_capacity();
    init_buffers_rec(g_elements.items, g_elements.count);
    remember_positions(g_elements.items, g_elements.count, -1);
    g_workspace = 0; /* a previewed app is an ordinary .cr layout, not Cryptic's own editor workspace */

    HDC dc = CreateCompatibleDC(NULL);
    BITMAPINFO info = {0};
    info.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    info.bmiHeader.biWidth = width;
    info.bmiHeader.biHeight = -height; /* negative = top-down, matches paint_elements' own coordinate direction */
    info.bmiHeader.biPlanes = 1;
    info.bmiHeader.biBitCount = 32;
    info.bmiHeader.biCompression = BI_RGB;
    void *pixels;
    HBITMAP bitmap = CreateDIBSection(dc, &info, DIB_RGB_COLORS, &pixels, NULL, 0);
    if (!bitmap) { fprintf(stderr, "device_render: CreateDIBSection failed\n"); return 1; }
    HBITMAP old = SelectObject(dc, bitmap);

    RECT client = {0, 0, width, height};
    paint_elements(dc, client);
    GdiFlush();

    FILE *file = fopen(argv[2], "wb");
    if (!file) { fprintf(stderr, "device_render: couldn't write '%s'\n", argv[2]); return 1; }
    BITMAPFILEHEADER header = {0};
    header.bfType = 0x4d42;
    header.bfOffBits = sizeof(header) + sizeof(BITMAPINFOHEADER);
    header.bfSize = header.bfOffBits + (DWORD)(width * height * 4);
    fwrite(&header, sizeof(header), 1, file);
    fwrite(&info.bmiHeader, sizeof(info.bmiHeader), 1, file);
    fwrite(pixels, (size_t)width * height * 4, 1, file);
    fclose(file);

    SelectObject(dc, old);
    DeleteObject(bitmap);
    DeleteDC(dc);
    return 0;
}
