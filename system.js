// THE SYSTEM (Story Mode). This file is only the engine. Everything the System says, the story scenes
// and the quests it hands out live in a locked Supabase table (story_nodes) that the game reads one
// piece at a time through the story_get() function, so the story itself is not in this repo.
// Pieces already fetched are cached on the device, so Story Mode keeps working offline afterwards.
//
// Rules the engine enforces:
// - Up to level 5 the System sets three daily quests; after that the quests get harder.
// - Quests are measured, never ticked by hand: distance run on foot, exercise reps, meals eaten.
// - Death: wait 24 real hours before you can play again. Above level 10 you drop two levels.
//   What you carried stays where you died, and the longer you're gone the likelier someone loots it.
// - Some numbers are hidden from the player (tracked, never shown).
import * as THREE from 'three';

export const DEATH_WAIT_MS = 24 * 60 * 60 * 1000;
export const START_KEY = 'ch1.start';

// The local calendar day, so daily quests change at the player's own midnight.
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Picks `n` quests from a pool, the same picks all day (seeded by the day), never the same quest twice.
export function pickDaily(pool, day, n = 3) {
  let h = 2166136261;
  for (const c of day) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  const left = pool.slice(), out = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rnd() * left.length), 1)[0]);
  return out;
}

// What a death costs. Level drop only above level 10; the floor is level 1 until we decide otherwise.
export function levelAfterDeath(level) { return level > 10 ? Math.max(1, level - 2) : level; }

// Chance that NPCs have looted what you left where you died, after `hours` away.
export function lootChance(hours) { return Math.min(0.97, 1 - Math.exp(-Math.max(0, hours) / 10)); }

