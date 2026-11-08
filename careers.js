// Jobs, schooling and universities.
// Workplaces all over the city have vacancies. You apply, and whether you're hired is part logic,
// part luck:
//   hard requirements: schooling, a degree, a licence, experience, a clean enough criminal record, level.
//   Miss one and you're turned down, with the reason.
//   Then the interview: your experience, education, record and level shift the odds, and a roll decides.
// Once hired you work shifts at the workplace for pay and experience, and get promoted.
// Arrests go on your criminal record, and some employers sack you for a conviction.
// Schooling: most people leave school with a certificate. If you didn't, adult education at the
// Job Centre gets you one.
// Universities (University of Westhaven, Ashford Polytechnic): enrol on a course, attend lectures,
// study in the library and sit the final exam to earn a degree that opens up better jobs.

export const COURSES = [
  { id: 'cs', name: 'Computer Science', uni: 'University of Westhaven', fee: 300, lectures: 6 },
  { id: 'medicine', name: 'Medicine', uni: 'University of Westhaven', fee: 650, lectures: 10 },
  { id: 'law', name: 'Law', uni: 'University of Westhaven', fee: 450, lectures: 8 },
  { id: 'eng', name: 'Engineering', uni: 'University of Westhaven', fee: 380, lectures: 7 },
  { id: 'arch', name: 'Architecture', uni: 'University of Westhaven', fee: 400, lectures: 7 },
  { id: 'business', name: 'Business and Finance', uni: 'Ashford Polytechnic', fee: 250, lectures: 5 },
  { id: 'nursing', name: 'Nursing', uni: 'Ashford Polytechnic', fee: 300, lectures: 6 },
  { id: 'teaching', name: 'Teaching', uni: 'Ashford Polytechnic', fee: 220, lectures: 5 },
  { id: 'media', name: 'Journalism and Media', uni: 'Ashford Polytechnic', fee: 220, lectures: 5 },
];
const COURSE = Object.fromEntries(COURSES.map(c => [c.id, c]));

