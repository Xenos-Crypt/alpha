// SUPPLY CHAIN — nothing in A.T. appears from nowhere (only people are born). Every thing is made from
// something that already existed:
//   PRIMARY sector:   raw materials are farmed, mined, quarried, felled, drilled or fished;
//   SECONDARY sector: factories turn them into materials and goods (brick, steel, glass, flour, cars...);
//   TERTIARY sector:  companies build, sell, ship and service the finished things.
// Each step is run by a named company. The world IDs (world-ids.js) use the codes here, so any thing's
// ID tells you what it is made of, and its record traces it all the way back to the farm or the mine.
// Even the dungeon monsters are made: ATLAS's Foundry fabricates them from bio-gel and alloy.

// [code, name, company, sector of the economy (nation.js SECTORS), where it comes from]
export const RAW = [
  ['hay', 'hay', 'Greenfield Farms', 'agriculture', 'the farms'], ['mud', 'mud and clay', 'Riverbank Clay Co.', 'resources', 'the clay pits by the river'],
  ['stn', 'stone', 'Deepstone Quarries', 'resources', 'the hill quarries'], ['mar', 'marble', 'Deepstone Quarries', 'resources', 'the marble quarry'],
  ['log', 'logs', 'Northwood Forestry', 'resources', 'the managed forests'], ['snd', 'sand', 'Coastline Aggregates', 'resources', 'the beaches and river beds'],
  ['irn', 'iron ore', 'Deepstone Mining', 'resources', 'the iron mines'], ['col', 'coal', 'Deepstone Mining', 'resources', 'the coal seams'],
  ['lmt', 'limestone', 'Deepstone Quarries', 'resources', 'the limestone quarry'], ['gyp', 'gypsum', 'Deepstone Mining', 'resources', 'the gypsum beds'],
  ['oil', 'crude oil', 'Brightwave Energy', 'energy', 'the oil wells'], ['ltx', 'latex', 'Greenfield Farms', 'agriculture', 'the rubber plantations'],
  ['cot', 'cotton', 'Greenfield Farms', 'agriculture', 'the cotton fields'], ['wol', 'wool', 'Greenfield Farms', 'agriculture', 'the sheep farms'],
  ['rmn', 'rare minerals', 'Deepstone Mining', 'resources', 'the deep mines'], ['sil', 'silicon', 'Coastline Aggregates', 'resources', 'quartz sand'],
  ['bms', 'biomass', 'Novachem Labs', 'science', 'algae tanks and farm waste'],
  ['wht', 'wheat', 'Greenfield Farms', 'agriculture', 'the wheat fields'], ['mlk', 'raw milk', 'Greenfield Farms', 'agriculture', 'the dairy herds'],
  ['egg', 'eggs', 'Greenfield Farms', 'agriculture', 'the hen houses'], ['lvs', 'livestock', 'Greenfield Farms', 'agriculture', 'the cattle and pig farms'],
  ['veg', 'vegetables', 'Greenfield Farms', 'agriculture', 'the market gardens'], ['frt', 'fruit', 'Greenfield Farms', 'agriculture', 'the orchards'],
  ['fsh', 'fish', 'Harbour Fisheries', 'agriculture', 'the sea'],
].map(([code, name, company, sector, from]) => ({ code, name, company, sector, from, stage: 'primary' }));

// [code, name, company, sector, inputs {raw or other material: amount per unit}]
export const MADE = [
  ['brk', 'brick', 'Redline Brickworks', 'manufacturing', { mud: 2, col: .2 }], ['ter', 'terracotta', 'Redline Brickworks', 'manufacturing', { mud: 2 }],
  ['cer', 'ceramic tile', 'Coastline Ceramics', 'manufacturing', { mud: 1, snd: 1 }], ['gls', 'glass', 'Clearview Glassworks', 'manufacturing', { snd: 2, col: .3 }],
  ['stl', 'steel', 'Ironforge Steel', 'manufacturing', { irn: 2, col: 1 }], ['con', 'concrete', 'Westhaven Concrete', 'construction', { lmt: 1, snd: 2, stn: 2 }],
  ['plr', 'plaster', 'Westhaven Concrete', 'construction', { gyp: 2 }], ['wd', 'timber', 'Northwood Sawmills', 'manufacturing', { log: 2 }],
  ['pqt', 'parquet', 'Northwood Sawmills', 'manufacturing', { wd: 1 }], ['sht', 'roof shingle', 'Tarpeak Roofing', 'manufacturing', { oil: 1, stn: 1 }],
  ['asp', 'asphalt', 'Westhaven Highways', 'construction', { oil: 1, stn: 3 }], ['pls', 'plastic', 'Petra Polymers', 'manufacturing', { oil: 2 }],
  ['rub', 'rubber', 'Elastica Rubber', 'manufacturing', { ltx: 2 }], ['fab', 'fabric', 'Loomhouse Textiles', 'manufacturing', { cot: 2 }],
  ['cpt', 'carpet', 'Loomhouse Textiles', 'manufacturing', { wol: 2, fab: 1 }], ['tch', 'tech tile', 'Atlas Dynamics', 'tech', { pls: 1, sil: 1 }],
  ['aly', 'alloy', 'Atlas Dynamics', 'tech', { stl: 1, rmn: 1 }], ['bgl', 'bio-gel', 'Novachem Labs', 'science', { bms: 3, rmn: .2 }],
  // food processing
  ['flr', 'flour', 'Millstone Mills', 'manufacturing', { wht: 2 }], ['brd', 'bread', 'Golden Crust Bakery', 'manufacturing', { flr: 1 }],
  ['dry', 'dairy (milk, butter, cheese)', 'Meadow Dairy', 'manufacturing', { mlk: 2 }], ['mt', 'meat', 'Prime Cuts Butchers', 'manufacturing', { lvs: 1 }],
].map(([code, name, company, sector, inputs]) => ({ code, name, company, sector, inputs, stage: 'secondary' }));

