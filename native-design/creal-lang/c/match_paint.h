/* Background search marks are independent from syntax foreground spans. */
static int match_offset(const char *text,int length,const char *needle,int from) {
    if(!needle||!*needle)return -1;
    int n=(int)strlen(needle);
    for(int i=from;i+n<=length;i++)if(!_strnicmp(text+i,needle,n))return i;
    return -1;
}
static void paint_matches(HDC dc,const char *text,int length,const char *needle,int x,int y,int height) {
    int at=match_offset(text,length,needle,0);
    if(at<0)return;
    int n=(int)strlen(needle);
    HBRUSH fill=CreateSolidBrush(RGB(99,73,24)),border=CreateSolidBrush(RGB(191,143,48));
    while(at>=0) {
        SIZE before={0},word={0};
        if(at)GetTextExtentPoint32A(dc,text,at,&before);
        GetTextExtentPoint32A(dc,text+at,n,&word);
        RECT mark={x+before.cx,y,x+before.cx+word.cx,y+height};
        FillRect(dc,&mark,fill);FrameRect(dc,&mark,border);
        at=match_offset(text,length,needle,at+n);
    }
    DeleteObject(fill);DeleteObject(border);
}
static void draw_search_result(HDC dc,RECT r,const char *snippet,const SearchDecoration *s) {
    int saved=SaveDC(dc);IntersectClipRect(dc,r.left,r.top,r.right,r.bottom);
    HFONT font=CreateFontA(-12,0,0,0,FW_NORMAL,0,0,0,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,0,"Segoe UI");
    HGDIOBJ old=SelectObject(dc,font);SetBkMode(dc,TRANSPARENT);
    const char *path=s->path;
    if(!strncmp(path,"./",2))path+=2;
    const char *name=strrchr(path,'/');name=name?name+1:path;
    int folder_len=(int)(name-path);if(folder_len)folder_len--;
    char folder[4096];snprintf(folder,sizeof(folder),"%.*s",folder_len,path);
    SIZE name_size;GetTextExtentPoint32A(dc,name,(int)strlen(name),&name_size);
    int name_width=name_size.cx,available=r.right-r.left-16;
    if(name_width>available*2/3)name_width=available*2/3;
    RECT filename={r.left+5,r.top+3,r.left+5+name_width,r.top+23};
    if(s->line==0)paint_matches(dc,name,(int)strlen(name),s->needle,filename.left,r.top+5,15);
    SetTextColor(dc,RGB(201,221,243));DrawTextA(dc,name,-1,&filename,DT_LEFT|DT_SINGLELINE|DT_VCENTER|DT_END_ELLIPSIS|DT_NOPREFIX);
    RECT directory={filename.right+9,r.top+3,r.right-5,r.top+23};
    SetTextColor(dc,RGB(113,143,173));DrawTextA(dc,folder,-1,&directory,DT_LEFT|DT_SINGLELINE|DT_VCENTER|DT_PATH_ELLIPSIS|DT_NOPREFIX);
    SelectObject(dc,old);DeleteObject(font);
    font=CreateFontA(-12,0,0,0,FW_NORMAL,0,0,0,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,0,"Consolas");
    old=SelectObject(dc,font);
    char line[32];snprintf(line,sizeof(line),s->line>0?"%d":"file",s->line);
    RECT number={r.left+5,r.top+26,r.left+34,r.top+44};
    SetTextColor(dc,RGB(111,146,181));DrawTextA(dc,line,-1,&number,DT_RIGHT|DT_SINGLELINE|DT_NOPREFIX);
    int x=r.left+42,y=r.top+26,length=(int)strlen(snippet);
    int hit=match_offset(snippet,length,s->needle,0),start=0;
    int columns=(r.right-x-6)/7;
    if(hit>=0&&hit+(int)strlen(s->needle)>columns)start=hit>8?hit-8:0;
    if(start){SetTextColor(dc,RGB(129,150,172));TextOutA(dc,x,y,"...",3);x+=21;}
    IntersectClipRect(dc,x,r.top+24,r.right-4,r.bottom);
    paint_matches(dc,snippet+start,length-start,s->needle,x,y,15);
    SetTextColor(dc,RGB(212,224,239));TextOutA(dc,x,y,snippet+start,length-start);
    SelectObject(dc,old);DeleteObject(font);RestoreDC(dc,saved);
}
