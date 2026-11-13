// THE NATION OF A.T. — the country all the cities belong to (data and rules; society.js runs it).
//
// Cities: Ashford, Riverside, the Capital (seat of government and home of ATLAS) and Poison Land.
// Politics: a President elected every two city years (a city year is three real hours), a 60-seat
// National Assembly shared out between twelve parties by vote, a mayor for each city, a secret
// ballot, and a snap election if the government keeps failing. Three of the parties are the big ones
// everyone knows; they only take members by invitation.
// Economy: every sector, from farming and mining to cars, AI and tourism, with companies that do
// research and grow.
// ATLAS: the nation's AI, built in the Capital. It is wired into every machine (traffic, the grid,
// robots); it reaches people only through the Unity chip every resident carries.
// Science: scientists and chemists make discoveries. Archaeology: a dig uncovers an ancient temple.

export const COUNTRY = 'A.T.';
export const CITIES = ['Ashford', 'Riverside', 'Capital', 'Poison Land'];
export const YEAR = 180, TERM = 360;   // city hours (real minutes) per city year, per term of office

// [name, short, economic view (-1 low tax … +1 big state), order view (-1 freedom … +1 order), major, colour, motto]
export const PARTIES = [
  ['Sovereign Union of A.T.', 'SU', -.35, .75, true, '#2c4f9e', 'Strength, order and a proud nation.'],
  ["People's Progressive Alliance", 'PPA', .7, -.1, true, '#c0392b', 'A fair share for every family.'],
  ['Liberty & Prosperity Party', 'LPP', -.8, -.45, true, '#d4a017', 'Low taxes, free people, open markets.'],
  ['Green Dawn Movement', 'GDM', .45, -.5, false, '#27ae60', 'Clean air, wild places, a living planet.'],
  ['Iron Crown League', 'ICL', -.15, 1, false, '#4a4a4a', 'Law first. Always.'],
  ['Technocrat Assembly', 'TA', .1, .3, false, '#16a3b8', 'Let ATLAS and the experts decide.'],
  ["Workers' Banner Front", 'WBF', 1, .1, false, '#8e1b1b', 'The ones who build the nation should own it.'],
  ['Free Coast Federation', 'FCF', -.3, -.7, false, '#2e86de', 'Let the regions run themselves.'],
  ['Order of the Ancient Flame', 'OAF', 0, .6, false, '#b9770e', 'Remember the temples. Honour the old ways.'],
  ['New Horizon Collective', 'NHC', .4, -.25, false, '#8e44ad', 'The future belongs to the young.'],
  ['Merchant Guild Party', 'MGP', -.9, .2, false, '#7d6608', 'What is good for business is good for A.T.'],
  ['Silent Majority Party', 'SMP', 0, 0, false, '#7f8c8d', 'Common sense, quietly.'],
].map(([name, short, econ, order, major, colour, motto], id) => ({ id, name, short, econ, order, major, colour, motto }));
export const partyOf = c => {   // which party a resident leans to (about a third belong to none)
  if (c.indep ?? (c.indep = (c.id * 7919 % 100) < 32)) return null;
  let best = null, bs = 1e9;
  for (const p of PARTIES) { const d = Math.abs(p.econ - c.econ) + Math.abs(p.order - c.order) - (p.major ? .45 : 0) - (p.short === 'OAF' && c.job === 'Archaeologist' ? .5 : 0) - (p.short === 'TA' && /AI|Scientist|Engineer/.test(c.job) ? .4 : 0); if (d < bs) { bs = d; best = p.id; } }
  return best;
};

// Sectors of the economy: output per worker, and which jobs belong to them
export const SECTORS = {
  agriculture: { name: 'Agriculture', jobs: ['Farmer'], k: 1 },
  resources: { name: 'Mining & natural resources', jobs: ['Miner', 'Forester'], k: 1.3 },
  energy: { name: 'Energy', jobs: ['Power plant operator'], k: 1.6 },
  utilities: { name: 'Utilities (power & water)', jobs: ['Electrician', 'Plumber'], k: 1.1 },
  manufacturing: { name: 'Manufacturing', jobs: ['Factory worker'], k: 1.2 },
  automotive: { name: 'Automotive', jobs: ['Car engineer', 'Mechanic'], k: 1.4 },
  construction: { name: 'Construction', jobs: ['Builder', 'Architect'], k: 1.1 },
  tech: { name: 'Technology & AI', jobs: ['Software developer', 'AI researcher', 'Engineer'], k: 2 },
  science: { name: 'Science & research', jobs: ['Scientist', 'Chemist', 'Archaeologist'], k: 1.5 },
  health: { name: 'Healthcare', jobs: ['Doctor', 'Nurse'], k: 1.3 },
  education: { name: 'Education', jobs: ['Teacher'], k: 1 },
  finance: { name: 'Finance & law', jobs: ['Banker', 'Lawyer'], k: 2.2 },
  retail: { name: 'Retail & food', jobs: ['Shop worker', 'Shop owner', 'Chef'], k: 1 },
  tourism: { name: 'Tourism, heritage & nature', jobs: ['Tour guide', 'Zookeeper', 'Ranger'], k: 1.1 },
  transport: { name: 'Transport', jobs: ['Bus driver', 'Pilot'], k: 1.2 },
  defence: { name: 'Defence & police', jobs: ['Police officer', 'Soldier'], k: 1 },
  media: { name: 'Media & arts', jobs: ['Journalist', 'Artist'], k: 1 },
  public: { name: 'Public services', jobs: ['Street cleaner', 'Office worker'], k: .9 },
};
export const sectorOfJob = job => Object.keys(SECTORS).find(k => SECTORS[k].jobs.includes(job)) || null;

