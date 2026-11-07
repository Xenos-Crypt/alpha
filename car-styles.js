// Body styles for cars, so different kinds of car actually look different.
// styleCar(v, style) rebuilds the body of a standard car (from road-vehicle-models.js) in the
// same paint colour, keeping its head/tail lamp materials (the lights system relies on them):
//   hatch     short two-box hatchback
//   sports    low wedge, set-back cabin, bonnet stripes, rear wing, twin exhausts
//   supercar  very low mid-engine shape, canopy cabin, side vents, big wing and diffuser
//   suv       tall and boxy, roof rails, bull bar, wheel-arch cladding, spare wheel on the back
//   electric  smooth rounded body, full-width light bars, glass roof, no grille
//   pickup    crew cab with an open load bed
// ('saloon' is the original body and is left alone.)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CAR_STYLES = {
  saloon: { label: 'Saloon', speed: 75 },
  hatch: { label: 'Hatchback', speed: 70, length: 3.9 },
  sports: { label: 'Sports car', speed: 92, length: 4.5 },
  supercar: { label: 'Supercar', speed: 108, length: 4.7 },
  suv: { label: 'SUV', speed: 68, length: 4.8, health: 130 },
  electric: { label: 'Electric car', speed: 82, length: 4.3, battery: 2 },
  pickup: { label: 'Pickup truck', speed: 66, length: 5.3, health: 120 },
};
// how often each turns up in traffic
const TRAFFIC_MIX = [['saloon', 30], ['hatch', 18], ['suv', 16], ['electric', 12], ['pickup', 9], ['sports', 10], ['supercar', 5]];
export function randomCarStyle(r = Math.random()) {
  const total = TRAFFIC_MIX.reduce((s, [, w]) => s + w, 0); let x = r * total;
  for (const [k, w] of TRAFFIC_MIX) { if ((x -= w) < 0) return k; }
  return 'saloon';
}

const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 0.7 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc0c8cc, metalness: 0.9, roughness: 0.2 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a3f4c, metalness: 0.4, roughness: 0.12 });
const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 });

