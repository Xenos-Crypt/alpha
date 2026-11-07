// Buying buildings.
//   Ashford Property Centre (estate agent): houses, apartments, shops, offices, businesses and
//   mansions across the map, with filters (type, price, size, income, location). Shops, offices
//   and businesses pay you rent every in-game day; homes are yours to live in.
//   The Fixer (the Narrows): off-the-books hideouts. Lie low in one to shake off the police,
//   but buying one can draw attention.
import * as THREE from 'three';

const KIND = t => {
  t = (t || '').toLowerCase();
  if (/mansion|villa|estate/.test(t)) return 'Mansion';
  if (/apartment|flat|residential|dormitory/.test(t)) return 'Apartment';
  if (/home|house|cottage/.test(t)) return 'House';
  if (/shop|store|supermarket|market|pharmacy|bakery|butcher|convenience|retail|boutique/.test(t)) return 'Shop';
  if (/pub|bar|restaurant|cafe|nightclub|club|casino|arcade|hotel/.test(t)) return 'Business';
  if (/office|cyber|company|bank|corporate|tower/.test(t)) return 'Office';
  return null;   // public buildings (police, hospital, school, council, church…) aren't for sale
};
const BASE = { House: [1800, 3], Apartment: [1100, 2], Shop: [2600, 4], Office: [4200, 5], Business: [6500, 6], Mansion: [22000, 10] };
const INCOME = { House: 0, Apartment: 30, Shop: 45, Office: 75, Business: 120, Mansion: 0 };
const ICON = { House: '🏠', Apartment: '🏢', Shop: '🏪', Office: '🏬', Business: '🍸', Mansion: '🏰', Hideout: '🕳️' };
export const HIDEOUTS = [
  { id: 'lockup', name: 'Narrows lock-up', price: 900, dx: -14, dz: -52, desc: 'A garage with a mattress in it. Nobody asks questions.' },
  { id: 'laundrette', name: 'Room above the laundrette', price: 1400, dx: 14, dz: 46, desc: 'Steam, noise and a back exit onto the alley.' },
  { id: 'warehouse', name: 'Warehouse loft', price: 2600, dx: -14, dz: 92, desc: 'Big, dark, three ways out.' },
  { id: 'bunker', name: 'Old storm bunker', price: 4200, dx: 14, dz: -96, desc: 'Steel door, cot, canned food. The best place to vanish.' },
];

