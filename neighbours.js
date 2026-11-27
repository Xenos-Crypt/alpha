// NEIGHBOURS: every flat door belongs to somebody, and somebody lives a day of their own behind it.
//
// Each flat gets a resident (made once from the door's place, so it's the same person every time): a name, a job,
// a temper, how careful they are with locks, and a routine that fits the job:
//   day job      out about 07:00-08:30, back 17:00-19:00, Monday to Friday
//   night shift  out about 19:00-21:00, back 06:30-08:00, Sunday to Thursday
//   market trader out 05:00-06:00, back 17:00-19:00, Monday to Saturday
//   student      out about 07:30, back about 15:30, Monday to Friday
//   retired      mostly in; an errand some mornings, church on Sunday morning
//   out of work  mostly in; out for a few hours on some afternoons
// LOCKS follow the routine: out = locked; at night (22:00-07:00) locked even when in; in the daytime careless people
// leave it on the latch. The door's action menu (main.js / action-menu.js) offers what makes sense right now:
//   Knock: in and awake, they open up a crack and talk (their temper decides how); asleep, a grumpy voice; out,
//          nobody (and a neighbour may tell you when they're back).
//   Try the handle: unlocked and they're out, you walk in; unlocked and they're in, they react, each in their own
//          way (friendly, shocked, scared and screaming for the police, or angry and shoving you out).
//   Pick the lock: needs a Door Master (Ink, in the Narrows). The lock gauge; anyone home hears it, a neighbour
//          might see it.
// Inside: a small flat of their own (a pocket room far from the world, painted and furnished per flat). You can
// search it (money, once a day) and leave by the door. If they come home while you're in there, they find you.
import * as THREE from 'three';

const FIRST = ['Adaeze', 'Karim', 'Mariam', 'Tunde', 'Layla', 'Samir', 'Grace', 'Omar', 'Ngozi', 'Rami', 'Hana', 'Emeka', 'Nadia', 'Yusuf', 'Rose', 'Bassam', 'Ife', 'Joseph', 'Zainab', 'Elias'];
const LAST = ['Okafor', 'Haddad', 'Mensah', 'Khoury', 'Adeyemi', 'Nassar', 'Boateng', 'Saliba', 'Eze', 'Aoun', 'Owusu', 'Rahme', 'Balogun', 'Sayegh', 'Danjuma'];
const TYPES = [
  { kind: 'day', job: ['a security guard', 'a cleaner', 'a bus driver', 'a shop assistant', 'a builder'], w: 4 },
  { kind: 'night', job: ['a night nurse', 'a night watchman', 'a factory hand on nights', 'a baker'], w: 2 },
  { kind: 'trader', job: ['a market trader', 'a street-food seller'], w: 2 },
  { kind: 'student', job: ['a student'], w: 1 },
  { kind: 'retired', job: ['retired'], w: 2 },
  { kind: 'jobless', job: ['out of work'], w: 2 },
];
const TEMPERS = ['friendly', 'calm', 'scared', 'angry'];
const LINES = {
  friendly: ['"Oh, hello! You\'re from upstairs, aren\'t you? Everything all right?"', '"Hi neighbour! Want some tea? No? Another time then."', '"Ah, it\'s you. If you need sugar, I\'ve got some."'],
  calm: ['"Yes? Can I help you?"', '"Hm? Oh, it\'s the new one from upstairs. What is it?"', '"Sorry, I\'m in the middle of something. Was it important?"'],
  scared: ['The chain stays on. "W-who is it? What do you want?"', 'An eye at the gap. "I\'ve got nothing, okay? Please go away."', '"Is it about the rent? I told Mr Kassim I\'d pay Friday..."'],
  angry: ['"What?! Do you know what time it is?"', '"If you\'re selling something, I\'ll break your legs."', '"Stop banging on my door. Some of us work for a living."'],
};

