/* Compile with lexer.c element.c catalog.c edit.c; backend included so the
 * geometry, clipping and rendering under test are the real implementation. */
#include "win32_backend.c"
#include <assert.h>

static void clicked(void *data) { (*(int *)data)++; }
static RECT rect_for(const char *id) { return g_rects[find_element_by_id(id)]; }

static void render(HDC dc, int width, int height) {
    RECT client = {0, 0, width, height};
    paint_elements(dc, client);
    RECT body = rect_for("body"), status = rect_for("fileStatus");
    assert(body.right > body.left + 300);
    assert(body.bottom > body.top + 300);
    assert(status.bottom <= height);
    assert(body.right < rect_for("previewTitle").left);
}

int main(int argc, char **argv) {
    assert(argc == 5);
    g_elements = parse_creal_file(argv[1]);
    assign_runtime_ids(g_elements.items, g_elements.count);
    ensure_state_capacity(); init_buffers_rec(g_elements.items, g_elements.count); remember_positions(g_elements.items,g_elements.count,-1);
    g_workspace = 1;
    const char *names[] = {"[-] examples", "   welcome.co", "   editor.cr", "   sample.txt", ">  notes", ">  c", "   README.md"};
    for (int i=0; i<7; i++) {
        char id[32]; snprintf(id,sizeof(id),"file%d",i);
        win32_add_text("fileList", id, names[i]);
    }
    win32_set_color("file1", "#55beff");
    win32_add_text("tabBar", "tab0", "welcome.co");
    win32_add_text("tabBar", "close0", "[x]");
    win32_add_text("tabBar", "tab1", "editor.cr");
    win32_add_text("tabBar", "close1", "[x]");
    win32_set_color("tab0", "#55beff");
    win32_set_text("fileStatus", "./welcome.co");
    FILE *source_file=fopen(argv[3],"rb");assert(source_file);
    fseek(source_file,0,SEEK_END);long source_size=ftell(source_file);rewind(source_file);
    char *sample=calloc((size_t)source_size+1,1);assert(sample);
    assert(fread(sample,1,(size_t)source_size,source_file)==(size_t)source_size);fclose(source_file);
    win32_set_text("body", sample);
    FILE *token_file=fopen(argv[4],"r");assert(token_file);
    HighlightSpan spans[4096];int count=0,start,end;char kind[40];
    while(count<4096 && fscanf(token_file,"%d %d %39s",&start,&end,kind)==3) {
        const char *color=!strcmp(kind,"keyword") ? "blue" : !strcmp(kind,"string") ? "green" : !strcmp(kind,"comment") ? "gray" : !strcmp(kind,"number") ? "orange" : !strcmp(kind,"operator") ? "pink" : "white";
        spans[count++]=(HighlightSpan){start,end,color};
    }
    fclose(token_file);assert(count>20);
    win32_set_highlight("body",spans,count);
    HDC dc = CreateCompatibleDC(NULL);
    BITMAPINFO info = {0}; info.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    info.bmiHeader.biWidth = 1440; info.bmiHeader.biHeight = -900;
    info.bmiHeader.biPlanes = 1; info.bmiHeader.biBitCount = 32; info.bmiHeader.biCompression = BI_RGB;
    void *pixels;
    HBITMAP bitmap = CreateDIBSection(dc, &info, DIB_RGB_COLORS, &pixels, NULL, 0);
    assert(bitmap); HBITMAP old = SelectObject(dc, bitmap);
    render(dc, 1000, 720);
    render(dc, 1440, 900);
    GdiFlush();
    FILE *file = fopen(argv[2],"wb"); assert(file);
    BITMAPFILEHEADER header = {0}; header.bfType=0x4d42;
    header.bfOffBits = sizeof(header)+sizeof(BITMAPINFOHEADER);
    header.bfSize = header.bfOffBits+1440*900*4;
    fwrite(&header,sizeof(header),1,file); fwrite(&info.bmiHeader,sizeof(info.bmiHeader),1,file);
    fwrite(pixels,1440*900*4,1,file); fclose(file);

    int calls=0; win32_on_click("file0",clicked,&calls);
    RECT list=rect_for("fileList"), first=rect_for("file0");
    POINT inside={first.left+2,first.top+2}; assert(button_at(inside)==find_element_by_id("file0"));
    for (int i=7;i<100;i++) {
        char id[32]; snprintf(id,sizeof(id),"file%d",i);
        win32_add_text("fileList",id,"test file"); win32_on_click(id,clicked,&calls);
    }
    g_scroll_offset[find_element_by_id("fileList")]=200;
    render(dc,1440,900);
    assert(button_at((POINT){list.left+2,list.top-2})==-1);
    char long_text[4096]; long_text[0]=0;
    for(int i=0;i<100;i++) strcat(long_text,"line of code\n");
    win32_set_text("body",long_text);
    int body_id=find_element_by_id("body"); g_focused_index=body_id;
    g_follow_caret=1; render(dc,1440,900);
    assert(g_scroll_offset[body_id]>0);
    g_buffers[body_id]->caret=0; g_follow_caret=1; render(dc,1440,900);
    assert(g_scroll_offset[body_id]==0);
    win32_set_text("body","new file"); assert(g_highlight_count[body_id]==0);
    assert(g_scroll_offset[body_id]==0);
    // Legacy .cr files keep the original centered, 160px text area geometry.
    g_workspace=0;
    Element legacy={0}; legacy.type="textarea";
    assert(leaf_height(&legacy)==160);
    Element weighted={0}; weighted.type="text";
    Attr attrs[]={{"weight","-2"},{"padding","-9"}};
    weighted.attrs=attrs; weighted.attr_count=2;
    assert(element_weight(&weighted)==1 && element_padding(&weighted,100)==0);
    SelectObject(dc,old); DeleteObject(bitmap); DeleteDC(dc);
    puts("PASS: desktop/small layout, clipped hit targets, textarea scroll, caret following, reset, legacy defaults.");
    return 0;
}
