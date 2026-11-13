// Westhaven is always building.
// Building crews work round the edge of the city. Each crew has a list of plots and builds them one
// after another, over real hours (they work round the clock, even while you're away):
//   groundworks (an excavator digs, a dump truck waits; any access road is laid first)
//   -> foundations (the slab is poured from a mixer truck)
//   -> the frame goes up floor by floor (a tower crane swings steel up to the top)
//   -> glazing and cladding climb the frame
//   -> the hoarding comes down and the finished building stays: offices, flats or shops you can walk into.
// Then the crew packs up and starts on the next plot. Everything follows the real clock, so a
// building you left half-built is further along when you come back.
import * as THREE from 'three';

export const BUILD_DAYS = 2;    // the crews' "day" units per building (see siteDaysNow)
// The crews work to the real clock, not the game's: a building takes SITE_HOURS real hours, carries on
// while the game is closed, never resets on a reload, and is at the same stage for every player.
export const SITE_HOURS = 6, SITE_EPOCH = Date.UTC(2026, 10, 10, 6);
export const siteDaysNow = (now = Date.now()) => Math.max(0, (now - SITE_EPOCH) / (SITE_HOURS * 3600e3)) * BUILD_DAYS;
const FLOOR_H = 3.4;

// face: which side the road is on (the gate and front door go there). access: a road the crew lays first.
export const CREWS = [
  { name: 'Northgate Construction', plots: [
    { x: 560, z: -735, face: 'N', floors: 7, kind: 'office', name: 'Northgate Exchange' },
    { x: 500, z: -735, face: 'N', floors: 5, kind: 'apartments', name: 'Leisure Park Lofts' },
    { x: 620, z: -735, face: 'N', floors: 9, kind: 'office', name: 'Raceway Tower' },
    { x: 440, z: -735, face: 'N', floors: 4, kind: 'shop', name: 'Boulevard Market Hall' } ] },
  { name: 'Ashford Build & Co', plots: [
    { x: 40, z: -300, face: 'W', floors: 6, kind: 'apartments', name: 'North Road Apartments' },
    { x: 40, z: -355, face: 'W', floors: 8, kind: 'office', name: 'Westhaven Data Centre' },
    { x: 40, z: -410, face: 'W', floors: 5, kind: 'apartments', name: 'Hillview Court' } ] },
  { name: 'Ridgeway Builders', plots: [
    { x: 1000, z: 1060, face: 'W', floors: 6, kind: 'office', name: 'Ridgeway House', access: [964, 1060, 986, 1060, 10] },
    { x: 1000, z: 1010, face: 'W', floors: 5, kind: 'apartments', name: 'Sunset Terrace', access: [964, 1010, 986, 1010, 10] },
    { x: 1050, z: 1060, face: 'S', floors: 8, kind: 'office', name: 'Eastgate Plaza', access: [1010, 1100, 1078, 1100, 14] },
    { x: 1105, z: 1060, face: 'S', floors: 4, kind: 'shop', name: 'Eastgate Retail Park', access: [1078, 1100, 1132, 1100, 14] } ] },
  { name: 'Civic Works Ltd', plots: [
    { x: -280, z: -410, face: 'N', floors: 5, kind: 'apartments', name: 'Northfield Flats' },
    { x: -225, z: -410, face: 'N', floors: 7, kind: 'office', name: 'Civic Records Office' },
    { x: -335, z: -410, face: 'N', floors: 4, kind: 'shop', name: 'Northfield Parade' },
    { x: -170, z: -410, face: 'N', floors: 10, kind: 'apartments', name: 'Skyline Residences' } ] },
  { name: 'Harbourside Homes', plots: [
    { x: 425, z: 440, face: 'W', floors: 6, kind: 'apartments', name: 'Crossroads Court' },
    { x: 425, z: 495, face: 'W', floors: 5, kind: 'office', name: 'Riverside Business Centre' },
    { x: 425, z: 550, face: 'W', floors: 7, kind: 'apartments', name: 'Bayview Heights' } ] },
];
const BW = 24, BD = 18;            // building footprint (across the road, away from the road)
const FW = 34, FD = 30;            // hoarding round the plot

