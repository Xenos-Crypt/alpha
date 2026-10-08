#include "win32_backend.c"
#include <assert.h>
int main(int argc,char **argv) {
    assert(argc==2);g_elements=parse_creal_file(argv[1]);assign_runtime_ids(g_elements.items,g_elements.count);ensure_state_capacity();init_buffers_rec(g_elements.items,g_elements.count);remember_positions(g_elements.items,g_elements.count,-1);g_workspace=1;
    HDC screen=GetDC(NULL),dc=CreateCompatibleDC(screen);HBITMAP bitmap=CreateCompatibleBitmap(screen,484,701);ReleaseDC(NULL,screen);HGDIOBJ old=SelectObject(dc,bitmap);
    paint_elements(dc,(RECT){0,0,484,701});
    const char *ids[]={"brandLabel","osLabel","emblem","helloText","welcomeText","langRow","startBtn","emergencyText"};
    for(size_t i=0;i<sizeof(ids)/sizeof(*ids);i++){RECT r=g_rects[find_element_by_id(ids[i])];printf("RECT %s %ld %ld %ld %ld\n",ids[i],r.left,r.top,r.right,r.bottom);}
    SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);puts("PASS welcome.cr geometry dump");
}
