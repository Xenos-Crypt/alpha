// Softer skies and livelier birds.
//   makeCloud(): a cloud built from soft, layered sprites (fluffy edges, a greyer base) instead of
//     hard flat-shaded lumps. tintClouds() colours them for dawn, day, dusk, night and rain.
//   createBirds(): proper little birds (body, head, beak, tail, flapping wings) in three kinds:
//     pigeons in the squares and parks, sparrows in the gardens, seagulls at the beach. They circle,
//     glide down and land, peck and hop about on the ground, and take off when you come close.
import * as THREE from 'three';

let cloudTex = null;
function cloudTexture(makeTex) {
  if (cloudTex) return cloudTex;
  cloudTex = makeTex(256, 160, g => {
    g.clearRect(0, 0, 256, 160);
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 46; i++) {   // overlapping soft puffs, fuller in the middle, flat-ish base
      const x = 40 + r() * 176, y = 58 + r() * 52 - Math.sin((x - 40) / 176 * Math.PI) * 26, rad = 18 + r() * 30 * Math.sin((x - 20) / 216 * Math.PI);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad); const shade = Math.round(255 - Math.max(0, y - 70) * 0.9);
      grd.addColorStop(0, `rgba(${shade},${shade},${Math.min(255, shade + 6)},0.55)`); grd.addColorStop(0.6, `rgba(${shade},${shade},${Math.min(255, shade + 6)},0.25)`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
  });
  return cloudTex;
}
const cloudMats = [];
export function makeCloud(makeTex, rand = Math.random) {
  const c = new THREE.Group(), tex = cloudTexture(makeTex), n = 3 + Math.floor(rand() * 4);
  for (let j = 0; j < n; j++) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.88 + rand() * 0.1, color: 0xffffff });
    cloudMats.push(m);
    const sp = new THREE.Sprite(m), w = 46 + rand() * 50; sp.scale.set(w, w * 0.62, 1); sp.position.set((j - n / 2) * 22 + rand() * 10, rand() * 6, (rand() - 0.5) * 24); c.add(sp);
  }
  return c;
}
// elev: the sun's height (-1..1); rainy: overcast grey
export function tintClouds(elev, rainy) {
  const c = new THREE.Color();
  if (elev > 0.25) c.setRGB(1, 1, 1); else if (elev > 0) c.setRGB(1, 0.86 + elev * 0.5, 0.78 + elev * 0.8);   // golden at dawn and dusk
  else c.setRGB(0.28 + Math.max(-0.2, elev) * 0.6, 0.3 + Math.max(-0.2, elev) * 0.6, 0.4 + Math.max(-0.2, elev) * 0.6);   // moonlit blue-grey
  if (rainy) c.multiplyScalar(0.62);
  for (const m of cloudMats) m.color.copy(c);
}

// ------------------------------------------------------------------ birds
const KINDS = {
  pigeon: { body: 0x8a909a, wing: 0x6e747e, head: 0x4f5a66, beak: 0x333333, size: 1.0, flap: 9 },
  sparrow: { body: 0x9a7a52, wing: 0x6b5236, head: 0x7a5a3a, beak: 0x2a2a2a, size: 0.65, flap: 14 },
  seagull: { body: 0xf4f4f2, wing: 0xb9bec4, head: 0xffffff, beak: 0xf2c14e, size: 1.35, flap: 6 },
};
const geo = { body: new THREE.SphereGeometry(0.16, 10, 8), head: new THREE.SphereGeometry(0.085, 8, 6), beak: new THREE.ConeGeometry(0.03, 0.09, 5), tail: new THREE.BoxGeometry(0.12, 0.02, 0.14), wing: (() => { const s = new THREE.Shape(); s.moveTo(0, -0.07); s.lineTo(0.34, -0.02); s.lineTo(0.3, 0.06); s.lineTo(0, 0.08); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; })() };
const matCache = new Map();
const m = c => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide })); return matCache.get(c); };
function birdMesh(kind) {
  const K = KINDS[kind], g = new THREE.Group();
  const body = new THREE.Mesh(geo.body, m(K.body)); body.scale.set(0.85, 0.75, 1.35); g.add(body);
  const head = new THREE.Mesh(geo.head, m(K.head)); head.position.set(0, 0.1, 0.19); g.add(head);
  const beak = new THREE.Mesh(geo.beak, m(K.beak)); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.09, 0.3); g.add(beak);
  for (const sx of [-0.035, 0.035]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 4), m(0x111111)); eye.position.set(sx, 0.13, 0.25); g.add(eye); }
  const tail = new THREE.Mesh(geo.tail, m(K.wing)); tail.position.set(0, 0.01, -0.24); tail.rotation.x = -0.15; g.add(tail);
  const wings = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.08, 0.06, 0); g.add(p); const w = new THREE.Mesh(geo.wing, m(K.wing)); w.scale.x = s; p.add(w); return p; });
  for (const sx of [-0.04, 0.04]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), m(0xc98a6a)); leg.position.set(sx, -0.15, 0); g.add(leg); g.userData.legs = (g.userData.legs || []).concat(leg); }
  g.scale.setScalar(K.size); return { g, wings, head };
}

