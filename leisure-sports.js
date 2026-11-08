// Head-to-head sports and games: play against people in the world, or challenge an online player.
//   rally - badminton, table tennis, squash, tennis, volleyball, air hockey: return the ball when it
//           reaches your side (tap / Space). A better-timed shot is faster and harder to return.
//   shots - basketball, darts, bowling, archery, penalties, mini golf, pool, boxing, climbing:
//           take turns; stop the marker on target. Your opponent takes their turn after you.
//   ayo   - Ayoayo, the Yoruba seed-sowing board game (mancala family), with real capture rules.
// Online: challenge any online player in your room. Ayo is played move by move over the network;
// the other games are played side by side with the same serves/targets and the scores compared.

export const SPORTS = {
  badminton: { name: 'Badminton', icon: '🏸', kind: 'rally', dur: 1.15, arc: 1.1, to: 7, ball: '#ffffff' },
  tabletennis: { name: 'Table tennis', icon: '🏓', kind: 'rally', dur: 0.8, arc: 0.4, to: 7, ball: '#ff9f43' },
  squash: { name: 'Squash', icon: '🎾', kind: 'rally', dur: 0.9, arc: 0.55, to: 7, ball: '#222222' },
  tennis: { name: 'Tennis', icon: '🎾', kind: 'rally', dur: 1.05, arc: 0.7, to: 5, ball: '#d4ff3b' },
  volleyball: { name: 'Volleyball', icon: '🏐', kind: 'rally', dur: 1.3, arc: 1.4, to: 7, ball: '#f1f1f1' },
  airhockey: { name: 'Air hockey', icon: '🏒', kind: 'rally', dur: 0.7, arc: 0, to: 7, ball: '#ff2bd6' },
  basketball: { name: 'Basketball shoot-out', icon: '🏀', kind: 'shots', rounds: 5, zone: 0.14, speed: 1.7, score: 'hoop' },
  darts: { name: 'Darts', icon: '🎯', kind: 'shots', rounds: 6, zone: 0.12, speed: 1.9, score: 'darts' },
  bowling: { name: 'Ten-pin bowling', icon: '🎳', kind: 'shots', rounds: 5, zone: 0.16, speed: 1.5, score: 'bowling' },
  archery: { name: 'Archery', icon: '🏹', kind: 'shots', rounds: 6, zone: 0.14, speed: 1.6, score: 'archery' },
  penalties: { name: 'Penalty shoot-out', icon: '⚽', kind: 'shots', rounds: 5, zone: 0.2, speed: 1.8, score: 'goal' },
  minigolf: { name: 'Mini golf', icon: '⛳', kind: 'shots', rounds: 6, zone: 0.16, speed: 1.3, score: 'golf' },
  pool: { name: 'Pool', icon: '🎱', kind: 'shots', rounds: 7, zone: 0.15, speed: 1.4, score: 'pot' },
  snooker: { name: 'Snooker', icon: '🔴', kind: 'shots', rounds: 6, zone: 0.11, speed: 1.4, score: 'pot' },
  boxing: { name: 'Boxing (pads and sparring)', icon: '🥊', kind: 'shots', rounds: 6, zone: 0.18, speed: 2.4, score: 'punch' },
  climbing: { name: 'Speed climbing', icon: '🧗', kind: 'shots', rounds: 8, zone: 0.2, speed: 2.0, score: 'climb' },
  tabletop: { name: 'Table football', icon: '⚽', kind: 'rally', dur: 0.75, arc: 0, to: 5, ball: '#ffffff' },
  ayo: { name: 'Ayo (Ayoayo)', icon: '🟤', kind: 'ayo' },
};
const SCORE = {   // err: 0 = dead centre, 1 = edge of the target, more = missed
  hoop: (e, r) => e < 1 ? { p: r >= 3 ? 3 : 2, t: e < 0.35 ? 'Swish!' : 'In off the rim!' } : { p: 0, t: 'Clank, it rattles out.' },
  darts: e => e < 0.12 ? { p: 50, t: 'BULLSEYE!' } : e < 0.4 ? { p: 60, t: 'Treble twenty!' } : { p: Math.max(0, Math.round(40 * (1 - e / 2.6))), t: e < 1.2 ? 'Good dart.' : 'Off the board.' },
  bowling: e => e < 0.25 ? { p: 10, t: 'STRIKE! 🎳' } : e < 1 ? { p: Math.max(6, Math.round(10 - e * 4)), t: 'Nice ball.' } : { p: Math.max(0, Math.round(6 - e * 2)), t: e > 2.4 ? 'Gutter ball...' : 'A few pins down.' },
  archery: e => ({ p: Math.max(0, 10 - Math.floor(e * 3.3)), t: e < 0.3 ? 'Gold! Dead centre.' : e < 1 ? 'Inside the red.' : e < 3 ? 'On the target.' : 'Missed the boss.' }),
  goal: e => e < 1 ? { p: 1, t: 'GOAL! ⚽' } : { p: 0, t: e < 1.6 ? 'Saved by the keeper!' : 'Over the bar!' },
  golf: e => e < 0.3 ? { p: 4, t: 'HOLE IN ONE! ⛳' } : e < 1 ? { p: 3, t: 'In with two putts.' } : e < 2 ? { p: 2, t: 'Three putts.' } : { p: 1, t: 'Bounced off the windmill...' },
  pot: e => e < 1 ? { p: 1, t: e < 0.4 ? 'Clean pot!' : 'Rattled in the jaws... and down!' } : { p: 0, t: 'Missed the pocket.' },
  punch: e => ({ p: Math.max(0, 10 - Math.floor(e * 3)), t: e < 0.4 ? 'Perfect combination!' : e < 1 ? 'Solid shot.' : 'Blocked.' }),
  climb: e => e < 1 ? { p: 1, t: 'Up to the next hold.' } : { p: 0, t: 'Your foot slips!' },
};
// seeded random, so online opponents get the same serves and targets
const rng = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; };

