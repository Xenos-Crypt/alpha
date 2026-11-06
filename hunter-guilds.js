// Hunter Association and guilds.
// The Association licenses hunters and rates them F→SSS. A rank needs BOTH the raw
// power (level tier) and a track record (completed contracts) — power alone does not
// make you trustworthy. Guilds sit on top: they post contracts, pay bonuses in their
// speciality and promote members by reputation.
import { HUNTER_RANKS, hunterRankForLevel, tierLabel } from './power-tiers.js';

export const GUILDS = {
  aegis:   { name: 'Aegis Vanguard',              flavour: 'Power-armoured defenders who maintain the planetary shield.', speciality: ['survey', 'patrol'], colour: '#56c8ff' },
  lantern: { name: 'Order of the Silver Lantern', flavour: 'Mages and oath-knights who seal dungeon gates.',              speciality: ['gate', 'boss'],     colour: '#f3dc8a' },
  thorn:   { name: 'Thornwild Rangers',           flavour: 'Beast hunters who keep the wilds and roads clear.',          speciality: ['cull'],             colour: '#86d77a' },
};
export const GUILD_TITLES = [[0, 'Recruit'], [100, 'Member'], [300, 'Veteran'], [700, 'Officer'], [1500, 'Guildmaster candidate']];
export const RECORD_FOR_RANK = [0, 2, 5, 10, 18, 30, 50, 80, 120];
export const LICENCE_FEE = 120, LICENCE_LEVEL = 3;

export const guildTitle = rep => GUILD_TITLES.filter(([min]) => rep >= min).pop()[1];
export function earnedRank(level, completed) {
  let record = 0;
  RECORD_FOR_RANK.forEach((need, i) => { if (completed >= need) record = i; });
  return Math.min(hunterRankForLevel(level), record);
}

// Contracts get harder, stranger and far better paid with each rank, F to SSS.
// PAY multiplies the base fee: an SSS contract pays 30x an F one.
export const CONTRACT_PAY = [1, 1.6, 2.5, 4, 6, 9, 14, 20, 30];
const PREY = ['slimes from the park', 'feral dog packs', 'goblin raiders', 'stone golems', 'wyvern broods', 'ogre warbands', 'abyssal knights', 'young dragons', 'calamity beasts'];
const BOSSES = ['the Slime King', 'the Alpha Hound', 'the Goblin Chieftain', 'the Iron Golem', 'the Wyvern Matriarch', 'the Ogre Warlord', 'the Abyssal Duke', 'the Elder Dragon', 'the World Serpent'];
export function makeContract(type, rank, rng = Math.random) {
  const r = Math.max(0, Math.min(CONTRACT_PAY.length - 1, rank)), T = HUNTER_RANKS[r], pay = n => Math.round(n * CONTRACT_PAY[r]);
  const tag = s => `[${T}] ${s}`;
  switch (type) {
    case 'cull':   { const n = 5 + r * 3; return { type, tier: T, title: tag(`Cull ${n} monsters: ${PREY[r]}`), goal: n, counter: 'kills', gold: pay(80), xp: 40 + r * 30, rep: 20 + r * 5 }; }
    case 'gate':   { const n = r >= 3 ? 2 : 1; return { type, tier: T, title: tag(`Clear ${n} dungeon gate${n > 1 ? 's' : ''} before it breaks`), goal: n, counter: 'dungeons', gold: pay(250), xp: 120 + r * 60, rep: 45 + r * 8 }; }
    case 'boss':   return { type, tier: T, title: tag(`Hunt down ${BOSSES[r]} (any gate boss)`), goal: 1, counter: 'bosses', gold: pay(400), xp: 200 + r * 80, rep: 70 + r * 10 };
    case 'patrol': return { type, tier: T, title: tag('Patrol the three perimeter checkpoints'), goal: 3, visit: 'patrol', gold: pay(120), xp: 60 + r * 20, rep: 25 + r * 4 };
    case 'survey': return { type, tier: T, title: tag('Survey two Aegis shield spires'), goal: 2, visit: 'spires', gold: pay(150), xp: 70 + r * 25, rep: 30 + r * 5 };
    case 'leisure': return { type, tier: T, title: tag('Security sweep: check four Leisure Park venues for monster signs'), goal: 4, visit: 'leisure', gold: pay(100), xp: 50 + r * 20, rep: 20 + r * 4 };
    case 'escort': return { type, tier: T, title: tag('Escort a nervous executive past three business district HQs'), goal: 3, visit: 'business', gold: pay(110), xp: 55 + r * 20, rep: 22 + r * 4 };
    case 'grid':   return { type, tier: T, title: tag('Inspect the Aegis power grid: the generator feed and the sewer manholes'), goal: 3, visit: 'grid', gold: pay(200), xp: 90 + r * 30, rep: 35 + r * 6 };
    case 'border': return { type, tier: T, title: tag('Reinforce all four border checkpoints at the edge of the dome'), goal: 4, visit: 'border', gold: pay(300), xp: 140 + r * 45, rep: 50 + r * 8 };
    case 'breach': { const n = 30 + r * 5; return { type, tier: T, title: tag(`Hold the line at a ${T}-class breach: defeat ${n} monsters`), goal: n, counter: 'kills', gold: pay(900), xp: 400 + r * 120, rep: 120 + r * 15 }; }
    default: return null;
  }
}

