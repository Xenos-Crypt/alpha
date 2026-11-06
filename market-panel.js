// A shop screen with filters, used for vehicles and property.
// Items: { id, name, icon, category, price, stats: { label: 0..100 }, desc, colours?: [hex], tag? }
// Filters: category chips, "sort by" (price or any stat), a max-price slider and a minimum
// for any stat. Each card shows stat bars and a Buy button (with colour choice if offered).
export function createMarketPanel({ money, toast, pause, resume }) {
  const root = document.createElement('section');
  root.id = 'marketPanel'; root.hidden = true;
  root.innerHTML = `<style>
    #marketPanel{position:fixed;inset:0;z-index:64;background:rgba(6,10,16,.82);display:flex;justify-content:center;align-items:stretch;font-family:system-ui,sans-serif;color:#fff}
    #marketPanel[hidden]{display:none}
    #marketPanel .wrap{width:min(1000px,100vw);display:flex;flex-direction:column;padding:12px;gap:8px;box-sizing:border-box}
    #marketPanel header{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    #marketPanel h2{margin:0;font-size:clamp(17px,2.6vw,24px);flex:1}#marketPanel .gold{opacity:.85;font-size:14px}
    #marketPanel .tag{background:#7a1f1f;color:#fff;border-radius:8px;padding:3px 8px;font-size:12px;font-weight:700}
    #marketPanel .chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
    #marketPanel .chip{flex:none;background:#1f2a36;border:1px solid #33475a;color:#fff;border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer;min-height:34px}
    #marketPanel .chip.on{background:#ffd23f;color:#111;border-color:#ffd23f;font-weight:700}
    #marketPanel .filters{display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:13px;background:#121b24;border-radius:12px;padding:8px 10px}
    #marketPanel .filters label{display:flex;align-items:center;gap:6px}
    #marketPanel select,#marketPanel input[type=range]{accent-color:#ffd23f}
    #marketPanel select{background:#1f2a36;color:#fff;border:1px solid #33475a;border-radius:8px;padding:5px;min-height:32px}
    #marketPanel .grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;align-content:start;padding-bottom:8px}
    #marketPanel .card{background:#16212c;border:1px solid #2a3a4a;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px}
    #marketPanel .card h3{margin:0;font-size:15px}#marketPanel .card .cat{font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.06em}
    #marketPanel .card .desc{font-size:12px;opacity:.8}
    #marketPanel .bar{display:grid;grid-template-columns:86px 1fr 28px;align-items:center;gap:6px;font-size:11px}
    #marketPanel .bar i{display:block;height:7px;border-radius:4px;background:#2a3a4a;overflow:hidden}#marketPanel .bar i b{display:block;height:100%;background:linear-gradient(90deg,#22ff88,#ffd23f)}
    #marketPanel .sw{display:flex;gap:5px}#marketPanel .sw span{width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer}#marketPanel .sw span.on{border-color:#fff}
    #marketPanel .buy{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto}
    #marketPanel .buy b{font-size:16px;color:#ffd23f}
    #marketPanel button.go{background:#2f8f5a;border:0;color:#fff;border-radius:10px;padding:9px 14px;font-size:14px;font-weight:700;min-height:40px}
    #marketPanel button.go:disabled{background:#444}
    #marketPanel button.close{background:#444;border:0;color:#fff;border-radius:10px;padding:9px 14px;min-height:40px}
    #marketPanel .empty{opacity:.7;padding:20px;text-align:center;grid-column:1/-1}
  </style><div class="wrap"><header><h2></h2><span class="tag" hidden></span><span class="gold"></span><button class="close" type="button">Close</button></header>
  <div class="chips"></div>
  <div class="filters"><label>Sort by <select class="sort"></select></label><label>Max price <input class="max" type="range"><span class="maxv"></span></label><label>At least <select class="minStat"></select><input class="min" type="range" min="0" max="100" step="5" value="0"><span class="minv">0</span></label></div>
  <div class="grid"></div></div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  $('.close').onclick = close;
  addEventListener('keydown', e => { if (!root.hidden && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  let items = [], onBuy = null, cat = 'All', statNames = [];
  const colourOf = new Map();
  function open(title, list, buy, { tag = '', categories = null } = {}) {
    items = list; onBuy = buy; cat = 'All';
    $('h2').textContent = title; const t = $('.tag'); t.hidden = !tag; t.textContent = tag;
    statNames = [...new Set(list.flatMap(i => Object.keys(i.stats || {})))];
    const cats = categories || ['All', ...new Set(list.map(i => i.category))];
    $('.chips').replaceChildren(...cats.map(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c; b.onclick = () => { cat = c; render(); }; return b; }));
    $('.sort').replaceChildren(...[['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ...statNames.map(s => [s, `Best ${s.toLowerCase()}`])].map(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; return o; }));
    $('.minStat').replaceChildren(...statNames.map(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; return o; }));
    $('.minStat').parentElement.hidden = !statNames.length;
    const maxP = Math.max(...list.map(i => i.price));
    const m = $('.max'); m.min = 0; m.max = maxP; m.step = Math.max(10, Math.round(maxP / 100)); m.value = maxP;
    for (const el of ['.sort', '.max', '.minStat', '.min']) $(el).oninput = render;
    render(); root.hidden = false; pause?.();
  }
  function render() {
    for (const c of root.querySelectorAll('.chip')) c.classList.toggle('on', c.textContent === cat);
    $('.gold').textContent = `${Math.floor(money())} gold`;
    const maxP = +$('.max').value, minS = $('.minStat').value, minV = +$('.min').value, sort = $('.sort').value;
    $('.maxv').textContent = maxP.toLocaleString(); $('.minv').textContent = minV;
    let list = items.filter(i => (cat === 'All' || i.category === cat) && i.price <= maxP && (!minS || (i.stats?.[minS] ?? 0) >= minV));
    list.sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : (b.stats?.[sort] ?? 0) - (a.stats?.[sort] ?? 0));
    const grid = $('.grid');
    if (!list.length) { grid.innerHTML = '<div class="empty">Nothing matches those filters. Try a higher max price or a lower minimum.</div>'; return; }
    grid.replaceChildren(...list.map(i => {
      const c = document.createElement('div'); c.className = 'card';
      c.innerHTML = `<div class="cat">${i.icon || ''} ${i.category}</div><h3>${i.name}</h3>${i.desc ? `<div class="desc">${i.desc}</div>` : ''}` +
        Object.entries(i.stats || {}).map(([k, v]) => `<div class="bar"><span>${k}</span><i><b style="width:${v}%"></b></i><span>${v}</span></div>`).join('');
      if (i.colours?.length) {
        const sw = document.createElement('div'); sw.className = 'sw';
        if (!colourOf.has(i.id)) colourOf.set(i.id, i.colours[0]);
        for (const col of i.colours) { const s = document.createElement('span'); s.style.background = '#' + col.toString(16).padStart(6, '0'); s.classList.toggle('on', colourOf.get(i.id) === col); s.onclick = () => { colourOf.set(i.id, col); render(); }; sw.append(s); }
        c.append(sw);
      }
      const row = document.createElement('div'); row.className = 'buy';
      row.innerHTML = `<b>${i.price.toLocaleString()} gold</b>`;
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'go';
      btn.textContent = i.sold ? 'Owned' : 'Buy'; btn.disabled = !!i.sold || money() < i.price;
      btn.onclick = () => { if (money() < i.price) return toast('Not enough gold.'); if (onBuy(i, colourOf.get(i.id)) !== false) render(); };
      row.append(btn); c.append(row); return c;
    }));
  }
  function close() { if (root.hidden) return; root.hidden = true; resume?.(); }
  return { open, close, get isOpen() { return !root.hidden; } };
}