export function createBirds({ scene, groundY, canLand }) {
  const birds = [], hubs = [];
  // a hub: where a flock lives. Birds circle above it and land around it.
  function hub(x, z, { kind = 'pigeon', n = 6, r = 14, h = 12, radius = 12 } = {}) {
    const H = { x, z, r, h, radius, kind }; hubs.push(H);
    for (let i = 0; i < n; i++) {
      const b = birdMesh(kind); scene.add(b.g);
      const bird = { ...b, m: b.g, hub: H, kind, state: 'fly', t: Math.random() * 20, phase: Math.random() * Math.PI * 2, speed: (kind === 'seagull' ? 0.22 : 0.35) + Math.random() * 0.15, r: r * (0.7 + Math.random() * 0.5), h: h + (Math.random() - 0.5) * 4, timer: 4 + Math.random() * 14, land: new THREE.Vector3(), vy: 0, peck: 0 };
      b.g.position.set(x + Math.cos(bird.phase) * bird.r, bird.h, z + Math.sin(bird.phase) * bird.r); birds.push(bird);
    }
  }
  const tmp = new THREE.Vector3();
  function update(dt, p) {
    for (const b of birds) {
      const H = b.hub; if (Math.abs(H.x - p.x) > 220 || Math.abs(H.z - p.z) > 220) continue;
      const g = b.g, K = KINDS[b.kind]; b.timer -= dt;
      const flightAt = ph => tmp.set(H.x + Math.cos(ph) * b.r, b.h + Math.sin(ph * 3) * 0.6, H.z + Math.sin(ph) * b.r);
      if (b.state === 'fly') {
        b.phase += b.speed * dt; g.position.copy(flightAt(b.phase));
        g.rotation.set(0, -b.phase, Math.sin(b.phase * 2) * 0.25);
        const glide = b.kind === 'seagull' ? Math.sin(b.t * 0.7) > 0.2 : Math.sin(b.t * 1.3) > 0.6; b.t += dt;
        const a = glide ? 0.15 : Math.sin(b.t * K.flap) * 0.9; b.wings[0].rotation.z = a; b.wings[1].rotation.z = -a;
        if (b.timer <= 0) {   // pick a spot on the ground to land
          for (let k = 0; k < 6; k++) { const ang = Math.random() * Math.PI * 2, rr = Math.random() * H.radius, x = H.x + Math.cos(ang) * rr, z = H.z + Math.sin(ang) * rr; if (!canLand || canLand(x, z)) { b.land.set(x, groundY(x, z) + 0.17 * K.size, z); b.state = 'descend'; break; } }
          if (b.state === 'fly') b.timer = 3;
        }
      } else if (b.state === 'descend') {
        tmp.copy(b.land).sub(g.position); const d = tmp.length(); const step = Math.min(d, (3 + d * 0.5) * dt);
        g.position.addScaledVector(tmp.normalize(), step); g.rotation.set(0, Math.atan2(tmp.x, tmp.z), 0);
        const a = d < 2 ? 1.1 : Math.sin(b.t * K.flap * 0.6) * 0.5 + 0.3; b.t += dt; b.wings[0].rotation.z = a; b.wings[1].rotation.z = -a;
        if (d < 0.05) { b.state = 'ground'; b.timer = 6 + Math.random() * 14; b.peck = 0; }
      } else if (b.state === 'ground') {
        b.wings[0].rotation.z = b.wings[1].rotation.z = 0.05;
        b.peck -= dt; if (b.peck <= 0) { b.peck = 0.6 + Math.random() * 1.6; if (Math.random() < 0.45) { const a = Math.random() * Math.PI * 2; b.hop = { x: Math.cos(a) * 0.35, z: Math.sin(a) * 0.35, t: 0 }; g.rotation.y = Math.atan2(b.hop.x, b.hop.z); } }
        if (b.hop) { b.hop.t += dt * 4; const k = Math.min(1, b.hop.t); g.position.x += b.hop.x * dt * 4; g.position.z += b.hop.z * dt * 4; g.position.y = b.land.y + Math.sin(k * Math.PI) * 0.1; if (k >= 1) { b.hop = null; g.position.y = b.land.y; } }
        b.head.position.y = 0.1 - Math.max(0, Math.sin(b.peck * 9)) * 0.06; b.head.position.z = 0.19 + Math.max(0, Math.sin(b.peck * 9)) * 0.04;   // pecking
        const near = Math.hypot(g.position.x - p.x, g.position.z - p.z) < 4.5;
        if (near || b.timer <= 0) { b.state = 'takeoff'; b.vy = 3 + Math.random() * 2; b.t = 0; b.flee = near; }
      } else if (b.state === 'takeoff') {
        b.t += dt; b.vy = Math.max(1.5, b.vy - dt * 1.5); g.position.y += b.vy * dt;
        const target = flightAt(b.phase); tmp.copy(target).sub(g.position); const d = tmp.length(); g.position.addScaledVector(tmp.normalize(), Math.min(d, 4 * dt));
        g.rotation.set(-0.4, Math.atan2(tmp.x, tmp.z), 0); const a = Math.sin(b.t * K.flap * 1.4) * 1.1; b.wings[0].rotation.z = a; b.wings[1].rotation.z = -a;
        if (g.position.y >= b.h - 0.5 || d < 0.5) { b.state = 'fly'; b.timer = 10 + Math.random() * 20; }
      }
    }
  }
  return { birds, hubs, hub, update };
}
