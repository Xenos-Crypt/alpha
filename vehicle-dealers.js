// Places to buy vehicles other than cars:
//   Ashford Cycle & Motor (next to the Ashford car showrooms): bicycles and motorbikes.
//   Skyline Aviation (by the airfield): helicopters and aeroplanes. What you buy is waiting
//   for you on the helipad / apron outside, ready to fly (a pilot licence keeps it legal).
import * as THREE from 'three';

export const BIKES = [
  { name: 'City bicycle', kind: 'bicycle', price: 60, color: 0x2f6f8f },
  { name: 'Mountain bike', kind: 'bicycle', price: 110, color: 0x2d5d3a, speed: 1.2 },
  { name: 'Racing bicycle', kind: 'bicycle', price: 180, color: 0xd0281f, speed: 1.4 },
  { name: 'Scooter (motorbike)', kind: 'motorcycle', price: 280, color: 0xf2f2f2, speed: 0.8 },
  { name: 'Street motorbike', kind: 'motorcycle', price: 450, color: 0x22262b },
  { name: 'Superbike', kind: 'motorcycle', price: 900, color: 0xffd23f, speed: 1.35 },
];
export const AIRCRAFT_FOR_SALE = [
  { name: 'Light helicopter', heli: true, price: 3500, color: 0x2f6f8f },
  { name: 'Executive helicopter', heli: true, price: 6000, color: 0x111111, speed: 1.3 },
  { name: 'Light prop plane', price: 4000, color: 0xf5f6fa, accent: 0x2f6f8f, maxSpeed: 50, takeoff: 22, turn: 0.95, jet: false },
  { name: 'Private jet', price: 12000, color: 0xe8edf0, accent: 0xd4af37, maxSpeed: 105, takeoff: 34, turn: 0.75, jet: true },
];

export function buildVehicleDealers({ openVehicleShop, scene, colliders, interactables, makeTex, makePerson, makeVehicle, makeHelicopter, makeAircraft, toast, money, sign, shopPanel, destinations, groundY, registerOwned }) {
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.1, transparent: o.opacity != null, opacity: o.opacity ?? 1, depthWrite: o.opacity == null });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, x, y, z, m, solid = false) => { const b = new THREE.Mesh(geo, m instanceof THREE.Material ? m : mat(m)); b.scale.set(w, h, d); b.position.set(x, y, z); scene.add(b); if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); return b; };
  // a glass-fronted showroom, open side facing -z
  function showroom(x, z, name, floor = 0xe9ecef) {
    B(24, 0.2, 22, x, 0.15, z, floor); B(24, 0.3, 22, x, 5.6, z, 0x2a3640);
    B(24, 5.2, 0.3, x, 2.7, z + 11, 0xdfe5ea, true); for (const s of [-1, 1]) B(0.3, 5.2, 22, x + s * 12, 2.7, z, 0xdfe5ea, true);
    for (const s of [-1, 1]) { B(9.5, 4.6, 0.08, x + s * 7, 2.45, z - 11, mat(0x9fd3ff, { opacity: 0.28, metal: 0.6, rough: 0.05 })); colliders.push({ minX: x + s * 7 - 4.75, maxX: x + s * 7 + 4.75, minZ: z - 11.1, maxZ: z - 10.9 }); }
    sign?.(name, x, 4.9, z - 11.2, 14);
    const rep = makePerson?.({ outfit: 0x1a2a3a, pants: 0x1a1a1a, hair: 0x2b1d14 }); if (rep) { rep.root.position.set(x, 0.2, z + 8); rep.root.rotation.y = Math.PI; scene.add(rep.root); }
    B(3.4, 1.1, 1, x, 0.75, z + 7, 0x2a3640);
  }
  // the shop panel takes the gold; onBuy hands over the vehicle
  const canAfford = price => money() >= price;

  // ---------------- bike shop
  const BX = 180, BZ = -100;
  showroom(BX, BZ, 'ASHFORD CYCLE & MOTOR');
  const display = [];
  BIKES.forEach((b, i) => { const v = makeVehicle(b.kind, b.color); v.group.position.set(BX - 8 + (i % 3) * 8, 0.25, BZ - 2 + Math.floor(i / 3) * 6); v.group.rotation.y = Math.PI * 0.85; v.noSteal = true; v.displayCar = true; v.ai = { parked: true }; display.push(v); });
  let bikeSpot = 0;
  interactables.push({ pos: new THREE.Vector3(BX, 0.2, BZ - 9), r: 4, label: 'Browse bicycles and motorbikes', action: () => openVehicleShop('Ashford Cycle & Motor', ['Bicycle', 'Motorbike'], v => { const x = BX - 8 + (bikeSpot++ % 5) * 4, z = BZ - 16; v.group.position.set(x, groundY(x, z), z); v.group.rotation.y = Math.PI; }) });
  destinations?.push({ name: 'Ashford Cycle & Motor (bikes)', x: BX, z: BZ - 16 });

  // ---------------- aviation sales
  const AX = -650, AZ = -150;
  showroom(AX, AZ, 'SKYLINE AVIATION', 0xd9dde0);
  // a model helicopter in the showroom, a helipad and an apron outside
  const padX = -600, padZ = -200;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.16, 32), [mat(0x3a3f45), new THREE.MeshStandardMaterial({ map: makeTex(128, 128, g => { g.fillStyle = '#2b2f33'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#f2c14e'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 64, 68); }) }), mat(0x3a3f45)]);
  pad.position.set(padX, 0.08, padZ); scene.add(pad);
  B(30, 0.06, 18, padX + 30, 0.05, padZ, 0x55595c);   // apron for planes
  const showHeli = makeHelicopter?.({ name: 'Showroom helicopter', color: 0xd0281f, x: AX - 4, z: AZ + 1, yaw: Math.PI * 0.8 }); if (showHeli) { showHeli.noSteal = true; showHeli.displayCar = true; showHeli.locked = true; }
  let planeSpot = 0;
  interactables.push({ pos: new THREE.Vector3(AX, 0.2, AZ - 9), r: 4, label: 'Browse helicopters and planes', action: () => openVehicleShop('Skyline Aviation', ['Helicopter', 'Plane'], (v, e) => {
    if (e.kind === 'heli') { v.group.position.set(padX, groundY(padX, padZ), padZ); v.group.rotation.y = Math.PI; }
    else { const x = padX + 22 + (planeSpot++ % 2) * 14; v.group.position.set(x, 0, padZ); v.group.rotation.y = 0; }
  }) });
  destinations?.push({ name: 'Skyline Aviation (helicopters & planes)', x: AX, z: AZ - 16 });
  return { display };
}
