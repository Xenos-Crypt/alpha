// Power tiers for a world where nearly everyone has an ability.
// Level is raw power; the tier is how society classifies it. The scale is deliberately
// wide: level 20 already outputs enough force to wreck a car, yet level 50 is still
// "low tier" because the strongest people on the planet are in the thousands.
export const POWER_TIERS = [
  { min: 1,    rank: 'F',   name: 'Spark',            band: 'Low tier',    feat: 'Stronger than an athlete. Can dent sheet metal.' },
  { min: 10,   rank: 'E',   name: 'Kindled',          band: 'Low tier',    feat: 'Bends steel bars. Shatters reinforced glass.' },
  { min: 20,   rank: 'D',   name: 'Breaker',          band: 'Low tier',    feat: 'Wrecks a car in a few blows.' },
  { min: 35,   rank: 'D+',  name: 'Vanguard',         band: 'Low tier',    feat: 'Throws vehicles. Punches through brick walls.' },
  { min: 60,   rank: 'C',   name: 'Striker',          band: 'Mid tier',    feat: 'Levels a house. Shrugs off small-arms fire.' },
  { min: 120,  rank: 'B',   name: 'Siegebreaker',     band: 'High tier',   feat: 'Brings down an office block. Stops a train.' },
  { min: 250,  rank: 'A',   name: 'Calamity',         band: 'Elite',       feat: 'District-scale destruction. Duels armoured divisions.' },
  { min: 500,  rank: 'S',   name: 'Sovereign',        band: 'National',    feat: 'City-scale force. Treated like a strategic weapon.' },
  { min: 1000, rank: 'SS',  name: 'Cataclysm',        band: 'Continental', feat: 'Could crack the Aegis Shield if they tried.' },
];

export function powerTier(level) {
  const l = Math.max(1, Math.floor(Number(level) || 1));
  let tier = POWER_TIERS[0];
  for (const t of POWER_TIERS) if (l >= t.min) tier = t;
  const next = POWER_TIERS[POWER_TIERS.indexOf(tier) + 1] || null;
  return { ...tier, level: l, next };
}

export const tierLabel = level => { const t = powerTier(level); return `${t.band} ${t.rank} · ${t.name}`; };

// Multiplier for power damage against objects (vehicles, structures).
// Level 1 barely dents a car; level 20 = 1.0 (a car-wrecker); it keeps scaling after.
export function objectPowerScale(level) {
  const l = Math.max(1, Number(level) || 1);
  if (l < 20) return 0.12 + 0.88 * Math.pow(l / 20, 1.6);
  return 1 + (l - 20) * 0.08;
}

// Hunter Association rank allowed by raw power alone (contracts can lag behind it).
export const HUNTER_RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS'];
export function hunterRankForLevel(level) {
  const r = powerTier(level).rank.replace('+', '');
  return Math.max(0, HUNTER_RANKS.indexOf(r));
}
