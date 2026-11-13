// Helicopter carry points: helipads on the roofs of the tallest towers and pickup pads
// on the ground, linked by a helicopter service. Stand on a pad and press E to fly to
// the destination shown; "Pick another destination" cycles through the others.
// On a rooftop you can also take the lift down to the street.
// Helicopters don't just sit about for anyone to fly: they live on the roofs of the tallest towers
// (run by SkyLink Charter, who fly you for a fare) or at the government's helipad (officials only).
// You either REQUEST a flight, which can be refused, or you STEAL the helicopter and fly it yourself.
import * as THREE from 'three';

export function buildHelipads({ scene, interactables, toast, makeTex, teleport, roofs, ground, carry, canBoard, prepare, land, request, steal }) {
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
    g.userData.rotor = rotor; g.userData.tail = tail;
    return g;
  }

  const pads = [], roofRects = [];
  const colors = [0x2f6f8f, 0xd0281f, 0xf2f2f2, 0x2d5d3a, 0x1a1a1a, 0xe8a33d];
  function addPad({ name, x, z, y = 0, r = 5.5, roof = null, heli = true, owner = 'charter' }) {
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 32), [mat(0x3a3f45), padMat, mat(0x3a3f45)]); pad.position.y = 0.08; g.add(pad);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), lightMat); l.position.set(Math.cos(a) * (r + 0.2), 0.12, Math.sin(a) * (r + 0.2)); g.add(l); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), mat(0xcccccc)); pole.position.set(r + 1.4, 1.3, 0); g.add(pole);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.1, 10, 1, true), mat(0xff6a00)); sock.rotation.z = Math.PI / 2; sock.position.set(r + 1.95, 2.45, 0); g.add(sock);
    let h = null;
    if (heli) { h = helicopter(colors[pads.length % colors.length]); h.position.set(0, 0.16, 0); h.rotation.y = (pads.length * 1.3) % (Math.PI * 2); g.add(h); }
    const p = { name, x, z, y, r, roof, owner, choice: 0, sock, heli: h, group: g };
    p.fly = { pos: new THREE.Vector3(x, y + 0.2, z), r: r + 1, label: '', action: () => { if (p.stolen) { toast('The helicopter has been stolen. A replacement is on its way.'); return; } if (flight) { toast('The helicopter is already flying.'); return; } if (request && !request(p)) return; flyFrom(p); } };
    Object.defineProperty(p.fly, 'label', { get: () => p.stolen ? 'No helicopter here (stolen)' : flight ? 'The helicopter is out on a flight' : owner === 'government' ? `Request a government flight to ${dest(p).name}` : `Request a SkyLink charter flight to ${dest(p).name}` });
    if (h) interactables.push({ pos: new THREE.Vector3(x - r * .6, y + 0.2, z), r: 1.8, get label() { return p.stolen || flight ? '' : 'Steal the helicopter (crime)'; }, action: () => { if (p.stolen || flight || !steal) return; if (steal(p)) { p.stolen = Date.now(); h.visible = false; } } });
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
  // A real flight: you climb in, the helicopter lifts off, flies over the city to the other pad,
  // lands, lets you out, then flies back home empty.
  let flight = null;
  const seat = new THREE.Vector3(0.45, 1.2, 0.6);
  function flyFrom(p) {
    if (flight) { toast('The helicopter is already flying.'); return; }
    if (canBoard && !canBoard()) return;
    const d = dest(p);
    if (!p.heli || !carry) { teleport(new THREE.Vector3(d.x + d.r * 0.4, d.y + 0.3, d.z + d.r + 1.5), `The helicopter sets you down at ${d.name}.`, 1400); return; }
    const h = p.heli, start = new THREE.Vector3(); h.getWorldPosition(start);
    scene.attach(h);
    const cruise = Math.max(p.y, d.y) + 45, end = new THREE.Vector3(d.x - d.r * 0.35, d.y + 0.16, d.z);
    flight = { h, home: p, to: d, phase: 'spinup', t: 0, start, end, cruise, passenger: true };
    prepare?.();
    toast(`You climb into the helicopter. Next stop: ${d.name}.`);
  }
  const _v = new THREE.Vector3(), _q = new THREE.Vector3();
  function stepFlight(dt) {
    const f = flight, h = f.h; f.t += dt;
    const spin = f.phase === 'parked' ? 0 : 1;
    h.userData.rotor.rotation.y += dt * (f.phase === 'spinup' ? 6 + f.t * 12 : 30) * spin; h.userData.tail.rotation.x += dt * 40 * spin;
    const goal = f.phase === 'return' ? f.start : f.end;
    if (f.phase === 'spinup') { if (f.t > 1.6) { f.phase = 'climb'; f.t = 0; } }
    else if (f.phase === 'climb') { h.position.y += Math.min(9 * dt, f.cruise - h.position.y); if (h.position.y >= f.cruise - 0.1) { f.phase = 'cruise'; f.t = 0; } }
    else if (f.phase === 'cruise' || f.phase === 'return') {
      _v.set(goal.x - h.position.x, 0, goal.z - h.position.z); const dist = _v.length();
      const want = Math.atan2(_v.x, _v.z); h.rotation.y += Math.atan2(Math.sin(want - h.rotation.y), Math.cos(want - h.rotation.y)) * Math.min(1, dt * 2);
      if (h.position.y < f.cruise) h.position.y = Math.min(f.cruise, h.position.y + 9 * dt);
      if (dist < 0.5) { f.phase = f.phase === 'cruise' ? 'descend' : 'descendHome'; f.t = 0; h.rotation.z = h.rotation.x = 0; }
      else { const sp = Math.min(38, 4 + dist * 0.6); h.position.addScaledVector(_v.normalize(), Math.min(dist, sp * dt)); h.rotation.x = 0.15 * Math.min(1, sp / 30); }
    }
    else if (f.phase === 'descend' || f.phase === 'descendHome') {
      const g = f.phase === 'descend' ? f.end : f.start;
      h.position.y = Math.max(g.y, h.position.y - Math.max(1.5, (h.position.y - g.y) * 0.9) * dt);
      if (h.position.y <= g.y + 0.01) {
        if (f.phase === 'descend') { f.phase = 'unload'; f.t = 0; f.passenger = false; land?.(new THREE.Vector3(f.to.x + f.to.r * 0.4, f.to.y + 0.3, f.to.z + f.to.r + 1.5)); toast(`Touchdown at ${f.to.name}. The helicopter heads back to ${f.home.name}.`); }
        else { f.home.group.attach(h); h.position.set(0, 0.16, 0); flight = null; return; }
      }
    }
    else if (f.phase === 'unload') { if (f.t > 2.5) { f.phase = 'climbBack'; f.t = 0; } }
    else if (f.phase === 'climbBack') { h.position.y += 9 * dt; if (h.position.y >= f.cruise) f.phase = 'return'; }
    if (f.passenger) carry(_q.copy(seat).applyEuler(h.rotation).add(h.position));
  }
  for (const t of roofs) {
    const fz = t.z + t.face * (t.d / 2);
    addPad({ name: `${t.name} roof`, x: t.x, z: t.z - t.face * 1.5, y: t.h, r: Math.min(5.5, t.d / 2 - 2.5),
      roof: { minX: t.x - t.w / 2, maxX: t.x + t.w / 2, minZ: t.z - t.d / 2, maxZ: t.z + t.d / 2, liftX: t.x + t.w / 2 - 2, liftZ: t.z + t.face * (t.d / 2 - 2.5), streetX: t.x + 4, streetZ: fz + t.face * 4 } });
  }
  for (const gp of ground) addPad({ ...gp, y: 0.05 });   // only the government's own helipad is on the ground

  // Roofs are solid to stand on, and a low invisible rail stops you walking off the edge.
  function groundAt(x, z, bodyY) {
    for (const r of roofRects) if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ && bodyY > r.top - 2.5) return r.top + 0.16;
    return null;
  }
  function update(dt, playerPos) {
    for (const p of pads) if (p.stolen && Date.now() - p.stolen > 600e3) { p.stolen = 0; if (p.heli) p.heli.visible = true; }   // a replacement arrives after ten minutes
    if (flight) stepFlight(dt);
    for (const p of pads) if (p.heli && p.heli !== flight?.h) { p.heli.userData.rotor.rotation.y += dt * 0.4; }   // idle: blades turn slowly in the wind
    for (const p of pads) p.sock.rotation.x = Math.sin(performance.now() / 700 + p.x) * 0.2;
    // Keep you from walking off a roof edge, but only while you're standing on that roof.
    if (!flight?.passenger) for (const r of roofRects) {
      if (playerPos.y < r.top - 0.5 || playerPos.y > r.top + 1.2) continue;
      if (playerPos.x > r.minX - 1.5 && playerPos.x < r.maxX + 1.5 && playerPos.z > r.minZ - 1.5 && playerPos.z < r.maxZ + 1.5) {
        playerPos.x = THREE.MathUtils.clamp(playerPos.x, r.minX + 0.6, r.maxX - 0.6);
        playerPos.z = THREE.MathUtils.clamp(playerPos.z, r.minZ + 0.6, r.maxZ - 0.6);
      }
    }
  }
  return { pads, groundAt, update, get flying() { return !!flight?.passenger; } };
}
