// FIRMS — the businesses and bodies people actually work for, across the whole country, the way a real
// economy is made:
//   • NATIONAL companies (plc): two or three big ones in every industry, with 10–20 branches across the
//     whole country (more in the Capital and Ashford, fewer in Poison Land);
//   • SMALLER companies (Ltd): about four per industry started in each big city, fewer in the smaller ones;
//     they trade across the country too, but with one to three branches at most;
//   • SOLE TRADERS: self-employed plumbers, electricians, builders, mechanics, artists, shopkeepers… trading
//     in their own name; PARTNERSHIPS: law firms and practices owned by their partners;
//   • CO-OPERATIVES, CHARITIES, SOCIAL ENTERPRISES and NGOs, and the PUBLIC BODIES (councils, police,
//     armed forces, health service, schools, the regulators) paid for by taxes.
// Every firm is registered (a Companies Registry number, and an ID in the world standard), employs real
// residents in its branches, makes or loses money, pays corporation tax, opens and closes branches, can
// go into PARTNERSHIP with another firm, can be TAKEN OVER (the competition regulator can block it) and
// can go bust. Business law and its enforcers are in business-law.js.
import { SECTORS, CITIES } from './nation.js';
import { ORGS } from './organisations.js';
import { makeId } from './world-ids.js';

export const FIRM_TYPES = {
  plc: { name: 'public limited company', code: 'PLC', about: 'owned by shareholders; its shares trade on the A.T. Stock Exchange' },
  ltd: { name: 'private limited company', code: 'PRV', about: 'owned by its founders; the owners are only liable for what they put in' },
  'sole trader': { name: 'sole trader', code: 'STR', about: 'one self-employed person trading in their own name, personally liable for its debts' },
  partnership: { name: 'partnership', code: 'PSH', about: 'owned and run by its partners, who share the profits' },
  'co-operative': { name: 'co-operative', code: 'COP', about: 'owned by its members, one member one vote' },
  charity: { name: 'charity', code: 'CHR', about: 'run on donations for a public good; no owners, no profits taken out' },
  'social enterprise': { name: 'social enterprise', code: 'SOC', about: 'trades like a business but puts its profits into a social purpose' },
  NGO: { name: 'NGO', code: 'NGO', about: 'a non-governmental campaign or aid group' },
  public: { name: 'public body', code: 'PUB', about: 'run by the state, paid for by taxes' },
};
const STAGE3 = { agriculture: 'PRI', resources: 'PRI', energy: 'PRI', manufacturing: 'SEC', automotive: 'SEC', construction: 'SEC', utilities: 'TER', retail: 'TER', tourism: 'TER', transport: 'TER', health: 'TER', defence: 'TER', public: 'TER', tech: 'QUA', science: 'QUA', education: 'QUA', finance: 'QUA', media: 'QUA' };
// how big a city is for business (how many local firms and how many branches it gets)
export const CITY_WEIGHT = { Capital: 1.3, Ashford: 1.2, Riverside: 1, 'Poison Land': .6, Skyhaven: .7, Deephaven: .5 };
const LOCAL_FIRMS = { Capital: 4, Ashford: 4, Riverside: 3, 'Poison Land': 2, Skyhaven: 2, Deephaven: 2 };
// the words companies are named with
const NOUN = { agriculture: ['Farms', 'Growers', 'Harvest', 'Agri'], resources: ['Mining', 'Quarries', 'Minerals', 'Resources'], energy: ['Energy', 'Power', 'Fuels'], utilities: ['Utilities', 'Water', 'Electrical Services'],
  manufacturing: ['Manufacturing', 'Industries', 'Works', 'Fabrication'], automotive: ['Motors', 'Automotive', 'Garages'], construction: ['Builders', 'Construction', 'Developments'], tech: ['Systems', 'Technologies', 'Digital', 'Labs'],
  science: ['Research', 'Laboratories', 'Sciences'], health: ['Healthcare', 'Clinics', 'Medical'], education: ['Tutors', 'Learning'], finance: ['Bank', 'Capital', 'Insurance', 'Investments'], retail: ['Stores', 'Market', 'Foods', 'Retail'],
  tourism: ['Travel', 'Tours', 'Leisure'], transport: ['Logistics', 'Haulage', 'Transport', 'Couriers'], media: ['Media', 'Studios', 'Press'] };
