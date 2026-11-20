// VOICE: talk to the game out loud.
// - Turn listening on with the 🎙️ button. Say "System" and the System window opens.
// - While you're talking to someone, whatever you say goes to them (as if you'd typed it).
// - The 🎤 button in a conversation listens for one line even when listening is off.
// Uses the browser's speech recognition (Chrome, Edge, Safari); where there isn't any, the buttons say so
// and you can still type. Nothing you say is kept: each line is used once and dropped.
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const KEY = 'voiceListen';

export function createVoice(ctx) {
  // ctx: { toast, onSystem(), conversation(): ((text) => void) | null, lang?: string }
  const supported = !!SR;
  let rec = null, on = false, once = null;
  const css = document.createElement('style');
  css.textContent = `#voiceBtn{position:fixed;right:16px;top:176px;z-index:12;color:#ffd9d4;font:12px system-ui;background:#1a0b0bcc;border:1px solid #c94a3f;border-radius:10px;padding:7px 12px;cursor:pointer}
#voiceBtn.on{background:#7a1410e6;box-shadow:0 0 12px #ff3b30aa}#voiceBtn.heard{box-shadow:0 0 18px #ffd0c8}body.cinema #voiceBtn{visibility:hidden}`;
  document.head.append(css);
  const btn = document.createElement('button'); btn.id = 'voiceBtn'; btn.type = 'button';
  document.body.append(btn);
  const label = () => { btn.textContent = !supported ? '🎙️ Voice (not on this browser)' : on ? '🎙️ Listening: say "System"' : '🎙️ Voice off'; btn.classList.toggle('on', on); };
  label();

  function handle(text) {
    text = String(text || '').trim(); if (!text) return;
    btn.classList.add('heard'); setTimeout(() => btn.classList.remove('heard'), 400);
    if (once) { const cb = once; once = null; return cb(text); }
    const talk = ctx.conversation?.(); if (talk) return talk(text);   // in a conversation: it's for them
    if (/\b(system|status|open system)\b/i.test(text)) ctx.onSystem?.();
  }
  function make(continuous) {
    const r = new SR(); r.continuous = continuous; r.interimResults = false; r.lang = ctx.lang || navigator.language || 'en-GB'; r.maxAlternatives = 1;
    r.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) handle(e.results[i][0].transcript); };
    r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { on = false; once = null; label(); try { localStorage.setItem(KEY, '0'); } catch { } ctx.toast?.('🎙️ The microphone is blocked. Allow it for this site to talk to the game.'); } };
    return r;
  }
  function start() {
    if (!supported) return ctx.toast?.("🎙️ This browser can't listen. Try Chrome or Edge, or type instead.");
    on = true; label(); try { localStorage.setItem(KEY, '1'); } catch { }
    if (!rec) { rec = make(true); rec.onend = () => { if (on) setTimeout(() => { try { rec.start(); } catch { } }, 250); }; }
    try { rec.start(); } catch { }
    ctx.toast?.('🎙️ Listening. Say "System" to open it, or just talk when you\'re speaking to someone.');
  }
  function stop() { on = false; label(); try { localStorage.setItem(KEY, '0'); } catch { } try { rec?.stop(); } catch { } }
  btn.onclick = () => (on ? stop() : start());

  return {
    supported, get on() { return on; }, start, stop,
    // listen for one line (the 🎤 button in a conversation)
    listenOnce(cb) {
      if (!supported) { ctx.toast?.("🎙️ This browser can't listen. Type instead."); return false; }
      once = cb; if (on) return true;   // already listening: the next thing you say is it
      const r = make(false); r.onend = () => { if (!on) once = null; }; try { r.start(); } catch { return false; } return true;
    },
    // turn listening back on if it was on last time (only after a click/tap: browsers ask first)
    resume() { let was = false; try { was = localStorage.getItem(KEY) === '1'; } catch { } if (was && supported && !on) start(); },
  };
}
