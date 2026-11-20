// SEASONS AND HOLIDAYS: the world follows the real calendar on the player's device.
// - Seasons change the weather (snow mostly in winter, more rain in autumn, none in summer) and the colour
//   of the leaves and grass (fresh in spring, golden-orange in autumn, frosted in winter).
// - Holidays dress the city: Christmas trees and lights, Valentine hearts, Easter eggs, Halloween pumpkins,
//   and fireworks on New Year's Eve and Bonfire Night. Everything is instanced so it costs very little.
// For testing, ?debug&date=2026-12-25 pretends it's that day.
import * as THREE from 'three';

// Easter Sunday (Anonymous Gregorian algorithm). Returns [month 1-12, day].
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1];
}

const dayOfYear = d => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);

// What the calendar says today: the season and any holidays in their decorating window.
export function calendar(d = new Date()) {
  const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
  const season = m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
  const on = (m0, d0, m1, d1) => { const a = m0 * 100 + d0, b = m1 * 100 + d1, x = m * 100 + day; return a <= b ? x >= a && x <= b : x >= a || x <= b; };
  const [em, ed] = easter(y), eDay = dayOfYear(new Date(y, em - 1, ed)), today = dayOfYear(d);
  const holidays = [];
  if (on(12, 1, 1, 6)) holidays.push('christmas');
  if (on(12, 31, 1, 1)) holidays.push('newyear');
  if (on(2, 7, 2, 14)) holidays.push('valentine');
  if (today >= eDay - 7 && today <= eDay + 1) holidays.push('easter');
  if (on(10, 20, 10, 31)) holidays.push('halloween');
  if (on(11, 4, 11, 6)) holidays.push('bonfire');
  return { season, holidays };
}

// Weather each season can bring, in the order it cycles.
export const SEASON_WEATHER = {
  winter: ['clear', 'snow', 'clear', 'rain', 'clear', 'snow'],
  spring: ['clear', 'rain', 'clear', 'clear'],
  summer: ['clear', 'clear', 'rain', 'clear'],
  autumn: ['clear', 'rain', 'clear', 'rain'],
};
// Leaf and grass tint: [r, g, b, how strongly]
export const SEASON_TINT = { spring: [0.55, 0.85, 0.35, 0.25], summer: [0, 0, 0, 0], autumn: [0.85, 0.45, 0.12, 0.7], winter: [0.82, 0.86, 0.85, 0.45] };

const GREETING = {
  christmas: '🎄 Christmas has come to the city: trees, lights and decorations are up.',
  newyear: '🎆 It\'s New Year: fireworks over the city tonight.',
  valentine: '💘 Valentine\'s week: hearts and roses are all over town.',
  easter: '🐣 Easter: look out for painted eggs in the gardens.',
  halloween: '🎃 Halloween: pumpkins glow on the doorsteps after dark.',
  bonfire: '🎇 Bonfire Night: fireworks light up the sky after dark.',
};

