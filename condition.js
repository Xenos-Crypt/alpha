// Condition and ageing for things that aren't alive.
// Every building gets a build quality, an age and a condition (100% new → 0% falls down):
//   poor (cheap, at most 20 years), standard (60), solid (120), landmark (250).
// One in-game day counts as one year of ageing, so a badly built house can fall down in a
// few weeks of play. Crashing into a building knocks its condition down a little
// (e.g. 90% → 89%), harder crashes more. Vehicles wear slowly as they are driven, on top
// of crash damage. Walk up to a building or vehicle to see its condition.
export const QUALITY = {
  poor: { years: 20, label: 'poorly built' },
  standard: { years: 60, label: 'standard build' },
  solid: { years: 120, label: 'solidly built' },
  landmark: { years: 250, label: 'landmark build' },
};
export const YEARS_PER_DAY = 1;

// deterministic per-building numbers, so the same building has the same quality each game
const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

export function qualityFor(b) {
  if ((b.top ?? 0) > 40) return 'landmark';
  const r = hash(b.x, b.z);
  return r < 0.25 ? 'poor' : r < 0.75 ? 'standard' : r < 0.95 ? 'solid' : 'landmark';
}
function ensure(b) {
  if (QUALITY[b.quality] && Number.isFinite(b.ageYears)) return b;
  b.quality = QUALITY[b.quality] ? b.quality : qualityFor(b);
  if (!Number.isFinite(b.ageYears)) b.ageYears = hash(b.z, b.x) * 0.5 * QUALITY[b.quality].years;
  b.damage ??= 0;
  return b;
}
export function conditionOf(b) {
  ensure(b);
  const life = QUALITY[b.quality].years;
  return Math.max(0, Math.min(100, 100 * (1 - b.ageYears / life) - (b.damage || 0)));
}

export function createConditions({ buildings, collapse, toast, playerPos, nearVehicle }) {
  for (const b of buildings) ensure(b);   // existing buildings are part-way through their life
  const badge = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (badge) {
    badge.id = 'conditionBadge';
    badge.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 54px);transform:translateX(-50%);z-index:25;background:rgba(10,14,24,.72);color:#fff;font:600 clamp(10px,1.6vw,12px) system-ui,sans-serif;padding:5px 10px;border-radius:10px;pointer-events:none;display:none;max-width:90vw;text-align:center';
    document.body.append(badge);
  }
  const colour = c => c > 60 ? '#5be37d' : c > 30 ? '#ffd23f' : '#ff5a4a';
  function show(html) { if (!badge) return; if (!html) { badge.style.display = 'none'; return; } badge.style.display = 'block'; badge.innerHTML = html; }

  let lastDay = null, hudT = 0;
  function tick(day) {
    if (lastDay == null) { lastDay = day; return; }
    const years = (day - lastDay) * YEARS_PER_DAY; lastDay = day;
    if (years <= 0) return;
    for (const b of buildings) {
      if (!b.alive) continue;
      ensure(b); b.ageYears += years;
      if (conditionOf(b) <= 0) {
        const life = QUALITY[b.quality].years;
        b.ageYears = 0; b.damage = 0;   // it gets rebuilt from new
        collapse(b);
        const p = playerPos();
        if (Math.hypot(p.x - b.x, p.z - b.z) < 250) toast(`🏚️ A ${QUALITY[b.quality].label} building gave way after ${Math.round(life)} years. Crews will rebuild it.`);
      }
    }
  }
  // A vehicle hits something at `speed` m/s near `point`: knock down the nearest building's condition.
  function crash(point, speed, mine) {
    if (speed < 3) return;
    let best = null, bd = 2;
    for (const b of buildings) {
      if (!b.alive) continue;
      const dx = Math.max(0, Math.abs(point.x - b.x) - b.w / 2), dz = Math.max(0, Math.abs(point.z - b.z) - b.d / 2), d = Math.hypot(dx, dz);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return;
    const before = conditionOf(best);
    best.damage = (best.damage || 0) + speed * 0.12 * (best.quality === 'poor' ? 1.6 : best.quality === 'landmark' ? 0.4 : 1);
    const after = conditionOf(best);
    if (mine && Math.floor(before) !== Math.floor(after)) toast(`🧱 Building condition ${Math.floor(before)}% → ${Math.floor(after)}%`);
    if (after <= 0) { best.ageYears = 0; best.damage = 0; collapse(best); }
  }
  // Vehicles wear as they're driven: about 1% per 2 km.
  function wear(v, metres) { if (v.health == null) v.health = 100; v.health = Math.max(1, v.health - metres * 0.0005); }

  function update(dt, driving) {
    hudT -= dt; if (hudT > 0) return; hudT = 0.4;
    if (driving) { show(null); return; }
    const p = playerPos();
    let best = null, bd = 3;
    for (const b of buildings) {
      if (!b.alive) continue;
      const dx = Math.max(0, Math.abs(p.x - b.x) - b.w / 2), dz = Math.max(0, Math.abs(p.z - b.z) - b.d / 2), d = Math.hypot(dx, dz);
      if (d < bd) { bd = d; best = b; }
    }
    const v = nearVehicle?.();
    if (v && v.health != null) { const c = v.health; show(`🚗 Vehicle condition <b style="color:${colour(c)}">${Math.ceil(c)}%</b>`); return; }
    if (best) { ensure(best); const c = conditionOf(best), life = QUALITY[best.quality].years; show(`🏢 Building condition <b style="color:${colour(c)}">${Math.floor(c)}%</b> · ${QUALITY[best.quality].label} · ${Math.floor(best.ageYears)} of ~${life} years`); return; }
    show(null);
  }
  return {
    tick, crash, wear, update, conditionOf,
    snapshot() { return buildings.map(b => [Math.round(b.ageYears * 100) / 100, Math.round((b.damage || 0) * 100) / 100]); },
    restore(s) { if (!Array.isArray(s)) return; s.forEach((r, i) => { const b = buildings[i]; if (b && Array.isArray(r)) { b.ageYears = +r[0] || 0; b.damage = +r[1] || 0; } }); },
  };
}
