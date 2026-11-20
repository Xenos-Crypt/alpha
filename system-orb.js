// THE SYSTEM ORB: in Story Mode the System shows itself as a glowing red ball that floats at your
// shoulder. Only you can see it (it lives in your own scene, never sent to other players). It has a
// simple face that shows how it feels: content when you do well, worried when you're hurt or starving,
// angry when the police are after you, delighted when you level up or finish a quest, and it turns to
// look at you and talks while the System window is open. It only appears once the System is awake.
import * as THREE from 'three';

export const MOODS = ['calm', 'happy', 'delighted', 'worried', 'angry', 'sad', 'surprised', 'talk', 'sleepy'];

// draw the orb (a glowing red ball) with a face for a mood; `blink` closes the eyes, `mouth` opens it (talking)
function drawFace(g, mood, blink, mouth) {
  const S = 256, c = S / 2; g.clearRect(0, 0, S, S);
  // outer glow and the ball
  let grd = g.createRadialGradient(c, c, 20, c, c, 128); grd.addColorStop(0, 'rgba(255,60,50,.55)'); grd.addColorStop(0.55, 'rgba(255,30,30,.25)'); grd.addColorStop(1, 'rgba(255,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  grd = g.createRadialGradient(c - 22, c - 26, 6, c, c, 74); grd.addColorStop(0, '#ffb3a8'); grd.addColorStop(0.35, '#ff3b30'); grd.addColorStop(0.85, '#a3000f'); grd.addColorStop(1, '#5c0008');
  g.fillStyle = grd; g.beginPath(); g.arc(c, c, 72, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(c - 26, c - 34, 18, 10, -0.5, 0, Math.PI * 2); g.fill();   // shine
  // the face, drawn in glowing white
  g.strokeStyle = g.fillStyle = '#fff6f0'; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = '#ffd0c8'; g.shadowBlur = 10;
  const ey = c - 8, ex = 24;
  const eye = (x, open) => {
    if (blink || mood === 'sleepy') { g.beginPath(); g.moveTo(x - 10, ey + 2); g.quadraticCurveTo(x, ey + 7, x + 10, ey + 2); g.stroke(); return; }
    if (mood === 'happy' || mood === 'delighted') { g.beginPath(); g.moveTo(x - 11, ey + 4); g.quadraticCurveTo(x, ey - 10, x + 11, ey + 4); g.stroke(); return; }   // smiling eyes
    g.beginPath(); g.ellipse(x, ey, open ? 8 : 7, mood === 'surprised' ? 13 : 10, 0, 0, Math.PI * 2); g.fill();
  };
  eye(c - ex, true); eye(c + ex, true);
  // brows for the strong feelings
  if (mood === 'angry') { g.beginPath(); g.moveTo(c - ex - 14, ey - 22); g.lineTo(c - ex + 10, ey - 13); g.moveTo(c + ex + 14, ey - 22); g.lineTo(c + ex - 10, ey - 13); g.stroke(); }
  if (mood === 'worried' || mood === 'sad') { g.beginPath(); g.moveTo(c - ex - 12, ey - 14); g.lineTo(c - ex + 10, ey - 21); g.moveTo(c + ex + 12, ey - 14); g.lineTo(c + ex - 10, ey - 21); g.stroke(); }
  // the mouth
  const my = c + 26; g.beginPath();
  if (mouth > 0.05) { g.ellipse(c, my, 12, 4 + mouth * 10, 0, 0, Math.PI * 2); g.fill(); }
  else if (mood === 'delighted') { g.moveTo(c - 20, my - 4); g.quadraticCurveTo(c, my + 22, c + 20, my - 4); g.closePath(); g.fill(); }
  else if (mood === 'happy') { g.moveTo(c - 18, my - 2); g.quadraticCurveTo(c, my + 14, c + 18, my - 2); g.stroke(); }
  else if (mood === 'sad') { g.moveTo(c - 16, my + 8); g.quadraticCurveTo(c, my - 6, c + 16, my + 8); g.stroke(); }
  else if (mood === 'angry') { g.moveTo(c - 16, my + 4); g.lineTo(c + 16, my + 4); g.stroke(); }
  else if (mood === 'worried') { g.moveTo(c - 16, my + 4); g.bezierCurveTo(c - 6, my - 4, c + 6, my + 10, c + 16, my + 2); g.stroke(); }
  else if (mood === 'surprised') { g.ellipse(c, my + 2, 8, 10, 0, 0, Math.PI * 2); g.stroke(); }
  else if (mood === 'sleepy') { g.moveTo(c - 8, my + 2); g.lineTo(c + 8, my + 2); g.stroke(); }
  else { g.moveTo(c - 12, my); g.quadraticCurveTo(c, my + 6, c + 12, my); g.stroke(); }   // calm
  g.shadowBlur = 0;
}

export function createSystemOrb(ctx) {
  // ctx: { scene, camera, player: () => Object3D, active: () => bool, hidden: () => bool, stats, wanted: () => number, night: () => bool }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d'), tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(0.62, 0.62, 1); sprite.renderOrder = 10; sprite.visible = false; sprite.name = 'System orb (only you see it)';
  const light = new THREE.PointLight(0xff3528, 0, 4, 2); sprite.add(light);
  ctx.scene.add(sprite);

  let mood = 'calm', moodUntil = 0, forced = null, talking = 0, blinkAt = 2, blinkFor = 0, t = 0, drawn = '';
  const pos = new THREE.Vector3(), want = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // a feeling for a while (events), on top of the mood it reads from your state
  function feel(m, seconds = 4) { if (!MOODS.includes(m)) return; forced = m; moodUntil = t + seconds; if (m === 'surprised' || m === 'delighted') blinkFor = 0; }
  function moodNow() {
    if (forced && t < moodUntil) return forced;
    forced = null;
    const s = ctx.stats || {};
    if (talking > 0) return 'talk';
    if ((ctx.wanted?.() || 0) > 0) return 'angry';
    if (s.hp != null && s.hp < 30) return 'worried';
    if ((s.hunger != null && s.hunger < 12) || (s.energy != null && s.energy < 10)) return 'worried';
    if (ctx.night?.() && (s.energy ?? 100) < 40) return 'sleepy';
    return 'calm';
  }
  let placed = false;
  return {
    feel, MOODS,
    get mood() { return mood; },
    get visible() { return sprite.visible; },
    // the System window is open: it comes round in front of you and talks
    talk(seconds = 2.5) { talking = Math.max(talking, seconds); },
    update(dt) {
      t += dt; const show = !!ctx.active?.() && !ctx.hidden?.();
      sprite.visible = show; light.intensity = show ? 0.9 : 0; if (!show) { placed = false; return; }
      const p = ctx.player?.(); if (!p) return;
      // float at your right shoulder, a little ahead; come round in front of the camera while talking
      const cam = ctx.camera; cam.getWorldDirection(want); want.y = 0; want.normalize(); side.crossVectors(want, up).normalize();
      if (talking > 0) want.multiplyScalar(1.6).addScaledVector(side, 0.35).add(p.position).setY(p.position.y + 1.75);
      else want.multiplyScalar(0.55).addScaledVector(side, 0.85).add(p.position).setY(p.position.y + 2.05 + Math.sin(t * 1.6) * 0.07);
      if (!placed || pos.distanceTo(want) > 8) { pos.copy(want); placed = true; } else pos.lerp(want, 1 - Math.exp(-4 * dt));   // (it jumps to you after a teleport, taxi or train)
      sprite.position.copy(pos);
      talking = Math.max(0, talking - dt);
      // blink now and then
      blinkAt -= dt; if (blinkAt <= 0) { blinkFor = 0.13; blinkAt = 2.5 + Math.random() * 4; } blinkFor = Math.max(0, blinkFor - dt);
      mood = moodNow();
      const mouth = mood === 'talk' ? Math.abs(Math.sin(t * 13)) * (0.4 + 0.6 * Math.abs(Math.sin(t * 3.1))) : 0;
      const face = mood === 'talk' ? 'calm' : mood, key = face + (blinkFor > 0 ? 'b' : '') + Math.round(mouth * 4);
      if (key !== drawn) { drawFace(g, face, blinkFor > 0, mouth); tex.needsUpdate = true; drawn = key; }
      // the glow breathes, and flares when it feels something strongly
      const strong = mood === 'angry' || mood === 'delighted' || mood === 'surprised';
      light.intensity = (strong ? 1.6 : 0.9) + Math.sin(t * 2.2) * 0.2; sprite.scale.setScalar(0.62 + Math.sin(t * 2.2) * 0.015 + (strong ? 0.05 : 0));
    },
  };
}
