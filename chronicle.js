// STORY MODE engine (the Chronicle). The story itself is data (chronicle-data.js); this runs it:
//   - one node at a time: an objective (go somewhere, or make something true in the world) or a conversation
//     with choices. Choices set flags and lead to different nodes, so each branch has its own path.
//   - variants: the world is open, so you can do things the story never planned (break the law early, find a
//     page on Ghost Island, clear three Gates, climb the Hidden Peak…). The engine watches for them all the time.
//     When one happens the Chronicle "rewrites itself": you're told, a flag is set (which changes later
//     choices), and some variants jump you onto a different path (returning to where you were afterwards).
//   - the Chronicle (📖 button or J): your chapter and objective, what the Chronicle says should happen next
//     next to what you actually did, the variants you've found, and every choice you've made.
// (This is separate from the hidden story in story.js, which is never announced; the two meet in the variants.)
// Story people are real residents in the world with IDs (PER-RES), standing where the story needs them.
import * as THREE from 'three';
import { makeId } from './world-ids.js';
import { NODES, VARIANTS, PLACES, PEOPLE, START } from './chronicle-data.js';

const css = `
#storyHud{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:19;max-width:min(560px,86vw);background:#101a29dd;color:#f3efe2;border:1px solid #c9a95a88;border-radius:10px;padding:6px 12px;font:13px system-ui;pointer-events:none;text-align:center}
#storyHud b{color:#e8c66a;font-weight:600}
#storyBtn{position:fixed;left:12px;top:50%;z-index:19;background:#1b2840e6;color:#e8c66a;border:1px solid #c9a95a;border-radius:10px;padding:7px 10px;font:600 13px system-ui;cursor:pointer}
#storyPanel,#storyTalk{position:fixed;inset:6% max(12px,calc(50% - 330px));z-index:46;background:#f4ecd8;color:#2a2116;border-radius:14px;padding:22px 24px;overflow:auto;font:15px/1.5 Georgia,serif;box-shadow:0 20px 60px #000a}
#storyPanel[hidden],#storyTalk[hidden],#storyHud[hidden],#storyBtn[hidden]{display:none}
#storyPanel h2,#storyTalk h2{margin:0 0 4px;font-size:22px}#storyPanel h3{margin:18px 0 6px;font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:#7a5a20}
#storyPanel .sub,#storyTalk .sub{color:#7a6a50;font-size:13px;margin:0 0 12px}
.storyPage{background:#fffaf0;border-left:4px solid #b08a3a;padding:8px 12px;margin:6px 0;font-style:italic}
.storyVariant{background:#2a1430;color:#f2d8ff;border-radius:8px;padding:8px 12px;margin:6px 0;font-family:system-ui;font-size:14px}
#storyTalk .choices button{display:block;width:100%;text-align:left;margin:8px 0;padding:10px 12px;border-radius:10px;border:1px solid #b08a3a;background:#fffaf0;font:15px Georgia,serif;cursor:pointer;color:#2a2116}
#storyTalk .choices button:hover{background:#f0e0b8}
.storyClose{margin-top:14px;padding:8px 16px;border-radius:8px;border:0;background:#2a2116;color:#f4ecd8;font:14px system-ui;cursor:pointer}
#storyBanner{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:47;background:#2a1430f2;color:#f2d8ff;border:1px solid #c88aff;border-radius:14px;padding:16px 22px;max-width:min(520px,88vw);font:15px/1.5 system-ui;text-align:center;transition:opacity .6s}
#storyBanner b{display:block;font-size:12px;letter-spacing:.2em;color:#c88aff;margin-bottom:4px}`;

