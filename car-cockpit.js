// The inside of the car for first-person driving. Traffic keeps to the left here, so the wheel is
// on the right. You see the dashboard (speedometer and rev counter with moving needles, the gear and
// fuel readouts, a centre screen), the steering wheel turning with your hands on it, the gear stick
// moving through the gears, the handbrake lever coming up when you pull it, both front seats, the
// back seats if you look round, door panels, pillars, the rear-view mirror and the roof lining.
import * as THREE from 'three';

export const EYE = new THREE.Vector3(-0.42, 1.52, -0.12);   // driver's eye, in car space (+z is forward)

export function createCockpit({ scene, makeTex }) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const mats = new Map(), geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, emissive: o.emissive ?? c, emissiveIntensity: o.ei ?? 0.32, map: o.map ?? null, side: o.side ?? THREE.FrontSide, transparent: o.opacity != null, opacity: o.opacity ?? 1, depthWrite: o.opacity == null })); return mats.get(k); };
  const B = (p, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(geo, m instanceof THREE.Material ? m : mat(m)); b.scale.set(w, h, d); b.position.set(x, y, z); b.renderOrder = 2; p.add(b); return b; };
  const C = (p, rt, rb, h, x, y, z, m, seg = 16) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m instanceof THREE.Material ? m : mat(m)); c.position.set(x, y, z); p.add(c); return c; };
  const trim = mat(0x1c1f24, { rough: 0.85 }), soft = mat(0x2a2e35, { rough: 0.95 }), leather = mat(0x4a3428, { rough: 0.6 }), insert = mat(0x6b5444, { rough: 0.8 }), chrome = mat(0xc9ced4, { metal: 0.8, rough: 0.25 }), lining = mat(0xb9b2a6, { rough: 1 }), glass = mat(0x9fc7e0, { opacity: 0.06, rough: 0.05, emissive: 0x000000, ei: 0 });

  // ---------------- dashboard ----------------
  B(g, 1.9, 0.3, 0.55, 0, 1.05, 0.82, trim);                         // the dash top
  B(g, 1.9, 0.45, 0.12, 0, 0.72, 0.58, soft);                        // lower dash
  const hood = B(g, 0.62, 0.1, 0.3, EYE.x, 1.33, 0.66, trim); hood.rotation.x = -0.2;   // binnacle over the dials
  // instrument cluster: a canvas redrawn as you drive
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; const cx = cv.getContext('2d');
  const dialTex = new THREE.CanvasTexture(cv); dialTex.colorSpace = THREE.SRGBColorSpace;
  const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.22), new THREE.MeshBasicMaterial({ map: dialTex })); cluster.position.set(EYE.x, 1.24, 0.56); cluster.rotation.y = Math.PI; cluster.rotation.x = 0.25; cluster.renderOrder = 3; g.add(cluster);
  // centre screen (sat-nav look)
  const nav = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshBasicMaterial({ map: makeTex(128, 80, q => { q.fillStyle = '#16212c'; q.fillRect(0, 0, 128, 80); q.strokeStyle = '#3d6a8f'; q.lineWidth = 3; for (let i = 0; i < 6; i++) { q.beginPath(); q.moveTo(0, 12 + i * 12); q.lineTo(128, 6 + i * 13); q.stroke(); } q.strokeStyle = '#ffd23f'; q.lineWidth = 4; q.beginPath(); q.moveTo(64, 80); q.lineTo(64, 40); q.lineTo(96, 18); q.stroke(); q.fillStyle = '#3ddc97'; q.beginPath(); q.moveTo(64, 56); q.lineTo(58, 68); q.lineTo(70, 68); q.fill(); q.fillStyle = '#fff'; q.font = 'bold 10px sans-serif'; q.fillText('WESTHAVEN', 6, 74); }) }));
  nav.position.set(0, 1.12, 0.56); nav.rotation.y = Math.PI; nav.rotation.x = 0.35; nav.renderOrder = 3; g.add(nav);
  for (const x of [-0.75, -0.18, 0.18, 0.75]) { B(g, 0.14, 0.06, 0.03, x, 1.1, 0.505, 0x111111); }   // air vents
  // ---------------- steering wheel, with hands ----------------
  const column = C(g, 0.035, 0.05, 0.4, EYE.x, 1.0, 0.52, trim, 10); column.rotation.x = Math.PI / 2 - 0.45;
  const wheel = new THREE.Group(); wheel.position.set(EYE.x, 1.1, 0.38); wheel.rotation.x = -0.4; g.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 10, 36), leather); wheel.add(rim);
  const hub = C(wheel, 0.06, 0.06, 0.05, 0, 0, 0, trim, 16); hub.rotation.x = Math.PI / 2;
  for (const a of [0, Math.PI * 0.75, -Math.PI * 0.75]) { const sp = B(wheel, 0.03, 0.17, 0.02, Math.sin(a) * 0.085, -Math.cos(a) * 0.085, 0, trim); sp.rotation.z = a; }
  const badge = C(wheel, 0.022, 0.022, 0.055, 0, 0, -0.005, chrome, 12); badge.rotation.x = Math.PI / 2;
  const hands = [-1, 1].map(s => { const h = new THREE.Group(); wheel.add(h); h.position.set(s * 0.18, 0.02, 0); const fist = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0xc68642)); fist.scale.set(1, 1.3, 1); h.add(fist); return h; });
  // forearms from the elbows (low, beside the body) up to the hands on the rim, in car space so they never cross your view
  const sleeve = mat(0x2e5a88); for (const s of [-1, 1]) { const a = new THREE.Vector3(EYE.x + s * 0.24, 1.0, 0.0), b = new THREE.Vector3(EYE.x + s * 0.17, 1.1, 0.36), arm = C(g, 0.032, 0.04, a.distanceTo(b), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, sleeve, 8); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); }
  // ---------------- centre console: gear stick and handbrake ----------------
  B(g, 0.32, 0.38, 1.0, 0, 0.62, 0.0, trim);
  const gate = B(g, 0.16, 0.01, 0.2, 0, 0.815, 0.18, 0x111111);
  const stick = new THREE.Group(); stick.position.set(0, 0.82, 0.18); g.add(stick);
  C(stick, 0.012, 0.014, 0.2, 0, 0.1, 0, chrome, 8); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), leather); knob.position.y = 0.21; stick.add(knob);
  const boot = C(g, 0.05, 0.06, 0.05, 0, 0.84, 0.18, soft, 10); void boot; void gate;
  const hb = new THREE.Group(); hb.position.set(0, 0.82, -0.2); g.add(hb);
  const lever = B(hb, 0.04, 0.035, 0.32, 0, 0.02, 0.13, trim); const grip = B(hb, 0.05, 0.05, 0.1, 0, 0.02, 0.26, leather); void lever; void grip;
  B(g, 0.12, 0.05, 0.12, 0, 0.82, -0.42, 0x111111); for (const dz of [-0.03, 0.03]) C(g, 0.03, 0.03, 0.02, 0, 0.85, -0.42 + dz * 2, 0x222222, 12);   // cup holders
  // ---------------- seats ----------------
  const seat = (x, z, back = false) => { const s = new THREE.Group(); s.position.set(x, 0, z); g.add(s);
    B(s, back ? 1.25 : 0.52, 0.14, 0.52, 0, 0.62, 0, leather); const bk = B(s, back ? 1.25 : 0.52, 0.7, 0.12, 0, 0.98, -0.3, leather); bk.rotation.x = -0.15;
    if (!back) { B(s, 0.3, 0.2, 0.1, 0, 1.43, -0.38, leather); B(s, 0.04, 0.12, 0.04, -0.08, 1.3, -0.37, chrome); B(s, 0.04, 0.12, 0.04, 0.08, 1.3, -0.37, chrome); }
    for (const sx of [-1, 1]) B(s, 0.06, 0.16, 0.5, sx * ((back ? 1.25 : 0.52) / 2 - 0.03), 0.72, 0, leather);   // cushion bolsters
    for (const cx0 of back ? [-0.42, 0, 0.42] : [0]) { B(s, 0.3, 0.02, 0.4, cx0, 0.7, 0.02, insert); const ib = B(s, 0.3, 0.5, 0.02, cx0, 1.0, -0.235, insert); ib.rotation.x = -0.15; }   // stitched centre panels
    return s; };
  seat(EYE.x, -0.15); seat(-EYE.x, -0.15); seat(0, -1.1, true);
  // ---------------- doors, pillars, roof, mirror, floor ----------------
  for (const s of [-1, 1]) { const x = s * 0.95;
    B(g, 0.06, 0.5, 1.6, x, 0.72, -0.25, soft); B(g, 0.08, 0.05, 1.5, x - s * 0.04, 0.98, -0.25, trim); B(g, 0.03, 0.04, 0.22, x - s * 0.06, 0.9, 0.1, chrome);   // door panel, armrest, handle
    const ap = B(g, 0.05, 0.75, 0.06, x * 0.99, 1.5, 0.74, trim); ap.rotation.x = -0.6; ap.rotation.z = s * 0.06;   // A-pillars
    B(g, 0.07, 0.62, 0.08, x * 0.97, 1.5, -0.65, trim);   // B-pillars
    B(g, 0.02, 0.42, 1.25, x * 1.0, 1.42, -0.0, glass);   // side windows
  }
  B(g, 1.9, 0.04, 2.2, 0, 1.86, -0.35, lining);           // roof lining
  B(g, 1.9, 0.05, 0.12, 0, 1.82, 0.78, trim);             // windscreen header
  B(g, 1.9, 0.02, 2.4, 0, 0.5, -0.3, mat(0x15171a));       // floor carpet
  const mirror = new THREE.Group(); mirror.position.set(0, 1.74, 0.62); g.add(mirror); B(mirror, 0.02, 0.06, 0.02, 0, 0.05, 0, trim); B(mirror, 0.24, 0.07, 0.02, 0, 0, 0, trim); B(mirror, 0.22, 0.055, 0.005, 0, 0, -0.012, mat(0xcfd8e0, { metal: 0.9, rough: 0.05 }));
  for (const sx of [-0.45, 0.45]) { const v = B(g, 0.35, 0.02, 0.15, sx, 1.83, 0.6, lining); v.rotation.x = 0.2; }   // sun visors
  // rear window frame and parcel shelf
  B(g, 1.9, 0.05, 0.12, 0, 1.78, -1.55, trim); B(g, 1.6, 0.04, 0.35, 0, 1.15, -1.62, trim);

  // ---------------- per-frame ----------------
  let lastDraw = 0;
  function drawDials(kmh, max, gear, revs, hand, lights) {
    cx.fillStyle = '#05070a'; cx.fillRect(0, 0, 512, 192);
    const dial = (x, v, vmax, labelFn, unit, red) => { cx.save(); cx.translate(x, 100); cx.strokeStyle = '#2a3440'; cx.lineWidth = 6; cx.beginPath(); cx.arc(0, 0, 76, Math.PI * 0.75, Math.PI * 2.25); cx.stroke();
      for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.75 + i / 8 * Math.PI * 1.5; cx.strokeStyle = red && i >= 7 ? '#ff3b30' : '#d9e2ea'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(Math.cos(a) * 62, Math.sin(a) * 62); cx.lineTo(Math.cos(a) * 74, Math.sin(a) * 74); cx.stroke(); cx.fillStyle = '#9fb0bf'; cx.font = '13px sans-serif'; cx.textAlign = 'center'; cx.fillText(labelFn(i), Math.cos(a) * 48, Math.sin(a) * 48 + 5); }
      const a = Math.PI * 0.75 + Math.min(1, v / vmax) * Math.PI * 1.5; cx.strokeStyle = '#ff6b35'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.cos(a) * 70, Math.sin(a) * 70); cx.stroke(); cx.fillStyle = '#ff6b35'; cx.beginPath(); cx.arc(0, 0, 6, 0, 7); cx.fill();
      cx.fillStyle = '#d9e2ea'; cx.font = 'bold 15px sans-serif'; cx.fillText(unit, 0, 50); cx.restore(); };
    dial(110, kmh, Math.max(160, Math.ceil(max / 20) * 20), i => Math.round(i * Math.max(160, Math.ceil(max / 20) * 20) / 8), 'km/h', false);
    dial(402, revs * 8, 8, i => i, 'x1000 rpm', true);
    cx.fillStyle = '#ffd23f'; cx.font = 'bold 44px sans-serif'; cx.textAlign = 'center'; cx.fillText(gear, 256, 90);
    cx.fillStyle = '#d9e2ea'; cx.font = 'bold 24px sans-serif'; cx.fillText(Math.round(kmh) + '', 256, 130);
    if (hand) { cx.fillStyle = '#ff3b30'; cx.font = 'bold 18px sans-serif'; cx.fillText('(P) BRAKE', 256, 170); }
    if (lights) { cx.fillStyle = '#3ddc97'; cx.font = 'bold 16px sans-serif'; cx.fillText('≡D', 256, 38); }
    dialTex.needsUpdate = true;
  }
  const gearPos = { R: [-0.04, -0.05], N: [0, 0], P: [0, 0.06], D: [0, -0.06], 1: [-0.04, 0.05], 2: [-0.04, -0.05], 3: [0, 0.05], 4: [0, -0.05], 5: [0.04, 0.05], 6: [0.04, -0.05] };
  function update(v, info, dt) {
    if (!v) { g.visible = false; return; }
    g.visible = true; g.position.copy(v.group.position); g.quaternion.copy(v.group.quaternion);
    wheel.rotation.z = THREE.MathUtils.lerp(wheel.rotation.z, (info.steer || 0) * 1.6, 1 - Math.exp(-10 * dt));
    hands.forEach((h, i) => { h.position.y = 0.02 + (i ? 1 : -1) * Math.sin(wheel.rotation.z) * 0.0; });
    const gp = gearPos[String(info.gear).replace(/^D\d$/, 'D')] || [0, 0]; stick.rotation.z = THREE.MathUtils.lerp(stick.rotation.z, -gp[0] * 6, 0.3); stick.rotation.x = THREE.MathUtils.lerp(stick.rotation.x, gp[1] * 6, 0.3);
    hb.rotation.x = THREE.MathUtils.lerp(hb.rotation.x, info.handbrake ? -0.55 : 0, 1 - Math.exp(-12 * dt));
    lastDraw -= dt; if (lastDraw <= 0) { lastDraw = 0.08; drawDials(Math.abs(info.speed) * 3.6, (info.maxSpeed || 40) * 3.6, String(info.gear), Math.min(1, info.revs ?? Math.abs(info.speed) / Math.max(1, info.maxSpeed || 40)), info.handbrake, info.lights); }
  }
  return { group: g, update, EYE };
}
