// Proper rooms for the town houses. Each house is split by inside walls into:
//   a hallway from the front door,
//   a living room (front, one side) and a bedroom behind it,
//   a kitchen with dining table (front, other side), a bathroom and a storage room behind it.
// The kitchen has a fridge, cooker with hood, sink, worktops, wall cupboards and the cookbook;
// the bathroom a shower, toilet and basin; the storage room shelves, a washing machine and a
// storage cupboard. Every inside doorway has a real door (E to open or close it). The house
// reports its rooms so things only work from the room they're in (no TV from the bedroom).
//
// House frame: `front` is the z of the wall with the front door, `dir` (+1/-1) points from the
// front wall to the back wall, the door is centred on `cx`, the house is W wide and D deep.
import * as THREE from 'three';

const WALL_T = 0.1, WALL_H = 2.9;

export function furnishHouse(ctx, h) {
  const { scene, colliders, sitSpots, interactables } = ctx;
  const K = ctx.kitchen;   // a function: the kitchen is created after the houses are built
  const { cx, front, dir, W, D, y } = h;
  const mats = ctx.mats || (ctx.mats = new Map());
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1 })); return mats.get(k); };
  const geo = ctx.boxGeo || (ctx.boxGeo = new THREE.BoxGeometry(1, 1, 1));
  const X = u => cx + u, Z = v => front + dir * v;
  const P = (u, v, yy) => new THREE.Vector3(X(u), yy, Z(v));
  // a box spanning u0..u1, v0..v1, from height y0 to y1 (above the floor)
  function B(u0, u1, v0, v1, y0, y1, c, solid = false, o) {
    const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c, o));
    m.scale.set(Math.abs(u1 - u0), y1 - y0, Math.abs(v1 - v0)); m.position.set(X((u0 + u1) / 2), y + (y0 + y1) / 2, Z((v0 + v1) / 2));
    m.castShadow = y1 - y0 > 0.5; m.receiveShadow = true; scene.add(m);
    if (solid) { const xs = [X(u0), X(u1)], zs = [Z(v0), Z(v1)]; colliders.push({ minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }); }
    return m;
  }
  const cyl = (u, v, r, y0, y1, c, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 14), mat(c, o)); m.position.set(X(u), y + (y0 + y1) / 2, Z(v)); scene.add(m); return m; };
  const floorPatch = (u0, u1, v0, v1, c, kind) => B(u0, u1, v0, v1, 0.02, 0.035, kind && ctx.floorMaterial ? ctx.floorMaterial(ctx.makeTex, kind, c, Math.abs(u1 - u0), Math.abs(v1 - v0)) : c);
  const spot = (u, v, r, label, action) => { const it = { pos: P(u, v, y), r, action }; if (typeof label === 'function') Object.defineProperty(it, 'label', { get: label }); else it.label = label; interactables.push(it); return it; };
  // wall along u at v, from u0 to u1, with doorway gaps [[a,b],...]
  const plaster = mat(0xf1ece2, { rough: 0.95 }), tile = mat(0xdfe6e8, { rough: 0.4 });
  function wallU(v, u0, u1, gaps = [], m = plaster) { let a = u0; for (const [g0, g1] of [...gaps, [u1, u1]]) { if (g0 - a > 0.05) B(a, g0, v - WALL_T / 2, v + WALL_T / 2, 0, WALL_H, m, true); a = g1; } }
  function wallV(u, v0, v1, gaps = [], m = plaster) {
    let a = v0;
    for (const [g0, g1, shut] of [...gaps, [v1, v1]]) { if (g0 - a > 0.05) B(u - WALL_T / 2, u + WALL_T / 2, a, g0, 0, WALL_H, m, true); if (g1 > g0) { B(u - WALL_T / 2, u + WALL_T / 2, g0, g1, 2.15, WALL_H, m); door(u, g0, g1, !!shut); } a = g1; }   // lintel and a door in each doorway
  }
  // inside doors: hinged at one side of the doorway, swing into the side room, solid when shut
  const doors = [], doorMat = mat(0xf3eee4, { rough: 0.6 }), knobMat = mat(0xc9b26b, { metal: 0.8, rough: 0.3 });
  function door(u, g0, g1, shut) {
    const len = g1 - g0 - 0.04, hinge = new THREE.Group(); hinge.position.set(X(u), y, Z(g0 + 0.02)); scene.add(hinge);
    const leaf = new THREE.Mesh(geo, doorMat); leaf.scale.set(0.045, 2.08, len); leaf.position.set(0, 1.06, dir * len / 2); leaf.castShadow = true; hinge.add(leaf);
    for (const sx of [-1, 1]) { const k = new THREE.Mesh(geo, knobMat); k.scale.set(0.07, 0.04, 0.12); k.position.set(sx * 0.05, 1.0, dir * (len - 0.12)); hinge.add(k); }
    for (const yy of [0.55, 1.5]) for (const sx of [-1, 1]) { const p = new THREE.Mesh(geo, mat(0xe6e0d4)); p.scale.set(0.01, 0.7, len - 0.3); p.position.set(sx * 0.025, yy, dir * len / 2); hinge.add(p); }   // panels
    const xs = [X(u) - 0.06, X(u) + 0.06], zs = [Z(g0), Z(g1)], col = { minX: xs[0], maxX: xs[1], minZ: Math.min(...zs), maxZ: Math.max(...zs) };
    const d = { hinge, col, len, dir, open: shut ? 0 : 1, target: shut ? 0 : 1, swing: Math.sign(u) * dir * Math.PI / 2 * 0.94 };
    hinge.rotation.y = d.swing * d.open; if (!d.open) colliders.push(col);
    interactables.push({ pos: P(u, (g0 + g1) / 2, y), r: 1.2, get label() { return d.target ? 'Close the door' : 'Open the door'; }, action: () => { d.target = d.target ? 0 : 1; const i = colliders.indexOf(col); if (d.target && i >= 0) colliders.splice(i, 1); else if (!d.target && i < 0) colliders.push(col); }, door: true });
    doors.push(d);
  }

  const hw = W / 2, mid = D / 2, bathD = D * 0.28, store0 = mid + bathD;
  // ---------------- inside walls ----------------
  wallV(-1, 0.02, D - 0.02, [[0.3, 1.3], [mid + 0.35, mid + 1.3, true]]);                 // hallway | living + bedroom (bedroom door shut)
  wallV(1, 0.02, D - 0.02, [[0.3, 1.3], [mid + 0.6, mid + 1.5, true], [store0 + 0.2, Math.min(D - 0.2, store0 + 1.1), true]]);   // hallway | kitchen + bathroom + storage
  // the rooms, in world coordinates (a hair inside the walls, so a doorway belongs to no room)
  const rect = (name, u0, u1, v0, v1) => { const xs = [X(u0), X(u1)], zs = [Z(v0), Z(v1)]; return { name, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }; };
  const rooms = [rect('hall', -0.95, 0.95, 0, D), rect('living', -hw, -1.05, 0, mid - 0.05), rect('bedroom', -hw, -1.05, mid + 0.05, D), rect('kitchen', 1.05, hw, 0, mid - 0.05), rect('bathroom', 1.05, hw, mid + 0.05, store0 - 0.05), rect('storage', 1.05, hw, store0 + 0.05, D)];
  wallU(mid, -hw + 0.05, -1);   // living | bedroom
  wallU(mid, 1, hw - 0.05);     // kitchen | bathroom
  wallU(store0, 1, hw - 0.05);  // bathroom | storage
  // floors: tiles in the kitchen, bathroom and storage, carpet in the bedroom, runner in the hall
  floorPatch(1.05, hw - 0.1, 0.1, mid - 0.05, 0xe2ddd2, 'checker'); floorPatch(1.05, hw - 0.1, mid + 0.05, store0 - 0.05, 0xd3e3ea, 'tiles');
  floorPatch(1.05, hw - 0.1, store0 + 0.05, D - 0.1, 0xa7a196, 'stone'); floorPatch(-hw + 0.1, -1.05, mid + 0.05, D - 0.1, 0x7b8fa8, 'carpet');
  floorPatch(-0.6, 0.6, 0.4, D - 0.4, 0x8a3b3b, 'carpet');
  // ceiling lights (glowing discs, no extra light sources)
  const lamp = mat(0xfff4dc, { emissive: 0xfff0cc, ei: 0.8 });
  for (const [u, v] of [[0, mid], [-hw / 2 - 0.5, mid / 2], [-hw / 2 - 0.5, mid + mid / 2], [hw / 2 + 0.5, mid / 2], [hw / 2 + 0.5, mid + bathD / 2], [hw / 2 + 0.5, (store0 + D) / 2]]) cyl(u, v, 0.22, WALL_H - 0.08, WALL_H - 0.02, 0xffffff).material = lamp;

  // ---------------- hallway ----------------
  B(-0.95, -0.7, 1.6, 2.6, 0, 0.5, 0x5a4636);   // shoe rack
  for (let i = 0; i < 3; i++) cyl(-0.92, 1.8 + i * 0.35, 0.03, 1.6, 1.75, 0x333333);   // coat hooks
  B(-0.98, -0.94, 1.6, 2.6, 1.7, 1.75, 0x5a4636);

  // ---------------- living room (front, left) ----------------
  const lu0 = -hw + 0.05, lu1 = -1, lv = (1.4 + mid) / 2 + 0.1;
  B(lu0 + 0.05, lu0 + 0.95, lv - 1.1, lv + 1.1, 0, 0.45, 0x55697d, true);          // sofa seat
  B(lu0 + 0.05, lu0 + 0.3, lv - 1.1, lv + 1.1, 0.45, 0.95, 0x4b5d70);              // back
  for (const s of [-1, 1]) B(lu0 + 0.05, lu0 + 0.95, lv + s * 1.1 - 0.12, lv + s * 1.1 + 0.12, 0.45, 0.7, 0x4b5d70);
  sitSpots.push({ x: X(lu0 + 0.6), z: Z(lv), yaw: dir > 0 ? Math.PI / 2 : Math.PI / 2, seatY: y + 0.45, label: 'Sit on the sofa' });
  floorPatch(lu0 + 1.1, lu1 - 0.4, lv - 1.2, lv + 1.2, 0xb0644e, 'carpet');           // rug
  B((lu0 + lu1) / 2 - 0.35, (lu0 + lu1) / 2 + 0.35, lv - 0.55, lv + 0.55, 0.36, 0.42, 0x7a5636);   // coffee table
  B((lu0 + lu1) / 2 - 0.3, (lu0 + lu1) / 2 + 0.3, lv - 0.5, lv + 0.5, 0, 0.36, 0x6a4a30);
  B(lu1 - 0.5, lu1 - 0.06, lv - 0.9, lv + 0.9, 0, 0.5, 0x2c2c2c, true);               // TV stand
  const tv = { x: X(lu1 - 0.13), y: y + 1.35, z: Z(lv), yaw: -Math.PI / 2, w: 1.6, h: 0.9 };   // TV on the hallway wall, facing the sofa
  B(lu1 - 0.12, lu1 - 0.07, lv - 0.82, lv + 0.82, 0.9, 1.8, 0x111111);
  B(lu0 + 0.1, lu0 + 0.45, 0.15, 0.95, 0, 1.9, 0x6b4a30);                            // bookshelf in the corner
  for (let i = 0; i < 4; i++) B(lu0 + 0.15, lu0 + 0.4, 0.2, 0.9, 0.3 + i * 0.42, 0.55 + i * 0.42, [0x8e3b2f, 0x2f6f8f, 0xc9a24a, 0x4b6a3a][i]);
  const pot = cyl(lu1 - 0.35, mid - 0.35, 0.18, 0, 0.35, 0xb5683f); cyl(lu1 - 0.35, mid - 0.35, 0.28, 0.35, 1.0, 0x3f7d3a);

  // ---------------- bedroom (back, left) ----------------
  const bu = (-hw + 0.05 - 1) / 2, bw = Math.min(1.6, hw - 1.6);
  B(bu - bw / 2, bu + bw / 2, D - 2.15, D - 0.08, 0, 0.35, 0x6b4a30, true);          // bed frame
  B(bu - bw / 2 + 0.05, bu + bw / 2 - 0.05, D - 2.1, D - 0.15, 0.35, 0.55, 0xf4f4f4);  // mattress
  B(bu - bw / 2 + 0.03, bu + bw / 2 - 0.03, D - 1.55, D - 0.6, 0.55, 0.62, 0x3e6f8f);  // duvet
  B(bu - bw / 2 + 0.15, bu + bw / 2 - 0.15, D - 0.55, D - 0.2, 0.55, 0.68, 0xffffff);  // pillow
  B(bu - bw / 2, bu + bw / 2, D - 0.12, D - 0.06, 0, 1.0, 0x5a3b26);                  // headboard
  for (const s of [-1, 1]) { const u = bu + s * (bw / 2 + 0.3); if (Math.abs(u) > 1.2 && Math.abs(u) < hw - 0.2) { B(u - 0.22, u + 0.22, D - 0.5, D - 0.1, 0, 0.5, 0x7a5636); cyl(u, D - 0.3, 0.1, 0.5, 0.75, 0xfff0cc, { emissive: 0xffd58a, ei: 0.6 }); } }
  B(-hw + 0.08, -hw + 0.65, mid + 0.25, mid + 1.65, 0, 2.05, 0x8a6a4a, true);        // wardrobe
  B(-hw + 0.64, -hw + 0.66, mid + 0.95, mid + 0.96, 0.2, 1.9, 0x3b2b1f);
  floorPatch(bu - 0.9, bu + 0.9, D - 3.0, D - 2.25, 0xc9b18a, 'carpet');
  spot(bu, D - 1.1, 1.7, 'Sleep in the bed', ctx.sleep);
  spot(-hw + 1.0, mid + 0.95, 1.0, 'Open the wardrobe', () => K().openStorage());

  // ---------------- kitchen (front, right) ----------------
  const ku1 = hw - 0.05, kf = ku1 - 0.62;   // worktops along the outside wall
  // fridge
  B(kf, ku1, 0.15, 0.85, 0, 1.85, 0xdfe3e6, true, { metal: 0.3, rough: 0.35 });
  B(kf - 0.01, kf, 0.2, 0.8, 1.15, 1.16, 0x9aa0a6); B(kf - 0.04, kf, 0.75, 0.79, 1.25, 1.6, 0x888888);
  // worktop run with the sink and the cooker
  const run0 = 0.85, run1 = mid - 0.1;
  B(kf, ku1, run0, run1, 0, 0.88, 0xf2f0ea, true); B(kf - 0.03, ku1, run0, run1, 0.88, 0.93, 0x5a5a5a, false, { rough: 0.3 });
  const sinkV = run0 + 0.55, cookV = Math.min(run1 - 0.75, run0 + 1.55), bookV = run1 - 0.3;
  B(kf + 0.08, ku1 - 0.1, sinkV - 0.28, sinkV + 0.28, 0.9, 0.94, 0xb8bcc2, false, { metal: 0.7, rough: 0.3 });
  cyl(ku1 - 0.12, sinkV, 0.02, 0.93, 1.2, 0xc0c4c8, { metal: 0.8, rough: 0.2 });
  B(kf - 0.01, ku1, cookV - 0.3, cookV + 0.3, 0, 0.94, 0xe8e8e8);                                // cooker
  B(kf, ku1, cookV - 0.3, cookV + 0.3, 0.935, 0.95, 0x1a1a1a);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(kf + 0.31 + a * 0.13, cookV + b * 0.13, 0.08, 0.95, 0.96, 0x333333);
  B(kf - 0.02, kf - 0.01, cookV - 0.25, cookV + 0.25, 0.2, 0.7, 0x222222);                      // oven door glass
  const ring = []; for (const [a, b] of [[-1, -1], [1, 1]]) { const r = cyl(kf + 0.31 + a * 0.13, cookV + b * 0.13, 0.07, 0.96, 0.965, 0x331000, { emissive: 0xff3300, ei: 0 }); r.material = r.material.clone(); ring.push(r); }
  const pan = cyl(kf + 0.18, cookV - 0.13, 0.13, 0.965, 1.03, 0x2b2b2b, { metal: 0.6, rough: 0.4 }); pan.visible = false;
  B(kf + 0.1, ku1, cookV - 0.35, cookV + 0.35, 1.65, 1.8, 0xb8bcc2, false, { metal: 0.6, rough: 0.35 });   // extractor hood
  B(ku1 - 0.25, ku1, cookV - 0.12, cookV + 0.12, 1.8, WALL_H, 0xb8bcc2, false, { metal: 0.6, rough: 0.35 });
  for (const [a, b] of [[run0, cookV - 0.4], [cookV + 0.4, run1]]) if (b - a > 0.3 && !(h.sideWindows || []).some(w => a < w + 0.85 && b > w - 0.85)) B(ku1 - 0.35, ku1, a, b, 1.5, 2.2, 0xe8e2d6);   // wall cupboards
  // cookbook on the end of the worktop, kettle, chopping board
  const book = B(kf + 0.12, kf + 0.42, bookV - 0.12, bookV + 0.12, 0.93, 0.98, 0xb5332e); book.rotation.y = 0.3;
  cyl(kf + 0.3, sinkV + 0.6, 0.08, 0.93, 1.15, 0xd0d0d0, { metal: 0.6 });
  B(kf + 0.1, kf + 0.5, cookV + 0.45, cookV + 0.75, 0.93, 0.95, 0xc9a26a);
  // dining table and two chairs
  const tu = 1 + (kf - 1) / 2 + 0.05, tv2 = mid / 2 + 0.15;
  B(tu - 0.45, tu + 0.45, tv2 - 0.4, tv2 + 0.4, 0.72, 0.76, 0x8a6440, true);
  B(tu - 0.05, tu + 0.05, tv2 - 0.05, tv2 + 0.05, 0, 0.72, 0x6a4a30);
  for (const s of [-1, 1]) { B(tu - 0.2, tu + 0.2, tv2 + s * 0.65 - 0.2, tv2 + s * 0.65 + 0.2, 0.42, 0.46, 0x6b4a30); B(tu - 0.2, tu + 0.2, tv2 + s * 0.85 - 0.03, tv2 + s * 0.85 + 0.03, 0.46, 0.95, 0x6b4a30);
    sitSpots.push({ x: X(tu), z: Z(tv2 + s * 0.65), yaw: (s * dir > 0) ? Math.PI : 0, seatY: y + 0.46, label: 'Sit at the table' }); }
  spot(kf - 0.4, 0.5, 1.0, 'Open the fridge', () => K().openFridge());
  spot(kf - 0.4, sinkV, 0.75, () => K().dishes ? `Wash the dishes (${K().dishes})` : 'Use the sink', () => K().dishes && ctx.chore ? ctx.chore('dishes', { count: K().dishes }) : K().washUp());
  spot(kf - 0.4, cookV, 0.8, () => K().cookerLabel(), () => K().openCooker());
  spot(kf - 0.4, bookV, 0.6, 'Read the cookbook', () => K().openCookbook());

  // ---------------- bathroom (back, right) ----------------
  const b0 = mid + 0.05, b1 = store0 - 0.05;
  B(hw - 1.05, hw - 0.05, b1 - 1.0, b1, 0, 0.12, 0xf6f6f2);                              // shower tray
  B(hw - 1.05, hw - 1.02, b1 - 1.0, b1, 0.12, 2.05, 0x9fd3ff, false, { opacity: 0.35, rough: 0.05 });   // glass screens
  B(hw - 1.05, hw - 0.05, b1 - 1.0, b1 - 0.97, 0.12, 2.05, 0x9fd3ff, false, { opacity: 0.35, rough: 0.05 });
  cyl(hw - 0.55, b1 - 0.5, 0.1, 2.0, 2.04, 0xc0c4c8, { metal: 0.8 });
  B(hw - 0.6, hw - 0.1, b0 + 0.25, b0 + 0.75, 0, 0.42, 0xf6f6f2);                        // toilet
  B(hw - 0.3, hw - 0.08, b0 + 0.25, b0 + 0.75, 0.42, 0.85, 0xf6f6f2);
  B(hw - 0.62, hw - 0.08, b0 + 0.23, b0 + 0.77, 0.42, 0.46, 0xffffff);
  sitSpots.push({ x: X(hw - 0.42), z: Z(b0 + 0.5), yaw: -Math.PI / 2, seatY: y + 0.45, label: 'Use the toilet' });
  B(1.08, 1.5, b0 + 0.1, b0 + 0.65, 0.78, 0.9, 0xffffff); B(1.2, 1.3, b0 + 0.3, b0 + 0.45, 0, 0.78, 0xf6f6f2);   // basin
  B(1.06, 1.08, b0 + 0.08, b0 + 0.68, 1.15, 1.8, 0xcfe4ee, false, { metal: 0.9, rough: 0.05 });                     // mirror
  B(1.06, 1.3, b1 - 0.6, b1 - 0.1, 1.2, 1.25, 0xd9c49a);                                                           // towel rail
  spot(hw - 0.55, b1 - 0.5, 0.9, 'Take a shower', () => ctx.rest(12, '🚿 A hot shower. You feel fresh and wide awake.'));
  spot(1.6, b0 + 0.4, 0.6, 'Wash your hands', () => ctx.chore ? ctx.chore('handwash') : ctx.toast('🧼 Squeaky clean.'));

  // ---------------- storage room (back, right) ----------------
  const s0 = store0 + 0.05, s1 = D - 0.05;
  B(hw - 0.5, hw - 0.05, s0 + 0.1, s1 - 0.1, 0, 2.0, 0x8a939c);                          // shelving unit
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const v = s0 + 0.25 + k * (s1 - s0 - 0.5) / 3; B(hw - 0.48, hw - 0.12, v, v + 0.3, 0.12 + i * 0.48, 0.42 + i * 0.48, [0xa7845a, 0xc9a26a, 0x8d7150][(i + k) % 3]); }
  B(1.1, 1.7, s1 - 0.65, s1 - 0.05, 0, 0.85, 0xf2f2f2, true);                             // washing machine
  cyl(1.4, s1 - 0.66, 0.2, 0.25, 0.65, 0x3a4048).rotation.x = Math.PI / 2;
  B(1.9, Math.min(hw - 0.6, 2.9), s1 - 0.6, s1 - 0.05, 0, 0.75, 0x6b4a30, true);          // storage cupboard / chest
  B(1.9, Math.min(hw - 0.6, 2.9), s1 - 0.62, s1 - 0.6, 0.65, 0.7, 0x3b2b1f);
  cyl(1.2, s0 + 0.3, 0.02, 0, 1.4, 0x8a6a4a).rotation.z = 0.25;                            // broom
  spot(Math.min(hw - 0.6, 2.9) - 0.5, s1 - 0.95, 0.9, 'Open the storage cupboard', () => K().openStorage());
  spot(1.4, s1 - 1.0, 0.7, 'Do the laundry', () => ctx.chore ? ctx.chore('laundry') : ctx.rest(-3, '👕 Clothes in, powder in, start. Your clothes are clean again.'));

  // the hob glows and a pan appears while something's cooking
  return { tv, rooms, doors, update(dt = 1 / 60) { for (const d of doors) if (d.open !== d.target) {
      const n = d.open + Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * 3);
      if (ctx.sweep) {   // the door stops against anyone standing in its swing
        const r = ctx.sweep(d.hinge.position.x, d.hinge.position.z, 0, d.dir, d.len, d.hinge.rotation.y, d.swing * n);
        if (r.by) { d.hinge.rotation.y = r.angle; d.open = r.angle / d.swing; ctx.blocked?.(r.by); continue; }
      }
      d.open = n; d.hinge.rotation.y = d.swing * d.open; } const k = K(); if (!k) return; const on = !!k.cooking && !k.cooking.ready; pan.visible = !!k.cooking; for (const r of ring) r.material.emissiveIntensity = on ? 0.9 : 0; } };
}
