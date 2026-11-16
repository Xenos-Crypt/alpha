// The story (chronicle-data.js) holds together: every choice and variant leads somewhere real, every node can be
// reached from the start, every branch ends in a chapter ending, and everyone who speaks exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NODES, VARIANTS, PLACES, PEOPLE, START } from './chronicle-data.js';

const links = n => [n.next, ...(n.talk?.choices || []).map(c => c.to)].filter(Boolean);

test('every link points at a real node', () => {
  for (const [id, n] of Object.entries(NODES)) for (const to of links(n)) assert.ok(to === 'resume' || NODES[to], `${id} → ${to}`);
  for (const v of VARIANTS) if (v.to) assert.ok(NODES[v.to], `variant ${v.id} → ${v.to}`);
});

test('every node can be reached, and every path ends', () => {
  const seen = new Set(), q = [START, ...VARIANTS.filter(v => v.to).map(v => v.to)];
  while (q.length) { const id = q.shift(); if (seen.has(id) || id === 'resume') continue; seen.add(id); q.push(...links(NODES[id])); }
  for (const id of Object.keys(NODES)) assert.ok(seen.has(id), `${id} can't be reached`);
  for (const [id, n] of Object.entries(NODES)) assert.ok(n.end || links(n).length, `${id} is a dead end`);
  assert.ok(Object.values(NODES).filter(n => n.end).length >= 6, 'several different endings');
});

test('people and places exist, and every node says what the Chronicle predicts', () => {
  for (const [id, n] of Object.entries(NODES)) {
    if (n.talk) { assert.ok(PEOPLE[n.talk.npc], `${id}: who is ${n.talk.npc}?`); assert.ok(n.talk.at === 'here' || PLACES[n.talk.at], `${id}: where is ${n.talk.at}?`); assert.ok(n.talk.choices.length >= 2, `${id}: a conversation needs a choice`); }
    if (n.objective?.at) assert.ok(PLACES[n.objective.at], `${id}: where is ${n.objective.at}?`);
    if (!n.end) assert.ok(n.chronicle && n.title && n.chapter, `${id} needs a title, chapter and Chronicle line`);
  }
});

test('variants: each one is something you can do off the page, with a test and a note', () => {
  const ids = new Set();
  for (const v of VARIANTS) { assert.ok(!ids.has(v.id), 'unique ' + v.id); ids.add(v.id); assert.equal(typeof v.when, 'function'); assert.ok(v.note && v.title && v.during.length); }
  const w = { x: 0, y: 0, z: 0, gold: 0, wanted: 0, dungeons: 0, licensed: false, knowsTruth: false, clearedStoryGate: false };
  assert.ok(VARIANTS.every(v => !v.when(w, { flags: {} })), 'an ordinary start triggers no variant');
  assert.ok(VARIANTS.find(v => v.id === 'outlaw').when({ ...w, wanted: 2 }));
  assert.ok(VARIANTS.find(v => v.id === 'tornPage').when({ ...w, x: -80, z: 480 }));
});
