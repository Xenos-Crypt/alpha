// WORLD IDs — the back-end identity of every thing in A.T. Players never see these (only the owner, in a
// hidden debug view); they are for the AI and the back end: residents' reports, the overlap audit and the
// registry in Supabase all use them, so it is always clear exactly which thing is meant.
//
// ONE STANDARD, five parts, always in this order, joined by dashes:
//     CLASS - KIND - MADE OF - OWNER/MAKER - SERIAL
// Every code is three capital letters (a thing made of several materials lists them, main first, joined by
// dots). The serial is six letters/digits, worked out from what and where the thing is, so it is unique and
// stays the same every time the game loads. Examples:
//     VEH-HEL-STL.GLS-STO-4F2K9A   a stolen helicopter of steel and glass
//     BLD-HSE-HAY.MUD-BOT-7Q81LM   a hay-and-mud house the bots built
//     PRD-GRC-BRD-GCB-2M5X0P       bread, made by Golden Crust Bakery
//     ORG-CHR-TER-AFB-9K3D1A       the A.T. Food Bank: a charity in the tertiary stage
//     LND-GRS-LNG-WLD-3K9P2X       a long tuft of wild grass
// Search by any prefix: "VEH-HEL" finds every helicopter, "BLD-" every building.
import { INGREDIENTS, AISLES, RECIPES } from './kitchen.js';
import { SNACKS } from './snack-shop.js';
import { ALL as SUPPLY, GROCERY_FROM, MAKER, chainText } from './supply-chain.js';
import { ORGS } from './organisations.js';

