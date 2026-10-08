/* Native vector artwork for Creal's workspace elements. No external bitmap,
 * browser, or other UI runtime. Included after the backend's drawing helpers. */
static void icon_line(HDC dc, int x, int y, int s, int ax, int ay, int bx, int by) {
    MoveToEx(dc,x+ax*s/24,y+ay*s/24,NULL); LineTo(dc,x+bx*s/24,y+by*s/24);
}
static void draw_workspace_icon(HDC dc, const char *name, int x, int y, int s, COLORREF color) {
    HPEN pen=CreatePen(PS_SOLID,1,color), old=SelectObject(dc,pen);
    HBRUSH brush=SelectObject(dc,GetStockObject(NULL_BRUSH));
    if (!strcmp(name,"xenos")) {
        HPEN heavy=CreatePen(PS_SOLID,3,RGB(155,119,255)),previous=SelectObject(dc,heavy);
        icon_line(dc,x,y,s,4,3,20,21);icon_line(dc,x,y,s,20,3,4,21);
        SelectObject(dc,previous);DeleteObject(heavy);
        if((GetTickCount()/130)%19<3){icon_line(dc,x+3,y,s,3,8,15,8);icon_line(dc,x-2,y,s,8,17,22,17);}
    } else if (!strcmp(name,"railToggle")) {
        icon_line(dc,x,y,s,4,3,4,21);
        int direction=g_rail_collapsed?1:-1;
        icon_line(dc,x,y,s,12-direction*3,6,12+direction*3,12);
        icon_line(dc,x,y,s,12+direction*3,12,12-direction*3,18);
    } else if (!strcmp(name,"testing")) {
        icon_line(dc,x,y,s,8,2,16,2);icon_line(dc,x,y,s,9,2,9,10);icon_line(dc,x,y,s,15,2,15,10);
        POINT flask[]={{x+9*s/24,y+10*s/24},{x+3*s/24,y+21*s/24},{x+21*s/24,y+21*s/24},{x+15*s/24,y+10*s/24}};
        Polyline(dc,flask,4);icon_line(dc,x,y,s,6,16,18,16);
    } else if (!strcmp(name,"containers") || !strcmp(name,"layout")) {
        for(int i=0;i<4;i++)Rectangle(dc,x+2+(i%2)*s/2,y+2+(i/2)*s/2,x+s/2-1+(i%2)*s/2,y+s/2-1+(i/2)*s/2);
    } else if (!strcmp(name,"remote")) {
        Rectangle(dc,x+1,y+2,x+s-1,y+s-6);icon_line(dc,x,y,s,12,18,12,22);icon_line(dc,x,y,s,7,22,17,22);
        icon_line(dc,x,y,s,7,7,12,10);icon_line(dc,x,y,s,12,10,7,13);icon_line(dc,x,y,s,14,13,18,13);
    } else if (!strcmp(name,"history")) {
        Arc(dc,x+2,y+2,x+s-2,y+s-2,x+2,y+s/2,x+s/2,y+2);
        icon_line(dc,x,y,s,12,6,12,12);icon_line(dc,x,y,s,12,12,17,15);icon_line(dc,x,y,s,2,3,2,9);icon_line(dc,x,y,s,2,9,8,9);
    } else if (!strcmp(name,"collab")) {
        Ellipse(dc,x+3,y+2,x+s/2,y+s/2);Ellipse(dc,x+s/2,y+4,x+s-1,y+s/2+2);
        Arc(dc,x,y+s/2,x+s/2+3,y+s+6,x,y+s,x+s/2+3,y+s);icon_line(dc,x,y,s,14,15,22,21);
    } else if (!strcmp(name,"checker")) {
        POINT shield[]={{x+s/2,y+1},{x+s-2,y+5},{x+s-4,y+s-6},{x+s/2,y+s-1},{x+4,y+s-6},{x+2,y+5},{x+s/2,y+1}};
        Polyline(dc,shield,7);icon_line(dc,x,y,s,7,12,11,16);icon_line(dc,x,y,s,11,16,18,8);
    } else if (!strcmp(name,"move")) {
        icon_line(dc,x,y,s,12,2,12,22);icon_line(dc,x,y,s,2,12,22,12);
        icon_line(dc,x,y,s,8,6,12,2);icon_line(dc,x,y,s,12,2,16,6);icon_line(dc,x,y,s,18,8,22,12);icon_line(dc,x,y,s,22,12,18,16);
    } else if (!strcmp(name,"folder") || !strcmp(name,"projects")) {
        POINT points[]={{x+2*s/24,y+6*s/24},{x+10*s/24,y+6*s/24},{x+13*s/24,y+9*s/24},{x+22*s/24,y+9*s/24},{x+22*s/24,y+20*s/24},{x+2*s/24,y+20*s/24},{x+2*s/24,y+6*s/24}};
        Polyline(dc,points,7);
    } else if (!strcmp(name,"search")) {
        Ellipse(dc,x+s/8,y+s/8,x+16*s/24,y+16*s/24);
        icon_line(dc,x,y,s,15,15,22,22);
    } else if (!strcmp(name,"play")) {
        POINT points[]={{x+6*s/24,y+3*s/24},{x+20*s/24,y+12*s/24},{x+6*s/24,y+21*s/24},{x+6*s/24,y+3*s/24}};
        Polyline(dc,points,4);
    } else if (!strcmp(name,"terminal")) {
        RoundRect(dc,x+1,y+3,x+s-1,y+s-2,3,3);
        icon_line(dc,x,y,s,5,8,10,12);icon_line(dc,x,y,s,10,12,5,16);icon_line(dc,x,y,s,12,17,19,17);
    } else if (!strcmp(name,"git")) {
        Ellipse(dc,x+3*s/24,y+2*s/24,x+9*s/24,y+8*s/24);
        Ellipse(dc,x+16*s/24,y+5*s/24,x+22*s/24,y+11*s/24);
        Ellipse(dc,x+3*s/24,y+17*s/24,x+9*s/24,y+23*s/24);
        icon_line(dc,x,y,s,6,8,6,17);icon_line(dc,x,y,s,6,15,19,11);
    } else if (!strcmp(name,"spark") || !strcmp(name,"extensions")) {
        POINT points[]={{x+s/2,y},{x+15*s/24,y+9*s/24},{x+s,y+s/2},{x+15*s/24,y+15*s/24},{x+s/2,y+s},{x+9*s/24,y+15*s/24},{x,y+s/2},{x+9*s/24,y+9*s/24},{x+s/2,y}};
        Polyline(dc,points,9);
    } else if (!strcmp(name,"settings")) {
        Ellipse(dc,x+3,y+3,x+s-3,y+s-3);Ellipse(dc,x+6,y+6,x+s-6,y+s-6);
        for(int i=0;i<8;i++){double a=i*3.14159265/4; MoveToEx(dc,x+s/2+(int)(cos(a)*s*.38),y+s/2+(int)(sin(a)*s*.38),NULL);LineTo(dc,x+s/2+(int)(cos(a)*s*.5),y+s/2+(int)(sin(a)*s*.5));}
    } else if (!strcmp(name,"globe")) {
        Ellipse(dc,x+2*s/24,y+2*s/24,x+22*s/24,y+22*s/24);
        Ellipse(dc,x+8*s/24,y+2*s/24,x+16*s/24,y+22*s/24);
        icon_line(dc,x,y,s,2,12,22,12);
    } else if (!strcmp(name,"device")) {
        RoundRect(dc,x+s/4,y+1,x+3*s/4,y+s-1,3,3);icon_line(dc,x,y,s,10,19,14,19);
    } else if (!strcmp(name,"home")) {
        icon_line(dc,x,y,s,2,11,12,2);icon_line(dc,x,y,s,12,2,22,11);
        icon_line(dc,x,y,s,5,10,5,22);icon_line(dc,x,y,s,5,22,19,22);icon_line(dc,x,y,s,19,22,19,10);
    } else if (!strcmp(name,"plus")) {
        icon_line(dc,x,y,s,12,4,12,20);icon_line(dc,x,y,s,4,12,20,12);
    } else if (!strcmp(name,"minimize")) {
        icon_line(dc,x,y,s,6,12,18,12);
    } else if (!strcmp(name,"maximize")) {
        Rectangle(dc,x+4,y+4,x+s-4,y+s-4);
    } else if (!strcmp(name,"close")) {
        icon_line(dc,x,y,s,6,6,18,18);icon_line(dc,x,y,s,18,6,6,18);
    } else if (!strcmp(name,"check")) {
        icon_line(dc,x,y,s,4,12,9,17);icon_line(dc,x,y,s,9,17,20,5);
    } else if (!strcmp(name,"cloud")) {
        Arc(dc,x+1,y+5,x+s-1,y+s-2,x+s-1,y+s/2,x+1,y+s/2);icon_line(dc,x,y,s,3,20,21,20);
    } else if (!strcmp(name,"code")) {
        icon_line(dc,x,y,s,8,5,2,12);icon_line(dc,x,y,s,2,12,8,19);icon_line(dc,x,y,s,16,5,22,12);icon_line(dc,x,y,s,22,12,16,19);
    } else if (!strcmp(name,"bell")) {
        Arc(dc,x+4,y+2,x+s-4,y+s-2,x+4,y+s-4,x+s-4,y+s-4);icon_line(dc,x,y,s,3,19,21,19);
    } else {
        RoundRect(dc,x+3,y+1,x+s-3,y+s-1,2,2);
        icon_line(dc,x,y,s,7,8,17,8);icon_line(dc,x,y,s,7,12,17,12);icon_line(dc,x,y,s,7,16,14,16);
    }
    SelectObject(dc,brush);SelectObject(dc,old);DeleteObject(pen);
}
static void mark_polygon(HDC dc, int x, int y, int size, COLORREF color) {
    const int xy[][2]={{24,2},{8,2},{1,9},{1,23},{8,30},{24,30},{30,24},{23,18},{19,23},{12,23},{8,19},{8,13},{12,9},{19,9},{23,14},{30,8}};
    POINT points[16];for(int i=0;i<16;i++){points[i].x=x+xy[i][0]*size/32;points[i].y=y+xy[i][1]*size/32;}
    HBRUSH b=CreateSolidBrush(color),old=SelectObject(dc,b);HPEN pen=SelectObject(dc,GetStockObject(NULL_PEN));
    Polygon(dc,points,16);SelectObject(dc,pen);SelectObject(dc,old);DeleteObject(b);
}
static void draw_cryptic_mark(HDC dc, RECT r) {
    int size=r.bottom-r.top;if(size>r.right-r.left)size=r.right-r.left;
    int x=r.left+(r.right-r.left-size)/2,y=r.top;
    mark_polygon(dc,x,y,size,RGB(66,140,255));
    int phase=(GetTickCount()/130)%23;
    if(phase<3){int saved=SaveDC(dc);IntersectClipRect(dc,r.left,y+size/3,r.right,y+size/2);mark_polygon(dc,x+3,y,size,RGB(91,247,255));RestoreDC(dc,saved);}
    if(phase==2){int saved=SaveDC(dc);IntersectClipRect(dc,r.left,y+size*2/3,r.right,y+size*4/5);mark_polygon(dc,x-3,y,size,RGB(202,95,255));RestoreDC(dc,saved);}
}
/* Small cached procedural wallpaper; only the final blit runs per frame. */
static double art_noise(double x,double y) {
    return .5+.25*sin(x*3.1+sin(y*2.7))+.15*sin(y*6.1+x*2.9)+.1*sin(x*15.3-y*10.7);
}
static void draw_nebula(HDC dc,RECT r) {
    static HBITMAP bitmap=NULL;
    if(!bitmap) {
        BITMAPINFO info={0};info.bmiHeader.biSize=sizeof(BITMAPINFOHEADER);
        info.bmiHeader.biWidth=256;info.bmiHeader.biHeight=-512;info.bmiHeader.biPlanes=1;info.bmiHeader.biBitCount=32;
        unsigned int *pixels;bitmap=CreateDIBSection(dc,&info,DIB_RGB_COLORS,(void **)&pixels,NULL,0);
        if(!bitmap)return;
        for(int y=0;y<512;y++)for(int x=0;x<256;x++) {
            double nx=x/256.0,ny=y/512.0;
            double cloud=exp(-pow((nx-.9)*1.8,2)-pow((ny-.16)*9,2));
            double noise=art_noise(nx*5,ny*11)*art_noise(nx*12,ny*25);
            double radius=sqrt(pow((nx-.46)*.8,2)+pow((ny-1.06)*1.3,2));
            double rim=exp(-pow((radius-.32)*95,2));
            double glow=exp(-pow((radius-.32)*20,2));
            double light=cloud*(.16+noise)*.8+rim*.7+glow*.17;
            int red=5+(int)(light*70),green=7+(int)(light*37),blue=24+(int)(light*190);
            unsigned int hash=(unsigned int)(x*73856093u)^(unsigned int)(y*19349663u);
            if(hash%937==0){red+=75;green+=75;blue+=75;}
            if(red>255)red=255;
            if(green>255)green=255;
            if(blue>255)blue=255;
            pixels[y*256+x]=(unsigned int)((red<<16)|(green<<8)|blue);
        }
    }
    HDC source=CreateCompatibleDC(dc);HBITMAP previous=SelectObject(source,bitmap);
    SetStretchBltMode(dc,HALFTONE);StretchBlt(dc,r.left,r.top,r.right-r.left,r.bottom-r.top,source,0,0,256,512,SRCCOPY);
    SelectObject(source,previous);DeleteDC(source);
}
static void draw_source_minimap(HDC dc,RECT r,const char *source,const ResolvedSpan *spans,int count) {
    fill_panel(dc,r,RGB(4,14,24),NULL);
    int line=0,column=0;
    for(int i=0;source[i] && r.top+line*2<r.bottom;i++) {
        if(source[i]=='\n'){line++;column=0;continue;}
        if(source[i]!=' ' && source[i]!='\t' && column<r.right-r.left-3) {
            COLORREF color=RGB(91,115,143);
            for(int j=0;j<count;j++) if(i+1>=spans[j].start && i+1<=spans[j].end){color=spans[j].color;break;}
            SetPixel(dc,r.left+column,r.top+line*2,blend_color(color,RGB(4,14,24),.65));
        }
        column++;
    }
    RECT view={r.left,r.top,r.right,r.top+(line<40?line:40)*2+3};
    HBRUSH border=CreateSolidBrush(RGB(25,44,65));FrameRect(dc,&view,border);DeleteObject(border);
}
static void draw_wallpaper(HDC dc, RECT r, const char *path) {
    static HBITMAP bitmap = NULL;
    static char cached_path[MAX_PATH] = "";
    if (!path) { draw_nebula(dc, r); return; }
    if (strcmp(path, cached_path) != 0) {
        if (bitmap) DeleteObject(bitmap);
        bitmap = (HBITMAP)LoadImageA(NULL, path, IMAGE_BITMAP, 0, 0, LR_LOADFROMFILE | LR_CREATEDIBSECTION);
        snprintf(cached_path, sizeof(cached_path), "%s", path);
        if (!bitmap) fprintf(stderr, "Could not load device wallpaper '%s'\n", path);
    }
    if (!bitmap) { draw_nebula(dc, r); return; }
    BITMAP info; GetObject(bitmap, sizeof(info), &info);
    HDC source = CreateCompatibleDC(dc);
    HBITMAP previous = SelectObject(source, bitmap);
    SetStretchBltMode(dc, HALFTONE);
    StretchBlt(dc, r.left, r.top, r.right-r.left, r.bottom-r.top,
        source, 0, 0, info.bmWidth, info.bmHeight, SRCCOPY);
    SelectObject(source, previous); DeleteDC(source);
}
/* Loads and stretches a cached, previously-rendered app-preview BMP
 * (produced offline by device_render.exe -- see that file's own
 * comment) into the phone's content area. Kept separate from
 * draw_wallpaper's own static cache -- both get called once per repaint
 * with DIFFERENT paths, and sharing one single-entry cache between them
 * would thrash (reload every frame) instead of actually caching either.
 * Returns 0 (drew nothing, caller should fall back to its own mock
 * content) if `path` is NULL/empty or the file can't be loaded --
 * exactly the "app not built/copied yet" case, same honesty convention
 * the rest of this file already follows (draw_using_note, etc). */
