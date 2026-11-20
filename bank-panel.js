// THE BANK and THE PHONE — where the player does with money what residents do (money.js): save and earn
// interest; borrow (and repay, or be chased through the courts); pay into a pension; trade shares on the
// A.T. Stock Exchange (prices move every city hour) and collect dividends; and invest privately in companies
// that invite you. At the First Crown Bank booth in Ashford Central Market, or anywhere on your phone (O,
// or the 📱 button) — once you've bought a phone. Phones are made by Cryptic from plastic, glass,
// circuitry and alloy and sold at the the Cryptic stall stall; each one has its own ID (belongings.js).
import * as THREE from 'three';
import { marketStall, setStallScene } from './market-stalls.js';
import { PHONES } from './belongings.js';
import { makeId } from './world-ids.js';

const PKEY = 'aw.phone.v1';
export function createBankPanel(ctx) {
  const money = () => ctx.money();
  setStallScene(ctx.scene);
  // ---- the bank booth ----
  const X = 318, Z = 100;
  marketStall({ x: X, y: .16, z: Z, colour: 0x1f4d3a, goods: 'info', title: 'FIRST CROWN BANK', sub: 'savings · loans · pensions · shares' });
  ctx.colliders?.push({ minX: X - 2.2, maxX: X + 2.2, minZ: Z - 1, maxZ: Z + 1 });
  const teller = ctx.makePerson({ outfit: 0x1f4d3a, hair: 0x1b1410, pants: 0x1a1a1a }); teller.root.position.set(X, .16, Z + 1.4); teller.root.rotation.y = Math.PI;
  ctx.interactables.push({ pos: new THREE.Vector3(X, .16, Z - 2), r: 2.2, label: 'Go to the bank', action: () => open('account', false) });
  // ---- the phone shop ----
  const PX = 326;
  marketStall({ x: PX, y: .16, z: Z, colour: 0x2a2f3a, goods: 'info', title: 'CRYPTIC', sub: 'the official phone stall' });
  ctx.colliders?.push({ minX: PX - 2.2, maxX: PX + 2.2, minZ: Z - 1, maxZ: Z + 1 });
  const seller = ctx.makePerson({ outfit: 0x2a2f3a, hair: 0x3a2a1e, pants: 0x1a1a1a }); seller.root.position.set(PX, .16, Z + 1.4); seller.root.rotation.y = Math.PI;
  ctx.interactables.push({ pos: new THREE.Vector3(PX, .16, Z - 2), r: 2.2, label: 'Browse phones', action: () => open('shop', false) });
  let phone = null; try { phone = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch { }
  const savePhone = () => { try { localStorage.setItem(PKEY, JSON.stringify(phone)); } catch { } };
  // the 📱 button (and the O key) once you own a phone
  // the Cryptic phone (phone.js) is the phone now: banking on it opens from its Bank app, so no separate 📱 button or O key here
  const btn = document.createElement('button'); btn.id = 'bankPhoneBtn'; btn.type = 'button'; btn.hidden = true;
  btn.addEventListener('click', () => { if (ctx.canOpen?.() !== false) open('home', true); });


  const panel = document.createElement('section'); panel.id = 'bankPanel'; panel.hidden = true; document.body.append(panel);
  const css = document.createElement('style');
  css.textContent = `#bankPanel{position:fixed;inset:6% max(12px,14%);z-index:48;border-radius:16px;padding:18px;overflow:auto;font:14px/1.45 system-ui;background:#f3f6f2;color:#14281f;border:2px solid #1f4d3a}
#bankPanel.phone{inset:auto;right:max(12px,4vw);bottom:max(12px,3vh);top:max(12px,3vh);width:min(380px,calc(100vw - 24px));border-radius:34px;border:10px solid #121418;background:#0f1216;color:#e9eef2;padding:22px 16px}
#bankPanel[hidden]{display:none}#bankPanel h2{margin:0 0 6px}#bankPanel h3{margin:14px 0 6px}
#bankPanel button{min-height:36px;padding:6px 12px;margin:2px;border:0;border-radius:8px;background:#1f4d3a;color:#fff;font:inherit;cursor:pointer}
#bankPanel.phone button{background:#2b6fd6}#bankPanel .x{float:right}#bankPanel .tabs button{background:#cfdcd3;color:#14281f}#bankPanel .tabs button.on{background:#1f4d3a;color:#fff}
#bankPanel.phone .tabs button{background:#232a33;color:#cfd8e3}#bankPanel.phone .tabs button.on{background:#2b6fd6;color:#fff}
#bankPanel table{width:100%;border-collapse:collapse}#bankPanel td{padding:5px 4px;border-bottom:1px solid #8883;vertical-align:middle}#bankPanel .msg{margin-top:10px;font-weight:600}
#bankPanel .apps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}#bankPanel .apps button{height:84px;font-size:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1c222b;border-radius:18px}
#bankPanel .apps b{font-size:28px;font-weight:400}#bankPanel input{width:90px;min-height:34px;border-radius:8px;border:1px solid #8886;padding:0 8px;font:inherit}
#bankPanel .up{color:#1b9a4d}#bankPanel .down{color:#d04040}#bankPanel .dim{opacity:.7}
`;
  document.head.append(css);
  let tab = 'account', msg = '', asPhone = false, pick = null;
  const gold = { get: () => ctx.gold(), add: n => ctx.addGold(n) };
  const f0 = n => Math.round(n).toLocaleString(), pct = n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  const spark = (pts, w = 300, h = 70) => { if (!pts || pts.length < 2) return ''; const lo = Math.min(...pts), hi = Math.max(...pts), r = hi - lo || 1; const d = pts.map((v, i) => `${(i / (pts.length - 1) * w).toFixed(1)},${(h - (v - lo) / r * (h - 6) - 3).toFixed(1)}`).join(' '); return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}"><polyline points="${d}" fill="none" stroke="${pts[pts.length - 1] >= pts[0] ? '#1b9a4d' : '#d04040'}" stroke-width="2"/></svg>`; };
  function render() {
    const m = money(); if (!m) return;
    const p = m.player, P = p.P, owed = P.loans.reduce((a, l) => a + l.balance, 0), worth = ctx.gold() + P.savings + (ctx.assets?.() || 0);
    const tabs = asPhone ? [['home', '⌂'], ['account', 'Bank'], ['loans', 'Loans'], ['pension', 'Pension'], ['shares', 'Stocks'], ['private', 'Invest'], ['news', 'News']] : [['account', 'Savings'], ['loans', 'Loans'], ['pension', 'Pension'], ['shares', 'Shares'], ['private', 'Private investments']];
    let body = '';
    if (tab === 'shop') {
      const st = ctx.stock?.() ?? 0;
      body = `<p>Phones by Cryptic, made from plastic, glass, circuitry and alloy. With a phone you can bank, trade shares and invest from anywhere, and read the news.</p>${phone ? `<p>You own an <b>${PHONES[phone.model][0]}</b>.</p>` : ''}
        <p class="dim">${st >= 1 ? `${Math.floor(st)} in stock` : 'Out of stock: Cryptic hasn\'t made any lately'}</p>
        <table>${Object.entries(PHONES).map(([k, [name, price, life, screen]]) => `<tr><td><b>${name}</b><br><span class="dim">${screen} screen · lasts ${life === 1 ? 'a while' : life < 1.5 ? 'longer' : 'longest'}</span></td><td>${f0(price * (ctx.cpi?.() || 1))} gold</td><td><button data-phone="${k}">Buy</button></td></tr>`).join('')}</table>`;
    } else if (tab === 'home') body = `<div style="font-size:30px;font-weight:300">${new Date().toTimeString().slice(0, 5)}</div><div class="dim">${phone ? PHONES[phone.model][0] : ''} · ${f0(ctx.gold())} gold</div>
      <div class="apps">${[['account', '🏦', 'Bank'], ['loans', '💳', 'Loans'], ['pension', '🌅', 'Pension'], ['shares', '📈', 'Stocks'], ['private', '📩', `Invest${m.player.invites().length ? ' (' + m.player.invites().length + ')' : ''}`], ['news', '📰', 'News']].map(([k, i, n]) => `<button type="button" data-tab="${k}"><b>${i}</b>${n}</button>`).join('')}</div>`;
    else if (tab === 'account') body = `<p>Savings: <b>${f0(P.savings)}</b> gold, earning <b>${Math.max(0, m.rate() - .5).toFixed(1)}%</b> a year (the central rate is ${m.rate().toFixed(1)}%). Dividends are paid into savings.</p>
      <div><button data-dep="100">Deposit 100</button><button data-dep="1000">Deposit 1,000</button><button data-dep="all">Deposit all</button></div>
      <div><button data-wd="100">Withdraw 100</button><button data-wd="1000">Withdraw 1,000</button><button data-wd="all">Withdraw all</button></div>
      <p>Credit score: <b>${P.credit}</b>${P.bankruptUntil > 0 ? ' · <b class="down">bankrupt</b>' : ''}</p>`;
    else if (tab === 'loans') body = `<p>You owe <b>${f0(owed)}</b> gold. The bank will lend you up to <b>${f0(Math.max(0, p.limit(worth) - owed))}</b> more. Repayments come out of your gold every city day; miss eight in a row and the bank takes you to court.</p>
      ${P.loans.length ? `<table>${P.loans.map(l => `<tr><td>${p.LOAN_KINDS[l.kind].name}</td><td>${f0(l.balance)} of ${f0(l.principal)}</td><td>${l.rate}%</td><td>${f0(l.daily)}/day</td><td>${l.missed ? `<b class="down">${l.missed} missed</b>` : 'up to date'}</td></tr>`).join('')}</table><button data-repay="500">Repay 500 early</button>` : ''}
      <h3>Borrow</h3>${Object.entries(p.LOAN_KINDS).filter(([k]) => k !== 'mortgage').map(([k, K]) => `<div>${K.name} (${(m.rate() + K.margin).toFixed(1)}%+, ${K.years} years): <button data-loan="${k}" data-amt="500">500</button><button data-loan="${k}" data-amt="2000">2,000</button><button data-loan="${k}" data-amt="10000">10,000</button></div>`).join('')}`;
    else if (tab === 'pension') body = `<p>Your pension: <b>${f0(P.pension.pot)}</b> gold (you've paid in ${f0(P.pension.paidIn)}). The state adds 25% tax relief to what you pay in, and the fund is invested, so it grows faster than savings (about ${(m.rate() + 2).toFixed(1)}% a year).</p>
      <p>${p.pensionReady() ? 'It has been building long enough: you can take it. A quarter is tax-free; the rest is taxed at 20%.' : P.pension.since != null ? 'It is locked until it has been building for four city years.' : 'Start one with your first payment.'}</p>
      <div><button data-pin="100">Pay in 100</button><button data-pin="1000">Pay in 1,000</button>${p.pensionReady() ? '<button data-pout="1">Take my pension</button>' : ''}</div>
      <p class="dim">Working residents pay 5% of their wages into a pension and their employer adds 3%; when they retire they draw on it alongside the state pension.</p>`;
    else if (tab === 'shares') {
      const mine = new Map(p.holdings()), list = m.listed();
      if (pick != null) {
        const f = list.find(x => x.id === pick), q = f && m.quote(f), have = mine.get(pick) || 0, cost = P.cost[pick];
        body = f ? `<button data-back="1">← All shares</button><h3>${f.name}</h3><div class="dim">${f.sector} · ${Object.values(f.branches).reduce((a, b) => a + b, 0)} branches · ${f.lastProfit > 0 ? 'profitable' : 'losing money'} · reg. ${f.reg}</div>
          <div style="font-size:26px">${q.price.toFixed(2)} <span class="${(q.intra?.[0] ?? q.price) <= q.price ? 'up' : 'down'}" style="font-size:15px">${pct(((q.price / (q.intra?.[0] || q.price)) - 1) * 100)} today</span></div>
          <div class="dim">Last two city days, hour by hour</div>${spark(q.intra)}<div class="dim">Last month, day by day</div>${spark(q.hist)}
          <p>${have ? `You hold <b>${f0(have)}</b> shares worth <b>${f0(have * q.price)}</b> gold${cost ? `, bought at ${cost.toFixed(2)} on average: <b class="${q.price >= cost ? 'up' : 'down'}">${pct((q.price / cost - 1) * 100)}</b>` : ''}.` : 'You hold none.'}</p>
          <div>Shares: <input type="number" min="1" step="1" value="100" data-qty><button data-buyq="${f.id}">Buy</button><button data-sellq="${f.id}">Sell</button></div><p class="dim">Dealing costs 0.5% each way. Prices can fall as well as rise.</p>` : '';
      } else {
        const port = [...mine].map(([id, n]) => { const f = list.find(x => x.id === id), q = f && m.quote(f); return f ? { f, n, v: n * q.price, c: n * (P.cost[id] || q.price) } : null; }).filter(Boolean);
        const tv = port.reduce((a, x) => a + x.v, 0), tc = port.reduce((a, x) => a + x.c, 0);
        body = `${port.length ? `<h3>Your portfolio: ${f0(tv)} gold <span class="${tv >= tc ? 'up' : 'down'}">${pct(tc ? (tv / tc - 1) * 100 : 0)}</span></h3><table>${port.map(x => `<tr><td><a href="#" data-pick="${x.f.id}">${x.f.name}</a></td><td>${f0(x.n)}</td><td>${f0(x.v)}</td><td class="${x.v >= x.c ? 'up' : 'down'}">${pct((x.v / x.c - 1) * 100)}</td></tr>`).join('')}</table>` : ''}
          <h3>A.T. Stock Exchange</h3><p class="dim">Every public company has a million shares; the price follows what it is worth and moves every city hour. Tap a company to trade.</p>
          <table>${list.sort((a, b) => m.quote(b).price - m.quote(a).price).map(f => { const q = m.quote(f), ch = q.intra?.length > 1 ? (q.price / q.intra[0] - 1) * 100 : 0; return `<tr><td><a href="#" data-pick="${f.id}"><b>${f.name}</b></a><br><span class="dim">${f.sector}</span></td><td>${q.price.toFixed(2)}</td><td class="${ch >= 0 ? 'up' : 'down'}">${pct(ch)}</td><td>${mine.get(f.id) ? f0(mine.get(f.id)) : ''}</td></tr>`; }).join('')}</table>`;
      }
    } else if (tab === 'private') {
      const inv = p.invites(), stakes = p.stakes();
      body = `<p>Private companies don't sell shares on the exchange. Their founders invite investors they know and trust, or people with a name, when they need money to grow. A stake pays you your share of the profits; it can only be sold back to the company. If the company floats on the Stock Exchange, your stake becomes shares you can trade.</p>
        <h3>Invitations</h3>${inv.length ? `<table>${inv.map((i, k) => `<tr><td><b>${i.name}</b><br><span class="dim">from ${i.from}, ${i.why}</span></td><td>${(i.pct * 100).toFixed(1)}% for ${f0(i.price)} gold</td><td><button data-accept="${k}">Invest</button><button data-decline="${k}">No</button></td></tr>`).join('')}</table>` : '<p class="dim">No invitations. Founders invite people they like, or people who are well known.</p>'}
        <h3>Your stakes</h3>${stakes.length ? `<table>${stakes.map(([f, s]) => `<tr><td><b>${f.name}</b><br><span class="dim">${f.lastProfit > 0 ? 'profitable' : 'losing money'}</span></td><td>${(s * 100).toFixed(1)}%</td><td><button data-sellstake="${f.id}">Sell back</button></td></tr>`).join('')}</table>` : '<p class="dim">None yet.</p>'}`;
    } else if (tab === 'news') body = `<h3>News</h3><ul>${(ctx.news?.() || []).slice(0, 25).map(n => `<li>${typeof n === 'string' ? n : n.text || n.t || ''}</li>`).join('')}</ul>`;
    panel.className = asPhone ? 'phone' : '';
    panel.innerHTML = `<button class="x" type="button" data-close>${asPhone ? '✕' : 'Close'}</button><h2>${asPhone ? '📱' : tab === 'shop' ? '📱 the Cryptic stall' : '🏦 First Crown Bank'}</h2>${tab === 'shop' ? '' : `<div class="dim">${f0(ctx.gold())} gold in hand · savings ${f0(P.savings)} · owed ${f0(owed)}</div>
      <div class="tabs">${tabs.map(([k, n]) => `<button type="button" data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`}${body}<div class="msg">${msg}</div>`;
  }
  function buyPhone(model) {
    if (phone && phone.model === model) return 'You already have one.';
    const [name, price] = PHONES[model], cost = Math.round(price * (ctx.cpi?.() || 1));
    if ((ctx.stock?.() ?? 0) < 1) return "Sold out: Cryptic hasn't made any lately.";
    if (ctx.gold() < cost) return 'Not enough gold.';
    ctx.addGold(-cost); ctx.takeStock?.();
    const old = phone;
    phone = { model, id: makeId('PRD', 'PHN', 'TCH.GLS.PLS', 'PLR', 'player-phone:' + Date.now()), bought: Date.now(), price: cost };
    savePhone();
    ctx.record?.(phone.id, `${name} bought by the player from the Cryptic stall for ${cost} gold${old ? ' (the old one recycled)' : ''}`, phone);
    return `The ${name} is yours. Its banking opens from the Bank app on your Cryptic phone.`;
  }
  panel.addEventListener('click', ev => {
    const a = ev.target.closest('a[data-pick]'); if (a) { ev.preventDefault(); pick = +a.dataset.pick; msg = ''; return render(); }
    const b = ev.target.closest('button'); if (!b) return; const d = b.dataset, m = money(), p = m.player;
    if (d.close != null) return close();
    if (d.tab) { tab = d.tab; msg = ''; pick = null; }
    if (d.back) pick = null;
    if (d.phone) msg = buyPhone(d.phone);
    if (d.dep) msg = p.deposit(d.dep === 'all' ? Math.floor(ctx.gold()) : +d.dep, gold);
    if (d.wd) msg = p.withdraw(d.wd === 'all' ? Math.floor(p.P.savings) : +d.wd, gold);
    if (d.loan) msg = p.borrow(d.loan, +d.amt, gold, ctx.gold() + p.P.savings + (ctx.assets?.() || 0));
    if (d.repay) msg = p.repay(+d.repay, gold);
    if (d.pin) msg = p.pensionIn(+d.pin, gold);
    if (d.pout) msg = p.pensionOut(gold);
    const qty = Math.max(1, Math.floor(+panel.querySelector('[data-qty]')?.value || 0));
    if (d.buyq) { const f = m.listed().find(f => f.id === +d.buyq); if (f) msg = p.buy(f, qty, gold); }
    if (d.sellq) { const f = m.listed().find(f => f.id === +d.sellq); if (f) msg = p.sell(f, Math.min(qty, new Map(p.holdings()).get(f.id) || 0) || qty, gold); }
    if (d.accept != null) { const i = p.invites()[+d.accept]; if (i) msg = p.accept(i, gold); }
    if (d.decline != null) { const i = p.invites()[+d.decline]; if (i) msg = p.decline(i); }
    if (d.sellstake) { const f = p.stakes().find(([f]) => f.id === +d.sellstake)?.[0]; if (f) msg = p.sellStake(f, gold); }
    ctx.save?.(); render();
  });
  panel.addEventListener('keydown', e => { if (e.code === 'Escape') close(); e.stopPropagation(); });
  function open(t, phoneMode) { if (!money()) return; tab = t; asPhone = phoneMode; msg = ''; pick = null; render(); panel.hidden = false; ctx.pause(); }
  function close() { panel.hidden = true; ctx.resume(); }
  return { get open() { return !panel.hidden; }, close, get phone() { return phone; }, openPhone: () => phone && open('home', true) };
}
