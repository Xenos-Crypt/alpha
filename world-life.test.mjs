import assert from 'node:assert/strict';
import { INGREDIENTS, RECIPES, AISLES, canCook, cookingLevel } from './kitchen.js';
import { CREWS, crewState, variant, plotRect, stageOf } from './building-sites.js';
import { actAt, SHOW_LENGTH } from './circus.js';
import { stageFor } from './road-wear.js';

// every recipe uses real ingredients, every ingredient is sold in some aisle
const ids = new Set(INGREDIENTS.map(i => i.id));
for (const r of RECIPES) { for (const k of Object.keys(r.need)) assert(ids.has(k), `${r.name} needs unknown ${k}`); assert(r.steps.length >= 2 && r.time > 0 && r.hunger > 0); }
for (const i of INGREDIENTS) assert(AISLES.some(a => a.items.includes(i.id)), `${i.id} isn't in any aisle`);
assert(canCook({ bread: 1, butter: 1 }, RECIPES[0]) && !canCook({ bread: 1 }, RECIPES[0]));
assert(cookingLevel(0) === 1 && cookingLevel(1000) === 10);

// building crews: plots never overlap each other, and the crews never run out of work
const rects = CREWS.flatMap(c => c.plots.map(p => ({ p, r: plotRect(p, 1) })));
for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
  const a = rects[i].r, b = rects[j].r;
  assert(!(a.maxX > b.minX && a.minX < b.maxX && a.maxZ > b.minZ && a.minZ < b.maxZ), `${rects[i].p.name} overlaps ${rects[j].p.name}`);
}
for (const c of CREWS) for (const day of [0, 1.3, 7.9, 55, 400]) { const s = crewState(c, day, 0.2); assert(s.index >= 0 && s.index < c.plots.length && s.t >= 0 && s.t < 1); }
assert.equal(crewState(CREWS[0], NaN, 0).index, 0);
assert(variant(CREWS[0].plots[0], 1).name !== CREWS[0].plots[0].name);
assert.deepEqual(['groundworks', 'foundations', 'frame', 'cladding', 'handover'], [0.05, 0.15, 0.5, 0.9, 0.98].map(stageOf));

// the circus show loops through every act
const seen = new Set(); for (let t = 0; t < SHOW_LENGTH; t += 1) seen.add(actAt(t).act.id);
assert(seen.has('trapeze') && seen.has('clown') && seen.has('finale'));
assert.equal(actAt(SHOW_LENGTH + 0.5).act.id, actAt(0.5).act.id);

// road condition stages
assert.deepEqual([100, 60, 30, 5].map(stageFor), ['ok', 'cracked', 'pothole', 'broken']);
