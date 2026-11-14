import test from 'node:test';
import assert from 'node:assert/strict';
import { createBelongings, GOODS } from './belongings.js';
import { stepSupply } from './supply-chain.js';
import { ID_PATTERN } from './world-ids.js';

const town = () => {
  const S = { tick: 0, stock: {}, treasury: 0, companies: [{ name: 'Loomhouse Textiles', value: 0 }, { name: 'MarketWay Retail', value: 0 }, { name: 'Velo Motors', value: 0 }] };
  const citizens = [
    { id: 0, name: 'Ada Obi', age: 30, job: 'Teacher', wealth: 500, family: { partner: 1, children: [2] } },
    { id: 1, name: 'Tom Obi', age: 32, job: 'Police officer', wealth: 50, family: { partner: 0, children: [2] } },
    { id: 2, name: 'Mia Obi', age: 0, job: 'Child', wealth: 0, family: { children: [], parents: [0, 1] } },
  ];
  return { S, citizens };
};

test('everyone starts in clothes that were made, each with its own ID', () => {
  const { S, citizens } = town(), b = createBelongings({ S, citizens, rand: () => .5 });
  b.seed();
  const ids = b.items().map(([, it]) => it.id);
  assert.equal(b.items().filter(([, it]) => it.slot !== 'phone').length, 9, 'three things to wear each');
  assert.equal(new Set(ids).size, ids.length, 'every ID is unique');
  assert.ok(citizens[0].phone && /^PRD-PHN-TCH\.GLS\.PLS-RES-/.test(citizens[0].phone.id), 'an adult already had a phone');
  assert.equal(citizens[2].phone, null, 'a baby has no phone');
  for (const id of ids) assert.match(id, ID_PATTERN);
  assert.ok(citizens.every(c => WEAR(c)));
  assert.match(citizens[1].wear.top.id, /^PRD-TOP-FAB-GOV-/, 'a police officer wears an issued uniform');
});
const WEAR = c => c.wear.top && c.wear.bottom && c.wear.shoes;

test('a pram is bought from stock made of real materials, and paid for', () => {
  const { S, citizens } = town(), b = createBelongings({ S, citizens, rand: () => .5 });
  b.seed();
  for (let i = 0; i < 24; i++) b.hourly();
  assert.equal(citizens[0].pram, undefined, 'no prams in the shops yet, so no pram');
  assert.ok(S.goods.short.pram > 0);
  // the factories make one from steel, fabric, rubber and plastic
  Object.assign(S.stock, { stl: 400, fab: 400, rub: 200, pls: 200, ltx: 0, cot: 0 });
  stepSupply(S, () => 0);
  assert.ok(S.stock.prm >= 1, 'a pram was made');
  const before = citizens[0].wealth;
  for (let i = 0; i < 24; i++) b.hourly();
  const pram = citizens[0].pram;
  assert.ok(pram && /^PRD-PRM-STL\.FAB\.RUB-RES-/.test(pram.id));
  assert.equal(pram.maker, 'Velo Motors');
  assert.ok(citizens[0].wealth < before, 'the parent paid for it');
  assert.ok(S.treasury > 0, 'sales tax went to the treasury');
});

test('worn-out clothes are replaced from the shops and the old ones go in the bin', () => {
  const { S, citizens } = town(), b = createBelongings({ S, citizens, rand: () => .5 });
  b.seed(); S.waste = { backlog: 0 }; S.stock.clo = 50; S.stock.sho = 50;
  const old = citizens[0].wear.top.id;
  S.tick = 24 * 400;
  for (let i = 0; i < 24; i++) b.hourly();
  assert.notEqual(citizens[0].wear.top.id, old);
  assert.equal(citizens[0].wear.top.how, 'bought');
  assert.ok(S.waste.backlog > 0);
  assert.ok(GOODS.top.price > 0);
});
