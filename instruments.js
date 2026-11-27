// INSTRUMENTS YOU CAN PLAY: a piano (two octaves), a drum kit and a guitar, each with its own sound made in the
// browser (no recordings). A small panel at the bottom of the screen shows the keys; press them on the keyboard or
// click them. Every note also calls back (onNote) so the instrument in the room moves: the piano key goes down,
// the drum bounces.
//   Piano:  white keys A S D F G H J K L ; ' (C4 to F5), black keys W E  T Y U  O P
//   Drums:  Space kick · F snare · J hi-hat · K tom · L floor tom · D crash · S ride
//   Guitar: chords 1 C · 2 G · 3 Am · 4 F · 5 D · 6 Em · 7 A · 8 E, then Space (or the chord key) to strum
let ac = null, master = null;
function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
const vol = () => { try { const v = localStorage.getItem('masterVolume'); return v == null ? 1 : Math.max(0, Math.min(1, +v / 100)); } catch { return 1; } };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
function env(g, t, a, peak, decay) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay); }

// a piano note: a few harmonics that fade, the high ones faster (so it rings, then mellows)
function piano(midi) {
  const A = audio(), t = A.currentTime, f = hz(midi), out = A.createGain(); out.gain.value = vol(); out.connect(master);
  [[1, 0.6, 1.8], [2, 0.25, 1.1], [3, 0.12, 0.7], [4, 0.06, 0.45], [5, 0.03, 0.3]].forEach(([k, a, d]) => {
    const o = A.createOscillator(), g = A.createGain(); o.type = k === 1 ? 'triangle' : 'sine'; o.frequency.value = f * k * (1 + (k - 1) * 0.0008);
    env(g, t, 0.004, a, d * (midi < 60 ? 1.4 : 1)); o.connect(g); g.connect(out); o.start(t); o.stop(t + d * 1.5 + 0.1); });
}
// a plucked string (Karplus-Strong): a burst of noise fed round a delay the length of the string
function pluck(f, when = 0, amp = 0.5) {
  const A = audio(), sr = A.sampleRate, n = Math.round(sr / f), len = Math.round(sr * 2.2), buf = A.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(n);
  for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 0, p = 0; i < len; i++) { const nx = (p + 1) % n; const v = (ring[p] + ring[nx]) * 0.5 * 0.996; d[i] = ring[p]; ring[p] = v; p = nx; }
  const s = A.createBufferSource(), g = A.createGain(); s.buffer = buf; g.gain.value = amp * vol(); s.connect(g); g.connect(master); s.start(A.currentTime + when);
}
function noise(dur) { const A = audio(), b = A.createBuffer(1, Math.round(A.sampleRate * dur), A.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = A.createBufferSource(); s.buffer = b; return s; }
const DRUMS = {
  kick() { const A = audio(), t = A.currentTime, o = A.createOscillator(), g = A.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18); env(g, t, 0.002, 1 * vol(), 0.35); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5); },
  snare() { const A = audio(), t = A.currentTime, s = noise(0.25), f = A.createBiquadFilter(), g = A.createGain(); f.type = 'bandpass'; f.frequency.value = 1800; env(g, t, 0.001, 0.6 * vol(), 0.18); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    const o = A.createOscillator(), g2 = A.createGain(); o.frequency.value = 190; env(g2, t, 0.001, 0.35 * vol(), 0.1); o.connect(g2); g2.connect(master); o.start(t); o.stop(t + 0.2); },
  hat() { const A = audio(), t = A.currentTime, s = noise(0.1), f = A.createBiquadFilter(), g = A.createGain(); f.type = 'highpass'; f.frequency.value = 7000; env(g, t, 0.001, 0.3 * vol(), 0.05); s.connect(f); f.connect(g); g.connect(master); s.start(t); },
  tom(fq = 160) { const A = audio(), t = A.currentTime, o = A.createOscillator(), g = A.createGain(); o.frequency.setValueAtTime(fq, t); o.frequency.exponentialRampToValueAtTime(fq * 0.6, t + 0.3); env(g, t, 0.002, 0.7 * vol(), 0.35); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5); },
  crash() { const A = audio(), t = A.currentTime, s = noise(1.8), f = A.createBiquadFilter(), g = A.createGain(); f.type = 'highpass'; f.frequency.value = 4000; env(g, t, 0.002, 0.35 * vol(), 1.5); s.connect(f); f.connect(g); g.connect(master); s.start(t); },
  ride() { const A = audio(), t = A.currentTime, s = noise(0.8), f = A.createBiquadFilter(), g = A.createGain(); f.type = 'bandpass'; f.frequency.value = 6000; f.Q.value = 3; env(g, t, 0.002, 0.25 * vol(), 0.6); s.connect(f); f.connect(g); g.connect(master); s.start(t); },
};
// guitar chords: the six strings' notes (MIDI), lowest first; null = not played
const CHORDS = { C: [null, 48, 52, 55, 60, 64], G: [43, 47, 50, 55, 59, 67], Am: [null, 45, 52, 57, 60, 64], F: [41, 48, 53, 57, 60, 65], D: [null, null, 50, 57, 62, 66], Em: [40, 47, 52, 55, 59, 64], A: [null, 45, 52, 57, 61, 64], E: [40, 47, 52, 56, 59, 64] };

