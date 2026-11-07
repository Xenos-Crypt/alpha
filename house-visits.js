// Visiting other players' houses in an online room.
// A house you bought from the estate agent belongs to you. When another player in your room walks
// up to it they can either knock — you get "Let in / Turn away" — or break in. Breaking in works,
// but it's a crime: the owner is alerted at once and can report it to the police, which makes the
// burglar wanted. A player you let in can come and go from that house for 15 minutes.
// Messages travel over the room's broadcast channel as { type, ... } payloads.
const PASS_MINUTES = 15;

export function createHouseVisits(ctx) {
  // ctx: { send(payload), online(), myId(), owned(), toast, raiseWanted, enter(building), menu(title, items) }
  const owners = new Map();        // building name -> { id, name }
  const passes = new Map();        // building name -> time (ms) the pass runs out
  const knocked = new Map();       // building name -> time we last knocked (no spamming)
  let lastOwned = '', rebroadcast = 0;

  // a small alert in the corner with buttons (and Y / N keys, so it works with the mouse captured)
  const box = document.createElement('section'); box.id = 'visitAlert'; box.hidden = true;
  box.innerHTML = `<style>
    #visitAlert{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 70px);transform:translateX(-50%);z-index:66;background:rgba(12,16,24,.94);color:#fff;border:2px solid #ffd23f;border-radius:14px;padding:12px 14px;max-width:min(92vw,420px);font-family:system-ui,sans-serif;box-shadow:0 10px 30px #000a}
    #visitAlert[hidden]{display:none}#visitAlert p{margin:0 0 10px;font-size:15px;line-height:1.35}#visitAlert .row{display:flex;gap:8px;flex-wrap:wrap}
    #visitAlert button{flex:1;min-height:42px;border-radius:10px;border:0;font-weight:800;font-size:14px;cursor:pointer;padding:6px 10px}#visitAlert .yes{background:#22b35e;color:#fff}#visitAlert .no{background:#444;color:#fff}#visitAlert .bad{background:#c62828;color:#fff}
  </style><p></p><div class="row"></div>`;
  document.body.append(box);
  let current = null;
  function alertBox(text, buttons, seconds = 30) {
    current?.timeout && clearTimeout(current.timeout);
    box.querySelector('p').textContent = text;
    const row = box.querySelector('.row'); row.replaceChildren();
    const done = () => { box.hidden = true; current = null; };
    current = { buttons: buttons.map(([label, cls, fn, key]) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label + (key ? ` (${key})` : ''); b.onclick = () => { done(); fn(); }; row.append(b); return { key, run: () => { done(); fn(); } }; }) };
    current.timeout = setTimeout(done, seconds * 1000);
    box.hidden = false;
  }
  addEventListener('keydown', e => { if (!current) return; const k = e.key.toUpperCase(); const b = current.buttons.find(x => x.key === k); if (b) { e.preventDefault(); e.stopImmediatePropagation(); b.run(); } }, true);

  function broadcastOwned(force = false) {
    if (!ctx.online()) return;
    const list = ctx.owned(), key = list.join('|');
    if (!force && key === lastOwned) return;
    lastOwned = key; ctx.send({ type: 'houses', owned: list }).catch(() => {});
  }

  function receive(p) {
    if (!p || typeof p.type !== 'string') return;
    const me = ctx.myId(), from = { id: p.from, name: String(p.fromName || 'A player').slice(0, 24) };
    if (p.type === 'houses' && Array.isArray(p.owned)) {
      for (const [house, o] of owners) if (o.id === p.from) owners.delete(house);
      for (const house of p.owned.slice(0, 60)) if (typeof house === 'string') owners.set(house, from);
      return;
    }
    if (p.to !== me) return;
    const house = String(p.house || '').slice(0, 80);
    if (p.type === 'knock') {
      alertBox(`🚪 ${from.name} is knocking at your house "${house}". Let them in?`, [
        ['Let in', 'yes', () => { ctx.send({ type: 'knock-reply', to: from.id, house, allow: true }).catch(() => {}); ctx.toast(`You let ${from.name} into ${house}.`); }, 'Y'],
        ['Turn away', 'no', () => { ctx.send({ type: 'knock-reply', to: from.id, house, allow: false }).catch(() => {}); }, 'N'],
      ]);
    } else if (p.type === 'knock-reply') {
      if (p.allow) { passes.set(house, Date.now() + PASS_MINUTES * 60000); ctx.toast(`🚪 ${from.name} let you in. You can visit "${house}" for the next ${PASS_MINUTES} minutes.`); }
      else ctx.toast(`🚪 ${from.name} didn't let you in.`);
    } else if (p.type === 'break-in') {
      alertBox(`🚨 ${from.name} has broken into your house "${house}"!`, [
        ['Report to police', 'bad', () => { ctx.send({ type: 'report', to: from.id, house }).catch(() => {}); ctx.toast(`🚔 You reported ${from.name} for breaking into ${house}.`); }, 'Y'],
        ['Let it go', 'no', () => {}, 'N'],
      ], 45);
    } else if (p.type === 'report') {
      ctx.raiseWanted(150);
      ctx.toast(`🚔 The owner reported you for breaking into "${house}". The police are looking for you!`);
    }
  }

  // Called before entering a building: returns an alternative prompt when it's another player's house.
  function gate(b) {
    const o = owners.get(b?.name);
    if (!o || !ctx.online() || o.id === ctx.myId()) return null;
    if ((passes.get(b.name) || 0) > Date.now()) return null;   // you were let in
    return {
      label: `${o.name}'s house: knock, or break in`,
      action: () => ctx.menu(`${o.name}'s house — ${b.name}`, [
        { name: 'Knock and ask to come in', price: 0, desc: `${o.name} decides whether to let you in.`, onBuy: () => {
          const last = knocked.get(b.name) || 0;
          if (Date.now() - last < 15000) { ctx.toast('You already knocked. Give them a moment to answer.'); return false; }
          knocked.set(b.name, Date.now()); ctx.send({ type: 'knock', to: o.id, house: b.name }).catch(() => {}); ctx.toast(`🚪 You knock on the door. Waiting for ${o.name}...`); return false; } },
        { name: 'Break in (a crime)', price: 0, desc: `${o.name} will be alerted and can report you to the police.`, onBuy: () => {
          ctx.send({ type: 'break-in', to: o.id, house: b.name }).catch(() => {}); ctx.toast(`🚨 You force the door. ${o.name} has been alerted!`); ctx.enter(b); return false; } },
      ]),
    };
  }

  function update(dt) {
    rebroadcast -= dt;
    if (rebroadcast <= 0) { rebroadcast = 20; broadcastOwned(true); }   // late joiners learn who owns what
    else broadcastOwned(false);
  }
  return { receive, gate, update, playerLeft(id) { for (const [house, o] of owners) if (o.id === id) owners.delete(house); }, get owners() { return owners; }, get passes() { return passes; } };
}
