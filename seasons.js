// SEASONS AND HOLIDAYS: the world follows the real calendar on the player's device.
// - Seasons change the weather (snow mostly in winter, more rain in autumn, none in summer) and the colour
//   of the leaves and grass (fresh in spring, golden-orange in autumn, frosted in winter).
// - Holidays dress the city: Christmas trees and lights, Valentine hearts, Easter eggs, Halloween pumpkins,
//   and fireworks on New Year's Eve and Bonfire Night. Everything is instanced so it costs very little.
// For testing, ?debug&date=2026-12-25 pretends it's that day.
import * as THREE from 'three';
import { makeBotany } from './botany.js';

// Easter Sunday (Anonymous Gregorian algorithm). Returns [month 1-12, day].
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1];
}

const dayOfYear = d => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);

// What the calendar says today: the season and any holidays in their decorating window.
export function calendar(d = new Date()) {
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
  const season = m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
  const on = (m0, d0, m1, d1) => { const a = m0 * 100 + d0, b = m1 * 100 + d1, x = m * 100 + day; return a <= b ? x >= a && x <= b : x >= a || x <= b; };
  const [em, ed] = easter(y), eDay = dayOfYear(new Date(y, em - 1, ed)), today = dayOfYear(d);
  const holidays = [];
  if (on(12, 1, 1, 6)) holidays.push('christmas');
  if (on(12, 31, 1, 1)) holidays.push('newyear');
  if (on(2, 7, 2, 14)) holidays.push('valentine');
  if (today >= eDay - 7 && today <= eDay + 1) holidays.push('easter');
  if (on(10, 20, 10, 31)) holidays.push('halloween');
  if (on(11, 4, 11, 6)) holidays.push('bonfire');
  return { season, holidays };
}

// Weather each season can bring, in the order it cycles.
export const SEASON_WEATHER = {
  winter: ['clear', 'snow', 'clear', 'rain', 'clear', 'snow'],
  spring: ['clear', 'rain', 'clear', 'clear'],
  summer: ['clear', 'clear', 'rain', 'clear'],
  autumn: ['clear', 'rain', 'clear', 'rain'],
};
// Leaf and grass tint: [r, g, b, how strongly]
export const SEASON_TINT = { spring: [0.55, 0.85, 0.35, 0.25], summer: [0, 0, 0, 0], autumn: [0.85, 0.45, 0.12, 0.7], winter: [0.82, 0.86, 0.85, 0.45] };

const GREETING = {
  christmas: '🎄 Christmas has come to the city: trees, lights and decorations are up.',
  newyear: '🎆 It\'s New Year: fireworks over the city tonight.',
  valentine: '💘 Valentine\'s week: hearts and roses are all over town.',
  easter: '🐣 Easter: look out for painted eggs in the gardens.',
  halloween: '🎃 Halloween: pumpkins glow on the doorsteps after dark.',
  bonfire: '🎇 Bonfire Night: fireworks light up the sky after dark.',
};

