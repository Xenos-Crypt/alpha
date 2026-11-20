// The System speaks (and only the System): lines are voiced by /api/system-voice (an OpenAI voice) and kept on
// this device, so a line is fetched once and then plays instantly, even offline. If the voice service can't be
// reached, the device's own voice reads the line instead.
const CACHE = 'system-voice-v1';

export function createSystemVoice(ctx = {}) {
  // ctx: { volume: () => 0..1, onSpeak: seconds => void }
  let audio = null, url = null, cache = null;
  try { if (typeof caches !== 'undefined') cache = caches.open(CACHE); } catch { cache = null; }
  const clean = t => String(t || '').replace(/[\[\]◆]/g, '').replace(/^\s*SYSTEM\s*[:·-]?\s*/i, '').replace(/\s+/g, ' ').trim().slice(0, 300);

  async function audioFor(text) {
    const req = '/api/system-voice?t=' + encodeURIComponent(text);
    try {
      const c = cache && await cache, hit = c && await c.match(req);
      if (hit) return await hit.blob();
      const r = await fetch(req); if (!r.ok || !/audio/.test(r.headers.get('content-type') || '')) return null;
      if (c) try { await c.put(req, r.clone()); } catch { }
      return await r.blob();
    } catch { return null; }
  }
  function deviceVoice(text) {
    return new Promise(done => {
      const tts = window.speechSynthesis; if (!tts || typeof SpeechSynthesisUtterance === 'undefined') return done(false);
      tts.cancel(); const u = new SpeechSynthesisUtterance(text), en = tts.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang));
      u.voice = en.find(v => /google uk english male|daniel|male/i.test(v.name)) || en[0] || null; u.rate = 0.95; u.pitch = 0.7; u.volume = ctx.volume?.() ?? 1;
      let began = false; u.onstart = () => { began = true; ctx.onSpeak?.(text.split(/\s+/).length / 2.6); }; u.onend = () => done(true); u.onerror = () => done(false);
      setTimeout(() => { if (!began) { tts.cancel(); done(false); } }, 2500);
      tts.speak(u);
    });
  }
  function stop() { try { audio?.pause(); } catch { } audio = null; if (url) { URL.revokeObjectURL(url); url = null; } try { window.speechSynthesis?.cancel(); } catch { } }
  // speak a line; resolves true when it was spoken to the end, false if it couldn't be
  async function speak(raw) {
    const text = clean(raw); if (!text || (ctx.volume?.() ?? 1) <= 0) return false;
    stop();
    const blob = await audioFor(text);
    if (!blob) return deviceVoice(text);
    return new Promise(done => {
      url = URL.createObjectURL(blob); const a = new Audio(url); audio = a; a.volume = ctx.volume?.() ?? 1;
      a.onloadedmetadata = () => ctx.onSpeak?.(a.duration || 3);
      a.onended = () => { if (audio === a) stop(); done(true); }; a.onerror = () => done(false);
      a.play().catch(() => done(false));
    });
  }
  return { speak, stop };
}
