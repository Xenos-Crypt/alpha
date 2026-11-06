// Licences for (almost) everything: apply at a licensing counter, pay the fee, pass a short
// test, then wait for it to be processed (half an in-game day). Without the right licence:
//   * firearms: the legal weapons shop won't sell you a gun (the black market will…)
//   * pilot: air traffic control reports you when you take off
//   * boat: the harbour master reports you when you sail
//   * motorbike: riding one unlicensed gets you stopped
// Driving and hunter licences have their own offices (DVLA counter, Hunter Association).
export const LICENCES = {
  firearms: { name: 'Firearms licence', icon: '🔫', fee: 120, needs: 'No active wanted level.', questions: [
    ['Where must a firearm be kept at home?', ['In a locked gun safe', 'Under the bed', 'In the car'], 0],
    ['When can you fire a gun in public?', ['Only in self-defence or on a licensed range', 'Whenever it is quiet', 'To scare people off'], 0],
    ['Before handing a gun to someone you should…', ['Unload it and check the chamber', 'Point it at the floor', 'Say "careful"'], 0],
    ['Buying a gun from an unlicensed dealer is…', ['A crime', 'Fine if it is cheaper', 'Allowed at night'], 0],
  ] },
  pilot: { name: 'Pilot licence', icon: '✈️', fee: 300, needs: 'None.', questions: [
    ['Before take-off you must…', ['Get clearance from air traffic control', 'Honk twice', 'Turn off the engine'], 0],
    ['Which way do you take off?', ['Into the wind, along the runway', 'Across the grass', 'Downwind for speed'], 0],
    ['Below the minimum safe height over the city you may…', ['Only take off or land', 'Do barrel rolls', 'Hover'], 0],
  ] },
  boat: { name: 'Boat licence', icon: '⛵', fee: 80, needs: 'None.', questions: [
    ['Two boats head towards each other. Each turns to…', ['Starboard (right)', 'Port (left)', 'Whichever is faster'], 0],
    ['Near swimmers and the harbour you should…', ['Slow right down', 'Speed past quickly', 'Sound the horn and carry on'], 0],
    ['What must every passenger have?', ['A life jacket', 'A ticket', 'A fishing rod'], 0],
  ] },
  motorbike: { name: 'Motorbike licence', icon: '🏍️', fee: 60, needs: 'None.', questions: [
    ['What must you wear on a motorbike?', ['An approved helmet', 'Sunglasses', 'Nothing special'], 0],
    ['Filtering through stopped traffic should be done…', ['Slowly and carefully', 'At full speed', 'On the pavement'], 0],
    ['Before changing lanes you take a…', ['Lifesaver look over your shoulder', 'Deep breath', 'Photo'], 0],
  ] },
  business: { name: 'Trading licence', icon: '🏪', fee: 200, needs: 'None.', questions: [
    ['A customer pays you. You must give…', ['A receipt', 'Nothing', 'A discount'], 0],
    ['Selling stolen goods is…', ['Illegal', 'Fine if they were cheap', 'Allowed with a sign'], 0],
  ] },
};
const PROCESS_DAYS = 0.5;

