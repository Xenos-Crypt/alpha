// PEOPLE — real human bodies for the residents (and everyone else in the city who isn't a monster or the
// player's hero). The old block figures stay as the far-away stand-ins: only the people closest to the
// camera get a full body (a budget that is smaller on phones), and the rest keep the cheap figure.
//
// LOOKS: every resident has a LOOK — body (male or female), skin tone, height, build, hairstyle, hair
// colour, beard. Nobody's look is random at birth: a baby takes after both parents (skin between theirs,
// hair colour from one of them, height and build near theirs). Children grow up (small, then taller),
// elders go grey. Clothes come from what the person wears in the game (uniform colours, outfits).
//
// The bodies, hair and animations are Quaternius's Universal Base Characters and Universal Animation
// Library 1 & 2 (CC0, see assets/people/CREDITS.md). Skin, clothes and hair are coloured in the shader, per
// person, from one shared set of textures, so a thousand people cost the same memory as one.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = 'assets/people/';
import { HAIR_STYLES, HAIR_COLOURS, makeLook, atAge } from './looks.js';
export { HAIR_STYLES, HAIR_COLOURS, makeLook, inheritLook, atAge } from './looks.js';
const GREY = new THREE.Color(0xc9c6c0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- the kit: shapes, textures, moves ---------------------------------------------------------------------
let kitPromise = null;
export function loadPeopleKit() {
  if (kitPromise) return kitPromise;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), tl = new THREE.TextureLoader();
  const glb = n => loader.loadAsync(BASE + n + '.glb');
  const tex = (n, srgb = true) => tl.loadAsync(BASE + n + '.webp').then(t => { t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; });
  kitPromise = (async () => {
    const hairNames = ['simpleparted', 'buzzed', 'long', 'buns', 'buzzedfemale', 'beard'];
    const [m, f, moves1, moves2, ...rest] = await Promise.all([glb('body-m'), glb('body-f'), glb('moves-1'), glb('moves-2'), ...hairNames.map(h => glb('hair-' + h)),
      ...['skin-m-light', 'skin-m-dark', 'skin-f-light', 'skin-f-dark', 'hair-1', 'hair-2', 'eye'].map(n => tex(n)), tex('normal-m', false), tex('normal-f', false)]);
    const hairs = Object.fromEntries(hairNames.map((n, i) => [n, rest[i]]));
    const [mL, mD, fL, fD, h1, h2, eye, nM, nF] = rest.slice(hairNames.length);
    const clips = new Map([...moves1.animations, ...moves2.animations].map(c => [c.name, c]));
    const kit = { bodies: { m: prepBody(m.scene), f: prepBody(f.scene) }, hairs, clips, tex: { m: [mL, mD, nM], f: [fL, fD, nF], hair: { MI_Hair_1: h1, MI_Hair_2: h2 }, eye } };
    return kit;
  })();
  return kitPromise;
}
// Which clothes cover which part of the body comes from the skeleton: each vertex knows which bones move it,
// so a shirt is "whatever the spine and upper arms move", trousers "whatever the hips and thighs move" and so
// on, blended by the bone weights so the edges are soft (cuffs, collars, hems).
const PARTS = [[/^(spine|clavicle|upperarm)/, 0], [/^lowerarm/, 1], [/^(pelvis|thigh)/, 2], [/^calf/, 3], [/^(foot|ball)/, 4]];
function prepBody(scene) {
  let body = null;
  scene.traverse(o => { if (o.isSkinnedMesh && /superhero/i.test(o.name + (o.material?.name || ''))) body = o; });
  if (!body) scene.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  const g = body.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = si.count;
  const part = body.skeleton.bones.map(b => (PARTS.find(([re]) => re.test(b.name)) || [0, -1])[1]);
  const cover = new Float32Array(n * 4), shoe = new Float32Array(n);
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) {
    const p = part[si.getComponent(v, k)], w = sw.getComponent(v, k);
    if (p >= 0 && p < 4) cover[v * 4 + p] += w; else if (p === 4) shoe[v] += w;
  }
  g.setAttribute('cover', new THREE.BufferAttribute(cover, 4)); g.setAttribute('shoe', new THREE.BufferAttribute(shoe, 1));
  const [sp, sn] = smoothShape(g);
  g.setAttribute('smoothPos', new THREE.BufferAttribute(sp, 3)); g.setAttribute('smoothNormal', new THREE.BufferAttribute(sn, 3));
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  return { scene, height: box.max.y - box.min.y, foot: box.min.y };
}