// where things go, in plot coordinates: a = along the road (left/right), b = away from the road
function frame(p) {
  const f = { N: [1, 0, 0, 1], S: [-1, 0, 0, -1], W: [0, -1, 1, 0], E: [0, 1, -1, 0] }[p.face];
  // f = [ax, az, bx, bz]: unit vectors along the road and away from it
  return { at: (a, b) => [p.x + f[0] * a + f[2] * b, p.z + f[1] * a + f[3] * b], yaw: Math.atan2(-f[2], -f[3]), alongX: f[0] !== 0 };
}
export function stageOf(t) {
  if (t < 0.1) return 'groundworks'; if (t < 0.22) return 'foundations'; if (t < 0.8) return 'frame'; if (t < 0.97) return 'cladding'; return 'handover';
}
// The crews never stop: when every plot is built they start again from the first one, knocking the
// old building down and putting up a new, different one (a "generation" later).
export function crewState(crew, day, offset) {
  const total = Math.max(0, Number.isFinite(day) ? day : 0) / BUILD_DAYS + offset, step = Math.floor(total), n = crew.plots.length;
  return { step, index: step % n, gen: Math.floor(step / n), t: total - step };
}
const GEN_NAMES = ['', 'Phase II', 'Phase III', 'Phase IV'];
export function variant(p, gen) {
  if (!gen) return p;
  const kinds = ['office', 'apartments', 'shop'];
  return { ...p, floors: Math.max(3, p.floors + [0, 2, -1, 3][gen % 4]), kind: kinds[(kinds.indexOf(p.kind) + gen) % 3], name: `${p.name} ${GEN_NAMES[gen % 4] || ''}`.trim() + (gen >= 4 ? ` (${2026 + gen})` : '') };
}
export function plotRect(p, pad = 0) { const alongX = p.face === 'N' || p.face === 'S', w = (alongX ? FW : FD) / 2 + pad, d = (alongX ? FD : FW) / 2 + pad; return { minX: p.x - w, maxX: p.x + w, minZ: p.z - d, maxZ: p.z + d }; }

