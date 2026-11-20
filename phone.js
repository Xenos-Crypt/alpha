// CRYPTIC: the phone (and laptop) everyone carries. Cryptic is the only phone company in Anthos, made by the
// government. Your phone runs the apps: the torch, taxis and the map live on it now, and most other apps are
// downloaded from the Cryptic Store (some free, some paid in gold).
// - Everyone starts with a Cryptic C1 with a cracked screen (the one from the opening); the admin has a Cryptic Prime.
// - Buy a Cryptic Book laptop in the store and the same apps open full-size (switch in Settings).
// The buttons that used to sit on the screen (map, torch, taxi, career, city hall) are apps here now.
// Press H or tap 📱 to open the phone. Photos, installed apps, notes and posts are saved on this device.
import { ADVERTISING_CONFIG } from './advertising-config.js';

// every app: built in (pre) or from the store, with a price in gold (0 = free)
export const APPS = {
  torch:    { name: 'Torch', icon: '🔦', pre: true },
  camera:   { name: 'Camera', icon: '📷', pre: true },
  gallery:  { name: 'Photos', icon: '🖼️', pre: true },
  maps:     { name: 'Maps', icon: '🗺️', pre: true },
  taxi:     { name: 'Taxi', icon: '🚕', pre: true },
  infohub:  { name: 'Info Hub', icon: 'ℹ️', pre: true },
  career:   { name: 'Career Hub', icon: '💼', pre: true },
  cityhall: { name: 'Anthos Gov', icon: '🏛️', pre: true },
  store:    { name: 'Cryptic Store', icon: '🛍️', pre: true },
  settings: { name: 'Settings', icon: '⚙️', pre: true },
  news:     { name: 'Anthos News', icon: '📰', price: 0, about: 'Read today\'s news from around the city.' },
  calendar: { name: 'Calendar', icon: '📅', price: 0, about: 'The month at a glance, with holidays and your own events.' },
  tube:     { name: 'CrypticTube', icon: '▶️', price: 0, about: 'Watch videos and programmes.' },
  lumi:     { name: 'Lumi', icon: '📸', price: 0, about: 'Share your photos and see what the city is posting.' },
  weather:  { name: 'Weather', icon: '⛅', price: 0, about: 'Today\'s weather and the season.' },
  notes:    { name: 'Notes', icon: '📝', price: 0, about: 'Write things down.' },
  calc:     { name: 'Calculator', icon: '🧮', price: 0, about: 'Add up your gold.' },
  clock:    { name: 'Clock', icon: '⏰', price: 0, about: 'The time in Anthos and a stopwatch.' },
  bank:     { name: 'Bank', icon: '🏦', price: 5, about: 'Check your money without going to a branch.' },
  quests:   { name: 'Quest Log', icon: '📜', price: 10, about: 'Your System quests, on your phone.' },
  fitness:  { name: 'Fit Tracker', icon: '🏃', price: 15, about: 'Steps, distance and training today.' },
  laptop:   { name: 'Cryptic Book (laptop)', icon: '💻', price: 300, device: true, about: 'A laptop: the same apps, full-size. Delivered to you straight away.' },
};

