// The Lost Peak: a mountain that stays hidden until you finish its quest.
//
// Old Surveyor Maren stands in the empty field south-west of the business district.
// She asks you to find six Sky Shards scattered around the dome (they glow and send a
// beam of light up once the quest has started). Bring all six back to her and Mount
// Aurelia rises out of the ground where she has been staring all these years. Climb it
// to reach the summit shrine. Progress is saved on this device.
import * as THREE from 'three';

const KEY = 'anotherworld-lost-peak';
export const PEAK = { x: -520, z: 1080, base: 150, height: 240, top: 18 };

export function buildHiddenPeak({ scene, colliders, interactables, makePerson, toast, announce, teleport, reward, shake }) {
  let state = { stage: 0, shards: [] , rewarded: false };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  // ---------------- the mountain (hidden) ----------------
  const rock = new THREE.MeshStandardMaterial({ color: 0x6d6f74, roughness: 0.95, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.9, flatShading: true });
  const mountain = new THREE.Group(); mountain.position.set(PEAK.x, 0, PEAK.z); scene.add(mountain);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(PEAK.top, PEAK.base, PEAK.height, 28, 6), rock); body.position.y = PEAK.height / 2; mountain.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(PEAK.top + 0.6, 64, 92, 28, 2), snow); cap.position.y = PEAK.height - 46 + 0.4; mountain.add(cap);
  const summit = new THREE.Mesh(new THREE.CylinderGeometry(PEAK.top + 0.6, PEAK.top + 0.6, 0.6, 28), snow); summit.position.y = PEAK.height + 0.1; mountain.add(summit);
  for (let i = 0; i < 9; i++) {   // rocky shoulders round the base
    const a = i / 9 * Math.PI * 2, r = 30 + (i % 3) * 12, h = 50 + (i % 4) * 18;
    const s = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rock); s.position.set(Math.cos(a) * (PEAK.base - 20), h / 2, Math.sin(a) * (PEAK.base - 20)); mountain.add(s);
  }
  // summit shrine: a glowing crystal on a stone ring
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), new THREE.MeshStandardMaterial({ color: 0xc9a2ff, emissive: 0x8a5cff, emissiveIntensity: 2, roughness: 0.2 }));
  crystal.position.y = PEAK.height + 3.2; mountain.add(crystal);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, st = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), rock); st.position.set(Math.cos(a) * 6, PEAK.height + 1.4, Math.sin(a) * 6); mountain.add(st); }
  mountain.traverse(o => { o.userData.noCull = true; });
  const peakCollider = { minX: PEAK.x - PEAK.base, maxX: PEAK.x + PEAK.base, minZ: PEAK.z - PEAK.base, maxZ: PEAK.z + PEAK.base, circleX: PEAK.x, circleZ: PEAK.z, circleRadius: PEAK.base - 10 };
  const climbSpot = { pos: new THREE.Vector3(PEAK.x + PEAK.base - 4, 0.2, PEAK.z), r: 6, label: 'Climb to the summit of Mount Aurelia', action: () => teleport(new THREE.Vector3(PEAK.x + 9, PEAK.height + 0.5, PEAK.z), 'After a long climb you reach the summit of Mount Aurelia. The whole dome is spread out below you.', 1600) };
  const downSpot = { pos: new THREE.Vector3(PEAK.x + 10, PEAK.height + 0.5, PEAK.z), r: 3, label: 'Climb back down', action: () => teleport(new THREE.Vector3(PEAK.x + PEAK.base + 4, 0.3, PEAK.z), 'You make your way back down the mountain.', 1200) };
  const crystalSpot = { pos: new THREE.Vector3(PEAK.x, PEAK.height + 0.5, PEAK.z + 2.5), r: 3, label: 'Touch the Peak Crystal', action: () => {
    if (state.rewarded) { toast('The crystal hums warmly. You feel at peace up here.'); return; }
    state.rewarded = true; save(); reward(); announce('PEAK CRYSTAL CLAIMED'); toast('Power surges through you: +500 gold, full health and energy. The view alone was worth it.');
  } };
  let revealed = false, rise = 1;
  function reveal(animate) {
    revealed = true; mountain.visible = true;
    colliders.push(peakCollider); interactables.push(climbSpot, downSpot, crystalSpot);
    if (animate) { rise = 0; mountain.scale.y = 0.001; }
  }
  mountain.visible = false;

  // ---------------- the surveyor ----------------
  const NPC = { x: -345, z: 1015 };
  const maren = makePerson({ outfit: 0x7a5a3a, hair: 0xd8d8d8, pants: 0x4a4a3a });
  maren.root.position.set(NPC.x, 0.1, NPC.z); maren.root.rotation.y = Math.atan2(PEAK.x - NPC.x, PEAK.z - NPC.z); scene.add(maren.root);
  const tripod = new THREE.Group(); tripod.position.set(NPC.x - 1.2, 0, NPC.z + 0.6); scene.add(tripod);
  for (let i = 0; i < 3; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), new THREE.MeshStandardMaterial({ color: 0x8a6a3a })); const a = i / 3 * Math.PI * 2; leg.position.set(Math.cos(a) * 0.25, 0.7, Math.sin(a) * 0.25); leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); tripod.add(leg); }
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7 })); scope.rotation.z = Math.PI / 2; scope.position.y = 1.5; tripod.add(scope);

  // ---------------- the six Sky Shards ----------------
  const SHARDS = [
    { id: 'stadium', x: 150, z: -846, y: 0, hint: 'in the middle of Ashford Stadium' },
    { id: 'raceway', x: -280, z: -880, y: 0, hint: 'on the infield of Ashford Raceway' },
    { id: 'lido', x: 648, z: -874, y: 0, hint: 'on the deck of the Ashford Aquatics lido' },
    { id: 'border', x: 170, z: -1186, y: 0, hint: 'by the north border checkpoint, at the edge of the shield' },
    { id: 'generator', x: 240, z: 686, y: 0, hint: 'at the foot of the Aegis Prime Generator in the Capital' },
    { id: 'sewers', x: -7994, z: 6, y: -0.1, hint: 'down in the sewers, beside the power grid junction' },
  ];
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xc9a2ff, emissive: 0x8a5cff, emissiveIntensity: 2.2, roughness: 0.2 });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xb48aff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const s of SHARDS) {
    s.g = new THREE.Group(); s.g.position.set(s.x, s.y, s.z); scene.add(s.g);
    s.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), shardMat); s.gem.position.y = 1.2; s.g.add(s.gem);
    if (s.id !== 'sewers') { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 70, 8, 1, true), beamMat); beam.position.y = 35; beam.userData.noCull = true; s.g.add(beam); }
    s.it = { pos: new THREE.Vector3(s.x, s.y + 0.2, s.z), r: 2.2, label: 'Pick up the Sky Shard', action: () => collect(s) };
  }
  const have = () => state.shards.length;
  function refreshShards() {
    for (const s of SHARDS) {
      const show = state.stage === 1 && !state.shards.includes(s.id);
      s.g.visible = show;
      const i = interactables.indexOf(s.it);
      if (show && i < 0) interactables.push(s.it); else if (!show && i >= 0) interactables.splice(i, 1);
    }
  }
  function collect(s) {
    if (state.shards.includes(s.id)) return;
    state.shards.push(s.id); save(); refreshShards();
    announce(`SKY SHARD ${have()} / ${SHARDS.length}`);
    toast(have() < SHARDS.length ? `You found a Sky Shard (${have()}/${SHARDS.length}). It hums and points south-west, toward the empty field.` : 'That\'s all six Sky Shards! Take them back to Old Surveyor Maren.');
  }
  const talk = { pos: new THREE.Vector3(NPC.x, 0.2, NPC.z), r: 3, get label() { return state.stage === 0 ? 'Talk to Old Surveyor Maren' : state.stage === 1 && have() >= SHARDS.length ? 'Give Maren the Sky Shards' : 'Talk to Maren'; }, action: () => {
    if (state.stage === 0) {
      state.stage = 1; save(); refreshShards();
      announce('NEW QUEST: THE LOST PEAK');
      toast('"Forty years I\'ve measured this field. The numbers say a mountain stands here - Mount Aurelia - but nobody can see it. The old maps say it was hidden by six Sky Shards scattered across the dome. Find them and bring them to me." (Shards glow and shine a beam of light into the sky.)');
    } else if (state.stage === 1 && have() < SHARDS.length) {
      const left = SHARDS.filter(s => !state.shards.includes(s.id)).map(s => s.hint);
      toast(`"${have()} of ${SHARDS.length}. Keep looking. My notes mention one ${left[0]}${left[1] ? `, and one ${left[1]}` : ''}."`);
    } else if (state.stage === 1) {
      state.stage = 2; save(); refreshShards(); reveal(true);
      announce('MOUNT AURELIA REVEALED');
      toast('Maren holds up the shards. They flare - and the ground shakes as a vast snow-capped mountain rises out of the field. "There she is. Go on - climb her. The summit is yours."');
    } else toast('"Isn\'t she beautiful? The path up starts on the east side. Mind the snow at the top."');
  } };
  interactables.push(talk);
  refreshShards();
  if (state.stage >= 2) reveal(false);

  let time = 0;
  function update(dt) {
    time += dt;
    for (const s of SHARDS) if (s.g.visible) { s.gem.rotation.y += dt * 1.5; s.gem.position.y = 1.2 + Math.sin(time * 2 + s.x) * 0.15; }
    if (revealed) crystal.rotation.y += dt * 0.6;
    if (rise < 1) { rise = Math.min(1, rise + dt / 8); mountain.scale.y = Math.max(0.001, 1 - Math.pow(1 - rise, 3)); shake?.(0.35); }
  }
  // the flat summit is solid ground
  function groundAt(x, z, bodyY) {
    if (!revealed || bodyY < PEAK.height - 20) return null;
    return Math.hypot(x - PEAK.x, z - PEAK.z) < PEAK.top ? PEAK.height + 0.4 : null;
  }
  return { update, groundAt, get revealed() { return revealed; }, get stage() { return state.stage; } };
}
