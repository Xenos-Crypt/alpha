// LIVES — residents as people whose lives move on.
//  • Nobody has a skill out of nowhere: every skill is EARNED by practice (working the job, catching
//    thieves, fixing lamps…) and fades slowly if it isn't used. Their starting skill is what their years in
//    the job so far have taught them.
//  • Nobody keeps one job for life: people get promoted, quit, get fired, retrain, start businesses and
//    retire, driven by their AMBITION (become a doctor, own a business, get elected, get rich, raise a
//    family, discover something, be respected, see more of the country) — and they sometimes fail, give up
//    and choose another dream.
//  • A NAME is not a TITLE. Names can be common (two Daniel Okafors) or one of a kind; a title belongs to a
//    role at a place ("the Pastor" at church, "Officer" on duty) and goes when they leave it.
//  • You only learn about someone by getting to know them. Five stages of friendship (BOND):
//      Stranger → Acquaintance (first name, work) → Friend (full name, home, opinions, skills, achievements)
//      → Close friend (worries, money, secrets, how they really voted) → Bonded (health, illnesses, their
//      whole life story).
//  • ACHIEVEMENTS for residents and for you.
export const STAGES = [['Stranger', 0], ['Acquaintance', 10], ['Friend', 30], ['Close friend', 55], ['Bonded', 85]];
export const stageOf = bond => STAGES.reduce((s, [n, at], i) => bond >= at ? i : s, 0);
const AMBITIONS = { doctor: 'become a doctor', business: 'own a business', office: 'get elected', wealth: 'become wealthy', family: 'raise a family', discovery: 'discover something important', respect: 'be respected by everyone', travel: 'see every city in A.T.' };
const SYL = ['ka', 'zor', 'vyn', 'el', 'dra', 'mir', 'tho', 'lux', 'qua', 'ren', 'sio', 'bael', 'ny', 'oth', 'phe', 'ra', 'ul', 'xan'];
const TITLES = { 'Police officer': 'Officer', Doctor: 'Doctor', Nurse: 'Nurse', Teacher: 'Teacher', Soldier: 'Private', Imam: 'Imam', Rabbi: 'Rabbi', 'Christian minister': 'Pastor', Pastor: 'Pastor', Judge: 'Judge', Lawyer: 'Counsel', Pilot: 'Captain', Chef: 'Chef', Scientist: 'Dr', Engineer: 'Engineer' };
const rand = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const an = j => (/^[aeiou]/i.test(j) ? 'an ' : 'a ') + j.toLowerCase();

// give a freshly made resident a past: how long they've done their job, what it taught them, what they want
export function seedLife(c) {
  const r = rand(c.id * 977 + 3);
  if (r() < .08) { const cap = s => s[0].toUpperCase() + s.slice(1); c.name = cap(SYL[Math.floor(r() * 18)] + SYL[Math.floor(r() * 18)]) + ' ' + cap(SYL[Math.floor(r() * 18)] + SYL[Math.floor(r() * 18)] + 'e'); c.uniqueName = true; }
  c.tenure = c.job === 'Student' || c.job === 'Unemployed' ? 0 : Math.floor(r() * Math.max(1, Math.min(30, c.age - 21)));
  c.skills = {}; if (c.tenure) c.skills[c.job] = Math.min(95, Math.round(c.tenure * (2.5 + c.traits.diligence * 2)));
  c.ambition = c.traits.ambition > .75 ? (r() < .5 ? 'office' : 'business') : c.job === 'Nurse' || c.job === 'Student' && r() < .3 ? 'doctor' : c.job === 'Scientist' || c.job === 'Chemist' ? 'discovery' : c.traits.kindness > .7 ? 'respect' : c.traits.sociability > .7 ? 'family' : r() < .5 ? 'wealth' : 'travel';
  c.health = clamp(100 - Math.max(0, c.age - 40) * .8 - r() * 15, 20, 100); c.illnesses = [];
  c.achievements = []; if (c.tenure >= 10) c.achievements.push(`${c.tenure} years as ${an(c.job)}`);
  c.bond = 0; c.failures = 0; c.visited = [c.city];
  c.story = [`Born in ${c.city}${c.age > 60 ? ', long before the Unity chips' : ''}.`, c.tenure ? `Has worked as ${an(c.job)} for ${c.tenure} years.` : `Hasn't found their way yet.`, `Dreams of a chance to ${AMBITIONS[c.ambition]}.`];
}

