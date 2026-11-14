// BUSINESS LAW — A.T.'s rules on doing business, taken from how real countries do it, and the bodies that
// enforce them. Each regulator is a public body staffed by resident INSPECTORS (they need the regulatory
// inspection certificate; see education.js); the more inspectors and the better they are, the more they
// catch. Firms break rules by their nature (some are honest, some cut corners) and under pressure (a firm
// running out of money cuts more corners). Nothing is decided at random against the evidence: a firm is
// only punished for a breach it actually committed and an inspector actually found.
//
// THE RULES (with the real-world law each is modelled on):
export const RULES = [
  { id: 'register', name: 'Register the business', like: 'UK Companies Act 2006 / Companies House', by: 'A.T. Companies Registry', base: .002, sev: 1, about: 'Every business must be registered, file its accounts every year and keep its records honest.' },
  { id: 'tax', name: 'Pay your taxes', like: 'corporation tax, VAT and PAYE (HMRC)', by: 'A.T. Revenue & Customs', base: .004, sev: 3, about: 'Profits are taxed; sales tax is collected for the state; wages are taxed at source. Hiding profits is tax evasion: a crime.' },
  { id: 'wage', name: 'Minimum wage and fair work', like: 'National Minimum Wage Act, Working Time Regulations', by: 'A.T. Revenue & Customs', base: .003, sev: 2, about: 'Every worker gets at least the minimum wage, paid holidays and limits on hours; nobody is sacked unfairly.' },
  { id: 'safety', name: 'Health and safety at work', like: 'Health and Safety at Work Act 1974 (HSE)', by: 'Health & Safety Executive', base: .004, sev: 2, about: 'Employers must keep workers and the public safe: guards on machines, safe sites, training.' },
  { id: 'consumer', name: 'Safe and honest goods', like: 'Consumer Rights Act 2015, Trading Standards', by: 'Trading Standards', base: .003, sev: 2, about: 'What is sold must be safe, as described and fit for purpose; misleading adverts are banned.' },
  { id: 'cartel', name: 'Compete fairly', like: 'Competition Act 1998 (the CMA), EU competition law', by: 'Competition & Markets Authority', base: .0008, sev: 4, needsPartner: true, about: 'Rivals may not fix prices or share out markets. Fines up to 10% of the firm\'s value; directors can be banned.' },
  { id: 'bribery', name: 'No bribes', like: 'Bribery Act 2010', by: 'Serious Fraud Office', base: .0006, sev: 5, about: 'Offering or paying a bribe to win business (or a public official\'s favour) is a crime for the person and the company.' },
  { id: 'finance', name: 'Treat customers\' money properly', like: 'Financial Services and Markets Act 2000 (FCA)', by: 'Financial Conduct Authority', base: .002, sev: 3, sector: 'finance', about: 'Banks and insurers must be authorised, hold enough capital and not mis-sell.' },
  { id: 'environment', name: 'Permits for pollution', like: 'Environmental Permitting Regulations (Environment Agency)', by: 'Environment Agency', base: .003, sev: 2, sectors: ['manufacturing', 'resources', 'energy', 'automotive', 'construction'], about: 'Factories, mines and power plants need a permit, and must stay inside its limits on what they release.' },
];
// mergers: a takeover that would give one firm more than this share of its industry is blocked
export const MERGER_LIMIT = .4;
export const REGULATORS = [...new Set(RULES.map(r => r.by))];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createBusinessLaw({ S, citizens, firms, news = () => { }, remember = () => { }, history = null, charge = () => null, hire = () => null, rand = Math.random }) {
  const L = S.bizlaw ||= { cases: [], fines: 0, warnings: 0, suspensions: 0, prosecutions: 0, blocked: 0, approved: 0, inspections: 0, found: 0 };
  const rule = id => RULES.find(r => r.id === id);
  const regulator = name => firms.list().find(f => f.name === name);
  const inspectorsOf = reg => citizens.filter(c => !c.dead && !c.jail && c.job === 'Inspector' && c.employer === reg.id);
  const applies = (r, f) => (!r.sector || r.sector === f.sector) && (!r.sectors || r.sectors.includes(f.sector)) && (!r.needsPartner || f.partners.length) && f.type !== 'public' && !f.institution;
  // firms break rules by their nature and under pressure; the breach is real and stays on file until found
  function breaches() {
    for (const f of firms.list()) {
      if (f.type === 'public' || f.institution) continue;
      const pressure = f.cash < 0 ? 2.5 : f.cash < 500 ? 1.6 : 1;
      for (const r of RULES) if (applies(r, f) && !(f.hidden ||= []).some(b => b.rule === r.id) && rand() < r.base * (1 - f.ethics) * 4 * pressure) {
        f.hidden.push({ rule: r.id, at: S.tick || 0 });
        if (r.id === 'tax') f.evading = true;
      }
    }
  }
  // each regulator's inspectors visit the firms most likely to be breaking its rules (past record, size,
  // money trouble, a tip-off from a worker); what they find, they act on
  function inspect() {
    for (const name of REGULATORS) {
      const reg = regulator(name); if (!reg) continue;
      const team = inspectorsOf(reg);
      const visits = Math.min(12, team.length * 2 + (S.budget?.police || .2) * 2);
      if (!visits) continue;
      const rules = RULES.filter(r => r.by === name);
      const pool = firms.list().filter(f => rules.some(r => applies(r, f)));
      const risk = f => (1 + f.strikes) * (f.cash < 0 ? 2 : 1) * (f.scale === 'national' ? 1.5 : 1) * (1.2 - f.ethics) + ((f.hidden || []).some(b => rules.some(r => r.id === b.rule)) && rand() < .15 ? 3 : 0);   // a whistle-blower
      const targets = pool.map(f => [risk(f) * (.5 + rand()), f]).sort((a, b) => b[0] - a[0]).slice(0, Math.ceil(visits)).map(x => x[1]);
      const skill = team.length ? team.reduce((a, c) => a + (c.skills?.Inspector || 30), 0) / team.length : 30;
      for (const f of targets) {
        L.inspections++;
        const who = team[Math.floor(rand() * team.length)];
        if (who) { who.skills ||= {}; who.skills.Inspector = Math.min(100, (who.skills.Inspector || 30) + .2); }
        for (const b of (f.hidden || []).filter(b => rules.some(r => r.id === b.rule))) {
          if (rand() > clamp(.35 + skill / 150, .3, .95)) continue;   // missed it this time
          f.hidden = f.hidden.filter(x => x !== b); L.found++;
          act(f, rule(b.rule), reg, who);
        }
      }
    }
  }
  // what happens when a breach is found: it gets more serious with the rule and with the firm's record
  function act(f, r, reg, who) {
    f.strikes++;
    const level = r.sev + f.strikes - 1;
    const k = { at: S.tick || 0, firm: f.name, firmId: f.wid, rule: r.name, like: r.like, by: reg.name, inspector: who?.name || null, outcome: '' };
    if (r.id === 'tax') f.evading = false;
    if (level <= 1) { k.outcome = 'warning'; L.warnings++; f.licence = f.licence === 'good' ? 'warned' : f.licence; }
    else {
      // fines scale with turnover (a cartel: up to 10% of a year's, as competition law allows)
      const fine = Math.round(clamp((f.lastRevenue || 60) * (r.id === 'cartel' ? 7.5 * .1 * 10 : 1.5) * level, 50, 2e4));
      f.cash -= fine; S.treasury = (S.treasury || 0) + fine; L.fines += fine; k.outcome = `fined ${fine.toLocaleString()} gold`;
      if (level >= 4 && f.type !== 'sole trader') { f.licence = 'suspended'; f.suspendedUntil = (S.tick || 0) + 24 * (3 + level); L.suspensions++; k.outcome += `, licence suspended for ${3 + level} city days`; }
      // crimes: the person responsible goes to court (justice.js decides on the evidence)
      if (['tax', 'bribery'].includes(r.id) || (r.id === 'cartel' && level >= 5)) {
        const boss = f.owner != null ? citizens[f.owner] : citizens.find(c => c.employer === f.id && !c.dead && !c.jail && (c.title || '').startsWith('Senior')) || citizens.find(c => c.employer === f.id && !c.dead && !c.jail);
        if (boss) { charge(boss, r.id === 'bribery' ? 'corruption' : 'fraud', { cctv: false, witnesses: [{ reliability: .85, why: 'the inspector\'s evidence' }] }); remember(boss, `Prosecuted after ${reg.name} found ${f.name} breaking the law`); k.outcome += `; ${boss.name} charged`; L.prosecutions++; }
      }
    }
    L.cases.unshift(k); L.cases.length = Math.min(L.cases.length, 80);
    if (level >= 3 || f.scale === 'national') news(`⚖️ ${reg.name}: ${f.name} ${k.outcome} (${r.name.toLowerCase()}).`, level >= 4);
    if (level >= 4) history?.record('business', `${f.name} ${k.outcome}`, `${reg.name} found it breaking the rule "${r.name}" (${r.like})`, { who: f.name, where: f.home });
  }
  // the competition authority reviews takeovers (firms.js asks before one goes ahead)
  function review(buyer, target, shareAfter) {
    const ok = shareAfter <= MERGER_LIMIT;
    if (ok) { L.approved++; news(`🏢 Takeover approved: ${buyer.name} buys ${target.name}.`); }
    else { L.blocked++; news(`⛔ Competition & Markets Authority blocks ${buyer.name}'s takeover of ${target.name}: it would control ${Math.round(shareAfter * 100)}% of ${target.sector}.`, true); }
    L.cases.unshift({ at: S.tick || 0, firm: buyer.name, firmId: buyer.wid, rule: 'Merger review', like: 'Enterprise Act 2002 (CMA)', by: 'Competition & Markets Authority', outcome: ok ? `takeover of ${target.name} approved` : `takeover of ${target.name} blocked (${Math.round(shareAfter * 100)}% share)` });
    return ok;
  }
  // regulators keep enough inspectors: about one for every twenty firms they watch, hired from people
  // who hold the certificate (or sent to train for it)
  function staff() {
    for (const name of REGULATORS) {
      const reg = regulator(name); if (!reg) continue;
      const watched = firms.list().filter(f => RULES.some(r => r.by === name && applies(r, f))).length;
      const want = Math.max(1, Math.round(watched / 20 * (.5 + (S.budget?.police || .2) * 2)));
      if (inspectorsOf(reg).length < want && (S.treasury || 0) > 0) hire(reg);
    }
  }
  function daily() { breaches(); inspect(); if ((S.tick || 0) % (24 * 5) === 0) staff(); }
  return { L, RULES, daily, review, staff, inspectorsOf, regulator };
}
