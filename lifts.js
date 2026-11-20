// LIFTS that really move. A cab runs up and down a shaft between floors with you inside it.
//   - On each floor: press the call button (E) and the cab comes to you; its doors and the landing doors open.
//   - Walk in. Inside there's a button for every floor: press one, the doors close, the cab travels (you with it),
//     and the doors open on that floor. Walk out.
// Everything is solid at the right height: the cab's walls move with it, the landing doors are shut unless the cab
// is there with its doors open, and the shaft is walled in on every floor.
// Coordinates are world coordinates; the cab's front (its doors) faces local +z, turned by `rot`.
import * as THREE from 'three';

// the button panel inside a cab: a small window with a button for every floor (one shared by every lift)
let panel = null;
function choose(title, floors, current, pick, resume, first = 0) {
  if (!panel) { panel = document.createElement('div'); panel.id = 'liftPanel'; panel.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;background:#1d2229f2;color:#e8eef4;border:2px solid #8a96a3;border-radius:12px;padding:14px 16px;font:14px system-ui;min-width:230px;box-shadow:0 8px 30px #0008'; document.body.append(panel); }
  document.exitPointerLock?.(); panel.replaceChildren(); panel.style.display = 'block';
  const h = document.createElement('div'); h.textContent = '🛗 ' + title; h.style.cssText = 'font-weight:700;margin-bottom:10px'; panel.append(h);
  const close = () => { panel.style.display = 'none'; resume?.(); };
  floors.map((f, i) => [f, i]).reverse().forEach(([f, i]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = `${i + first}  ·  ${f.name}${i === current ? '  (here)' : ''}`; b.style.cssText = `display:block;width:100%;margin:4px 0;padding:8px 10px;border-radius:8px;border:1px solid #5d6976;background:${i === current ? '#2f6f8f' : '#2a3038'};color:#fff;text-align:left;cursor:pointer;font:14px system-ui`; b.onclick = () => { close(); pick(i); }; panel.append(b); });
  const x = document.createElement('button'); x.type = 'button'; x.textContent = 'Close'; x.style.cssText = 'margin-top:8px;padding:6px 10px;border-radius:8px;border:1px solid #5d6976;background:#111;color:#ccc;cursor:pointer'; x.onclick = close; panel.append(x);
}

export function createLift({ scene, colliders, x, z, rot = 0, floors, name = 'Lift', canGo, toast, resume, width = 2.3, depth = 1.9, floorH = 3.4, open = 1.8, first = 0 }) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const W = (lx, lz) => ({ x: x + lx * c + lz * s, z: z - lx * s + lz * c });
  const rect = (ax, az, bx, bz) => { const a = W(ax, az), b = W(bx, bz); return { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) }; };
  const mat = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, metalness: o.metal ?? 0.3, roughness: o.rough ?? 0.35, emissive: o.em ?? 0, emissiveIntensity: o.ei ?? 1 });
  const steel = mat(0xc4cbd2), dark = mat(0x3a3f45), panel = mat(0x222222), lit = mat(0x7ad8ff, { em: 0x7ad8ff, ei: 1.6 });
  const P = (g, w, h, d, lx, ly, lz, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(lx, ly, lz); g.add(o); return o; };
  const hw = width / 2, D = depth;
  // ---- the shaft on every floor: side walls, the door frame and the landing doors
  const landings = floors.map((f, i) => {
    const g = new THREE.Group(); g.position.set(x, f.y, z); g.rotation.y = rot; scene.add(g);
    for (const sd of [-1, 1]) P(g, 0.12, floorH, D + 0.1, sd * (hw + 0.06), floorH / 2, D / 2, steel);
    P(g, width + 0.24, floorH - 2.45, 0.14, 0, 2.45 + (floorH - 2.45) / 2, D + 0.05, steel);
    const doors = [-1, 1].map(sd => P(g, hw, 2.4, 0.05, sd * hw / 2, 1.2, D + 0.12, mat(0xb8c0c8)));
    P(g, 0.14, 0.24, 0.04, hw + 0.35, 1.25, D + 0.14, panel); P(g, 0.07, 0.07, 0.02, hw + 0.35, 1.25, D + 0.17, lit);
    // the floor-number display over the doors (left out where there's no canvas, e.g. the tests)
    const sign = globalThis.document?.createElement('canvas'), sg = sign?.getContext?.('2d');
    let tex = null;
    if (sg) { sign.width = 128; sign.height = 32; sg.fillStyle = '#111'; sg.fillRect(0, 0, 128, 32); sg.fillStyle = '#ffb347'; sg.font = 'bold 22px monospace'; sg.textAlign = 'center'; sg.fillText(String(i + first), 64, 24);
      tex = new THREE.CanvasTexture(sign); const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), new THREE.MeshBasicMaterial({ map: tex })); disp.position.set(0, 2.62, D + 0.13); g.add(disp); }
    for (const sd of [-1, 1]) colliders.push({ ...rect(sd * (hw + 0.15), 0, sd * (hw - 0.02), D + 0.1), baseYAt: () => f.y });   // shaft side walls
    const front = rect(-hw, D + 0.05, hw, D + 0.18);
    colliders.push({ ...front, baseYAt: () => (at === i && openK > 0.7 ? 1e9 : f.y) });   // landing doors: shut unless the cab is here and open
    return { g, doors, f, sign, sg, tex };
  });
  // ---- the cab
  const cab = new THREE.Group(); cab.position.set(x, floors[0].y, z); cab.rotation.y = rot; scene.add(cab); cab.name = name + ' cab';
  P(cab, width - 0.1, floorH - 0.6, 0.12, 0, (floorH - 0.6) / 2, 0.08, steel);
  P(cab, 1.6, 1.5, 0.02, 0, 1.35, 0.15, mat(0xdfe8f0, { metal: 0.9, rough: 0.05 }));
  for (const sd of [-1, 1]) P(cab, 0.08, floorH - 0.6, D - 0.1, sd * (hw - 0.1), (floorH - 0.6) / 2, D / 2, steel);
  P(cab, width - 0.1, 0.1, D, 0, floorH - 0.6, D / 2, mat(0xa8b0b8)); P(cab, 1.1, 0.03, 0.7, 0, floorH - 0.66, D / 2, mat(0xffffff, { em: 0xfff4dc, ei: 1.4 }));
  P(cab, width - 0.2, 0.06, D - 0.1, 0, 0.03, D / 2, dark);
  P(cab, 0.05, 0.05, D - 0.4, -(hw - 0.18), 0.95, D / 2, steel);
  const cabDoors = [-1, 1].map(sd => P(cab, hw - 0.05, 2.4, 0.05, sd * hw / 2, 1.2, D - 0.02, mat(0xc4cbd2)));
  P(cab, 0.06, 0.2 + floors.length * 0.11, 0.24, hw - 0.16, 1.2, D - 0.5, panel);
  floors.forEach((_, i) => P(cab, 0.02, 0.06, 0.06, hw - 0.2, 1.1 + i * 0.11, D - 0.5, lit));
  // the cab's own walls move with it
  colliders.push({ ...rect(-hw, 0, hw, 0.16), baseYAt: () => cabY });
  for (const sd of [-1, 1]) colliders.push({ ...rect(sd * hw, 0, sd * (hw - 0.14), D), baseYAt: () => cabY });
  colliders.push({ ...rect(-hw, D - 0.06, hw, D + 0.02), baseYAt: () => (openK > 0.7 ? 1e9 : cabY) });
  const inside = rect(-(hw - 0.2), 0.2, hw - 0.2, D - 0.15), deck = rect(-hw, 0, hw, D + 0.25);   // deck: the cab floor out to the landing threshold
  // ---- state
  let cabY = floors[0].y, at = 0, target = 0, openK = 0, want = 0, wait = 0, moving = false;
  const inCab = p => p.x > inside.minX && p.x < inside.maxX && p.z > inside.minZ && p.z < inside.maxZ && Math.abs(p.y - cabY) < 1.6;
  // interactions: a call button on each floor, and a button for each floor inside the cab (they ride along)
  const spots = [];
  floors.forEach((f, i) => { const w = W(hw + 0.35, D + 0.9); spots.push({ floor: i, pos: new THREE.Vector3(w.x, f.y, w.z), r: 2, get label() { return at === i && !moving ? (openK > 0.5 ? `${name}: doors open, step in` : `Open the ${name.toLowerCase()} doors`) : `Call the ${name.toLowerCase()} (${f.name})`; }, action: () => { if (at === i && !moving) { want = 1; wait = 0; } else go(i, true); } }); });
  const cabSpots = [(() => { const w = W(0, D / 2); return { cab: true, pos: new THREE.Vector3(w.x, cabY, w.z), r: 1.0, get label() { return moving ? `${name}: going to ${floors[target].name}` : `${name} buttons: choose a floor`; }, action: () => { if (!moving) choose(name, floors, at, i => go(i, false), resume, first); } }; })()];
  function go(i, called) {
    if (canGo && !called && canGo(i) === false) return;
    if (i === at && !moving) { want = 1; return; }
    target = i; want = 0; wait = 0;
    if (!called) toast?.(`🛗 Going to ${floors[i].name}.`);
  }
  function setSign(i) { for (const l of landings) { if (!l.sg) continue; l.sg.fillStyle = '#111'; l.sg.fillRect(0, 0, 128, 32); l.sg.fillStyle = '#ffb347'; l.sg.fillText(String(i + first), 64, 24); l.tex.needsUpdate = true; } }
  return {
    spots, cabSpots, cab, floors,
    get y() { return cabY; }, get moving() { return moving; },
    inCab,
    groundAt(px, pz, bodyY) { return bodyY != null && px > deck.minX && px < deck.maxX && pz > deck.minZ && pz < deck.maxZ && bodyY > cabY - 1.4 && bodyY < cabY + 2.4 ? cabY + 0.06 : null; },
    update(dt, p) {
      // doors
      if (target !== at && openK > 0) want = 0;
      openK += Math.sign(want - openK) * Math.min(Math.abs(want - openK), dt * open);
      cabDoors[0].position.x = -hw / 2 - openK * (hw - 0.1); cabDoors[1].position.x = hw / 2 + openK * (hw - 0.1);
      landings.forEach((l, i) => { const k = i === at && !moving ? openK : 0; l.doors[0].position.x = -hw / 2 - k * (hw - 0.05); l.doors[1].position.x = hw / 2 + k * (hw - 0.05); });
      // travel once the doors are shut
      if (target !== at && openK <= 0.01) {
        moving = true; const ty = floors[target].y, dy = ty - cabY, step = Math.sign(dy) * Math.min(Math.abs(dy), dt * 2.2);
        const carried = p && inCab(p);
        cabY += step; if (carried) p.y = cabY + 0.06;
        if (Math.abs(ty - cabY) < 0.005) { cabY = ty; at = target; moving = false; want = 1; wait = 0; setSign(at); if (carried) toast?.(`🛎️ ${floors[at].name}.`); }
      } else if (p && inCab(p) && !moving) p.y = Math.max(p.y, cabY + 0.06);
      cab.position.y = cabY;
      for (const sp of cabSpots) sp.pos.y = cabY;
      // the doors close by themselves after a while if nobody's in the way
      if (openK > 0.99 && !moving) { wait += dt; if (wait > 6 && !(p && (inCab(p) || Math.hypot(p.x - W(0, D + 0.6).x, p.z - W(0, D + 0.6).z) < 1))) want = 0; }
    },
  };
}
