// Road traffic law, modelled on UK rules (the world uses GBP and drives on the left).
// - Signals run a real two-phase cycle per junction: green, amber, a short all-red,
//   then red+amber before green — and the crossing road is always red while yours is green.
// - Speed limit in the built-up town grid is 30 mph; enforcement starts at the usual
//   10% + 2 mph threshold. Fixed penalty: 100 and 3 points. 12 points = disqualified.
// - Red light: 100 + 3 points. Driving on the pavement: 100 fixed penalty.
// - Driving without a licence: 300 and 6 points when caught committing another offence.
// - Fines take money; unpaid fines become debt, settled at the licensing office.
// Amounts are in the world's currency (gold) at the same face value as the UK penalties.
const g = n => `${n} gold`;
export const SIGNAL_CYCLE = 52;
export const MPH = 0.44704;                  // metres per second per mph
export const TOWN_LIMIT_MPH = 30;
export const POINTS_BAN = 12;

export function signalState(cx, cz, axis, t) {
  const offset = (((cx * 7 + cz * 13) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const s = ((t + offset + (axis === 'z' ? SIGNAL_CYCLE / 2 : 0)) % SIGNAL_CYCLE + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  if (s < 20) return 'green';
  if (s < 23) return 'amber';
  if (s < 50) return 'red';
  return 'redamber';
}

// AI: how far along a 40 m segment a car may travel before the stop line.
// `s` is distance from the previous junction; returns null when free to go.
export function signalStopPoint(state, s, speed) {
  const STOP_LINE = 31;
  if (s > STOP_LINE + 0.5) return null;              // already in the junction: clear it
  if (state === 'red' || state === 'redamber') return s < 24 ? null : STOP_LINE;
  if (state === 'amber') {
    const brakeDist = speed * speed / (2 * 4.5);     // ~4.5 m/s² comfortable braking
    return STOP_LINE - s > brakeDist ? STOP_LINE : null;
  }
  return null;
}

export const OFFENCES = {
  speeding:   { label: 'Speeding (30 mph zone)',           fine: 100, points: 3 },
  redLight:   { label: 'Failing to stop at a red light',   fine: 100, points: 3 },
  pavement:   { label: 'Driving on the pavement',          fine: 100, points: 0 },
  unlicensed: { label: 'Driving without a licence',        fine: 300, points: 6 },
  disqualified:{ label: 'Driving while disqualified',      fine: 1000, points: 6, arrestable: true },
  dangerous:  { label: 'Dangerous speed (50 mph+ in town)', fine: 0, points: 0, arrestable: true },
  power:      { label: 'Unregistered power use causing damage (Power Registration Act)', fine: 250, points: 0 },
};

export function createRoadLaw(ctx) {
  // ctx: { signals, roundaboutCells:Set, money():number, spend(n), toast, raiseWanted(t), time():seconds }
  let licence = { held: false, theory: false, points: 0, banned: false, history: [] };
  let debt = 0;
  const cooldown = {};
  let overT = 0;
  let prevPos = null;

  const inTownGrid = p => Math.abs(p.x) <= 130 && Math.abs(p.z) <= 130;
  const onRoad = p => {
    const mx = ((p.x % 40) + 40) % 40, mz = ((p.z % 40) + 40) % 40;
    return mx < 5.4 || mx > 34.6 || mz < 5.4 || mz > 34.6;
  };
  const signalised = (cx, cz) => Math.abs(cx) <= 3 && Math.abs(cz) <= 3 && !ctx.roundaboutCells.has(cx + ',' + cz);

  function charge(key, extra = '') {
    const o = OFFENCES[key];
    if ((cooldown[key] || 0) > ctx.time()) return false;
    cooldown[key] = ctx.time() + 25;
    let fine = o.fine, points = o.points, note = '';
    if (!licence.held && key !== 'unlicensed' && key !== 'power' && key !== 'disqualified') {
      fine += OFFENCES.unlicensed.fine; points += OFFENCES.unlicensed.points; note = ' + no licence';
    }
    if (fine) {
      const paid = Math.min(fine, Math.max(0, ctx.money()));
      ctx.spend(paid); debt += fine - paid;
    }
    if (licence.held) licence.points += points;
    licence.history.unshift({ key, fine, points, at: Math.round(ctx.time()) });
    licence.history.length = Math.min(licence.history.length, 12);
    let msg = `${o.label}${note}${extra}. Fixed penalty ${g(fine)}` + (points && licence.held ? `, ${points} points (${licence.points}/12)` : '');
    if (licence.held && licence.points >= POINTS_BAN && !licence.banned) {
      licence.banned = true; msg += '. 12 points reached: you are DISQUALIFIED from driving.';
    }
    if (debt > 0) msg += ` Unpaid: ${g(debt)}.`;
    ctx.toast(msg);
    if (o.arrestable) ctx.raiseWanted(90);
    return true;
  }

  // Called every frame while the player drives a road vehicle.
  function monitorDriving(v, dt) {
    const p = v.group.position;
    if (licence.banned) charge('disqualified');
    if (!inTownGrid(p)) { prevPos = null; overT = 0; return; }
    const mph = Math.abs(v.speed || 0) / MPH;
    if (mph > 50) { overT += dt; if (overT > 1) charge('dangerous', ` (${Math.round(mph)} mph)`); }
    else if (mph > TOWN_LIMIT_MPH * 1.1 + 2) { overT += dt; if (overT > 1.5) charge('speeding', ` (${Math.round(mph)} mph)`); }
    else overT = 0;
    if (!onRoad(p) && mph > 3) charge('pavement');
    const cx = Math.round(p.x / 40), cz = Math.round(p.z / 40);
    const inBox = q => Math.abs(q.x - cx * 40) < 5 && Math.abs(q.z - cz * 40) < 5;
    if (prevPos && signalised(cx, cz) && inBox(p) && !inBox(prevPos)) {
      const axis = Math.abs(prevPos.x - cx * 40) > Math.abs(prevPos.z - cz * 40) ? 'x' : 'z';
      if (ctx.isRedLight(cx, cz, axis)) charge('redLight');
    }
    prevPos = { x: p.x, z: p.z };
  }

  function powerDamage() { if (!ctx.licensedHunter?.()) charge('power'); }

  function payDebt() {
    if (!debt) return ctx.toast('No outstanding fines.');
    const paid = Math.min(debt, Math.max(0, ctx.money()));
    if (!paid) return ctx.toast(`You owe ${g(debt)}. Earn money first.`);
    ctx.spend(paid); debt -= paid;
    ctx.toast(debt ? `Paid ${g(paid)}. Still owed: ${g(debt)}.` : `Paid ${g(paid)}. All fines settled.`);
  }
  function takeTheory() {
    if (licence.theory) return ctx.toast('Theory test already passed.');
    if (ctx.money() < 23) return ctx.toast('The theory test costs 23 gold.');
    ctx.spend(23); licence.theory = true;
    ctx.toast('Theory test passed (hazard perception 61/75). Book your practical test next.');
  }
  function takePractical() {
    if (licence.banned) return ctx.toast('You are disqualified. You must serve the ban before retesting.');
    if (licence.held) return ctx.toast('You already hold a full licence.');
    if (!licence.theory) return ctx.toast('Pass the theory test first.');
    if (ctx.money() < 62) return ctx.toast('The practical driving test costs 62 gold.');
    ctx.spend(62); licence.held = true; licence.points = 0;
    ctx.toast('Practical test passed. Full driving licence issued.');
  }
  function serveBan() {
    if (!licence.banned) return ctx.toast('You are not disqualified.');
    if (ctx.money() < 500) return ctx.toast('Completing the ban and the extended retest course costs 500 gold.');
    ctx.spend(500); licence = { ...licence, held: false, theory: false, points: 0, banned: false };
    ctx.toast('Disqualification served. Retake the theory and practical tests to drive legally.');
  }

  return {
    signalState, monitorDriving, powerDamage, payDebt, takeTheory, takePractical, serveBan, charge,
    get licence() { return licence; }, get debt() { return debt; },
    summary() {
      const l = licence;
      return `${l.banned ? 'DISQUALIFIED' : l.held ? 'Full licence' : l.theory ? 'Theory passed, no licence' : 'No licence'} · ${l.points} points · Fines owed ${g(debt)}`;
    },
    snapshot: () => ({ licence, debt }),
    restore(s) { if (s?.licence) licence = { ...licence, ...s.licence, history: Array.isArray(s.licence.history) ? s.licence.history.slice(0, 12) : [] }; if (Number.isFinite(s?.debt)) debt = Math.max(0, s.debt); },
  };
}
