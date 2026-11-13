// Chore mini-games: washing your hands, doing the laundry and washing up are now things you do,
// step by step, not a one-line message.
//   Wash your hands: tap on, wet, soap, scrub every part for 20 seconds (A/D or ←/→ in turn, or
//     rub with the mouse), rinse, tap off, dry on the towel.
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
  function handwash() {
    const AREAS = ['Palms', 'Backs of hands', 'Between fingers', 'Thumbs', 'Fingertips & nails', 'Wrists'];
    const st = { kind: 'handwash', title: '🧼 Wash your hands', i: 0, t: 0, hold: 0, pumps: 0, area: 0, strokes: 0, lastSide: 0, scrubT: 0, lather: 0, wet: 0, dry: 0, tap: false, tapT: 0, score: 100 };
    const steps = [
      ['Turn the tap on', 'Press Space or click the tap'],
      ['Wet your hands', 'Hold Space (or hold the mouse) under the water'],
      ['Pump the soap', 'Press Space twice'],
      ['Scrub, for at least 20 seconds', 'Rub your hands: A and D (or ← →) in turn, or drag the mouse left and right'],
      ['Rinse the soap off', 'Hold Space under the water'],
      ['Turn the tap off', 'Press Space or click the tap'],
      ['Dry your hands on the towel', 'Rub: A and D in turn, or drag the mouse'],
    ];
    const next = () => { st.i++; st.hold = 0; };
    const rub = code => { const side = /KeyA|ArrowLeft/.test(code) ? -1 : /KeyD|ArrowRight/.test(code) ? 1 : 0; if (side && side !== st.lastSide) { st.lastSide = side; return true; } return false; };
    st.press = code => {
      if (st.i === 0 && code === 'Space') { st.tap = true; next(); }
      else if (st.i === 2 && code === 'Space') { st.pumps++; if (st.pumps >= 2) next(); }
      else if (st.i === 3 && rub(code)) stroke();
      else if (st.i === 5 && code === 'Space') { st.tap = false; next(); }
      else if (st.i === 6 && rub(code)) st.dry = Math.min(1, st.dry + 0.07);
    };
    st.click = (x, y) => { if (x > 330 && x < 420 && y < 90) { if (st.i === 0) { st.tap = true; next(); } else if (st.i === 5) { st.tap = false; next(); } } else if (st.i === 2) st.press('Space'); };
    function stroke() { st.strokes++; st.lather = Math.min(1, st.lather + 0.04); if (st.strokes >= 8 * (st.area + 1) && st.area < AREAS.length) st.area++; }
    st.update = dt => {
      st.t += dt; if (st.tap) st.tapT += dt;
      const s = steps[Math.min(st.i, steps.length - 1)]; st.step = s[0]; st.hint = s[1];
      if (st.i === 1) { if (space()) st.hold += dt; st.wet = Math.min(1, st.hold / 1.2); if (st.hold > 1.2) next(); }
      if (st.i === 3) {
        st.scrubT += dt;
        if (Math.abs(mouse.dx) > 18) { const side = Math.sign(mouse.dx); if (side !== st.lastSide) { st.lastSide = side; stroke(); } }
        st.hint = `${AREAS[Math.min(st.area, AREAS.length - 1)]} · ${Math.min(20, st.scrubT).toFixed(0)}/20 s`;
        if (st.area >= AREAS.length && st.scrubT >= 20) next();
        else if (st.area >= AREAS.length) st.hint = `Every part done. Keep going until 20 s: ${st.scrubT.toFixed(0)}/20`;
      }
      if (st.i === 4) { if (space()) st.hold += dt; st.lather = Math.max(0, 1 - st.hold / 2); if (st.hold > 2) next(); }
      if (st.i === 6) { if (Math.abs(mouse.dx) > 18) { const side = Math.sign(mouse.dx); if (side !== st.lastSide) { st.lastSide = side; st.dry = Math.min(1, st.dry + 0.07); } } if (st.dry >= 1) { st.i++; } }
      st.progress = Math.min(1, (st.i + (st.i === 3 ? Math.min(st.area / AREAS.length, st.scrubT / 20) : 0)) / steps.length);
      st.parts = st.i >= 3 ? AREAS.map((a, k) => (k < st.area ? '✓' : '·')).join(' ') : '';
      if (st.i >= steps.length) { st.score = Math.max(40, 100 - Math.max(0, st.tapT - 40) * 2); st.step = 'Clean hands ✓'; st.hint = ''; return 'done'; }
    };
    st.draw = g => {
      rr(60, 170, 400, 90, 18, '#dfe6ea'); rr(90, 180, 340, 60, 26, '#b8c6cf');               // basin
      rr(350, 40, 24, 60, 6, '#c0c6cc'); rr(330, 34, 80, 16, 8, '#c0c6cc'); rr(390, 26, 22, 12, 4, st.tap ? '#4aa3ff' : '#e05050');   // tap and handle
      if (st.tap) { g.fillStyle = 'rgba(120,190,255,.7)'; g.fillRect(356, 100, 12, 110); }
      rr(450, 120, 26, 50, 6, '#79c2a1'); rr(456, 110, 14, 12, 3, '#555');                    // soap pump
      if (st.i >= 6) { rr(40, 40, 70, 110, 8, '#c9a77a'); text('towel', 75, 100, '#fff', '12px system-ui'); }
      const rubX = Math.sin(st.t * (st.i === 3 || st.i === 6 ? 14 : 2)) * (st.i === 3 || st.i === 6 ? 14 : 2), wet = st.wet > 0 && st.dry < 1;
      for (const s of [-1, 1]) {
        const hx = (st.i === 6 ? 120 : 300) + s * (28 + (st.i === 3 ? 0 : 6)) + rubX * s * 0.5, hy = 150;
        g.save(); g.translate(hx, hy); g.rotate(s * 0.25); rr(-26, -40, 52, 78, 22, '#d9a07a'); for (let f = 0; f < 4; f++) rr(-22 + f * 12, -66, 10, 30, 5, '#d9a07a'); rr(s * 22 - 6, -30, 12, 30, 6, '#d9a07a'); g.restore();
        if (wet) { g.fillStyle = 'rgba(140,200,255,.35)'; g.fillRect(hx - 28, hy - 60, 56, 100); }
      }
      for (let k = 0; k < st.lather * 40; k++) { const a = k * 2.4 + st.t * 0.6; circ(300 + Math.cos(a) * (20 + (k % 7) * 7), 140 + Math.sin(a * 1.3) * 34, 5 + (k % 4) * 2, 'rgba(255,255,255,.85)'); }
      if (st.i === 2) text(`soap ${st.pumps}/2`, 463, 190, '#ffd23f');
      if (st.i === 3) { g.fillStyle = '#3a424c'; g.fillRect(20, 20, 200, 10); g.fillStyle = '#3ddc97'; g.fillRect(20, 20, 200 * Math.min(1, st.scrubT / 20), 10); text('20 seconds', 120, 46, '#aab4bf', '12px system-ui'); }
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

  const GAMES = { handwash, laundry, dishes };
  return { open, get active() { return !el.hidden; } };
}
