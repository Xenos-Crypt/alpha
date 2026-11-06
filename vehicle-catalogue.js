// Every vehicle you can buy, with real stats. The stats change how it drives:
//   Acceleration → how hard it pulls, Top speed → its maximum, Brakes → stopping power,
//   Handling → how sharply it steers. Ratings are 0–100 so the shop can filter and sort them.
export const CAR_CATS = ['Hatchback', 'Saloon', 'SUV', 'Sports car', 'Supercar', 'Electric', 'Pickup'];
export const BIKE_CATS = ['Bicycle', 'Motorbike'];
export const AIR_CATS = ['Helicopter', 'Plane'];

const C = (id, name, category, style, price, mph, accel, brakes, handling, desc, extra = {}) => ({ id, name, category, kind: 'car', style, price, mph, accel, brakes, handling, desc, ...extra });
export const CATALOGUE = [
  C('pixie', 'Pixie 1.2', 'Hatchback', 'hatch', 450, 90, 40, 55, 72, 'Cheap, nippy city runabout.'),
  C('zest', 'Zest GT', 'Hatchback', 'hatch', 720, 118, 62, 66, 80, 'A hot hatch: small and quick.'),
  C('comfort', 'Ashford Comfort', 'Saloon', 'saloon', 600, 110, 50, 60, 60, 'Comfortable family saloon.'),
  C('meridian', 'Meridian Executive', 'Saloon', 'saloon', 1450, 142, 68, 76, 66, 'Quiet, fast executive car.'),
  C('trailhawk', 'Trailhawk', 'SUV', 'suv', 760, 100, 45, 55, 44, 'Tall, tough and roomy.', { health: 130 }),
  C('summit', 'Summit 4x4', 'SUV', 'suv', 1300, 116, 56, 66, 52, 'Off-road ready, high seating.', { health: 140 }),
  C('atlas', 'Range Atlas', 'SUV', 'suv', 2600, 136, 67, 74, 58, 'Luxury SUV with serious power.', { health: 150 }),
  C('viper', 'Viper RS', 'Sports car', 'sports', 1150, 155, 78, 80, 82, 'Low, loud and sharp to drive.'),
  C('kestrel', 'Kestrel GT', 'Sports car', 'sports', 1850, 170, 84, 86, 87, 'Grand tourer: fast and composed.'),
  C('aurora', 'Aurora V12', 'Supercar', 'supercar', 3200, 205, 95, 92, 88, 'Mid-engined V12 monster.'),
  C('phantom', 'Phantom X', 'Supercar', 'supercar', 5200, 228, 99, 96, 93, 'The fastest thing on the road.'),
  C('volt', 'Volt City', 'Electric', 'electric', 560, 96, 62, 60, 70, 'Silent, cheap to run, long range.', { battery: 2 }),
  C('tesseract', 'Tesseract S', 'Electric', 'electric', 2450, 165, 97, 84, 80, 'Instant torque. Huge battery.', { battery: 2.5 }),
  C('workhorse', 'Workhorse', 'Pickup', 'pickup', 680, 96, 40, 50, 42, 'Open load bed, built like a tank.', { health: 130 }),
  C('raptorhd', 'Raptor HD', 'Pickup', 'pickup', 1550, 122, 60, 64, 50, 'Big pickup with a big engine.', { health: 150 }),
  { id: 'citybike', name: 'City bicycle', category: 'Bicycle', kind: 'bicycle', price: 60, mph: 18, accel: 20, brakes: 45, handling: 62, desc: 'No licence needed.' },
  { id: 'mtb', name: 'Mountain bike', category: 'Bicycle', kind: 'bicycle', price: 110, mph: 22, accel: 30, brakes: 60, handling: 72, desc: 'Fat tyres for any ground.' },
  { id: 'roadbike', name: 'Racing bicycle', category: 'Bicycle', kind: 'bicycle', price: 190, mph: 30, accel: 42, brakes: 52, handling: 66, desc: 'Light and fast.' },
  { id: 'scooter', name: 'Scooter', category: 'Motorbike', kind: 'motorcycle', price: 280, mph: 50, accel: 36, brakes: 46, handling: 76, desc: 'Motorbike licence needed.' },
  { id: 'street', name: 'Street motorbike', category: 'Motorbike', kind: 'motorcycle', price: 460, mph: 112, accel: 70, brakes: 64, handling: 80, desc: 'Motorbike licence needed.' },
  { id: 'superbike', name: 'Superbike', category: 'Motorbike', kind: 'motorcycle', price: 950, mph: 185, accel: 96, brakes: 86, handling: 88, desc: 'Motorbike licence needed. Hold on tight.' },
  { id: 'heli-light', name: 'Light helicopter', category: 'Helicopter', kind: 'heli', price: 3500, mph: 120, accel: 55, brakes: 60, handling: 70, desc: 'Takes off anywhere. Pilot licence needed.' },
  { id: 'heli-exec', name: 'Executive helicopter', category: 'Helicopter', kind: 'heli', price: 6200, mph: 160, accel: 70, brakes: 66, handling: 78, desc: 'Fast, smooth, leather seats.' },
  { id: 'prop', name: 'Light prop plane', category: 'Plane', kind: 'plane', price: 4000, mph: 115, accel: 45, brakes: 40, handling: 72, desc: 'Needs a runway. Pilot licence needed.', plane: { takeoff: 22, turn: 0.95, jet: false } },
  { id: 'pjet', name: 'Private jet', category: 'Plane', kind: 'plane', price: 12500, mph: 240, accel: 80, brakes: 45, handling: 60, desc: 'Needs a runway. Pilot licence needed.', plane: { takeoff: 34, turn: 0.75, jet: true } },
];
export const COLOURS = [0xd0281f, 0x2f6f8f, 0xf2f2f2, 0x22262b, 0xffd23f, 0x2d5d3a, 0x8a5cff, 0xff7a1f];

const topStat = mph => Math.min(100, Math.round(mph / 2.4));
export function marketItems(cats, { priceMult = 1, tag = '' } = {}) {
  return CATALOGUE.filter(e => cats.includes(e.category)).map(e => ({
    id: e.id, entry: e, name: e.name, category: e.category, price: Math.round(e.price * priceMult / 5) * 5, colours: COLOURS,
    icon: { Hatchback: '🚗', Saloon: '🚘', SUV: '🚙', 'Sports car': '🏎️', Supercar: '🏎️', Electric: '🔋', Pickup: '🛻', Bicycle: '🚲', Motorbike: '🏍️', Helicopter: '🚁', Plane: '✈️' }[e.category],
    desc: (tag ? tag + ' ' : '') + e.desc,
    stats: { Acceleration: e.accel, 'Top speed': topStat(e.mph), Brakes: e.brakes, Handling: e.handling },
  }));
}
// Turn the ratings into the multipliers the driving code uses.
export function applyStats(v, e) {
  v.stats = { accel: 0.55 + e.accel / 100, brake: 0.6 + e.brakes / 100, handling: 0.65 + e.handling / 100 * 0.7 };
  v.maxSpeed = e.kind === 'heli' ? e.mph * 0.33 : e.kind === 'plane' ? e.mph * 0.42 : e.mph * 0.6;
  if (e.health) v.health = e.health;
  if (e.battery) v.batteryCapacity = e.battery;
  v.modelName = e.name;
  return v;
}
