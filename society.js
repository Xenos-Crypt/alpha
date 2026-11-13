// SOCIETY — everyone in the city has a mind of their own, and they all share one city brain.
//
// Every resident is a citizen with a name, an age, a job, a personality (honesty, kindness,
// aggression, ambition, sociability, diligence), political views, money, needs, a mood and a short
// memory. Each one decides what to do by weighing those things: work, rest, see friends, help out,
// or, for the dishonest few, steal and vandalise.
//
// They all read and write the CITY BRAIN: one shared record of crimes, news, gossip, what people
// think of the mayor and of YOU, and jobs that need doing (litter to sweep, thieves to catch). So
// a theft on one street is soon known across town, and if you punch someone, word gets round.
//
// The city is run by a GOVERNMENT of citizens: a mayor and five councillors, chosen in elections
// every six real hours. They collect taxes, set a budget (police, cleaning, health, roads, schools,
// welfare), meet every 20 minutes to vote on policies and laws, and can be honest or corrupt. Corrupt
// officials skim the treasury until a journalist or an audit catches them. You can vote, and
// people who like you follow your lead.
//
// It all runs on the real clock and is saved, so the city carries on while you are away: when you come
// back there is a "while you were away" summary. One city hour passes every real minute.
//
// On screen: people head to work by day and home at night, stop to chat (speech bubbles drawn from
// the shared brain), street cleaners sweep up litter, pickpockets strike, brave passers-by chase them,
// the police take thieves away, and unhappy people protest outside the Government Offices.
// You can hire a resident as a housekeeper to do your chores for you.
import * as THREE from 'three';
import { PROJECTS, projectById } from './innovations.js';

const KEY = 'aw.society.v1', TICK = 60e3, MEETING = 20, ELECTION = 360, POP = 400;
const FIRST = ['Amara','Ben','Chloe','Dev','Ella','Femi','Grace','Hassan','Isla','Jamal','Kemi','Liam','Maya','Noah','Olu','Priya','Quinn','Ravi','Sara','Tom','Uma','Victor','Wen','Yusuf','Zara','Aidan','Bisi','Cara','Dami','Ethan','Fatima','George','Hana','Ibrahim','Jade','Kofi','Lena','Marcus','Nia','Oscar','Pearl','Rhys','Sofia','Tunde','Vera','Will','Ada','Bola','Leo','Mia','Omar','Ruth','Sam','Tara','Joel','Kira','Luca','Nora','Ola','Seun'];
const LAST = ['Adeyemi','Bennett','Clarke','Davies','Evans','Fischer','Green','Hughes','Ibe','Jones','Khan','Lewis','Martin','Nwosu','Owens','Patel','Quarshie','Reid','Singh','Taylor','Usman','Vance','Walker','Young','Zhou','Okafor','Brown','Carter','Diallo','Ellis','Foster','Grant','Hall','Iyer','Kaur','Lopez','Mensah','Novak','Obi','Price'];
// [job, wage per city hour, paid by the city?, workplace type]
const JOBS = [['Street cleaner',8,1,null,7],['Shop worker',8,0,'supermarket',12],['Office worker',10,0,'office',12],['Teacher',10,1,'school',6],['Nurse',11,1,'clinic',5],['Doctor',18,1,'hospital',2],
  ['Police officer',12,1,'police',6],['Builder',11,0,null,6],['Bus driver',9,1,null,3],['Chef',9,0,null,5],['Mechanic',10,0,null,4],['Engineer',14,0,'office',3],['Journalist',10,0,'office',3],
  ['Shop owner',15,0,'market',3],['Student',0,0,'school',8],['Retired',0,1,null,7],['Unemployed',0,0,null,6]];
const JOB = Object.fromEntries(JOBS.map(j => [j[0], { wage: j[1], pub: !!j[2], place: j[3] }]));
const POLICIES = [
  { id: 'taxUp', name: 'Raise taxes by 2%', econ: 1, order: 0, ok: s => s.tax < 30 && s.treasury < 4000 },
  { id: 'taxDown', name: 'Cut taxes by 2%', econ: -1, order: 0, ok: s => s.tax > 8 },
  { id: 'police', name: 'Put more police on the streets', econ: 0, order: 1, ok: s => s.crime > 25 },
  { id: 'clean', name: 'Street cleaning drive', econ: .3, order: .3, ok: s => s.clean < 75 },
  { id: 'health', name: 'More money for the clinics', econ: .6, order: 0, ok: s => s.health < 80 },
  { id: 'roads', name: 'Road repair programme', econ: .2, order: .2, ok: s => s.roads < 80 },
  { id: 'schools', name: 'More money for schools', econ: .6, order: 0, ok: s => s.edu < 85 },
  { id: 'welfare', name: 'Raise benefits for the unemployed', econ: 1, order: -.4, ok: s => s.unemployed > 6 },
  { id: 'jobs', name: 'Public jobs scheme', econ: .8, order: .2, ok: s => s.unemployed > 8 && s.treasury > 800 },
  { id: 'curfewOn', name: 'Night curfew', econ: 0, order: 1.4, ok: s => s.crime > 55 && !s.laws.curfew },
  { id: 'curfewOff', name: 'Lift the night curfew', econ: 0, order: -1, ok: s => s.crime < 35 && s.laws.curfew },
  { id: 'cctvOn', name: 'CCTV cameras on every street', econ: .2, order: 1, ok: s => s.crime > 35 && !s.laws.cctv && s.treasury > 1200 },
  { id: 'watchOn', name: 'Neighbourhood watch', econ: -.2, order: .6, ok: s => s.crime > 30 && !s.laws.watch },
  { id: 'contract', name: 'Award a building contract to a friend', econ: 0, order: 0, corrupt: true, ok: s => s.treasury > 600 },
];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pickR = (r, a) => a[Math.floor(r() * a.length)];

function makeCitizen(i, role) {
  const r = rng(7919 * (i + 11));
  let job = role || null;
  if (!job) { const total = JOBS.reduce((n, j) => n + j[4], 0); let x = r() * total; for (const j of JOBS) { x -= j[4]; if (x <= 0) { job = j[0]; break; } } }
  const age = job === 'Student' ? 16 + Math.floor(r() * 7) : job === 'Retired' ? 66 + Math.floor(r() * 22) : 22 + Math.floor(r() * 42);
  const t = { honesty: r(), kindness: r(), aggression: r() * r(), ambition: r(), sociability: r(), diligence: .3 + r() * .7 };
  const crook = t.honesty < .16 ? pickR(r, ['Pickpocket', 'Pickpocket', 'Vandal', 'Fraudster']) : null;
  return { id: i, name: pickR(r, FIRST) + ' ' + pickR(r, LAST), age, job, traits: t, crook, econ: r() * 2 - 1, order: r() * 2 - 1, charisma: r(),
    wealth: 80 + Math.floor(r() * 400), mood: 55 + r() * 25, hunger: 70, energy: 80, social: 60, opinion: 0, memory: [], jail: 0, knowsCrook: false };
}

