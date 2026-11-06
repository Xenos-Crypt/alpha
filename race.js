// Races at Ashford Raceway. Pay the entry fee and the screen switches to race mode: you're
// put in a race car on the grid with 5 AI drivers, the race HUD comes up (lap, position,
// time, a live track map), there's a 3-2-1-GO countdown, then 3 laps of the oval.
// Prize money for the top three. Leave the car or the circuit and you're out.
import * as THREE from 'three';

export const ENTRY_FEE = 50, LAPS = 3, PRIZES = [300, 150, 80];
const AI_NAMES = ['Vex', 'Marlowe', 'Kato', 'Ruiz', 'Okafor'];
const AI_COLOURS = [0x2f6f8f, 0xffd23f, 0x22cc66, 0x8a5cff, 0xff7a1f];

// The oval: two straights joined by half-circle bends. Distance s runs anticlockwise from the
// start line heading east on the north straight (z + r).
export function ovalGeometry(RW) {
  const S = RW.straight;
  const len = R => 2 * S + 2 * Math.PI * R;
  function at(s, R = RW.r) {
    const L = len(R); s = ((s % L) + L) % L;
    const xs = RW.x - S / 2, xe = RW.x + S / 2, arc = Math.PI * R;
    if (s < S) return { x: xs + s, z: RW.z + R, yaw: Math.PI / 2 };
    s -= S;
    if (s < arc) { const f = s / R; return { x: xe + R * Math.sin(f), z: RW.z + R * Math.cos(f), yaw: Math.atan2(Math.cos(f), -Math.sin(f)) }; }
    s -= arc;
    if (s < S) return { x: xe - s, z: RW.z - R, yaw: -Math.PI / 2 };
    s -= S;
    const f = s / R; return { x: xs - R * Math.sin(f), z: RW.z - R * Math.cos(f), yaw: Math.atan2(-Math.cos(f), Math.sin(f)) };
  }
  // distance along the centre line of the closest point to (x, z)
  function progress(x, z) {
    const xs = RW.x - S / 2, xe = RW.x + S / 2, R = RW.r;
    if (x >= xs && x <= xe) return z >= RW.z ? x - xs : S + Math.PI * R + (xe - x);
    if (x > xe) { const f = Math.atan2(x - xe, z - RW.z); return S + R * THREE.MathUtils.clamp(f, 0, Math.PI); }
    const f = Math.atan2(xs - x, RW.z - z); return 2 * S + Math.PI * R + R * THREE.MathUtils.clamp(f, 0, Math.PI);
  }
  return { at, len, progress };
}

