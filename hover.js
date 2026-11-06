// Hover vehicles: cars, buses, bikes, trams and trains float above the ground.
// makeHover() lifts a vehicle's body, hides its wheels, adds glowing hover pads
// underneath and a soft light pool on the ground, and the body gently bobs.
// Physics and routing still use the vehicle's root group, so driving, traffic and
// collisions are unchanged; only what you see floats.
import * as THREE from 'three';

const padGeo = new THREE.CylinderGeometry(0.3, 0.36, 0.08, 18);
const padMat = new THREE.MeshStandardMaterial({ color: 0x1b2a33, emissive: 0x56c8ff, emissiveIntensity: 2.4, roughness: 0.4, metalness: 0.5 });
const stripMat = new THREE.MeshStandardMaterial({ color: 0x1b2a33, emissive: 0x56c8ff, emissiveIntensity: 2, roughness: 0.4 });
let glowMat = null;
function groundGlowMaterial() {
  if (glowMat) return glowMat;
  if (typeof document === 'undefined') return (glowMat = new THREE.MeshBasicMaterial({ color: 0x78dcff, transparent: true, opacity: 0.25, depthWrite: false }));   // tests / no DOM
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(120,220,255,0.85)'); gr.addColorStop(0.55, 'rgba(90,190,255,0.25)'); gr.addColorStop(1, 'rgba(90,190,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  glowMat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 });
  return glowMat;
}
const glowGeo = new THREE.PlaneGeometry(1, 1);
const hovering = [];

/**
 * @param root    the vehicle's group (what physics moves)
 * @param opts.lift    how high the body floats (m)
 * @param opts.hide    objects to hide (wheels)
 * @param opts.pads    [{x,z}] hover pad positions in body space
 * @param opts.strips  [{x,z,w,d}] glowing maglev strips (trains/trams), w along x, d along z
 * @param opts.width / opts.length   ground-glow size along world x / z
 * @returns the lifted body group; add riders/drivers to it so they float too
 */
export function makeHover(root, { lift = 0.45, width = 2, length = 4, hide = [], pads = [], strips = [], bob = 0.04, glowX = 0, glowZ = 0 } = {}) {
  if (root.userData.hoverBody) return root.userData.hoverBody;
  const body = new THREE.Group(); body.name = 'hover-body';
  for (const c of [...root.children]) body.add(c);
  root.add(body); body.position.y = lift;
  for (const h of hide) if (h) h.visible = false;
  for (const p of pads) { const pad = new THREE.Mesh(padGeo, padMat); pad.position.set(p.x, p.y ?? 0.1, p.z); body.add(pad); }
  for (const s of strips) { const strip = new THREE.Mesh(new THREE.BoxGeometry(s.w ?? 0.22, 0.06, s.d ?? s.length), stripMat); strip.position.set(s.x ?? 0, s.y ?? 0.12, s.z ?? 0); body.add(strip); }
  const glow = new THREE.Mesh(glowGeo, groundGlowMaterial());
  glow.rotation.x = -Math.PI / 2; glow.scale.set(width * 1.5, length * 1.2, 1); glow.position.set(glowX, 0.05, glowZ); glow.renderOrder = 1;
  root.add(glow);
  root.userData.hoverBody = body;
  hovering.push({ root, body, lift, bob, phase: Math.random() * Math.PI * 2 });
  return body;
}

/** Hover pads at a road vehicle's wheel positions, wheels hidden. */
export function hoverRoadVehicle(v, lift = 0.45) {
  if (!v?.group || v.hoverBody) return v?.hoverBody;
  const pads = (v.wheels || []).map(w => ({ x: w.position.x * 0.8, z: w.position.z, y: 0.12 }));
  const width = v.width || (v.kind === 'bus' ? 2.5 : v.kind === 'bicycle' || v.kind === 'motorcycle' ? 0.8 : 2);
  const length = v.length || 4;
  v.hoverBody = makeHover(v.group, { lift, width, length, hide: v.wheels, pads });
  return v.hoverBody;
}

let time = 0;
export function updateHover(dt) {
  time += dt;
  for (let i = hovering.length - 1; i >= 0; i--) {
    const h = hovering[i];
    if (!h.root.parent) { hovering.splice(i, 1); continue; }   // vehicle removed from the world
    h.body.position.y = h.lift + Math.sin(time * 2.2 + h.phase) * h.bob;
  }
}
