// Real car controls for the car you're driving.
//
// AUTOMATIC: gear selector P R N D (Z = up, X = down; it starts in D).
//   P parks (holds the car), R reverses with the accelerator, N is neutral,
//   D drives forward. S is the brake; it no longer reverses you on its own.
// MANUAL: gears R N 1 2 3 4 5 6 (Z = up, X = down; starts in 1st).
//   Low gears pull hard but top out early; high gears are fast but sluggish. Try to
//   pull away in 3rd or above from a standstill and the engine stalls.
// LIGHTS (H): Auto -> Off -> Dipped -> Full beam. Brake lights glow when you brake,
//   reversing lights come on in reverse.
// INDICATORS: , (comma) left, . (full stop) right, / hazards. B = horn.
// A dashboard shows speed, gear, revs and lights, with tap buttons for touch screens.
import * as THREE from 'three';

const AUTO_SEL = ['P', 'R', 'N', 'D'];
const MANUAL = ['R', 'N', 1, 2, 3, 4, 5, 6];
const RATIO = [0, 0.18, 0.32, 0.48, 0.64, 0.82, 1.0];        // top speed share per manual gear
const PULL = [0, 1.3, 1.12, 0.95, 0.8, 0.66, 0.55];          // acceleration per manual gear
const LIGHT_MODES = ['auto', 'off', 'dipped', 'full'];