// needs: school (certificate), degree (any of), drive (driving licence), exp {sector: shifts},
//        record (max convictions allowed), level (min player level)
export const JOBS = [
  { id: 'shelf', title: 'Shelf stacker', place: 'Westhaven Superstore', sector: 'retail', pay: 34, base: 0.85, needs: {} },
  { id: 'cashier', title: 'Cashier', place: 'Westhaven Local · Eastside', sector: 'retail', pay: 40, base: 0.75, needs: { school: true } },
  { id: 'storemgr', title: 'Store manager', place: 'Westhaven Superstore', sector: 'retail', pay: 95, base: 0.55, needs: { school: true, exp: { retail: 10 }, record: 2 } },
  { id: 'barista', title: 'Barista', place: 'Brew & Bean Café', sector: 'hospitality', pay: 36, base: 0.8, needs: {} },
  { id: 'arcade', title: 'Arcade attendant', place: 'Pixel Palace Express', sector: 'leisure', pay: 36, base: 0.8, needs: {} },
  { id: 'circus', title: 'Circus hand', place: 'Cirque Aurora', sector: 'leisure', pay: 42, base: 0.7, needs: {} },
  { id: 'labourer', title: 'Site labourer', place: 'Ashford Construction', sector: 'construction', pay: 50, base: 0.8, needs: {} },
  { id: 'sitemgr', title: 'Site manager', place: 'Ashford Construction', sector: 'construction', pay: 140, base: 0.5, needs: { degree: ['eng', 'arch'], exp: { construction: 8 } } },
  { id: 'architect', title: 'Architect', place: 'Ashford Construction', sector: 'construction', pay: 180, base: 0.45, needs: { degree: ['arch'] } },
  { id: 'tow', title: 'Recovery driver', place: 'Westhaven Recovery', sector: 'transport', pay: 45, base: 0.7, needs: { drive: true, record: 2 }, tow: true },
  { id: 'police', title: 'Police officer', place: 'Ashford Police HQ', sector: 'police', pay: 110, base: 0.5, needs: { school: true, drive: true, record: 0, level: 5 } },
  { id: 'nurse', title: 'Nurse', place: 'Capital Clinic', sector: 'health', pay: 120, base: 0.65, needs: { degree: ['nursing', 'medicine'], record: 1 } },
  { id: 'doctor', title: 'Doctor', place: 'Capital Clinic', sector: 'health', pay: 260, base: 0.45, needs: { degree: ['medicine'], exp: { health: 6 }, record: 0 } },
  { id: 'dev', title: 'Software engineer', place: 'Nexus Cyber Systems · North Office', sector: 'tech', pay: 200, base: 0.5, needs: { degree: ['cs'] } },
  { id: 'itsupport', title: 'IT support technician', place: 'Nexus Cyber Systems · North Office', sector: 'tech', pay: 70, base: 0.6, needs: { school: true } },
  { id: 'clerk', title: 'Bank clerk', place: 'Meridian Bank · Eastside branch', sector: 'finance', pay: 80, base: 0.6, needs: { school: true, record: 1 } },
  { id: 'analyst', title: 'Financial analyst', place: 'Meridian Bank · Eastside branch', sector: 'finance', pay: 190, base: 0.45, needs: { degree: ['business'], exp: { finance: 6 }, record: 0 } },
  { id: 'lawyer', title: 'Lawyer', place: 'Ashford Crown Court', sector: 'law', pay: 230, base: 0.45, needs: { degree: ['law'], record: 0 } },
  { id: 'teacher', title: 'Teacher', place: 'Ashford School', sector: 'education', pay: 120, base: 0.6, needs: { degree: ['teaching', 'cs', 'eng', 'business', 'media', 'law', 'medicine', 'arch', 'nursing'], record: 0 } },
  { id: 'lecturer', title: 'University lecturer', place: 'University of Westhaven', sector: 'education', pay: 210, base: 0.35, needs: { degree: ['cs', 'eng', 'law', 'medicine', 'arch'], exp: { education: 12 } } },
  { id: 'reporter', title: 'Reporter', place: 'Westhaven Job Centre', sector: 'media', pay: 90, base: 0.55, needs: { school: true }, desc: 'Freelance for The Ashford Times.' },
];
const RANKS = ['', 'Senior ', 'Lead '];
const PROMOTE_AT = [0, 8, 20];

// Pure hiring logic, so it can be tested: what's missing, and the odds if nothing is.
export function assess(job, p) {
  const n = job.needs, missing = [];
  if (n.school && !p.school) missing.push('a school certificate');
  if (n.degree && !n.degree.some(d => p.degrees.includes(d))) missing.push(`a degree in ${n.degree.map(d => COURSE[d]?.name || d).join(' or ')}`);
  if (n.drive && !p.drive) missing.push('a full driving licence');
  for (const [s, k] of Object.entries(n.exp || {})) if ((p.exp[s] || 0) < k) missing.push(`${k} shifts' experience in ${s} (you have ${p.exp[s] || 0})`);
  if (n.record != null && p.record > n.record) missing.push(n.record === 0 ? 'a clean criminal record' : `no more than ${n.record} conviction${n.record > 1 ? 's' : ''} (you have ${p.record})`);
  if (n.level && p.level < n.level) missing.push(`level ${n.level} (you're level ${p.level})`);
  if (p.wanted > 0) missing.push('to not be wanted by the police right now');
  const exp = p.exp[job.sector] || 0;
  let odds = job.base + Math.min(0.2, exp * 0.02) + (p.degrees.length ? 0.05 : 0) + (p.school ? 0.03 : -0.05) - p.record * 0.08 - (p.drivingPoints || 0) * 0.01 + Math.min(0.08, p.level * 0.004);
  odds = Math.max(0.05, Math.min(0.95, odds));
  return { ok: !missing.length, missing, odds };
}