// Companies (founded by residents; they grow and do research)
export const COMPANIES = [
  ['Velo Motors', 'automotive', 'self-driving cars'], ['Spark & Pipe Utilities', 'utilities', 'smart grid'], ['Atlas Dynamics', 'tech', 'robotics'],
  ['Heartwell Health', 'health', 'new clinics'], ['Greenfield Farms', 'agriculture', 'vertical farms'], ['Deepstone Mining', 'resources', 'rare minerals'],
  ['Brightwave Energy', 'energy', 'fusion pilot'], ['Kestrel Air', 'transport', 'electric aircraft'], ['First Crown Bank', 'finance', 'digital money'],
  ['Novachem Labs', 'science', 'new compounds'], ['Westhaven Builders', 'construction', 'smart homes'], ['Horizon Media', 'media', 'holo-broadcasts'],
];

// ATLAS levels: what the national AI can do as it learns
export const ATLAS_LEVELS = [
  { at: 0, name: 'Seed', does: 'Reads the Unity Network and the city sensors.' },
  { at: 120, name: 'Grid mind', does: 'Runs traffic lights and the power grid: energy costs fall.' },
  { at: 350, name: 'Foundry', does: 'Designs and builds robot workers.' },
  { at: 800, name: 'Sentinel', does: 'Builds robot soldiers to guard the base and patrol.' },
  { at: 1600, name: 'Discovery engine', does: 'Helps scientists: discoveries come twice as fast.' },
  { at: 3000, name: 'Unity sync', does: 'News and ideas spread instantly through the Unity chips.' },
];
export const atlasLevel = data => ATLAS_LEVELS.reduce((l, x, i) => data >= x.at ? i : l, 0);

// Discoveries: names are made up from parts; each boosts a sector
const PRE = ['Ferro', 'Lumi', 'Cryo', 'Helio', 'Vita', 'Terra', 'Nano', 'Aqua', 'Pyro', 'Quanta', 'Silva', 'Aether'];
const SUF = ['lite', 'gen', 'cene', 'thane', 'zyme', 'phore', 'carb', 'sil', 'trine', 'dyne'];
const KINDS = [['compound', 'manufacturing', 'a new compound for stronger, lighter parts'], ['medicine', 'health', 'a new medicine that speeds up healing'], ['fuel', 'energy', 'a cleaner fuel'],
  ['crop strain', 'agriculture', 'a crop that grows in poor soil'], ['alloy', 'automotive', 'an alloy for safer car frames'], ['catalyst', 'resources', 'a catalyst that recovers more metal from ore'],
  ['algorithm', 'tech', 'a learning method that makes ATLAS smarter'], ['material', 'construction', 'a self-healing concrete']];
export function makeDiscovery(n, by) {
  const k = KINDS[n % KINDS.length], name = PRE[(n * 5 + 3) % PRE.length] + SUF[(n * 3 + 1) % SUF.length] + '-' + (n + 2);
  return { n, name, kind: k[0], sector: k[1], about: k[2], by };
}
// Archaeology: what comes out of the ground at the temple dig
export const RELICS = ['a bronze sun disc', 'an obsidian mask', 'clay tablets in an unknown script', 'a carved jade serpent', 'the bones of a temple guardian', 'a gold-leaf crown', 'a star map carved in basalt',
  'a sealed urn of ash and seeds', 'a stone altar with burnt offerings', 'a mural of the First Kings', 'a ceremonial dagger', 'a statue of a forgotten goddess'];
export const DIG_STAGES = ['Surveying the mound', 'Cutting the first trenches', 'Uncovering the temple steps', 'Raising the columns', 'Opening the inner sanctum', 'The temple stands uncovered'];
