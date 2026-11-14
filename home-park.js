// ASHFORD PARK, beside your house: two city blocks now, either side of the street, joined by a zebra
// crossing. Big enough to have fun in, not so big it swallows the neighbourhood.
//   NORTH HALF (the old park): the duck pond, trees and flowers, plus a cycle-and-jogging loop round the
//     edge, picnic tables and more benches
//   SOUTH HALF: a SKATE PARK (a bowl, quarter pipes, a funbox, a grind rail and a stair set, with skaters
//     on it) and a BIKE TRACK (a pump track of rollers and berms, with council hire bikes you can ride)
// Everyone in it is a resident having a day out; the hire bikes belong to the council (owner GOV).
import * as THREE from 'three';
import { makeKit } from './leisure-kit.js';

export const HOME_PARK = { north: { x0: -35, x1: -5, z0: 5, z1: 35 }, south: { x0: -35, x1: -5, z0: 45, z1: 75 } };
const N = HOME_PARK.north, Sp = HOME_PARK.south;

export function buildHomePark(ctx) {
  const K = makeKit(ctx), { B, C, S, mat, solid, circle, sign, place, spot, sitter } = K;
  const root = new THREE.Group(); ctx.scene.add(root);
  const Y = ctx.curb ?? .16;   // the city's pavement height
  // people stand on the pavement, not the ground under it
  const walker = (pts, o = {}) => K.walker(pts, { y: Y + .05, ...o }), stander = (x, z, yaw, o = {}) => K.stander(x, z, yaw, { y: Y + .05, ...o });
  const concrete = mat(0xb7b4ae, { rough: .85 }), track = mat(0xa0462f, { rough: .95 }), dirt = mat(0x8a6a48, { rough: 1 }), iron = mat(0x2b2f33, { metal: .6, rough: .4 });
  const flat = (w, d, x, z, m, y = 0) => B(root, w, .04, d, x, Y + .02 + y, z, m, false);
  const bench = (x, z, ry, sit) => { const g = new THREE.Group(); g.position.set(x, Y, z); g.rotation.y = ry; root.add(g); B(g, 1.8, .08, .5, 0, .45, 0, 0x7a5636); B(g, 1.8, .4, .06, 0, .75, -.22, 0x7a5636); for (const sx of [-.8, .8]) B(g, .08, .45, .5, sx, .22, 0, 0x2a2a2a);
    if (sit) sitter(x, z, ry, Y + .47, { task: 'talk' }); else ctx.sitSpots?.push({ x, z, yaw: ry, seatY: Y + .47, label: 'Sit on the bench' }); };

  // ================= the north half: a loop round the old park =================
  { const m = 1.2, w = 2.2, x0 = N.x0 + m, x1 = N.x1 - m, z0 = N.z0 + m, z1 = N.z1 - m;
    flat(x1 - x0, w, (x0 + x1) / 2, z0 + w / 2, track); flat(x1 - x0, w, (x0 + x1) / 2, z1 - w / 2, track);
    flat(w, z1 - z0 - 2 * w, x0 + w / 2, (z0 + z1) / 2, track); flat(w, z1 - z0 - 2 * w, x1 - w / 2, (z0 + z1) / 2, track);
    const s = sign('ASHFORD PARK', 'cycle & jogging loop · skate park and bike track across the road', 6, '#1f4d3a', '#f2e6c8'); place(s, (N.x0 + N.x1) / 2, Y + 2.2, N.z0 + .3, Math.PI);
    C(root, .06, .06, 2.2, (N.x0 + N.x1) / 2 - 2.6, Y + 1.1, N.z0 + .3, 0x2b2f33); C(root, .06, .06, 2.2, (N.x0 + N.x1) / 2 + 2.6, Y + 1.1, N.z0 + .3, 0x2b2f33);
    // cyclists and joggers going round
    const loop = [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x1 - 1, z1 - 1], [x0 + 1, z1 - 1]];
    walker(loop, { speed: 2.6, outfit: 0xd35400 }); walker(loop.slice().reverse(), { speed: 2.2, t: 20, outfit: 0x2e86de }); walker(loop, { speed: 1.1, t: 50 });
    // more places to sit: benches on the loop and a picnic table by the pond
    for (const [x, z, ry, sit] of [[N.x0 + 5, N.z0 + 5, Math.PI / 4, true], [N.x1 - 5, N.z1 - 5, -Math.PI * .75, false], [N.x0 + 5, N.z1 - 5, Math.PI * .75, false], [N.x1 - 5, N.z0 + 5, -Math.PI / 4, true]]) bench(x, z, ry, sit);
    { const x = -27, z = 28, g = new THREE.Group(); g.position.set(x, Y, z); root.add(g); B(g, 2.2, .08, .9, 0, .75, 0, 0x8a6a42); for (const s of [-1, 1]) { B(g, 2.2, .06, .3, 0, .45, s * .75, 0x8a6a42); B(g, .08, .75, .08, s * .9, .37, 0, 0x5a4a3a); }
      sitter(x - .4, z - .75, 0, Y + .47, { task: 'talk' }); sitter(x + .5, z - .75, 0, Y + .47, { task: 'talk', child: true }); ctx.sitSpots?.push({ x, z: z + .75, yaw: Math.PI, seatY: Y + .47, label: 'Sit at the picnic table' }); solid(x - 1.1, x + 1.1, z - .45, z + .45); }
  }
  // ================= a zebra crossing between the halves =================
  { const x = (N.x0 + N.x1) / 2;
    for (let z = N.z1 + 1; z < Sp.z0 - .5; z += 1.1) flat(4, .55, x, z, mat(0xf4f4f0, { rough: .8 }), -.15);
    for (const z of [N.z1 + .4, Sp.z0 - .4]) for (const s of [-1, 1]) { C(root, .05, .05, 2.4, x + s * 2.6, Y + 1.2, z, 0x2b2f33); S(root, .22, x + s * 2.6, Y + 2.5, z, mat(0xffb000, { emissive: 0xff9000, ei: .6 })); }
  }
  // ================= the south half: the skate park =================
  { const x0 = Sp.x0 + 1, x1 = -19, z0 = Sp.z0 + 1, z1 = Sp.z1 - 1, cx = (x0 + x1) / 2;
    flat(x1 - x0, z1 - z0, cx, (z0 + z1) / 2, concrete);
    // the sign at the entrance
    { const s = sign('ASHFORD SKATE PARK', 'helmets recommended', 5, '#2b2f33', '#ffd23f'); place(s, cx, Y + 2.6, z0 - .2, Math.PI); C(root, .06, .06, 2.6, cx - 2.3, Y + 1.3, z0 - .2, 0x2b2f33); C(root, .06, .06, 2.6, cx + 2.3, Y + 1.3, z0 - .2, 0x2b2f33); }
    // quarter pipes facing each other across the flat
    const quarter = (x, z, ry) => { const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(2.4, 0); shape.lineTo(2.4, 1.6); shape.absarc(2.4, 2.4, 2.4, -Math.PI / 2, -Math.PI, true); shape.lineTo(0, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false }); const m = new THREE.Mesh(geo, mat(0xa9a59d, { rough: .8 })); m.position.set(x, Y, z); m.rotation.y = ry; m.castShadow = true; root.add(m);
      const coping = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 6, 8), iron); coping.rotation.x = Math.PI / 2; coping.position.set(0, 2.4, 3); m.add(coping); };
    quarter(x0, z1 - 9, 0); quarter(x1, z1 - 3, Math.PI);
    solid(x0, x0 + 2.4, z1 - 9, z1 - 3); solid(x1 - 2.4, x1, z1 - 9, z1 - 3);
    // a mini half-pipe at the entrance end: two quarters facing each other, 5 m of flat between
    quarter(x0, z0 + 3, 0); quarter(x1, z0 + 9, Math.PI);
    solid(x0, x0 + 2.4, z0 + 3, z0 + 9); solid(x1 - 2.4, x1, z0 + 3, z0 + 9);
    // a funbox with a grind rail along it, and a stair set with a handrail
    { const fx = cx, fz = z1 - 6; B(root, 3, .6, 3, fx, Y + .3, fz, 0xa9a59d); for (const s of [-1, 1]) { const ramp = B(root, 2, .05, 3, fx + s * 2.4, Y + .3, fz, 0xa9a59d); ramp.rotation.z = -s * .29; }
      C(root, .04, .04, 3.2, fx, Y + .7, fz + 1.1, 0x9aa0a6).rotation.z = Math.PI / 2; solid(fx - 1.5, fx + 1.5, fz - 1.5, fz + 1.5); }
    { const sx = x1 - 3, sz = z0 + 15; for (let i = 0; i < 4; i++) B(root, 3, .18 * (i + 1), .4, sx, Y + .09 * (i + 1), sz + i * .4, 0xa9a59d); B(root, 3, .72, 2, sx, Y + .36, sz + 2.6, 0xa9a59d);
      const rail = C(root, .035, .035, 2.2, sx + 1.2, Y + 1, sz + .7, 0x9aa0a6); rail.rotation.x = Math.PI / 2 - .4; }
    // skaters: kids and young people on boards going round the park
    const board = a => { const h = a?.h; if (!h?.root) return; const d = new THREE.Group(); const deck = new THREE.Mesh(new THREE.BoxGeometry(.22, .03, .8), mat(0x2b2f33)); deck.position.y = .08; d.add(deck); for (const z of [-.28, .28]) for (const x of [-.09, .09]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .03, 8), mat(0xffd23f)); w.rotation.z = Math.PI / 2; w.position.set(x, .03, z); d.add(w); } h.root.add(d); };
    board(walker([[x0 + 3.5, z0 + 6], [x1 - 3.5, z0 + 6]], { speed: 3, child: true, outfit: 0xff4d6d }));
    board(walker([[x1 - 3.5, z1 - 11], [x0 + 3.5, z1 - 11], [x0 + 3.5, z0 + 11], [x1 - 3.5, z0 + 11]], { speed: 3.4, t: 15, outfit: 0x2e86de }));
    board(walker([[cx - 4, z1 - 3], [cx + 4, z1 - 3]], { speed: 2.6, t: 5, outfit: 0x27ae60 }));
    stander(x0 + 1, z0 + 12, Math.PI / 2, { task: 'talk', child: true }); stander(x0 + 1.2, z0 + 13.2, Math.PI / 2, { task: 'talk', outfit: 0x9b59b6 });
    bench(x0 + .6, z0 + 20, Math.PI / 2, false);
  }
  // ================= the south half: the bike track =================
  { const x0 = -17.5, x1 = Sp.x1 - 1, z0 = Sp.z0 + 1, z1 = Sp.z1 - 1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    flat(x1 - x0, z1 - z0, cx, cz, mat(0x6f9a4a, { rough: 1 }));
    // a pump track: an oval of packed dirt with rollers (bumps) along the straights
    const rx = (x1 - x0) / 2 - 2, rz = (z1 - z0) / 2 - 3;
    { const ring = new THREE.Mesh(new THREE.RingGeometry(rz - 1.3, rz + 1.3, 48), dirt); ring.rotation.x = -Math.PI / 2; ring.scale.set(rx / rz, 1, 1); ring.position.set(cx, Y + .06, cz); root.add(ring); }
    for (const s of [-1, 1]) for (let k = -2; k <= 2; k++) { const r = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), dirt); r.scale.set(1.2, .28, .8); r.position.set(cx + s * rx, Y + .05, cz + k * 4.2); root.add(r); }
    const s = sign('PUMP TRACK', 'hire bikes free · ride round', 4, '#4a3424', '#fff6d6'); place(s, cx, Y + 2.4, z0 - .2, Math.PI); C(root, .06, .06, 2.4, cx - 1.9, Y + 1.2, z0 - .2, 0x2b2f33); C(root, .06, .06, 2.4, cx + 1.9, Y + 1.2, z0 - .2, 0x2b2f33);
    // riders going round it
    const oval = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]; });
    walker(oval, { speed: 3.2, child: true, outfit: 0xf1c40f }); walker(oval.slice().reverse(), { speed: 3, t: 12, outfit: 0xe67e22 });
    // the council's hire bikes, in a rack: real bicycles you can ride (press E)
    const rackX = cx, rackZ = cz;
    B(root, 3.2, .08, .9, rackX, Y + .04, rackZ, 0x2b2f33);
    const bikes = [];
    for (let i = 0; i < 3; i++) { const v = ctx.makeVehicle?.('bicycle', [0x1f8a4c, 0x1f8a4c, 0x1f8a4c][i]); if (!v) break; v.group.position.set(rackX - 1 + i, Y + .35, rackZ); v.group.rotation.y = 0; v.yaw = 0; v.parkHire = true; v.owner = 'GOV'; v.name = 'Ashford Park hire bike'; bikes.push(v); }
    bench(x1 - .6, z1 - 3, -Math.PI / 2, true);
  }
  // a few more trees round the south half's edge
  for (const [x, z] of [[Sp.x0 + 1, Sp.z1 - 1], [Sp.x1 - 1, Sp.z1 - 1], [-18.2, Sp.z0 + 2], [-18.2, Sp.z1 - 2]]) ctx.tree?.(x, z, 'oak', .9);
  ctx.destinations?.push({ name: 'Ashford Park skate park', x: -27, z: 50 }, { name: 'Ashford Park bike track', x: -11, z: 50 });

  let t = 0;
  function update(dt, p) {
    if (Math.abs(p.x + 20) > 140 || Math.abs(p.z - 40) > 140) return;
    t += dt; K.update(dt, p, 90);
  }
  return { update, kit: K };
}
