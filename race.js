// Ashford Racing: a whole racing game inside the game. Walk up to the Raceway and choose
// "Play Ashford Racing": a full-screen menu opens where you pick
//   mode   – Quick Race, Time Trial, Elimination, Checkpoint Rush, Sprint A → B, Championship, Career
//   track  – six circuits, each in its own world (speedway, forest, coast, city, canyon, mountain)
//   car    – six race cars with different speed, acceleration, handling and brakes (buy to unlock)
//   setup  – laps, opponents, difficulty level, sprint finish gate
// then you are taken to that track: F1-style start lights, AI drivers who brake for corners and
// overtake, a live HUD (position, lap, times, minimap), and a results screen with prize money.
// Records, medals, unlocked cars and career progress are saved on this device.
import * as THREE from 'three';
import { TRACKS, CARS, COLOURS, MODES, MODES_EXTRA, CUPS, DIFFS, POINTS, SPRINTS, CAREER, buildPath } from './race-tracks.js';
import { buildRaceWorld } from './race-world.js';

const AI_NAMES = ['Vex', 'Marlowe', 'Kato', 'Ruiz', 'Okafor', 'Lindqvist', 'Sato', 'Moreau', 'Ivanova', 'Brooks', 'Haddad', 'Nakamura'];
const SAVE_KEY = 'aw-racing-v1';
const MEDALS = [['gold', 1.1, '🥇', 250], ['silver', 1.22, '🥈', 120], ['bronze', 1.38, '🥉', 60]];
const fmt = t => (t == null || !isFinite(t)) ? '--:--.--' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const ord = p => p + (p % 10 === 1 && p !== 11 ? 'st' : p % 10 === 2 && p !== 12 ? 'nd' : p % 10 === 3 && p !== 13 ? 'rd' : 'th');
const trackById = id => TRACKS.find(t => t.id === id), carById = id => CARS.find(c => c.id === id) || CARS[0], diffById = id => DIFFS.find(d => d.id === id) || DIFFS[1];
const ALL_MODES = [...MODES, ...MODES_EXTRA];

// the reference driver used for medal times and checkpoint bonuses: a Rookie GT driven perfectly
const paths = new Map();
function pathOf(id) { if (!paths.has(id)) { const p = buildPath(trackById(id)); p.ref = p.profile({ top: 54, grip: 1e9, yawRate: 1.8, accel: v => 18 - 0.3 * v, decel: 30 }); paths.set(id, p); } return paths.get(id); }
export function medalTimes(id) { const r = pathOf(id).ref.lapTime; return Object.fromEntries(MEDALS.map(([m, f]) => [m, r * f])); }