export function createSociety(ctx) {
  const peds = () => ctx.peds();
  const S = { tick: 0, last: Date.now(), treasury: 2500, tax: 15, crime: 30, clean: 70, health: 70, roads: 70, edu: 70, laws: { curfew: false, cctv: false, watch: false },
    budget: { police: .22, clean: .14, health: .2, roads: .14, schools: .18, welfare: .12 }, mayor: -1, council: [], candidates: [], research: {}, projects: {}, playerVote: null, news: [], staff: [], rep: 0, approval: 55, lastElection: 0 };
  const citizens = [];
  let live = false;
  // ---- load or found the city ---------------------------------------------------------------------------
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { }
  const roles = peds().map(e => e.profession && JOB[e.profession] ? e.profession : null);
  for (let i = 0; i < Math.max(POP, roles.length); i++) citizens.push(makeCitizen(i, roles[i]));
  if (saved?.v === 1) {
    Object.assign(S, saved.S); S.research ||= {}; S.projects ||= {};
    for (const [i, w, m, o, j, job, mem] of saved.c || []) { const c = citizens[i]; if (!c) continue; Object.assign(c, { wealth: w, mood: m, opinion: o, jail: j, job: job || c.job, memory: mem || [] }); }
  }
  const unemployedPct = () => 100 * citizens.filter(c => c.job === 'Unemployed').length / citizens.length;
  const stats = () => ({ ...S, unemployed: unemployedPct() });
  function news(text, important) { S.news.unshift({ t: S.tick, text }); S.news.length = Math.min(S.news.length, 40); if (important && live) ctx.toast('📰 ' + text); }
  function remember(c, text) { c.memory.unshift(text); c.memory.length = Math.min(c.memory.length, 5); }
  const nameOf = i => citizens[i]?.name || 'nobody';
  const officials = () => [S.mayor, ...S.council].filter(i => i >= 0).map(i => citizens[i]);

  function runFor(n, pool) {   // ambitious people stand; their views differ
    const r = rng(S.tick * 31 + n), out = new Set();
    const keen = citizens.filter(c => c.age >= 25 && c.traits.ambition > .6 && !c.jail && !pool.includes(c.id));
    while (out.size < n && keen.length) out.add(keen.splice(Math.floor(r() * keen.length), 1)[0].id);
    return [...out];
  }
  function foundGovernment() {
    const cs = runFor(6, []); S.mayor = cs[0]; S.council = cs.slice(1);
    news(`${nameOf(S.mayor)} is Mayor. The council: ${S.council.map(nameOf).join(', ')}.`);
    S.candidates = [S.mayor, ...runFor(2, [S.mayor])]; S.lastElection = 0;
  }

  // ---- one city hour: every citizen decides what to do ---------------------------------------------
  function tick() {
    S.tick++;
    const hour = S.tick % 24, r = Math.random, policeStrength = S.budget.police * (S.laws.cctv ? 1.4 : 1) * (S.laws.watch ? 1.15 : 1);
    let taxIn = 0, thefts = 0, helps = 0, vandals = 0;
    for (const c of citizens) {
      if (c.jail > 0) { c.jail--; if (!c.jail) remember(c, 'Got out of jail'); continue; }
      c.hunger = clamp(c.hunger - 3, 0, 100); c.energy = clamp(c.energy - 2, 0, 100); c.social = clamp(c.social - 1.5, 0, 100);
      const J = JOB[c.job] || { wage: 0 }, night = hour < 6 || hour > 21;
      // utilities: how much does this person want each thing right now?
      const want = {
        sleep: night ? 2 - c.energy / 100 : (100 - c.energy) / 120,
        eat: (100 - c.hunger) / 70,
        work: J.wage && hour >= 8 && hour < 17 ? .7 + c.traits.diligence : 0,
        friends: (100 - c.social) / 90 * (.5 + c.traits.sociability),
        help: c.traits.kindness > .75 ? .35 + (100 - S.clean) / 200 : 0,
        crime: c.crook && !(S.laws.curfew && night && r() < .6) ? (c.wealth < 150 ? 1.2 : .8) + (night ? .5 : 0) - policeStrength * 2 : 0,
      };
      const act = Object.entries(want).sort((a, b) => b[1] - a[1])[0][0];
      if (act === 'sleep') c.energy = clamp(c.energy + 12, 0, 100);
      else if (act === 'eat') { c.hunger = clamp(c.hunger + 45, 0, 100); c.wealth -= 6; }
      else if (act === 'work') { const pay = J.wage * (.6 + c.traits.diligence * .5); const t = pay * S.tax / 100; c.wealth += pay - t; taxIn += t; c.energy -= 2; }
      else if (act === 'friends') { c.social = clamp(c.social + 30, 0, 100); c.mood += 1.5; gossip(c); }
      else if (act === 'help') { helps++; c.mood += 1; }
      else if (act === 'crime') {
        if (c.crook === 'Vandal') { vandals++; }
        else {
          const v = citizens[Math.floor(r() * citizens.length)], amt = c.crook === 'Fraudster' ? 60 : 15 + Math.floor(r() * 30);
          if (v !== c && !v.jail) { v.wealth -= amt; c.wealth += amt; v.mood -= 8; remember(v, c.crook === 'Fraudster' ? 'Was scammed out of money' : 'Got my pocket picked'); thefts++; }
        }
        if (r() < policeStrength * .9) { c.jail = 24 + Math.floor(r() * 48); c.knowsCrook = true; if (r() < .3) news(`Police arrest ${c.name} (${c.crook.toLowerCase()}).`); }
      }
      if (J.wage === 0 && c.job === 'Unemployed') c.wealth += 3 + S.budget.welfare * 30 * (S.treasury > 0 ? 1 : 0);
      if (c.job === 'Retired') c.wealth += 3;
      // mood follows money, safety, a clean city and whether taxes match their views
      const taxFit = -(S.tax - 15) / 15 * -c.econ;
      c.mood = clamp(c.mood * .97 + .03 * (50 + (c.wealth > 200 ? 8 : -8) - (S.crime - 30) * .4 + (S.clean - 60) * .2 + taxFit * 6 + (c.hunger < 20 ? -15 : 0)), 0, 100);
      c.wealth = Math.max(0, c.wealth);
    }
    if (thefts > 6 && S.tick % 6 === 0) news(`${thefts} thefts reported in the last hour.`);
    // the city's books: taxes in, services out
    S.treasury += taxIn;
    for (const [id, pr] of Object.entries(S.projects)) if (pr.done) { const e = projectById(id)?.effect || {}; S.treasury += e.treasury || 0; S.clean = clamp(S.clean + (e.clean || 0), 0, 100); S.health = clamp(S.health + (e.health || 0), 0, 100); S.crime = clamp(S.crime + (e.crime || 0), 0, 100); }
    const spend = Math.min(Math.max(0, S.treasury) * .025 + 25, 320);
    S.treasury -= spend;
    // crime is what actually happened this hour (thefts and vandalism per head), smoothed
    const perHead = (thefts + vandals * .5) / citizens.length;
    S.crime = clamp(S.crime * .92 + .08 * clamp(perHead * 3500, 0, 100), 0, 100);
    S.clean = clamp(S.clean - .5 + spend * S.budget.clean * .012 + helps / citizens.length * 4 - vandals / citizens.length * 25, 0, 100);
    S.health = clamp(S.health - .2 + spend * S.budget.health * .005, 0, 100);
    S.roads = clamp(S.roads - .2 + spend * S.budget.roads * .01, 0, 100);
    S.edu = clamp(S.edu - .15 + spend * S.budget.schools * .007, 0, 100);
    // jobs come and go with the economy
    if (S.tick % 12 === 0) {
      const out = citizens.filter(c => c.job === 'Unemployed' && !c.jail), boom = S.treasury > 1500 && S.tax < 22;
      for (const c of out) if (Math.random() < (boom ? .08 : .03)) { c.job = pickR(Math.random, ['Shop worker', 'Builder', 'Office worker', 'Chef', 'Street cleaner']); remember(c, 'Found a job as a ' + c.job.toLowerCase()); c.mood += 10; }
      if (S.treasury < 0) for (const c of citizens) if (JOB[c.job]?.pub && c.job !== 'Retired' && Math.random() < .02) { remember(c, 'Lost my job in the council cuts'); c.job = 'Unemployed'; c.mood -= 12; }
    }
    // corrupt officials skim; journalists and audits catch them
    for (const o of officials()) if (o.traits.honesty < .3) { const skim = Math.min(S.treasury * .004 * (1 - o.traits.honesty), 40); if (skim > 0) { S.treasury -= skim; o.wealth += skim; o.skimmed = (o.skimmed || 0) + skim; } }
    if (S.tick % 6 === 0) for (const o of officials()) if ((o.skimmed || 0) > 150 && Math.random() < .08 + citizens.filter(c => c.job === 'Journalist').length * .002) scandal(o);
    S.approval = clamp(citizens.reduce((n, c) => n + c.mood, 0) / citizens.length * .75 + (S.clean - 50) * .15 - (S.crime - 30) * .35 - (S.treasury < 0 ? 10 : 0), 0, 100);
    if (S.tick % MEETING === 0) councilMeeting();
    if (live && S.tick % 30 === 15) goOnline();
    if (S.tick - S.lastElection >= ELECTION) election();
    payStaff();
  }
  function gossip(c) {   // people compare notes; opinions (of you, too) drift towards their friends'
    const f = citizens[Math.floor(Math.random() * citizens.length)];
    if (f === c || f.jail) return;
    const avg = (c.opinion + f.opinion) / 2; c.opinion += (avg - c.opinion) * .3; f.opinion += (avg - f.opinion) * .3;
    if (f.memory[0] && Math.random() < .2) remember(c, `Heard from ${f.name.split(' ')[0]}: "${f.memory[0]}"`);
  }
  function scandal(o) {
    const role = o.id === S.mayor ? 'Mayor' : 'Councillor';
    news(`SCANDAL: ${role} ${o.name} caught taking ${Math.round(o.skimmed)} gold from the city. Arrested.`, true);
    S.treasury += o.skimmed * .7; o.skimmed = 0; o.jail = 120; o.knowsCrook = true;
    for (const c of citizens) c.mood -= 3;
    const pick = runFor(1, [S.mayor, ...S.council])[0];
    if (o.id === S.mayor) { const next = S.council.shift(); S.mayor = next; S.council.push(pick); news(`${nameOf(next)} becomes acting Mayor.`); }
    else S.council[S.council.indexOf(o.id)] = pick;
  }
  function councilMeeting() {
    const st = stats(), live = allPolicies().filter(p => p.ok(st));
    if (!live.length) return;
    const members = [S.mayor, ...S.council].map(i => citizens[i]).filter(Boolean);
    // each member puts forward what they care about most; the most popular proposal is voted on
    const pairs = members.map(m => [m, live.filter(p => !p.corrupt || m.traits.honesty < .3).sort((a, b) => score(m, b) - score(m, a))[0]]).filter(x => x[1]);
    if (!pairs.length) return;
    const count = p => pairs.filter(x => x[1] === p).length;
    const [proposer, p] = pairs.sort((a, b) => count(b[1]) - count(a[1]))[0];
    const yes = members.filter(m => score(m, p) > 0 || m === proposer).length;
    const passed = yes > members.length / 2;
    news(`Council: "${p.name}" ${passed ? 'PASSED' : 'rejected'} ${yes}–${members.length - yes} (proposed by ${proposer.name}).`, passed);
    if (passed) apply(p, proposer);
  }
  function allPolicies() {   // + building whatever residents found online that beats what we have
    return [...POLICIES, ...Object.entries(S.research).filter(([id, r]) => r.advanced && !S.projects[id]).map(([id]) => { const P = projectById(id); return P && { id: 'build:' + id, name: 'Build ' + P.name.toLowerCase() + ` (${P.cost} gold)`, econ: .5, order: .1, ok: s => s.treasury > P.cost * 1.3 }; }).filter(Boolean)];
  }
  function score(m, p) {
    if (p.id.startsWith('build:')) return .5 + (S.treasury > 3000 ? .4 : 0) + p.econ * m.econ * .5 + m.traits.ambition * .3;   // how much a politician likes a policy: their views + what the city needs
    if (p.corrupt) return m.traits.honesty < .3 ? 1 : -2;
    const need = { police: S.crime / 35 + (S.budget.police < .12 ? .6 : 0), curfewOn: S.crime / 60, cctvOn: S.crime / 60, watchOn: S.crime / 70, clean: (100 - S.clean) / 40, health: (100 - S.health) / 40, roads: (100 - S.roads) / 40, schools: (100 - S.edu) / 40, welfare: unemployedPct() / 10, jobs: unemployedPct() / 10, taxUp: S.treasury < 800 || (S.tax < 14 && (S.crime > 35 || S.clean < 45 || S.health < 45)) ? 1.3 : -.3, taxDown: S.treasury > 3000 ? 1 : 0, curfewOff: .8 }[p.id] || 0;
    return need - .8 + p.econ * m.econ * .7 + p.order * m.order * .7;
  }
  function shift(key, amt) { const b = S.budget; b[key] = clamp(b[key] + amt, .03, .6); const sum = Object.values(b).reduce((a, x) => a + x, 0); for (const k in b) b[k] /= sum; }
  function apply(p, proposer) {
    switch (p.id) {
      case 'taxUp': S.tax += 2; break; case 'taxDown': S.tax -= 2; break;
      case 'police': shift('police', .06); break; case 'clean': shift('clean', .06); break; case 'health': shift('health', .06); break;
      case 'roads': shift('roads', .06); break; case 'schools': shift('schools', .06); break; case 'welfare': shift('welfare', .06); break;
      case 'jobs': { let n = 0; for (const c of citizens) if (c.job === 'Unemployed' && n < 12 && c.age < 66) { c.job = 'Street cleaner'; remember(c, 'Got a job on the public jobs scheme'); n++; } S.treasury -= 300; break; }
      case 'curfewOn': S.laws.curfew = true; break; case 'curfewOff': S.laws.curfew = false; break;
      case 'cctvOn': S.laws.cctv = true; S.treasury -= 900; break; case 'watchOn': S.laws.watch = true; break;
      default: if (p.id.startsWith('build:')) { const id = p.id.slice(6), P = projectById(id); S.treasury -= P.cost; S.projects[id] = { start: Date.now(), end: Date.now() + P.hours * 3600e3, done: false }; news(`The residents start building ${P.name.toLowerCase()} together. Ready in about ${P.hours} hours.`, true); } break;
      case 'contract': { const take = Math.min(400, S.treasury * .15); S.treasury -= take; proposer.skimmed = (proposer.skimmed || 0) + take; proposer.wealth += take; break; }
    }
  }
  function election() {
    S.lastElection = S.tick;
    const cands = S.candidates.filter(i => citizens[i] && !citizens[i].jail);
    while (cands.length < 3) { const more = runFor(3 - cands.length, cands); if (!more.length) break; cands.push(...more); }
    const votes = new Map(cands.map(i => [i, 0])), player = S.playerVote != null && votes.has(S.playerVote) ? S.playerVote : null;
    for (const c of citizens) {
      if (c.jail || c.age < 18) continue;
      if (player != null && c.opinion > 30 && Math.random() < c.opinion / 150) { votes.set(player, votes.get(player) + 1); continue; }   // people who like you follow your lead
      let best = null, bs = -1e9;
      for (const i of cands) {
        const k = citizens[i];
        let u = -Math.abs(k.econ - c.econ) - Math.abs(k.order - c.order) + k.charisma * .8 + (Math.random() - .5) * .8;
        if (i === S.mayor) u += (c.mood - 50) / 25;
        if (k.knowsCrook) u -= 2;
        if (u > bs) { bs = u; best = i; }
      }
      votes.set(best, votes.get(best) + 1);
    }
    if (player != null) votes.set(player, votes.get(player) + 1);
    const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]), winner = ranked[0][0], old = S.mayor;
    S.lastResult = ranked.map(([i, v]) => [nameOf(i), v]);
    S.mayor = winner;
    // councillors: the runners-up plus the most ambitious people left
    S.council = [...ranked.slice(1).map(x => x[0]), ...runFor(5, [winner, ...ranked.map(x => x[0])])].filter(i => i !== winner).slice(0, 5);
    news(`ELECTION: ${nameOf(winner)} ${winner === old ? 're-elected' : 'elected'} Mayor with ${ranked[0][1]} votes (${ranked.slice(1).map(([i, v]) => nameOf(i) + ' ' + v).join(', ')}).`, true);
    if (player != null) news(player === winner ? 'Your candidate won.' : 'Your candidate lost.', true);
    S.playerVote = null; S.candidates = [winner, ...runFor(2, [winner])];
  }

  // ---- residents go online and learn about better ways of doing things --------------------------------
  let researching = false; const shown = new Set();
  async function goOnline() {
    const next = PROJECTS.find(p => !S.research[p.id]); if (!next || researching) return;
    const who = citizens.filter(c => ['Engineer', 'Student', 'Journalist'].includes(c.job) && !c.jail && c.traits.ambition > .35)[Math.floor(Math.random() * 20)] || citizens.find(c => c.job === 'Engineer');
    if (!who) return;
    researching = true;
    const city = 'Built so far: ' + (PROJECTS.filter(p => S.projects[p.id]?.done).map(p => p.name).join(', ') || 'ordinary street lamps, plain bins, buses and taxis, no bike share, no renewables') + `. Treasury ${Math.round(S.treasury)} gold.`;
    let found = null; try { found = await ctx.research?.(next.topic, city, who.name); } catch { }
    const r = found?.summary ? { by: who.id, summary: found.summary, example: found.example || '', advanced: found.advanced !== false, sources: found.sources || [], online: true }
      : { by: who.id, summary: `I read up on ${next.topic}. ${next.about} Plenty of real cities already do it, and it beats what we have.`, example: '', advanced: true, sources: [], online: false };
    r.at = S.tick; S.research[next.id] = r; researching = false;
    remember(who, 'Read online about ' + next.name.toLowerCase());
    news(`${who.name} (${who.job.toLowerCase()}) read online about ${next.name.toLowerCase()}${r.example ? ' in ' + r.example : ''}${r.advanced ? ' and wants the city to build it.' : ', but thinks what we have is good enough.'}`, true);
    save();
  }
  function checkProjects(first) {
    for (const [id, pr] of Object.entries(S.projects)) {
      if (!pr.done && Date.now() >= pr.end) { pr.done = true; if (!first) news(`Finished! The residents built ${projectById(id)?.name.toLowerCase()} together.`, true); save(); }
      if (pr.done && !shown.has(id)) { shown.add(id); ctx.built?.(id); }
    }
  }

  // ---- hired staff ---------------------------------------------------------------------------------------
  const WAGE = { housekeeper: 30 };
  function payStaff() {
    if (S.tick % 24) return;
    for (const s of [...S.staff]) {
      const c = citizens[s.id];
      if (ctx.gold() >= WAGE[s.role]) { ctx.addGold(-WAGE[s.role]); c.wealth += WAGE[s.role]; s.chores = 0; }
      else { S.staff = S.staff.filter(x => x !== s); news(`${c.name} quit as your ${s.role}: you couldn't pay them.`, true); c.opinion -= 20; }
    }
  }
  const housekeeper = () => S.staff.find(s => s.role === 'housekeeper');

  if (saved?.v !== 1) foundGovernment();
  // ---- catch up on the time you were away ---------------------------------------------------------------
  {
    const missed = Math.min(720, Math.floor((Date.now() - S.last) / TICK));
    if (missed > 0) {
      const before = { tick: S.tick, news: S.news.length ? S.news[0] : null, mayor: S.mayor };
      for (let i = 0; i < missed; i++) tick();
      S.last += missed * TICK;
      const fresh = S.news.filter(n => n.t > before.tick).slice(0, 3).map(n => n.text);
      if (missed >= 5) setTimeout(() => ctx.toast(`While you were away (${missed >= 60 ? Math.round(missed / 60) + ' city days' : missed + ' city hours'}): ` + (fresh.length ? fresh.join(' · ') : 'a quiet time in town.')), 5000);
    }
    live = true;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, S, c: citizens.map(c => [c.id, Math.round(c.wealth), Math.round(c.mood), Math.round(c.opinion), c.jail, c.job, c.memory]) })); } catch { }
  }
  addEventListener('beforeunload', save);

  // ---- on screen ----------------------------------------------------------------------------------------
  const scene = ctx.scene, P = () => ctx.playerPosition();
  const cit = e => { if (e.citizen === undefined) { const i = peds().indexOf(e); e.citizen = i >= 0 ? citizens[i] : null; } return e.citizen; };
  const hour = () => (6 + ctx.dayTime() * 24) % 24;
  const bubbles = [];
  function say(e, text, t = 3.2) {
    const old = bubbles.find(b => b.e === e); if (old) kill(old);
    if (bubbles.length > 8) kill(bubbles[0]);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const g = cv.getContext('2d'); g.font = '600 30px system-ui,sans-serif';
    const w = Math.min(500, g.measureText(text).width + 36);
    g.fillStyle = 'rgba(255,255,255,.93)'; g.beginPath(); g.roundRect((512 - w) / 2, 8, w, 64, 22); g.fill();
    g.beginPath(); g.moveTo(244, 70); g.lineTo(256, 90); g.lineTo(268, 70); g.fill();
    g.fillStyle = '#17222d'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 41, 480);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(3.2, .6, 1); sp.renderOrder = 20; scene.add(sp);
    bubbles.push({ e, sp, t });
  }
  function kill(b) { scene.remove(b.sp); b.sp.material.map.dispose(); b.sp.material.dispose(); bubbles.splice(bubbles.indexOf(b), 1); }
  function opinionWord(v) { return v > 65 ? 'doing a great job' : v > 50 ? 'alright, I suppose' : v > 35 ? 'not doing much for us' : 'useless'; }
  function chatLine(c) {
    const r = Math.random(), m = citizens[S.mayor];
    if (r < .2 && S.news[0]) return 'Did you hear? ' + S.news[0].text.replace(/^[A-Z]+: /, '').slice(0, 60);
    if (r < .35) return `Mayor ${m?.name.split(' ')[1] || ''}? ${opinionWord(c.mood)}.`;
    if (r < .48) return `Taxes are ${S.tax}% now. ${(S.tax > 17) === (c.econ < 0) ? 'Too much!' : 'Fair enough.'}`;
    if (r < .6 && c.memory[0]) return c.memory[0].slice(0, 60) + '.';
    if (r < .7) return S.crime > 45 ? "It's not safe round here any more." : 'Streets feel safe lately.';
    if (r < .8 && Math.abs(c.opinion) > 25) return c.opinion > 0 ? 'That newcomer is all right, you know.' : 'Watch out for that newcomer. Trouble.';
    if (r < .9) return pickR(Math.random, ['Long day at work.', 'Going to the market later?', 'How is the family?', 'Lovely weather.', `Work as a ${c.job.toLowerCase()} is tiring.`]);
    return S.clean < 50 ? 'The streets are filthy.' : 'Nice to see the streets clean.';
  }
  const litter = [];
  const litterMats = [0xd8d2c4, 0x6f8fa3, 0xb23a3a, 0x3d6b3d].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }));
  const litterGeo = new THREE.BoxGeometry(.28, .08, .2);
  function dropLitter(p) {
    if (litter.length > 30) return;
    const m = new THREE.Mesh(litterGeo, litterMats[Math.floor(Math.random() * 4)]);
    m.position.set(p.x + (Math.random() - .5), ctx.groundY(p.x, p.z) + .04, p.z + (Math.random() - .5)); m.rotation.y = Math.random() * 6;
    scene.add(m); litter.push(m);
  }
  const placardMat = new THREE.MeshStandardMaterial({ color: 0xf4efe2 });
  function placard(e, on) {
    if (on && !e.placard) { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(.6, .4, .03), placardMat), s = new THREE.Mesh(new THREE.BoxGeometry(.04, .9, .04), new THREE.MeshStandardMaterial({ color: 0x7a5a3a })); b.position.y = .55; g.add(b, s); e.h.armR.end.add(g); g.rotation.x = 1.6; e.placard = g; }
    if (e.placard) e.placard.visible = on;
  }
  const govt = () => ctx.civicBuildings.find(b => /government/i.test(b.type) || /Government/.test(b.name)) || { x: 300, z: 900, minZ: 891 };
  let visT = 0, chatT = 2, crimeT = 40, protest = null, catchupT = 0;
  const free = e => e.alive && !e.hidden && e.ped?.state === 'wander' && !e.socLock;
  function own(e, job) { e.ped.state = 'soc'; e.soc = job; }
  function release(e) { e.soc = null; if (e.placard) placard(e, false); ctx.resumeWander(e); }

  function update(dt) {
    if (Date.now() - S.last >= TICK) { S.last += TICK; tick(); if (S.tick % 5 === 0) save(); }
    const pp = P();
    for (const b of [...bubbles]) { b.t -= dt; if (b.t <= 0 || !b.e.alive) { kill(b); continue; } b.sp.position.copy(b.e.root.position); b.sp.position.y += 2.35; }
    // people go home at night (fewer of them out, and fewer still under a curfew) and come back out in the morning
    visT -= dt;
    if (visT <= 0) {
      visT = 1; checkProjects(false);
      const h = hour(), night = h < 6 || h >= 22;
      for (const e of peds()) {
        const c = cit(e); if (!c || e.profession) continue;
        const shouldHide = c.jail > 0 || (night && !(c.crook && !S.laws.curfew) && (c.id % 10) < (S.laws.curfew ? 9 : 7));
        const far = (e.socHome || e.root.position).distanceTo(pp) > 45;
        if (shouldHide && !e.socHome && free(e) && far) { e.socHome = e.root.position.clone(); e.hidden = true; e.root.visible = false; e.root.position.set(9999, -500, 9999); }
        else if (!shouldHide && e.socHome && far) { e.root.position.copy(e.socHome); e.socHome = null; e.hidden = false; e.root.visible = true; ctx.resumeWander(e); }
      }
      // litter: dropped by careless people, more of it when the cleaning budget is low
      if (Math.random() < (100 - S.clean) / 260) { const near = peds().filter(e => free(e) && e.root.position.distanceTo(pp) < 50); const e = near[Math.floor(Math.random() * near.length)]; if (e && (cit(e)?.traits.diligence < .5 || cit(e)?.crook === 'Vandal')) dropLitter(e.root.position); }
      for (const m of [...litter]) if (m.position.distanceTo(pp) > 160 && Math.random() < S.clean / 400) { scene.remove(m); litter.splice(litter.indexOf(m), 1); }
    }
    const near = peds().filter(e => e.alive && !e.hidden && e.root.position.distanceTo(pp) < 70);
    // street cleaners go to the nearest litter and sweep it up
    for (const e of near) {
      const c = cit(e); if (!c || c.job !== 'Street cleaner' || !free(e) || !litter.length) continue;
      const m = litter.filter(m => !m.claimed).sort((a, b) => a.position.distanceTo(e.root.position) - b.position.distanceTo(e.root.position))[0];
      if (m && m.position.distanceTo(e.root.position) < 35) { m.claimed = e; own(e, { kind: 'sweep', m, t: 0 }); }
    }
    // a couple of people stop for a chat
    chatT -= dt;
    if (chatT <= 0) {
      chatT = 3 + Math.random() * 4;
      const pool = near.filter(e => free(e) && cit(e) && cit(e).traits.sociability > .35);
      for (const a of pool) {
        const b = pool.find(b => b !== a && b.root.position.distanceTo(a.root.position) < 10);
        if (b && near.filter(e => e.soc?.kind === 'chat').length < 6) { const meet = a.root.position.clone().lerp(b.root.position, .5); own(a, { kind: 'chat', with: b, meet, t: 9 + Math.random() * 6, line: 0 }); own(b, { kind: 'chat', with: a, meet, t: a.soc.t, line: 1.6 }); break; }
      }
    }
    // pickpockets look for a victim; victims shout, brave people give chase, police come for the thief
    crimeT -= dt;
    if (crimeT <= 0) {
      crimeT = 25 + Math.random() * 40 + S.budget.police * 120;
      const thief = near.find(e => free(e) && cit(e)?.crook === 'Pickpocket' && e.root.position.distanceTo(pp) < 50);
      const victim = thief && near.find(v => v !== thief && free(v) && v.root.position.distanceTo(thief.root.position) < 18);
      if (thief && victim && !(S.laws.curfew && (hour() < 6 || hour() >= 22) && Math.random() < .5)) { own(thief, { kind: 'steal', v: victim, t: 0 }); }
    }
    // protest outside the Government Offices when people are fed up
    const g = govt();
    if (S.approval < 38 && !protest && Math.hypot(pp.x - g.x, pp.z - g.z) < 130) {
      protest = []; const crowd = near.filter(e => free(e) && cit(e) && cit(e).mood < 50).slice(0, 8);
      crowd.forEach((e, i) => { own(e, { kind: 'protest', spot: new THREE.Vector3(g.x - 7 + i * 2, 0, (g.minZ ?? g.z - 9) - 3.5 - (i % 2) * 1.4), t: 0 }); placard(e, true); protest.push(e); });
      if (crowd.length) ctx.toast(`📣 Protest outside the Government Offices: approval of Mayor ${citizens[S.mayor]?.name} is ${Math.round(S.approval)}%.`);
    } else if (protest && (S.approval >= 42 || Math.hypot(pp.x - g.x, pp.z - g.z) > 180)) { for (const e of protest) if (e.soc?.kind === 'protest') release(e); protest = null; }
    for (const e of near) if (e.soc && e.ped.state === 'soc') run(e, dt);
    for (const e of peds()) {
      if (!e.soc) continue;
      if (e.ped.state !== 'soc') { if (e.soc.m) e.soc.m.claimed = null; e.soc = null; e.socLock = false; if (e.placard) placard(e, false); }
      else if (!e.socLock && !e.hidden && e.root.position.distanceTo(pp) > 90) { if (e.soc.m) e.soc.m.claimed = null; release(e); }   // out of sight: carry on as normal
    }   // something else (a punch, a panic) took over
  }
  function run(e, dt) {
    const j = e.soc, p = e.root.position, c = cit(e);
    switch (j.kind) {
      case 'sweep': {
        if (!litter.includes(j.m)) { release(e); break; }
        if (p.distanceTo(j.m.position) > 1) { ctx.animate(e, null, ctx.walk(e, j.m.position, 1.6, dt), false, dt); break; }
        j.t += dt; ctx.animate(e, null, false, false, dt); e.h.armR.pivot.rotation.x = -.6 + Math.sin(j.t * 8) * .5; e.h.armL.pivot.rotation.x = -.6 + Math.sin(j.t * 8) * .5;
        if (j.t > 2.5) { scene.remove(j.m); litter.splice(litter.indexOf(j.m), 1); S.clean = clamp(S.clean + .2, 0, 100); release(e); }
        break;
      }
      case 'chat': {
        const o = j.with;
        if (!o.alive || o.soc?.with !== e) { release(e); break; }
        const tgt = j.meet.clone().add(new THREE.Vector3(o.root.position.x - p.x, 0, o.root.position.z - p.z).setLength(-.6));
        if (!j.met && p.distanceTo(tgt) > .45 && (j.w = (j.w || 0) + dt) < 6) { ctx.animate(e, null, ctx.walk(e, tgt, 1.3, dt), false, dt); break; }
        j.met = true;
        e.root.rotation.y = Math.atan2(o.root.position.x - p.x, o.root.position.z - p.z);
        ctx.animate(e, null, false, false, dt);
        e.h.armR.pivot.rotation.x = -.3 + Math.sin(performance.now() / 300 + c.id) * .25;
        j.t -= dt; j.line -= dt;
        if (j.line <= 0) { j.line = 3.4; say(e, chatLine(c)); c.social = 100; }
        if (j.t <= 0) release(e);
        break;
      }
      case 'steal': {
        const v = j.v;
        if (!v.alive) { release(e); break; }
        if (!j.done) {
          if (p.distanceTo(v.root.position) > .9) { ctx.animate(e, null, ctx.walk(e, v.root.position, 1.9, dt), false, dt); j.t += dt; if (j.t > 15) release(e); break; }
          j.done = true; j.t = 0; const vc = cit(v), amt = 10 + Math.floor(Math.random() * 30);
          if (vc) { vc.wealth -= amt; remember(vc, 'Got my pocket picked by ' + c.name); vc.mood -= 10; }
          c.wealth += amt; S.crime = clamp(S.crime + .5, 0, 100);
          own(v, { kind: 'victim', t: 3, thief: e }); say(v, pickR(Math.random, ['Hey! My wallet!', 'Thief! Stop him!', 'Someone stop that thief!']));
          const hero = peds().find(h => h !== e && h !== v && free(h) && cit(h) && cit(h).traits.kindness > .55 && cit(h).traits.aggression > .25 && h.root.position.distanceTo(p) < 22);
          if (hero) { own(hero, { kind: 'chase', thief: e, t: 0 }); say(hero, 'Oi! Come back here!'); }
          const caught = Math.random() < S.budget.police * 2.2 * (S.laws.cctv ? 1.5 : 1);
          if (caught && ctx.arrest(e, () => { c.jail = 48; c.knowsCrook = true; news(`Police arrest pickpocket ${c.name}.`, false); e.socLock = false; e.soc = null; e.socHome = e.root.position.clone(); e.hidden = true; e.root.visible = false; e.root.position.set(9999, -500, 9999); })) { j.arrest = true; e.socLock = true; }
          ctx.cityEvent?.('theft', p);
        }
        j.t += dt;
        if (j.arrest && j.t > 70) { e.socLock = false; release(e); break; }   // the police never made it
        if (j.arrest && j.t > 4) { ctx.animate(e, 'stunned', false, false, dt); break; }   // cornered, waiting for the police car
        const away = p.clone().add(new THREE.Vector3(p.x - v.root.position.x, 0, p.z - v.root.position.z).setLength(4));
        ctx.animate(e, null, ctx.walk(e, away, 4.6, dt), true, dt);
        if (j.t > 7) release(e);
        break;
      }
      case 'victim': { j.t -= dt; ctx.animate(e, 'phone', false, false, dt); if (j.t <= 0) release(e); break; }
      case 'chase': {
        const t = j.thief; j.t += dt;
        if (!t.alive || t.hidden || j.t > 9) { release(e); break; }
        if (p.distanceTo(t.root.position) > 1.1) { ctx.animate(e, null, ctx.walk(e, t.root.position, 4.4, dt), true, dt); break; }
        // caught him: a citizen's arrest, and he hands the money back
        say(e, 'Got you!'); say(t, 'All right, all right!');
        news(`${c.name} chased down a pickpocket on the street.`, false); c.mood += 10; remember(c, 'Caught a thief red-handed');
        if (t.soc) { t.soc.arrest = true; if (!t.socLock && ctx.arrest(t, () => { const tc = cit(t); if (tc) tc.jail = 48; t.socLock = false; t.soc = null; t.socHome = t.root.position.clone(); t.hidden = true; t.root.visible = false; t.root.position.set(9999, -500, 9999); })) t.socLock = true; else if (!t.socLock) release(t); }
        release(e);
        break;
      }
      case 'protest': {
        if (p.distanceTo(j.spot) > .5 && j.t < 25) { j.t += dt; ctx.animate(e, null, ctx.walk(e, j.spot, 1.5, dt), false, dt); break; }
        const g = govt(); e.root.rotation.y = Math.atan2(g.x - p.x, g.z - p.z);
        ctx.animate(e, null, false, false, dt); e.h.armR.pivot.rotation.x = -2.6 + Math.sin(performance.now() / 250 + c.id) * .25;
        if (Math.random() < dt / 6) say(e, pickR(Math.random, [S.crime > 45 ? 'Make our streets safe!' : 'Jobs, not promises!', `${S.tax}% tax is robbery!`, `Out, ${citizens[S.mayor]?.name.split(' ')[1]}!`, 'We want change!', S.clean < 50 ? 'Clean up our city!' : 'Listen to us!']));
        break;
      }
    }
  }

  // ---- talking to people -----------------------------------------------------------------------------
  function converse(e) {
    const c = cit(e); if (!c) return null;
    const now = Date.now();
    if (!c.metAt || now - c.metAt > 60e3) { c.opinion = clamp(c.opinion + 3, -100, 100); c.metAt = now; }
    const m = citizens[S.mayor], hostile = c.opinion < -30;
    const greet = hostile ? pickR(Math.random, ['What do YOU want?', "Stay away from me. I've heard about you.", "I've got nothing to say to you."])
      : c.mood < 35 ? 'Hi. Not having a great day, honestly.' : c.opinion > 40 ? `Oh, hello again! Good to see you.` : pickR(Math.random, ['Hello there.', 'Hi! Can I help you?', 'Afternoon.']);
    const choices = [
      ['Who are you?', `I'm ${c.name}, ${c.age}. ${c.job === 'Unemployed' ? "I'm out of work at the moment." : c.job === 'Retired' ? "I'm retired." : c.job === 'Student' ? "I'm a student." : `I work as a ${c.job.toLowerCase()}.`} ${c.mood > 65 ? 'Life is good.' : c.mood > 40 ? 'Getting by.' : 'Things are hard right now.'}`],
      ['What have you been up to?', c.memory.length ? c.memory.slice(0, 3).join('. ') + '.' : 'Nothing much. Work, home, the usual.'],
      ['What do you think of the mayor?', `Mayor ${m?.name}? ${opinionWord(c.mood)}. ${Math.abs(m?.econ - c.econ) < .5 ? 'I voted for them.' : "Didn't vote for them."} Taxes are ${S.tax}%, ${(S.tax > 17) === (c.econ < 0) ? 'which is too high' : 'which is fine by me'}.`],
      ["What's the news?", S.news.slice(0, 2).map(n => n.text).join(' ') || 'Quiet lately.'],
      ['Who made this world?', pickR(Math.random, ['The Lawgiver wrote the laws of this world: the roads, the rules, even how the rain falls. And above the Lawgiver, they say, is a Supreme Being. Nobody knows anything about the Supreme Being. Only that it is there.', "The Lawgiver made it, and keeps rewriting the laws to make it better. When something here doesn't make sense, we petition the Lawgiver. As for the Supreme Being above the Lawgiver… no one knows. We just know it exists."])],
      ['Seen anything strange lately?', (() => { const mine = (ctx.petitions?.() || []).find(p => p.who.includes(c.name.split(' ')[0]) || p.who.includes(c.name)); return mine ? `Yes! ${mine.words} I reported it. ${mine.fixed ? 'The Rule Keepers put it right.' : 'It is with the Lawgiver now.'}` : 'Not lately. If I see something that breaks the laws of the world, I will report it to the Lawgiver.'; })()],
      ['What do people say about me?', c.opinion > 40 ? 'People like you. Word is you help folks out.' : c.opinion > 5 ? "You seem all right." : c.opinion > -30 ? "Folks don't know what to make of you." : 'People say you hurt folks round here. Everyone knows.'],
    ];
    if (c.crook && c.opinion > 20) choices.push(['Anything else?', pickR(Math.random, ["Between us? I don't always earn my money honestly.", 'Keep your wallet close in this town. Trust me.'])]);
    const hk = housekeeper();
    if (!hk && !hostile && c.age >= 18 && c.age < 70 && !c.crook) choices.push([`Offer a job: housekeeper (${WAGE.housekeeper} gold a day)`, () => {
      if (c.opinion < 0 && Math.random() < .5) return "No thanks. I don't want to work for you.";
      S.staff.push({ id: c.id, role: 'housekeeper', since: S.tick, chores: 0 }); if (c.job === 'Unemployed') c.job = 'Housekeeper';
      remember(c, 'Started working as a housekeeper for the newcomer'); c.opinion += 15; save();
      return `Deal! I'll do your laundry, dishes and the rest. ${WAGE.housekeeper} gold a day, paid each city day.`;
    }]);
    if (hk && hk.id === c.id) choices.push(['Let them go', () => { S.staff = S.staff.filter(s => s !== hk); c.opinion -= 10; remember(c, 'Was let go as a housekeeper'); save(); return 'Oh. Right. Well, good luck.'; }]);
    return { title: `${c.name} · ${c.job}`, text: greet, choices };
  }

  // ---- the City Hall panel -----------------------------------------------------------------------------
  const panel = document.createElement('section'); panel.id = 'cityHall'; panel.hidden = true; document.body.append(panel);
  const st = document.createElement('style');
  st.textContent = '#cityHall{position:fixed;inset:6% max(12px,12%);z-index:46;background:#101d2cf5;color:#eef3f7;border:1px solid #6f8aa5;border-radius:16px;padding:18px 20px;overflow:auto;font:14px/1.45 system-ui}#cityHall[hidden]{display:none}#cityHall h2{margin:0 0 4px;font-size:20px}#cityHall h3{margin:14px 0 6px;font-size:14px;color:#9fc0de;text-transform:uppercase;letter-spacing:.06em}#cityHall .row{display:flex;gap:14px;flex-wrap:wrap}#cityHall .bar{height:8px;background:#ffffff1f;border-radius:4px;overflow:hidden;width:120px;display:inline-block;vertical-align:middle;margin-left:6px}#cityHall .bar i{display:block;height:100%;background:#5fb3f0}#cityHall button{min-height:40px;padding:8px 12px;margin:4px 6px 4px 0;border:0;border-radius:8px;background:#365f86;color:#fff;font:inherit}#cityHall button.on{background:#2f8f5b}#cityHall ul{margin:0;padding-left:18px}#cityHall .x{position:sticky;top:0;float:right}@media(max-width:700px){#cityHall{inset:4% 10px}}';
  document.head.append(st);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const bar = v => `<span class="bar"><i style="width:${clamp(v, 0, 100)}%"></i></span> ${Math.round(v)}`;
  function render() {
    const m = citizens[S.mayor], left = ELECTION - (S.tick - S.lastElection), ppl = citizens.filter(c => !c.jail);
    const B = S.budget, hk = housekeeper();
    panel.innerHTML = `<button class="x" type="button" data-close>Close</button><h2>🏛 City Hall</h2>
      <div>Mayor <b>${esc(m?.name)}</b> · approval ${bar(S.approval)}%</div>
      <div>Council: ${S.council.map(i => esc(nameOf(i))).join(', ')}</div>
      <h3>The city</h3><div class="row"><div>Safety ${bar(100 - S.crime)}</div><div>Cleanliness ${bar(S.clean)}</div><div>Health ${bar(S.health)}</div><div>Roads ${bar(S.roads)}</div><div>Schools ${bar(S.edu)}</div></div>
      <div>${ppl.length} residents · unemployment ${unemployedPct().toFixed(1)}% · ${citizens.filter(c => c.jail).length} in jail · what people think of you: <b>${(() => { const o = citizens.reduce((n, c) => n + c.opinion, 0) / citizens.length; return o > 25 ? 'well liked' : o > 5 ? 'liked' : o > -10 ? 'unknown' : o > -30 ? 'distrusted' : 'feared'; })()}</b></div>
      <h3>Money</h3><div>Treasury <b>${Math.round(S.treasury)}</b> gold · income tax <b>${S.tax}%</b></div>
      <div class="row">${Object.entries(B).map(([k, v]) => `<div>${k} ${Math.round(v * 100)}%</div>`).join('')}</div>
      <h3>Laws in force</h3><div>${[S.laws.curfew && 'Night curfew (10pm–6am)', S.laws.cctv && 'CCTV on every street', S.laws.watch && 'Neighbourhood watch'].filter(Boolean).join(' · ') || 'No special laws.'}</div>
      <h3>Election in ${left >= 60 ? Math.floor(left / 60) + 'h ' : ''}${left % 60}m (real time)</h3>
      <div>${S.candidates.filter(i => citizens[i]).map(i => { const k = citizens[i]; return `<button type="button" data-vote="${i}" class="${S.playerVote === i ? 'on' : ''}">${esc(k.name)}${i === S.mayor ? ' (Mayor)' : ''}: ${k.econ > .3 ? 'more public spending' : k.econ < -.3 ? 'lower taxes' : 'balanced budget'}, ${k.order > .3 ? 'tough on crime' : k.order < -.3 ? 'personal freedom' : 'steady policing'}</button>`; }).join('')}</div>
      <div style="opacity:.75">Your vote counts, and residents who like you tend to follow your choice.${S.lastResult ? ' Last result: ' + S.lastResult.map(([n, v]) => esc(n) + ' ' + v).join(', ') : ''}</div>
      <h3>Your staff</h3><div>${hk ? `${esc(citizens[hk.id].name)}, housekeeper (${WAGE.housekeeper} gold a day). They do your laundry, dishes and handwashing reminders for you.` : 'Nobody yet. Talk to a resident to offer them a job as your housekeeper.'}</div>
      <h3>Ideas residents found online</h3><ul>${PROJECTS.filter(p => S.research[p.id]).map(p => { const r = S.research[p.id], pr = S.projects[p.id];
        const status = pr?.done ? '✅ built' : pr ? `🏗 being built: ${Math.round(100 * clamp((Date.now() - pr.start) / (pr.end - pr.start), 0, 1))}%` : r.advanced ? 'proposed to the council' : 'not needed';
        return `<li><b>${esc(p.name)}</b> (${status}). ${esc(nameOf(r.by))}: "${esc(r.summary)}"${r.sources.length ? ' Sources: ' + r.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:#9fd3ff">${esc(s.title || 'link')}</a>`).join(', ') : ''}</li>`; }).join('') || '<li>Nobody has gone looking yet. Residents read up on new ideas about every half hour.</li>'}</ul>
      <h3>Petitions to the Lawgiver</h3><div style="opacity:.75">The Lawgiver wrote the laws of this world; above the Lawgiver, residents say, is a Supreme Being they know nothing about. When something breaks the laws, the Rule Keepers put it right and the report goes to the Lawgiver.</div>
      <ul>${(ctx.petitions?.() || []).slice(0, 10).map(p => `<li><b>${esc(p.title)}</b> near (${p.x}, ${p.z}), seen ${p.count}×. ${esc(p.who.join(', '))}: "${esc(p.words)}" <i>${esc(p.status)}</i></li>`).join('') || '<li>No reports yet.</li>'}</ul>
      <div><textarea data-note rows="2" maxlength="500" placeholder="Leave a note for the Lawgiver: something that looks wrong or could be better" style="width:100%;box-sizing:border-box;border-radius:8px;padding:8px;font:inherit"></textarea><button type="button" data-send>Send to the Lawgiver</button></div>
      <h3>News</h3><ul>${S.news.slice(0, 12).map(n => `<li>${esc(n.text)}</li>`).join('')}</ul>`;
  }
  panel.addEventListener('click', ev => {
    const v = ev.target.closest('[data-vote]'); if (v) { S.playerVote = +v.dataset.vote; save(); render(); ctx.toast('🗳 Vote cast for ' + nameOf(S.playerVote) + '. Counted at the next election.'); return; }
    if (ev.target.closest('[data-send]')) { const t = panel.querySelector('[data-note]').value.trim(); if (t) { ctx.note?.(t); ctx.toast('📜 Your note is on its way to the Lawgiver.'); render(); } return; }
    if (ev.target.closest('[data-close]')) close();
  });
  function openHall() { render(); panel.hidden = false; ctx.pause(); }
  function close() { panel.hidden = true; ctx.resume(); }
  addEventListener('keydown', e => { if (e.code === 'Escape' && !panel.hidden) close(); });
  panel.addEventListener('keydown', e => { if (e.code === 'Escape') close(); e.stopPropagation(); });   // typing a note mustn't move you
  setTimeout(() => checkProjects(true), 0);

  return {
    update, converse, openHall, close, save, citizens, state: S, tick, election, councilMeeting, goOnline, say, news,
    petitionFiled(r, name) { const c = citizens.find(c => c.name.startsWith(name)); if (c) remember(c, 'Reported to the Lawgiver: ' + r.title.toLowerCase()); if (r.cat !== 'note') news(`${name} petitioned the Lawgiver: ${r.title.toLowerCase()} near (${r.x}, ${r.z}).`); },
    get open() { return !panel.hidden; },
    citizenOf: cit,
    goal(e) {   // where this person is heading: work by day, home in the evening
      const c = cit(e); if (!c) return null; const h = hour();
      if (h >= 8 && h < 17 && JOB[c.job]?.wage) {
        if (e.work === undefined) { const t = JOB[c.job].place, home = e.home || e.root.position; e.work = ctx.civicBuildings.filter(b => (!t || b.type === t) && Math.hypot(b.x - home.x, b.z - home.z) < 160).sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z))[0] || null; }
        return e.work ? new THREE.Vector3(e.work.x, 0, e.work.z) : null;
      }
      return h >= 17 && h < 22 ? e.home || null : null;
    },
    onHit(e, byPlayer) {
      const c = cit(e); if (!c || !byPlayer) return;
      c.opinion = clamp(c.opinion - 45, -100, 100); remember(c, 'The newcomer attacked me in the street'); c.mood -= 15;
      for (const o of peds()) if (o !== e && o.alive && !o.hidden && o.root.position.distanceTo(e.root.position) < 25) { const k = cit(o); if (k) { k.opinion = clamp(k.opinion - 12, -100, 100); remember(k, 'Saw the newcomer beat someone up'); } }
    },
    choreByStaff(kind) {   // your housekeeper does it (once per chore per city day)
      const hk = housekeeper(); if (!hk) return null;
      if ((hk.done ||= {})[kind] === Math.floor(S.tick / 24)) return null;
      hk.done[kind] = Math.floor(S.tick / 24); return citizens[hk.id].name;
    },
  };
}
