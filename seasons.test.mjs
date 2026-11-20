import test from 'node:test';
import assert from 'node:assert/strict';
import { calendar, easter, SEASON_WEATHER } from './seasons.js';

const on = s => calendar(new Date(s + 'T12:00:00'));

test('Easter Sunday is right for known years', () => {
  assert.deepEqual(easter(2025), [4, 20]);
  assert.deepEqual(easter(2026), [4, 5]);
  assert.deepEqual(easter(2027), [3, 28]);
});

test('seasons follow the months', () => {
  assert.equal(on('2026-01-10').season, 'winter');
  assert.equal(on('2026-04-10').season, 'spring');
  assert.equal(on('2026-07-10').season, 'summer');
  assert.equal(on('2026-10-10').season, 'autumn');
  assert.equal(on('2026-12-01').season, 'winter');
});

test('holidays turn on in their windows only', () => {
  assert.ok(on('2026-12-25').holidays.includes('christmas'));
  assert.ok(on('2027-01-03').holidays.includes('christmas'));
  assert.ok(!on('2027-01-10').holidays.includes('christmas'));
  assert.ok(on('2026-12-31').holidays.includes('newyear'));
  assert.ok(on('2026-02-14').holidays.includes('valentine'));
  assert.ok(!on('2026-02-15').holidays.includes('valentine'));
  assert.ok(on('2026-04-03').holidays.includes('easter'));
  assert.ok(on('2026-10-31').holidays.includes('halloween'));
  assert.ok(on('2026-11-05').holidays.includes('bonfire'));
  assert.deepEqual(on('2026-06-15').holidays, []);
});

test('no snow in summer, snow in winter', () => {
  assert.ok(!SEASON_WEATHER.summer.includes('snow'));
  assert.ok(SEASON_WEATHER.winter.includes('snow'));
});
