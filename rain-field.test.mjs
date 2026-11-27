import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRainField } from './rain-field.js';
test('rain uses a fixed buffer, follows travel and hides under shelter', () => {
  const scene = new THREE.Scene(), rain = createRainField({ scene, count: 100, random: () => .5 });
  const buffer = rain.mesh.geometry.attributes.position.array;
  for (let i = 0; i < 240; i++) rain.update(1 / 60, { x: i * 2, y: 0, z: 0 }, true);
  assert.equal(scene.children.length, 1);
  assert.equal(rain.mesh.geometry.attributes.position.array, buffer);
  assert.equal(buffer.length, 600);
  assert.ok(buffer.every(Number.isFinite));
  assert.ok(Math.abs(buffer[0] - 478) < 25);
  assert.ok(buffer[4] > buffer[1], 'streak trails above its falling tip');
  rain.update(.016, { x: 0, y: 0, z: 0 }, true, true);assert.equal(rain.mesh.visible, false);
  rain.update(.016, { x: 0, y: 0, z: 0 }, false);assert.equal(rain.mesh.visible, false);
  rain.dispose();assert.equal(scene.children.length, 0);
});
