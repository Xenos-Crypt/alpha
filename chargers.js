// Electric car charging points. Park within reach of one and stop: a cable plugs in and the
// battery fills up. On foot, press E to read the charger's screen.
import * as THREE from 'three';

export const CHARGER_SPOTS = [
  // the charging station on the empty lot in Ashford (x 8-32, z 8-32): four bays under a canopy, cars come in
  // off the lay-by on the south side (z 6-8) and nose up to the posts
  [13.5, 20.4, 'Charging station'], [17.5, 20.4, 'Charging station'], [21.5, 20.4, 'Charging station'], [25.5, 20.4, 'Charging station'],
  [210, -799, 'Stadium chargers'],
  [-186, -782, 'Raceway chargers'],
  [592, -832, 'Poolside chargers'],
  [58, 1091, 'Boulevard chargers'],
  [418, 1109, 'Boulevard chargers'],
];

export function buildChargers({ scene, colliders, interactables, groundY, toast, makeTex }) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.6 });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x2dff8a });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const screen = makeTex(128, 160, g => { g.fillStyle = '#062033'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#2dff8a'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('⚡ EV', 64, 60); g.font = '16px sans-serif'; g.fillStyle = '#bfe9ff'; g.fillText('PARK & STOP', 64, 100); g.fillText('TO CHARGE', 64, 122); });
  const screenMat = new THREE.MeshBasicMaterial({ map: screen });
  const list = [];
  buildStation({ scene, colliders, groundY, makeTex, bodyMat, darkMat });
  for (const [x, z, name] of CHARGER_SPOTS) {
    const y = groundY(x, z), g = new THREE.Group(); g.position.set(x, y, z);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.35), bodyMat); post.position.y = 0.8; g.add(post);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.42), darkMat); cap.position.y = 1.66; g.add(cap);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), screenMat); scr.position.set(0, 1.15, 0.18); g.add(scr);
    const scr2 = scr.clone(); scr2.rotation.y = Math.PI; scr2.position.z = -0.18; g.add(scr2);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.37), ledMat); led.position.y = 1.55; g.add(led);
    const holster = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), cableMat); holster.position.set(0.27, 0.8, 0); holster.rotation.y = Math.PI / 2; g.add(holster);
    scene.add(g);
    colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.25, maxZ: z + 0.25 });
    const plug = new THREE.Vector3(x + 0.28, y + 0.85, z);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([plug, plug.clone(), plug.clone()]), 12, 0.035, 5), cableMat);
    cable.visible = false; scene.add(cable);
    const c = { x, z, y, name, plug, cable, led, plugged: null };
    interactables.push({ pos: new THREE.Vector3(x, y + 1, z), r: 2.2, label: `Read the ${name.toLowerCase()} screen`, action: () => toast(`${name}: park your car next to the charger and stop. It plugs in by itself and fills the battery. Free to use.`) });
    list.push(c);
  }

  // Called each frame with the car you're driving (or null). Returns the charger it's plugged into.
  function update(dt, car) {
    let active = null;
    for (const c of list) {
      const near = car && Math.hypot(car.group.position.x - c.x, car.group.position.z - c.z) < 4.5 && Math.abs(car.speed) < 0.3;
      if (near && !active) {
        active = c;
        if (c.plugged !== car) { c.plugged = car; toast(`🔌 Plugged in at the ${c.name.toLowerCase()}. Charging…`); }
        const port = new THREE.Vector3(0.95, 0.75, -1.2).applyQuaternion(car.group.quaternion).add(car.group.position);
        const mid = c.plug.clone().lerp(port, 0.5); mid.y = Math.min(c.plug.y, port.y) - 0.45;
        c.cable.geometry.dispose();
        c.cable.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([c.plug, mid, port]), 14, 0.035, 5);
        c.cable.visible = true;
        c.led.material = ledPulse; ledPulse.color.setHSL(0.38, 1, 0.35 + 0.25 * Math.sin(performance.now() / 180));
      } else if (c.plugged) {
        if (c.plugged === car || !car) toast('🔌 Unplugged.');
        c.plugged = null; c.cable.visible = false; c.led.material = ledMat;
      }
    }
    return active;
  }
  const ledPulse = new THREE.MeshBasicMaterial({ color: 0x2dff8a });
  return { update, list };
}

