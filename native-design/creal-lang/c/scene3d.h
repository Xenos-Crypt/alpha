#ifndef CREAL_SCENE3D_H
#define CREAL_SCENE3D_H

/* The 3D counterpart to backend.h's UIBackend: a small, backend-agnostic
 * interface over a 3D scene, with scene3d_gl.c (Win32 + WGL + OpenGL) as
 * its first and only implementation today, same "swappable eventually"
 * spirit as backend.h. Where UIBackend's load() parses a declarative .cr
 * file into an Element tree, this is driven imperatively instead -- a
 * Coral script calls init/load_mesh/spawn/set_* directly (see
 * coral-bytecode's scene3d* builtins in vm_builtins_win.c) rather than
 * there being a 3D-scene-description file format yet. That's a real gap
 * (creal's whole point is that .cr files are what get designed, not
 * built by imperative calls) -- intentionally left for a later pass once
 * it's clear what a declarative 3D scene file actually needs to say. */

/* Unlike UIClickHandler (backend.h), a tick fires every rendered frame
 * with no element id to pass -- `dt` (seconds since the previous frame)
 * takes that argument slot instead, since frame-rate-independent
 * animation is the entire reason a script wants this hook at all. */
typedef void (*Scene3DTickHandler)(void *userdata, float dt);

typedef struct {
    /* Opens the window and creates the GL context. Every other call here
     * (except run()) expects this to have already happened. Fatal if a
     * GPU-backed context can't be created (matches backend.h's load()
     * being fatal on a bad .cr path -- same "fail loud" convention). */
    void (*init)(const char *title, int width, int height);

    /* Loads OBJ positions, optional UV coordinates and authored normals.
     * Missing normals are computed per triangle; negative indices work.
     * Returns a mesh id for spawn(). Fatal if the file
     * can't be read or parsed, same convention as every other fatal path
     * in this project. */
    int (*load_mesh)(const char *obj_path);

    /* Loads a texture from an uncompressed 24/32bpp .bmp file and
     * returns a texture id for set_texture() to use. Fatal if the file
     * can't be read, isn't a BMP, or uses an unsupported bit depth/
     * compression. */
    int (*load_texture)(const char *bmp_path);

    /* Creates a new object instancing `mesh_id` at this position, with a
     * PER-AXIS scale (sx,sy,sz -- not uniform: a ground slab or a wall
     * needs independent width/height/depth, not just a bigger cube),
     * flat-colored (r,g,b each 0..1) until/unless set_texture overrides
     * it. Returns an object id for set_transform/set_texture. */
    int (*spawn)(int mesh_id, float x, float y, float z, float sx, float sy, float sz, float r, float g, float b);

    /* Moves/resizes/re-yaws an existing object in place (every scene3d*
     * object spins around its own Y axis by nothing on its own -- a
     * Coral script wanting animation calls this every frame from
     * on_tick). Fatal if object_id doesn't exist. */
    void (*set_transform)(int object_id, float x, float y, float z, float sx, float sy, float sz, float yaw);

    /* Applies a loaded texture to an object (box-projected UVs -- see
     * scene3d_gl.c), or pass texture_id -1 to go back to that object's
     * flat spawn() color. Fatal if object_id doesn't exist. */
    void (*set_texture)(int object_id, int texture_id);

    /* Positions the built-in free first-person camera (WASD + mouse-look
     * once run() is pumping -- the player can always look around; this
     * just sets where they start, or lets a script reposition them). */
    void (*set_camera)(float x, float y, float z, float yaw, float pitch);

    /* A single directional light's direction (does not need
     * normalizing). No position/falloff -- this is still a "does
     * lighting work at all" primitive, not a real lighting model. */
    void (*set_light_dir)(float x, float y, float z);

    /* Registers `handler` to run once per rendered frame, during run()'s
     * loop -- called AFTER input/camera update, BEFORE that frame draws,
     * so a handler that calls spawn/set_transform/set_texture this frame
     * sees it rendered this same frame. NULL clears it. Only one handler
     * at a time (matches on_tick's single-handler shape in UIBackend --
     * a script wanting several things done per frame does them all in
     * one callback, same as it would with uiOnTick). */
    void (*on_tick)(Scene3DTickHandler handler, void *userdata);

    /* Blocks, pumping input and rendering every frame (free WASD+mouse
     * camera live the whole time, on_tick's handler firing every frame
     * if set), until the window closes -- same "blocks until the window
     * closes" contract as UIBackend's run(). Only for a STANDALONE 3D
     * window (see town.co) -- a scene embedded inside Creal's own UI
     * window (a "scene3d" .cr element; see win32_backend.c's
     * paint_scene3d) uses init_embedded/tick_embedded/get_pixels_bgra
     * below instead, since uiRun() owns that message loop. */
    void (*run)(void);

    /* The embedded counterpart to init() -- creates a HIDDEN helper
     * window purely to own a GL context (nothing in it is ever shown
     * directly), plus an off-screen FBO at width x height. Every other
     * call above (load_mesh/spawn/set_transform/set_texture/set_camera/
     * set_light_dir/on_tick) works identically afterward, since they all
     * just touch the same scene state regardless of which init* created
     * the context. Fatal under the same conditions as init(). */
    void (*init_embedded)(int width, int height);

    /* Polls WASD + right-click-drag mouse-look (see scene3d_gl.c's
     * s3d_update_embedded_input -- no cursor capture/recentering like
     * run()'s standalone camera uses, since that would hijack the mouse
     * from the rest of Creal's UI sharing this window), advances
     * on_tick's handler (if one is registered) with this dt, then
     * renders one frame into the embedded FBO. Call once per host
     * repaint. WASD polls GetAsyncKeyState process-wide, not scoped to
     * whether this element has focus -- a known simplification, not yet
     * fixed. */
    void (*tick_embedded)(float dt);

    /* The embedded FBO's last-rendered frame: BGRA, top-down, exactly
     * the byte/row order a Windows DIB wants -- a caller blits this
     * straight into its own HDC (SetDIBitsToDevice/StretchDIBits) with
     * no conversion. Valid only after init_embedded(); the pointer is
     * backend-owned and gets overwritten by the next tick_embedded(). */
    const unsigned char *(*get_pixels_bgra)(void);
    int (*get_embedded_width)(void);
    int (*get_embedded_height)(void);
    /* Reallocate only the framebuffer attachments, preserving scene and GL context. */
    void (*resize_embedded)(int width,int height);
    /* Host window + client-space view rectangle; input is limited to this view and focus. */
    void (*set_embedded_host)(void *window,int x,int y,int width,int height);
    /* Presentation control: disable exploration while a UI panel is being inspected. */
    void (*set_input_enabled)(int enabled);
    /* Authored surface parameters: roughness, metalness, opacity (all 0..1).
     * Transparent surfaces draw after opaque geometry and do not cast opaque shadows. */
    void (*set_material)(int object_id,float roughness,float metalness,float opacity);
} Scene3D;

const Scene3D *scene3d_backend(void);

#endif
