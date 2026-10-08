# The 3D game integration (scene3d) — handoff notes

Written for: another AI (or a human) picking this up cold, so it doesn't
re-derive what's already been built, re-trip the same bugs, or guess at
decisions that were already made deliberately. If you're about to touch
3D rendering, the `scene3d*` Coral builtins, or `ashford.cr`/`ashford.co`,
read this first.

## What this is

"Another World" is a life-sim game (town, NPCs, player stats, dialogue,
eventually AI-driven behavior). The project's own split, stated by the
project owner and binding on how this is built:

- **coral** = logic. `.co` scripts, run by `coral-bytecode.exe`.
- **creal** = design/rendering. `.cr` files declare UI; the C code under
  `creal-lang/c/` turns them into pixels.

A browser/Three.js prototype of the full game already exists elsewhere
in this workspace (`c:\Users\WINDOWS11\Documents\game`) and proved out
the game design — stats, AI dialogue, backstories, death/reincarnation,
driving. **That prototype is done and frozen.** This scene3d work is the
real build, in coral+creal+C, starting from the town/world piece.

There is no GPU rendering capability anywhere in coral or creal before
this work — `creal-lang/c` was a 2D GDI UI toolkit only (see `backend.h`,
`win32_backend.c`). Building 3D meant starting a GPU pipeline completely
from scratch and then wiring it to both languages.

## The visual target: "Bodycam" realism — and why this isn't Unreal

The actual aesthetic goal, stated early on, is the look of **_Bodycam_
(Reissad Studio)** — the Unreal Engine 5 game that went viral because its
clips look like real police bodycam footage, not a game: no HUD at all,
handheld camera shake/tilt, fisheye lens distortion, and lighting/sound
realistic enough that footage gets mistaken for real. That's the bar,
not "a 3D game" in the generic sense — gritty, handheld, found-footage,
not a clean stylized render.

**Unreal Engine 5 was considered and explicitly rejected** as the engine
for the real build. Not because it can't hit that look (it's obviously
the easiest path to it — Lumen GI, Nanite, a mature post-process stack
all exist for free) but because the decision was made to build the
engine from scratch inside `creal` (C, Win32, hand-rolled OpenGL) rather
than adopt an external engine at all. That means the Bodycam look has to
be built by hand here — there is no Lumen, no Nanite, no built-in
post-process volume. Know this going in: **the fidelity ceiling of a
hand-rolled OpenGL 1.1-origin pipeline is real, and the gap between
"textured boxes with one directional light" (where this is now) and
"photoreal handheld bodycam footage" is enormous.** Whoever continues
this should set expectations accordingly rather than assume Unreal-level
output is coming from this codebase without Unreal-level engine
investment to match.

What's actually achievable by hand, roughly in order of payoff per
effort, and genuinely worth doing in `scene3d_gl.c`:
- **Lens/camera post-processing** — fisheye distortion, chromatic
  aberration, film grain, vignette, handheld shake tied to movement
  speed. This is the single highest-value piece for *reading* as
  "bodycam" even before lighting improves, and it's cheap: a fragment
  shader pass over the already-existing FBO color texture, run as a
  second pass before `glReadPixels`. **This was already built once**, in
  the browser/Three.js prototype (`c:\Users\WINDOWS11\Documents\game\world.js`
  — look for the post-processing shader/`EffectComposer` setup there).
  That GLSL is a direct reference for porting the same effect here; the
  technique (not the Three.js-specific code) carries over exactly. The
  actual GLSL, copied directly from `world.js` (`bodycamShader`) so it
  doesn't need to be re-found — this is plain GLSL fragment-shader logic,
  not Three.js-specific, and ports to a second `scene3d_gl.c` shader
  pass (sample the existing color FBO texture as `tDiffuse`, run this,
  write to a second FBO, `glReadPixels` *that* one instead) with no
  conceptual changes, just C/WGL plumbing instead of `ShaderPass`:
  ```glsl
  uniform sampler2D tDiffuse;
  uniform float time, aberration, grain, vignette, exposureFlicker;
  varying vec2 vUv;
  float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){
    vec2 uv=vUv;
    vec2 centered=uv-.5;
    float dist=length(centered);
    vec2 dir=normalize(centered+1e-6);
    float shift=aberration*dist;
    float r=texture2D(tDiffuse,uv-dir*shift).r;
    float g=texture2D(tDiffuse,uv).g;
    float b=texture2D(tDiffuse,uv+dir*shift).b;
    vec3 color=vec3(r,g,b);
    float vig=1.0-smoothstep(.35,.85,dist)*vignette*.55;
    color*=vig;
    float flicker=1.0+(noise(vec2(time*4.0,1.0))-.5)*exposureFlicker;
    color*=flicker;
    float n=(noise(uv*vec2(800.0,800.0)+time*60.0)-.5)*grain;
    color+=n;
    gl_FragColor=vec4(color,1.0);
  }
  ```
  Defaults that read well (from the same source): `aberration=0.0022,
  grain=0.05, vignette=1.25, exposureFlicker=0.02`. Note this is
  chromatic aberration + vignette + film grain + exposure flicker —
  **no fisheye distortion yet even in the prototype**; that'd be a
  genuinely new addition (barrel-distort `uv` before sampling), not a
  port.