const WORD = ['North', 'Crown', 'Summit', 'Blue Ridge', 'Oakline', 'Meridian', 'Keystone', 'Silverline', 'Brightstone', 'Union', 'Pioneer', 'Vale', 'Ironbridge', 'Harbourside', 'Evergreen', 'Redwood', 'Cobalt', 'Stoneleigh', 'Westmark', 'Lumen', 'Kingsway', 'Fairhaven', 'Highgate', 'Northstar'];
// trades where many people work for themselves
const SELF = { Plumber: 'Plumbing', Electrician: 'Electrical', Builder: 'Building Services', Mechanic: 'Motor Repairs', Artist: 'Studio', 'Shop owner': 'Shop', Farmer: 'Farm', 'Tour guide': 'Tours', Chef: 'Kitchen' };
const PUBLIC_BODY = { defence: { Police: 'A.T. Police Service', Soldier: 'A.T. Armed Forces' }, health: 'A.T. Health Service', public: 'City Council', utilities: 'Westhaven Waste Services', transport: 'A.T. Transit', tourism: 'National Parks Service', education: 'Schools' };

let seq = 0;
export function firmId(f) { return makeId('ORG', FIRM_TYPES[f.type]?.code || 'PRV', STAGE3[f.sector] || 'TER', (f.name.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'FRM').toUpperCase(), 'firm:' + f.name); }

