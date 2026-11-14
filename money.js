// MONEY — every way people make (and lose) money in A.T., as in a real country:
//   • WAGES from an employer (firms.js), and BENEFITS for the unemployed (society.js);
//   • PROFITS: sole traders, partners and company founders draw from what their business earns;
//   • RENT from property (community.js), INHERITANCE when someone dies;
//   • SAVINGS at a bank, earning interest at the central rate;
//   • SHARES on the A.T. Stock Exchange: every plc has a million shares whose price follows what the company
//     is worth; holders are paid DIVIDENDS from its profits, and can sell at a gain or a loss;
//   • LOANS: personal loans, business start-up loans and MORTGAGES (to buy a home), after a credit check,
//     with interest above the central rate; miss repayments and the bank chases the debt through the courts;
//     bailiffs take savings and shares; what still can't be paid ends in personal BANKRUPTCY;
//   • PENSIONS: a workplace pension pot built up while working, and the state pension when retired;
//   • and the rest that exists elsewhere: gambling at the casino, selling information, and crime.
// Banks are real firms (the finance companies in firms.js): deposits are their money to lend, interest is
// their income, bad debts are their losses. The player has an account too (bank-panel.js).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const SHARES = 1e6;   // shares in issue for every plc
const DAYS_A_YEAR = 7.5;     // city days in a city year (YEAR = 180 city hours)
export const LOAN_KINDS = {
  personal: { name: 'Personal loan', margin: 6, years: 2 },
  business: { name: 'Business start-up loan', margin: 4, years: 4 },
  mortgage: { name: 'Mortgage', margin: 1.5, years: 25 },
};

