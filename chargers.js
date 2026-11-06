// Electric car charging points. Park within reach of one and stop: a cable plugs in and the
// battery fills up. On foot, press E to read the charger's screen.
import * as THREE from 'three';

export const CHARGER_SPOTS = [
  [9.4, 13.2, 'Home charger'],
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
