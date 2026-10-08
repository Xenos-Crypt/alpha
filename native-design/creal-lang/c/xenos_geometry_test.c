#include "win32_backend.c"
#include <assert.h>
int main(int argc,char **argv) {
    assert(argc==2);g_elements=parse_creal_file(argv[1]);assign_runtime_ids(g_elements.items,g_elements.count);ensure_state_capacity();init_buffers_rec(g_elements.items,g_elements.count);remember_positions(g_elements.items,g_elements.count,-1);g_workspace=1;
    HDC screen=GetDC(NULL),dc=CreateCompatibleDC(screen);HBITMAP bitmap=CreateCompatibleBitmap(screen,1440,950);ReleaseDC(NULL,screen);HGDIOBJ old=SelectObject(dc,bitmap);
    const char *ids[]={"aiPrompt","aiSend","aiStop","aiNew","aiMode","aiAllow","aiDeny","aiTranscript","aiStatus","body","aiPanel"};
    for(int state=0;state<2;state++) {
        win32_set_visible("aiApproval",state);paint_elements(dc,(RECT){0,0,1440,950});
        for(size_t i=0;i<sizeof(ids)/sizeof(*ids);i++){RECT r=g_rects[find_element_by_id(ids[i])];printf("RECT %d %s %ld %ld %ld %ld\n",state,ids[i],r.left,r.top,r.right,r.bottom);}
        RECT transcript=g_rects[find_element_by_id("aiTranscript")];assert(focusable_at((POINT){transcript.left+5,transcript.top+5})==-1);
    }
    SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);puts("PASS read-only transcript and AI control geometry");
}
