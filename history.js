// WORLD HISTORY, IMPERFECT INFORMATION and YOUR LEGACY.
//
// HISTORY: the world remembers not just what happened but WHY, and what came of it. Every major event is
// recorded with its date (city year and day), its cause, who did it and where. Events that change the
// world (laws, projects, elections) note the state of things at the time, and a year later the history
// records what actually followed ("crime fell from 45 to 31 in the year after").
//
// INFORMATION: not everyone knows the same things, and not every source is right. Every piece of news has a
// SOURCE with a reliability: official reports (may leave things out), eyewitnesses (only what they saw),
// the newspaper (as good as its sources), gossip (often garbled), science (as good as the evidence) and
// leaked documents (authenticity unknown). Gossip passed along can change in the telling.
//
// LEGACY: what you leave behind — what you built and owned, offices you held and laws you passed, your
// family, your charity, and your controversies — and how the people remember you, hero or villain.
export const SOURCES = {
  official: { name: 'Official report', rel: 70, note: 'may leave out what the government would rather you didn\'t know' },
  witness: { name: 'Eyewitness', rel: 80, note: 'only what they saw' },
  press: { name: 'Horizon Media', rel: 65, note: 'as good as its sources' },
  gossip: { name: 'Gossip', rel: 40, note: 'changes in the telling' },
  science: { name: 'Scientific record', rel: 90, note: 'as good as the evidence' },
  court: { name: 'Court record', rel: 85, note: 'what was proved, which is not always what happened' },
  leak: { name: 'Leaked document', rel: 50, note: 'authenticity unverified' },
};
export function sourceFor(text) {
  if (/^(ELECTION|SNAP ELECTION|Assembly|ASSEMBLY|Council)/.test(text)) return 'official';
  if (/^⚖️/.test(text)) return 'court';
  if (/DISCOVERY|unearthed|ATLAS reached/.test(text)) return 'science';
  if (/SCANDAL|Privacy scandal/.test(text)) return 'press';
  if (/chased down|petitioned the Lawgiver|got married|welcomed a baby/.test(text)) return 'witness';
  return 'press';
}
// gossip changes in the telling: numbers drift, names slip
export function garble(text) {
  if (Math.random() > .3) return text;
  return text.replace(/\d+/g, n => String(Math.max(1, Math.round(+n * (.6 + Math.random() * .9))))).replace(/\b(Mayor|Minister|President)\b/, w => ({ Mayor: 'Minister', Minister: 'Mayor', President: 'Minister' })[w]);
}

const YEAR = 180;
export function createHistory({ S, ctx }) {
  const Hs = S.history ||= [];
  const L = S.legacy ||= { built: [], offices: [], laws: [], donations: 0, controversies: [], family: [] };
  const when = t => `Year ${Math.floor(t / YEAR) + 1}, day ${Math.floor((t % YEAR) / 24) + 1}`;
  // metrics an event can be judged by a year later
  const METRICS = { crime: () => S.crime, clean: () => S.clean, health: () => S.health, approval: () => S.approval, treasury: () => S.treasury, unemployed: () => ctx.unemployed?.() ?? 0, homeless: () => S.homes?.homeless ?? 0, pollution: () => S.waste?.pollution ?? 0, price: () => S.homes?.price ?? 0, dev: () => S.dev ?? 0 };
  const NAMES = { crime: 'crime', clean: 'cleanliness', health: 'health', approval: 'approval of the government', treasury: 'the treasury', unemployed: 'unemployment', homeless: 'homelessness', pollution: 'pollution', price: 'house prices', dev: 'development' };
  function record(kind, what, why, { who = null, where = null, watch = null, player = false } = {}) {
    const e = { t: S.tick, when: when(S.tick), kind, what, why, who, where, watch: watch ? { key: watch, before: Math.round(METRICS[watch]()), due: S.tick + YEAR } : null, after: null, player };
    Hs.unshift(e); Hs.length = Math.min(Hs.length, 300);
    return e;
  }
  function hourly() {
    for (const e of Hs) if (e.watch && !e.after && S.tick >= e.watch.due) {
      const now = Math.round(METRICS[e.watch.key]()), b = e.watch.before, d = now - b, name = NAMES[e.watch.key];
      e.after = Math.abs(d) < Math.max(2, Math.abs(b) * .05) ? `In the year after, ${name} hardly changed (${b} → ${now}).` : `In the year after, ${name} ${d > 0 ? 'rose' : 'fell'} from ${b} to ${now}.`;
    }
  }
  // how the people remember you
  function remembered(citizens) {
    const known = citizens.filter(c => !c.dead && (c.metPlayer || Math.abs(c.opinion) > 15));
    const hero = known.filter(c => c.opinion > 30).length, villain = known.filter(c => c.opinion < -30).length;
    return { known: known.length, hero, villain, word: !known.length ? 'unknown' : hero > villain * 2 ? 'a hero' : villain > hero * 2 ? 'a villain' : hero + villain < known.length / 3 ? 'a familiar face' : 'divisive: loved by some, hated by others' };
  }
  return { record, hourly, when, remembered, L, Hs, SOURCES };
}
