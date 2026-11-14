// BELONGINGS — what people wear and use is bought, and it comes from somewhere. No shirt or pram simply
// appears on anyone:
//   clothes  ← Loomhouse Textiles makes them from fabric (← cotton from Greenfield Farms)
//   shoes    ← Elastica Rubber makes them from rubber (← latex) and fabric
//   prams    ← Velo Motors makes them from steel, fabric, rubber and plastic
// Each one is a thing in the world with its own ID (PRD-TOP-FAB-RES-…), its maker, the shop it was
// bought from, the price paid and the day. Residents pay for them out of their own money (part goes to
// the maker, part to the treasury as sales tax). Clothes wear out and children outgrow them; what is
// thrown away goes into the waste stream. Uniforms are issued by the employer, not bought.
// A baby goes out only in a pram one of the parents bought; if the factories are short or the family can't
// afford one, the baby stays at home.
import { makeId } from './world-ids.js';

export const GOODS = {
  top: { kind: 'TOP', name: 'top', stock: 'clo', mat: 'FAB', materials: ['fab'], maker: 'Loomhouse Textiles', shop: 'MarketWay Retail', price: 18, life: [70, 140] },
  bottom: { kind: 'BTM', name: 'trousers', stock: 'clo', mat: 'FAB', materials: ['fab'], maker: 'Loomhouse Textiles', shop: 'MarketWay Retail', price: 22, life: [90, 170] },
  shoes: { kind: 'SHO', name: 'shoes', stock: 'sho', mat: 'RUB.FAB', materials: ['rub', 'fab'], maker: 'Elastica Rubber', shop: 'MarketWay Retail', price: 30, life: [120, 220] },
  pram: { kind: 'PRM', name: 'pram', stock: 'prm', mat: 'STL.FAB.RUB', materials: ['stl', 'fab', 'rub', 'pls'], maker: 'Velo Motors', shop: 'Velo Motors', price: 140, life: [2000, 4000] },
};
export const WEAR = ['top', 'bottom', 'shoes'];
// what the shops have on the rails (people pick to their taste)
const RAILS = {
  top: [0x2f5d8a, 0x8a3b3b, 0xe8e2d4, 0x3a6b35, 0x2a2a2a, 0xc98a2a, 0x6b4f8a, 0x4f7f8a, 0xb5651d, 0x7a8a99, 0xd9c27a, 0x9a4f6b],
  bottom: [0x2d3142, 0x1a1a1a, 0x4a4a6a, 0x5a4a3a, 0x3b3b3b, 0x6b5a45, 0x24364f, 0x7a2f35],
  shoes: [0x1b1b1f, 0x3a2a1e, 0xe6e6e6, 0x5a3a24, 0x26324a],
  pram: [0x2b3a55, 0x6b2f3a, 0x2f4f3a, 0x3a3a3a, 0x8a7a63, 0x4a5f7a],
};
// uniforms are issued by the employer: [job pattern, top, trousers, who issues them]
const UNIFORMS = [[/Police/, 0x243c58, 0x1c2f43, 'GOV'], [/Soldier/, 0x4a5a3a, 0x3a4630, 'GOV'], [/Doctor|Nurse|Scientist/, 0xe2e7e9, 0xc9d3d8, 'GOV'], [/Firefighter/, 0x3a3a3a, 0x2a2a2a, 'GOV']];
const DAY = 24;
const sizeOf = age => age < 2 ? 'baby' : age < 12 ? 'child' : age < 16 ? 'teen' : 'adult';

