// Security drones patrolling the dome: some circle over districts, some follow the
// roads at rooftop height, and a ring of them patrols the rim of the Aegis Shield.
// Each has spinning rotors and blinking navigation lights.
import * as THREE from 'three';

export function buildDrones({ scene, dome, count = 36 }) {
  const body = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.4, metalness: 0.6 });
  const arm = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.5, metalness: 0.5 });
  const red = new THREE.MeshBasicMaterial({ color: 0xff2a2a }), green = new THREE.MeshBasicMaterial({ color: 0x2aff6a }), white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const rotorGeo = new THREE.BoxGeometry(0.9, 0.02, 0.07), drones = [];
  let seed = 98765; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.55), body); g.add(core);
    const cam = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })); cam.position.set(0, -0.14, 0.18); g.add(cam);
    const rotors = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.62), arm); a.position.set(sx * 0.32, 0.02, sz * 0.32); a.rotation.y = sx * sz * Math.PI / 4; g.add(a);
      const r = new THREE.Mesh(rotorGeo, arm); r.position.set(sx * 0.52, 0.12, sz * 0.52); g.add(r); rotors.push(r);
    }
    const ledL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), red); ledL.position.set(-0.3, 0, 0.3); g.add(ledL);
    const ledR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), green); ledR.position.set(0.3, 0, 0.3); g.add(ledR);
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), white); strobe.position.set(0, 0.12, -0.25); g.add(strobe);
    g.scale.setScalar(1.6); g.userData.noCull = true; scene.add(g);
    // patrol pattern: 0 = circle over a district, 1 = figure-eight, 2 = rim patrol round the dome
    const kind = i < 10 ? 2 : i % 2;
    const ang = rnd() * Math.PI * 2, rad = 120 + rnd() * 850;
    drones.push({ g, rotors, strobe, kind, cx: dome.x + Math.sin(ang) * rad * 0.8, cz: dome.z + Math.cos(ang) * rad * 0.8, r: 40 + rnd() * 120, h: 28 + rnd() * 40, speed: (0.12 + rnd() * 0.18) * (rnd() < 0.5 ? -1 : 1), t: rnd() * 100, phase: rnd() * 6 });
  }
  const last = new THREE.Vector3();
  function update(dt) {
    for (const d of drones) {
      d.t += dt;
      const p = d.g.position; last.copy(p);
      if (d.kind === 2) {   // rim patrol, just inside the shield wall
        const a = d.phase + d.t * d.speed * 0.06, R = dome.r - 40;
        p.set(dome.x + Math.sin(a) * R, d.h + 20 + Math.sin(d.t * 0.5) * 3, dome.z + Math.cos(a) * R);
      } else if (d.kind === 0) {
        const a = d.phase + d.t * d.speed;
        p.set(d.cx + Math.cos(a) * d.r, d.h + Math.sin(d.t * 0.7) * 2, d.cz + Math.sin(a) * d.r);
      } else {
        const a = d.phase + d.t * d.speed;
        p.set(d.cx + Math.sin(a) * d.r, d.h + Math.sin(d.t * 0.9) * 2, d.cz + Math.sin(a * 2) * d.r * 0.5);
      }
      const dx = p.x - last.x, dz = p.z - last.z;
      if (dx * dx + dz * dz > 1e-6) { d.g.rotation.y = Math.atan2(dx, dz); d.g.rotation.x = 0.12; }
      for (const r of d.rotors) r.rotation.y += dt * 40;
      d.strobe.visible = ((d.t + d.phase) % 1.2) < 0.12;
    }
  }
  return { drones, update };
}
