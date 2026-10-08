#include "win32_backend.c"
#include <assert.h>
static RECT rect(const char *id){return g_rects[find_element_by_id(id)];}
static void paint(HDC dc){paint_elements(dc,(RECT){0,0,1440,950});}
static void dump(const char *state) {
    const char *ids[]={"navSearch","navFiles","navSettings","railToggle","navLarex","navChecker","navTesting","navContainers","navRemote","navCollab","body","panelsBtn","movableBtn","searchInput","exactList","suggestedList","exactToggle","suggestedToggle","previewTitle","gitPanel","checkerToggle","saveBtn","navAI","updateBtn"};
    for(int i=0;i<(int)(sizeof(ids)/sizeof(*ids));i++){RECT r=rect(ids[i]);printf("RECT %s %s %ld %ld %ld %ld\n",state,ids[i],r.left,r.top,r.right,r.bottom);}
}
int main(int argc,char **argv) {
    assert(argc==2);g_elements=parse_creal_file(argv[1]);assign_runtime_ids(g_elements.items,g_elements.count);
    ensure_state_capacity();init_buffers_rec(g_elements.items,g_elements.count);remember_positions(g_elements.items,g_elements.count,-1);g_workspace=1;
    HDC screen=GetDC(NULL),dc=CreateCompatibleDC(screen);HBITMAP bitmap=CreateCompatibleBitmap(screen,1440,950);ReleaseDC(NULL,screen);
    HGDIOBJ old=SelectObject(dc,bitmap);paint(dc);dump("home");
    assert(win32_is_visible("explorerPanel")&&!win32_is_visible("searchPanel")&&!win32_is_visible("servicePanel"));
    assert(!win32_is_visible("updateBtn"));
    win32_set_text("exactToggle","v  Exact matches (1)");
    assert(!strcmp(win32_get_text("exactToggle"),"v  Exact matches (1)"));
    win32_set_text("body","first\nsecond\nthird");win32_go_to_line("body",2);
    assert(g_buffers[find_element_by_id("body")]->caret==6);
    win32_set_visible("searchPanel",1);
    win32_add_text("exactList","fixtureExact","alpha.txt:1 magus");
    paint(dc);dump("search");
    assert(rect("exactList").bottom-rect("exactList").top==52);
    assert(!win32_is_visible("explorerPanel"));RECT input=rect("searchInput");
    assert(focusable_at((POINT){input.left+4,input.top+4})==find_element_by_id("searchInput"));
    win32_set_text("searchInput","magus");assert(!strcmp(win32_get_text("searchInput"),"magus"));
    win32_set_visible("exactList",0);paint(dc);assert(IsRectEmpty(&g_rects[find_element_by_id("exactList")]));
    win32_set_visible("exactList",1);
    int expanded=rect("navRail").right-rect("navRail").left;
    assert(win32_toggle_rail());paint(dc);dump("rail");
    RECT rail=rect("navRail"),settings=rect("navSettings");assert(rail.right-rail.left<expanded);
    assert(settings.bottom>=rail.bottom-2&&settings.right<=rail.right);
    assert(!win32_toggle_rail());
    win32_set_visible("servicePanel",1);win32_set_visible("checkerView",1);paint(dc);dump("checker");
    assert(!win32_is_visible("searchPanel")&&!win32_is_visible("testingView")&&win32_is_visible("checkerView"));
    reset_panel_layout();paint(dc);
    int preview=find_element_by_id("previewPanel"),git=find_element_by_id("gitPanel"),editor=find_element_by_id("codePanel");
    assert(swap_panels(preview,git));paint(dc);
    assert(rect("previewPanel").top>400&&rect("gitPanel").top<150);
    assert(swap_panels(editor,git));paint(dc);
    assert(!strcmp(win32_get_text("body"),"first\nsecond\nthird"));
    reset_panel_layout();paint(dc);
    for(int i=0;i<g_next_runtime_id;i++)if(g_panes[i].dockable) {
        Element *parent=element_by_runtime(g_elements.items,g_elements.count,g_panes[i].parent);
        assert(parent->children[g_panes[i].index].runtime_id==i);
    }
    assert(win32_is_visible("checkerView")); /* Layout reset keeps service UI selection. */
    assert(!win32_is_visible("servicePanel"));
    assert(win32_toggle_moving());assert(!win32_toggle_moving());
    win32_set_visible("updateBtn",1);paint(dc);assert(!IsRectEmpty(&g_rects[find_element_by_id("updateBtn")]));
    win32_set_visible("updateBtn",0);
    paint_elements(dc,(RECT){0,0,1000,720});assert(rect("fileStatus").bottom<=720);
    SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);
    puts("PASS workbench: sidebar exclusivity, input, rail, anchored settings, panel swaps/reset, buffer preservation and conditional updates");
    return 0;
}