// A smoothed copy of the body's shape (Taubin smoothing: it softens without shrinking). Under clothes the
// body is drawn part-way to this, so cloth hides muscle lines the way real fabric does; children are drawn
// fully smoothed, so they have a child's plain shape and nothing of an adult's.
function smoothShape(g) {
  const pos = g.attributes.position, n = pos.count, idx = g.index.array;
  // vertices split along texture seams share a position: treat them as one point, or the seams open up
  const key = new Map(), same = new Int32Array(n);
  for (let v = 0; v < n; v++) { const k = `${pos.getX(v).toFixed(5)},${pos.getY(v).toFixed(5)},${pos.getZ(v).toFixed(5)}`; if (!key.has(k)) key.set(k, key.size); same[v] = key.get(k); }
  const m = key.size, nb = Array.from({ length: m }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) { const a = same[idx[i]], b = same[idx[i + 1]], c = same[idx[i + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  const list = nb.map((x, i) => [...x].filter(y => y !== i));
  let p = new Float32Array(m * 3), q = new Float32Array(m * 3);
  for (let v = 0; v < n; v++) { p[same[v] * 3] = pos.getX(v); p[same[v] * 3 + 1] = pos.getY(v); p[same[v] * 3 + 2] = pos.getZ(v); }   // getX undoes the file's quantisation
  for (let it = 0; it < 160; it++) {
    const k = it % 2 ? -.63 : .6;
    for (let v = 0; v < m; v++) {
      const L = list[v], o = v * 3; if (!L.length) { q[o] = p[o]; q[o + 1] = p[o + 1]; q[o + 2] = p[o + 2]; continue; }
      let x = 0, y = 0, z = 0; for (const w of L) { x += p[w * 3]; y += p[w * 3 + 1]; z += p[w * 3 + 2]; }
      const f = 1 / L.length;
      q[o] = p[o] + k * (x * f - p[o]); q[o + 1] = p[o + 1] + k * (y * f - p[o + 1]); q[o + 2] = p[o + 2] + k * (z * f - p[o + 2]);
    }
    [p, q] = [q, p];
  }
  // normals of the smoothed shape, summed over the welded points so the seams stay invisible
  const nrm = new Float32Array(m * 3), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    const a = same[idx[i]], b = same[idx[i + 1]], c = same[idx[i + 2]];
    A.fromArray(p, a * 3); B.fromArray(p, b * 3); C.fromArray(p, c * 3);
    C.sub(B); B.sub(A); C.cross(B);   // area-weighted face normal
    for (const x of [a, b, c]) { nrm[x * 3] += C.x; nrm[x * 3 + 1] += C.y; nrm[x * 3 + 2] += C.z; }
  }
  const out = new Float32Array(n * 3), outN = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const w = same[v] * 3; out.set(p.subarray(w, w + 3), v * 3);
    A.fromArray(nrm, w).normalize();
    // keep the file's winding: flip if it points against the original normal
    if (g.attributes.normal && A.x * g.attributes.normal.getX(v) + A.y * g.attributes.normal.getY(v) + A.z * g.attributes.normal.getZ(v) < 0) A.negate();
    A.toArray(outN, v * 3);
  }
  return [out, outN];
}

// ---- one person's body material: skin tone, clothes and shoes painted in the shader ----------------------
function personMaterial(kit, sex) {
  const [light, dark, normal] = kit.tex[sex];
  const m = new THREE.MeshStandardMaterial({ map: light, normalMap: normal, roughness: .62 });
  const u = m.userData.u = { darkMap: { value: dark }, tone: { value: 0 }, shirt: { value: new THREE.Color() }, trousers: { value: new THREE.Color() }, shoes: { value: new THREE.Color() }, sleeves: { value: 1 }, longLegs: { value: 1 } };
  u.inflate = { value: 0 }; u.smoothing = { value: .55 };
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    // clothes sit a little off the skin, so they hide the body's muscle lines
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 cover; attribute float shoe; attribute vec3 smoothPos, smoothNormal; uniform float inflate, sleeves, longLegs, smoothing; varying vec4 vCover; varying float vShoe;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvCover = cover; vShoe = shoe;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = normalize(mix(objectNormal, smoothNormal, smoothing * clamp(cover.x + cover.y + cover.z + cover.w, 0., 1.)));')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = mix(transformed, smoothPos, smoothing * clamp(cover.x + cover.y + cover.z + cover.w, 0., 1.));\ntransformed += objectNormal * inflate * clamp(cover.x + cover.y * sleeves + cover.z + cover.w * longLegs, 0., 1.);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D darkMap; uniform float tone, sleeves, longLegs; uniform vec3 shirt, trousers, shoes; varying vec4 vCover; varying float vShoe; float clothAmt;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 skin = mix(diffuseColor.rgb, texture2D(darkMap, vMapUv).rgb, tone);
        float topW = vCover.x + vCover.y * sleeves, botW = vCover.z + vCover.w * longLegs;
        clothAmt = smoothstep(.25, .6, topW + botW);
        vec3 garment = mix(trousers, shirt, smoothstep(-.12, .12, topW - botW));
        // a faint weave so cloth isn't flat paint
        float weave = .94 + .06 * sin(vMapUv.x * 900.) * sin(vMapUv.y * 900.);
        vec3 c = mix(skin, garment * weave, clothAmt);
        c = mix(c, shoes, smoothstep(.3, .7, vShoe));
        clothAmt = max(clothAmt, smoothstep(.3, .7, vShoe));
        diffuseColor.rgb = c;`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, clothAmt * .9));')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.55, .88, clothAmt);');
  };
  m.customProgramCacheKey = () => 'aw-person';
  return m;
}
function hairMaterial(kit, name) {
  return new THREE.MeshStandardMaterial({ map: kit.tex.hair[name] || kit.tex.hair.MI_Hair_1, color: 0xffffff, roughness: .55, side: THREE.DoubleSide, alphaTest: .4, transparent: false });
}

// ---- a full body, dressed and ready to animate -------------------------------------------------------------
export function buildBody(kit, look, dress) {
  const shape = look.child ? 'm' : look.sex;   // children all share one plain child's shape
  const B = kit.bodies[shape] || kit.bodies.m;
  const root = cloneSkinned(B.scene);
  let body = null; const bones = {}, brows = [];
  root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const mat = personMaterial(kit, shape);
  if (look.child) mat.userData.u.smoothing.value = 1;
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    const name = o.material?.name || '';
    if (o.geometry.attributes.cover) { body = o; o.material = mat; }
    else if (/Eye/i.test(name)) o.material = new THREE.MeshStandardMaterial({ map: kit.tex.eye, roughness: .2 });
    else { o.material = hairMaterial(kit, name); brows.push(o); }   // eyebrows share the hair material
  });
  // hair and beard: separate meshes rigged to the same skeleton, re-bound to this body's bones
  const addHair = name => {
    const src = kit.hairs[name]; if (!src) return null;
    let mesh = null; src.scene.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
    if (!mesh) return null;
    const h = new THREE.SkinnedMesh(mesh.geometry, hairMaterial(kit, mesh.material?.name));
    h.castShadow = true; h.frustumCulled = false;
    body.parent.add(h);
    h.bind(new THREE.Skeleton(mesh.skeleton.bones.map(b => bones[b.name]), mesh.skeleton.boneInverses), body.bindMatrix);
    return h;
  };
  const hairName = HAIR_STYLES[look.sex][look.hair % HAIR_STYLES[look.sex].length];
  const hair = look.baby ? null : addHair(hairName), beard = look.beard ? addHair('beard') : null;
  const scale = (1.72 / B.height) * look.size;
  const holder = new THREE.Group(); holder.add(root);
  root.scale.set(scale * look.build, scale, scale * look.build); root.position.y = -B.foot * scale;
  mat.userData.u.inflate.value = .012 / scale;
  // children aren't small adults: their heads are bigger for their bodies
  if (look.grow < 1 && bones.Head) bones.Head.scale.setScalar(1 + (1 - look.grow) * .55);
  // colours
  const u = mat.userData.u; u.tone.value = look.tone;
  const hc = new THREE.Color(HAIR_COLOURS[look.hairColour] ?? HAIR_COLOURS[2]).lerp(GREY, look.grey);
  for (const m of [hair, beard, ...brows]) if (m) m.material.color.copy(hc).multiplyScalar(2.2);
  const p = { holder, root, body, mat, mixer: new THREE.AnimationMixer(root), actions: new Map(), current: null, look };
  dressBody(p, dress);
  return p;
}
// a baby in arms: a wrapped blanket and a little head, in the baby's own skin tone
export function babyBundle(kit, look, blanket = 0xf1e6d6) {
  const g = new THREE.Group();
  const skin = new THREE.Color().lerpColors(new THREE.Color(0xe9c3a4), new THREE.Color(0x5a3a28), look.tone);
  const wrap = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .26, 4, 10), new THREE.MeshStandardMaterial({ color: blanket, roughness: .95 }));
  wrap.rotation.z = Math.PI / 2; g.add(wrap);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.075, 16, 12), new THREE.MeshStandardMaterial({ color: skin, roughness: .6 }));
  head.position.set(.2, .05, .02); g.add(head);
  for (const o of [wrap, head]) o.castShadow = true;
  return g;
}
export function dressBody(p, { outfit = 0x55606e, pants = 0x2d3142, shoes = 0x1b1b2f, sleeves = 1, longLegs = 1 } = {}) {
  const u = p.mat.userData.u;
  u.shirt.value.setHex(outfit); u.trousers.value.setHex(pants); u.shoes.value.setHex(shoes); u.sleeves.value = sleeves; u.longLegs.value = longLegs;
}
// play a clip, cross-fading from the last one
export function play(kit, p, name, fade = .25, speed = 1) {
  const clip = kit.clips.get(name) || kit.clips.get('Idle_Loop');
  if (p.current?.getClip() === clip) { p.current.timeScale = speed; return; }
  let a = p.actions.get(clip.name);
  if (!a) { a = p.mixer.clipAction(clip); p.actions.set(clip.name, a); }
  a.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1).fadeIn(fade).play();
  if (p.current) p.current.fadeOut(fade);
  p.current = a;
}

// ---- what each old pose becomes ------------------------------------------------------------------------
export function clipFor(pose, moving, sprinting, grounded, swimming, h) {
  if (swimming) return moving ? 'Swim_Fwd_Loop' : 'Swim_Fwd_Loop';
  if (pose === 'sit') return h?.activity === 'talk' || h?.activity === 'type' || h?.activity === 'eat' ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop';
  if (pose === 'phone' || h?.usingPhone) return 'Idle_TalkingPhone_Loop';
  if (pose === 'cpr') return 'Interact';
  if (h?.carrying) return 'Walk_Carry_Loop';
  if (!grounded) return 'Jog_Fwd_Loop';
  if (moving) return sprinting ? 'Sprint_Loop' : h?.hurry ? 'Jog_Fwd_Loop' : 'Walk_Loop';
  return h?.activity === 'talk' ? 'Idle_Talking_Loop' : h?.activity === 'wait' ? 'Idle_FoldArms_Loop' : 'Idle_Loop';
}

// ---- the manager: who gets a real body this frame --------------------------------------------------------
// camera: () => camera; lookOf(h) -> resident {look, age} | null; babyOf(resident) -> baby resident | null;
// budget() -> how many full bodies at once; near: metres
export function createPeople({ camera, lookOf = () => null, babyOf = () => null, budget = () => 24, near = 55 }) {
  const all = [];          // every humanoid that can have a real body
  const pool = { m: [], f: [] };
  let kit = null, failed = false;
  // anyone who isn't a resident (shop staff, officers on duty…) gets a steady look of their own
  let seq = 1;
  const seeded = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function adopt(h, opts) { h.realOpts = opts; h.realSeed = (seq++ * 2654435761) >>> 0; all.push(h); }
  function lookFor(h, c) {
    if (c?.look) return atAge(c.look, c.age);
    const look = h.realLook ||= makeLook(seeded(h.realSeed));
    const sk = h.realOpts.skin;   // the old figure's skin colour sets the tone
    if (sk != null && look.toneFrom !== sk) { const col = new THREE.Color(sk); look.tone = +clamp(1 - (col.r * .55 + col.g * .45) * 1.15 + .12, 0, 1).toFixed(2); look.toneFrom = sk; }
    return atAge(look, h.realOpts.child ? 9 : 34);
  }
  const key = l => `${l.sex}|${l.tone}|${l.hair}|${l.hairColour}|${l.beard}|${l.size.toFixed(2)}|${l.build}|${l.grey.toFixed(1)}|${l.child}`;
  function attach(h) {
    const c = lookOf(h), look = lookFor(h, c), k = key(look);
    let p = null; const bin = pool[look.sex];
    const i = bin.findIndex(x => x.key === k); if (i >= 0) p = bin.splice(i, 1)[0];
    if (!p) { p = buildBody(kit, look, {}); p.key = k; }
    const o = h.realOpts;
    dressBody(p, { outfit: o.outfit ?? 0x55606e, pants: o.pants ?? 0x2d3142, shoes: o.shoes ?? 0x1b1b2f, sleeves: o.sleeves ?? (look.sex === 'f' && (h.realSeed & 3) === 0 ? 0 : 1), longLegs: o.longLegs ?? 1 });
    // a resident is their own size; anyone else keeps the old figure's size (crowds of different heights)
    p.hs = c?.look ? 1 : h.rig.scale.y / (o.child ? .56 : .9);
    p.holder.scale.setScalar(p.hs);
    // a newborn's parent carries the baby
    const baby = c && !look.child ? babyOf(c) : null;
    if (baby?.look) { p.bundle = babyBundle(kit, atAge(baby.look, baby.age)); p.holder.add(p.bundle); }
    h.root.add(p.holder); h.rig.visible = false; h.real = p; p.current = null;
    pose(h, p);
    play(kit, p, clipFor(h.realPose, h.realMoving, h.realSprint, h.realGrounded !== false, h.realSwim, h), 0);
    p.mixer.update(Math.random() * 2);
  }
  function detach(h) {
    const p = h.real; if (!p) return;
    h.root.remove(p.holder); h.rig.visible = true; h.real = null; h.carrying = false;
    if (p.bundle) { p.holder.remove(p.bundle); p.bundle.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); p.bundle = null; }
    p.mixer.stopAllAction(); p.actions.clear(); p.current = null;
    const bin = pool[p.look.sex]; bin.push(p); if (bin.length > 12) { const old = bin.shift(); old.mat.dispose(); }
  }
  // where the body sits inside the old figure's frame: seated figures have their root .98 m below the seat,
  // and the sitting animation's seat is .44 m up and .3 m behind the feet
  function pose(h, p) {
    const sz = p.look.size * p.hs, sit = h.realPose === 'sit';
    if (sit) p.holder.position.set(0, (.98 - .44 * sz) / 1, .3 * sz); else p.holder.position.set(0, 0, 0);
    h.carrying = !!p.bundle && !sit;
    if (p.bundle) { if (sit) p.bundle.position.set(0, .56 * p.look.size, .3 * p.look.size); else p.bundle.position.set(0, 1.12 * p.look.size, .28 * p.look.size); }
  }
  const tmp = new THREE.Vector3(), camPos = new THREE.Vector3();
  let t = 0;
  function update(dt) {
    if (!kit) { if (!failed && !update.loading) { update.loading = true; loadPeopleKit().then(k => { kit = k; }).catch(e => { failed = true; console.warn('[people] real bodies unavailable, keeping the simple figures', e); }); } return; }
    t += dt;
    camera().getWorldPosition(camPos);
    // a few times a second, decide who is close enough to deserve a full body
    if (t > .25) {
      t = 0;
      const live = [];
      for (const h of all) {
        if (!h.root.parent) { if (h.real) detach(h); continue; }
        let vis = h.root.visible, o = h.root.parent; while (vis && o) { vis = o.visible; o = o.parent; }
        h.root.getWorldPosition(tmp); const d = tmp.distanceToSquared(camPos);
        if (vis && d < near * near) live.push([d, h]); else if (h.real) detach(h);
      }
      live.sort((a, b) => a[0] - b[0]);
      const n = budget();
      for (let i = 0; i < live.length; i++) { const h = live[i][1]; if (i < n) { if (!h.real) attach(h); } else if (h.real) detach(h); }
    }
    for (const h of all) if (h.real) {
      pose(h, h.real);
      const want = clipFor(h.realPose, h.realMoving, h.realSprint, h.realGrounded !== false, h.realSwim, h);
      play(kit, h.real, want, .25, 1);
      h.real.mixer.update(dt);
    }
  }
  // animateHumanoid tells us what the person is doing; we choose the clip
  function want(h, pose, moving, sprinting, grounded) { h.realPose = pose; h.realMoving = moving; h.realSprint = sprinting; h.realGrounded = grounded; }
  return { adopt, update, want, get ready() { return !!kit; }, get count() { return all.filter(h => h.real).length; }, kit: () => kit };
}
