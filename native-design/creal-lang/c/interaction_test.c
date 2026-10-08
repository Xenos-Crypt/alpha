#include "win32_backend.c"
#include <assert.h>
static RECT rect(const char *id){return g_rects[find_element_by_id(id)];}
static void click(void *p){(*(int*)p)++;}
static void paint(HDC dc){paint_elements(dc,(RECT){0,0,1440,950});}
static POINT middle(RECT r){return (POINT){(r.left+r.right)/2,(r.top+r.bottom)/2};}
static LPARAM xy(POINT p){return MAKELPARAM(p.x,p.y);}
static void dump(const char *state,const char *id){RECT r=rect(id);printf("RECT %s %s %ld %ld %ld %ld\n",state,id,r.left,r.top,r.right,r.bottom);}
int main(int argc,char **argv) {
    assert(argc==2);g_elements=parse_creal_file(argv[1]);assign_runtime_ids(g_elements.items,g_elements.count);
    ensure_state_capacity();init_buffers_rec(g_elements.items,g_elements.count);remember_positions(g_elements.items,g_elements.count,-1);g_workspace=1;
    HDC screen=GetDC(NULL),dc=CreateCompatibleDC(screen);HBITMAP bitmap=CreateCompatibleBitmap(screen,1440,950);ReleaseDC(NULL,screen);
    HGDIOBJ old=SelectObject(dc,bitmap);int clicks=0;
    for(int i=0;i<25;i++) {
        char id[32],close[32],name[64];snprintf(id,sizeof(id),"tab%d",i);snprintf(close,sizeof(close),"close%d",i);
        if(i==0)strcpy(name,"./welcome.co");else snprintf(name,sizeof(name),"./file%02d.txt",i-1);
        win32_add_text("tabBar",id,name);win32_on_click(id,click,&clicks);
        win32_add_text("tabBar",close,"[x]");win32_on_click(close,click,&clicks);
    }
    win32_set_text("body","before\nmagus + MAGUS\nafter");
    HighlightSpan span={8,12,"#55beff"};win32_set_highlight("body",&span,1);win32_set_match("body"," magus ");
    assert(g_highlight_count[find_element_by_id("body")]==1);
    assert(!strcmp(g_search[find_element_by_id("body")].needle,"magus"));
    win32_reveal_tab("tab24");paint(dc);
    RECT bar=rect("tabBar"),last=rect("close24");
    assert(last.right-last.left==26&&last.right<=bar.right&&last.left>=bar.left);
    assert(rect("tab24").right-rect("tab24").left>=96);
    assert(button_at(middle(last))==find_element_by_id("close24"));
    assert(button_at((POINT){bar.right+2,bar.top+10})!=find_element_by_id("close24"));
    const char *ids[]={"tabBar","tab24","close24","tabsLeft","tabsRight","closeActiveTab","movableBtn","previewTitle","gitPanel","codePanel","body","navSearch","searchInput","exactList","saveBtn"};
    for(int i=0;i<(int)(sizeof(ids)/sizeof(*ids));i++)dump("last",ids[i]);
    win32_scroll_tabs("tabBar",-10000);paint(dc);
    assert(rect("tab0").left==bar.left&&rect("close0").right<=bar.right);
    dump("first","tab0");dump("first","close0");
    int marks=0;RECT body=rect("body");
    for(int y=body.top;y<body.top+65;y++)for(int x=body.left;x<body.left+240;x++)
        if(GetPixel(dc,x,y)==RGB(99,73,24))marks++;
    assert(marks>100); /* Both matches were painted without replacing syntax spans. */
    win32_set_match("body","");paint(dc);marks=0;
    for(int y=body.top;y<body.top+65;y++)for(int x=body.left;x<body.left+240;x++)if(GetPixel(dc,x,y)==RGB(99,73,24))marks++;
    assert(marks==0);
    assert(!strcmp(win32_get_text("body"),"before\nmagus + MAGUS\nafter"));
    win32_set_visible("searchPanel",1);win32_add_text("exactList","hit","magus + MAGUS");
    win32_set_search_result("hit","./src/main.txt",2,"magus");paint(dc);
    dump("search","hit");dump("search","searchInput");dump("search","body");
    assert(rect("hit").bottom-rect("hit").top==50);
    win32_set_visible("explorerPanel",1);paint(dc);win32_toggle_moving();
    int preview=find_element_by_id("previewPanel"),git=find_element_by_id("gitPanel"),code=find_element_by_id("codePanel");
    RECT title=rect("previewTitle");POINT source={title.left+50,title.bottom-1},dest=middle(rect("gitPanel"));
    assert(dock_at_rec(g_elements.items,g_elements.count,source,1)==preview);
    WndProc(NULL,WM_LBUTTONDOWN,MK_LBUTTON,xy(source));assert(g_move_pending==preview);
    WndProc(NULL,WM_MOUSEMOVE,MK_LBUTTON,xy(dest));assert(g_move_source==preview&&g_move_target==git);
    WndProc(NULL,WM_LBUTTONUP,0,xy(dest));paint(dc);
    assert(rect("previewPanel").top>400&&rect("gitPanel").top<150);
    dump("moved","previewTitle");reset_panel_layout();paint(dc);
    source=middle(rect("tab0"));dest=middle(rect("gitPanel"));
    WndProc(NULL,WM_LBUTTONDOWN,MK_LBUTTON,xy(source));assert(g_move_pending==code);
    WndProc(NULL,WM_LBUTTONUP,0,xy(source));assert(clicks==1); /* Click isn't a drag. */
    WndProc(NULL,WM_LBUTTONDOWN,MK_LBUTTON,xy(source));
    WndProc(NULL,WM_MOUSEMOVE,MK_LBUTTON,xy(dest));assert(g_move_source==code);
    WndProc(NULL,WM_LBUTTONUP,0,xy(dest));paint(dc);assert(rect("codePanel").top>400);
    assert(clicks==1);reset_panel_layout();paint(dc);
    source=middle(rect("tab0"));WndProc(NULL,WM_LBUTTONDOWN,MK_LBUTTON,xy(source));
    WndProc(NULL,WM_CAPTURECHANGED,0,0);assert(g_move_pending==-1&&g_move_source==-1);
    assert(!strcmp(win32_get_text("body"),"before\nmagus + MAGUS\nafter"));
    SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);
    puts("PASS 25-tab overflow, close hit targets, clipped scrolling, search pixels, lower-header dragging, clickable-header dragging/clicks and capture cancellation");
}