export function createCarControls({ headlight, headMat, tailMat, toast, isAuto, nightGlow }) {
  const st = { sel: 'D', gear: 1, lights: 'auto', ind: null, stalled: false, braking: false, reversing: false, horn: 0, rev: 0 };
  let car = null, lamps = null, blinkT = 0;
  const amber = () => new THREE.MeshStandardMaterial({ color: 0x6a3a00, emissive: 0xffa21f, emissiveIntensity: 0 });

  // ---------- dashboard ----------
  const dash = document.createElement('div');
  dash.id = 'carDash';
  dash.innerHTML = `<style>
    #carDash{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);display:none;gap:14px;align-items:center;background:rgba(8,12,20,.72);color:#fff;font-family:system-ui,sans-serif;padding:8px 14px;border-radius:14px;z-index:40;backdrop-filter:blur(4px)}
    #carDash .spd{font-size:30px;font-weight:800;min-width:64px;text-align:right;font-variant-numeric:tabular-nums}#carDash .unit{font-size:11px;opacity:.7;margin-left:3px}
    #carDash .gear{font-size:26px;font-weight:800;color:#ffd23f;min-width:30px;text-align:center}
    #carDash .revs{width:90px;height:8px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden}#carDash .revs div{height:100%;background:linear-gradient(90deg,#3ad37a,#ffd23f 70%,#ff4d3d);width:0}
    #carDash .ic{font-size:18px;opacity:.25;transition:opacity .1s}#carDash .ic.on{opacity:1}#carDash .ic.blue.on{color:#5fb3ff}#carDash .ic.green.on{color:#3ad37a}#carDash .ic.amber.on{color:#ffa21f}
    #carDash button{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:9px;font-size:14px;padding:6px 9px;min-width:36px;cursor:pointer}
    #carDash .btns{display:flex;gap:5px}#carDash .bat{font-size:14px;font-variant-numeric:tabular-nums}#carDash .bat.low{color:#ff5a4a}#carDash .bat.chg{color:#2dff8a}
    @media (max-width:700px){#carDash{bottom:150px;gap:8px;padding:6px 9px}#carDash .spd{font-size:22px;min-width:44px}#carDash .revs{width:50px}}
    @media (pointer:coarse) and (max-height:520px){#carDash{top:calc(env(safe-area-inset-top,0px) + 4px);bottom:auto;flex-wrap:wrap;justify-content:center;max-width:min(430px,52vw);gap:6px;padding:5px 8px;row-gap:3px}#carDash .spd{font-size:20px;min-width:40px}#carDash .revs{width:44px}#carDash .btns button{min-width:30px;min-height:30px;padding:2px 6px}}
  </style>
  <div><span class="spd">0</span><span class="unit">mph</span></div>
  <div class="gear">D</div><div class="revs"><div></div></div>
  <span class="ic green" data-i="left">⬅</span><span class="ic amber" data-i="haz">⚠</span><span class="ic green" data-i="right">➡</span>
  <span class="ic blue" data-i="lights">◉</span>
  <span class="bat" title="Battery">🔋<b>100</b>%</span>
  <span class="cond bat" title="Condition">🔧<b>100</b>%</span>
  <div class="btns"><button data-b="down" title="Gear down (X)">−</button><button data-b="up" title="Gear up (Z)">+</button><button data-b="lights" title="Lights (H)">💡</button><button data-b="left" title="Left indicator (,)">◀</button><button data-b="haz" title="Hazards (/)">⚠</button><button data-b="right" title="Right indicator (.)">▶</button><button data-b="horn" title="Horn (B)">📯</button></div>`;
  document.body.append(dash);
  const $ = s => dash.querySelector(s);
  dash.addEventListener('pointerdown', e => { const b = e.target.closest('button')?.dataset.b; if (!b) return; e.preventDefault(); e.stopPropagation(); press(b); });

  // ---------- sounds ----------
  let audio = null;
  function beep(freq, ms, type = 'square', vol = 0.06) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = vol;
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + ms / 1000);
    } catch {}
  }

  // ---------- attach to the car you get into ----------
  function attach(v) {
    detach();
    car = v; st.sel = 'D'; st.gear = 1; st.ind = null; st.stalled = false;
    // Your car gets its own lamp materials, so braking only lights up your car.
    const head = headMat.clone(), tail = tailMat.clone();
    v.group.traverse(o => { if (o.material === headMat) o.material = head; else if (o.material === tailMat) o.material = tail; });
    const body = v.hoverBody || v.group, L = v.length || 4.2, W = (v.width || 2) / 2;
    const make = (x, z, mat, w = 0.18) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.05), mat); m.position.set(x, 0.72, z); body.add(m); return m; };
    const ampL = amber(), ampR = amber(), revMat = new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0xffffff, emissiveIntensity: 0 });
    lamps = { head, tail, ampL, ampR, revMat, meshes: [
      make(W - 0.08, L / 2 + 0.02, ampL), make(W - 0.08, -L / 2 - 0.02, ampL), make(-(W - 0.08), L / 2 + 0.02, ampR), make(-(W - 0.08), -L / 2 - 0.02, ampR),
      make(0.35, -L / 2 - 0.03, revMat, 0.14), make(-0.35, -L / 2 - 0.03, revMat, 0.14)] };
    dash.style.display = 'flex';
    toast(isAuto() ? 'Automatic: Z/X change P R N D (you\'re in D). H lights, , . indicators, / hazards, B horn.' : 'Manual: Z/X change gear (R N 1-6, you\'re in 1st). H lights, , . indicators, / hazards, B horn.');
  }
  function detach() {
    if (lamps) for (const m of lamps.meshes) m.removeFromParent();
    lamps = null; car = null; dash.style.display = 'none';
    headlight.intensity = 0;
  }

  // ---------- controls ----------
  function shift(dir) {
    if (!car) return;
    const moving = Math.abs(car.speed) > 2;
    if (isAuto()) { const i = Math.max(0, Math.min(3, AUTO_SEL.indexOf(st.sel) + dir)); if (moving && (AUTO_SEL[i] === 'R' || AUTO_SEL[i] === 'P')) { toast('Stop the car before selecting ' + AUTO_SEL[i] + '.'); return; } st.sel = AUTO_SEL[i]; }
    else { const i = Math.max(0, Math.min(MANUAL.length - 1, MANUAL.indexOf(st.gear) + dir)); if (moving && MANUAL[i] === 'R') { toast('Stop the car before going into reverse.'); return; } st.gear = MANUAL[i]; if (st.stalled && (st.gear === 1 || st.gear === 'N')) st.stalled = false; }
    beep(900, 30, 'sine', 0.03);
  }
  function press(b) {
    if (!car) return;
    if (b === 'up') shift(1); else if (b === 'down') shift(-1);
    else if (b === 'lights') { st.lights = LIGHT_MODES[(LIGHT_MODES.indexOf(st.lights) + 1) % LIGHT_MODES.length]; toast(`Lights: ${{ auto: 'Auto', off: 'Off', dipped: 'Dipped beam', full: 'Full beam' }[st.lights]}`); }
    else if (b === 'left' || b === 'right' || b === 'haz') st.ind = st.ind === b ? null : b;
    else if (b === 'horn') { beep(380, 380, 'sawtooth', 0.08); beep(470, 380, 'sawtooth', 0.06); }
  }
  function keydown(code) {
    if (!car) return false;
    const map = { KeyZ: 'up', KeyX: 'down', KeyH: 'lights', Comma: 'left', Period: 'right', Slash: 'haz', KeyB: 'horn' };
    if (!map[code]) return false;
    press(map[code]); return true;
  }
  const gearLabel = () => isAuto() ? (st.sel === 'D' && car ? `D${Math.min(6, 1 + Math.floor(Math.abs(car.speed) / Math.max(1, car.maxSpeed) * 6))}` : st.sel) : String(st.gear);

  // Speed change this frame for your car. W = accelerator, S = brake.
  function drive(v, dt, keys, accel) {
    const S = !!keys.KeyS, sp = v.speed;
    v.battery ??= 100;
    if (v.battery <= 0 && keys.KeyW && !st.flatWarned) { st.flatWarned = true; toast('🔋 Battery flat! Coast to a charging point, or walk.'); }
    const W = !!keys.KeyW && v.battery > 0;
    let dv = 0;
    const brakeK = v.stats?.brake || 1;   // better brakes stop you sooner
    const brake = () => { dv += -Math.sign(sp) * Math.min(Math.abs(sp), 30 * brakeK * dt); };
    st.braking = S; st.reversing = false;
    // Like most games (and how drivers expect it): hold S at a standstill to back up, W at a standstill to go forward again.
    const stopped = Math.abs(sp) < 0.6;
    if (isAuto()) {
      if (S && stopped && st.sel !== 'R') { st.sel = 'R'; beep(900, 30, 'sine', 0.03); }
      else if (W && stopped && (st.sel === 'R' || st.sel === 'P' || st.sel === 'N')) { st.sel = 'D'; beep(900, 30, 'sine', 0.03); }
    } else if (!st.stalled) {
      if (S && stopped && st.gear !== 'R') { st.gear = 'R'; beep(900, 30, 'sine', 0.03); }
      else if (W && stopped && (st.gear === 'R' || st.gear === 'N')) { st.gear = 1; beep(900, 30, 'sine', 0.03); }
    }
    if (isAuto()) {
      if (st.sel === 'P') { dv = -sp * Math.min(1, dt * 5); st.braking = true; }
      else if (st.sel === 'R') { if (S) dv -= accel * 0.6 * dt; if (W) brake(); st.reversing = true; st.braking = W; }
      else if (st.sel === 'N') { if (S) brake(); }
      else { if (W) dv += accel * dt; if (S) brake(); }
    } else {
      const g = st.gear;
      if (g === 'R') { if (S) dv -= accel * 0.6 * dt; if (W) brake(); st.reversing = true; st.braking = W; }
      else if (g === 'N') { if (S) brake(); }
      else {
        if (W && !st.stalled && g >= 3 && Math.abs(sp) < 1.5) { st.stalled = true; toast('Stalled! Drop down to 1st gear to pull away.'); beep(90, 300, 'square', 0.05); }
        if (W && !st.stalled) dv += accel * PULL[g] * dt;
        if (S) brake();
      }
    }
    const top = topSpeed(v);
    // Driving uses charge: more when you accelerate hard, a little just from moving.
    v.battery = Math.max(0, v.battery - dt * (Math.abs(sp) * 0.004 + (W ? 0.06 : 0)) / (v.batteryCapacity || 1));   // long-range cars drain slower
    if (v.battery > 0) st.flatWarned = false;
    st.rev = Math.min(1, Math.abs(sp + dv) / Math.max(1, top) * (isAuto() ? 0.75 : 1) + (W ? 0.08 : 0));
    return dv;
  }
  function topSpeed(v) {
    // (reverse speed itself is capped separately; this is the forward limit)
    if (isAuto()) return st.sel === 'P' ? 0 : st.sel === 'R' ? 0 : v.maxSpeed;
    return typeof st.gear === 'number' ? v.maxSpeed * RATIO[st.gear] : st.gear === 'R' ? 0 : v.maxSpeed;
  }

  // ---------- per-frame: lamps and dashboard ----------
  function update(dt) {
    if (!car || !lamps) return;
    blinkT += dt;
    const blink = (blinkT % 0.8) < 0.4, prevOn = update.prev;
    const L = st.ind === 'left' || st.ind === 'haz', R = st.ind === 'right' || st.ind === 'haz';
    lamps.ampL.emissiveIntensity = L && blink ? 3 : 0; lamps.ampR.emissiveIntensity = R && blink ? 3 : 0;
    if (st.ind && blink !== prevOn) beep(blink ? 1500 : 1100, 12, 'square', 0.02);
    update.prev = blink;
    lamps.tail.emissiveIntensity = st.braking ? 2.6 : st.lights === 'off' ? 0.15 : 0.9;
    lamps.revMat.emissiveIntensity = st.reversing ? 2.2 : 0;
    const night = nightGlow();
    const on = st.lights === 'dipped' || st.lights === 'full' || (st.lights === 'auto' && night > 0.15);
    lamps.head.emissiveIntensity = on ? (st.lights === 'full' ? 3 : 1.8) : 0.25;
    headlight.intensity = !on ? 0 : st.lights === 'full' ? 140 : st.lights === 'dipped' ? 70 : night * 80;
    headlight.distance = st.lights === 'full' ? 90 : 45; headlight.angle = st.lights === 'full' ? 0.45 : 0.55;
    // dashboard
    $('.spd').textContent = Math.round(Math.abs(car.speed) * 2.237);
    $('.gear').textContent = st.stalled ? '!' : gearLabel();
    const cond = $('.cond'); cond.querySelector('b').textContent = Math.ceil(car.health ?? 100); cond.classList.toggle('low', (car.health ?? 100) < 35);
    const bat = $('.bat:not(.cond)'); bat.querySelector('b').textContent = Math.floor(car.battery ?? 100); bat.classList.toggle('low', (car.battery ?? 100) < 15); bat.classList.toggle('chg', !!st.charging);
    $('.revs div').style.width = `${Math.round(st.rev * 100)}%`;
    dash.querySelector('[data-i="left"]').classList.toggle('on', L && blink && st.ind !== 'haz');
    dash.querySelector('[data-i="right"]').classList.toggle('on', R && blink && st.ind !== 'haz');
    dash.querySelector('[data-i="haz"]').classList.toggle('on', st.ind === 'haz' && blink);
    dash.querySelector('[data-i="lights"]').classList.toggle('on', on);
  }
  function charge(dt, on) { st.charging = on; if (on && car) car.battery = Math.min(100, (car.battery ?? 100) + dt * 6); }
  return { attach, detach, drive, topSpeed, shift, keydown, update, charge, get car() { return car; }, get state() { return st; } };
}