// Shared shader hook: tints only leafy (green) colours, so trunks and branches keep their colour.
export function seasonalFoliage(material, tint) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.call(material, sh, r);
    sh.uniforms.uSeasonTint = tint;
    sh.fragmentShader = 'uniform vec4 uSeasonTint;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float green = diffuseColor.g - max(diffuseColor.r, diffuseColor.b);
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, uSeasonTint.rgb * (0.55 + lum * 1.2), uSeasonTint.a * smoothstep(0.0, 0.08, green)); }`);
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => (key ? key() : '') + '|season';
  material.needsUpdate = true;
}


// The holiday markets: what each stall sells. Items marked gift go into your bag; food and drink are used straight away.
const MARKET = {
  christmas: { bg: '#8b1e1e', roof: 0xf4f7fb, fair: 'WINTER WONDERLAND', fairSub: 'rides · ice · Christmas lights', host: { label: "Santa's Grotto", outfit: 0xd62828, items: [{ name: 'Photo with Santa', icon: '🎅', price: 5, energy: 15 }, { name: 'Present from the sack', icon: '🎁', price: 8, gift: true }] },
    stalls: [
      { name: 'Toys & Gifts', sub: 'for everyone you love', outfit: 0x2b8a3e, items: [{ name: 'Teddy bear', icon: '🧸', price: 12, gift: true }, { name: 'Wooden toy train', icon: '🚂', price: 18, gift: true }, { name: 'Wrapped gift box', icon: '🎁', price: 10, gift: true }, { name: 'Board game', icon: '🎲', price: 15, gift: true }] },
      { name: 'Hot Drinks', sub: 'mulled · cocoa · eggnog', outfit: 0x8b1e1e, items: [{ name: 'Hot chocolate', icon: '☕', price: 3, energy: 14 }, { name: 'Mulled wine', icon: '🍷', price: 4, energy: 10 }, { name: 'Eggnog', icon: '🥛', price: 3, energy: 10 }] },
      { name: 'Christmas Treats', sub: 'gingerbread · mince pies', outfit: 0xc92a2a, items: [{ name: 'Gingerbread man', icon: '🍪', price: 2, hunger: 8 }, { name: 'Mince pie', icon: '🥧', price: 2, hunger: 10 }, { name: 'Candy cane', icon: '🍬', price: 1, energy: 5 }, { name: 'Roasted chestnuts', icon: '🌰', price: 3, hunger: 12 }] },
      { name: 'Decorations', sub: 'baubles · lights · jumpers', outfit: 0x1864ab, items: [{ name: 'Bauble set', icon: '🔴', price: 8, gift: true }, { name: 'Fairy lights', icon: '✨', price: 9, gift: true }, { name: 'Christmas wreath', icon: '💚', price: 11, gift: true }, { name: 'Christmas jumper', icon: '🧶', price: 20, gift: true }] },
      { name: 'Christmas Dinner', sub: 'roast · pudding', outfit: 0x5c3d2e, items: [{ name: 'Turkey roll', icon: '🦃', price: 7, hunger: 40 }, { name: 'Christmas pudding', icon: '🍮', price: 4, hunger: 20 }, { name: 'Pigs in blankets', icon: '🌭', price: 4, hunger: 18 }] },
      { name: 'Cards & Wrapping', sub: 'cards · paper · ribbons', outfit: 0xe8590c, items: [{ name: 'Christmas card', icon: '💌', price: 2, gift: true }, { name: 'Wrapping paper', icon: '🎀', price: 3, gift: true }] },
    ] },
  valentine: { bg: '#a61e4d', roof: 0xff8fb1, fair: 'LOVE LANE FAIR', fairSub: 'rides for two', centre: 'heart', host: { label: 'Love Lock Bridge', outfit: 0xe64980, items: [{ name: 'Love lock', icon: '🔒', price: 6, gift: true }, { name: 'Couple photo', icon: '📸', price: 5, energy: 12 }] },
    stalls: [
      { name: 'Roses & Flowers', sub: 'red roses · tulips', outfit: 0xc2255c, items: [{ name: 'Single red rose', icon: '🌹', price: 3, gift: true }, { name: 'Dozen roses', icon: '💐', price: 25, gift: true }, { name: 'Tulips', icon: '🌷', price: 8, gift: true }] },
      { name: 'Chocolates', sub: 'truffles · hearts', outfit: 0x5c3d2e, items: [{ name: 'Heart box of chocolates', icon: '🍫', price: 12, gift: true }, { name: 'Chocolate strawberries', icon: '🍓', price: 5, energy: 12 }, { name: 'Truffle', icon: '🍬', price: 2, energy: 6 }] },
      { name: 'Cards & Gifts', sub: 'for your valentine', outfit: 0xe64980, items: [{ name: 'Valentine card', icon: '💌', price: 2, gift: true }, { name: 'Heart necklace', icon: '💝', price: 30, gift: true }, { name: 'Teddy with a heart', icon: '🧸', price: 14, gift: true }] },
      { name: 'Sweet Treats', sub: 'cupcakes · macarons', outfit: 0xf783ac, items: [{ name: 'Red velvet cupcake', icon: '🧁', price: 3, hunger: 10 }, { name: 'Macarons', icon: '🍪', price: 4, energy: 8 }, { name: 'Pink lemonade', icon: '🍹', price: 2, energy: 8 }] },
    ] },
  easter: { bg: '#5f3dc4', roof: 0xfff3b0, fair: 'SPRING FAIR', fairSub: 'egg hunt · rides', centre: 'egg', host: { label: 'Easter Bunny', outfit: 0xffffff, items: [{ name: 'Egg hunt ticket', icon: '🐣', price: 2, energy: 10 }, { name: 'Bunny ears', icon: '🐰', price: 4, gift: true }] },
    stalls: [
      { name: 'Chocolate Eggs', sub: 'big · small · filled', outfit: 0x5c3d2e, items: [{ name: 'Chocolate egg', icon: '🥚', price: 4, gift: true }, { name: 'Mini eggs', icon: '🍬', price: 2, energy: 6 }, { name: 'Chocolate bunny', icon: '🐰', price: 5, gift: true }] },
      { name: 'Hot Cross Buns', sub: 'fresh from the oven', outfit: 0xe8590c, items: [{ name: 'Hot cross bun', icon: '🥯', price: 2, hunger: 12 }, { name: 'Simnel cake slice', icon: '🍰', price: 3, hunger: 14 }] },
      { name: 'Spring Flowers', sub: 'daffodils · lilies', outfit: 0xfab005, items: [{ name: 'Daffodils', icon: '🌼', price: 4, gift: true }, { name: 'Easter lilies', icon: '🌸', price: 7, gift: true }] },
      { name: 'Egg Painting', sub: 'paint your own', outfit: 0x7048e8, items: [{ name: 'Paint an egg', icon: '🎨', price: 3, energy: 12 }, { name: 'Painted egg', icon: '🥚', price: 4, gift: true }] },
    ] },
  halloween: { bg: '#1c1c1c', roof: 0x5f3dc4, fair: 'FRIGHT NIGHT', fairSub: 'haunted rides · after dark', centre: 'pumpkin', host: { label: 'Haunted House', outfit: 0x222222, items: [{ name: 'Haunted house ticket', icon: '👻', price: 5, energy: 15 }] },
    stalls: [
      { name: 'Costumes', sub: 'witch · vampire · ghost', outfit: 0x5f3dc4, items: [{ name: 'Witch hat', icon: '🧙', price: 8, gift: true }, { name: 'Vampire cape', icon: '🧛', price: 12, gift: true }, { name: 'Ghost costume', icon: '👻', price: 10, gift: true }, { name: 'Skull mask', icon: '💀', price: 9, gift: true }] },
      { name: 'Trick or Treat', sub: 'sweets for the kids', outfit: 0xe8590c, items: [{ name: 'Bag of sweets', icon: '🍬', price: 3, energy: 10 }, { name: 'Toffee apple', icon: '🍎', price: 2, energy: 8 }, { name: 'Candy corn', icon: '🌽', price: 1, energy: 4 }] },
      { name: 'Pumpkin Patch', sub: 'pick your pumpkin', outfit: 0xd9480f, items: [{ name: 'Pumpkin', icon: '🎃', price: 5, gift: true }, { name: 'Pumpkin soup', icon: '🥣', price: 3, hunger: 18 }, { name: 'Pumpkin pie', icon: '🥧', price: 3, hunger: 14 }] },
      { name: 'Spooky Drinks', sub: 'hot cider · potions', outfit: 0x2b8a3e, items: [{ name: 'Hot apple cider', icon: '🍵', price: 3, energy: 12 }, { name: 'Witch\'s brew', icon: '🧪', price: 4, energy: 14 }] },
    ] },
  newyear: { bg: '#1c1c1c', roof: 0xffe8a3, fair: 'NEW YEAR FAIR', fairSub: 'countdown at midnight', centre: 'star', host: { label: 'Countdown Party', outfit: 0xffd43b, items: [{ name: 'Party hat', icon: '🥳', price: 2, gift: true }, { name: 'Sparkling grape juice', icon: '🥂', price: 3, energy: 10 }] },
    stalls: [
      { name: 'Party Shop', sub: 'hats · poppers · sparklers', outfit: 0xffd43b, items: [{ name: 'Party popper', icon: '🎉', price: 1, energy: 4 }, { name: 'Sparklers', icon: '🎇', price: 3, gift: true }, { name: 'Noise maker', icon: '📯', price: 2, gift: true }] },
      { name: 'Midnight Snacks', sub: 'hot food all night', outfit: 0xe8590c, items: [{ name: 'Hot dog', icon: '🌭', price: 3, hunger: 20 }, { name: 'Doughnuts', icon: '🍩', price: 2, hunger: 10 }, { name: 'Hot chocolate', icon: '☕', price: 3, energy: 14 }] },
    ] },
  bonfire: { bg: '#5c2b0a', roof: 0xff9f43, fair: 'BONFIRE NIGHT', fairSub: 'fireworks after dark', centre: 'star', host: { label: 'Bonfire', outfit: 0xd9480f, items: [{ name: 'Sparklers', icon: '🎇', price: 3, gift: true }] },
    stalls: [
      { name: 'Bonfire Food', sub: 'toffee apples · parkin', outfit: 0xd9480f, items: [{ name: 'Toffee apple', icon: '🍎', price: 2, energy: 8 }, { name: 'Parkin', icon: '🍰', price: 2, hunger: 10 }, { name: 'Jacket potato', icon: '🥔', price: 4, hunger: 30 }] },
      { name: 'Hot Drinks', sub: 'cocoa · cider', outfit: 0x8b1e1e, items: [{ name: 'Hot chocolate', icon: '☕', price: 3, energy: 14 }, { name: 'Hot apple cider', icon: '🍵', price: 3, energy: 12 }] },
    ] },
};

export function createSeasons(ctx) {
  const params = new URLSearchParams(location.search);
  const forced = params.has('debug') && params.get('date');
  const now = forced ? new Date(forced + 'T12:00:00') : new Date();
  const cal = calendar(now);
  const root = new THREE.Group(); root.name = 'seasonal decorations'; ctx.scene.add(root);
  // every decoration, stall and helper gets an ID (world-ids.js); fireworks are only sparks, so they don't
  const bot = makeBotany(ctx, 'the city'), DEC = 'Westhaven Parks & Gardens';
  const tag = (kind, mat, name, x, z, maker = DEC, owner = 'GOV', cls = 'PRD') => bot.fixture(cls, kind, mat, maker, name, x, z, owner);
  const tint = ctx.tint;   // { value: Vector4 } shared with the tree and grass materials
  const t = SEASON_TINT[cal.season]; tint.value.set(t[0], t[1], t[2], t[3]);

  // ---- building blocks ----
  const unlit = c => new THREE.MeshBasicMaterial({ color: c });
  // many small glowing bulbs in one draw call, each with its own colour
  function bulbs(points, colors, size = 0.07) {
    if (!points.length) return null;
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), points.length);
    const o = new THREE.Object3D(), c = new THREE.Color();
    points.forEach((p, i) => { o.position.copy(p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(colors[i % colors.length])); });
    m.frustumCulled = false; root.add(m); twinkle.push(m); return m;
  }
  function instanced(geo, mat, places) {
    if (!places.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, places.length), o = new THREE.Object3D();
    places.forEach((p, i) => { o.position.set(p.x, p.y, p.z); o.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0); o.scale.setScalar(p.s || 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.frustumCulled = false; root.add(m); return m;
  }
  const twinkle = [];
  // lights wound round a lamp pole (4 m tall) or a tree
  const spiral = (x, y0, z, r, h, turns, n) => Array.from({ length: n }, (_, i) => { const f = i / n, a = f * turns * Math.PI * 2; return new THREE.Vector3(x + Math.cos(a) * r * (1 - f * 0.35), y0 + f * h, z + Math.sin(a) * r * (1 - f * 0.35)); });
  const lamps = ctx.lampSpots.filter((p, i) => i % 2 === 0);   // every other lamp: enough to feel festive, cheap to draw
  const base = p => (p.y || ctx.curb);
  const home = ctx.home, eaves = [];   // the home's roof edges, front and back
  for (const z of [home.z - 5.6, home.z + 5.6]) for (let x = home.x - 6.2; x <= home.x + 6.2; x += 0.45) eaves.push(new THREE.Vector3(x, ctx.curb + 2.98, z));
  const garden = ctx.gardenTrees || [];

  // a simple dressed fir: stacked cones, a star, baubles and lights
  function christmasTree(x, y, z, h) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const green = new THREE.MeshStandardMaterial({ color: 0x1f5a32, roughness: 0.9, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.04, h * 0.05, h * 0.15, 6), new THREE.MeshStandardMaterial({ color: 0x5a3b26 }));
    trunk.position.y = h * 0.07; g.add(trunk);
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.36 - i * 0.07), h * 0.34, 8), green); c.position.y = h * (0.28 + i * 0.18); c.castShadow = true; g.add(c); }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(h * 0.05), unlit(0xffd54a)); star.position.y = h * 0.98; g.add(star);
    root.add(g);
    bulbs(spiral(x, y + h * 0.15, z, h * 0.33, h * 0.75, 5, Math.round(30 + h * 8)), [0xff3b30, 0xffd60a, 0x34c759, 0x0a84ff, 0xffffff], Math.max(0.04, h * 0.012));
    return g;
  }

  const live = cal.holidays;
  if (live.includes('christmas')) {
    bulbs(lamps.flatMap(p => spiral(p.x, base(p) + 0.4, p.z, 0.15, 3.4, 6, 22)), [0xff3b30, 0x34c759, 0xffd60a, 0xffffff], 0.05);   // every lamp's lights in one draw call
    bulbs(eaves, [0xff3b30, 0x34c759, 0xffd60a, 0x0a84ff, 0xffffff], 0.06);
    bulbs(garden.flatMap(tr => spiral(tr.x, ctx.curb + 2.2, tr.z, 1.9, 3.5, 4, 46)), [0xffd60a, 0xffffff, 0xff3b30]);
    if (ctx.livingCorner) { christmasTree(ctx.livingCorner.x, ctx.curb, ctx.livingCorner.z, 2.1); tag('XMT', 'FIR.GLS', 'Christmas tree (indoors)', ctx.livingCorner.x, ctx.livingCorner.z, 'MarketWay Retail', 'PLR'); }   // the tree indoors
    christmasTree(home.x + 4.5, ctx.curb, home.minZ - 3.2, 3.2); tag('XMT', 'FIR.GLS', 'Christmas tree (front garden)', home.x + 4.5, home.minZ - 3.2, 'MarketWay Retail', 'PLR');   // and one in the front garden
    ctx.colliders?.push({ minX: home.x + 3.9, maxX: home.x + 5.1, minZ: home.minZ - 3.8, maxZ: home.minZ - 2.6 });
    // a wreath on the front door
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 14), new THREE.MeshStandardMaterial({ color: 0x1f5a32, roughness: 0.8 }));
    wreath.position.set(home.x - 0.5, ctx.curb + 1.6, home.minZ - 0.08); root.add(wreath); tag('DEC', 'FIR', 'Christmas wreath on the front door', home.x - 0.5, home.minZ, 'MarketWay Retail', 'PLR');
    tag('DEC', 'GLS.CPR', 'Roof lights, home', home.x, home.z, 'MarketWay Retail', 'PLR'); for (const tr of garden) tag('DEC', 'GLS.CPR', 'Lights round a garden tree', tr.x, tr.z, 'MarketWay Retail', 'PLR');
    bulbs([0, 1, 2, 3, 4, 5].map(i => new THREE.Vector3(home.x - 0.5 + Math.cos(i) * 0.28, ctx.curb + 1.6 + Math.sin(i) * 0.28, home.minZ - 0.14)), [0xff3b30]);
  }
  if (live.includes('valentine')) {
    const heart = new THREE.Shape(); heart.moveTo(0, -0.5); heart.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.35); heart.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5);
    const heartGeo = new THREE.ExtrudeGeometry(heart, { depth: 0.08, bevelEnabled: false }); heartGeo.center();
    instanced(heartGeo, new THREE.MeshStandardMaterial({ color: 0xe0245e, emissive: 0x5a0a20, roughness: 0.5 }), lamps.map(p => ({ x: p.x, y: base(p) + 3.4, z: p.z + 0.12, s: 0.45 })));
    bulbs(lamps.flatMap(p => spiral(p.x, base(p) + 0.4, p.z, 0.15, 2.8, 5, 16)), [0xff2d55, 0xff9ec1, 0xffffff], 0.05);
    bulbs(eaves, [0xff2d55, 0xff9ec1], 0.06);
    instanced(heartGeo, new THREE.MeshStandardMaterial({ color: 0xff2d55, roughness: 0.5 }), [{ x: home.x - 0.5, y: ctx.curb + 1.6, z: home.minZ - 0.1, s: 0.55 }]);
  }
  if (live.includes('halloween')) {
    const pumpkinGeo = new THREE.SphereGeometry(0.32, 10, 7); pumpkinGeo.scale(1, 0.78, 1);
    const spots = [{ x: home.x - 1.6, y: ctx.curb + 0.25, z: home.minZ - 0.7 }, { x: home.x + 1.6, y: ctx.curb + 0.25, z: home.minZ - 0.7 },
      ...lamps.filter((p, i) => i % 2 === 0).map(p => ({ x: p.x + 0.45, y: base(p) + 0.25, z: p.z, ry: p.x }))];
    instanced(pumpkinGeo, new THREE.MeshStandardMaterial({ color: 0xe0701a, emissive: 0x6a2a00, roughness: 0.7 }), spots);
    bulbs(spots.map(s => new THREE.Vector3(s.x, s.y + 0.02, s.z)), [0xffa31a], 0.12);   // the candle glow inside
    bulbs(eaves, [0xff8c1a, 0x9b59ff], 0.06);
  }
  if (live.includes('easter')) {
    const egg = new THREE.SphereGeometry(0.12, 8, 6); egg.scale(1, 1.3, 1);
    const pastel = [0xffb3c7, 0xb3e5ff, 0xfff3b0, 0xc8f7c5, 0xe0c3ff];
    const eggs = []; let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const tr of garden) for (let i = 0; i < 6; i++) eggs.push({ x: tr.x + (r() - 0.5) * 4, y: ctx.curb + 0.13, z: tr.z + (r() - 0.5) * 4, rz: (r() - 0.5) * 0.6 });
    for (const p of lamps.filter((q, i) => i % 3 === 0)) eggs.push({ x: p.x + 0.5, y: base(p) + 0.13, z: p.z + 0.3, rz: 0.3 });
    pastel.forEach((c, k) => instanced(egg, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), eggs.filter((e, i) => i % pastel.length === k)));
    bulbs(eaves, pastel, 0.05);
  }

  // ================= THE WHOLE CITY: streets, buildings, the funfair and a holiday market =================
  // Every holiday has a look: colours for the lights, a motif hung over the roads, and a market with its own stalls.
  const motifGeo = {
    star: (() => { const g = new THREE.OctahedronGeometry(0.42); g.scale(1, 1, 0.3); return g; })(),
    heart: (() => { const sh = new THREE.Shape(); sh.moveTo(0, -0.5); sh.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.35); sh.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); g.center(); return g; })(),
    egg: (() => { const g = new THREE.SphereGeometry(0.3, 10, 8); g.scale(1, 1.3, 1); return g; })(),
    pumpkin: (() => { const g = new THREE.SphereGeometry(0.38, 10, 7); g.scale(1, 0.78, 1); return g; })(),
    snowflake: (() => { const g = new THREE.TorusGeometry(0.35, 0.05, 4, 6); return g; })(),
  };
  const LOOK = {
    christmas: { lights: [0xff3b30, 0x34c759, 0xffd60a, 0xffffff, 0x0a84ff], roof: 0xdff3ff, motif: ['star', 0xffd54a], motif2: ['snowflake', 0xe7f5ff] },
    valentine: { lights: [0xff2d55, 0xff9ec1, 0xffffff], roof: 0xff6b9d, motif: ['heart', 0xe0245e] },
    easter: { lights: [0xffb3c7, 0xb3e5ff, 0xfff3b0, 0xc8f7c5, 0xe0c3ff], roof: 0xfff3b0, motif: ['egg', 0xb3e5ff] },
    halloween: { lights: [0xff8c1a, 0x9b59ff, 0x69db7c], roof: 0xff8c1a, motif: ['pumpkin', 0xe0701a] },
    newyear: { lights: [0xffd60a, 0xffffff, 0xc0c0c0], roof: 0xffe8a3, motif: ['star', 0xffffff] },
    bonfire: { lights: [0xff6b00, 0xffd60a], roof: 0xff9f43, motif: ['star', 0xff9f43] },
  };
  const theme = live.find(h => LOOK[h]);
  const look = LOOK[theme];
  const lowBulb = new THREE.OctahedronGeometry(1, 0);   // 8 triangles a bulb: thousands stay cheap
  function bulbsLow(points, colors, size) {
    if (!points.length) return;
    const m = new THREE.InstancedMesh(lowBulb, new THREE.MeshBasicMaterial({ color: 0xffffff }), points.length), o = new THREE.Object3D(), c = new THREE.Color();
    points.forEach((p, i) => { o.position.copy(p); o.scale.setScalar(size); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(colors[i % colors.length])); });
    m.frustumCulled = false; root.add(m); twinkle.push(m);
  }
  const crowd = [], walkers = [];   // people at the holiday market (they count down at New Year)
  if (look) {
    // 1. garlands of lights strung across every road between facing lamp posts, sagging in the middle, with the
    //    holiday's motif hanging at the centre (a star at Christmas, a heart for Valentine's, a pumpkin at Halloween…)
    const key = (x, z) => Math.round(x) + ',' + Math.round(z), byKey = new Map(ctx.lampSpots.map(p => [key(p.x, p.z), p]));
    const lights = [], motifs = [], motifs2 = [];
    let n = 0;
    for (const p of ctx.lampSpots) for (const [dx, dz] of [[22, 0], [0, 22]]) {
      const q = byKey.get(key(p.x + dx, p.z + dz)); if (!q) continue;
      const y0 = base(p) + 4.4, y1 = base(q) + 4.4, steps = 20;
      for (let i = 0; i <= steps; i++) { const f = i / steps; lights.push(new THREE.Vector3(p.x + dx * f, y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * 0.9, p.z + dz * f)); }
      const mid = { x: p.x + dx / 2, y: (y0 + y1) / 2 - 1.5, z: p.z + dz / 2, ry: dx ? 0 : Math.PI / 2, s: 1.3 };
      (look.motif2 && n++ % 2 ? motifs2 : motifs).push(mid);
      tag('DEC', 'GLS.CPR', `Garland of lights across the road (${theme})`, mid.x, mid.z); tag('DEC', 'PLS', `Hanging ${look.motif[0]} ornament`, mid.x, mid.z + 0.01);
    }
    bulbsLow(lights, look.lights, 0.07);
    instanced(motifGeo[look.motif[0]], new THREE.MeshBasicMaterial({ color: look.motif[1] }), motifs);
    if (look.motif2) instanced(motifGeo[look.motif2[0]], new THREE.MeshBasicMaterial({ color: look.motif2[1] }), motifs2);
    // 2. lights round every lamp post (every one now, not every other)
    bulbsLow(ctx.lampSpots.flatMap(p => spiral(p.x, base(p) + 0.4, p.z, 0.15, 3.4, 6, 18)), look.lights, 0.05);
    for (const p of ctx.lampSpots) tag('DEC', 'GLS.CPR', `Lights round a lamp post (${theme})`, p.x, p.z + 0.01);
    // 3. a line of light along the top of every building in town, front and back
    const roofs = [];
    for (const b of ctx.buildings || []) {
      if (!b.alive || !(b.top > 2)) continue;
      for (const s of [-1, 1]) roofs.push({ x: b.x, y: b.top + 0.05, z: b.z + s * b.d / 2, len: b.w }, { x: b.x + s * b.w / 2, y: b.top + 0.05, z: b.z, len: b.d, ry: Math.PI / 2 });
      tag('DEC', 'GLS.CPR', `Roofline lights${theme === 'christmas' ? ' and icicles' : ''} (${theme})`, b.x, b.z);
    }
    if (roofs.length) {
      const strip = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.09, 0.09), new THREE.MeshBasicMaterial({ color: look.roof }), roofs.length), o = new THREE.Object3D();
      roofs.forEach((r, i) => { o.position.set(r.x, r.y, r.z); o.rotation.set(0, r.ry || 0, 0); o.scale.set(r.len, 1, 1); o.updateMatrix(); strip.setMatrixAt(i, o.matrix); });
      strip.frustumCulled = false; root.add(strip); twinkle.push(strip);
      // icicles hanging under the roof lines at Christmas
      if (theme === 'christmas') {
        const drips = []; for (const r of roofs) for (let a = -r.len / 2 + 0.4; a < r.len / 2; a += 1.1) drips.push({ x: r.x + (r.ry ? 0 : a), y: r.y - 0.25, z: r.z + (r.ry ? a : 0) });
        const icicle = new THREE.ConeGeometry(0.05, 0.45, 4); icicle.rotateX(Math.PI);
        instanced(icicle, new THREE.MeshBasicMaterial({ color: 0xe7f5ff }), drips);
      }
    }
    // 4. the funfair: lights along its fence and an arch over each gate
    if (ctx.fair) {
      const F = ctx.fair, fence = [];
      for (let x = F.minX; x <= F.maxX; x += 1.6) fence.push(new THREE.Vector3(x, ctx.curb + 2.6, F.minZ), new THREE.Vector3(x, ctx.curb + 2.6, F.maxZ));
      for (let z = F.minZ; z <= F.maxZ; z += 1.6) fence.push(new THREE.Vector3(F.minX, ctx.curb + 2.6, z), new THREE.Vector3(F.maxX, ctx.curb + 2.6, z));
      bulbsLow(fence, look.lights, 0.09); tag('DEC', 'GLS.CPR', `Funfair fence lights (${theme})`, (F.minX + F.maxX) / 2, F.maxZ);
      for (const [g0, g1] of F.gates || []) {
        const cx = (g0 + g1) / 2, arch = [];
        for (let i = 0; i <= 30; i++) { const a = Math.PI * i / 30; arch.push(new THREE.Vector3(cx - Math.cos(a) * (g1 - g0) / 2, ctx.curb + 3 + Math.sin(a) * 3, F.maxZ)); }
        bulbsLow(arch, look.lights, 0.14); tag('DEC', 'GLS.STL', `Light arch over the funfair gate (${theme})`, cx, F.maxZ);
        if (ctx.kit) ctx.kit.place(ctx.kit.sign(MARKET[theme].fair, MARKET[theme].fairSub, 7, MARKET[theme].bg, '#ffffff', 'Georgia, serif'), cx, ctx.curb + 6.4, F.maxZ + 0.2, 0);
      }
    }
    // 5. the holiday market: wooden stalls selling what fits the day, a giant centrepiece, and a crowd
    if (ctx.kit && ctx.marketAt) buildMarket(theme, ctx.marketAt);
  }

  function buildMarket(theme, at) {
    const K = ctx.kit, M = MARKET[theme]; if (!M) return;
    const wood = K.mat(0x8a5a32, { rough: 0.9 }), roofMat = K.mat(theme === 'christmas' ? 0xf4f7fb : M.roof, { rough: 0.8 });
    M.stalls.forEach((st, i) => {
      const side = i % 2 ? 1 : -1, z = at.z - 4 - Math.floor(i / 2) * 6, x = at.x + side * 7;
      const g = new THREE.Group(); g.position.set(x, ctx.curb, z); g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; root.add(g);
      K.B(g, 3.4, 2.4, 2.4, 0, 1.2, -0.3, wood); K.B(g, 3.0, 1.0, 0.4, 0, 0.5, 1.05, 0x6b4a30); K.B(g, 3.2, 0.08, 0.6, 0, 1.04, 1.05, 0xe8d29a);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), roofMat); roof.position.set(0, 3.0, -0.2); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.85); g.add(roof);
      const front = []; for (let a = -1.6; a <= 1.6; a += 0.3) front.push(new THREE.Vector3(x + (side > 0 ? 1.2 : -1.2), ctx.curb + 2.4, z + a * (side > 0 ? 1 : -1)));
      bulbsLow(front, LOOK[theme].lights, 0.06);
      K.place(K.sign(st.name, st.sub, 2.8, M.bg, '#ffffff', 'Georgia, serif'), x + side * -0.0, ctx.curb + 2.5, z, side > 0 ? -Math.PI / 2 : Math.PI / 2).position.x = x + (side > 0 ? -1.25 : 1.25);
      K.stander(x + (side > 0 ? 0.6 : -0.6), z, side > 0 ? -Math.PI / 2 : Math.PI / 2, { task: 'cook', outfit: st.outfit });
      K.solid(x - 1.7, x + 1.7, z - 1.7, z + 1.7); tag('KSK', 'WOD', `Market stall: ${st.name}`, x, z, 'Westhaven Builders', 'REQ', 'BLD');
      K.spot(x + (side > 0 ? -2.6 : 2.6), z, 2, st.name, () => ctx.openShop?.(st.name, st.items.map(it => it.gift ? { ...it, desc: 'goes in your bag', onBuy: () => { if (ctx.stats.gold < it.price) return false; ctx.stats.gold -= it.price; ctx.addItem(it.name, it.icon); ctx.toast(`${it.icon} ${it.name} is in your bag.`); return false; } } : it)));
    });
    // the centrepiece at the end of the stalls
    const cz = at.z - 4 - Math.ceil(M.stalls.length / 2) * 6 - 4;
    if (theme === 'christmas') { christmasTree(at.x, ctx.curb, cz, 14); K.circle(at.x, cz, 3); tag('XMT', 'FIR.GLS', 'Giant Christmas tree, holiday market', at.x, cz); }
    else if (M.centre) { const c = new THREE.Mesh(motifGeo[M.centre], new THREE.MeshBasicMaterial({ color: LOOK[theme].motif[1] })); c.scale.setScalar(7); c.position.set(at.x, ctx.curb + 4.5, cz); root.add(c); C2(at.x, cz); }
    function C2(x, z) { K.C(root, 0.15, 0.2, 2.5, x, ctx.curb + 1.25, z, 0x444444, 8); K.circle(x, z, 0.6); }
    if (M.host) K.stander(at.x + 2.5, cz + 3, 0, { outfit: M.host.outfit, task: 'talk' });
    if (M.host) K.spot(at.x + 2.5, cz + 4.5, 2, M.host.label, () => ctx.openShop?.(M.host.label, M.host.items));
    // a crowd enjoying it (they also count down at New Year)
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 7 + (i % 3); crowd.push(K.stander(at.x + Math.cos(a) * r, cz + Math.sin(a) * r * 0.6, Math.atan2(-Math.cos(a), -Math.sin(a)), { task: i % 3 ? 'talk' : 'swing', child: i % 5 === 0 })); }
    walkers.push(K.walker([[at.x - 3, at.z], [at.x - 3, cz + 6], [at.x + 3, cz + 6], [at.x + 3, at.z]], { speed: 0.9 }));
    if (M.centre) tag('DEC', 'PLS', `Giant ${M.centre} (${theme} market centrepiece)`, at.x, cz);
    bot.people(K);   // the stallholders, the host and the crowd each have an ID
  }

  // ---- the New Year countdown: at real midnight, everyone counts 10 to 1, then HAPPY NEW YEAR and a sky full of fireworks
  const clockOffset = (() => { const tm = params.has('debug') && params.get('time'); if (!forced && !tm) return 0; const want = new Date((forced || new Date().toISOString().slice(0, 10)) + 'T' + (tm || '12:00:00')); return want.getTime() - Date.now(); })();
  const clock = () => new Date(Date.now() + clockOffset);
  let countdownEl = null, lastShown = null, celebrateUntil = 0;
  function countdown() {
    const d = clock(), isEve = d.getMonth() === 11 && d.getDate() === 31;
    const secsLeft = isEve ? (24 * 3600) - (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) : null;
    let show = null;
    if (secsLeft != null && secsLeft <= 10 && secsLeft >= 1) show = String(secsLeft);
    if (d.getMonth() === 0 && d.getDate() === 1 && d.getHours() === 0 && d.getMinutes() < 2) { show = `HAPPY NEW YEAR ${d.getFullYear()}!`; celebrateUntil = Date.now() + 4000; }
    if (show === lastShown) return;
    lastShown = show;
    if (!countdownEl) { countdownEl = document.createElement('div'); countdownEl.id = 'nyCountdown'; countdownEl.style.cssText = 'position:fixed;left:0;right:0;top:28%;text-align:center;z-index:40;pointer-events:none;font:900 min(18vw,140px)/1 system-ui;color:#fff;text-shadow:0 0 24px #ffd60a,0 4px 12px #000'; document.body.append(countdownEl); }
    countdownEl.textContent = show || ''; countdownEl.style.fontSize = show && show.length > 3 ? 'min(9vw,72px)' : '';
    if (show) {
      try { const u = new SpeechSynthesisUtterance(show.length > 3 ? 'Happy New Year!' : show); u.rate = 1.1; u.pitch = 1.1; speechSynthesis.speak(u); } catch {}
    }
  }

  // fireworks after dark on New Year's Eve and Bonfire Night
  const fireworks = live.includes('newyear') || live.includes('bonfire');
  let nextBurst = 2;
  if (live.length) setTimeout(() => ctx.toast(GREETING[live[0]]), 4000);
  if (live.includes('newyear')) setInterval(countdown, 250);   // runs on its own clock, even while the game is paused or a menu is open

  return {
    calendar: cal,
    weatherCycle: SEASON_WEATHER[cal.season],
    update(dt, night) {
      // lights glow brighter at night and gently twinkle
      const k = night ? 1 : 0.55, tw = performance.now() / 600;
      for (let i = 0; i < twinkle.length; i++) twinkle[i].material.color.setScalar(k * (0.85 + 0.15 * Math.sin(tw + i)));
      const party = Date.now() < celebrateUntil + 120000 && celebrateUntil > 0;   // two minutes of non-stop fireworks after midnight
      if ((fireworks && night) || party) {
        nextBurst -= dt;
        if (nextBurst <= 0) {
          nextBurst = party ? 0.15 + Math.random() * 0.3 : 1.2 + Math.random() * 2.5;
          const p = ctx.playerPos(), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
          const at = new THREE.Vector3(p.x + Math.cos(a) * d, ctx.curb + 45 + Math.random() * 30, p.z + Math.sin(a) * d);
          ctx.burst(at, [0xff3b30, 0xffd60a, 0x34c759, 0x0a84ff, 0xff2d55, 0xffffff][Math.floor(Math.random() * 6)]);
        }
      }
    },
  };
}
