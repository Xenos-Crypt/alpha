/* Reusable split containers. No project-specific panel names or geometry. */
typedef struct { int hidden,initial_hidden,parent,index,dockable; double share; RECT slot; } PaneState;
typedef struct { RECT rect; int parent, first, second, vertical; } SplitHandle;
static PaneState *g_panes;
static SplitHandle *g_split_handles;
static int g_split_count, g_split_hover = -1, g_split_dragging;
static SplitHandle g_drag_split;
static int g_drag_origin, g_drag_first, g_drag_total;
static double g_drag_share;
static int g_parent_height;

static int panel_visible(const Element *el) {
    if (g_panes[el->runtime_id].hidden) return 0;
    if (element_attr(el, "collapse")) {
        for (int i=0; i<el->child_count; i++)
            if (panel_visible(&el->children[i])) return 1;
        return 0;
    }
    return 1;
}
static Element *element_by_runtime(Element *items, int count, int id) {
    for (int i=0; i<count; i++) {
        if (items[i].runtime_id == id) return &items[i];
        Element *found=element_by_runtime(items[i].children,items[i].child_count,id);
        if (found) return found;
    }
    return NULL;
}
static int split_at(POINT pt) {
    for (int i=g_split_count-1; i>=0; i--)
        if (PtInRect(&g_split_handles[i].rect,pt)) return i;
    return -1;
}
static void cancel_split_drag(void) {
    g_split_dragging=0;
    if (g_hwnd && GetCapture()==g_hwnd) ReleaseCapture();
}

static int g_rail_collapsed,g_moving,g_move_source=-1,g_move_target=-1;
static int g_move_pending=-1;static POINT g_move_origin;
static UIClickHandler *g_change_handlers;
static void **g_change_userdata;
static int g_pending_change=-1;
