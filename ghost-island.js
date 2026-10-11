import * as THREE from 'three';

// A dead, fogged-out island out at sea: an abandoned ghost town up top, and a
// crypt dug into its hill leading down to a chamber of ancient bones below.
// Static geometry + anchor points only — main.js spawns the skeleton
// guardians itself, the same split forest-volcano.js/main.js already use.
export function buildGhostIsland(ctx) {
  const ix = -80, iz = 480, r = 26;
  const boneBounds = { x0: ix - 16, x1: ix + 16, z0: iz + 14, z1: iz + 54 };

  const deadMat = new THREE.MeshStandardMaterial({ color: 0x45433c, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x322c24, roughness: 1 });
  const woodMat2 = new THREE.MeshStandardMaterial({ color: 0x413a2e, roughness: 1 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.75 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x55524c, roughness: 1 });

  const land = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 2.4, 40), deadMat);
  land.position.set(ix, -0.9, iz);
  ctx.scene.add(land);
  ctx.box(3, 0.2, 10, ix, 0.1, iz - r - 4, 0x6b665a, false);   // dock approach

  // ---- Ghost town: a handful of collapsing wooden buildings ----
  const TOWN = [
    { x: ix - 10, z: iz - 10, w: 8, d: 7, h: 4.5, tilt: 0.04 },
    { x: ix + 9, z: iz - 11, w: 7, d: 6, h: 4, tilt: -0.05 },
    { x: ix - 12, z: iz + 2, w: 6, d: 6, h: 3.6, tilt: 0.03 },
    { x: ix + 11, z: iz + 1, w: 9, d: 7, h: 5, tilt: -0.02 },   // the old saloon
    { x: ix, z: iz - 16, w: 10, d: 6, h: 4.2, tilt: 0 },
  ];
  for (const b of TOWN) {
    const wall = ctx.box(b.w, b.h, b.d, b.x, b.h / 2, b.z, woodMat);
    wall.rotation.z = b.tilt;
    const roof = ctx.box(b.w + 0.8, 0.3, b.d + 0.8, b.x, b.h + 0.2, b.z, woodMat2, false);
    roof.rotation.z = b.tilt;
    for (const side of [-1, 1]) {   // boarded-up windows
      const win = ctx.box(1.1, 1.1, 0.1, b.x + side * (b.w / 3), b.h * 0.55, b.z + b.d / 2 + 0.02, 0x1c1812, false);
      win.rotation.z = b.tilt;
    }
  }
  ctx.signboard?.('GHOST TOWN', ix, 6.5, iz - 16 - 3 - 0.1, 14, '#1a1812');

  // ---- Graveyard, scattered bones, drifting wisps ----
  for (let i = 0; i < 10; i++) {
    const gx = ix + (ctx.rand() - 0.5) * 18, gz = iz + 8 + ctx.rand() * 8;
    ctx.box(0.12, 0.9, 0.12, gx, 0.45, gz, stoneMat, false);
    ctx.box(0.55, 0.12, 0.12, gx, 0.75, gz, stoneMat, false);
  }
  for (let i = 0; i < 14; i++) {
    const bx = ix + (ctx.rand() - 0.5) * 20, bz = iz + (ctx.rand() - 0.5) * 20;
    ctx.box(0.5 + ctx.rand() * 0.4, 0.12, 0.14, bx, 0.08, bz, boneMat, false).rotation.y = ctx.rand() * Math.PI;
  }
  const wisps = [];
  for (let i = 0; i < 6; i++) {
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9fe8b0, transparent: true, opacity: 0.75 }));
    wisp.position.set(ix + (ctx.rand() - 0.5) * 22, 1.4 + ctx.rand(), iz + (ctx.rand() - 0.5) * 22);
    ctx.scene.add(wisp);
    wisps.push({ m: wisp, cx: wisp.position.x, cz: wisp.position.z, phase: ctx.rand() * 10 });
  }

  // ---- Crypt mound + tunnel down to the bone chamber ----
  const crX = ix, crZ = iz + 20, mouthW = 4.4, tunnelLen = 16, chamberR = 10;
  const mound = new THREE.Mesh(new THREE.ConeGeometry(16, 10, 8), deadMat);
  mound.position.set(crX, 5, crZ + 10); ctx.scene.add(mound);
  ctx.box(5, 4, 0.6, crX, 2, crZ - 2, stoneMat, false);   // crypt archway facade
  ctx.signboard?.('THE BONE CRYPT', crX, 5, crZ - 2.2, 10, '#1a1812');
  for (const s of [-1, 1]) ctx.box(1.6, 5.5, tunnelLen, crX + s * (mouthW / 2 + 0.8), 2.75, crZ + tunnelLen / 2, stoneMat, true);
  ctx.box(mouthW + 3.2, 0.5, tunnelLen + 1, crX, 5.5, crZ + tunnelLen / 2, stoneMat, false);

  const chamberZ = crZ + tunnelLen + chamberR * 1.3;
  for (let i = 0; i < 10; i++) {
    const a = ctx.rand() * Math.PI * 2, rr = chamberR * (0.5 + ctx.rand() * 0.5), wallH = 6 + ctx.rand() * 3;
    ctx.box(5 + ctx.rand() * 4, wallH, 5 + ctx.rand() * 4, crX + Math.cos(a) * rr, wallH / 2, chamberZ + Math.sin(a) * rr, stoneMat, true);
  }
  // A heap of ancient bones at the chamber's centre — skulls, ribs, long bones.
  const boneHeap = new THREE.Group();
  boneHeap.position.set(crX, 0, chamberZ);
  for (let i = 0; i < 8; i++) {
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), boneMat);
    skull.position.set((ctx.rand() - 0.5) * 3, 0.3 + ctx.rand() * 0.6, (ctx.rand() - 0.5) * 3);
    boneHeap.add(skull);
  }
  for (let i = 0; i < 16; i++) {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1 + ctx.rand() * 0.6, 6), boneMat);
    bone.position.set((ctx.rand() - 0.5) * 3.5, 0.2 + ctx.rand() * 0.5, (ctx.rand() - 0.5) * 3.5);
    bone.rotation.set(ctx.rand() * Math.PI, ctx.rand() * Math.PI, ctx.rand() * Math.PI);
    boneHeap.add(bone);
  }
  ctx.scene.add(boneHeap);
  let looted = false;
  ctx.interactables.push({
    pos: new THREE.Vector3(crX, 0.5, chamberZ), r: 3.5, label: 'Search the ancient bones',
    action: () => {
      if (looted) { ctx.toast('There is nothing left to find here.'); return; }
      looted = true;
      ctx.stats.gold += 250;
      ctx.toast('Among the ancient bones you find a pouch of old coins. +250 gold');
    },
  });
  const boneLight = new THREE.PointLight(0x7fe8a0, 2.4, 26, 2);
  boneLight.position.set(crX, 3, chamberZ);
  ctx.scene.add(boneLight);

  ctx.destinations?.push({ name: 'Ghost Town', x: ix, z: iz - r + 6 }, { name: 'The Bone Crypt', x: crX, z: crZ - 4 });

  const island = { name: 'Boneharrow Island', x: ix, z: iz, r, style: 'ghost' };
  return {
    island, chamberCentre: new THREE.Vector3(crX, 0, chamberZ),
    groundAt(x, z) {
      if (x >= boneBounds.x0 && x <= boneBounds.x1 && z >= boneBounds.z0 && z <= boneBounds.z1) return 0;   // crypt/chamber floor, flat regardless of the mound above
      if (Math.hypot(x - ix, z - iz) <= r) return 0.2;
      return null;
    },
    update(time, dt) {
      boneLight.intensity = 2.0 + Math.sin(time * 2) * 0.5;
      for (const w of wisps) {
        w.phase += dt * 0.6;
        w.m.position.set(w.cx + Math.sin(w.phase) * 2.5, 1.4 + Math.sin(w.phase * 1.7) * 0.5, w.cz + Math.cos(w.phase * 0.8) * 2.5);
        w.m.material.opacity = 0.5 + Math.sin(w.phase * 3) * 0.25;
      }
    },
  };
}
