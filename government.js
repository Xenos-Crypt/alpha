// GOVERNMENT OF A.T. — President, cabinet, mayors, a 60-seat National Assembly, twelve parties,
// elections every two city years (or sooner if the government keeps failing), a secret ballot, and the
// player's own political career: join a party (the three major ones only by invitation), run for Mayor
// or President, and govern if you win.
//
// Corruption depends on the stage of a politician's career: newcomers are mostly clean, but the longer
// someone holds power, and the higher the office, the more a dishonest streak shows.
import { PARTIES, CITIES, TERM, YEAR, partyOf } from './nation.js';

const SEATS = 60, MEETING = 20;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DEPOSIT = { President: 50000, Mayor: 5000 };
export const INVITE = { assets: 1e9, gold: 5e6, fame: 60, connections: 3 };

export function createGovernment(api) {
  const { citizens, S, news, remember, nameOf, ctx } = api;
  S.gov ||= {};
  const G = S.gov;
  G.mayors ||= {}; G.cabinet ||= []; G.seats ||= {}; G.power ||= {}; G.player ||= { party: null, invites: [], running: null, office: null };
  G.lastElection ??= 0; G.low ??= 0;
  const P = G.player;
  const party = c => c ? (c.party ??= partyOf(c)) : null;
  const officials = () => [G.president, ...G.cabinet, ...Object.values(G.mayors)].filter(i => i >= 0 && citizens[i]).map(i => citizens[i]);
  const office = id => id === G.president ? 'President' : G.cabinet.includes(id) ? 'Minister' : Object.entries(G.mayors).find(([, m]) => m === id)?.[0] ? 'Mayor of ' + Object.entries(G.mayors).find(([, m]) => m === id)[0] : null;
  const keen = (filter, n, not = []) => citizens.filter(c => c.age >= 28 && c.traits.ambition > .55 && !c.jail && !c.knowsCrook && !not.includes(c.id) && filter(c)).sort((a, b) => b.charisma + b.traits.ambition - a.charisma - a.traits.ambition).slice(0, n).map(c => c.id);
  const presidentParty = () => G.president === 'player' ? P.party : party(citizens[G.president]);

  function found() {
    const big = PARTIES.filter(p => p.major);
    const first = big[Math.floor(Math.random() * 3)];
    G.president = keen(c => party(c) === first.id, 1)[0];
    G.cabinet = keen(c => party(c) === first.id, 4, [G.president]);
    for (const city of CITIES) G.mayors[city] = keen(c => c.city === city, 1, [G.president, ...G.cabinet])[0];
    partyVote(true);
    news(`${nameOf(G.president)} (${first.short}) is President of A.T. Mayors: ${CITIES.map(c => `${c} – ${nameOf(G.mayors[c])}`).join(', ')}.`);
  }

  // ---- votes -----------------------------------------------------------------------------------------
  const fameK = () => clamp(S.fame / 60, 0, 1);
  function likesPlayer(c) { return (c.opinion / 40) * fameK() - (S.fame < 15 ? 1.5 : 0); }
  function partyVote(quiet) {
    const votes = PARTIES.map(() => 0), presParty = presidentParty();
    for (const c of citizens) {
      if (c.jail || c.age < 18) continue;
      let best = 0, bs = -1e9;
      for (const p of PARTIES) {
        let u = -Math.abs(p.econ - c.econ) - Math.abs(p.order - c.order) + (party(c) === p.id ? 1 : 0) + (p.major ? .3 : 0) + (Math.random() - .5) * .6;
        if (p.id === presParty) u += (S.approval - 50) / 40;
        if (P.party === p.id) u += likesPlayer(c) * .5;
        if (u > bs) { bs = u; best = p.id; }
      }
      votes[best]++;
    }
    // 60 seats, shared out by largest remainder
    const total = votes.reduce((a, b) => a + b, 0) || 1, quota = votes.map(v => v / total * SEATS), seats = quota.map(Math.floor);
    let left = SEATS - seats.reduce((a, b) => a + b, 0);
    for (const i of quota.map((q, i) => [q - Math.floor(q), i]).sort((a, b) => b[0] - a[0]).map(x => x[1])) { if (left-- <= 0) break; seats[i]++; }
    G.seats = Object.fromEntries(seats.map((s, i) => [i, s]));
    G.partyVotes = votes;
    if (!quiet) news(`ASSEMBLY: ${PARTIES.map((p, i) => [p, seats[i]]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(([p, s]) => `${p.short} ${s}`).join(', ')}.`);
  }
  function runRace(cands, voters, label) {   // cands: [{id | 'player', party}]
    const tally = cands.map(() => 0);
    for (const c of voters) {
      if (c.jail || c.age < 18) continue;
      let best = 0, bs = -1e9;
      cands.forEach((k, i) => {
        const pp = PARTIES[k.party] || { econ: 0, order: 0 };
        let u;
        if (k.id === 'player') u = -Math.abs(pp.econ - c.econ) - Math.abs(pp.order - c.order) + likesPlayer(c) + fameK() * .6 + (party(c) === k.party ? .8 : 0);
        else { const o = citizens[k.id]; u = -Math.abs(o.econ - c.econ) - Math.abs(o.order - c.order) + o.charisma * .6 + (party(c) === k.party ? 1 : 0) + (k.party != null && PARTIES[k.party].major ? .25 : 0) - (o.knowsCrook ? 2 : 0); if (k.id === G.president || G.mayors[label] === k.id) u += (S.approval - 50) / 30; }
        u += (Math.random() - .5) * .8;
        if (u > bs) { bs = u; best = i; }
      });
      tally[best]++;
    }
    if (label === 'President' && G.ballot != null && G.ballot < tally.length) tally[G.ballot]++;   // your own (secret) vote
    return cands.map((k, i) => ({ ...k, votes: tally[i] })).sort((a, b) => b.votes - a.votes);
  }
  const candName = k => k.id === 'player' ? 'You (the newcomer)' : nameOf(k.id);
  function presidentialField() {
    const field = [], taken = [];
    for (const p of PARTIES.filter(p => p.major)) {
      const inc = G.president !== 'player' && party(citizens[G.president]) === p.id && !citizens[G.president]?.jail ? G.president : null;
      const id = inc ?? keen(c => party(c) === p.id, 1, taken)[0];
      if (id != null) { field.push({ id, party: p.id }); taken.push(id); }
    }
    const minors = PARTIES.filter(p => !p.major).sort((a, b) => (G.seats[b.id] || 0) - (G.seats[a.id] || 0)).slice(0, 2);
    for (const p of minors) { const id = keen(c => party(c) === p.id, 1, taken)[0]; if (id != null) { field.push({ id, party: p.id }); taken.push(id); } }
    if (P.running === 'President') field.push({ id: 'player', party: P.party });
    return field;
  }
  G.field ||= null;
  function election(snap) {
    G.lastElection = S.tick; G.low = 0; G.snapAt = null;
    partyVote(false);
    const field = G.field || presidentialField();
    const res = runRace(field, citizens, 'President'), win = res[0], old = G.president;
    G.lastResult = res.map(r => [candName(r), r.party != null ? PARTIES[r.party].short : 'Ind.', r.votes]);
    news(`${snap ? 'SNAP ' : ''}ELECTION: ${candName(win)} (${win.party != null ? PARTIES[win.party].short : 'independent'}) ${win.id === old ? 're-elected' : 'elected'} President with ${win.votes} votes. ${res.slice(1).map(r => candName(r) + ' ' + r.votes).join(', ')}.`, true);
    // winners and losers: lost elections count against an ambition to hold office
    for (const x of res) { if (x.id === 'player') { if (x === win) api.lives?.achieve(null, 'Elected President'); continue; } const o = citizens[x.id]; if (!o) continue; if (x === win) api.lives?.achieve(o, 'Elected President', true); else if (o.ambition === 'office') { o.failures = (o.failures || 0) + 1; remember(o, 'Lost the election for President'); if (o.failures >= 3) api.lives?.giveUp(o); } }
    G.president = win.id;
    if (old === 'player' && win.id !== 'player') { P.office = null; news('You are no longer President.', true); }
    if (win.id === 'player') { P.office = 'President'; news('🎉 You are the President of A.T.! Propose laws to the Assembly from the Politics tab.', true); }
    const wp = win.party;
    G.cabinet = keen(c => party(c) === wp, 4, [win.id]).slice(0, 4);
    for (const city of CITIES) {
      const local = citizens.filter(c => c.city === city);
      const cands = keen(c => c.city === city, 2, [win.id, ...G.cabinet]).map(id => ({ id, party: party(citizens[id]) }));
      if (P.running === 'Mayor:' + city) cands.push({ id: 'player', party: P.party });
      if (!cands.length) continue;
      const r = runRace(cands, local, city), w = r[0];
      if (G.mayors[city] === 'player' && w.id !== 'player') P.office = P.office === 'Mayor of ' + city ? null : P.office;
      G.mayors[city] = w.id;
      if (w.id === 'player') { P.office = 'Mayor of ' + city; news(`🎉 You are now Mayor of ${city}.`, true); api.lives?.achieve(null, 'Elected Mayor of ' + city); }
      else if (citizens[w.id]) api.lives?.achieve(citizens[w.id], 'Elected Mayor of ' + city, false);
    }
    // deposits back if you got a tenth of the vote
    if (P.running) { const me = res.find(r => r.id === 'player'); const kind = P.running.startsWith('Mayor') ? 'Mayor' : 'President'; if (kind === 'President' && me && me.votes / res.reduce((a, r) => a + r.votes, 0) >= .1) { ctx.addGold(DEPOSIT.President); news('Your election deposit was returned.'); } if (kind === 'Mayor' && P.office) ctx.addGold(DEPOSIT.Mayor); }
    P.running = null; G.ballot = null; G.field = null;
    for (const id of Object.keys(G.power)) if (!officials().some(o => String(o.id) === id)) delete G.power[id];
  }

  // ---- the Assembly sits every 20 city hours ------------------------------------------------------------
  function session(policies, score, apply) {
    G.rejected ||= {};
    const st = api.stats(), live = policies().filter(p => p.ok(st) && S.tick - (G.rejected[p.id] ?? -1e9) > MEETING * 4);   // a defeated bill isn't brought straight back
    if (!live.length) return;
    let p, by;
    if (G.president === 'player') { p = live.find(x => x.id === G.proposal); by = 'President (you)'; G.proposal = null; if (!p) return; }
    else {
      const pres = citizens[G.president], members = [pres, ...G.cabinet.map(i => citizens[i])].filter(Boolean);
      const corrupt = members.find(m => corruptible(m) > .75);
      const pool = live.filter(x => !x.corrupt || corrupt);
      const m = members[Math.floor(Math.random() * members.length)] || pres;
      p = pool.sort((a, b) => score(m, b) - score(m, a))[0]; by = office(m.id) + ' ' + m.name;
      if (p?.corrupt) by = office(corrupt.id) + ' ' + corrupt.name;
      if (!p) return;
    }
    // each party votes as a bloc; the President's party backs its own government
    let yes = 0;
    const presParty = presidentParty();
    for (const party of PARTIES) {
      const n = G.seats[party.id] || 0; if (!n) continue;
      const stance = p.corrupt ? -2 + (party.id === presParty && Math.random() < .35 ? 3 : 0) : score({ econ: party.econ, order: party.order, traits: { honesty: .6, ambition: .5 } }, p) + (party.id === presParty ? .6 : -.45);   // the opposition opposes
      if (stance > 0) yes += n;
    }
    const passed = yes > SEATS / 2;
    news(`Assembly: "${p.name}" ${passed ? 'PASSED' : 'rejected'} ${yes}–${SEATS - yes} (proposed by ${by}).`, passed || G.president === 'player');
    if (!passed) G.rejected[p.id] = S.tick;
    if (passed) apply(p, G.president === 'player' ? null : citizens[G.president]);
    else if (p.corrupt && Math.random() < .5) { const o = officials().find(o => corruptible(o) > .75); if (o) scandal(o, 'was caught trying to push a crooked contract through the Assembly'); }
  }
  // corruption grows with time in power and the height of the office
  function corruptible(o) {
    if (!o) return 0;
    const yrs = (G.power[o.id] || 0) / YEAR, rank = o.id === G.president ? 1.4 : G.cabinet.includes(o.id) ? 1.2 : 1;
    return (1 - o.traits.honesty) * (.45 + Math.min(1.2, yrs * .35)) * rank;
  }
  function scandal(o, what) {
    const role = office(o.id) || 'Official';
    news(`SCANDAL: ${role} ${o.name} ${what || `was caught taking ${Math.round(o.skimmed || 0)} gold from the treasury`}. Arrested.`, true);
    S.treasury += (o.skimmed || 0) * .7; o.skimmed = 0; o.jail = 120; o.knowsCrook = true;
    for (const c of citizens) c.mood -= 2;
    if (o.id === G.president) { const next = G.cabinet.shift(); G.president = next; news(`${nameOf(next)} becomes acting President.`, true); }
    else if (G.cabinet.includes(o.id)) G.cabinet[G.cabinet.indexOf(o.id)] = keen(c => party(c) === presidentParty(), 1, [G.president, ...G.cabinet])[0];
    else for (const [city, m] of Object.entries(G.mayors)) if (m === o.id) G.mayors[city] = keen(c => c.city === city, 1, [o.id])[0];
  }
  // ---- every city hour ------------------------------------------------------------------------------------
  function tick(policies, score, apply) {
    for (const o of officials()) {
      G.power[o.id] = (G.power[o.id] || 0) + 1;
      if (corruptible(o) > .75) { const skim = Math.min(Math.max(0, S.treasury) * .004, 40); S.treasury -= skim; o.wealth += skim; o.skimmed = (o.skimmed || 0) + skim; }
    }
    if (S.tick % 6 === 0) for (const o of officials()) if ((o.skimmed || 0) > 150 && Math.random() < .07 + citizens.filter(c => c.job === 'Journalist').length * .002) scandal(o);
    if (S.tick % MEETING === 0) session(policies, score, apply);
    // a failing government faces the voters early
    G.low = S.approval < 30 ? G.low + 1 : 0;
    if (G.low >= 90 && G.snapAt == null && S.tick - G.lastElection > 120) { G.snapAt = S.tick + 24; news('The Assembly passed a vote of NO CONFIDENCE in the government. A snap election will be held in one city day.', true); }
    if (G.snapAt != null && S.tick >= G.snapAt) election(true);
    else if (S.tick - G.lastElection >= TERM) election(false);
    if (S.tick % 24 === 0) { invitations(); if (P.office === 'President') ctx.addGold(2000); else if (P.office?.startsWith('Mayor')) ctx.addGold(500); }
  }
  // ---- your career --------------------------------------------------------------------------------------
  function connections(pid) { return citizens.filter(c => c.opinion >= 50 && c.metPlayer && (party(c) === pid || officials().includes(c))).length; }
  function invitations() {
    if (P.party != null && PARTIES[P.party].major) return;
    const assets = ctx.assets?.() || 0, gold = ctx.gold(), known = S.fame >= INVITE.fame;
    for (const p of PARTIES.filter(p => p.major)) {
      if (P.invites.includes(p.id)) continue;
      if (assets >= INVITE.assets && gold >= INVITE.gold && known && connections(p.id) >= INVITE.connections) { P.invites.push(p.id); news(`✉️ The ${p.name} has invited you to join.`, true); }
    }
  }
  const actions = {
    join(pid) {
      const p = PARTIES[pid]; if (!p) return 'No such party.';
      if (p.major && !P.invites.includes(pid)) return `The ${p.name} only takes members by invitation. You need ${INVITE.connections}+ connections in the party, ${fmt(INVITE.assets)} in assets, ${fmt(INVITE.gold)} in cash, and a reputation (good or bad).`;
      P.party = pid; news(`The newcomer joined the ${p.name}.`); api.lives?.achieve(null, p.major ? 'Inner circle: joined a major party' : 'Joined a party'); S.fameAcc = (S.fameAcc || 0) + (p.major ? 10 : 2); return `You joined the ${p.name}.`;
    },
    leave() { if (P.party == null) return 'You are not in a party.'; const n = PARTIES[P.party].name; P.party = null; return 'You left the ' + n + '.'; },
    run(kind, city) {
      if (P.running) return 'You are already standing in this election.';
      if (kind === 'President') {
        if (S.fame < 30) return 'Nobody knows who you are yet. You need more fame (30+) to stand for President.';
        if (P.party != null && PARTIES[P.party].major && S.fame < 50) return 'Your party will only nominate you once you are well known (fame 50+).';
      } else if (S.fame < 10) return 'You need at least a little fame (10+) to stand for Mayor.';
      const dep = DEPOSIT[kind]; if (ctx.gold() < dep) return `The deposit is ${fmt(dep)} gold.`;
      ctx.addGold(-dep); P.running = kind === 'President' ? 'President' : 'Mayor:' + city; G.field = kind === 'President' ? presidentialField() : G.field;
      S.fameAcc = (S.fameAcc || 0) + 8; news(`The newcomer is standing for ${kind === 'President' ? 'President' : 'Mayor of ' + city}${P.party != null ? ' for the ' + PARTIES[P.party].short : ' as an independent'}.`, true);
      return `You are on the ballot. Deposit paid: ${fmt(dep)} gold.`;
    },
    ballot(i) { G.ballot = i; return 'Your ballot is cast. It is secret: nobody will ever know who you voted for.'; },
    propose(id) { if (G.president !== 'player') return 'Only the President can put laws to the Assembly.'; G.proposal = id; return 'Your proposal goes to the Assembly at its next sitting.'; },
  };
  const fmt = n => n >= 1e9 ? (n / 1e9) + ' billion' : n >= 1e6 ? (n / 1e6) + ' million' : n.toLocaleString();
  return { G, P, tick, found, election, officials, office, party, scandal, corruptible, actions, presidentialField, connections, fmt, candName, get field() { return G.field || presidentialField(); } };
}
