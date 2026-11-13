// Welcome / goodbye banners, and readable backs for every sign.
//   - Gantries over the road where you enter a place: the side you drive up to says "WELCOME TO …",
//     the other side (what you see on the way out) says "GOODBYE FROM …".
//   - fixSignBacks(): many signs were one plane drawn on both sides, so from behind the writing was
//     mirrored. Each one now gets a proper back face, so it reads the right way round from either side.
import * as THREE from 'three';

function face(text, sub, colour, accent) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 192; const g = cv.getContext('2d');
  g.fillStyle = colour; g.fillRect(0, 0, 1024, 192);
  g.fillStyle = accent; g.fillRect(0, 0, 1024, 10); g.fillRect(0, 182, 1024, 10);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 30px sans-serif'; g.fillText(text[0], 512, 42, 960);
  g.font = 'bold 64px sans-serif'; g.fillText(text[1], 512, 104, 980);
  if (sub) { g.fillStyle = accent; g.font = 'italic 26px sans-serif'; g.fillText(sub, 512, 156, 960); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: t });
}

// A gantry across a road at (x, z). The road runs along `axis` ('z' or 'x'); `welcomeFrom` is the
// direction (+1/-1 along that axis) that people arrive from, who see the welcome side.
export function buildWelcomeBanners({ scene }) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x4a5560, metalness: 0.5, roughness: 0.45 });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  function gantry({ x, z, y = 0, width, axis = 'z', welcomeFrom = -1, place, welcomeSub, byeSub, colour = '#1d3c52', accent = '#f2c14e' }) {
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    // local frame: the road runs along local z, arrivals come from local -z
    g.rotation.y = (axis === 'z' ? 0 : Math.PI / 2) + (welcomeFrom > 0 ? Math.PI : 0);
    const post = (px) => { const m = new THREE.Mesh(geo, steel); m.scale.set(0.45, 7, 0.45); m.position.set(px, 3.5, 0); g.add(m); };
    post(-width / 2); post(width / 2);
    const beam = new THREE.Mesh(geo, steel); beam.scale.set(width + 0.6, 0.35, 0.5); beam.position.set(0, 7.1, 0); g.add(beam);
    const w = Math.min(width - 1.5, 14), h = w * 192 / 1024;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), face(['WELCOME TO', place.toUpperCase()], welcomeSub, colour, accent));
    front.position.set(0, 6.9 - h / 2 - 0.25, -0.3); front.rotation.y = Math.PI; g.add(front);          // faces arrivals (-z)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), face(['GOODBYE FROM', place.toUpperCase()], byeSub || 'Thanks for visiting · drive safely', colour, accent));
    back.position.set(0, 6.9 - h / 2 - 0.25, 0.3); g.add(back);                                         // faces people leaving (+z)
    front.userData.signBackDone = back.userData.signBackDone = true;
    return g;
  }
  // Ashford Harbour Bridge: from the town end (north, z 90) and as you come off it into the Capital (z 730)
  gantry({ x: 220, z: 90, width: 24, welcomeFrom: -1, place: 'Ashford Harbour Bridge', welcomeSub: '640 m crossing · keep left · no stopping' });
  gantry({ x: 220, z: 726, width: 24, welcomeFrom: -1, place: 'Ashford Capital', welcomeSub: 'seat of the city council · home of the Capitol', byeSub: 'Thanks for visiting the Capital · safe journey', colour: '#3b2a52' });
}

export function fixSignBacks(scene) {
  const list = [];
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.signBackDone) return;
    const m = o.material;
    if (!m || Array.isArray(m) || m.side !== THREE.DoubleSide || !m.map || !(m.map.image instanceof HTMLCanvasElement)) return;
    if (o.geometry?.type !== 'PlaneGeometry') return;
    list.push(o);
  });
  for (const o of list) {
    o.userData.signBackDone = true;
    const fm = o.material.clone(); fm.side = THREE.FrontSide; o.material = fm;
    const back = new THREE.Mesh(o.geometry, fm); back.rotation.y = Math.PI; back.userData.signBackDone = true; back.renderOrder = o.renderOrder; o.add(back);
  }
  return list.length;
}
