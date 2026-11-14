// THE STORY (never announced). Everyone in A.T. believes there is nothing beyond the mountains around the
// dome. The government knows otherwise and keeps it quiet. Nobody tells you that the deepest goal of a life
// here is to get OUT; you find it (or never do) by living.
//
// THE WAYS TO THE TRUTH depend on the life you lead: as an official you can open the restricted archive
// in the Government Offices (or break in at night); the archaeologists' star map shows where the First Kings
// came from; a scientist friend may tell you what the dome's sensors really read; a hunter finds tracks that
// came from no one in A.T.; a criminal hears of a gap in the fence. Each turning point ("breakage") arises
// from what you've been doing, through people and places in the world. The Dark Web never has it.
//
// OUTSIDE: through the gates, licensed hunters are released into a zone near the dome, marked by posts.
// Beasts roam, stronger the further you go. Kill one and you skin it and butcher it yourself: fur keeps you
// warm, meat feeds you. The cold drains you; make camp to warm up. Beyond the mountains there are only rivers.
// TWO WAYS OUT: survive a long time out there and reach the river; or fly out, with the air force sent to
// shoot you down, because nobody is meant to leave.
import * as THREE from 'three';

const RIVER_R = 3000, ZONE_R = 1900;
const BEASTS = [[0, 'frostWolf'], [1700, 'iceBear'], [2200, 'snowStalker'], [2700, 'glacierWyrm']];
const BREAKAGES = [
  { id: 'envelope', path: 'politics', title: 'A sealed envelope', text: 'A minister presses an envelope into your hand and walks off without a word. Inside, a key and a note: "The archive. Read it, then decide who you are."', where: 'gov', gives: 'archiveKey' },
  { id: 'starmap', path: 'archaeology', title: 'The star map', text: 'The archaeologists have cleaned the basalt slab. It is not a star map. It is a map of land: this valley, the mountains, and far beyond them, other lands. The First Kings came from out there.', where: 'temple', gives: 'starmap', needDig: 60 },
  { id: 'readings', path: 'science', title: 'Readings that don\'t add up', text: 'At the ATLAS base a technician shows you a log by mistake: the outer sensors read warm, wet air from the north-east. Not snow. Air from somewhere else.', where: 'atlas', gives: 'readings' },
  { id: 'smuggler', path: 'crime', title: 'A smuggler\'s whisper', text: 'In the Narrows someone mutters about "the gap in the north-east fence, where the wire was never finished". Then they are gone.', where: 'narrows', gives: 'gap' },
  { id: 'tracks', path: 'hunter', title: 'Tracks in the snow', text: 'Out past the dome, boot prints in the snow. Not the guild\'s boots. Not any boots made in A.T. They lead north-east, over the mountains.', where: 'outside', gives: 'tracks' },
  { id: 'oldman', path: 'ordinary', title: 'An old man\'s story', text: 'An old man on a bench says his grandfather swore the mountains were "a wall, not an end". People laugh at him. He doesn\'t laugh.', where: 'park', gives: 'rumour' },
  // once you know
  { id: 'corridor', path: 'any', after: true, title: 'The air corridor', text: 'Flight logs: every aircraft that turned north-east past the dome was "lost". The air force guards that sky. A fast plane, flown low, might make it.', where: 'airport', gives: 'airRoute' },
  { id: 'river', path: 'any', after: true, title: 'The far river', text: 'An old hunter: "Past the last mountains there\'s only river. Anyone who lasted out there long enough to reach it… never came back. Make of that what you like."', where: 'guild', gives: 'footRoute' },
];
const PLACES = { gov: { x: 290, z: 905, name: 'the Government Offices' }, temple: { x: -147, z: -380, name: 'the temple dig' }, atlas: { x: 80, z: 897, name: 'the ATLAS base' }, narrows: { x: -1010, z: 62, name: 'the Narrows' }, park: { x: 420, z: -960, name: 'Grand Park' }, airport: { x: 0, z: 0, name: 'the airfield' }, guild: { x: 0, z: -470, name: 'the Hunters\' Guild quarter' } };

