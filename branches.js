// Branches round the city: the headquarters and the big stores have smaller sister buildings, and
// there are places of worship for different faiths. Every branch is a real building you can walk into.
//   Westhaven Local mini-supermarkets and corner shops (they sell cooking ingredients)
//   Pixel Palace arcade branches
//   churches and mosques
//   a bank branch, a café, a pharmacy, a tech firm's satellite office, the Job Centre and Ashford Polytechnic
// face: the side the road is on (the front door and sign face it).
import * as THREE from 'three';

export const BRANCHES = [
  { kind: 'local', name: 'Westhaven Local · Eastside', x: 367, z: 14, face: 'N' },
  { kind: 'local', name: 'Westhaven Local · Northfield', x: -194, z: -459, face: 'S' },
  { kind: 'local', name: 'Westhaven Local · Crossroads', x: 370, z: 522, face: 'E' },
  { kind: 'shop', name: 'Ashford News & Grocer', x: -23, z: -366, face: 'E' },
  { kind: 'arcade', name: 'Pixel Palace Express', x: 259, z: -22, face: 'S' },
  { kind: 'arcade', name: 'Pixel Palace Northfield', x: -326, z: -459, face: 'S' },
  { kind: 'arcade', name: 'Pixel Palace Crossroads', x: 546, z: 370, face: 'S' },
  { kind: 'church', name: "St Mary's Church", x: 142, z: -421, face: 'N' },
  { kind: 'church', name: 'Riverside Baptist Church', x: 426, z: 370, face: 'S' },
  { kind: 'mosque', name: 'Westhaven Central Mosque', x: 463, z: 14, face: 'N' },
  { kind: 'mosque', name: 'Northfield Masjid', x: -122, z: -421, face: 'N' },
  { kind: 'bank', name: 'Meridian Bank · Eastside branch', x: 506, z: -101, face: 'S' },
  { kind: 'cafe', name: 'Brew & Bean Café', x: 202, z: -421, face: 'N' },
  { kind: 'pharmacy', name: 'Westhaven Pharmacy', x: 607, z: -22, face: 'S' },
  { kind: 'office', name: 'Nexus Cyber Systems · North Office', x: 674, z: -63, face: 'N' },
  { kind: 'jobcentre', name: 'Westhaven Job Centre', x: 319, z: -22, face: 'S' },
  { kind: 'college', name: 'Ashford Polytechnic', x: 82, z: -421, face: 'N' },
];
const W = 22, D = 18;   // along the road, away from the road
const TYPE = { local: 'supermarket', shop: 'convenience', arcade: 'arcade', church: 'church', mosque: 'mosque', bank: 'bank', cafe: 'cafe', pharmacy: 'pharmacy', office: 'cyber_office', jobcentre: 'job_centre', college: 'university' };

export function branchFrame(b) {
  const f = { N: [1, 0, 0, 1], S: [-1, 0, 0, -1], W: [0, -1, 1, 0], E: [0, 1, -1, 0] }[b.face];
  return { at: (a, d) => [b.x + f[0] * a + f[2] * d, b.z + f[1] * a + f[3] * d], yaw: Math.atan2(-f[2], -f[3]), alongX: f[0] !== 0,
    rect: pad => { const hx = (f[0] !== 0 ? W : D) / 2 + pad, hz = (f[0] !== 0 ? D : W) / 2 + pad; return { minX: b.x - hx, maxX: b.x + hx, minZ: b.z - hz, maxZ: b.z + hz }; } };
}

