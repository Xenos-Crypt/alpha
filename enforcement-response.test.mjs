import test from 'node:test';
import assert from 'node:assert/strict';
import { enforcementResponse } from './enforcement-response.js';
test('unarmed suspects are arrested regardless of wanted level', () => {
  for (const wanted of [30, 100, 999]) assert.equal(enforcementResponse({ wanted, warnedFor: 30 }), 'arrest');
});
test('resistance gets a warning period before nonlethal lasers', () => {
  assert.equal(enforcementResponse({ resisting: true, warnedFor: 4.9 }), 'arrest');
  assert.equal(enforcementResponse({ resisting: true, warnedFor: 5 }), 'laser');
  assert.equal(enforcementResponse({ resisting: false, warnedFor: 20 }), 'arrest');
});
test('drawing or firing a gun escalates, holstering without recent gunfire de-escalates', () => {
  assert.equal(enforcementResponse({ armed: true }), 'firearm');
  assert.equal(enforcementResponse({ fired: true }), 'firearm');
  assert.equal(enforcementResponse({ armed: false, fired: false }), 'arrest');
});
