// Fairground games from round the world, all playable.
// Each stall runs one of a handful of mini-game kinds, tuned per game:
//   timing  - stop the swinging marker inside the target zone (throws, tosses, shots)
//   power   - stop the power needle as high as you can (ring the bell)
//   aim     - tap the targets as they pop up before time runs out (moles, rats, shooting)
//   pick    - choose a duck, a string, a ticket... luck decides the prize
//   scoop   - scoop the swimming fish/balls before your paper scoop tears
//   wheel   - pick a number/colour/horse, then the wheel spins
//   guess   - guess the hidden number (weight, age, sweets in a jar)
//   balance - keep the swaying ladder upright for long enough
//   bingo   - mark your card as the caller draws; complete a line in time
// Winning gives a prize (into your bag) and tickets to swap at the prize counter.

export const GAMES = [
  // ---- Britain ----
  { id: 'hookaduck', name: 'Hook-a-duck', where: 'UK', icon: '🦆', price: 2, kind: 'pick', n: 9, odds: [0.55, 0.3, 0.12], how: 'Hook a duck off the stream. The number underneath decides your prize.' },
  { id: 'hoopla', name: 'Hoopla', where: 'UK', icon: '⭕', price: 3, kind: 'timing', zone: 0.12, speed: 1.6, tries: 3, need: 1, how: 'Toss three rings. Get one cleanly over a block to win what sits on it.' },
  { id: 'coconutshy', name: 'Coconut shy', where: 'UK', icon: '🥥', price: 3, kind: 'timing', zone: 0.1, speed: 1.9, tries: 3, need: 1, how: 'Three wooden balls to knock a coconut off its cup.' },
  { id: 'shooting', name: 'Shooting gallery', where: 'UK', icon: '🎯', price: 3, kind: 'aim', time: 10, need: 5, pop: 0.8, how: 'Ping the tin ducks as they pop up along the back of the gallery.' },
  { id: 'tincan', name: 'Tin can alley', where: 'UK', icon: '🥫', price: 3, kind: 'timing', zone: 0.18, speed: 1.5, tries: 3, need: 2, how: 'Knock the whole pyramid of cans off the shelf.' },
  { id: 'splatrat', name: 'Splat the rat', where: 'UK', icon: '🐀', price: 2, kind: 'aim', time: 12, need: 5, pop: 0.7, how: 'The rat shoots down the drainpipe. Splat it with the bat as it comes out!' },
  { id: 'tombola', name: 'Tombola', where: 'UK', icon: '🎟️', price: 1, kind: 'pick', n: 12, odds: [0.4, 0.12, 0.03], how: 'Draw a ticket from the drum. Tickets ending in 0 or 5 win.' },
  { id: 'luckydip', name: 'Lucky dip', where: 'UK', icon: '🎁', price: 2, kind: 'pick', n: 6, odds: [0.8, 0.15, 0.04], how: 'Rummage in the sawdust barrel for a wrapped surprise.' },
  { id: 'pennyfalls', name: 'Penny falls', where: 'UK', icon: '🪙', price: 1, kind: 'timing', zone: 0.2, speed: 1.2, tries: 5, need: 2, how: 'Drop coins onto the moving shelf and push the pile over the edge.' },
  { id: 'cakeweight', name: 'Guess the weight of the cake', where: 'UK', icon: '🎂', price: 1, kind: 'guess', min: 1000, max: 4000, unit: 'g', tol: 120, how: 'Closest guess takes the cake home.' },
  // ---- United States ----
  { id: 'milkbottles', name: 'Milk bottle pyramid', where: 'US', icon: '🍼', price: 3, kind: 'timing', zone: 0.09, speed: 2.0, tries: 3, need: 1, how: 'Knock all three bottles off the stand with a softball.' },
  { id: 'ringtoss', name: 'Ring the bottle', where: 'US', icon: '🍾', price: 3, kind: 'timing', zone: 0.07, speed: 1.8, tries: 5, need: 1, how: 'Land a ring over the neck of a bottle.' },
  { id: 'balloondarts', name: 'Balloon darts', where: 'US', icon: '🎈', price: 3, kind: 'aim', time: 12, need: 6, pop: 0.9, how: 'Pop balloons on the board with your darts.' },
  { id: 'basketball', name: 'Basketball hoops', where: 'US', icon: '🏀', price: 3, kind: 'timing', zone: 0.11, speed: 1.7, tries: 3, need: 2, how: 'Sink two out of three. The hoop is smaller than it looks!' },
  { id: 'rollball', name: 'Roll-a-ball lanes', where: 'US', icon: '🎳', price: 2, kind: 'power', tries: 5, how: 'Roll balls up the ramp into the scoring rings. 50s and 100s win more.' },
  { id: 'bellstriker', name: 'Ring the bell (high striker)', where: 'US', icon: '🔔', price: 3, kind: 'power', tries: 1, how: 'Swing the mallet. Ring the bell to win.' },
  { id: 'watergun', name: 'Water gun race', where: 'US', icon: '💦', price: 3, kind: 'aim', time: 10, need: 8, pop: 1.1, how: 'Keep the jet on the target to race your balloon to bursting first.' },
  { id: 'dimepitch', name: 'Dime pitch', where: 'US', icon: '🪙', price: 1, kind: 'timing', zone: 0.06, speed: 2.2, tries: 5, need: 1, how: 'Toss a coin so it lands on a plate or glass without sliding off.' },
  { id: 'fishbowl', name: 'Fish bowl toss', where: 'US', icon: '🐠', price: 2, kind: 'timing', zone: 0.08, speed: 2.0, tries: 5, need: 1, how: 'Bounce a ping-pong ball into one of the bowls.' },
  { id: 'coverspot', name: 'Cover the spot', where: 'US', icon: '🔴', price: 2, kind: 'timing', zone: 0.05, speed: 1.6, tries: 5, need: 5, how: 'Drop five discs to completely cover the red spot. Harder than it sounds!' },
  { id: 'ladder', name: 'Rope ladder climb', where: 'US', icon: '🪜', price: 3, kind: 'balance', time: 10, how: 'Climb the wobbly rope ladder and ring the bell at the top without flipping over.' },
  { id: 'bucket', name: 'Ball in the bucket', where: 'US', icon: '🪣', price: 2, kind: 'timing', zone: 0.1, speed: 1.6, tries: 3, need: 1, how: 'Toss a ball so it stays in the tilted bucket.' },
  { id: 'bigsix', name: 'Big Six wheel', where: 'US', icon: '🎡', price: 2, kind: 'wheel', options: ['1', '2', '5', '10', '20', '★'], how: 'Put your money on a symbol and watch the big wheel spin.' },
  { id: 'derby', name: 'Derby horse race', where: 'US', icon: '🏇', price: 2, kind: 'wheel', options: ['Red Rum-ble', 'Blue Thunder', 'Green Flash', 'Gold Dust', 'Silver Arrow'], how: 'Back a horse and watch the race.' },
  { id: 'weightguess', name: 'Guess your weight', where: 'US', icon: '⚖️', price: 2, kind: 'guess', min: 50, max: 110, unit: 'kg', tol: 3, invert: true, how: 'The guesser tries to guess your weight within 3 kg. If they miss, you win!' },
  { id: 'cratestack', name: 'Plate break', where: 'US', icon: '🍽️', price: 2, kind: 'timing', zone: 0.12, speed: 1.8, tries: 3, need: 2, how: 'Smash plates on the shelf with baseballs.' },
  { id: 'wireloop', name: 'Wire loop', where: 'US', icon: '〰️', price: 2, kind: 'balance', time: 8, how: 'Guide the loop along the twisty wire without touching it. Buzz and you lose!' },
  // ---- Germany ----
  { id: 'haudenlukas', name: 'Hau den Lukas', where: 'Germany', icon: '🔨', price: 3, kind: 'power', tries: 1, how: 'The German strongman hammer: send the weight up to the top.' },
  { id: 'entenangeln', name: 'Entenangeln (duck fishing)', where: 'Germany', icon: '🎣', price: 2, kind: 'pick', n: 8, odds: [0.6, 0.25, 0.08], how: 'Fish a duck out of the pond with a little rod. Every duck wins something.' },
  { id: 'dosenwerfen', name: 'Dosenwerfen (can throwing)', where: 'Germany', icon: '🥫', price: 3, kind: 'timing', zone: 0.15, speed: 1.6, tries: 3, need: 2, how: 'Three balls to knock down the cans.' },
  { id: 'losbude', name: 'Losbude (lottery stall)', where: 'Germany', icon: '🎫', price: 1, kind: 'pick', n: 15, odds: [0.3, 0.08, 0.02], how: 'Pick a folded lot. Most are blanks ("Niete"), but the main prize is a giant bear.' },
  { id: 'schiessbude', name: 'Schießbude (shooting stall)', where: 'Germany', icon: '🌹', price: 3, kind: 'aim', time: 10, need: 5, pop: 0.8, how: 'Shoot the paper tubes to win a rose.' },
  { id: 'gluecksrad', name: 'Glücksrad (wheel of fortune)', where: 'Germany', icon: '🎡', price: 2, kind: 'wheel', options: ['Rot', 'Blau', 'Grün', 'Gelb'], how: 'Pick a colour and give the wheel a spin.' },
  // ---- Japan ----
  { id: 'kingyo', name: 'Kingyo-sukui (goldfish scooping)', where: 'Japan', icon: '🐟', price: 3, kind: 'scoop', fish: 7, paper: 0.78, need: 2, how: 'Catch goldfish with a paper scoop (poi) before the paper tears.' },
  { id: 'yoyotsuri', name: 'Yo-yo tsuri (water-balloon fishing)', where: 'Japan', icon: '🎈', price: 2, kind: 'scoop', fish: 6, paper: 0.82, need: 1, how: 'Hook a water balloon with a paper string. Pull before it snaps.' },
  { id: 'superball', name: 'Super-ball sukui (ball scooping)', where: 'Japan', icon: '🔵', price: 2, kind: 'scoop', fish: 9, paper: 0.86, need: 3, how: 'Scoop bouncy balls. Easier than goldfish!' },
  { id: 'shateki', name: 'Shateki (cork-gun shooting)', where: 'Japan', icon: '🔫', price: 3, kind: 'aim', time: 10, need: 4, pop: 0.75, how: 'Knock prizes off the shelf with cork bullets.' },
  { id: 'wanage', name: 'Wanage (ring toss)', where: 'Japan', icon: '⭕', price: 2, kind: 'timing', zone: 0.1, speed: 1.6, tries: 5, need: 1, how: 'Throw rings over the prizes laid out on the floor.' },
  { id: 'katanuki', name: 'Katanuki (candy carving)', where: 'Japan', icon: '🍬', price: 2, kind: 'timing', zone: 0.16, speed: 1.0, tries: 4, need: 4, how: 'Carve the shape out of a thin candy sheet with a pin. One slip and it cracks!' },
  { id: 'senbonbiki', name: 'Senbonbiki (thousand strings)', where: 'Japan', icon: '🧵', price: 2, kind: 'pick', n: 10, odds: [0.5, 0.15, 0.05], how: 'Pull one of many strings. Each is tied to a hidden prize.' },
  // ---- Mexico ----
  { id: 'loteria', name: 'Lotería', where: 'Mexico', icon: '🃏', price: 2, kind: 'bingo', calls: 12, how: 'The caller draws picture cards. Mark them on your tabla and shout "¡Lotería!" on a line.' },
  { id: 'canicas', name: 'Canicas (marbles)', where: 'Mexico', icon: '🟢', price: 2, kind: 'timing', zone: 0.09, speed: 1.7, tries: 4, need: 2, how: 'Flick your marble to knock the others out of the ring.' },
  { id: 'balero', name: 'Balero (cup and ball)', where: 'Mexico', icon: '🏺', price: 1, kind: 'timing', zone: 0.08, speed: 2.2, tries: 5, need: 2, how: 'Swing the wooden barrel up and catch it on the stick.' },
  { id: 'tiroalblanco', name: 'Tiro al blanco (target shooting)', where: 'Mexico', icon: '🎯', price: 3, kind: 'aim', time: 10, need: 5, pop: 0.8, how: 'Hit the tin targets as they swing past.' },
  // ---- Amusement arcade machines ----
  { id: 'claw', name: 'Claw crane', where: 'Arcade', icon: '🧸', price: 2, kind: 'timing', zone: 0.06, speed: 1.4, tries: 2, need: 2, how: 'Line the claw up left-right, then front-back. Grab a plush!' },
  { id: 'pusher', name: 'Coin pusher', where: 'Arcade', icon: '💰', price: 1, kind: 'timing', zone: 0.22, speed: 1.1, tries: 6, need: 3, how: 'Drop coins at the right moment to tip the pile over the edge.' },
  { id: 'molebop', name: 'Bop-a-mole', where: 'Arcade', icon: '🔨', price: 2, kind: 'aim', time: 15, need: 10, pop: 0.6, how: 'Bop the moles as they pop up!' },
  { id: 'airhockey', name: 'Air hockey', where: 'Arcade', icon: '🏒', price: 2, kind: 'aim', time: 15, need: 7, pop: 0.9, how: 'Block and strike the puck. First to 7 wins.' },
  { id: 'dance', name: 'Dance machine', where: 'Arcade', icon: '💃', price: 2, kind: 'timing', zone: 0.16, speed: 2.4, tries: 8, need: 6, how: 'Step on the arrows in time with the beat.' },
  { id: 'pegdrop', name: 'Peg drop', where: 'Arcade', icon: '⚪', price: 1, kind: 'wheel', options: ['10', '50', '100', '50', '10'], how: 'Drop the puck through the pegs and see where it lands.' },
];
export const GAME_REGIONS = ['UK', 'US', 'Germany', 'Japan', 'Mexico', 'Arcade'];
const FLAG = { UK: '🇬🇧', US: '🇺🇸', Germany: '🇩🇪', Japan: '🇯🇵', Mexico: '🇲🇽', Arcade: '🕹️' };
const PRIZES = [
  [{ name: 'Sticker', icon: '⭐' }, { name: 'Bag of sweets', icon: '🍬' }, { name: 'Rubber duck', icon: '🦆' }, { name: 'Bouncy ball', icon: '🔵' }, { name: 'Keyring', icon: '🔑' }],
  [{ name: 'Small teddy', icon: '🧸' }, { name: 'Goldfish in a bag', icon: '🐟' }, { name: 'Light-up wand', icon: '🪄' }, { name: 'Toy car', icon: '🚗' }, { name: 'Daruma doll', icon: '🎎' }],
  [{ name: 'Giant teddy bear', icon: '🧸' }, { name: 'Giant plush dragon', icon: '🐉' }, { name: 'Huge inflatable banana', icon: '🍌' }, { name: 'Remote-control car', icon: '🏎️' }],
];
export const COUNTER = [
  { name: 'Glow bracelet', icon: '💫', tickets: 10 }, { name: 'Yo-yo', icon: '🪀', tickets: 20 }, { name: 'Kite', icon: '🪁', tickets: 40 }, { name: 'Plush unicorn', icon: '🦄', tickets: 80 },
  { name: 'Skateboard', icon: '🛹', tickets: 150 }, { name: 'Giant teddy bear', icon: '🧸', tickets: 250 }, { name: 'Gaming headphones', icon: '🎧', tickets: 400 },
];