export function buildBranches(ctx) {
  const { scene, colliders, civicBuildings, makeTex, glowMats } = ctx;
  const mats = new Map(), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null, transparent: o.opacity != null, opacity: o.opacity ?? 1 }); mats.set(k, m); if (o.glow) glowMats?.push(m); } return mats.get(k); };
  const signTex = (text, bg, fg, sub) => makeTex(512, 96, g => { g.scale(0.5, 0.5); g.fillStyle = bg; g.fillRect(0, 0, 1024, 192); g.fillStyle = fg; g.font = `bold ${sub ? 74 : 92}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, sub ? 76 : 98, 980); if (sub) { g.font = '40px sans-serif'; g.fillText(sub, 512, 150, 980); } });
  const out = [];
  for (const b of BRANCHES) {
    const F = branchFrame(b), g = new THREE.Group(); g.position.set(b.x, 0, b.z); g.rotation.y = F.yaw + Math.PI; scene.add(g);   // local -z faces the road
    // local space: +x along the road, -z towards the road (front), +z away
    const B = (w, h, d, x, y, z, c, o) => { const m = new THREE.Mesh(boxGeo, c instanceof THREE.Material ? c : mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > 0.5; m.receiveShadow = true; g.add(m); return m; };
    const C = (rt, rb, h, x, y, z, c, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c instanceof THREE.Material ? c : mat(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    const sign = (text, w, y, bg, fg, sub, z = -D / 2 - 0.08) => { const t = signTex(text, bg, fg, sub); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.1875), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3 })); m.position.set(0, y, z); m.rotation.y = Math.PI; g.add(m); return m; };
    const glass = mat(0x7ea6bd, { rough: 0.1, metal: 0.4, emissive: 0xffd58a, ei: 0, glow: true });
    const door = (w = 2.2, h = 2.6, c = 0x2c3e50) => { B(w, h, 0.12, 0, h / 2, -D / 2 - 0.02, c, { rough: 0.3 }); B(w + 0.4, 0.2, 0.25, 0, h + 0.1, -D / 2 - 0.05, 0x333333); };
    const box = (h, c, o) => B(W, h, D, 0, h / 2, 0, c, o);
    let H = 4;
    switch (b.kind) {
      case 'local': case 'shop': case 'pharmacy': {
        H = 4.2; box(H, b.kind === 'pharmacy' ? 0xe9f3ee : 0xe8e4dc); B(W - 2, 2.4, 0.1, 0, 1.6, -D / 2 - 0.03, glass); door(2.4, 2.6, 0x9fd3ff);
        const col = b.kind === 'local' ? ['#0f5132', '#ffffff'] : b.kind === 'pharmacy' ? ['#1b8a3a', '#ffffff'] : ['#b03a2e', '#ffffff'];
        B(W + 0.4, 1.0, 0.4, 0, H - 0.3, -D / 2 - 0.2, parseInt(col[0].slice(1), 16));
        sign(b.kind === 'local' ? 'WESTHAVEN LOCAL' : b.kind === 'pharmacy' ? 'PHARMACY' : 'NEWS & GROCER', 9, H - 0.3, col[0], col[1], b.kind === 'local' ? 'groceries · fresh food · open late' : b.kind === 'pharmacy' ? 'prescriptions · health · beauty' : 'papers · snacks · groceries', -D / 2 - 0.42);
        B(W - 1, 0.12, 2.2, 0, 2.9, -D / 2 - 1.1, parseInt(col[0].slice(1), 16));   // awning
        if (b.kind === 'pharmacy') { const cr = mat(0x22cc66, { emissive: 0x22cc66, ei: 1.5 }); B(1.6, 0.5, 0.15, W / 2 - 1.5, H + 0.6, -D / 2, cr); B(0.5, 1.6, 0.15, W / 2 - 1.5, H + 0.6, -D / 2, cr); }
        if (b.kind === 'local') { B(0.8, 1.6, 0.5, W / 2 - 1.5, 0.8, -D / 2 - 0.3, 0x2c3e50); B(0.6, 0.4, 0.05, W / 2 - 1.5, 1.2, -D / 2 - 0.56, 0x88ccff, { emissive: 0x3388cc, ei: 0.8 }); }   // cash machine
        for (const x of [-W / 2 + 1.5, -W / 2 + 2.6]) B(0.8, 1.1, 0.8, x, 0.55, -D / 2 - 0.8, 0x3a6b35);   // bins
        break; }
      case 'arcade': {
        H = 5; box(H, 0x1c1030); const neon = c => mat(c, { emissive: c, ei: 2.2 });
        for (const [y, c] of [[0.5, 0xff2bd6], [H - 0.4, 0x22e5ff]]) B(W + 0.1, 0.12, D + 0.1, 0, y, 0, neon(c));
        B(W - 4, 2.6, 0.1, 0, 1.7, -D / 2 - 0.03, mat(0x221a3a, { emissive: 0x6a2bff, ei: 0.5 })); door(2.6, 2.7, 0x111111);
        sign('PIXEL PALACE', 12, H - 1.2, '#1c1030', '#ffd23f', 'arcade · games · prizes');
        for (let i = 0; i < 6; i++) B(0.35, 0.35, 0.1, -W / 2 + 2 + i * 0.8, 3.2 + (i % 2) * 0.4, -D / 2 - 0.08, neon([0xff2bd6, 0x22e5ff, 0xffd23f][i % 3]));
        break; }
      case 'church': {
        H = 6; const stone = mat(0xcfc3a8, { rough: 0.95 });
        B(W - 6, H, D, 0, H / 2, 0, stone);
        const roofM = mat(0x4a3a30); for (const s of [-1, 1]) { const r = B((W - 6) / 2 / Math.cos(0.6) + 0.4, 0.3, D + 0.6, s * (W - 6) / 4, H + Math.tan(0.6) * (W - 6) / 4, 0, roofM); r.rotation.z = -s * 0.6; }
        const tower = B(4, H + 7, 4, 0, (H + 7) / 2, -D / 2 + 1.5, stone);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6, 4), roofM); spire.position.set(0, H + 10, -D / 2 + 1.5); spire.rotation.y = Math.PI / 4; g.add(spire);
        const gold = mat(0xd4af37, { metal: 0.8, rough: 0.3 }); B(0.2, 1.8, 0.2, 0, H + 14, -D / 2 + 1.5, gold); B(1.0, 0.2, 0.2, 0, H + 14.3, -D / 2 + 1.5, gold);
        for (const x of [-4, 4]) for (const z of [-3, 3]) B(0.1, 2.4, 1.0, x * 1.55 > 0 ? (W - 6) / 2 + 0.06 : -(W - 6) / 2 - 0.06, 3, z, mat([0x7a5cff, 0xff2b4a, 0x22aaff, 0xffd23f][(x + z + 14) % 4], { emissive: 0x553388, ei: 0.4 }));
        B(1.8, 3.2, 0.12, 0, 1.6, -D / 2 - 0.02, 0x5a3a22); C(0.9, 0.9, 0.12, 0, 3.2, -D / 2 - 0.02, 0x5a3a22).rotation.x = Math.PI / 2;
        sign(b.name.toUpperCase(), 7, 1.0, '#2a2516', '#f2e6c8', 'all are welcome', -D / 2 - 2.2).position.x = 5;
        break; }
      case 'mosque': {
        H = 6; const white = mat(0xf3efe6, { rough: 0.9 }), green = mat(0x1d6b4f), goldM = mat(0xd4af37, { metal: 0.8, rough: 0.3 });
        B(W - 4, H, D - 2, 0, H / 2, 1, white);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), green); dome.position.set(0, H + 0.6, 1); dome.scale.y = 1.15; g.add(dome);
        C(5.3, 5.3, 0.8, 0, H + 0.4, 1, white, 32);
        C(0.12, 0.12, 1.2, 0, H + 6.8, 1, goldM, 8);
        const cres = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 24, Math.PI * 1.5), goldM); cres.position.set(0, H + 7.8, 1); cres.rotation.z = Math.PI * 0.75; g.add(cres);
        // minaret
        const mx = W / 2 - 1.6, mz = -D / 2 + 1.6;
        C(0.9, 1.1, 18, mx, 9, mz, white); C(1.4, 1.4, 0.4, mx, 14, mz, white); C(1.45, 1.45, 0.9, mx, 14.6, mz, mat(0xc9c2b2)); C(0.75, 0.9, 2.5, mx, 16.2, mz, white);
        const md = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.0, 16), green); md.position.set(mx, 18.4, mz); g.add(md);
        // arched porch with columns
        for (let i = -2; i <= 2; i++) { C(0.25, 0.25, 3.4, i * 2.6, 1.7, -D / 2 + 0.4, white); }
        B(12, 0.6, 2, 0, 3.6, -D / 2 + 0.9, white); B(12.2, 0.15, 2.2, 0, 3.95, -D / 2 + 0.9, green);
        for (let i = -2; i < 2; i++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 8, 16, Math.PI), green); arch.position.set(i * 2.6 + 1.3, 2.9, -D / 2 + 0.3); g.add(arch); }
        B(2.2, 2.8, 0.12, 0, 1.4, -D / 2 + 2.02, 0x5a3a22);
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) B(0.1, 2.2, 1.0, s * ((W - 4) / 2 + 0.05), 3.0, -2 + k * 5, mat(0x9fd3ff, { emissive: 0x2a7a6a, ei: 0.4 }));
        sign(b.name.toUpperCase(), 7.5, 1.0, '#1d6b4f', '#ffffff', 'all are welcome', -D / 2 - 2.2).position.x = -6;
        break; }
      case 'bank': {
        H = 6; const stone = mat(0xe4ddcc, { rough: 0.9 }); box(H, stone);
        for (let i = -3; i <= 3; i++) C(0.35, 0.4, H - 1, i * 2.6, (H - 1) / 2 + 0.3, -D / 2 - 1.2, stone);
        B(W, 0.3, 2.6, 0, 0.15, -D / 2 - 1.2, stone); B(W + 0.4, 0.8, 2.8, 0, H - 0.2, -D / 2 - 1.2, stone);
        const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-W / 2 - 0.2, 0), new THREE.Vector2(W / 2 + 0.2, 0), new THREE.Vector2(0, 2.0)]), { depth: 2.8, bevelEnabled: false }), stone); ped.position.set(0, H + 0.2, -D / 2 - 2.6); g.add(ped);   // triangular pediment
        door(2.4, 3, 0x2c2c2c); sign('MERIDIAN BANK', 8, H - 0.2, '#0b2545', '#d4af37', '', -D / 2 - 2.62);
        B(0.8, 1.6, 0.4, W / 2 - 2, 0.8, -D / 2 - 0.2, 0x2c3e50); break; }
      case 'cafe': {
        H = 4; box(H, 0xc96f3b); B(W - 2, 2.4, 0.1, 0, 1.6, -D / 2 - 0.03, glass); door(2, 2.6, 0x3b2b1f);
        for (let i = 0; i < 6; i++) B(W / 6, 0.1, 2.4, -W / 2 + W / 12 + i * W / 6, 3.0, -D / 2 - 1.2, i % 2 ? 0xf6f1e7 : 0x2a6b4f);
        sign('BREW & BEAN', 8, H - 0.4, '#2a2116', '#f2e6c8', 'coffee · cakes · brunch', -D / 2 - 0.1);
        for (const x of [-6, -2.5, 3.5, 7]) { C(0.45, 0.45, 0.06, x, 0.75, -D / 2 - 2.6, 0xf2f2f2); C(0.05, 0.05, 0.75, x, 0.37, -D / 2 - 2.6, 0x333333); for (const s of [-1, 1]) B(0.4, 0.45, 0.4, x + s * 0.7, 0.22, -D / 2 - 2.6, 0x2a6b4f); }
        break; }
      case 'office': {
        H = 11; const glassBox = mat(0x2f5b7a, { rough: 0.15, metal: 0.6, emissive: 0x88c8ff, ei: 0, glow: true }); box(H, glassBox);
        for (let y = 3.6; y < H; y += 3.6) B(W + 0.2, 0.3, D + 0.2, 0, y, 0, 0xd8dde2);
        door(3, 2.8, 0x111111); sign('NEXUS CYBER SYSTEMS', 10, 3.2, '#0b0f1a', '#22e5ff', 'north office', -D / 2 - 0.12); break; }
      case 'jobcentre': {
        H = 7; box(H, 0xdcd6c8); for (let y = 1.2; y < H; y += 3.2) for (let x = -W / 2 + 2; x < W / 2 - 1; x += 3) B(1.8, 1.6, 0.1, x, y + 0.8, -D / 2 - 0.03, glass);
        door(2.6, 2.8, 0x1f4e8c); sign('JOB CENTRE', 9, H - 0.6, '#1f4e8c', '#ffffff', 'find work · training · careers advice', -D / 2 - 0.1); break; }
      case 'college': {
        H = 9; const brick = mat(0x9a5b42, { rough: 0.9 }), stone = mat(0xe4ddcc); box(H, brick);
        for (let y = 1.5; y < H - 1; y += 3) for (let x = -W / 2 + 2; x < W / 2 - 1; x += 2.6) B(1.4, 1.8, 0.1, x, y + 0.9, -D / 2 - 0.03, glass);
        for (let i = -2; i <= 2; i++) C(0.3, 0.3, 4, i * 1.6, 2, -D / 2 - 1.4, stone); B(8.4, 0.5, 2.4, 0, 4.2, -D / 2 - 1.3, stone);
        door(2.4, 3, 0x3b2b1f); sign('ASHFORD POLYTECHNIC', 10, H - 0.8, '#3b1f2b', '#f2e6c8', 'degrees · nursing · teaching · business', -D / 2 - 0.1);
        const clock = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), mat(0xf6f1e7)); clock.position.set(0, H + 1.2, -D / 2 - 0.02); clock.rotation.y = Math.PI; g.add(clock); B(2.4, 2.6, 0.6, 0, H + 1.2, -D / 2 + 0.2, brick); break; }
    }
    B(W + 2, 0.12, D + 2, 0, 0.06, 0, 0xb9b6ae);   // plinth / forecourt
    B(W + 2, 0.12, 4, 0, 0.07, -D / 2 - 2.5, 0xa9a59c);
    const r = F.rect(0); colliders.push(r);
    const [dx, dz] = F.at(0, -D / 2);
    const civic = { type: TYPE[b.kind], name: b.name, x: b.x, z: b.z, minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, door: { x: dx, z: dz }, branch: b.kind };
    civicBuildings.push(civic); ctx.destinations?.push({ name: b.name, x: dx, z: dz });
    out.push({ ...b, civic, door: { x: dx, z: dz }, front: F.at(0, -D / 2 - 3.5) });
  }
  return { list: out, find: name => out.find(b => b.name === name) };
}
