// WORLD REGISTRY — the back end of the world IDs (world-ids.js), kept in Supabase so the AI (the daily
// Lawgiver run) can see what exists, what happened to it and what is broken, by ID. Players never see it.
// Only signed-in players write (guests don't), and only what changed: entities in batches, then events
// and bugs. Grass and other huge things are never stored one by one; only a bug about them is.
// Tables: world_entities, world_events, world_bugs (see supabase-setup.sql).
export function createWorldRegistry({ client, userId, ids, every = 60 }) {
  let t = 15, busy = false, failures = 0;
  const DAY = 'aw.registry.lastFull';
  async function flush() {
    const uid = userId(); if (!uid || !client || busy || !navigator.onLine || failures > 5) return;
    busy = true;
    try {
      const { entities, events, bugs } = ids.takeChanges();
      // the static world only needs sending once a day per player; moving things and changes always
      let full = 0; try { full = +localStorage.getItem(DAY) || 0; } catch { }
      const sendAll = Date.now() - full > 864e5;
      const ents = sendAll ? entities : entities.filter(e => ['PER', 'VEH', 'CRE', 'MCH'].includes(e.cls) || e.aliases);
      for (let i = 0; i < ents.length; i += 500) {
        const { error } = await client.from('world_entities').upsert(ents.slice(i, i + 500).map(e => ({ ...e, seen_by: uid, updated_at: new Date().toISOString() })), { onConflict: 'id' });
        if (error) throw error;
      }
      if (sendAll && ents.length) try { localStorage.setItem(DAY, String(Date.now())); } catch { }
      if (events.length) { const { error } = await client.from('world_events').insert(events.slice(0, 300).map(e => ({ entity_id: e.id, what: String(e.what).slice(0, 200), x: e.x, z: e.z, happened_at: new Date(e.t).toISOString(), seen_by: uid }))); if (error) throw error; }
      if (bugs.length) { const { error } = await client.from('world_bugs').upsert(bugs.map(b => ({ key: b.key.slice(0, 300), cat: b.cat, ids: b.ids, x: b.x, z: b.z, words: b.words, count: b.count, seen_by: uid, updated_at: new Date().toISOString() })), { onConflict: 'key' }); if (error) throw error; }
      failures = 0;
    } catch (e) { failures++; console.warn('[world-registry]', e?.message || e); }
    finally { busy = false; }
  }
  return { update(dt) { t -= dt; if (t <= 0) { t = every; flush(); } }, flush };
}
