// Grass you can see: tufts of blades that sway in the wind, growing on grassy ground around you.
// Only a circle of tufts around the player exists at any time (they're moved ahead of you as
// you walk), so it costs the same anywhere on the map. Tufts never grow on roads, pavements,
// water or inside buildings: spot(x, z) decides, and returns the ground height or null.
import * as THREE from 'three';

function tuftGeometry() {
  const pos = [], col = [], base = new THREE.Color(0x3d6a2c), tip = new THREE.Color(0x8fbf5a);
  const blades = 9;
  for (let i = 0; i < blades; i++) {
    const a = i / blades * Math.PI * 2 + (i % 2) * 0.4, r = 0.04 + (i % 3) * 0.035, h = 0.16 + ((i * 37) % 10) / 45, w = 0.016, lean = 0.06 + (i % 3) * 0.03;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean);
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function createGrass({ scene, count = 3500, radius = 38, spot }) {
  const time = { value: 0 };
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  material.onBeforeCompile = sh => {   // wind: the tips sway, the roots stay put
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uTime * 1.7 + wp.x * 0.35 + wp.z * 0.27) * 0.5 + sin(uTime * 3.1 + wp.x * 0.9) * 0.2;
      transformed.x += sway * 0.12 * position.y; transformed.z += sway * 0.06 * position.y;`);
  };
  material.customProgramCacheKey = () => 'grass-wind-v1';
  const mesh = new THREE.InstancedMesh(tuftGeometry(), material, count);
  mesh.frustumCulled = false; mesh.userData.noCull = true; mesh.receiveShadow = false; mesh.castShadow = false;
  scene.add(mesh);
  const pts = Array.from({ length: count }, () => ({ x: 1e9, z: 1e9, ok: false }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, zero);
  let cursor = 0, lastX = null, lastZ = null;
  function seat(i, cx, cz, ring) {
    const a = Math.random() * Math.PI * 2, r = ring ? radius * (0.75 + Math.random() * 0.25) : radius * Math.sqrt(Math.random());
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, p = pts[i];
    p.x = x; p.z = z;
    const y = spot(x, z);
    if (y == null) { p.ok = false; mesh.setMatrixAt(i, zero); return; }
    p.ok = true;
    const s = 0.6 + Math.random() * 0.6;
    mesh.setMatrixAt(i, m4.compose(v.set(x, y + 0.01, z), q.setFromAxisAngle(up, Math.random() * 6.28), sc.set(s, s * (0.8 + Math.random() * 0.5), s)));
  }
  function update(dt, player, visible = true) {
    time.value += dt;
    mesh.visible = visible;
    if (!visible) return;
    const px = player.x, pz = player.z;
    const jumped = lastX == null || Math.hypot(px - lastX, pz - lastZ) > radius;
    lastX = px; lastZ = pz;
    // after a teleport, regrow everything around you; otherwise move a slice of tufts that fell behind
    const budget = jumped ? count : Math.min(count, 260);
    let changed = false;
    for (let n = 0; n < budget; n++) {
      const i = cursor; cursor = (cursor + 1) % count;
      const p = pts[i];
      if (jumped) { seat(i, px, pz, false); changed = true; continue; }
      if (Math.hypot(p.x - px, p.z - pz) > radius || (!p.ok && Math.random() < 0.15)) { seat(i, px, pz, p.ok); changed = true; }
    }
    if (changed) mesh.instanceMatrix.needsUpdate = true;
  }
  return { update, mesh, setCount(n) { mesh.count = Math.max(0, Math.min(count, n)); } };
}