// who builds, sells, moves and services the finished things (tertiary)
export const SERVICES = [
  ['Westhaven Builders', 'construction', 'builds the buildings and houses'], ['Velo Motors', 'automotive', 'builds and sells cars; its dealers service them'],
  ['Kestrel Air', 'transport', 'builds and flies aircraft'], ['Harbour Shipyards', 'manufacturing', 'builds boats and ships'],
  ['MarketWay Retail', 'retail', 'runs the supermarkets and shops'], ['Atlas Freight', 'transport', 'moves materials from mines and farms to the factories and sites'],
  ['First Crown Bank', 'finance', 'lends the money for every project'], ['Spark & Pipe Utilities', 'utilities', 'power, water and repairs'],
  ['ATLAS Foundry', 'tech', 'fabricates robots and the dungeon monsters'],
].map(([name, sector, does]) => ({ name, sector, does, stage: 'tertiary' }));

export const ALL = Object.fromEntries([...RAW, ...MADE].map(m => [m.code, m]));
// groceries (kitchen.js ids) -> where they come from
export const GROCERY_FROM = { eggs: 'egg', bread: 'brd', butter: 'dry', milk: 'dry', cheese: 'dry', bacon: 'mt', chicken: 'mt', beef: 'mt', fish: 'fsh', flour: 'flr',
  potato: 'veg', tomato: 'veg', onion: 'veg', veg: 'veg', lemon: 'frt', fruit: 'frt', rice: 'wht', pasta: 'flr', sugar: 'veg', oil: 'veg', spice: 'veg', chocolate: 'frt' };
// finished things -> who makes them (and who sells them)
export const MAKER = { car: 'Velo Motors', police: 'Velo Motors', ambulance: 'Velo Motors', bus: 'Velo Motors', truck: 'Velo Motors', motorcycle: 'Velo Motors', bicycle: 'Velo Motors',
  tank: 'Ironforge Steel', plane: 'Kestrel Air', heli: 'Kestrel Air', helicopter: 'Kestrel Air', boat: 'Harbour Shipyards', submarine: 'Harbour Shipyards',
  building: 'Westhaven Builders', house: 'Westhaven Builders', monster: 'ATLAS Foundry', robot: 'ATLAS Foundry', instrument: 'Northwood Sawmills', grocery: 'MarketWay Retail' };

// the chain behind a material, as text: steel ← iron ore (Deepstone Mining) + coal (Deepstone Mining)
export function chainText(code, depth = 0) {
  const m = ALL[code]; if (!m) return code;
  if (m.stage === 'primary' || depth > 3) return `${m.name} (${m.company}, ${m.from})`;
  return `${m.name} (${m.company}) ← ${Object.keys(m.inputs).map(k => chainText(k, depth + 1)).join(' + ')}`;
}

// The flow of goods each city hour: primary companies extract in proportion to their sector's workers,
// secondary companies turn inputs into materials if the inputs are in stock, and whatever is built uses them up.
export function stepSupply(S, workers, boost = {}) {
  const st = S.stock ||= {};
  for (const r of RAW) st[r.code] = Math.min(5000, (st[r.code] || 0) + (.8 + workers(r.sector) * .08) * (1 + (boost[r.sector] || 0)));
  const start = (S.tick || 0) % MADE.length;   // factories take turns at the shared inputs
  for (let i = 0; i < MADE.length; i++) { const m = MADE[(start + i) % MADE.length];
    // each factory leaves a reserve of every input for the others (and for building sites) to use
    const can = Math.min(1 + workers(m.sector) * .04, ...Object.entries(m.inputs).map(([k, n]) => ((st[k] || 0) - (ALL[k]?.stage === 'secondary' ? 150 : 20)) / n));
    if (can <= 0 || (st[m.code] || 0) > 3000) continue;
    for (const [k, n] of Object.entries(m.inputs)) st[k] -= can * n;
    st[m.code] = (st[m.code] || 0) + can;
  }
}
// take materials out of stock for something being built; returns what is short (nothing if it's all there)
export function consume(S, need) {
  const st = S.stock ||= {}, short = Object.entries(need).filter(([k, n]) => (st[k] || 0) < n);
  if (short.length) return Object.fromEntries(short.map(([k, n]) => [k, Math.ceil(n - (st[k] || 0))]));
  for (const [k, n] of Object.entries(need)) st[k] -= n;
  return null;
}