export function createStory(ctx) {
  // a quiet page of text (a file, a slab, a letter)
  const page = document.createElement('section'); page.id = 'storyPage'; page.hidden = true; document.body.append(page);
  const css = document.createElement('style'); css.textContent = '#storyPage{position:fixed;inset:12% max(14px,22%);z-index:49;background:#f4efe3;color:#1d1a16;border-radius:10px;padding:22px 26px;overflow:auto;font:16px/1.6 Georgia,serif;box-shadow:0 20px 60px #0008}#storyPage[hidden]{display:none}#storyPage h2{font:700 18px system-ui;letter-spacing:.04em;margin:0 0 12px}#storyPage p{white-space:pre-wrap}#storyPage button{font:14px system-ui;padding:10px 16px;border:0;border-radius:8px;background:#2b2b2b;color:#fff;min-height:42px}';
  document.head.append(css);
  ctx.showText = (title, text) => { page.innerHTML = ''; const h = document.createElement('h2'); h.textContent = title; const p = document.createElement('p'); p.textContent = text; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Close'; b.onclick = () => { page.hidden = true; ctx.resume?.(); }; page.append(h, p, b); page.hidden = false; ctx.pause?.(); };
  const S = ctx.S, T = S.story ||= { clues: [], done: [], lead: null, knows: false, outside: false, outsideTime: 0, warmth: 100, escaped: 0, nextLead: S.tick + 48 };
  const D = ctx.DOME, P = () => ctx.player().position;
  const dist = (p = P()) => Math.hypot(p.x - D.x, p.z - D.z);
  const has = k => T.clues.includes(k);
  const notebook = { starmap: 'The temple\'s "star map" is a map of lands beyond the mountains.', readings: 'The dome\'s outer sensors read warm, wet air from the north-east.', tracks: 'Boot prints outside the dome, not made in A.T., heading north-east.', rumour: 'An old man: "the mountains are a wall, not an end".', archiveKey: 'A key to the restricted archive in the Government Offices.', gap: 'A gap in the north-east fence where the wire was never finished.', airRoute: 'The air force guards the north-east sky. A fast plane, flown low, might make it.', footRoute: 'Past the last mountains there is only river. Those who lasted long enough to reach it never came back.', file: 'THE FILE: there is a world beyond the mountains, and the government keeps everyone in.' };
  function clue(k) { if (has(k)) return; T.clues.push(k); ctx.toast('📓 Noted: ' + notebook[k]); if (!T.knows && (has('file') || ['starmap', 'readings', 'tracks', 'rumour'].filter(has).length >= 2)) learnTruth(); }
  function learnTruth() { T.knows = true; ctx.achieve?.('The truth beyond the mountains'); ctx.toast('📓 You are sure of it now: there is something beyond the mountains. And someone does not want anyone to know.'); }

  // ---- the restricted archive in the Government Offices ----
  ctx.interactables.push({ pos: new THREE.Vector3(PLACES.gov.x, 0.2, PLACES.gov.z), r: 2, label: 'Restricted archive', action: () => {
    if (has('file')) return ctx.toast('You have already read the file. You remember every word.');
    const office = ctx.office?.(); const night = ctx.isNight?.();
    if (office || has('archiveKey')) return readFile(office ? 'your clearance as ' + office : 'the key from the envelope');
    if (night) { if (Math.random() < .5) { ctx.raiseWanted(150); ctx.controversy?.('Broke into the government archive'); return readFile('a forced lock in the dark'); } ctx.raiseWanted(120); return ctx.toast('🚨 An alarm. The guards are coming. Not tonight.'); }
    ctx.toast('A guard: "Restricted. Officials only." The door is solid steel.');
  } });
  function readFile(how) {
    ctx.showText('CLASSIFIED · OFFICE OF THE PRESIDENT · AEGIS AUTHORITY', `Opened with ${how}.\n\nPopulation briefing, eyes only. The mountains are not the edge of the world. Beyond them lie other lands and other nations. They know something lives here; they do not know what, or where. The dome hides us and Aegis keeps us.\n\nStanding order: no citizen leaves. Any aircraft crossing the dome rim is to be intercepted. Any person found beyond the hunting markers is to be returned.\n\nAppendix: the north-east is warmest. Every known attempt went that way.`);
    clue('file'); ctx.history?.('The newcomer read the classified file', 'nobody knows; the archive log was wiped');
  }
  // ---- the star map (once the dig is far enough along) ----
  ctx.interactables.push({ pos: new THREE.Vector3(-147, 0.2, -366), get r() { return (S.dig?.progress || 0) >= 60 ? 3 : 0; }, get label() { return (S.dig?.progress || 0) >= 60 ? 'Study the slab the archaeologists cleaned' : ''; }, action: () => { if ((S.dig?.progress || 0) < 60) return; ctx.showText('The basalt slab', BREAKAGES[1].text); clue('starmap'); } });

  // ---- breakages: turning points that grow out of the life you're leading ----
  function path() {
    const sig = { politics: ctx.office?.() ? 3 : ctx.inParty?.() ? 1 : 0, hunter: ctx.isHunter?.() ? 2 : 0, crime: (ctx.wanted?.() > 0 ? 1 : 0) + (ctx.controversies?.() || 0), science: ctx.friendWith?.(['Scientist', 'Chemist', 'AI researcher']) ? 2 : 0, archaeology: ctx.friendWith?.(['Archaeologist']) || (S.dig?.progress || 0) >= 60 ? 1.5 : 0, ordinary: .5 };
    return Object.entries(sig).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }
  async function offerLead() {
    const order = path(), done = new Set(T.done);
    const pick = BREAKAGES.find(b => !done.has(b.id) && (T.knows ? b.after : !b.after) && (b.path === 'any' || order.slice(0, 2).includes(b.path)) && (!b.needDig || (S.dig?.progress || 0) >= b.needDig))
      || BREAKAGES.find(b => !done.has(b.id) && !b.after && b.path === 'ordinary');
    if (!pick) return;
    const place = pick.where === 'outside' ? { x: D.x + Math.sin(.8) * 1800, z: D.z + Math.cos(.8) * 1800, name: 'the snow beyond the north-east gate' } : PLACES[pick.where];
    let line = { title: pick.title, text: pick.text };
    try { const got = await ctx.director?.({ path: order[0], knows: T.knows, clues: T.clues, title: pick.title, gist: pick.text, place: place.name }); if (got?.text) line = { title: got.title || pick.title, text: got.text }; } catch { }
    T.lead = { id: pick.id, x: place.x, z: place.z, name: place.name, title: line.title, text: line.text, gives: pick.gives };
    ctx.toast(`📓 ${pick.where === 'gov' ? 'A message reaches you' : 'Something nags at you'}: go to ${place.name}.`); ctx.setWaypoint?.({ name: place.name, x: place.x, z: place.z });
  }
  function checkLead() {
    const L = T.lead; if (!L) return;
    const p = P(); if (Math.hypot(p.x - L.x, p.z - L.z) > 9) return;
    ctx.showText(L.title, L.text); clue(L.gives); T.done.push(L.id); T.lead = null; T.nextLead = S.tick + 60 + Math.floor(Math.random() * 60);
  }

  // ---- the gates: hunters may go out to the markers ----
  const scene = ctx.scene, post = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x662200 });
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 3, 6), post); m.position.set(D.x + Math.sin(a) * ZONE_R, 1.5, D.z + Math.cos(a) * ZONE_R); scene.add(m); }
  const river = new THREE.Mesh(new THREE.RingGeometry(RIVER_R, RIVER_R + 260, 160), new THREE.MeshStandardMaterial({ color: 0x23476b, roughness: .2, metalness: .3 }));
  river.rotation.x = -Math.PI / 2; river.position.set(D.x, .06, D.z); scene.add(river);
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const inside = new THREE.Vector3(D.x + Math.sin(a) * (D.r - 16), 0.2, D.z + Math.cos(a) * (D.r - 16)), outside = new THREE.Vector3(D.x + Math.sin(a) * (D.r + 70), 0.2, D.z + Math.cos(a) * (D.r + 70));
    ctx.interactables.push({ pos: inside, r: 3, label: 'Ask to go out with the hunters', action: () => { if (!ctx.isHunter?.()) return ctx.toast('A soldier: "Licensed hunters only, and only as far as the orange markers. Register with the Hunter Association."'); goOut(outside, 'The gate grinds open. "Markers are orange. Past them, you\'re on your own, and you didn\'t hear that from me."'); } });
    ctx.interactables.push({ pos: outside, r: 4, label: 'Go back in through the gate', action: () => { T.outside = false; ctx.teleport(inside, 'Back inside the dome. The warmth hits you like a wall.'); } });
  }
  const gapIn = new THREE.Vector3(D.x + Math.sin(.8) * (D.r - 8), .2, D.z + Math.cos(.8) * (D.r - 8)), gapOut = new THREE.Vector3(D.x + Math.sin(.8) * (D.r + 70), .2, D.z + Math.cos(.8) * (D.r + 70));
  ctx.interactables.push({ pos: gapIn, get r() { return has('gap') ? 3 : 0; }, get label() { return has('gap') ? 'Slip through the gap in the fence' : ''; }, action: () => { if (!has('gap')) return; ctx.raiseWanted(60); ctx.controversy?.('Went through the fence'); goOut(gapOut, 'You squeeze through the unfinished wire. Nobody saw. You hope.'); } });
  function goOut(at, msg) { T.outside = true; T.warmth = Math.max(T.warmth, 80); ctx.teleport(at, msg); ctx.achieve?.('Beyond the dome'); }

  // ---- outside: beasts, the cold, making camp, butchering ----
  const beasts = [];
  const hud = document.createElement('div'); hud.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:31;background:rgba(10,20,30,.7);color:#dff3ff;padding:6px 12px;border-radius:10px;font:13px system-ui;display:none'; document.body.append(hud);
  let camp = 0, warnedZone = false;
  const campIt = { pos: new THREE.Vector3(), get r() { return T.outside && camp <= 0 ? 3 : 0; }, get label() { return T.outside && camp <= 0 ? 'Make camp and warm up' : ''; }, action: () => {
    if (!T.outside || camp > 0) return; camp = 120;
    const meat = ctx.takeItem?.('Raw game meat');
    T.warmth = Math.min(100, T.warmth + (meat ? 100 : 55)); if (meat) ctx.eat?.(30);
    ctx.toast(meat ? '🔥 You build a fire, cook the meat and eat. Warm again, for now.' : '🔥 You build a small fire and huddle. Warmer, but you\'re hungry.');
  } };
  ctx.interactables.push(campIt);
  function spawnBeasts() {
    const p = P(), d = dist(p);
    for (const b of beasts) if (b.alive && b.root.position.distanceTo(p) > 220) { b.alive = false; b.respawn = 1e9; b.root.visible = false; b.gone = true; }
    const live = beasts.filter(b => b.alive && !b.gone);
    if (live.length >= 6) return;
    const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 60, pos = new THREE.Vector3(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r);
    const dd = dist(pos); if (dd < D.r + 40 || dd > RIVER_R - 20) return;
    const type = BEASTS.filter(([at]) => dd - D.r >= at).pop()[1], level = 1 + Math.floor((dd - D.r) / 120);
    const e = ctx.makeMonster(type, level, pos); if (e) { e.beast = true; beasts.push(e); }
  }
  function butcher() {
    for (const b of beasts) if (!b.alive && !b.gone && !b.carcass) {
      b.carcass = { pos: b.root.position.clone(), r: 2.5, label: `Skin and butcher the ${b.mdef?.name || 'beast'}`, action: () => {
        ctx.addItem?.(b.type === 'iceBear' ? 'Thick hide' : 'Fur pelt', '🧥'); ctx.addItem?.('Raw game meat', '🥩'); ctx.addItem?.('Raw game meat', '🥩');
        ctx.toast(`🔪 You skin the ${b.mdef?.name || 'beast'}, separate the hide from the meat and pack both. Grim work, but it'll keep you alive.`);
        ctx.achieve?.('Lived off the land'); b.gone = true; b.root.visible = false; b.respawn = 1e9; const i = ctx.interactables.indexOf(b.carcass); if (i >= 0) ctx.interactables.splice(i, 1);
      } };
      ctx.interactables.push(b.carcass);
    }
  }
  // ---- escape by air ----
  const jets = []; let air = null;
  function jetMesh() {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x5a6570, metalness: .6, roughness: .4 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(.7, 9, 8), m); body.rotation.x = Math.PI / 2; g.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(8, .15, 2.4), m); wing.position.z = -1; g.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(.15, 2, 1.4), m); tail.position.set(0, 1, -3.6); g.add(tail);
    scene.add(g); return g;
  }
  function airEscape(dt) {
    const v = ctx.flying?.(); const p = v?.group?.position;
    if (!v || !p || dist(p) < D.r + 30) { if (air) { for (const j of jets) scene.remove(j); jets.length = 0; air = null; ctx.toast('The jets peel away as you cross back inside the dome.'); } return; }
    if (!air) { air = { t: 0, hits: 0, shot: 2 }; for (let i = 0; i < 3; i++) jets.push(jetMesh()); ctx.toast('🚨 RADAR LOCK. Military jets are scrambling to intercept you. Nobody leaves.'); ctx.raiseWanted(200); }
    air.t += dt; air.shot -= dt;
    jets.forEach((j, i) => { const a = air.t * .8 + i * 2.1, want = new THREE.Vector3(p.x + Math.cos(a) * 40, p.y + 8 + i * 4, p.z + Math.sin(a) * 40); j.position.lerp(want, Math.min(1, dt * 1.5)); j.lookAt(p); });
    if (air.shot <= 0) { air.shot = 1.6 + Math.random(); const low = p.y < 40, chance = low ? .22 : .4; if (Math.random() < chance) { air.hits++; ctx.toast(`💥 Hit! (${air.hits}/6)`); if (air.hits >= 6) { ctx.crash?.(v); for (const j of jets) scene.remove(j); jets.length = 0; air = null; return; } } }
    if (dist(p) > 2600) { air.far = (air.far || 0) + dt; if (air.far > 45) escaped('air'); }
  }
  function escaped(how) {
    T.escaped++; T.outside = false;
    for (const j of jets) scene.remove(j); jets.length = 0; air = null;
    ctx.achieve?.('Escaped A.T.');
    ctx.history?.('The newcomer vanished beyond the mountains', how === 'air' ? 'an aircraft was lost over the north-east, says the official report' : 'last seen past the hunting markers, says the guild');
    ctx.showText('Beyond', how === 'air' ? 'The jets fall away behind the last ridge. Below you, the mountains end in a wide grey river, and beyond the river, lights. A coast. Roads. A world nobody in A.T. believes in.\n\nYou made it out.\n\n(The world beyond is still being built. For now, you return to A.T., knowing.)' : 'Weeks of cold, of hunting and making camp. Then, past the last mountain, the river: wide, fast, and on its far bank, a road. A real road. Nobody in A.T. would believe you.\n\nYou made it out.\n\n(The world beyond is still being built. For now, you return to A.T., knowing.)');
    ctx.teleport(new THREE.Vector3(D.x, .3, D.z - 100), 'Somehow, you are back inside the dome. Nobody asks where you have been.');
  }

  let t = 0;
  return {
    get open() { return !page.hidden; },
    T, notebook: () => T.clues.map(k => notebook[k]), lead: () => T.lead,
    clue, has,
    clampOutside(p) {   // keeps you between the dome and the river while you're outside
      if (!T.outside) return false;
      const dx = p.x - D.x, dz = p.z - D.z, d = Math.hypot(dx, dz);
      if (d < D.r + 40) { p.x = D.x + dx / d * (D.r + 40); p.z = D.z + dz / d * (D.r + 40); }
      if (d > RIVER_R + 10) { p.x = D.x + dx / d * (RIVER_R + 10); p.z = D.z + dz / d * (RIVER_R + 10); }
      return true;
    },
    update(dt) {
      t -= dt; camp -= dt;
      airEscape(dt);
      if (T.outside) {
        const p = P(), d = dist(p);
        T.outsideTime += dt;
        const cloak = (ctx.countItem?.('Fur pelt') || 0) + (ctx.countItem?.('Thick hide') || 0) * 2 >= 2;
        T.warmth = Math.max(0, T.warmth - dt * .45 * (ctx.isNight?.() ? 1.5 : 1) * (cloak ? .5 : 1));
        if (T.warmth <= 0) ctx.hurt?.(3 * dt, 'Froze to death beyond the dome');
        campIt.pos.copy(p);
        hud.style.display = 'block'; hud.textContent = `❄ Warmth ${Math.round(T.warmth)}% ${cloak ? '· fur cloak' : ''} · ${d > ZONE_R ? 'BEYOND THE MARKERS' : 'hunting zone'} · ${Math.floor(T.outsideTime / 60)} min outside`;
        if (d > ZONE_R && !warnedZone) { warnedZone = true; ctx.toast('You pass the last orange marker. Out here, nobody is coming for you.'); if (Math.random() < .5) ctx.raiseWanted(50); }
        if (d >= RIVER_R - 30 && T.outsideTime > 1500 && T.knows) escaped('foot');
        else if (d >= RIVER_R - 30 && T.outsideTime <= 1500 && Math.random() < dt / 8) ctx.toast('The river is wide and freezing. You aren\'t ready. Not yet. Survive out here longer.');
      } else hud.style.display = 'none';
      if (t > 0) return; t = 2;
      if (T.outside) { spawnBeasts(); butcher(); }
      checkLead();
      if (!T.lead && S.tick >= T.nextLead) { T.nextLead = S.tick + 9999; offerLead(); }
    },
  };
}