export const CLASSES = { PER: 'person', BLD: 'building', VEH: 'vehicle', PRD: 'product', MAT: 'material', ORG: 'organisation', LND: 'land (roads, blocks, grass, floors)', CRE: 'creature', MCH: 'machine' };
export const KINDS = {
  PER: { PLR: 'the player', RES: 'resident', POL: 'police officer' },
  BLD: { GEN: 'city building', HSE: 'house', SCH: 'school', HSP: 'hospital', CLN: 'clinic', POL: 'police station', SUP: 'supermarket', OFF: 'office', APT: 'apartments', SHP: 'shop', MAN: 'mansion', GOV: 'government building', MKT: 'market', COM: 'community centre', FIR: 'fire station', AIB: 'AI base', TMP: 'temple' },
  VEH: { CAR: 'car', POL: 'police car', AMB: 'ambulance', BUS: 'bus', TNK: 'tank', BIK: 'bicycle', MOT: 'motorbike', BOT: 'boat', SUB: 'submarine', PLN: 'plane', HEL: 'helicopter', TRK: 'truck', FIR: 'fire engine', HOV: 'hover vehicle', TRN: 'train' },
  PRD: { GRC: 'grocery', DSH: 'dish', SNK: 'snack', INS: 'instrument' },
  MAT: { RAW: 'raw material (primary)', MAD: 'made material (secondary)' },
  ORG: { PUB: 'public body', PRV: 'private company', CHR: 'charity', SOC: 'social enterprise', COP: 'co-operative', NGO: 'NGO' },
  LND: { ROD: 'road tile', BLK: 'city block', GRS: 'grass tuft', FLR: 'floor tile', SRF: 'other surface' },
  CRE: { MON: 'dungeon monster' }, MCH: { ROB: 'ATLAS robot' },
};
export const OWNERS = { PLR: 'the player', RES: 'a resident', GOV: 'the government', REQ: "made at the owner's request", BOT: 'built by the bots', WLD: 'wild (nobody)', STO: 'stolen', ILL: 'got illegally', HOM: 'home-made', ASH: 'Ashford', RIV: 'Riverside', CAP: 'the Capital', POI: 'Poison Land' };
const CITY3 = { Ashford: 'ASH', Riverside: 'RIV', Capital: 'CAP', 'Poison Land': 'POI' };
const COLOUR3 = { r: 'RED', o: 'ORN', y: 'YEL', g: 'GRN', b: 'BLU', p: 'PRP', pk: 'PNK', br: 'BRN', k: 'BLK', w: 'WHT', gy: 'GRY', bg: 'BGE', tl: 'TEA', bw: 'BNW' };
export const M3 = c => !c ? 'NON' : ({ wd: 'WOD', mt: 'MEA' }[c] || String(c)).toUpperCase().padEnd(3, 'X').slice(0, 3);
// every organisation has its own three-letter code (initials, made unique)
export const ORG3 = (() => {
  const out = {}, used = new Set();
  for (const o of ORGS) {
    const words = o.name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(w => w && !/^(of|the|and)$/i.test(w));
    let c = words.map(w => w[0]).join('').toUpperCase(); const letters = words.join('').toUpperCase();
    c = (c + letters.slice(1)).slice(0, 3); let i = 0;
    while (used.has(c)) c = c.slice(0, 2) + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i++ % 26];
    used.add(c); out[o.name] = c;
  }
  return out;
})();
const org3 = name => ORG3[name] || (name ? name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() : 'NON');
const MAT = { tiles: 'cer', checker: 'cer', terracotta: 'ter', marble: 'mar', wood: 'wd', parquet: 'pqt', carpet: 'cpt', stone: 'stn', tech: 'tch' };
const VKIND = { car: 'CAR', police: 'POL', ambulance: 'AMB', bus: 'BUS', tank: 'TNK', bicycle: 'BIK', motorcycle: 'MOT', boat: 'BOT', submarine: 'SUB', plane: 'PLN', heli: 'HEL', helicopter: 'HEL', truck: 'TRK', fire: 'FIR', hover: 'HOV', train: 'TRN' };
const CIVIC3 = { school: 'SCH', hospital: 'HSP', clinic: 'CLN', police: 'POL', supermarket: 'SUP', office: 'OFF', apartments: 'APT', shop: 'SHP', mansion: 'MAN', government: 'GOV', market: 'MKT', community_centre: 'COM', fire_station: 'FIR' };
const PUBLIC_CIVIC = new Set(['school', 'hospital', 'clinic', 'police', 'government', 'fire_station', 'community_centre']);
const PALETTE = [['r', 200, 50, 45], ['o', 230, 130, 40], ['y', 230, 200, 60], ['g', 70, 150, 70], ['b', 50, 100, 200], ['p', 130, 70, 170], ['pk', 230, 140, 170], ['br', 120, 80, 50], ['k', 25, 25, 28], ['w', 240, 240, 236], ['gy', 128, 130, 134], ['bg', 215, 200, 170], ['tl', 40, 150, 150]];
export function colourCode(c) {   // nearest named colour to a THREE.Color or a hex number
  if (c == null) return '';
  const R = c.r != null ? c.r * 255 : (c >> 16) & 255, G = c.g != null ? c.g * 255 : (c >> 8) & 255, B = c.b != null ? c.b * 255 : c & 255;
  let best = '', bd = 1e9; for (const [n, r, g, b] of PALETTE) { const d = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (d < bd) { bd = d; best = n; } } return best;
}
export const MATERIALS = { ...Object.fromEntries(Object.entries(SUPPLY).map(([k, m]) => [k, m.name])), hay: 'hay', mud: 'mud', brk: 'brick', gls: 'glass', stl: 'steel', con: 'concrete', wd: 'wood', stn: 'stone', plr: 'plaster', sht: 'roof shingle', asp: 'asphalt', cer: 'ceramic', mar: 'marble', pqt: 'parquet', cpt: 'carpet', ter: 'terracotta', tch: 'tech tile', fab: 'fabric', pls: 'plastic', rub: 'rubber' };
// what a THREE material is made of, judged by how it looks (or set explicitly by whoever built it)
export function materialOf(m) {
  if (!m) return null;
  if (m.userData?.material) return m.userData.material;
  if (m.userData?.surface) return MAT[m.userData.surface.kind] || null;
  const c = m.color; if (!c) return null;
  const R = c.r * 255, G = c.g * 255, B = c.b * 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0;
  if ((m.transparent && m.opacity < .9) || (m.metalness > .5 && m.roughness < .3 && B >= R)) return 'gls';
  if (m.metalness >= .5) return 'stl';
  if (R > 120 && R > G * 1.3 && G > B && B < 110) return mx < 170 ? 'brk' : 'ter';
  if (sat > .25 && R > G && G > B && mx < 140) return 'wd';
  if (sat > .2 && R > G && G > B && R > 170) return 'stn';
  if (mx < 60) return 'sht';
  if (sat < .12 && mx > 200) return 'plr';
  if (sat < .15) return 'con';
  return 'pls';
}
const KEY = 'aw.worldIds.v2', LOGMAX = 400;

function hash(str, seed = 0) {   // cyrb53
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}
const mats3 = list => (list && list.length ? list.slice(0, 3).map(M3).join('.') : 'NON');
export function makeId(cls, kind, mat, owner, seed) {
  const head = `${cls}-${kind}-${mat}-${owner}`, [a, b] = hash(head + ':' + seed);
  return head + '-' + (a.toString(36) + b.toString(36)).toUpperCase().replace(/[^0-9A-Z]/g, '').padEnd(6, '0').slice(0, 6);
}
export const ID_PATTERN = /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}(\.[A-Z]{3}){0,2}-[A-Z]{3}-[0-9A-Z]{6}$/;
export const parseId = id => { const m = String(id).match(/^([A-Z]{3})-([A-Z]{3})-([A-Z.]+)-([A-Z]{3})-([0-9A-Z]{6})$/); return m ? { cls: m[1], kind: m[2], mat: m[3].split('.'), owner: m[4], serial: m[5] } : null; };