export function createNeighbours(ctx) {
  // ctx: { doors, scene, colliders, interactables, hours(), day(), player(), teleport(pos, yaw), toast, raiseWanted,
  //        hasTool(name), gold(n), news(text), ensureMenu }
  const { doors, toast } = ctx;
  const flats = [];
  doors.forEach((D, i) => {
    if (/landlord/.test(D.who)) return;   // Mr Kassim keeps his own rules (rent.js)
    let s = Math.abs(Math.round(D.x * 73 + D.z * 131 + D.y * 17)) + 7;
    const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const tot = TYPES.reduce((a, t) => a + t.w, 0); let pickT = r() * tot, T = TYPES[0]; for (const t of TYPES) { if ((pickT -= t.w) < 0) { T = t; break; } }
    const first = FIRST[Math.floor(r() * FIRST.length)], last = LAST[Math.floor(r() * LAST.length)];
    const P = {
      name: first + ' ' + last, first, kind: T.kind, job: T.job[Math.floor(r() * T.job.length)], temper: TEMPERS[Math.floor(r() * TEMPERS.length)],
      careless: r() < 0.25, leave: 0, back: 0, days: [], errands: [],
    };
    if (T.kind === 'day') Object.assign(P, { leave: 7 + r() * 1.5, back: 17 + r() * 2, days: [0, 1, 2, 3, 4] });
    if (T.kind === 'night') Object.assign(P, { leave: 19 + r() * 2, back: 6.5 + r() * 1.5, days: [6, 0, 1, 2, 3] });
    if (T.kind === 'trader') Object.assign(P, { leave: 5 + r(), back: 17 + r() * 2, days: [0, 1, 2, 3, 4, 5] });
    if (T.kind === 'student') Object.assign(P, { leave: 7.5 + r() * 0.5, back: 15 + r() * 1.5, days: [0, 1, 2, 3, 4] });
    if (T.kind === 'retired') P.errands = [[Math.floor(r() * 6), 10, 12], [6, 9, 12]];   // one weekday morning, church on Sunday
    if (T.kind === 'jobless') P.errands = [0, 1, 2].map(() => [Math.floor(r() * 7), 12 + r() * 2, 15 + r() * 2]);
    const paint = new THREE.Color().setHSL(r(), 0.25 + r() * 0.2, 0.55 + r() * 0.15).getHex();
    flats.push({ D, P, paint, flat: D.who.replace(/ \(.*\)/, ''), found: -1, target: 0 });
  });

  // ---- where everyone is ----
  function isHome(P, h, d) {
    if (P.kind === 'night') {   // out from evening till morning, starting on their work days
      const startedYesterday = P.days.includes((d + 6) % 7) && h < P.back, startedToday = P.days.includes(d) && h >= P.leave;
      return !(startedYesterday || startedToday);
    }
    if (P.days.includes(d) && h >= P.leave && h < P.back) return false;
    for (const [day, a, b] of P.errands) if (day === d && h >= a && h < b) return false;
    return true;
  }
  const asleep = (P, h) => P.kind === 'night' ? h >= 9 && h < 15 : h >= 23 || h < 6;
  function locked(f, h, d) { if (f.unlocked === d) return false; const home = isHome(f.P, h, d); return !home || h >= 22 || h < 7 || !f.P.careless; }
  const hhmm = t => `${String(Math.floor(t) % 24).padStart(2, '0')}:${String(Math.floor(t % 1 * 60)).padStart(2, '0')}`;

  // ---- the doors ----
  function swing(f, open, hold = 0) { f.target = -Math.abs(open); f.close = hold ? performance.now() + hold * 1000 : 0; }
  function reactInside(f, how) {
    const { P } = f;
    if (P.temper === 'friendly') { swing(f, 1.2, 3); return toast(`😮 ${P.first} jumps up. "Oh! You gave me a fright. You could knock, you know." They steer you back out.`); }
    if (P.temper === 'calm') { swing(f, 0); return toast(`😠 ${P.first} stands in the doorway. "Excuse me?! This is my home." The door shuts in your face.`); }
    if (P.temper === 'scared') { swing(f, 0); ctx.raiseWanted(60); ctx.news?.(`${P.name} called the police: someone ${how} at their flat in Cinder Row`); return toast(`😱 ${P.first} screams and grabs the phone: "POLICE! Someone's breaking in!"`); }
    swing(f, 0); ctx.hurt?.(8); ctx.raiseWanted(25); return toast(`🤬 ${P.first} shoves you hard back out of the doorway. "Try that again and you'll regret it!"`);
  }
  function actions(f) {
    const h = ctx.hours(), d = ctx.day(), home = isHome(f.P, h, d), lk = locked(f, h, d), { P } = f;
    const list = [{ label: 'Knock', run: () => {
      if (!home) { toast(`🚪 You knock. Nobody answers.` + (Math.random() < 0.4 && P.back ? ` A neighbour leans over the rail: "${P.first}? Out at work. Back about ${hhmm(P.back)}."` : '')); return; }
      if (asleep(P, h)) { toast(`🚪 You knock. Silence... then a thick, sleepy voice: "Who is it? Do you know what time it is?" Nobody comes.`); return; }
      swing(f, 0.35, 4); const L = LINES[P.temper]; toast(`🚪 ${P.first} opens the door a crack. ${L[Math.floor(Math.random() * L.length)]}`);
    } }];
    list.push({ label: 'Try the handle', note: lk ? null : home ? 'Someone is home' : null, run: () => {
      if (locked(f, ctx.hours(), ctx.day())) return toast('🔒 Locked.');
      if (home) return reactInside(f, 'walked in');
      enter(f);
    } });
    if (lk) {
      const tool = ctx.hasTool('Door Master');
      list.push({ label: 'Pick the lock with the Door Master', disabled: !tool, note: tool ? 'Tap the number fast to work the lock' : 'You need a Door Master (Ink, in the Narrows)',
        gauge: tool ? { title: 'Picking the lock', fill: 0.07, drain: 0.28, onStart: () => ctx.lockTool?.(true),
          onDone: () => { ctx.lockTool?.(false); f.unlocked = ctx.day(); toast('🔓 The lock clicks open.');
            const night = h >= 22 || h < 7; if (Math.random() < (night ? 0.1 : 0.3)) { ctx.raiseWanted(50); ctx.news?.(`A neighbour saw someone picking the lock of ${f.flat} in Cinder Row`); toast('👁️ A neighbour across the way saw you at that lock.'); }
            if (isHome(P, ctx.hours(), ctx.day())) reactInside(f, 'picked the lock'); else enter(f); },
          onCancel: () => { ctx.lockTool?.(false); toast('You stop working the lock.'); } } : null, run: () => {} });
    }
    return list;
  }
  for (const f of flats) {
    const { D } = f;
    ctx.interactables.push({ pos: new THREE.Vector3(D.x + D.nx * 0.75, D.y, D.z + D.nz * 0.75), r: 1.3, get title() { return `${f.flat}'s door`; }, get label() { return `${f.flat}'s door`; }, actions: () => actions(f) });
  }

  // ---- inside a neighbour's flat: one small furnished room, far from the world, repainted for each flat ----
  const O = { x: -5600, z: -400 }, W = 6, Dp = 5, H = 2.7;
  const room = new THREE.Group(); room.position.set(O.x, 0, O.z); room.visible = false; ctx.scene.add(room);
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  const wallM = M(0xcccccc), floorM = M(0x6b5b4a);
  const B = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; room.add(b); return b; };
  B(W, 0.1, Dp, 0, -0.05, 0, floorM); B(W, 0.1, Dp, 0, H + 0.05, 0, M(0xe8e4dc));
  B(W, H, 0.1, 0, H / 2, -Dp / 2, wallM); B(0.1, H, Dp, -W / 2, H / 2, 0, wallM); B(0.1, H, Dp, W / 2, H / 2, 0, wallM);
  B(W / 2 - 0.5, H, 0.1, -W / 4 - 0.25, H / 2, Dp / 2, wallM); B(W / 2 - 0.5, H, 0.1, W / 4 + 0.25, H / 2, Dp / 2, wallM); B(1, 0.6, 0.1, 0, H - 0.3, Dp / 2, wallM);
  B(0.96, 2.05, 0.06, 0, 1.03, Dp / 2 - 0.02, M(0x5a3d26));   // the door, shut behind you
  B(1.9, 0.45, 1.0, -W / 2 + 1.05, 0.22, -Dp / 2 + 0.6, M(0x8a7f70)); B(1.9, 0.12, 1.0, -W / 2 + 1.05, 0.5, -Dp / 2 + 0.6, M(0xe8e0d0));   // bed
  B(1.0, 0.75, 0.6, 1.2, 0.37, -0.2, M(0x7a5a3a)); B(0.45, 0.45, 0.45, 1.2, 0.22, 0.45, M(0x4a4a4a));   // table and stool
  B(0.9, 1.9, 0.5, W / 2 - 0.5, 0.95, -Dp / 2 + 0.3, M(0x6b4a2f));   // wardrobe
  B(0.8, 0.55, 0.4, W / 2 - 0.5, 0.27, 1.2, M(0x3a3a3a)); B(0.75, 0.45, 0.06, W / 2 - 0.5, 0.8, 1.2, M(0x111111));   // a cabinet with an old TV
  B(2.2, 0.01, 1.6, -0.6, 0.005, 0.6, M(0x8a3a3a));   // rug
  const lamp = new THREE.PointLight(0xffd9a0, 6, 9, 1.6); lamp.position.set(0, H - 0.3, 0); room.add(lamp);
  const walls = [[-W / 2, W / 2, -Dp / 2 - 0.05, -Dp / 2 + 0.05], [-W / 2 - 0.05, -W / 2 + 0.05, -Dp / 2, Dp / 2], [W / 2 - 0.05, W / 2 + 0.05, -Dp / 2, Dp / 2], [-W / 2, W / 2, Dp / 2 - 0.05, Dp / 2 + 0.05],
    [-W / 2, -W / 2 + 2.0, -Dp / 2, -Dp / 2 + 1.1], [0.7, 1.7, -0.5, 0.1], [W / 2 - 0.95, W / 2, -Dp / 2, -Dp / 2 + 0.55], [W / 2 - 0.9, W / 2, 1.0, 1.4]];
  for (const [a, b, c, e] of walls) ctx.colliders.push({ minX: O.x + a, maxX: O.x + b, minZ: O.z + c, maxZ: O.z + e });
  let inside = null;
  function enter(f) {
    inside = f; wallM.color.setHex(f.paint); room.visible = true; f.wasHome = false;
    ctx.teleport(new THREE.Vector3(O.x, 0, O.z + Dp / 2 - 0.8), Math.PI);
    toast(`🚪 You step into ${f.P.first}'s flat. Quiet. A bed, a table, a wardrobe, an old TV. (${f.P.name}, ${f.P.job})`);
  }
  function leave() {
    const f = inside; if (!f) return; inside = null; room.visible = false;
    const D = f.D; ctx.teleport(new THREE.Vector3(D.x + D.nx * 1.1, D.y + 0.05, D.z + D.nz * 1.1), Math.atan2(D.nx, D.nz));
  }
  ctx.interactables.push({ pos: new THREE.Vector3(O.x, 0, O.z + Dp / 2 - 0.5), r: 1.2, label: 'Leave the flat', action: leave });
  ctx.interactables.push({ pos: new THREE.Vector3(O.x + W / 2 - 0.5, 0, O.z - Dp / 2 + 0.9), r: 1.3, title: 'The wardrobe and drawers', label: 'The wardrobe and drawers', actions: () => [
    { label: 'Search for money (steal)', run: () => {
      const f = inside; if (!f) return; const d = ctx.day();
      if (f.found === d) return toast('🗄️ You\'ve already been through everything. Nothing left.');
      f.found = d; const g = 3 + Math.floor(Math.random() * 25); ctx.gold(g); f.robbed = true;
      toast(`🗄️ Under some folded shirts: ${g} gold. You pocket it.`); ctx.news?.(`${f.P.name} of Cinder Row came home to find money missing from the flat`);
    } },
    { label: 'Look around', run: () => toast(`👀 Photos of family on the wall. Work clothes for ${inside?.P.job || 'a job'}. Bills on the table, most of them red.`) },
  ] });

  let acc = 0;
  function update(dt) {
    // doors swing to where they should be (and close again after a knock)
    const now = performance.now();
    for (const f of flats) { if (f.close && now > f.close) { f.target = 0; f.close = 0; } const hg = f.D.hinge; const want = f.target; if (Math.abs(hg.rotation.y - want) > 0.002) hg.rotation.y += (want - hg.rotation.y) * Math.min(1, dt * 5); }
    acc += dt; if (acc < 1) return; acc = 0;
    // the owner comes home while you're in their flat
    if (inside) {
      const f = inside, h = ctx.hours(), d = ctx.day();
      if (isHome(f.P, h, d)) { inside = null; room.visible = false; const D = f.D; ctx.teleport(new THREE.Vector3(D.x + D.nx * 1.1, D.y + 0.05, D.z + D.nz * 1.1), Math.atan2(D.nx, D.nz)); toast(`🔑 A key in the lock: ${f.P.first} is home!`); reactInside(f, 'was found inside'); }
    }
  }
  return { flats, update, isHome, locked: f => locked(f, ctx.hours(), ctx.day()), get inside() { return !!inside; }, leave };
}