export function createLives({ citizens, S, news, remember, ctx, JOB }) {
  const P = S.playerAch ||= { list: [], counters: {} };
  function achieve(c, text, important) {
    if (!c) { if (P.list.includes(text)) return; P.list.push(text); ctx.toast?.('🏅 Achievement: ' + text); return; }
    if (c.achievements.includes(text)) return; c.achievements.push(text); remember(c, 'Achieved: ' + text);
    if (important) news(`${c.name} — ${text}.`);
  }
  const playerCount = (k, n = 1, goals = []) => { P.counters[k] = (P.counters[k] || 0) + n; for (const [at, text] of goals) if (P.counters[k] >= at) achieve(null, text); };
  const skill = (c, k) => c.skills?.[k] || 0;
  function practise(c, k, amount) { c.skills ||= {}; const before = c.skills[k] || 0; c.skills[k] = Math.min(100, before + amount * (1 - before / 120)); if (before < 90 && c.skills[k] >= 90) achieve(c, 'Master ' + k.toLowerCase(), true); }

  // every city hour: practice at work, skills fade a little when not used
  function hourly(c, act) {
    if (act === 'work' && JOB[c.job]?.wage) practise(c, c.job, .05 + c.traits.diligence * .05);
    if (S.tick % 24 === 0) for (const k in c.skills) if (k !== c.job) c.skills[k] = Math.max(0, c.skills[k] - .2);
  }
  // once a city day: careers move, ambitions are chased (and sometimes given up)
  function daily(c) {
    if (c.jail || c.age < 16) return;
    if (S.tick % 24 === 0 && S.tick % (24 * 30) === 0) c.age++;   // a birthday each city month… (ages crawl, as lives do)
    if (JOB[c.job]?.wage) c.tenure = (c.tenure || 0) + 1 / 30;
    if (Math.floor(c.tenure) === 10 && !c.achievements.includes(`10 years as ${an(c.job)}`)) achieve(c, `10 years as ${an(c.job)}`);
    const r = Math.random();
    if (c.age >= 66 && c.job !== 'Retired' && r < .05) { remember(c, `Retired after ${Math.round(c.tenure)} years`); achieve(c, 'Retired'); return change(c, 'Retired'); }
    // fired: a careless worker who never got good
    if (JOB[c.job]?.wage && c.traits.diligence < .4 && skill(c, c.job) < 25 && r < .01) { remember(c, `Was fired from my job as ${an(c.job)}`); c.mood -= 15; c.failures++; news(`${c.name} lost their job.`); return change(c, 'Unemployed'); }
    // promoted / poached: skilled people move up (better pay)
    if (skill(c, c.job) > 75 && r < .02 && !/^Senior /.test(c.title || '')) { c.title = 'Senior ' + c.job.toLowerCase(); c.wealthBonus = (c.wealthBonus || 0) + .2; remember(c, 'Got promoted'); achieve(c, 'Promoted'); }
    // quit: unhappy people leave
    if (c.mood < 30 && JOB[c.job]?.wage && r < .01) { remember(c, `Quit my job as ${an(c.job)}`); return change(c, 'Unemployed'); }
    chase(c);
  }
  function chase(c) {   // try to move towards their dream; it can fail
    const r = Math.random(), go = (job, chance, success, fail) => { if (r > chance) return; if (Math.random() < .55 + c.traits.diligence * .3) { remember(c, success); change(c, job); achieve(c, success); } else { c.failures++; remember(c, fail); c.mood -= 6; if (c.failures >= 3) giveUp(c); } };
    switch (c.ambition) {
      case 'doctor': if (c.job !== 'Doctor') go(c.job === 'Nurse' && skill(c, 'Nurse') > 50 ? 'Doctor' : c.job === 'Student' ? 'Nurse' : 'Student', .004, c.job === 'Nurse' ? 'Qualified as a doctor' : 'Started training in medicine', 'Failed my medical exams'); else done(c); break;
      case 'business': if (c.job !== 'Shop owner') { if (c.wealth > 1500) go('Shop owner', .01, 'Opened my own business', 'My business plan was turned down by the bank'); } else done(c); break;
      case 'discovery': if (!['Scientist', 'Chemist'].includes(c.job)) go('Scientist', .003, 'Became a scientist', 'Wasn\'t accepted onto the research team'); else if (c.achievements.some(a => /Discovered/.test(a))) done(c); break;
      case 'wealth': if (c.wealth > 5000) done(c); else if (r < .004) { const best = Object.entries(JOB).filter(([j, v]) => v.wage > (JOB[c.job]?.wage || 0) && !['Doctor', 'AI researcher'].includes(j)).sort((a, b) => a[1].wage - b[1].wage)[0]; if (best) go(best[0], 1, `Took a better-paid job as ${an(best[0])}`, 'Was turned down for a better job'); } break;
      case 'travel': if (r < .01) { const city = ['Ashford', 'Riverside', 'Capital', 'Poison Land'][Math.floor(Math.random() * 4)]; if (!c.visited.includes(city)) { c.visited.push(city); remember(c, 'Visited ' + city); if (c.visited.length >= 4) { achieve(c, 'Has seen every city in A.T.'); done(c); } } } break;
      case 'respect': if ((c.helped || 0) > 20) { achieve(c, 'Respected by the whole street'); done(c); } break;
      case 'office': break;   // handled by the elections (government.js); losing counts as a failure there
      case 'family': if (c.family?.children?.length) done(c); break;
    }
  }
  function done(c) { if (c.ambitionDone === c.ambition) return; c.ambitionDone = c.ambition; achieve(c, 'Lived the dream: ' + AMBITIONS[c.ambition]); c.mood += 15; }
  function giveUp(c) {   // after enough failures people change their dream
    const old = c.ambition, next = Object.keys(AMBITIONS).filter(a => a !== old)[Math.floor(Math.random() * 7)];
    remember(c, `Gave up on trying to ${AMBITIONS[old]}; now I want to ${AMBITIONS[next]}`); c.ambition = next; c.failures = 0;
  }
  function change(c, job) { c.job = job; c.tenure = 0; c.title = null; c.skills ||= {}; c.story.push(`Became ${/^[AEIOU]/.test(job) ? 'an' : 'a'} ${job.toLowerCase()} at ${c.age}.`); if (c.story.length > 12) c.story.splice(3, 1); }

  // ---- getting to know someone ------------------------------------------------------------------------
  function bondUp(c, n, why) {
    if (c.opinion < -20) return;   // they won't open up to someone they dislike
    const before = stageOf(c.bond || 0);
    c.bond = clamp((c.bond || 0) + n * (c.opinion > 40 ? 1.4 : 1), 0, 100);
    const after = stageOf(c.bond);
    if (after > before) { ctx.toast?.(`🤝 You and ${after >= 1 ? c.name.split(' ')[0] : 'they'} are now: ${STAGES[after][0]}.`); if (after === 2) playerCount('friends', 1, [[1, 'Made a friend'], [10, 'Ten friends']]); if (after === 4) playerCount('bonded', 1, [[1, 'A bond for life']]); }
  }
  function knownName(c) { const s = stageOf(c.bond || 0); return s >= 2 ? c.name : s >= 1 ? c.name.split(' ')[0] : null; }
  function titleHere(c, e) { return e?.profession ? (TITLES[e.profession] || e.profession) : null; }   // a title only at their post
  return { achieve, playerCount, practise, hourly, daily, bondUp, knownName, titleHere, stageOf, skill, AMBITIONS, giveUp, change, P };
}
