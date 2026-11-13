// Westhaven Highways: a road crew that builds new roads on its own, one stretch after another, on the
// real clock. That means the work carries on while you're away, a reload never resets it, and every
// player (online too) sees the same stage. Each stretch goes through:
//   survey (pegs and cones along the line) -> earthworks (a strip of dug earth creeps along behind the
//   excavator) -> sub-base (gravel, behind the roller) -> asphalt (behind the paver) -> lines and
//   lamps -> open.
// A finished stretch stays built and joins the roads either end. When every stretch is open the crew
// moves on to resurfacing the country roads in turn (cones, a lane closed, the crew at work).
import * as THREE from 'three';

export const ROAD_HOURS = 4;                         // real hours to build one stretch
export const ROAD_EPOCH = Date.UTC(2026, 10, 13, 12); // when Westhaven Highways started work
// [x0, x1, z0, z1] axis-aligned; the road is laid from `from` ('start' = the low end) along its length
export const NEW_ROADS = [
  { name: 'Eastfield Lane', r: [946, 1030, 54, 66], from: 'start' },         // off the far-east road, out to the east fields…
  { name: 'Eastfield Way', r: [1024, 1036, 54, 146], from: 'start' },        // …and down to the top of The Reserve's avenue
  { name: 'Airfield Road South', r: [954, 966, 559, 700], from: 'start' },   // the airfield road carries on south, up onto the ridge
];
export function roadCrewState(now = Date.now()) {
  const total = Math.max(0, (now - ROAD_EPOCH) / (ROAD_HOURS * 3600e3)), step = Math.floor(total);
  return { step, index: step, t: total - step, done: step >= NEW_ROADS.length };
}
export function roadStage(t) { return t < 0.1 ? 'survey' : t < 0.35 ? 'earthworks' : t < 0.6 ? 'sub-base' : t < 0.85 ? 'asphalt' : 'lines'; }

