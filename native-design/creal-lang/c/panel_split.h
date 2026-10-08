/* Included after dimension helpers and before the recursive renderer. */
static int layout_element(HDC dc, Element *el, int x, int width, int y);
static int split_minimum(const Element *el, int vertical) {
    return dimension(el,vertical?"minheight":"minwidth",vertical?100:100);
}
static void split_sizes(Element *el, int total, int vertical, int *sizes) {
    int count=0, minimum=0;
    double sum=0;
    for(int i=0;i<el->child_count;i++) {
        Element *child=&el->children[i]; sizes[i]=0;
        if(!panel_visible(child)) continue;
        count++; minimum+=split_minimum(child,vertical);
        sum+=g_panes[child->runtime_id].share>0?g_panes[child->runtime_id].share:element_weight(child);
        sizes[i]=-1;
    }
    if(!count)return;
    int available=total-dimension(el,"spacing",6)*(count-1);
    if(available<0)available=0;
    if(minimum>available) {
        int assigned=0,seen=0;
        for(int i=0;i<el->child_count;i++) if(sizes[i]<0) {
            sizes[i]=++seen==count?available-assigned:available*split_minimum(&el->children[i],vertical)/minimum;
            assigned+=sizes[i];
        }
        return;
    }
    int remaining=available, pending=count;
    for(int pass=0;pass<count;pass++) {
        int clamped=0;
        for(int i=0;i<el->child_count;i++) if(sizes[i]<0) {
            Element *child=&el->children[i];
            double share=g_panes[child->runtime_id].share>0?g_panes[child->runtime_id].share:element_weight(child);
            int min=split_minimum(child,vertical);
            if(remaining*share/sum<min) {
                sizes[i]=min;remaining-=min;sum-=share;pending--;clamped=1;
            }
        }
        if(!clamped)break;
    }
    int assigned=0,seen=0;
    for(int i=0;i<el->child_count;i++) if(sizes[i]<0) {
        Element *child=&el->children[i];
        double share=g_panes[child->runtime_id].share>0?g_panes[child->runtime_id].share:element_weight(child);
        sizes[i]=++seen==pending?remaining-assigned:(int)(remaining*share/sum);
        assigned+=sizes[i];
    }
}
static int layout_split(HDC dc, Element *el, int x, int y, int width, int height) {
    int vertical=!strcmp(el->type,"column");
    int *sizes=calloc(el->child_count?el->child_count:1,sizeof(int));
    split_sizes(el,vertical?height:width,vertical,sizes);
    int cursor=vertical?y:x, previous=-1, spacing=dimension(el,"spacing",6);
    for(int i=0;i<el->child_count;i++) {
        Element *child=&el->children[i];
        if(!panel_visible(child))continue;
        if(previous>=0) {
            SplitHandle handle={{vertical?x:cursor,vertical?cursor:y,
                vertical?x+width:cursor+spacing,vertical?cursor+spacing:y+height},
                el->runtime_id,el->children[previous].runtime_id,child->runtime_id,vertical};
            int index=g_split_count++;g_split_handles[index]=handle;
            fill_panel(dc,handle.rect,index==g_split_hover||
                (g_split_dragging&&g_drag_split.parent==handle.parent&&g_drag_split.first==handle.first)?RGB(58,146,224):RGB(15,35,53),NULL);
            cursor+=spacing;
        }
        RECT slot={vertical?x:cursor,vertical?cursor:y,vertical?x+width:cursor+sizes[i],vertical?cursor+sizes[i]:y+height};
        g_panes[child->runtime_id].slot=slot;
        int saved=SaveDC(dc), parent=g_parent_height;
        IntersectClipRect(dc,slot.left,slot.top,slot.right,slot.bottom);
        g_parent_height=slot.bottom-slot.top;
        layout_element(dc,child,slot.left,slot.right-slot.left,slot.top);
        g_parent_height=parent;RestoreDC(dc,saved);
        cursor+=sizes[i];previous=i;
    }
    free(sizes);
    return height;
}
static void begin_split_drag(int index, POINT pt) {
    g_drag_split=g_split_handles[index];
    Element *parent=element_by_runtime(g_elements.items,g_elements.count,g_drag_split.parent);
    int total=0;
    for(int i=0;i<parent->child_count;i++) if(panel_visible(&parent->children[i])) {
        RECT r=g_panes[parent->children[i].runtime_id].slot;
        total+=g_drag_split.vertical?r.bottom-r.top:r.right-r.left;
    }
    if(total<=0)return;
    for(int i=0;i<parent->child_count;i++) if(panel_visible(&parent->children[i])) {
        PaneState *state=&g_panes[parent->children[i].runtime_id];RECT r=state->slot;
        state->share=100.0*(g_drag_split.vertical?r.bottom-r.top:r.right-r.left)/total;
    }
    RECT first=g_panes[g_drag_split.first].slot,second=g_panes[g_drag_split.second].slot;
    g_drag_first=g_drag_split.vertical?first.bottom-first.top:first.right-first.left;
    g_drag_total=g_drag_first+(g_drag_split.vertical?second.bottom-second.top:second.right-second.left);
    g_drag_share=g_panes[g_drag_split.first].share+g_panes[g_drag_split.second].share;
    g_drag_origin=g_drag_split.vertical?pt.y:pt.x;g_split_dragging=1;
    if(g_hwnd)SetCapture(g_hwnd);
}
static void move_split_drag(POINT pt) {
    if(!g_split_dragging||g_drag_total<=0)return;
    Element *first=element_by_runtime(g_elements.items,g_elements.count,g_drag_split.first);
    Element *second=element_by_runtime(g_elements.items,g_elements.count,g_drag_split.second);
    if(!first||!second){cancel_split_drag();return;}
    int low=split_minimum(first,g_drag_split.vertical), other=split_minimum(second,g_drag_split.vertical);
    if(low+other>g_drag_total){low=g_drag_total*low/(low+other);other=g_drag_total-low;}
    int size=g_drag_first+(g_drag_split.vertical?pt.y:pt.x)-g_drag_origin;
    if(size<low)size=low;
    if(size>g_drag_total-other)size=g_drag_total-other;
    g_panes[g_drag_split.first].share=g_drag_share*size/g_drag_total;
    g_panes[g_drag_split.second].share=g_drag_share-g_panes[g_drag_split.first].share;
    if(g_hwnd)InvalidateRect(g_hwnd,NULL,FALSE);
}