export function createMoney({ S, citizens, firms, news = () => { }, remember = () => { }, history = null, rand = Math.random, jobInfo = () => null }) {
  const M = S.money ||= { invites: [], exchange: {}, lent: 0, repaid: 0, defaults: 0, bankruptcies: 0, dividends: 0, interestPaid: 0, mortgages: 0, player: { savings: 0, loans: [], shares: {}, credit: 650 } };
  M.player ||= { savings: 0, loans: [], shares: {}, credit: 650 };
  M.invites ||= []; M.player.cost ||= {}; M.player.pension ||= { pot: 0, since: null, paidIn: 0 };
  const rate = () => S.econ2?.rate ?? 3;                       // the central rate, % a year
  const perDay = annual => annual / 100 / DAYS_A_YEAR;
  const banks = () => firms.list().filter(f => f.sector === 'finance' && ['plc', 'ltd', 'co-operative'].includes(f.type) && f.licence !== 'suspended');
  const bankOf = c => { let b = c.bank != null ? firms.firm(c.bank) : null; if (!b || b.closed) { const list = banks(); b = list.filter(f => f.scale === 'national')[c.id % 3] || list[0]; c.bank = b?.id ?? null; } return b; };
  // ---- the stock exchange ----
  const listed = () => firms.list().filter(f => f.type === 'plc');
  function quote(f) {
    const q = M.exchange[f.id] ||= { price: Math.max(.05, f.value / SHARES), hist: [], holders: {} };
    return q;
  }
  function reprice() {
    for (const f of listed()) {
      const q = quote(f), fair = Math.max(.05, f.value / SHARES), sentiment = 1 + (rand() - .5) * .06 + clamp((f.lastProfit || 0) / 2e4, -.05, .05);
      q.price = +Math.max(.05, q.price + (fair * sentiment - q.price) * .3).toFixed(3);
      q.hist.push(q.price); if (q.hist.length > 30) q.hist.shift();
    }
  }
  // trading hours: prices move every city hour around what each company is worth (news, mood, big orders)
  function hourly() {
    for (const f of listed()) {
      const q = quote(f), fair = Math.max(.05, f.value / SHARES);
      q.price = +Math.max(.05, q.price * (1 + (rand() - .5) * .024) + (fair - q.price) * .02).toFixed(3);
      (q.intra ||= []).push(q.price); if (q.intra.length > 48) q.intra.shift();
    }
  }
  const holdingsOf = who => Object.entries(M.exchange).flatMap(([id, q]) => q.holders[who] ? [[+id, q.holders[who]]] : []);
  function trade(who, f, n, pay, get) {   // n > 0 buy, n < 0 sell; pay/get move the money
    const q = quote(f), cost = Math.round(Math.abs(n) * q.price * 100) / 100;
    if (n > 0) { if (!pay(cost * 1.005)) return false; q.holders[who] = (q.holders[who] || 0) + n; f.cash += cost * .005; }   // a small dealing fee
    else { const have = q.holders[who] || 0; if (have < -n) return false; q.holders[who] = have + n; if (!q.holders[who]) delete q.holders[who]; get(cost * .995); }
    return true;
  }
  // ---- loans ----
  function creditScore(c) {
    const wage = jobInfo(c.job)?.wage || 0, debt = (c.loans || []).reduce((a, l) => a + l.balance, 0);
    return Math.round(clamp(500 + wage * 12 + Math.min(200, (c.savings || 0) / 20) - debt / 30 - (c.convictions || 0) * 60 - (c.missedEver || 0) * 25 - (c.bankrupt ? 300 : 0), 300, 900));
  }
  function lend(c, kind, amount, why) {
    const K = LOAN_KINDS[kind], b = bankOf(c); if (!b || b.cash < -5e4) return null;   // banks lend out deposits (and borrow from the central bank)
    const score = creditScore(c);
    if (score < (kind === 'mortgage' ? 600 : 520) || (c.bankrupt && (S.tick || 0) < c.bankrupt)) return null;
    const annual = rate() + K.margin + Math.max(0, (700 - score) / 40);
    const loan = { kind, bank: b.id, principal: Math.round(amount), balance: Math.round(amount), rate: +annual.toFixed(2), daily: Math.round(amount / (K.years * DAYS_A_YEAR) + amount * perDay(annual)), since: S.tick || 0, missed: 0, why };
    (c.loans ||= []).push(loan); c.wealth += amount; b.cash -= amount; M.lent += amount;
    remember(c, `Took out a ${K.name.toLowerCase()} of ${amount} gold from ${b.name} at ${loan.rate}%${why ? ' to ' + why : ''}`);
    return loan;
  }
  function repayDay(c) {
    for (const l of c.loans || []) {
      const b = firms.firm(l.bank), interest = l.balance * perDay(l.rate), due = Math.min(l.daily, l.balance + interest);
      if (c.wealth >= due) { c.wealth -= due; l.balance = Math.max(0, l.balance + interest - due); if (b) b.cash += due; M.repaid += due; M.interestPaid += interest; l.missed = 0; }
      else { l.balance += interest; l.missed++; c.missedEver = (c.missedEver || 0) + 1; if (l.missed === 3) remember(c, `Behind on my ${LOAN_KINDS[l.kind].name.toLowerCase()} repayments`); }
      if (l.missed >= 8) collect(c, l, b);
    }
    c.loans = (c.loans || []).filter(l => l.balance > .5 && !l.written);
    if (!c.loans.length) delete c.loans;
  }
  // the bank goes to court for the debt: bailiffs take savings, then shares; if that's not enough, bankruptcy
  function collect(c, l, b) {
    M.defaults++;
    let got = Math.min(c.savings || 0, l.balance); c.savings = (c.savings || 0) - got; l.balance -= got;
    for (const [id, n] of holdingsOf('c' + c.id)) { if (l.balance <= 0) break; const f = firms.firm(id); if (f) trade('c' + c.id, f, -n, null, v => { got += v; l.balance -= v; }); }
    if (b) b.cash += got;
    (S.justice ||= { cases: [], next: 1 }).cases.unshift({ id: S.justice.next++, at: S.tick || 0, civil: 'debt recovery', state: `${b?.name || 'The bank'} v ${c.name}: ${Math.round(got)} gold recovered by the bailiffs${l.balance > 0 ? `, ${Math.round(l.balance)} still owed` : ''}` });
    if (c.kind !== 'player' && l.kind === 'mortgage' && c.home === 'owner') { c.home = 'tenant'; remember(c, 'The bank repossessed my home'); }
    if (l.balance > 0) {   // can't pay: bankrupt; the debt is written off and the bank takes the loss
      c.bankrupt = (S.tick || 0) + 24 * 7.5 * 2; M.bankruptcies++; l.written = true; c.loans = [];
      remember(c, 'Declared bankrupt'); c.mood -= 25;
      news(`${c.name} was declared bankrupt after ${b?.name || 'the bank'} took them to court over a ${LOAN_KINDS[l.kind].name.toLowerCase()}.`);
    } else l.written = true;
  }
  // ---- a money day for one resident ----
  function personDay(c) {
    if (c.dead) return;
    const wage = jobInfo(c.job)?.wage || 0;
    bankOf(c);
    // savings: keep a buffer in hand, put the rest in the bank; interest is paid on it
    const buffer = 150 + wage * 10;
    if (c.wealth > buffer * 2) { const put = (c.wealth - buffer) * .5; c.wealth -= put; c.savings = (c.savings || 0) + put; }
    else if (c.wealth < 20 && (c.savings || 0) > 0) { const take = Math.min(c.savings, buffer); c.savings -= take; c.wealth += take; }
    if (c.savings) { const i = c.savings * perDay(Math.max(0, rate() - .5)); c.savings += i; const b = bankOf(c); if (b) b.cash -= i; }
    // workplace pension: a share of wages into the pot; retired people draw on it and get the state pension
    if (wage) c.pensionPot = (c.pensionPot || 0) + wage * 24 * (.05 + .03);   // 5% from the worker, 3% from the employer
    if (c.job === 'Retired') { const draw = (c.pensionPot || 0) * .01; c.pensionPot = (c.pensionPot || 0) - draw; const state = 30 * (S.treasury > 0 ? 1 : .5); c.wealth += draw + state; S.treasury -= state; }
    // investing: people with savings to spare buy shares (the more market-minded more often); sell when it pays
    if ((c.savings || 0) > 800 && rand() < .02 + Math.max(0, -(c.econ || 0)) * .03) {
      const pick = listed().sort((a, b) => (b.lastProfit || 0) - (a.lastProfit || 0)).slice(0, 8)[Math.floor(rand() * 8)];
      if (pick) { const q = quote(pick), n = Math.floor(Math.min(c.savings * .3, 2000) / q.price); if (n > 0 && trade('c' + c.id, pick, n, cost => { if (c.savings < cost) return false; c.savings -= cost; return true; })) { (c.bought ||= {})[pick.id] = q.price; remember(c, `Bought ${n.toLocaleString()} shares in ${pick.name}`); } }
    }
    for (const [id, n] of holdingsOf('c' + c.id)) {
      const f = firms.firm(id), q = M.exchange[id], paid = c.bought?.[id] || q.price;
      if (!f || f.closed) { delete q.holders['c' + c.id]; remember(c, `My shares in ${f?.name || 'a company'} became worthless`); continue; }
      if (q.price > paid * 1.4 || q.price < paid * .7 || (c.wealth < 20 && rand() < .3)) trade('c' + c.id, f, -n, null, v => { c.savings = (c.savings || 0) + v; remember(c, `Sold my ${f.name} shares ${q.price > paid ? 'at a profit' : 'at a loss'}`); });
    }
    // borrowing: to start a business, to buy a home, or to get by
    if (!c.loans?.length && !(c.bankrupt > (S.tick || 0))) {
      if (c.ambition === 'business' && c.job !== 'Shop owner' && c.wealth < 1500 && c.age >= 21 && rand() < .01) { if (lend(c, 'business', 1500, 'start my own business')) { c.job = 'Shop owner'; c.employer = null; remember(c, 'Opened my own business with a bank loan'); } }
      else if (c.home === 'tenant' && wage >= 10 && S.homes?.price && (c.savings || 0) + c.wealth > S.homes.price * .1 && rand() < .004) {
        const price = S.homes.price, deposit = price * .1;
        if (lend(c, 'mortgage', price - deposit, 'buy a home')) { let d = deposit; const fromSav = Math.min(c.savings || 0, d); c.savings = (c.savings || 0) - fromSav; d -= fromSav; c.wealth -= d + (price - deposit); c.home = 'owner'; c.landlord = null; M.mortgages++; remember(c, 'Bought my own home with a mortgage'); }
      } else if (c.wealth < 5 && wage && rand() < .01) lend(c, 'personal', 200 + wage * 20, 'get by until payday');
    }
    if (c.loans?.length) repayDay(c);
  }
  // ---- the business side: dividends to shareholders, profits to owners ----
  function businessDay() {
    for (const f of firms.list()) {
      const p = f.lastProfit || 0; if (p <= 0 || f.cash <= 0) continue;
      if (f.type === 'plc') {   // a third of profit paid out as dividends, shared by the shares each holder owns
        const q = quote(f), pot = Math.min(f.cash * .2, p * .33); f.cash -= pot; M.dividends += pot;
        const per = pot / SHARES;
        for (const [who, n] of Object.entries(q.holders)) { const v = per * n; if (who === 'player') M.player.dividends = (M.player.dividends || 0) + v; else { const c = citizens[+who.slice(1)]; if (c) c.savings = (c.savings || 0) + v; } }
      } else if (['sole trader', 'partnership', 'ltd'].includes(f.type)) {   // the owners draw their profits
        const draw = Math.min(f.cash * .25, p * (f.type === 'ltd' ? .3 : .6)); f.cash -= draw;
        // a private company's outside investors get their share; the founder keeps the rest
        let left = draw;
        for (const [who, pct] of Object.entries(f.stakes || {})) { const v = draw * pct; left -= v; if (who === 'player') M.player.dividends = (M.player.dividends || 0) + v; else { const c = citizens[+who.slice(1)]; if (c) c.savings = (c.savings || 0) + v; } }
        const c = f.owner != null ? citizens[f.owner] : null; if (c && !c.dead) c.wealth += left;
      }
    }
  }
  // PRIVATE companies don't sell shares to just anyone: a founder invites investors when the company needs
  // money to grow (or to get through a bad patch) — the people they know and trust, or someone with a name.
  // Their stake can only be sold back to the company. A private company that grows big enough FLOATS on the
  // Stock Exchange and becomes a plc; its private stakes become shares anyone can trade.
  function privateDay(fame, likes) {
    for (const f of firms.list()) {
      if (f.type !== 'ltd') continue;
      const sold = Object.values(f.stakes || {}).reduce((a, b) => a + b, 0);
      if (sold < .4 && rand() < (f.cash < 300 ? .03 : .006)) {
        const pct = +(.02 + rand() * .08).toFixed(3), price = Math.round(f.value * pct * (.9 + rand() * .2) / 40);   // a private valuation, in the city's money
        const owner = f.owner != null ? citizens[f.owner] : null;
        // the player is invited if they're known (fame) or the founder likes them
        if ((fame() >= 15 || (owner && likes(owner))) && !M.invites.some(i => i.firm === f.id) && M.invites.length < 6) {
          M.invites.push({ firm: f.id, name: f.name, pct, price, from: owner?.name || f.name, why: f.cash < 300 ? 'to get through a hard patch' : 'to open more branches', until: (S.tick || 0) + 24 * 3 });
          news(`📩 ${owner ? owner.name + ' of ' : ''}${f.name} has invited you to invest privately.`);
        } else {   // otherwise a well-off resident (an angel investor) may take it
          const angel = citizens.find(c => !c.dead && !c.jail && (c.savings || 0) > price * 1.5 && c.id !== f.owner && !(f.stakes || {})['c' + c.id] && rand() < .05);
          if (angel) { angel.savings -= price; f.cash += price; (f.stakes ||= {})['c' + angel.id] = pct; remember(angel, `Bought a ${Math.round(pct * 100)}% stake in ${f.name}`); }
        }
      }
      if (f.value > 1.4e6 && firms.branchesOf(f) >= 3 && f.cash > 0 && rand() < .01) float(f);
    }
    M.invites = M.invites.filter(i => (S.tick || 0) < i.until && firms.firm(i.firm) && !firms.firm(i.firm).closed);
  }
  function float(f) {
    f.type = 'plc'; const q = quote(f);
    for (const [who, pct] of Object.entries(f.stakes || {})) q.holders[who] = Math.round(pct * SHARES);
    if (f.stakes?.player) M.player.cost[f.id] = q.price * .8;
    f.stakes = {}; M.floats = (M.floats || 0) + 1;
    news(`🔔 ${f.name} has floated on the A.T. Stock Exchange at ${q.price.toFixed(2)} gold a share.`, true);
    history?.record('business', `${f.name} floated on the A.T. Stock Exchange`, 'it had grown big enough to sell shares to the public', { who: f.name, where: f.home });
  }
  function daily(opts = {}) {
    reprice();
    privateDay(opts.fame || (() => 0), opts.likes || (() => false));
    businessDay();
    for (const c of citizens) personDay(c);
    playerDay();
  }
  // ---- the player's account ----
  const P = M.player;
  function playerDay() {
    if (P.savings) P.savings += P.savings * perDay(Math.max(0, rate() - .5));
    if (P.pension.pot) P.pension.pot += P.pension.pot * perDay(rate() + 2);   // a pension fund is invested, so it grows faster than savings
    for (const l of P.loans) { const interest = l.balance * perDay(l.rate); l.balance += interest; l.dueNow = (l.dueNow || 0) + l.daily; }
    P.loans = P.loans.filter(l => l.balance > .5);
  }
  const player = {
    P, rate, quote, listed, LOAN_KINDS,
    limit(worth) { return Math.round(clamp(worth * .5 + P.credit * 2, 0, 50000)); },
    deposit(n, gold) { if (gold.get() < n || n <= 0) return 'Not enough gold.'; gold.add(-n); P.savings += n; return `Deposited ${n} gold. Your savings earn ${Math.max(0, rate() - .5).toFixed(1)}% a year.`; },
    withdraw(n, gold) { if (P.savings < n || n <= 0) return 'Not enough in savings.'; P.savings -= n; gold.add(n); return `Withdrew ${n} gold.`; },
    borrow(kind, n, gold, worth) {
      if (P.bankruptUntil > (S.tick || 0)) return 'No bank will lend to you while you are bankrupt.';
      const owed = P.loans.reduce((a, l) => a + l.balance, 0), lim = player.limit(worth) - owed;
      if (n <= 0 || n > lim) return `The bank will lend you up to ${Math.max(0, lim)} gold more.`;
      const K = LOAN_KINDS[kind], annual = +(rate() + K.margin + Math.max(0, (700 - P.credit) / 40)).toFixed(2);
      P.loans.push({ kind, principal: n, balance: n, rate: annual, daily: Math.round(n / (K.years * DAYS_A_YEAR) + n * perDay(annual)), since: S.tick || 0, dueNow: 0, missed: 0 });
      gold.add(n); M.lent += n;
      return `${K.name}: ${n} gold at ${annual}% a year. Repayments are about ${Math.round(n / (K.years * DAYS_A_YEAR) + n * perDay(annual))} gold a city day.`;
    },
    // repayments come out of your gold each city day; anything you can't cover is missed (and hurts your credit)
    collect(gold) {
      let msg = null;
      for (const l of P.loans) {
        if (!l.dueNow) continue;
        const pay = Math.min(l.dueNow, l.balance, gold.get());
        if (pay > 0) { gold.add(-pay); l.balance -= pay; M.repaid += pay; }
        if (pay < Math.min(l.dueNow, l.balance + pay)) { l.missed++; P.credit = Math.max(300, P.credit - 25); msg = `💳 You missed a loan repayment (${l.missed} so far). Your credit score is ${P.credit}.`; }
        else { l.missed = 0; P.credit = Math.min(900, P.credit + 2); }
        l.dueNow = 0;
        if (l.missed >= 8) {   // the bank goes to court: bailiffs take your savings and shares
          let got = Math.min(P.savings, l.balance); P.savings -= got; l.balance -= got;
          for (const [id, n] of holdingsOf('player')) { if (l.balance <= 0) break; const f = firms.firm(id); if (f) trade('player', f, -n, null, v => { l.balance -= v; }); }
          if (l.balance > 0) { P.bankruptUntil = (S.tick || 0) + 24 * 15; P.credit = 300; M.bankruptcies++; msg = '⚖️ The bank took you to court. Your savings and shares were seized and you have been declared bankrupt.'; }
          else msg = '⚖️ The bank took you to court and bailiffs recovered the debt from your savings and shares.';
          l.balance = 0;
        }
      }
      P.loans = P.loans.filter(l => l.balance > .5);
      if (P.dividends >= 1) { const d = Math.floor(P.dividends); P.dividends -= d; P.savings += d; }
      return msg;
    },
    repay(n, gold) { const l = P.loans[0]; if (!l) return 'You have no loans.'; n = Math.min(n, l.balance, gold.get()); if (n <= 0) return 'Not enough gold.'; gold.add(-n); l.balance -= n; P.loans = P.loans.filter(l => l.balance > .5); P.credit = Math.min(900, P.credit + 5); return `Repaid ${Math.round(n)} gold.`; },
    buy(f, n, gold) { const q = quote(f), had = q.holders.player || 0; if (!trade('player', f, n, cost => { if (gold.get() < cost) return false; gold.add(-cost); return true; })) return 'Not enough gold.'; P.cost[f.id] = ((P.cost[f.id] || q.price) * had + q.price * n) / (had + n); return `Bought ${n.toLocaleString()} shares in ${f.name} at ${q.price.toFixed(2)}.`; },
    // a pension: what you pay in gets 25% tax relief from the state, is invested, and is locked away until it
    // has been building for four city years; then a quarter comes out tax-free and the rest is taxed at 20%
    pensionIn(n, gold) { if (n <= 0 || gold.get() < n) return 'Not enough gold.'; gold.add(-n); const relief = n * .25; S.treasury = (S.treasury || 0) - relief; P.pension.pot += n + relief; P.pension.paidIn += n; P.pension.since ??= S.tick || 0; return `Paid ${n} gold into your pension; the state added ${Math.round(relief)} in tax relief.`; },
    pensionReady: () => P.pension.since != null && (S.tick || 0) - P.pension.since >= 24 * DAYS_A_YEAR * 4,
    pensionOut(gold) { if (!player.pensionReady()) return 'Your pension is locked until it has been building for four city years.'; const pot = P.pension.pot, tax = pot * .75 * .2; P.pension.pot = 0; S.treasury = (S.treasury || 0) + tax; gold.add(pot - tax); return `You took your pension: ${Math.round(pot - tax)} gold (a quarter tax-free, ${Math.round(tax)} paid in tax).`; },
    invites: () => M.invites,
    accept(i, gold) { const f = firms.firm(i.firm); if (!f || f.closed) return 'That offer has gone.'; if (gold.get() < i.price) return 'Not enough gold.'; gold.add(-i.price); f.cash += i.price; (f.stakes ||= {}).player = ((f.stakes.player || 0) + i.pct); M.invites = M.invites.filter(x => x !== i); return `You own ${Math.round(f.stakes.player * 1000) / 10}% of ${f.name}. Your share of its profits comes to you as dividends.`; },
    decline(i) { M.invites = M.invites.filter(x => x !== i); return 'Offer declined.'; },
    stakes: () => firms.list().filter(f => f.stakes?.player).map(f => [f, f.stakes.player]),
    // a private stake can only be sold back to the company, at a discount, and only if it has the cash
    sellStake(f, gold) { const pct = f.stakes?.player; if (!pct) return 'You have no stake.'; const v = Math.round(f.value * pct * .85 / 40); if (f.cash < v) return `${f.name} can't afford to buy your stake back right now.`; f.cash -= v; delete f.stakes.player; gold.add(v); return `${f.name} bought back your stake for ${v} gold.`; },
    sell(f, n, gold) { return trade('player', f, -n, null, v => gold.add(v)) ? `Sold ${n} shares in ${f.name}.` : "You don't have that many shares."; },
    holdings: () => holdingsOf('player'),
  };
  return { M, daily, hourly, lend, creditScore, quote, listed, holdingsOf, player, rate, float };
}