static int draw_app_preview(HDC dc, RECT r, const char *path) {
    static HBITMAP bitmap = NULL;
    static char cached_path[MAX_PATH] = "";
    static FILETIME cached_write_time = {0, 0};
    if (!path || !path[0]) return 0;
    /* Unlike draw_wallpaper's path (which only ever changes if the .cr
     * ITSELF is edited), this same path's underlying FILE is meant to
     * change every time device_render.exe re-renders the previewed app
     * -- caching on path alone would keep showing the first render
     * forever. Comparing the file's own last-write-time is what makes
     * an updated cache file actually show up on the next repaint. */
    WIN32_FILE_ATTRIBUTE_DATA info;
    int have_info = GetFileAttributesExA(path, GetFileExInfoStandard, &info);
    int stale = strcmp(path, cached_path) != 0 ||
        (have_info && CompareFileTime(&info.ftLastWriteTime, &cached_write_time) != 0);
    if (stale) {
        if (bitmap) { DeleteObject(bitmap); bitmap = NULL; }
        bitmap = (HBITMAP)LoadImageA(NULL, path, IMAGE_BITMAP, 0, 0, LR_LOADFROMFILE | LR_CREATEDIBSECTION);
        snprintf(cached_path, sizeof(cached_path), "%s", path);
        if (have_info) cached_write_time = info.ftLastWriteTime;
    }
    if (!bitmap) return 0;
    BITMAP bm; GetObject(bitmap, sizeof(bm), &bm);
    HDC source = CreateCompatibleDC(dc);
    HBITMAP previous = SelectObject(source, bitmap);
    SetStretchBltMode(dc, HALFTONE);
    StretchBlt(dc, r.left, r.top, r.right-r.left, r.bottom-r.top,
        source, 0, 0, bm.bmWidth, bm.bmHeight, SRCCOPY);
    SelectObject(source, previous); DeleteDC(source);
    return 1;
}
static void draw_device_concept(HDC dc, RECT r, const char *wallpaper, const char *app_preview) {
    int h=r.bottom-r.top,w=(int)(h*.49);
    if(w>r.right-r.left-12){w=r.right-r.left-12;h=(int)(w/0.49);}
    if(w<60||h<120)return;
    int saved_frame = SaveDC(dc);
    XFORM frame = {(FLOAT)w/240, 0, 0, (FLOAT)h/490,
        (FLOAT)(r.left+(r.right-r.left-w)/2), (FLOAT)r.top};
    SetGraphicsMode(dc, GM_ADVANCED);
    ModifyWorldTransform(dc, &frame, MWT_LEFTMULTIPLY);
    int x=0,y=4; w=240; h=490;
    RECT phone={x,y,x+w,y+h-8};
    HPEN pen=CreatePen(PS_SOLID,2,RGB(74,80,116)),oldpen=SelectObject(dc,pen);
    HBRUSH brush=CreateSolidBrush(RGB(2,5,13)),oldbrush=SelectObject(dc,brush);
    RoundRect(dc,phone.left,phone.top,phone.right,phone.bottom,28,28);
    SelectObject(dc,oldbrush);DeleteObject(brush);SelectObject(dc,oldpen);DeleteObject(pen);
    RECT screen={x+6,y+7,x+w-6,y+h-15};
    int saved=SaveDC(dc);
    BeginPath(dc); RoundRect(dc,screen.left,screen.top,screen.right,screen.bottom,22,22); EndPath(dc);
    SelectClipPath(dc,RGN_AND);
    draw_wallpaper(dc,screen,wallpaper);
    RECT time={x+15,y+10,x+w-12,y+26};draw_label(dc,time,"9:41",RGB(210,221,244),"tiny",DT_LEFT|DT_SINGLELINE);
    brush=CreateSolidBrush(RGB(210,221,244));
    for(int i=0;i<3;i++){RECT bar={x+w-45+i*4,y+21-i*3,x+w-43+i*4,y+23};FillRect(dc,&bar,brush);}
    RECT battery={x+w-27,y+13,x+w-17,y+20};FrameRect(dc,&battery,brush);
    RECT charge={x+w-25,y+15,x+w-19,y+18};FillRect(dc,&charge,brush);DeleteObject(brush);
    brush=CreateSolidBrush(RGB(1,3,10));RECT camera={x+w/2-15,y+10,x+w/2+15,y+16};FillRect(dc,&camera,brush);DeleteObject(brush);
    RECT content={x+6,y+30,x+w-6,y+h-57};
    if (!draw_app_preview(dc, content, app_preview)) {
        RECT title={x+18,y+47,x+w-14,y+74};draw_label(dc,title,"My App",RGB(241,242,255),"brand",DT_LEFT|DT_SINGLELINE);
        RECT welcome={x+18,y+82,x+w-14,y+106};draw_label(dc,welcome,"Hello, Cryptic!",RGB(235,231,255),"small",DT_LEFT|DT_SINGLELINE);
        RECT sub={x+18,y+102,x+w-14,y+122};draw_label(dc,sub,"Building something great!",RGB(153,157,193),"tiny",DT_LEFT|DT_SINGLELINE|DT_END_ELLIPSIS);
        int tilew=(w-42)/2,tileh=(h-205)/2;if(tileh>92)tileh=92;if(tileh<48)tileh=48;
        const char *names[]={"Projects","Files","Tasks","Settings"};const char *icons[]={"folder","files","check","settings"};
        for(int i=0;i<4;i++){
            int tx=x+16+(i%2)*(tilew+10),ty=y+137+(i/2)*(tileh+10);
            RECT tile={tx,ty,tx+tilew,ty+tileh};fill_panel(dc,tile,RGB(24,30,63),"#353456");
            RECT iconbg={tx+10,ty+10,tx+36,ty+36};fill_panel(dc,iconbg,i==1?RGB(111,58,216):RGB(57,66,216),i==1?"#8751e5":"#545eec");
            draw_workspace_icon(dc,icons[i],tx+14,ty+14,16,RGB(225,225,255));
            RECT text={tx+10,ty+39,tx+tilew-4,ty+55};draw_label(dc,text,names[i],RGB(215,220,243),"small",DT_LEFT|DT_SINGLELINE|DT_END_ELLIPSIS);
            const char *descriptions[]={"Manage your\nprojects","Access your files","Stay organized","Customize your\nexperience"};
            RECT description={tx+10,ty+57,tx+tilew-4,ty+tileh-3};
            draw_label(dc,description,descriptions[i],RGB(155,164,202),"tiny",DT_LEFT|DT_WORDBREAK);
        }
    }
    RECT nav={screen.left,screen.bottom-42,screen.right,screen.bottom};fill_panel(dc,nav,RGB(9,16,39),NULL);
    const char *navicons[]={"home","folder","files","settings"};
    const char *navlabels[]={"Home","Projects","Files","Profile"};
    for(int i=0;i<4;i++){
        int left=screen.left+i*(w-12)/4;
        COLORREF color=i?RGB(160,176,218):RGB(99,192,255);
        draw_workspace_icon(dc,navicons[i],left+21,screen.bottom-32,13,color);
        RECT label={left,screen.bottom-16,left+(w-12)/4,screen.bottom-3};
        draw_label(dc,label,navlabels[i],color,"tiny",DT_CENTER|DT_SINGLELINE);
    }
    RestoreDC(dc,saved);
    RestoreDC(dc,saved_frame);
}