export function createPhone(ctx) {
  const uid = () => ctx.userId?.() || 'guest';
  const load = () => { try { return JSON.parse(localStorage.getItem('cryptic:' + uid()) || 'null'); } catch { return null; } };
  let S = null;
  const fresh = () => ({ installed: [], photos: [], posts: [], notes: '', events: [], laptop: false, steps: 0 });
  const st = () => (S ||= { ...fresh(), ...(load() || {}) });
  const save = () => { try { localStorage.setItem('cryptic:' + uid(), JSON.stringify(S)); } catch { if (S.photos.length > 5) { S.photos.splice(0, 5); save(); } } };
  const has = id => APPS[id]?.pre || st().installed.includes(id);

  // ---------------- the device ----------------
  const css = document.createElement('style');
  css.textContent = `#crypticPhone{position:fixed;right:18px;bottom:18px;z-index:58;width:min(320px,calc(100vw - 24px));height:min(640px,calc(100vh - 24px));border-radius:34px;background:#0c0d10;padding:12px;box-shadow:0 20px 60px #000a,0 0 0 2px #2a2d33;display:flex;flex-direction:column}
#crypticPhone[hidden]{display:none}#crypticPhone.laptop{left:50%;top:50%;right:auto;bottom:auto;transform:translate(-50%,-50%);width:min(980px,calc(100vw - 24px));height:min(620px,calc(100vh - 24px));border-radius:14px;padding:16px 16px 26px}
#crypticPhone .scr{flex:1;border-radius:24px;overflow:hidden;background:linear-gradient(160deg,#16324f,#0b1726 60%,#1d1135);color:#eef3fa;font:14px/1.45 system-ui;position:relative;display:flex;flex-direction:column}
#crypticPhone.laptop .scr{border-radius:6px}
#crypticPhone .bar{display:flex;justify-content:space-between;padding:8px 16px 4px;font:600 12px system-ui;opacity:.9}
#crypticPhone .body{flex:1;overflow:auto;padding:10px 14px 14px}
#crypticPhone .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 8px;padding-top:6px}#crypticPhone.laptop .grid{grid-template-columns:repeat(8,1fr)}
#crypticPhone .app{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;color:#fff;font:11px system-ui;cursor:pointer;min-height:44px}
#crypticPhone .app i{font-style:normal;font-size:24px;width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:#ffffff1c}
#crypticPhone h3{margin:2px 0 10px;font:700 18px system-ui}#crypticPhone .row{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #ffffff14}
#crypticPhone button.b{font:600 13px system-ui;padding:8px 12px;min-height:36px;border-radius:10px;border:0;background:#2f6fdf;color:#fff;cursor:pointer}#crypticPhone button.g{background:#ffffff22}
#crypticPhone .pbtns{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:8px}#crypticPhone .home{height:5px;width:110px;border:0;padding:0;border-radius:3px;background:#fff9;cursor:pointer}#crypticPhone .pclose{background:#ffffff1a;color:#fff;border:1px solid #ffffff33;border-radius:999px;padding:3px 10px;font:12px system-ui;cursor:pointer}
#crypticPhone .crack{position:absolute;inset:0;pointer-events:none;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 200'%3E%3Cg stroke='white' stroke-opacity='.35' fill='none' stroke-width='.4'%3E%3Cpath d='M0 8 L14 18 L22 15 L35 30 M14 18 L10 34 L18 52 M22 15 L30 4 M35 30 L48 33 M35 30 L37 47'/%3E%3C/g%3E%3C/svg%3E") top left/100% 100% no-repeat}
#crypticPhone img.ph{width:100%;border-radius:10px;display:block}#crypticPhone .pics{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}#crypticPhone .pics img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;cursor:pointer}
#crypticPhone textarea,#crypticPhone input{width:100%;box-sizing:border-box;background:#ffffff14;color:#fff;border:1px solid #ffffff2a;border-radius:10px;padding:8px;font:14px system-ui}
#crypticPhone .cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;font-size:12px}#crypticPhone .cal div{padding:6px 0;border-radius:6px}#crypticPhone .cal .t{background:#2f6fdf}#crypticPhone .cal .h{background:#ffffff1f}
#crypticPhone .post{background:#ffffff10;border-radius:14px;padding:10px;margin-bottom:12px}#crypticPhone .fake{height:150px;border-radius:10px;display:grid;place-items:center;font-size:54px}
#phoneBtn{position:fixed;right:16px;top:136px;z-index:12;color:#fff;font:12px system-ui;background:rgba(10,14,24,.55);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:7px 12px;cursor:pointer}
body.cinema #phoneBtn{visibility:hidden}`;
  document.head.append(css);
  const el = document.createElement('section'); el.id = 'crypticPhone'; el.hidden = true; document.body.append(el);
  const btn = document.createElement('button'); btn.id = 'phoneBtn'; btn.type = 'button'; btn.textContent = '📱 Phone (H)'; btn.onclick = () => toggle(); document.body.append(btn);
  let open = false, app = 'home', laptop = false;

  function frame(title, inner, opts = {}) {
    const d = new Date(), time = d.toTimeString().slice(0, 5);
    const model = ctx.premium?.() ? 'Cryptic Prime' : 'Cryptic C1';
    el.className = laptop ? 'laptop' : '';
    el.innerHTML = `<div class="scr"><div class="bar"><span>${time}</span><span>${laptop ? 'Cryptic Book' : model} · 5G · ${Math.floor(ctx.stats.gold)}g</span></div><div class="body"></div>${!laptop && !ctx.premium?.() ? '<div class="crack"></div>' : ''}</div><div class="pbtns"><button type="button" class="home" title="Home"></button><button type="button" class="pclose" title="Put the phone away (H or Esc)">✕ Close</button></div>`;
    const body = el.querySelector('.body');
    if (title) { const h = document.createElement('h3'); h.textContent = title; body.append(h); }
    if (typeof inner === 'string') body.insertAdjacentHTML('beforeend', inner); else if (inner) body.append(inner);
    el.querySelector('.home').onclick = () => go('home'); el.querySelector('.pclose').onclick = () => toggle(false);
    return body;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const button = (label, fn, cls = 'b') => { const b = document.createElement('button'); b.className = 'b ' + (cls === 'g' ? 'g' : ''); b.type = 'button'; b.textContent = label; b.onclick = fn; return b; };
  const row = (left, right) => { const r = document.createElement('div'); r.className = 'row'; const l = document.createElement('div'); l.innerHTML = left; r.append(l); if (right) r.append(right); return r; };

  // ---------------- screens ----------------
  const screens = {
    home() {
      const body = frame('', '');
      const hello = document.createElement('div'); hello.style.cssText = 'text-align:center;margin:8px 0 14px'; hello.innerHTML = `<div style="font:200 44px system-ui">${new Date().toTimeString().slice(0, 5)}</div><div style="opacity:.75">${new Date().toDateString()}</div><div style="opacity:.5;font-size:11px;margin-top:4px">CRYPTIC · made in Anthos by the Government of Anthos</div>`;
      body.append(hello);
      const grid = document.createElement('div'); grid.className = 'grid';
      for (const [id, a] of Object.entries(APPS)) { if (a.device || !has(id)) continue; const b = document.createElement('button'); b.className = 'app'; b.type = 'button'; b.innerHTML = `<i>${a.icon}</i>${esc(a.name)}`; b.onclick = () => go(id); grid.append(b); }
      body.append(grid);
    },
    torch() {
      const on = ctx.torch.on();
      const body = frame('Torch', `<div style="text-align:center;font-size:90px;margin:30px 0;filter:${on ? 'drop-shadow(0 0 30px #fff7c2)' : 'grayscale(1)'}">🔦</div>`);
      body.append(button(on ? 'Turn the torch off' : 'Turn the torch on', () => { ctx.torch.toggle(); go('torch'); }));
    },
    camera() {
      const body = frame('Camera', '<p style="opacity:.75">Point the game camera where you want, then take the picture. The phone hides while it snaps.</p>');
      body.append(button('📸 Take a picture', () => {
        el.style.visibility = 'hidden';
        requestAnimationFrame(() => { const shot = ctx.snap(); el.style.visibility = ''; if (shot) { st().photos.push({ src: shot, at: Date.now() }); if (S.photos.length > 30) S.photos.shift(); save(); ctx.toast('📸 Saved to Photos.'); go('gallery'); } });
      }));
    },
    gallery() {
      const body = frame('Photos', st().photos.length ? '' : '<p style="opacity:.7">No photos yet. Use the Camera app.</p>');
      const g = document.createElement('div'); g.className = 'pics';
      [...S.photos].reverse().forEach((p, i) => { const im = document.createElement('img'); im.src = p.src; im.onclick = () => viewPhoto(S.photos.length - 1 - i); g.append(im); });
      body.append(g);
    },
    maps() { close(); ctx.openMap(); },
    career() { close(); ctx.openCareer(); },
    cityhall() { close(); ctx.openCityHall(); },
    taxi() {
      const body = frame('Taxi', '<p style="opacity:.8">A Cryptic Taxi picks you up where you are.</p>');
      body.append(button('🚕 Call a taxi here', () => { close(); ctx.callTaxi(); }));
    },
    infohub() {
      const c = ctx.calendar?.() || {}, d = new Date();
      const lines = [
        ['📅 Today', d.toDateString()], ['🕒 Time in Anthos', ctx.gameTime?.() || ''], ['🌤️ Weather', ctx.weather?.() || ''],
        ['🍂 Season', c.season || ''], ['🎉 Holidays', (c.holidays || []).join(', ') || 'none today'],
        ['💰 Your gold', Math.floor(ctx.stats.gold) + ' gold'], ['❤️ Health', Math.round(ctx.stats.hp) + ''], ['🍽️ Hunger', Math.round(ctx.stats.hunger) + '%'], ['⚡ Energy', Math.round(ctx.stats.energy) + '%'],
      ];
      const body = frame('Info Hub', '<p style="opacity:.7;margin-top:-6px">Your daily information, and what\'s been happening</p>');
      for (const [a, b] of lines) body.append(row(`<b>${a}</b>`, Object.assign(document.createElement('span'), { textContent: b })));
      const top = (ctx.news?.() || []).slice(0, 25);   // what's been happening: buildings destroyed, arrests, the city's news (none of it pops up on your screen)
      body.append(Object.assign(document.createElement('h3'), { textContent: "What's been happening" }));
      if (!top.length) body.insertAdjacentHTML('beforeend', '<p style="opacity:.7">Nothing yet today.</p>');
      for (const n of top) body.append(row(`📰 ${esc(n)}`));
    },
    store() {
      const body = frame('Cryptic Store', '<p style="opacity:.7;margin-top:-6px">The official store. Only Cryptic apps run on Cryptic devices.</p>');
      for (const [id, a] of Object.entries(APPS)) {
        if (a.pre) continue;
        const owned = a.device ? st().laptop : st().installed.includes(id);
        const r = row(`<span style="font-size:20px">${a.icon}</span> <b>${esc(a.name)}</b><br><small style="opacity:.7">${esc(a.about)}</small>`,
          owned ? (a.device ? button('Open', () => setLaptop(true)) : button('Remove', () => { S.installed = S.installed.filter(x => x !== id); save(); go('store'); }, 'g'))
            : button(a.price ? `${a.price} gold` : 'Get', b2 => install(id, a, body)));
        body.append(r);
      }
    },
    settings() {
      const body = frame('Settings', '');
      body.append(row('<b>Device</b>', Object.assign(document.createElement('span'), { textContent: laptop ? 'Cryptic Book' : ctx.premium?.() ? 'Cryptic Prime' : 'Cryptic C1 (cracked screen)' })));
      body.append(row('<b>Maker</b>', Object.assign(document.createElement('span'), { textContent: 'Cryptic, Government of Anthos' })));
      body.append(row('<b>Apps installed</b>', Object.assign(document.createElement('span'), { textContent: String(Object.keys(APPS).filter(has).length) })));
      if (st().laptop) body.append(button(laptop ? 'Switch to phone' : 'Switch to laptop', () => setLaptop(!laptop)));
    },
    news() {
      const body = frame('Anthos News', '');
      const list = ctx.news?.() || [];
      if (!list.length) body.insertAdjacentHTML('beforeend', '<p style="opacity:.7">No news yet today.</p>');
      for (const n of list.slice(0, 40)) body.append(row(`📰 ${esc(n)}`));
    },
    calendar() {
      const d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      const body = frame(d.toLocaleString(undefined, { month: 'long', year: 'numeric' }), '');
      const grid = document.createElement('div'); grid.className = 'cal';
      for (const w of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) grid.insertAdjacentHTML('beforeend', `<div style="opacity:.6">${w}</div>`);
      for (let i = 0; i < first; i++) grid.append(document.createElement('div'));
      for (let day = 1; day <= days; day++) {
        const date = new Date(y, m, day), hol = ctx.calendarOn?.(date)?.holidays || [], ev = st().events.filter(e => e.date === date.toDateString());
        const c = document.createElement('div'); c.textContent = day; if (day === d.getDate()) c.className = 't'; else if (hol.length || ev.length) c.className = 'h';
        c.title = [...hol, ...ev.map(e => e.text)].join(', '); grid.append(c);
      }
      body.append(grid);
      const upcoming = S.events.filter(e => new Date(e.date) >= new Date(d.toDateString())).slice(0, 6);
      body.append(Object.assign(document.createElement('h3'), { textContent: 'Your events' }));
      for (const e of upcoming) body.append(row(`<b>${esc(e.date)}</b><br>${esc(e.text)}`));
      const inp = document.createElement('input'); inp.type = 'date'; const txt = document.createElement('input'); txt.placeholder = 'What is it?'; txt.style.marginTop = '6px';
      body.append(inp, txt, button('Add event', () => { if (!inp.value || !txt.value.trim()) return; S.events.push({ date: new Date(inp.value + 'T12:00').toDateString(), text: txt.value.trim().slice(0, 80) }); save(); go('calendar'); }));
    },
    tube() {
      const body = frame('CrypticTube', '');
      const v = document.createElement('video'); v.controls = true; v.playsInline = true; v.style.cssText = 'width:100%;border-radius:10px;background:#000;margin-bottom:10px';
      body.append(v);
      for (const p of ADVERTISING_CONFIG.programmes || []) body.append(row(`▶️ <b>${esc(p.title)}</b><br><small style="opacity:.6">${esc(p.credit || '')}</small>`, button('Watch', () => { v.src = p.url; v.play().catch(() => {}); })));
      const file = document.createElement('input'); file.type = 'file'; file.accept = 'video/*'; file.style.marginTop = '8px';
      file.onchange = () => { const f = file.files[0]; if (f) { v.src = URL.createObjectURL(f); v.play().catch(() => {}); } };
      body.append(Object.assign(document.createElement('p'), { textContent: 'Or play a video from your device:' }), file);
    },
    lumi() {
      const body = frame('Lumi', '');
      if (S.photos.length) body.append(button('Post my latest photo', () => { const cap = prompt('Caption?') || ''; S.posts.unshift({ src: S.photos.at(-1).src, cap: cap.slice(0, 120), at: Date.now(), likes: 0 }); save(); go('lumi'); }));
      const city = feed();
      const mine = S.posts.map(p => ({ me: true, ...p }));
      for (const p of [...mine, ...city].sort((a, b) => b.at - a.at).slice(0, 30)) {
        const d = document.createElement('div'); d.className = 'post';
        if (p.me) { p.likes = Math.min(9999, Math.floor((Date.now() - p.at) / 20000) * 3 + 1); d.innerHTML = `<b>@you</b><img class="ph" style="margin:6px 0" src="${p.src}"><div>${esc(p.cap)}</div><small style="opacity:.7">❤️ ${p.likes} likes</small>`; }
        else d.innerHTML = `<b>@${esc(p.user)}</b><div class="fake" style="background:${p.bg};margin:6px 0">${p.emoji}</div><div>${esc(p.cap)}</div><small style="opacity:.7">❤️ ${p.likes} likes</small>`;
        body.append(d);
      }
    },
    weather() { frame('Weather', `<div style="text-align:center;font-size:70px;margin:20px 0">${(ctx.weather?.() || '').split(' ')[0] || '⛅'}</div><p style="text-align:center">${esc(ctx.weather?.() || '')}</p><p style="text-align:center;opacity:.75">Season: ${esc(ctx.calendar?.()?.season || '')}</p>`); },
    notes() { const body = frame('Notes', ''); const t = document.createElement('textarea'); t.rows = 16; t.value = st().notes; t.oninput = () => { S.notes = t.value.slice(0, 5000); save(); }; body.append(t); },
    calc() {
      const body = frame('Calculator', ''); const out = document.createElement('input'); out.readOnly = true; out.style.cssText += 'font-size:26px;text-align:right'; body.append(out);
      const g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px'; let expr = '';
      for (const k of ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+', 'C']) g.append(button(k, () => {
        if (k === 'C') expr = ''; else if (k === '=') { try { const v = expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-'); expr = /^[0-9.+\-*/ ]+$/.test(v) ? String(Math.round(Function('return (' + v + ')')() * 1e6) / 1e6) : ''; } catch { expr = ''; } } else expr += k;
        out.value = expr; }, 'g'));
      body.append(g);
    },
    clock() { const body = frame('Clock', `<div style="text-align:center;font:200 48px system-ui;margin:10px 0">${new Date().toTimeString().slice(0, 8)}</div><p style="text-align:center;opacity:.75">Time in Anthos: ${esc(ctx.gameTime?.() || '')}</p>`); body.append(button('Refresh', () => go('clock'), 'g')); },
    bank() { if (ctx.openBanking?.()) { close(); return; } const body = frame('Bank', ''); body.append(row('<b>Gold in your pocket</b>', Object.assign(document.createElement('span'), { textContent: Math.floor(ctx.stats.gold) + ' gold' }))); const extra = ctx.bankInfo?.(); if (extra) body.append(row('<b>Bank</b>', Object.assign(document.createElement('span'), { textContent: extra }))); },
    quests() { const body = frame('Quest Log', ''); const qs = ctx.quests?.() || []; if (!qs.length) body.insertAdjacentHTML('beforeend', '<p style="opacity:.7">No quests right now.</p>'); for (const q of qs) body.append(row(`${q.done ? '✓ ' : ''}<b>${esc(q.title)}</b><br><small style="opacity:.7">${esc(q.detail || '')}</small>`, Object.assign(document.createElement('span'), { textContent: q.kind === 'open' || q.kind === 'visit' ? '' : `${Math.floor(q.progress)}/${q.target}` }))); },
    fitness() { frame('Fit Tracker', `<p>Distance on foot today: <b>${Math.round(st().steps)} m</b></p><p>About <b>${Math.round(S.steps / 0.75)}</b> steps.</p>`); },
  };

  function feed() {   // what the city is posting today (changes each day)
    const users = ['maya.k', 'thebakerjoe', 'surfer_lin', 'anthos.daily', 'gym_rat_dre', 'nana_rose', 'cityexplorer', 'chef.amaru'];
    const posts = [['🏖️', 'Anthos Bay never disappoints. Turtles out again today!', '#1f8fb8'], ['🍦', 'Gelato on the boardwalk is a personality trait at this point', '#e66fa0'], ['🏋️', 'Leg day at the rec centre. Pain is temporary.', '#4b5563'], ['🌳', 'Sunday walk round the Grand Park lake', '#2f855a'], ['🎡', 'Funfair lights at night hit different', '#7c3aed'], ['🍲', 'New special at the market stall today. Come early!', '#c2410c'], ['🌇', 'Sunset from the bridge. No filter.', '#ea580c'], ['🚇', 'Metro was on time for once!', '#0369a1']];
    const hol = ctx.calendar?.()?.holidays || [];
    if (hol.includes('christmas')) posts.unshift(['🎄', 'The Christmas market in the Grand Park is magical this year', '#14532d']);
    if (hol.includes('valentine')) posts.unshift(['💘', 'Roses everywhere. Happy Valentine\'s, Anthos!', '#be123c']);
    if (hol.includes('halloween')) posts.unshift(['🎃', 'Fright Night at the funfair was SCARY', '#431407']);
    const day = Math.floor(Date.now() / 864e5);
    return posts.map((p, i) => ({ user: users[(i + day) % users.length], emoji: p[0], cap: p[1], bg: p[2], likes: 40 + ((i * 97 + day * 13) % 900), at: Date.now() - (i + 1) * 3600e3 }));
  }
  function viewPhoto(i) {
    const p = S.photos[i]; if (!p) return go('gallery');
    const body = frame('Photo', `<img class="ph" src="${p.src}"><p style="opacity:.7">${new Date(p.at).toLocaleString()}</p>`);
    const a = document.createElement('a'); a.href = p.src; a.download = 'anthos-photo.jpg'; a.textContent = 'Save to your device'; a.style.color = '#8ec5ff';
    body.append(a, document.createElement('br'), button('Delete', () => { S.photos.splice(i, 1); save(); go('gallery'); }, 'g'), button('Back', () => go('gallery'), 'g'));
  }
  function install(id, a) {
    if (a.price && ctx.stats.gold < a.price) return ctx.toast('Not enough gold for ' + a.name + '.');
    if (a.price) ctx.stats.gold -= a.price;
    const body = frame('Cryptic Store', `<p>Downloading ${esc(a.name)}…</p><div style="height:8px;background:#ffffff22;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:0;background:#2f6fdf;transition:width 1.2s"></i></div>`);
    requestAnimationFrame(() => { const bar = body.querySelector('i'); if (bar) bar.style.width = '100%'; });
    setTimeout(() => { if (a.device) { S.laptop = true; ctx.toast('💻 Your Cryptic Book has arrived. Switch to it in your phone Settings.'); } else { S.installed.push(id); ctx.toast(`${a.icon} ${a.name} installed.`); } save(); go('store'); }, 1300);
  }
  function setLaptop(on) { if (on && !st().laptop) return ctx.toast('You need a Cryptic Book. Get one in the Cryptic Store.'); laptop = on; if (!open) toggle(true); go('home'); }

  function go(id) { app = id; if (!has(id) && APPS[id]) { ctx.toast('Download it from the Cryptic Store first.'); id = 'store'; app = id; } (screens[id] || screens.home)(); }
  function toggle(force) {
    const want = force ?? !open;
    if (want === open) { if (want) go(app); return; }
    open = want; el.hidden = !open;
    if (open) { st(); ctx.pause(); go('home'); } else { ctx.resume(); }
  }
  function close() { if (open) toggle(false); }
  // count distance on foot for the Fit Tracker
  let last = null;
  // ---------------- IDs (world-ids.js): your phone, your laptop and every app on it ----------------
  // They go where you go, so their position is yours. The objects are kept so the registry sees each one once.
  const things = new Map();
  const thing = (key, t) => { let x = things.get(key); if (!x) { x = { ...t, get pos() { return last || ctx.where?.() || { x: 0, z: 0 }; } }; things.set(key, x); } return x; };
  function devices() {
    const who = ctx.premium?.() ? 'ADM' : 'PLR', u = uid(), out = [];
    out.push(thing('phone:' + who, { cls: 'PRD', kind: 'PHN', mat: 'GLS.ALU', owner: who, seed: 'cryptic-phone:' + u, maker: 'Cryptic', name: ctx.premium?.() ? 'Cryptic Prime (your phone)' : 'Cryptic C1, cracked screen (your phone)' }));
    if (st().laptop) out.push(thing('laptop', { cls: 'PRD', kind: 'LPT', mat: 'ALU.GLS', owner: who, seed: 'cryptic-book:' + u, maker: 'Cryptic', name: 'Cryptic Book (your laptop)' }));
    for (const [id, a] of Object.entries(APPS)) if (!a.device && has(id)) out.push(thing('app:' + id, { cls: 'PRD', kind: 'APP', mat: 'NON', owner: who, seed: 'app:' + id + ':' + u, maker: 'Cryptic', name: `${a.name} app${a.pre ? ' (built in)' : ''}` }));
    return out;
  }

  return {
    devices,
    get open() { return open; },
    toggle, close, openLaptop: () => setLaptop(true),
    reset() { S = null; things.clear(); },   // a different player signed in
    update(p, onFoot) { if (onFoot && last) { const d = Math.hypot(p.x - last.x, p.z - last.z); if (d < 3) { st().steps += d; } } last = onFoot ? { x: p.x, z: p.z } : null; },
    save,
  };
}