export function createRace({ scene, venues, makeVehicle, removeVehicle, enterVehicle, isDriving, interactables, toast, money, spend, earn, playerPos }) {
  const RW = venues.raceway, track = ovalGeometry(RW), L = track.len(RW.r);
  const startS = (RW.x - 40) - (RW.x - RW.straight / 2);   // the start / finish line
  let race = null;
  const hud = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (hud) {
    hud.id = 'raceHud'; hud.hidden = true;
    hud.innerHTML = `<style>
      #raceHud{position:fixed;inset:0;z-index:27;pointer-events:none;font-family:system-ui,sans-serif;color:#fff}
      #raceHud[hidden]{display:none}
      #raceHud .bar{position:absolute;left:0;right:0;top:0;height:calc(env(safe-area-inset-top,0px) + 46px);background:linear-gradient(#000d,#0000);display:flex;justify-content:center;align-items:flex-start;gap:clamp(10px,3vw,28px);padding-top:calc(env(safe-area-inset-top,0px) + 8px);font-weight:800;font-size:clamp(13px,2.4vw,20px);text-shadow:0 2px 6px #000}
      #raceHud .bar span b{color:#ffd23f}
      #raceHud .flag{position:absolute;left:0;right:0;top:0;height:6px;background:repeating-linear-gradient(90deg,#fff 0 14px,#111 14px 28px)}
      #raceHud .vig{position:absolute;inset:0;box-shadow:inset 0 0 120px 30px #0009}
      #raceHud .count{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-size:clamp(60px,14vw,140px);font-weight:900;color:#ffd23f;text-shadow:0 6px 24px #000}
      #raceHud canvas{position:absolute;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);width:clamp(110px,18vw,180px);background:#0008;border-radius:12px}
      #raceHud .board{position:absolute;left:12px;top:calc(env(safe-area-inset-top,0px) + 54px);font-size:clamp(11px,1.6vw,14px);background:#0007;border-radius:10px;padding:6px 10px;line-height:1.45}
    </style><div class="vig"></div><div class="flag"></div><div class="bar"><span>🏁 LAP <b class="lap">1/3</b></span><span>POS <b class="pos">6/6</b></span><span>⏱ <b class="time">0:00.0</b></span></div><div class="count"></div><div class="board"></div><canvas width="180" height="110"></canvas>`;
    document.body.append(hud);
  }
  const $ = s => hud?.querySelector(s);
  const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

  interactables.push({ pos: new THREE.Vector3(RW.x - 40, 0.3, RW.z + RW.r + RW.w / 2 + 4), r: 4, get label() { return race ? 'Race in progress' : `Enter a race (${ENTRY_FEE} gold entry, ${LAPS} laps)`; }, action: start });

  function start() {
    if (race) { toast('A race is already on.'); return; }
    if (money() < ENTRY_FEE) { toast(`The entry fee is ${ENTRY_FEE} gold.`); return; }
    spend(ENTRY_FEE);
    const grid = (i) => { const row = Math.floor(i / 2), lane = i % 2 ? -1 : 1; const g = track.at(startS - 8 - row * 9, RW.r + lane * RW.w / 4); return g; };
    // your car takes the back of the grid; the AI fills the front
    const mine = makeVehicle('car', 0xd0281f); mine.raceCar = true; mine.maxSpeed = 62;
    const gp = grid(5); mine.group.position.set(gp.x, 0.2, gp.z); mine.group.rotation.y = gp.yaw; mine.speed = 0;
    const ai = AI_NAMES.map((name, i) => {
      const v = makeVehicle('car', AI_COLOURS[i]); v.taskDriven = true; v.noSteal = true; v.raceCar = true;
      const lane = i % 2 ? -1 : 1, g = grid(i);
      v.group.position.set(g.x, 0.2, g.z); v.group.rotation.y = g.yaw;
      return { v, name, s: startS - 8 - Math.floor(i / 2) * 9, lane: lane * RW.w / 4, top: 50 + Math.random() * 9, bend: 41 + Math.random() * 7, speed: 0, laps: -1, done: null };   // the grid is behind the line: crossing it starts lap 1
    });
    race = { mine, ai, t: -3.5, myS: track.progress(gp.x, gp.z), myLaps: -1, lastS: null, finished: [], over: false };
    enterVehicle(mine);
    if (hud) hud.hidden = false;
    toast(`🏁 Race on! ${LAPS} laps of Ashford Raceway. Prizes: ${PRIZES.join(' / ')} gold.`);
  }
  function standings() {
    const rows = race.ai.map(a => ({ name: a.name, prog: a.done != null ? 1e6 - a.done : a.laps * L + ((a.s - startS + L) % L), you: false }));
    rows.push({ name: 'You', prog: race.myDone != null ? 1e6 - race.myDone : race.myLaps * L + ((race.myS - startS + L) % L), you: true });
    return rows.sort((a, b) => b.prog - a.prog);
  }
  function update(dt) {
    if (!race) return;
    const r = race;
    r.t += dt;
    if (!isDriving(r.mine)) { finishWith(r, 'you left your car.'); return; }
    // countdown: hold everyone on the grid
    if (r.t < 0) {
      r.mine.speed = 0;
      const n = Math.ceil(-r.t); if ($('.count')) $('.count').textContent = n > 3 ? '' : String(n);
    } else if ($('.count')) $('.count').textContent = r.t < 1 ? 'GO!' : '';
    // you: lap counting from progress round the oval
    const mp = r.mine.group.position, s = track.progress(mp.x, mp.z);
    if (Math.hypot(mp.x - RW.x, mp.z - RW.z) > RW.straight / 2 + RW.r + 60) { finishWith(r, 'you left the circuit.'); return; }
    if (r.lastS != null && r.t > 0) {
      const crossed = ((r.lastS - startS + L) % L) > L * 0.8 && ((s - startS + L) % L) < L * 0.2;
      const back = ((s - startS + L) % L) > L * 0.8 && ((r.lastS - startS + L) % L) < L * 0.2;
      if (crossed) { r.myLaps++; if (r.myLaps >= LAPS && r.myDone == null) { r.myDone = r.t; r.myPlace = r.finished.length + 1; r.finished.push('You'); finishWith(r); return; } if (r.myLaps > 0) toast(`Lap ${r.myLaps + 1} of ${LAPS}`); }
      if (back) r.myLaps--;
    }
    r.lastS = s; r.myS = s;
    // AI drivers follow their racing line, slower in the bends, with a little randomness
    for (const a of r.ai) {
      if (r.t < 0) continue;
      const rel = ((a.s - (RW.x - RW.straight / 2) + L) % L), inBend = !(rel < RW.straight || (rel > RW.straight + Math.PI * RW.r && rel < 2 * RW.straight + Math.PI * RW.r));
      const want = (inBend ? a.bend : a.top) * (a.done != null ? 0.4 : 1);
      a.speed += THREE.MathUtils.clamp(want - a.speed, -18 * dt, 9 * dt);
      const before = (a.s - startS + L) % L;
      a.s += a.speed * dt;
      const after = (a.s - startS + L) % L;
      if (after < before && a.done == null) { a.laps++; if (a.laps >= LAPS) { a.done = r.t; r.finished.push(a.name); } }
      const g = track.at(a.s, RW.r + a.lane), ahead = track.at(a.s + 2, RW.r + a.lane);
      a.v.group.position.set(g.x, 0.2, g.z); a.v.group.rotation.y = Math.atan2(ahead.x - g.x, ahead.z - g.z); a.v.speed = a.speed;
    }
    // HUD
    if (hud) {
      const st = standings(), pos = st.findIndex(x => x.you) + 1;
      $('.lap').textContent = `${Math.max(1, Math.min(LAPS, r.myLaps + 1))}/${LAPS}`; $('.pos').textContent = `${pos}/${st.length}`; $('.time').textContent = r.t < 0 ? '0:00.0' : fmt(r.t);
      $('.board').innerHTML = st.map((x, i) => `${i + 1}. ${x.you ? '<b style="color:#ffd23f">You</b>' : x.name}`).join('<br>');
      const c = $('canvas'), g = c.getContext('2d'), sc = 150 / (RW.straight + 2 * RW.r + 20);
      g.clearRect(0, 0, 180, 110); g.strokeStyle = '#ccc'; g.lineWidth = 5;
      g.beginPath(); for (let k = 0; k <= 60; k++) { const q = track.at(k / 60 * L); const X = 90 + (q.x - RW.x) * sc, Y = 55 + (q.z - RW.z) * sc; k ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); g.stroke();
      const dot = (x, z, col, rr) => { g.fillStyle = col; g.beginPath(); g.arc(90 + (x - RW.x) * sc, 55 + (z - RW.z) * sc, rr, 0, 7); g.fill(); };
      r.ai.forEach((a, i) => dot(a.v.group.position.x, a.v.group.position.z, '#' + AI_COLOURS[i].toString(16).padStart(6, '0'), 3));
      dot(mp.x, mp.z, '#ffd23f', 4.5);
    }
  }
  function finishWith(r, dnf) {
    if (hud) hud.hidden = true;
    for (const a of r.ai) removeVehicle(a.v);
    race = null;
    if (dnf) { toast(`🏁 Out of the race: ${dnf} No prize.`); return; }
    const pos = r.myPlace, prize = PRIZES[pos - 1] || 0;
    if (prize) earn(prize);
    toast(`🏁 You finished ${['1st', '2nd', '3rd', '4th', '5th', '6th'][pos - 1]} in ${fmt(r.myDone)}!${prize ? ` Prize: ${prize} gold.` : ' No prize this time.'}`);
  }
  return { update, start, get racing() { return !!race; } };
}
