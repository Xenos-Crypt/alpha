// WORLD IDs — every thing in the world carries a unique ID, so it is easy to see what is going on and where
// things are going, and to point at exactly the thing that is wrong. Residents' reports to the Lawgiver carry
// the IDs, and an AUDIT looks for overlaps (grass growing through a road, two floors fighting at the same
// height, buildings inside each other) and reports them with the IDs of both things.
//
// An ID is six digits, a CODE, then a digit and five letters/digits, e.g. 169273npcgy4w8x2a.
// The code is WHAT it is, then HOW IT LOOKS / WHAT IT'S MADE OF:
//   what: np player · npc resident · po police on foot · rb ATLAS robot · rp building made at the owner's
//         request · bh built by the bots · hs house · rt road tile · gt city block · gr grass tuft ·
//         fl floor tile · sf other surface · gc grocery · fd food · in instrument ·
//         vc resident's vehicle · vg government vehicle · vo yours · vs stolen · vx got illegally
//   look: colour (r red, o orange, y yellow, g green, b blue, p purple, pk pink, br brown, k black,
//         w white, gy grey, bg beige, tl teal, bw black-and-white) and material (cer ceramic, mar marble,
//         wd wood, pqt parquet, cpt carpet, stn stone, ter terracotta, tch tech, asp asphalt); grass is
//         s short, m medium or l long; vehicles add their kind (car, bus, pln plane, hel helicopter, bt boat…).
//   So a red ceramic floor tile is …flrcer…, a black-and-white chequered one …flbwcer…, a long grass tuft
//   …grl…, a stolen helicopter …vshel…, a grey asphalt road tile …rtasp….
// MATERIALS have IDs of their own (…hay…, …mud…, …brk… brick, …gls… glass, …stl… steel, …con…
// concrete, …wd… wood, …stn… stone, …plr… plaster, …sht… roof shingle…), and anything BUILT from them
// carries their codes in its own ID, main ones first: a house of hay and mud is …hshaymud…, a glass and
// steel tower made at the owner's request …rpglsstl…. Its record lists each material's own ID.
import { INGREDIENTS, AISLES, RECIPES } from './kitchen.js';
import { SNACKS } from './snack-shop.js';
const CODES = {
  np: 'the player', npc: 'resident', po: 'police officer on foot', rb: 'ATLAS robot',
  rp: "building made at the owner's request", bh: 'built by the bots (NPC crews, ATLAS, the residents)', hs: 'house',
  rt: 'road tile', gt: 'city block', gr: 'grass tuft', fl: 'floor tile', sf: 'other surface',
  gc: 'grocery', fd: 'food', in: 'instrument', mt: 'material',
  vc: "resident's vehicle (traffic)", vg: 'government vehicle (police, ambulance, bus, army)', vo: 'vehicle you own', vs: 'stolen vehicle', vx: 'vehicle got illegally (black market, hot plates)',
};
const MAT = { tiles: 'cer', checker: 'cer', terracotta: 'ter', marble: 'mar', wood: 'wd', parquet: 'pqt', carpet: 'cpt', stone: 'stn', tech: 'tch' };
const VKIND = { car: 'car', police: 'pol', ambulance: 'amb', bus: 'bus', tank: 'tnk', bicycle: 'bik', motorcycle: 'mot', boat: 'bt', submarine: 'sub', plane: 'pln', heli: 'hel', helicopter: 'hel', truck: 'trk', fire: 'fir', hover: 'hov', train: 'trn' };
const PALETTE = [['r', 200, 50, 45], ['o', 230, 130, 40], ['y', 230, 200, 60], ['g', 70, 150, 70], ['b', 50, 100, 200], ['p', 130, 70, 170], ['pk', 230, 140, 170], ['br', 120, 80, 50], ['k', 25, 25, 28], ['w', 240, 240, 236], ['gy', 128, 130, 134], ['bg', 215, 200, 170], ['tl', 40, 150, 150]];
export function colourCode(c) {   // nearest named colour to a THREE.Color or a hex number
  if (c == null) return '';
  const R = c.r != null ? c.r * 255 : (c >> 16) & 255, G = c.g != null ? c.g * 255 : (c >> 8) & 255, B = c.b != null ? c.b * 255 : c & 255;
  let best = '', bd = 1e9; for (const [n, r, g, b] of PALETTE) { const d = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (d < bd) { bd = d; best = n; } } return best;
}
export const MATERIALS = { hay: 'hay', mud: 'mud', brk: 'brick', gls: 'glass', stl: 'steel', con: 'concrete', wd: 'wood', stn: 'stone', plr: 'plaster', sht: 'roof shingle', asp: 'asphalt', cer: 'ceramic', mar: 'marble', pqt: 'parquet', cpt: 'carpet', ter: 'terracotta', tch: 'tech tile', fab: 'fabric', pls: 'plastic', rub: 'rubber' };
// what a THREE material is made of, judged by how it looks
export function materialOf(m) {
  if (!m) return null;
  if (m.userData?.material) return m.userData.material;               // set explicitly by whoever built it
  if (m.userData?.surface) return MAT[m.userData.surface.kind] || null;   // floors (floor-textures.js)
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
export { CODES };
const KEY = 'aw.worldIds.v1', LOGMAX = 400;

function hash(str, seed = 0) {   // cyrb53
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}
export function makeId(code, seed) {
  const [a, b] = hash(code + ':' + seed);
  return String(a % 1e6).padStart(6, '0') + code + (b % 10) + Math.floor(b / 10).toString(36).padStart(5, '0').slice(-5);   // the tail starts with a digit, so the code can always be read back
}
export const codeOf = id => (String(id).match(/^\d{6}([a-z]+)\d[0-9a-z]{5}$/) || [])[1] || null;

export function createWorldIds(ctx) {
  const reg = new Map(), byObj = new WeakMap(), alias = new Map();
  let log = [], saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); log = saved.log || []; } catch { }
  // the player keeps one ID forever (it is random, made the first time you play)
  const playerId = saved.player || makeId('np', Math.random().toString(36) + Date.now());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ player: playerId, log: log.slice(0, LOGMAX) })); } catch { } };
  save();

  function add(code, seed, obj, info) {
    const full = info.full || code + (info.look || '');
    let id = makeId(full, seed), n = 1;
    while (reg.has(id) && reg.get(id).obj !== obj) id = makeId(full, seed + '#' + n++);
    const e = { id, code, full, obj, ...info, history: [] };
    reg.set(id, e); if (obj && typeof obj === 'object') byObj.set(obj, e);
    return e;
  }
  function event(e, what, pos) {
    const p = pos || e.pos?.();
    const rec = { t: Date.now(), id: e.id, what, x: p ? Math.round(p.x) : null, z: p ? Math.round(p.z) : null };
    e.history.unshift(rec); e.history.length = Math.min(e.history.length, 20);
    log.unshift(rec); log.length = Math.min(log.length, LOGMAX);
    saveSoon();
  }
  let saveT = null; const saveSoon = () => { if (!saveT) saveT = setTimeout(() => { saveT = null; save(); }, 3000); };

  // ---- register the world -----------------------------------------------------------------------------
  // the materials themselves, each with its own ID
  const matIds = {};
  for (const [code, name] of Object.entries(MATERIALS)) matIds[code] = add('mt', 'm:' + code, { material: code }, { full: code, kind: 'material', name, pos: () => null }).id;
  function madeOf(meshes, vehicle) {   // main materials first, by how much of the thing is made of each
    const n = {};
    for (const o of meshes || []) { if (!o) continue; o.traverse?.(m => { if (!m.isMesh) return; let k = materialOf(Array.isArray(m.material) ? m.material[0] : m.material); if (!k) return; if (vehicle) k = k === 'pls' ? 'stl' : k === 'sht' ? 'rub' : k; /* a vehicle's paintwork is steel, its black parts rubber */ const g = m.geometry; g.boundingBox || g.computeBoundingBox?.(); const bb = g.boundingBox; const v = bb ? Math.max(.01, (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) + (bb.max.z - bb.min.z) * (bb.max.y - bb.min.y) + (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z)) * (m.scale?.x || 1) : 1; n[k] = (n[k] || 0) + v; }); }
    return Object.entries(n).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }
  function registerStatic() {
    for (const b of ctx.buildings()) if (!byObj.has(b)) { const mats = madeOf(b.meshes); add('rp', `b:${Math.round(b.x)},${Math.round(b.z)},${Math.round(b.w)}x${Math.round(b.d)}`, b, { look: mats.slice(0, 3).join(''), materials: mats, colour: colourCode(b.meshes?.find(m => m.material?.color)?.material.color), kind: 'building', name: b.name || 'City building', pos: () => ({ x: b.x, z: b.z }) }); }
    for (const b of ctx.civicBuildings()) if (!byObj.has(b)) { const code = b.builtBy === 'bots' ? 'bh' : 'rp'; add(code, `c:${b.type}:${Math.round(b.x)},${Math.round(b.z)}`, b, { kind: b.type || 'building', name: b.name || b.type, pos: () => ({ x: b.x, z: b.z }) }); }
    for (const h of ctx.houses()) if (!byObj.has(h)) add('hs', `h:${Math.round((h.minX + h.maxX) / 2)},${Math.round((h.minZ + h.maxZ) / 2)}`, h, { look: madeOf(h.meshes || [h.roof, ...(h.walls || [])]).slice(0, 3).join('') || 'sht', materials: madeOf(h.meshes || [h.roof, ...(h.walls || [])]), kind: 'house', name: h.name || 'House', pos: () => ({ x: (h.minX + h.maxX) / 2, z: (h.minZ + h.maxZ) / 2 }) });
    for (const r of ctx.roads()) if (!byObj.has(r)) add(r.byBots ? 'bh' : 'rt', `r:${Math.round(r.minX)},${Math.round(r.minZ)},${Math.round(r.maxX)},${Math.round(r.maxZ)}`, r, { look: 'asp', kind: r.byBots ? 'new road' : 'road tile', name: r.name || 'Road', pos: () => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 }) });
    for (const t of ctx.blocks()) if (!byObj.has(t)) add('gt', `g:${t.bx},${t.bz}`, t, { kind: 'city block', name: `${t.city} block ${t.bx},${t.bz}`, pos: () => ({ x: t.bx * 40 + 20, z: t.bz * 40 + 20 }) });
    for (const x of ctx.extra?.() || []) if (!byObj.has(x)) add(x.code, x.seed, x, { kind: x.kind, name: x.name, pos: () => x.pos });
    // groceries and food: every product on sale, every dish, every snack
    if (!goods) {
      goods = [];
      // a grocery's code is its own (bre bread, egg eggs…); a dish's code is made of its ingredients' codes,
      // so buttered toast (bread + butter) is …fdbrebut…, and its record links each ingredient's ID
      const ing = id => String(id).slice(0, 3).toLowerCase(), ingIds = {};
      for (const it of INGREDIENTS) { const aisle = AISLES.find(a => a.items.includes(it.id)); const e = add('gc', 'g:' + it.id, it, { look: ing(it.id), kind: 'grocery · ' + (aisle?.name || 'general'), name: it.name, pos: () => null }); ingIds[it.id] = e.id; goods.push(e); }
      for (const r of RECIPES) { const parts = Object.keys(r.need || {}); goods.push(add('fd', 'r:' + r.id, r, { look: parts.map(ing).join(''), parts: parts.map(p => [INGREDIENTS.find(i => i.id === p)?.name || p, ingIds[p]]), kind: 'dish', name: r.name, pos: () => null })); }
      for (const s of SNACKS) goods.push(add('fd', 's:' + s.name, s, { look: 'snk', kind: 'snack', name: s.name, pos: () => null }));
    }
    // instruments: anything you can play
    for (const it of ctx.interactables?.() || []) if (!byObj.has(it) && /piano|guitar|drum|jukebox|violin|organ|harp|trumpet|saxophone|instrument/i.test(it.label || '')) {
      const t = /piano/i.test(it.label) ? 'pno' : /guitar/i.test(it.label) ? 'gtr' : /drum/i.test(it.label) ? 'drm' : /jukebox/i.test(it.label) ? 'jbx' : /violin/i.test(it.label) ? 'vln' : 'ins';
      add('in', `i:${Math.round(it.pos.x)},${Math.round(it.pos.z)}:${it.label}`, it, { look: t, kind: 'instrument', name: it.label.replace(/^Play (the )?/i, ''), pos: () => it.pos });
    }
  }
  const vcode = v => v.stolen ? 'vs' : v.stolenGoods ? 'vx' : v.owned ? 'vo' : ['police', 'ambulance', 'bus', 'tank', 'fire', 'army'].includes(v.kind) ? 'vg' : 'vc';
  let vSeq = 0, goods = null;
  function registerMoving() {
    ctx.peds().forEach((e, i) => { if (!byObj.has(e)) { const c = ctx.citizenOf?.(e); add('npc', `p:${i}`, e, { kind: 'resident', name: c?.name || e.labelName || 'Resident', pos: () => e.hidden ? (e.socHome || null) : e.root.position }); } });
    for (const e of ctx.cops?.() || []) if (!byObj.has(e)) add('po', `cop:${vSeq++}`, e, { kind: 'police officer', name: 'Police officer', pos: () => e.root.position });
    for (const h of ctx.robots?.() || []) if (!byObj.has(h)) add('rb', `rb:${vSeq++}`, h, { kind: 'ATLAS robot', name: 'Robot', pos: () => h.root.position });
    for (const v of ctx.vehicles()) {
      const code = vcode(v), e = byObj.get(v);
      const look = VKIND[v.kind] || String(v.kind || 'veh').slice(0, 3);
      if (!e) { const mats = madeOf([v.group], true); add(code, `v:${v.kind}:${vSeq++}`, v, { look: look + mats.slice(0, 2).join(''), materials: mats, kind: v.kind, name: v.name || v.kind, pos: () => v.group.position }); continue; }
      if (e.code !== code) {   // it was stolen / bought / seized: new code, old ID kept as an alias
        const old = e.id, n = add(code, old, v, { look: look + (e.materials || []).slice(0, 2).join(''), materials: e.materials, kind: e.kind, name: e.name, pos: e.pos });
        n.history = e.history; n.aliases = [...(e.aliases || []), old]; alias.set(old, n.id); reg.delete(old);
        event(n, `${CODES[e.code]} → ${CODES[code]} (was ${old})`);
      }
    }
  }
  const player = { id: playerId, code: 'np', kind: 'player', name: 'You', obj: ctx.player(), pos: () => ctx.player().position, history: [] };
  reg.set(playerId, player); byObj.set(ctx.player(), player);

  // ---- watch what moving things are doing ----------------------------------------------------------------
  const last = new WeakMap();
  function watch() {
    const pp = ctx.player().position;
    for (const e of reg.values()) {
      if (!['npc', 'po', 'vs', 'vx', 'vo'].includes(e.code)) continue;
      const o = e.obj, p = e.pos?.(); if (!p || Math.hypot(p.x - pp.x, p.z - pp.z) > 160) continue;
      const state = o.ped?.state === 'soc' ? o.soc?.kind : o.ped?.state || (o === ctx.driving?.() ? 'driven by you' : o.speed ? 'moving' : 'parked');
      const prev = last.get(o);
      if (prev !== state && state && !['wander', 'parked', 'moving'].includes(state)) event(e, state);
      last.set(o, state);
    }
  }

  // ---- grass: every tuft around you has an ID (gr + s short / m medium / l long) -------------------------
  const grassLook = p => p.s * p.tall < .75 ? 's' : p.s * p.tall > 1.15 ? 'l' : 'm';
  const grassId = p => makeId('gr' + grassLook(p), `t:${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  function grassNear(r = 15, max = 60) {
    const pp = ctx.player().position, out = [];
    for (const p of ctx.grass?.() || []) { if (!p.ok) continue; const d = Math.hypot(p.x - pp.x, p.z - pp.z); if (d < r) out.push({ id: grassId(p), code: 'gr', name: { s: 'Short', m: 'Medium', l: 'Long' }[grassLook(p)] + ' grass tuft', pos: () => p, history: [] }); }
    return out.sort((a, b) => dist(a) - dist(b)).slice(0, max);
  }
  function nearestId(pos, codes, r = 30) { let best = null, bd = r; for (const e of reg.values()) { if (codes && !codes.includes(e.code)) continue; const p = e.pos?.(); if (!p) continue; const d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < bd) { bd = d; best = e; } } return best?.id || null; }

  // ---- the AUDIT: things that overlap and shouldn't --------------------------------------------------------
  const bugs = new Map();
  function bug(cat, pos, ids, words) {
    const key = cat + ':' + ids.slice().sort().join('+');
    const b = bugs.get(key); if (b) { b.count++; return; }
    bugs.set(key, { key, cat, ids, x: Math.round(pos.x), z: Math.round(pos.z), words, t: Date.now(), count: 1 });
    ctx.reportBug?.(cat, pos, ids, words);
  }
  function auditGrass() {   // grass must never grow through a road or inside a building
    for (const p of ctx.grass?.() || []) {
      if (!p.ok) continue;
      const road = ctx.isRoad?.(p.x, p.z), inside = !road && ctx.blockedAt?.(p.x, p.z, .02);
      if (road || inside) bug(road ? 'grass-on-road' : 'grass-in-building', p, [grassId(p), nearestId(p, road ? ['rt', 'bh'] : ['rp', 'bh', 'hs'], 40)].filter(Boolean), road ? 'Grass is growing through the road here.' : 'Grass is growing inside a building here.');
    }
  }
  const surfLook = mat => { const sf = mat?.userData?.surface; return sf ? (sf.kind === 'checker' ? 'bw' : colourCode(sf.colour)) + (MAT[sf.kind] || '') : colourCode(mat?.color) + (materialOf(mat) || ''); };
  function surfaceId(rec) {
    let e = byObj.get(rec.m); if (e) return e.id;
    const isFloor = !!rec.mat?.userData?.surface;
    e = add(isFloor ? 'fl' : 'sf', `s:${rec.x0.toFixed(1)},${rec.z0.toFixed(1)},${rec.x1.toFixed(1)},${rec.z1.toFixed(1)},${rec.top.toFixed(2)}`, rec.m, { look: rec.look, kind: isFloor ? 'floor tile' : 'surface', name: (isFloor ? 'Floor: ' : 'Surface: ') + rec.look, pos: () => ({ x: (rec.x0 + rec.x1) / 2, z: (rec.z0 + rec.z1) / 2 }) });
    return e.id;
  }
  let scan = null; const box = new ctx.THREE.Box3();
  function startScan() {
    const movers = new Set([...ctx.vehicles().map(v => v.group), ...ctx.peds().map(e => e.root)]);
    const list = []; ctx.scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible !== false) list.push(o); });
    scan = { list, i: 0, grid: new Map(), movers, found: 0, done: false };
    // buildings standing inside each other
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
      const rec = { m, mat, x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, top: box.max.y, look: surfLook(mat) };
      const cells = []; for (let gx = Math.floor(rec.x0 / 10); gx <= Math.floor(rec.x1 / 10); gx++) for (let gz = Math.floor(rec.z0 / 10); gz <= Math.floor(rec.z1 / 10); gz++) cells.push(gx + ',' + gz);
      for (const k of cells.slice(0, 64)) {
        const list = scan.grid.get(k) || []; scan.grid.set(k, list);
        for (const o of list) {
          if (o === rec || Math.abs(o.top - rec.top) > .006 || o.mat === mat) continue;
          if (o.look === rec.look) continue;   // same look: overlapping, but you can't see it
          const ox = Math.min(o.x1, rec.x1) - Math.max(o.x0, rec.x0), oz = Math.min(o.z1, rec.z1) - Math.max(o.z0, rec.z0);
          if (ox > .5 && oz > .5) { scan.found++; bug('surface-overlap', { x: (Math.max(o.x0, rec.x0) + Math.min(o.x1, rec.x1)) / 2, z: (Math.max(o.z0, rec.z0) + Math.min(o.z1, rec.z1)) / 2 }, [surfaceId(o), surfaceId(rec)], `Two surfaces (${o.look || 'plain'} and ${rec.look || 'plain'}) lie at the same height and flicker through each other.`); }
        }
        list.push(rec);
      }
    }
    if (scan.i >= scan.list.length) { scan.done = true; scan.grid.clear(); }
  }

  // ---- the tracker panel ---------------------------------------------------------------------------------
  const panel = document.createElement('section'); panel.id = 'idTracker'; panel.hidden = true; document.body.append(panel);
  const st = document.createElement('style');
  st.textContent = '#idTracker{position:fixed;inset:6% max(12px,14%);z-index:47;background:#0f1b26f5;color:#e9f1f7;border:1px solid #5d7a94;border-radius:16px;padding:16px 18px;overflow:auto;font:13px/1.45 ui-monospace,Menlo,monospace}#idTracker[hidden]{display:none}#idTracker h2{font:600 18px system-ui;margin:0 0 6px}#idTracker h3{font:600 12px system-ui;color:#9fc0de;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 4px}#idTracker input{width:60%;padding:8px;border-radius:8px;border:0;font:inherit}#idTracker button{min-height:36px;padding:6px 10px;margin:3px 4px 3px 0;border:0;border-radius:8px;background:#365f86;color:#fff;font:12px system-ui}#idTracker button.on{background:#2f8f5b}#idTracker table{border-collapse:collapse;width:100%}#idTracker td{padding:2px 8px 2px 0;vertical-align:top}#idTracker .x{float:right}@media(max-width:700px){#idTracker{inset:4% 8px}}';
  document.head.append(st);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let filter = null, query = '', tagsOn = false;
  const at = p => p ? `(${Math.round(p.x)}, ${Math.round(p.z)})` : '(indoors / away)';
  const dist = e => { const p = e.pos?.(), q = ctx.player().position; return p ? Math.hypot(p.x - q.x, p.z - q.z) : 1e9; };
  function heading(e) { const o = e.obj; const t = o?.ped?.target || o?.soc?.spot || o?.ai?.target; return t ? ' → heading to ' + at(t) : ''; }
  function find(q) { q = q.trim().toLowerCase(); const id = alias.get(q) || q; return reg.get(id) || (codeOf(id) === 'grs' || /gr[sml]\d/.test(id) ? grassNear(60, 5000).find(g => g.id === id) : null) || [...reg.values()].find(e => e.name?.toLowerCase() === q); }
  function render() {
    const counts = {}; for (const e of reg.values()) counts[e.code] = (counts[e.code] || 0) + 1;
    const hit = query ? find(query) : null;
    const near = filter === 'gr' ? grassNear() : [...reg.values()].filter(e => (filter ? e.code === filter : !['mt', 'gc', 'fd'].includes(e.code)) && dist(e) < 120).sort((a, b) => dist(a) - dist(b)).slice(0, 40);
    const stock = ['mt', 'gc', 'fd'].includes(filter) ? [...reg.values()].filter(e => e.code === filter) : [];
    panel.innerHTML = `<button class="x" type="button" data-close>Close</button><h2>🆔 World ID tracker</h2>
      <div>Your ID: <b>${playerId}</b> · ${reg.size} things registered</div>
      <div style="margin-top:8px"><input data-q placeholder="Search an ID (e.g. 169273npc820w8x) or a name" value="${esc(query)}"><button type="button" data-find>Find</button><button type="button" data-tags class="${tagsOn ? 'on' : ''}">${tagsOn ? 'Hide' : 'Show'} ID tags in the world</button></div>
      ${hit ? `<h3>${esc(hit.id)}</h3><div>${esc(CODES[hit.code])} · ${esc(hit.name)} · at ${at(hit.pos?.())}${heading(hit)}${hit.aliases ? ' · earlier IDs: ' + hit.aliases.map(esc).join(', ') : ''}</div>${hit.materials?.length ? `<div>Made of: ${hit.materials.map(m => `${esc(MATERIALS[m] || m)} <a href="#" data-id="${matIds[m]}" style="color:#9fd3ff">${matIds[m]}</a>`).join(' + ')}</div>` : ''}${hit.parts?.length ? `<div>Made from: ${hit.parts.map(([n, i]) => `${esc(n)} <a href="#" data-id="${i}" style="color:#9fd3ff">${i}</a>`).join(' + ')}</div>` : ''}<table>${hit.history.map(h => `<tr><td>${new Date(h.t).toLocaleTimeString()}</td><td>${esc(h.what)}</td><td>${h.x != null ? `(${h.x}, ${h.z})` : ''}</td></tr>`).join('') || '<tr><td>Nothing recorded yet.</td></tr>'}</table>` : query ? '<h3>No match</h3>' : ''}
      <h3>Codes</h3><div>${Object.entries(CODES).map(([c, d]) => `<button type="button" data-code="${c}" class="${filter === c ? 'on' : ''}" title="${esc(d)}">${c} · ${esc(d)} (${counts[c] || 0})</button>`).join('')}</div>
      ${stock.length ? `<h3>${esc(CODES[filter])}</h3><table>${stock.map(e => `<tr><td><a href="#" data-id="${e.id}" style="color:#9fd3ff">${e.id}</a></td><td>${esc(e.name)}</td></tr>`).join('')}</table>` : ''}
      <h3>Problems found (${bugs.size})</h3><div><button type="button" data-scan>${scan && !scan.done ? `Scanning… ${Math.round(100 * scan.i / scan.list.length)}%` : 'Scan the world for overlaps'}</button></div><table>${[...bugs.values()].slice(-30).reverse().map(b => `<tr><td>${esc(b.cat)}</td><td>(${b.x}, ${b.z})</td><td>${b.ids.map(i => `<a href="#" data-id="${i}" style="color:#ffb37f">${i}</a>`).join(' + ')}</td><td>${b.count > 1 ? '×' + b.count : ''}</td></tr>`).join('') || '<tr><td>None found yet.</td></tr>'}</table>
      <h3>Near you${filter ? ' · ' + esc(CODES[filter]) : ''}</h3><table>${near.map(e => `<tr><td><a href="#" data-id="${e.id}" style="color:#9fd3ff">${e.id}</a></td><td>${esc(e.name)}</td><td>${at(e.pos?.())}${esc(heading(e))}</td></tr>`).join('')}</table>
      <h3>What's been happening</h3><table>${log.slice(0, 40).map(h => `<tr><td>${new Date(h.t).toLocaleTimeString()}</td><td><a href="#" data-id="${h.id}" style="color:#9fd3ff">${h.id}</a></td><td>${esc(h.what)}</td><td>${h.x != null ? `(${h.x}, ${h.z})` : ''}</td></tr>`).join('')}</table>`;
  }
  panel.addEventListener('click', ev => {
    const t = ev.target.closest('[data-id],button'); if (!t) return; ev.preventDefault();
    const d = t.dataset;
    if (d.id) { query = d.id; render(); return; }
    if (d.close != null) { close(); return; }
    if (d.find != null) { query = panel.querySelector('[data-q]').value; render(); return; }
    if (d.code) { filter = filter === d.code ? null : d.code; render(); return; }
    if (d.tags != null) { tagsOn = !tagsOn; if (!tagsOn) clearTags(); render(); }
    if (d.scan != null) { if (!scan || scan.done) startScan(); render(); }
  });
  panel.addEventListener('keydown', e => { if (e.code === 'Enter') { query = panel.querySelector('[data-q]').value; render(); } if (e.code === 'Escape') close(); e.stopPropagation(); });
  function open() { registerMoving(); render(); panel.hidden = false; ctx.pause(); }
  function close() { panel.hidden = true; ctx.resume(); }

  // ---- ID tags floating over things near you ---------------------------------------------------------------
  const tags = new Map();
  function tagFor(e) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const g = cv.getContext('2d');
    g.fillStyle = 'rgba(10,20,30,.78)'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#7fe8ff'; g.font = '600 30px ui-monospace,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.id, 256, 33);
    const tex = new ctx.THREE.CanvasTexture(cv), sp = new ctx.THREE.Sprite(new ctx.THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(2.6, .33, 1); sp.renderOrder = 30; ctx.scene.add(sp); return sp;
  }
  function clearTags() { for (const sp of tags.values()) { ctx.scene.remove(sp); sp.material.map.dispose(); sp.material.dispose(); } tags.clear(); }
  function updateTags() {
    const want = new Set([...reg.values()].filter(e => e.code !== 'np' && e.code !== 'rt' && e.code !== 'gt' && dist(e) < 35).sort((a, b) => dist(a) - dist(b)).slice(0, 24).map(e => e.id));
    for (const [id, sp] of tags) if (!want.has(id)) { ctx.scene.remove(sp); sp.material.map.dispose(); sp.material.dispose(); tags.delete(id); }
    for (const id of want) { const e = reg.get(id), p = e.pos?.(); if (!p) continue; let sp = tags.get(id); if (!sp) tags.set(id, sp = tagFor(e)); const y = e.obj?.root ? e.obj.root.position.y + 2.6 : e.obj?.group ? e.obj.group.position.y + 2.4 : (e.obj?.top || 6) + 1; sp.position.set(p.x, y, p.z); }
  }

  let t = 0, slow = 0;
  setTimeout(() => { registerStatic(); registerMoving(); }, 4000);
  setTimeout(() => { if (!scan) startScan(); }, 15000);   // one full audit a little after the world has loaded
  return {
    codes: CODES, playerId, find, open, close, get isOpen() { return !panel.hidden; },
    idOf(obj) { return byObj.get(obj)?.id || null; },
    record(obj, what, pos) { const e = byObj.get(obj); if (e) event(e, what, pos); },
    nearest: nearestId, bugs: () => [...bugs.values()], scanNow() { startScan(); while (!scan.done) stepScan(5000); return bugs.size; },
    get size() { return reg.size; }, log: () => log,
    update(dt) {
      t -= dt; slow -= dt;
      if (slow <= 0) { slow = 5; registerStatic(); registerMoving(); }
      if (t <= 0) { t = 1; watch(); if (tagsOn) updateTags(); auditGrass(); if (!panel.hidden && scan && !scan.done) render(); }
      stepScan();
    },
  };
}