export function createSystem(ctx) {
  const KEY = () => 'system:' + ctx.userId();
  const CACHE = 'storyNodes';
  let st = fresh();   // loaded for the signed-in player in resume()
  let open = false, lastPos = null, lastHunger = null, repBusy = 0;

  function fresh() {
    return { on: false, day: null, quests: [], level5: false, deadUntil: 0, dropped: [], seen: [],
      // hidden: never shown to the player
      hidden: { bloodPower: 100, bloodMemory: 100, loyalty: 0, protagonistPoints: 0 } };
  }
  function load() { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY()) || 'null') }; } catch { return fresh(); } }
  function save() { try { localStorage.setItem(KEY(), JSON.stringify(st)); } catch {} }

  // ---- story pieces: cache first, then the locked table ----
  function cache() { try { return JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch { return {}; } }
  async function nodes(keys) {
    const c = cache(), want = keys.filter(k => !c[k]);
    if (want.length && navigator.onLine) {
      try { const got = await ctx.fetchNodes(want); Object.assign(c, got || {}); localStorage.setItem(CACHE, JSON.stringify(c)); } catch {}
    }
    return keys.map(k => c[k] || null);
  }
  async function node(k) { return (await nodes([k]))[0]; }

  // ---- the page: scenes and System windows ----
  const css = document.createElement('style');
  css.textContent = `#sysPage{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:#000c;padding:16px}
#sysPage[hidden]{display:none}#sysPage .box{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;border-radius:12px;padding:22px 24px;font:16px/1.65 Georgia,serif;background:#f3eee4;color:#1c1915}
#sysPage .box.sys{font:15px/1.6 ui-monospace,Menlo,monospace;background:#0b1422;color:#d6e6ff;border:1px solid #4d7fd1;box-shadow:0 0 40px #2a5fbf66}
#sysPage h2{font:700 15px system-ui;letter-spacing:.08em;text-transform:uppercase;margin:0 0 14px}#sysPage p{white-space:pre-wrap;margin:0 0 12px}
#sysPage .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}#sysPage button{font:14px system-ui;padding:10px 16px;min-height:44px;border:0;border-radius:8px;background:#2b2b2b;color:#fff;cursor:pointer}
#sysPage .sys button{background:#24467f}#sysPage .q{border-top:1px solid #4d7fd155;padding:10px 0}#sysPage .q.done{opacity:.55}
#sysPage .bar{height:6px;background:#ffffff1f;border-radius:3px;overflow:hidden;margin-top:6px}#sysPage .bar i{display:block;height:100%;background:#6fa8ff}
#sysBtn{position:fixed;right:16px;top:56px;z-index:12;color:#d6e6ff;font:12px system-ui;background:#0b1422cc;border:1px solid #4d7fd1;border-radius:10px;padding:7px 12px;cursor:pointer}
#sysBtn[hidden]{display:none}`;
  document.head.append(css);
  const page = document.createElement('section'); page.id = 'sysPage'; page.hidden = true; document.body.append(page);
  const btn = document.createElement('button'); btn.id = 'sysBtn'; btn.type = 'button'; btn.textContent = '◆ System'; btn.hidden = true;
  btn.onclick = () => showWindow(); document.body.append(btn);

  function show({ title, text, system, buttons }) {
    page.innerHTML = '';
    const box = document.createElement('div'); box.className = 'box' + (system ? ' sys' : '');
    if (title) { const h = document.createElement('h2'); h.textContent = title; box.append(h); }
    for (const t of [].concat(text || [])) { const p = document.createElement('p'); p.textContent = t; box.append(p); }
    const row = document.createElement('div'); row.className = 'row';
    for (const b of buttons || []) { const e = document.createElement('button'); e.type = 'button'; e.textContent = b.label; e.onclick = b.go; row.append(e); }
    box.append(row); page.append(box); page.hidden = false;
    if (!open) { open = true; ctx.pause(); }
    return box;
  }
  function close() { page.hidden = true; if (open) { open = false; ctx.resume(); } }

  // Plays a chain of pieces: scenes (pages of text), System messages, choices.
  async function play(key) {
    let n = await node(key);
    if (!n) return offlineNotice();
    if (!st.seen.includes(key)) st.seen.push(key);
    const pages = n.pages || [n.text || ''];
    for (let i = 0; i < pages.length; i++) {
      const last = i === pages.length - 1;
      const choice = await new Promise(res => {
        const buttons = last && n.choices ? n.choices.map(c => ({ label: c.label, go: () => res(c) })) : [{ label: last && !n.next ? 'Close' : 'Next', go: () => res(null) }];
        show({ title: n.title, text: pages[i], system: n.type === 'system', buttons });
      });
      if (choice) { if (choice.flag) st.hidden[choice.flag] = (st.hidden[choice.flag] || 0) + (choice.by || 1); save(); return play(choice.next); }
    }
    if (n.enable === 'system') { st.on = true; btn.hidden = false; refreshDay(); }
    save();
    if (n.next) return play(n.next);
    close();
  }
  function offlineNotice() {
    show({ title: 'Story Mode', text: navigator.onLine ? 'The story could not be loaded just now. Try again in a moment.' : 'Connect to the internet once so the story can download. After that it works offline.', buttons: [{ label: 'Close', go: close }] });
  }

  // ---- daily quests ----
  async function refreshDay() {
    const today = dayKey();
    if (st.day === today && st.quests.length) return;
    const pool = await node(ctx.level() >= 5 ? 'ch1.daily.hard' : 'ch1.daily');
    if (!pool) return;
    st.day = today;
    st.quests = pickDaily(pool.quests, today, pool.perDay || 3).map(q => ({ ...q, progress: 0, done: false }));
    save();
    ctx.toast('◆ [SYSTEM] New daily quests have arrived.');
  }
  function bump(kind, amount, exercise) {
    if (!st.on || st.deadUntil > Date.now()) return;
    let changed = false;
    for (const q of st.quests) {
      if (q.done || q.kind !== kind || (q.exercise && q.exercise !== exercise)) continue;
      q.progress = Math.min(q.target, q.progress + amount); changed = true;
      if (q.progress >= q.target) complete(q);
    }
    if (changed) { save(); if (open && page.dataset.view === 'window') showWindow(); }
  }
  function complete(q) {
    q.done = true;
    ctx.toast(`◆ [SYSTEM] Quest complete: ${q.title}. +${q.xp} XP`);
    const before = ctx.level();
    ctx.gainXp(q.xp);
    if (st.quests.every(x => x.done)) ctx.toast('◆ [SYSTEM] All daily quests complete.');
    if (before < 5 && ctx.level() >= 5 && !st.level5) { st.level5 = true; save(); node('ch1.level5').then(n => n && setTimeout(() => play('ch1.level5'), 1200)); }
  }

  // The System window: level, XP and today's quests, with buttons for exercises.
  function showWindow() {
    if (!st.on) return;
    const lines = [`Level ${ctx.level()}   ·   XP ${ctx.xp()} / ${ctx.xpNext()}   ·   Unspent points ${ctx.points()}`];
    const box = show({ title: '[ SYSTEM ]', text: lines, system: true, buttons: [{ label: 'Close', go: close }] });
    page.dataset.view = 'window';
    const list = document.createElement('div');
    for (const q of st.quests) {
      const d = document.createElement('div'); d.className = 'q' + (q.done ? ' done' : '');
      const unit = q.kind === 'run' ? ' m' : '';
      d.innerHTML = `<b></b><div></div><div class="bar"><i style="width:${Math.round(q.progress / q.target * 100)}%"></i></div>`;
      d.querySelector('b').textContent = (q.done ? '✓ ' : '') + q.title;
      d.querySelector('div').textContent = `${Math.floor(q.progress)}${unit} / ${q.target}${unit}   ·   +${q.xp} XP`;
      if (q.kind === 'reps' && !q.done) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Do one ' + q.exercise; b.style.marginTop = '8px';
        b.onclick = () => rep(q.exercise, b); d.append(b);
      }
      list.append(d);
    }
    if (!st.quests.length) { const p = document.createElement('p'); p.textContent = 'No quests yet today.'; list.append(p); }
    box.insertBefore(list, box.querySelector('.row'));
  }
  // One rep takes a moment and a little energy, so it can't be spammed.
  function rep(exercise, b) {
    const now = performance.now();
    if (now < repBusy) return;
    if (ctx.energy() < 2) return ctx.toast('You are too exhausted. Eat or sleep first.');
    repBusy = now + 900; b.disabled = true; ctx.spendEnergy(0.6);
    setTimeout(() => { b.disabled = false; bump('reps', 1, exercise); }, 900);
  }

  // ---- death ----
  function died(where) {
    if (!st.on) return false;
    const lvl = ctx.level(), to = levelAfterDeath(lvl);
    if (to !== lvl) ctx.setLevel(to);
    const things = ctx.takeBelongings();
    if (things.gold > 0 || things.items.length) st.dropped.push({ x: where.x, y: where.y, z: where.z, at: Date.now(), ...things });
    st.deadUntil = Date.now() + DEATH_WAIT_MS;
    const h = st.hidden; h.bloodPower = Math.max(0, h.bloodPower - 10); h.bloodMemory = Math.max(0, h.bloodMemory - 10); h.loyalty = Math.max(-100, h.loyalty - 15);
    save(); placeDropped(); deathScreen();
    // the server sets its own 24-hour wait; trust whichever ends later
    ctx.server?.died().then(r => { const t = r?.dead_until ? Date.parse(r.dead_until) : 0; if (t > st.deadUntil) { st.deadUntil = t; save(); } }).catch(() => {});
    return true;
  }
  function deathScreen() {
    const tick = () => {
      const left = st.deadUntil - Date.now();
      if (left <= 0) { st.deadUntil = 0; save(); clearInterval(t); close(); ctx.toast('You wake up. Your things are where you fell, if nobody has taken them.'); return; }
      const hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60;
      show({ title: 'You died', text: [`You can play again in ${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s.`, 'Everything you carried is lying where you fell.'], buttons: [] });
    };
    const t = setInterval(tick, 1000); tick();
  }

  // Belongings left where you died: walk back to them and see what's left.
  const markers = [];
  function placeDropped() {
    for (const m of markers.splice(0)) { const i = ctx.interactables.indexOf(m); if (i >= 0) ctx.interactables.splice(i, 1); }
    st.dropped.forEach((d, idx) => {
      const m = { pos: new THREE.Vector3(d.x, d.y + 0.2, d.z), r: 2.2, label: 'Your belongings (where you died)', action: () => recover(idx) };
      markers.push(m); ctx.interactables.push(m);
    });
  }
  function recover(idx) {
    const d = st.dropped[idx]; if (!d) return;
    st.dropped.splice(idx, 1);
    const hours = (Date.now() - d.at) / 3600000;
    if (Math.random() < lootChance(hours)) ctx.toast('Nothing left. Someone got here first.');
    else { ctx.giveBelongings(d); ctx.toast('You got your things back.'); }
    save(); placeDropped();
  }

  return {
    get open() { return open; },
    active: () => st.on,
    dead: () => st.deadUntil > Date.now(),
    // a brand-new Story Mode game: wipe the System and play the opening
    async begin() { st = fresh(); save(); btn.hidden = true; ctx.server?.start().catch(() => {}); await play(START_KEY); },
    // continuing: restore the button, the markers, and the death wait if it isn't over
    // `run` is the server's record: if it exists the System stays on even when this device lost its save,
    // and its death wait counts even if the browser's was wiped
    resume(run) {
      st = load();
      if (run) { st.on = true; const t = run.dead_until ? Date.parse(run.dead_until) : 0; if (t > st.deadUntil) st.deadUntil = t; save(); }
      btn.hidden = !st.on; placeDropped(); if (st.deadUntil > Date.now()) deathScreen(); else if (st.on) refreshDay(); },
    died,
    toggle() { if (open && page.dataset.view === 'window') close(); else showWindow(); },
    update(dt) {
      if (!st.on || open) { lastPos = null; return; }
      if (st.day !== dayKey()) refreshDay();
      const p = ctx.playerPos();
      if (ctx.onFoot()) {
        if (lastPos) { const step = Math.hypot(p.x - lastPos.x, p.z - lastPos.z); if (step < 12 * dt + 0.05) bump('run', step); }
        lastPos = { x: p.x, z: p.z };
      } else lastPos = null;
      const hunger = ctx.hunger();
      if (lastHunger != null && hunger - lastHunger >= 10) bump('eat', 1);
      lastHunger = hunger;
    },
  };
}