// Shared shader hook: tints only leafy (green) colours, so trunks and branches keep their colour.
export function seasonalFoliage(material, tint) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.call(material, sh, r);
    sh.uniforms.uSeasonTint = tint;
    sh.fragmentShader = 'uniform vec4 uSeasonTint;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float green = diffuseColor.g - max(diffuseColor.r, diffuseColor.b);
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, uSeasonTint.rgb * (0.55 + lum * 1.2), uSeasonTint.a * smoothstep(0.0, 0.08, green)); }`);
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => (key ? key() : '') + '|season';
  material.needsUpdate = true;
}

export function createSeasons(ctx) {
  const params = new URLSearchParams(location.search);
  const forced = params.has('debug') && params.get('date');
  const now = forced ? new Date(forced + 'T12:00:00') : new Date();
  const cal = calendar(now);
  const root = new THREE.Group(); root.name = 'seasonal decorations'; ctx.scene.add(root);
  const tint = ctx.tint;   // { value: Vector4 } shared with the tree and grass materials
  const t = SEASON_TINT[cal.season]; tint.value.set(t[0], t[1], t[2], t[3]);

  // ---- building blocks ----
  const unlit = c => new THREE.MeshBasicMaterial({ color: c });
  // many small glowing bulbs in one draw call, each with its own colour
  function bulbs(points, colors, size = 0.07) {
    if (!points.length) return null;
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), points.length);
    const o = new THREE.Object3D(), c = new THREE.Color();
    points.forEach((p, i) => { o.position.copy(p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(colors[i % colors.length])); });
    m.frustumCulled = false; root.add(m); twinkle.push(m); return m;
  }
  function instanced(geo, mat, places) {
    if (!places.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, places.length), o = new THREE.Object3D();
    places.forEach((p, i) => { o.position.set(p.x, p.y, p.z); o.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0); o.scale.setScalar(p.s || 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.frustumCulled = false; root.add(m); return m;
  }
  const twinkle = [];
  // lights wound round a lamp pole (4 m tall) or a tree
  const spiral = (x, y0, z, r, h, turns, n) => Array.from({ length: n }, (_, i) => { const f = i / n, a = f * turns * Math.PI * 2; return new THREE.Vector3(x + Math.cos(a) * r * (1 - f * 0.35), y0 + f * h, z + Math.sin(a) * r * (1 - f * 0.35)); });
  const lamps = ctx.lampSpots.filter((p, i) => i % 2 === 0);   // every other lamp: enough to feel festive, cheap to draw
  const base = p => (p.y || ctx.curb);
  const home = ctx.home, eaves = [];   // the home's roof edges, front and back
  for (const z of [home.z - 5.6, home.z + 5.6]) for (let x = home.x - 6.2; x <= home.x + 6.2; x += 0.45) eaves.push(new THREE.Vector3(x, ctx.curb + 2.98, z));
  const garden = ctx.gardenTrees || [];

  // a simple dressed fir: stacked cones, a star, baubles and lights
  function christmasTree(x, y, z, h) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const green = new THREE.MeshStandardMaterial({ color: 0x1f5a32, roughness: 0.9, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.04, h * 0.05, h * 0.15, 6), new THREE.MeshStandardMaterial({ color: 0x5a3b26 }));
    trunk.position.y = h * 0.07; g.add(trunk);
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.36 - i * 0.07), h * 0.34, 8), green); c.position.y = h * (0.28 + i * 0.18); c.castShadow = true; g.add(c); }
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(h * 0.05), unlit(0xffd54a)); star.position.y = h * 0.98; g.add(star);
    root.add(g);
    bulbs(spiral(x, y + h * 0.15, z, h * 0.33, h * 0.75, 5, Math.round(30 + h * 8)), [0xff3b30, 0xffd60a, 0x34c759, 0x0a84ff, 0xffffff], Math.max(0.04, h * 0.012));
    return g;
  }

  const live = cal.holidays;
  if (live.includes('christmas')) {
    bulbs(lamps.flatMap(p => spiral(p.x, base(p) + 0.4, p.z, 0.15, 3.4, 6, 22)), [0xff3b30, 0x34c759, 0xffd60a, 0xffffff], 0.05);   // every lamp's lights in one draw call
    bulbs(eaves, [0xff3b30, 0x34c759, 0xffd60a, 0x0a84ff, 0xffffff], 0.06);
    bulbs(garden.flatMap(tr => spiral(tr.x, ctx.curb + 2.2, tr.z, 1.9, 3.5, 4, 46)), [0xffd60a, 0xffffff, 0xff3b30]);
    if (ctx.livingCorner) christmasTree(ctx.livingCorner.x, ctx.curb, ctx.livingCorner.z, 2.1);   // the tree indoors
    christmasTree(home.x + 4.5, ctx.curb, home.minZ - 3.2, 3.2);                                   // and one in the front garden
    ctx.colliders?.push({ minX: home.x + 3.9, maxX: home.x + 5.1, minZ: home.minZ - 3.8, maxZ: home.minZ - 2.6 });
    // a wreath on the front door
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 14), new THREE.MeshStandardMaterial({ color: 0x1f5a32, roughness: 0.8 }));
    wreath.position.set(home.x - 0.5, ctx.curb + 1.6, home.minZ - 0.08); root.add(wreath);
    bulbs([0, 1, 2, 3, 4, 5].map(i => new THREE.Vector3(home.x - 0.5 + Math.cos(i) * 0.28, ctx.curb + 1.6 + Math.sin(i) * 0.28, home.minZ - 0.14)), [0xff3b30]);
  }
  if (live.includes('valentine')) {
    const heart = new THREE.Shape(); heart.moveTo(0, -0.5); heart.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.35); heart.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5);
    const heartGeo = new THREE.ExtrudeGeometry(heart, { depth: 0.08, bevelEnabled: false }); heartGeo.center();
    instanced(heartGeo, new THREE.MeshStandardMaterial({ color: 0xe0245e, emissive: 0x5a0a20, roughness: 0.5 }), lamps.map(p => ({ x: p.x, y: base(p) + 3.4, z: p.z + 0.12, s: 0.45 })));
    bulbs(lamps.flatMap(p => spiral(p.x, base(p) + 0.4, p.z, 0.15, 2.8, 5, 16)), [0xff2d55, 0xff9ec1, 0xffffff], 0.05);
    bulbs(eaves, [0xff2d55, 0xff9ec1], 0.06);
    instanced(heartGeo, new THREE.MeshStandardMaterial({ color: 0xff2d55, roughness: 0.5 }), [{ x: home.x - 0.5, y: ctx.curb + 1.6, z: home.minZ - 0.1, s: 0.55 }]);
  }
  if (live.includes('halloween')) {
    const pumpkinGeo = new THREE.SphereGeometry(0.32, 10, 7); pumpkinGeo.scale(1, 0.78, 1);
    const spots = [{ x: home.x - 1.6, y: ctx.curb + 0.25, z: home.minZ - 0.7 }, { x: home.x + 1.6, y: ctx.curb + 0.25, z: home.minZ - 0.7 },
      ...lamps.filter((p, i) => i % 2 === 0).map(p => ({ x: p.x + 0.45, y: base(p) + 0.25, z: p.z, ry: p.x }))];
    instanced(pumpkinGeo, new THREE.MeshStandardMaterial({ color: 0xe0701a, emissive: 0x6a2a00, roughness: 0.7 }), spots);
    bulbs(spots.map(s => new THREE.Vector3(s.x, s.y + 0.02, s.z)), [0xffa31a], 0.12);   // the candle glow inside
    bulbs(eaves, [0xff8c1a, 0x9b59ff], 0.06);
  }
  if (live.includes('easter')) {
    const egg = new THREE.SphereGeometry(0.12, 8, 6); egg.scale(1, 1.3, 1);
    const pastel = [0xffb3c7, 0xb3e5ff, 0xfff3b0, 0xc8f7c5, 0xe0c3ff];
    const eggs = []; let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const tr of garden) for (let i = 0; i < 6; i++) eggs.push({ x: tr.x + (r() - 0.5) * 4, y: ctx.curb + 0.13, z: tr.z + (r() - 0.5) * 4, rz: (r() - 0.5) * 0.6 });
    for (const p of lamps.filter((q, i) => i % 3 === 0)) eggs.push({ x: p.x + 0.5, y: base(p) + 0.13, z: p.z + 0.3, rz: 0.3 });
    pastel.forEach((c, k) => instanced(egg, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }), eggs.filter((e, i) => i % pastel.length === k)));
    bulbs(eaves, pastel, 0.05);
  }

  // fireworks after dark on New Year's Eve and Bonfire Night
  const fireworks = live.includes('newyear') || live.includes('bonfire');
  let nextBurst = 2;
  if (live.length) setTimeout(() => ctx.toast(GREETING[live[0]]), 4000);

  return {
    calendar: cal,
    weatherCycle: SEASON_WEATHER[cal.season],
    update(dt, night) {
      // lights glow brighter at night and gently twinkle
      const k = night ? 1 : 0.55, tw = performance.now() / 600;
      for (let i = 0; i < twinkle.length; i++) twinkle[i].material.color.setScalar(k * (0.85 + 0.15 * Math.sin(tw + i)));
      if (fireworks && night) {
        nextBurst -= dt;
        if (nextBurst <= 0) {
          nextBurst = 1.2 + Math.random() * 2.5;
          const p = ctx.playerPos(), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
          const at = new THREE.Vector3(p.x + Math.cos(a) * d, ctx.curb + 45 + Math.random() * 30, p.z + Math.sin(a) * d);
          ctx.burst(at, [0xff3b30, 0xffd60a, 0x34c759, 0x0a84ff, 0xff2d55, 0xffffff][Math.floor(Math.random() * 6)]);
        }
      }
    },
  };
}
