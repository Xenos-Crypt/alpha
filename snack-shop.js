// Buying snacks and drinks: a menu you open at shop tills, kiosks and vending machines.
// Food fills Hunger, drinks restore Energy; prices are in gold.
export const SNACKS = [
  { name: 'Packet of crisps', icon: '🥔', price: 2, hunger: 12 },
  { name: 'Chocolate bar', icon: '🍫', price: 3, hunger: 15, energy: 5 },
  { name: 'Apple', icon: '🍎', price: 2, hunger: 10, hp: 5 },
  { name: 'Sausage roll', icon: '🥐', price: 4, hunger: 22 },
  { name: 'Sandwich', icon: '🥪', price: 5, hunger: 30 },
  { name: 'Meal deal', icon: '🍱', price: 6, hunger: 40, energy: 10 },
  { name: 'Bottle of water', icon: '💧', price: 1, energy: 8 },
  { name: 'Fizzy drink', icon: '🥤', price: 2, energy: 12 },
  { name: 'Coffee', icon: '☕', price: 3, energy: 18 },
  { name: 'Energy drink', icon: '⚡', price: 4, energy: 30 },
];
// Menus for pubs, clubs and restaurants.
export const MENUS = {
  pub: [
    { name: 'Pint of lager', icon: '🍺', price: 5, energy: 6 },
    { name: 'Pint of ale', icon: '🍺', price: 5, energy: 6 },
    { name: 'Cider', icon: '🍏', price: 5, energy: 6 },
    { name: 'Lemonade', icon: '🍋', price: 2, energy: 10 },
    { name: 'Packet of crisps', icon: '🥔', price: 2, hunger: 12 },
    { name: 'Fish and chips', icon: '🐟', price: 11, hunger: 55, energy: 5 },
    { name: 'Pie and mash', icon: '🥧', price: 10, hunger: 50 },
    { name: 'Sunday roast', icon: '🍖', price: 14, hunger: 70, hp: 10 },
  ],
  club: [
    { name: 'Neon cocktail', icon: '🍸', price: 9, energy: 10 },
    { name: 'Bottle of beer', icon: '🍾', price: 6, energy: 6 },
    { name: 'Mocktail', icon: '🍹', price: 6, energy: 14 },
    { name: 'Energy drink', icon: '⚡', price: 5, energy: 30 },
    { name: 'Bottle of water', icon: '💧', price: 3, energy: 8 },
    { name: 'Loaded fries', icon: '🍟', price: 7, hunger: 30 },
  ],
  restaurant: [
    { name: 'Garlic bread', icon: '🥖', price: 5, hunger: 18 },
    { name: 'Soup of the day', icon: '🍲', price: 6, hunger: 25, hp: 5 },
    { name: 'Spaghetti carbonara', icon: '🍝', price: 13, hunger: 60 },
    { name: 'Margherita pizza', icon: '🍕', price: 12, hunger: 60 },
    { name: 'Steak and chips', icon: '🥩', price: 22, hunger: 80, hp: 15 },
    { name: 'Grilled salmon', icon: '🐟', price: 18, hunger: 65, hp: 20 },
    { name: 'Tiramisu', icon: '🍰', price: 7, hunger: 20, energy: 10 },
    { name: 'Espresso', icon: '☕', price: 3, energy: 20 },
  ],
};
const VENDING = ['Packet of crisps', 'Chocolate bar', 'Bottle of water', 'Fizzy drink', 'Energy drink'];