export function createBelongings({ S, citizens, news = () => { }, remember = () => { }, rand = Math.random }) {
  const G = S.goods ||= { next: 1, sold: {}, worn: 0, outgrown: 0, short: {}, issued: 0 };
  const listeners = [];
  const tell = (item, what) => { for (const f of listeners) f(item, what, citizens[item.owner]); };
  const company = name => S.companies?.find(c => c.name === name);
  const uniformFor = c => UNIFORMS.find(([re]) => re.test(c.job || ''));
  // make one thing: take it from the factory's stock and give it an ID that says what it is and who has it
  function make(c, slot, colour, owner, how) {
    const g = GOODS[slot], st = S.stock ||= {};
    if (how !== 'founding') { if ((st[g.stock] || 0) < 1) { G.short[slot] = (G.short[slot] || 0) + 1; return null; } st[g.stock] -= 1; }
    const n = G.next++;
    const item = { id: makeId('PRD', g.kind, g.mat, owner, `${slot}:${c.id}:${n}`), slot, colour, maker: g.maker, shop: how === 'issued' ? null : g.shop, owner: c.id, at: S.tick || 0, how, size: sizeOf(c.age),
      wornAt: (S.tick || 0) + DAY * (g.life[0] + rand() * (g.life[1] - g.life[0])) };
    return item;
  }
  // buy (or be issued) one thing; returns the item or null (no money, or none in the shops)
  function get(c, slot, why = 'bought') {
    const g = GOODS[slot], uni = slot !== 'pram' && slot !== 'shoes' && uniformFor(c);
    const colour = uni ? (slot === 'top' ? uni[1] : uni[2]) : RAILS[slot][(c.id * 7 + (G.next * 3) + Math.floor(rand() * 3)) % RAILS[slot].length];
    const cost = Math.round(g.price * (S.econ2 ? S.econ2.cpi / 100 : 1));
    // children's things are bought by a parent
    const payer = c.age < 16 ? citizens[c.family?.parents?.find(i => citizens[i] && !citizens[i].dead)] || c : c;
    if (!uni && why !== 'founding' && payer.wealth < cost) return null;
    const item = make(c, slot, colour, uni ? uni[3] : 'RES', why === 'founding' ? 'founding' : uni ? 'issued' : 'bought');
    if (!item) return null;
    item.uniform = !!uni;
    if (uni) { G.issued++; if (why !== 'founding') S.treasury = (S.treasury || 0) - cost * .5; }   // the employer pays for uniforms
    else if (why !== 'founding') {
      payer.wealth -= cost; item.price = cost;
      const maker = company(g.maker), shop = company(g.shop);
      if (maker) maker.value += cost * .3; if (shop && shop !== maker) shop.value += cost * .2;
      S.treasury = (S.treasury || 0) + cost * .1;   // sales tax
      G.sold[slot] = (G.sold[slot] || 0) + 1;
    }
    tell(item, why === 'founding' ? `${g.name} made by ${g.maker}, owned by ${c.name} since before the records` : uni ? `${g.name} (uniform) issued to ${c.name}` : `${g.name} bought by ${payer === c ? c.name : payer.name + ' for ' + c.name} from ${g.shop} for ${cost} gold`);
    return item;
  }
  // the old one goes in the bin: textiles into the waste stream (recycling sorts it from there)
  function throwAway(c, item, why) {
    const W = S.waste; if (W) W.backlog = (W.backlog || 0) + .05;
    if (why === 'worn') G.worn++; else G.outgrown++;
    tell(item, `${GOODS[item.slot].name} ${why === 'worn' ? 'worn out' : 'outgrown'}; thrown away by ${c.name}`);
  }
  // everyone the records begin with already owns what they wear
  function seed() {
    for (const c of citizens) if (!c.dead && !c.wear) { c.wear = {}; for (const s of WEAR) c.wear[s] = get(c, s, 'founding'); c.wearV = 1; }
  }
  // each hour, a share of people check their things: worn out, outgrown, a new baby needs a pram
  let cursor = 0;
  function hourly() {
    const n = Math.max(1, Math.ceil(citizens.length / 24));
    for (let k = 0; k < n; k++) {
      const c = citizens[cursor++ % citizens.length]; if (!c || c.dead) continue;
      if (!c.wear) { c.wear = {}; c.wearV = 0; }
      for (const s of WEAR) {
        const it = c.wear[s], uni = s !== 'shoes' && !!uniformFor(c), wrongUniform = it && uni !== !!it.uniform;   // started or left a uniformed job
        const outgrown = it && it.size !== sizeOf(c.age), worn = it && (S.tick || 0) >= it.wornAt;
        if (it && !outgrown && !worn && !wrongUniform) continue;
        const fresh = get(c, s, outgrown ? 'outgrown' : 'replace');
        if (fresh) { if (it) throwAway(c, it, outgrown ? 'outgrown' : worn ? 'worn' : 'changed jobs'); c.wear[s] = fresh; c.wearV = (c.wearV || 0) + 1; }
        else if (it && worn) it.tatty = true;   // can't afford new ones: they keep wearing the old
      }
      // a newborn in the family and no pram: a parent buys one (the one who can afford it)
      const baby = (c.family?.children || []).map(i => citizens[i]).find(b => b && !b.dead && b.age < 2);
      const partner = citizens[c.family?.partner];
      if (baby && !c.pram && !partner?.pram && c.age >= 16) {
        const p = get(c, 'pram');
        if (p) { c.pram = p; remember(c, `Bought a pram for ${baby.name.split(' ')[0]}`); }
      }
    }
  }
  return {
    seed, hourly, get, G, stock: () => (S.stock ||= {}),
    onChange(f) { listeners.push(f); },
    // every item that exists right now (for the world registry)
    items() { const out = []; for (const c of citizens) { if (c.dead) continue; for (const s of WEAR) if (c.wear?.[s]) out.push([c, c.wear[s]]); if (c.pram) out.push([c, c.pram]); } return out; },
  };
}