/* A plain browser-window chrome (title/tab strip + address bar) around
 * the same app_preview bitmap draw_device_concept shows in a phone
 * frame -- for a `.co` that tagged itself #web (see win32_backend.c's
 * dispatch and editor.co's onRun). Unlike the phone frame, this one
 * just fills the WHOLE `r` rect edge to edge -- a browser window
 * reasonably fills whatever space it's given, it doesn't need to stay
 * phone-shaped and centered. Falls back to the same "nothing rendered
 * yet" empty-state text draw_app_preview's caller already handles via
 * its return value, kept consistent with draw_device_concept's own
 * fallback-to-something-visible behavior. */
static void draw_browser_concept(HDC dc, RECT r, const char *app_preview) {
    if (r.right - r.left < 60 || r.bottom - r.top < 80) return;
    fill_panel(dc, r, RGB(18, 22, 30), "#2a3242");
    RECT chrome = {r.left, r.top, r.right, r.top + 34};
    fill_panel(dc, chrome, RGB(28, 33, 44), NULL);
    HBRUSH dot = CreateSolidBrush(RGB(90, 96, 112));
    for (int i = 0; i < 3; i++) { RECT d = {r.left+12+i*16, r.top+13, r.left+20+i*16, r.top+21}; FillRect(dc, &d, dot); }
    DeleteObject(dot);
    RECT addr = {r.left + 64, r.top + 6, r.right - 12, r.top + 28};
    fill_panel(dc, addr, RGB(12, 16, 24), "#1c2330");
    RECT addr_label = {addr.left + 10, addr.top, addr.right - 10, addr.bottom};
    draw_label(dc, addr_label, "localhost", RGB(150, 162, 184), "tiny", DT_LEFT | DT_SINGLELINE | DT_VCENTER);
    RECT content = {r.left + 4, chrome.bottom + 4, r.right - 4, r.bottom - 4};
    if (!draw_app_preview(dc, content, app_preview)) {
        draw_label(dc, content, "Save and Run a .cr file to preview it here", RGB(120, 132, 154), "small", DT_CENTER | DT_VCENTER | DT_WORDBREAK);
    }
}