export function createHunterGuilds(ctx) {
  let state = { licensed: false, rank: 0, guild: null, rep: {}, completed: 0, active: null, offers: [] };
  let offerTimer = 0, notified = false, where = null;

  const panel = document.createElement('section');
  panel.id = 'hunterPanel'; panel.hidden = true;
  panel.innerHTML = '<div><h2 id="hunterTitle">Hunter Association</h2><p id="hunterStatus" role="status"></p><div id="hunterBody"></div><button id="hunterClose" type="button">Close</button></div>';
  document.body.append(panel);
  const body = panel.querySelector('#hunterBody'), status = panel.querySelector('#hunterStatus');
  panel.querySelector('#hunterClose').onclick = close;

  const counters = () => ctx.counters();
  function refreshOffers() {
    // Each rank unlocks new kinds of work; offers come at your rank or one below.
    const types = ['cull', 'patrol', 'survey', 'leisure'];
    if (state.rank >= 1) types.push('gate', 'escort');
    if (state.rank >= 2) types.push('boss', 'grid');
    if (state.rank >= 4) types.push('border');
    if (state.rank >= 6) types.push('breach');
    const picks = [];
    while (picks.length < 3) { const t = types[Math.floor(Math.random() * types.length)]; if (!picks.includes(t) || picks.length >= types.length) picks.push(t); }
    state.offers = picks.map(t => makeContract(t, Math.max(0, state.rank - (Math.random() < 0.35 ? 1 : 0))));
  }
  function progress(c = state.active) {
    if (!c) return 0;
    if (c.visit) return c.visited.length;
    return Math.max(0, counters()[c.counter] - c.start);
  }
  const done = c => progress(c) >= c.goal;

  function register() {
    if (state.licensed) return ctx.toast('You are already a licensed hunter.');
    if (ctx.level() < LICENCE_LEVEL) return ctx.toast(`Hunter licensing needs at least level ${LICENCE_LEVEL} (an awakened, stable power).`);
    if (ctx.money() < LICENCE_FEE) return ctx.toast(`The licence and power assessment costs ${LICENCE_FEE} gold.`);
    ctx.spend(LICENCE_FEE);
    state.licensed = true; state.rank = earnedRank(ctx.level(), state.completed);
    refreshOffers();
    ctx.toast(`Hunter licence issued: Rank ${HUNTER_RANKS[state.rank]}. Your power reads as ${tierLabel(ctx.level())}. You may now legally use combat powers against monsters and inside gates.`);
    ctx.changed?.(); render();
  }
  function reassess() {
    const next = earnedRank(ctx.level(), state.completed);
    if (next > state.rank) { state.rank = next; ctx.toast(`Promoted to Rank ${HUNTER_RANKS[next]} hunter.`); refreshOffers(); }
    else {
      const needRecord = RECORD_FOR_RANK[state.rank + 1], needPower = hunterRankForLevel(ctx.level()) <= state.rank;
      ctx.toast(state.rank >= HUNTER_RANKS.length - 1 ? 'You hold the highest rank.' : needPower ? `Your power tier is not yet high enough for Rank ${HUNTER_RANKS[state.rank + 1]}.` : `Complete ${needRecord - state.completed} more contracts for Rank ${HUNTER_RANKS[state.rank + 1]}.`);
    }
    ctx.changed?.(); render();
  }
  function join(id) {
    if (!state.licensed) return ctx.toast('Guilds only accept licensed hunters. Register at the Association first.');
    if (state.guild === id) return ctx.toast('You are already a member.');
    const fee = state.guild ? 200 : 0;
    if (fee && ctx.money() < fee) return ctx.toast(`Leaving ${GUILDS[state.guild].name} early costs a ${fee} gold contract buy-out.`);
    if (fee) ctx.spend(fee);
    state.guild = id; state.rep[id] ??= 0;
    ctx.toast(`You joined ${GUILDS[id].name}. ${GUILDS[id].flavour}`);
    ctx.changed?.(); render();
  }
  function accept(i) {
    if (!state.licensed) return ctx.toast('Only licensed hunters may take contracts.');
    if (state.active) return ctx.toast('Finish or abandon your current contract first.');
    const c = state.offers[i]; if (!c) return;
    state.active = { ...c, start: c.counter ? counters()[c.counter] : 0, visited: [] };
    state.offers.splice(i, 1); notified = false;
    ctx.toast(`Contract accepted: ${c.title}.`);
    ctx.changed?.(); render();
  }
  function abandon() {
    if (!state.active) return;
    state.active = null; state.rep[state.guild] = Math.max(0, (state.rep[state.guild] || 0) - 10);
    ctx.toast('Contract abandoned. Your guild noted it.');
    ctx.changed?.(); render();
  }
  function turnIn() {
    const c = state.active;
    if (!c || !done(c)) return ctx.toast('The contract is not complete yet.');
    const bonus = state.guild && GUILDS[state.guild].speciality.includes(c.type) ? 1.25 : 1;
    const gold = Math.round(c.gold * bonus), xp = Math.round(c.xp * bonus);
    ctx.earn(gold); ctx.gainXp(xp);
    if (state.guild) state.rep[state.guild] = (state.rep[state.guild] || 0) + c.rep;
    state.completed++; state.active = null;
    ctx.toast(`Contract paid: +${gold} gold, +${xp} XP${bonus > 1 ? ' (guild speciality bonus)' : ''}.`);
    if (state.offers.length < 3) refreshOffers();
    reassess();
  }

  function button(label, fn, disabled = false) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.disabled = disabled; b.onclick = fn; return b; }
  function para(text, cls) { const p = document.createElement('p'); p.textContent = text; if (cls) p.className = cls; return p; }
  function render() {
    body.replaceChildren();
    const g = state.guild ? GUILDS[state.guild] : null;
    status.textContent = state.licensed
      ? `Rank ${HUNTER_RANKS[state.rank]} hunter · ${state.completed} contracts · ${g ? g.name + ' (' + guildTitle(state.rep[state.guild] || 0) + ', ' + (state.rep[state.guild] || 0) + ' rep)' : 'No guild'} · Power: ${tierLabel(ctx.level())}`
      : `Unlicensed · Power: ${tierLabel(ctx.level())}. Using combat powers in public without a licence is an offence.`;
    if (where === 'hq') {
      body.append(para('The Hunter Association licenses ability users to fight monsters and enter gates. Ranks need both power and a record of completed contracts.'));
      if (!state.licensed) body.append(button(`Register and take the power assessment (${LICENCE_FEE} gold)`, register));
      else body.append(button('Request a rank re-assessment', reassess));
    }
    if (where && GUILDS[where]) {
      const gd = GUILDS[where];
      body.append(para(`${gd.name}: ${gd.flavour} Speciality contracts pay 25% more.`));
      body.append(button(state.guild === where ? 'You are a member' : `Join ${gd.name}`, () => join(where), state.guild === where));
      if (state.guild === where) body.append(button('Rest and treatment at the guild infirmary', () => { ctx.heal(); ctx.toast('Guild medics patched you up.'); }));
    }
    if (state.licensed) {
      const c = state.active;
      if (c) {
        body.append(para(`Active contract: ${c.title} — ${Math.min(progress(c), c.goal)}/${c.goal}. Reward ${c.gold} gold, ${c.xp} XP.`, 'supportSkillRow'));
        body.append(button('Turn in contract', turnIn, !done(c)), button('Abandon', abandon));
      } else {
        body.append(para('Contract board:', 'supportSkillRow'));
        if (!state.offers.length) refreshOffers();
        state.offers.forEach((o, i) => body.append(button(`${o.title} · ${o.gold} gold · ${o.xp} XP`, () => accept(i))));
      }
    }
  }
  function open(at) { where = at; ctx.pause(); panel.hidden = false; render(); }
  function close() { panel.hidden = true; where = null; ctx.resume(); }

  // Register desks/boards with the world.
  function addDesk(pos, at, label) { ctx.interactables.push({ pos, r: 3, label, action: () => open(at) }); }

  function update(dt) {
    offerTimer += dt;
    if (offerTimer > 240) { offerTimer = 0; if (state.licensed && !state.active) refreshOffers(); }
    const c = state.active;
    if (!c) return;
    if (c.visit) {
      const p = ctx.playerPosition(), list = ctx.checkpoints[c.visit] || [];
      list.forEach((q, i) => {
        if (!c.visited.includes(i) && Math.hypot(p.x - q.x, p.z - q.z) < 8) { c.visited.push(i); ctx.toast(`Checkpoint logged (${c.visited.length}/${c.goal}).`); ctx.changed?.(); }
      });
    }
    if (!notified && done(c)) { notified = true; ctx.toast('Contract objectives complete. Turn it in at the Hunter Association or any guild hall.'); }
  }

  return {
    open, close, addDesk, update, register, join, accept, turnIn, abandon, reassess,
    get licensed() { return state.licensed; }, get rank() { return HUNTER_RANKS[state.rank]; }, get state() { return state; },
    snapshot: () => JSON.parse(JSON.stringify(state)),
    restore(s) {
      if (!s || typeof s !== 'object') return;
      state = { ...state, ...s, rep: { ...(s.rep || {}) }, offers: Array.isArray(s.offers) ? s.offers : [] };
      if (state.guild && !GUILDS[state.guild]) state.guild = null;
      state.rank = Math.max(0, Math.min(7, state.rank | 0));
    },
  };
}