export function createWorldIds(ctx) {
  const reg = new Map(), byObj = new WeakMap(), alias = new Map();
  let log = [], saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); log = saved.log || []; } catch { }
  // the player keeps one ID forever (its serial is random, made the first time you play)
  const playerId = saved.player || makeId('PER', 'PLR', 'HUM', 'PLR', Math.random().toString(36) + Date.now());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ player: playerId, log: log.slice(0, LOGMAX) })); } catch { } };
  save();
  const fresh = [];   // events not yet sent to the back end

  function add(cls, kind, mat, owner, seed, obj, info) {
    let id = makeId(cls, kind, mat, owner, seed), n = 1;
    while (reg.has(id) && reg.get(id).obj !== obj) id = makeId(cls, kind, mat, owner, seed + '#' + n++);
    const e = { id, cls, kind, mat, owner, code: cls + '-' + kind, obj, ...info, history: [] };
    reg.set(id, e); if (obj && typeof obj === 'object') byObj.set(obj, e);
    e.dirty = true;
    return e;
  }
  function event(e, what, pos) {
    const p = pos || e.pos?.();
    const rec = { t: Date.now(), id: e.id, what, x: p ? Math.round(p.x) : null, z: p ? Math.round(p.z) : null };
    e.history.unshift(rec); e.history.length = Math.min(e.history.length, 20);
    log.unshift(rec); log.length = Math.min(log.length, LOGMAX); fresh.push(rec);
    saveSoon();
  }
  let saveT = null; const saveSoon = () => { if (!saveT) saveT = setTimeout(() => { saveT = null; save(); }, 3000); };

  // ---- register the world -----------------------------------------------------------------------------
  // the materials themselves, each with its own ID: MAT-RAW-IRN-DMI-… (iron ore, Deepstone Mining)
  const matIds = {};
  for (const [code, name] of Object.entries(MATERIALS)) { const sp = SUPPLY[code]; matIds[code] = add('MAT', sp?.stage === 'primary' ? 'RAW' : 'MAD', M3(code), org3(sp?.company), 'm:' + code, { material: code }, { name, maker: sp?.company, chain: chainText(code), pos: () => null }).id; }
  function madeOf(meshes, vehicle) {   // main materials first, by how much of the thing is made of each
    const n = {};
    for (const o of meshes || []) { if (!o) continue; o.traverse?.(m => { if (!m.isMesh) return; let k = materialOf(Array.isArray(m.material) ? m.material[0] : m.material); if (!k) return; if (vehicle) k = k === 'gls' ? 'gls' : k === 'sht' ? 'rub' : 'stl'; /* a vehicle: glass windows, rubber black parts, and everything painted is steel */ const g = m.geometry; g.boundingBox || g.computeBoundingBox?.(); const bb = g.boundingBox; const v = bb ? Math.max(.01, (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) + (bb.max.z - bb.min.z) * (bb.max.y - bb.min.y) + (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z)) * (m.scale?.x || 1) : 1; n[k] = (n[k] || 0) + v; }); }
    return Object.entries(n).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }
  const at2 = (x, z) => () => ({ x, z });
  function registerStatic() {
    for (const b of ctx.buildings()) if (!byObj.has(b)) { const mats = madeOf(b.meshes); add('BLD', 'GEN', mats3(mats), 'REQ', `b:${Math.round(b.x)},${Math.round(b.z)},${Math.round(b.w)}x${Math.round(b.d)}`, b, { materials: mats, maker: MAKER.building, name: b.name || 'City building', pos: at2(b.x, b.z) }); }
    for (const b of ctx.civicBuildings()) if (!byObj.has(b)) add('BLD', CIVIC3[b.type] || 'GEN', 'NON', b.builtBy === 'bots' ? 'BOT' : PUBLIC_CIVIC.has(b.type) ? 'GOV' : 'REQ', `c:${b.type}:${Math.round(b.x)},${Math.round(b.z)}`, b, { name: b.name || b.type, maker: b.builtBy === 'bots' ? 'the building crews' : MAKER.building, pos: at2(b.x, b.z) });
    ctx.houses().forEach((h, i) => { if (byObj.has(h)) return; const mats = madeOf(h.meshes || [h.roof, ...(h.walls || [])]); add('BLD', 'HSE', mats3(mats.length ? mats : ['sht']), i === 0 ? 'PLR' : 'REQ', `h:${Math.round((h.minX + h.maxX) / 2)},${Math.round((h.minZ + h.maxZ) / 2)}`, h, { materials: mats, maker: MAKER.house, name: i === 0 ? 'Your house' : h.name || 'House', pos: at2((h.minX + h.maxX) / 2, (h.minZ + h.maxZ) / 2) }); });
    for (const r of ctx.roads()) if (!byObj.has(r)) add('LND', 'ROD', 'ASP', r.byBots ? 'BOT' : 'GOV', `r:${Math.round(r.minX)},${Math.round(r.minZ)},${Math.round(r.maxX)},${Math.round(r.maxZ)}`, r, { materials: ['asp'], name: r.name || 'Road', maker: 'Westhaven Highways', pos: at2((r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2) });
    for (const t of ctx.blocks()) if (!byObj.has(t)) add('LND', 'BLK', 'GRD', CITY3[t.city] || 'ASH', `g:${t.bx},${t.bz}`, t, { name: `${t.city} block ${t.bx},${t.bz}`, pos: at2(t.bx * 40 + 20, t.bz * 40 + 20) });
    for (const x of ctx.extra?.() || []) if (!byObj.has(x)) add(x.cls, x.kind, x.mat || 'NON', x.owner, x.seed, x, { name: x.name, maker: x.maker, pos: () => x.pos });
    if (!goods) {
      goods = [];
      const stage3 = { primary: 'PRI', secondary: 'SEC', tertiary: 'TER', quaternary: 'QUA', quinary: 'QUI' }, type3 = { public: 'PUB', private: 'PRV', charity: 'CHR', 'social enterprise': 'SOC', 'co-operative': 'COP', NGO: 'NGO' };
      for (const o of ORGS) goods.push(add('ORG', type3[o.type], stage3[o.stage], org3(o.name), 'o:' + o.name, o, { name: o.name, maker: o.does, detail: `${o.type} · ${o.stage}`, pos: () => null }));
      // a grocery is made of what it comes from (bread is BRD); a dish is made of its ingredients
      const ing3 = id => String(id).slice(0, 3).toUpperCase(), ingIds = {};
      for (const it of INGREDIENTS) { const src = GROCERY_FROM[it.id], maker = src ? SUPPLY[src].company : 'MarketWay Retail'; const e = add('PRD', 'GRC', src ? M3(src) : ing3(it.id), org3(maker), 'g:' + it.id, it, { name: it.name, maker: maker + ', sold by MarketWay Retail', chain: src ? chainText(src) : null, pos: () => null }); ingIds[it.id] = e.id; goods.push(e); }
      for (const r of RECIPES) { const parts = Object.keys(r.need || {}); goods.push(add('PRD', 'DSH', parts.slice(0, 3).map(ing3).join('.') || 'NON', 'HOM', 'r:' + r.id, r, { parts: parts.map(p => [INGREDIENTS.find(i => i.id === p)?.name || p, ingIds[p]]), name: r.name, maker: 'cooked at home', pos: () => null })); }
      for (const s of SNACKS) goods.push(add('PRD', 'SNK', 'MIX', org3('MarketWay Retail'), 's:' + s.name, s, { name: s.name, maker: 'MarketWay Retail', pos: () => null }));
    }
    for (const it of ctx.interactables?.() || []) if (!byObj.has(it) && /piano|guitar|drum|jukebox|violin|organ|harp|trumpet|saxophone|instrument/i.test(it.label || '')) add('PRD', 'INS', 'WOD.STL', org3(MAKER.instrument), `i:${Math.round(it.pos.x)},${Math.round(it.pos.z)}:${it.label}`, it, { materials: ['wd', 'stl'], maker: MAKER.instrument, name: it.label.replace(/^Play (the )?/i, ''), pos: () => it.pos });
  }
  const vowner = v => v.stolen ? 'STO' : v.stolenGoods ? 'ILL' : v.owned ? 'PLR' : ['police', 'ambulance', 'bus', 'tank', 'fire', 'army'].includes(v.kind) ? 'GOV' : 'RES';
  let vSeq = 0, goods = null;
  function registerMoving() {
    ctx.peds().forEach((e, i) => { if (!byObj.has(e)) { const c = ctx.citizenOf?.(e); add('PER', 'RES', 'HUM', CITY3[c?.city] || 'ASH', `p:${i}`, e, { name: c?.name || e.labelName || 'Resident', pos: () => e.hidden ? (e.socHome || null) : e.root.position }); } });
    for (const e of ctx.cops?.() || []) if (!byObj.has(e)) add('PER', 'POL', 'HUM', 'GOV', `cop:${vSeq++}`, e, { name: 'Police officer', pos: () => e.root.position });
    for (const h of ctx.robots?.() || []) if (!byObj.has(h)) add('MCH', 'ROB', 'ALY.TCH', org3(MAKER.robot), `rb:${vSeq++}`, h, { materials: ['aly', 'tch'], maker: MAKER.robot, name: 'Robot', pos: () => h.root.position });
    // the dungeon monsters are not born: ATLAS's Foundry fabricates them from bio-gel and alloy
    for (const m of ctx.monsters?.() || []) if (!byObj.has(m)) add('CRE', 'MON', 'BGL.ALY', org3(MAKER.monster), `mn:${m.monsterType || m.labelName || ''}:${vSeq++}`, m, { materials: ['bgl', 'aly'], maker: MAKER.monster, name: m.labelName || m.monsterType || 'Monster', pos: () => m.root?.position });
    for (const v of ctx.vehicles()) {
      const owner = vowner(v), e = byObj.get(v), kind = v.heli ? 'HEL' : VKIND[v.kind] || 'CAR';
      if (!e) { const mats = madeOf([v.group], true); add('VEH', kind, mats3(mats.slice(0, 2)), owner, `v:${v.kind}:${vSeq++}`, v, { materials: mats, maker: MAKER[v.heli ? 'heli' : v.kind] || 'Velo Motors', name: v.name || v.kind, pos: () => v.group.position }); continue; }
      if (e.owner !== owner) {   // stolen / bought / seized: new owner code, old ID kept as an alias
        const old = e.id, n = add('VEH', kind, e.mat, owner, old, v, { materials: e.materials, maker: e.maker, name: e.name, pos: e.pos });
        n.history = e.history; n.aliases = [...(e.aliases || []), old]; alias.set(old, n.id); reg.delete(old);
        event(n, `${OWNERS[e.owner]} → ${OWNERS[owner]} (was ${old})`);
      }
    }
  }
  const player = { id: playerId, cls: 'PER', kind: 'PLR', mat: 'HUM', owner: 'PLR', code: 'PER-PLR', name: 'The player', obj: ctx.player(), pos: () => ctx.player().position, history: [], dirty: true };
  reg.set(playerId, player); byObj.set(ctx.player(), player);

  // ---- watch what moving things are doing ----------------------------------------------------------------
  const last = new WeakMap();
  function watch() {
    const pp = ctx.player().position;
    for (const e of reg.values()) {
      if (!(e.cls === 'PER' && e.kind !== 'PLR') && !(e.cls === 'VEH' && ['STO', 'ILL', 'PLR'].includes(e.owner))) continue;
      const o = e.obj, p = e.pos?.(); if (!p || Math.hypot(p.x - pp.x, p.z - pp.z) > 160) continue;
      const state = o.ped?.state === 'soc' ? o.soc?.kind : o.ped?.state || (o === ctx.driving?.() ? 'driven by the player' : o.speed ? 'moving' : 'parked');
      const prev = last.get(o);
      if (prev !== state && state && !['wander', 'parked', 'moving'].includes(state)) event(e, state);
      last.set(o, state);
    }
  }

  // ---- grass: every tuft has an ID worked out from where it grows (never stored one by one) -----------------
  const grassLen = p => p.s * p.tall < .75 ? 'SHT' : p.s * p.tall > 1.15 ? 'LNG' : 'MED';
  const grassId = p => makeId('LND', 'GRS', grassLen(p), 'WLD', `t:${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  function grassNear(r = 15, max = 60) {
    const pp = ctx.player().position, out = [];
    for (const p of ctx.grass?.() || []) { if (!p.ok) continue; const d = Math.hypot(p.x - pp.x, p.z - pp.z); if (d < r) out.push({ id: grassId(p), cls: 'LND', kind: 'GRS', code: 'LND-GRS', name: { SHT: 'Short', MED: 'Medium', LNG: 'Long' }[grassLen(p)] + ' grass tuft', pos: () => p, history: [] }); }
    return out.sort((a, b) => dist(a) - dist(b)).slice(0, max);
  }
  function nearestId(pos, prefixes, r = 30) { let best = null, bd = r; for (const e of reg.values()) { if (prefixes && !prefixes.some(x => e.id.startsWith(x))) continue; const p = e.pos?.(); if (!p) continue; const d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < bd) { bd = d; best = e; } } return best?.id || null; }

  // ---- the AUDIT: things that overlap and shouldn't --------------------------------------------------------
  const bugs = new Map(), freshBugs = [];
  function bug(cat, pos, ids, words) {
    const key = cat + ':' + ids.slice().sort().join('+');
    const b = bugs.get(key); if (b) { b.count++; return; }
    const rec = { key, cat, ids, x: Math.round(pos.x), z: Math.round(pos.z), words, t: Date.now(), count: 1 };
    bugs.set(key, rec); freshBugs.push(rec);
    ctx.reportBug?.(cat, pos, ids, words);
  }
  function auditGrass() {   // grass must never grow through a road or inside a building
    for (const p of ctx.grass?.() || []) {
      if (!p.ok) continue;
      const road = ctx.isRoad?.(p.x, p.z), inside = !road && ctx.blockedAt?.(p.x, p.z, .02);
      if (road || inside) bug(road ? 'grass-on-road' : 'grass-in-building', p, [grassId(p), nearestId(p, road ? ['LND-ROD'] : ['BLD-'], 40)].filter(Boolean), road ? 'Grass is growing through the road here.' : 'Grass is growing inside a building here.');
    }
  }
  const surfMat = mat => { const sf = mat?.userData?.surface; return sf ? `${COLOUR3[sf.kind === 'checker' ? 'bw' : colourCode(sf.colour)] || 'NON'}.${M3(MAT[sf.kind] || 'non')}` : `${COLOUR3[colourCode(mat?.color)] || 'NON'}.${M3(materialOf(mat) || 'non')}`; };
  function surfaceId(rec) {
    let e = byObj.get(rec.m); if (e) return e.id;
    const isFloor = !!rec.mat?.userData?.surface;
    e = add('LND', isFloor ? 'FLR' : 'SRF', rec.look, 'REQ', `s:${rec.x0.toFixed(1)},${rec.z0.toFixed(1)},${rec.x1.toFixed(1)},${rec.z1.toFixed(1)},${rec.top.toFixed(2)}`, rec.m, { name: (isFloor ? 'Floor: ' : 'Surface: ') + rec.look, pos: () => ({ x: (rec.x0 + rec.x1) / 2, z: (rec.z0 + rec.z1) / 2 }) });
    return e.id;
  }
  let scan = null; const box = new ctx.THREE.Box3();
  function startScan() {
    const movers = new Set([...ctx.vehicles().map(v => v.group), ...ctx.peds().map(e => e.root)]);
    const list = []; ctx.scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible !== false) list.push(o); });
    scan = { list, i: 0, grid: new Map(), movers, found: 0, done: false };
    const bs = ctx.buildings().filter(b => b.alive !== false && b.collider);
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i].collider, c = bs[j].collider, ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX), oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
      if (ox > 1.5 && oz > 1.5) bug('building-overlap', { x: (Math.max(a.minX, c.minX) + Math.min(a.maxX, c.maxX)) / 2, z: (Math.max(a.minZ, c.minZ) + Math.min(a.maxZ, c.maxZ)) / 2 }, [byObj.get(bs[i])?.id, byObj.get(bs[j])?.id].filter(Boolean), 'Two buildings stand inside each other here.');
    }
  }
  function moving(o) { for (let p = o; p; p = p.parent) if (scan.movers.has(p)) return true; return false; }
  function stepScan(n = 1200) {   // flat surfaces at the same height with different looks flicker through each other
    if (!scan || scan.done) return;
    const end = Math.min(scan.list.length, scan.i + n);
    for (; scan.i < end; scan.i++) {
      const m = scan.list[scan.i]; if (moving(m)) continue;
      box.setFromObject(m);
      const w = box.max.x - box.min.x, d = box.max.z - box.min.z;
      if (box.max.y - box.min.y > .08 || w * d < .5 || w > 300 || d > 300) continue;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (mat?.transparent && mat.opacity < .5) continue;
      const rec = { m, mat, x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, top: box.max.y, look: surfMat(mat) };
      const cells = []; for (let gx = Math.floor(rec.x0 / 10); gx <= Math.floor(rec.x1 / 10); gx++) for (let gz = Math.floor(rec.z0 / 10); gz <= Math.floor(rec.z1 / 10); gz++) cells.push(gx + ',' + gz);
      for (const k of cells.slice(0, 64)) {
        const list = scan.grid.get(k) || []; scan.grid.set(k, list);
        for (const o of list) {
          if (o === rec || Math.abs(o.top - rec.top) > .006 || o.mat === mat || o.look === rec.look) continue;
          const ox = Math.min(o.x1, rec.x1) - Math.max(o.x0, rec.x0), oz = Math.min(o.z1, rec.z1) - Math.max(o.z0, rec.z0);
          if (ox > .5 && oz > .5) { scan.found++; bug('surface-overlap', { x: (Math.max(o.x0, rec.x0) + Math.min(o.x1, rec.x1)) / 2, z: (Math.max(o.z0, rec.z0) + Math.min(o.z1, rec.z1)) / 2 }, [surfaceId(o), surfaceId(rec)], `Two surfaces (${o.look} and ${rec.look}) lie at the same height and flicker through each other.`); }
        }
        list.push(rec);
      }
    }
    if (scan.i >= scan.list.length) { scan.done = true; scan.grid.clear(); }
  }

  // ---- the owner's hidden debug view (never shown to players) -----------------------------------------
  const panel = document.createElement('section'); panel.id = 'idTracker'; panel.hidden = true; document.body.append(panel);
  const st = document.createElement('style');
  st.textContent = '#idTracker{position:fixed;inset:6% max(12px,14%);z-index:47;background:#0f1b26f5;color:#e9f1f7;border:1px solid #5d7a94;border-radius:16px;padding:16px 18px;overflow:auto;font:13px/1.45 ui-monospace,Menlo,monospace}#idTracker[hidden]{display:none}#idTracker h2{font:600 18px system-ui;margin:0 0 6px}#idTracker h3{font:600 12px system-ui;color:#9fc0de;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 4px}#idTracker input{width:60%;padding:8px;border-radius:8px;border:0;font:inherit}#idTracker button{min-height:36px;padding:6px 10px;margin:3px 4px 3px 0;border:0;border-radius:8px;background:#365f86;color:#fff;font:12px system-ui}#idTracker button.on{background:#2f8f5b}#idTracker table{border-collapse:collapse;width:100%}#idTracker td{padding:2px 8px 2px 0;vertical-align:top}#idTracker .x{float:right}@media(max-width:700px){#idTracker{inset:4% 8px}}';
  document.head.append(st);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let filter = null, query = '', tagsOn = false;
  const at = p => p ? `(${Math.round(p.x)}, ${Math.round(p.z)})` : '(indoors / away / not a place)';
  const dist = e => { const p = e.pos?.(), q = ctx.player().position; return p ? Math.hypot(p.x - q.x, p.z - q.z) : 1e9; };
  function heading(e) { const o = e.obj; const t = o?.ped?.target || o?.soc?.spot || o?.ai?.target; return t ? ' → heading to ' + at(t) : ''; }
  function find(q) {
    q = q.trim(); const Q = q.toUpperCase(), id = alias.get(Q) || Q;
    return reg.get(id) || (id.startsWith('LND-GRS') ? grassNear(60, 5000).find(g => g.id === id) : null) || [...reg.values()].find(e => e.name?.toLowerCase() === q.toLowerCase());
  }
  const describe = e => [CLASSES[e.cls], KINDS[e.cls]?.[e.kind], OWNERS[e.owner]].filter(Boolean).join(' · ');
  function render() {
    const counts = {}; for (const e of reg.values()) counts[e.cls] = (counts[e.cls] || 0) + 1;
    const Q = query.trim().toUpperCase(), hit = Q && !Q.endsWith('-') && Q.split('-').length >= 5 ? find(query) : query && !/^[A-Z]{3}(-|$)/.test(Q) ? find(query) : null;
    const prefix = !hit && /^[A-Z]{3}(-[A-Z.]*)*$/.test(Q) ? Q : null;
    const matches = prefix ? (prefix.startsWith('LND-GRS') ? grassNear(40, 200) : [...reg.values()].filter(e => e.id.startsWith(prefix))).slice(0, 60) : [];
    const near = filter === 'LND-GRS' ? grassNear() : [...reg.values()].filter(e => (filter ? e.id.startsWith(filter) : !['MAT', 'PRD', 'ORG'].includes(e.cls)) && dist(e) < 120).sort((a, b) => dist(a) - dist(b)).slice(0, 40);
    panel.innerHTML = `<button class="x" type="button" data-close>Close</button><h2>🆔 World registry (owner only)</h2>
      <div>The player: <b>${playerId}</b> · ${reg.size} things registered · format CLASS-KIND-MADEOF-OWNER-SERIAL</div>
      <div style="margin-top:8px"><input data-q placeholder="An ID, a prefix (VEH-HEL, BLD-HSE…) or a name" value="${esc(query)}"><button type="button" data-find>Find</button><button type="button" data-tags class="${tagsOn ? 'on' : ''}">${tagsOn ? 'Hide' : 'Show'} ID tags</button></div>
      ${hit ? `<h3>${esc(hit.id)}</h3><div>${esc(describe(hit))} · ${esc(hit.name)} · at ${at(hit.pos?.())}${heading(hit)}${hit.aliases ? ' · earlier IDs: ' + hit.aliases.map(esc).join(', ') : ''}</div>${hit.detail ? `<div>${esc(hit.detail)}</div>` : ''}${hit.materials?.length ? `<div>Made of: ${hit.materials.map(m => `${esc(MATERIALS[m] || m)} <a href="#" data-id="${matIds[m]}" style="color:#9fd3ff">${matIds[m]}</a>`).join(' + ')}</div>` : ''}${hit.maker ? `<div>Made by / does: ${esc(hit.maker)}</div>` : ''}${hit.chain ? `<div>Where it comes from: ${esc(hit.chain)}</div>` : ''}${hit.parts?.length ? `<div>Made from: ${hit.parts.map(([n, i]) => `${esc(n)} <a href="#" data-id="${i}" style="color:#9fd3ff">${i}</a>`).join(' + ')}</div>` : ''}<table>${hit.history.map(h => `<tr><td>${new Date(h.t).toLocaleTimeString()}</td><td>${esc(h.what)}</td><td>${h.x != null ? `(${h.x}, ${h.z})` : ''}</td></tr>`).join('') || '<tr><td>Nothing recorded yet.</td></tr>'}</table>` : ''}
      ${prefix ? `<h3>${matches.length} matching ${esc(prefix)}</h3><table>${matches.map(e => `<tr><td><a href="#" data-id="${e.id}" style="color:#9fd3ff">${e.id}</a></td><td>${esc(e.name)}</td><td>${at(e.pos?.())}</td></tr>`).join('')}</table>` : query && !hit ? '<h3>No match</h3>' : ''}
      <h3>Classes</h3><div>${Object.entries(CLASSES).map(([c, d]) => `<button type="button" data-filter="${c}" class="${filter === c ? 'on' : ''}">${c} · ${esc(d)} (${counts[c] || 0})</button>`).join('')}<button type="button" data-filter="LND-GRS" class="${filter === 'LND-GRS' ? 'on' : ''}">LND-GRS · grass near you</button></div>
      <h3>Problems found (${bugs.size})</h3><div><button type="button" data-scan>${scan && !scan.done ? `Scanning… ${Math.round(100 * scan.i / scan.list.length)}%` : 'Scan the world for overlaps'}</button></div><table>${[...bugs.values()].slice(-30).reverse().map(b => `<tr><td>${esc(b.cat)}</td><td>(${b.x}, ${b.z})</td><td>${b.ids.map(i => `<a href="#" data-id="${i}" style="color:#ffb37f">${i}</a>`).join(' + ')}</td><td>${b.count > 1 ? '×' + b.count : ''}</td></tr>`).join('') || '<tr><td>None found yet.</td></tr>'}</table>
      <h3>Near you${filter ? ' · ' + esc(filter) : ''}</h3><table>${near.map(e => `<tr><td><a href="#" data-id="${e.id}" style="color:#9fd3ff">${e.id}</a></td><td>${esc(e.name)}</td><td>${at(e.pos?.())}${esc(heading(e))}</td></tr>`).join('')}</table>
      <h3>What's been happening</h3><table>${log.slice(0, 40).map(h => `<tr><td>${new Date(h.t).toLocaleTimeString()}</td><td><a href="#" data-id="${h.id}" style="color:#9fd3ff">${h.id}</a></td><td>${esc(h.what)}</td><td>${h.x != null ? `(${h.x}, ${h.z})` : ''}</td></tr>`).join('')}</table>`;
  }
  panel.addEventListener('click', ev => {
    const t = ev.target.closest('[data-id],button'); if (!t) return; ev.preventDefault();
    const d = t.dataset;
    if (d.id) { query = d.id; render(); return; }
    if (d.close != null) { close(); return; }
    if (d.find != null) { query = panel.querySelector('[data-q]').value; render(); return; }
    if (d.filter) { filter = filter === d.filter ? null : d.filter; render(); return; }
    if (d.tags != null) { tagsOn = !tagsOn; if (!tagsOn) clearTags(); render(); }
    if (d.scan != null) { if (!scan || scan.done) startScan(); render(); }
  });
  panel.addEventListener('keydown', e => { if (e.code === 'Enter') { query = panel.querySelector('[data-q]').value; render(); } if (e.code === 'Escape') close(); e.stopPropagation(); });
  function open() { if (!ctx.isOwner?.()) return; registerMoving(); render(); panel.hidden = false; ctx.pause(); }
  function close() { panel.hidden = true; ctx.resume(); }

  const tags = new Map();
  function tagFor(e) {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 64; const g = cv.getContext('2d');
    g.fillStyle = 'rgba(10,20,30,.78)'; g.fillRect(0, 0, 640, 64); g.fillStyle = '#7fe8ff'; g.font = '600 26px ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.id, 320, 33);
    const tex = new ctx.THREE.CanvasTexture(cv), sp = new ctx.THREE.Sprite(new ctx.THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(3.3, .33, 1); sp.renderOrder = 30; ctx.scene.add(sp); return sp;
  }
  function clearTags() { for (const sp of tags.values()) { ctx.scene.remove(sp); sp.material.map.dispose(); sp.material.dispose(); } tags.clear(); }
  function updateTags() {
    const want = new Set([...reg.values()].filter(e => e.kind !== 'PLR' && e.cls !== 'LND' && dist(e) < 35).sort((a, b) => dist(a) - dist(b)).slice(0, 24).map(e => e.id));
    for (const [id, sp] of tags) if (!want.has(id)) { ctx.scene.remove(sp); sp.material.map.dispose(); sp.material.dispose(); tags.delete(id); }
    for (const id of want) { const e = reg.get(id), p = e.pos?.(); if (!p) continue; let sp = tags.get(id); if (!sp) tags.set(id, sp = tagFor(e)); const y = e.obj?.root ? e.obj.root.position.y + 2.6 : e.obj?.group ? e.obj.group.position.y + 2.4 : (e.obj?.top || 6) + 1; sp.position.set(p.x, y, p.z); }
  }

  let t = 0, slow = 0;
  setTimeout(() => { registerStatic(); registerMoving(); }, 4000);
  setTimeout(() => { if (!scan) startScan(); }, 15000);   // one full audit a little after the world has loaded
  return {
    playerId, find, open, close, get isOpen() { return !panel.hidden; },
    idOf(obj) { return byObj.get(obj)?.id || null; },
    entryOf(obj) { return byObj.get(obj) || null; },
    record(obj, what, pos) { const e = byObj.get(obj); if (e) event(e, what, pos); },
    nearest: nearestId, bugs: () => [...bugs.values()], scanNow() { startScan(); while (!scan.done) stepScan(5000); return bugs.size; },
    get size() { return reg.size; }, log: () => log,
    // for the back-end registry (world-registry.js): what has changed since it last asked
    takeChanges() { const ents = []; for (const e of reg.values()) if (e.dirty) { e.dirty = false; const p = e.pos?.(); ents.push({ id: e.id, cls: e.cls, kind: e.kind, mat: e.mat, owner: e.owner, name: e.name, x: p ? Math.round(p.x) : null, z: p ? Math.round(p.z) : null, maker: e.maker || null, aliases: e.aliases || null }); } return { entities: ents, events: fresh.splice(0), bugs: freshBugs.splice(0) }; },
    update(dt) {
      t -= dt; slow -= dt;
      if (slow <= 0) { slow = 5; registerStatic(); registerMoving(); }
      if (t <= 0) { t = 1; watch(); if (tagsOn) updateTags(); auditGrass(); if (!panel.hidden && scan && !scan.done) render(); }
      stepScan();
    },
  };
}
