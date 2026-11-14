// WATERFALLS that obey gravity. Water only falls where there is height to fall from, and it has to come from
// somewhere. Each waterfall here is a rock cascade built on the bank of a pond:
//   - a header pool at the top of the rocks, fed by a recirculating pump hidden in the rockwork (Spark & Pipe
//     Utilities) that lifts water from the pond below back to the top. Real park waterfalls work the same way.
//   - the water leaves each rock lip with a little forward speed and then falls freely, so its path is a
//     parabola: z = v·t, y = −½·g·t² (g = 9.81 m/s²). It speeds up as it falls (the streaks show this: they are
//     drawn at a steady rate in time, so they stretch out lower down).
//   - between drops the water collects in a rock basin and spills over its front lip.
//   - where it lands it throws up spray. Each droplet is a projectile under the same gravity. Foam spreads on
//     the surface in rings.
// The rocks block you. Stand close and you feel the spray.
import * as THREE from 'three';

const G = 9.81;

const waterMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { time: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform float time;
    float h(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    void main() {
      float col = floor(vUv.x * 28.0), off = h(col) * 7.0, sp = 1.4 + h(col + 3.0) * .8;
      float s = fract(vUv.y * 2.2 - time * sp + off);                 // streaks moving down at a steady rate in fall time
      float streak = smoothstep(.0, .25, s) * smoothstep(.75, .35, s);
      float edge = smoothstep(0.0, .12, vUv.x) * smoothstep(1.0, .88, vUv.x);
      vec3 c = mix(vec3(.55, .75, .85), vec3(.97, .99, 1.0), .35 + streak * .65);
      gl_FragColor = vec4(c, (.55 + streak * .4) * edge);
    }`,
});

// a ribbon of falling water following the projectile path from a lip
function sheet(lip, land, v0, width) {
  const T = Math.sqrt(2 * Math.max(.05, lip.y - land) / G), N = 16, pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = T * i / N, z = lip.z + v0 * t, y = lip.y - .5 * G * t * t, spread = 1 + .12 * i / N;   // the sheet widens a little as it falls
    for (const s of [-1, 1]) { pos.push(lip.x + s * width / 2 * spread, y, z); uv.push(s < 0 ? 0 : 1, i / N); }
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return { geo: g, landZ: lip.z + v0 * T, T, speed: Math.hypot(v0, G * T) };
}

// build one: placed at (x, z), the water flowing towards `yaw` (0 = towards +z). tiers go from the top down.
//   tiers: [{ lip: height of the lip, z: how far forward the lip is, land: height of the water it falls into, v0 }]
export function buildWaterfall(parent, { x, z, yaw = 0, width = 3.2, tiers, pond, block = () => { }, scale = 1, rock = 0x9a9488 }) {
  const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = yaw; parent.add(root);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, flatShading: true, vertexColors: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  // rock colours: grey stone, darker where it's wet, moss on top
  { const c = new THREE.Color(), p = rockGeo.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { c.setHex(p.getY(i) > .55 ? 0x6f8a4a : 0xffffff); col.push(c.r, c.g, c.b); }
    rockGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  let seed = Math.abs(Math.round(x * 13 + z * 7)) + 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rocks = []; const R = (lx, ly, lz, s, sy = s, wet = false) => rocks.push([lx * scale, ly * scale, lz * scale, s * scale, sy * scale, wet]);
  const W = width / scale, top = tiers[0].lip / scale;
  // the back wall: rock piled up behind the top pool, highest in the middle
  for (let i = -3; i <= 3; i++) for (let k = 0; k < 4; k++) { const lx = i * (W / 4 + .7) + (rnd() - .5) * .5, ly = Math.max(.3, top + .6 - Math.abs(i) * .55 - k * 1.5 + (rnd() - .5) * .4); if (ly > -.5) R(lx, ly, -1.6 - k * .35 - rnd() * .5, 1.1 + rnd() * .5, 1 + rnd() * .4); }
  // the cheeks: rock either side of the falling water, stepping down towards the pond
  const last = tiers[tiers.length - 1];
  for (const s of [-1, 1]) for (let lz = -1; lz <= last.z / scale + .8; lz += .9) { const tierAt = tiers.find(t => lz <= t.z / scale + .4) || last, h = tierAt.lip / scale + .2 - (lz - (tierAt.z / scale - 1)) * .15;
    R(s * (W / 2 + .8 + rnd() * .3), h - .9, lz, .95 + rnd() * .35, 1.3 + rnd() * .4); R(s * (W / 2 + 1.7), h - 1.8, lz + .3, 1.2, 1.4); }
  // under each lip: a rock step (the basin the water collects in sits on it) and wet rock below the falls
  tiers.forEach((t, i) => {
    const lip = t.lip / scale, lz = t.z / scale;
    for (let k = -2; k <= 2; k++) R(k * W / 5, lip - .75, lz - .55, W / 7 + .25, .75, true);
    const below = (tiers[i + 1]?.lip ?? t.land) / scale;
    for (let yy = lip - 1.6; yy > below - .6; yy -= 1.1) for (let k = -1; k <= 1; k++) R(k * W / 3.5, yy, lz - .9 - rnd() * .2, .8 + rnd() * .3, .7, true);
  });
  const inst = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length), o = new THREE.Object3D(), wetC = new THREE.Color(rock).multiplyScalar(.7), dryC = new THREE.Color(rock);
  rocks.forEach(([lx, ly, lz, s, sy, wet], i) => { o.position.set(lx, ly, lz); o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); o.scale.set(s, sy, s); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); inst.setColorAt(i, wet ? wetC : dryC.clone().multiplyScalar(.85 + rnd() * .3)); });
  inst.castShadow = inst.receiveShadow = true; root.add(inst);
  // the pools: the header pool at the top (where the pump lets the water out) and a basin under each middle lip
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x3f7f96, roughness: .08, metalness: .25, transparent: true, opacity: .85 });
  const pools = [];
  tiers.forEach((t, i) => {
    const r = width / 2 + .2, p = new THREE.Mesh(new THREE.CircleGeometry(1, 20), poolMat);
    p.rotation.x = -Math.PI / 2; p.scale.set(r, r * .55, 1); p.position.set(0, t.lip - .02, t.z - r * .55); root.add(p); pools.push(p);
  });
  // the falling water
  const wm = waterMat(), falls = [];
  for (const t of tiers) { const s = sheet({ x: 0, y: t.lip, z: t.z }, t.land, t.v0 ?? 1.1, width * .82); const m = new THREE.Mesh(s.geo, wm); m.renderOrder = 2; root.add(m); falls.push({ ...s, land: t.land }); }
  // spray and foam where each one lands
  const splashes = falls.map(f => {
    const N = 90, pts = new Float32Array(N * 3), vel = new Float32Array(N * 3), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const spray = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf2f8fb, size: .12 * Math.min(1.4, f.speed / 6), transparent: true, opacity: .75, depthWrite: false }));
    root.add(spray);
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false });
    const foam = new THREE.Mesh(new THREE.CircleGeometry(1, 24), foamMat); foam.rotation.x = -Math.PI / 2; foam.scale.set(width * .6, width * .38, 1); foam.position.set(0, f.land + .015, f.landZ); root.add(foam);
    const rings = [0, .5].map(ph => { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .4, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(0, f.land + .02, f.landZ); root.add(m); return { m, ph }; });
    const reset = i => { pts[i * 3] = (Math.random() - .5) * width * .8; pts[i * 3 + 1] = f.land; pts[i * 3 + 2] = f.landZ + (Math.random() - .5) * .6;
      const up = f.speed * (.18 + Math.random() * .22); vel[i * 3] = (Math.random() - .5) * 1.6; vel[i * 3 + 1] = up; vel[i * 3 + 2] = (Math.random() - .2) * 1.8; };
    for (let i = 0; i < N; i++) { reset(i); pts[i * 3 + 1] += Math.random() * .8; }
    return { f, pts, vel, N, g, reset, foam, foamMat, rings };
  });
  for (const s of [-1, 1]) block(x + Math.cos(yaw) * s * (width / 2 + 1.4), z - Math.sin(yaw) * s * (width / 2 + 1.4), 1.8);   // the rocks block you
  block(x - Math.sin(yaw) * 1.8, z - Math.cos(yaw) * 1.8, Math.max(2.2, width / 2 + .6));
  let t = 0;
  return {
    root, pondLevel: last.land, tiers, landing: falls.map(f => ({ x: x + Math.sin(yaw) * f.landZ, z: z + Math.cos(yaw) * f.landZ })),
    update(dt, near = true) {
      t += dt; wm.uniforms.time.value = t; if (!near) return;
      dt = Math.min(dt, .05);
      for (const s of splashes) {
        for (let i = 0; i < s.N; i++) { s.vel[i * 3 + 1] -= G * dt; s.pts[i * 3] += s.vel[i * 3] * dt; s.pts[i * 3 + 1] += s.vel[i * 3 + 1] * dt; s.pts[i * 3 + 2] += s.vel[i * 3 + 2] * dt; if (s.pts[i * 3 + 1] < s.f.land) s.reset(i); }
        s.g.attributes.position.needsUpdate = true;
        s.foamMat.opacity = .45 + Math.sin(t * 9) * .08;
        for (const r of s.rings) { const k = (t * .55 + r.ph) % 1; r.m.scale.set(width * (.5 + k * 1.1), width * (.35 + k * .8), 1); r.m.material.opacity = .45 * (1 - k); }
      }
    },
  };
}
