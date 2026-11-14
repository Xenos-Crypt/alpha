// RESIDENTS IN THEIR PLACES — the city's people where real people would be: at their desks during working
// hours, families round their dining tables in the evening (the children standing by), friends sharing a
// bench by day, and children out with a parent. Every one of them is a real resident with their own name,
// look and age, and a newborn's parent keeps the baby in their arms (people.js).
//
// Nobody is in two places: a resident shown at a desk or a table is one whose walking figure is far away
// across the city, out of sight; and children walk beside the parent they're out with.
const hourOk = (h, a, b) => h >= a && h < b;

export function createSeatedResidents({ sitSpots, makePerson, animate, citizens, citizenOf, peds, hour, playerSeat, playerPos, skip = () => false, groundY }) {
  const seats = [], followers = [];
  const dress = c => ({ outfit: outfitFor(c), hair: 0x2b1d14, pants: pantsFor(c), child: c.age < 16 });
  const place = (h, spot, offset, standing) => {
    const side = { x: Math.cos(spot.yaw), z: -Math.sin(spot.yaw) }, fwd = { x: Math.sin(spot.yaw), z: Math.cos(spot.yaw) };
    if (standing) { const x = spot.x + side.x * offset - fwd.x * .2, z = spot.z + side.z * offset - fwd.z * .2; h.root.position.set(x, groundY(x, z), z); }
    else h.root.position.set(spot.x + side.x * offset, (spot.seatY ?? groundY(spot.x, spot.z) + .45) - .98, spot.z + side.z * offset);
    h.root.rotation.y = spot.yaw;
  };
  const add = (spot, c, activity, from, to, offset = 0, standing = false) => {
    const h = makePerson(dress(c)); h.citizen = c; h.activity = activity;
    place(h, spot, offset, standing); h.root.visible = false;
    seats.push({ h, spot, c, from, to, standing });
  };
  let built = false;
  function build() {
    built = true;
    const all = citizens(), taken = new Set();
    // someone whose walking figure is well away from here (or who has none)
    const away = (c, spot) => { const e = peds()[c.id]; return !e || Math.hypot(e.root.position.x - spot.x, e.root.position.z - spot.z) > 220; };
    const take = (spot, test) => { const c = all.find(x => !x.dead && !x.jail && !taken.has(x) && test(x) && away(x, spot)); if (c) taken.add(c); return c; };
    const label = re => sitSpots.filter(s => re.test(s.label || '') && !s.broken && !skip(s));
    const worker = c => c.age >= 21 && c.age < 66 && !['Child', 'Student', 'Retired', 'Unemployed'].includes(c.job);
    // desks: most are in use from nine to five
    label(/office desk|at the desk$/i).filter((_, i) => i % 4 !== 3).slice(0, 30).forEach(s => { const c = take(s, worker); if (c) add(s, c, 'type', 9, 17); });
    // families round their dining tables in the evening
    const tables = []; for (const s of label(/dining table|at the table$/i)) { const t = tables.find(t => Math.hypot(t[0].x - s.x, t[0].z - s.z) < 2.6); t ? t.push(s) : tables.push([s]); }
    for (const t of tables.filter(t => t.length >= 2).slice(0, 12)) {
      const a = take(t[0], c => c.family?.partner != null && c.age >= 22 && all[c.family.partner] && !all[c.family.partner].dead && !taken.has(all[c.family.partner]) && away(all[c.family.partner], t[0]));
      if (!a) break;
      const b = all[a.family.partner]; taken.add(b);
      add(t[0], a, 'talk', 18, 21); add(t[1], b, 'talk', 18, 21);
      const kids = (a.family.children || []).map(i => all[i]).filter(k => k && !k.dead && k.age >= 4 && k.age < 16);   // toddlers are in bed
      kids.slice(0, Math.max(0, t.length - 2)).forEach((k, i) => { taken.add(k); add(t[2 + i], k, 'talk', 18, 21); });
      kids.slice(Math.max(0, t.length - 2), t.length).slice(0, 2).forEach((k, i) => { taken.add(k); add(t[0], k, 'talk', 18, 21, (i ? -1 : 1) * 1.1, true); });
    }
    // friends sharing a bench by day
    label(/street bench|^Sit on (the )?bench/i).filter((_, i) => i % 3 === 0).slice(0, 10).forEach(s => {
      const a = take(s, c => c.age >= 16), b = take(s, c => c.age >= 16);
      if (a) add(s, a, 'talk', 10, 19, -.42); if (b) add(s, b, 'talk', 10, 19, .42);
    });
  }
  // a parent of a newborn has the baby in their arms (one parent: they take turns)
  function babyOf(c) {
    for (const i of c?.family?.children || []) { const k = citizens()[i]; if (k && !k.dead && k.age < 2 && (k.id + c.id) % 2 === 0) return k; }
    return null;
  }
  // a child out with a parent walks beside them (the parent whose turn it is)
  function childOf(c) {
    for (const i of c?.family?.children || []) { const k = citizens()[i]; if (k && !k.dead && !k.jail && k.age >= 2 && k.age < 12 && (k.id + c.id) % 2 === 1 && k.born != null) return k; }
    return null;
  }
  let pick = 1;
  function walkAlong(dt, me, hr) {
    if ((pick += dt) >= .25) {   // a few times a second: which parents near you have a child with them
      pick = 0;
      for (const f of followers) f.used = false;
      if (hourOk(hr, 7, 20)) for (const e of peds()) {
        if (!e.alive || e.hidden || !e.root.visible) continue;
        const p = e.root.position; if (Math.abs(p.x - me.x) > 45 || Math.abs(p.z - me.z) > 45) continue;
        const kid = childOf(citizenOf(e)); if (!kid) continue;
        let f = followers.find(f => f.kid === kid);
        if (!f) { if (followers.length >= 8) { f = followers.find(f => !f.used && !f.h.root.visible); if (!f) continue; } else { f = {}; followers.push(f); } if (f.h) f.h.root.removeFromParent(); Object.assign(f, { kid, h: makePerson(dress(kid)), last: p.clone() }); f.h.citizen = kid; }
        f.used = true; f.parent = e;
      }
    }
    for (const f of followers) {
      if (!f.used || !f.parent.alive || f.parent.hidden) { f.h.root.visible = false; continue; }
      const p = f.parent.root.position, yaw = f.parent.root.rotation.y;
      // a step to the parent's side, half a step behind
      const tx = p.x - Math.cos(yaw) * .7 - Math.sin(yaw) * .35, tz = p.z + Math.sin(yaw) * .7 - Math.cos(yaw) * .35;
      const moving = Math.hypot(p.x - f.last.x, p.z - f.last.z) > .2 * dt; f.last.copy(p);
      f.h.root.position.set(tx, groundY(tx, tz), tz); f.h.root.rotation.y = yaw; f.h.root.visible = true;
      animate(f.h, moving, dt);
    }
  }
  let t = 1;
  function update(dt) {
    if (!built) { if (citizens().length && peds().length) build(); else return; }
    const me = playerPos();
    t += dt;
    if (t >= .5) {
      t = 0;
      const hr = hour(), seat = playerSeat();
      for (const s of seats) {
        const near = Math.hypot(s.h.root.position.x - me.x, s.h.root.position.z - me.z) < 45;
        const mine = seat && !s.standing && Math.hypot(seat.x - s.spot.x, seat.z - s.spot.z) < .3;   // the player took this seat
        s.h.root.visible = near && hourOk(hr, s.from, s.to) && !s.c.dead && !s.c.jail && !mine;
        if (s.h.root.visible) animate(s.h, false, 0, s.standing ? null : 'sit');
      }
    }
    walkAlong(dt, me, hour());
  }
  return { update, babyOf, childOf, get count() { return seats.length; }, seats: () => seats, followers: () => followers };
}
// what they wear: uniforms for the uniformed, work clothes for workers, their own style otherwise
const STYLE = [0x2f5d8a, 0x8a3b3b, 0xe8e2d4, 0x3a6b35, 0x2a2a2a, 0xc98a2a, 0x6b4f8a, 0x4f7f8a, 0xb5651d, 0x7a8a99];
const PANTS = [0x2d3142, 0x1a1a1a, 0x4a4a6a, 0x5a4a3a, 0x3b3b3b, 0x6b5a45];
export function outfitFor(c) {
  if (/Police|Soldier/.test(c.job)) return 0x243c58;
  if (/Doctor|Nurse|Scientist/.test(c.job)) return 0xe2e7e9;
  if (/Lawyer|Judge|Banker|Accountant|Minister|Mayor|President/.test(c.job)) return 0x2b2f3a;
  return STYLE[(c.id * 7 + 3) % STYLE.length];
}
export function pantsFor(c) { return /Police|Soldier/.test(c.job) ? 0x1c2f43 : PANTS[(c.id * 5 + 1) % PANTS.length]; }