export function createLicences({ money, spend, toast, day, wanted, pause, resume, caught }) {
  const state = {};   // id -> { status: 'pending'|'held'|'revoked', ready: day }
  const panel = typeof document !== 'undefined' ? document.createElement('section') : null;
  if (panel) {
    panel.id = 'licencePanel'; panel.hidden = true;
    panel.innerHTML = `<style>
      #licencePanel{position:fixed;inset:0;z-index:62;display:grid;place-items:center;background:rgba(0,0,0,.45);font-family:system-ui,sans-serif}
      #licencePanel[hidden]{display:none}
      #licencePanel .box{background:#16202a;color:#fff;border-radius:16px;padding:16px;width:min(480px,94vw);max-height:86vh;overflow:auto}
      #licencePanel h2{margin:0 0 4px;font-size:19px}#licencePanel p{margin:4px 0 10px;font-size:13px;opacity:.85}
      #licencePanel .row{display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:6px;font-size:14px}
      #licencePanel .row .nm{flex:1}#licencePanel .row small{display:block;opacity:.7}
      #licencePanel button{background:#2f6f9f;border:0;color:#fff;border-radius:9px;padding:9px 12px;font-size:14px;min-height:40px}
      #licencePanel button.ghost{background:#444;width:100%;margin-top:8px}#licencePanel .opt{display:block;width:100%;text-align:left;margin:6px 0;background:#24384a}
    </style><div class="box"></div>`;
    document.body.append(panel);
    addEventListener('keydown', e => { if (!panel.hidden && e.code === 'Escape') { e.preventDefault(); close(); } }, true);
  }
  const box = panel?.querySelector('.box');
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
  function refresh() {
    for (const id in state) if (state[id].status === 'pending' && day() >= state[id].ready) { state[id].status = 'held'; toast(`${LICENCES[id].icon} Your ${LICENCES[id].name.toLowerCase()} has been issued.`); }
  }
  // A forged licence works like the real thing until someone checks it properly.
  const has = id => { refresh(); return state[id]?.status === 'held' || state[id]?.status === 'forged'; };
  const forged = id => state[id]?.status === 'forged';
  function forge(id) { state[id] = { status: 'forged' }; }
  // Run a check against a licence: if it's forged, there's a `chance` it's spotted (and taken).
  function check(id, chance, who = 'The officer') {
    if (!forged(id) || Math.random() >= chance) return false;
    state[id] = { status: 'revoked' };
    toast(`${who} runs your ${LICENCES[id].name.toLowerCase()} through the system… it's a FORGERY! It's confiscated and the police are called.`);
    caught?.(id);
    return true;
  }
  let title = 'Licensing Office';
  function list() {
    refresh();
    box.replaceChildren(el('h2', title), el('p', 'Apply, pay the fee, pass a short test, then wait about half a day while it is processed. Driving licences: DVLA counter. Hunter licences: Hunter Association.'));
    for (const [id, L] of Object.entries(LICENCES)) {
      const row = el('div', null, 'row'), s = state[id];
      const nm = el('span', `${L.icon} ${L.name}`, 'nm');
      nm.append(el('small', s?.status === 'forged' ? 'Held ✓ (forged: don\'t let anyone look too closely)' : s?.status === 'held' ? 'Held ✓' : s?.status === 'pending' ? `Processing… ready in about ${Math.max(1, Math.ceil((s.ready - day()) * 24))} game hours` : s?.status === 'revoked' ? 'Revoked. You can re-apply.' : `Fee ${L.fee} gold · Requirements: ${L.needs}`));
      row.append(nm);
      if (!s || s.status === 'revoked' || s.status === 'forged') { const b = el('button', 'Apply'); b.onclick = () => apply(id); row.append(b); }
      box.append(row);
    }
    const c = el('button', 'Close', 'ghost'); c.onclick = close; box.append(c);
  }
  function apply(id) {
    const L = LICENCES[id];
    if (id === 'firearms' && wanted() > 0) { toast('Application refused: you are wanted by the police.'); return; }
    if (forged(id) && Math.random() < 0.6) { state[id] = { status: 'revoked' }; toast('The clerk looks up your existing licence… it\'s a forgery! It\'s cancelled and reported.'); caught?.(id); list(); return; }
    if (money() < L.fee) { toast(`The fee is ${L.fee} gold.`); return; }
    spend(L.fee);
    quiz(id, [...L.questions].sort(() => Math.random() - 0.5).slice(0, 3), 0, 0);
  }
  function quiz(id, qs, i, right) {
    const L = LICENCES[id];
    if (i === qs.length) {
      if (right === qs.length) { state[id] = { status: 'pending', ready: day() + PROCESS_DAYS }; toast(`✅ Test passed! Your ${L.name.toLowerCase()} is being processed.`); }
      else { toast(`❌ ${right}/${qs.length}. You need every answer right. Re-apply to try again.`); }
      list(); return;
    }
    const [q, opts, ans] = qs[i];
    box.replaceChildren(el('h2', `${L.icon} ${L.name} test`), el('p', `Question ${i + 1} of ${qs.length}`), el('p', q));
    const order = opts.map((o, k) => k).sort(() => Math.random() - 0.5);
    for (const k of order) { const b = el('button', opts[k], 'opt'); b.onclick = () => quiz(id, qs, i + 1, right + (k === ans ? 1 : 0)); box.append(b); }
  }
  function open(name = 'Licensing Office') { if (!panel) return; title = name; list(); panel.hidden = false; pause?.(); }
  function close() { if (!panel || panel.hidden) return; panel.hidden = true; resume?.(); }
  return {
    has, forged, forge, check, open, close, revoke(id) { if (state[id]) state[id].status = 'revoked'; },
    snapshot() { return JSON.parse(JSON.stringify(state)); },
    restore(s) { if (s && typeof s === 'object') for (const k in s) if (LICENCES[k]) state[k] = s[k]; },
  };
}
