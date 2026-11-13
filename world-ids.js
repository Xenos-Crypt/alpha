// WORLD IDs — every building, house, road tile, block, resident, vehicle and the player carries a unique ID,
// so it is easy to see what is going on and where things are going, and to point at exactly the thing that
// is wrong (residents' reports to the Lawgiver include the IDs).
//
// An ID is six digits, a TYPE CODE, then six letters/digits, e.g. 169273npc820w8x. The code says what it is:
const CODES = {
  np: 'the player',
  npc: 'resident',
  po: 'police officer on foot',
  rb: 'ATLAS robot',
  rp: 'building made at the owner\'s request',
  bh: 'building built by the bots (NPC crews, ATLAS, the residents)',
  hs: 'house',
  rt: 'road tile',
  gt: 'ground tile (city block)',
  vc: 'car owned by a resident (traffic)',
  vg: 'government vehicle (police, ambulance, bus, army)',
  vo: 'vehicle the player owns',
  vs: 'stolen vehicle',
  vx: 'vehicle got illegally (black market, hot plates)',
};
// IDs never change for the life of a thing, except that a vehicle's code follows what happens to it (stolen,
// bought on the black market...): it is re-registered under the new code and the old ID becomes an alias,
// so either one still finds it.
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
  return String(a % 1e6).padStart(6, '0') + code + (b.toString(36) + '000000').slice(0, 6);
}
export const codeOf = id => (String(id).match(/^\d{6}([a-z]+)[0-9a-z]{6}$/) || [])[1] || null;

