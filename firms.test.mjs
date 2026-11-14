import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirms } from './firms.js';
import { createEducation, INSTITUTIONS } from './education.js';
import { createBusinessLaw, REGULATORS, MERGER_LIMIT } from './business-law.js';
import { sectorOfJob } from './nation.js';
import { ID_PATTERN } from './world-ids.js';

const rng = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const JOB = { Plumber: { wage: 11 }, Lawyer: { wage: 19 }, 'Factory worker': { wage: 9 }, 'Police officer': { wage: 12, pub: true }, Inspector: { wage: 12, pub: true }, Doctor: { wage: 18, pub: true }, Unemployed: { wage: 0 }, Student: { wage: 0 } };
const people = n => Array.from({ length: n }, (_, i) => ({ id: i, name: `Person${i} Surname${i}`, city: ['Ashford', 'Riverside', 'Capital', 'Poison Land'][i % 4], age: 30, job: ['Plumber', 'Lawyer', 'Factory worker', 'Police officer'][i % 4], wealth: 800, traits: { diligence: .6, kindness: .5 }, skills: {}, tenure: 3 }));

function world(n = 80) {
  const S = { tick: 0, treasury: 1e4 }, citizens = people(n), r = rng(3);
  const firms = createFirms({ S, citizens, jobInfo: j => JOB[j], sectorOfJob, rand: r, extraEmployers: REGULATORS.map(name => ({ name, type: 'public', sector: 'public', scale: 'national', home: 'Capital', branches: { Ashford: 1, Riverside: 1, Capital: 1, 'Poison Land': 1 }, regulator: true })) });
  firms.seed();
  return { S, citizens, firms, r };
}

test('national companies reach across the country; smaller ones have at most three branches', () => {
  const { firms } = world();
  const nat = firms.list().filter(f => f.scale === 'national' && f.type === 'plc');
  assert.ok(nat.length >= 30);
  for (const f of nat) { const b = firms.branchesOf(f); assert.ok(b >= 10 && b <= 20, `${f.name} has ${b}`); assert.ok(Object.values(f.branches).filter(x => x > 0).length >= 2, 'in more than one city'); }
  for (const f of firms.list().filter(f => f.scale === 'city' && f.type === 'ltd')) assert.ok(firms.branchesOf(f) <= 3);
  for (const f of firms.list()) assert.match(f.wid, ID_PATTERN);
});

test('people work for real firms: sole traders, law partnerships, the police', () => {
  const { firms, citizens } = world();
  firms.assign();
  const plumbers = citizens.filter(c => c.job === 'Plumber').map(c => firms.employerOf(c));
  assert.ok(plumbers.some(f => f.type === 'sole trader'), 'some plumbers work for themselves');
  assert.ok(citizens.filter(c => c.job === 'Lawyer').every(c => firms.employerOf(c).type === 'partnership'));
  assert.ok(citizens.filter(c => c.job === 'Police officer').every(c => firms.employerOf(c).name === 'A.T. Police Service'));
});

test('a takeover that would give one firm too much of its industry is blocked', () => {
  const { S, citizens, firms } = world();
  const law = createBusinessLaw({ S, citizens, firms });
  const [a, b] = firms.list();
  assert.equal(law.review(a, b, MERGER_LIMIT + .1), false);
  assert.equal(law.review(a, b, .2), true);
  assert.equal(S.bizlaw.blocked, 1);
});

test('inspectors find real breaches and act on them; honest firms are left alone', () => {
  const { S, citizens, firms } = world(200);
  firms.assign();
  const tax = firms.list().find(f => f.name === 'A.T. Revenue & Customs');
  for (const c of citizens.slice(0, 6)) { c.job = 'Inspector'; c.employer = tax.id; }
  const law = createBusinessLaw({ S, citizens, firms, rand: rng(9) });
  const cheat = firms.list().find(f => f.type === 'plc'), honest = firms.list().filter(f => f.type === 'plc')[1];
  cheat.ethics = 0; cheat.hidden = [{ rule: 'tax', at: 0 }]; cheat.cash = -5e4; honest.ethics = 1; honest.hidden = [];
  for (let d = 0; d < 20 && cheat.hidden.length; d++) law.daily();
  assert.equal(cheat.hidden.filter(b => b.rule === 'tax').length, 0, 'the evasion was found');
  assert.ok(S.bizlaw.cases.some(k => k.firm === cheat.name));
  assert.ok(!S.bizlaw.cases.some(k => k.firm === honest.name && k.rule !== 'Merger review'), 'no case against a firm that broke nothing');
});

test('jobs need qualifications; the top academies need the grades', () => {
  const S = { tick: 0 }, c = { id: 0, name: 'Kemi Obi', age: 20, job: 'Unemployed', wealth: 50, grade: 50, traits: { diligence: .9 }, city: 'Ashford' };
  const edu = createEducation({ S, citizens: [c], rand: () => .1 });
  assert.equal(edu.qualified(c, 'Doctor'), false);
  assert.equal(edu.gate(c, 'Doctor'), false);
  assert.equal(c.study, undefined, 'a grade of 50 is not enough for medicine');
  assert.equal(edu.gate(c, 'Police officer'), false, 'not yet a police officer');
  assert.ok(c.study && /Police Training School/.test(c.study.inst), 'starts at a city police training school');
  S.tick = c.study.until; edu.daily();
  assert.ok(edu.qualified(c, 'Police officer') && c.job === 'Police officer');
  assert.ok(INSTITUTIONS.filter(i => i.level === 'major').every(i => i.city === 'Capital'));
});
