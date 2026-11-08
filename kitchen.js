// Home cooking: groceries, the fridge, the cooker, a cookbook, the washing-up and a storage cupboard.
// There's no free food at home any more: you buy ingredients (supermarket, corner shop, or have
// them delivered), cook a recipe at the cooker, then eat it or keep it in the fridge.
// Cooking takes real time; leave a finished meal on the hob too long and it burns.

export const INGREDIENTS = [
  { id: 'eggs', name: 'Eggs', icon: '🥚', price: 3, raw: null },
  { id: 'bread', name: 'Bread', icon: '🍞', price: 2, raw: { hunger: 6 } },
  { id: 'butter', name: 'Butter', icon: '🧈', price: 3, raw: null },
  { id: 'milk', name: 'Milk', icon: '🥛', price: 2, raw: { energy: 4 } },
  { id: 'cheese', name: 'Cheese', icon: '🧀', price: 4, raw: { hunger: 8 } },
  { id: 'bacon', name: 'Bacon', icon: '🥓', price: 5, raw: null },
  { id: 'chicken', name: 'Chicken', icon: '🍗', price: 6, raw: null },
  { id: 'beef', name: 'Beef mince', icon: '🥩', price: 7, raw: null },
  { id: 'fish', name: 'Fish fillet', icon: '🐟', price: 7, raw: null },
  { id: 'pasta', name: 'Pasta', icon: '🍝', price: 2, raw: null },
  { id: 'rice', name: 'Rice', icon: '🍚', price: 2, raw: null },
  { id: 'potato', name: 'Potatoes', icon: '🥔', price: 1, raw: null },
  { id: 'tomato', name: 'Tomatoes', icon: '🍅', price: 1, raw: { hunger: 3 } },
  { id: 'onion', name: 'Onions', icon: '🧅', price: 1, raw: null },
  { id: 'veg', name: 'Vegetables', icon: '🥦', price: 2, raw: { hunger: 3 } },
  { id: 'beans', name: 'Tin of beans', icon: '🫘', price: 2, raw: null },
  { id: 'flour', name: 'Flour', icon: '🌾', price: 2, raw: null },
  { id: 'oil', name: 'Cooking oil', icon: '🫒', price: 2, raw: null },
  { id: 'herbs', name: 'Herbs and spices', icon: '🌿', price: 2, raw: null },
  { id: 'lemon', name: 'Lemons', icon: '🍋', price: 1, raw: null },
  { id: 'fruit', name: 'Fruit', icon: '🍓', price: 3, raw: { hunger: 8, hp: 2 } },
];
export const AISLES = [
  { name: 'Fruit and veg', icon: '🥦', items: ['potato', 'tomato', 'onion', 'veg', 'lemon', 'fruit'] },
  { name: 'Bakery and dairy', icon: '🥛', items: ['bread', 'butter', 'milk', 'cheese', 'eggs', 'flour'] },
  { name: 'Meat and fish', icon: '🥩', items: ['bacon', 'chicken', 'beef', 'fish'] },
  { name: 'Store cupboard', icon: '🥫', items: ['pasta', 'rice', 'beans', 'oil', 'herbs'] },
];
const ING = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

