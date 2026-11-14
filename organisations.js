// ORGANISATIONS — who runs what in A.T. Not everything is a private company: there are public bodies
// (paid for by taxes), private companies (run for profit), charities (run on donations), social
// enterprises (trade, but put their profits back into a social purpose), co-operatives (owned by their
// members) and NGOs. Each works in a stage of the economy:
//   primary    – takes raw materials from nature (farms, mines, quarries, fishing, forestry)
//   secondary  – makes things from them (factories, mills, construction materials)
//   tertiary   – services (shops, transport, building, health care, repairs, waste collection)
//   quaternary – knowledge (research, AI, IT, education, finance, media)
//   quinary    – the top decisions (government, the courts, the heads of universities and charities)

// [name, type, stage, sector, what it does]
export const ORGS = [
  // primary
  ['Greenfield Farms', 'private', 'primary', 'agriculture', 'farms wheat, milk, eggs, livestock, cotton, wool, hay and latex'],
  ['Harbour Fishers\' Co-operative', 'co-operative', 'primary', 'agriculture', 'fishes the sea; owned by its fishers'],
  ['Deepstone Mining', 'private', 'primary', 'resources', 'mines iron ore, coal, gypsum and rare minerals'],
  ['Deepstone Quarries', 'private', 'primary', 'resources', 'quarries stone, marble and limestone'],
  ['Riverbank Clay Co.', 'private', 'primary', 'resources', 'digs mud and clay'],
  ['Northwood Forestry', 'public', 'primary', 'resources', 'manages the national forests and fells timber'],
  ['Coastline Aggregates', 'private', 'primary', 'resources', 'extracts sand and silicon'],
  ['Brightwave Energy', 'private', 'primary', 'energy', 'drills crude oil, and is building cleaner power'],
  // secondary
  ['Ironforge Steel', 'private', 'secondary', 'manufacturing', 'makes steel'], ['Clearview Glassworks', 'private', 'secondary', 'manufacturing', 'makes glass'],
  ['Redline Brickworks', 'private', 'secondary', 'manufacturing', 'makes bricks and terracotta'], ['Coastline Ceramics', 'private', 'secondary', 'manufacturing', 'makes ceramic tiles'],
  ['Westhaven Concrete', 'private', 'secondary', 'construction', 'makes concrete and plaster'], ['Northwood Sawmills', 'co-operative', 'secondary', 'manufacturing', 'saws timber, makes parquet and instruments'],
  ['Petra Polymers', 'private', 'secondary', 'manufacturing', 'makes plastic'], ['Elastica Rubber', 'private', 'secondary', 'manufacturing', 'makes rubber'],
  ['Loomhouse Textiles', 'private', 'secondary', 'manufacturing', 'makes fabric and carpet'], ['Tarpeak Roofing', 'private', 'secondary', 'manufacturing', 'makes roof shingles'],
  ['Millstone Mills', 'private', 'secondary', 'manufacturing', 'mills flour'], ['Golden Crust Bakery', 'private', 'secondary', 'manufacturing', 'bakes bread'],
  ['Meadow Dairy', 'co-operative', 'secondary', 'manufacturing', 'makes milk, butter and cheese; owned by the dairy farmers'], ['Prime Cuts Butchers', 'private', 'secondary', 'manufacturing', 'prepares meat'],
  ['Velo Motors', 'private', 'secondary', 'automotive', 'builds cars, buses and bikes (and self-driving ones)'], ['Harbour Shipyards', 'private', 'secondary', 'manufacturing', 'builds boats'],
  ['Second Life Recycling', 'social enterprise', 'secondary', 'utilities', 'turns sorted waste back into materials; hires people who struggle to find work'],
  // tertiary
  ['Westhaven Builders', 'private', 'tertiary', 'construction', 'builds the buildings and houses'], ['Westhaven Highways', 'public', 'tertiary', 'construction', 'builds and repairs the roads'],
  ['MarketWay Retail', 'private', 'tertiary', 'retail', 'runs the supermarkets and shops'], ['Atlas Freight', 'private', 'tertiary', 'transport', 'moves goods around the country'],
  ['Kestrel Air', 'private', 'tertiary', 'transport', 'airline and aircraft maker'], ['SkyLink Charter', 'private', 'tertiary', 'transport', 'rooftop helicopter flights'],
  ['A.T. Transit', 'public', 'tertiary', 'transport', 'the buses, metro and trains'], ['Spark & Pipe Utilities', 'private', 'tertiary', 'utilities', 'power, water and repairs (electricians and plumbers)'],
  ['Westhaven Waste Services', 'public', 'tertiary', 'utilities', 'collects the rubbish, runs the recycling centre and the landfill'],
  ['A.T. Health Service', 'public', 'tertiary', 'health', 'the clinics and hospitals'], ['Heartwell Health', 'private', 'tertiary', 'health', 'private hospitals and clinics'],
  ['A.T. Police Service', 'public', 'tertiary', 'defence', 'keeps the peace'], ['A.T. Armed Forces', 'public', 'tertiary', 'defence', 'defends the country'],
  ['Common Table Café', 'social enterprise', 'tertiary', 'retail', 'a café whose profits pay for free meals'],
  ['A.T. Food Bank', 'charity', 'tertiary', 'public', 'feeds families who can\'t afford food'], ['Shelter of Hope', 'charity', 'tertiary', 'public', 'beds and support for people with nowhere to live'],
  ['Riverside Animal Rescue', 'charity', 'tertiary', 'tourism', 'rescues and rehomes animals'], ['Wild A.T. Trust', 'charity', 'tertiary', 'tourism', 'protects habitats, the zoo\'s breeding programmes and wild animals'],
  ['Clean Coasts Collective', 'NGO', 'tertiary', 'public', 'volunteers who clean beaches and campaign against waste'],
  // quaternary
  ['Atlas Dynamics', 'private', 'quaternary', 'tech', 'robotics and AI hardware for ATLAS'], ['ATLAS Foundry', 'public', 'secondary', 'tech', 'fabricates the robots and the dungeon monsters'], ['ATLAS (national AI)', 'public', 'quaternary', 'tech', 'runs every machine; learns from the Unity Network'],
  ['Novachem Labs', 'private', 'quaternary', 'science', 'chemistry research and bio-gel'], ['University of Westhaven', 'public', 'quaternary', 'education', 'teaching and research'],
  ['First Crown Bank', 'private', 'quaternary', 'finance', 'banking, loans and investment'], ['Horizon Media', 'private', 'quaternary', 'media', 'news and broadcasts'],
  ['Open Code A.T.', 'NGO', 'quaternary', 'tech', 'free software and digital skills for everyone'],
  // quinary
  ['Government of A.T.', 'public', 'quinary', 'public', 'the President, cabinet and Assembly'], ['Supreme Court of A.T.', 'public', 'quinary', 'public', 'the highest court'],
  ['National Heritage Board', 'public', 'quinary', 'tourism', 'decides what is protected, including the temple dig'],
].map(([name, type, stage, sector, does]) => ({ name, type, stage, sector, does }));
export const STAGES = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary'];
export const TYPES = ['public', 'private', 'charity', 'social enterprise', 'co-operative', 'NGO'];
export const TYPE_CODE = { public: 'pub', private: 'prv', charity: 'chr', 'social enterprise': 'soc', 'co-operative': 'cop', NGO: 'ngo' };
export const orgByName = n => ORGS.find(o => o.name === n);
// which stage each sector of the economy belongs to (for the economy panel)
export const STAGE_OF_SECTOR = { agriculture: 'primary', resources: 'primary', energy: 'primary', manufacturing: 'secondary', automotive: 'secondary', construction: 'secondary',
  utilities: 'tertiary', retail: 'tertiary', tourism: 'tertiary', transport: 'tertiary', health: 'tertiary', defence: 'tertiary', public: 'tertiary',
  tech: 'quaternary', science: 'quaternary', education: 'quaternary', finance: 'quaternary', media: 'quaternary' };