export function createCareers(ctx) {
  // ctx: { toast, pause, resume, money, earn, spend, level, wanted, drive, drivingPoints, energy, useEnergy, gainXp, day, startsWithSchool, onTowShift, waypoint }
  const S = { school: ctx.startsWithSchool?.() ?? true, degrees: [], exp: {}, record: 0, crimes: [], job: null, applied: {}, course: null, nextShift: 0, nextLecture: 0 };

  // ---- panel ----
  const panel = document.createElement('section'); panel.id = 'careerPanel'; panel.hidden = true;
  panel.innerHTML = `<style>
    #careerPanel{position:fixed;inset:0;z-index:61;display:grid;place-items:center;background:rgba(0,0,0,.45);font-family:system-ui,sans-serif}
    #careerPanel[hidden]{display:none}
    #careerPanel .box{background:#14202b;color:#fff;border-radius:16px;padding:18px;width:min(560px,94vw);max-height:86vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
    #careerPanel h2{margin:0 0 4px;font-size:21px}#careerPanel .sub{opacity:.8;margin:0 0 10px;font-size:14px;line-height:1.4}
    #careerPanel h3{margin:14px 0 6px;font-size:15px;opacity:.85}
    #careerPanel .item{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:rgba(255,255,255,.07);margin-bottom:6px}
    #careerPanel .ic{font-size:22px;width:30px;text-align:center}#careerPanel .nm{flex:1}#careerPanel .nm small{display:block;opacity:.75;line-height:1.35}
    #careerPanel button{background:#2f6fb0;border:0;color:#fff;border-radius:9px;padding:8px 12px;font-size:14px;cursor:pointer;white-space:nowrap}
    #careerPanel button:disabled{background:#555;cursor:default}#careerPanel .close{background:#444;margin-top:10px;width:100%}
    #careerPanel .x{position:sticky;top:0;float:right;background:#444;width:38px;height:38px;border-radius:50%;padding:0;font-size:18px;margin:-6px -6px 0 8px}
    #careerPanel .good{color:#7ee2a8}#careerPanel .bad{color:#ff9a8a}
  </style><div class="box"><button class="x" type="button" aria-label="Close">✕</button><h2></h2><p class="sub"></p><div class="list"></div><button class="close" type="button">Close</button></div>`;
  document.body.append(panel);
  const $t = panel.querySelector('h2'), $s = panel.querySelector('.sub'), $l = panel.querySelector('.list');
  let draw = null;
  const close = () => { if (panel.hidden) return; panel.hidden = true; draw = null; ctx.resume?.(); };
  panel.querySelector('.close').onclick = close; panel.querySelector('.x').onclick = close;
  addEventListener('keydown', e => { if (!panel.hidden && (e.code === 'Escape' || e.code === 'KeyE')) { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  const show = (title, d) => { $t.textContent = title; draw = d; d(); if (panel.hidden) { panel.hidden = false; ctx.pause?.(); } };
  const refresh = () => draw?.();
  const rows = (heading, list) => { const out = []; if (heading) { const h = document.createElement('h3'); h.textContent = heading; out.push(h); }
    for (const r of list) { const row = document.createElement('div'); row.className = 'item'; row.innerHTML = `<span class="ic">${r.icon}</span><span class="nm">${r.name}<small>${r.sub || ''}</small></span>`;
      for (const b of r.btns || []) { const el = document.createElement('button'); el.type = 'button'; el.textContent = b.text; el.disabled = !!b.disabled; el.onclick = () => { b.fn(); refresh(); }; row.append(el); } out.push(row); }
    return out; };

  const profile = () => ({ school: S.school, degrees: S.degrees, exp: S.exp, record: S.record, level: ctx.level(), wanted: ctx.wanted(), drive: ctx.drive(), drivingPoints: ctx.drivingPoints?.() || 0 });
  const jobTitle = () => S.job ? RANKS[S.job.rank] + JOBS.find(j => j.id === S.job.id).title : 'Unemployed';
  const payNow = () => { const j = JOBS.find(j => j.id === S.job?.id); return j ? Math.round(j.pay * (1 + 0.25 * S.job.rank)) : 0; };
  const summary = () => `${jobTitle()}${S.job ? ` at ${JOBS.find(j => j.id === S.job.id).place} · ${payNow()} gold a shift` : ''} · Education: ${S.degrees.length ? S.degrees.map(d => COURSE[d].name).join(', ') + ' degree' : S.school ? 'school certificate' : 'no qualifications'} · Criminal record: ${S.record ? S.record + ' conviction' + (S.record > 1 ? 's' : '') : 'clean'}`;

  function apply(job) {
    const day = ctx.day(), last = S.applied[job.id];
    if (last != null && day - last < 1) return ctx.toast(`You applied to be a ${job.title.toLowerCase()} recently. They'll consider a new application tomorrow.`);
    const a = assess(job, profile());
    if (!a.ok) return ctx.toast(`❌ ${job.place} turns you down for ${job.title.toLowerCase()}: you need ${a.missing.join('; ')}.`);
    S.applied[job.id] = day;
    const roll = Math.random();
    if (roll < a.odds) {
      if (S.job) ctx.toast(`You hand in your notice as ${jobTitle().toLowerCase()}.`);
      S.job = { id: job.id, rank: 0, shifts: 0 };
      ctx.toast(`🎉 The interview went ${roll < a.odds * 0.5 ? 'brilliantly' : 'well'}. You're hired as a ${job.title.toLowerCase()} at ${job.place}! Start your shifts there. Pay: ${job.pay} gold a shift.`);
    } else ctx.toast(`😕 Interview for ${job.title.toLowerCase()} at ${job.place}: ${['they went with someone with more experience.', 'it was close, but not this time.', 'they liked you, but the post went to an internal candidate.', 'you were nervous and it showed.'][Math.floor(Math.random() * 4)]} (your odds were about ${Math.round(a.odds * 100)}%). Try again tomorrow.`);
  }
  function jobRow(job) {
    const a = assess(job, profile()), mine = S.job?.id === job.id;
    return { icon: mine ? '💼' : a.ok ? '📄' : '🔒', name: `${job.title} · ${job.place}`,
      sub: `${job.pay} gold a shift${job.desc ? ' · ' + job.desc : ''}<br>${mine ? '<span class="good">Your job</span>' : a.ok ? `<span class="good">You qualify · about ${Math.round(a.odds * 100)}% chance at interview</span>` : `<span class="bad">Needs ${a.missing.join('; ')}</span>`}`,
      btns: mine ? [] : [{ text: 'Apply', fn: () => apply(job) }] };
  }
  function openJobs(place = null) {
    show(place ? `Jobs at ${place}` : 'Westhaven Job Centre', () => {
      $s.textContent = summary();
      const list = JOBS.filter(j => !place || j.place === place);
      $l.replaceChildren(...rows(place ? '' : 'Vacancies across the city', list.map(jobRow)),
        ...(S.job ? rows('Your job', [{ icon: '🚪', name: `Quit as ${jobTitle().toLowerCase()}`, sub: `${S.job.shifts} shifts worked`, btns: [{ text: 'Quit', fn: () => { ctx.toast(`You quit your job as ${jobTitle().toLowerCase()}.`); S.job = null; } }] }]) : []));
    });
  }
  function work(place) {
    const job = JOBS.find(j => j.id === S.job?.id);
    if (!job || job.place !== place) return openJobs(place);
    const now = performance.now();
    if (now < S.nextShift) return ctx.toast(`Your next shift starts in ${Math.ceil((S.nextShift - now) / 1000)} seconds.`);
    if (ctx.wanted() > 0) return ctx.toast('You can\'t turn up for work with the police after you.');
    if (ctx.energy() < 20) return ctx.toast('You\'re too tired to work a shift. Get some sleep.');
    if (job.tow) { S.nextShift = now + 30000; return ctx.onTowShift?.(); }   // recovery drivers get a breakdown to fetch instead
    S.nextShift = now + 60000;
    const pay = payNow(), tip = Math.random() < 0.15 ? Math.round(pay * 0.3) : 0;
    finishShift(job, pay + tip, tip ? ` Plus a ${tip} gold bonus for a great shift!` : '');
  }
  function finishShift(job, pay, extra = '') {
    ctx.earn(pay); ctx.useEnergy(20); ctx.gainXp(10 + S.job.rank * 5);
    S.job.shifts++; S.exp[job.sector] = (S.exp[job.sector] || 0) + 1;
    ctx.toast(`💼 Shift done as ${jobTitle().toLowerCase()}: +${pay} gold.${extra}`);
    const next = PROMOTE_AT[S.job.rank + 1];
    if (next && S.job.shifts >= next && Math.random() < 0.7) { S.job.rank++; ctx.toast(`📈 Promotion! You're now ${jobTitle()}. Pay goes up to ${payNow()} gold a shift.`); }
  }

  // ---- education ----
  function openUniversity(uniName) {
    show(uniName || 'University registry', () => {
      const c = S.course && COURSE[S.course.id];
      $s.innerHTML = `${summary()}<br>${c ? `Studying <b>${c.name}</b>: ${S.course.lectures}/${c.lectures} lectures, ${S.course.study} study sessions.` : 'Not enrolled. Courses need a school certificate.'}`;
      const list = COURSES.filter(k => !uniName || k.uni === uniName || /registry/i.test(uniName)).map(k => {
        const has = S.degrees.includes(k.id), now = S.course?.id === k.id;
        return { icon: has ? '🎓' : now ? '📚' : '🏫', name: `${k.name} · ${k.uni}`, sub: has ? '<span class="good">Graduated</span>' : now ? 'You are enrolled' : `${k.lectures} lectures, then a final exam · fee ${k.fee} gold`,
          btns: has || now ? [] : [{ text: 'Enrol', disabled: !!S.course, fn: () => enrol(k) }] };
      });
      $l.replaceChildren(...rows('Degree courses', list), ...(S.course ? rows('', [{ icon: '🚪', name: 'Drop out of your course', sub: 'The fee is not refunded.', btns: [{ text: 'Drop out', fn: () => { S.course = null; ctx.toast('You leave your course.'); } }] }]) : []));
    });
  }
  function enrol(k) {
    if (!S.school) return ctx.toast('🏫 You need a school certificate before you can start a degree. Adult education at the Job Centre can help.');
    if (S.course) return ctx.toast('Finish (or drop) your current course first.');
    if (ctx.money() < k.fee) return ctx.toast(`The ${k.name} course costs ${k.fee} gold.`);
    ctx.spend(k.fee); S.course = { id: k.id, lectures: 0, study: 0, fails: 0 };
    ctx.toast(`🎓 Enrolled on ${k.name}! Attend ${k.lectures} lectures at ${k.uni}, study in the library, then sit the final exam.`);
  }
  function lecture() {
    const c = S.course && COURSE[S.course.id];
    if (!c) return ctx.toast('You\'re not enrolled. Visit the registry to choose a course.');
    if (S.course.lectures >= c.lectures) return ctx.toast('You\'ve attended every lecture. Revise in the library and sit your final exam.');
    const now = performance.now(); if (now < S.nextLecture) return ctx.toast(`The next lecture starts in ${Math.ceil((S.nextLecture - now) / 1000)} seconds.`);
    if (ctx.energy() < 15) return ctx.toast('You\'re too tired to concentrate. Get some rest first.');
    S.nextLecture = now + 40000; S.course.lectures++; ctx.useEnergy(15); ctx.gainXp(12);
    ctx.toast(`📚 ${c.name} lecture ${S.course.lectures} of ${c.lectures}: ${['you take pages of notes.', 'a tricky topic, but it clicks in the end.', 'the lecturer\'s jokes keep everyone awake.', 'group work: you lead the discussion.'][Math.floor(Math.random() * 4)]}`);
  }
  function study() {
    if (!S.course) return ctx.toast('📖 You browse the shelves for a while. Enrol on a course to study for a degree.');
    if (ctx.energy() < 10) return ctx.toast('Too tired to read. Get some sleep.');
    S.course.study = Math.min(6, S.course.study + 1); ctx.useEnergy(10); ctx.gainXp(5);
    ctx.toast(`📖 You revise in the library (${S.course.study}/6 study sessions). Every session improves your exam chances.`);
  }
  function exam() {
    const c = S.course && COURSE[S.course.id];
    if (!c) return ctx.toast('You\'re not enrolled on a course.');
    if (S.course.lectures < c.lectures) return ctx.toast(`You need to attend all ${c.lectures} lectures first (${S.course.lectures} so far).`);
    const chance = Math.min(0.95, 0.45 + S.course.study * 0.08 + S.course.fails * 0.1 + Math.min(0.1, ctx.level() * 0.005));
    if (Math.random() < chance) {
      S.degrees.push(c.id); S.course = null; ctx.gainXp(80);
      ctx.toast(`🎓 You passed! You graduate with a degree in ${c.name}. New jobs are open to you.`);
    } else { S.course.fails++; S.course.study = Math.max(0, S.course.study - 2); ctx.useEnergy(10);
      ctx.toast(`📝 You failed the ${c.name} exam (your chance was ${Math.round(chance * 100)}%). Study some more and resit it.`); }
  }
  function openSchool() {
    show('Adult education', () => {
      $s.textContent = S.school ? 'You already have your school certificate.' : 'Earn your school leaving certificate: three evening classes and a test. Many jobs and every degree course need it.';
      $l.replaceChildren(...rows('', S.school ? [{ icon: '📜', name: 'School certificate', sub: '<span class="good">Held</span>' }] : [{ icon: '📜', name: 'School leaving certificate', sub: 'Fee 60 gold · takes one sitting here', btns: [{ text: 'Take it (60)', disabled: ctx.money() < 60, fn: () => { ctx.spend(60); ctx.useEnergy(15); if (Math.random() < 0.75) { S.school = true; ctx.gainXp(30); ctx.toast('📜 Classes done, test passed: you have your school certificate!'); } else ctx.toast('📜 You didn\'t pass this time. Come back and try again.'); } }] }]));
    });
  }
  function convict(reason) {
    S.record++; S.crimes.unshift(reason); S.crimes = S.crimes.slice(0, 10);
    const job = JOBS.find(j => j.id === S.job?.id);
    if (job && job.needs.record != null && S.record > job.needs.record) { ctx.toast(`📰 ${job.place} hears about your conviction (${reason}). You've been dismissed as ${jobTitle().toLowerCase()}.`); S.job = null; }
  }
  function openCareer() {
    show('Your career', () => {
      $s.textContent = summary();
      const sectors = Object.entries(S.exp);
      $l.replaceChildren(
        ...rows('Experience', sectors.length ? sectors.map(([k, v]) => ({ icon: '🛠️', name: `${k[0].toUpperCase() + k.slice(1)}`, sub: `${v} shifts` })) : [{ icon: '🛠️', name: 'No work experience yet', sub: 'Entry-level jobs (shelf stacker, barista, site labourer...) take anyone.' }]),
        ...rows('Criminal record', S.record ? S.crimes.map(c => ({ icon: '⚖️', name: c })) : [{ icon: '✅', name: 'Clean record' }]),
        ...rows('', [{ icon: '📋', name: 'See every vacancy', btns: [{ text: 'Jobs', fn: () => openJobs() }] }, { icon: '🎓', name: 'University courses', btns: [{ text: 'Courses', fn: () => openUniversity('University registry') }] }]));
    });
  }
  return {
    S, assess: job => assess(job, profile()), openJobs, openUniversity, openSchool, openCareer, lecture, study, exam, convict, close, work,
    finishTow(pay) { const job = JOBS.find(j => j.id === 'tow'); if (S.job?.id === 'tow') finishShift(job, pay + payNow(), ' (wage plus call-out fee)'); },
    get job() { return S.job && JOBS.find(j => j.id === S.job.id); }, get title() { return jobTitle(); }, get isOpen() { return !panel.hidden; },
    kioskLabel(place) { const j = JOBS.find(x => x.id === S.job?.id); return j && j.place === place ? (j.tow ? 'Start a recovery shift' : `Start your shift (${jobTitle()})`) : `Ask about jobs at ${place}`; },
    snapshot: () => ({ school: S.school, degrees: S.degrees, exp: S.exp, record: S.record, crimes: S.crimes, job: S.job, applied: S.applied, course: S.course }),
    restore(s) { if (!s) return; for (const k of ['school', 'degrees', 'exp', 'record', 'crimes', 'job', 'applied', 'course']) if (s[k] !== undefined) S[k] = s[k]; },
  };
}
