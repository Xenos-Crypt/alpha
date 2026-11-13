// WORLD WATCH — the residents notice when the world doesn't make sense, and say so.
//
// The people of this world know that the laws of nature and of the city were written by THE LAWGIVER
// (the AI that builds this world). They also believe in a SUPREME BEING above even the Lawgiver, though
// they know nothing about it except that it exists.
//
// When a resident sees something wrong, they report it:
//  • Things that break the laws of nature are put right on the spot by the RULE KEEPERS (the world's
//    own enforcement bots): a car driving on the sea is towed back to land, a car stuck inside a
//    building is pulled out, a person floating in the air or sunk into the ground is set back on their
//    feet, and someone stuck against a wall is moved on.
//  • Things only the Lawgiver can change, such as a building standing in the road or a run-down eyesore,
//    become PETITIONS TO THE LAWGIVER.
// Every report (fixed or not) is kept in the City Hall panel and sent to /api/world-report, so the
// Lawgiver can read them and fix the causes. You can add your own note there too.
import * as THREE from 'three';

const KEY = 'aw.petitions.v1';
const LAND_KINDS = new Set(['car', 'police', 'bus', 'ambulance', 'tank', 'bicycle', 'motorcycle', 'truck', 'lorry', 'fire', 'van']);
const WORDS = {
  'car-on-water': ['A car was driving on the water! Cars sink, everyone knows that. The Lawgiver must hear of this.', 'I saw a car cross the sea like it was a road. That breaks the laws of nature.'],
  'car-in-building': ['A car was stuck right inside a building. Walls are walls! I hope the Lawgiver sees.', 'There is a car half inside that wall. The Rule Keepers had to pull it out.'],
  'person-floating': ['Someone was floating in the air, feet off the ground. That is not how the world works.'],
  'person-underground': ['A person was sunk into the ground up to the waist! The Rule Keepers lifted them out.'],
  'person-stuck': ['Someone kept walking into a wall, going nowhere. The Rule Keepers moved them on.'],
  'building-on-road': ['A building stands right across the road here. Who builds on a road? I petition the Lawgiver to move it.', 'The road runs straight into a building. It makes no sense. Lawgiver, please fix it.'],
  'shabby-building': ["This building doesn't look nice: it is falling apart. I ask the Lawgiver to have it rebuilt.", 'What an eyesore. Peeling, cracked, run-down. Surely the Lawgiver meant better for this street.'],
  'note': [''],
};
const TITLES = { 'car-on-water': 'Car driving on water', 'car-in-building': 'Car inside a building', 'person-floating': 'Person floating', 'person-underground': 'Person in the ground', 'person-stuck': 'Person stuck', 'building-on-road': 'Building across a road', 'shabby-building': "Building doesn't look nice", note: 'Note from the newcomer' };

