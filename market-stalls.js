// Proper market stalls: a wooden counter with a front panel, a striped canvas awning that slopes over the
// counter, crates of goods on display (fruit, bread, flowers, books… or, for the dark side, sacks, cases
// and crates), a hand-painted chalkboard, warm string lights that glow at night and bunting between the poles.
import * as THREE from 'three';

const cache = new Map();
function stripes(c1, c2) {
  const k = c1 + ':' + c2; if (cache.has(k)) return cache.get(k);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; const g = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * 16, 0, 16, 32); }
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 26, 128, 6);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; cache.set(k, t); return t;
}
function board(text, sub, dark) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = dark ? '#121212' : '#23302a'; g.fillRect(0, 0, 256, 128); g.strokeStyle = dark ? '#5a1d1d' : '#8a6a42'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 118);
  g.fillStyle = dark ? '#d9d9d9' : '#f5efe1'; g.textAlign = 'center'; g.font = 'bold 30px "Comic Sans MS", system-ui'; g.fillText(text, 128, 56, 230);
  g.font = '20px system-ui'; g.fillStyle = dark ? '#a33' : '#ffd77a'; g.fillText(sub || '', 128, 96, 230);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GOODS = {
  fruit: [0xd9412b, 0xf2a32c, 0x7cb342, 0xffd54f, 0x8e24aa], veg: [0x7cb342, 0xd9412b, 0xffffff, 0xff8f00, 0x558b2f], bread: [0xc8913f, 0xb07535, 0xe0b26a],
  flowers: [0xe91e63, 0xffeb3b, 0xffffff, 0x9c27b0, 0xff5722], books: [0x1e3a5f, 0x8d2b2b, 0x2e7d32, 0x6d4c41], crafts: [0x8d6e63, 0x26a69a, 0xffb300],
  coffee: [0x4e342e, 0x6d4c41, 0xfff3e0], food: [0xff7043, 0xffca28, 0x8d6e63], info: [0xf5f5f5, 0xbbdefb, 0xc8e6c9], dark: [0x2b2b2b, 0x3a2a1a, 0x1f2f1f, 0x333344],
};
export function marketStall({ x, y = 0, z, ry = 0, colour = 0xa9584e, goods = 'fruit', title = '', sub = '', dark = false, parent = null }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; (parent || ctxScene).add(g);
  const wood = new THREE.MeshStandardMaterial({ color: dark ? 0x2e2620 : 0x8a6440, roughness: .85 }), darkWood = new THREE.MeshStandardMaterial({ color: dark ? 0x1d1814 : 0x5d4129, roughness: .9 });
  const pole = new THREE.MeshStandardMaterial({ color: dark ? 0x222222 : 0x3e4447, metalness: .5, roughness: .5 });
  const add = (geo, m, px, py, pz, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, 0, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  // counter: top, front panel with planks, legs
  add(new THREE.BoxGeometry(4.2, .12, 1.3), wood, 0, 1.0, -.2);
  add(new THREE.BoxGeometry(4.2, .9, .08), darkWood, 0, .5, -.86);
  for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(.04, .86, .1), wood, i * .6, .5, -.9);
  add(new THREE.BoxGeometry(4.2, .08, 1.1), darkWood, 0, .35, -.25);
  // poles and awning (striped canvas sloping forward over the counter)
  for (const sx of [-2.05, 2.05]) for (const sz of [-1, .9]) add(new THREE.CylinderGeometry(.05, .05, sz < 0 ? 2.5 : 3.0, 8), pole, sx, sz < 0 ? 1.25 : 1.5, sz);
  const tex = stripes('#' + new THREE.Color(colour).getHexString(), dark ? '#1a1a1a' : '#f4ecd8'); const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.set(2, 1);
  const awn = add(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshStandardMaterial({ map: t2, side: THREE.DoubleSide, roughness: .9 }), 0, 2.78, -.05, -Math.PI / 2 + .26);
  awn.castShadow = true;
  for (let i = 0; i < 9; i++) { const f = add(new THREE.ConeGeometry(.17, .28, 3), new THREE.MeshStandardMaterial({ map: t2, roughness: .9 }), -2.05 + i * .51, 2.36, -1.18, Math.PI, 0); f.rotation.y = Math.PI / 6; }   // scalloped edge
  // goods in crates on the counter
  const cols = GOODS[goods] || GOODS.fruit;
  for (let i = 0; i < 4; i++) {
    const cx = -1.5 + i, crate = add(new THREE.BoxGeometry(.85, .22, .7), darkWood, cx, 1.17, -.2);
    crate.rotation.y = (i % 2 ? .05 : -.05);
    const c = cols[i % cols.length], m = new THREE.MeshStandardMaterial({ color: c, roughness: dark ? .7 : .5 });
    if (goods === 'books' || goods === 'info') for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(.12, .3, .45), new THREE.MeshStandardMaterial({ color: cols[(i + k) % cols.length] }), cx - .3 + k * .15, 1.43, -.2);
    else if (goods === 'bread') for (let k = 0; k < 4; k++) { const l = add(new THREE.CapsuleGeometry(.08, .22, 3, 8), m, cx - .22 + (k % 2) * .44, 1.36, -.35 + Math.floor(k / 2) * .3); l.rotation.z = Math.PI / 2; }
    else if (goods === 'dark') { add(new THREE.BoxGeometry(.6, .25, .45), m, cx, 1.42, -.2); }
    else for (let k = 0; k < 7; k++) add(new THREE.SphereGeometry(goods === 'flowers' ? .07 : .1, 8, 6), m, cx - .25 + (k % 4) * .17, 1.36 + (k > 3 ? .08 : 0), -.35 + (k % 3) * .15);
  }
  // crates and sacks on the ground in front
  for (const [px, pz] of [[-1.7, -1.4], [1.6, -1.35]]) add(new THREE.BoxGeometry(.6, .45, .5), darkWood, px, .23, pz);
  // chalkboard
  if (title) { const b = add(new THREE.PlaneGeometry(1.5, .75), new THREE.MeshBasicMaterial({ map: board(title, sub, dark), side: THREE.DoubleSide }), 0, 2.15, -1.02); b.rotation.y = Math.PI; }
  // warm string lights along the front edge
  const bulb = new THREE.MeshStandardMaterial({ color: dark ? 0xff4422 : 0xffe2a6, emissive: dark ? 0xaa2200 : 0xffb84d, emissiveIntensity: 1.6 });
  for (let i = 0; i < 10; i++) add(new THREE.SphereGeometry(.05, 6, 5), bulb, -2 + i * .44, 2.25 - Math.sin(i / 9 * Math.PI) * .18, -1.12);
  return g;
}
let ctxScene = null;
export function setStallScene(scene) { ctxScene = scene; }
// a line of bunting between two points
export function bunting(scene, a, b, colours = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xffffff]) {
  const n = Math.max(4, Math.round(a.distanceTo(b) / .6)), g = new THREE.Group(); scene.add(g);
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * .6;
    const f = new THREE.Mesh(new THREE.ConeGeometry(.16, .3, 3), new THREE.MeshStandardMaterial({ color: colours[i % colours.length], side: THREE.DoubleSide })); f.position.copy(p); f.rotation.x = Math.PI; f.scale.z = .2; f.lookAt(b.x, p.y, b.z); f.rotation.x = Math.PI; g.add(f);
  }
  return g;
}