export function createSports(ctx) {
  // ctx: { stats, toast, gainXp, pause, resume, send(payload), myId(), online(), players() -> [{id,name}] }
  const el = document.createElement('section'); el.id = 'versusPanel'; el.hidden = true;
  el.innerHTML = `<style>
    #versusPanel{position:fixed;inset:0;z-index:63;display:grid;place-items:center;background:rgba(0,10,20,.55);font-family:system-ui,sans-serif;touch-action:manipulation}
    #versusPanel[hidden],#versusInvite[hidden]{display:none}
    #versusPanel .box{background:linear-gradient(#0f3b2e,#082019);color:#fff;border:3px solid #3ddc97;border-radius:18px;padding:14px;width:min(560px,95vw);max-height:92vh;overflow:auto;text-align:center;box-shadow:0 10px 40px #000a}
    #versusPanel h2{margin:0;color:#3ddc97;font-size:21px}#versusPanel .sub{opacity:.85;font-size:14px;margin:4px 0 8px}
    #versusPanel .score{display:flex;justify-content:space-between;font-weight:800;font-size:18px;margin:6px 4px}
    #versusPanel canvas{width:100%;background:#123;border-radius:12px;touch-action:none}
    #versusPanel .msg{min-height:22px;font-weight:700;margin:6px 0}
    #versusPanel .row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
    #versusPanel button{border:0;border-radius:12px;padding:11px 18px;font-size:16px;font-weight:800;cursor:pointer}
    #versusPanel .go{background:#3ddc97;color:#062}#versusPanel .quit{background:#555;color:#fff}
    #versusPanel .pick{background:#ffffff1f;color:#fff;font-weight:600;text-align:left;width:100%}
    #versusPanel .ayo{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;background:#7a4a22;padding:10px;border-radius:40px;margin:6px 0}
    #versusPanel .pit{aspect-ratio:1;border-radius:50%;background:#4a2a10;color:#ffe9c2;font-size:20px;font-weight:800;display:grid;place-items:center;box-shadow:inset 0 3px 8px #0008;padding:0}
    #versusPanel .pit.mine:not(:disabled){outline:3px solid #3ddc97;cursor:pointer}#versusPanel .pit:disabled{opacity:1;cursor:default}
    #versusInvite{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:64;background:#082019;color:#fff;border:2px solid #3ddc97;border-radius:14px;padding:12px 14px;font-family:system-ui,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 6px 24px #0008}
    #versusInvite button{border:0;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer}
  </style><div class="box"><h2></h2><div class="sub"></div><div class="score"><span class="me"></span><span class="them"></span></div><div class="stage"></div><div class="msg"></div><div class="row"><button class="go" type="button">Start</button><button class="quit" type="button">Leave</button></div></div>`;
  const inv = document.createElement('div'); inv.id = 'versusInvite'; inv.hidden = true; document.body.append(el, inv);
  const $ = s => el.querySelector(s), stage = $('.stage'), msg = $('.msg'), go = $('.go');
  let G = null, raf = 0, keyAct = null, timers = [];
  const later = (f, ms) => timers.push(setTimeout(f, ms));
  const clear = () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; stage.replaceChildren(); keyAct = null; go.onclick = null; };
  const close = () => { if (G?.online && !G.done) ctx.send?.({ kind: 'versus', sub: 'quit', to: G.online.id, gid: G.gid }); clear(); el.hidden = true; G = null; ctx.resume?.(); };
  $('.quit').onclick = close;
  addEventListener('keydown', e => { if (el.hidden) return; if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } else if ((e.code === 'Space' || e.code === 'Enter') && keyAct) { e.preventDefault(); e.stopImmediatePropagation(); keyAct(); } else if (e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  const setScore = () => { $('.me').textContent = `You ${G.me}`; $('.them').textContent = `${G.them} ${G.oppName}`; };

  function finish() {
    if (G.done) return; G.done = true; cancelAnimationFrame(raf); keyAct = null;
    if (G.online) { ctx.send?.({ kind: 'versus', sub: 'score', to: G.online.id, gid: G.gid, score: G.me, their: G.them }); if (G.def.kind === 'ayo') return result(G.me, G.them); msg.textContent = `You scored ${G.me}. Waiting for ${G.oppName}'s score...`; if (G.online.score != null) result(G.me, G.online.score); go.hidden = true; return; }
    result(G.me, G.them);
  }
  function result(a, b) {
    const won = a > b, draw = a === b, online = !!G.online;
    msg.textContent = draw ? `🤝 A draw, ${a} all.` : won ? `🏆 You beat ${G.oppName}, ${a} to ${b}!` : `${G.oppName} wins, ${b} to ${a}. Good game!`;
    if (won) { ctx.gainXp?.(online ? 20 : 8 + Math.round((G.opp?.skill ?? 0.5) * 10)); if (!online && G.opp?.prize) { ctx.stats.gold += G.opp.prize; msg.textContent += ` (+${G.opp.prize} gold)`; } }
    ctx.stats.energy = Math.max(0, ctx.stats.energy - 4);
    if (online) { $('.them').textContent = `${b} ${G.oppName}`; }
    go.hidden = false; go.textContent = online ? 'Done' : 'Play again'; go.onclick = online ? close : () => start(G.def, G.opp); keyAct = () => go.click();
  }

  // ---------------- rally sports ----------------
  function rally() {
    const cv = document.createElement('canvas'); cv.width = 520; cv.height = 230; stage.append(cv); const g = cv.getContext('2d'), d = G.def, R = G.rand;
    const MX = 50, OX = 470, Y0 = 170;
    let ball = null, rallyN = 0, server = 0, pause = 1.2, last = performance.now(), swing = 0, oswing = 0, pressed = false;
    const serve = () => { ball = server === 0 ? { from: MX, to: OX, t: 0, dur: d.dur * 1.1, q: 0.3 } : { from: OX, to: MX, t: 0, dur: d.dur * 1.15, q: 0.3 }; rallyN = 0; pressed = false; };
    const point = who => { if (who === 0) G.me++; else G.them++; setScore(); msg.textContent = who === 0 ? ['Your point!', 'Winner!', 'They couldn\'t reach it!'][Math.floor(R() * 3)] : ['Their point.', 'Missed it!', 'Too slow!'][Math.floor(R() * 3)]; server = who; ball = null; pause = 1.1;
      if (G.me >= d.to || G.them >= d.to) { later(finish, 600); } };
    const hit = () => {
      if (G.done) return; swing = 0.25;
      if (!ball || ball.to !== MX || pressed) return;
      pressed = true;
      if (ball.t < 0.68) { msg.textContent = 'Too early!'; return; }
      const q = Math.max(0, 1 - Math.abs(ball.t - 0.9) / 0.2); rallyN++;
      msg.textContent = q > 0.8 ? 'SMASH! 💥' : q > 0.4 ? 'Good shot.' : 'Just got it back...';
      ball = { from: MX, to: OX, t: 0, dur: Math.max(0.42, d.dur * (1 - 0.3 * q) * (1 - Math.min(0.3, rallyN * 0.02))), q };
    };
    cv.onpointerdown = e => { e.preventDefault(); hit(); }; go.textContent = 'Hit! (Space)'; go.onclick = hit; keyAct = hit;
    const fig = (x, sw, col, flip) => { g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(x, Y0 - 62, 10, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x, Y0 - 52); g.lineTo(x, Y0 - 18); g.lineTo(x - 10, Y0 + 6); g.moveTo(x, Y0 - 18); g.lineTo(x + 10, Y0 + 6); g.stroke();
      const a = (flip ? Math.PI : 0) + (flip ? 1 : -1) * (0.6 - sw * 6); g.beginPath(); g.moveTo(x, Y0 - 44); g.lineTo(x + Math.cos(a) * 30, Y0 - 44 - Math.sin(a) * 30); g.stroke(); };
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; swing = Math.max(0, swing - dt); oswing = Math.max(0, oswing - dt);
      if (!G.done) {
        if (!ball) { pause -= dt; if (pause <= 0) serve(); }
        else {
          ball.t += dt / ball.dur;
          if (ball.to === OX && ball.t >= 0.9 && !ball.decided) {   // the opponent's go
            ball.decided = true; const p = Math.min(0.94, Math.max(0.12, 0.42 + G.skill * 0.5 - ball.q * 0.38 - rallyN * 0.012));
            if (R() < p) { oswing = 0.25; const oq = R() * G.skill; ball = { from: OX, to: MX, t: 0, dur: Math.max(0.45, d.dur * (1 - 0.25 * oq) * (1 - Math.min(0.3, rallyN * 0.02))), q: oq }; pressed = false; }
            else ball.lost = 1;
          }
          if (ball.lost && ball.t > 1.15) point(0);
          else if (ball && ball.to === MX && ball.t > 1.08) point(1);
        }
      }
      // draw
      g.clearRect(0, 0, 520, 230); g.fillStyle = d.arc ? '#1d5e45' : '#1d3f6e'; g.fillRect(0, Y0 + 6, 520, 60); g.fillStyle = '#e8e8e8'; g.fillRect(256, d.arc ? Y0 - 50 : Y0 - 6, 6, d.arc ? 56 : 12);
      fig(MX - 14, swing, '#3ddc97', false); fig(OX + 14, oswing, '#ffb347', true);
      if (ball) { const t = Math.min(1.15, ball.t), x = ball.from + (ball.to - ball.from) * t, y = Y0 - 50 - Math.sin(Math.PI * Math.min(1, t)) * 90 * d.arc + (d.arc ? 0 : 30);
        g.fillStyle = d.ball; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
        if (ball.to === MX && !pressed) { g.fillStyle = '#3ddc9733'; g.fillRect(MX - 30 + 0, 20, 110, Y0); } }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // ---------------- turn-based shots ----------------
  function shots() {
    const d = G.def, R = G.rand, f = SCORE[d.score];
    const bar = document.createElement('div'); bar.style.cssText = 'position:relative;height:120px;background:#123;border-radius:12px;overflow:hidden';
    const lane = document.createElement('div'); lane.style.cssText = 'position:absolute;left:6%;right:6%;top:46px;height:28px;border-radius:14px;background:#2a3b4d'; bar.append(lane);
    const zone = document.createElement('div'); zone.style.cssText = 'position:absolute;top:0;bottom:0;background:#3ddc97;border-radius:14px'; lane.append(zone);
    const bull = document.createElement('div'); bull.style.cssText = 'position:absolute;top:6px;bottom:6px;width:6px;background:#fff;border-radius:3px'; lane.append(bull);
    const mark = document.createElement('div'); mark.style.cssText = 'position:absolute;top:-10px;width:8px;height:48px;background:#ffd23f;border-radius:4px;box-shadow:0 0 8px #ffd23f'; lane.append(mark);
    const log = document.createElement('div'); log.style.cssText = 'font-size:13px;opacity:.85;margin-top:6px;min-height:18px'; stage.append(bar, log);
    let round = 1, zc = 0.5, zw = d.zone, pos = 0, t0 = performance.now(), busy = false;
    const place = () => { zc = 0.18 + R() * 0.64; zw = d.zone * (d.score === 'hoop' && round >= 4 ? 0.75 : 1); zone.style.left = (zc - zw / 2) * 100 + '%'; zone.style.width = zw * 100 + '%'; bull.style.left = `calc(${zc * 100}% - 3px)`; };
    place(); go.textContent = `Shot ${round} of ${d.rounds}`;
    const loop = now => { pos = 0.5 + 0.5 * Math.sin((now - t0) / 1000 * d.speed * (1 + round * 0.04) * Math.PI); mark.style.left = `calc(${pos * 100}% - 4px)`; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const shoot = () => {
      if (busy || G.done) return; busy = true;
      const err = Math.abs(pos - zc) / (zw / 2), r = f(err, round); G.me += r.p; setScore(); msg.textContent = `${d.icon} ${r.t} (+${r.p})`;
      if (!G.online) { const oe = Math.abs(R() + R() - 1) * 2.6 * (1.25 - G.skill), o = f(oe, round); later(() => { G.them += o.p; setScore(); log.textContent = `${G.oppName}: ${o.t} (+${o.p})`; }, 650); }
      later(() => { busy = false; round++; if (round > d.rounds) finish(); else { place(); go.textContent = `Shot ${round} of ${d.rounds}`; } }, 1300);
    };
    go.onclick = shoot; keyAct = shoot; bar.onpointerdown = e => { e.preventDefault(); shoot(); };
  }

  // ---------------- Ayo ----------------
  // pits 0..5 are yours (left to right along the bottom), 6..11 theirs (right to left along the top); sowing runs 0→11→0
  function ayo() {
    const pits = Array(12).fill(4); G.board = pits;
    const board = document.createElement('div'); board.className = 'ayo'; stage.append(board);
    const store = document.createElement('div'); store.style.cssText = 'font-size:13px;opacity:.85'; stage.append(store);
    const order = [11, 10, 9, 8, 7, 6, 0, 1, 2, 3, 4, 5], btn = [];
    for (const i of order) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pit' + (i < 6 ? ' mine' : ''); b.onclick = () => myMove(i); board.append(b); btn[i] = b; }
    const draw = () => { for (let i = 0; i < 12; i++) { btn[i].textContent = pits[i] ? '●'.repeat(Math.min(pits[i], 3)) + (pits[i] > 3 ? pits[i] : '') : ''; btn[i].title = `${pits[i]} seeds`; btn[i].disabled = !(G.turn === 0 && i < 6 && pits[i] > 0) || G.done; } store.textContent = `Captured: you ${G.me} · ${G.oppName} ${G.them} (25 wins)`; };
    const sow = (from, who) => {   // returns seeds captured
      let n = pits[from], i = from; pits[from] = 0;
      while (n > 0) { i = (i + 1) % 12; if (i === from) continue; pits[i]++; n--; }
      let got = 0; const theirs = k => who === 0 ? k >= 6 : k < 6;
      while (theirs(i) && (pits[i] === 2 || pits[i] === 3)) { got += pits[i]; pits[i] = 0; i = (i + 11) % 12; }
      return got;
    };
    const canMove = who => pits.some((v, k) => v > 0 && (who === 0 ? k < 6 : k >= 6));
    const endCheck = () => {
      if (G.me >= 25 || G.them >= 25) { finish(); return true; }
      if (!canMove(G.turn)) { for (let k = 0; k < 12; k++) { if (k < 6) G.me += pits[k]; else G.them += pits[k]; pits[k] = 0; } draw(); setScore(); finish(); return true; }
      return false;
    };
    const myMove = i => { if (G.turn !== 0 || G.done || pits[i] === 0 || i >= 6) return; const got = sow(i, 0); G.me += got; msg.textContent = got ? `You capture ${got}!` : 'You sow your seeds.'; setScore(); G.turn = 1; draw();
      if (G.online) ctx.send?.({ kind: 'versus', sub: 'move', to: G.online.id, gid: G.gid, pit: i });
      if (!endCheck() && !G.online) later(theirMove, 900); else if (G.online && !G.done) msg.textContent += ` Waiting for ${G.oppName}...`; };
    const theirMove = (pit = null) => {
      if (G.done) return;
      if (pit == null) {   // the AI: best capture, sometimes a slip
        let best = -1, bestGot = -1;
        for (let k = 6; k < 12; k++) { if (!pits[k]) continue; const save = pits.slice(), got = sow(k, 1); pits.splice(0, 12, ...save); const score = got + G.rand() * (1.6 - G.skill) * 2; if (score > bestGot) { bestGot = score; best = k; } }
        pit = best;
      }
      if (pit < 0 || !pits[pit]) { G.turn = 0; endCheck(); draw(); return; }
      const got = sow(pit, 1); G.them += got; msg.textContent = got ? `${G.oppName} captures ${got}.` : `${G.oppName} sows. Your turn.`; setScore(); G.turn = 0; draw(); endCheck();
    };
    G.remoteMove = pit => theirMove(6 + pit);   // their pit k (on their side) is our 6 + k
    G.turn = G.online ? (G.online.first ? 0 : 1) : 0; if (G.online && !G.online.first) msg.textContent = `${G.oppName} moves first.`;
    go.hidden = true; draw(); setScore();
  }

  function start(def, opp = {}, online = null) {
    clear(); el.hidden = false; ctx.pause?.();
    G = { def, opp, online, gid: online?.gid, me: 0, them: 0, done: false, skill: online ? 0.62 : (opp.skill ?? 0.5), oppName: online ? online.name : (opp.name || 'Opponent'), rand: rng(online ? online.seed : (Math.random() * 1e9) | 0) };
    $('h2').textContent = `${def.icon} ${def.name}`; $('.sub').textContent = online ? `Online match against ${online.name}` + (def.kind === 'ayo' ? '' : ': same serves, best score wins') : `Against ${G.oppName}${opp.skill != null ? ' ' + '★'.repeat(Math.max(1, Math.round(opp.skill * 5))) : ''}`;
    msg.textContent = def.kind === 'rally' ? 'Tap or press Space to hit the ball back when it reaches you.' : def.kind === 'shots' ? 'Stop the yellow marker on the white line.' : 'Pick one of your pits (bottom row) to sow its seeds anticlockwise. Make 2 or 3 in their pits to capture.';
    go.hidden = false; setScore();
    ({ rally, shots, ayo })[def.kind]();
  }
  function open(id, opp) { const def = SPORTS[id]; if (!def) return; if (!ctx.stats || ctx.stats.energy < 5) { ctx.toast?.('You\'re too tired to play. Eat or rest first.'); return; } start(def, opp); }

  // ---------------- online challenges ----------------
  const pending = new Map();   // gid -> invite we sent
  function challenge(id) {
    const def = SPORTS[id]; if (!def) return;
    const players = ctx.online?.() ? (ctx.players?.() || []) : [];
    if (!players.length) { ctx.toast?.('No other online players in your room right now. Host or join an online game to challenge someone.'); return; }
    clear(); el.hidden = false; ctx.pause?.(); G = null;
    $('h2').textContent = `${def.icon} Challenge someone`; $('.sub').textContent = 'Pick an online player in your room.'; $('.score').firstChild.textContent = ''; $('.them').textContent = ''; msg.textContent = ''; go.hidden = true;
    for (const p of players) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pick'; b.textContent = `🎮 ${p.name}`; b.onclick = () => {
      const gid = Math.random().toString(36).slice(2, 10), seed = (Math.random() * 1e9) | 0; pending.set(gid, { id: p.id, name: p.name, game: id, seed });
      ctx.send?.({ kind: 'versus', sub: 'invite', to: p.id, gid, game: id, seed }); msg.textContent = `Challenge sent to ${p.name}. Waiting for them to accept...`;
      later(() => { if (pending.has(gid)) { pending.delete(gid); msg.textContent = `${p.name} didn't answer.`; } }, 60000); }; stage.append(b); }
  }
  function receive(p) {
    if (!p || p.kind !== 'versus' || p.to !== ctx.myId?.()) return;
    if (p.sub === 'invite' && SPORTS[p.game]) {
      inv.replaceChildren(); const t = document.createElement('span'); t.textContent = `${p.fromName || 'A player'} challenges you to ${SPORTS[p.game].icon} ${SPORTS[p.game].name}!`;
      const yes = document.createElement('button'); yes.textContent = 'Accept'; yes.style.background = '#3ddc97'; const no = document.createElement('button'); no.textContent = 'Decline';
      yes.onclick = () => { inv.hidden = true; ctx.send?.({ kind: 'versus', sub: 'accept', to: p.from, gid: p.gid }); start(SPORTS[p.game], {}, { id: p.from, name: p.fromName || 'Player', seed: p.seed, gid: p.gid, first: false }); };
      no.onclick = () => { inv.hidden = true; ctx.send?.({ kind: 'versus', sub: 'decline', to: p.from, gid: p.gid }); };
      inv.append(t, yes, no); inv.hidden = false; setTimeout(() => { inv.hidden = true; }, 30000); return;
    }
    if (p.sub === 'accept' && pending.has(p.gid)) { const q = pending.get(p.gid); pending.delete(p.gid); start(SPORTS[q.game], {}, { id: q.id, name: q.name, seed: q.seed, gid: p.gid, first: true }); return; }
    if (p.sub === 'decline' && pending.has(p.gid)) { const q = pending.get(p.gid); pending.delete(p.gid); msg.textContent = `${q.name} declined. Maybe later!`; return; }
    if (!G?.online || p.gid !== G.gid) return;
    if (p.sub === 'move' && Number.isInteger(p.pit) && p.pit >= 0 && p.pit < 6) G.remoteMove?.(p.pit);
    else if (p.sub === 'score' && Number.isFinite(p.score)) { G.online.score = p.score; if (G.done && G.def.kind !== 'ayo') result(G.me, p.score); }
    else if (p.sub === 'quit' && !G.done) { msg.textContent = `${G.oppName} left the match. You win by walkover!`; G.done = true; cancelAnimationFrame(raf); ctx.gainXp?.(10); go.hidden = false; go.textContent = 'Done'; go.onclick = close; }
  }
  // play someone here, or (in an online room with other players) challenge one of them
  function menu(id, opp) {
    const def = SPORTS[id]; if (!def) return;
    const players = ctx.online?.() ? (ctx.players?.() || []) : [];
    if (!players.length) return open(id, opp);
    clear(); el.hidden = false; ctx.pause?.(); G = null;
    $('h2').textContent = `${def.icon} ${def.name}`; $('.sub').textContent = 'Who do you want to play?'; $('.me').textContent = ''; $('.them').textContent = ''; msg.textContent = ''; go.hidden = true;
    const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'pick'; b1.textContent = `🧑 Play ${opp?.name || 'someone here'}${opp?.skill != null ? ' ' + '★'.repeat(Math.max(1, Math.round(opp.skill * 5))) : ''}`; b1.onclick = () => { el.hidden = true; open(id, opp); };
    const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'pick'; b2.style.marginTop = '8px'; b2.textContent = `🌐 Challenge an online player (${players.length} in your room)`; b2.onclick = () => challenge(id);
    stage.append(b1, b2);
  }
  const label = (id, opp) => { const d = SPORTS[id]; const on = ctx.online?.() && (ctx.players?.() || []).length; return `${d.name}: play ${opp?.name || 'someone'}${opp?.skill != null ? ' ' + '★'.repeat(Math.max(1, Math.round(opp.skill * 5))) : ''}${on ? ' or an online player' : ''}`; };
  return { open, menu, label, challenge, receive, close, get isOpen() { return !el.hidden; }, get state() { return G; } };
}