const PIANO_WHITE = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'], WHITE_MIDI = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77];
const PIANO_BLACK = { KeyW: 61, KeyE: 63, KeyT: 66, KeyY: 68, KeyU: 70, KeyO: 73, KeyP: 75 };
const DRUM_KEYS = { Space: ['kick', 'Kick'], KeyF: ['snare', 'Snare'], KeyJ: ['hat', 'Hi-hat'], KeyK: ['tom', 'Tom'], KeyL: ['floor', 'Floor tom'], KeyD: ['crash', 'Crash'], KeyS: ['ride', 'Ride'] };
const CHORD_KEYS = ['C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'E'];

export function createInstruments({ pause, resume, toast } = {}) {
  const css = document.createElement('style');
  css.textContent = `#instr{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:55;background:rgba(20,24,30,.9);color:#f4f1ea;border-radius:14px;padding:10px 12px;font:13px system-ui,sans-serif;width:min(760px,96vw);box-shadow:0 8px 30px #0008}
  #instr[hidden]{display:none}#instr .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}#instr b{font-size:15px}
  #instr button{font:inherit;cursor:pointer}#instr .x{background:#3a424c;color:#fff;border:0;border-radius:8px;padding:5px 10px}
  #instr .keys{position:relative;height:120px;user-select:none}#instr .w{position:absolute;top:0;height:120px;background:#f7f5ef;border:1px solid #333;border-radius:0 0 6px 6px;color:#555;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;box-sizing:border-box}
  #instr .bk{position:absolute;top:0;height:72px;background:#111;border-radius:0 0 4px 4px;color:#aaa;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;box-sizing:border-box;z-index:2;font-size:11px}
  #instr .on{background:#ffd23f!important;color:#111!important}#instr .pads{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  #instr .pad{background:#2f3a46;border:1px solid #4a5662;color:#fff;border-radius:10px;padding:14px 6px;text-align:center}#instr .pad small{display:block;opacity:.7}
  #instr .hint{opacity:.7;margin-top:6px}`;
  document.head.append(css);
  const el = document.createElement('div'); el.id = 'instr'; el.hidden = true; document.body.append(el);
  let kind = null, onNote = null, chord = 'C';
  const flash = id => { const k = el.querySelector(`[data-k="${id}"]`); if (!k) return; k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 140); };
  function play(code) {
    if (kind === 'piano') { const wi = PIANO_WHITE.indexOf(code); const m = wi >= 0 ? WHITE_MIDI[wi] : PIANO_BLACK[code]; if (m == null) return false; piano(m); flash(code); onNote?.(m - 60, wi < 0); return true; }
    if (kind === 'drums') { const d = DRUM_KEYS[code]; if (!d) return false; d[0] === 'floor' ? DRUMS.tom(100) : DRUMS[d[0]](); flash(code); onNote?.(d[0]); return true; }
    if (kind === 'guitar') { const n = code.startsWith('Digit') ? +code.slice(5) : 0;
      if (n >= 1 && n <= 8) { chord = CHORD_KEYS[n - 1]; render(); strum(); flash(code); return true; }
      if (code === 'Space') { strum(); flash('Space'); return true; } return false; }
    return false;
  }
  function strum() { CHORDS[chord].forEach((m, i) => { if (m != null) pluck(hz(m), i * 0.018, 0.32); }); onNote?.(chord); }
  function render() {
    const title = { piano: '🎹 Grand piano', drums: '🥁 Drum kit', guitar: '🎸 Guitar' }[kind];
    let body = '';
    if (kind === 'piano') {
      const W = 100 / PIANO_WHITE.length, keyName = c => c.replace('Key', '').replace('Semicolon', ';').replace('Quote', "'");
      body = `<div class="keys">${PIANO_WHITE.map((c, i) => `<div class="w" data-k="${c}" style="left:${i * W}%;width:${W}%">${keyName(c)}</div>`).join('')}`
        + Object.entries(PIANO_BLACK).map(([c, m]) => { const after = WHITE_MIDI.filter(w => w < m).length; return `<div class="bk" data-k="${c}" style="left:${after * W - W * 0.3}%;width:${W * 0.6}%">${keyName(c)}</div>`; }).join('') + '</div>';
    } else if (kind === 'drums') body = `<div class="pads">${Object.entries(DRUM_KEYS).map(([c, [, n]]) => `<div class="pad" data-k="${c}">${n}<small>${c.replace('Key', '')}</small></div>`).join('')}</div>`;
    else body = `<div class="pads">${CHORD_KEYS.map((c, i) => `<div class="pad" data-k="Digit${i + 1}" style="${c === chord ? 'outline:2px solid #ffd23f' : ''}">${c}<small>${i + 1}</small></div>`).join('')}</div><div class="hint">Pick a chord (1 to 8), Space strums it again.</div>`;
    el.innerHTML = `<div class="top"><b>${title}</b><span>Play with your keyboard or click the keys · <button class="x" type="button">Stop (Esc)</button></span></div>${body}`;
    el.querySelector('.x').onclick = () => close();
    el.querySelectorAll('[data-k]').forEach(k => k.addEventListener('pointerdown', e => { e.preventDefault(); play(k.dataset.k); }));
  }
  addEventListener('keydown', e => {
    if (el.hidden) return; e.stopImmediatePropagation(); e.preventDefault();
    if (e.code === 'Escape') return close(); if (!e.repeat) play(e.code);
  }, true);
  let onClose = null;
  function open(k, o = {}) { kind = k; onNote = o.onNote || null; onClose = o.onClose || null; chord = 'C'; render(); el.hidden = false; pause?.(); try { audio(); } catch { toast?.('Sound is off on this device.'); } }
  function close() { if (el.hidden) return; el.hidden = true; resume?.(); const f = onClose; onClose = null; f?.(); }
  return { open, close, get open_() { return !el.hidden; }, get playing() { return el.hidden ? null : kind; } };
}
