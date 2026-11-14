// THE BANK — a First Crown Bank branch in Ashford Central Market, where the player does what residents do
// with money (money.js): save and earn interest, borrow (and repay, or be chased through the courts),
// and buy and sell shares on the A.T. Stock Exchange, collecting dividends.
import * as THREE from 'three';
import { marketStall, setStallScene } from './market-stalls.js';

export function createBankPanel(ctx) {
  const money = () => ctx.money();
  setStallScene(ctx.scene);
  const X = 318, Z = 100;
  marketStall({ x: X, y: .16, z: Z, colour: 0x1f4d3a, goods: 'info', title: 'FIRST CROWN BANK', sub: 'savings · loans · shares' });
  ctx.colliders?.push({ minX: X - 2.2, maxX: X + 2.2, minZ: Z - 1, maxZ: Z + 1 });
  const teller = ctx.makePerson({ outfit: 0x1f4d3a, hair: 0x1b1410, pants: 0x1a1a1a }); teller.root.position.set(X, .16, Z + 1.4); teller.root.rotation.y = Math.PI;
  ctx.interactables.push({ pos: new THREE.Vector3(X, .16, Z - 2), r: 2.2, label: 'Go to the bank', action: () => open() });

  const panel = document.createElement('section'); panel.id = 'bankPanel'; panel.hidden = true; document.body.append(panel);
  const css = document.createElement('style');
  css.textContent = '#bankPanel{position:fixed;inset:6% max(12px,14%);z-index:48;border-radius:16px;padding:18px;overflow:auto;font:14px/1.45 system-ui;background:#f3f6f2;color:#14281f;border:2px solid #1f4d3a}#bankPanel[hidden]{display:none}#bankPanel h2{margin:0 0 6px}#bankPanel h3{margin:14px 0 6px}#bankPanel button{min-height:36px;padding:6px 12px;margin:2px;border:0;border-radius:8px;background:#1f4d3a;color:#fff;font:inherit;cursor:pointer}#bankPanel .x{float:right}#bankPanel .tabs button{background:#cfdcd3;color:#14281f}#bankPanel .tabs button.on{background:#1f4d3a;color:#fff}#bankPanel table{width:100%;border-collapse:collapse}#bankPanel td{padding:5px 4px;border-bottom:1px solid #0001}#bankPanel .msg{margin-top:10px;font-weight:600}';
  document.head.append(css);
  let tab = 'account', msg = '';
  const gold = { get: () => ctx.gold(), add: n => ctx.addGold(n) };
  const f0 = n => Math.round(n).toLocaleString();
  function render() {
    const m = money(); if (!m) return;
    const P = m.player.P, owed = P.loans.reduce((a, l) => a + l.balance, 0), worth = ctx.gold() + P.savings + (ctx.assets?.() || 0);
    let body = '';
    if (tab === 'account') body = `<p>Savings: <b>${f0(P.savings)}</b> gold, earning <b>${Math.max(0, m.rate() - .5).toFixed(1)}%</b> a year (the central rate is ${m.rate().toFixed(1)}%). Dividends from your shares are paid into savings.</p>
      <div><button data-dep="100">Deposit 100</button><button data-dep="1000">Deposit 1,000</button><button data-dep="all">Deposit all</button></div>
      <div><button data-wd="100">Withdraw 100</button><button data-wd="1000">Withdraw 1,000</button><button data-wd="all">Withdraw all</button></div>
      <p>Credit score: <b>${P.credit}</b>${P.bankruptUntil > 0 ? ' · <b style="color:#b03030">bankrupt</b>' : ''}</p>`;
    else if (tab === 'loans') body = `<p>You owe <b>${f0(owed)}</b> gold. The bank will lend you up to <b>${f0(Math.max(0, m.player.limit(worth) - owed))}</b> more (it looks at what you're worth and your credit score). Repayments come out of your gold every city day; miss eight in a row and the bank takes you to court.</p>
      ${P.loans.length ? `<table>${P.loans.map(l => `<tr><td>${m.player.LOAN_KINDS[l.kind].name}</td><td>${f0(l.balance)} of ${f0(l.principal)} left</td><td>${l.rate}% a year</td><td>${f0(l.daily)} a day</td><td>${l.missed ? `<b style="color:#b03030">${l.missed} missed</b>` : 'up to date'}</td></tr>`).join('')}</table><button data-repay="500">Repay 500 early</button>` : ''}
      <h3>Borrow</h3>${Object.entries(m.player.LOAN_KINDS).filter(([k]) => k !== 'mortgage').map(([k, K]) => `<div>${K.name} (${(m.rate() + K.margin).toFixed(1)}%+, over ${K.years} years): <button data-loan="${k}" data-amt="500">500</button><button data-loan="${k}" data-amt="2000">2,000</button><button data-loan="${k}" data-amt="10000">10,000</button></div>`).join('')}`;
    else if (tab === 'shares') {
      const mine = new Map(m.player.holdings());
      body = `<p>Every public limited company has a million shares on the A.T. Stock Exchange. Their price follows what the company is worth; a third of a profitable company's profit is paid out as dividends. Prices can fall as well as rise.</p>
      <table>${m.listed().sort((a, b) => m.quote(b).price - m.quote(a).price).slice(0, 30).map(f => { const q = m.quote(f), h = q.hist, ch = h.length > 1 ? (q.price / h[0] - 1) * 100 : 0; return `<tr><td><b>${f.name}</b><br><span style="opacity:.7">${f.sector} · ${f.lastProfit > 0 ? 'profitable' : 'losing money'}</span></td><td>${q.price.toFixed(2)}</td><td style="color:${ch >= 0 ? '#1b7a3d' : '#b03030'}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</td><td>${mine.get(f.id) ? f0(mine.get(f.id)) + ' held' : ''}</td><td><button data-buy="${f.id}" data-n="100">Buy 100</button><button data-buy="${f.id}" data-n="1000">Buy 1,000</button>${mine.get(f.id) ? `<button data-sell="${f.id}">Sell all</button>` : ''}</td></tr>`; }).join('')}</table>`;
    }
    panel.innerHTML = `<button class="x" type="button" data-close>Close</button><h2>🏦 First Crown Bank</h2><div>You have ${f0(ctx.gold())} gold in hand · savings ${f0(P.savings)} · owed ${f0(owed)}</div>
      <div class="tabs">${[['account', 'Savings'], ['loans', 'Loans'], ['shares', 'Shares']].map(([k, n]) => `<button type="button" data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>${body}<div class="msg">${msg}</div>`;
  }
  panel.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return; const d = b.dataset, m = money(), p = m.player;
    if (d.close != null) return close();
    if (d.tab) { tab = d.tab; msg = ''; }
    if (d.dep) msg = p.deposit(d.dep === 'all' ? Math.floor(ctx.gold()) : +d.dep, gold);
    if (d.wd) msg = p.withdraw(d.wd === 'all' ? Math.floor(p.P.savings) : +d.wd, gold);
    if (d.loan) msg = p.borrow(d.loan, +d.amt, gold, ctx.gold() + p.P.savings + (ctx.assets?.() || 0));
    if (d.repay) msg = p.repay(+d.repay, gold);
    if (d.buy) { const f = m.listed().find(f => f.id === +d.buy); if (f) msg = p.buy(f, +d.n, gold); }
    if (d.sell) { const f = m.listed().find(f => f.id === +d.sell), n = new Map(p.holdings()).get(+d.sell); if (f && n) msg = p.sell(f, n, gold); }
    ctx.save?.(); render();
  });
  panel.addEventListener('keydown', e => { if (e.code === 'Escape') close(); e.stopPropagation(); });
  function open() { if (!money()) return; tab = 'account'; msg = ''; render(); panel.hidden = false; ctx.pause(); }
  function close() { panel.hidden = true; ctx.resume(); }
  return { get open() { return !panel.hidden; }, close };
}
