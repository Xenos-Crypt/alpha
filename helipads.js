// Helicopter carry points: helipads on the roofs of the tallest towers and pickup pads
// on the ground, linked by a helicopter service. Stand on a pad and press E to fly to
// the destination shown; "Pick another destination" cycles through the others.
// On a rooftop you can also take the lift down to the street.
import * as THREE from 'three';

export function buildHelipads({ scene, interactables, toast, makeTex, teleport, roofs, ground }) {
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.2, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1 });
  const hTex = makeTex(256, 256, g => {
    g.fillStyle = '#2b2f33'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#f2c14e'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff'; g.font = 'bold 150px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 128, 136);
  });
  const padMat = new THREE.MeshStandardMaterial({ map: hTex, roughness: 0.8 });
  const lightMat = mat(0x9fe8ff, { emissive: 0x56c8ff, ei: 2.2 });
  const rotors = [];

  function helicopter(color) {
    const g = new THREE.Group(), body = mat(color, { metal: 0.4, rough: 0.35 }), dark = mat(0x222428);
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), body); hull.scale.set(1, 0.85, 1.7); hull.position.y = 1.5; g.add(hull);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1d3a5a, { metal: 0.6, rough: 0.1, opacity: 0.8 })); glass.rotation.x = Math.PI / 2.4; glass.position.set(0, 1.75, 1.2); g.add(glass);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 4.2), body); boom.position.set(0, 1.8, -3.4); g.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.7), body); fin.position.set(0, 2.3, -5.3); g.add(fin);
    const tail = new THREE.Group(); tail.position.set(0.12, 2.3, -5.3); g.add(tail);
    for (const r of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.12), dark); b.rotation.x = r; tail.add(b); }
    for (const s of [-1, 1]) { const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), dark); skid.rotation.x = Math.PI / 2; skid.position.set(s * 0.95, 0.15, 0.2); g.add(skid); for (const z of [-0.6, 1.0]) { const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.06), dark); strut.position.set(s * 0.8, 0.45, z); g.add(strut); } }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), dark); mast.position.y = 2.75; g.add(mast);
    const rotor = new THREE.Group(); rotor.position.y = 3.0; g.add(rotor);
    for (let i = 0; i < 4; i++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 5.2), dark); blade.position.z = 2.6; const arm = new THREE.Group(); arm.rotation.y = i * Math.PI / 2; arm.add(blade); rotor.add(arm); }
    rotors.push(rotor, tail);
    return g;
  }

  const pads = [], roofRects = [];
  const colors = [0x2f6f8f, 0xd0281f, 0xf2f2f2, 0x2d5d3a, 0x1a1a1a, 0xe8a33d];
  function addPad({ name, x, z, y = 0, r = 5.5, roof = null, heli = true }) {
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 32), [mat(0x3a3f45), padMat, mat(0x3a3f45)]); pad.position.y = 0.08; g.add(pad);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), lightMat); l.position.set(Math.cos(a) * (r + 0.2), 0.12, Math.sin(a) * (r + 0.2)); g.add(l); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), mat(0xcccccc)); pole.position.set(r + 1.4, 1.3, 0); g.add(pole);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.1, 10, 1, true), mat(0xff6a00)); sock.rotation.z = Math.PI / 2; sock.position.set(r + 1.95, 2.45, 0); g.add(sock);
    if (heli) { const h = helicopter(colors[pads.length % colors.length]); h.position.set(0, 0.16, 0); h.rotation.y = (pads.length * 1.3) % (Math.PI * 2); g.add(h); }
    const p = { name, x, z, y, r, roof, choice: 0, sock };
    p.fly = { pos: new THREE.Vector3(x, y + 0.2, z), r: r + 1, label: '', action: () => flyFrom(p) };
    Object.defineProperty(p.fly, 'label', { get: () => `Fly by helicopter to ${dest(p).name}` });
    p.pick = { pos: new THREE.Vector3(x + r + 1.2, y + 0.2, z + 1.5), r: 1.4, label: 'Pick another destination', action: () => { p.choice++; toast(`Destination: ${dest(p).name}`); } };
    interactables.push(p.fly, p.pick);
    if (roof) {
      roofRects.push({ minX: roof.minX, maxX: roof.maxX, minZ: roof.minZ, maxZ: roof.maxZ, top: y });
      const lift = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 2.4), mat(0x9aa3aa, { metal: 0.5 })); lift.position.set(roof.liftX - x, 1.4, roof.liftZ - z); g.add(lift);
      interactables.push({ pos: new THREE.Vector3(roof.liftX, y + 0.2, roof.liftZ + 1.8), r: 1.8, label: 'Take the lift down to the street', action: () => teleport(new THREE.Vector3(roof.streetX, 0.3, roof.streetZ), `Back on the street outside ${name}.`) });
    }
    pads.push(p);
    return p;
  }
  const dest = p => { const others = pads.filter(q => q !== p); return others[p.choice % others.length]; };
  function flyFrom(p) {
    const d = dest(p);
    teleport(new THREE.Vector3(d.x + d.r * 0.4, d.y + 0.3, d.z + d.r + 1.5), `The helicopter lifts off, banks over the city and sets you down at ${d.name}.`, 1400);
  }

  for (const t of roofs) {
    const fz = t.z + t.face * (t.d / 2);
    addPad({ name: `${t.name} roof`, x: t.x, z: t.z - t.face * 1.5, y: t.h, r: Math.min(5.5, t.d / 2 - 2.5),
      roof: { minX: t.x - t.w / 2, maxX: t.x + t.w / 2, minZ: t.z - t.d / 2, maxZ: t.z + t.d / 2, liftX: t.x + t.w / 2 - 2, liftZ: t.z + t.face * (t.d / 2 - 2.5), streetX: t.x + 4, streetZ: fz + t.face * 4 } });
  }
  for (const gp of ground) addPad({ ...gp, y: 0.05 });

  // Roofs are solid to stand on, and a low invisible rail stops you walking off the edge.
  function groundAt(x, z, bodyY) {
    for (const r of roofRects) if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ && bodyY > r.top - 2.5) return r.top + 0.16;
    return null;
  }
  function update(dt, playerPos) {
    for (const r of rotors) r.rotation.y += dt * 1.2;
    for (const p of pads) p.sock.rotation.x = Math.sin(performance.now() / 700 + p.x) * 0.2;
    for (const r of roofRects) {
      if (playerPos.y < r.top - 2.5 || playerPos.y > r.top + 6) continue;
      if (playerPos.x > r.minX - 1.5 && playerPos.x < r.maxX + 1.5 && playerPos.z > r.minZ - 1.5 && playerPos.z < r.maxZ + 1.5) {
        playerPos.x = THREE.MathUtils.clamp(playerPos.x, r.minX + 0.6, r.maxX - 0.6);
        playerPos.z = THREE.MathUtils.clamp(playerPos.z, r.minZ + 0.6, r.maxZ - 0.6);
      }
    }
  }
  return { pads, groundAt, update };
}