export function styleCar(v, style, { headMat, tailMat } = {}) {
  if (!style || style === 'saloon' || !CAR_STYLES[style] || v.carStyle === style) { v.carStyle ??= 'saloon'; return v; }
  const body = v.hoverBody || v.group;
  // keep the wheels (groups) and the lamp meshes; everything else is the old body
  const keep = [], lamps = [];
  let paint = null;
  for (const c of [...body.children]) {
    if (c.isGroup || !c.isMesh) { keep.push(c); continue; }
    const isLamp = !!c.material && (c.material === headMat || c.material === tailMat);
    if (!paint && c.material?.metalness === 0.35) paint = c.material;
    if (isLamp) { lamps.push(c); continue; }
    if (c.userData.keepOnRestyle) { keep.push(c); continue; }
    if (c.geometry?.type === 'PlaneGeometry' && Math.abs(c.position.z) > 2.2) { body.remove(c); continue; }   // number plate
    body.remove(c);
  }
  paint ??= new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.35, roughness: 0.3 });
  const P = (w, h, d, x, y, z, m = paint, round = true, r = 0.08) => { const mesh = new THREE.Mesh(round ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); mesh.castShadow = true; body.add(mesh); return mesh; };
  const S = CAR_STYLES[style], L = S.length;
  const placeLamps = (frontZ, rearZ, y, spread = 0.68) => {
    const fronts = lamps.filter(l => l.position.z > 0), rears = lamps.filter(l => l.position.z < 0);
    fronts.forEach((l, i) => { l.position.set((i % 2 ? 1 : -1) * spread, y, frontZ); body.add(l); });
    rears.forEach((l, i) => { l.position.set((i % 2 ? 1 : -1) * spread, y, rearZ); body.add(l); });
    for (const l of lamps) if (!l.parent) body.add(l);
  };
  const windows = (w, y, h, z0, z1, x = 0.9) => { for (const s of [-1, 1]) P(0.04, h, z1 - z0, s * x, y, (z0 + z1) / 2, glassMat, false); };
  const plate = z => { const m = P(0.55, 0.13, 0.03, 0, 0.45, z, new THREE.MeshStandardMaterial({ color: 0xf0d85b }), false); };

  if (style === 'hatch') {
    P(1.9, 0.55, L, 0, 0.62, 0); P(1.82, 0.62, 2.3, 0, 1.25, -0.45);
    const ws = P(1.6, 0.6, 0.05, 0, 1.25, 0.82, glassMat, false); ws.rotation.x = -0.5;
    P(1.6, 0.55, 0.05, 0, 1.25, -1.62, glassMat, false); windows(0, 1.28, 0.48, -1.5, 0.6, 0.92);
    P(1.92, 0.15, 0.12, 0, 0.42, L / 2, darkMat); P(1.92, 0.15, 0.12, 0, 0.42, -L / 2, darkMat);
    placeLamps(L / 2 + 0.01, -L / 2 - 0.01, 0.82); plate(-L / 2 - 0.02);
  } else if (style === 'sports') {
    P(1.98, 0.42, L, 0, 0.5, 0);
    const nose = P(1.9, 0.18, 1.5, 0, 0.72, 1.35); nose.rotation.x = 0.08;                // long bonnet
    P(1.62, 0.42, 1.55, 0, 0.98, -0.5);                                                 // low, set-back cabin
    const ws = P(1.5, 0.5, 0.05, 0, 0.98, 0.42, glassMat, false); ws.rotation.x = -0.95;
    const bw = P(1.45, 0.4, 0.05, 0, 0.95, -1.35, glassMat, false); bw.rotation.x = 0.85;
    windows(0, 1.0, 0.32, -1.1, 0.2, 0.82);
    for (const x of [-0.25, 0.25]) { P(0.16, 0.02, 1.5, x, 0.82, 1.35, stripeMat, false); P(0.16, 0.02, 1.5, x, 1.2, -0.5, stripeMat, false); }
    for (const s of [-1, 1]) { P(0.06, 0.18, 0.7, s * 1.0, 0.55, -0.6, darkMat, false); P(0.08, 0.5, 0.08, s * 0.6, 0.98, -2.05, darkMat); }   // side intakes, wing struts
    P(1.9, 0.06, 0.45, 0, 1.25, -2.05, paint);                                          // rear wing
    for (const x of [-0.35, 0.35]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), chromeMat); ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.35, -L / 2 - 0.05); body.add(ex); }
    P(1.4, 0.12, 0.08, 0, 0.42, L / 2 + 0.02, darkMat, false);
    placeLamps(L / 2 + 0.01, -L / 2 - 0.01, 0.62, 0.72); plate(-L / 2 - 0.02);
  } else if (style === 'supercar') {
    P(2.05, 0.38, L, 0, 0.46, 0);
    const nose = P(1.95, 0.12, 1.4, 0, 0.62, 1.55); nose.rotation.x = 0.14;
    P(1.95, 0.35, 1.6, 0, 0.7, -1.25);                                                  // engine deck
    // low cabin: painted roof, raked windscreen, tinted side and rear glass (the old dark glass dome looked like a head)
    P(1.56, 0.34, 1.55, 0, 0.82, -0.15);
    const ws = P(1.46, 0.46, 0.05, 0, 0.8, 0.78, glassMat, false); ws.rotation.x = -1.05;
    const rs = P(1.4, 0.36, 0.05, 0, 0.8, -1.0, glassMat, false); rs.rotation.x = 0.95;
    windows(0, 0.84, 0.26, -0.8, 0.55, 0.79);
    for (const s of [-1, 1]) { const vent = P(0.08, 0.32, 0.9, s * 1.03, 0.62, -0.9, darkMat, false); vent.rotation.y = s * 0.15; P(0.1, 0.42, 0.1, s * 0.75, 0.98, -2.0, darkMat); }
    P(2.1, 0.07, 0.55, 0, 1.2, -2.05, paint);                                            // big wing
    P(1.9, 0.14, 0.4, 0, 0.3, -L / 2 + 0.1, darkMat, false);                             // diffuser
    for (let i = 0; i < 6; i++) P(0.04, 0.12, 0.35, -0.6 + i * 0.24, 0.3, -L / 2 + 0.05, darkMat, false);
    placeLamps(L / 2 + 0.01, -L / 2 - 0.01, 0.56, 0.8); plate(-L / 2 - 0.02);
  } else if (style === 'suv') {
    P(2.12, 0.85, L, 0, 0.95, 0); P(2.0, 0.85, 2.9, 0, 1.8, -0.55, paint, true, 0.12);
    P(1.84, 0.62, 0.05, 0, 1.82, 0.92, glassMat, false).rotation.x = -0.2;
    P(1.8, 0.6, 0.05, 0, 1.82, -2.02, glassMat, false); windows(0, 1.85, 0.55, -1.9, 0.75, 1.01);
    for (const s of [-1, 1]) { P(0.06, 0.06, 2.6, s * 0.85, 2.3, -0.55, chromeMat, false); P(0.14, 0.12, 2.5, s * 1.1, 0.55, 0, darkMat); P(0.12, 0.3, 4.2, s * 1.07, 0.55, 0, darkMat, false); }   // roof rails, side steps, cladding
    P(1.7, 0.1, 0.1, 0, 0.75, L / 2 + 0.2, chromeMat); for (const x of [-0.6, 0.6]) P(0.08, 0.6, 0.08, x, 0.85, L / 2 + 0.15, chromeMat);   // bull bar
    P(1.5, 0.3, 0.1, 0, 1.0, L / 2 + 0.01, darkMat, false);                              // big grille
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.25, 18), darkMat); spare.rotation.x = Math.PI / 2; spare.position.set(0, 1.3, -L / 2 - 0.15); body.add(spare);
    placeLamps(L / 2 + 0.01, -L / 2 - 0.01, 1.2, 0.75); plate(-L / 2 - 0.02);
    body.position.y += 0.08;
  } else if (style === 'electric') {
    P(1.98, 0.6, L, 0, 0.66, 0, paint, true, 0.28); P(1.78, 0.6, 2.6, 0, 1.25, -0.25, paint, true, 0.3);
    P(1.5, 0.05, 2.2, 0, 1.56, -0.25, glassMat, false);                                  // glass roof
    P(1.6, 0.55, 0.05, 0, 1.25, 1.0, glassMat, false).rotation.x = -0.6;
    P(1.55, 0.5, 0.05, 0, 1.25, -1.5, glassMat, false).rotation.x = 0.6; windows(0, 1.28, 0.45, -1.35, 0.85, 0.9);
    const bar = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 1.2 });
    P(1.7, 0.05, 0.04, 0, 0.92, L / 2 + 0.01, bar, false);
    const rbar = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 1 });
    P(1.7, 0.05, 0.04, 0, 0.98, -L / 2 - 0.01, rbar, false);
    placeLamps(L / 2 + 0.01, -L / 2 - 0.01, 0.86, 0.7); plate(-L / 2 - 0.02);
  } else if (style === 'pickup') {
    P(2.05, 0.7, L, 0, 0.82, 0); P(1.95, 0.75, 2.0, 0, 1.55, 0.45, paint, true, 0.1);
    P(1.78, 0.6, 0.05, 0, 1.58, 1.45, glassMat, false).rotation.x = -0.3;
    P(1.75, 0.5, 0.05, 0, 1.6, -0.56, glassMat, false); windows(0, 1.6, 0.5, -0.4, 1.3, 0.98);
    P(1.9, 0.08, 2.1, 0, 1.18, -1.5, darkMat, false);                                    // bed floor
    for (const s of [-1, 1]) P(0.1, 0.5, 2.2, s * 0.98, 1.4, -1.5);                     // bed sides
    P(2.0, 0.5, 0.1, 0, 1.4, -L / 2 + 0.05);                                             // tailgate
    P(1.6, 0.3, 0.1, 0, 0.98, L / 2 + 0.01, darkMat, false);
    placeLamps(L / 2 + 0.01, -L / 2 - 0.01, 1.05, 0.78); plate(-L / 2 - 0.02);
  }
  v.carStyle = style; v.length = Math.max(v.length || 4.2, L); v.maxSpeed = S.speed;
  if (S.health) v.health = Math.max(v.health ?? 100, S.health);
  if (S.battery) v.batteryCapacity = S.battery;
  v.modelType = style;
  return v;
}
