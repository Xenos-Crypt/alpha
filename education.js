// EDUCATION, TRAINING AND RANK — nobody walks into a skilled job. Children go to school and leave with
// grades; adults train for the work they want, at institutions that are bigger or smaller, easier or
// harder to get into:
//   MAJOR (national, in the Capital, high entry requirements): the University of A.T. (its medical and
//     law schools among them), the A.T. National Police College, the A.T. Military Academy;
//   SMALLER (in the cities, easier to get into): city universities and colleges, police training schools,
//     army training depots, a private flight school;
//   SCHOOLS: a primary and a secondary in every city, and private schools for those who can pay.
// Jobs need the right qualification (doctors a medical degree, police officers police training, pilots a
// licence…). The police and the armed forces have RANKS; the high ones need the senior courses at the
// national college or academy, years of service and real skill, and there are only so many posts at
// each level (one Commissioner, one Chief Constable per city, one General).
export const COURSES = {
  // course: [qualification, city days, entry grade, job it leads to]
  medicine: ['Medical degree (MD)', 240, 75, 'Doctor'], nursing: ['Nursing diploma', 90, 45, 'Nurse'], law: ['Law degree (LLB)', 180, 70, 'Lawyer'],
  teaching: ['Teaching degree', 120, 50, 'Teacher'], engineering: ['Engineering degree', 150, 60, 'Engineer'], computing: ['Computer science degree', 150, 60, 'Software developer'],
  ai: ['AI research doctorate (PhD)', 240, 82, 'AI researcher'], science: ['Science degree', 150, 60, 'Scientist'], chemistry: ['Chemistry degree', 150, 60, 'Chemist'],
  architecture: ['Architecture degree', 180, 65, 'Architect'], automotive: ['Automotive engineering degree', 150, 60, 'Car engineer'], business: ['Business & finance degree', 120, 55, 'Banker'],
  archaeology: ['Archaeology degree', 150, 55, 'Archaeologist'], journalism: ['Journalism diploma', 60, 40, 'Journalist'],
  electrical: ['Electrical installation certificate', 90, 30, 'Electrician'], plumbing: ['Plumbing certificate', 90, 30, 'Plumber'], mechanics: ['Motor vehicle certificate', 90, 30, 'Mechanic'],
  building: ['Construction certificate', 60, 20, 'Builder'], cooking: ['Professional cookery diploma', 60, 20, 'Chef'], power: ['Power plant operations certificate', 90, 40, 'Power plant operator'],
  flying: ['Commercial pilot licence', 120, 55, 'Pilot'], inspecting: ['Regulatory inspection certificate', 60, 50, 'Inspector'],
  police: ['Police constable training', 30, 40, 'Police officer'], soldier: ['Basic military training', 30, 25, 'Soldier'],
  // senior courses, taken while serving (no job change)
  policeInspector: ["Inspector's course", 20, 0, null], policeCommand: ['Senior command course', 30, 0, null],
  officer: ['Officer commission', 90, 65, null], staff: ['Staff college', 40, 0, null],
};
// [name, kind, city, level, courses, fee per course (0 = paid for by the state)]
export const INSTITUTIONS = [
  ['University of A.T.', 'university', 'Capital', 'major', ['medicine', 'law', 'ai', 'engineering', 'computing', 'science', 'chemistry', 'architecture', 'business', 'archaeology', 'teaching'], 400],
  ['University of Westhaven', 'university', 'Ashford', 'minor', ['nursing', 'teaching', 'engineering', 'computing', 'science', 'automotive', 'business', 'journalism'], 250],
  ['Riverside University', 'university', 'Riverside', 'minor', ['nursing', 'teaching', 'engineering', 'chemistry', 'archaeology', 'journalism', 'architecture'], 250],
  ['Capital City College', 'college', 'Capital', 'minor', ['electrical', 'plumbing', 'mechanics', 'building', 'cooking', 'power', 'inspecting'], 60],
  ['Ashford College', 'college', 'Ashford', 'minor', ['electrical', 'plumbing', 'mechanics', 'building', 'cooking', 'power'], 60],
  ['Riverside College', 'college', 'Riverside', 'minor', ['electrical', 'plumbing', 'mechanics', 'building', 'cooking'], 60],
  ['Poison Land Technical College', 'college', 'Poison Land', 'minor', ['electrical', 'mechanics', 'building', 'power'], 40],
  ['A.T. National Police College', 'police', 'Capital', 'major', ['police', 'policeInspector', 'policeCommand'], 0],
  ['Ashford Police Training School', 'police', 'Ashford', 'minor', ['police'], 0],
  ['Riverside Police Training School', 'police', 'Riverside', 'minor', ['police'], 0],
  ['A.T. Military Academy', 'military', 'Capital', 'major', ['officer', 'staff'], 0],
  ['Riverside Army Training Depot', 'military', 'Riverside', 'minor', ['soldier'], 0],
  ['Poison Land Army Training Depot', 'military', 'Poison Land', 'minor', ['soldier'], 0],
  ['Kestrel Air Flight School', 'flight', 'Capital', 'minor', ['flying'], 1500],
  ...['Ashford', 'Riverside', 'Capital', 'Poison Land', 'Skyhaven', 'Deephaven'].flatMap(c => [[`${c} Primary School`, 'school', c, 'minor', [], 0], [`${c} Secondary School`, 'school', c, 'minor', [], 0]]),
  ['Crownfield Academy', 'school', 'Capital', 'major', [], 900], ["St Ashford's School", 'school', 'Ashford', 'minor', [], 600],
].map(([name, kind, city, level, courses, fee]) => ({ name, kind, city, level, courses, fee }));
// what each job needs (any one of these)
export const NEEDS = Object.fromEntries(Object.entries(COURSES).filter(([, c]) => c[3]).map(([k, c]) => [c[3], [k]]));
NEEDS['Judge'] = ['law']; NEEDS['Banker'] = ['business']; NEEDS['Engineer'] = ['engineering', 'automotive']; NEEDS['Scientist'] = ['science', 'chemistry']; NEEDS['Soldier'] = ['soldier', 'officer'];
// the ranks, lowest first: [title, years of service, skill, course needed, how many posts (share of the force, or a number)]
export const RANKS = {
  'Police officer': [['Constable', 0, 0, null, 1], ['Sergeant', 2, 35, null, .25], ['Inspector', 4, 50, 'policeInspector', .1], ['Chief Inspector', 6, 60, 'policeInspector', .05],
    ['Superintendent', 9, 70, 'policeCommand', .025], ['Chief Constable', 12, 75, 'policeCommand', 'city'], ['Commissioner', 15, 80, 'policeCommand', 1]],
  Soldier: [['Private', 0, 0, null, 1], ['Corporal', 1, 30, null, .3], ['Sergeant', 3, 45, null, .15], ['Lieutenant', 0, 40, 'officer', .1], ['Captain', 3, 50, 'officer', .06],
    ['Major', 6, 60, 'staff', .03], ['Colonel', 10, 70, 'staff', .015], ['Brigadier', 14, 75, 'staff', 2], ['General', 18, 80, 'staff', 1]],
};
const DAY = 24, YEAR = 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const qualName = k => COURSES[k]?.[0] || k;

