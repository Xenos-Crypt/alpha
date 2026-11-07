import assert from 'node:assert/strict';
import { TRACKS, CARS, CAREER, CUPS, SPRINTS, buildPath, checkPath } from './race-tracks.js';

const ids = new Set(TRACKS.map(t => t.id));
for (const t of TRACKS) {
  const p = buildPath(t), c = checkPath(p, t.hw);
  assert(p.L > 1200 && p.L < 4000, `${t.id} length ${p.L}`);
  assert(c.gap > c.needGap, `${t.id}: two parts of the track are too close (${c.gap.toFixed(1)} m)`);
  assert(c.steep < 0.14, `${t.id}: too steep (${(c.steep * 100).toFixed(1)}%)`);
  assert(c.minR > 14, `${t.id}: a bend is too tight (${c.minR.toFixed(1)} m)`);
  // the start line sits on a straight
  for (let j = -20; j <= 10; j++) assert(Math.abs(p.k[(j + p.n) % p.n]) < 1 / 120, `${t.id}: start line is on a bend`);
  // nearest-point lookup finds the right place and side
  const a = p.at(p.L * 0.37, 3), q = p.nearest(a.x, a.z);
  assert(Math.abs(q.off - 3) < 0.3 && Math.abs(q.s - p.L * 0.37) < 3, `${t.id}: nearest() is off`);
  const prof = p.profile({ top: 54, grip: 1e9, yawRate: 1.8, accel: v => 18 - 0.3 * v, decel: 30 });
  assert(prof.lapTime > 25 && prof.lapTime < 120, `${t.id}: reference lap ${prof.lapTime}`);
}
for (const lv of CAREER) { assert(ids.has(lv.track)); assert(lv.goal && lv.reward > 0); if (lv.route) assert(SPRINTS.some(s => s.id === lv.route)); }
for (const c of CUPS) assert(c.tracks.every(id => ids.has(id)));
assert(CARS.filter(c => c.price === 0).length >= 2);
