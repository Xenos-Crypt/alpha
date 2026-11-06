// Football at Ashford Stadium: two NPC teams (Ashford FC in red attacking east, Riverside
// United in white attacking west) play real matches with the stadium ball: a keeper each,
// a player who chases the ball, the rest holding shape. They pass, shoot and save.
// Pay to join a side and you take one player's place (walk into the ball to dribble and
// shoot). Matches last 3 minutes; your team winning pays out.
import * as THREE from 'three';

export const TEAMS = [
  { name: 'Ashford FC', short: 'Ashford', kit: 0xc0392b, shorts: 0xffffff, dir: 1 },
  { name: 'Riverside United', short: 'Riverside', kit: 0xf2f2f2, shorts: 0x1d2a4a, dir: -1 },
];
export const MATCH_LEN = 180, JOIN_FEE = 25, WIN_PRIZE = 120, DRAW_PRIZE = 40;
const FORMATION = [[-0.32, -0.25], [-0.32, 0.25], [0.05, 0], [0.3, -0.2], [0.3, 0.2]];   // (along attack, across) as fractions of the pitch

export function createFootball({ scene, venues, makePerson, animatePerson, interactables, toast, money, spend, earn, playerPos }) {
  const ST = venues.stadium, ball = venues.ball, ballV = venues.ballV, score = venues.score;
  const halfL = ST.L / 2, halfW = ST.W / 2;
  const players = [];
  TEAMS.forEach((t, ti) => {
    const keeper = makePerson({ outfit: ti ? 0x22cc66 : 0xffd23f, pants: 0x111111, hair: 0x2b1d14 });
    keeper.root.position.set(ST.x - t.dir * (halfL - 1.5), 0, ST.z); scene.add(keeper.root);
    players.push({ h: keeper, team: ti, keeper: true, cd: 0 });
    FORMATION.forEach((f, k) => {
      const h = makePerson({ outfit: t.kit, pants: t.shorts, hair: [0x2b1d14, 0x111111, 0x8a5a2a, 0xd9b26a][k % 4], skin: [0xffdcc0, 0xd9a07a, 0x8d5a3b, 0xf0c8a0, 0x6b4430][(k + ti) % 5] });
      h.root.position.set(ST.x + t.dir * f[0] * ST.L * 0.5, 0, ST.z + f[1] * ST.W); scene.add(h.root);
      players.push({ h, team: ti, slot: f, cd: 0 });
    });
  });

  let clock = MATCH_LEN, phase = 'play', breakT = 0, joined = -1, replaced = null, hud = null;
  if (typeof document !== 'undefined') {
    hud = document.createElement('div'); hud.id = 'matchHud';
    hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:26;background:rgba(10,14,24,.8);color:#fff;font:700 clamp(11px,1.8vw,15px) system-ui,sans-serif;padding:6px 14px;border-radius:12px;pointer-events:none;display:none;white-space:nowrap';
    document.body.append(hud);
  }
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  venues.onGoal = (team, sc) => {
    if (phase !== 'play') return;
    const p = playerPos(), near = Math.hypot(p.x - ST.x, p.z - ST.z) < 160;
    if (near || joined >= 0) toast(`⚽ GOAL for ${TEAMS[team].short}! Ashford ${sc[0]} - ${sc[1]} Riverside${joined === team ? ' — get in!' : ''}`);
    kickoff(team === 0 ? 1 : 0);
  };
  function kickoff() {
    ball.position.set(ST.x, 0.4, ST.z); ballV.set(0, 0, 0);
    for (const pl of players) pl.h.root.position.copy(home(pl, true));
  }
  function home(pl, kick = false) {
    const t = TEAMS[pl.team];
    if (pl.keeper) return new THREE.Vector3(ST.x - t.dir * (halfL - 1.5), 0, ST.z + THREE.MathUtils.clamp(ball.position.z - ST.z, -3.2, 3.2));
    // shape shifts with the ball: push up when attacking, drop back when defending
    const shift = kick ? 0 : THREE.MathUtils.clamp((ball.position.x - ST.x) * 0.55, -halfL * 0.45, halfL * 0.45);
    const along = Math.min(kick ? -0.04 : 1, pl.slot[0]) * halfL;
    return new THREE.Vector3(THREE.MathUtils.clamp(ST.x + t.dir * along + shift, ST.x - halfL + 3, ST.x + halfL - 3), 0, ST.z + pl.slot[1] * ST.W + (ball.position.z - ST.z) * 0.25);
  }
  function kick(pl, toward, power) {
    const d = new THREE.Vector3(toward.x - ball.position.x, 0, toward.z - ball.position.z).normalize();
    ballV.set(d.x * power, 0, d.z * power); pl.cd = 0.7;
  }

  function join(team) {
    if (joined === team) { toast(`You're already playing for ${TEAMS[team].name}.`); return; }
    if (joined >= 0) { toast('Finish this match first (or leave the pitch).'); return; }
    if (money() < JOIN_FEE) { toast(`It costs ${JOIN_FEE} gold to play.`); return; }
    spend(JOIN_FEE); joined = team;
    replaced = players.find(p => p.team === team && !p.keeper && p.slot[0] > 0.2) || players.find(p => p.team === team && !p.keeper);
    replaced.h.root.visible = false; replaced.benched = true;
    if (phase !== 'play') { phase = 'play'; clock = MATCH_LEN; score[0] = score[1] = 0; kickoff(); }
    toast(`You join ${TEAMS[team].name} (attacking ${TEAMS[team].dir > 0 ? 'east' : 'west'}). Walk into the ball to dribble and shoot! Win: +${WIN_PRIZE} gold.`);
  }
  const desk = (x, z, team) => interactables.push({ pos: new THREE.Vector3(x, 0.3, z), r: 3.5, get label() { return joined === team ? `Playing for ${TEAMS[team].name}` : `Join ${TEAMS[team].name} for a match (${JOIN_FEE} gold)`; }, action: () => join(team) });
  desk(ST.x - 12, ST.z + halfW + 4.5, 0); desk(ST.x + 12, ST.z + halfW + 4.5, 1);

  function endMatch() {
    phase = 'break'; breakT = 20;
    const [a, b] = score, winner = a > b ? 0 : b > a ? 1 : -1;
    const p = playerPos(), near = Math.hypot(p.x - ST.x, p.z - ST.z) < 160;
    if (joined >= 0) {
      const prize = winner === joined ? WIN_PRIZE : winner === -1 ? DRAW_PRIZE : 0;
      if (prize) earn(prize);
      toast(`Full time: Ashford ${a} - ${b} Riverside. ${winner === joined ? `You won! +${prize} gold.` : winner === -1 ? `A draw. +${prize} gold.` : 'You lost this one.'}`);
      if (replaced) { replaced.h.root.visible = true; replaced.benched = false; replaced = null; }
      joined = -1;
    } else if (near) toast(`Full time: Ashford ${a} - ${b} Riverside.`);
  }

  const tmp = new THREE.Vector3();
  function update(dt) {
    const p = playerPos(), dist = Math.hypot(p.x - ST.x, p.z - ST.z);
    if (joined >= 0 && dist > halfL + 40) { toast('You walked off the pitch. You leave the match.'); if (replaced) { replaced.h.root.visible = true; replaced.benched = false; replaced = null; } joined = -1; }
    if (hud) { hud.style.display = dist < halfL + 30 ? 'block' : 'none'; hud.textContent = phase === 'play' ? `⚽ Ashford ${score[0]} - ${score[1]} Riverside · ${fmt(clock)}${joined >= 0 ? ' · you: ' + TEAMS[joined].short : ''}` : `⚽ Full time ${score[0]} - ${score[1]} · next match in ${Math.ceil(breakT)}s`; }
    if (dist > 400) return;   // nobody's watching: save the work
    if (phase === 'break') {
      breakT -= dt;
      for (const pl of players) animatePerson(pl.h, false, dt);
      if (breakT <= 0) { phase = 'play'; clock = MATCH_LEN; score[0] = score[1] = 0; kickoff(); }
      return;
    }
    clock -= dt; if (clock <= 0) { endMatch(); return; }
    const bp = ball.position;
    // who chases the ball: the closest outfield player of each team
    const chaser = [null, null], cd = [1e9, 1e9];
    for (const pl of players) { if (pl.keeper || pl.benched) continue; const d = Math.hypot(pl.h.root.position.x - bp.x, pl.h.root.position.z - bp.z); if (d < cd[pl.team]) { cd[pl.team] = d; chaser[pl.team] = pl; } }
    for (const pl of players) {
      if (pl.benched) continue;
      pl.cd -= dt;
      const r = pl.h.root.position, t = TEAMS[pl.team];
      let target, speed;
      if (pl.keeper) { target = home(pl); speed = 5; if (Math.hypot(bp.x - r.x, bp.z - r.z) < 6 && (bp.x - ST.x) * -t.dir > halfL - 14) { target = bp; speed = 7; } }
      else if (pl === chaser[pl.team]) { target = tmp.set(bp.x - t.dir * 0.5, 0, bp.z).clone(); speed = 6.8; }
      else { target = home(pl); speed = 5.2; }
      const dx = target.x - r.x, dz = target.z - r.z, d = Math.hypot(dx, dz);
      const moving = d > 0.4;
      if (moving) { const step = Math.min(d, speed * dt); r.x += dx / d * step; r.z += dz / d * step; pl.h.root.rotation.y = Math.atan2(dx, dz); }
      else pl.h.root.rotation.y = Math.atan2(bp.x - r.x, bp.z - r.z);
      animatePerson(pl.h, moving, dt);
      // on the ball: shoot if in range, otherwise pass forward / dribble on
      if (pl.cd <= 0 && Math.hypot(bp.x - r.x, bp.z - r.z) < 0.95) {
        const goal = new THREE.Vector3(ST.x + t.dir * (halfL + 1), 0, ST.z + (Math.random() - 0.5) * 6);
        const toGoal = Math.abs(goal.x - bp.x);
        if (pl.keeper) kick(pl, new THREE.Vector3(ST.x, 0, ST.z + (Math.random() - 0.5) * ST.W * 0.6), 17);
        else if (toGoal < 26) kick(pl, goal, 15 + Math.random() * 4);
        else {
          const mates = players.filter(m => m.team === pl.team && m !== pl && !m.keeper && !m.benched && (m.h.root.position.x - r.x) * t.dir > 2);
          const mate = mates.length && Math.random() < 0.65 ? mates[Math.floor(Math.random() * mates.length)] : null;
          if (mate) kick(pl, mate.h.root.position.clone().add(new THREE.Vector3(t.dir * 2, 0, 0)), 11);
          else kick(pl, new THREE.Vector3(bp.x + t.dir * 8, 0, bp.z + (Math.random() - 0.5) * 6), 7);
        }
      }
    }
  }
  return { update, players, get joined() { return joined; }, join, get clock() { return clock; } };
}