// time = seconds at the cooker; effects apply when you eat it
export const RECIPES = [
  { id: 'toast', name: 'Buttered toast', icon: '🍞', time: 8, need: { bread: 1, butter: 1 }, hunger: 20,
    steps: ['Toast two slices of bread until golden.', 'Spread the butter while the toast is hot.'] },
  { id: 'fruitsalad', name: 'Fruit salad', icon: '🍓', time: 6, need: { fruit: 2, lemon: 1 }, hunger: 20, hp: 10, energy: 5,
    steps: ['Chop the fruit into bite-size pieces.', 'Squeeze over the lemon so it stays fresh.'] },
  { id: 'eggs', name: 'Scrambled eggs on toast', icon: '🍳', time: 14, need: { eggs: 2, bread: 1, butter: 1 }, hunger: 35, energy: 5,
    steps: ['Whisk the eggs with a pinch of salt.', 'Melt the butter in a pan on a low heat.', 'Stir the eggs gently until just set, then pile onto toast.'] },
  { id: 'omelette', name: 'Cheese omelette', icon: '🧀', time: 15, need: { eggs: 3, cheese: 1, milk: 1, onion: 1 }, hunger: 45, hp: 5,
    steps: ['Fry the chopped onion until soft.', 'Pour in the eggs whisked with a splash of milk.', 'Scatter the grated cheese and fold in half.'] },
  { id: 'pancakes', name: 'Pancakes with fruit', icon: '🥞', time: 18, need: { flour: 1, eggs: 1, milk: 1, butter: 1, fruit: 1 }, hunger: 45, energy: 15,
    steps: ['Whisk the flour, egg and milk into a smooth batter.', 'Cook ladlefuls in a buttered pan, flipping once.', 'Stack them up and top with fruit.'] },
  { id: 'breakfast', name: 'Full breakfast', icon: '🥓', time: 25, need: { eggs: 2, bacon: 1, bread: 1, beans: 1, tomato: 1 }, hunger: 70, energy: 15,
    steps: ['Grill the bacon and halved tomatoes.', 'Warm the beans in a small pan.', 'Fry the eggs and toast the bread.', 'Plate it all up while it is hot.'] },
  { id: 'soup', name: 'Tomato soup', icon: '🍅', time: 22, need: { tomato: 3, onion: 1, oil: 1, herbs: 1 }, hunger: 40, hp: 10,
    steps: ['Soften the onion in the oil.', 'Add the chopped tomatoes and herbs and simmer.', 'Blend until smooth and season.'] },
  { id: 'stirfry', name: 'Vegetable stir-fry', icon: '🥦', time: 16, need: { veg: 2, rice: 1, oil: 1, onion: 1 }, hunger: 50, hp: 10,
    steps: ['Put the rice on to boil.', 'Stir-fry the onion and vegetables in hot oil.', 'Serve on the rice.'] },
  { id: 'macncheese', name: 'Mac and cheese', icon: '🧀', time: 20, need: { pasta: 1, cheese: 2, milk: 1, butter: 1 }, hunger: 60,
    steps: ['Boil the pasta.', 'Melt the butter, add the milk and stir in the cheese.', 'Mix the pasta through the sauce.'] },
  { id: 'bolognese', name: 'Spaghetti bolognese', icon: '🍝', time: 30, need: { pasta: 1, beef: 1, tomato: 2, onion: 1, herbs: 1 }, hunger: 75, energy: 10,
    steps: ['Brown the mince with the onion.', 'Add the tomatoes and herbs and simmer.', 'Boil the spaghetti and serve with the sauce.'] },
  { id: 'fishchips', name: 'Homemade fish and chips', icon: '🐟', time: 28, need: { fish: 1, potato: 2, flour: 1, oil: 1, lemon: 1 }, hunger: 70,
    steps: ['Cut the potatoes into chips and fry them.', 'Coat the fish in flour and fry until crisp.', 'Serve with a wedge of lemon.'] },
  { id: 'curry', name: 'Chicken curry and rice', icon: '🍛', time: 32, need: { chicken: 1, rice: 1, onion: 1, herbs: 1, oil: 1 }, hunger: 80, hp: 10,
    steps: ['Fry the onion and spices in the oil.', 'Add the chicken and cook through.', 'Simmer the sauce while the rice boils.'] },
  { id: 'stew', name: 'Beef stew', icon: '🍲', time: 45, need: { beef: 1, potato: 2, onion: 1, veg: 1, herbs: 1 }, hunger: 95, hp: 15,
    steps: ['Brown the beef in a big pot.', 'Add the potatoes, onion, vegetables and herbs.', 'Cover with water and simmer slowly.'] },
  { id: 'roast', name: 'Roast chicken dinner', icon: '🍗', time: 40, need: { chicken: 1, potato: 2, veg: 2, oil: 1, herbs: 1 }, hunger: 100, hp: 20, energy: 10,
    steps: ['Rub the chicken with oil and herbs and roast it.', 'Roast the potatoes alongside.', 'Steam the vegetables and carve.'] },
];

export const canCook = (pantry, r) => Object.entries(r.need).every(([k, n]) => (pantry[k] || 0) >= n);
export const cookingLevel = xp => Math.min(10, 1 + Math.floor(Math.sqrt(xp / 3)));
const MAX_DISHES = 4, MAX_MEALS = 8, BURN_AFTER = 45;