export function createFairGames(ctx) {
  // ctx: { stats, toast, giveItem, pause, resume, gainXp }
  let tickets = 0, current = null;
  try { tickets = +localStorage.getItem('anotherworld-fair-tickets') || 0; } catch {}
  const saveTickets = () => { try { localStorage.setItem('anotherworld-fair-tickets', String(tickets)); } catch {} };
  const el = document.createElement('section'); el.id = 'fairGame'; el.hidden = true;
  el.innerHTML = `<style>
    #fairGame{position:fixed;inset:0;z-index:62;display:grid;place-items:center;background:rgba(10,0,20,.55);font-family:system-ui,sans-serif;touch-action:manipulation}
    #fairGame[hidden]{display:none}
    #fairGame .box{background:linear-gradient(#3b0f5a,#1d0730);color:#fff;border:3px solid #ffd23f;border-radius:18px;padding:16px;width:min(520px,94vw);max-height:90vh;overflow:auto;box-shadow:0 10px 40px #000a;text-align:center}
    #fairGame h2{margin:0;font-size:22px;color:#ffd23f}#fairGame .how{opacity:.85;font-size:14px;margin:6px 0 10px;line-height:1.35}
    #fairGame .stage{position:relative;height:190px;background:#12051f;border-radius:12px;margin:8px 0;overflow:hidden;user-select:none}
    #fairGame .bar{position:absolute;left:6%;right:6%;top:46%;height:26px;border-radius:13px;background:#333}
    #fairGame .zone{position:absolute;top:0;bottom:0;background:#22c55e;border-radius:13px}
    #fairGame .mark{position:absolute;top:-8px;width:8px;height:42px;background:#fff;border-radius:4px;box-shadow:0 0 8px #fff}
    #fairGame .t{position:absolute;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-size:30px;cursor:pointer;background:#ffffff18;transition:transform .08s}
    #fairGame .t:active{transform:scale(.85)}
    #fairGame .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:10px}
    #fairGame .grid button{font-size:24px;min-height:52px;border-radius:10px;border:0;background:#ffffff20;color:#fff;cursor:pointer}
    #fairGame .msg{min-height:22px;font-weight:700;margin:6px 0}
    #fairGame .row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
    #fairGame .go{background:#ffd23f;color:#2b0f4a;border:0;border-radius:12px;padding:12px 22px;font-size:17px;font-weight:800;cursor:pointer;min-width:120px}
    #fairGame .go:disabled{opacity:.5}#fairGame .quit{background:#555;color:#fff;border:0;border-radius:12px;padding:12px 18px;font-size:15px;cursor:pointer}
    #fairGame .tix{font-size:13px;opacity:.85;margin-top:8px}
  </style><div class="box"><h2></h2><div class="how"></div><div class="stage"></div><div class="msg"></div><div class="row"><button class="go" type="button">Play</button><button class="quit" type="button">Leave</button></div><div class="tix"></div></div>`;
  document.body.append(el);
  const $ = s => el.querySelector(s), stage = $('.stage'), msg = $('.msg'), go = $('.go');
  let raf = 0, timers = [], keyAct = null;
  const clear = () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; stage.replaceChildren(); keyAct = null; };
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const close = () => { clear(); el.hidden = true; current = null; ctx.resume?.(); };
  $('.quit').onclick = close;
  addEventListener('keydown', e => { if (el.hidden) return; if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } else if ((e.code === 'Space' || e.code === 'Enter') && keyAct) { e.preventDefault(); e.stopImmediatePropagation(); keyAct(); } else if (e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  const prizeOf = tier => { const list = PRIZES[tier]; return list[Math.floor(Math.random() * list.length)]; };
  function finish(won, tier = 0, extraTickets = 0) {
    const g = current; if (!g) return;
    const t = won ? (tier + 1) * 4 + extraTickets : 1; tickets += t; saveTickets();
    if (won) { const p = prizeOf(tier); ctx.giveItem?.(p); ctx.gainXp?.(3 + tier * 3); msg.textContent = `🎉 Winner! ${p.icon} ${p.name} and ${t} tickets.`; }
    else msg.textContent = `${['So close!', 'Unlucky!', 'Nearly!', 'Have another go?'][Math.floor(Math.random() * 4)]} (1 consolation ticket)`;
    go.disabled = false; go.textContent = `Play again (${g.price} gold)`; keyAct = () => go.click(); $('.tix').textContent = `Tickets: ${tickets}. Swap them for prizes at the prize counter.`;
  }
  // ---------------- mechanics ----------------
  const M = {
    timing(g) { // a marker swings; stop it in the zone `need` times out of `tries`
      const bar = document.createElement('div'); bar.className = 'bar'; stage.append(bar);
      const zone = document.createElement('div'); zone.className = 'zone'; bar.append(zone); const mark = document.createElement('div'); mark.className = 'mark'; bar.append(mark);
      let hits = 0, left = g.tries, t0 = performance.now(), pos = 0, zc = 0.5;
      const place = () => { zc = 0.15 + Math.random() * 0.7; zone.style.left = (zc - g.zone / 2) * 100 + '%'; zone.style.width = g.zone * 100 + '%'; };
      place(); go.textContent = `Throw! (${left} left)`;
      const loop = now => { pos = 0.5 + 0.5 * Math.sin((now - t0) / 1000 * g.speed * Math.PI); mark.style.left = `calc(${pos * 100}% - 4px)`; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
      const act = () => { if (left <= 0) return; left--; const hit = Math.abs(pos - zc) <= g.zone / 2; if (hit) hits++; msg.textContent = hit ? `✅ Hit! (${hits}/${g.need})` : '❌ Missed'; place(); go.textContent = `Throw! (${left} left)`;
        if (hits >= g.need) { cancelAnimationFrame(raf); finish(true, g.need >= 3 || g.zone < 0.08 ? 2 : g.need >= 2 ? 1 : 0); } else if (left <= 0 || g.tries - (g.tries - left) < g.need - hits) { cancelAnimationFrame(raf); finish(false); } };
      go.onclick = act; keyAct = act; stage.onpointerdown = act;
    },
    power(g) { // power needle rises and falls; stop it high
      const bar = document.createElement('div'); bar.className = 'bar'; bar.style.cssText += ';left:44%;right:44%;top:6%;bottom:6%;height:auto'; stage.append(bar);
      const fill = document.createElement('div'); fill.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:linear-gradient(#ff3b30,#ffd23f,#22c55e);border-radius:13px'; bar.append(fill);
      const bell = document.createElement('div'); bell.textContent = '🔔'; bell.style.cssText = 'position:absolute;left:50%;top:0;transform:translateX(-50%);font-size:28px'; stage.append(bell);
      let left = g.tries, best = 0, t0 = performance.now(), p = 0; go.textContent = `Swing! (${left})`;
      const loop = now => { p = Math.abs(Math.sin((now - t0) / 1000 * 2.4)); fill.style.height = p * 100 + '%'; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
      const act = () => { if (left <= 0) return; left--; best = Math.max(best, p); msg.textContent = p > 0.95 ? '🔔 DING! You rang the bell!' : `Score ${Math.round(p * 100)}`; go.textContent = `Swing! (${left})`;
        if (left <= 0) { cancelAnimationFrame(raf); fill.style.height = best * 100 + '%'; finish(best > 0.8, best > 0.95 ? 2 : best > 0.88 ? 1 : 0); } };
      go.onclick = act; keyAct = act; stage.onpointerdown = act;
    },
    aim(g) { // targets pop up; tap them
      let hits = 0, end = performance.now() + g.time * 1000; go.disabled = true; go.textContent = '...';
      const spawn = () => { if (performance.now() > end) return; const t = document.createElement('div'); t.className = 't'; t.textContent = g.icon; t.style.left = 8 + Math.random() * 80 + '%'; t.style.top = 8 + Math.random() * 62 + '%';
        t.onpointerdown = e => { e.stopPropagation(); hits++; t.textContent = '💥'; t.onpointerdown = null; later(() => t.remove(), 150); msg.textContent = `Hits: ${hits}/${g.need}`; };
        stage.append(t); later(() => t.remove(), g.pop * 1000); later(spawn, 350 + Math.random() * 450); };
      spawn(); later(spawn, 200);
      const tick = () => { const left = Math.max(0, (end - performance.now()) / 1000); go.textContent = `${left.toFixed(1)} s`; if (left <= 0) { stage.replaceChildren(); finish(hits >= g.need, hits >= g.need * 1.6 ? 2 : hits >= g.need * 1.25 ? 1 : 0); return; } raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
    },
    pick(g) { // choose one; odds decide the tier
      const grid = document.createElement('div'); grid.className = 'grid'; stage.append(grid); go.disabled = true; go.textContent = 'Pick one!';
      for (let i = 0; i < g.n; i++) { const b = document.createElement('button'); b.type = 'button'; b.textContent = g.icon; b.onclick = () => {
        for (const x of grid.children) x.disabled = true; const r = Math.random(); const tier = r < g.odds[2] ? 2 : r < g.odds[2] + g.odds[1] ? 1 : r < g.odds[0] + g.odds[1] + g.odds[2] ? 0 : -1;
        b.textContent = tier < 0 ? '✖️' : ['🥉', '🥈', '🥇'][tier]; finish(tier >= 0, Math.max(0, tier)); }; grid.append(b); }
    },
    scoop(g) { // fish swim; each scoop risks tearing the paper
      let caught = 0, torn = false; const fish = []; stage.style.background = 'radial-gradient(#2f7fb8,#123d63)'; go.disabled = true; go.textContent = 'Scoop!';
      for (let i = 0; i < g.fish; i++) { const f = document.createElement('div'); f.className = 't'; f.textContent = g.icon; stage.append(f); fish.push({ f, x: Math.random() * 80 + 5, y: Math.random() * 60 + 8, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 20 });
        f.onpointerdown = e => { e.stopPropagation(); if (torn || !f.isConnected) return; if (Math.random() < g.paper) { caught++; f.remove(); msg.textContent = `Caught ${caught}! The paper is getting soggy...`; g.paper *= 0.85; } else { torn = true; msg.textContent = '💧 The paper tore!'; end(); } }; }
      let last = performance.now(); const loop = now => { const dt = (now - last) / 1000; last = now; for (const o of fish) { o.x += o.vx * dt; o.y += o.vy * dt; if (o.x < 2 || o.x > 88) o.vx *= -1; if (o.y < 4 || o.y > 72) o.vy *= -1; o.f.style.left = o.x + '%'; o.f.style.top = o.y + '%'; } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
      const end = () => { cancelAnimationFrame(raf); finish(caught >= g.need, caught >= g.need + 3 ? 2 : caught >= g.need + 1 ? 1 : 0); };
      later(() => { if (!torn) { torn = true; msg.textContent = 'Time up!'; end(); } }, 15000);
    },
    wheel(g) { // pick an option, the wheel spins
      const grid = document.createElement('div'); grid.className = 'grid'; grid.style.gridTemplateColumns = `repeat(${Math.min(5, g.options.length)},1fr)`; stage.append(grid); go.disabled = true; go.textContent = 'Choose';
      const show = document.createElement('div'); show.style.cssText = 'font-size:34px;font-weight:800;margin-top:8px;color:#ffd23f'; stage.append(show);
      g.options.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = o; b.style.fontSize = o.length > 3 ? '13px' : '22px'; b.onclick = () => {
        for (const x of grid.children) x.disabled = true; b.style.background = '#ffd23f55'; let k = 0, n = 18 + Math.floor(Math.random() * g.options.length * 2);
        const spin = () => { show.textContent = g.options[k % g.options.length]; if (k++ < n) later(spin, 60 + k * 9); else { const land = (k - 1) % g.options.length; const won = land === i; finish(won, won ? (g.options.length >= 6 ? 2 : 1) : 0); } }; spin(); }; grid.append(b); });
    },
    guess(g) { // guess the hidden number
      const secret = Math.round(g.min + Math.random() * (g.max - g.min)); go.textContent = 'Guess!';
      const wrap = document.createElement('div'); wrap.style.cssText = 'padding:28px 18px'; const lab = document.createElement('div'); lab.style.cssText = 'font-size:30px;font-weight:800;color:#ffd23f'; const r = document.createElement('input'); r.type = 'range'; r.min = g.min; r.max = g.max; r.value = Math.round((g.min + g.max) / 2); r.style.width = '100%';
      const upd = () => { lab.textContent = `${r.value} ${g.unit}`; }; r.oninput = upd; upd(); wrap.append(lab, r); stage.append(wrap);
      const act = () => { const off = Math.abs(+r.value - secret), close = off <= g.tol; const won = g.invert ? !close : close; msg.textContent = `It was ${secret} ${g.unit}. ${g.invert ? (close ? 'The guesser got it!' : 'The guesser was wrong!') : close ? 'Spot on!' : `You were ${off} ${g.unit} out.`}`; go.disabled = true; finish(won, won && off <= g.tol / 3 ? 2 : 1); };
      go.onclick = act; keyAct = act;
    },
    balance(g) { // keep the needle centred by tapping left/right
      let ang = 0, vel = 0, alive = true, t0 = performance.now(); go.disabled = true; go.textContent = '';
      const pole = document.createElement('div'); pole.style.cssText = 'position:absolute;left:50%;bottom:10px;width:10px;height:150px;background:#ffd23f;transform-origin:50% 100%;border-radius:5px'; stage.append(pole);
      const L = document.createElement('button'), R = document.createElement('button'); for (const [b, s, t] of [[L, -1, '◀'], [R, 1, '▶']]) { b.type = 'button'; b.textContent = t; b.style.cssText = `position:absolute;${s < 0 ? 'left' : 'right'}:10px;top:60px;width:70px;height:70px;font-size:30px;border-radius:14px;border:0;background:#ffffff30;color:#fff`; b.onpointerdown = e => { e.stopPropagation(); vel += s * 0.9; }; stage.append(b); }
      keyAct = null; const onKey = e => { if (el.hidden) return removeEventListener('keydown', onKey, true); if (e.code === 'ArrowLeft' || e.code === 'KeyA') vel -= 0.9; if (e.code === 'ArrowRight' || e.code === 'KeyD') vel += 0.9; }; addEventListener('keydown', onKey, true);
      let last = performance.now(); const loop = now => { const dt = (now - last) / 1000; last = now; const t = (now - t0) / 1000; vel += (ang * 2.4 + (Math.random() - 0.5) * 3.5) * dt; ang += vel * dt; pole.style.transform = `rotate(${ang * 40}deg)`;
        msg.textContent = `Hold on! ${Math.max(0, g.time - t).toFixed(1)} s`; if (Math.abs(ang) > 1.2) { alive = false; msg.textContent = '🙃 You flipped off!'; removeEventListener('keydown', onKey, true); finish(false); return; }
        if (t >= g.time) { removeEventListener('keydown', onKey, true); finish(true, 1); return; } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); void alive;
    },
    bingo(g) { // 3x3 tabla; cards are called; get a line within `calls`
      const deck = ['🌙', '☀️', '⭐', '🌵', '🐟', '🦜', '🌹', '🍉', '🎩', '🪕', '🐓', '💀', '🧜', '🌲', '☂️', '🏺', '🦌', '🕷️'];
      const card = deck.slice().sort(() => Math.random() - 0.5).slice(0, 9), marked = new Set(); const grid = document.createElement('div'); grid.className = 'grid'; grid.style.gridTemplateColumns = 'repeat(3,1fr)'; grid.style.width = '60%'; stage.append(grid);
      const called = document.createElement('div'); called.style.cssText = 'position:absolute;right:12px;top:40%;font-size:46px'; stage.append(called);
      card.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = () => { if (b.dataset.on) { marked.add(i); b.style.background = '#22c55e'; check(); } }; grid.append(b); });
      const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      let n = 0, done = false; const pool = deck.slice().sort(() => Math.random() - 0.5); go.disabled = true;
      const check = () => { if (!done && lines.some(l => l.every(i => marked.has(i)))) { done = true; msg.textContent = '¡Lotería!'; finish(true, n <= g.calls - 4 ? 2 : 1); } };
      const next = () => { if (done) return; if (n >= g.calls) { done = true; msg.textContent = 'No line this time.'; finish(false); return; } const c = pool[n++]; called.textContent = c; msg.textContent = `Card ${n} of ${g.calls}: tap it if it's on your tabla`; const i = card.indexOf(c); if (i >= 0) grid.children[i].dataset.on = '1'; later(next, 1700); };
      later(next, 600);
    },
  };
  function start() {
    const g = current; if (!g) return;
    if (ctx.stats.gold < g.price) { msg.textContent = `You need ${g.price} gold.`; return; }
    ctx.stats.gold -= g.price; clear(); msg.textContent = ''; go.disabled = false; go.onclick = null; stage.onpointerdown = null;
    M[g.kind]({ ...g });
  }
  function open(id) {
    const g = GAMES.find(x => x.id === id); if (!g) return;
    current = g; clear(); el.hidden = false; ctx.pause?.();
    $('h2').textContent = `${g.icon} ${g.name}`; $('.how').textContent = `${FLAG[g.where] || ''} ${g.where === 'Arcade' ? 'Arcade machine' : 'From ' + g.where} · ${g.how}`;
    msg.textContent = ''; go.disabled = false; go.textContent = `Play (${g.price} gold)`; go.onclick = start; keyAct = start; stage.onpointerdown = null;
    $('.tix').textContent = `Tickets: ${tickets}`;
  }
  function openCounter() {
    current = { id: 'counter' }; clear(); el.hidden = false; ctx.pause?.();
    $('h2').textContent = '🎟️ Prize counter'; $('.how').textContent = 'Swap the tickets you win at the stalls for prizes.'; msg.textContent = ''; go.disabled = true; go.textContent = `${tickets} tickets`;
    const grid = document.createElement('div'); grid.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:8px;text-align:left'; stage.style.height = 'auto'; stage.append(grid);
    for (const p of COUNTER) { const b = document.createElement('button'); b.type = 'button'; b.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:10px;border:0;background:#ffffff20;color:#fff;font-size:15px'; b.innerHTML = `<span>${p.icon} ${p.name}</span><b>${p.tickets} 🎟️</b>`; b.disabled = tickets < p.tickets;
      b.onclick = () => { if (tickets < p.tickets) return; tickets -= p.tickets; saveTickets(); ctx.giveItem?.({ name: p.name, icon: p.icon }); msg.textContent = `${p.icon} ${p.name} is yours!`; go.textContent = `${tickets} tickets`; for (const [k, x] of [...grid.children].entries()) x.disabled = tickets < COUNTER[k].tickets; }; grid.append(b); }
  }
  // stage height back to normal for games
  const reset = () => { stage.style.height = ''; stage.style.background = ''; };
  const openGame = id => { reset(); open(id); }, openPrizes = () => { reset(); openCounter(); };
  return { open: openGame, openCounter: openPrizes, close, get tickets() { return tickets; }, get isOpen() { return !el.hidden; },
    snapshot: () => ({ tickets }), restore(s) { if (s && Number.isFinite(s.tickets)) tickets = s.tickets; } };
}
