// Sunset Ridge Tunnel: a two-lane road tunnel through Sunset Ridge, next to the scenic road that
// climbs over the top. The road drops into a walled cutting, runs about 120 m under the hill
// (tiled walls, a lit ceiling, jet fans, emergency points) and comes out the other side.
// Link roads at each end join it to the ridge road.
import * as THREE from 'three';
import { TUNNEL, ridgeHeight } from './hills.js';

export function buildTunnel({ scene, colliders, camBlockers, makeTex, destinations }) {
  const T = TUNNEL, L = T.x - T.half, Rx = T.x + T.half;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null })); return mats.get(k); };
  const B = (x0, x1, y0, y1, z0, z1, m, shadow = true) => { const b = new THREE.Mesh(boxGeo, m instanceof THREE.Material ? m : mat(m)); b.scale.set(x1 - x0, y1 - y0, z1 - z0); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.castShadow = shadow; b.receiveShadow = true; scene.add(b); return b; };
  const asphalt = mat(0x2b2e32, { rough: 0.95 }), line = mat(0xf2f2f2), yellowLine = mat(0xf2c14e), concrete = mat(0xa9a59c, { rough: 0.95 });
  const tileTex = makeTex(256, 256, g => { g.fillStyle = '#e9ece8'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#b9bdb8'; g.lineWidth = 3; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } g.fillStyle = '#2f6f8f'; g.fillRect(0, 150, 256, 18); });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(30, 1.5);
  const tiles = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.35 });

  // ---- road: through the channel, plus link roads to the ridge road at both ends ----
  const zA = 580, zB = 1020;
  B(L + 0.6, Rx - 0.6, 0.02, 0.08, zA, zB, asphalt, false);
  for (let z = zA + 2; z < zB - 2; z += 9) B(T.x - 0.08, T.x + 0.08, 0.081, 0.09, z, z + 4.5, line, false);
  for (const x of [L + 0.85, Rx - 0.85]) B(x - 0.07, x + 0.07, 0.081, 0.09, T.z0, T.z1, yellowLine, false);
  for (const z of [zA + 5, zB - 5]) B(L, 965, 0.02, 0.08, z - 5, z + 5, asphalt, false);   // link roads east to the ridge road (x = 960)
  for (const z of [zA + 5, zB - 5]) for (let x = Rx + 2; x < 955; x += 9) B(x, x + 4.5, 0.081, 0.09, z - 0.08, z + 0.08, line, false);
  // raised walkways along both walls
  B(L, L + 0.6, 0, 0.22, T.z0, T.z1, concrete, false); B(Rx - 0.6, Rx, 0, 0.22, T.z0, T.z1, concrete, false);

  // ---- open cutting: retaining walls that hold the hillside back ----
  const walls = [];
  for (let z = T.z0; z < T.z1; z += 4) {
    const z1 = z + 4; if (z >= T.c0 && z1 <= T.c1) continue;
    for (const [x0, x1, wx] of [[L - 0.45, L + 0.05, L], [Rx - 0.05, Rx + 0.45, Rx]]) {
      const h = Math.max(ridgeHeight(wx, z), ridgeHeight(wx, z1)) + 0.35; if (h < 0.5) continue;
      walls.push(B(x0, x1, 0, h, z, z1, concrete)); B(x0 - 0.05, x1 + 0.05, h, h + 0.12, z, z1, mat(0x8f8a80), false);
    }
  }
  // ---- the covered part: tiled walls, ceiling, lights, fans, emergency points ----
  for (const [x0, x1] of [[L - 0.45, L + 0.05], [Rx - 0.05, Rx + 0.45]]) { walls.push(B(x0, x1, 0, T.roof, T.c0, T.c1, concrete)); }
  for (const [x0, x1] of [[L + 0.05, L + 0.07], [Rx - 0.07, Rx - 0.05]]) B(x0, x1, 0.22, T.ceiling, T.c0, T.c1, tiles, false);
  const ceiling = B(L - 0.5, Rx + 0.5, T.ceiling, T.roof, T.c0, T.c1, concrete);
  const strip = mat(0xfff8e8, { emissive: 0xfff2d0, ei: 1.6 });
  for (let z = T.c0 + 2; z < T.c1 - 2; z += 5) for (const x of [L + 1.6, Rx - 1.6]) B(x - 0.15, x + 0.15, T.ceiling - 0.08, T.ceiling, z, z + 3, strip, false);
  for (const z of [T.c0 + 30, T.c1 - 30]) for (const x of [T.x - 2.2, T.x + 2.2]) { const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 3, 16), mat(0x9aa1a8, { metal: 0.6, rough: 0.4 })); fan.rotation.x = Math.PI / 2; fan.position.set(x, T.ceiling - 0.8, z); scene.add(fan); }
  const sosTex = makeTex(128, 128, g => { g.fillStyle = '#1b8a3a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('SOS', 64, 58); g.font = '22px sans-serif'; g.fillText('☎ 🧯', 64, 100); });
  for (let z = T.c0 + 20; z < T.c1; z += 40) for (const [x, ry] of [[L + 0.09, Math.PI / 2], [Rx - 0.09, -Math.PI / 2]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ map: sosTex, emissive: 0x1b8a3a, emissiveIntensity: 0.6 })); p.position.set(x, 1.6, z); p.rotation.y = ry; scene.add(p); }
  for (const z of [T.c0 + 25, (T.c0 + T.c1) / 2, T.c1 - 25]) { const l = new THREE.PointLight(0xffefd6, 22, 34, 1.5); l.position.set(T.x, T.ceiling - 0.6, z); scene.add(l); }
  // ---- portals: concrete headwalls with the tunnel's name ----
  const sign = makeTex(1024, 192, g => { g.fillStyle = '#20262c'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#ffffff'; g.font = 'bold 92px sans-serif'; g.textAlign = 'center'; g.fillText('SUNSET RIDGE TUNNEL', 512, 120, 980); g.fillStyle = '#f2c14e'; g.fillRect(0, 168, 1024, 12); });
  const portal = mat(0x8f8a80, { rough: 0.9 });
  for (const [z, face] of [[T.c0, -1], [T.c1, 1]]) {
    const z0 = face < 0 ? z - 0.9 : z, z1 = face < 0 ? z : z + 0.9;
    walls.push(B(L - 7, L - 0.45, 0, T.roof + 2.2, z0, z1, portal), B(Rx + 0.45, Rx + 7, 0, T.roof + 2.2, z0, z1, portal));
    B(L - 0.45, Rx + 0.45, T.ceiling, T.roof + 2.2, z0, z1, portal);
    B(L - 7.3, Rx + 7.3, T.roof + 2.2, T.roof + 2.6, z0 - 0.15, z1 + 0.15, mat(0x6f6a62), false);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: sign })); s.position.set(T.x, T.ceiling + 1.4, face < 0 ? z0 - 0.02 : z1 + 0.02); s.rotation.y = face < 0 ? Math.PI : 0; scene.add(s);
  }
  // ---- signs at the cutting entrances ----
  const warn = makeTex(256, 256, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#c0392b'; g.lineWidth = 26; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#111'; g.font = 'bold 110px sans-serif'; g.textAlign = 'center'; g.fillText('40', 128, 166); });
  const lights = makeTex(512, 256, g => { g.fillStyle = '#1f4e8c'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#fff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText('TUNNEL AHEAD', 256, 100); g.font = '42px sans-serif'; g.fillText('Headlights on', 256, 180); });
  for (const [z, ry] of [[T.z0 + 8, Math.PI], [T.z1 - 8, 0]]) { const x = L - 1.2; B(x - 0.06, x + 0.06, 0, 3.4, z - 0.06, z + 0.06, mat(0x555555), false);
    const a = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ map: warn, side: THREE.DoubleSide })); a.position.set(x, 3.0, z); a.rotation.y = ry; scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: lights, side: THREE.DoubleSide })); b.position.set(x, 1.9, z); b.rotation.y = ry; scene.add(b); }

  // ---- collisions: the walls only stop things down at road level (people on the hill above can walk over) ----
  const atRoad = () => 0;
  colliders.push({ minX: L - 0.5, maxX: L + 0.05, minZ: T.z0, maxZ: T.z1, baseYAt: atRoad }, { minX: Rx - 0.05, maxX: Rx + 0.5, minZ: T.z0, maxZ: T.z1, baseYAt: atRoad });
  camBlockers?.push(ceiling, ...walls);
  destinations?.push({ name: 'Sunset Ridge Tunnel', x: T.x, z: T.c0 - 20 });
  return { inside: (x, z, y = 0) => Math.abs(x - T.x) < T.half && z > T.c0 && z < T.c1 && y < T.ceiling };
}