- **Lighting/exposure grading** — Bodycam-style footage is higher
  contrast and narrower dynamic range than a "nice" daylight render;
  the current single-directional-light setup is a good daylight look,
  not a bodycam one.
- **Material/texture realism** — more texture variance, dirt/wear, finer
  normal detail than the current flat box-projected textures.
- Further out: real geometry density, skeletal character animation,
  audio (mic-rub ambience, footsteps, shell casings) — all much bigger
  lifts than the above, not attempted yet in either the browser
  prototype or here.

## Architecture: mirror `backend.h`, don't invent a parallel pattern

`backend.h` already defines `UIBackend`, a vtable interface that
`win32_backend.c` implements and `coral-bytecode/vm_builtins_win.c`
calls through (`ui*` builtins → `win32_backend()->...`). **`scene3d.h` /
`scene3d_gl.c` follow the exact same shape** for 3D:

| 2D (existing)                        | 3D (this work)                      |
|---------------------------------------|---------------------------------------|
| `creal-lang/c/backend.h`             | `creal-lang/c/scene3d.h`             |
| `creal-lang/c/win32_backend.c`       | `creal-lang/c/scene3d_gl.c`          |
| `UIBackend` struct, `win32_backend()` | `Scene3D` struct, `scene3d_backend()` |
| `ui*` builtins (ids ~23-57)           | `scene3d*` builtins (ids 66-75)      |

Read `scene3d.h` top to bottom before changing anything — every function
has a comment explaining its contract and, where relevant, *why* it
exists in that shape. Don't duplicate that here; it'll drift out of sync.

## Two render modes

1. **Standalone** (`init` / `run`): the 3D view owns its own top-level
   window and message loop. Proven first (5 milestones, see git history /
   commit messages around "milestone 1" through "milestone 5" — hello
   triangle → shaders/matrices → mesh+camera → scene list+lighting →
   texturing). `init`/`run` still work and are useful for isolated 3D
   testing, but **the real game doesn't use this mode** — see below.

2. **Embedded** (`init_embedded` / `tick_embedded` / `get_pixels_bgra`):
   the 3D view renders into an off-screen FBO, gets read back to a CPU
   buffer (BGRA, top-down — exactly what a Windows DIB wants, zero
   conversion), and `win32_backend.c`'s `paint_scene3d()` blits it into a
   sub-rect of **Creal's own UI window** with `SetDIBitsToDevice`. Creal's
   ordinary 2D GDI drawing (title text, a stat panel, dialogue) composites
   with it in the same paint pass, same window. **This is what the real
   game uses.**

   Render-to-texture was chosen over a child HWND deliberately: a child
   window always paints in front of its parent, so 2D UI (a HUD, a
   dialogue box) could never be drawn *on top of* the 3D view. Read-back +
   blit keeps everything as ordinary pixels one HDC can layer freely.
   (Proven in isolation first in `gl_embed_test.c` before touching
   `win32_backend.c` — that throwaway file no longer exists, this
   description is the record of it.)

## How a `.cr` file gets a 3D view

```
scene3d height: 420
```

A `scene3d` element, same declaration style as any other Creal element
(`text`, `button`, `device`, ...). `win32_backend.c` recognizes the type
string directly — **no type registry exists anywhere in `element.c`**,
types are free-form strings dispatched by `strcmp` in `win32_backend.c`'s
layout/paint switch, so adding `scene3d` required zero changes to the
parser.

