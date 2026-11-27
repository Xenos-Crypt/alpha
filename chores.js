// Chore mini-games: washing your hands, doing the laundry and washing up are now things you do,
// step by step, not a one-line message.
//   Wash your hands: tap on, wet, pick up the sponge, soap it, scrub every part of both hands with it for
//     20 seconds (drag it, or WASD), rinse, put the sponge back, tap off, dry on the towel.
//   Laundry: sort each item into whites or colours, then for each load pick the temperature, measure
//     the powder, let it spin, and peg everything out. A red sock in the whites turns them pink.
//   Washing up: scrub the dirt off each plate with the sponge (mouse, or WASD), rinse and rack it.
// Keys: Space / mouse as each step says; Esc stops (the chore is left unfinished).
export function createChores({ toast, pause, resume, done }) {
  const el = document.createElement('div'); el.id = 'chores'; el.hidden = true;
  el.innerHTML = `<style>
    #chores{position:fixed;inset:0;z-index:40;background:rgba(8,10,14,.62);display:flex;align-items:center;justify-content:center;font:15px system-ui,sans-serif;color:#f4f1ea}
    #chores[hidden]{display:none}
    #chores .card{background:#1b2027;border-radius:16px;padding:16px 18px;width:min(560px,94vw);box-shadow:0 12px 40px rgba(0,0,0,.5)}
    #chores h2{margin:0 0 2px;font-size:20px}#chores .step{color:#ffd23f;font-weight:700;min-height:22px;margin:6px 0}
    #chores .hint{color:#aab4bf;font-size:13px;min-height:18px}
    #chores canvas{width:100%;border-radius:10px;background:#2a323c;display:block;margin:8px 0;touch-action:none;cursor:crosshair}
    #chores .bar{height:8px;border-radius:4px;background:#3a424c;overflow:hidden}#chores .bar b{display:block;height:100%;width:0;background:#3ddc97;transition:width .1s}
    #chores .row{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
    #chores button{background:#444c56;border:0;color:#fff;border-radius:9px;padding:7px 12px;font-size:14px;cursor:pointer}
  </style><div class="card"><h2></h2><div class="step"></div><div class="hint"></div><canvas width="520" height="280"></canvas><div class="bar"><b></b></div>
  <div class="row"><span class="parts"></span><button type="button">Stop (Esc)</button></div></div>`;
  document.body.append(el);
  const $h = el.querySelector('h2'), $step = el.querySelector('.step'), $hint = el.querySelector('.hint'), $bar = el.querySelector('.bar b'), $parts = el.querySelector('.parts');
  const cv = el.querySelector('canvas'), g = cv.getContext('2d');
  el.querySelector('button').onclick = () => stop(false);

  let game = null, raf = 0, last = 0;
  const keys = {}, mouse = { x: 0, y: 0, down: false, dx: 0, moved: 0 };
  const capture = e => {
    if (el.hidden) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === 'keydown') { if (e.code === 'Escape') return stop(false); if (!keys[e.code]) { keys[e.code] = true; game?.press?.(e.code); } }
    else keys[e.code] = false;
  };
  addEventListener('keydown', capture, true); addEventListener('keyup', capture, true);
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  cv.addEventListener('pointerdown', e => { const p = pos(e); mouse.x = p.x; mouse.y = p.y; mouse.down = true; game?.click?.(p.x, p.y); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { const p = pos(e); mouse.dx += p.x - mouse.x; mouse.moved += Math.hypot(p.x - mouse.x, p.y - mouse.y); mouse.x = p.x; mouse.y = p.y; });
  addEventListener('pointerup', () => { mouse.down = false; });

  function open(kind, opts = {}) {
    if (!el.hidden) return;
    game = GAMES[kind](opts); el.hidden = false; pause?.();
    for (const k in keys) keys[k] = false;
    $h.textContent = game.title; last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function stop(finished, score) {
    if (el.hidden) return;
    el.hidden = true; cancelAnimationFrame(raf);
    const k = game; game = null; resume?.();
    if (finished) done?.(k.kind, score ?? 100, k.result);
    else toast?.('You leave it unfinished.');
  }
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!game) return;
    const r = game.update(dt);
    $step.textContent = game.step || ''; $hint.textContent = game.hint || ''; $bar.style.width = Math.round((game.progress || 0) * 100) + '%'; $parts.textContent = game.parts || '';
    g.clearRect(0, 0, cv.width, cv.height); game.draw(g);
    mouse.dx = 0;
    if (r === 'done') { const s = game.score; setTimeout(() => stop(true, s), 700); game.update = () => {}; }
    raf = requestAnimationFrame(loop);
  }

  // ---------- small drawing helpers ----------
  const rr = (x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const text = (s, x, y, c = '#fff', f = 'bold 15px system-ui') => { g.fillStyle = c; g.font = f; g.textAlign = 'center'; g.fillText(s, x, y); };
  const space = () => keys.Space || mouse.down;

  // ================= wash your hands =================
  // With a sponge: pick it up from the side of the basin, soap it, then scrub each part of both hands with it (drag
  // it over them with the mouse, or move it with WASD / the arrows) for at least 20 seconds, rinse, put the sponge
  // back, tap off, dry.
  function handwash() {
    const ZONES = [['Palms', 300, 168], ['Backs of hands', 262, 132], ['Between fingers', 300, 100], ['Thumbs', 338, 132], ['Fingertips & nails', 300, 82], ['Wrists', 300, 200]];
    const st = { kind: 'handwash', title: '🧼 Wash your hands', i: 0, t: 0, hold: 0, pumps: 0, scrubT: 0, lather: 0, wet: 0, dry: 0, tap: false, tapT: 0, score: 100,
      zones: ZONES.map(([name, x, y]) => ({ name, x, y, done: 0 })), sponge: { x: 120, y: 190, held: false }, lastSide: 0 };
    const REST = { x: 120, y: 190 };
    const steps = [
      ['Turn the tap on', 'Press Space or click the tap'],
      ['Wet your hands', 'Hold Space (or hold the mouse) under the water'],
      ['Pick up the sponge', 'Press Space or click the sponge on the side of the basin'],
      ['Soap the sponge', 'Press Space twice (two pumps of soap)'],
      ['Scrub every part with the sponge, at least 20 seconds', 'Drag the sponge over your hands (or move it with WASD / arrows)'],
      ['Rinse the soap off', 'Hold Space under the water'],
      ['Put the sponge back', 'Press Space or click the side of the basin'],
      ['Turn the tap off', 'Press Space or click the tap'],
      ['Dry your hands on the towel', 'Rub: A and D in turn, or drag the mouse'],
    ];
    const next = () => { st.i++; st.hold = 0; };
    const rub = code => { const side = /KeyA|ArrowLeft/.test(code) ? -1 : /KeyD|ArrowRight/.test(code) ? 1 : 0; if (side && side !== st.lastSide) { st.lastSide = side; return true; } return false; };
    st.press = code => {
      if (st.i === 0 && code === 'Space') { st.tap = true; next(); }
      else if (st.i === 2 && code === 'Space') { st.sponge.held = true; next(); }
      else if (st.i === 3 && code === 'Space') { st.pumps++; if (st.pumps >= 2) { st.lather = 0.3; next(); } }
      else if (st.i === 6 && code === 'Space') { st.sponge.held = false; Object.assign(st.sponge, REST); next(); }
      else if (st.i === 7 && code === 'Space') { st.tap = false; next(); }
      else if (st.i === 8 && rub(code)) st.dry = Math.min(1, st.dry + 0.07);
    };
    st.click = (x, y) => {
      if (x > 330 && x < 420 && y < 90 && (st.i === 0 || st.i === 7)) { st.tap = st.i === 0; next(); return; }
      if (st.i === 2 && Math.hypot(x - REST.x, y - REST.y) < 45) { st.sponge.held = true; next(); return; }
      if (st.i === 3) st.press('Space');
      if (st.i === 6 && Math.hypot(x - REST.x, y - REST.y) < 60) st.press('Space');
    };
    st.update = dt => {
      st.t += dt; if (st.tap) st.tapT += dt;
      const s = steps[Math.min(st.i, steps.length - 1)]; st.step = s[0]; st.hint = s[1];
      const sp = st.sponge;
      if (st.i === 1) { if (space()) st.hold += dt; st.wet = Math.min(1, st.hold / 1.2); if (st.hold > 1.2) next(); }
      if (st.i === 4) {
        st.scrubT += dt;
        const v = 240 * dt; let moving = false;
        if (keys.KeyA || keys.ArrowLeft) { sp.x -= v; moving = true; } if (keys.KeyD || keys.ArrowRight) { sp.x += v; moving = true; }
        if (keys.KeyW || keys.ArrowUp) { sp.y -= v; moving = true; } if (keys.KeyS || keys.ArrowDown) { sp.y += v; moving = true; }
        if (mouse.down) { sp.x = mouse.x; sp.y = mouse.y; if (mouse.moved > 0) moving = true; }
        sp.x = Math.max(30, Math.min(490, sp.x)); sp.y = Math.max(30, Math.min(250, sp.y));
        if (moving) st.rubbing = 0.25; st.rubbing = Math.max(0, (st.rubbing || 0) - dt);   // (a drag counts as scrubbing between mouse events too)
        if (st.rubbing > 0) { st.lather = Math.min(1, st.lather + dt * 0.25); for (const z of st.zones) if (Math.hypot(z.x - sp.x, z.y - sp.y) < 36) z.done = Math.min(1, z.done + dt * 0.6); }
        const left = st.zones.filter(z => z.done < 1);
        st.hint = left.length ? `Scrub: ${left.map(z => z.name.toLowerCase()).join(', ')} · ${Math.min(20, st.scrubT).toFixed(0)}/20 s` : `Every part done. Keep going until 20 s: ${st.scrubT.toFixed(0)}/20`;
        if (!left.length && st.scrubT >= 20) next();
      }
      if (st.i === 5) { if (space()) st.hold += dt; st.lather = Math.max(0, 1 - st.hold / 2); if (st.hold > 2) next(); }
      if (st.i === 8) { if (Math.abs(mouse.dx) > 18) { const side = Math.sign(mouse.dx); if (side !== st.lastSide) { st.lastSide = side; st.dry = Math.min(1, st.dry + 0.07); } } if (st.dry >= 1) { st.i++; } }
      if (sp.held && st.i !== 4) { sp.x += (300 - sp.x) * Math.min(1, dt * 6); sp.y += (232 - sp.y) * Math.min(1, dt * 6); }   // in your hand under the tap
      mouse.moved = 0;
      const zoneShare = st.zones.reduce((a, z) => a + z.done, 0) / st.zones.length;
      st.progress = Math.min(1, (st.i + (st.i === 4 ? Math.min(zoneShare, st.scrubT / 20) : 0)) / steps.length);
      st.parts = st.i >= 4 ? st.zones.map(z => (z.done >= 1 ? '✓' : '·')).join(' ') : '';
      if (st.i >= steps.length) { st.score = Math.max(40, 100 - Math.max(0, st.tapT - 55) * 2); st.step = 'Clean hands ✓'; st.hint = ''; return 'done'; }
    };
    st.draw = g => {
      rr(60, 170, 400, 90, 18, '#dfe6ea'); rr(90, 180, 340, 60, 26, '#b8c6cf');               // basin
      rr(350, 40, 24, 60, 6, '#c0c6cc'); rr(330, 34, 80, 16, 8, '#c0c6cc'); rr(390, 26, 22, 12, 4, st.tap ? '#4aa3ff' : '#e05050');   // tap and handle
      if (st.tap) { g.fillStyle = 'rgba(120,190,255,.7)'; g.fillRect(356, 100, 12, 110); }
      rr(450, 120, 26, 50, 6, '#79c2a1'); rr(456, 110, 14, 12, 3, '#555');                    // soap pump
      rr(REST.x - 34, REST.y + 12, 68, 8, 3, '#c9d1d6');                                     // the sponge's spot on the basin edge
      if (st.i >= 8) { rr(40, 40, 70, 110, 8, '#c9a77a'); text('towel', 75, 100, '#fff', '12px system-ui'); }
      const scrub = st.i === 4, rubX = st.i === 8 ? Math.sin(st.t * 14) * 14 : 0, wet = st.wet > 0 && st.dry < 1;
      for (const s of [-1, 1]) {
        const hx = (st.i === 8 ? 120 : 300) + s * 34 + rubX * s * 0.5, hy = 150;
        g.save(); g.translate(hx, hy); g.rotate(s * 0.25); rr(-26, -40, 52, 78, 22, '#d9a07a'); for (let f = 0; f < 4; f++) rr(-22 + f * 12, -66, 10, 30, 5, '#d9a07a'); rr(s * 22 - 6, -30, 12, 30, 6, '#d9a07a'); g.restore();
        if (wet) { g.fillStyle = 'rgba(140,200,255,.35)'; g.fillRect(hx - 28, hy - 60, 56, 100); }
      }
      if (scrub) for (const z of st.zones) { g.globalAlpha = 0.85; circ(z.x, z.y, 7, z.done >= 1 ? '#3ddc97' : `rgba(255,210,63,${0.4 + 0.6 * (1 - z.done)})`); g.globalAlpha = 1; }
      for (let k = 0; k < st.lather * 40; k++) { const a = k * 2.4 + st.t * 0.6; circ(300 + Math.cos(a) * (20 + (k % 7) * 7), 140 + Math.sin(a * 1.3) * 34, 5 + (k % 4) * 2, 'rgba(255,255,255,.85)'); }
      const sp = st.sponge, wob = scrub ? Math.sin(st.t * 20) * 2 : 0;   // the sponge: yellow foam with a green scourer
      rr(sp.x - 24 + wob, sp.y - 14, 48, 28, 6, '#f7d046'); rr(sp.x - 24 + wob, sp.y + 6, 48, 8, 3, '#2e8b57');
      if (st.pumps && st.i >= 3 && st.i <= 5) for (let k = 0; k < 6; k++) circ(sp.x - 18 + k * 7 + wob, sp.y - 16 - (k % 2) * 4, 4, 'rgba(255,255,255,.9)');
      if (st.i === 3) text(`soap ${st.pumps}/2`, 463, 190, '#ffd23f');
      if (scrub) { g.fillStyle = '#3a424c'; g.fillRect(20, 20, 200, 10); g.fillStyle = '#3ddc97'; g.fillRect(20, 20, 200 * Math.min(1, st.scrubT / 20), 10); text('20 seconds', 120, 46, '#aab4bf', '12px system-ui'); }
    };
    return st;
  }

  // ================= laundry =================
  function laundry() {
    const ITEMS = [['white shirt', 'w', '#f4f4f4'], ['blue jeans', 'c', '#2f4f8f'], ['white towel', 'w', '#fafafa'], ['red sock', 'c', '#c0392b'], ['white vest', 'w', '#efefef'], ['green T-shirt', 'c', '#2e8b57'], ['white pillowcase', 'w', '#f7f7f2'], ['black hoodie', 'c', '#222']];
    const queue = ITEMS.slice().sort(() => Math.random() - 0.5);
    const st = { kind: 'laundry', title: '👕 Do the laundry', phase: 'sort', idx: 0, baskets: { w: [], c: [] }, mistakes: 0, load: 'w', temp: 0, meter: 0, meterDir: 1, powder: null, spin: 0, pegged: 0, t: 0, score: 100, result: {} };
    const loads = () => ['w', 'c'].filter(k => st.baskets[k].length);
    const RIGHT = { w: 60, c: 30 };
    st.press = code => {
      if (st.phase === 'sort') {
        const to = /KeyA|ArrowLeft/.test(code) ? 'w' : /KeyD|ArrowRight/.test(code) ? 'c' : null; if (!to) return;
        const it = queue[st.idx]; st.baskets[to].push(it); if (it[1] !== to) st.mistakes++; st.idx++;
        if (st.idx >= queue.length) { st.phase = 'temp'; st.load = loads()[0]; }
      } else if (st.phase === 'temp') { const t = { Digit1: 30, Digit2: 40, Digit3: 60 }[code]; if (t) { st.temp = t; st.phase = 'powder'; } }
      else if (st.phase === 'powder' && code === 'Space') { st.powder = st.meter; st.phase = 'spin'; st.spin = 0; }
      else if (st.phase === 'hang' && code === 'Space') st.pegged++;
    };
    st.click = (x, y) => { if (st.phase === 'sort') st.press(x < 260 ? 'KeyA' : 'KeyD'); else if (st.phase === 'temp') { if (x < 150) st.press(y < 105 ? 'Digit1' : y < 155 ? 'Digit2' : 'Digit3'); } else st.press('Space'); };
    st.update = dt => {
      st.t += dt;
      const total = queue.length, nl = loads();
      if (st.phase === 'sort') { const it = queue[st.idx]; st.step = `Sort the washing: ${it[0]}`; st.hint = 'A / ← for the WHITES basket, D / → for the COLOURS basket (or click a basket)'; st.progress = st.idx / total * 0.3; }
      if (st.phase === 'temp') { st.step = `${st.load === 'w' ? 'Whites' : 'Colours'} load: pick the temperature`; st.hint = '1 = 30°, 2 = 40°, 3 = 60°  (hot for whites, cool for colours)'; }
      if (st.phase === 'powder') { st.meter += st.meterDir * dt * 0.9; if (st.meter > 1 || st.meter < 0) { st.meterDir *= -1; st.meter = Math.max(0, Math.min(1, st.meter)); } st.step = 'Measure the powder'; st.hint = 'Press Space when the scoop is in the green band'; }
      if (st.phase === 'spin') {
        st.spin += dt; st.step = `Washing at ${st.temp}°…`; st.hint = 'Round and round it goes';
        if (st.spin > 3.5) {
          const good = Math.abs(st.powder - 0.5) < 0.15, rightTemp = st.temp === RIGHT[st.load] || (st.load === 'w' && st.temp === 40);
          if (!good) st.score -= 10; if (!rightTemp) st.score -= 10;
          if (st.load === 'w' && st.baskets.w.some(i => i[1] === 'c' && i[0] === 'red sock')) st.result.pink = true;
          if (st.load === 'c' && st.temp === 60) st.result.faded = true;
          const i = nl.indexOf(st.load); if (i < nl.length - 1) { st.load = nl[i + 1]; st.phase = 'temp'; } else st.phase = 'hang';
        }
      }
      if (st.phase === 'hang') { st.step = 'Peg it all out on the line'; st.hint = `Press Space to peg each one (${st.pegged}/${total})`; if (st.pegged >= total) { st.score = Math.max(30, st.score - st.mistakes * 8); return 'done'; } }
      const loadI = nl.indexOf(st.load);
      st.progress = st.phase === 'sort' ? st.idx / total * 0.3 : st.phase === 'hang' ? 0.85 + 0.15 * st.pegged / total : 0.3 + 0.55 * ((loadI + (st.phase === 'spin' ? Math.min(1, st.spin / 3.5) * 0.8 : st.phase === 'powder' ? 0.2 : 0)) / Math.max(1, nl.length));
      st.parts = `whites ${st.baskets.w.length} · colours ${st.baskets.c.length}${st.mistakes ? ` · ${st.mistakes} in the wrong basket` : ''}`;
    };
    const shirt = (x, y, c, s = 1) => { g.save(); g.translate(x, y); g.scale(s, s); rr(-22, -20, 44, 50, 6, c); rr(-36, -20, 18, 18, 4, c); rr(18, -20, 18, 18, 4, c); g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(-22, -20, 44, 50); g.restore(); };
    st.draw = g => {
      if (st.phase === 'sort') {
        rr(30, 170, 180, 90, 14, '#e8e4da'); text('WHITES', 120, 222, '#333'); rr(310, 170, 180, 90, 14, '#7a6a9a'); text('COLOURS', 400, 222, '#fff');
        st.baskets.w.forEach((it, k) => shirt(70 + k * 26, 175, it[2], 0.45)); st.baskets.c.forEach((it, k) => shirt(350 + k * 26, 175, it[2], 0.45));
        const it = queue[st.idx]; if (it) { shirt(260, 90, it[2], 1.3); text(it[0], 260, 150, '#ffd23f'); }
      } else if (st.phase === 'hang') {
        g.strokeStyle = '#aaa'; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 60); g.lineTo(500, 60); g.stroke();
        const all = [...st.baskets.w, ...st.baskets.c];
        all.forEach((it, k) => { if (k < st.pegged) { const c = st.result.pink && it[1] === 'w' && st.baskets.w.includes(it) ? '#f6b6c8' : it[2]; shirt(50 + k * 58, 100 + Math.sin(st.t * 2 + k) * 3, c, 0.75); rr(46 + k * 58, 52, 8, 14, 2, '#c46a2b'); } });
        if (st.result.pink) text('Oh no: the red sock was in with the whites. Everything white is pink now.', 260, 250, '#f6b6c8', '13px system-ui');
      } else {
        rr(170, 20, 180, 240, 14, '#e9edf0'); rr(180, 30, 160, 26, 6, '#c9d1d6'); circ(260, 160, 74, '#9aa6ae'); circ(260, 160, 62, '#2c3e50');
        const items = st.baskets[st.load]; const a = st.phase === 'spin' ? st.spin * 9 : 0;
        items.forEach((it, k) => { const b = a + k * 6.28 / items.length; circ(260 + Math.cos(b) * 34, 160 + Math.sin(b) * 34, 16, it[2]); });
        g.fillStyle = 'rgba(140,200,255,.25)'; if (st.phase === 'spin') { g.beginPath(); g.arc(260, 160, 62, 0, 7); g.fill(); }
        text(st.temp ? st.temp + '°' : '--°', 300, 48, '#2c3e50');
        if (st.phase === 'temp') [30, 40, 60].forEach((t, k) => { rr(20 + k * 0, 60 + k * 50, 120, 40, 8, '#444c56'); text(`${k + 1}: ${t}°`, 80, 86 + k * 50); });
        if (st.phase === 'powder') { rr(400, 40, 30, 200, 6, '#3a424c'); rr(400, 40 + 200 * 0.35, 30, 200 * 0.3, 0, 'rgba(61,220,151,.45)'); rr(394, 40 + 200 * st.meter - 4, 42, 8, 3, '#ffd23f'); text('powder', 415, 260, '#aab4bf', '12px system-ui'); }
      }
    };
    return st;
  }

  // ================= washing up =================
  function dishes({ count = 3 } = {}) {
    const n = Math.max(1, Math.min(5, count));
    const st = { kind: 'dishes', title: '🍽️ Wash the dishes', d: 0, n, spots: [], rinse: 0, sponge: { x: 260, y: 140 }, t: 0, score: 100, phase: 'scrub' };
    const newPlate = () => { st.spots = []; for (let k = 0; k < 7; k++) { const a = Math.random() * 6.28, r = Math.random() * 70; st.spots.push({ x: 260 + Math.cos(a) * r, y: 140 + Math.sin(a) * r, r: 10 + Math.random() * 12, dirt: 1, c: ['#8a5a2b', '#b5651d', '#6b8e23', '#a0522d'][k % 4] }); } st.phase = 'scrub'; st.rinse = 0; };
    newPlate();
    st.update = dt => {
      st.t += dt;
      const sp = st.sponge, v = 260 * dt;
      if (keys.KeyA || keys.ArrowLeft) sp.x -= v; if (keys.KeyD || keys.ArrowRight) sp.x += v; if (keys.KeyW || keys.ArrowUp) sp.y -= v; if (keys.KeyS || keys.ArrowDown) sp.y += v;
      if (mouse.down) { sp.x = mouse.x; sp.y = mouse.y; }
      const scrubbing = mouse.down ? mouse.moved > 0 : (keys.KeyA || keys.KeyD || keys.KeyW || keys.KeyS || keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown);
      if (st.phase === 'scrub') {
        if (scrubbing) for (const s of st.spots) if (Math.hypot(s.x - sp.x, s.y - sp.y) < s.r + 22) s.dirt = Math.max(0, s.dirt - dt * 1.6);
        const left = st.spots.reduce((a, s) => a + s.dirt, 0) / st.spots.length;
        st.step = `Plate ${st.d + 1} of ${st.n}: scrub off the dirt`; st.hint = 'Drag the sponge over the dirt (or move it with WASD)';
        if (left < 0.02) st.phase = 'rinse';
      } else if (st.phase === 'rinse') {
        st.step = 'Rinse it'; st.hint = 'Hold Space (or hold the mouse) under the tap';
        if (space()) st.rinse += dt; if (st.rinse > 1) { st.d++; if (st.d >= st.n) { st.step = 'All clean and on the rack ✓'; st.hint = ''; st.score = 100; return 'done'; } newPlate(); }
      }
      mouse.moved = 0;
      st.progress = (st.d + (st.phase === 'rinse' ? 0.8 + 0.2 * Math.min(1, st.rinse) : 0.8 * (1 - st.spots.reduce((a, s) => a + s.dirt, 0) / st.spots.length))) / st.n;
      st.parts = `on the rack: ${st.d}/${st.n}`;
    };
    st.draw = g => {
      rr(20, 20, 480, 240, 20, '#9fb3c1');
      circ(260, 140, 110, '#f5f5f0'); circ(260, 140, 80, '#ebebe4');
      for (const s of st.spots) if (s.dirt > 0) { g.globalAlpha = s.dirt; circ(s.x, s.y, s.r, s.c); g.globalAlpha = 1; }
      if (st.phase === 'rinse') { g.fillStyle = 'rgba(140,200,255,.45)'; g.fillRect(250, 0, 20, 140); }
      for (let k = 0; k < st.d; k++) rr(440, 230 - k * 12, 60, 8, 4, '#f5f5f0');
      const sp = st.sponge; rr(sp.x - 24, sp.y - 14, 48, 28, 6, '#f7d046'); rr(sp.x - 24, sp.y + 6, 48, 8, 3, '#2e8b57');
    };
    return st;
  }

  // ================= the toilet =================
  // Seen from the side, cut away so you can see into the bowl. mode 'pee' or 'poo'; `stand` pees standing up (lift
  // the seat and aim: the stream weakens as you finish, so keep it in the bowl; anything that misses has to be
  // wiped up). Sitting down: go, tear off paper, wipe. A poo takes pushing (hold Space; let go to breathe when the
  // strain bar is full), then wiping until the paper comes away clean: each sheet takes three wipes and goes in
  // the bowl, and you tear off more when you run out. Then flush and close the lid. `need` (0-100) is how badly you
  // need to go: the more, the longer it takes.
  function toilet({ mode = 'pee', stand = false, need = 60 } = {}) {
    const poo = mode === 'poo', standing = !poo && stand;
    const st = { kind: 'toilet', mode, title: poo ? '🚽 Have a poo' : '🚽 Have a pee', i: 0, t: 0, lid: false, seatUp: false, sat: false, aim: 0.25, go: 0, splash: 0, puddle: [],
      strain: 0, rest: false, sheets: 0, inHand: 0, sheetDirt: 0, mess: 0, used: 0, water: 0, flushT: -1, score: 100, lastSide: 0, result: { mode } };
    const goFor = 3 + Math.max(0.2, Math.min(1, need / 100)) * (poo ? 7 : 5);
    const S = (id, step, hint) => ({ id, step, hint });
    let steps = standing
      ? [S('lid', 'Lift the lid and the seat', 'Press Space or click the toilet'), S('aim', 'Aim into the bowl and go', 'Hold Space to go · aim with W / S (or hold the mouse and move it up and down)'),
        S('seatDown', 'Put the seat back down', 'Press Space'), S('flush', 'Flush', 'Press Space or click the handle'), S('close', 'Close the lid', 'Press Space')]
      : [S('lid', 'Lift the lid', 'Press Space or click the toilet'), S('sit', 'Sit down', 'Press Space'),
        poo ? S('push', 'Push', 'Hold Space to push · let go to breathe when the strain bar is full') : S('go', 'Relax and go', 'Hold Space'),
        S('paper', poo ? 'Tear off some toilet paper' : 'Tear off a bit of toilet paper', 'Press Space or click the roll'),
        S('wipe', 'Wipe', 'Rub: A and D in turn, or drag the mouse side to side'), S('flush', 'Stand up and flush', 'Press Space or click the handle'), S('close', 'Close the lid', 'Press Space')];
    const cur = () => steps[Math.min(st.i, steps.length - 1)].id;
    const next = () => { st.i++; st.hold = 0; };
    const paperFor = () => (poo ? 3 : 2);
    const tear = () => { st.sheets++; if (!st.inHand) { st.inHand = 3; st.sheetDirt = 0; st.sheets--; } };
    const wipeStroke = () => {
      if (!st.inHand) { st.hint = 'Out of paper in your hand: press Space to tear off another sheet'; return; }
      st.mess = Math.max(0, st.mess - (poo ? 0.12 : 0.2)); st.sheetDirt = Math.max(st.sheetDirt, st.mess); st.inHand--;
      if (!st.inHand || st.mess <= 0) { st.used++; st.water = Math.min(1, st.water + 0.05); if (st.sheets > 0) { st.sheets--; st.inHand = 3; st.sheetDirt = 0; } else st.inHand = 0; }   // used sheet into the bowl, next one from your hand
    };
    const rub = code => { const side = /KeyA|ArrowLeft/.test(code) ? -1 : /KeyD|ArrowRight/.test(code) ? 1 : 0; if (side && side !== st.lastSide) { st.lastSide = side; return true; } return false; };
    st.press = code => {
      const id = cur();
      if (code !== 'Space') { if ((id === 'wipe' || id === 'mop') && rub(code)) wipeStroke(); return; }
      if (id === 'lid') { st.lid = true; if (standing) st.seatUp = true; next(); }
      else if (id === 'sit') { st.sat = true; next(); }
      else if (id === 'paper') { tear(); if (st.sheets + (st.inHand ? 1 : 0) >= paperFor()) { st.mess = poo ? 1 : 0.2; next(); } }
      else if (id === 'wipe' || id === 'mop') { if (!st.inHand) tear(); }
      else if (id === 'seatDown') { st.seatUp = false; next(); }
      else if (id === 'flush' && st.flushT < 0) { st.sat = false; st.flushT = 0; }
      else if (id === 'close') { st.lid = false; next(); }
    };
    st.click = (x, y) => {
      const id = cur();
      if (id === 'flush' && x > 120 && x < 210 && y < 110) return st.press('Space');
      if (id === 'paper' || ((id === 'wipe' || id === 'mop') && !st.inHand)) { if (Math.hypot(x - 430, y - 110) < 50) st.press('Space'); return; }
      if (id === 'lid' && x > 140 && x < 320 && y > 60) st.press('Space');
    };
    st.update = dt => {
      st.t += dt; const id = cur(), s = steps[Math.min(st.i, steps.length - 1)]; st.step = s.step; st.hint = s.hint;
      if (id === 'aim') {
        if (keys.KeyW || keys.ArrowUp) st.aim += dt * 0.6; if (keys.KeyS || keys.ArrowDown) st.aim -= dt * 0.6;
        if (mouse.down) st.aim = Math.max(0, Math.min(1, (250 - mouse.y) / 200));
        st.aim = Math.max(0, Math.min(1, st.aim + Math.sin(st.t * 1.9) * 0.05 * dt));   // your hand isn't perfectly steady
        if (keys.Space) {
          st.go += dt; st.water = Math.min(0.6, st.go / goFor * 0.6);
          const land = st.landX = streamLand();
          if (land < 190 || land > 292) { st.splash += dt; if (Math.random() < dt * 6) st.puddle.push(land + (Math.random() - 0.5) * 20); }
          if (st.go >= goFor) {
            next();
            if (st.splash > 0.3) { steps.splice(st.i, 0, S('mop', 'Wipe up the splashes', 'Press Space for paper, then rub: A and D in turn (or drag the mouse)')); st.mess = Math.min(1, st.splash / 2); }
          }
        }
        st.hint = `${s.hint} · ${Math.round(Math.min(1, st.go / goFor) * 100)}%`;
      }
      if (id === 'go') { if (space()) st.go += dt; st.water = Math.min(0.6, st.go / goFor * 0.6); if (st.go >= goFor) next(); }
      if (id === 'push') {
        if (space() && !st.rest) { st.strain = Math.min(1, st.strain + dt * 0.45); st.go += dt; if (st.strain >= 1) st.rest = true; }
        else { st.strain = Math.max(0, st.strain - dt * 0.6); if (st.strain < 0.25) st.rest = false; }
        if (st.rest) st.hint = 'Let go of Space and breathe…';
        st.water = Math.min(1, st.go / goFor);
        if (st.go >= goFor) next();
      }
      if ((id === 'wipe' || id === 'mop')) {
        if (Math.abs(mouse.dx) > 18) { const side = Math.sign(mouse.dx); if (side !== st.lastSide) { st.lastSide = side; wipeStroke(); } }
        if (!st.inHand && st.mess > 0) st.hint = 'Out of paper: press Space (or click the roll) to tear off another sheet';
        else if (st.mess > 0) st.hint = `${s.hint} · the paper's still coming away dirty`;
        if (st.mess <= 0) { if (st.inHand) { st.used++; st.inHand = 0; } st.sheets = 0; next(); }
      }
      if (st.flushT >= 0) { st.flushT += dt; st.water = Math.max(0, st.water - dt * 0.9); if (st.flushT > 1.6) { st.flushT = -2; st.water = 0; st.puddle = st.puddle.filter(() => cur() !== 'flush'); next(); } }
      mouse.moved = 0;
      st.progress = Math.min(1, (st.i + (id === 'aim' || id === 'go' || id === 'push' ? Math.min(1, st.go / goFor) : id === 'wipe' || id === 'mop' ? 1 - st.mess : 0)) / steps.length);
      st.parts = id === 'wipe' || id === 'mop' ? `sheets used: ${st.used}` : '';
      if (st.i >= steps.length) { st.score = Math.max(30, 100 - Math.round(st.splash * 25)); st.result = { mode, splashed: st.splash > 0.3, sheets: st.used }; st.step = 'Done and flushed ✓'; st.hint = 'Now wash your hands.'; return 'done'; }
    };
    // where the stream lands (x on the floor line): further with more aim, weaker as you finish
    const streamLand = () => { const strength = 1 - 0.45 * Math.min(1, st.go / goFor); return 352 - (40 + st.aim * 190) * strength; };
    st.draw = g => {
      rr(0, 0, 520, 280, 0, '#cfd8dc'); for (let x = 0; x < 520; x += 40) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, 0, 1, 236); }   // tiled wall
      rr(0, 236, 520, 44, 0, '#9aa5ab');                                                                  // floor
      for (const p of st.puddle) { g.globalAlpha = 0.55; g.fillStyle = '#e8d36a'; g.beginPath(); g.ellipse(p, 240, 14, 3, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
      // toilet, side on (it faces right): cistern, flush handle, the bowl cut away, the pedestal
      rr(140, 60, 50, 92, 8, '#f4f4f0'); rr(150, 72, 30, 8, 3, st.flushT >= 0 ? '#9aa3ad' : '#c0c6cc');
      g.fillStyle = '#f4f4f0'; g.beginPath(); g.moveTo(180, 160); g.lineTo(300, 160); g.quadraticCurveTo(300, 215, 248, 222); g.lineTo(236, 236); g.lineTo(196, 236); g.lineTo(190, 210); g.closePath(); g.fill();
      g.fillStyle = '#d9dfe3'; g.beginPath(); g.moveTo(192, 166); g.lineTo(290, 166); g.quadraticCurveTo(286, 205, 246, 212); g.lineTo(200, 206); g.closePath(); g.fill();   // inside the bowl
      const tint = st.mode === 'poo' ? `rgba(150,110,60,${0.35 * st.water})` : `rgba(230,205,60,${0.45 * st.water})`;
      g.fillStyle = '#bfe3f2'; g.fillRect(200, 190, 80, 16); g.fillStyle = tint; g.fillRect(200, 190, 80, 16);
      if (st.flushT >= 0) for (let k = 0; k < 8; k++) circ(240 + Math.cos(st.flushT * 9 + k) * 30, 196 + Math.sin(st.flushT * 9 + k) * 5, 3, 'rgba(255,255,255,.9)');
      // seat and lid
      g.fillStyle = '#ffffff';
      if (!st.lid) { rr(178, 150, 126, 8, 4, '#ffffff'); rr(178, 158, 126, 4, 2, '#e6e6e0'); }
      else { rr(186, 60, 8, 98, 4, '#ffffff'); if (st.seatUp) rr(196, 70, 7, 88, 3, '#f0f0ea'); else rr(180, 156, 124, 5, 2, '#e6e6e0'); }
      // toilet roll on the wall
      circ(430, 110, 24, '#f8f8f4'); circ(430, 110, 8, '#b49a74'); rr(400, 84, 60, 6, 3, '#9aa3ad');
      if (cur() === 'paper' || ((cur() === 'wipe' || cur() === 'mop') && !st.inHand)) { g.fillStyle = '#f8f8f4'; g.fillRect(420, 132, 20, 26 + Math.sin(st.t * 4) * 2); }
      // you
      const skin = '#d9a07a', top = '#3d5a80';
      if (st.sat) {
        circ(212, 60, 16, skin); rr(200, 76, 28, 74, 10, top); rr(206, 140, 96, 18, 8, '#2f3640'); rr(290, 150, 16, 84, 7, '#2f3640'); rr(286, 230, 30, 8, 3, '#222');   // head, body, thighs, shins, feet
        if (cur() === 'push') { g.fillStyle = `rgba(255,80,60,${st.strain * 0.6})`; g.beginPath(); g.arc(212, 60, 16, 0, 7); g.fill(); }
      } else if (standing && st.i <= 2) {
        circ(372, 62, 16, skin); rr(358, 78, 30, 84, 10, top); rr(360, 158, 26, 78, 8, '#2f3640'); rr(352, 230, 36, 8, 3, '#222');
        if (cur() === 'aim' && keys.Space) {   // the stream: an arc from you down to where it lands
          const land = streamLand(), sx = 356, sy = 152, peak = Math.min(sy, 150 - st.aim * 30);
          g.strokeStyle = 'rgba(235,210,70,.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + land) / 2, peak - 10, land, land >= 190 && land <= 292 ? 196 : 236); g.stroke();
        }
      } else if (cur() !== 'lid') { circ(372, 62, 16, skin); rr(358, 78, 30, 84, 10, top); rr(360, 158, 26, 78, 8, '#2f3640'); rr(352, 230, 36, 8, 3, '#222'); }
      // the sheet of paper in your hand, showing how much is still coming off
      if ((cur() === 'wipe' || cur() === 'mop') && st.inHand) { const d = Math.round(255 - st.sheetDirt * 90); rr(400, 190, 50, 34, 4, `rgb(${d},${Math.round(d * 0.95)},${Math.round(d * 0.88)})`); text(`${st.inHand} wipe${st.inHand > 1 ? 's' : ''} left on this sheet`, 425, 240, '#33404a', '11px system-ui'); }
      if (cur() === 'paper') text(`${st.sheets + (st.inHand ? 1 : 0)}/${paperFor()} sheets`, 430, 180, '#33404a');
      if (cur() === 'push') { g.fillStyle = '#3a424c'; g.fillRect(20, 20, 200, 10); g.fillStyle = st.rest ? '#e05050' : '#ffb347'; g.fillRect(20, 20, 200 * st.strain, 10); text(st.rest ? 'breathe…' : 'strain', 120, 46, '#33404a', '12px system-ui'); }
      if (cur() === 'aim') text(st.landX && (st.landX < 190 || st.landX > 292) ? 'Missing! Aim back into the bowl' : '', 260, 30, '#c0392b');
    };
    return st;
  }

  // ================= a shower or a bath =================
  // Washing all of you, step by step. Shower: water on, get the temperature right (keep the dial in the green for a
  // moment: too hot scalds, too cold and you're shivering), get wet, shampoo and rinse your hair, soap the sponge,
  // scrub the front of you, turn round and scrub your back, rinse off, water off, dry off. A bath: plug in, run it at
  // the right temperature, let it fill, get in, then the same wash, a soak, pull the plug and dry off.
  function bodywash({ bath = false } = {}) {
    const st = { kind: bath ? 'bath' : 'shower', title: bath ? '🛁 Have a bath' : '🚿 Have a shower', i: 0, t: 0, hold: 0, water: false, temp: 22, good: 0, wet: 0, fill: 0, plug: false, inBath: false,
      pumps: 0, lather: 0, hair: 0, back: false, dry: 0, scrubT: 0, sponge: { x: 450, y: 150, held: false }, lastSide: 0, score: 100, ouch: 0 };
    const FRONT = [['Face', 260, 50], ['Neck', 260, 78], ['Chest', 260, 108], ['Left armpit', 228, 96], ['Right armpit', 292, 96], ['Left arm', 200, 132], ['Right arm', 320, 132], ['Belly', 260, 148], ['Left leg', 244, 210], ['Right leg', 276, 210], ['Feet', 260, 250]];
    const BACK = [['Back of your neck', 260, 78], ['Upper back', 260, 108], ['Lower back', 260, 146], ['Backs of your legs', 260, 210]];
    const mk = list => list.map(([name, x, y]) => ({ name, x, y, done: 0 }));
    st.front = mk(FRONT); st.backZ = mk(BACK);
    const S = (id, step, hint) => ({ id, step, hint });
    const steps = bath
      ? [S('plug', 'Put the plug in', 'Press Space'), S('on', 'Turn the taps on', 'Press Space or click the taps'), S('temp', 'Get the temperature right', 'A / D (or drag the mouse) to turn the mixer · keep it in the green'),
        S('fill', 'Let the bath fill', 'Wait… (hold Space to keep an eye on it)'), S('off', 'Turn the taps off', 'Press Space'), S('in', 'Get in', 'Press Space'),
        S('wet', 'Get wet all over', 'Hold Space'), S('shampoo', 'Shampoo your hair', 'Press Space for a squirt, then rub it in: drag over your hair (or WASD)'), S('rinseHair', 'Rinse your hair', 'Hold Space'),
        S('soap', 'Soap the sponge', 'Press Space twice'), S('front', 'Scrub yourself all over', 'Drag the sponge over every part (or move it with WASD)'),
        S('turn', 'Lean forward and do your back', 'Press Space'), S('backs', 'Scrub your back', 'Drag the sponge (or WASD)'), S('rinse', 'Rinse the soap off', 'Hold Space'),
        S('soak', 'Lie back and soak', 'Hold Space for a few seconds'), S('out', 'Pull the plug and get out', 'Press Space'), S('dry', 'Dry yourself with the towel', 'Rub: A and D in turn, or drag the mouse')]
      : [S('on', 'Turn the water on', 'Press Space or click the mixer'), S('temp', 'Get the temperature right', 'A / D (or drag the mouse) to turn the mixer · keep it in the green'),
        S('wet', 'Get wet all over', 'Hold Space under the water'), S('shampoo', 'Shampoo your hair', 'Press Space for a squirt, then rub it in: drag over your hair (or WASD)'), S('rinseHair', 'Rinse your hair', 'Hold Space'),
        S('soap', 'Soap the sponge', 'Press Space twice'), S('front', 'Scrub yourself all over', 'Drag the sponge over every part (or move it with WASD)'),
        S('turn', 'Turn round to do your back', 'Press Space'), S('backs', 'Scrub your back', 'Drag the sponge (or WASD)'), S('rinse', 'Rinse the soap off', 'Hold Space under the water'),
        S('off', 'Turn the water off', 'Press Space'), S('dry', 'Step out and dry off with the towel', 'Rub: A and D in turn, or drag the mouse')];
    const cur = () => steps[Math.min(st.i, steps.length - 1)].id;
    const next = () => { st.i++; st.hold = 0; };
    const GOOD = [36, 40];
    st.press = code => {
      const id = cur();
      if (id === 'dry') { const side = /KeyA|ArrowLeft/.test(code) ? -1 : /KeyD|ArrowRight/.test(code) ? 1 : 0; if (side && side !== st.lastSide) { st.lastSide = side; st.dry = Math.min(1, st.dry + 0.06); } return; }
      if (code !== 'Space') return;
      if (id === 'plug') { st.plug = true; next(); }
      else if (id === 'on') { st.water = true; next(); }
      else if (id === 'off') { st.water = false; next(); }
      else if (id === 'in') { st.inBath = true; next(); }
      else if (id === 'shampoo' && !st.hairSoap) st.hairSoap = true;
      else if (id === 'soap') { st.pumps++; if (st.pumps >= 2) { st.sponge.held = true; st.lather = 0.3; next(); } }
      else if (id === 'turn') { st.back = true; next(); }
      else if (id === 'out') { st.inBath = false; st.plug = false; next(); }
    };
    st.click = (x, y) => { const id = cur(); if ((id === 'on' || id === 'off') && x > 400 && y < 120) st.press('Space'); else if (['plug', 'in', 'turn', 'out', 'soap'].includes(id) || (id === 'shampoo' && !st.hairSoap)) st.press('Space'); };
    const moveSponge = dt => {
      const sp = st.sponge, v = 240 * dt; let moving = false;
      if (keys.KeyA || keys.ArrowLeft) { sp.x -= v; moving = true; } if (keys.KeyD || keys.ArrowRight) { sp.x += v; moving = true; }
      if (keys.KeyW || keys.ArrowUp) { sp.y -= v; moving = true; } if (keys.KeyS || keys.ArrowDown) { sp.y += v; moving = true; }
      if (mouse.down) { sp.x = mouse.x; sp.y = mouse.y; if (mouse.moved > 0) moving = true; }
      sp.x = Math.max(20, Math.min(500, sp.x)); sp.y = Math.max(20, Math.min(265, sp.y));
      if (moving) st.rubbing = 0.25; st.rubbing = Math.max(0, (st.rubbing || 0) - dt);
      return st.rubbing > 0;
    };
    st.update = dt => {
      st.t += dt; const id = cur(), s = steps[Math.min(st.i, steps.length - 1)]; st.step = s.step; st.hint = s.hint;
      if (id === 'temp' || (st.water && id !== 'off')) {
        if (id === 'temp') {
          if (keys.KeyA || keys.ArrowLeft) st.temp -= dt * 9; if (keys.KeyD || keys.ArrowRight) st.temp += dt * 9;
          if (mouse.down) st.temp += mouse.dx * 0.12;
          st.temp = Math.max(10, Math.min(55, st.temp));
          const ok = st.temp >= GOOD[0] && st.temp <= GOOD[1]; st.good = ok ? st.good + dt : 0;
          st.hint = `${Math.round(st.temp)}°C · ${st.temp > 44 ? 'Ow! Far too hot' : st.temp > GOOD[1] ? 'a bit too hot' : st.temp < 30 ? 'freezing!' : st.temp < GOOD[0] ? 'a bit cold' : 'just right, hold it there'} · ${s.hint}`;
          if (st.temp > 44 && !bath) st.ouch += dt;
          if (st.good > 1.5) next();
        }
      }
      if (id === 'fill') { st.fill = Math.min(1, st.fill + dt / (space() ? 3 : 5)); st.hint = `${Math.round(st.fill * 100)}% full`; if (st.fill >= 1) next(); }
      if (id === 'wet') { if (space()) st.hold += dt; st.wet = Math.min(1, st.hold / 2); if (st.hold > 2) next(); }
      if (id === 'shampoo') {
        if (st.hairSoap) { const sp = st.sponge; if (moveSponge(dt) && Math.hypot(sp.x - 260, sp.y - 30) < 40) st.hair = Math.min(1, st.hair + dt * 0.5); st.hint = `Rub it in all over your hair: ${Math.round(st.hair * 100)}%`; if (st.hair >= 1) next(); }
      }
      if (id === 'rinseHair') { if (space()) st.hold += dt; st.hair = Math.max(0, 1 - st.hold / 1.5); if (st.hold > 1.5) { st.hair = 0; next(); } }
      if (id === 'front' || id === 'backs') {
        st.scrubT += dt; const zones = id === 'front' ? st.front : st.backZ, sp = st.sponge;
        if (moveSponge(dt)) { st.lather = Math.min(1, st.lather + dt * 0.2); for (const z of zones) if (Math.hypot(z.x - sp.x, z.y - sp.y) < 34) z.done = Math.min(1, z.done + dt * 0.8); }
        const left = zones.filter(z => z.done < 1);
        st.hint = left.length ? `Still to do: ${left.map(z => z.name.toLowerCase()).join(', ')}` : 'All done';
        if (!left.length) next();
      }
      if (id === 'rinse') { if (space()) st.hold += dt; st.lather = Math.max(0, 1 - st.hold / 2.5); if (st.hold > 2.5) { st.lather = 0; st.sponge.held = false; next(); } }
      if (id === 'soak') { if (space()) st.hold += dt; st.hint = st.hold > 0 ? 'Ahh…' : s.hint; if (st.hold > 3) next(); }
      if (id === 'dry') { if (Math.abs(mouse.dx) > 18) { const side = Math.sign(mouse.dx); if (side !== st.lastSide) { st.lastSide = side; st.dry = Math.min(1, st.dry + 0.06); } } if (st.dry >= 1) st.i++; }
      if (st.sponge.held && id !== 'front' && id !== 'backs' && id !== 'shampoo') { st.sponge.x += (330 - st.sponge.x) * Math.min(1, dt * 6); st.sponge.y += (150 - st.sponge.y) * Math.min(1, dt * 6); }
      mouse.moved = 0;
      const zs = id === 'front' ? st.front : id === 'backs' ? st.backZ : null, share = zs ? zs.reduce((a, z) => a + z.done, 0) / zs.length : 0;
      st.progress = Math.min(1, (st.i + share) / steps.length);
      st.parts = zs ? zs.map(z => (z.done >= 1 ? '✓' : '·')).join(' ') : '';
      if (st.i >= steps.length) { st.score = Math.max(40, 100 - Math.round(st.ouch * 20)); st.result = { scalded: st.ouch > 0.5 }; st.step = 'Clean all over ✓'; st.hint = ''; return 'done'; }
    };
    st.draw = g => {
      const id = cur();
      rr(0, 0, 520, 280, 0, '#d6e2e8'); for (let x = 0; x < 520; x += 34) for (let y = 0; y < 280; y += 34) { g.strokeStyle = 'rgba(255,255,255,.45)'; g.strokeRect(x, y, 34, 34); }
      if (bath) {   // the tub, with the water level and the taps
        rr(70, 170, 380, 90, 18, '#f4f4f0'); g.fillStyle = 'rgba(110,180,230,.55)'; g.fillRect(84, 250 - 70 * st.fill, 352, 70 * st.fill);
        rr(410, 150, 30, 26, 6, '#c0c6cc'); if (st.water) { g.fillStyle = 'rgba(140,200,255,.8)'; g.fillRect(420, 176, 8, 70); }
        circ(110, 252, 6, st.plug ? '#333' : '#999');
      } else {   // the shower head, the mixer, the tray, the glass
        rr(240, 4, 40, 12, 5, '#c0c6cc'); rr(256, 0, 8, 10, 2, '#c0c6cc');
        if (st.water) { g.fillStyle = `rgba(${st.temp > 40 ? 200 : 140},${st.temp > 40 ? 190 : 200},255,.35)`; g.fillRect(230, 16, 60, 250); if (st.temp > 38) for (let k = 0; k < 10; k++) circ(200 + ((k * 53 + st.t * 30) % 120), 40 + ((k * 37) % 200), 14, 'rgba(255,255,255,.12)'); }
        rr(130, 262, 260, 14, 4, '#f4f4f0'); g.fillStyle = 'rgba(160,210,240,.18)'; g.fillRect(380, 20, 6, 242);
      }
      // the mixer dial: green band is the comfortable range
      { const cx = 470, cy = 70; circ(cx, cy, 30, '#e8ecef'); const ang = T => Math.PI * (0.75 + (T - 10) / 45 * 1.5);
        g.lineWidth = 6; g.strokeStyle = '#4aa3ff'; g.beginPath(); g.arc(cx, cy, 24, ang(10), ang(30)); g.stroke(); g.strokeStyle = '#3ddc97'; g.beginPath(); g.arc(cx, cy, 24, ang(GOOD[0]), ang(GOOD[1])); g.stroke(); g.strokeStyle = '#e05050'; g.beginPath(); g.arc(cx, cy, 24, ang(44), ang(55)); g.stroke();
        const a = ang(st.temp); g.strokeStyle = '#333'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); g.stroke(); text(`${Math.round(st.temp)}°`, cx, cy + 46, '#33404a', 'bold 13px system-ui'); }
      // shelf with shampoo and shower gel; the sponge rests on it until you soap it
      rr(410, 140, 90, 6, 2, '#9aa3ad'); rr(420, 112, 16, 28, 4, '#c96b9b'); rr(442, 116, 16, 24, 4, '#5fb38a');
      // you (a plain figure: head, body, arms, legs; from behind when you turn round). In the bath you're lower down.
      const dy = bath && st.inBath ? 60 : 0, skin = '#d9a07a', shade = '#c78e6a', back = st.back && (id === 'backs' || id === 'turn');
      if (!bath || st.inBath || ['dry', 'plug', 'on', 'temp', 'fill', 'off', 'in'].includes(id)) {
        g.save(); g.translate(0, dy);
        circ(260, 50, 22, skin); if (back || st.hair > 0 || true) { g.fillStyle = back ? '#3b2a20' : '#3b2a20'; g.beginPath(); g.arc(260, back ? 50 : 42, 22, Math.PI, back ? Math.PI * 3 : 0); g.fill(); }
        rr(250, 70, 20, 14, 4, skin); rr(222, 82, 76, 90, 18, back ? shade : skin); rr(226, 150, 68, 24, 8, '#4b5d70');   // body; shorts so it stays a game, not a body
        rr(196, 86, 22, 86, 10, skin); rr(302, 86, 22, 86, 10, skin);   // arms
        if (!(bath && st.inBath)) { rr(232, 172, 24, 80, 10, skin); rr(264, 172, 24, 80, 10, skin); rr(228, 248, 30, 10, 4, shade); rr(262, 248, 30, 10, 4, shade); }
        if (st.wet > 0 && st.dry < 1) { g.fillStyle = `rgba(140,200,255,${0.25 * st.wet * (1 - st.dry)})`; g.fillRect(190, 26, 140, 236); }
        if (st.hair > 0) for (let k = 0; k < 14; k++) circ(244 + (k % 7) * 5.5, 30 + Math.floor(k / 7) * 8 + Math.sin(st.t * 3 + k) * 1.5, 5, 'rgba(255,255,255,.9)');
        const zones = id === 'front' ? st.front : id === 'backs' ? st.backZ : [];
        for (const z of zones) { g.globalAlpha = 0.85; circ(z.x, z.y, 7, z.done >= 1 ? '#3ddc97' : `rgba(255,210,63,${0.4 + 0.6 * (1 - z.done)})`); g.globalAlpha = 1; }
        if (st.lather > 0) for (let k = 0; k < st.lather * 30; k++) { const z = (id === 'backs' ? st.backZ : st.front)[k % (id === 'backs' ? 4 : 11)]; if (z.done > 0.2 || id === 'rinse') circ(z.x + Math.cos(k * 2.3) * 12, z.y + Math.sin(k * 1.7) * 10, 4 + (k % 3), 'rgba(255,255,255,.8)'); }
        g.restore();
      }
      if (bath && st.inBath) { g.fillStyle = 'rgba(110,180,230,.55)'; g.fillRect(84, 180, 352, 70); }   // you're in the water
      if (id === 'dry') { rr(40 + Math.sin(st.t * 12) * 14, 90, 80, 120, 8, '#c9a77a'); text('towel', 80 + Math.sin(st.t * 12) * 14, 155, '#fff', '12px system-ui'); }
      const sp = st.sponge; if (sp.held || id === 'shampoo' && st.hairSoap || id === 'soap') { const wob = (id === 'front' || id === 'backs') ? Math.sin(st.t * 20) * 2 : 0; rr(sp.x - 20 + wob, sp.y - 12, 40, 24, 8, '#f7a35c'); }   // the sponge (or your hand with shampoo on it)
      else if (!st.sponge.held && ['on', 'temp', 'wet', 'plug', 'fill', 'off', 'in'].includes(id)) rr(470, 128, 30, 12, 5, '#f7a35c');
      if (id === 'soap') text(`gel ${st.pumps}/2`, 450, 106, '#33404a');
    };
    return st;
  }

  const GAMES = { handwash, laundry, dishes, toilet, shower: () => bodywash(), bath: () => bodywash({ bath: true }) };
  return { open, get active() { return !el.hidden; } };
}
