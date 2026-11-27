// The sea round Deephaven: fish of many kinds, sharks, rays, turtles and jellyfish swimming round the dome and
// along both sides of the glass tunnel, and coral, kelp and rocks on the sea floor outside the glass. Everything
// here is outside the glass and inside the deep-blue "sea" shells (deep-city.js), so you see it through the glass
// from the tunnel and from the streets.
//
// Fish of one kind share one instanced mesh, so the whole sea is a couple of dozen draw calls. Nothing is built
// until you first come down (create() is called then), and nothing moves unless you're down there.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// a fish body pointing along +x: an egg-shaped body, a forked tail, a dorsal fin; coloured per vertex by paint(x, y)
// (x from -1 at the tail to 1 at the nose, y from -1 belly to 1 back)
function fishGeometry({ len, ht, wd, tail = 0.45, fin = 0.35, paint }) {
  const body = new THREE.SphereGeometry(1, 14, 10); body.scale(len / 2, ht / 2, wd / 2);
  const t = new THREE.ConeGeometry(ht * tail, len * 0.32, 4, 1); t.scale(1, 1, 0.12); t.rotateZ(-Math.PI / 2); t.translate(-len * 0.56, 0, 0);
  const f = new THREE.ConeGeometry(len * 0.16, ht * fin, 4, 1); f.scale(1.6, 1, 0.1); f.translate(-len * 0.05, ht * 0.5, 0);
  const g = mergeGeometries([body.toNonIndexed(), t.toNonIndexed(), f.toNonIndexed()]); [body, t, f].forEach(x => x.dispose());
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { c.set(paint(pos.getX(i) / (len / 2), pos.getY(i) / (ht / 2))); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

// the kinds: size, colours, how many, and how they swim. 'ring' = round the dome; 'tube' = up and down both sides of
// the tunnel; 'reef' = little circles over the coral; 'school' = a shoal moving as one
const SPECIES = [
  { name: 'clownfish', len: 0.32, ht: 0.18, wd: 0.1, n: 36, mode: 'reef', speed: 0.6, paint: (x, y) => (Math.abs(x - 0.45) < 0.09 || Math.abs(x + 0.15) < 0.09 || x < -0.75 && x > -0.92) ? 0xffffff : 0xff6a00 },
  { name: 'blue tang', len: 0.45, ht: 0.3, wd: 0.1, n: 36, mode: 'tube', speed: 1.4, paint: (x, y) => x < -0.85 ? 0xffd400 : (y > 0.2 && x > -0.6 && x < 0.5 && y < 0.6) ? 0x0a0f2a : 0x1f5bff },
  { name: 'yellow tang', len: 0.4, ht: 0.36, wd: 0.09, n: 40, mode: 'tube', speed: 1.2, fin: 0.5, paint: () => 0xffe11a },
  { name: 'angelfish', len: 0.5, ht: 0.62, wd: 0.08, n: 22, mode: 'tube', speed: 0.9, fin: 0.7, paint: (x) => Math.round((x + 1) * 3.5) % 2 ? 0x15151a : 0xd8dde6 },
  { name: 'parrotfish', len: 0.8, ht: 0.38, wd: 0.22, n: 24, mode: 'ring', speed: 1.1, paint: (x, y) => x > 0.6 ? 0x7cf0d0 : y > 0.3 ? 0x2bc7a0 : 0xff7fbf },
  { name: 'lionfish', len: 0.45, ht: 0.3, wd: 0.14, n: 10, mode: 'reef', speed: 0.4, fin: 1.2, paint: (x) => Math.round((x + 1) * 5) % 2 ? 0xffffff : 0xb3261e },
  { name: 'grouper', len: 1.3, ht: 0.6, wd: 0.45, n: 10, mode: 'tube', speed: 0.7, paint: (x, y) => ((Math.round(x * 9) + Math.round(y * 5)) % 3 === 0) ? 0x3b2a1e : 0x7a5a3c },
  { name: 'sardine', len: 0.24, ht: 0.07, wd: 0.05, n: 150, mode: 'school', speed: 2.4, schools: 3, tail: 0.6, paint: (x, y) => y > 0.15 ? 0x3d5f8a : 0xdfe8f0 },
  { name: 'butterflyfish', len: 0.35, ht: 0.3, wd: 0.07, n: 30, mode: 'ring', speed: 1, fin: 0.5, paint: (x, y) => (x > 0.55 && Math.abs(y) < 0.5) ? 0x111111 : y > 0.4 ? 0xffb000 : 0xfff6d8 },
  { name: 'reef shark', len: 2.6, ht: 0.55, wd: 0.5, n: 5, mode: 'ring', speed: 2.2, fin: 1.1, tail: 0.9, paint: (x, y) => y < -0.25 ? 0xf2f2f2 : 0x6f7a84 },
  { name: 'hammerhead', len: 3.2, ht: 0.6, wd: 0.55, n: 2, mode: 'tube', speed: 1.8, fin: 1.2, tail: 0.9, paint: (x, y) => y < -0.25 ? 0xe8e8e8 : 0x5f6a74 },
  { name: 'whale shark', len: 9, ht: 1.8, wd: 1.6, n: 1, mode: 'ring', speed: 1.3, far: true, fin: 0.8, tail: 1, paint: (x, y) => (y > -0.2 && (Math.round(x * 14) + Math.round(y * 6)) % 3 === 0) ? 0xeaf2f5 : y < -0.3 ? 0xd9e1e4 : 0x2f4656 },
];

export function createSeaLife({ root, D, T, Y, top }) {
  const sea = new THREE.Group(); sea.name = 'Deephaven sea life'; root.add(sea);
  const rnd = (() => { let s = 77; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.7, metalness: 0, emissive: o.em ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.op != null, opacity: o.op ?? 1, depthWrite: o.op == null, vertexColors: !!o.vc, side: o.side ?? THREE.FrontSide });
  // the band of water round the dome the fish use: from 2 m outside the glass to 20 m out; how high there is room
  // for at a distance (under the sea shell and the surface)
  const RING0 = 2, RING1 = 20, roomAt = out => Math.max(1.5, top(out) - Y - 1.2);
  const edgeX = D.x - D.rx * Math.sqrt(Math.max(0, 1 - ((T.z - D.z) / D.rz) ** 2));   // where the tunnel meets the glass
  const tubeX0 = -278, tubeX1 = edgeX - 13;   // the stretch of tunnel the fish use: over the sea floor, clear of the beach and the dome
  // nothing swims through the tunnel: near it, fish go over the top
  const overTube = (x, y, z) => { if (x > D.x || x < T.x0 - 15) return y; const d = Math.abs(z - T.z); if (d >= 5.5) return y; const m = Y + T.half + 1.3; return y >= m ? y : d <= 4 ? m : y + (m - y) * (5.5 - d) / 1.5; };

  // ---------------------------------------------------------------- the sea floor outside: coral, kelp, rocks
  const reefs = [];   // where the reef fish hang about
  const coralCols = [0xff6f61, 0xffa62b, 0xc04bd8, 0xff4f9a, 0x35d0c0, 0xfff07a];
  const coralGeo = [new THREE.ConeGeometry(0.5, 1.6, 6), new THREE.SphereGeometry(0.7, 8, 6), new THREE.CylinderGeometry(0.15, 0.25, 1.8, 5), new THREE.TorusKnotGeometry(0.4, 0.14, 24, 5)];
  const coralBits = coralGeo.map(() => []), kelp = [], rocks = [];
  const reefAt = (x, z) => { reefs.push({ x, z }); for (let i = 0; i < 7; i++) { const k = (i + reefs.length) % coralGeo.length, a = rnd() * 6.3, r = rnd() * 2.2;
    coralBits[k].push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, s: 0.7 + rnd() * 0.9, c: coralCols[(i * 5 + reefs.length) % coralCols.length], ry: rnd() * 6.3 }); }
    for (let i = 0; i < 2; i++) rocks.push({ x: x + (rnd() - 0.5) * 6, z: z + (rnd() - 0.5) * 6, s: 0.8 + rnd() * 1.6 }); };
  const ell = (k, out, a) => [D.x + Math.cos(a) * (D.rx + out), D.z + Math.sin(a) * (D.rz + out)];
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + 0.1, [x, z] = ell(0, 5 + (i % 3) * 4, a); if (Math.abs(z - T.z) < 8 && x < D.x) continue; reefAt(x, z); }
  for (let x = tubeX0 + 4; x < tubeX1; x += 14) for (const s of [-1, 1]) reefAt(x + (s > 0 ? 7 : 0), T.z + s * (6 + rnd() * 3));
  for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, [x, z] = ell(0, 3 + rnd() * 16, a); if (Math.abs(z - T.z) < 6 && x < D.x) continue; kelp.push({ x, z, h: 4 + rnd() * 7, ph: rnd() * 6 }); }
  for (let x = tubeX0; x < tubeX1; x += 5) for (const s of [-1, 1]) if (rnd() < 0.6) kelp.push({ x: x + rnd() * 4, z: T.z + s * (5 + rnd() * 7), h: 3 + rnd() * 6, ph: rnd() * 6 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  coralGeo.forEach((g, k) => { const list = coralBits[k]; if (!list.length) return; const im = new THREE.InstancedMesh(g, std(0xffffff, { rough: 0.8 }), list.length);
    list.forEach((b, i) => { e.set(0, b.ry, 0); q.setFromEuler(e); m4.compose(v.set(b.x, Y + (k === 1 ? 0.3 : 0.8) * b.s, b.z), q, sc.setScalar(b.s)); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(b.c)); });
    im.name = 'coral'; sea.add(im); });
  { const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std(0x4d5560, { rough: 1 }), rocks.length);
    rocks.forEach((r, i) => { e.set(r.s, r.s * 2, 0); q.setFromEuler(e); m4.compose(v.set(r.x, Y + r.s * 0.3, r.z), q, sc.set(r.s * 1.4, r.s * 0.7, r.s)); im.setMatrixAt(i, m4); }); im.name = 'rocks'; sea.add(im); }
  const kelpGeo = new THREE.BoxGeometry(0.35, 1, 0.06); kelpGeo.translate(0, 0.5, 0);
  const kelpIM = new THREE.InstancedMesh(kelpGeo, std(0xffffff, { rough: 0.9, side: THREE.DoubleSide }), kelp.length); kelpIM.name = 'kelp'; kelpIM.frustumCulled = false; sea.add(kelpIM);
  kelp.forEach((k, i) => kelpIM.setColorAt(i, col.set(i % 3 ? 0x3f8f3a : 0x6b8f2a)));

  // ---------------------------------------------------------------- the fish
  const kinds = SPECIES.map(sp => {
    const geo = fishGeometry({ len: sp.len, ht: sp.ht, wd: sp.wd, tail: sp.tail, fin: sp.fin, paint: sp.paint });
    const im = new THREE.InstancedMesh(geo, std(0xffffff, { vc: true, rough: 0.45 }), sp.n); im.name = sp.name; im.frustumCulled = false; sea.add(im);
    const fish = [];
    for (let i = 0; i < sp.n; i++) {
      const f = { ph: rnd() * 6.3, s: (sp.len < 1 ? 1.5 : 1) * (0.8 + rnd() * 0.4), dir: rnd() < 0.5 ? 1 : -1 };
      if (sp.mode === 'ring') { f.out = sp.far ? 14 : RING0 + 1 + rnd() * (RING1 - RING0 - 2); f.a = rnd() * 6.3; f.y = 0.6 + rnd() * (roomAt(f.out) - 0.6); }
      else if (sp.mode === 'tube') { f.side = rnd() < 0.5 ? 1 : -1; f.off = 4.5 + rnd() * 6; f.u = rnd(); f.y = 0.5 + rnd() * 6; }
      else if (sp.mode === 'reef') { f.reef = reefs[i % reefs.length]; f.r = 0.8 + rnd() * 1.6; f.a = rnd() * 6.3; f.y = 0.6 + rnd() * 1.8; }
      else { f.school = i % sp.schools; f.dx = (rnd() - 0.5) * 3; f.dy = (rnd() - 0.5) * 1.6; f.dz = (rnd() - 0.5) * 3; }
      fish.push(f);
    }
    const schools = sp.mode === 'school' ? Array.from({ length: sp.schools }, (_, k) => ({ tube: k === 0, out: 6 + k * 4, a: k * 2.1, u: 0.3, side: 1, off: 7, y: 2.5 + k * 1.5 })) : [];
    return { sp, im, fish, schools };
  });

  // the tunnel's path for fish: a long loop, out along one side of the tunnel and back along the other, turning
  // round in a half circle at each end (u from 0 to 1 once round)
  function tubePoint(u, off, out) { const L = tubeX1 - tubeX0, arc = Math.PI * off, tot = 2 * L + 2 * arc; let s = ((u % 1) + 1) % 1 * tot;
    if (s < L) { out.x = tubeX0 + s; out.z = T.z + off; out.hx = 1; out.hz = 0; return out; } s -= L;
    if (s < arc) { const a = s / off; out.x = tubeX1 + Math.sin(a) * off; out.z = T.z + Math.cos(a) * off; out.hx = Math.cos(a); out.hz = -Math.sin(a); return out; } s -= arc;
    if (s < L) { out.x = tubeX1 - s; out.z = T.z - off; out.hx = -1; out.hz = 0; return out; } s -= L;
    const a = s / off; out.x = tubeX0 - Math.sin(a) * off; out.z = T.z - Math.cos(a) * off; out.hx = -Math.cos(a); out.hz = Math.sin(a); return out; }
  const tubeLen = off => 2 * (tubeX1 - tubeX0) + 2 * Math.PI * off;
  const P = { x: 0, z: 0, hx: 1, hz: 0 };
  function ringPoint(a, out, dir) { P.x = D.x + Math.cos(a) * (D.rx + out); P.z = D.z + Math.sin(a) * (D.rz + out); P.hx = -Math.sin(a) * (D.rx + out) * dir; P.hz = Math.cos(a) * (D.rz + out) * dir; const l = Math.hypot(P.hx, P.hz); P.hx /= l; P.hz /= l; return P; }
  function put(im, i, x, y, z, hx, hz, wag, s) { y = overTube(x, y, z); e.set(0, Math.atan2(-hz, hx) + wag, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, sc.setScalar(s)); im.setMatrixAt(i, m4); }

  // ---------------------------------------------------------------- the bigger animals: rays, turtles, jellyfish
  const rays = [], turtles = [], jellies = [];
  const rayTop = std(0x1d2430), rayBelly = std(0xeceff2), shell = std(0x5b6b2e), skin = std(0x8a9a5a), jellyM = std(0xff9ad5, { op: 0.45, em: 0xff6fc0, ei: 0.5 });
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.name = 'manta ray'; sea.add(g);
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), rayTop); b.scale.set(1.2, 0.18, 0.7); g.add(b); const u = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), rayBelly); u.scale.set(1.15, 0.1, 0.66); u.position.y = -0.06; g.add(u);
    const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.z = s * 0.5; g.add(w); const m = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 3), rayTop); m.scale.set(0.8, 1, 0.08); m.rotation.x = s * Math.PI / 2; m.position.z = s * 1.1; w.add(m); return { w, s }; });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 2.4, 4), rayTop); tail.rotation.z = Math.PI / 2; tail.position.x = -2.2; g.add(tail);
    rays.push({ g, wings, out: 6 + i * 3.5, a: i * 1.6, y: 3 + i * 1.3, dir: i % 2 ? 1 : -1, ph: i, sp: 1.3, tube: i === 3 }); }
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.name = 'sea turtle'; sea.add(g);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), shell); s.scale.set(1.15, 0.45, 0.9); g.add(s);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), skin); h.position.set(0.78, 0.02, 0); g.add(h);
    const fl = [[0.35, 1], [0.35, -1], [-0.45, 1], [-0.45, -1]].map(([x, s2]) => { const f = new THREE.Mesh(new THREE.BoxGeometry(x > 0 ? 0.5 : 0.3, 0.05, 0.22), skin); f.position.set(x, -0.05, s2 * 0.55); g.add(f); return { f, s2, front: x > 0 }; });
    turtles.push({ g, fl, out: 4 + i * 3, a: i * 1.7 + 0.8, y: 2 + i, dir: i % 2 ? -1 : 1, ph: i * 2, tube: i >= 2, u: i * 0.37, off: 6 + i }); }
  for (let i = 0; i < 16; i++) { const g = new THREE.Group(); g.name = 'jellyfish'; sea.add(g);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), jellyM); g.add(bell);
    const ten = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 8 }, (_, k) => { const a = k / 8 * Math.PI * 2; return [new THREE.Vector3(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28), new THREE.Vector3(Math.cos(a) * 0.22, -1.2 - (k % 3) * 0.3, Math.sin(a) * 0.22)]; }).flat()), new THREE.LineBasicMaterial({ color: 0xffc4e8, transparent: true, opacity: 0.6 })); g.add(ten);
    const tube = i % 2 === 0, x = tube ? tubeX0 + rnd() * (tubeX1 - tubeX0) : 0, a = rnd() * 6.3, out = 3 + rnd() * 12, [ex, ez] = ell(0, out, a);
    jellies.push({ g, bell, x: tube ? x : ex, z: tube ? T.z + (rnd() < 0.5 ? 1 : -1) * (4.5 + rnd() * 5) : ez, y0: 2 + rnd() * (tube ? 5 : roomAt(out) - 3), ph: rnd() * 6, s: 0.7 + rnd() * 0.8 }); }

  let t = 0;
  function update(dt) {
    t += dt;
    kelp.forEach((k, i) => { e.set(Math.sin(t * 0.7 + k.ph) * 0.12, k.ph, Math.cos(t * 0.5 + k.ph) * 0.1); q.setFromEuler(e); m4.compose(v.set(k.x, Y, k.z), q, sc.set(1, k.h, 1)); kelpIM.setMatrixAt(i, m4); }); kelpIM.instanceMatrix.needsUpdate = true;
    for (const { sp, im, fish, schools } of kinds) {
      for (const S of schools) { if (S.tube) { S.u += sp.speed * dt / tubeLen(S.off); tubePoint(S.u, S.off, S); } else { S.a += sp.speed * dt / (D.rx + S.out); ringPoint(S.a, S.out, 1); S.x = P.x; S.z = P.z; S.hx = P.hx; S.hz = P.hz; } S.yy = Y + S.y + Math.sin(t * 0.3 + S.a) * 0.8; }
      for (let i = 0; i < fish.length; i++) { const f = fish[i], wag = Math.sin(t * (sp.len < 1 ? 9 : 3) + f.ph) * (sp.len < 1 ? 0.18 : 0.1);
        if (sp.mode === 'ring') { f.a += f.dir * sp.speed * f.s * dt / (D.rx + f.out); ringPoint(f.a, f.out, f.dir); put(im, i, P.x, Y + f.y + Math.sin(t * 0.4 + f.ph) * 0.4, P.z, P.hx, P.hz, wag, f.s); }
        else if (sp.mode === 'tube') { f.u += f.dir * sp.speed * f.s * dt / tubeLen(f.off); tubePoint(f.u, f.off, P); put(im, i, P.x, Y + f.y + Math.sin(t * 0.5 + f.ph) * 0.3, P.z, P.hx * f.dir, P.hz * f.dir, wag, f.s); }
        else if (sp.mode === 'reef') { f.a += f.dir * sp.speed * dt / f.r; const R = f.reef; put(im, i, R.x + Math.cos(f.a) * f.r, Y + f.y + Math.sin(t + f.ph) * 0.15, R.z + Math.sin(f.a) * f.r, -Math.sin(f.a) * f.dir, Math.cos(f.a) * f.dir, wag, f.s); }
        else { const S = schools[f.school], w = Math.sin(t * 0.8 + f.ph); put(im, i, S.x + f.dx + w * 0.3, S.yy + f.dy + Math.cos(t + f.ph) * 0.2, S.z + f.dz + w * 0.2, S.hx, S.hz, wag, f.s); }
      }
      im.instanceMatrix.needsUpdate = true;
    }
    for (const r of rays) { const flap = Math.sin(t * 1.6 + r.ph);
      if (r.tube) { r.u = (r.u ?? 0) + r.sp * dt / tubeLen(8); tubePoint(r.u, 8, P); } else { r.a += r.dir * r.sp * dt / (D.rx + r.out); ringPoint(r.a, r.out, r.dir); }
      r.g.position.set(P.x, overTube(P.x, Y + r.y + flap * 0.25, P.z), P.z); r.g.rotation.set(0, Math.atan2(-P.hz, P.hx), 0); for (const w of r.wings) w.w.rotation.x = w.s * flap * 0.45; }
    for (const tu of turtles) { const pad = Math.sin(t * 1.4 + tu.ph);
      if (tu.tube) { tu.u += 0.7 * dt / tubeLen(tu.off); tubePoint(tu.u, tu.off, P); } else { tu.a += tu.dir * 0.7 * dt / (D.rx + tu.out); ringPoint(tu.a, tu.out, tu.dir); }
      tu.g.position.set(P.x, overTube(P.x, Y + tu.y + pad * 0.1, P.z), P.z); tu.g.rotation.set(0, Math.atan2(-P.hz, P.hx), 0); for (const f of tu.fl) f.f.rotation.x = f.s2 * (f.front ? pad * 0.6 : -pad * 0.3); }
    for (const j of jellies) { const pulse = Math.sin(t * 1.8 + j.ph); { const x = j.x + Math.sin(t * 0.1 + j.ph) * 1.5, z = j.z + Math.cos(t * 0.1 + j.ph) * 1.5; j.g.position.set(x, overTube(x, Y + j.y0 + Math.sin(t * 0.25 + j.ph) * 1.2, z), z); } j.bell.scale.set(j.s * (1 + pulse * 0.12), j.s * (1 - pulse * 0.15), j.s * (1 + pulse * 0.12)); j.g.children[1].scale.setScalar(j.s); }
  }
  update(0);
  return { group: sea, update, kinds: SPECIES.map(s => s.name).concat(['manta ray', 'sea turtle', 'jellyfish']) };
}
