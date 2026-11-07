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
  </style><div class="box"><h2></h2><p class="gold"></p><div class="list"></div><button class="close" type="button">Close</button></div>`;
  document.body.append(panel);
  const list = panel.querySelector('.list'), title = panel.querySelector('h2'), gold = panel.querySelector('.gold');
  panel.querySelector('.close').onclick = close;
  addEventListener('keydown', e => { if (!panel.hidden && (e.code === 'Escape' || e.code === 'KeyE')) { e.preventDefault(); close(); } }, true);

  const effect = s => s.desc || [s.hunger && `+${s.hunger} hunger`, s.energy && `+${s.energy} energy`, s.hp && `+${s.hp} health`].filter(Boolean).join(', ');
  let items = SNACKS;
  function render() {
    gold.textContent = `You have ${Math.floor(stats.gold)} gold · Hunger ${Math.round(stats.hunger)} · Energy ${Math.round(stats.energy)}`;
    list.replaceChildren(...items.map(s => {
      const row = document.createElement('div'); row.className = 'item';
      row.innerHTML = `<span class="ic">${s.icon}</span><span class="nm">${s.name}<small>${effect(s)}</small></span>`;
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.price ? `${s.price} gold` : (s.button || 'Choose'); b.disabled = stats.gold < s.price;
      b.onclick = () => buy(s); if (s.owned?.()) { b.disabled = true; b.textContent = 'Owned'; } row.append(b); return row;
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
    title.textContent = name; render(); panel.hidden = false; pause?.();
  }
  function close() { if (panel.hidden) return; panel.hidden = true; resume?.(); }
  return { open, close, get isOpen() { return !panel.hidden; } };
}
