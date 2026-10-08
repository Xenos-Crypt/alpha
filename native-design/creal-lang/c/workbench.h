/* Generic workbench controls; project behavior is wired by Coral. */
static void win32_scroll_tabs(const char *id,int delta) {
    int rid=find_element_by_id(id);g_scroll_offset[rid]+=delta;
    if(g_scroll_offset[rid]<0)g_scroll_offset[rid]=0;
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
static void win32_reveal_tab(const char *id) {
    g_tab_reveal=find_element_by_id(id);if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
static void win32_set_match(const char *id,const char *query) {
    SearchDecoration *s=&g_search[find_element_by_id(id)];free(s->needle);
    while(*query&&((unsigned char)*query)<=32)query++;
    s->needle=strdup(query);size_t n=strlen(s->needle);
    while(n&&((unsigned char)s->needle[n-1])<=32)s->needle[--n]=0;
    if(n>64)s->needle[64]=0;
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
static void win32_set_search_result(const char *id,const char *path,int line,const char *term) {
    win32_set_match(id,term);SearchDecoration *s=&g_search[find_element_by_id(id)];
    free(s->path);s->path=strdup(path);s->line=line;
}

static void set_group_hidden(Element *items,int count,const char *group,int except) {
    for(int i=0;i<count;i++) {
        const char *other=element_attr(&items[i],"group");
        if(other&&!strcmp(other,group)&&items[i].runtime_id!=except)g_panes[items[i].runtime_id].hidden=1;
        set_group_hidden(items[i].children,items[i].child_count,group,except);
    }
}
static void win32_set_visible(const char *id,int visible) {
    Element *el=find_element_ptr(g_elements.items,g_elements.count,id);
    if(!el){fprintf(stderr,"no element with id '%s'\n",id);exit(1);}
    const char *group=element_attr(el,"group");
    if(visible&&group)set_group_hidden(g_elements.items,g_elements.count,group,el->runtime_id);
    g_panes[el->runtime_id].hidden=!visible;
    if(!visible&&element_by_runtime(el,1,g_focused_index))g_focused_index=-1;
    g_split_count=0;g_split_hover=-1;
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
static int win32_is_visible(const char *id){return !g_panes[find_element_by_id(id)].hidden;}
static void win32_go_to_line(const char *id,int line) {
    int rid=find_element_by_id(id);TextBuffer *tb=g_buffers[rid];if(!tb)return;
    int offset=0;while(tb->text[offset]&&line>1)if(tb->text[offset++]=='\n')line--;
    tb->caret=offset;g_focused_index=rid;g_follow_caret=1;
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
static int win32_toggle_rail(void){g_rail_collapsed=!g_rail_collapsed;if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);return g_rail_collapsed;}
static int win32_toggle_moving(void){g_moving=!g_moving;g_move_pending=g_move_source=g_move_target=-1;if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);return g_moving;}
static int dockable(const Element *el){return element_attr(el,"panel")||element_attr(el,"dock");}
static RECT panel_header(const Element *el) {
    RECT r=g_rects[el->runtime_id];
    if(el->child_count) {
        RECT first=g_rects[el->children[0].runtime_id];
        if(first.bottom>r.top && first.bottom<r.bottom)r.bottom=first.bottom;
        else r.bottom=r.top+36;
    } else r.bottom=r.top+36;
    return r;
}
static int dock_at_rec(Element *items,int count,POINT pt,int header) {
    for(int i=0;i<count;i++) {
        Element *el=&items[i];if(!panel_visible(el))continue;
        RECT r=header?panel_header(el):g_rects[el->runtime_id];
        if(dockable(el)&&PtInRect(&r,pt))return el->runtime_id;
        int found=dock_at_rec(el->children,el->child_count,pt,header);if(found>=0)return found;
    }
    return -1;
}
static int swap_panels(int first,int second) {
    if(first<0||second<0||first==second)return 0;
    Element *a=element_by_runtime(g_elements.items,g_elements.count,first),*b=element_by_runtime(g_elements.items,g_elements.count,second);
    if(!a||!b||!dockable(a)||!dockable(b)||element_by_runtime(a,1,second)||element_by_runtime(b,1,first))return 0;
    double wa=g_panes[first].share>0?g_panes[first].share:element_weight(a);
    double wb=g_panes[second].share>0?g_panes[second].share:element_weight(b);
    Element tmp=*a;*a=*b;*b=tmp;
    g_panes[first].share=wb;g_panes[second].share=wa;
    g_split_count=0;g_split_hover=-1;
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
    return 1;
}
static void remember_positions(Element *items,int count,int parent) {
    for(int i=0;i<count;i++) {
        PaneState *state=&g_panes[items[i].runtime_id];state->parent=parent;state->index=i;
        state->initial_hidden=element_attr(&items[i],"hidden")!=NULL;state->hidden=state->initial_hidden;
        state->dockable=dockable(&items[i]);
        remember_positions(items[i].children,items[i].child_count,items[i].runtime_id);
    }
}
static void restore_positions(void) {
    for(int i=0;i<g_next_runtime_id;i++)if(g_panes[i].dockable) {
        Element *el=element_by_runtime(g_elements.items,g_elements.count,i);
        Element *parent=element_by_runtime(g_elements.items,g_elements.count,g_panes[i].parent);
        if(el&&parent&&g_panes[i].index<parent->child_count) {
            Element *slot=&parent->children[g_panes[i].index];Element tmp=*slot;*slot=*el;*el=tmp;
        }
    }
}
static void win32_on_change(const char *id,UIClickHandler handler,void *data) {
    int rid=find_element_by_id(id);g_change_handlers[rid]=handler;g_change_userdata[rid]=data;
}
static void queue_change(int id) {
    if(g_change_handlers[id]){g_pending_change=id;SetTimer(g_hwnd,3,200,NULL);}
}
static void paint_drag_headers(HDC dc,Element *items,int count) {
    for(int i=0;i<count;i++)if(panel_visible(&items[i])) {
        if(dockable(&items[i])) {
            RECT r=panel_header(&items[i]);r.top=r.bottom-2;
            fill_panel(dc,r,RGB(45,118,165),NULL);
            int mid=(r.left+r.right)/2;
            for(int dot=-1;dot<=1;dot++){RECT d={mid+dot*5,r.top-3,mid+dot*5+2,r.top-1};fill_panel(dc,d,RGB(117,197,249),NULL);}
        }
        paint_drag_headers(dc,items[i].children,items[i].child_count);
    }
}
static void paint_workbench_overlay(HDC dc) {
    if(g_moving)paint_drag_headers(dc,g_elements.items,g_elements.count);
    if(g_move_source>=0&&g_move_target>=0&&g_move_source!=g_move_target) {
        RECT r=g_rects[g_move_target];HBRUSH brush=CreateSolidBrush(RGB(80,175,255));
        for(int i=0;i<3;i++){FrameRect(dc,&r,brush);InflateRect(&r,-1,-1);}DeleteObject(brush);
        RECT label={r.left+5,r.top+32,r.right-5,r.top+58};
        fill_panel(dc,label,RGB(20,54,86),"#509fff");draw_label(dc,label,"Release to swap panels",RGB(220,238,255),"small",DT_CENTER|DT_VCENTER|DT_SINGLELINE);
    }
    if(g_rail_collapsed&&g_hovered>=0) {
        Element *el=element_by_runtime(g_elements.items,g_elements.count,g_hovered);
        if(el&&element_attr(el,"railitem")) {
            const char *label=element_attr(el,"tooltip");if(!label)label=el->content;
            if(!label)return;
            RECT r=g_rects[g_hovered];r.left=r.right+10;r.right=r.left+150;r.bottom=r.top+28;
            fill_panel(dc,r,RGB(18,38,60),"#355170");r.left+=9;
            draw_label(dc,r,label,RGB(216,232,250),"small",DT_LEFT|DT_VCENTER|DT_SINGLELINE);
        }
    }
}