export function createWorldWatch(ctx) {
  let list = []; try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200))); } catch { } };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function report(cat, pos, { who = null, fixed = false, words = null } = {}) {
    const key = cat + ':' + Math.round(pos.x / 25) + ',' + Math.round(pos.z / 25);
    let r = list.find(x => x.key === key);
    const name = who ? (ctx.nameOf(who) || 'A resident') : 'A resident';
    if (!r) { r = { key, cat, title: TITLES[cat], x: Math.round(pos.x), z: Math.round(pos.z), first: Date.now(), count: 0, fixed: 0, who: [], words: words || pick(WORDS[cat]), sent: false }; list.unshift(r); ctx.onNew?.(r, name); }
    r.count++; r.last = Date.now(); if (fixed) r.fixed++; if (!r.who.includes(name) && r.who.length < 6) r.who.push(name);
    r.status = fixed ? 'Put right by the Rule Keepers (the cause is with the Lawgiver)' : 'Awaiting the Lawgiver';
    r.sent = false; save();
    if (who && who.alive && !who.hidden) ctx.say?.(who, fixed ? 'That breaks the laws! Rule Keepers!' : 'The Lawgiver should see this…');
    return r;
  }
  // ---- a Rule Keeper's mark: a brief ring of light where the world was put right ------------------
  const ringGeo = new THREE.TorusGeometry(1.2, .06, 8, 40), marks = [];
  function mark(pos, what) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: .9 }));
    m.position.set(pos.x, pos.y + .2, pos.z); m.rotation.x = Math.PI / 2; ctx.scene.add(m); marks.push({ m, t: 1.6 });
    if (pos.distanceTo(ctx.playerPosition()) < 80) ctx.toast('⚖️ The Rule Keepers set it right: ' + what + '.');
  }
  const witness = pos => ctx.peds().find(e => e.alive && !e.hidden && e.root.position.distanceTo(pos) < 35);

  // ---- the laws of nature, checked around you -------------------------------------------------------
  const lastOk = new WeakMap(), still = new WeakMap(), odd = new WeakMap();
  function checkVehicles() {
    const pp = ctx.playerPosition();
    for (const v of ctx.vehicles()) {
      if (!LAND_KINDS.has(v.kind) || v === ctx.driving() || v.amphibious) continue;
      const p = v.group.position; if (p.distanceTo(pp) > 150) continue;
      const wet = ctx.isWater(p.x, p.z, p.y) && p.y < 1.5, inside = ctx.blockedAt(p.x, p.z, .9);
      if (!wet && !inside) { lastOk.set(v, p.clone()); still.set(v, 0); continue; }
      const back = lastOk.get(v);
      if (wet) {
        report('car-on-water', p, { who: witness(p), fixed: !!back });
        if (back) { p.copy(back); v.speed = 0; mark(p, 'a vehicle was driving on the water'); }
      } else {
        const n = (still.get(v) || 0) + 1; still.set(v, n);
        if (n >= 3) { report('car-in-building', p, { who: witness(p), fixed: !!back }); if (back) { p.copy(back); v.speed = 0; mark(p, 'a vehicle was stuck inside a building'); } still.set(v, 0); }
      }
    }
  }
  function checkPeople() {
    const pp = ctx.playerPosition();
    for (const e of ctx.peds()) {
      if (!e.alive || e.hidden || e.root.position.distanceTo(pp) > 90 || !e.ped) continue;
      const p = e.root.position, g = ctx.groundY(p.x, p.z, p.y), o = odd.get(e) || { f: 0, at: p.clone(), t: 0 };
      if (p.y - g > 1.6 && e.onGround !== false && !['riding', 'boarding'].includes(e.ped.state)) o.f++; else if (g - p.y > .9) o.f--; else o.f = 0;
      if (o.f >= 3) { report('person-floating', p, { who: witness(p), fixed: true }); p.y = g; mark(p, 'someone was floating in the air'); o.f = 0; }
      if (o.f <= -3) { report('person-underground', p, { who: witness(p), fixed: true }); p.y = g; mark(p, 'someone was sunk into the ground'); o.f = 0; }
      if (e.ped.state === 'wander') {
        if (p.distanceTo(o.at) > .6) { o.at.copy(p); o.t = 0; }
        else if ((o.t += 2) >= 24) { report('person-stuck', p, { who: witness(p), fixed: true }); ctx.unstick(e); mark(e.root.position, 'someone was stuck against a wall'); o.t = 0; o.at.copy(e.root.position); }
      } else o.t = 0;
      odd.set(e, o);
    }
  }
  // ---- things only the Lawgiver can change: found once, reported when someone walks past ----------------
  let flaws = null;
  function findFlaws() {
    flaws = [];
    const roads = ctx.roadRects();
    for (const b of ctx.buildings()) {
      if (!b.alive || !b.w) continue;
      const bx0 = b.x - b.w / 2, bx1 = b.x + b.w / 2, bz0 = b.z - b.d / 2, bz1 = b.z + b.d / 2;
      for (const r of roads) {
        const ox = Math.min(bx1, r.maxX) - Math.max(bx0, r.minX), oz = Math.min(bz1, r.maxZ) - Math.max(bz0, r.minZ);
        if (ox > 1.5 && oz > 1.5 && ox * oz > 6) { flaws.push({ cat: 'building-on-road', pos: new THREE.Vector3((Math.max(bx0, r.minX) + Math.min(bx1, r.maxX)) / 2, 0, (Math.max(bz0, r.minZ) + Math.min(bz1, r.maxZ)) / 2) }); break; }
      }
      if ((ctx.condition?.(b) ?? 100) < 35) flaws.push({ cat: 'shabby-building', pos: new THREE.Vector3(b.x, 0, b.z), b });
    }
  }
  function checkFlaws() {
    if (!flaws) return;
    const pp = ctx.playerPosition();
    for (const f of flaws) {
      if (f.done || f.pos.distanceTo(pp) > 120) continue;
      if (f.b && (ctx.condition?.(f.b) ?? 100) >= 35) { f.done = true; continue; }   // since repaired
      const who = witness(f.pos); if (who && Math.random() < .25) { report(f.cat, f.pos, { who }); f.done = true; }
    }
  }
  // ---- sending reports to the Lawgiver ------------------------------------------------------------------
  let sending = false;
  async function upload() {
    const batch = list.filter(r => !r.sent).slice(0, 20);
    if (!batch.length || sending || !navigator.onLine) return;
    sending = true;
    try {
      const res = await fetch('/api/world-report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reports: batch.map(({ key, cat, title, x, z, count, fixed, who, words, status, first, last }) => ({ key, cat, title, x, z, count, fixed, who, words, status, first, last })) }) });
      if (res.ok) { for (const r of batch) r.sent = true; save(); }
    } catch { } finally { sending = false; }
  }
  let t = 0, slow = 0, up = 30;
  setTimeout(findFlaws, 6000);
  return {
    list, report,
    note(text) { const r = report('note', ctx.playerPosition(), { words: String(text).slice(0, 500) }); r.key += ':' + Date.now(); r.who = ['The newcomer']; save(); upload(); return r; },
    update(dt) {
      for (const k of [...marks]) { k.t -= dt; k.m.scale.setScalar(1 + (1.6 - k.t)); k.m.material.opacity = Math.max(0, k.t / 1.6); if (k.t <= 0) { ctx.scene.remove(k.m); k.m.material.dispose(); marks.splice(marks.indexOf(k), 1); } }
      t -= dt; slow -= dt; up -= dt;
      if (t <= 0) { t = 1; checkVehicles(); }
      if (slow <= 0) { slow = 2; checkPeople(); checkFlaws(); }
      if (up <= 0) { up = 90; upload(); }
    },
  };
}