export function buildBuildingSites(ctx) {
  const { scene, colliders, civicBuildings, interactables, makePerson, animatePerson, makeTex, toast, glowMats } = ctx;
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, transparent: o.opacity != null, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide })); return mats.get(k); };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  const B = (parent, w, h, d, x, y, z, c, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const C = (parent, r, h, x, y, z, c, o) => { const m = new THREE.Mesh(cylGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(r, h, r); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const steel = mat(0x8a4b2a, { rough: 0.6, metal: 0.4 }), concrete = mat(0xb9b6ae, { rough: 0.95 }), yellow = mat(0xf2b707, { rough: 0.5 }), dirt = mat(0x6e5536, { rough: 1 }), glass = mat(0x6f9fb8, { rough: 0.15, metal: 0.5 });
  const facadeTex = {};
  const facade = kind => facadeTex[kind] || (facadeTex[kind] = (() => {
    const t = makeTex(256, 256, g => {
      const base = { office: '#5d7286', apartments: '#c9b49a', shop: '#8c8f93' }[kind];
      g.fillStyle = base; g.fillRect(0, 0, 256, 256);
      const cols = kind === 'office' ? 8 : 4, rows = 4;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = 8 + c * (240 / cols), y = 10 + r * 62, w = 240 / cols - (kind === 'office' ? 4 : 18), h = kind === 'office' ? 50 : 38;
        g.fillStyle = (r * 3 + c * 7) % 5 === 0 ? '#ffd98a' : '#2d4a5e'; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, 4);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })());
  const signTex = (title, sub) => makeTex(1024, 256, g => {
    g.fillStyle = '#1f3b57'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#ffcf33'; g.fillRect(0, 0, 1024, 18); g.fillRect(0, 238, 1024, 18);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = 'bold 74px sans-serif'; g.fillText(title, 512, 112, 980);
    g.font = '36px sans-serif'; g.fillStyle = '#cfe3f5'; g.fillText(sub, 512, 182, 980);
  });
  const hoardTex = makeTex(1024, 128, g => { g.fillStyle = '#2e6b4f'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#ffffff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('WESTHAVEN IS ALWAYS BUILDING  ·  SITE SAFETY: HARD HATS ON', 512, 78, 1000); });
  hoardTex.wrapS = THREE.RepeatWrapping;

  // ---------- a worker in hi-vis and a hard hat ----------
  function worker(colour = 0xff8c1a) {
    const h = makePerson({ outfit: colour, hair: [0x2b1d14, 0x5a3b22, 0x111111, 0xc9a26a][Math.floor(Math.random() * 4)], pants: 0x2d3142, skin: [0xffdcc0, 0xe0ac69, 0x8d5524, 0xc68642][Math.floor(Math.random() * 4)] });
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffd42a, { rough: 0.4 })); hat.position.set(0, 1.93, 0); h.rig.add(hat);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), mat(0xd8ff3a, { emissive: 0x556600, ei: 0.4 })); vest.position.set(0, 1.42, 0); h.rig.add(vest);
    return h;
  }

  // ---------- machines ----------
  function excavator(parent) {
    const g = new THREE.Group(); parent.add(g);
    for (const s of [-1, 1]) B(g, 0.6, 0.7, 3.6, s * 1.2, 0.35, 0, 0x222222);
    const top = new THREE.Group(); top.position.y = 0.8; g.add(top);
    B(top, 2.6, 1.0, 2.8, 0, 0.5, -0.3, yellow); B(top, 1.1, 1.4, 1.2, -0.7, 1.6, 0.6, yellow); B(top, 1.0, 0.9, 0.05, -0.7, 1.75, 1.21, glass);
    const boom = new THREE.Group(); boom.position.set(0.5, 1.0, 0.9); top.add(boom); B(boom, 0.35, 0.4, 3.6, 0, 0, 1.8, yellow);
    const stick = new THREE.Group(); stick.position.set(0, 0, 3.6); boom.add(stick); B(stick, 0.3, 0.3, 2.6, 0, 0, 1.3, yellow);
    const bucket = new THREE.Group(); bucket.position.set(0, 0, 2.6); stick.add(bucket); B(bucket, 0.9, 0.6, 0.6, 0, -0.2, 0.2, 0x333333);
    return { g, top, boom, stick };
  }
  function truck(parent, kind) {
    const g = new THREE.Group(); parent.add(g);
    B(g, 2.4, 0.5, 7, 0, 0.9, 0, 0x333333); for (const z of [-2.4, -1.2, 2.2]) for (const s of [-1, 1]) { const w = C(g, 0.5, 0.35, s * 1.15, 0.5, z, 0x151515); w.rotation.z = Math.PI / 2; }
    B(g, 2.4, 1.9, 1.9, 0, 2.0, 2.6, kind === 'mixer' ? 0xe6e6e6 : 0xd35400); B(g, 2.2, 0.8, 0.05, 0, 2.4, 3.56, glass);
    let drum = null;
    if (kind === 'mixer') { drum = new THREE.Group(); drum.position.set(0, 2.6, -1.0); drum.rotation.x = -0.25; g.add(drum); const d = C(drum, 1.15, 4.2, 0, 0, 0, 0xd0d4d8, { metal: 0.3 }); d.rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) { const st = B(drum, 0.12, 2.35, 0.3, 0, 0, -1.8 + i * 1.2, 0xe23b2e); st.rotation.z = i; } }
    else { B(g, 2.5, 1.3, 4.2, 0, 1.8, -1.2, 0xd35400); B(g, 2.2, 0.6, 3.8, 0, 2.15, -1.2, dirt); }
    return { g, drum };
  }
  function crane(parent, height) {
    const g = new THREE.Group(); parent.add(g);
    B(g, 3, 1.2, 3, 0, 0.6, 0, concrete);
    const mastTex = mat(0xf2b707, { rough: 0.5 });
    for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) B(g, 0.18, height, 0.18, a, height / 2 + 1.2, b, mastTex);
    for (let y = 2; y < height; y += 2.2) { for (const s of [-1, 1]) { const r1 = B(g, 1.8, 0.08, 0.08, 0, y + 1.2, s * 0.8, mastTex); r1.rotation.z = 0.8; const r2 = B(g, 0.08, 0.08, 1.8, s * 0.8, y + 1.2, 0, mastTex); r2.rotation.x = 0.8; } }
    const slew = new THREE.Group(); slew.position.y = height + 1.2; g.add(slew);
    B(slew, 2, 1.6, 2.2, 0, 0.8, 0, mastTex); B(slew, 1.4, 1.3, 1.4, 1.4, 0.4, 0.6, 0x2c3e50); B(slew, 1.2, 0.9, 0.05, 1.4, 0.55, 1.31, glass);
    B(slew, 34, 1.0, 1.0, 13, 2.1, 0, mastTex);  // jib
    B(slew, 12, 0.8, 0.9, -7, 2.0, 0, mastTex); B(slew, 3, 2, 1.6, -11.5, 1.2, 0, concrete);   // counter-jib and weights
    B(slew, 0.4, 4, 0.4, 0, 3.4, 0, mastTex);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), mat(0xff2a2a, { emissive: 0xff0000, ei: 1.5 })); tip.position.set(30, 2.8, 0); slew.add(tip);
    const trolley = new THREE.Group(); trolley.position.set(18, 1.5, 0); slew.add(trolley); B(trolley, 1.2, 0.4, 1.2, 0, 0, 0, 0x333333);
    const cable = B(trolley, 0.05, 1, 0.05, 0, -0.5, 0, 0x111111);
    const load = new THREE.Group(); trolley.add(load); B(load, 0.4, 0.4, 0.4, 0, 0, 0, 0xffcc00); B(load, 0.35, 0.35, 6, 0, -0.6, 0, steel);
    return { g, slew, trolley, cable, load, height };
  }
  function hoarding(parent, p, F) {
    const alongX = F.alongX, w = alongX ? FW : FD, d = alongX ? FD : FW, gate = 9, out = [];
    const panel = (len, x, z, ry) => { const tex = hoardTex.clone(); tex.needsUpdate = true; tex.repeat.x = len / 18; const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }); for (const flip of [0, Math.PI]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), pm); m.position.set(x, 1.2, z); m.rotation.y = ry + flip; parent.add(m); }   // printed on both sides, readable from each
      const c = Math.abs(Math.sin(ry)) > 0.5 ? { minX: x - 0.15, maxX: x + 0.15, minZ: z - len / 2, maxZ: z + len / 2 } : { minX: x - len / 2, maxX: x + len / 2, minZ: z - 0.15, maxZ: z + 0.15 }; out.push(c); };
    // road-side edge has the gate
    const [rx, rz] = F.at(0, -FD / 2);   // middle of the road-side edge
    const sides = [];
    if (p.face === 'N' || p.face === 'S') {
      const zr = rz, zb = p.z + (p.z - rz);
      sides.push([(w - gate) / 2, p.x - (w + gate) / 4, zr, 0], [(w - gate) / 2, p.x + (w + gate) / 4, zr, 0], [w, p.x, zb, 0], [d, p.x - w / 2, p.z, Math.PI / 2], [d, p.x + w / 2, p.z, Math.PI / 2]);
    } else {
      const xr = rx, xb = p.x + (p.x - rx);
      sides.push([(d - gate) / 2, xr, p.z - (d + gate) / 4, Math.PI / 2], [(d - gate) / 2, xr, p.z + (d + gate) / 4, Math.PI / 2], [d, xb, p.z, Math.PI / 2], [w, p.x, p.z - d / 2, 0], [w, p.x, p.z + d / 2, 0]);
    }
    for (const s of sides) panel(...s);
    return out;
  }

  // ---------- finished buildings ----------
  const finished = new Map();   // plot -> { gen, g, collider, civic, dest }
  function clearFinished(base) {
    const f = finished.get(base); if (!f) return; finished.delete(base);
    scene.remove(f.g); for (const [arr, x] of [[colliders, f.collider], [civicBuildings, f.civic], [ctx.destinations || [], f.dest]]) { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); }
  }
  function finishedBuilding(base, gen, crew) {
    if (finished.get(base)?.gen === gen) return; clearFinished(base);
    const p = variant(base, gen), F = frame(p), g = new THREE.Group(); scene.add(g);
    const [cx, cz] = F.at(0, 2), h = p.floors * FLOOR_H, w = F.alongX ? BW : BD, d = F.alongX ? BD : BW;
    const tex = facade(p.kind).clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(w, d) / 12, p.floors / 4);
    const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffd58a, emissiveIntensity: 0, roughness: 0.7, metalness: p.kind === 'office' ? 0.3 : 0 }); glowMats?.push(m);
    B(g, w, h, d, cx, h / 2, cz, m);
    B(g, w + 0.6, 0.6, d + 0.6, cx, h + 0.3, cz, 0x3a3f44);                      // roof parapet
    B(g, w + 1.5, 0.15, d + 1.5, cx, 0.08, cz, concrete);                        // plinth
    for (const [a, b] of [[-5, 3], [4, 4]]) { const [x, z] = F.at(a, 2 + b); B(g, 3, 1.6, 2.2, x, h + 0.8, z, 0x8a9096); }   // roof plant
    const [dx, dz] = F.at(0, 2 - (F.alongX ? d : w) / 2 - 0.05);
    const door = B(g, F.alongX ? 3 : 0.1, 2.6, F.alongX ? 0.1 : 3, dx, 1.3, dz, 0x203040, { rough: 0.2, metal: 0.5 });
    const [sx, sz] = F.at(0, 2 - (F.alongX ? d : w) / 2 - 0.12);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: signTex(p.name.toUpperCase(), { office: 'Offices', apartments: 'Apartments', shop: 'Shops and cafés' }[p.kind] + ' · built by ' + crew.name) }));
    sign.position.set(sx, 4.2, sz); sign.rotation.y = F.yaw; g.add(sign);
    const collider = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }; colliders.push(collider);
    const civic = { builtBy: 'bots', type: p.kind === 'shop' ? 'shop' : p.kind === 'office' ? 'office' : 'apartments', name: p.name, x: cx, z: cz, minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }; civicBuildings.push(civic);
    const dest = { name: p.name, x: cx, z: cz }; ctx.destinations?.push(dest);
    void door; finished.set(base, { gen, g, collider, civic, dest });
  }

  // ---------- the active site ----------
  function makeSite(crew, base, gen) {
    const p = variant(base, gen), F = frame(p), g = new THREE.Group(); scene.add(g);
    const fence = hoarding(g, p, F); colliders.push(...fence);
    const [bx, bz] = F.at(0, 2), w = F.alongX ? BW : BD, d = F.alongX ? BD : BW;
    // site cabin, toilets, materials, floodlights
    const cabin = F.at(-13, -10); B(g, F.alongX ? 6 : 2.6, 2.6, F.alongX ? 2.6 : 6, cabin[0], 1.3, cabin[1], 0x2f6fb0); B(g, F.alongX ? 1.4 : 0.05, 0.8, F.alongX ? 0.05 : 1.4, cabin[0] + (F.alongX ? 1.5 : 0), 1.7, cabin[1] + (F.alongX ? 0 : 1.5), glass);
    const loo = F.at(-14.5, 12); B(g, 1.2, 2.3, 1.2, loo[0], 1.15, loo[1], 0x3a9a4a);
    for (const [a, b] of [[12, -11], [13.5, -8.5]]) { const [x, z] = F.at(a, b); B(g, 1.2, 0.15, 1.2, x, 0.08, z, 0x9a7b4f); for (let i = 0; i < 3; i++) B(g, 1.1, 0.25, 1.1, x, 0.3 + i * 0.27, z, i % 2 ? 0xa0522d : 0xb5653a); }   // brick pallets
    for (let i = 0; i < 5; i++) { const [x, z] = F.at(14.2 + (i % 3) * 0.3, 7); const r = B(g, 0.25, 0.25, 6, x, 0.15 + Math.floor(i / 3) * 0.26, z, steel); if (!F.alongX) r.rotation.y = Math.PI / 2; }   // steel beams
    for (const [a, b] of [[-15, -13], [15, 13]]) { const [x, z] = F.at(a, b); B(g, 0.15, 6, 0.15, x, 3, z, 0x444444); const l = B(g, 1.0, 0.5, 0.3, x, 6.1, z, 0xfff6d8, { emissive: 0xfff2c0, ei: 0 }); l.material = l.material.clone(); g.userData.lamps = (g.userData.lamps || []).concat(l); }
    const signM = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.9), new THREE.MeshBasicMaterial({ map: signTex(p.name.toUpperCase(), `Coming soon · ${p.floors} floors of ${p.kind === 'shop' ? 'shops' : p.kind} · ${crew.name}`), side: THREE.DoubleSide }));
    { const [x, z] = F.at(-9, -FD / 2 - 0.25); signM.position.set(x, 3.6, z); signM.rotation.y = F.yaw; g.add(signM); const [px, pz] = F.at(-11.5, -FD / 2 - 0.25); B(g, 0.15, 3.6, 0.15, px, 1.8, pz, 0x444444); const [qx, qz] = F.at(-6.5, -FD / 2 - 0.25); B(g, 0.15, 3.6, 0.15, qx, 1.8, qz, 0x444444); }
    // dirt across the plot, the pit / slab, the frame, the cladding
    const ground = B(g, F.alongX ? FW - 1 : FD - 1, 0.06, F.alongX ? FD - 1 : FW - 1, p.x, 0.04, p.z, dirt);
    const pit = B(g, w + 2, 0.05, d + 2, bx, 0.09, bz, 0x4e3b25);
    const slab = B(g, w, 0.6, d, bx, 0.3, bz, concrete); slab.visible = false;
    const exc = excavator(g); { const [x, z] = F.at(6, 1); exc.g.position.set(x, 0, z); exc.g.rotation.y = F.yaw + Math.PI; }
    const dump = truck(g, 'dump'); { const [x, z] = F.at(-4, -10); dump.g.position.set(x, 0, z); dump.g.rotation.y = F.yaw + Math.PI / 2; }
    const mixer = truck(g, 'mixer'); { const [x, z] = F.at(5, -10.5); mixer.g.position.set(x, 0, z); mixer.g.rotation.y = F.yaw + Math.PI / 2; }
    const crn = crane(g, p.floors * FLOOR_H + 10); { const [x, z] = F.at(-14, 4); crn.g.position.set(x, 0, z); }
    // frame: columns + floor slabs as instanced meshes, filled in as the floors go up
    const cols = [], nx = 5, nz = 4;
    for (let f = 0; f < p.floors; f++) for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) cols.push([bx - w / 2 + 0.3 + i * (w - 0.6) / (nx - 1), 0.6 + f * FLOOR_H + FLOOR_H / 2, bz - d / 2 + 0.3 + k * (d - 0.6) / (nz - 1)]);
    const colMesh = new THREE.InstancedMesh(boxGeo, steel, cols.length); colMesh.castShadow = true; g.add(colMesh);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(0.4, FLOOR_H, 0.4), pos = new THREE.Vector3();
    cols.forEach((c, i) => { colMesh.setMatrixAt(i, m4.compose(pos.set(...c), q, sc)); }); colMesh.count = 0;
    const floors = [], clads = [];
    for (let f = 0; f < p.floors; f++) {
      const s = B(g, w, 0.3, d, bx, 0.6 + (f + 1) * FLOOR_H, bz, concrete); s.visible = false; floors.push(s);
      const tex = facade(p.kind).clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(w, d) / 12, 0.25); tex.offset.y = (f % 4) * 0.25;
      const c = B(g, w + 0.1, FLOOR_H, d + 0.1, bx, 0.6 + f * FLOOR_H + FLOOR_H / 2, bz, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); c.visible = false; clads.push(c);
    }
    // scaffold on the road side while the frame is up
    const scaffold = new THREE.Group(); g.add(scaffold);
    { const H = p.floors * FLOOR_H + 1.5, len = F.alongX ? w : d; for (let a = -len / 2; a <= len / 2 + 0.01; a += 2.5) { const [x, z] = F.at(a, 2 - (F.alongX ? d : w) / 2 - 1.2); B(scaffold, 0.06, H, 0.06, x, H / 2, z, 0x9aa3a8, { metal: 0.7 }); }
      for (let y = 2; y < H; y += 2) { const [x, z] = F.at(0, 2 - (F.alongX ? d : w) / 2 - 1.2); B(scaffold, F.alongX ? len : 0.06, 0.06, F.alongX ? 0.06 : len, x, y, z, 0x9aa3a8, { metal: 0.7 }); B(scaffold, F.alongX ? len : 1, 0.05, F.alongX ? 1 : len, x + (F.alongX ? 0 : (p.face === 'W' ? 0.5 : -0.5)), y - 1, z + (F.alongX ? (p.face === 'N' ? 0.5 : -0.5) : 0), 0xc9a26a); }
      scaffold.userData.H = H; }
    // access road the crew lays first
    const access = !!p.access;
    // the crew
    const team = [];
    const route = (a0, b0, a1, b1) => ({ from: F.at(a0, b0), to: F.at(a1, b1) });
    for (const [kind, r] of [['carry', route(-12, -8, 0, -6)], ['carry', route(12, -8, 3, -6)], ['hammer', route(-4, -6.5, -4, -6.5)], ['hammer', route(6, -6.5, 6, -6.5)], ['top', route(-6, 0, 6, 4)], ['foreman', route(-3, -FD / 2 + 1.5, -3, -FD / 2 + 1.5)]]) {
      const h = worker(kind === 'foreman' ? 0xffffff : 0xff8c1a); h.root.position.set(r.from[0], 0, r.from[1]);
      if (kind === 'carry') { const box = new THREE.Mesh(boxGeo, mat(0xa0522d)); box.scale.set(0.5, 0.3, 0.4); box.position.set(0, 1.35, 0.35); h.rig.add(box); }
      if (kind === 'top') { const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), mat(0xfff2a0, { emissive: 0xffd040, ei: 3 })); spark.position.set(0, 1.0, 0.55); h.rig.add(spark); h.spark = spark; }
      team.push({ h, kind, r, ph: Math.random() * 10 });
    }
    const foreman = team.find(m => m.kind === 'foreman');
    foreman.h.root.rotation.y = F.yaw + Math.PI;
    const it = { pos: new THREE.Vector3(foreman.h.root.position.x, 0, foreman.h.root.position.z), r: 2.4, label: `Talk to the site foreman (${p.name})`, action: () => ctx.foreman?.(site) };
    interactables.push(it);
    const site = { crew, p, base, gen, F, g, fence, team, it, exc, dump, mixer, crn, colMesh, cols, floors, clads, slab, pit, ground, scaffold, access, t: 0, built: -1, clad: -1, stage: '' };
    return site;
  }
  function removeSite(s) {
    scene.remove(s.g); for (const c of s.fence) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    const i = interactables.indexOf(s.it); if (i >= 0) interactables.splice(i, 1);
    for (const m of s.team) scene.remove(m.h.root);
  }

  // ---------- per frame ----------
  const crews = CREWS.map((crew, i) => ({ crew, offset: i * 0.37, site: null, index: -1 }));
  let clock = 0;
  function update(dt, day, playerPos, night) {
    clock += dt;
    for (const c of crews) {
      const st = crewState(c.crew, day, c.offset);
      if (st.step !== c.step) {   // the crew moved on: everything else stands finished, the current plot is a building site
        if (c.site) { removeSite(c.site); c.site = null; }
        const n = c.crew.plots.length;
        c.crew.plots.forEach((p, j) => { const g = j < st.index ? st.gen : st.gen - 1; if (j === st.index) clearFinished(p); else if (g >= 0) finishedBuilding(p, g, c.crew); if (g >= 0 || j < st.index) layAccess(p, 1); });
        c.step = st.step; void n;
        c.site = makeSite(c.crew, c.crew.plots[st.index], st.gen);
      }
      if (c.site) drive(c.site, st.t, dt, playerPos, night);
    }
  }
  const laid = new Map();
  function layAccess(p, frac) {
    if (!p.access) return;
    let m = laid.get(p);
    const [x0, z0, x1, z1, wd] = p.access, len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > 1;
    if (!m) { m = new THREE.Mesh(boxGeo, mat(0x2e3135, { rough: 0.95 })); m.receiveShadow = true; scene.add(m); laid.set(p, m); }
    const L = Math.max(0.01, len * frac), cx = x0 + (x1 - x0) * frac / 2, cz = z0 + (z1 - z0) * frac / 2;
    m.scale.set(alongX ? L : wd, 0.06, alongX ? wd : L); m.position.set(cx, 0.045, cz);
  }
  function drive(s, t, dt, playerPos, night) {
    const p = s.p, stage = stageOf(t), near = Math.hypot(playerPos.x - p.x, playerPos.z - p.z) < 220;
    s.t = t; s.stage = stage;
    if (s.access) layAccess(s.base, Math.min(1, t / 0.08));
    // structure
    const frameT = Math.max(0, Math.min(1, (t - 0.22) / 0.58)), nBuilt = t < 0.22 ? 0 : Math.ceil(frameT * p.floors), cladT = Math.max(0, Math.min(1, (t - 0.7) / 0.27)), nClad = Math.floor(cladT * p.floors + (t >= 0.97 ? 1 : 0));
    s.slab.visible = t >= 0.12; s.slab.scale.y = 0.6 * Math.min(1, (t - 0.1) / 0.1 + 0.05);
    s.slab.position.y = s.slab.scale.y / 2;
    if (nBuilt !== s.built) { s.built = nBuilt; s.colMesh.count = nBuilt * 20; s.floors.forEach((f, i) => { f.visible = i < nBuilt; }); }
    if (nClad !== s.clad) { s.clad = nClad; s.clads.forEach((c, i) => { c.visible = i < nClad; }); }
    s.scaffold.visible = t >= 0.22 && t < 0.97; s.scaffold.scale.y = Math.max(0.05, Math.min(1, (nBuilt * FLOOR_H + 1.5) / s.scaffold.userData.H));
    s.exc.g.visible = t < 0.25; s.dump.g.visible = t < 0.3; s.mixer.g.visible = t >= 0.08 && t < 0.4; s.crn.g.visible = t >= 0.1 && t < 0.97;
    s.pit.visible = t < 0.15; s.ground.visible = t < 0.98;
    for (const l of s.g.userData.lamps || []) l.material.emissiveIntensity = night ? 2 : 0;
    if (!near) return;
    // machines
    const k = clock;
    if (s.exc.g.visible) { s.exc.top.rotation.y = Math.sin(k * 0.5) * 0.9; s.exc.boom.rotation.x = -0.35 + Math.sin(k * 1.1) * 0.3; s.exc.stick.rotation.x = 0.9 + Math.sin(k * 1.1 + 1) * 0.4; }
    if (s.mixer.drum) s.mixer.drum.rotation.z += dt * 2.2;
    if (s.crn.g.visible) { s.crn.slew.rotation.y = Math.sin(k * 0.08 + p.x) * 1.6; s.crn.trolley.position.x = 14 + Math.sin(k * 0.21) * 9;
      const top = 0.6 + s.built * FLOOR_H + 2, drop = Math.max(2, s.crn.height + 2.7 - top - (Math.sin(k * 0.3) * 0.5 + 0.5) * Math.max(0, s.crn.height - top - 4));
      s.crn.cable.scale.y = drop; s.crn.cable.position.y = -drop / 2; s.crn.load.position.y = -drop; }
    // workers
    const topY = 0.6 + s.built * FLOOR_H + 0.15;
    for (const m of s.team) {
      const h = m.h; m.ph += dt;
      if (m.kind === 'carry') {
        const T = 9, f = (m.ph % (2 * T)) / T, go = f < 1, u = go ? f : 2 - f, [ax, az] = m.r.from, [bx2, bz2] = m.r.to, e = u * u * (3 - 2 * u);
        h.root.position.set(ax + (bx2 - ax) * e, 0, az + (bz2 - az) * e); h.root.rotation.y = Math.atan2((bx2 - ax) * (go ? 1 : -1), (bz2 - az) * (go ? 1 : -1));
        animatePerson(h, true, dt); h.armL.pivot.rotation.x = h.armR.pivot.rotation.x = -1.2;
      } else if (m.kind === 'hammer') {
        h.root.rotation.y = s.F.yaw + Math.PI; animatePerson(h, false, dt); h.armR.pivot.rotation.x = -1.6 + Math.sin(m.ph * 9) * 0.7; h.rig.rotation.x = 0.25;
      } else if (m.kind === 'top') {
        const show = s.built > 0; h.root.visible = show; if (!show) continue;
        const [ax, az] = m.r.from, [bx2, bz2] = m.r.to, u = 0.5 + 0.5 * Math.sin(m.ph * 0.25);
        h.root.position.set(ax + (bx2 - ax) * u, topY, az + (bz2 - az) * u); animatePerson(h, false, dt);
        h.armR.pivot.rotation.x = -1.3; h.rig.rotation.x = 0.4; h.spark.visible = Math.sin(m.ph * 40) > 0.2; h.spark.scale.setScalar(0.6 + Math.random() * 0.8);
      } else animatePerson(h, false, dt);
    }
  }

  return {
    update, crews, CREWS,
    get sites() { return crews.map(c => c.site).filter(Boolean); },
    describe(site) {
      const st = stageOf(site.t), pct = Math.round(site.t * 100), left = (1 - site.t) * SITE_HOURS;
      const words = { groundworks: 'digging out the foundations', foundations: 'pouring the concrete slab', frame: `putting up the frame, floor ${Math.max(1, site.built)} of ${site.p.floors}`, cladding: 'fitting the windows and cladding', handover: 'cleaning up for the opening' };
      return { pct, stage: st, text: `We're ${words[st]}. ${pct}% done; ${site.p.name} opens in about ${left < 1 ? Math.max(5, Math.round(left * 60)) + ' minutes' : left.toFixed(1) + ' hours'}. We work round the clock, so it'll be further on next time you come by.` };
    },
  };
}