export function createChronicle(ctx) {
  const key = 'chronicle:' + ctx.userId;
  let s = null;
  try { s = JSON.parse(localStorage.getItem(key)); } catch { }
  if (!s || !NODES[s.node]) s = { node: START, flags: {}, log: [], variants: [], resume: null, started: Date.now() };
  const save = () => { try { localStorage.setItem(key, JSON.stringify(s)); } catch { } };

  const style = document.createElement('style'); style.textContent = css; document.head.append(style);
  const hud = document.createElement('div'); hud.id = 'storyHud'; hud.hidden = true; document.body.append(hud);
  const btn = document.createElement('button'); btn.id = 'storyBtn'; btn.type = 'button'; btn.textContent = '📖 Chronicle'; btn.hidden = true; document.body.append(btn);
  const panel = document.createElement('section'); panel.id = 'storyPanel'; panel.hidden = true; document.body.append(panel);
  const talkBox = document.createElement('section'); talkBox.id = 'storyTalk'; talkBox.hidden = true; document.body.append(talkBox);
  for (const el of [panel, talkBox]) for (const ev of ['keydown', 'pointerdown', 'mousedown']) el.addEventListener(ev, e => e.stopPropagation());

  // places that depend on the city (the Capital, the Association) are filled in by the game
  const place = id => { const p = PLACES[id]; if (!p) return null; const v = k => typeof p[k] === 'string' ? ctx.places?.[p[k]] ?? 0 : p[k]; return { ...p, x: v('x'), z: v('z') }; };
  const node = () => NODES[s.node];
  const chapterOf = n => (n?.chapter || '').split(':')[0];

  // ---- story people: residents standing where the story needs them ----
  const people = {};
  function person(id, at) {
    const P = PEOPLE[id]; if (!P) return null;
    let p = people[id];
    if (!p) {
      const look = ctx.playerLook?.() || {};
      const h = ctx.makePerson({ outfit: P.outfit === 'player' ? look.outfit ?? 0x445566 : P.outfit, hair: P.hair === 'player' ? look.hair ?? 0x222222 : P.hair, skin: P.skin, pants: P.pants });
      ctx.scene.add(h.root);
      const it = { pos: new THREE.Vector3(), r: 2.4, label: `Talk to ${P.name}`, action: () => talk(id), storyPerson: id };
      ctx.interactables.push(it);
      p = people[id] = { h, it, id: makeId('PER', 'RES', 'HUM', 'ASH', 'story:' + id), name: P.name };
      ctx.register?.({ cls: 'PER', kind: 'RES', mat: 'HUM', owner: 'ASH', seed: 'story:' + id, maker: 'born in Westhaven', name: `${P.name}, ${P.who}`, get pos() { return h.root.position; } });
    }
    const where = at === 'here' ? ctx.player() : place(at) || at;
    const ox = at === 'here' ? 3 : 0;
    p.h.root.position.set(where.x + ox, ctx.groundY(where.x + ox, where.z), where.z);
    p.it.pos.copy(p.h.root.position);
    p.h.root.visible = true; if (!ctx.interactables.includes(p.it)) ctx.interactables.push(p.it);
    return p;
  }
  function hidePeople(except) {
    for (const [id, p] of Object.entries(people)) if (id !== except && !p.temp) { p.h.root.visible = false; const i = ctx.interactables.indexOf(p.it); if (i >= 0) ctx.interactables.splice(i, 1); }
  }

  // ---- moving through the story ----
  function enter(id, how) {
    if (id === 'resume') id = s.resume || START, s.resume = null;
    if (!NODES[id]) return;
    s.node = id; const n = NODES[id];
    if (how !== 'continue') s.log.push({ node: id, title: n.title, chapter: n.chapter, how: how || '', t: Date.now() });
    if (n.gate && !gateMade) { gateMade = true; ctx.storyGate?.(PLACES.park.x, PLACES.park.z + 4, 'The Gate at Ashford Park'); }
    hidePeople(n.talk?.npc);
    if (n.talk) person(n.talk.npc, n.talk.at);
    const target = n.objective?.at ? place(n.objective.at) : n.talk && n.talk.at !== 'here' ? place(n.talk.at) : null;
    if (target) ctx.setWaypoint?.(target.name, target.x, target.z); else ctx.clearWaypoint?.();
    save(); refresh();
    if (n.end) setTimeout(() => showPanel(), 400);
  }
  let gateMade = false;
  function choose(c) {
    if (c.set) Object.assign(s.flags, c.set);
    s.log.push({ choice: c.text, at: s.node, t: Date.now() });
    talkBox.querySelector('.choices').replaceChildren();
    const p = document.createElement('p'); p.textContent = c.reply || ''; talkBox.querySelector('.reply').replaceChildren(p);
    const go = document.createElement('button'); go.className = 'storyClose'; go.textContent = 'Continue';
    go.onclick = () => { closeTalk(); enter(c.to, c.text); };
    talkBox.querySelector('.choices').append(go);
  }
  function talk(id) {
    const n = node();
    const P = PEOPLE[id];
    talkBox.replaceChildren();
    const h = document.createElement('h2'); h.textContent = P.name;
    const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = P.who;
    const txt = document.createElement('p');
    const reply = document.createElement('div'); reply.className = 'reply';
    const list = document.createElement('div'); list.className = 'choices';
    if (n.talk?.npc === id && (!n.objective || objectiveMet(n, true))) {
      txt.textContent = n.talk.text;
      for (const c of n.talk.choices.filter(c => !c.if || c.if(s))) { const b = document.createElement('button'); b.type = 'button'; b.textContent = c.text; b.onclick = () => choose(c); list.append(b); }
    } else {
      txt.textContent = id === 'mara' ? '"Mind how you go, love. And read your page."' : id === 'elias' ? '"The Chronicle has nothing for us to discuss yet."' : '"Not now."';
      const b = document.createElement('button'); b.className = 'storyClose'; b.textContent = 'Leave'; b.onclick = closeTalk; list.append(b);
    }
    talkBox.append(h, sub, txt, reply, list);
    talkBox.hidden = false; ctx.pause?.();
  }
  function closeTalk() { talkBox.hidden = true; ctx.resume?.(); }

  // an objective is met when you're at its place and/or its test on the world is true
  function objectiveMet(n, forTalk) {
    const o = n.objective; if (!o) return true;
    const w = world();
    const at = o.at ? place(o.at) : null;
    const there = !at || Math.hypot(w.x - at.x, w.z - at.z) < at.r;
    return o.done ? o.done(w, s) : there;   // a test on the world wins; otherwise being there is enough
  }
  const world = () => ({ ...ctx.world(), clearedStoryGate: !!s.flags.clearedStoryGate });

  // ---- variants: the Chronicle rewrites itself when you go off the page ----
  function checkVariants(w) {
    const ch = chapterOf(node());
    for (const v of VARIANTS) {
      if (s.variants.includes(v.id) || !v.during.some(d => ch.startsWith(d))) continue;
      if (node().end && !v.to) continue;
      if (!v.when(w, s)) continue;
      s.variants.push(v.id); if (v.set) Object.assign(s.flags, v.set);
      s.log.push({ variant: v.id, title: v.title, at: s.node, t: Date.now() });
      banner(v.title, v.note);
      if (v.meet) meet(v.meet);
      if (v.to && !node().end) { s.resume = s.node; enter(v.to, 'variant: ' + v.title); }
      save(); refresh();
      return;
    }
  }
  function meet(id) {   // someone appears for a moment beside you (a variant crossing over), then is gone
    const p = person(id, 'here'); p.temp = true; p.it.label = `${PEOPLE[id].name}…`; p.it.action = () => ctx.toast(`"${id === 'juno' ? 'Wrong branch. Go back.' : '…'}"`);
    setTimeout(() => { p.h.root.visible = false; const i = ctx.interactables.indexOf(p.it); if (i >= 0) ctx.interactables.splice(i, 1); }, 25000);
  }
  let bannerEl = null;
  function banner(title, text) {
    bannerEl?.remove(); bannerEl = document.createElement('div'); bannerEl.id = 'storyBanner';
    const b = document.createElement('b'); b.textContent = 'THE CHRONICLE HAS CHANGED · VARIANT';
    const t = document.createElement('div'); t.style.cssText = 'font-size:18px;margin-bottom:4px'; t.textContent = title;
    const p = document.createElement('div'); p.textContent = text;
    bannerEl.append(b, t, p); document.body.append(bannerEl);
    const el = bannerEl; setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 700); }, 7000);
  }

  // ---- what you see ----
  function refresh() {
    const n = node();
    hud.replaceChildren();
    const b = document.createElement('b'); b.textContent = '📖 ' + (n.end ? 'Chapter complete' : n.title);
    const t = document.createElement('span'); t.textContent = ' · ' + (n.end ? 'open the Chronicle' : n.objective?.text || (n.talk ? `Talk to ${PEOPLE[n.talk.npc].name}` : ''));
    hud.append(b, t);
    if (!panel.hidden) showPanel();
  }
  function showPanel() {
    const n = node();
    panel.replaceChildren();
    const add = (tag, text, cls) => { const e = document.createElement(tag); e.textContent = text; if (cls) e.className = cls; panel.append(e); return e; };
    add('h2', 'The Chronicle');
    add('p', n.chapter, 'sub');
    add('h3', n.end ? 'Where your story stands' : 'Now');
    add('p', n.end || n.text);
    if (!n.end) add('p', '▶ ' + (n.objective?.text || (n.talk ? `Talk to ${PEOPLE[n.talk.npc].name}` : '')));
    add('h3', 'What the Chronicle says');
    add('div', '“' + n.chronicle + '”', 'storyPage');
    if (s.variants.length) {
      add('h3', 'Variants: where you went off the page');
      for (const id of s.variants) { const v = VARIANTS.find(x => x.id === id); if (v) add('div', `${v.title}: ${v.note}`, 'storyVariant'); }
    }
    add('h3', 'What you actually did');
    const ol = document.createElement('ol'); ol.style.cssText = 'padding-left:20px;font-size:14px';
    for (const e of s.log) { const li = document.createElement('li'); li.textContent = e.choice ? `You chose: ${e.choice}` : e.variant ? `Variant: ${e.title}` : `${e.chapter}: ${e.title}`; if (e.variant) li.style.color = '#7a2a9a'; ol.append(li); }
    panel.append(ol);
    add('h3', 'Branches');
    add('p', branchSummary());
    const row = document.createElement('div');
    const close = document.createElement('button'); close.className = 'storyClose'; close.textContent = 'Close'; close.onclick = () => { panel.hidden = true; ctx.resume?.(); };
    const restart = document.createElement('button'); restart.className = 'storyClose'; restart.style.cssText = 'margin-left:10px;background:#7a5a20'; restart.textContent = 'Start the story again';
    restart.onclick = () => { if (!confirmRestart()) return; s = { node: START, flags: {}, log: [], variants: [], resume: null, started: Date.now(), runs: (s.runs || 0) + 1 }; save(); panel.hidden = true; ctx.resume?.(); enter(START); };
    row.append(close, restart); panel.append(row);
    panel.hidden = false; ctx.pause?.();
  }
  let restartArmed = 0;
  const confirmRestart = () => { if (Date.now() - restartArmed < 4000) return true; restartArmed = Date.now(); ctx.toast('Press again to restart the story (your world progress stays).'); return false; };
  function branchSummary() {
    const ends = Object.entries(NODES).filter(([, n]) => n.end), reached = new Set(s.log.map(e => e.node));
    return `${ends.filter(([id]) => reached.has(id)).length} of ${ends.length} chapter endings reached, ${s.variants.length} of ${VARIANTS.length} variants found. Every choice leads somewhere different, so play again to see the others.`;
  }
  btn.onclick = () => panel.hidden ? showPanel() : (panel.hidden = true, ctx.resume?.());

  // ---- each frame ----
  let tick = 0;
  function update(dt) {
    for (const p of Object.values(people)) if (p.h.root.visible) { ctx.animatePerson?.(p.h, false, dt); const me = ctx.player(); p.h.root.rotation.y = Math.atan2(me.x - p.h.root.position.x, me.z - p.h.root.position.z); }
    tick += dt; if (tick < .5) return; tick = 0;
    const n = node(), w = world();
    checkVariants(w);
    if (n.end || n.talk) return;
    if (n.objective && objectiveMet(n) && n.next) enter(n.next);
  }
  return {
    start() { hud.hidden = false; btn.hidden = false; enter(s.node, s.log.length ? 'continue' : 'start'); },
    update, open: showPanel, get state() { return s; },
    // the game tells the story what happened (a Gate cleared, …)
    event(type, data) { if (type === 'dungeonCleared' && data?.storyGate) { s.flags.clearedStoryGate = true; save(); } },
    get busy() { return !panel.hidden || !talkBox.hidden; },
  };
}
