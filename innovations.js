// INNOVATIONS — things the residents learn about online and then build together.
//
// Now and then a curious resident (an engineer, a student or a journalist) goes online and reads up on
// how other cities do things (/api/citizen-research searches the real web). If what they find is more
// advanced than what this city has, they bring it to the council. If the council votes to fund it,
// the residents build it over a few real hours, and it appears in the world and changes how the city
// works (cleaner streets, cheaper power, healthier people...).
import * as THREE from 'three';

export const PROJECTS = [
  { id: 'solar-lamps', name: 'Solar street lights', topic: 'solar-powered street lights in cities', cost: 900, hours: 2, effect: { treasury: 3 }, about: 'Solar panels on every street lamp, so the city stops paying to light the streets at night.' },
  { id: 'recycling', name: 'Street recycling stations', topic: 'smart recycling bins on city streets', cost: 600, hours: 1.5, effect: { clean: .06 }, about: 'Sorted bins for paper, plastic, glass and food on street corners.' },
  { id: 'bike-share', name: 'Bike-share docks', topic: 'city bike-share schemes and docking stations', cost: 800, hours: 2, effect: { health: .05 }, about: 'Docks of rentable bikes around town for short trips.' },
  { id: 'crossings', name: 'Smart pedestrian crossings', topic: 'smart LED pedestrian crossings that light up for walkers', cost: 700, hours: 1.5, effect: { crime: -.03 }, about: 'Crossings with glowing kerb lights that make walkers visible to drivers at night.' },
  { id: 'wind-farm', name: 'Wind turbines', topic: 'small wind farms that power towns', cost: 2200, hours: 4, effect: { treasury: 6 }, about: 'Wind turbines outside town that sell clean power to the grid.' },
];
export const projectById = id => PROJECTS.find(p => p.id === id);

export function buildProject(id, ctx) {
  const g = new THREE.Group(); g.name = 'innovation:' + id; ctx.scene.add(g);
  const spin = [];
  const merge = (geo, mat, list) => { const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((o, i) => { const d = new THREE.Object3D(); d.position.copy(o.p); d.rotation.set(o.rx || 0, o.ry || 0, 0); d.scale.setScalar(o.s || 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.castShadow = true; g.add(m); return m; };
  const corners = ctx.corners();
  if (id === 'solar-lamps') {
    const list = ctx.lamps().map(p => ({ p: new THREE.Vector3(p.x, (p.y || .2) + 4.82, p.z), rx: -.45 }));
    merge(new THREE.BoxGeometry(.9, .04, .6), new THREE.MeshStandardMaterial({ color: 0x1b2c4a, metalness: .6, roughness: .25, emissive: 0x0a1426 }), list);
  } else if (id === 'recycling') {
    const cols = [0x2f7dd1, 0xe3b43a, 0x3a9a55, 0x8a5a3a], spots = corners.filter((_, i) => i % 3 === 0);
    cols.forEach((c, k) => merge(new THREE.BoxGeometry(.5, .95, .5), new THREE.MeshStandardMaterial({ color: c, roughness: .6 }), spots.map(s => ({ p: new THREE.Vector3(s.x + s.ox * .9, ctx.groundY(s.x, s.z) + .48, s.z - s.oz * (2 + k * .58)) }))));
  } else if (id === 'bike-share') {
    const spots = corners.filter((_, i) => i % 5 === 1), bikes = [], docks = [];
    for (const s of spots) for (let k = 0; k < 4; k++) { const p = new THREE.Vector3(s.x + s.ox * .6, ctx.groundY(s.x, s.z), s.z - s.oz * (3 + k * .7)); docks.push({ p: p.clone().add(new THREE.Vector3(0, .45, 0)) }); bikes.push({ p: p.clone().add(new THREE.Vector3(-s.ox * .55, .45, 0)) }); }
    merge(new THREE.BoxGeometry(.12, .9, .12), new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: .5 }), docks);
    merge(new THREE.BoxGeometry(1.5, .55, .06), new THREE.MeshStandardMaterial({ color: 0x1fa98a, roughness: .5 }), bikes);
  } else if (id === 'crossings') {
    const list = corners.map(s => ({ p: new THREE.Vector3(s.x + s.ox * .8, ctx.groundY(s.x, s.z) + .45, s.z + s.oz * .8) }));
    merge(new THREE.CylinderGeometry(.09, .11, .9, 8), new THREE.MeshStandardMaterial({ color: 0x2b3238, emissive: 0x3fd0ff, emissiveIntensity: 1.2 }), list);
  } else if (id === 'wind-farm') {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xeef1f3, roughness: .5 });
    for (const p of ctx.openLand(4)) {
      const y = ctx.groundY(p.x, p.z), t = new THREE.Mesh(new THREE.CylinderGeometry(.5, .9, 30, 10), towerMat); t.position.set(p.x, y + 15, p.z); t.castShadow = true; g.add(t);
      const hub = new THREE.Group(); hub.position.set(p.x, y + 30.5, p.z + .9); g.add(hub);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.5, 13, .15), towerMat); b.position.y = 6.5; const arm = new THREE.Group(); arm.rotation.z = k * Math.PI * 2 / 3; arm.add(b); hub.add(arm); }
      spin.push(hub);
    }
  }
  return { group: g, update(dt) { for (const h of spin) h.rotation.z += dt * .9; } };
}