/* A plain desktop-window chrome (title bar only, no browser furniture)
 * around the same app_preview bitmap -- for a `.co` tagged #desktop.
 * Deliberately the simplest of the three frames: a desktop app is just
 * "a window with a title," nothing more specific to fake. */
static void draw_desktop_concept(HDC dc, RECT r, const char *app_preview) {
    if (r.right - r.left < 60 || r.bottom - r.top < 80) return;
    fill_panel(dc, r, RGB(14, 17, 24), "#242c3a");
    RECT title = {r.left, r.top, r.right, r.top + 30};
    fill_panel(dc, title, RGB(24, 29, 40), NULL);
    RECT title_label = {title.left + 12, title.top, title.right - 60, title.bottom};
    draw_label(dc, title_label, "App", RGB(200, 210, 228), "small", DT_LEFT | DT_SINGLELINE | DT_VCENTER);
    HBRUSH btn = CreateSolidBrush(RGB(70, 78, 96));
    for (int i = 0; i < 3; i++) { RECT b = {r.right-64+i*20, title.top+11, r.right-56+i*20, title.top+19}; FillRect(dc, &b, btn); }
    DeleteObject(btn);
    RECT content = {r.left + 4, title.bottom + 4, r.right - 4, r.bottom - 4};
    if (!draw_app_preview(dc, content, app_preview)) {
        draw_label(dc, content, "Save and Run a .cr file to preview it here", RGB(120, 132, 154), "small", DT_CENTER | DT_VCENTER | DT_WORDBREAK);
    }
}
