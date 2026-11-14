import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirms } from './firms.js';
import { createMoney } from './money.js';
import { sectorOfJob } from './nation.js';

const rng = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const JOB = { Banker: { wage: 20 }, 'Factory worker': { wage: 9 }, Unemployed: { wage: 0 } };
function world() {
  const S = { tick: 0, treasury: 1e5, econ2: { rate: 3 } };
  const citizens = Array.from({ length: 40 }, (_, i) => ({ id: i, name: `P${i} Q${i}`, city: 'Ashford', age: 35, job: i % 2 ? 'Banker' : 'Factory worker', wealth: 300, traits: { diligence: .5 }, econ: -.5 }));
  const firms = createFirms({ S, citizens, jobInfo: j => JOB[j], sectorOfJob, rand: rng(5) }); firms.seed(); firms.assign();
  const money = createMoney({ S, citizens, firms, jobInfo: j => JOB[j], rand: rng(7) });
  return { S, citizens, firms, money };
}

test('a loan comes from a real bank, with interest, and is paid back', () => {
  const { citizens, firms, money } = world(), c = citizens[1];
  const loan = money.lend(c, 'personal', 500);
  assert.ok(loan && loan.rate > 3, 'interest above the central rate');
  assert.equal(firms.firm(loan.bank).sector, 'finance');
  c.wealth = 1e5;
  for (let d = 0; d < 40 && c.loans?.length; d++) money.daily();
  assert.ok(!c.loans?.length, 'repaid in full');
});

test('an unpaid loan goes to court, and ends in bankruptcy when there is nothing to take', () => {
  const { S, citizens, money } = world(), c = citizens[1];
  money.lend(c, 'personal', 800);
  c.savings = 0; c.job = 'Unemployed';
  for (let d = 0; d < 12; d++) { c.wealth = 0; money.daily(); }
  assert.ok(c.bankrupt > 0);
  assert.ok(S.justice.cases.some(k => k.civil === 'debt recovery'));
  assert.equal(money.lend(c, 'personal', 100), null, 'no bank lends to a bankrupt');
});

test('shares pay dividends from real profits', () => {
  const { citizens, money, firms } = world(), P = money.player, gold = { v: 1e5, get() { return this.v; }, add(n) { this.v += n; } };
  const f = money.listed()[0];
  assert.match(P.buy(f, 10000, gold), /Bought/);
  f.lastProfit = 5e4; f.cash = 1e6;
  money.daily(); P.collect(gold);
  assert.ok(P.P.savings > 0, 'dividends paid into savings');
  assert.match(P.sell(f, 10000, gold), /Sold/);
});