export function buildRoadCrew({ scene, interactables, toast, makePerson, animatePerson, resurface = [], groundY = () => 0 }) {
  const root = new THREE.Group(); scene.add(root);
  const geo = new THREE.BoxGeometry(1, 1, 1), mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1 })); return mats.get(k); };
  const B = (p, w, h, d, x, y, z, c) => { const m = new THREE.Mesh(geo, c instanceof THREE.Material ? c : mat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.receiveShadow = true; p.add(m); return m; };
  const asphalt = mat(0x2f3236, { rough: 0.95 }), dirt = mat(0x7a5a3a, { rough: 1 }), gravel = mat(0x9a948a, { rough: 1 }), white = mat(0xf2f2f2), cone = mat(0xff6a00), yellow = mat(0xf2b705, { rough: 0.6 });
  const dbl = m => { const c = m.clone(); c.side = THREE.DoubleSide; return c; };
  const asphaltD = dbl(asphalt), whiteD = dbl(white), dirtD = dbl(dirt), gravelD = dbl(gravel);

  // a strip of road surface that follows the ground, from a to b along the stretch, `lift` above it
  function ribbon(I, a, b, lift, width, m, parent) {
    if (b - a < 0.2) return null;
    const N = Math.max(1, Math.ceil((b - a) / 2)), pos = [], idx = [];
    for (let i = 0; i <= N; i++) { const t = a + (b - a) * i / N; for (const s of [-1, 1]) { const [x, , z] = P(I, t, I.c + s * width / 2); pos.push(x, groundY(x, z) + lift, z); } if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const info = r => { const [x0, x1, z0, z1] = r.r, alongX = x1 - x0 > z1 - z0; return { alongX, a0: alongX ? x0 : z0, a1: alongX ? x1 : z1, c: alongX ? (z0 + z1) / 2 : (x0 + x1) / 2, w: alongX ? z1 - z0 : x1 - x0, rev: r.from === 'end' }; };
  const P = (I, a, c, y = 0) => I.alongX ? [a, y, c] : [c, y, a];

  // a finished stretch: asphalt, dashes, edge lines, lamps
  const built = new Set();
  function finish(i) {
    if (built.has(i)) return; built.add(i);
    const I = info(NEW_ROADS[i]), g = new THREE.Group(); root.add(g); const L = I.a1 - I.a0;
    ribbon(I, I.a0, I.a1, 0.06, I.w, asphaltD, g); void L;
    for (let a = I.a0 + 4; a < I.a1 - 4; a += 9) ribbon({ ...I, c: I.c }, a, a + 4, 0.075, 0.16, whiteD, g);
    for (const s of [-1, 1]) ribbon({ ...I, c: I.c + s * (I.w / 2 - 0.5) }, I.a0 + 5, I.a1 - 5, 0.072, 0.12, whiteD, g);
    for (let a = I.a0 + 12; a < I.a1 - 6; a += 36) { const [x, , z] = P(I, a, I.c + I.w / 2 + 1.2), y = groundY(x, z); B(g, 0.15, 5.5, 0.15, x, y + 2.75, z, 0x2b2f33); B(g, 0.5, 0.18, 0.5, x, y + 5.5, z, mat(0xfff1c4, { emissive: 0xfff1c4, ei: 1.4 })); }
  }

  // the current job: layers that creep along the line, the machines at the head, cones, workers
  const job = new THREE.Group(); root.add(job);
  const layerGroup = new THREE.Group(); job.add(layerGroup);
  const machine = (body, extra) => { const g = new THREE.Group(); job.add(g); B(g, 2.4, 1.4, 4, 0, 1.0, 0, body); B(g, 2.2, 1.4, 1.6, 0, 2.3, -0.8, mat(0x223344, { metal: 0.3 })); extra?.(g); return g; };
  const excavator = machine(yellow, g => { const arm = B(g, 0.4, 0.4, 4, 0, 2.6, 2.6, yellow); arm.rotation.x = -0.5; B(g, 1.2, 0.8, 0.8, 0, 1.2, 4.6, mat(0x333333)); for (const s of [-1, 1]) B(g, 0.6, 0.7, 4.4, s * 1.2, 0.35, 0, mat(0x222222)); });
  const roller = machine(yellow, g => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 16), mat(0x777777, { metal: 0.6 })); d.rotation.z = Math.PI / 2; d.position.set(0, 0.75, 2.4); g.add(d); });
  const paver = machine(mat(0xe8a317), g => { B(g, 3.2, 0.5, 1.2, 0, 0.4, -2.4, mat(0x333333)); B(g, 2.0, 0.8, 1.4, 0, 1.0, 2.4, mat(0x3a3a3a)); });
  const liner = machine(mat(0xf2f2f2), g => { B(g, 0.3, 0.3, 0.6, 0, 0.3, 2.3, yellow); });
  const van = machine(mat(0xf2f2f2), g => { B(g, 2.4, 0.2, 4.1, 0, 2.0, 0, mat(0xff6a00)); });
  const coneMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 0.7, 10), cone, 120); coneMesh.count = 0; job.add(coneMesh);
  const signMesh = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const q = cv.getContext('2d'); q.fillStyle = '#ffd400'; q.fillRect(0, 0, 256, 128); q.fillStyle = '#111'; q.font = 'bold 30px sans-serif'; q.textAlign = 'center'; q.fillText('ROAD WORKS', 128, 52); q.font = '20px sans-serif'; q.fillText('Westhaven Highways', 128, 92); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); job.add(m); return m; })();
  const workers = [];
  if (makePerson) for (let k = 0; k < 4; k++) { const h = makePerson({ outfit: 0xff7a00, pants: 0x2a3440, hair: [0x2b1d14, 0x111111, 0x5a3b22, 0xc9a26a][k] }); scene.add(h.root); const hat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffd400)); hat.position.y = 1.85; h.rig.add(hat); workers.push(h); }
  let head = new THREE.Vector3(), jobText = '';
  const ask = { pos: new THREE.Vector3(), r: 4, label: 'Ask the road crew how it\'s going', action: () => toast(jobText) };
  interactables.push(ask);

  const I0 = { x: 0 };
  let lastKey = '';
  function layout(st) {
    const machines = [excavator, roller, paver, liner, van];
    for (const m of machines) m.visible = false;
    for (const c of [...layerGroup.children]) { layerGroup.remove(c); c.geometry?.dispose(); }
    coneMesh.count = 0;
    let I, prog = 0, name = '';
    if (!st.done) {
      const R = NEW_ROADS[st.index]; I = info(R); name = R.name;
      const stage = roadStage(st.t), L = I.a1 - I.a0;
      const span = (t0, t1) => Math.min(1, Math.max(0, (st.t - t0) / (t1 - t0)));
      const lay = (m, f, y) => { if (f <= 0.002) return I.rev ? I.a1 : I.a0; const len = L * f; if (I.rev) { ribbon(I, I.a1 - len, I.a1, y, I.w, m, layerGroup); return I.a1 - len; } ribbon(I, I.a0, I.a0 + len, y, I.w, m, layerGroup); return I.a0 + len; };
      const fd = span(0.1, 0.35), fg = span(0.35, 0.6), fa = span(0.6, 0.85), fl = span(0.85, 1);
      const hd = lay(dirtD, fd, 0.04), hg = lay(gravelD, fg, 0.07), ha = lay(asphaltD, fa, 0.1);
      // lines, painted along behind the line truck
      if (fl > 0) for (let a = I.a0 + 4; a < I.a1 - 4; a += 9) { const frac = I.rev ? (I.a1 - a) / L : (a - I.a0) / L; if (frac <= fl) ribbon(I, a, a + 4, 0.115, 0.16, whiteD, layerGroup); }
      const at = { survey: I.rev ? I.a1 - L * span(0, 0.1) : I.a0 + L * span(0, 0.1), earthworks: hd, 'sub-base': hg, asphalt: ha, lines: I.rev ? I.a1 - L * fl : I.a0 + L * fl }[stage];
      const mach = { survey: van, earthworks: excavator, 'sub-base': roller, asphalt: paver, lines: liner }[stage];
      const [x, , z] = P(I, at ?? I.a0, I.c); head.set(x, groundY(x, z), z); mach.visible = true; mach.position.set(x, head.y + 0.12, z);
      mach.rotation.y = I.alongX ? (I.rev ? -Math.PI / 2 : Math.PI / 2) : (I.rev ? Math.PI : 0);
      prog = st.t;
      const words = { survey: 'pegging out the line', earthworks: 'digging out the road bed', 'sub-base': 'rolling in the gravel sub-base', asphalt: 'laying the asphalt', lines: 'painting the lines and putting up the lamps' };
      const left = (1 - st.t) * ROAD_HOURS;
      jobText = `🚧 Westhaven Highways: "We're ${words[stage]} on ${name}. ${Math.round(prog * 100)}% done; it opens in about ${left < 1 ? Math.max(5, Math.round(left * 60)) + ' minutes' : left.toFixed(1) + ' hours'}. We keep going round the clock, so come back later and it'll be further on."`;
      // cones down both sides of the work
      const o = new THREE.Object3D(); let n = 0;
      for (let a = I.a0 + 2; a < I.a1 - 2 && n < 118; a += 7) for (const s of [-1, 1]) { const [cx, , cz] = P(I, a, I.c + s * (I.w / 2 + 0.6)); o.position.set(cx, groundY(cx, cz) + 0.35, cz); o.updateMatrix(); coneMesh.setMatrixAt(n++, o.matrix); }
      coneMesh.count = n; coneMesh.instanceMatrix.needsUpdate = true;
      const [sx, , sz] = P(I, I.rev ? I.a1 + 3 : I.a0 - 3, I.c + I.w / 2 + 2); signMesh.position.set(sx, groundY(sx, sz) + 1.4, sz); signMesh.rotation.y = I.alongX ? Math.PI / 2 : 0; signMesh.visible = true;
    } else {
      // all built: resurfacing the country roads in turn, a few hours each
      const list = resurface.length ? resurface : [[954, 966, 120, 565]], k = (st.step - NEW_ROADS.length) % list.length;
      const [x0, x1, z0, z1] = list[k]; I = info({ r: [x0, x1, z0, z1] });
      const a = I.a0 + (I.a1 - I.a0) * (0.2 + 0.6 * st.t), [x, , z] = P(I, a, I.c + I.w / 4); head.set(x, groundY(x, z), z);
      roller.visible = true; roller.position.set(x, head.y + 0.1, z); roller.rotation.y = I.alongX ? Math.PI / 2 : 0;
      const o = new THREE.Object3D(); let n = 0; for (let b = a - 30; b < a + 30 && n < 60; b += 4) { const [cx, , cz] = P(I, b, I.c); o.position.set(cx, groundY(cx, cz) + 0.35, cz); o.updateMatrix(); coneMesh.setMatrixAt(n++, o.matrix); } coneMesh.count = n; coneMesh.instanceMatrix.needsUpdate = true;
      const [sx, , sz] = P(I, a - 34, I.c + I.w / 2 + 2); signMesh.position.set(sx, groundY(sx, sz) + 1.4, sz); signMesh.rotation.y = I.alongX ? Math.PI / 2 : 0; signMesh.visible = true;
      jobText = '🚧 Westhaven Highways: "Every new road we had planned is open. Now we\'re resurfacing the country roads, a stretch at a time. One lane\'s coned off while we work."';
    }
    ask.pos.copy(head); void I0;
    workers.forEach((h, k) => { const side = k % 2 ? 1 : -1, wx = head.x + (I.alongX ? -3 - k * 2 : side * (I.w / 2 + 1.5)), wz = head.z + (I.alongX ? side * (I.w / 2 + 1.5) : -3 - k * 2); h.root.position.set(wx, groundY(wx, wz), wz); h.root.rotation.y = Math.atan2(head.x - h.root.position.x, head.z - h.root.position.z); });
  }

  let acc = 0;
  function update(dt, playerPos, now = Date.now()) {
    acc -= dt; if (acc > 0) return; acc = 1;   // the clock moves slowly: check once a second
    const st = roadCrewState(now);
    for (let i = 0; i < Math.min(st.step, NEW_ROADS.length); i++) finish(i);
    const key = st.step + ':' + Math.floor(st.t * 400);
    if (key !== lastKey) { lastKey = key; layout(st); }
    const near = playerPos && playerPos.distanceTo(head) < 80;
    workers.forEach(h => { h.root.visible = !!near; if (near && animatePerson) animatePerson(h, false, 0.016); });
  }
  update(1, null);   // (lay out the current state straight away)
  return { update, get head() { return head; }, describe: () => jobText, NEW_ROADS };
}