// The Ashford charging station: a concrete pad with painted bays, a canopy on four posts (solid) and a lit sign.
export const STATION = { minX: 11.5, maxX: 27.5, minZ: 11.2, maxZ: 22, name: 'Ashford Charging Station' };
function buildStation({ scene, colliders, groundY, makeTex, bodyMat, darkMat }) {
  const S = STATION, cx = (S.minX + S.maxX) / 2, cz = (S.minZ + S.maxZ) / 2, w = S.maxX - S.minX, d = S.maxZ - S.minZ;
  const y = Math.max(groundY(cx, cz), 0.2), g = new THREE.Group(); g.name = S.name;   // (the lot's lawn sits on a 0.2 m kerb)
  scene.add(g);
  const box = (sx, sy, sz, x, yy, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, yy, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  // the pad: raised 4 cm above the lot so it never flickers against the ground under it
  const padMat = new THREE.MeshStandardMaterial({ color: 0x9a9da0, roughness: 0.95 });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(23.6, 23.6), padMat); pad.rotation.x = -Math.PI / 2; pad.position.set(20, y + 0.04, 20); pad.receiveShadow = true; g.add(pad);   // the whole lot (x 8-32, z 8-32) is paved
  const line = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), green = new THREE.MeshBasicMaterial({ color: 0x1fae5b });
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 7.2), line); l.rotation.x = -Math.PI / 2; l.position.set(S.minX + 0.5 + i * 4, y + 0.05, 17.4); g.add(l); }
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.8), green); b.rotation.x = -Math.PI / 2; b.position.set(13.5 + i * 4, y + 0.045, 17.3); b.material = new THREE.MeshBasicMaterial({ color: 0x1fae5b, transparent: true, opacity: 0.35 }); g.add(b); }
  // canopy posts (solid) and roof
  const H = 4.6;
  for (const [px, pz] of [[S.minX + 0.3, S.minZ + 0.3], [S.maxX - 0.3, S.minZ + 0.3], [S.minX + 0.3, S.maxZ - 0.3], [S.maxX - 0.3, S.maxZ - 0.3]]) {
    box(0.4, H, 0.4, px, y + H / 2, pz, bodyMat);
    colliders.push({ minX: px - 0.25, maxX: px + 0.25, minZ: pz - 0.25, maxZ: pz + 0.25 });
  }
  box(w + 0.6, 0.35, d + 0.6, cx, y + H + 0.17, cz, darkMat);
  const lamp = new THREE.MeshBasicMaterial({ color: 0xeaf6ff });
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), lamp); l.rotation.x = Math.PI / 2; l.position.set(13.5 + i * 4, y + H - 0.02, 17); g.add(l); }
  const light = new THREE.PointLight(0xeaf6ff, 1.2, 18, 2); light.position.set(cx, y + H - 0.4, cz); g.add(light);
  // the sign along the front of the canopy (facing the street) and the back
  const sign = makeTex(1024, 96, c => { c.fillStyle = '#0b3d2a'; c.fillRect(0, 0, 1024, 96); c.fillStyle = '#2dff8a'; c.textAlign = 'center'; c.textBaseline = 'middle'; let f = 60; do { c.font = `bold ${f}px sans-serif`; f -= 2; } while (c.measureText('⚡ ASHFORD CHARGING STATION').width > 960); c.fillText('⚡ ASHFORD CHARGING STATION', 512, 50); });
  const sm = new THREE.MeshBasicMaterial({ map: sign });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 1.2), sm); f.position.set(cx, y + H + 0.1, S.minZ - 0.32); f.rotation.y = Math.PI; g.add(f);
  const b2 = f.clone(); b2.position.z = S.maxZ + 0.32; b2.rotation.y = 0; g.add(b2);
  // a small kiosk at the back of the lot (drinks and snacks while you wait); solid
  const K = { minX: 16, maxX: 24, minZ: 26, maxZ: 30.5 };
  const kioskMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.7 }), glass = new THREE.MeshStandardMaterial({ color: 0x7fb6d0, roughness: 0.15, metalness: 0.3 });
  box(K.maxX - K.minX, 3, K.maxZ - K.minZ, (K.minX + K.maxX) / 2, y + 1.5, (K.minZ + K.maxZ) / 2, kioskMat);
  box(5, 1.8, 0.06, 20, y + 1.4, K.minZ - 0.03, glass);
  box(K.maxX - K.minX + 0.6, 0.2, K.maxZ - K.minZ + 1.4, 20, y + 3.1, (K.minZ + K.maxZ) / 2 - 0.4, darkMat);
  colliders.push({ ...K });
  const ks = makeTex(512, 96, c => { c.fillStyle = '#0b3d2a'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#ffffff'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KIOSK', 256, 50); });
  const kl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshBasicMaterial({ map: ks })); kl.position.set(20, y + 2.55, K.minZ - 0.05); kl.rotation.y = Math.PI; g.add(kl);
  return g;
}
