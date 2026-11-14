// CITY SYSTEMS — the parts that make one thing depend on another.
//
// ECONOMY WITH CONSEQUENCES: prices (inflation) rise when demand outruns what the factories can make or a
// material runs short; the central rate follows inflation; high rates cool house prices and squeeze
// companies; companies can go BANKRUPT (their workers lose their jobs) and new ones are founded by ambitious
// residents. A shortage of steel slows building and pushes up costs. The country can decline as well as
// grow; only the basic standards keep a floor.
//
// DISTRICTS: each city has its own identity, jobs, crime, property market and pollution, and a decision that
// helps one can hurt another (industry in Poison Land dirties Riverside's river).
//
// INFRASTRUCTURE: power, water, sewage, telecoms, fuel and emergency services, each with a condition kept up
// by the maintenance budget and the utility workers. Faults cause outages in a district, and failures
// cascade: a power cut stops the water pumps and puts the hospitals on backup; a telecoms fault slows the
// Unity Network; a fuel shortage slows transport. Above them all, the AEGIS LIFE SUPPORT NETWORK keeps the
// dome's air, water circulation, energy and climate; ATLAS runs it, and if it falters everyone feels it.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const DISTRICTS = {
  Ashford: { identity: 'homes and family life', jobs: ['Teacher', 'Shop worker', 'Nurse', 'Chef', 'Street cleaner'], price: 1, basePollution: 4 },
  Riverside: { identity: 'trade, transport and the waterfront', jobs: ['Bus driver', 'Shop worker', 'Tour guide', 'Mechanic', 'Builder'], price: 1.1, basePollution: 6 },
  Capital: { identity: 'government, finance and administration', jobs: ['Office worker', 'Banker', 'Lawyer', 'Software developer', 'Police officer'], price: 1.5, basePollution: 5 },
  'Poison Land': { identity: 'industry, its legacy of pollution, and redevelopment', jobs: ['Factory worker', 'Miner', 'Power plant operator', 'Recycling worker', 'Builder'], price: .6, basePollution: 25 },
};
export const SYSTEMS = { power: 'Power grid', water: 'Water network', sewage: 'Sewage', telecom: 'Telecoms & Unity Network', fuel: 'Fuel distribution', emergency: 'Emergency services' };
const KEY_MATS = { stl: 'steel', con: 'concrete', gls: 'glass', brk: 'brick', wd: 'timber', pls: 'plastic', brd: 'bread', dry: 'dairy', mt: 'meat' };

