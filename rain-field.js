import * as THREE from 'three';

// One reusable GPU buffer instead of allocating hundreds of little solid meshes.
export function createRainField({ scene, count = 700, random = Math.random, groundY = () => 0 }) {
  const positions = new Float32Array(count * 6), drops = new Float32Array(count * 4);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.LineBasicMaterial({ color: 0xb6cbd9, transparent: true, opacity: .38, depthWrite: false });
  const mesh = new THREE.LineSegments(geometry, material);mesh.name = 'Weather rain streaks';mesh.frustumCulled = false;mesh.visible = false;scene.add(mesh);
  let seeded = false;
  function reset(i, p, fill) {
    const n = i * 4, a = random() * Math.PI * 2, r = Math.sqrt(random()) * 22;
    drops[n] = p.x + Math.cos(a) * r;drops[n + 2] = p.z + Math.sin(a) * r;
    drops[n + 1] = p.y + (fill ? random() * 17 : 15 + random() * 2);
    drops[n + 3] = 13 + random() * 8;
  }
  function update(dt, p, active, sheltered = false) {
    mesh.visible = !!active && !sheltered;
    if (!mesh.visible) { seeded = false;return; }
    const step = Math.min(.1, Math.max(0, dt));
    for (let i = 0; i < count; i++) {
      const n = i * 4, v = i * 6;
      if (!seeded) reset(i, p, true);
      drops[n] += step * 1.1;drops[n + 2] += step * .35;drops[n + 1] -= drops[n + 3] * step;
      if (Math.abs(drops[n] - p.x) > 24 || Math.abs(drops[n + 2] - p.z) > 24 || drops[n + 1] < groundY(drops[n], drops[n + 2]) + .08 || drops[n + 1] < p.y - 4) reset(i, p, false);
      const length = .35 + drops[n + 3] * .018;
      positions[v] = drops[n];positions[v + 1] = drops[n + 1];positions[v + 2] = drops[n + 2];
      positions[v + 3] = drops[n] - .05;positions[v + 4] = drops[n + 1] + length;positions[v + 5] = drops[n + 2] - .016;
    }
    seeded = true;geometry.attributes.position.needsUpdate = true;
  }
  return { mesh, update, dispose() { mesh.removeFromParent();geometry.dispose();material.dispose(); } };
}
