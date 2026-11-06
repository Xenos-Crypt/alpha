// Playable arcade games: skill, not luck. Each one opens full screen on a canvas and you
// control it yourself with the keyboard (arrows / WASD / Space) or touch buttons.
//   dance  - arrows scroll up; hit the matching direction as each one crosses the line.
//   claw   - steer the claw left/right, drop it; it only holds a prize you line up well.
//   hockey - move your mallet to block and strike the puck; first to 5 beats the machine.
//   game   - Neon Defender: move your ship, shoot the invaders before they reach you.
// onFinish(kind, score, tickets) is called when a game ends.
export function createArcade({ toast, pause, resume, onFinish }) {
  const root = document.createElement('section');
  root.id = 'arcadeGame'; root.hidden = true;
  root.innerHTML = `<style>
    #arcadeGame{position:fixed;inset:0;z-index:70;background:#07040f;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#fff;touch-action:none;user-select:none}
    #arcadeGame[hidden]{display:none}
    #arcadeGame canvas{background:#0d0820;border:3px solid #ff2bd6;border-radius:12px;box-shadow:0 0 30px #ff2bd655;max-width:96vw;max-height:70vh}
    #arcadeGame .top{display:flex;gap:16px;align-items:center;margin-bottom:8px;font-size:15px}
    #arcadeGame .top b{color:#ffd23f}
    #arcadeGame .pad{display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,52px);gap:6px;margin-top:10px}
    #arcadeGame .pad button,#arcadeGame .quit{background:#22163a;border:2px solid #8a5cff;color:#fff;border-radius:10px;font-size:22px}
    #arcadeGame .pad button:active{background:#8a5cff}
    #arcadeGame .quit{font-size:14px;padding:6px 14px;margin-left:12px}
  </style>
  <div class="top"><span class="title"></span><span>Score <b class="score">0</b></span><span class="info"></span><button class="quit" type="button">Quit (Esc)</button></div>
  <canvas width="480" height="540"></canvas>
  <div class="pad">
    <span></span><button data-k="ArrowUp">▲</button><button data-k="Space">●</button>
    <button data-k="ArrowLeft">◀</button><button data-k="ArrowDown">▼</button><button data-k="ArrowRight">▶</button>
  </div>`;
  document.body.append(root);
  const cv = root.querySelector('canvas'), g = cv.getContext('2d');
  const $ = s => root.querySelector(s);
  const W = cv.width, H = cv.height;
  const held = {};
  let game = null, raf = 0, last = 0;

  const norm = k => ({ KeyW: 'ArrowUp', KeyA: 'ArrowLeft', KeyS: 'ArrowDown', KeyD: 'ArrowRight', Enter: 'Space' }[k] || k);
  const onKey = (e, down) => {
    if (root.hidden) return;
    const k = norm(e.code);
    if (down && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(true); return; }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) { if (e.code !== 'KeyE') return; }
    e.preventDefault(); e.stopImmediatePropagation();
    if (down && !held[k]) game?.press?.(k);
    held[k] = down;
  };
  addEventListener('keydown', e => onKey(e, true), true);
  addEventListener('keyup', e => onKey(e, false), true);
  root.querySelectorAll('.pad button').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); if (!held[k]) game?.press?.(k); held[k] = true; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { held[k] = false; });
  });
  // Air hockey: drag on the canvas to move the mallet directly.
  let pointer = null;
  const toCanvas = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  cv.addEventListener('pointerdown', e => { pointer = toCanvas(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (pointer || e.pointerType === 'mouse') pointer = toCanvas(e); });
  cv.addEventListener('pointerup', () => { if (game?.kind !== 'hockey') pointer = null; });
  $('.quit').onclick = () => end(true);

  const text = (s, x, y, size = 20, c = '#fff', align = 'center') => { g.fillStyle = c; g.font = `bold ${size}px system-ui,sans-serif`; g.textAlign = align; g.fillText(s, x, y); };
  const setScore = n => { game.score = Math.max(0, Math.round(n)); $('.score').textContent = game.score; };

  // ============================================================ DANCE
  function dance() {
    const LANES = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'], ICON = ['◀', '▼', '▲', '▶'], COL = ['#ff2bd6', '#00e5ff', '#22ff88', '#ffd23f'];
    const LINE = 90, SPEED = 260, LEN = 40;
    const notes = []; let t0 = 1.2;
    for (let tt = t0; tt < LEN - 1; ) { const lane = Math.floor(Math.random() * 4); notes.push({ lane, t: tt }); if (Math.random() < 0.15) notes.push({ lane: (lane + 2) % 4, t: tt }); tt += [0.25, 0.5, 0.5, 0.75][Math.floor(Math.random() * 4)] * (tt < 15 ? 1.4 : 1); }
    let t = 0, combo = 0, best = 0, judge = '', judgeT = 0, hits = 0, misses = 0;
    const flash = [0, 0, 0, 0];
    return {
      kind: 'dance', title: '💃 DANCE STAR', score: 0, info: () => `Combo ${combo}`,
      press(k) {
        const lane = LANES.indexOf(k); if (lane < 0) return;
        flash[lane] = 0.15;
        let bestN = null, bestD = 1e9;
        for (const n of notes) if (!n.done && n.lane === lane) { const d = Math.abs(n.t - t); if (d < bestD) { bestD = d; bestN = n; } }
        if (!bestN || bestD > 0.2) { combo = 0; judge = 'MISS'; judgeT = 0.5; setScore(this.score - 20); return; }
        bestN.done = true; hits++;
        const pts = bestD < 0.05 ? (judge = 'PERFECT!', 100) : bestD < 0.11 ? (judge = 'GREAT', 60) : (judge = 'OK', 25);
        combo++; best = Math.max(best, combo); judgeT = 0.5;
        setScore(this.score + pts * (1 + Math.min(combo, 50) / 25));
      },
      step(dt) {
        t += dt;
        for (const n of notes) if (!n.done && t - n.t > 0.2) { n.done = true; n.missed = true; combo = 0; misses++; judge = 'MISS'; judgeT = 0.5; }
        g.clearRect(0, 0, W, H);
        for (let i = 0; i < 4; i++) {
          const x = 60 + i * 120;
          g.fillStyle = flash[i] > 0 ? COL[i] + '55' : '#ffffff08'; g.fillRect(x - 50, 0, 100, H);
          flash[i] = Math.max(0, flash[i] - dt);
          g.strokeStyle = COL[i]; g.lineWidth = 3; g.strokeRect(x - 34, LINE - 34, 68, 68);
          text(ICON[i], x, LINE + 12, 34, COL[i] + '88');
        }
        for (const n of notes) {
          if (n.done && !n.missed) continue;
          const y = LINE + (n.t - t) * SPEED; if (y > H + 40 || y < -40) continue;
          const x = 60 + n.lane * 120;
          g.fillStyle = n.missed ? '#555' : COL[n.lane]; g.beginPath(); g.roundRect(x - 30, y - 30, 60, 60, 12); g.fill();
          text(ICON[n.lane], x, y + 12, 32, '#0d0820');
        }
        if (judgeT > 0) { judgeT -= dt; text(judge, W / 2, H / 2, 40, judge === 'MISS' ? '#ff5a4a' : '#ffd23f'); }
        if (combo > 4) text(`${combo} COMBO`, W / 2, H / 2 + 44, 24, '#fff');
        text(`${Math.max(0, Math.ceil(LEN - t))}s`, W - 14, H - 14, 16, '#aaa', 'right');
        if (t >= LEN) return `Song complete! ${hits} hits, ${misses} misses, best combo ${best}.`;
      },
    };
  }

  // ============================================================ CLAW
  function claw() {
    const FLOOR = H - 60, TOP = 60;
    const prizes = []; const C = ['#ff2bd6', '#00e5ff', '#22ff88', '#ffd23f', '#ff5a3c', '#8a5cff'];
    for (let i = 0; i < 9; i++) prizes.push({ x: 50 + i * 47 + Math.random() * 10, y: FLOOR - 22 - (i % 2) * 14, r: 20 + Math.random() * 6, c: C[i % C.length], value: 10 + Math.floor(Math.random() * 3) * 10 });
    let cx = W / 2, cy = TOP, state = 'aim', tries = 3, held = null, open = 1, msg = '', msgT = 0, time = 25;
    return {
      kind: 'claw', title: '🧸 CLAW CRANE', score: 0, info: () => `Tries ${tries} · ${Math.ceil(time)}s`,
      press(k) { if (state === 'aim' && (k === 'Space' || k === 'ArrowDown')) state = 'drop'; },
      step(dt) {
        if (state === 'aim') {
          time -= dt;
          const dir = (heldKey('ArrowRight') ? 1 : 0) - (heldKey('ArrowLeft') ? 1 : 0);
          cx = Math.max(30, Math.min(W - 30, cx + dir * 170 * dt));
          if (time <= 0) state = 'drop';
        } else if (state === 'drop') {
          cy += 230 * dt; open = 1;
          const hit = prizes.find(p => !p.won && Math.abs(p.x - cx) < p.r + 6 && cy + 30 > p.y - p.r);
          if (hit || cy > FLOOR - 30) {
            state = 'close'; held = hit || null;
            if (held) { const off = Math.abs(held.x - cx) / held.r; held.grip = off < 0.25 ? 1 : off < 0.55 ? 0.6 : 0.15; }   // how well you lined it up
          }
        } else if (state === 'close') {
          open = Math.max(0, open - dt * 3); if (open === 0) state = 'lift';
        } else if (state === 'lift') {
          cy -= 140 * dt;
          if (held) { held.x += (cx - held.x) * dt * 8; held.y = cy + 34 + held.r * 0.5; if (held.grip < 1 && cy < FLOOR - 120 && Math.random() < dt * (1 - held.grip) * 2.5) { msg = 'It slipped! Line the claw up with the middle of the prize.'; msgT = 2; held.y = FLOOR - 22; held = null; } }
          if (cy <= TOP) { cy = TOP; state = 'carry'; }
        } else if (state === 'carry') {
          cx -= 200 * dt;
          if (held) { held.x = cx; held.y = cy + 34 + held.r * 0.5; }
          if (cx <= 45) { if (held) { held.won = true; setScore(this.score + held.value); msg = `You won a prize! +${held.value}`; msgT = 2; held = null; } else if (!msgT) { msg = 'Nothing this time.'; msgT = 1.5; }
            tries--; open = 1; state = tries > 0 ? 'aim' : 'done'; time = 25; }
        }
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#1a1030'; g.fillRect(0, FLOOR, W, H - FLOOR);
        g.fillStyle = '#ffd23f33'; g.fillRect(0, FLOOR - 70, 80, 70); text('PRIZE', 40, FLOOR - 30, 16, '#ffd23f');
        for (const p of prizes) { if (p.won) continue; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); g.fillStyle = '#0006'; g.beginPath(); g.arc(p.x - p.r * 0.3, p.y - p.r * 0.2, 3, 0, 7); g.arc(p.x + p.r * 0.3, p.y - p.r * 0.2, 3, 0, 7); g.fill(); }
        g.strokeStyle = '#aaa'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, TOP - 30); g.lineTo(W, TOP - 30); g.stroke();
        g.beginPath(); g.moveTo(cx, TOP - 30); g.lineTo(cx, cy); g.stroke();
        g.strokeStyle = '#e6e6e6'; g.lineWidth = 5; const spread = 10 + open * 16;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - spread, cy + 22); g.lineTo(cx - spread * 0.5, cy + 36); g.moveTo(cx, cy); g.lineTo(cx + spread, cy + 22); g.lineTo(cx + spread * 0.5, cy + 36); g.stroke();
        if (state === 'aim') { g.setLineDash([6, 8]); g.strokeStyle = '#ffffff33'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy + 40); g.lineTo(cx, FLOOR); g.stroke(); g.setLineDash([]); text('◀ ▶ to move · SPACE / ▼ to drop', W / 2, H - 20, 15, '#bbb'); }
        if (msgT > 0) { msgT -= dt; text(msg, W / 2, H / 2, 18, '#ffd23f'); }
        if (state === 'done' && msgT <= 0) return this.score ? `You won ${this.score / 10 | 0} prize${this.score > 10 ? 's' : ''}!` : 'No prizes this time. Line it up better!';
      },
    };
  }

  // ============================================================ AIR HOCKEY
  function hockey() {
    const R = 22, PR = 14, GOAL = 150;
    const me = { x: W / 2, y: H - 80, vx: 0, vy: 0 }, cpu = { x: W / 2, y: 80, vx: 0, vy: 0 };
    const puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    let mine = 0, theirs = 0, time = 75, serveT = 1, msg = '', msgT = 0;
    const serve = toMe => { puck.x = W / 2; puck.y = H / 2 + (toMe ? 40 : -40); puck.vx = (Math.random() - 0.5) * 80; puck.vy = toMe ? 60 : -60; };
    serve(true);
    const strike = (m) => {
      const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
      if (d < R + PR && d > 0) {
        const nx = dx / d, ny = dy / d;
        puck.x = m.x + nx * (R + PR); puck.y = m.y + ny * (R + PR);
        const rel = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny;
        if (rel < 0) { puck.vx -= 1.9 * rel * nx; puck.vy -= 1.9 * rel * ny; }
        puck.vx += m.vx * 0.35; puck.vy += m.vy * 0.35;
        const sp = Math.hypot(puck.vx, puck.vy); if (sp > 900) { puck.vx *= 900 / sp; puck.vy *= 900 / sp; }
      }
    };
    return {
      kind: 'hockey', title: '🏒 AIR HOCKEY', score: 0, info: () => `You ${mine} – ${theirs} CPU · ${Math.ceil(time)}s`,
      step(dt) {
        time -= dt;
        // your mallet: follow the pointer, or arrow keys
        const ox = me.x, oy = me.y;
        if (pointer) { me.x += (pointer.x - me.x) * Math.min(1, dt * 18); me.y += (pointer.y - me.y) * Math.min(1, dt * 18); }
        const kx = (heldKey('ArrowRight') ? 1 : 0) - (heldKey('ArrowLeft') ? 1 : 0), ky = (heldKey('ArrowDown') ? 1 : 0) - (heldKey('ArrowUp') ? 1 : 0);
        me.x += kx * 420 * dt; me.y += ky * 420 * dt;
        me.x = Math.max(R, Math.min(W - R, me.x)); me.y = Math.max(H / 2 + R, Math.min(H - R, me.y));
        me.vx = (me.x - ox) / Math.max(dt, 1e-3); me.vy = (me.y - oy) / Math.max(dt, 1e-3);
        // the machine: tracks the puck, a bit slow, so you can beat it with angles and speed
        const cox = cpu.x, coy = cpu.y;
        const tx = puck.y < H / 2 ? puck.x : W / 2 + (puck.x - W / 2) * 0.4, ty = puck.y < H / 2 && puck.vy < 60 ? puck.y - 10 : 70;
        const sp = 230 + Math.min(4, mine) * 25;
        const dx = tx - cpu.x, dy = ty - cpu.y, dd = Math.hypot(dx, dy);
        if (dd > 1) { cpu.x += dx / dd * Math.min(dd, sp * dt); cpu.y += dy / dd * Math.min(dd, sp * dt); }
        cpu.y = Math.max(R, Math.min(H / 2 - R, cpu.y));
        cpu.vx = (cpu.x - cox) / Math.max(dt, 1e-3); cpu.vy = (cpu.y - coy) / Math.max(dt, 1e-3);
        if (serveT > 0) serveT -= dt;
        else {
          puck.x += puck.vx * dt; puck.y += puck.vy * dt; puck.vx *= 1 - dt * 0.25; puck.vy *= 1 - dt * 0.25;
          if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx); } if (puck.x > W - PR) { puck.x = W - PR; puck.vx = -Math.abs(puck.vx); }
          const inGoal = Math.abs(puck.x - W / 2) < GOAL / 2;
          if (puck.y < PR) { if (inGoal) { mine++; msg = 'GOAL!'; msgT = 1; serveT = 1; serve(false); setScore(mine * 100); } else { puck.y = PR; puck.vy = Math.abs(puck.vy); } }
          if (puck.y > H - PR) { if (inGoal) { theirs++; msg = 'CPU scores'; msgT = 1; serveT = 1; serve(true); } else { puck.y = H - PR; puck.vy = -Math.abs(puck.vy); } }
          strike(me); strike(cpu);
        }
        g.clearRect(0, 0, W, H);
        g.strokeStyle = '#00e5ff55'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 60, 0, 7); g.stroke();
        g.fillStyle = '#ff2bd6'; g.fillRect(W / 2 - GOAL / 2, 0, GOAL, 6); g.fillStyle = '#22ff88'; g.fillRect(W / 2 - GOAL / 2, H - 6, GOAL, 6);
        const disc = (o, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(o.x, o.y, r, 0, 7); g.fill(); g.fillStyle = '#ffffff44'; g.beginPath(); g.arc(o.x, o.y, r * 0.5, 0, 7); g.fill(); };
        disc(cpu, R, '#ff2bd6'); disc(me, R, '#22ff88'); disc(puck, PR, '#ffd23f');
        if (msgT > 0) { msgT -= dt; text(msg, W / 2, H / 2 - 20, 36, '#ffd23f'); }
        if (mine >= 5) return `You beat the machine ${mine}–${theirs}!`;
        if (theirs >= 5) return `The machine wins ${theirs}–${mine}. Use angles off the walls!`;
        if (time <= 0) return `Time! ${mine}–${theirs}.`;
      },
    };
  }

  // ============================================================ NEON DEFENDER
  function shooter() {
    const ship = { x: W / 2, y: H - 50 }; const bullets = [], foes = [], sparks = [];
    let t = 0, spawn = 0, cd = 0, lives = 3, time = 60;
    return {
      kind: 'game', title: '🚀 NEON DEFENDER', score: 0, info: () => `Lives ${'♥'.repeat(lives)} · ${Math.ceil(time)}s`,
      press(k) { if (k === 'Space' || k === 'ArrowUp') this.fire(); },
      fire() { if (cd > 0) return; cd = 0.18; bullets.push({ x: ship.x, y: ship.y - 18 }); },
      step(dt) {
        t += dt; time -= dt; cd -= dt; spawn -= dt;
        const dir = (heldKey('ArrowRight') ? 1 : 0) - (heldKey('ArrowLeft') ? 1 : 0);
        ship.x = Math.max(20, Math.min(W - 20, ship.x + dir * 300 * dt));
        if (heldKey('Space') || heldKey('ArrowUp')) this.fire();
        if (spawn <= 0) { spawn = Math.max(0.35, 1.1 - t * 0.012); foes.push({ x: 30 + Math.random() * (W - 60), y: -20, vx: (Math.random() - 0.5) * 80, vy: 60 + t * 1.6 + Math.random() * 40, c: ['#ff2bd6', '#00e5ff', '#ffd23f'][Math.floor(Math.random() * 3)] }); }
        for (const b of bullets) b.y -= 520 * dt;
        for (const f of foes) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.x < 15 || f.x > W - 15) f.vx *= -1; }
        for (const f of foes) for (const b of bullets) if (!f.dead && !b.dead && Math.abs(f.x - b.x) < 18 && Math.abs(f.y - b.y) < 16) { f.dead = b.dead = true; setScore(this.score + 25); for (let i = 0; i < 8; i++) sparks.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.5) * 240, l: 0.4, c: f.c }); }
        for (const f of foes) if (!f.dead && (f.y > H - 20 || (Math.abs(f.x - ship.x) < 22 && Math.abs(f.y - ship.y) < 18))) { f.dead = true; lives--; }
        for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.l -= dt; }
        for (const list of [bullets, foes, sparks]) for (let i = list.length - 1; i >= 0; i--) if (list[i].dead || list[i].y < -30 || list[i].l <= 0) list.splice(i, 1);
        g.clearRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { g.fillStyle = '#ffffff33'; g.fillRect((i * 97) % W, (i * 53 + t * 40 * (1 + i % 3)) % H, 2, 2); }
        g.fillStyle = '#22ff88'; g.beginPath(); g.moveTo(ship.x, ship.y - 18); g.lineTo(ship.x - 16, ship.y + 12); g.lineTo(ship.x + 16, ship.y + 12); g.fill();
        g.fillStyle = '#fff'; for (const b of bullets) g.fillRect(b.x - 2, b.y - 8, 4, 12);
        for (const f of foes) { g.fillStyle = f.c; g.beginPath(); g.moveTo(f.x - 16, f.y - 8); g.lineTo(f.x + 16, f.y - 8); g.lineTo(f.x + 8, f.y + 10); g.lineTo(f.x - 8, f.y + 10); g.fill(); }
        for (const s of sparks) { g.fillStyle = s.c; g.fillRect(s.x, s.y, 3, 3); }
        if (t < 3) text('◀ ▶ to move · SPACE to shoot', W / 2, H / 2, 18, '#bbb');
        if (lives <= 0) return 'Game over!';
        if (time <= 0) return 'You survived the wave!';
      },
    };
  }

  // ============================================================ BRICK BREAKER
  function bricks() {
    const pw = 80, pad = { x: W / 2 }, ball = { x: W / 2, y: H - 70, vx: 160, vy: -260, stuck: true };
    const rows = 6, cols = 8, bw = (W - 20) / cols, bh = 20, C = ['#ff2bd6', '#ff5a3c', '#ffd23f', '#22ff88', '#00e5ff', '#8a5cff'];
    const wall = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) wall.push({ x: 10 + c * bw, y: 50 + r * (bh + 4), alive: true, c: C[r] });
    let lives = 3;
    return {
      kind: 'bricks', title: '🧱 BRICK BREAKER', score: 0, info: () => `Lives ${'♥'.repeat(lives)}`,
      press(k) { if (k === 'Space' || k === 'ArrowUp') ball.stuck = false; },
      step(dt) {
        const dir = (heldKey('ArrowRight') ? 1 : 0) - (heldKey('ArrowLeft') ? 1 : 0);
        if (pointer) pad.x += (pointer.x - pad.x) * Math.min(1, dt * 20); else pad.x += dir * 380 * dt;
        pad.x = Math.max(pw / 2, Math.min(W - pw / 2, pad.x));
        if (ball.stuck) { ball.x = pad.x; ball.y = H - 52; }
        else {
          ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.x < 8 || ball.x > W - 8) { ball.vx *= -1; ball.x = Math.max(8, Math.min(W - 8, ball.x)); }
          if (ball.y < 8) { ball.vy = Math.abs(ball.vy); }
          if (ball.y > H - 46 && ball.y < H - 34 && Math.abs(ball.x - pad.x) < pw / 2 + 6 && ball.vy > 0) { ball.vy = -Math.abs(ball.vy) * 1.02; ball.vx = (ball.x - pad.x) / (pw / 2) * 280; }   // where it hits the paddle steers it
          for (const b of wall) if (b.alive && ball.x > b.x && ball.x < b.x + bw - 4 && ball.y > b.y && ball.y < b.y + bh) { b.alive = false; ball.vy *= -1; setScore(this.score + 10); break; }
          if (ball.y > H + 10) { lives--; ball.stuck = true; ball.vx = 160; ball.vy = -260; }
        }
        g.clearRect(0, 0, W, H);
        for (const b of wall) if (b.alive) { g.fillStyle = b.c; g.fillRect(b.x, b.y, bw - 4, bh); }
        g.fillStyle = '#fff'; g.fillRect(pad.x - pw / 2, H - 40, pw, 10);
        g.beginPath(); g.arc(ball.x, ball.y, 7, 0, 7); g.fill();
        if (ball.stuck) text('◀ ▶ (or drag) to move · SPACE to launch', W / 2, H / 2, 16, '#bbb');
        if (wall.every(b => !b.alive)) return 'You cleared the wall!';
        if (lives <= 0) return 'Out of balls!';
      },
    };
  }
  // ============================================================ HOOP SHOT
  function hoops() {
    let t = 0, time = 40, power = 0, rising = true, shot = null, hoopX = W / 2, made = 0, msg = '', msgT = 0;
    return {
      kind: 'hoops', title: '🏀 HOOP SHOT', score: 0, info: () => `Baskets ${made} · ${Math.ceil(time)}s`,
      press(k) { if ((k === 'Space' || k === 'ArrowUp') && !shot) shot = { p: power, t: 0, x: W / 2 }; },
      step(dt) {
        t += dt; time -= dt;
        hoopX = W / 2 + Math.sin(t * (0.6 + made * 0.05)) * 150;   // the hoop slides: time your shot
        if (!shot) { power += (rising ? 1 : -1) * dt * 1.3; if (power > 1) { power = 1; rising = false; } if (power < 0) { power = 0; rising = true; } }
        else {
          shot.t += dt;
          const f = Math.min(1, shot.t / 0.9), peak = 120 + shot.p * 360;
          shot.y = H - 60 - Math.sin(f * Math.PI) * peak * 0.9 - f * (shot.p * 300);
          if (f >= 1) {
            const hit = Math.abs(shot.p - 0.72) < 0.09 && Math.abs(hoopX - W / 2) < 34;
            if (hit) { made++; setScore(this.score + 100 + made * 10); msg = 'SWISH!'; } else msg = Math.abs(hoopX - W / 2) >= 34 ? 'Missed: time it with the hoop!' : shot.p > 0.72 ? 'Too hard!' : 'Too soft!';
            msgT = 1; shot = null; power = 0; rising = true;
          }
        }
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#ffffff22'; g.fillRect(hoopX - 60, 90, 120, 80); g.strokeStyle = '#ff5a3c'; g.lineWidth = 5; g.beginPath(); g.moveTo(hoopX - 30, 170); g.lineTo(hoopX + 30, 170); g.stroke();
        g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(shot ? shot.x : W / 2, shot ? shot.y : H - 60, 16, 0, 7); g.fill();
        g.fillStyle = '#333'; g.fillRect(30, H - 200, 22, 160); g.fillStyle = Math.abs(power - 0.72) < 0.09 ? '#22ff88' : '#ffd23f'; g.fillRect(30, H - 40 - power * 160, 22, power * 160);
        g.strokeStyle = '#22ff88'; g.lineWidth = 2; g.strokeRect(28, H - 40 - 0.81 * 160, 26, 0.18 * 160);
        text('SPACE when the bar is in the green and the hoop is centred', W / 2, H - 14, 13, '#bbb');
        if (msgT > 0) { msgT -= dt; text(msg, W / 2, H / 2, 30, '#ffd23f'); }
        if (time <= 0) return `${made} baskets!`;
      },
    };
  }
  // ============================================================ TURBO LANES
  function lanes() {
    let lane = 1, t = 0, dist = 0, speed = 220, crashed = 0; const cars = []; let spawn = 0;
    return {
      kind: 'lanes', title: '🏎️ TURBO LANES', score: 0, info: () => `${Math.floor(dist / 10)} m · crashes ${crashed}/3`,
      press(k) { if (k === 'ArrowLeft') lane = Math.max(0, lane - 1); if (k === 'ArrowRight') lane = Math.min(2, lane + 1); },
      step(dt) {
        t += dt; speed += dt * 6; dist += speed * dt; spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.35, 1.1 - t * 0.012); cars.push({ lane: Math.floor(Math.random() * 3), y: -60, c: ['#ff2bd6', '#00e5ff', '#ffd23f'][Math.floor(Math.random() * 3)] }); }
        for (const c of cars) c.y += speed * dt;
        const lx = l => W / 2 + (l - 1) * 130;
        for (const c of cars) if (!c.hit && c.lane === lane && c.y > H - 150 && c.y < H - 50) { c.hit = true; crashed++; }
        for (let i = cars.length - 1; i >= 0; i--) if (cars[i].y > H + 80) { if (!cars[i].hit) setScore(this.score + 15); cars.splice(i, 1); }
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#1a1a24'; g.fillRect(W / 2 - 200, 0, 400, H);
        g.fillStyle = '#fff6'; for (let y = (dist % 60) - 60; y < H; y += 60) for (const l of [0.5, 1.5]) g.fillRect(W / 2 + (l - 1) * 130 - 3, y, 6, 30);
        for (const c of cars) { g.fillStyle = c.hit ? '#555' : c.c; g.fillRect(lx(c.lane) - 26, c.y - 45, 52, 90); }
        g.fillStyle = '#22ff88'; g.fillRect(lx(lane) - 26, H - 145, 52, 90);
        if (t < 3) text('◀ ▶ to change lanes', W / 2, H / 2, 18, '#bbb');
        if (crashed >= 3) return `Wrecked after ${Math.floor(dist / 10)} m!`;
      },
    };
  }
  // ============================================================ WHACK-A-MOLE
  function moles() {
    const holes = [0, 1, 2, 3].map(i => ({ up: 0, hit: false })); let time = 35, spawn = 0;
    const KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'], ICON = ['◀', '▲', '▼', '▶'];
    return {
      kind: 'moles', title: '🔨 WHACK-A-MOLE', score: 0, info: () => `${Math.ceil(time)}s`,
      press(k) { const i = KEYS.indexOf(k); if (i < 0) return; const h = holes[i]; if (h.up > 0 && !h.hit) { h.hit = true; h.up = Math.min(h.up, 0.2); setScore(this.score + 20); } else setScore(this.score - 5); },
      step(dt) {
        time -= dt; spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.3, 0.9 - (35 - time) * 0.015); const h = holes[Math.floor(Math.random() * 4)]; if (h.up <= 0) { h.up = Math.max(0.55, 1.1 - (35 - time) * 0.015); h.hit = false; } }
        for (const h of holes) h.up -= dt;
        g.clearRect(0, 0, W, H);
        holes.forEach((h, i) => {
          const x = 70 + i * 113, y = H / 2 + 40;
          g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(x, y + 30, 46, 16, 0, 0, 7); g.fill();
          if (h.up > 0) { g.fillStyle = h.hit ? '#ff5a4a' : '#8a5a2a'; g.beginPath(); g.arc(x, y, 34, Math.PI, 0); g.fillRect(x - 34, y, 68, 26); g.fill(); g.fillStyle = '#000'; g.fillRect(x - 12, y - 14, 6, 6); g.fillRect(x + 6, y - 14, 6, 6); }
          text(ICON[i], x, y + 80, 26, '#bbb');
        });
        if (time <= 0) return 'Time up!';
      },
    };
  }

  const heldKey = k => !!held[k];
  const MAKERS = { dance, claw, hockey, game: shooter, bricks, hoops, lanes, moles };
  function frame(now) {
    if (!game) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const done = game.step(dt);
    $('.info').textContent = game.info();
    if (done) { game.over = done; end(false); return; }
    raf = requestAnimationFrame(frame);
  }
  function start(kind) {
    const make = MAKERS[kind]; if (!make) return false;
    for (const k in held) held[k] = false;
    pointer = null;
    game = make(); $('.title').textContent = game.title; $('.score').textContent = 0;
    root.querySelector('.pad').style.display = kind === 'hockey' ? 'none' : '';
    cv.style.touchAction = 'none';
    root.hidden = false; pause?.();
    last = performance.now(); raf = requestAnimationFrame(frame);
    return true;
  }
  function end(quit) {
    if (!game) return;
    cancelAnimationFrame(raf);
    const g0 = game; game = null; root.hidden = true;
    // tickets: by score, so playing well pays
    const tickets = quit ? 0 : { dance: Math.floor(g0.score / 400), claw: g0.score, hockey: Math.floor(g0.score / 100) * 6 + (g0.over.startsWith('You beat') ? 20 : 0), game: Math.floor(g0.score / 50), bricks: Math.floor(g0.score / 40), hoops: Math.floor(g0.score / 40), lanes: Math.floor(g0.score / 30), moles: Math.floor(g0.score / 25) }[g0.kind] || 0;
    onFinish?.(g0.kind, g0.score, tickets, quit ? 'You walk away from the machine.' : g0.over);
    resume?.();
  }
  return { start, get playing() { return !!game; } };
}
