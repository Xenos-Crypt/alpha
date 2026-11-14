// JUSTICE — an arrest is the start, not the end. Every charge goes to trial before a judge (a resident with
// their own philosophy: some strict, some lenient). The case rests on EVIDENCE: witnesses (each with a
// reliability: a good view, a bad memory, a grudge), CCTV, what the police found. The defendant has a lawyer:
// a hired one if they can afford it (lawyers have skill and reputation), a public defender if not.
// Courts can get it wrong, but never at random: a wrongful conviction always has a cause on record (one
// unreliable witness, a mistaken identity, a weak defence), and a good lawyer or new evidence can win an
// APPEAL. There are civil cases too: evictions, property disputes, companies suing each other.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const OFFENCES = { theft: { name: 'theft', serious: false, years: [24, 72], fine: 80 }, fraud: { name: 'fraud', serious: true, years: [72, 200], fine: 300 }, vandalism: { name: 'vandalism', serious: false, years: [12, 36], fine: 50 }, corruption: { name: 'corruption', serious: true, years: [120, 360], fine: 1000 }, assault: { name: 'assault', serious: true, years: [72, 160], fine: 200 } };

export function createJustice({ citizens, S, news, remember, lives, ctx }) {
  const J = S.justice ||= { cases: [], next: 1, wrongful: 0, overturned: 0 };
  const people = job => citizens.filter(c => !c.dead && !c.jail && c.job === job);
  const strictness = j => clamp(.5 + j.order * .35 - j.traits.kindness * .2, 0, 1);
  // a charge: the police bring someone in, with whatever evidence there is
  function charge(c, offence, { witnesses = [], cctv = false, culprit = null } = {}) {
    if (!c || c.dead) return;
    const o = OFFENCES[offence] || OFFENCES.theft;
    const ws = witnesses.length ? witnesses : Array.from({ length: Math.random() < .6 ? 1 : 2 }, () => ({ reliability: clamp(.35 + Math.random() * .6, 0, 1), why: ['saw it clearly', 'saw it from across the street', 'only caught a glimpse', 'has a grudge against the accused'][Math.floor(Math.random() * 4)] }));
    const k = { id: J.next++, at: S.tick, defendant: c.id, offence, guilty: culprit == null || culprit === c.id, culprit, witnesses: ws, cctv: cctv || (S.laws?.cctv && Math.random() < .6), state: 'awaiting trial', trialAt: S.tick + 24 + Math.floor(Math.random() * 24) };
    c.jail = Math.max(c.jail || 0, 48); remember(c, `Charged with ${o.name}${k.guilty ? '' : ' (I didn\'t do it!)'}`);
    J.cases.unshift(k); J.cases.length = Math.min(J.cases.length, 120);
    return k;
  }
  function trial(k) {
    const c = citizens[k.defendant]; if (!c || c.dead) { k.state = 'closed (defendant died)'; return; }
    const o = OFFENCES[k.offence];
    const judges = people('Judge'), judge = judges[Math.floor(Math.random() * judges.length)] || citizens.find(x => x.job === 'Lawyer' && !x.dead);
    const lawyers = people('Lawyer').sort((a, b) => (b.skills?.Lawyer || 0) - (a.skills?.Lawyer || 0));
    const hired = c.wealth > 300 && lawyers.length ? lawyers[Math.floor(Math.random() * Math.min(3, lawyers.length))] : null;
    const lawyerSkill = hired ? (hired.skills?.Lawyer || 30) : 30;   // public defenders are stretched thin
    if (hired) { const fee = Math.min(c.wealth * .3, 200); c.wealth -= fee; hired.wealth += fee; lives.practise(hired, 'Lawyer', 2); }
    // the evidence: witnesses weigh by their reliability; CCTV and real guilt (what the police found) count most
    const wit = k.witnesses.reduce((n, w) => n + w.reliability * .25, 0), physical = (k.guilty ? .35 : .05) + (k.cctv ? (k.guilty ? .3 : -.2) : 0) + (S.budget?.police || .2) * .3;
    const evidence = clamp(wit + physical, 0, 1), strict = judge ? strictness(judge) : .5;
    const pGuilty = clamp(evidence * (.8 + strict * .4) - lawyerSkill / 250, .02, .98);
    const convicted = Math.random() < pGuilty;
    k.judge = judge?.id; k.lawyer = hired?.id ?? null; k.evidence = Math.round(evidence * 100); k.convicted = convicted;
    if (convicted) {
      const sentence = o.years[0] + Math.floor(Math.random() * (o.years[1] - o.years[0]));
      if (!o.serious && evidence < .55 && Math.random() < .5) { k.sentence = `fined ${o.fine} gold`; c.wealth = Math.max(0, c.wealth - o.fine); c.jail = 0; }
      else { k.sentence = `${Math.round(sentence / 24)} city days in prison`; c.jail = sentence; }
      c.knowsCrook = true; c.convictions = (c.convictions || 0) + 1;
      if (!k.guilty) {   // a miscarriage of justice, with its cause on record
        J.wrongful++;
        const weakest = k.witnesses.slice().sort((a, b) => a.reliability - b.reliability)[0];
        k.cause = k.witnesses.length === 1 && weakest.reliability < .6 ? `convicted on one unreliable witness who ${weakest.why}` : !hired ? 'an overstretched public defender' : 'a mistaken identity';
        remember(c, `Wrongly convicted of ${o.name}`); c.mood -= 30;
      }
      k.state = 'guilty: ' + k.sentence;
      if (o.serious || Math.random() < .25) news(`⚖️ ${c.name} found guilty of ${o.name} and ${k.sentence}${judge ? ` by Judge ${judge.name.split(' ')[1] || judge.name}` : ''}.`);
      if (!k.guilty || evidence < .5) k.appealAt = S.tick + 72;
    } else {
      c.jail = 0; k.state = k.guilty ? 'not guilty (the evidence was too thin)' : 'not guilty';
      remember(c, `Found not guilty of ${o.name}`);
      if (o.serious) news(`⚖️ ${c.name} cleared of ${o.name}.`);
    }
    if (hired) { lives.practise(hired, 'Lawyer', 1); if (!convicted) lives.achieve(hired, 'Won a case'); }
    if (judge) lives.practise(judge, 'Judge', 1);
  }
  function appeal(k) {
    const c = citizens[k.defendant]; if (!c || c.dead || !k.convicted) return;
    const lawyer = citizens[k.lawyer], skill = lawyer ? (lawyer.skills?.Lawyer || 30) : 30, newEvidence = !k.guilty && Math.random() < .4;
    k.appealAt = null;
    if (Math.random() < (newEvidence ? .7 : 0) + skill / 300 + (k.evidence < 40 ? .2 : 0)) {
      k.state = 'overturned on appeal' + (newEvidence ? ' (new evidence)' : ''); k.convicted = false; c.jail = 0; J.overturned++;
      if (!k.guilty) { c.wealth += 300; remember(c, 'My conviction was overturned. They paid me compensation.'); news(`⚖️ Appeal court frees ${c.name}: ${k.cause || 'the conviction was unsafe'}.`, true); }
    } else k.state += ' (appeal refused)';
  }
  // civil cases: no prison, but someone pays
  function civil(kind, a, b) {
    if (!a || !b) return;
    const k = { id: J.next++, at: S.tick, civil: kind, plaintiff: a.id, defendant: b.id, state: '' };
    const win = Math.random() < (kind === 'eviction' ? .75 : .5);
    k.state = `${kind}: ${win ? a.name + ' won' : b.name + ' won'}`;
    if (kind !== 'eviction') { const amt = 50 + Math.floor(Math.random() * 200); (win ? a : b).wealth += amt; (win ? b : a).wealth = Math.max(0, (win ? b : a).wealth - amt); }
    J.cases.unshift(k); J.cases.length = Math.min(J.cases.length, 120);
  }
  function hourly() {
    for (const k of J.cases) { if (k.state === 'awaiting trial' && S.tick >= k.trialAt) trial(k); else if (k.appealAt && S.tick >= k.appealAt) appeal(k); }
    if (S.tick % 24 === 12 && Math.random() < .15 && S.companies?.length > 1) {   // companies sue each other
      const [x, y] = S.companies.slice().sort(() => Math.random() - .5);
      const win = Math.random() < .5; const amt = Math.round(Math.min(x.value, y.value) * .02);
      (win ? x : y).value += amt; (win ? y : x).value -= amt;
      J.cases.unshift({ id: J.next++, at: S.tick, civil: 'corporate lawsuit', state: `${x.name} v ${y.name}: ${(win ? x : y).name} won ${amt.toLocaleString()} gold` });
      news(`⚖️ ${x.name} v ${y.name}: the court sided with ${(win ? x : y).name}.`);
    }
  }
  return { charge, civil, hourly, OFFENCES, J };
}