export function createKitchen({ stats, maxHp, toast, pause, resume, gainXp, bag, bagChanged }) {
  let pantry = { bread: 2, eggs: 2, butter: 1, fruit: 1 };   // a starter shop so the first meal is possible
  let meals = [], storage = [], dishes = 0, xp = 0;
  let cooking = null;   // { r, left, total, ready, waited }

  // ---- one panel for every kitchen screen ----
  const panel = document.createElement('section'); panel.id = 'homePanel'; panel.hidden = true;
  panel.innerHTML = `<style>
    #homePanel{position:fixed;inset:0;z-index:61;display:grid;place-items:center;background:rgba(0,0,0,.45);font-family:system-ui,sans-serif}
    #homePanel[hidden]{display:none}
    #homePanel .box{background:#1d1a16;color:#fff;border-radius:16px;padding:18px;width:min(520px,94vw);max-height:86vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
    #homePanel.book .box{background:#f4ead6;color:#2a2116;font-family:Georgia,serif}
    #homePanel h2{margin:0 0 4px;font-size:21px}#homePanel .sub{opacity:.75;margin:0 0 12px;font-size:14px}
    #homePanel h3{margin:14px 0 6px;font-size:15px;opacity:.85}
    #homePanel .item{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:rgba(255,255,255,.07);margin-bottom:6px}
    #homePanel.book .item{background:rgba(80,50,20,.08);align-items:flex-start}
    #homePanel .ic{font-size:22px;width:30px;text-align:center}#homePanel .nm{flex:1}#homePanel .nm small{display:block;opacity:.75;line-height:1.35}
    #homePanel button{background:#c46a2b;border:0;color:#fff;border-radius:9px;padding:8px 12px;font-size:14px;cursor:pointer;white-space:nowrap}
    #homePanel button:disabled{background:#666;cursor:default}#homePanel .close{background:#444;margin-top:10px;width:100%}
    #homePanel .have{color:#2e8b57}#homePanel .miss{color:#c0392b}
    #cookBar{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 64px);transform:translateX(-50%);z-index:30;background:rgba(20,16,12,.88);color:#fff;border-radius:12px;padding:8px 14px;font:600 14px system-ui,sans-serif;min-width:230px;text-align:center;pointer-events:none}
    #cookBar[hidden]{display:none}#cookBar i{display:block;height:6px;border-radius:3px;background:#444;margin-top:6px;overflow:hidden}#cookBar b{display:block;height:100%;background:#f39c12}
    #homePanel .x{position:sticky;top:0;float:right;background:#444;width:38px;height:38px;border-radius:50%;padding:0;font-size:18px;margin:-6px -6px 0 8px}
  </style><div class="box"><button class="x" type="button" aria-label="Close">✕</button><h2></h2><p class="sub"></p><div class="list"></div><button class="close" type="button">Close</button></div>`;
  document.body.append(panel);
  const bar = document.createElement('div'); bar.id = 'cookBar'; bar.hidden = true; bar.innerHTML = '<span></span><i><b></b></i>'; document.body.append(bar);
  const $t = panel.querySelector('h2'), $s = panel.querySelector('.sub'), $l = panel.querySelector('.list');
  let rerender = null;
  panel.querySelector('.close').onclick = close; panel.querySelector('.x').onclick = close;
  addEventListener('keydown', e => { if (!panel.hidden && (e.code === 'Escape' || e.code === 'KeyE')) { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  function show(title, draw, book = false) { panel.classList.toggle('book', book); $t.textContent = title; rerender = draw; draw(); if (panel.hidden) { panel.hidden = false; pause?.(); } }
  function close() { if (panel.hidden) return; panel.hidden = true; rerender = null; resume?.(); }
  const refresh = () => rerender?.();
  function rows(heading, list) {
    const out = [];
    if (heading) { const h = document.createElement('h3'); h.textContent = heading; out.push(h); }
    for (const r of list) {
      const row = document.createElement('div'); row.className = 'item';
      row.innerHTML = `<span class="ic">${r.icon}</span><span class="nm">${r.name}<small>${r.sub || ''}</small></span>`;
      for (const b of r.btns || []) { const el = document.createElement('button'); el.type = 'button'; el.textContent = b.text; el.disabled = !!b.disabled; el.onclick = () => { b.fn(); refresh(); }; row.append(el); }
      out.push(row);
    }
    return out;
  }
  const effects = m => [m.hunger && `+${m.hunger} hunger`, m.energy && `+${m.energy} energy`, m.hp && `+${m.hp} health`].filter(Boolean).join(', ');
  const fill = m => { stats.hunger = Math.min(100, stats.hunger + (m.hunger || 0)); stats.energy = Math.min(100, stats.energy + (m.energy || 0)); stats.hp = Math.min(maxHp(), stats.hp + (m.hp || 0)); };
  const level = () => cookingLevel(xp);
  const boost = m => { const k = 1 + (level() - 1) * 0.05; return { ...m, hunger: Math.round((m.hunger || 0) * k), energy: Math.round((m.energy || 0) * k), hp: Math.round((m.hp || 0) * k) }; };
  const pantryCount = () => Object.values(pantry).reduce((a, b) => a + b, 0);

  // ---- groceries (shops, and delivery from the fridge) ----
  function openGroceries(shopName = 'Groceries', surcharge = 0, only = null) {
    show(shopName, () => {
      $s.textContent = `You have ${Math.floor(stats.gold)} gold · ${pantryCount()} items in your kitchen${surcharge ? ` · delivery adds ${surcharge} gold an item` : ''}`;
      $l.replaceChildren(...rows('', INGREDIENTS.filter(i => !only || only.includes(i.id)).map(i => {
        const price = i.price + surcharge;
        return { icon: i.icon, name: i.name, sub: `You have ${pantry[i.id] || 0}`, btns: [
          { text: `${price} gold`, disabled: stats.gold < price, fn: () => buy(i, 1, price) },
          { text: `×5 · ${price * 5}`, disabled: stats.gold < price * 5, fn: () => buy(i, 5, price * 5) }] };
      })));
    });
  }
  // ---- a real shop: take things off the shelf into your basket, then pay at the till (or don't...) ----
  const basket = {};
  const basketCount = () => Object.values(basket).reduce((a, b) => a + b, 0);
  const basketValue = () => Object.entries(basket).reduce((a, [k, n]) => a + ING[k].price * n, 0);
  function openShelf(shelfName, only) {
    show(shelfName, () => {
      $s.textContent = `🧺 In your basket: ${basketCount()} items (${basketValue()} gold). Take what you want, then pay at the tills by the door.`;
      $l.replaceChildren(...rows('', INGREDIENTS.filter(i => !only || only.includes(i.id)).map(i => ({ icon: i.icon, name: i.name, sub: `${i.price} gold each · ${basket[i.id] ? `${basket[i.id]} in your basket` : 'not in your basket'}`, btns: [
        { text: 'Take 1', fn: () => { basket[i.id] = (basket[i.id] || 0) + 1; } },
        { text: 'Take 5', fn: () => { basket[i.id] = (basket[i.id] || 0) + 5; } },
        { text: 'Put back', disabled: !basket[i.id], fn: () => { if (!--basket[i.id]) delete basket[i.id]; } }] }))));
    });
  }
  function openTill(shopName) {
    show(`${shopName}: checkout`, () => {
      const total = basketValue();
      $s.textContent = basketCount() ? `The cashier scans your basket. Total: ${total} gold (you have ${Math.floor(stats.gold)}).` : 'Your basket is empty. Pick things up from the aisles first.';
      const lines = Object.entries(basket).map(([k, n]) => ({ icon: ING[k].icon, name: `${ING[k].name} × ${n}`, sub: `${ING[k].price * n} gold`, btns: [{ text: 'Put back', fn: () => { if (!--basket[k]) delete basket[k]; } }] }));
      $l.replaceChildren(...rows('', lines), ...rows('', basketCount() ? [{ icon: '💳', name: `Pay ${total} gold`, sub: 'Everything goes to your kitchen at home.', btns: [{ text: 'Pay', disabled: stats.gold < total, fn: () => { stats.gold -= total; for (const [k, n] of Object.entries(basket)) { pantry[k] = (pantry[k] || 0) + n; delete basket[k]; } toast(`🧾 Paid ${total} gold. Thank you for shopping with us! Your groceries go to your kitchen.`); } }] }] : []));
    });
  }
  // walking out without paying: you keep what you took, but it's theft
  function stealBasket() { const n = basketCount(), v = basketValue(); for (const [k, c] of Object.entries(basket)) { pantry[k] = (pantry[k] || 0) + c; delete basket[k]; } return { n, v }; }
  function buy(i, n, cost) { if (stats.gold < cost) return toast('Not enough gold.'); stats.gold -= cost; pantry[i.id] = (pantry[i.id] || 0) + n; toast(`${i.icon} Bought ${n} × ${i.name}. It goes in your kitchen at home.`); }

  // ---- the fridge: what you've got, leftovers, quick bites ----
  function openFridge() {
    show('Fridge and cupboards', () => {
      $s.textContent = `Hunger ${Math.round(stats.hunger)} · Energy ${Math.round(stats.energy)} · ${meals.length}/${MAX_MEALS} meals saved`;
      const saved = meals.map((m, idx) => ({ icon: m.icon, name: m.name + (m.burnt ? ' (burnt)' : ''), sub: effects(m), btns: [{ text: 'Eat', fn: () => { meals.splice(idx, 1); fill(m); dishes = Math.min(MAX_DISHES + 2, dishes + 1); toast(`${m.icon} You eat the ${m.name.toLowerCase()}. ${effects(m)}.`); } }] }));
      const stock = INGREDIENTS.filter(i => pantry[i.id] > 0).map(i => ({ icon: i.icon, name: `${i.name} × ${pantry[i.id]}`, sub: i.raw ? 'Can be eaten as it is' : 'Needs cooking',
        btns: i.raw ? [{ text: 'Eat one', fn: () => { pantry[i.id]--; if (!pantry[i.id]) delete pantry[i.id]; fill(i.raw); toast(`${i.icon} You have some ${i.name.toLowerCase()}. ${effects(i.raw)}.`); } }] : [] }));
      $l.replaceChildren(
        ...rows(saved.length ? 'Meals you cooked' : '', saved),
        ...rows('Ingredients', stock.length ? stock : [{ icon: '🫙', name: 'Nothing in here', sub: 'Buy groceries at a supermarket or corner shop, or have them delivered.' }]),
        ...rows('', [{ icon: '🛵', name: 'Order groceries to the door', sub: 'Same shop, plus a delivery charge.', btns: [{ text: 'Order', fn: () => openGroceries('Grocery delivery', 2) }] }]));
    });
  }

  // ---- the cookbook ----
  function openCookbook() {
    show('📖 The Westhaven Home Cookbook', () => {
      $s.textContent = `Cooking skill: level ${level()} (${xp} meals cooked). Higher levels cook faster and make more filling food.`;
      $l.replaceChildren(...rows('', RECIPES.map(r => ({ icon: r.icon, name: `${r.name} · ${Math.round(cookTime(r))} s`,
        sub: `<b>You need:</b> ${Object.entries(r.need).map(([k, n]) => `<span class="${(pantry[k] || 0) >= n ? 'have' : 'miss'}">${ING[k].icon} ${n} ${ING[k].name.toLowerCase()}</span>`).join(', ')}<br>${r.steps.map((s, i) => `${i + 1}. ${s}`).join('<br>')}<br><i>${effects(boost(r))}</i>` }))));
    }, true);
  }
  const cookTime = r => r.time * (1 - (level() - 1) * 0.05);

  // ---- the cooker ----
  function openCooker() {
    if (cooking && !cooking.ready) return toast(`🍳 The ${cooking.r.name.toLowerCase()} is still cooking (${Math.ceil(cooking.left)} s).`);
    if (cooking?.ready) return collect();
    if (dishes >= MAX_DISHES) return toast('🍽️ The sink is piled high with dirty dishes. Wash up before you cook again.');
    show('Cook a meal', () => {
      $s.textContent = `Cooking skill level ${level()} · Dirty dishes ${dishes}/${MAX_DISHES}. Check the cookbook for the method.`;
      const ok = RECIPES.filter(r => canCook(pantry, r)), no = RECIPES.filter(r => !canCook(pantry, r));
      $l.replaceChildren(
        ...rows(ok.length ? 'You can make' : '', ok.map(r => ({ icon: r.icon, name: r.name, sub: `${Math.round(cookTime(r))} s · ${effects(boost(r))}`, btns: [{ text: 'Cook', fn: () => start(r) }] }))),
        ...rows('Missing ingredients', no.map(r => ({ icon: r.icon, name: r.name, sub: 'Missing: ' + Object.entries(r.need).filter(([k, n]) => (pantry[k] || 0) < n).map(([k, n]) => `${n - (pantry[k] || 0)} ${ING[k].name.toLowerCase()}`).join(', ') }))));
    });
  }
  function start(r) {
    if (!canCook(pantry, r)) return;
    for (const [k, n] of Object.entries(r.need)) { pantry[k] -= n; if (!pantry[k]) delete pantry[k]; }
    const t = cookTime(r); cooking = { r, left: t, total: t, ready: false, waited: 0 };
    close(); toast(`🍳 You start cooking ${r.name.toLowerCase()}. ${r.steps[0]}`);
  }
  function collect() {
    const c = cooking; if (!c?.ready) return;
    const m = c.burnt ? { name: c.r.name, icon: '🔥', hunger: 5, burnt: true } : { name: c.r.name, icon: c.r.icon, ...boost(c.r) };
    if (c.burnt) { cooking = null; dishes++; toast(`🔥 The ${c.r.name.toLowerCase()} is burnt black. You scrape it into the bin.`); return; }
    show(`${c.r.icon} ${c.r.name} is ready`, () => {
      $s.textContent = effects(m);
      $l.replaceChildren(...rows('', [
        { icon: '🍽️', name: 'Eat it now', sub: 'Sit down and enjoy it while it\'s hot.', btns: [{ text: 'Eat', fn: () => { cooking = null; fill(m); dishes++; close(); toast(`${m.icon} Delicious. ${effects(m)}.`); } }] },
        { icon: '🧊', name: 'Keep it in the fridge', sub: meals.length >= MAX_MEALS ? 'The fridge is full.' : 'Eat it later from the fridge.', btns: [{ text: 'Save', disabled: meals.length >= MAX_MEALS, fn: () => { cooking = null; meals.push(m); dishes++; close(); toast(`🧊 ${m.name} saved in the fridge.`); } }] }]));
    });
  }
  function washUp() {
    if (!dishes) return toast('🚰 The sink is clean. Nothing to wash.');
    const n = dishes; dishes = 0; gainXp?.(2 * n); stats.energy = Math.max(0, stats.energy - n);
    toast(`🧽 You wash up ${n} dirty dish${n > 1 ? 'es' : ''}. The kitchen's clean again.`);
  }

  // ---- storage cupboard: keep things from your bag at home ----
  function openStorage() {
    show('Storage cupboard', () => {
      const items = bag();
      $s.textContent = `${storage.length} things stored · your bag holds ${items.length}`;
      $l.replaceChildren(
        ...rows('In your bag', items.length ? items.map((it, i) => ({ icon: it.icon, name: it.name, btns: [{ text: 'Store', fn: () => { storage.push(items.splice(i, 1)[0]); bagChanged?.(); } }] })) : [{ icon: '🎒', name: 'Your bag is empty' }]),
        ...rows('In the cupboard', storage.length ? storage.map((it, i) => ({ icon: it.icon, name: it.name, btns: [{ text: 'Take', fn: () => { items.push(storage.splice(i, 1)[0]); bagChanged?.(); } }] })) : [{ icon: '📦', name: 'Nothing stored yet' }]));
    });
  }

  function update(dt) {
    if (!cooking) { bar.hidden = true; return; }
    const c = cooking;
    if (!c.ready) { c.left -= dt; if (c.left <= 0) { c.ready = true; c.left = 0; xp++; gainXp?.(5); toast(`🔔 Your ${c.r.name.toLowerCase()} is ready! Take it off the cooker before it burns.`); } }
    else if (!c.burnt) { c.waited += dt; if (c.waited > BURN_AFTER) { c.burnt = true; toast(`🔥 Something's burning in the kitchen!`); } }
    bar.hidden = false;
    bar.firstChild.textContent = c.burnt ? `🔥 ${c.r.name} has burnt` : c.ready ? `🔔 ${c.r.name} is ready · ${Math.ceil(BURN_AFTER - c.waited)} s before it burns` : `🍳 Cooking ${c.r.name} · ${Math.ceil(c.left)} s`;
    bar.querySelector('b').style.width = (c.ready ? 100 : (1 - c.left / c.total) * 100) + '%';
    bar.querySelector('b').style.background = c.burnt ? '#c0392b' : c.ready ? '#2ecc71' : '#f39c12';
  }

  return {
    openGroceries, openShelf, openTill, stealBasket, get basketCount() { return basketCount(); }, get basketValue() { return basketValue(); }, openFridge, openCookbook, openCooker, washUp, openStorage, update, close,
    get cooking() { return cooking; }, get dishes() { return dishes; }, get pantry() { return pantry; }, get meals() { return meals; }, get storage() { return storage; },
    get isOpen() { return !panel.hidden; },
    cookerLabel() { return cooking?.ready ? (cooking.burnt ? 'Bin the burnt food' : `Take the ${cooking.r.name.toLowerCase()} off the cooker`) : cooking ? `Check the cooking (${Math.ceil(cooking.left)} s)` : 'Cook a meal at the cooker'; },
    snapshot: () => ({ pantry, meals, storage, dishes, xp }),
    restore(s) { if (!s) return; pantry = s.pantry || {}; meals = s.meals || []; storage = s.storage || []; dishes = s.dishes || 0; xp = s.xp || 0; },
  };
}
