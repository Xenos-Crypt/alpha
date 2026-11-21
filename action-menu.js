// THE ACTION MENU: what you can do with the thing in front of you.
//
// Walking up to something with more than one thing to do (a car, a door, a person) shows "E: <what it is>  ·
// 3 options". Pressing E opens this menu and the whole game pauses while it's open. Each option has its own number
// key beside it (1, 2, 3...), and only the options that make sense right now are listed (an unlocked car offers
// "Open the door (steal)"; a locked one needs a master key). Esc or E closes it.
//
// THE LOCK GAUGE: beating a lock is a job for your hands. A key icon appears with a ring round it that keeps draining;
// every tap of the option's number key fills it a little. Keep tapping faster than it drains and the ring fills and
// the lock gives. Stop, walk away or press Esc and you give up. The game runs while you do it: people can see you.
export function createActionMenu({ onPauseChange = () => {} } = {}) {
  const css = document.createElement('style');
  css.textContent = `
  #actMenu{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;min-width:280px;max-width:min(420px,calc(100vw - 32px));background:rgba(12,16,24,.95);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:16px 16px 12px;font:15px/1.35 system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.5)}
  #actMenu[hidden],#actGauge[hidden]{display:none}
  #actMenu h3{margin:0 0 10px;font-size:16px;font-weight:650}
  #actMenu button{display:flex;align-items:center;gap:10px;width:100%;margin:0 0 6px;padding:9px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;cursor:pointer}
  #actMenu button:hover{background:rgba(255,255,255,.14)}
  #actMenu button[disabled]{opacity:.45;cursor:default}
  #actMenu kbd{flex:none;min-width:24px;height:24px;display:inline-grid;place-items:center;border-radius:6px;background:#ffd23f;color:#111;font:700 13px system-ui}
  #actMenu small{display:block;opacity:.7;font-size:12px}
  #actMenu .foot{opacity:.6;font-size:12px;margin-top:4px}
  #actGauge{position:fixed;left:50%;top:58%;transform:translate(-50%,-50%);z-index:69;display:grid;place-items:center;gap:8px;color:#fff;font:600 14px system-ui;text-shadow:0 1px 3px #000;pointer-events:none}
  #actGauge .ring{width:110px;height:110px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#ffd23f var(--p),rgba(255,255,255,.15) 0);box-shadow:0 6px 24px rgba(0,0,0,.45)}
  #actGauge .in{width:84px;height:84px;border-radius:50%;background:rgba(12,16,24,.92);display:grid;place-items:center;font-size:34px}
  #actGauge kbd{display:inline-grid;place-items:center;min-width:26px;height:26px;border-radius:6px;background:#ffd23f;color:#111;font:700 14px system-ui;margin:0 4px}`;
  document.head.append(css);
  const box = document.createElement('section'); box.id = 'actMenu'; box.hidden = true; document.body.append(box);
  const gaugeEl = document.createElement('div'); gaugeEl.id = 'actGauge'; gaugeEl.hidden = true;
  gaugeEl.innerHTML = '<div class="ring"><div class="in">🔑</div></div><div class="txt"></div>'; document.body.append(gaugeEl);
  let items = [], gauge = null;

  function open(title, actions) {
    items = actions.filter(Boolean).slice(0, 9);
    if (!items.length) return false;
    box.innerHTML = ''; const h = document.createElement('h3'); h.textContent = title; box.append(h);
    items.forEach((a, i) => {
      const b = document.createElement('button'); b.disabled = !!a.disabled;
      const k = document.createElement('kbd'); k.textContent = i + 1;
      const t = document.createElement('span'); t.textContent = a.label;
      if (a.note) { const s = document.createElement('small'); s.textContent = a.note; t.append(s); }
      b.append(k, t); b.onclick = () => choose(i); box.append(b);
    });
    const f = document.createElement('div'); f.className = 'foot'; f.textContent = 'Press a number, or Esc to close · the game is paused'; box.append(f);
    box.hidden = false; onPauseChange(true); return true;
  }
  function close() { if (box.hidden) return; box.hidden = true; items = []; onPauseChange(false); }
  function choose(i) {
    const a = items[i]; if (!a || a.disabled) return;
    close();
    if (a.gauge) { a.gauge.onStart?.(); startGauge({ ...a.gauge, key: String(i + 1) }); } else a.run?.();
  }
  // gauge: { title, fill: per tap (0..1), drain: per second, onDone(), onCancel() }
  function startGauge(g) {
    gauge = { p: 0.15, fill: 0.09, drain: 0.32, ...g };
    gaugeEl.querySelector('.txt').innerHTML = '';
    const t = gaugeEl.querySelector('.txt'); t.append(document.createTextNode(g.title || 'Working the lock'), document.createElement('br'), document.createTextNode('Tap '));
    const k = document.createElement('kbd'); k.textContent = gauge.key; t.append(k, document.createTextNode(' fast · Esc to give up'));
    gaugeEl.hidden = false; draw();
  }
  function draw() { gaugeEl.querySelector('.ring').style.setProperty('--p', Math.round(gauge.p * 100) + '%'); }
  function endGauge(ok) { const g = gauge; gauge = null; gaugeEl.hidden = true; ok ? g.onDone?.() : g.onCancel?.(); }
  function update(dt, { moved = false } = {}) {
    if (!gauge) return;
    if (moved) return endGauge(false);
    gauge.p = Math.max(0, gauge.p - gauge.drain * dt); draw();
  }
  // returns true if the key was used here
  function key(e) {
    if (!box.hidden) {
      if (e.code === 'Escape' || e.code === 'KeyE') { close(); return true; }
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code); if (m) { choose(+m[1] - 1); return true; }
      return true;   // everything else waits while the menu is open
    }
    if (gauge) {
      if (e.code === 'Escape') { endGauge(false); return true; }
      if (e.code === 'Digit' + gauge.key || e.code === 'Numpad' + gauge.key) { if (!e.repeat) { gauge.p = Math.min(1, gauge.p + gauge.fill); draw(); if (gauge.p >= 1) endGauge(true); } return true; }
    }
    return false;
  }
  return { open, close, key, update, startGauge, get isOpen() { return !box.hidden; }, get picking() { return !!gauge; } };
}
