// COMMUNITY — families and generations, illness that spreads, and homes that cost money.
//  FAMILIES: people fall in love and marry, have children (born as real new residents who grow up, go to
//    school and find work), grow old and die. What they leave — money, their home, even their grudges —
//    passes to their family.
//  DISEASE: flu and fevers pass between people who meet (friends, workmates, the same city); hospitals can
//    only treat so many, so an outbreak strains them; old age brings long-term conditions. Ill people walk
//    slower and cough.
//  HOMES: everyone lives somewhere: owners, tenants paying rent to landlords (residents who own more than one
//    home), or nobody's roof at all after an eviction. House prices and rents rise and fall with the economy,
//    the number of people and how many homes have been built. If you own property, you collect rent too.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DISEASES = { flu: { name: 'flu', spread: .06, days: 5, harm: .6 }, fever: { name: 'a fever', spread: .04, days: 4, harm: 1.2 }, cough: { name: 'a bad cough', spread: .08, days: 3, harm: .3 } };
const CHRONIC = ['a heart condition', 'diabetes', 'arthritis', 'high blood pressure', 'asthma'];

export function createCommunity({ citizens, S, news, remember, lives, makeChild, ctx }) {
  const H = S.homes ||= { price: 100, rent: 1, homeless: 0, evictions: 0, built: 0 };
  const D = S.disease ||= { cases: 0, deaths: 0, strain: 0, outbreaks: 0 };
  const F = S.families ||= { marriages: 0, births: 0, deaths: 0 };
  const byId = i => citizens[i];
  const alive = c => c && !c.dead;

  // ---- setting up a world that already has families and homes ---------------------------------------
  function seed() {
    if (S.communitySeeded) return;
    S.communitySeeded = true;
    const singles = citizens.filter(c => c.age >= 24 && c.age < 70);
    for (let i = 0; i + 1 < singles.length; i += 2) {
      const a = singles[i], b = singles[i + 1];
      if (a.city !== b.city || ((a.id * 31 + b.id) % 10) > 4) continue;
      a.family ||= { children: [] }; b.family ||= { children: [] }; a.family.partner = b.id; b.family.partner = a.id;
    }
    for (const c of citizens) {
      c.family ||= { children: [] };
      // homes: the well-off own (some own more than one and let them), most rent
      c.home = c.wealth > 380 ? 'owner' : 'tenant';
    }
    const landlords = citizens.filter(c => c.home === 'owner' && c.wealth > 420);
    for (const c of citizens) if (c.home === 'tenant') c.landlord = landlords.length ? landlords[c.id % landlords.length].id : null;
    for (const c of citizens) if (c.age > 55 && (c.id % 7) === 0) c.illnesses = [...(c.illnesses || []), CHRONIC[c.id % CHRONIC.length]];
  }
  seed();

  // ---- every city hour: illness spreads ----------------------------------------------------------------
  function hourly() {
    const sick = citizens.filter(c => alive(c) && c.sick);
    D.cases = sick.length;
    const capacity = 10 + citizens.filter(c => alive(c) && ['Doctor', 'Nurse'].includes(c.job)).length * 2 + (S.budget?.health || .2) * 40;
    D.strain = clamp(sick.length / capacity, 0, 3);
    for (const c of sick) {
      const d = DISEASES[c.sick.kind];
      // passes to people they meet: their family, and others in the same city
      const contacts = [c.family?.partner, ...(c.family?.children || [])].map(byId).filter(alive);
      for (let k = 0; k < 2; k++) { const o = citizens[Math.floor(Math.random() * citizens.length)]; if (alive(o) && o.city === c.city) contacts.push(o); }
      for (const o of contacts) if (!o.sick && !o.immune && Math.random() < d.spread * (S.laws?.vaccination ? .35 : 1) * (S.laws?.masks ? .6 : 1)) infect(o, c.sick.kind);
      c.health = clamp(c.health - d.harm * (1 + D.strain * .5) / 24, 0, 100);
      c.sick.left -= 1 / 24;
      if (c.sick.left <= 0) { c.illnesses = (c.illnesses || []).filter(x => x !== d.name); c.sick = null; c.immune = 10; remember(c, 'Got over ' + d.name); }
    }
    if (D.strain > 1 && S.tick % 24 === 0) news(`🏥 Hospitals are overwhelmed: ${sick.length} people ill and not enough doctors and nurses.`, true);
  }
  function infect(c, kind) { c.sick = { kind, left: DISEASES[kind].days * (.7 + Math.random() * .6) }; c.illnesses = [...new Set([...(c.illnesses || []), DISEASES[kind].name])]; }

  // ---- every city day: love, births, ageing, death, rent ------------------------------------------------
  function daily() {
    // a new illness arrives now and then
    if (Math.random() < .12) { const kinds = Object.keys(DISEASES), kind = kinds[Math.floor(Math.random() * kinds.length)], first = citizens.filter(alive)[Math.floor(Math.random() * citizens.length * .9)]; if (first) { infect(first, kind); D.outbreaks++; if (Math.random() < .5) news(`Doctors report a few cases of ${DISEASES[kind].name} in ${first.city}.`); } }
    for (const c of citizens) {
      if (!alive(c)) continue;
      if (c.immune) c.immune--;
      // long-term conditions come with age
      if (c.age > 60 && Math.random() < .002) { c.illnesses = [...new Set([...(c.illnesses || []), CHRONIC[Math.floor(Math.random() * CHRONIC.length)]])]; c.health -= 5; }
      c.health = clamp(c.health + (c.sick ? 0 : .3) - (c.age > 70 ? .15 : 0) - (c.illnesses?.some(x => CHRONIC.includes(x)) ? .05 : 0) - (c.hunger < 20 ? .5 : 0), 0, 100);
      // death: very old age or a body that has given out
      const risk = (c.age > 80 ? (c.age - 80) * .0015 : 0) + (c.health < 10 ? .05 : 0) + (c.sick && D.strain > 1.5 ? .01 : 0);
      if (Math.random() < risk) { die(c); continue; }
      // love: single adults who get on with people find someone
      if (!c.family.partner && c.age >= 20 && c.age < 75 && Math.random() < .004 * (.5 + c.traits.sociability)) {
        const p = citizens.find(o => alive(o) && o !== c && !o.family?.partner && o.city === c.city && Math.abs(o.age - c.age) < 12 && o.age >= 20 && Math.random() < .05);
        if (p) { c.family.partner = p.id; p.family.partner = c.id; F.marriages++; for (const x of [c, p]) { remember(x, `Married ${x === c ? p.name : c.name}`); lives.achieve(x, 'Married'); x.mood += 12; } if (Math.random() < .4) news(`💍 ${c.name} and ${p.name} got married in ${c.city}.`); }
      }
      // children: couples who want a family, while they can
      const partner = byId(c.family.partner);
      if (alive(partner) && c.age >= 22 && c.age <= 44 && (c.family.children?.length || 0) < 4 && c.id < partner.id && Math.random() < (c.ambition === 'family' || partner.ambition === 'family' ? .006 : .002) && c.wealth + partner.wealth > 120) birth(c, partner);
      // growing up: child → student → work
      if (c.job === 'Child' && c.age >= 16) lives.change(c, 'Student');
      if (c.job === 'Student' && c.age >= 22 && Math.random() < .05) lives.change(c, 'Unemployed');
      // rent
      if (c.home === 'tenant') {
        const L = byId(c.landlord), due = H.rent * (c.family.partner ? .6 : 1);
        if (c.wealth >= due) { c.wealth -= due; if (alive(L)) L.wealth += due * .8; c.arrears = 0; }
        else if (++c.arrears > 3) { c.home = 'homeless'; c.arrears = 0; H.evictions++; c.mood -= 25; remember(c, 'Was evicted for not paying the rent'); ctx.courts?.civil?.('eviction', L, c); }
      } else if (c.home === 'homeless' && c.wealth > H.rent * 8) { c.home = 'tenant'; remember(c, 'Found a place to rent'); c.mood += 15; }
      else if (c.home === 'tenant' && c.wealth > H.price * 6) { c.wealth -= H.price * 4; c.home = 'owner'; remember(c, 'Bought my own home'); lives.achieve(c, 'Homeowner'); }
    }
    // the housing market: prices follow how well the country is doing, how many people need homes and how many were built
    const people = citizens.filter(alive).length, dev = S.dev || 0;
    const target = 100 * (1 + dev / 120) * (people / 500) / (1 + H.built * .01) * (1 + (S.eco?.gdp || 0) / 2000);
    H.price = clamp(H.price + (target - H.price) * .05, 30, 600); H.rent = Math.max(.5, H.price * .01);
    H.homeless = citizens.filter(c => alive(c) && c.home === 'homeless').length;
    // your property earns rent
    const worth = ctx.propertyWorth?.() || 0; if (worth > 0) ctx.addGold?.(Math.round(worth * .002));
  }
  function birth(a, b) {
    const child = makeChild(a, b);
    a.family.children = [...(a.family.children || []), child.id]; b.family.children = [...(b.family.children || []), child.id];
    child.family = { children: [], parents: [a.id, b.id] }; child.home = a.home === 'homeless' ? 'homeless' : 'family';
    F.births++; for (const x of [a, b]) { remember(x, 'Had a baby: ' + child.name.split(' ')[0]); lives.achieve(x, 'Became a parent'); x.mood += 15; }
    if (Math.random() < .3) news(`👶 ${a.name} and ${b.name} welcomed a baby, ${child.name.split(' ')[0]}.`);
  }
  function die(c) {
    c.dead = true; c.diedAt = S.tick; F.deaths++; D.deaths += c.sick ? 1 : 0;
    const heirs = [byId(c.family?.partner), ...(c.family?.children || []).map(byId)].filter(alive);
    const share = heirs.length ? c.wealth / heirs.length : 0;
    for (const h of heirs) {
      h.wealth += share; h.mood -= 20; remember(h, `${c.name} died. I inherited ${Math.round(share)} gold${c.home === 'owner' && h === heirs[0] ? ' and the house' : ''}`);
      if (c.home === 'owner' && h === heirs[0]) h.home = 'owner';
      if (Math.abs(c.opinion) > 40) h.opinion = clamp(h.opinion + c.opinion * .5, -100, 100);   // grudges (and gratitude) are inherited
      if (h.family?.partner === c.id) h.family.partner = null;
    }
    c.wealth = 0;
    news(`🕯 ${c.name} of ${c.city} has died, aged ${c.age}.${heirs.length ? ` Survived by ${heirs.length} family member${heirs.length > 1 ? 's' : ''}.` : ''}`);
    ctx.onDeath?.(c);
  }
  return { hourly, daily, infect, stats: () => ({ ...H, ...D, ...F }), DISEASES, propose(c) { if (c.family?.partner != null) return false; c.family.partner = 'player'; S.playerPartner = c.id; F.marriages++; lives.achieve(c, 'Married the newcomer'); lives.achieve(null, 'Married'); news(`💍 The newcomer married ${c.name}.`, true); return true; } };
}
