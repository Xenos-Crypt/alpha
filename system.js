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
    return { on: false, day: null, quests: [], log: [], level5: false, deadUntil: 0, dropped: [], seen: [],
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
#sysPage .sys button{background:#24467f}#sysPage .q{border-top:1px solid #4d7fd155;padding:10px 0}#sysPage .q.done{opacity:.55}#sysPage .q .d{opacity:.8;margin:4px 0}
#sysPage .bar{height:6px;background:#ffffff1f;border-radius:3px;overflow:hidden;margin-top:6px}#sysPage .bar i{display:block;height:100%;background:#6fa8ff}
#sysBtn{position:fixed;right:16px;top:96px;z-index:12;color:#d6e6ff;font:12px system-ui;background:#0b1422cc;border:1px solid #4d7fd1;border-radius:10px;padding:7px 12px;cursor:pointer}
#sysBtn[hidden]{display:none}
#sysPage.cine{background:none;align-items:center;padding:0 16px 9vh;cursor:pointer;flex-direction:column;justify-content:flex-end}
#sysPage.cine .hint{position:fixed;right:18px;bottom:calc(11vh + 10px);z-index:1;font:12px system-ui;color:#fff9;letter-spacing:.04em}
#sysPage.cine::before,#sysPage.cine::after{content:'';position:fixed;left:0;right:0;height:11vh;background:#000}#sysPage.cine::before{top:0}#sysPage.cine::after{bottom:0}
#sysPage.cine .sub{position:relative;z-index:1;width:min(760px,100%);text-align:center;color:#fff;font:18px/1.6 Georgia,serif;text-shadow:0 2px 6px #000,0 0 2px #000}
#sysPage.cine .sub.sys{font:15px/1.6 ui-monospace,Menlo,monospace;color:#d6e6ff;background:#0b1422e6;border:1px solid #4d7fd1;border-radius:12px;padding:16px 20px;text-shadow:none;box-shadow:0 0 40px #2a5fbf66;margin-bottom:6vh}
#sysPage.cine .sub h2{font:700 13px system-ui;letter-spacing:.08em;margin:0 0 8px}#sysPage.cine p{margin:0}
body.cinema #hud,body.cinema #hotbar,body.cinema #minimap,body.cinema #settingsBtn,body.cinema #sysBtn,body.cinema #crosshair,body.cinema #mouseHint{visibility:hidden}`;
  document.head.append(css);
  const page = document.createElement('section'); page.id = 'sysPage'; page.hidden = true; document.body.append(page);
  const btn = document.createElement('button'); btn.id = 'sysBtn'; btn.type = 'button'; btn.textContent = '◆ System'; btn.hidden = true;
  btn.onclick = () => showWindow(); document.body.append(btn);

  function show({ title, text, system, buttons }) {
    page.innerHTML = ''; page.className = '';
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
  // The opening plays like a film: no buttons, the camera moves through the home (ctx.cinema), text appears as
  // subtitles and moves on by itself. Which camera mark each page uses; a node can also set its own `shots`.
  const SHOTS = { 'ch1.start': ['ceiling', 'ceiling'], 'ch1.room': ['bedroom', 'cupboard', 'window'], 'ch1.phone': ['phone', 'phone'], 'ch1.mirror': ['mirror', 'mirror'], 'ch1.system': ['mirror', 'mirror'] };
  const readMs = t => 2600 + String(t).split(/\s+/).length * 330;   // about three words a second, plus a beat
  function subtitle(title, text, system) {
    page.innerHTML = ''; page.className = 'cine';
    const box = document.createElement('div'); box.className = 'sub' + (system ? ' sys' : '');
    if (title && system) { const h = document.createElement('h2'); h.textContent = title; box.append(h); }
    const p = document.createElement('p'); p.textContent = text; box.append(p);
    const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = 'Click or tap to continue';
    page.append(box, hint); page.hidden = false;
    if (!open) { open = true; ctx.pause(); }
  }
  // Narration: the device's own voice reads each line (free, no AI call). System lines sound flatter.
  function speak(text, system) {
    return new Promise(done => {
      const tts = window.speechSynthesis;
      if (!tts || typeof SpeechSynthesisUtterance === 'undefined') return done(false);
      tts.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim());
      const voices = tts.getVoices(), en = voices.filter(v => /^en(-|_|$)/i.test(v.lang));
      u.voice = (system ? en.find(v => /google uk english male|daniel|male/i.test(v.name)) : en.find(v => /google uk english|serena|samantha|natural/i.test(v.name))) || en[0] || null;
      u.rate = system ? 1.0 : 0.95; u.pitch = system ? 0.7 : 1;
      let over = false, began = false; const end = ok => { if (!over) { over = true; done(ok); } };
      u.onstart = () => { began = true; }; u.onend = () => end(true); u.onerror = () => end(false);
      setTimeout(() => { if (!began) { tts.cancel(); end(false); } }, 2500);   // no voice on this device: fall back to reading time
      setTimeout(() => end(false), 60000);
      tts.speak(u);
    });
  }
  // Waits for a line to be finished: the voice has read it and the camera has stopped walking, or the player
  // clicks (or taps, or presses Space/Enter) to move on to the next part.
  function lineDone(text, system) {
    return new Promise(res => {
      let skipped = false, spoke = null;
      const go = () => { if (skipped) return; skipped = true; window.speechSynthesis?.cancel(); ctx.cinema.finish(); cleanup(); res(); };
      const key = e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); go(); } };
      const cleanup = () => { page.removeEventListener('pointerdown', go); removeEventListener('keydown', key, true); };
      page.addEventListener('pointerdown', go); addEventListener('keydown', key, true);
      const started = Date.now(), minMs = readMs(text) * (system ? 1.1 : 1);
      speak(text, system).then(ok => { spoke = ok; });
      const wait = () => {
        if (skipped) return;
        const voiceDone = spoke !== null && (spoke ? true : Date.now() - started > minMs);
        if (voiceDone && !ctx.cinema.busy() && Date.now() - started > 1200) { skipped = true; cleanup(); setTimeout(res, 500); return; }
        setTimeout(wait, 150);
      };
      wait();
    });
  }
  async function film(key) {
    try { window.speechSynthesis?.getVoices(); } catch {}   // voices load in the background on some browsers
    ctx.cinema.start();
    let k = key;
    while (k) {
      const n = await node(k);
      if (!n) { ctx.cinema.end(); page.className = ''; return offlineNotice(); }
      if (!st.seen.includes(k)) st.seen.push(k);
      const pages = n.pages || [n.text || ''], shots = n.shots || SHOTS[k] || [];
      for (let i = 0; i < pages.length; i++) {
        if (shots[i]) ctx.cinema.shot(shots[i]);
        subtitle(n.title, pages[i], n.type === 'system');
        await lineDone(pages[i], n.type === 'system');
      }
      if (n.enable === 'system') { st.on = true; btn.hidden = false; }
      // a film has no choices: it follows the first path
      k = n.choices ? n.choices[0].next : n.next;
    }
    save();
    page.className = ''; ctx.cinema.end(); close();
    if (st.on) refreshDay();
  }

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
      if (choice) { st.log.push({ t: Date.now(), kind: 'choice', detail: (n.title || key) + ': ' + choice.label }); if (choice.flag) st.hidden[choice.flag] = (st.hidden[choice.flag] || 0) + (choice.by || 1); save(); return play(choice.next); }
    }
    if (n.enable === 'system') { st.on = true; btn.hidden = false; refreshDay(); }
    save();
    if (n.next) return play(n.next);
    close();
  }
  function offlineNotice() {
    show({ title: 'Story Mode', text: navigator.onLine ? 'The story could not be loaded just now. Try again in a moment.' : 'Connect to the internet once so the story can download. After that it works offline.', buttons: [{ label: 'Close', go: close }] });
  }

  // ---- quests ----
  // The Quest Director (an AI on the server, reading the private story bible) decides the quests from what
  // the player has actually been doing. The fixed pools in the table are only the fallback when the
  // Director can't be reached (offline, or the server is down).
  const KINDS = ['run', 'reps', 'eat', 'kill', 'visit', 'gold', 'open'];
  const EXERCISES = ['push-up', 'sit-up', 'squat'];
  function note(kind, detail) {
    if (!st.on) return;
    st.log.push({ t: Date.now(), kind, detail: String(detail || '').slice(0, 120) });
    if (st.log.length > 40) st.log.splice(0, st.log.length - 40);
    if (kind === 'kill') bump('kill', 1);
    if (['quest', 'death', 'level', 'dungeon', 'choice'].includes(kind)) askSoon();
    save();
  }
  let askTimer = 0, lastAsk = 0;
  function askSoon() { clearTimeout(askTimer); askTimer = setTimeout(() => ask('event'), Math.max(4000, lastAsk + 180000 - Date.now())); }
  async function ask(reason) {
    if (!navigator.onLine || !ctx.director) return null;
    lastAsk = Date.now();
    try {
      const snap = ctx.snapshot();
      const out = await ctx.director({ reason, day: dayKey(), level: ctx.level(), ...snap, scenes: st.seen.slice(-12), log: st.log.slice(-25),
        quests: st.quests.map(q => ({ id: q.id, title: q.title, kind: q.kind, detail: q.detail || '', progress: Math.floor(q.progress), target: q.target, done: q.done, failed: !!q.failed, daily: !!q.daily })) });
      if (!out) return null;
      for (const r of out.resolve || []) {
        const q = st.quests.find(x => x.id === r.id && !x.done && !x.failed);
        if (!q) continue;
        if (r.outcome === 'done') { q.progress = q.target; complete(q, r.note); } else if (r.outcome === 'failed') { q.failed = true; ctx.toast(`◆ [SYSTEM] Quest failed: ${q.title}.${r.note ? ' ' + r.note : ''}`); }
      }
      const fresh = cleanQuests(out.quests || [], reason === 'daily');
      if (fresh.length) {
        st.quests.push(...fresh);
        ctx.toast(reason === 'daily' ? '◆ [SYSTEM] New daily quests have arrived.' : `◆ [SYSTEM] New quest: ${fresh[0].title}`);
      }
      save(); if (open && page.dataset.view === 'window') showWindow();
      return fresh;
    } catch { return null; }
  }
  // Never trust a quest blindly: only kinds the game can measure, sane numbers, no duplicates.
  function cleanQuests(list, daily) {
    const ids = new Set(st.quests.map(q => q.id)), places = ctx.places();
    return list.filter(q => q && KINDS.includes(q.kind)).slice(0, daily ? 3 : 2).map(q => {
      const c = { id: String(q.id || Math.random().toString(36).slice(2, 8)).slice(0, 40), title: String(q.title || 'Quest').slice(0, 80), kind: q.kind,
        detail: String(q.detail || '').slice(0, 400), xp: Math.max(10, Math.min(500, Math.round(+q.xp || 30))), progress: 0, done: false, daily };
      if (c.kind === 'reps') c.exercise = EXERCISES.includes(q.exercise) ? q.exercise : 'push-up';
      if (c.kind === 'visit') { const pl = places.find(p => p.name === q.place); if (!pl) return null; c.place = pl.name; c.at = { x: pl.x, z: pl.z }; }
      const max = { run: 20000, reps: 300, eat: 5, kill: 50, visit: 1, gold: 100000, open: 1 }[c.kind];
      c.target = c.kind === 'visit' || c.kind === 'open' ? 1 : Math.max(1, Math.min(max, Math.round(+q.target || 1)));
      while (ids.has(c.id)) c.id += '_'; ids.add(c.id);
      return c;
    }).filter(Boolean);
  }
  async function refreshDay() {
    const today = dayKey();
    if (st.day === today) return;
    st.day = today;
    st.quests = st.quests.filter(q => !q.daily && !q.done && !q.failed);   // story quests carry over, dailies don't
    save();
    if ((await ask('daily'))?.length) return;
    const pool = await node(ctx.level() >= 5 ? 'ch1.daily.hard' : 'ch1.daily');
    if (!pool) { st.day = null; return; }
    st.quests.push(...pickDaily(pool.quests, today, pool.perDay || 3).map(q => ({ ...q, progress: 0, done: false, daily: true })));
    save();
    ctx.toast('◆ [SYSTEM] New daily quests have arrived.');
  }
  function bump(kind, amount, exercise) {
    if (!st.on || st.deadUntil > Date.now()) return;
    let changed = false;
    for (const q of st.quests) {
      if (q.done || q.failed || q.kind !== kind || (q.exercise && q.exercise !== exercise)) continue;
      q.progress = Math.min(q.target, q.progress + amount); changed = true;
      if (q.progress >= q.target) complete(q);
    }
    if (changed) { save(); if (open && page.dataset.view === 'window') showWindow(); }
  }
  function complete(q, why) {
    q.done = true;
    ctx.toast(`◆ [SYSTEM] Quest complete: ${q.title}   +${q.xp} XP`);
    const before = ctx.level();
    ctx.gainXp(q.xp);
    st.log.push({ t: Date.now(), kind: 'quest', detail: 'completed: ' + q.title + (why ? ' (' + why + ')' : '') });
    const dailies = st.quests.filter(x => x.daily);
    if (q.daily && dailies.every(x => x.done)) ctx.toast('◆ [SYSTEM] All daily quests complete.');
    if (ctx.level() > before) st.log.push({ t: Date.now(), kind: 'level', detail: 'reached level ' + ctx.level() });
    if (before < 5 && ctx.level() >= 5 && !st.level5) { st.level5 = true; node('ch1.level5').then(n => n && setTimeout(() => play('ch1.level5'), 1200)); }
    save(); askSoon();
  }

  // The System window: level, XP and the quests, with buttons for exercises.
  function showWindow() {
    if (!st.on) return;
    const lines = [`Level ${ctx.level()}   ·   XP ${ctx.xp()} / ${ctx.xpNext()}   ·   Unspent points ${ctx.points()}`];
    const box = show({ title: '[ SYSTEM ]', text: lines, system: true, buttons: [{ label: 'Close', go: close }] });
    page.dataset.view = 'window';
    const list = document.createElement('div');
    const shown = st.quests.filter(q => !q.failed);
    for (const q of shown) {
      const d = document.createElement('div'); d.className = 'q' + (q.done ? ' done' : '');
      const unit = q.kind === 'run' ? ' m' : q.kind === 'gold' ? ' gold' : '';
      const measured = q.kind !== 'open' && q.kind !== 'visit';
      d.innerHTML = `<b></b><div class="d"></div><div class="m"></div>` + (measured ? `<div class="bar"><i style="width:${Math.round(q.progress / q.target * 100)}%"></i></div>` : '');
      d.querySelector('b').textContent = (q.done ? '✓ ' : '') + q.title + (q.daily ? '' : '   [ quest ]');
      d.querySelector('.d').textContent = q.detail || '';
      d.querySelector('.m').textContent = (measured ? `${Math.floor(q.progress)}${unit} / ${q.target}${unit}   ·   ` : q.kind === 'visit' ? `Go to: ${q.place}   ·   ` : '') + `+${q.xp} XP`;
      if (q.kind === 'reps' && !q.done) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Do one ' + q.exercise; b.style.marginTop = '8px';
        b.onclick = () => rep(q.exercise, b); d.append(b);
      }
      list.append(d);
    }
    if (!shown.length) { const p = document.createElement('p'); p.textContent = 'No quests right now.'; list.append(p); }
    box.insertBefore(list, box.querySelector('.row'));
    if (ctx.admin?.on()) {   // admin tools: only for accounts the server lists as admins
      const row = box.querySelector('.row');
      const add = (label, go) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = go; row.append(b); };
      add(ctx.admin.god?.() ? 'Admin: god mode ON' : 'Admin: god mode OFF', () => { ctx.admin.toggleGod?.(); showWindow(); });
      add('Admin: +1 level', () => { ctx.admin.levelUp(); showWindow(); });
      add('Admin: go to my mansion', () => { close(); ctx.admin.goHome?.(); });
      add('Admin: new quests now', async () => { st.day = null; await refreshDay(); showWindow(); });
      add('Admin: AI questions', () => adminQuestions());
    }
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
    st.log.push({ t: Date.now(), kind: 'death', detail: 'died at level ' + lvl + (to !== lvl ? ', dropped to ' + to : '') });
    const h = st.hidden; h.bloodPower = Math.max(0, h.bloodPower - 10); h.bloodMemory = Math.max(0, h.bloodMemory - 10); h.loyalty = Math.max(-100, h.loyalty - 15);
    save(); placeDropped(); deathScreen();
    // the server sets its own 24-hour wait; trust whichever ends later
    ctx.server?.died().then(r => { const t = r?.dead_until ? Date.parse(r.dead_until) : 0; if (t > st.deadUntil) { st.deadUntil = t; save(); } }).catch(() => {});
    return true;
  }
  async function adminQuestions() {
    let qs = [];
    try { qs = await ctx.admin.questions(); } catch (e) { return show({ title: 'AI questions', text: 'Could not load: ' + (e.message || e), system: true, buttons: [{ label: 'Back', go: showWindow }] }); }
    const text = qs.length ? qs.map((q, i) => `${i + 1}. [${q.type}] ${q.missing}\n   Why: ${q.why || '-'}\n   Decision needed: ${q.decision || '-'}`) : ['The Quest Director has no open questions.'];
    show({ title: 'Questions from the Quest Director', text, system: true, buttons: [{ label: 'Back', go: showWindow }] });
  }
  function deathScreen() {
    const tick = () => {
      const left = st.deadUntil - Date.now();
      if (left <= 0) { st.deadUntil = 0; save(); clearInterval(t); close(); ctx.toast('You wake up. Your things are where you fell, if nobody has taken them.'); return; }
      const hh = Math.floor(left / 3600000), mm = Math.floor(left / 60000) % 60, ss = Math.floor(left / 1000) % 60;
      show({ title: 'You died', text: [`You can play again in ${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s.`, 'Everything you carried is lying where you fell.'],
        buttons: ctx.admin?.on() ? [{ label: 'Admin: end the wait', go: async () => { try { await ctx.admin.revive(); } catch {} st.deadUntil = Date.now(); save(); tick(); } }] : [] });
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
    async begin() { st = fresh(); save(); btn.hidden = true; ctx.server?.start().catch(() => {}); if (ctx.cinema) await film(START_KEY); else await play(START_KEY); },
    // continuing: restore the button, the markers, and the death wait if it isn't over
    // `run` is the server's record: if it exists the System stays on even when this device lost its save,
    // and its death wait counts even if the browser's was wiped
    resume(run) {
      st = load();
      if (run) { st.on = true; const t = run.dead_until ? Date.parse(run.dead_until) : 0; if (t > st.deadUntil) st.deadUntil = t; save(); }
      btn.hidden = !st.on; placeDropped(); if (st.deadUntil > Date.now()) deathScreen(); else if (st.on) refreshDay(); },
    died,
    note,
    quests: () => st.quests.filter(q => !q.failed),
    toggle() { if (open && page.dataset.view === 'window') close(); else showWindow(); },
    update(dt) {
      if (!st.on || open) { lastPos = null; return; }
      if (st.day !== dayKey()) refreshDay();
      const p = ctx.playerPos();
      if (ctx.onFoot()) {
        if (lastPos) { const step = Math.hypot(p.x - lastPos.x, p.z - lastPos.z); if (step < 12 * dt + 0.05) bump('run', step); }
        lastPos = { x: p.x, z: p.z };
      } else lastPos = null;
      for (const q of st.quests) {
        if (q.done || q.failed) continue;
        if (q.kind === 'gold' && ctx.gold() >= q.target) { q.progress = q.target; complete(q); }
        if (q.kind === 'visit' && q.at && Math.hypot(p.x - q.at.x, p.z - q.at.z) < 25) { q.progress = 1; complete(q); }
      }
      const hunger = ctx.hunger();
      if (lastHunger != null && hunger - lastHunger >= 10) bump('eat', 1);
      lastHunger = hunger;
    },
  };
}