`height:` works via `leaf_height()` (defaults to 400 if omitted, same
pattern as `device`'s own height attribute). **Width is NOT read from the
`.cr` file at all right now** — see Known limitations.

`id:` works fine (standard Creal attribute) but isn't required — dispatch
is purely by element *type*, not id, since only one `scene3d` element is
supported right now anyway (see Known limitations).

## The Coral builtins

Registered in `coral-bytecode/compiler.c` (name → numeric id, ids 66-75)
and implemented in `coral-bytecode/vm_builtins_win.c` (`call_builtin`'s
switch, same cases). All of these just call through `scene3d_backend()`,
so they work identically whether the context was created via `init` or
`init_embedded` — the builtins don't know or care which mode is active.

```
scene3dInit(title, width, height)                          -- standalone only
scene3dLoadMesh(objPath) -> meshId
scene3dLoadTexture(bmpPath) -> textureId
scene3dSpawn(meshId, x, y, z, sx, sy, sz, r, g, b) -> objectId   -- PER-AXIS scale, not uniform
scene3dSetTransform(objectId, x, y, z, sx, sy, sz, yaw)
scene3dSetTexture(objectId, textureId)                       -- textureId -1 clears back to flat color
scene3dSetCamera(x, y, z, yaw, pitch)
scene3dSetLightDir(x, y, z)                                  -- one directional light, no falloff
scene3dOnTick(fnName)                                        -- fnName(dt) called every rendered frame
scene3dRun()                                                 -- standalone only, blocks until window closes
```

For the embedded flow (the real game), **don't call `scene3dInit` or
`scene3dRun` at all** — call `uiLoad("file.cr")` (whose `.cr` has a
`scene3d` element) and `uiRun()` instead. See `ashford.co` for the
working pattern. This matters — see the first bug below.

## Mesh/texture formats — hand-rolled, minimal, on purpose

- **Meshes**: native OBJ parser supports positions, UVs, authored normals, negative indices and polygon fan triangulation. Missing normals are computed per triangle. Storage grows with file size and face indices are checked. The Ashford asset folder includes town primitives and static posed human meshes.
- **Textures**: uncompressed 24/32bpp BMP, including alpha cutouts. UV-authored meshes use their own texture coordinates; unwrapped town geometry uses world-space box projection. Textures have mipmaps. Embedded rendering adds a cached directional shadow map, hemisphere-style ambient light, tone mapping and distance haze. This is not a complete PBR implementation.

## Build

```powershell
cd coral-lang/coral-bytecode
gcc -std=c11 -Wall -Wextra -O2 -I "../../creal-lang/c" -o coral-bytecode.exe `
    main.c chunk.c compiler.c debug.c vm.c vm_builtins_win.c memory.c `
    ../c/lexer.c ../c/ast.c ../c/parser.c ../c/value.c ../c/repl.c ../c/dirlist.c ../c/json_value.c ../c/native_jobs.c ../c/project_search.c `
    ../../creal-lang/c/win32_backend.c ../../creal-lang/c/lexer.c ../../creal-lang/c/element.c ../../creal-lang/c/catalog.c ../../creal-lang/c/edit.c ../../creal-lang/c/scene3d_gl.c `
    -lgdi32 -lmsimg32 -ladvapi32 -lshell32 -lws2_32 -lopengl32
```

(`build.ps1` in this directory does the same thing — use it, it's kept
in sync. The `-lopengl32` and the `scene3d_gl.c` object are the only
things this build needed on top of what already built `ui*`.)

Run the real game: `./coral-bytecode.exe ashford.co`

## Bugs found and fixed — read before you reintroduce them

**1. Calling `scene3d*` builtins right after `uiLoad()` crashed with no
error output (access violation, exit code `3221225477`).** Root cause:
the embedded GL context used to initialize *lazily*, on the first
`WM_PAINT`. But `WM_PAINT` only happens once `uiRun()`'s message loop
starts — and the natural way to write a Coral script is to build the
scene (`scene3dLoadMesh`/`scene3dSpawn`/...) *before* calling `uiRun()`.
Those calls were jumping through GL function pointers that were still
`NULL`. **Fixed** by having `win32_load()` (`uiLoad`'s implementation)
eagerly scan the parsed element tree for a `scene3d` element and call
`init_embedded()` immediately, before returning to the Coral script —
see `scan_for_scene3d()` in `win32_backend.c`. If you ever see this same
crash signature (early exit, access violation, zero output) after adding
a new embedded-mode entry point, suspect the same class of bug: a GL
call happening before the context exists.

Side note on debugging this: **this GUI-subsystem process's stdout/stderr
redirection is unreliable when launched detached** (`(exe > log 2>&1 &)`)
— even a fully successful run can produce an empty log file. A baseline
test (a trivial `.cr`/`.co` with no scene3d, confirmed to both run *and*
produce log output) is what revealed this wasn't a scene3d-specific
problem. When stdout capture goes empty, don't trust it either way —
check `tasklist` for whether the process is actually alive, and if you
need real debug output, write to a file directly with `fopen`/`fclose`
rather than relying on `printf`+redirection.

**2. A red herring**: the crash above was first (wrongly) blamed on the
`.cr` line's `id: gameView` attribute, because removing it "fixed" the
symptom. It didn't — removing the attribute coincidentally also
accompanied a test with an empty scene (no `scene3dSpawn` calls), which
doesn't trigger bug #1 at all. `id:` on a `scene3d` element works fine
and was confirmed with a regression test after the real fix landed.
Lesson for whoever picks this up: when a one-line change "fixes" a
crash, verify you've actually isolated the right variable before
documenting it as the cause.

**3. Enabling backface culling in the standalone scene-list milestone
made the entire scene render black.** The hand-authored `cube.obj`'s
winding isn't verified consistently CCW. Culling is **not enabled**
anywhere in `scene3d_gl.c` right now — if you add it, expect to need to
fix `assets/cube.obj`'s face winding first (or compute culling from
consistent normals rather than winding order).

**4. Coral-the-language gotchas** hit while writing `.co` game scripts
(not scene3d bugs, just real constraints of this VM, Phase 4-era):
   - **No `mod`/`%` operator exists.** Use arrays/explicit values instead
     of modulo for "cycle through N things" patterns.
   - **Arrays are 1-based**, not 0-based (`arr[1]` is the first element).
   - `repeat N times` is the loop form that exists (see `compiler.c`'s
     `compile_repeat`); indentation-delimited blocks, no `then` keyword
     needed for multi-line `if`/function bodies (`hello.co` is the
     canonical syntax reference).

## Known limitations (not bugs — explicitly deferred, scoped out loud)

- **Embedded view sizing is now dynamic.** Eager initialization still uses a safe initial 640px width; the paint pass resizes the same FBO to the actual Creal view rectangle, preserving scene objects and camera. Very large views cap render resolution at 4096 x 2160 and are stretched to fill the destination.
- **Only one `scene3d` element is supported at a time** — `scene3d_gl.c`
  is all global/static state (`g_meshes`, `g_objects`, `g_camX`, ...),
  not instanced. A second `scene3d` element would silently share the
  same scene/camera as the first, not get its own.
- **Embedded input is now scoped** to the host's foreground window and view rectangle. Right-drag looks, WASD moves, Shift runs. Diagonal motion is normalized, basic world AABB collision prevents walking through solid props, and scene3dSetInput(0/1) supports the Hold view control.
- **No declarative 3D scene format.** Everything in a scene is built by
  imperative Coral calls (`scene3dSpawn`, ...), not described in the
  `.cr` file the way 2D UI is. This cuts against Creal's whole design
  philosophy ("`.cr` files are what get designed") and is flagged in
  `scene3d.h`'s own top comment as intentionally deferred, not an
  oversight.
- **No full physics or native skeletal animation.** Collision is a simple AABB approximation; the character OBJ assets are static idle poses. A runtime character rig and more accurate collision remain future work.
- **No connection to the game's AI layer** (the OpenAI-backed
  NPC dialogue/backstory/judge-of-death system) the browser prototype
  had. `ashford.co`'s dialogue text is a hardcoded placeholder, not
  wired to any language model.