export function createEducation({ S, citizens, news = () => { }, remember = () => { }, achieve = () => { }, change = (c, job) => { c.job = job; }, rand = Math.random }) {
  const E = S.learning ||= { enrolled: 0, graduated: 0, failed: 0, rejected: 0, byInst: {}, promoted: 0 };
  const inst = name => INSTITUTIONS.find(i => i.name === name);
  const has = (c, k) => (c.quals || []).some(q => q.k === k);
  function qualified(c, job) { const need = NEEDS[job]; if (!need) return true; if (job === 'Judge') return has(c, 'law') && (c.lawYears || 0) >= 10; return need.some(k => has(c, k)); }
  // grades: what school gave them (adults who left school before the records began have one too)
  const gradeOf = c => c.grade ?? (c.grade = Math.round(clamp(25 + (c.traits?.diligence ?? .5) * 55 + (rand() - .5) * 30, 5, 99)));
  // apply for a course leading to a job: the best institution that will take them, and that they can pay for
  function apply(c, job) {
    const k = (NEEDS[job] || []).find(k => COURSES[k][3]); if (!k) return false;
    if (c.study) return false;
    const [q, days, entry] = COURSES[k], g = gradeOf(c);
    const fit = INSTITUTIONS.filter(i => i.courses.includes(k)).map(i => ({ i, entry: entry + (i.level === 'major' ? 10 : -5) - (k === 'police' && i.level === 'minor' ? 5 : 0) }))
      .filter(x => g >= x.entry && (x.i.fee === 0 || c.wealth >= x.i.fee || g >= 85))   // a scholarship for the best
      // the best place they can get into: a major one if their grades are well above its bar, otherwise close to home
      .sort((a, b) => ((b.i.level === 'major' && g >= b.entry + 8) - (a.i.level === 'major' && g >= a.entry + 8)) || ((b.i.city === c.city) - (a.i.city === c.city)));
    if (!fit.length) { E.rejected++; remember(c, `Applied to train as ${an(job)} but didn't meet the entry requirements`); c.failures = (c.failures || 0) + 1; return false; }
    const at = fit[0].i;
    if (at.fee && c.wealth >= at.fee) c.wealth -= at.fee;
    c.study = { k, inst: at.name, until: (S.tick || 0) + days * DAY / 6, aim: job, from: c.job };   // courses run faster than real ones, as lives do
    E.enrolled++; E.byInst[at.name] = (E.byInst[at.name] || 0) + 1;
    remember(c, `Started ${q.toLowerCase()} at ${at.name}`);
    if (COURSES[k][3]) change(c, 'Student');
    return true;
  }
  // a gate on changing job: qualified people go straight in; others apply to train first
  function gate(c, job) { if (qualified(c, job)) return true; apply(c, job); return false; }
  function finish(c) {
    const s = c.study, [q] = COURSES[s.k], at = inst(s.inst);
    const pass = rand() < clamp(.45 + (gradeOf(c) - 50) / 100 + (c.traits?.diligence ?? .5) * .3 + (at?.level === 'major' ? .05 : 0), .2, .97);
    c.study = null;
    if (!pass) { E.failed++; c.failures = (c.failures || 0) + 1; remember(c, `Failed the ${q.toLowerCase()} at ${s.inst}`); c.mood -= 8; if (COURSES[s.k][3] && c.job === 'Student') change(c, s.from === 'Student' ? 'Unemployed' : s.from || 'Unemployed'); return; }
    (c.quals ||= []).push({ k: s.k, from: s.inst, at: S.tick || 0 });
    E.graduated++; achieve(c, `Earned a ${q.toLowerCase()}`); remember(c, `Graduated from ${s.inst}: ${q}`);
    if (s.k === 'officer') { c.rank = 'Lieutenant'; c.title = 'Lieutenant'; }
    if (COURSES[s.k][3]) change(c, COURSES[s.k][3]);
  }
  // the founding residents already hold what their jobs need (earned before the records began)
  function seed() {
    for (const c of citizens) {
      if (c.dead) continue;
      gradeOf(c);
      if (c.quals) continue;
      c.quals = [];
      const need = NEEDS[c.job]; if (!need) continue;
      const k = need[0], at = INSTITUTIONS.find(i => i.courses.includes(k) && i.city === c.city) || INSTITUTIONS.find(i => i.courses.includes(k));
      c.quals.push({ k, from: at?.name || 'before the records', at: 0, before: true });
      if (c.job === 'Judge') { c.lawYears = 12; }
    }
  }
  // ranks: the police and the armed forces promote from within, when there is a post free
  function ranks() {
    for (const [job, ladder] of Object.entries(RANKS)) {
      const force = citizens.filter(c => !c.dead && !c.jail && c.job === job);
      for (const c of force) if (!c.rank) { c.rank = ladder[0][0]; c.title = c.rank; }
      const count = r => force.filter(c => c.rank === r).length;
      for (let i = ladder.length - 1; i >= 1; i--) {
        const [title, years, skill, course, posts] = ladder[i], below = ladder[i - 1][0];
        const cap = posts === 'city' ? 4 : posts >= 1 ? posts : Math.max(1, Math.floor(force.length * posts));
        if (count(title) >= cap) continue;
        // officer ranks start from the Academy's commission, not from the ranks below
        const pool = force.filter(c => (job === 'Soldier' && title === 'Lieutenant') ? false : c.rank === below)
          .filter(c => (c.tenure || 0) >= years && (c.skills?.[job] || 0) >= skill)
          .sort((a, b) => (b.skills?.[job] || 0) - (a.skills?.[job] || 0));
        const best = pool[0]; if (!best || rand() > .05) continue;
        if (course && !has(best, course)) {   // they need the senior course first: sent on it, still serving
          if (!best.study && (best.traits?.diligence ?? .5) > .3) { const at = INSTITUTIONS.find(x => x.courses.includes(course)); best.study = { k: course, inst: at.name, until: (S.tick || 0) + COURSES[course][1] * DAY / 6, aim: null, from: best.job }; E.enrolled++; remember(best, `Sent on the ${COURSES[course][0].toLowerCase()} at ${at.name}`); }
          continue;
        }
        best.rank = title; best.title = title; best.wealthBonus = (best.wealthBonus || 0) + .1; E.promoted++;
        remember(best, `Promoted to ${title}`); achieve(best, `Became ${title}`);
        if (['Commissioner', 'General', 'Chief Constable', 'Brigadier'].includes(title)) news(`🎖️ ${best.name} is the new ${title}${title === 'Commissioner' ? ' of the A.T. Police Service' : title === 'General' ? ' of the A.T. Armed Forces' : ''}.`, true);
      }
      // soldiers with the grades for it apply to the Military Academy to become officers
      for (const c of force) if (job === 'Soldier' && !c.study && !has(c, 'officer') && ['Corporal', 'Sergeant'].includes(c.rank) && gradeOf(c) >= 65 && rand() < .01) {
        const at = inst('A.T. Military Academy'); c.study = { k: 'officer', inst: at.name, until: (S.tick || 0) + COURSES.officer[1] * DAY / 6, aim: null, from: c.job }; E.enrolled++; remember(c, 'Accepted to the A.T. Military Academy');
      }
    }
  }
  function daily() {
    for (const c of citizens) {
      if (c.dead) continue;
      // children at school: a private one if the family can afford it
      if (c.age >= 5 && c.age < 16) {
        if (!c.school) {
          const parents = (c.family?.parents || []).map(i => citizens[i]).filter(Boolean), rich = parents.some(p => p.wealth > 3000);
          const pri = INSTITUTIONS.find(i => i.kind === 'school' && i.fee && i.city === c.city);
          c.school = (rich && pri ? pri : INSTITUTIONS.find(i => i.kind === 'school' && !i.fee && i.city === c.city && (c.age < 11 ? /Primary/ : /Secondary/).test(i.name)))?.name || null;
          if (rich && pri) { const p = parents.find(p => p.wealth > 3000); p.wealth -= pri.fee; }
        }
        if (c.age >= 11 && /Primary/.test(c.school || '')) c.school = INSTITUTIONS.find(i => i.kind === 'school' && /Secondary/.test(i.name) && i.city === c.city)?.name;
        // learning: diligence, a better school, and a little luck
        const at = inst(c.school);
        c.grade = clamp((c.grade ?? 40) + ((c.traits?.diligence ?? .5) - .45) * .6 + (at?.level === 'major' ? .25 : at?.fee ? .15 : 0) + (rand() - .5) * .4, 1, 99);
      } else if (c.age >= 16 && c.school) { remember(c, `Left ${c.school} with a grade of ${Math.round(c.grade)}`); c.school = null; }
      if (c.study && (S.tick || 0) >= c.study.until) finish(c);
      if (c.job === 'Lawyer') c.lawYears = (c.lawYears || 0) + 1 / 30;
      // the unemployed retrain for a trade they can get into
      if (c.job === 'Unemployed' && !c.study && c.age < 50 && rand() < .01) {
        const jobs = Object.entries(COURSES).filter(([, x]) => x[3] && x[2] <= gradeOf(c) && x[1] <= 120).map(([, x]) => x[3]);
        if (jobs.length) apply(c, jobs[Math.floor(rand() * jobs.length)]);
      }
    }
    ranks();
  }
  return { E, seed, daily, qualified, gate, apply, has, gradeOf, ranks, inst };
}
const an = j => (/^[AEIOU]/i.test(j) ? 'an ' : 'a ') + j.toLowerCase();