export function createSnackShop({ stats, maxHp, toast, pause, resume }) {
  const panel = document.createElement('section');
  panel.id = 'snackShop'; panel.hidden = true;
  panel.innerHTML = `<style>
    #snackShop{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.45);font-family:system-ui,sans-serif}
    #snackShop[hidden]{display:none}
    #snackShop .box{background:#14202b;color:#fff;border-radius:16px;padding:18px;width:min(460px,92vw);max-height:84vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
    #snackShop h2{margin:0 0 4px;font-size:20px}#snackShop .gold{opacity:.8;margin:0 0 12px;font-size:14px}
    #snackShop .item{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:6px}
    #snackShop .item .ic{font-size:22px;width:30px;text-align:center}#snackShop .item .nm{flex:1}#snackShop .item small{display:block;opacity:.7}
    #snackShop button{background:#2f8f5a;border:0;color:#fff;border-radius:9px;padding:8px 12px;font-size:14px;cursor:pointer}
    #snackShop button:disabled{background:#555;cursor:default}#snackShop .close{background:#444;margin-top:8px;width:100%}
    /* TALKING to someone is a small box at the bottom of the screen, not a full-screen menu: their line, what you
       can ask or do (each with a number key), and a space to type your own words */
    #snackShop .line,#snackShop .say,#snackShop .you{display:none}
    #snackShop.talk{inset:auto 0 calc(92px + env(safe-area-inset-bottom)) 0;background:none;place-items:end center;pointer-events:none}
    #snackShop.talk .box{pointer-events:auto;width:min(560px,calc(100vw - 32px));max-height:40vh;padding:10px 12px;border-radius:14px;background:rgba(14,22,32,.93);border:1px solid rgba(255,255,255,.14)}
    #snackShop.talk h2{font-size:14px;opacity:.8;margin:0 0 4px;font-weight:600}#snackShop.talk .gold{display:none}
    #snackShop.talk .line{display:block;margin:0 0 6px;font-size:15px;line-height:1.35}
    #snackShop.talk .you{display:block;margin:0 0 4px;font-size:13px;color:#9fc3e6;font-style:italic}#snackShop.talk .you:empty{display:none}
    #snackShop.talk .list{display:flex;flex-wrap:wrap;gap:6px}
    #snackShop.talk .item{display:block;margin:0;padding:0;background:none}
    #snackShop.talk .item .ic,#snackShop.talk .item .nm{display:none}
    #snackShop.talk .item button{background:#2b4a68;padding:6px 10px;font-size:13px}
    #snackShop.talk .item button kbd{display:inline-block;min-width:16px;margin-right:6px;padding:0 4px;border-radius:4px;background:#ffd23f;color:#111;font:700 11px system-ui}
    #snackShop.talk .say{display:flex;gap:6px;margin-top:8px}
    #snackShop.talk .say input{flex:1;min-width:0;height:34px;border-radius:8px;border:1px solid #5a7590;background:#0d1a29;color:#fff;padding:0 10px;font:14px system-ui}
    #snackShop.talk .close{position:absolute;top:6px;right:8px;width:auto;margin:0;padding:2px 8px;background:none;font-size:16px}
    #snackShop.talk .box{position:relative}
  </style><div class="box"><h2></h2><p class="gold"></p><p class="line"></p><p class="you"></p><div class="list"></div>
  <form class="say"><input type="text" maxlength="140" placeholder="Say something..." aria-label="Say something"><button type="submit">Say</button></form>
  <button class="close" type="button" aria-label="Close">✕</button></div>`;
  document.body.append(panel);
  const list = panel.querySelector('.list'), title = panel.querySelector('h2'), gold = panel.querySelector('.gold');
  panel.querySelector('.close').onclick = close;
  addEventListener('keydown', e => {
    if (panel.hidden) return;
    if (e.target === sayInput) { if (e.code === 'Escape') { e.preventDefault(); close(); } return; }   // typing: letters go in the box
    if (e.code === 'Escape' || e.code === 'KeyE') { e.preventDefault(); close(); return; }
    const m = talking && /^(?:Digit|Numpad)([1-9])$/.exec(e.code); if (m) { e.preventDefault(); const s = items[+m[1] - 1]; if (s) choose(s); }
  }, true);
  const lineEl = panel.querySelector('.line'), youEl = panel.querySelector('.you'), sayForm = panel.querySelector('.say'), sayInput = sayForm.querySelector('input');
  for (const k of ['keydown', 'keyup', 'keypress']) sayInput.addEventListener(k, e => { if (e.code !== 'Escape') e.stopPropagation(); });
  let talking = false;
  // while you're talking to someone, what they say (the game's messages) shows in the box as their line
  function echo(text) { if (!talking || panel.hidden) return false; lineEl.textContent = String(text).replace(/^[^\p{L}"“]*/u, ''); return true; }
  // your own words: matched to what you can ask; small talk gets a short answer
  const STOP = new Set('a an the to you your i me my is are do does did what whats how about of for on in it this that can could would please tell be so just'.split(' '));
  const words = t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  sayForm.onsubmit = e => {
    e.preventDefault(); const text = sayInput.value.trim(); sayInput.value = ''; if (!text) return;
    youEl.textContent = 'You: ' + text; const low = text.toLowerCase(), w = words(text);
    if (/\b(bye|goodbye|see you|later)\b/.test(low)) { lineEl.textContent = pickOne(['See you.', 'Take care.', 'Alright, later.']); setTimeout(close, 1400); return; }
    let best = null, bs = 0; for (const s of items) { const lw = words(s.name); if (!lw.length) continue; const hit = lw.filter(x => w.some(y => y === x || (y.length > 3 && x.length > 3 && (x.startsWith(y) || y.startsWith(x))))).length / lw.length; if (hit > bs) { bs = hit; best = s; } }
    if (best && bs >= 0.34) return choose(best);
    if (/^(hi|hello|hey|yo|hiya|good (morning|afternoon|evening))\b/.test(low)) { lineEl.textContent = pickOne(['Hey.', 'Hello.', 'Alright?']); return; }
    if (/\b(how are you|you ok|how you doing)\b/.test(low)) { lineEl.textContent = pickOne(['Getting by.', 'Busy. You?', 'Not bad.']); return; }
    if (/\b(thanks|thank you|cheers)\b/.test(low)) { lineEl.textContent = pickOne(['No problem.', 'Any time.']); return; }
    lineEl.textContent = `Sorry? You could ask me: ${items.slice(0, 3).map(s => s.name.replace(/[?.]$/, '').toLowerCase()).join('; ')}.`;
  };
  function choose(s) {
    youEl.textContent = 'You: ' + s.name; if (s.desc) lineEl.textContent = s.desc;
    buy(s);
  }

  const effect = s => s.desc || [s.hunger && `+${s.hunger} hunger`, s.energy && `+${s.energy} energy`, s.hp && `+${s.hp} health`].filter(Boolean).join(', ');
  let items = SNACKS;
  function render() {
    gold.textContent = `You have ${Math.floor(stats.gold)} gold · Hunger ${Math.round(stats.hunger)} · Energy ${Math.round(stats.energy)}`;
    list.replaceChildren(...items.map(s => {
      const row = document.createElement('div'); row.className = 'item';
      row.innerHTML = `<span class="ic">${s.icon}</span><span class="nm">${s.name}<small>${effect(s)}</small></span>`;
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.price ? `${s.price} gold` : (s.button || 'Choose'); b.disabled = stats.gold < s.price;
      if (talking) { b.textContent = ''; const k = document.createElement('kbd'); k.textContent = items.indexOf(s) + 1; b.append(k, s.name + (s.price ? ` (${s.price} gold)` : '')); }
      b.onclick = () => (talking ? choose(s) : buy(s)); if (s.owned?.()) { b.disabled = true; b.textContent = 'Owned'; } row.append(b); return row;
    }));
  }
  function buy(s) {
    if (stats.gold < s.price) return toast('Not enough gold.');
    if (s.onBuy && s.onBuy(s) === false) return;
    stats.gold -= s.price;
    if (s.hunger) stats.hunger = Math.min(100, stats.hunger + s.hunger);
    if (s.energy) stats.energy = Math.min(100, stats.energy + s.energy);
    if (s.hp) stats.hp = Math.min(maxHp(), stats.hp + s.hp);
    if (!s.onBuy) toast(`${s.icon} ${s.name}: ${effect(s)}.`);
    render();
  }
  function open(name = 'Shop', kind = 'shop', custom = null) {
    items = custom || MENUS[kind] || (kind === 'vending' ? SNACKS.filter(s => VENDING.includes(s.name)) : SNACKS);
    talking = kind === 'visit'; panel.classList.toggle('talk', talking);   // talking to a person: the small box
    lineEl.textContent = talking ? 'Yes? What is it?' : ''; youEl.textContent = '';
    title.textContent = name; render(); panel.hidden = false; pause?.();
  }
  function close() { if (panel.hidden) return; panel.hidden = true; talking = false; resume?.(); }
  return { open, close, echo, get isOpen() { return !panel.hidden; }, get talking() { return talking && !panel.hidden; } };
}