export function createRace(ctx) {
  const { toast } = ctx;
  // ---------------------------------------------------------------- saved progress
  let save = { owned: ['gt', 'hatch'], car: 'gt', colour: 0, best: {}, medals: {}, sprint: {}, career: 0, races: 0, wins: 0, podiums: 0, cups: {} };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch {}
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} };
  const loadGhost = id => { try { return JSON.parse(localStorage.getItem('aw-racing-ghost-' + id)); } catch { return null; } };
  const saveGhost = (id, g) => { try { localStorage.setItem('aw-racing-ghost-' + id, JSON.stringify(g)); } catch {} };

  // what the player has picked in the menu
  const sel = { mode: 'race', track: 'speedway', cup: 'rookie', level: 0, car: save.car, colour: save.colour, laps: 3, opp: 5, diff: 'pro', route: 'h' };
  const worlds = new Map();
  let world = null, R = null, cup = null, inWorld = false, menuOpen = false, screen = 'home', lastEvent = null;

  // ---------------------------------------------------------------- sound: start beeps and lap chimes
  let ac = null;
  function beep(f, d = 0.15, v = 0.15, type = 'square') {
    try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch {}
  }

  // ================================================================= MENU
  const menu = document.createElement('section'); menu.id = 'raceMenu'; menu.hidden = true;
  menu.innerHTML = `<style>
  #raceMenu{position:fixed;inset:0;z-index:72;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;background:radial-gradient(ellipse at 20% 0%,#2a1640 0%,#0b0f17 55%),#0b0f17;background-blend-mode:normal}
  #raceMenu[hidden]{display:none}
  #raceMenu.inworld{background:linear-gradient(180deg,rgba(8,10,16,.93),rgba(8,10,16,.82))}
  #raceMenu:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(115deg,transparent 0 46px,rgba(255,210,63,.035) 46px 50px)}
  #raceMenu header{position:relative;display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:2px solid #ffd23f33}
  #raceMenu .logo{font-style:italic;font-weight:900;letter-spacing:.02em;font-size:26px;line-height:1;white-space:nowrap}#raceMenu .logo i{color:#ffd23f}#raceMenu .logo b{color:#fff;margin-left:6px}
  #raceMenu .steps{flex:1;display:flex;gap:6px;overflow-x:auto}#raceMenu .steps button{background:none;border:0;color:#fff8;font:inherit;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:6px 8px;border-bottom:3px solid transparent;cursor:pointer;white-space:nowrap}
  #raceMenu .steps button.on{color:#ffd23f;border-color:#ffd23f}#raceMenu .steps button:disabled{opacity:.35;cursor:default}
  #raceMenu .wallet{font-weight:800;white-space:nowrap}#raceMenu .wallet b{color:#ffd23f}
  #raceMenu .x{background:#ffffff14;border:1px solid #fff3;color:#fff;border-radius:10px;padding:8px 12px;font-weight:700;min-height:40px;cursor:pointer;white-space:nowrap}
  #raceMenu main{position:relative;flex:1;min-height:0;overflow:auto;padding:16px 18px}
  #raceMenu h2{margin:0 0 4px;font-style:italic;font-weight:900;text-transform:uppercase;font-size:clamp(20px,3.2vw,34px);letter-spacing:.01em}#raceMenu .sub{opacity:.75;margin:0 0 14px;font-size:14px}
  #raceMenu .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
  #raceMenu .card{position:relative;line-height:1.3;text-align:left;background:linear-gradient(160deg,#1a2230,#121821);border:2px solid #2a3546;border-radius:16px;padding:14px;color:#fff;font:inherit;cursor:pointer;display:flex;flex-direction:column;gap:6px;overflow:hidden;transition:transform .12s,border-color .12s}
  #raceMenu .card:hover{transform:translateY(-2px);border-color:#ffd23f88}#raceMenu .card.on{border-color:#ffd23f;box-shadow:0 0 0 2px #ffd23f55,0 10px 30px #0008}
  #raceMenu .card.locked{opacity:.55}#raceMenu .card .ic{font-size:30px;line-height:1}#raceMenu .card h3{margin:0;font-size:17px;font-style:italic;font-weight:900;text-transform:uppercase}
  #raceMenu .card p{margin:0;font-size:13px;opacity:.8;line-height:1.35}#raceMenu .card .meta{display:flex;flex-wrap:wrap;gap:6px;font-size:12px}
  #raceMenu .pill{background:#ffffff12;border-radius:999px;padding:3px 8px;font-size:12px;white-space:nowrap}#raceMenu .pill.y{background:#ffd23f;color:#111;font-weight:800}#raceMenu .pill.g{background:#22b35e;font-weight:700}#raceMenu .pill.r{background:#c62828;font-weight:700}
  #raceMenu canvas.prev{width:100%;height:120px;border-radius:10px;background:#0b0f17}
  #raceMenu .bar{display:flex;flex-direction:column;gap:3px;font-size:12px;line-height:1.3}#raceMenu .bar i{display:block;height:7px;border-radius:4px;background:#2a3546;overflow:hidden}#raceMenu .bar i b{display:block;height:100%;background:linear-gradient(90deg,#ff7a1f,#ffd23f)}
  #raceMenu .stats{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}#raceMenu .stat{background:#ffffff0d;border-radius:12px;padding:8px 14px}#raceMenu .stat b{display:block;font-size:20px;color:#ffd23f}#raceMenu .stat span{font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.08em}
  #raceMenu .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0}#raceMenu .row>label{min-width:120px;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:.06em;opacity:.85}
  #raceMenu .chip{background:#1a2230;border:2px solid #2a3546;color:#fff;border-radius:999px;padding:8px 14px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;min-height:40px}#raceMenu .chip.on{background:#ffd23f;color:#111;border-color:#ffd23f}
  #raceMenu .stepper{display:flex;align-items:center;gap:8px}#raceMenu .stepper button{width:40px;height:40px;border-radius:12px;border:2px solid #2a3546;background:#1a2230;color:#fff;font-size:20px;font-weight:900;cursor:pointer}#raceMenu .stepper b{min-width:34px;text-align:center;font-size:20px}
  #raceMenu .swatch{display:flex;gap:8px;flex-wrap:wrap}#raceMenu .swatch span{width:32px;height:32px;border-radius:50%;border:3px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px #fff4}#raceMenu .swatch span.on{border-color:#ffd23f}
  #raceMenu .summary{background:#ffffff0b;border:1px solid #ffffff1a;border-radius:14px;padding:12px 14px;margin-top:12px;font-size:14px;line-height:1.6}#raceMenu .summary b{color:#ffd23f}
  #raceMenu table{width:100%;border-collapse:collapse;font-size:14px}#raceMenu td,#raceMenu th{padding:7px 8px;text-align:left;border-bottom:1px solid #ffffff14}#raceMenu th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.6}#raceMenu tr.me{background:#ffd23f22;font-weight:800}
  #raceMenu footer{position:relative;display:flex;gap:10px;align-items:center;padding:10px 18px;border-top:1px solid #ffffff14}#raceMenu footer .info{flex:1;font-size:13px;opacity:.8}
  #raceMenu .btn{background:#ffffff14;border:2px solid #ffffff2a;color:#fff;border-radius:12px;padding:10px 18px;font:inherit;font-weight:800;font-size:15px;min-height:46px;cursor:pointer;text-transform:uppercase;letter-spacing:.04em}
  #raceMenu .btn.go{background:linear-gradient(90deg,#ffb300,#ffd23f);color:#111;border-color:#ffd23f;font-style:italic}#raceMenu .btn:disabled{opacity:.4;cursor:default}
  #raceMenu .big{font-size:clamp(28px,6vw,60px);font-style:italic;font-weight:900;color:#ffd23f;line-height:1}
  @media (max-height:520px){#raceMenu header{padding:6px 10px;gap:8px}#raceMenu .logo{font-size:18px}#raceMenu main{padding:8px 10px}#raceMenu .sub{margin-bottom:8px;font-size:12px}
    #raceMenu .grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}#raceMenu .card{padding:9px;gap:4px}#raceMenu .card p{font-size:11.5px}#raceMenu canvas.prev{height:80px}#raceMenu .card .ic{font-size:22px}
    #raceMenu footer{padding:6px 10px}#raceMenu .btn{min-height:40px;padding:7px 12px;font-size:13px}#raceMenu .row{margin:6px 0}#raceMenu .stats{margin-bottom:8px}#raceMenu .stat{padding:5px 10px}#raceMenu .stat b{font-size:16px}#raceMenu td,#raceMenu th{padding:4px 6px}}
  @media (max-width:640px){#raceMenu .steps{display:none}}
  </style>
  <header><div class="logo"><i>ASHFORD</i><b>RACING</b></div><div class="steps"></div><div class="wallet">💰 <b></b></div><button class="x" type="button"></button></header>
  <main></main>
  <footer><button class="btn back" type="button">‹ Back</button><div class="info"></div><button class="btn go next" type="button">Next ›</button></footer>`;
  document.body.append(menu);
  const $ = s => menu.querySelector(s), main = $('main');
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v); } for (const c of kids) if (c != null) e.append(c); return e; };
  addEventListener('keydown', e => { if (menuOpen && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); $('.x').click(); } }, true);
  $('.x').onclick = () => { if (inWorld) leaveWorld(); else closeMenu(true); };

  const flow = () => sel.mode === 'cup' ? ['home', 'cup', 'car', 'setup'] : sel.mode === 'career' ? ['home', 'level', 'car', 'setup'] : ['home', 'track', 'car', 'setup'];
  const STEP_NAMES = { home: 'Mode', track: 'Track', cup: 'Cup', level: 'Level', car: 'Car', setup: 'Race setup' };
  function go(s) { screen = s; render(); }
  function openMenu(s = 'home') { menuOpen = true; menu.hidden = false; menu.classList.toggle('inworld', inWorld); ctx.pause(); go(s); }
  function closeMenu(resume) { menuOpen = false; menu.hidden = true; if (resume) ctx.resume(); }

  function render() {
    $('.wallet b').textContent = Math.floor(ctx.money());
    $('.x').textContent = inWorld ? '✕ Back to city' : '✕ Close';
    const f = flow(), at = f.indexOf(screen);
    $('.steps').replaceChildren(...(screen === 'results' ? [] : f.map((s, i) => el('button', { type: 'button', class: s === screen ? 'on' : '', onclick: () => go(s) }, `${i + 1}. ${STEP_NAMES[s]}`))));
    [...$('.steps').children].forEach((b, i) => { b.disabled = i > at; });
    const back = $('.back'), next = $('.next'); back.hidden = next.hidden = false; back.onclick = () => go(f[Math.max(0, at - 1)]); back.disabled = at <= 0;
    $('.info').textContent = '';
    main.replaceChildren(); main.scrollTop = 0;
    ({ home: homeScreen, track: trackScreen, cup: cupScreen, level: levelScreen, car: carScreen, setup: setupScreen, results: () => {} })[screen]?.();
    if (screen !== 'setup' && screen !== 'results') { next.textContent = 'Next ›'; next.disabled = !canNext(); next.onclick = () => go(f[at + 1]); }
    if (screen === 'home') next.hidden = true;
  }
  const canNext = () => screen === 'car' ? save.owned.includes(sel.car) : screen === 'level' ? sel.level <= save.career : true;

  function homeScreen() {
    main.append(el('h2', {}, 'Choose a race type'), el('p', { class: 'sub' }, 'Pick how you want to race. Then choose a track, a car and your level.'));
    const medals = Object.values(save.medals).length, done = Math.min(save.career, CAREER.length);
    main.append(el('div', { class: 'stats' }, ...[[save.races, 'Races'], [save.wins, 'Wins'], [save.podiums, 'Podiums'], [medals, 'Medals'], [`${done}/${CAREER.length}`, 'Career']].map(([v, l]) => el('div', { class: 'stat' }, el('b', {}, String(v)), el('span', {}, l)))));
    const grid = el('div', { class: 'grid' });
    for (const m of ALL_MODES) grid.append(el('button', { type: 'button', class: 'card' + (sel.mode === m.id ? ' on' : ''), onclick: () => { sel.mode = m.id; go(flow()[1]); } }, el('div', { class: 'ic' }, m.icon), el('h3', {}, m.name), el('p', {}, m.blurb)));
    main.append(grid);
    const rec = el('div', { class: 'summary' }, el('b', {}, 'Track records'), el('br'));
    for (const t of TRACKS) { const md = save.medals[t.id]; rec.append(`${t.icon} ${t.name}: ${fmt(save.best[t.id])} ${md ? MEDALS.find(m => m[0] === md)[2] : ''}`, el('br')); }
    main.append(rec);
  }
  function drawPreview(cv, id) {
    const p = pathOf(id), b = p.bounds, W = cv.width = 300, H = cv.height = 150, g = cv.getContext('2d'), sc = Math.min((W - 30) / (b.maxX - b.minX), (H - 24) / (b.maxZ - b.minZ));
    const X = x => W / 2 + (x - (b.minX + b.maxX) / 2) * sc, Z = z => H / 2 + (z - (b.minZ + b.maxZ) / 2) * sc;
    g.lineCap = g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#000';
    g.beginPath(); for (let i = 0; i <= p.n; i += 3) { const j = i % p.n; i ? g.lineTo(X(p.x[j]), Z(p.z[j])) : g.moveTo(X(p.x[j]), Z(p.z[j])); } g.stroke();
    const span = Math.max(1, b.maxY - b.minY); g.lineWidth = 4;
    for (let i = 0; i < p.n; i += 3) { const j = (i + 3) % p.n, t = (p.y[i] - b.minY) / span; g.strokeStyle = `hsl(${120 - t * 120},80%,${55 + t * 15}%)`; g.beginPath(); g.moveTo(X(p.x[i]), Z(p.z[i])); g.lineTo(X(p.x[j]), Z(p.z[j])); g.stroke(); }
    g.fillStyle = '#fff'; g.fillRect(X(p.x[0]) - 4, Z(p.z[0]) - 4, 8, 8);
    if (sel.mode === 'sprint' && screen === 'setup') { const r = SPRINTS.find(s => s.id === sel.route), a = p.at(r.frac * p.L); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(X(a.x), Z(a.z), 6, 0, 7); g.fill(); }
  }
  function trackCard(t, on, onclick, extra) {
    const p = pathOf(t.id), cv = el('canvas', { class: 'prev' }); drawPreview(cv, t.id);
    const md = save.medals[t.id];
    return el('button', { type: 'button', class: 'card' + (on ? ' on' : ''), onclick }, cv, el('h3', {}, `${t.icon} ${t.name}`), el('p', {}, t.blurb),
      el('div', { class: 'meta' }, el('span', { class: 'pill' }, `${(p.L / 1000).toFixed(2)} km`), el('span', { class: 'pill' }, `${p.corners} corners`), el('span', { class: 'pill' }, `↕ ${Math.round(p.bounds.maxY - p.bounds.minY)} m climb`), el('span', { class: 'pill' }, '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars))),
      el('div', { class: 'meta' }, el('span', { class: 'pill' }, `Best ${fmt(save.best[t.id])}`), md ? el('span', { class: 'pill y' }, MEDALS.find(m => m[0] === md)[2] + ' ' + md) : null), extra || null);
  }
  function trackScreen() {
    main.append(el('h2', {}, 'Choose a track'), el('p', { class: 'sub' }, 'Six circuits, each in its own world. Colours on the map show height: green is low, red is high.'));
    const grid = el('div', { class: 'grid' });
    for (const t of TRACKS) grid.append(trackCard(t, sel.track === t.id, () => { sel.track = t.id; render(); }));
    main.append(grid);
    $('.info').textContent = trackById(sel.track).name;
  }
  function cupScreen() {
    main.append(el('h2', {}, 'Choose a championship'), el('p', { class: 'sub' }, `Three races. Points for each finish: ${POINTS.join(', ')}. Most points wins the cup.`));
    const grid = el('div', { class: 'grid' });
    for (const c of CUPS) grid.append(el('button', { type: 'button', class: 'card' + (sel.cup === c.id ? ' on' : ''), onclick: () => { sel.cup = c.id; render(); } }, el('div', { class: 'ic' }, '🏆'), el('h3', {}, c.name),
      ...c.tracks.map((id, i) => el('p', {}, `Round ${i + 1}: ${trackById(id).icon} ${trackById(id).name}`)), save.cups[c.id] ? el('div', { class: 'meta' }, el('span', { class: 'pill y' }, `Best: ${ord(save.cups[c.id])}`)) : null));
    main.append(grid);
  }
  function goalText(lv) { const g = lv.goal; return g.pos ? (g.pos === 1 ? 'Win the race' : `Finish in the top ${g.pos}`) : g.medal ? `Get a ${g.medal} medal or better` : 'Reach the finish before time runs out'; }
  function levelScreen() {
    main.append(el('h2', {}, 'Career: choose a level'), el('p', { class: 'sub' }, 'Clear a level to unlock the next. You can replay any level you have reached.'));
    const grid = el('div', { class: 'grid' });
    CAREER.forEach((lv, i) => {
      const locked = i > save.career, done = i < save.career, m = ALL_MODES.find(x => x.id === lv.mode);
      grid.append(el('button', { type: 'button', class: 'card' + (sel.level === i ? ' on' : '') + (locked ? ' locked' : ''), onclick: () => { if (!locked) { sel.level = i; render(); } else toast('Clear the level before to unlock this one.'); } },
        el('div', { class: 'meta' }, el('span', { class: 'pill' + (done ? ' g' : locked ? '' : ' y') }, done ? '✓ Cleared' : locked ? '🔒 Locked' : '▶ Next up'), el('span', { class: 'pill' }, `Level ${i + 1}`)),
        el('h3', {}, lv.title), el('p', {}, `${m.icon} ${m.name} · ${trackById(lv.track).icon} ${trackById(lv.track).name}${lv.diff ? ' · ' + diffById(lv.diff).name : ''}`), el('p', {}, `🎯 ${goalText(lv)}`), el('p', {}, `💰 ${lv.reward} gold${done ? ' (first clear only)' : ''}`)));
    });
    main.append(grid);
  }
  function carScreen() {
    main.append(el('h2', {}, 'Choose your car'), el('p', { class: 'sub' }, 'Two cars are free. Win prize money to unlock the rest. Pick a colour too.'));
    const sw = el('div', { class: 'swatch' }); COLOURS.forEach((c, i) => sw.append(el('span', { class: sel.colour === i ? 'on' : '', style: `background:#${c.toString(16).padStart(6, '0')}`, onclick: () => { sel.colour = save.colour = i; persist(); render(); } })));
    main.append(el('div', { class: 'row' }, el('label', {}, 'Colour'), sw));
    const grid = el('div', { class: 'grid' }), pct = (v, a, b) => Math.round(100 * Math.min(1, Math.max(0.05, (v - a) / (b - a))));
    for (const c of CARS) {
      const owned = save.owned.includes(c.id);
      const bars = [['Top speed', pct(c.top, 40, 72), `${Math.round(c.top * 2.237)} mph`], ['Acceleration', pct(c.accel, 0.8, 1.4)], ['Handling', pct(c.handling, 0.8, 1.25)], ['Braking', pct(c.brake, 0.85, 1.3)]];
      const buy = owned ? null : el('button', { type: 'button', class: 'btn go', onclick: e => { e.stopPropagation(); if (ctx.money() < c.price) { toast(`You need ${c.price} gold to unlock the ${c.name}. Win some races first!`); return; } ctx.spend(c.price); save.owned.push(c.id); sel.car = save.car = c.id; persist(); beep(880, 0.2, 0.1, 'triangle'); toast(`🔓 ${c.name} unlocked!`); render(); } }, `Unlock · ${c.price} 💰`);
      grid.append(el('button', { type: 'button', class: 'card' + (sel.car === c.id ? ' on' : '') + (owned ? '' : ' locked'), onclick: () => { sel.car = c.id; if (owned) { save.car = c.id; persist(); } render(); } },
        el('div', { class: 'ic' }, c.icon), el('h3', {}, c.name), el('p', {}, c.blurb), ...bars.map(([l, v, t]) => el('div', { class: 'bar' }, el('span', {}, t ? `${l} · ${t}` : l), el('i', {}, el('b', { style: `width:${v}%` })))),
        el('div', { class: 'meta' }, owned ? el('span', { class: 'pill g' }, 'Owned') : el('span', { class: 'pill r' }, '🔒 Locked')), buy));
    }
    main.append(grid);
    $('.info').textContent = save.owned.includes(sel.car) ? carById(sel.car).name : 'Unlock this car, or choose one you own.';
  }
  function eventFromSel() {
    if (sel.mode === 'career') { const lv = CAREER[sel.level]; return { ...lv, mode: lv.mode, laps: lv.laps ?? 3, opp: lv.opp ?? 0, diff: lv.diff || 'pro', route: lv.route || 'h', level: sel.level }; }
    if (sel.mode === 'cup') { const c = CUPS.find(x => x.id === sel.cup); return { mode: 'cup', track: c.tracks[cup?.round || 0], laps: sel.laps, opp: Math.max(3, sel.opp), diff: sel.diff, cupId: c.id }; }
    return { mode: sel.mode, track: sel.track, laps: sel.laps, opp: sel.mode === 'trial' || sel.mode === 'rush' ? 0 : sel.mode === 'elim' ? Math.max(2, sel.opp) : sel.opp, diff: sel.diff, route: sel.route };
  }
  function feeFor(ev) {
    const d = diffById(ev.diff);
    if (ev.mode === 'trial' || ev.mode === 'career') return 0;
    if (ev.mode === 'rush') return Math.round(10 * d.fee);
    if (ev.mode === 'cup') return Math.round(25 * d.fee * 3);
    if (ev.opp === 0) return 0;
    const len = ev.mode === 'sprint' ? SPRINTS.find(s => s.id === ev.route).frac : ev.mode === 'elim' ? ev.opp : ev.laps;
    return Math.round(25 * d.fee * Math.max(0.6, len / 3));
  }
  function prizesFor(ev, fee) {
    const d = diffById(ev.diff);
    if (ev.mode === 'elim') return [fee * 6, fee * 2.5].map(Math.round);
    if (ev.mode === 'rush') return [Math.round(45 * d.fee)];
    if (ev.mode === 'cup') return [fee * 5, fee * 2.5, fee * 1.3].map(Math.round);
    if (ev.mode === 'trial' || ev.mode === 'career') return [];
    return [fee * 5, fee * 2.5, fee * 1.5].map(Math.round).slice(0, Math.max(1, ev.opp));
  }
  function setupScreen() {
    const m = sel.mode;
    main.append(el('h2', {}, 'Race setup'), el('p', { class: 'sub' }, m === 'career' ? 'This level has fixed rules. Good luck!' : 'Set the number of laps, opponents and your level.'));
    const chips = (label, opts, val, set) => main.append(el('div', { class: 'row' }, el('label', {}, label), ...opts.map(([v, t]) => el('button', { type: 'button', class: 'chip' + (val === v ? ' on' : ''), onclick: () => { set(v); render(); } }, t))));
    const stepper = (label, val, min, max, set, unit = '') => main.append(el('div', { class: 'row' }, el('label', {}, label), el('div', { class: 'stepper' }, el('button', { type: 'button', onclick: () => { set(Math.max(min, val - 1)); render(); } }, '−'), el('b', {}, String(val) + unit), el('button', { type: 'button', onclick: () => { set(Math.min(max, val + 1)); render(); } }, '+'))));
    if (m !== 'career') {
      if (m !== 'trial') chips('Level', DIFFS.map(d => [d.id, `${d.name}`]), sel.diff, v => { sel.diff = v; });
      if (m === 'race' || m === 'rush' || m === 'cup') stepper('Laps', sel.laps, 1, 8, v => { sel.laps = v; });
      if (m === 'sprint') chips('Finish at', SPRINTS.map(s => [s.id, `${s.name} · ${(s.frac * pathOf(sel.track).L / 1000).toFixed(1)} km`]), sel.route, v => { sel.route = v; });
      if (m === 'race' || m === 'sprint' || m === 'cup') stepper('Opponents', sel.opp, m === 'sprint' ? 0 : 1, 7, v => { sel.opp = v; });
      if (m === 'elim') stepper('Opponents', Math.max(2, sel.opp), 2, 7, v => { sel.opp = v; });
    }
    if (m === 'cup' && cup) { main.append(el('p', { class: 'sub' }, `Round ${cup.round + 1} of 3 is next.`)); }
    const ev = eventFromSel(), fee = cup && m === 'cup' && cup.round > 0 ? 0 : feeFor(ev), prizes = prizesFor(ev, feeFor(ev)), t = trackById(ev.track), car = carById(sel.car);
    const cv = el('canvas', { class: 'prev', style: 'width:min(100%,360px);height:auto;margin-top:12px' }); drawPreview(cv, ev.track);
    const lines = [`<b>${ALL_MODES.find(x => x.id === m).icon} ${ALL_MODES.find(x => x.id === m).name}</b> on <b>${t.icon} ${t.name}</b> in the <b>${car.name}</b>`];
    if (m === 'career') lines.push(`Level ${ev.level + 1}: <b>${ev.title}</b> · 🎯 ${goalText(ev)} · reward <b>${ev.reward} gold</b>`);
    if (ev.mode === 'trial') { const mt = medalTimes(ev.track); lines.push(`Medal times: 🥇 <b>${fmt(mt.gold)}</b> · 🥈 <b>${fmt(mt.silver)}</b> · 🥉 <b>${fmt(mt.bronze)}</b> · your best ${fmt(save.best[ev.track])}`, 'Drive as many laps as you like. Your best lap comes back as a ghost car.'); }
    if (ev.mode === 'rush') lines.push(`${ev.laps} lap${ev.laps > 1 ? 's' : ''}, 5 checkpoints per lap. Each checkpoint adds time. Level: <b>${diffById(ev.diff).name}</b>.`);
    if (ev.mode === 'sprint') { const r = SPRINTS.find(s => s.id === ev.route); lines.push(`Start line → <b>${r.name}</b> (${(r.frac * pathOf(ev.track).L / 1000).toFixed(2)} km). Best: ${fmt(save.sprint[ev.track + ':' + ev.route])}.`); }
    if (ev.mode === 'elim') lines.push(`${ev.opp} rivals. Each time the leader finishes a lap, the last car is out.`);
    if (ev.mode === 'race' || ev.mode === 'cup' || (ev.mode === 'sprint' && ev.opp)) lines.push(`${ev.mode === 'sprint' ? '' : `${ev.laps} lap${ev.laps > 1 ? 's' : ''} · `}${ev.opp} opponent${ev.opp === 1 ? '' : 's'} · level <b>${diffById(ev.diff).name}</b>`);
    lines.push(fee ? `Entry fee <b>${fee} gold</b>${prizes.length ? ` · prizes ${prizes.map((p, i) => `${ord(i + 1)} <b>${p}</b>`).join(', ')}` : ''}` : prizes.length ? `Free entry · prize <b>${prizes[0]} gold</b>` : 'Free entry');
    main.append(el('div', { class: 'grid', style: 'grid-template-columns:minmax(0,1fr)' }, el('div', { class: 'summary', html: lines.join('<br>') })), cv);
    const next = $('.next'); next.textContent = '🏁 Start race'; next.disabled = !save.owned.includes(sel.car);
    next.onclick = () => { if (fee > ctx.money()) { toast(`The entry fee is ${fee} gold. You have ${Math.floor(ctx.money())}.`); return; } startEvent(ev, fee); };
    $('.info').textContent = fee ? `Entry ${fee} gold` : '';
  }

  // ================================================================= HUD
  const hud = document.createElement('div'); hud.id = 'raceHud'; hud.hidden = true;
  hud.innerHTML = `<style>
  #raceHud{position:fixed;inset:0;pointer-events:none;z-index:30;color:#fff;font-family:system-ui,sans-serif}#raceHud[hidden]{display:none}
  body.racing #hud,body.racing #hotbar,body.racing #crosshair,body.racing #worldMapButton,body.racing #inventoryBtn,body.racing #inventoryPanel{display:none!important}
  #raceHud .top{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
  #raceHud .box{background:rgba(8,10,16,.72);border-radius:10px;padding:5px 12px;text-align:center;min-width:70px;border-bottom:3px solid #ffd23f}
  #raceHud .box span{display:block;font-size:10px;letter-spacing:.12em;opacity:.7;text-transform:uppercase}#raceHud .box b{font-size:22px;font-style:italic;font-weight:900;font-variant-numeric:tabular-nums}
  #raceHud .box.warn{border-color:#ff3b3b}#raceHud .box.warn b{color:#ff6b6b}
  #raceHud .board{position:absolute;left:10px;top:84px;background:rgba(8,10,16,.6);border-radius:10px;padding:6px 8px;font-size:13px;min-width:150px}
  #raceHud .board div{display:flex;gap:8px;padding:1px 0}#raceHud .board div b{width:18px;text-align:right;color:#ffd23f}#raceHud .board div.me{color:#ffd23f;font-weight:800}#raceHud .board div.out{opacity:.4;text-decoration:line-through}#raceHud .board div i{margin-left:auto;font-style:normal;opacity:.7;font-variant-numeric:tabular-nums}
  #raceHud canvas{position:absolute;right:12px;top:62px;width:160px;height:160px;background:rgba(8,10,16,.55);border-radius:50%}
  #raceHud .cd{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-size:min(22vw,150px);font-weight:900;font-style:italic;color:#ffd23f;text-shadow:0 6px 30px #000;opacity:0;transition:opacity .2s}
  #raceHud .splash{position:absolute;top:22%;left:50%;transform:translateX(-50%);font-size:clamp(20px,4vw,40px);font-weight:900;font-style:italic;text-transform:uppercase;text-shadow:0 4px 20px #000;white-space:nowrap;opacity:0;transition:opacity .3s}
  #raceHud .wrong{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);background:#c62828;padding:8px 20px;border-radius:10px;font-weight:900;font-size:26px;display:none}
  #raceHud .sub{position:absolute;top:68px;left:50%;transform:translateX(-50%);background:rgba(8,10,16,.6);border-radius:8px;padding:3px 10px;font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums}
  #raceHud .btns{position:absolute;top:10px;right:10px;display:flex;gap:6px;pointer-events:auto}#raceHud .btns button{background:rgba(8,10,16,.75);border:1px solid #fff4;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800;font-size:13px;min-height:40px;cursor:pointer}
  body.racing #prompt{display:none!important}
  @media (max-height:520px){#raceHud .top{top:calc(env(safe-area-inset-top) + 54px);left:auto;right:calc(env(safe-area-inset-right) + 8px);transform:none;flex-direction:column;gap:4px}
    #raceHud .box{padding:2px 8px;min-width:64px;border-bottom-width:2px}#raceHud .box b{font-size:15px}#raceHud .box span{font-size:8px}
    #raceHud .sub{top:calc(env(safe-area-inset-top) + 112px);font-size:11px}#raceHud .board{display:none}
    #raceHud canvas{width:92px;height:92px;right:auto;left:calc(env(safe-area-inset-left) + 8px);top:calc(env(safe-area-inset-top) + 8px)}
    #raceHud .btns{top:calc(env(safe-area-inset-top) + 106px);right:auto;left:calc(env(safe-area-inset-left) + 8px)}#raceHud .btns button{padding:4px 8px;min-height:32px;font-size:11px}#raceHud .btns .restart{display:none}
    #raceHud .splash{top:46%;font-size:22px}#raceHud .wrong{font-size:18px}}
  </style>
  <div class="top"><div class="box pos"><span>Pos</span><b>-</b></div><div class="box lap"><span>Lap</span><b>-</b></div><div class="box time"><span>Time</span><b>0:00.00</b></div><div class="box best"><span>Best lap</span><b>--</b></div></div>
  <div class="sub"></div><div class="board"></div><canvas width="180" height="180"></canvas><div class="cd"></div><div class="splash"></div><div class="wrong">⚠ WRONG WAY</div>
  <div class="btns"><button type="button" class="reset">↺ Reset car</button><button type="button" class="restart">⟲ Restart</button><button type="button" class="quit">✕ Quit</button></div>`;
  document.body.append(hud);
  const H = s => hud.querySelector(s), mapCtx = H('canvas').getContext('2d');
  H('.reset').onclick = () => resetCar(); H('.quit').onclick = () => { if (R) finish(true); };
  H('.restart').onclick = () => { if (R && lastEvent) { const ev = R.ev; cleanupRace(); setupRace(ev); ctx.resume(); } };
  addEventListener('keydown', e => { if (R && !menuOpen && e.code === 'KeyR' && !e.repeat) { e.stopImmediatePropagation(); resetCar(); } }, true);
  let splashT = 0;
  function splash(text, colour = '#fff', secs = 1.8) { const s = H('.splash'); s.textContent = text; s.style.color = colour; s.style.opacity = 1; splashT = secs; }

  // ================================================================= RACE SETUP
  function getWorld(id) {
    const t = trackById(id);
    if (!worlds.has(id)) worlds.set(id, buildRaceWorld({ scene: ctx.scene, track: t, index: TRACKS.indexOf(t), lowPower: ctx.lowPower }));
    for (const w of worlds.values()) w.group.visible = false;
    const w = worlds.get(id); w.group.visible = true; return w;
  }
  function startEvent(ev, fee) {
    if (fee) ctx.spend(fee);
    if (ev.mode === 'cup' && (!cup || cup.id !== ev.cupId || cup.round === 0 && !cup.started)) {
      const roster = AI_NAMES.slice().sort(() => Math.random() - 0.5).slice(0, ev.opp).map((name, i) => ({ name, car: aiCar(ev.diff, i), colour: COLOURS[(i + 2) % COLOURS.length] }));
      cup = { id: ev.cupId, round: 0, points: { You: 0 }, roster, fee, started: true }; for (const r of roster) cup.points[r.name] = 0;
    }
    ev.fee = fee; lastEvent = ev;
    closeMenu(false);
    ctx.fade(() => { setupRace(ev); ctx.resume(); });
  }
  function aiCar(diff, i) { const pool = diff === 'rookie' ? ['hatch', 'gt'] : diff === 'pro' ? ['gt', 'hatch', 'rally', 'muscle'] : ['apex', 'muscle', 'volt', 'rally']; return pool[i % pool.length]; }
  const profiles = new Map();
  function aiProfile(trackId, carId, skill) {
    const k = `${trackId}:${carId}:${skill}`;
    if (!profiles.has(k)) { const c = carById(carId), p = world.path; profiles.set(k, p.profile({ top: c.top * skill, grip: 38 * skill * c.handling, yawRate: 1.8 * c.handling * skill, accel: v => 18 * c.accel * skill - 0.3 * v, decel: 28 * c.brake }).brake); }
    return profiles.get(k);
  }
  function applyCar(v, c) { v.maxSpeed = c.top; v.stats = { accel: c.accel, brake: c.brake, handling: c.handling }; v.batteryCapacity = 60; v.battery = 100; v.health = 100; v.raceCar = true; v.group.rotation.order = 'YXZ'; }
  function setupRace(ev) {
    cleanupRace();
    world = getWorld(ev.track); inWorld = true; document.body.classList.add('racing');
    const p = world.path, d = diffById(ev.diff), car = carById(sel.car);
    const totalDist = ev.mode === 'sprint' ? SPRINTS.find(s => s.id === ev.route).frac * p.L : ev.mode === 'trial' ? Infinity : ev.mode === 'elim' ? Infinity : ev.laps * p.L;
    const roster = ev.mode === 'cup' ? cup.roster : AI_NAMES.slice().sort(() => Math.random() - 0.5).slice(0, ev.opp).map((name, i) => ({ name, car: aiCar(ev.diff, i), colour: COLOURS[(i + 2) % COLOURS.length] }));
    const cars = [];
    roster.forEach((r, i) => {
      const v = ctx.makeVehicle('car', r.colour, carById(r.car).style); applyCar(v, carById(r.car)); v.taskDriven = true; v.ai = null; v.noSteal = true;
      const sk = d.skill * (0.97 + Math.random() * 0.05);
      cars.push({ name: r.name, car: r.car, v, ai: true, sk, prof: aiProfile(ev.track, r.car, Math.round(sk * 50) / 50), prog: 0, off: 0, lane: 0, speed: 0, laps: 0, lapStart: 0, best: null, finished: false, time: null, out: false });
    });
    const mine = ctx.makeVehicle('car', COLOURS[sel.colour], car.style); applyCar(mine, car); mine.ai = null;
    const me = { name: 'You', me: true, car: car.id, v: mine, prog: 0, off: 0, speed: 0, laps: 0, lapStart: 0, best: null, finished: false, time: null, out: false, hint: -1 };
    cars.push(me);
    // grid: rivals in front, you at the back (time trial and rush: a rolling start)
    cars.forEach((c, k) => {
      const sl = ev.mode === 'trial' || ev.mode === 'rush' ? { s: p.L - 45, off: 0 } : world.slot(k);
      c.prog = sl.s - p.L; c.off = c.lane = sl.off;
      const a = p.at(sl.s, sl.off); c.v.group.position.set(a.x + world.ox, a.y + 0.06, a.z + world.oz); c.v.group.rotation.set(0, a.yaw, 0); c.v.speed = 0;
    });
    ctx.enterVehicle(mine);
    const gates = [];
    const R0 = R = { ev, world, p, cars, me, mine, t: ev.mode === 'trial' || ev.mode === 'rush' ? -3.5 : -5.5, phase: 'countdown', totalDist, gates, leaderLaps: 0, outOrder: [], resultsAt: null, timeLeft: 0, cp: 0, cpDist: [], rec: [], recT: 0, ghostData: ev.mode === 'trial' ? loadGhost(ev.track) : null, ghost: null, wrongT: 0, resetCd: 0 };
    if (ev.mode === 'rush') {
      const seg = p.L / 5;
      for (let i = 1; i <= ev.laps * 5; i++) R0.cpDist.push(i * seg);
      const mult = { rookie: 1.42, pro: 1.24, legend: 1.12 }[ev.diff] || 1.24;
      R0.bonus = [0, 1, 2, 3, 4].map(i => pathOf(ev.track).ref.timeBetween(i * seg, (i + 1) * seg) * mult);
      R0.timeLeft = R0.bonus[0] + 3;
      for (let i = 1; i <= 5; i++) gates.push(makeGate(i * seg % p.L, i === 5 ? 0x22ff88 : 0x29b6f6));
    }
    if (ev.mode === 'sprint') gates.push(makeGate(totalDist % p.L, 0xffd23f, true));
    if (R0.ghostData) R0.ghost = makeGhost();
    world.lights.forEach(l => { l.emissiveIntensity = 0; });
    hud.hidden = false; H('.wrong').style.display = 'none';
    H('.lap span').textContent = ev.mode === 'rush' ? 'Time left' : ev.mode === 'sprint' ? 'To go' : 'Lap';
    H('.pos').style.display = ev.mode === 'trial' || ev.mode === 'rush' || (ev.mode === 'sprint' && !ev.opp) ? 'none' : '';
    H('.board').style.display = cars.length > 1 ? '' : 'none';
    splash(ev.mode === 'career' ? `Level ${ev.level + 1}: ${ev.title}` : trackById(ev.track).name, '#ffd23f', 3);
  }
  function makeGate(sv, colour, finishFlag = false) {   // a glowing arch across the road
    const a = world.path.at(sv), g = new THREE.Group(), hw = world.hw + 1.5;
    const m = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 1.2 });
    for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), m); post.position.set(sd * hw, 3, 0); g.add(post); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 0.6, finishFlag ? 1.4 : 0.6, 0.6), finishFlag ? new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x = c.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 8, j * 8, 8, 8); } const t = new THREE.CanvasTexture(c); return t; })() }) : m);
    top.position.y = 6; g.add(top);
    g.position.set(a.x, a.y, a.z); g.rotation.y = a.yaw; world.group.add(g); return g;
  }
  function makeGhost() {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.35, depthWrite: false });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.3), m); body.position.y = 0.75; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2), m); cab.position.set(0, 1.4, -0.3); g.add(cab);
    ctx.scene.add(g); return g;
  }
  function cleanupRace() {
    if (!R) return;
    for (const c of R.cars) if (!c.me) ctx.removeVehicle(c.v);
    for (const g of R.gates) g.removeFromParent();
    R.ghost?.removeFromParent();
    const mine = R.mine; R = null;
    if (ctx.isDriving(mine)) ctx.exitVehicle?.(true);
    ctx.removeVehicle(mine);
  }
  function leaveWorld() {
    cleanupRace(); cup = null;
    closeMenu(false); hud.hidden = true; document.body.classList.remove('racing');
    inWorld = false;
    ctx.fade(() => { if (world) world.group.visible = false; world = null; ctx.returnToRaceway(); ctx.resume(); });
  }
  function resetCar() {
    if (!R || R.resetCd > 0 || R.phase === 'countdown') return;
    const q = R.p.nearest(R.mine.group.position.x - world.ox, R.mine.group.position.z - world.oz, R.me.hint, 3); if (!q) return;
    const a = R.p.at(q.s, 0); R.mine.group.position.set(a.x + world.ox, a.y + 0.06, a.z + world.oz); R.mine.group.rotation.set(0, a.yaw, 0); R.mine.speed = 0; R.resetCd = 2;
  }

  // ================================================================= RACE UPDATE
  function update(dt) {
    if (!R || dt <= 0 || R.phase === 'results') return;
    const { p, me, mine, ev } = R, L = p.L, ox = world.ox, oz = world.oz, hw = world.hw;
    if (!ctx.isDriving(mine)) { finish(true, 'You got out of the car.'); return; }
    R.t += dt; R.resetCd = Math.max(0, R.resetCd - dt);
    if (splashT > 0) { splashT -= dt; if (splashT <= 0) H('.splash').style.opacity = 0; }
    // ---- start lights: five reds come on one per second, then all go out
    if (R.phase === 'countdown') {
      const on = Math.min(5, Math.max(0, Math.floor(R.t + 5.5)));
      world.lights.forEach((l, i) => { l.emissiveIntensity = i < on ? 3 : 0; });
      const cd = H('.cd'); if (on !== R.lastOn) { R.lastOn = on; if (on > 0) beep(440, 0.18); cd.textContent = on > 0 ? '●'.repeat(on) : ''; cd.style.opacity = on > 0 ? 1 : 0; cd.style.color = '#ff3b3b'; cd.style.fontSize = 'min(9vw,64px)'; }
      if (R.t >= 0) { R.phase = 'go'; world.lights.forEach(l => { l.emissiveIntensity = 0; }); beep(880, 0.5, 0.18); cd.textContent = 'GO!'; cd.style.color = '#22ff88'; cd.style.fontSize = ''; cd.style.opacity = 1; setTimeout(() => { cd.style.opacity = 0; }, 800); for (const c of R.cars) c.lapStart = 0; }
      if (R.phase === 'countdown') mine.speed = 0;
    }
    const racing = R.phase === 'go' || R.phase === 'done';
    const t = Math.max(0, R.t);
    // ---- you: progress round the track, walls, kerbs, slopes
    const mp = mine.group.position, q = p.nearest(mp.x - ox, mp.z - oz, me.hint, 3);
    if (q) {
      me.hint = q.i;
      let ds = q.s - ((me.prog % L) + L) % L; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; me.prog += ds; me.off = q.off; me.speed = mine.speed;
      const lim = hw + 4.6 - 1.15;
      if (Math.abs(q.off) > lim) {
        const sg = Math.sign(q.off), push = Math.abs(q.off) - lim, tz = p.tz[q.i], tx = p.tx[q.i];
        mp.x -= tz * push * sg; mp.z += tx * push * sg;
        const h = mine.group.rotation.y, into = (Math.sin(h) * tz - Math.cos(h) * tx) * sg * mine.speed;
        if (into > 1) { mine.speed *= Math.max(0.4, 1 - into / Math.max(8, Math.abs(mine.speed)) * 0.9); ctx.shake?.(Math.min(0.35, into * 0.02)); if (into > 6) beep(90, 0.12, 0.2, 'sawtooth'); }
        const fwd = Math.cos(h - p.yaw[q.i]) >= 0 ? p.yaw[q.i] : p.yaw[q.i] + Math.PI;
        let dy = fwd - h; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; mine.group.rotation.y += dy * 0.25;
      }
      if (Math.abs(q.off) > hw + 0.8) mine.speed *= 1 - Math.min(0.9, 1.1 * dt);   // grass / gravel slows you down
      const along = Math.cos(mine.group.rotation.y - p.yaw[q.i]);
      mine.group.rotation.x = -Math.atan(p.grade[q.i] * along);
      // wrong way
      R.wrongT = along < -0.3 && mine.speed > 4 ? R.wrongT + dt : 0;
      H('.wrong').style.display = R.wrongT > 1 ? 'block' : 'none';
    }
    if (R.phase === 'countdown') return drawHud();
    // ---- AI drivers
    const playerSkill = R.cars.length > 1 ? me.prog : 0;
    for (const c of R.cars) {
      if (!c.ai) continue;
      if (c.out) { c.speed = Math.max(0, c.speed - 20 * dt); }
      else {
        const s = ((c.prog % L) + L) % L, i = Math.floor(s / p.ds) % p.n;
        let target = c.prof[i];
        if (ev.diff !== 'legend' && R.cars.length > 1) { const gap = c.prog - me.prog; if (gap > (ev.diff === 'rookie' ? 110 : 200)) target *= ev.diff === 'rookie' ? 0.9 : 0.96; if (gap < -160) target *= 1.04; }
        if (c.finished) target = Math.min(target, 18);
        // traffic ahead: change lane, or follow
        let blocked = null;
        for (const o of R.cars) { if (o === c || o.out) continue; const gap = o.prog - c.prog; if (gap > 0 && gap < 13 && Math.abs(o.off - c.off) < 2.6) { if (!blocked || gap < blocked.gap) blocked = { o, gap }; } }
        if (blocked && blocked.o.speed < c.speed + 0.5) {
          const lanes = [-0.5 * hw, 0, 0.5 * hw].sort((a, b) => Math.abs(a - c.off) - Math.abs(b - c.off));
          const free = lanes.find(ln => Math.abs(ln - blocked.o.off) > 2.8 && !R.cars.some(o => o !== c && !o.out && Math.abs(o.prog - c.prog) < 8 && Math.abs(o.off - ln) < 2.4));
          if (free !== undefined) c.lane = free; else target = Math.min(target, blocked.o.speed - 0.3);
        } else if (!blocked && Math.random() < dt * 0.15) c.lane = THREE_LANE(hw, c.prof[i] < 30 ? Math.sign(p.k[i]) : 0);
        const acc = 18 * carById(c.car).accel * c.sk - 0.3 * c.speed;
        c.speed = c.speed < target ? Math.min(target, c.speed + Math.max(1, acc) * dt) : Math.max(target, c.speed - 28 * carById(c.car).brake * dt);
      }
      c.prog += c.speed * dt;
      const dOff = c.lane - c.off; c.off += Math.sign(dOff) * Math.min(Math.abs(dOff), 3.2 * dt);
      const a = p.at(c.prog, c.off);
      c.v.group.position.set(a.x + ox, a.y + 0.06, a.z + oz); c.v.group.rotation.set(-Math.atan(a.grade), a.yaw + Math.max(-0.15, Math.min(0.15, dOff * 0.04)), 0); c.v.speed = c.speed;
      // contact with you
      const dx = mp.x - c.v.group.position.x, dz = mp.z - c.v.group.position.z;
      if (dx * dx + dz * dz < 30) {
        const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), al = dx * fx + dz * fz, la = dx * fz - dz * fx;
        if (Math.abs(al) < 4.2 && Math.abs(la) < 2.1) {
          const pa = 4.2 - Math.abs(al), pl = 2.1 - Math.abs(la);
          if (pl < pa) { const sg = Math.sign(la) || 1; mp.x += fz * pl * sg; mp.z -= fx * pl * sg; c.off -= sg * 0.4; mine.speed *= 0.985; }
          else { const sg = Math.sign(al) || 1; mp.x += fx * pa * sg; mp.z += fz * pa * sg; if (sg < 0) { mine.speed = Math.min(mine.speed, c.speed * 0.95); c.speed += 1.5; } else { c.speed = Math.min(c.speed, mine.speed * 0.9); } }
          if (!R.bumpCd || R.t > R.bumpCd) { R.bumpCd = R.t + 0.4; ctx.shake?.(0.12); beep(110, 0.08, 0.15, 'sawtooth'); }
        }
      }
    }
    // ---- laps, checkpoints and the finish
    for (const c of R.cars) {
      if (c.out) continue;
      if (!c.started && c.prog >= 0) { c.started = true; c.lapStart = t; }
      const lapNow = Math.floor(c.prog / L);
      if (c.prog >= 0 && lapNow > c.laps - 1 && lapNow >= 1 && lapNow > (c.lapsDone || 0)) {
        c.lapsDone = lapNow; const lt = t - c.lapStart; c.lapStart = t; if (!c.best || lt < c.best) c.best = lt;
        if (c.me) onMyLap(lt);
      }
      if (!c.finished && c.prog >= R.totalDist) {
        c.finished = true; c.time = t;
        if (c.me) { R.phase = 'done'; R.doneAt = R.t; const pos = standings().indexOf(c) + 1; splash(ev.mode === 'sprint' && R.cars.length === 1 ? `Finish! ${fmt(t)}` : `Finished ${ord(pos)}!`, pos === 1 ? '#ffd23f' : '#fff', 3); beep(660, 0.15, 0.15, 'triangle'); setTimeout(() => beep(990, 0.4, 0.15, 'triangle'), 160); }
      }
    }
    if (ev.mode === 'elim') {
      const lead = Math.max(...R.cars.filter(c => !c.out).map(c => Math.floor(c.prog / L)));
      if (lead > R.leaderLaps && lead >= 1) {
        R.leaderLaps = lead;
        const active = R.cars.filter(c => !c.out).sort((a, b) => a.prog - b.prog), last = active[0];
        last.out = true; R.outOrder.push(last);
        if (last.me) { splash('You are eliminated!', '#ff6b6b', 3); R.phase = 'done'; R.doneAt = R.t; }
        else { splash(`${last.name} is out!`, '#ff9b6b'); beep(220, 0.3, 0.15, 'sawtooth'); setTimeout(() => last.v.group.visible = false, 1500); }
        if (R.cars.filter(c => !c.out).length === 1 && !me.out) { me.finished = true; me.time = t; splash('Last one standing — you win!', '#ffd23f', 3); R.phase = 'done'; R.doneAt = R.t; }
      }
    }
    if (ev.mode === 'rush') {
      if (R.phase === 'go') R.timeLeft -= dt;
      while (R.cp < R.cpDist.length && me.prog >= R.cpDist[R.cp]) {
        const bonus = R.cp + 1 < R.cpDist.length ? R.bonus[(R.cp + 1) % 5] : 0; R.timeLeft += bonus; R.cp++;
        if (R.cp < R.cpDist.length) { splash(`Checkpoint! +${bonus.toFixed(1)} s`, '#29b6f6', 1.3); beep(1200, 0.12, 0.12, 'triangle'); }
      }
      if (R.phase === 'go' && R.timeLeft <= 0 && !me.finished) { R.timeLeft = 0; R.failed = true; splash('Out of time!', '#ff6b6b', 3); R.phase = 'done'; R.doneAt = R.t; beep(150, 0.6, 0.2, 'sawtooth'); }
    }
    // ---- time trial: record your lap, replay your best as a ghost
    if (ev.mode === 'trial' && t > 0) {
      R.recT += dt; if (R.recT >= 0.05) { R.recT = 0; if (me.prog >= 0) R.rec.push(+(mp.x - ox).toFixed(1), +(mp.y).toFixed(2), +(mp.z - oz).toFixed(1), +mine.group.rotation.y.toFixed(3)); }
      if (R.ghost && R.ghostData?.f) {
        const f = R.ghostData.f, k = Math.min(f.length / 4 - 1, Math.floor((t - me.lapStart) / 0.05)) * 4;
        if (k >= 0 && me.prog >= 0) { R.ghost.visible = true; R.ghost.position.set(f[k] + ox, f[k + 1], f[k + 2] + oz); R.ghost.rotation.y = f[k + 3]; } else R.ghost.visible = false;
      }
    }
    if (R.phase === 'done' && R.t - R.doneAt > 3) finish(false);
    drawHud();
  }
  function THREE_LANE(hw, inside) { return inside ? inside * 0.5 * hw * (Math.random() < 0.7 ? 1 : 0) : [-0.5 * hw, 0, 0.5 * hw][Math.floor(Math.random() * 3)]; }
  function onMyLap(lt) {
    const ev = R.ev, id = ev.track, prev = save.best[id], mt = medalTimes(id);
    if (!prev || lt < prev) { save.best[id] = lt; persist(); }
    if (ev.mode === 'trial') {
      R.lastLap = lt;
      const medal = MEDALS.find(([m]) => lt <= mt[m]);
      const had = save.medals[id], rank = m => MEDALS.findIndex(x => x[0] === m);
      if (medal && (!had || rank(medal[0]) < rank(had))) { save.medals[id] = medal[0]; const pay = medal[3]; ctx.earn(pay); persist(); splash(`${medal[2]} ${medal[0].toUpperCase()} medal! +${pay} gold`, '#ffd23f', 3); }
      else splash(`Lap ${fmt(lt)}${!prev || lt < prev ? ' · NEW RECORD' : ''}`, !prev || lt < prev ? '#22ff88' : '#fff');
      if (!R.ghostData || lt < R.ghostData.t) { R.ghostData = { t: lt, f: R.rec.slice() }; saveGhost(id, R.ghostData); R.ghost ||= makeGhost(); }
      R.rec = [];
      R.bestMedal = medal?.[0] || R.bestMedal;
    } else {
      const left = R.ev.mode === 'race' || R.ev.mode === 'cup' ? R.ev.laps - Math.floor(R.me.prog / R.p.L) : 0;
      splash(left === 1 ? 'Final lap!' : `Lap ${fmt(lt)}`, left === 1 ? '#ffd23f' : '#fff'); beep(760, 0.12, 0.1, 'triangle');
    }
  }
  function standings() {
    if (!R) return [];
    const fin = R.cars.filter(c => c.finished && !c.out).sort((a, b) => a.time - b.time), run = R.cars.filter(c => !c.finished && !c.out).sort((a, b) => b.prog - a.prog);
    return [...fin, ...run, ...R.outOrder.slice().reverse()];
  }
  function drawHud() {
    const { ev, me, p } = R, L = p.L, t = Math.max(0, R.t), st = standings(), pos = st.indexOf(me) + 1;
    H('.pos b').textContent = `${pos}/${R.cars.length}`;
    const lapsDone = Math.max(0, Math.floor(me.prog / L));
    H('.lap b').textContent = ev.mode === 'rush' ? R.timeLeft.toFixed(1) : ev.mode === 'sprint' ? `${Math.max(0, (R.totalDist - me.prog) / 1000).toFixed(2)} km` : ev.mode === 'trial' ? String(lapsDone + 1) : ev.mode === 'elim' ? `${lapsDone + 1}` : `${Math.min(ev.laps, lapsDone + 1)}/${ev.laps}`;
    H('.lap').classList.toggle('warn', ev.mode === 'rush' && R.timeLeft < 6);
    H('.time b').textContent = fmt(me.finished ? me.time : t);
    H('.best b').textContent = fmt(me.best ?? (ev.mode === 'trial' ? save.best[ev.track] : null));
    let sub = '';
    const cur = t - me.lapStart;
    if (ev.mode === 'trial') { const mt = medalTimes(ev.track); sub = `This lap ${fmt(me.prog >= 0 ? cur : 0)} · 🥇 ${fmt(mt.gold)} 🥈 ${fmt(mt.silver)} 🥉 ${fmt(mt.bronze)}${R.ghostData ? ' · 👻 ghost ' + fmt(R.ghostData.t) : ''}`; }
    else if (ev.mode === 'rush') sub = `Checkpoint ${Math.min(R.cp + 1, R.cpDist.length)}/${R.cpDist.length} · ${Math.max(0, (R.cpDist[R.cp] ?? R.totalDist) - me.prog).toFixed(0)} m to go`;
    else if (ev.mode === 'elim') sub = `${R.cars.filter(c => !c.out).length} cars left · last place is out at the end of every lap`;
    else if (R.cars.length > 1) { const ahead = st[pos - 2]; sub = ahead ? `${ahead.name} is ${Math.max(0, ahead.prog - me.prog).toFixed(0)} m ahead` : 'You are leading!'; }
    else sub = `Run time ${fmt(t)}`;
    H('.sub').textContent = sub;
    R.boardT = (R.boardT || 0) + 1; if (R.cars.length > 1 && R.boardT % 12 === 1) H('.board').replaceChildren(...st.map((c, i) => { const d = document.createElement('div'); d.className = (c.me ? 'me' : '') + (c.out ? ' out' : ''); d.innerHTML = `<b>${i + 1}</b><span>${c.name}</span><i>${c.finished ? fmt(c.time) : i === 0 ? 'Leader' : '+' + Math.max(0, st[0].prog - c.prog).toFixed(0) + 'm'}</i>`; return d; }));
    // minimap
    const g = mapCtx; g.clearRect(0, 0, 180, 180); g.drawImage(world.minimap, 0, 0);
    for (const c of R.cars) { if (c.out) continue; const pp = c.v.group.position; g.fillStyle = c.me ? '#ffd23f' : '#ff4d4d'; g.beginPath(); g.arc(world.mapX(pp.x - world.ox), world.mapZ(pp.z - world.oz), c.me ? 6 : 4.5, 0, 7); g.fill(); if (c.me) { g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke(); } }
    for (const gt of R.gates) { g.fillStyle = '#29b6f6'; g.fillRect(world.mapX(gt.position.x) - 3, world.mapZ(gt.position.z) - 3, 6, 6); }
  }

  // ================================================================= RESULTS
  function finish(quit, why) {
    if (!R) return;
    const { ev, me } = R;
    const st = standings(), pos = st.indexOf(me) + 1, t = Math.max(0, R.t);
    let earned = 0, lines = [], title, goalMet = null;
    const avg = R.p.L / Math.max(20, R.p.ref?.lapTime || 40);
    for (const c of R.cars) if (!c.finished && !c.out && c.ai && R.totalDist < Infinity) c.time = t + (R.totalDist - c.prog) / Math.max(15, c.speed || avg);
    const sorted = ev.mode === 'elim' ? st : [...R.cars.filter(c => c.finished || (c.ai && c.time != null)).sort((a, b) => a.time - b.time), ...R.cars.filter(c => !c.finished && !(c.ai && c.time != null))];
    const myPos = quit ? R.cars.length : (ev.mode === 'elim' ? pos : sorted.indexOf(me) + 1);
    if (!quit) save.races++;
    if (ev.mode === 'trial') {
      title = me.best ? `Best lap ${fmt(me.best)}` : 'No full lap set';
      lines.push(`Laps driven: ${Math.max(0, Math.floor(me.prog / R.p.L))}`, `Track record: ${fmt(save.best[ev.track])}`);
      if (R.bestMedal) lines.push(`Medal: ${MEDALS.find(m => m[0] === R.bestMedal)[2]} ${R.bestMedal}`);
      if (ev.level != null) { const need = ev.goal.medal, rank = m => MEDALS.findIndex(x => x[0] === m); goalMet = !!R.bestMedal && rank(R.bestMedal) <= rank(need); }
    } else if (ev.mode === 'rush') {
      const ok = !quit && me.finished && !R.failed; title = ok ? `Made it! ${fmt(me.time)}` : quit ? 'Run abandoned' : 'Out of time';
      lines.push(`Checkpoints reached: ${R.cp}/${R.cpDist.length}`);
      if (ok) { const pz = prizesFor(ev, ev.fee || 0)[0]; if (ev.level == null) { earned += pz; } lines.push(`Time left on the clock: ${R.timeLeft.toFixed(1)} s`); }
      if (ev.level != null) goalMet = ok;
    } else {
      title = quit ? 'Race abandoned' : ev.mode === 'elim' ? (myPos === 1 ? 'Last one standing!' : `Knocked out · ${ord(myPos)}`) : `${ord(myPos)} place${myPos === 1 ? '!' : ''}`;
      if (!quit && R.cars.length > 1) { if (myPos === 1) save.wins++; if (myPos <= 3) save.podiums++; }
      if (ev.mode === 'sprint' && !quit && me.finished) { const k = ev.track + ':' + ev.route; if (!save.sprint[k] || me.time < save.sprint[k]) { save.sprint[k] = me.time; lines.push(`New sprint record: ${fmt(me.time)}`); } }
      const pz = prizesFor(ev, ev.fee || 0);
      if (!quit && ev.mode !== 'cup' && ev.level == null && pz[myPos - 1]) earned += pz[myPos - 1];
      if (ev.level != null) goalMet = !quit && myPos <= ev.goal.pos;
    }
    // championship points
    let cupTable = null, cupDone = false;
    if (ev.mode === 'cup' && cup && !quit) {
      sorted.forEach((c, i) => { cup.points[c.me ? 'You' : c.name] += POINTS[i] || 0; });
      cup.round++; cupDone = cup.round >= 3;
      cupTable = Object.entries(cup.points).sort((a, b) => b[1] - a[1]);
      if (cupDone) {
        const place = cupTable.findIndex(([n]) => n === 'You') + 1, pz = prizesFor(ev, cup.fee || 0)[place - 1] || 0; earned += pz;
        if (!save.cups[cup.id] || place < save.cups[cup.id]) save.cups[cup.id] = place;
        title = place === 1 ? '🏆 Champion!' : `Championship: ${ord(place)}`;
      }
    }
    if (ev.mode === 'cup' && quit) cup = null;
    // career level
    if (goalMet != null) {
      if (goalMet) { if (ev.level === save.career) { earned += ev.reward; save.career = Math.min(CAREER.length, save.career + 1); lines.push(`🔓 Level ${ev.level + 2 <= CAREER.length ? ev.level + 2 + ' unlocked!' : 'All levels cleared — you are an Ashford Legend!'}`); } title = `✓ Level cleared · ${title}`; }
      else title = `✗ Level not cleared · ${title}`;
      lines.unshift(`🎯 ${goalText(ev)}`);
    }
    if (earned) { ctx.earn(earned); lines.push(`💰 You won ${earned} gold`); }
    if (why) lines.unshift(why);
    persist();
    // results screen
    hud.hidden = true;
    const keep = R; R.phase = 'results';
    openMenu('results'); screen = 'results'; $('.steps').replaceChildren();
    main.replaceChildren(el('div', { class: 'big' }, title), el('p', { class: 'sub' }, `${ALL_MODES.find(m => m.id === (ev.level != null ? 'career' : ev.mode)).name} · ${trackById(ev.track).name}`));
    if (lines.length) main.append(el('div', { class: 'summary', html: lines.join('<br>') }));
    if (keep.cars.length > 1) {
      const tb = el('table', {}, el('tr', {}, el('th', {}, 'Pos'), el('th', {}, 'Driver'), el('th', {}, 'Car'), el('th', {}, ev.mode === 'elim' ? 'Result' : 'Time'), el('th', {}, 'Best lap')));
      sorted.forEach((c, i) => tb.append(el('tr', { class: c.me ? 'me' : '' }, el('td', {}, String(i + 1)), el('td', {}, c.name), el('td', {}, carById(c.car).name), el('td', {}, ev.mode === 'elim' ? (c.out ? 'Out' : 'Survived') : c.time != null ? (c.finished ? '' : '≈ ') + fmt(c.time) : quit && c.me ? 'DNF' : '—'), el('td', {}, fmt(c.best)))));
      main.append(el('div', { class: 'summary' }, tb));
    }
    if (cupTable) main.append(el('div', { class: 'summary' }, el('b', {}, `Championship standings after round ${cup.round}`), el('table', {}, ...cupTable.map(([n, pts], i) => el('tr', { class: n === 'You' ? 'me' : '' }, el('td', {}, String(i + 1)), el('td', {}, n), el('td', {}, `${pts} pts`))))));
    const back = $('.back'), next = $('.next');
    back.hidden = false; back.disabled = false; back.textContent = '☰ Race menu';
    back.onclick = () => { cleanupRace(); back.textContent = '‹ Back'; if (cupDone) cup = null; go('home'); };
    if (ev.mode === 'cup' && cup && !cupDone) { next.textContent = `Next: Round ${cup.round + 1} ›`; next.disabled = false; next.onclick = () => { back.textContent = '‹ Back'; cleanupRace(); const nev = { ...ev, track: CUPS.find(c => c.id === cup.id).tracks[cup.round] }; lastEvent = nev; closeMenu(false); ctx.fade(() => { setupRace(nev); ctx.resume(); }); }; }
    else if (ev.level != null && goalMet && ev.level + 1 < CAREER.length) { next.textContent = 'Next level ›'; next.disabled = false; next.onclick = () => { back.textContent = '‹ Back'; cleanupRace(); sel.level = ev.level + 1; go('setup'); }; }
    else { const fee = ev.mode === 'cup' ? null : feeFor(ev); next.hidden = fee == null; next.textContent = `⟲ Race again${fee ? ` · ${fee} 💰` : ''}`; next.disabled = false; next.onclick = () => { if (fee > ctx.money()) { toast('Not enough gold for the entry fee.'); return; } back.textContent = '‹ Back'; cleanupRace(); startEvent({ ...ev }, fee); }; }
    $('.info').textContent = '';
    beep(myPos === 1 && !quit ? 990 : 520, 0.3, 0.12, 'triangle');
  }

  // ================================================================= hooks for the city
  function groundAt(x, z) {
    if (!world || !inWorld || z > -9000) return null;
    return world.groundAt(x, z);
  }
  // the old open-day race at the Raceway now opens the full game
  ctx.interactables.push({ pos: ctx.entry, r: 4, get label() { return 'Play Ashford Racing (choose a race, track and car)'; }, action: () => openMenu('home') });
  return { update, groundAt, open: openMenu, get active() { return !!R; }, get inWorld() { return inWorld; }, get state() { return R; }, get menuOpen() { return menuOpen; }, sel, save, worlds, finish, standings, leave: leaveWorld, setupRace, eventFromSel };
}
