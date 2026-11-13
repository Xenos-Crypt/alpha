// The working nation: the economy sector by sector, companies and their research, ATLAS (the national
// AI in the Capital), scientists' discoveries and the temple dig. Runs every city hour from society.js.
// The country only moves forward: its DEVELOPMENT level never drops, and as it rises the basic standards
// (clean streets, health, roads, schools) have a higher floor, so the cities go from good to better.
import { SECTORS, sectorOfJob, COMPANIES, ATLAS_LEVELS, atlasLevel, makeDiscovery, RELICS, DIG_STAGES } from './nation.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createNationSim(api) {
  const { citizens, S, news, remember, nameOf } = api;
  S.eco ||= { boost: {}, out: {}, gdp: 0 };
  S.atlas ||= { data: 0, robots: 0, soldiers: 0, level: 0 };
  S.sci ||= { points: 0, n: 0, list: [] };
  S.dig ||= { progress: 0, finds: [] };
  S.dev ??= 0; S.selfDriving ??= 0;
  if (!S.companies) {
    const rich = citizens.filter(c => c.traits.ambition > .6 && c.age > 30).sort((a, b) => b.wealth - a.wealth);
    S.companies = COMPANIES.map(([name, sector, focus], i) => ({ name, sector, focus, founder: rich[i]?.id ?? i, value: 1e6 * (2 + i % 5), rd: Math.random() * 40, gen: 0 }));
  }
  const E = S.eco;
  const count = new Map();
  function census() { count.clear(); for (const c of citizens) { if (c.jail) continue; const s = sectorOfJob(c.job); if (s) count.set(s, (count.get(s) || 0) + 1); } }
  census();
  const workers = s => count.get(s) || 0;
  const byJob = j => citizens.filter(c => c.job === j && !c.jail);

  function feedAtlas(n, why) {
    const before = atlasLevel(S.atlas.data);
    S.atlas.data += n;
    const after = atlasLevel(S.atlas.data);
    if (after > before) { const L = ATLAS_LEVELS[after]; news(`🤖 ATLAS reached level ${after}, "${L.name}": ${L.does}`, true); }
    S.atlas.level = after;
  }

  function tick() {
    if (S.tick % 24 === 0) census();
    const lvl = atlasLevel(S.atlas.data);
    // the economy: every sector's output, plus whatever the robots add
    let gdp = 0;
    for (const k of Object.keys(SECTORS)) { const o = workers(k) * SECTORS[k].k * (1 + (E.boost[k] || 0)) * (1 + lvl * .03); E.out[k] = o; gdp += o; }
    gdp += S.atlas.robots * 1.5;
    E.gdp = gdp;
    S.treasury += gdp * S.tax / 100 * .06 + (lvl >= 1 ? 2 : 0);   // business taxes, and the grid savings once ATLAS runs it
    // companies research, grow and occasionally make a breakthrough
    for (const co of S.companies) {
      co.value *= 1 + .0005 * (1 + (E.boost[co.sector] || 0));
      co.rd += (workers(co.sector) * .01 + .03) * (1 + lvl * .15);
      if (co.rd >= 100) { co.rd = 0; co.gen++; breakthrough(co); }
    }
    // ATLAS learns from the Unity Network: what scientists and AI researchers feed it, and every machine it runs
    feedAtlas(byJob('AI researcher').length * .08 + byJob('Scientist').length * .03 + byJob('Software developer').length * .02 + .05);
    if (lvl >= 2 && S.tick % 20 === 0 && S.atlas.robots < 4 + lvl * 4) { S.atlas.robots++; if (S.atlas.robots % 4 === 1) news(`ATLAS built more robot workers (${S.atlas.robots} now working).`); }
    if (lvl >= 3 && S.tick % 30 === 0 && S.atlas.soldiers < 12) { S.atlas.soldiers++; }
    if (lvl >= 3) S.crime = clamp(S.crime - S.atlas.soldiers * .01, 0, 100);
    // science
    S.sci.points += (byJob('Scientist').length * .06 + byJob('Chemist').length * .08 + byJob('AI researcher').length * .03) * (lvl >= 4 ? 2 : 1);
    const need = 20 + S.sci.n * 8;
    if (S.sci.points >= need) {
      S.sci.points -= need;
      const team = [...byJob('Scientist'), ...byJob('Chemist')], who = team[Math.floor(Math.random() * team.length)];
      const d = makeDiscovery(S.sci.n++, who?.id);
      S.sci.list.unshift(d); S.sci.list.length = Math.min(S.sci.list.length, 30);
      E.boost[d.sector] = (E.boost[d.sector] || 0) + .05;
      if (who) remember(who, 'Discovered ' + d.name);
      news(`🔬 DISCOVERY: ${who ? who.name : 'A lab team'} found ${d.name}, ${d.about}.`, true);
      feedAtlas(40);
    }
    // the temple dig
    if (S.dig.progress < 100) {
      const before = Math.floor(S.dig.progress / 20), team = byJob('Archaeologist').length;
      S.dig.progress = clamp(S.dig.progress + .1 + team * .025, 0, 100);
      const findsDue = Math.floor(S.dig.progress / 8);
      while (S.dig.finds.length < Math.min(findsDue, RELICS.length)) {
        const relic = RELICS[S.dig.finds.length], who = byJob('Archaeologist')[Math.floor(Math.random() * team)];
        S.dig.finds.push({ relic, by: who?.id }); if (who) remember(who, 'Unearthed ' + relic);
        news(`🏺 At the temple dig, ${who ? who.name : 'the team'} unearthed ${relic}.`, true); feedAtlas(15);
        E.boost.tourism = (E.boost.tourism || 0) + .02;
      }
      const after = Math.floor(S.dig.progress / 20);
      if (after > before) news(`The temple dig: ${DIG_STAGES[after]}.`, true);
    }
    // development only ever rises, and lifts the floor under everything else
    const target = clamp(gdp / citizens.length * 30 + lvl * 6 + S.sci.n * 1.5 + S.dig.finds.length + Object.values(S.projects || {}).filter(p => p.done).length * 4 + S.companies.reduce((n, c) => n + c.gen, 0) * 2, 0, 100);
    if (target > S.dev) S.dev = Math.min(target, S.dev + .05);
    const floor = 15 + S.dev * .55;
    S.clean = Math.max(S.clean, floor); S.health = Math.max(S.health, floor); S.roads = Math.max(S.roads, floor); S.edu = Math.max(S.edu, floor);
    S.crime = Math.min(S.crime, 100 - S.dev * .6);
  }
  function breakthrough(co) {
    const founder = nameOf(co.founder);
    E.boost[co.sector] = (E.boost[co.sector] || 0) + .08;
    co.value *= 1.4;
    if (co.focus === 'self-driving cars') { S.selfDriving = clamp(S.selfDriving + .25, 0, 1); news(`🚗 ${co.name} released generation ${co.gen} self-driving cars. ${Math.round(S.selfDriving * 100)}% of the traffic now drives itself.`, true); }
    else if (co.focus === 'robotics') { feedAtlas(60); news(`${co.name} (founded by ${founder}) built a new robot platform for ATLAS.`, true); }
    else if (co.focus === 'new clinics') { S.health = clamp(S.health + 8, 0, 100); news(`🏥 ${co.name} opened a new hospital wing. Health care improves.`, true); }
    else if (co.focus === 'smart grid') { S.treasury += 300; news(`${co.name} rolled out a smarter power and water grid. Faster repairs, lower bills.`, true); }
    else news(`${co.name} made a breakthrough in ${co.focus} (generation ${co.gen}).`, co.gen === 1);
    feedAtlas(20);
  }
  return { tick, feedAtlas, census, workers };
}
