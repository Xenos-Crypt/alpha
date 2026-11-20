// The System's voice. GET /api/system-voice?t=<line> returns the line spoken as MP3 by OpenAI's
// gpt-4o-mini-tts. Only the System talks with this voice (the film's narration is silent, and residents use
// the device's own voice). Every response is cached for a year by the CDN and on the player's device, so each
// line is only paid for once. Lines are capped at 300 characters and each address is rate-limited.
// Needs OPENAI_API_KEY (already set for the Quest Director).
const { requireKey, cleanText } = require('./_lib');

const VOICE = 'onyx';
const STYLE = 'You are the voice of "the System", an interface in a dark fantasy game. Speak in English, deep, calm and measured, '
  + 'a little cold and distant, as if from far away. Precise diction, short pauses between sentences, no warmth, never rushed.';

const hits = new Map();
function limited(ip, max = 40, windowMs = 60000) {
  const now = Date.now(); let b = hits.get(ip);
  if (!b || now - b.start > windowMs) { b = { start: now, count: 0 }; hits.set(ip, b); }
  return ++b.count > max;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const text = cleanText(String(req.query?.t || ''), 300).replace(/[\[\]◆]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) { res.status(400).json({ error: 'Nothing to say' }); return; }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  if (limited(ip)) { res.status(429).json({ error: 'Too many requests, slow down.' }); return; }
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + requireKey() },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: VOICE, input: text, instructions: STYLE, response_format: 'mp3' }),
    });
    if (!r.ok) { res.status(502).json({ error: 'Voice service error ' + r.status }); return; }
    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader('content-type', 'audio/mpeg');
    res.setHeader('cache-control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.status(200).send(audio);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
};