## File manifest

```
creal-lang/c/scene3d.h           -- the Scene3D interface (read this first)
creal-lang/c/scene3d_gl.c        -- Win32 + WGL + OpenGL implementation (both render modes)
creal-lang/c/assets/cube.obj     -- the only mesh asset that exists
creal-lang/c/test_out.bmp        -- pre-existing file, reused as a placeholder texture

coral-lang/coral-bytecode/compiler.c       -- scene3d* builtin name->id table (ids 66-75)
coral-lang/coral-bytecode/vm_builtins_win.c -- scene3d* builtin implementations, call through scene3d_backend()
coral-lang/coral-bytecode/build.ps1        -- build script, includes scene3d_gl.c + -lopengl32
coral-lang/coral-bytecode/ashford.cr       -- the real game shell's UI (title, scene3d view, stat panel, dialogue line)
coral-lang/coral-bytecode/ashford.co       -- the real game shell's logic (builds the town, wires stats, starts uiRun)
```

## Suggested next steps (as of this writing)

Roughly in order of what unblocks the most:
1. Fix the hardcoded 640px embedded width (read real layout width before `init_embedded`).
2. Multi-instance `scene3d_gl.c` state, if/when more than one 3D view is ever needed — not urgent.
3. Dialogue interaction: walking up to a building/NPC and triggering a text update (the mechanics for `uiSetText`-driven dialogue already proven working from `scene3dOnTick`; what's missing is proximity/trigger logic and real NPC objects, not the plumbing).
4. Hook the OpenAI-backed dialogue/backstory system from the browser prototype into the coral/creal build — likely via a new "fetch"-style builtin if one doesn't already work (`fetch` is registered in `compiler.c` at id 58 but has **no implementation** in `vm_builtins_win.c` yet — check that before assuming it works).
5. A real player/NPC character mesh instead of boxes, and basic collision.
6. The Bodycam post-processing pass (chromatic aberration/vignette/grain/exposure flicker — see "The visual target" above for the exact shader to port) — highest payoff-per-effort item for actually reading as "bodycam" rather than "a 3D render."

**Note for whoever reads this after the "Native design pass" entry below:**
that section documents real, separate work (asset-based textured
buildings, a stat sidebar, `scene3dSetInput`/builtin id 76, a proper
in-process screenshot mechanism) done after this file was first written.
Treat both sections as current — this one isn't stale, it's additive;
read both before assuming you know the full state.

## Native design pass — 8 October 2026

Ashford now has a larger Creal viewport, a green/stone palette, a stat sidebar with declarative meter elements, camera reset/overlook actions, and a panel toggle. The game shell title is supplied by the .cr file through title/windowwidth/windowheight attributes. Native OBJ/BMP assets provide textured facades, pitched roofs, street markings, cars, furniture, cutout foliage and posed humans. No NPC thinking or AI was added.

Scene3D appends resize_embedded, set_embedded_host and set_input_enabled; the last is exposed as Coral builtin 76, scene3dSetInput. Existing builtin ids and existing entry points stay intact.

The VM retains its 8-bit constant pool and function indices. Town placements are grouped into fewer than 256 small functions; object creation and a following transform must stay in the same function because temporary ids are local. The bytecode format was not changed.

Developer screenshots: set CREAL_CAPTURE_HIDDEN=1 and CREAL_CAPTURE_PATH to an absolute .bmp output path before running the game. uiRun renders one frame through Creal's own paint routine into an in-process DIB, writes it, and returns. Without these environment variables the normal interactive window runs as before. External hidden-window WM_PRINTCLIENT capture did not provide reliable pixels, so do not mistake a black external screenshot for a verified rendering result.

Build with build.ps1; it uses GCC when present or the included build-clang.ps1 fallback with the installed Windows SDK/MSVC linker. Double-click launch-ashford.bat to run from the correct asset directory.

## Architectural rebuild — 8 October 2026

The north street now uses hollow building shells with actual facade openings, thick window returns, projecting stone sills, timber frames, upper-room floors and furnishings. The Corner Cafe has a walkable doorway and furnished interior. Shopfront proportions, floor counts and roof profiles vary; the service passage includes an exterior stair, landing and continuous rails. Drain covers, cabinets, crates and planting add scale and local detail.

Coral builtin 77, scene3dSetMaterial(objectId, roughness, metalness, opacity), forwards to Scene3D.set_material. Defaults preserve opaque existing objects. Transparent surfaces draw after opaque geometry in camera-distance order with depth writes disabled; their backfaces are culled and they do not cast opaque shadows. Opaque mesh culling remains disabled for legacy assets. Material lighting and procedural sky reflections are approximations, not a complete PBR or scene-reflection system.

Foliage cards are combined into one UV-authored canopy mesh and reused, keeping authored town placement under the VM's function/constant limits. In generated Coral, object creation and the following transform or material assignment must remain together in one placement function.

The design was captured at the previous street camera position for comparison; before-buildings.png and the new native captures are retained in the workspace preview folder. Native runtime checks cover material bounds, OBJ parsing and collision; GPU captures cover the street, viewport changes, panel reflow, overview and cafe interior. No NPC thinking or AI was added.