export function createFirms({ S, citizens, news = () => { }, remember = () => { }, history = null, jobInfo = () => null, sectorOfJob, rand = Math.random, extraEmployers = [] }) {
  const F = S.firms ||= { list: [], next: 1, founded: 0, closed: 0, partnerships: 0, takeovers: 0, blocked: 0, taxPaid: 0 };
  const byId = new Map();
  const index = () => { byId.clear(); for (const f of F.list) byId.set(f.id, f); };
  const pick = a => a[Math.floor(rand() * a.length)];
  const taken = new Set(F.list.map(f => f.name));
  const uniqueName = make => { for (let i = 0; i < 40; i++) { const n = make(); if (!taken.has(n)) { taken.add(n); return n; } } const n = make() + ' ' + (F.next + 1); taken.add(n); return n; };
  function add(f) {
    const firm = { id: F.next++, name: f.name, type: f.type, sector: f.sector, scale: f.scale, home: f.home, branches: f.branches, cash: f.cash ?? 1000, value: f.value ?? 1e5, owner: f.owner ?? null, partners: [], ethics: f.ethics ?? (.35 + rand() * .65), licence: 'good', suspendedUntil: 0, strikes: 0, founded: S.tick || 0, staff: 0, does: f.does || null, institution: f.institution || null, regulator: !!f.regulator };
    firm.reg = 'AT' + String(100000 + firm.id * 7919 % 900000).padStart(6, '0');
    firm.wid = firmId(firm);
    F.list.push(firm); byId.set(firm.id, firm); taken.add(firm.name);
    return firm;
  }
  const spread = (n, home) => {   // n branches across the cities, more in the big ones, the head office city first
    const out = Object.fromEntries(CITIES.map(c => [c, 0])); out[home] = 1;
    const w = CITIES.map(c => CITY_WEIGHT[c]), tot = w.reduce((a, b) => a + b, 0);
    for (let i = 1; i < n; i++) { let r = rand() * tot, k = 0; while (r > w[k]) r -= w[k++]; out[CITIES[k]]++; }
    return out;
  };
  // ---- the economy as it was when the records begin ----
  function seed() {
    if (F.list.length) { index(); return; }
    const named = ORGS.filter(o => ['private', 'co-operative'].includes(o.type) && SECTORS[o.sector]);
    for (const sec of Object.keys(SECTORS)) {
      if (sec === 'public' || sec === 'defence' || sec === 'education') continue;
      // the national companies: the famous ones first, then rivals
      const famous = named.filter(o => o.sector === sec).slice(0, 3);
      const n = Math.max(2, famous.length);
      for (let i = 0; i < n; i++) {
        const o = famous[i], home = i === 0 ? 'Capital' : pick(['Capital', 'Ashford', 'Riverside']);
        add({ name: o ? o.name : uniqueName(() => `${pick(WORD)} ${pick(NOUN[sec] || ['Group'])}`), type: o?.type === 'co-operative' ? 'co-operative' : 'plc', sector: sec, scale: 'national', home, branches: spread(10 + Math.floor(rand() * 11), home), cash: 2e4, value: 2e6 + rand() * 4e6, does: o?.does });
      }
      // the city companies
      for (const city of CITIES) for (let i = 0; i < LOCAL_FIRMS[city]; i++) {
        const b = 1 + Math.floor(rand() * 3);
        const br = { ...Object.fromEntries(CITIES.map(c => [c, 0])), [city]: 1 };
        for (let j = 1; j < b; j++) br[rand() < .55 ? city : pick(CITIES)]++;   // the rest at home or elsewhere in the country
        add({ name: uniqueName(() => rand() < .5 ? `${city === 'Poison Land' ? 'Poisonvale' : city} ${pick(NOUN[sec] || ['Services'])}` : `${pick(WORD)} ${pick(NOUN[sec] || ['Services'])}`) + ' Ltd', type: 'ltd', sector: sec, scale: 'city', home: city, branches: br, cash: 1500, value: 2e5 + rand() * 6e5 });
      }
    }
    // charities, social enterprises, NGOs and the public bodies people know by name
    for (const o of ORGS.filter(o => ['charity', 'social enterprise', 'NGO', 'public'].includes(o.type))) add({ name: o.name, type: o.type, sector: o.sector, scale: 'national', home: 'Capital', branches: spread(o.type === 'public' ? 8 : 3, 'Capital'), cash: 5e4, value: 0, does: o.does, ethics: .8 + rand() * .2 });
    for (const city of CITIES) add({ name: `${city} City Council`, type: 'public', sector: 'public', scale: 'city', home: city, branches: { ...Object.fromEntries(CITIES.map(c => [c, 0])), [city]: 3 }, cash: 0, value: 0, ethics: .7 + rand() * .3 });
    for (const e of extraEmployers) add(e);   // the schools, colleges and academies (education.js) and the regulators (business-law.js)
    index();
  }
  const firm = id => byId.get(id) || null;
  const branchesOf = f => Object.values(f.branches).reduce((a, b) => a + b, 0);
  const inCity = (f, city) => (f.branches[city] || 0) > 0;
  // ---- who works where ----
  function employerFor(c) {
    const job = c.job, info = jobInfo(job), sec = sectorOfJob(job) || (job === 'Office worker' || job === 'Street cleaner' ? 'public' : job === 'Teacher' ? 'education' : null);
    if (!info?.wage || !sec) return null;
    // self-employed trades: a share of them trade in their own name
    if (SELF[job] && ((c.id * 37) % 100) < (job === 'Shop owner' ? 100 : job === 'Artist' ? 70 : 35)) {
      let own = F.list.find(f => f.owner === c.id && f.type === 'sole trader' && !f.closed);
      if (!own) { own = add({ name: uniqueName(() => `${c.name} ${SELF[job]}`), type: 'sole trader', sector: sec, scale: 'local', home: c.city, branches: { ...Object.fromEntries(CITIES.map(x => [x, 0])), [c.city]: 1 }, cash: Math.min(200, c.wealth * .3), value: 5e3, owner: c.id, ethics: .3 + (c.traits?.kindness || .5) * .7 }); F.founded++; }
      return own;
    }
    // lawyers practise in partnerships
    if (job === 'Lawyer') {
      let pr = F.list.find(f => f.type === 'partnership' && f.sector === 'finance' && inCity(f, c.city) && !f.closed && (f.partnersN || 0) < 4);
      if (!pr) { pr = add({ name: uniqueName(() => `${c.name.split(' ')[1] || c.name} & ${pick(['Carter', 'Mensah', 'Iyer', 'Okafor', 'Vance', 'Quarshie', 'Kaur', 'Adeyemi', 'Hale', 'Brooks'])} LLP`), type: 'partnership', sector: 'finance', scale: 'local', home: c.city, branches: { ...Object.fromEntries(CITIES.map(x => [x, 0])), [c.city]: 1 }, cash: 500, value: 5e4, owner: c.id }); }
      pr.partnersN = (pr.partnersN || 0) + 1;
      return pr;
    }
    // inspectors work for a regulator (business-law.js)
    if (job === 'Inspector') return F.list.filter(f => f.regulator && !f.closed).sort((a, b) => a.staff - b.staff)[0] || null;
    // uniformed and public services
    if (sec === 'defence') return F.list.find(f => f.name === (job === 'Soldier' ? 'A.T. Armed Forces' : 'A.T. Police Service'));
    if (job === 'Teacher') return F.list.filter(f => f.institution && f.institution.kind === 'school' && f.home === c.city).sort((a, b) => a.staff - b.staff)[0] || null;
    if (info.pub) { const named = PUBLIC_BODY[sec]; return F.list.find(f => f.name === named && !f.closed) || F.list.find(f => f.name === `${c.city} City Council`); }
    // everyone else: a company with a branch in their city, the bigger ones hiring more
    const options = F.list.filter(f => f.sector === sec && !f.closed && f.type !== 'sole trader' && f.type !== 'partnership' && !f.institution && inCity(f, c.city) && f.licence !== 'suspended');
    if (!options.length) return F.list.find(f => f.sector === sec && !f.closed && f.scale === 'national') || null;
    let tot = 0; for (const f of options) tot += f.branches[c.city] * (f.scale === 'national' ? 3 : 1.5) / (1 + f.staff / 40);
    let r = rand() * tot; for (const f of options) { r -= f.branches[c.city] * (f.scale === 'national' ? 3 : 1.5) / (1 + f.staff / 40); if (r <= 0) return f; }
    return options[0];
  }
  function assign() {
    for (const f of F.list) f.staff = 0;
    for (const c of citizens) {
      if (c.dead || c.jail) continue;
      let f = c.employer != null ? firm(c.employer) : null;
      const sec = sectorOfJob(c.job);
      if (f && (f.closed || (!f.institution && sec && f.sector !== sec && !(f.type === 'public' && !sec)) || !jobInfo(c.job)?.wage)) f = null;
      if (!f) { f = employerFor(c); c.employer = f ? f.id : null; }
      if (f) f.staff++;
    }
  }
  // ---- a business day ----
  const marketShare = f => { const rivals = F.list.filter(x => x.sector === f.sector && !x.closed && x.type !== 'public'); const size = x => branchesOf(x) * (x.scale === 'national' ? 3 : 1) + x.staff * .1; const tot = rivals.reduce((a, x) => a + size(x), 0); return tot ? size(f) / tot : 0; };
  function daily({ demand = 1, taxRate = .2, onTax = () => { }, review = () => true } = {}) {
    assign();
    const live = F.list.filter(f => !f.closed);
    for (const f of live) {
      if (f.type === 'public' || f.institution) continue;   // paid for by taxes (or fees)
      const k = SECTORS[f.sector]?.k || 1, suspended = f.licence === 'suspended' && (S.tick || 0) < f.suspendedUntil;
      if (f.licence === 'suspended' && !suspended) f.licence = 'warned';
      const partnerBoost = 1 + Math.min(.3, f.partners.length * .1);
      // (a firm's books are kept in the city's own scale: a branch turns over a few dozen gold a day)
      const revenue = suspended ? 0 : (branchesOf(f) * 13 + f.staff * 2) * k * demand * partnerBoost * (.85 + rand() * .3);
      const costs = branchesOf(f) * 7.5 + f.staff * 1.7;
      const profit = revenue - costs;
      f.lastProfit = Math.round(profit); f.lastRevenue = Math.round(revenue);
      if (profit > 0 && !['charity', 'NGO'].includes(f.type)) {
        // corporation tax (sole traders and partners pay income tax on the profits instead: same rate here)
        const evaded = f.evading ? .6 : 0, tax = profit * taxRate * (1 - evaded);
        f.cash += profit - tax; F.taxPaid += tax; onTax(tax, f);
        if (f.type === 'social enterprise' || f.type === 'co-operative') f.cash -= profit * .2;   // back to the cause / to the members
      } else f.cash += profit;
      f.value = Math.max(0, f.value * .998 + profit * 80);
      // grow: open a branch where it has fewest
      const cap = f.scale === 'national' ? 20 : f.scale === 'city' ? 3 : 1;
      if (f.cash > 3000 * (f.scale === 'national' ? 3 : 1) && branchesOf(f) < cap && rand() < .08) {
        // anywhere in the country: where it is thinnest for the size of the place
        const where = f.scale === 'local' ? f.home : CITIES.slice().sort((a, b) => f.branches[a] / CITY_WEIGHT[a] - f.branches[b] / CITY_WEIGHT[b])[0];
        f.branches[where]++; f.cash -= 1500;
        if (f.scale !== 'local') news(`🏢 ${f.name} opened a new branch in ${where} (${branchesOf(f)} across the country now).`);
      }
      // shrink: close a branch when the money runs low
      if (f.cash < -1000 && branchesOf(f) > 1) { const where = CITIES.filter(c => f.branches[c] > 0).sort((a, b) => f.branches[b] - f.branches[a])[0]; f.branches[where]--; f.cash += 750; if (f.scale !== 'local') news(`${f.name} closed a branch in ${where}.`); }
      // bust: no branches left to sell and still owing
      if (f.cash < -2000 && branchesOf(f) <= 1) close(f, 'went bust');
    }
    // partnerships: two healthy firms in the same industry, based in different cities, team up
    if (rand() < .12) {
      const a = pick(live.filter(f => f.scale !== 'local' && f.type !== 'public' && !f.institution && f.cash > 0 && f.partners.length < 3));
      const b = a && pick(live.filter(f => f !== a && f.sector === a.sector && f.home !== a.home && f.scale !== 'local' && f.type !== 'public' && !f.institution && f.cash > 0 && !a.partners.includes(f.id) && f.partners.length < 3));
      if (a && b) { a.partners.push(b.id); b.partners.push(a.id); F.partnerships++; news(`🤝 ${a.name} and ${b.name} have gone into partnership.`); history?.record('business', `${a.name} and ${b.name} went into partnership`, 'to reach each other\'s cities', { who: a.name, where: a.home }); }
    }
    // takeovers: a cash-rich national company buys a struggling city firm in its industry, if the
    // competition regulator lets it (business-law.js decides)
    if (rand() < .06) {
      const buyer = pick(live.filter(f => f.scale === 'national' && f.type === 'plc' && f.cash > 7500));
      const target = buyer && pick(live.filter(f => f.sector === buyer.sector && f.scale === 'city' && f.cash < 500));
      if (buyer && target) {
        const after = marketShare(buyer) + marketShare(target);
        if (review(buyer, target, after)) {
          for (const c of CITIES) buyer.branches[c] += target.branches[c];
          buyer.cash -= Math.max(1000, target.value * .04);
          for (const p of citizens) if (p.employer === target.id) p.employer = buyer.id;
          close(target, `was bought by ${buyer.name}`, true); F.takeovers++;
        } else F.blocked++;
      }
    }
    // new businesses: people who have saved up and want to work for themselves
    for (const c of citizens) if (!c.dead && !c.jail && c.ambition === 'business' && c.job === 'Shop owner' && !F.list.some(f => f.owner === c.id && !f.closed)) { employerFor(c); }
  }
  function close(f, why, quiet = false) {
    f.closed = S.tick || 0; f.closedWhy = why; F.closed++;
    for (const id of f.partners) { const p = firm(id); if (p) p.partners = p.partners.filter(x => x !== f.id); }
    let lost = 0;
    for (const c of citizens) if (c.employer === f.id) { c.employer = null; if (!quiet) { lost++; remember(c, `${f.name} ${why}; I lost my job`); c.job = 'Unemployed'; } }
    if (!quiet || f.scale !== 'local') news(`${f.name} ${why}${lost ? `: ${lost} people lost their jobs` : ''}.`, f.scale === 'national');
    history?.record('business', `${f.name} ${why}`, f.cash < 0 ? 'it ran out of money' : 'a takeover', { who: f.name, where: f.home, watch: 'unemployed' });
  }
  return {
    F, seed, daily, assign, firm, close, branchesOf, marketShare,
    list: () => F.list.filter(f => !f.closed),
    employerOf: c => (c.employer != null ? firm(c.employer) : null),
    add,
  };
}
