// RAIN: proper rain, not a few dots.
//  - Streaks: thousands of thin falling lines around the camera, slanted by the wind. They're drawn by the graphics
//    card (each drop's fall is worked out in the shader from the time), so they cost almost nothing to move. Drops
//    are fixed in the world and wrap round a box that follows you, so they don't slide about when you turn.
//  - Splashes: little white crowns and rings popping up on the ground and on roads around you where drops land
//    (never inside buildings).
//  - The haze: while it rains the air goes blue-grey and the distance closes in (main.js tints the sky and fog with
//    `haze`, 0..1, which eases in and out as the rain starts and stops).
// Indoors you don't see it falling (it would come through the ceiling); fewer drops on phones.
import * as THREE from 'three';

export function createRain({ scene, camera, count = 7000, splashes = 260, groundAt, sheltered }) {
  // ---------- streaks ----------
  const BOX = new THREE.Vector3(70, 34, 70);
  const pos = new Float32Array(count * 2 * 3), off = new Float32Array(count * 2 * 3), spd = new Float32Array(count * 2), end = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = Math.random(), y = Math.random(), z = Math.random(), s = 18 + Math.random() * 8;
    for (let k = 0; k < 2; k++) { const j = i * 2 + k; off.set([x, y, z], j * 3); spd[j] = s; end[j] = k; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1)); geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);   // it moves with the camera: never cull it
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: BOX }, uWind: { value: new THREE.Vector2(2.2, 0.8) }, uLen: { value: 1.2 }, uOpacity: { value: 0 } },
    vertexShader: `
      attribute vec3 aOff; attribute float aSpeed; attribute float aEnd;
      uniform float uTime, uLen, uOpacity; uniform vec3 uCenter, uBox; uniform vec2 uWind;
      varying float vA;
      void main() {
        vec3 b = aOff * uBox;
        float fall = uTime * aSpeed;
        float y = mod(b.y - fall, uBox.y);
        vec2 drift = uWind * uTime;
        vec2 xz = uCenter.xz + mod(b.xz + drift - uCenter.xz + uBox.xz * 0.5, uBox.xz) - uBox.xz * 0.5;
        vec3 vel = normalize(vec3(uWind.x, -aSpeed, uWind.y));
        vec3 p = vec3(xz.x, uCenter.y - uBox.y * 0.45 + y, xz.y) - vel * uLen * aEnd;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = length(mv.xyz);
        vA = uOpacity * (1.0 - aEnd * 0.75) * smoothstep(0.6, 3.0, d) * (1.0 - smoothstep(22.0, 34.0, d));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA; void main() { gl_FragColor = vec4(0.78, 0.85, 0.93, vA); }`,
  });
  const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 5; lines.visible = false; scene.add(lines);

  // ---------- splashes ----------
  const tex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + 0.7 * i / 6); g.beginPath(); g.moveTo(32 + Math.cos(a) * 8, 58); g.lineTo(32 + Math.cos(a) * 22, 58 - Math.sin(a) * 26); g.stroke(); }   // a crown of droplets thrown up
    g.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 5; i++) { const a = Math.PI * (0.2 + 0.6 * i / 4); g.beginPath(); g.arc(32 + Math.cos(a) * 25, 58 - Math.sin(a) * 30, 2.5, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke(); return new THREE.CanvasTexture(c); })();
  const crownMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.8, side: THREE.DoubleSide });
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0.55 });
  const crowns = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.46, 0.4).translate(0, 0.2, 0), crownMat, splashes);
  const rings = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.5).rotateX(-Math.PI / 2), ringMat, splashes);
  for (const m of [crowns, rings]) { m.frustumCulled = false; m.visible = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
  const sp = Array.from({ length: splashes }, () => ({ x: 0, y: -999, z: 0, t: Math.random() * 0.35, life: 0.35 }));
  const o = new THREE.Object3D(), hide = new THREE.Matrix4().makeScale(0, 0, 0);

  let t = 0, level = 0, want = 0;
  return {
    get haze() { return level; },
    set(on, now = false) { want = on ? 1 : 0; if (now) level = want; },
    update(dt, { indoors = false, density = 1 } = {}) {
      level += Math.sign(want - level) * Math.min(Math.abs(want - level), dt / 6);   // eases in over ~6 s
      t += dt; mat.uniforms.uTime.value = t;
      const on = level > 0.01 && !indoors;
      lines.visible = crowns.visible = rings.visible = on;
      if (!on) return;
      const c = camera.position; mat.uniforms.uCenter.value.copy(c); mat.uniforms.uOpacity.value = 0.6 * level;
      geo.setDrawRange(0, Math.floor(count * 2 * Math.min(1, level * density)));
      // splashes: each lives a third of a second, then pops up somewhere else on open ground near you
      const live = Math.floor(splashes * level * density);
      for (let i = 0; i < splashes; i++) {
        const s = sp[i];
        s.t += dt;
        if (s.t >= s.life) {
          s.t = 0; s.life = 0.25 + Math.random() * 0.15; s.y = -999;
          if (i < live) {
            const a = Math.random() * Math.PI * 2, r = 1.5 + Math.sqrt(Math.random()) * 16;
            const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, y = groundAt(x, z);
            if (Number.isFinite(y) && Math.abs(y - c.y) < 25 && !sheltered(x, z, y)) { s.x = x; s.y = y; s.z = z; }
          }
        }
        if (s.y < -900) { crowns.setMatrixAt(i, hide); rings.setMatrixAt(i, hide); continue; }
        const k = s.t / s.life, grow = 0.4 + k * 0.9, fade = 1 - k;
        o.position.set(s.x, s.y + 0.02, s.z); o.rotation.set(0, Math.atan2(c.x - s.x, c.z - s.z), 0); o.scale.set(grow, grow * fade + 0.05, 1); o.updateMatrix(); crowns.setMatrixAt(i, o.matrix);
        o.rotation.set(0, 0, 0); o.scale.set(0.3 + k * 1.2, 1, 0.3 + k * 1.2); o.position.y = s.y + 0.015; o.updateMatrix(); rings.setMatrixAt(i, o.matrix);
      }
      crowns.instanceMatrix.needsUpdate = rings.instanceMatrix.needsUpdate = true;
    },
  };
}
