// Casino games played for real gold: slot machines, roulette and blackjack.
// (Blackjack has real decisions: hit, stand or double.) Odds are fair-ish, the house still wins.
export function createCasino({ money, spend, earn, toast, pause, resume }) {
  const root = document.createElement('section');
  root.id = 'casinoGame'; root.hidden = true;
  root.innerHTML = `<style>
    #casinoGame{position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:radial-gradient(#0b3d24,#04150c);font-family:system-ui,sans-serif;color:#fff}
    #casinoGame[hidden]{display:none}
    #casinoGame .box{width:min(560px,96vw);max-height:94vh;overflow:auto;text-align:center;padding:10px}
    #casinoGame h2{margin:4px 0;font-size:clamp(18px,3vw,26px);color:#ffd23f}
    #casinoGame .gold{opacity:.85;margin-bottom:8px}
    #casinoGame .table{background:#0e5a34;border:6px solid #5a3a1a;border-radius:24px;padding:14px;min-height:150px;margin:8px 0}
    #casinoGame .reels{display:flex;justify-content:center;gap:10px;font-size:clamp(40px,10vw,64px)}
    #casinoGame .reels span{background:#fff;color:#111;border-radius:12px;width:1.4em;display:inline-block}
    #casinoGame .cards{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:6px 0}
    #casinoGame .card{background:#fff;color:#111;border-radius:8px;padding:8px 6px;min-width:42px;font-weight:800;font-size:20px}
    #casinoGame .card.red{color:#c0392b}#casinoGame .card.back{background:repeating-linear-gradient(45deg,#c0392b 0 6px,#8a1f1f 6px 12px)}
    #casinoGame .msg{min-height:1.4em;font-weight:700;color:#ffd23f;margin:6px 0}
    #casinoGame button{background:#ffd23f;color:#111;border:0;border-radius:10px;padding:10px 14px;margin:4px;font-weight:800;font-size:15px;min-height:44px}
    #casinoGame button.alt{background:#2a3f2f;color:#fff}#casinoGame button:disabled{opacity:.4}
    #casinoGame .wheel{font-size:clamp(40px,9vw,60px);font-weight:900}
  </style><div class="box"></div>`;
  document.body.append(root);
  const box = root.querySelector('.box');
  addEventListener('keydown', e => { if (!root.hidden && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  let bet = 10, name = 'Casino';
  const el = (tag, html, cls) => { const n = document.createElement(tag); if (html != null) n.innerHTML = html; if (cls) n.className = cls; return n; };
  const btn = (label, fn, cls) => { const b = el('button', label, cls); b.type = 'button'; b.onclick = fn; return b; };
  function header(title) {
    box.replaceChildren(el('h2', title), el('div', `${name} · You have <b>${Math.floor(money())}</b> gold · Bet <b>${bet}</b>`, 'gold'));
    const bets = el('div'); for (const b of [5, 10, 25, 50, 100]) bets.append(btn(`${b}`, () => { bet = b; current(); }, b === bet ? '' : 'alt')); box.append(bets);
  }
  const footer = () => box.append(btn('Back to the floor', close, 'alt'));
  const take = () => { if (money() < bet) { toast(`You need ${bet} gold for that bet.`); return false; } spend(bet); return true; };
  let current = () => {};

  // ---------------- slots
  const SYM = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'], PAY = { '🍒': 3, '🍋': 4, '🔔': 6, '⭐': 10, '💎': 20, '7️⃣': 50 };
  function slots(msg = 'Three in a row pays big. Two cherries pays 1×.', reels = ['❔', '❔', '❔']) {
    current = () => slots(); header('🎰 Slot machine');
    const t = el('div', null, 'table'), r = el('div', reels.map(s => `<span>${s}</span>`).join(''), 'reels'); t.append(r, el('div', msg, 'msg'));
    const spin = btn('SPIN', () => {
      if (!take()) return; spin.disabled = true;
      const out = [0, 1, 2].map(() => SYM[Math.floor(Math.random() * (Math.random() < 0.5 ? 3 : SYM.length))]);
      let n = 0; const iv = setInterval(() => { n++; r.innerHTML = [0, 1, 2].map(i => `<span>${n > 6 + i * 4 ? out[i] : SYM[Math.floor(Math.random() * SYM.length)]}</span>`).join(''); if (n > 16) { clearInterval(iv);
        let win = 0; if (out[0] === out[1] && out[1] === out[2]) win = bet * PAY[out[0]]; else if (out.filter(s => s === '🍒').length === 2) win = bet;
        if (win) earn(win); slots(win ? `WIN! +${win} gold` : 'No luck. Spin again?', out); } }, 70);
    });
    t.append(spin); box.append(t); footer();
  }
  // ---------------- roulette
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  function roulette(msg = 'Pick a bet. Red/black/odd/even pay 2×, a dozen pays 3×, a single number pays 36×.', last = null) {
    current = () => roulette(); header('🎡 Roulette');
    const t = el('div', null, 'table');
    t.append(el('div', last == null ? '🎡' : `<span style="color:${last === 0 ? '#22ff88' : REDS.has(last) ? '#ff5a4a' : '#fff'}">${last}</span>`, 'wheel'), el('div', msg, 'msg'));
    const play = (label, test, mult) => btn(label, () => {
      if (!take()) return;
      let n = 0; const w = t.querySelector('.wheel'); const iv = setInterval(() => { n++; w.textContent = Math.floor(Math.random() * 37); if (n > 14) { clearInterval(iv);
        const r = Math.floor(Math.random() * 37), won = test(r); if (won) earn(bet * mult);
        roulette(`${r} ${r === 0 ? 'green' : REDS.has(r) ? 'red' : 'black'}: ${won ? `you win ${bet * mult} gold!` : 'the house wins.'}`, r); } }, 80);
    });
    t.append(play('🔴 Red', r => REDS.has(r), 2), play('⚫ Black', r => r > 0 && !REDS.has(r), 2), play('Odd', r => r % 2 === 1, 2), play('Even', r => r > 0 && r % 2 === 0, 2),
      play('1–12', r => r >= 1 && r <= 12, 3), play('13–24', r => r >= 13 && r <= 24, 3), play('25–36', r => r >= 25, 3));
    const lucky = 7 + Math.floor(Math.random() * 20); t.append(play(`Number ${lucky}`, r => r === lucky, 36));
    box.append(t); footer();
  }
  // ---------------- blackjack
  const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let deck = [], hand = null;
  const draw = () => { if (deck.length < 15) { deck = []; for (const s of SUITS) for (const r of RANKS) deck.push({ s, r }); deck.sort(() => Math.random() - 0.5); } return deck.pop(); };
  const value = cards => { let v = 0, aces = 0; for (const c of cards) { v += c.r === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; if (c.r === 'A') aces++; } while (v > 21 && aces--) v -= 10; return v; };
  const show = (cards, hide) => cards.map((c, i) => hide && i === 1 ? '<span class="card back">&nbsp;&nbsp;</span>' : `<span class="card ${'♥♦'.includes(c.s) ? 'red' : ''}">${c.r}${c.s}</span>`).join('');
  function blackjack(msg = 'Get closer to 21 than the dealer without going over. Blackjack pays 2.5×.') {
    current = () => blackjack(); header('🃏 Blackjack');
    const t = el('div', null, 'table');
    if (hand) {
      t.append(el('div', `Dealer ${hand.done ? value(hand.dealer) : ''}`), el('div', show(hand.dealer, !hand.done), 'cards'), el('div', `You ${value(hand.me)}`), el('div', show(hand.me), 'cards'));
    }
    t.append(el('div', msg, 'msg'));
    if (!hand || hand.done) t.append(btn('Deal', () => {
      if (!take()) return;
      hand = { me: [draw(), draw()], dealer: [draw(), draw()], stake: bet, done: false };
      if (value(hand.me) === 21) { hand.done = true; const w = Math.floor(hand.stake * 2.5); earn(w); blackjack(`BLACKJACK! +${w} gold`); return; }
      blackjack('Hit or stand?');
    }));
    else {
      t.append(btn('Hit', () => { hand.me.push(draw()); if (value(hand.me) > 21) { hand.done = true; blackjack(`Bust with ${value(hand.me)}. You lose ${hand.stake}.`); } else blackjack('Hit or stand?'); }),
        btn('Stand', settle),
        btn('Double', () => { if (money() < hand.stake) { toast('Not enough gold to double.'); return; } spend(hand.stake); hand.stake *= 2; hand.me.push(draw()); if (value(hand.me) > 21) { hand.done = true; blackjack(`Bust with ${value(hand.me)}. You lose ${hand.stake}.`); } else settle(); }, 'alt'));
    }
    box.append(t); footer();
  }
  function settle() {
    while (value(hand.dealer) < 17) hand.dealer.push(draw());
    hand.done = true;
    const me = value(hand.me), de = value(hand.dealer);
    if (de > 21 || me > de) { earn(hand.stake * 2); blackjack(`You win ${hand.stake * 2} gold! (${me} vs ${de})`); }
    else if (me === de) { earn(hand.stake); blackjack(`Push: ${me} each. Stake returned.`); }
    else blackjack(`Dealer wins, ${de} vs ${me}.`);
  }
  function open(game, venue = 'Casino') {
    name = venue; root.hidden = false; pause?.();
    ({ slots, roulette, blackjack }[game] || slots)();
  }
  function close() { if (root.hidden) return; root.hidden = true; resume?.(); }
  return { open, close, get isOpen() { return !root.hidden; } };
}
