// Re-exports the shared system prompts / sanitizers / OpenAI caller from
// api/_lib.js (written for Vercel's req/res convention) and adds a Netlify
// Functions-flavored wrapper (event/context -> {statusCode, body}) instead.
const shared = require('../../api/_lib.cjs');
const { rateLimited } = (() => {
  const buckets = new Map();
  return {
    rateLimited(ip, max = 20, windowMs = 60000) {
      const now = Date.now(); let b = buckets.get(ip);
      if (!b || now - b.start > windowMs) { b = { start: now, count: 0 }; buckets.set(ip, b); }
      b.count++; return b.count > max;
    },
  };
})();

function withApi(handler) {
  return async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
    if (rateLimited(ip)) return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests, slow down.' }) };
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
    try {
      const result = await handler(body);
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(result) };
    } catch (e) {
      return { statusCode: e.status || 500, body: JSON.stringify({ error: e.message }) };
    }
  };
}

module.exports = { ...shared, withApi };