export function createWorldIds(ctx) {
  const reg = new Map(), byObj = new WeakMap(), alias = new Map();
  let log = [], saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); log = saved.log || []; } catch { }
  // the player keeps one ID forever (it is random, made the first time you play)
  const playerId = saved.player || makeId('np', Math.random().toString(36) + Date.now());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ player: playerId, log: log.slice(0, LOGMAX) })); } catch { } };
  save();

  function add(code, seed, obj, info) {
    let id = makeId(code, seed), n = 1;
    while (reg.has(id) && reg.get(id).obj !== obj) id = makeId(code, seed + '#' + n++);
    const e = { id, code, obj, ...info, history: [] };
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
  function registerStatic() {
    for (const b of ctx.buildings()) if (!byObj.has(b)) add('rp', `b:${Math.round(b.x)},${Math.round(b.z)},${Math.round(b.w)}x${Math.round(b.d)}`, b, { kind: 'building', name: b.name || 'City building', pos: () => ({ x: b.x, z: b.z }) });
    for (const b of ctx.civicBuildings()) if (!byObj.has(b)) { const code = b.builtBy === 'bots' ? 'bh' : 'rp'; add(code, `c:${b.type}:${Math.round(b.x)},${Math.round(b.z)}`, b, { kind: b.type || 'building', name: b.name || b.type, pos: () => ({ x: b.x, z: b.z }) }); }
    for (const h of ctx.houses()) if (!byObj.has(h)) add('hs', `h:${Math.round((h.minX + h.maxX) / 2)},${Math.round((h.minZ + h.maxZ) / 2)}`, h, { kind: 'house', name: h.name || 'House', pos: () => ({ x: (h.minX + h.maxX) / 2, z: (h.minZ + h.maxZ) / 2 }) });
    for (const r of ctx.roads()) if (!byObj.has(r)) add(r.byBots ? 'bh' : 'rt', `r:${Math.round(r.minX)},${Math.round(r.minZ)},${Math.round(r.maxX)},${Math.round(r.maxZ)}`, r, { kind: r.byBots ? 'new road' : 'road tile', name: r.name || 'Road', pos: () => ({ x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 }) });
    for (const t of ctx.blocks()) if (!byObj.has(t)) add('gt', `g:${t.bx},${t.bz}`, t, { kind: 'city block', name: `${t.city} block ${t.bx},${t.bz}`, pos: () => ({ x: t.bx * 40 + 20, z: t.bz * 40 + 20 }) });
    for (const x of ctx.extra?.() || []) if (!byObj.has(x)) add(x.code, x.seed, x, { kind: x.kind, name: x.name, pos: () => x.pos });
  }
  const vcode = v => v.stolen ? 'vs' : v.stolenGoods ? 'vx' : v.owned ? 'vo' : ['police', 'ambulance', 'bus', 'tank', 'fire', 'army'].includes(v.kind) ? 'vg' : 'vc';
  let vSeq = 0;
  function registerMoving() {
    ctx.peds().forEach((e, i) => { if (!byObj.has(e)) { const c = ctx.citizenOf?.(e); add('npc', `p:${i}`, e, { kind: 'resident', name: c?.name || e.labelName || 'Resident', pos: () => e.hidden ? (e.socHome || null) : e.root.position }); } });
    for (const e of ctx.cops?.() || []) if (!byObj.has(e)) add('po', `cop:${vSeq++}`, e, { kind: 'police officer', name: 'Police officer', pos: () => e.root.position });
    for (const h of ctx.robots?.() || []) if (!byObj.has(h)) add('rb', `rb:${vSeq++}`, h, { kind: 'ATLAS robot', name: 'Robot', pos: () => h.root.position });
    for (const v of ctx.vehicles()) {
      const code = vcode(v), e = byObj.get(v);
      if (!e) { add(code, `v:${v.kind}:${vSeq++}`, v, { kind: v.kind, name: v.name || v.kind, pos: () => v.group.position }); continue; }
      if (e.code !== code) {   // it was stolen / bought / seized: new code, old ID kept as an alias
        const old = e.id, n = add(code, old, v, { kind: e.kind, name: e.name, pos: e.pos });
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
  function find(q) { q = q.trim().toLowerCase(); const id = alias.get(q) || q; return reg.get(id) || [...reg.values()].find(e => e.name?.toLowerCase() === q); }
  function render() {
    const counts = {}; for (const e of reg.values()) counts[e.code] = (counts[e.code] || 0) + 1;
    const hit = query ? find(query) : null;
    const near = [...reg.values()].filter(e => (!filter || e.code === filter) && dist(e) < 120).sort((a, b) => dist(a) - dist(b)).slice(0, 40);
    panel.innerHTML = `<button class="x" type="button" data-close>Close</button><h2>🆔 World ID tracker</h2>
      <div>Your ID: <b>${playerId}</b> · ${reg.size} things registered</div>
      <div style="margin-top:8px"><input data-q placeholder="Search an ID (e.g. 169273npc820w8x) or a name" value="${esc(query)}"><button type="button" data-find>Find</button><button type="button" data-tags class="${tagsOn ? 'on' : ''}">${tagsOn ? 'Hide' : 'Show'} ID tags in the world</button></div>
      ${hit ? `<h3>${esc(hit.id)}</h3><div>${esc(CODES[hit.code])} · ${esc(hit.name)} · at ${at(hit.pos?.())}${heading(hit)}${hit.aliases ? ' · earlier IDs: ' + hit.aliases.map(esc).join(', ') : ''}</div><table>${hit.history.map(h => `<tr><td>${new Date(h.t).toLocaleTimeString()}</td><td>${esc(h.what)}</td><td>${h.x != null ? `(${h.x}, ${h.z})` : ''}</td></tr>`).join('') || '<tr><td>Nothing recorded yet.</td></tr>'}</table>` : query ? '<h3>No match</h3>' : ''}
      <h3>Codes</h3><div>${Object.entries(CODES).map(([c, d]) => `<button type="button" data-code="${c}" class="${filter === c ? 'on' : ''}" title="${esc(d)}">${c} · ${esc(d)} (${counts[c] || 0})</button>`).join('')}</div>
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
  return {
    codes: CODES, playerId, find, open, close, get isOpen() { return !panel.hidden; },
    idOf(obj) { return byObj.get(obj)?.id || null; },
    record(obj, what, pos) { const e = byObj.get(obj); if (e) event(e, what, pos); },
    nearest(pos, codes, r = 30) { let best = null, bd = r; for (const e of reg.values()) { if (codes && !codes.includes(e.code)) continue; const p = e.pos?.(); if (!p) continue; const d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < bd) { bd = d; best = e; } } return best?.id || null; },
    get size() { return reg.size; }, log: () => log,
    update(dt) {
      t -= dt; slow -= dt;
      if (slow <= 0) { slow = 5; registerStatic(); registerMoving(); }
      if (t <= 0) { t = 1; watch(); if (tagsOn) updateTags(); }
    },
  };
}
