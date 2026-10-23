// Checks power tiers, UK-style road law and hunter ranking rules.
import assert from 'node:assert/strict';
import { powerTier, objectPowerScale, hunterRankForLevel } from './power-tiers.js';
import { signalState, signalStopPoint, createRoadLaw, SIGNAL_CYCLE } from './road-law.js';
import { earnedRank, makeContract, guildTitle } from './hunter-guilds.js';

// Power tiers: level 20 wrecks cars, level 50 is still low tier.
assert.equal(objectPowerScale(20), 1);
assert(objectPowerScale(1) < 0.2, 'level 1 barely dents a car');
assert(objectPowerScale(50) > 3);
assert.equal(powerTier(50).band, 'Low tier');
assert.equal(powerTier(60).band, 'Mid tier');
assert.equal(powerTier(1200).rank, 'SS');
assert.equal(hunterRankForLevel(25), 2);           // D

// Signals: crossing roads never both green; sequence includes red+amber before green.
const seen = new Set();
for (let t = 0; t < SIGNAL_CYCLE; t += 0.25) {
  const x = signalState(1, 2, 'x', t), z = signalState(1, 2, 'z', t);
  assert(!(x === 'green' && z === 'green') && !(x !== 'red' && z !== 'red' && x !== 'redamber' && z !== 'redamber'), `conflict at ${t}: ${x}/${z}`);
  seen.add(x);
}
assert.deepEqual([...seen].sort(), ['amber', 'green', 'red', 'redamber']);
assert.equal(signalStopPoint('red', 26, 10), 31);
assert.equal(signalStopPoint('red', 33, 10), null, 'already in the junction: clear it');
assert.equal(signalStopPoint('amber', 30.5, 13), null, 'too close to stop on amber: proceed');
assert.equal(signalStopPoint('green', 26, 10), null);

// Road law: fines, points, unlicensed add-on, disqualification at 12 points.
let money = 1000, now = 0, wanted = 0; const msgs = [];
const law = createRoadLaw({ roundaboutCells: new Set(), money: () => money, spend: n => { money -= n; }, toast: m => msgs.push(m), raiseWanted: t => { wanted = t; }, time: () => now, signalTime: () => 0 });
const car = { speed: 0, group: { position: { x: 20, z: 3 } } };
car.speed = 20;                          // ~45 mph in a 30 zone
law.monitorDriving(car, 1); law.monitorDriving(car, 1);
assert.equal(money, 600, 'speeding unlicensed: 100 + 300');
law.takeTheory(); law.takePractical();
assert(law.licence.held);
for (let i = 0; i < 4; i++) { now += 30; law.charge('redLight'); }
assert.equal(law.licence.points, 12); assert(law.licence.banned);
car.speed = 5; now += 30; law.monitorDriving(car, 0.1);
assert.equal(wanted, 90, 'driving while disqualified is arrestable');
money = 0; now += 30; law.charge('pavement'); assert(law.debt >= 100);

// Hunter ranks need power AND record.
assert.equal(earnedRank(200, 0), 0, 'no record, no rank');
assert.equal(earnedRank(5, 80), 0, 'record without power stays F');
assert.equal(earnedRank(130, 10), 3);
assert.equal(makeContract('cull', 2).goal, 11);
assert.equal(guildTitle(350), 'Veteran');
console.log('PASS: power tiers (lv20 car-wrecker, lv50 low tier), conflict-free UK signal cycle, AI stop lines, fines/points/ban, hunter rank rules');