export function createCitySystems({ citizens, S, news, remember, lives, history, ctx }) {
  const E = S.econ2 ||= { cpi: 100, inflation: 2, rate: 3, shortages: {}, bankruptcies: 0, founded: 0 };
  const I = S.infra ||= { health: Object.fromEntries(Object.keys(SYSTEMS).map(k => [k, 85])), outages: [], faults: 0 };
  const A = S.aegis ||= { air: 98, water: 97, energy: 96, climate: 21, faults: 0 };
  const Dst = S.districts ||= {};
  const alive = c => c && !c.dead;
  const out = (sys, city) => I.outages.some(o => o.sys === sys && (o.city === city || o.city === 'all'));

  function hourly() {
    // outages run their course; utility workers (and the budget) shorten them
    const fixers = citizens.filter(c => alive(c) && !c.jail && ['Electrician', 'Plumber', 'Engineer', 'Power plant operator'].includes(c.job)).length;
    for (const o of I.outages) o.left -= 1 + fixers / 60 + (S.budget?.roads || .14) * 3;
    for (const o of I.outages.filter(o => o.left <= 0)) news(`${o.sys === 'aegis' ? 'Aegis' : SYSTEMS[o.sys]} restored in ${o.city === 'all' ? 'every city' : o.city}.`);
    I.outages = I.outages.filter(o => o.left > 0);
    // what an outage does, while it lasts
    for (const o of I.outages) {
      const here = citizens.filter(c => alive(c) && (o.city === 'all' || c.city === o.city));
      if (o.sys === 'power') { for (const c of here) c.mood -= .15; if (S.disease) S.disease.strain = (S.disease.strain || 0) + .2; }
      if (o.sys === 'water' || o.sys === 'sewage') for (const c of here) { c.health -= .03; c.mood -= .1; }
      if (o.sys === 'fuel' && S.eco?.boost) S.eco.boost.transport = Math.max(-.5, (S.eco.boost.transport || 0) - .002);
    }
    // the dome's life support: ATLAS keeps it steady; it drifts if power or ATLAS falters
    const atlasOK = (S.atlas?.level || 0) >= 1, powerOK = !out('power', 'all') && I.health.power > 40;
    A.energy = clamp(A.energy + (powerOK ? .05 : -.4) - (A.faultLeft > 0 ? .5 : 0), 0, 100);
    A.air = clamp(A.air + (A.energy > 60 ? .04 : -.25) - (S.waste?.pollution || 0) * .002, 0, 100);
    A.water = clamp(A.water + (A.energy > 50 && !out('water', 'all') ? .04 : -.2), 0, 100);
    A.climate += ((atlasOK && A.energy > 50 ? 21 : 21 + (50 - A.energy) * .15) - A.climate) * .05;
    if (A.faultLeft > 0) A.faultLeft--;
    if (A.air < 80) for (const c of citizens) if (alive(c) && Math.random() < .02) c.health -= (80 - A.air) * .01;
  }

  function daily() {
    const people = citizens.filter(alive);
    // ---- the economy: prices, the central rate, shortages, bankruptcies ----
    const st = S.stock || {}, short = Object.keys(KEY_MATS).filter(k => (st[k] || 0) < 25 && (S.tick > 240));
    for (const k of short) if (!E.shortages[k]) { E.shortages[k] = S.tick; news(`📉 Shortage of ${KEY_MATS[k]}: prices are rising and some building has slowed.`, true); history?.record('economy', `A shortage of ${KEY_MATS[k]}`, `stocks fell below what the country needs (${Math.round(st[k] || 0)} left)`, { watch: 'price' }); }
    for (const k of Object.keys(E.shortages)) if (!short.includes(k)) delete E.shortages[k];
    const unemployed = people.filter(c => c.job === 'Unemployed').length / Math.max(1, people.length) * 100;
    // demand: how fast people's money is growing compared with a year ago (more money chasing the same goods pushes prices up)
    const avgW = people.reduce((n, c) => n + c.wealth, 0) / Math.max(1, people.length);
    E.wealthRef ??= avgW; const demand = avgW / Math.max(50, E.wealthRef); E.wealthRef += (avgW - E.wealthRef) * .08;
    E.inflation = clamp(E.inflation * .85 + .15 * (2 + (demand - 1) * 10 + short.length * 1.2 - (unemployed - 5) * .25), -3, 18);
    E.cpi *= Math.pow(1 + E.inflation / 100, 24 / 180);
    E.rate = clamp(2 + 1.5 * (E.inflation - 2), .25, 15);
    if (E.inflation > 6) for (const c of people) c.mood -= .4;
    if (S.homes) S.homes.price *= 1 - Math.max(0, E.rate - 4) * .003;
    for (const co of S.companies || []) {
      co.value *= 1 - Math.max(0, E.rate - 5) * .004 - (short.length ? .002 : 0) + (Math.random() - .45) * .02;
      if (co.value < 3e5 && !co.bankrupt) bankrupt(co);
    }
    // new companies: an ambitious, well-off resident with a business dream
    if ((S.companies || []).filter(c => !c.bankrupt).length < 12 && Math.random() < .2) {
      const f = people.find(c => c.ambition === 'business' && c.wealth > 1200 && !c.jail);
      if (f) { const sector = ['retail', 'tech', 'construction', 'tourism', 'manufacturing'][Math.floor(Math.random() * 5)], name = f.name.split(' ').slice(-1)[0] + ' ' + { retail: 'Trading', tech: 'Systems', construction: 'Homes', tourism: 'Travel', manufacturing: 'Works' }[sector];
        S.companies.push({ name, sector, focus: 'growth', founder: f.id, value: 6e5, rd: 0, gen: 0 }); f.wealth -= 800; E.founded++; lives.achieve(f, 'Founded ' + name, true); remember(f, 'Founded my own company: ' + name); history?.record('business', `${name} was founded`, `${f.name} had always wanted to own a business`, { who: f.name, where: f.city }); }
    }
    // ---- districts ----
    for (const [name, d] of Object.entries(DISTRICTS)) {
      const here = people.filter(c => c.city === name), n = Math.max(1, here.length);
      const crimes = (S.justice?.cases || []).filter(k => !k.civil && citizens[k.defendant]?.city === name && S.tick - k.at < 24 * 10).length;
      const industry = name === 'Poison Land' ? (S.eco?.out?.manufacturing || 0) * .3 + (S.laws?.polIndustry ? 12 : 0) : name === 'Riverside' && S.laws?.polIndustry ? 6 : 0;
      Dst[name] = { people: here.length, unemployed: Math.round(here.filter(c => c.job === 'Unemployed').length / n * 1000) / 10, wealth: Math.round(here.reduce((s, c) => s + c.wealth, 0) / n), crime: Math.round(crimes / n * 1000),   /* charges in the last ten days, per 1,000 people */ homeless: here.filter(c => c.home === 'homeless').length, sick: here.filter(c => c.sick).length,
        pollution: Math.round(d.basePollution + industry + (S.waste?.pollution || 0) * .5), price: Math.round((S.homes?.price || 100) * d.price * (1 - (d.basePollution + industry) / 300) * 100) };
    }
    // ---- infrastructure wears; faults happen where it's weak or overloaded ----
    const maint = (S.budget?.roads || .14);
    for (const k of Object.keys(SYSTEMS)) {
      I.health[k] = clamp(I.health[k] - .6 + maint * 4 + (k === 'telecom' && (S.atlas?.level || 0) > 2 ? .3 : 0), 0, 100);
      const load = people.length / 600;
      if (Math.random() < (100 - I.health[k]) / 900 + Math.max(0, load - 1) * .05) fault(k);
    }
    if (Math.random() < (100 - A.energy) / 1500 + .01) aegisFault();
  }
  function fault(sys) {
    const cities = Object.keys(DISTRICTS), city = cities[Math.floor(Math.random() * cities.length)];
    if (out(sys, city)) return;
    I.faults++; I.outages.push({ sys, city, left: 6 + Math.random() * 18 });
    news(`⚠️ ${SYSTEMS[sys]} failure in ${city}.${sys === 'power' ? ' The water pumps have stopped and the hospital is on backup power.' : sys === 'telecom' ? ' The Unity Network is slow.' : sys === 'fuel' ? ' Buses and deliveries are delayed.' : ''}`, true);
    if (sys === 'power') { I.outages.push({ sys: 'water', city, left: 6 }); }   // the cascade: no power, no pumps
    history?.record('infrastructure', `${SYSTEMS[sys]} failed in ${city}`, I.health[sys] < 50 ? `years of too little maintenance (condition ${Math.round(I.health[sys])}%)` : 'too much load on an ageing network', { where: city, watch: 'health' });
  }
  function aegisFault() {
    A.faults++; A.faultLeft = 12 + Math.random() * 24;
    news('🌐 Aegis Authority: a "routine adjustment" to the dome\'s life support. Residents may notice the air feels different.', true);
    history?.record('aegis', 'The Aegis life support faltered', A.energy < 70 ? 'its power supply was failing' : 'the official report did not say', { watch: 'health' });
  }
  function bankrupt(co) {
    co.bankrupt = true; E.bankruptcies++;
    const staff = citizens.filter(c => alive(c) && !c.jail && c.job !== 'Unemployed' && (ctx.sectorOfJob?.(c.job) === co.sector)).slice(0, 4);
    for (const c of staff) { remember(c, `Lost my job when ${co.name} went bust`); lives.change(c, 'Unemployed'); c.mood -= 15; }
    news(`📉 ${co.name} has gone bankrupt. ${staff.length} people lost their jobs.`, true);
    history?.record('business', `${co.name} went bankrupt`, E.rate > 6 ? `interest rates of ${E.rate.toFixed(1)}% and falling sales` : 'its business shrank until the money ran out', { watch: 'unemployed' });
    S.companies = S.companies.filter(c => c !== co);
  }
  return { hourly, daily, out, E, I, A, Dst, fault, aegisFault };
}