export function createProperty({ scene, buildings, market, interactables, toast, money, spend, earn, playerPos, day, wanted, clearWanted, raiseWanted, narrows, groundY, sign, makePerson, colliders, timeSkip }) {
  const owned = new Set();         // building names / hideout ids
  const markers = new Map();
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x22ff88, transparent: true, opacity: 0.65 });
  const area = b => Math.round((b.maxX - b.minX) * (b.maxZ - b.minZ));
  // Buildings keep being added while the city loads (houses come in late), so the listings are
  // rebuilt whenever the building list has grown.
  const cx = b => b.x ?? (b.minX + b.maxX) / 2, cz = b => b.z ?? (b.minZ + b.maxZ) / 2;
  let listed = [], listedCount = -1;
  const getListings = () => { if (buildings.length !== listedCount) { listedCount = buildings.length; listed = makeListings(); } return listed; };
  const makeListings = () => buildings.filter(b => b.minX != null && Math.abs(cx(b)) < 4000 && Math.abs(cz(b)) < 4000 && KIND(b.type)).map(b => {
    const kind = KIND(b.type), [base, per] = BASE[kind], a = area(b), central = Math.max(0, 100 - Math.hypot(cx(b), cz(b)) / 12);
    const price = Math.round((base + a * per) * (0.75 + central / 200) / 50) * 50;
    return { b, kind, price, size: Math.min(100, Math.round(a / 12)), income: INCOME[kind], location: Math.round(central) };
  });
  function mark(b) {
    if (markers.has(b.name)) return;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), beaconMat); m.position.set(cx(b), (b.top || 12) + 4, cz(b)); scene.add(m); markers.set(b.name, m);
  }
  function openShop(which = 'legal') {
    if (which === 'illegal') {
      market.open('The Fixer: off-the-books property', HIDEOUTS.map(h => ({ id: h.id, name: h.name, icon: ICON.Hideout, category: 'Hideout', price: h.price, desc: h.desc + ' Lie low here to lose the police.', sold: owned.has(h.id), stats: { Safety: Math.min(100, Math.round(h.price / 45)), Size: Math.round(h.price / 60) } })), item => {
        if (money() < item.price) { toast('Not enough gold.'); return false; }
        spend(item.price); owned.add(item.id); buildHideout(HIDEOUTS.find(h => h.id === item.id));
        toast(`🕳️ ${item.name} is yours. No paperwork, no questions. Go there and lie low when the heat is on.`);
        if (Math.random() < 0.15) { raiseWanted(45); toast('🚨 Someone saw the cash change hands. The police are curious.'); }
      }, { tag: 'BLACK MARKET' });
      return;
    }
    market.open('Ashford Property Centre: buildings for sale', getListings().map(l => ({ id: l.b.name, name: l.b.name, icon: ICON[l.kind], category: l.kind, price: l.price, sold: owned.has(l.b.name),
      desc: l.income ? `Pays ${l.income} gold rent a day.` : l.kind === 'Mansion' ? 'A gated estate at the top of Highcliff Hills.' : 'A place to call home.',
      stats: { Size: l.size, Income: Math.min(100, Math.round(l.income / 1.2)), Location: l.location } })), item => {
      if (money() < item.price) { toast('Not enough gold.'); return false; }
      const l = getListings().find(x => x.b.name === item.id);
      spend(item.price); owned.add(l.b.name); mark(l.b);
      toast(`${ICON[l.kind]} You bought ${l.b.name}!${l.income ? ` It pays ${l.income} gold rent every day.` : ' The keys are yours.'} (Marked with a green diamond.)`);
    }, { categories: ['All', 'House', 'Apartment', 'Shop', 'Office', 'Business', 'Mansion'] });
  }
  // hideouts: a steel door in an alley with a "lie low" action
  const hideoutSpots = new Map();
  function buildHideout(h) {
    if (!narrows || hideoutSpots.has(h.id)) return;
    const x = narrows.x + h.dx, z = narrows.z + h.dz, y = groundY ? groundY(x, z, 0) : 0;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.6, roughness: 0.5 })); door.position.set(x, y + 1.2, z); scene.add(door);
    const spot = { pos: new THREE.Vector3(x, y + 0.3, z), r: 2.5, label: `Lie low in your hideout (${h.name})`, action: () => {
      if (wanted() <= 0) { toast('You rest in your hideout for a bit. Nobody knows you\'re here.'); return; }
      timeSkip?.(1 / 24); clearWanted(); toast(`🕳️ You lie low in ${h.name} for an hour. The police lose your trail.`);
    } };
    interactables.push(spot); hideoutSpots.set(h.id, spot);
  }
  // rent comes in once per in-game day
  let lastDay = null;
  function update() {
    const d = Math.floor(day());
    if (lastDay == null) { lastDay = d; return; }
    if (d <= lastDay) return;
    const days = d - lastDay; lastDay = d;
    let total = 0, n = 0;
    for (const l of getListings()) if (owned.has(l.b.name) && l.income) { total += l.income * days; n++; }
    if (total) { earn(total); toast(`🏦 Rent day: +${total} gold from ${n} propert${n === 1 ? 'y' : 'ies'}.`); }
  }
  // the estate agent's office
  if (sign) {
    const x = 220, z = -100, mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
    const box = (w, h, d, px, py, pz, c, solid) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(px, py, pz); scene.add(m); if (solid) colliders.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2 }); };
    box(24, 0.2, 22, x, 0.15, z, 0xf2efe8); box(24, 0.3, 22, x, 5.6, z, 0x2f4a3a);
    box(24, 5.2, 0.3, x, 2.7, z + 11, 0xe8e2d6, true); for (const s of [-1, 1]) box(0.3, 5.2, 22, x + s * 12, 2.7, z, 0xe8e2d6, true);
    for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.BoxGeometry(9.5, 4.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.28, depthWrite: false })); g.position.set(x + s * 7, 2.45, z - 11); scene.add(g); colliders.push({ minX: x + s * 7 - 4.75, maxX: x + s * 7 + 4.75, minZ: z - 11.1, maxZ: z - 10.9 }); }
    sign('ASHFORD PROPERTY CENTRE', x, 4.9, z - 11.2, 14);
    for (let i = 0; i < 6; i++) box(1.6, 1.1, 0.05, x - 10 + (i % 3) * 2 + 0.3, 2 + Math.floor(i / 3) * 1.4, z + 10.8, [0xd9c9a8, 0xb8d0e0, 0xc8e0b8][i % 3]);   // listings in the window
    box(3.4, 1.1, 1, x, 0.75, z + 6, 0x2f4a3a);
    const agent = makePerson?.({ outfit: 0x2f4a3a, pants: 0x1a1a1a, hair: 0x8a5a2a }); if (agent) { agent.root.position.set(x, 0.2, z + 7); agent.root.rotation.y = Math.PI; scene.add(agent.root); }
    interactables.push({ pos: new THREE.Vector3(x, 0.2, z - 9), r: 4, label: 'Browse buildings for sale (estate agent)', action: () => openShop('legal') });
  }
  return {
    openShop, update, owns: name => owned.has(name),
    snapshot: () => [...owned],
    restore(list) { if (!Array.isArray(list)) return; for (const id of list) { owned.add(id); const l = getListings().find(x => x.b.name === id); if (l) mark(l.b); const h = HIDEOUTS.find(x => x.id === id); if (h) buildHideout(h); } },
  };
}
