/* Exercises actual split layout and input state, not a mock renderer. */
#include "win32_backend.c"
#include <assert.h>
static RECT rect(const char *id){return g_rects[find_element_by_id(id)];}
static int width(RECT r){return r.right-r.left;}
static int height(RECT r){return r.bottom-r.top;}
static int divider(const char *parent,int first) {
    int id=find_element_by_id(parent);
    for(int i=0;i<g_split_count;i++)if(g_split_handles[i].parent==id && (first<0||g_split_handles[i].first==first))return i;
    assert(!"Missing divider");return -1;
}
static void paint(HDC dc,int w,int h){paint_elements(dc,(RECT){0,0,w,h});}
int main(int argc,char **argv) {
    assert(argc==2);g_elements=parse_creal_file(argv[1]);
    assign_runtime_ids(g_elements.items,g_elements.count);ensure_state_capacity();
    init_buffers_rec(g_elements.items,g_elements.count); remember_positions(g_elements.items,g_elements.count,-1);g_workspace=1;
    HDC screen=GetDC(NULL),dc=CreateCompatibleDC(screen);
    HBITMAP bitmap=CreateCompatibleBitmap(screen,1440,950);ReleaseDC(NULL,screen);
    HGDIOBJ previous=SelectObject(dc,bitmap);
    win32_set_text("body","unsaved buffer stays intact");
    g_focused_index=find_element_by_id("body");
    paint(dc,1440,950);RECT original=rect("body");assert(g_split_count==7);
    const char *targets[]={"body","saveBtn","panelsBtn","closeExplorer","closePreview","closeDevices","closeAI"};
    for(int i=0;i<7;i++) {
        RECT r=rect(targets[i]);printf("RECT %s %ld %ld %ld %ld\n",targets[i],r.left,r.top,r.right,r.bottom);
    }
    for(int i=0;i<g_split_count;i++) {
        Element *parent=element_by_runtime(g_elements.items,g_elements.count,g_split_handles[i].parent);
        RECT r=g_split_handles[i].rect;
        printf("DIVIDER %s %ld %ld\n",element_attr(parent,"id"),r.left+2,r.top+2);
    }
    RECT old_close=rect("closePreview");
    win32_toggle_panel("previewPanel");win32_toggle_panel("devicesPanel");paint(dc,1440,950);
    assert(width(rect("body"))>width(original)+300);
    assert(button_at((POINT){old_close.left+3,old_close.top+3})!=find_element_by_id("closePreview"));
    assert(IsRectEmpty(&g_rects[find_element_by_id("previewPanel")]));
    assert(g_focused_index==find_element_by_id("body"));
    win32_toggle_panel("explorerPanel");paint(dc,1440,950);
    assert(rect("body").left<original.left-100);
    const char *bottom[]={"terminalPanel","problemsPanel","gitPanel","aiPanel"};
    for(int i=0;i<4;i++)win32_toggle_panel(bottom[i]);
    paint(dc,1440,950);
    assert(rect("body").bottom>original.bottom+200);
    assert(IsRectEmpty(&g_rects[find_element_by_id("bottomSplit")]));
    win32_toggle_panel("gitPanel");paint(dc,1440,950);
    assert(width(rect("gitPanel"))>1100);
    assert(!strcmp(win32_get_text("body"),"unsaved buffer stays intact"));
    reset_panel_layout();paint(dc,1440,950);
    assert(EqualRect(&original,&g_rects[find_element_by_id("body")]));
    int d=divider("topSplit",find_element_by_id("codePanel"));
    POINT start={g_split_handles[d].rect.left+2,g_split_handles[d].rect.top+20};
    int device_width=width(rect("devicesPanel"));
    begin_split_drag(d,start);move_split_drag((POINT){start.x+90,start.y});paint(dc,1440,950);
    assert(width(rect("body"))>width(original)+70);
    assert(abs(width(rect("devicesPanel"))-device_width)<=1);
    move_split_drag((POINT){-10000,start.y});paint(dc,1440,950);
    assert(width(g_panes[find_element_by_id("codePanel")].slot)>=220);
    cancel_split_drag();reset_panel_layout();paint(dc,1440,950);
    d=divider("mainSplit",-1);start=(POINT){g_split_handles[d].rect.left+10,g_split_handles[d].rect.top+2};
    begin_split_drag(d,start);move_split_drag((POINT){start.x,start.y+100});paint(dc,1440,950);
    assert(height(rect("body"))>height(original)+90);cancel_split_drag();
    paint(dc,1000,720);
    assert(rect("fileStatus").bottom<=720);
    assert(rect("body").right<rect("previewTitle").left);
    assert(height(g_panes[find_element_by_id("bottomSplit")].slot)>=140);
    HMENU menu=CreatePopupMenu();int *ids=calloc(g_next_runtime_id,sizeof(int)),count=0;
    append_panel_menu(menu,g_elements.items,g_elements.count,ids,&count);assert(count==9);
    for(int i=0;i<count;i++)assert(!!(GetMenuState(menu,1001+i,MF_BYCOMMAND)&MF_CHECKED)==!g_panes[ids[i]].hidden);
    DestroyMenu(menu);free(ids);
    assert(!strcmp(win32_get_text("body"),"unsaved buffer stays intact"));
    SelectObject(dc,previous);DeleteObject(bitmap);DeleteDC(dc);
    puts("PASS: horizontal/vertical drags, minimum sizes, hidden hit targets, close/reopen, empty-row collapse, reset, resize and buffer preservation");
    return 0;
}
