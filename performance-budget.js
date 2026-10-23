// Frame-budget manager: keeps the GPU/CPU cost of the very large world bounded on
// both phones and desktops without changing any gameplay code.
//
// 1. Light pool   — the world contains dozens of point lights (lamps, metro, sewers,
//    caves). Forward rendering pays for every visible light on every pixel, and
//    toggling one recompiles every shader. Source lights are moved to a hidden layer
//    and a fixed pool of proxy lights copies the nearest active ones, so the light
//    count (and therefore the shader set) never changes while playing.
// 2. Detail culling — small meshes stop drawing past a distance that scales with
//    their size and the graphics preset. Uses layers, never `visible`, so game logic
//    that hides/shows objects keeps working unchanged.
// 3. View distance — fog end and camera far plane follow the preset; the sky dome,
//    sun and moon are scaled to stay inside the far plane.
// 4. Dynamic resolution — if frames stay slow the render scale drops a step, and it
//    recovers when there is headroom again.
export const HIDDEN_LAYER = 31;
const DETAIL_BIT = 1; // layer 0

export const QUALITY_BUDGET = {
  low:    { lights: 2, detail: 0.75, view: 300, minScale: 0.6 },
  medium: { lights: 4, detail: 1.15, view: 420, minScale: 0.7 },
  high:   { lights: 6, detail: 1.7,  view: 560, minScale: 0.8 },
  ultra:  { lights: 8, detail: 2.6,  view: 760, minScale: 0.9 },
};

// Max draw distance (m) for a mesh of bounding radius r at detail multiplier k.
export function detailDistance(r, k) {
  if (r >= 12) return Infinity;
  return (45 + r * 34) * k;
}

export function createPerformanceBudget({ THREE, scene, camera, renderer, mobile = false, exclude = [], keepLights = [] }) {
  const sources = [];               // registered source lights
  const known = new WeakSet();
  const keep = new Set(keepLights);
  const proxies = [];
  let quality = 'medium';
  let budget = QUALITY_BUDGET.medium;
  const tmp = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const excluded = new Set(exclude);

  // ---------- light pool ----------
  function setProxyCount(n) {
    while (proxies.length < n) {
      const p = new THREE.PointLight(0xffffff, 0, 10, 2);
      p.userData.budgetProxy = true;
      known.add(p);
      scene.add(p);
      proxies.push(p);
    }
    while (proxies.length > n) proxies.pop().removeFromParent();
  }
  function registerLights() {
    scene.traverse(o => {
      if (!o.isPointLight || known.has(o) || keep.has(o)) return;
      known.add(o);
      o.layers.set(HIDDEN_LAYER); // still writable by game code, never rendered directly
      sources.push(o);
    });
  }
  function effectivelyOn(l) {
    if (!l.visible || !(l.intensity > 0)) return false;
    for (let p = l.parent; p; p = p.parent) { if (!p.visible) return false; if (p === scene) return true; }
    return false; // detached from the scene
  }
  const picks = [];
  function updateLights() {
    picks.length = 0;
    for (let i = sources.length - 1; i >= 0; i--) {
      const l = sources[i];
      if (!l.parent) { sources.splice(i, 1); continue; }
      if (!effectivelyOn(l)) continue;
      l.getWorldPosition(tmp);
      const reach = l.distance || 40;
      const d = tmp.distanceTo(camPos);
      if (d > reach + 70) continue;
      picks.push({ l, score: d - reach * 0.6, x: tmp.x, y: tmp.y, z: tmp.z });
    }
    picks.sort((a, b) => a.score - b.score);
    for (let i = 0; i < proxies.length; i++) {
      const p = proxies[i], s = picks[i];
      if (!s) { p.intensity = 0; continue; }
      p.position.set(s.x, s.y, s.z);
      p.color.copy(s.l.color);
      p.intensity = s.l.intensity;
      p.distance = s.l.distance;
      p.decay = s.l.decay;
    }
  }

  // ---------- detail culling ----------
  let detail = [];                  // {m, r}
  const tracked = new WeakSet();
  const scaleV = new THREE.Vector3();
  function isExcluded(o) {
    for (let p = o; p; p = p.parent) {
      if (excluded.has(p) || p.isCamera || p.userData?.noCull) return true;
    }
    return false;
  }
  function registerMeshes() {
    scene.updateMatrixWorld();
    scene.traverse(o => {
      if (!o.isMesh || tracked.has(o)) return;
      tracked.add(o);
      if (o.isInstancedMesh || o.frustumCulled === false) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (mat && mat.fog === false) return;
      if (isExcluded(o)) return;
      const g = o.geometry;
      if (!g) return;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere) return;
      scaleV.setFromMatrixScale(o.matrixWorld);
      const r = g.boundingSphere.radius * Math.max(scaleV.x, scaleV.y, scaleV.z);
      if (!(r < 12)) return;
      detail.push({ m: o, r, cx: g.boundingSphere.center.x, cy: g.boundingSphere.center.y, cz: g.boundingSphere.center.z });
    });
  }
  let cursor = 0;
  function updateDetail(slices) {
    const n = detail.length;
    if (!n) return;
    const per = Math.ceil(n / slices);
    const k = budget.detail * (mobile ? 0.85 : 1);
    let removed = false;
    for (let i = 0; i < per; i++) {
      if (cursor >= detail.length) cursor = 0;
      const e = detail[cursor++];
      const m = e.m;
      if (!m.parent) { e.dead = true; removed = true; continue; }
      const me = m.matrixWorld.elements;
      const dx = me[12] - camPos.x, dy = me[13] - camPos.y, dz = me[14] - camPos.z;
      const lim = detailDistance(e.r, k);
      const near = dx * dx + dy * dy + dz * dz < lim * lim;
      if (near) m.layers.mask |= DETAIL_BIT; else m.layers.mask &= ~DETAIL_BIT;
    }
    if (removed) detail = detail.filter(e => !e.dead);
  }
  function showAllDetail() { for (const e of detail) e.m.layers.mask |= DETAIL_BIT; }

  // ---------- view distance ----------
  let sky = null, celestial = [];
  function attachSky(skyMesh, discs) { sky = skyMesh; celestial = discs; }
  function applyViewDistance() {
    const fog = scene.fog;
    if (fog && fog.far > budget.view) { fog.far = budget.view; fog.near = Math.min(fog.near, budget.view * 0.45); }
    const far = Math.min(1000, Math.max(120, (fog ? fog.far : budget.view) + 25));
    if (Math.abs(camera.far - far) > 1) { camera.far = far; camera.updateProjectionMatrix(); }
    if (sky) sky.scale.setScalar(Math.min(1, (far * 0.92) / 450));
    return far;
  }
  // distance for sun/moon placement so they never clip the far plane
  const celestialDistance = () => Math.min(400, camera.far * 0.85);

  // ---------- dynamic resolution ----------
  let basePixelRatio = renderer.getPixelRatio();
  let scale = 1, slowTime = 0, fastTime = 0, lastChange = 0;
  const MIN_PIXEL_RATIO = 0.6; // below this the image turns to mush; never go lower
  function setBasePixelRatio(pr) { basePixelRatio = pr; scale = 1; renderer.setPixelRatio(pr); }
  function applyScale(next) {
    const pr = Math.max(MIN_PIXEL_RATIO, basePixelRatio * next);
    if (Math.abs(pr - renderer.getPixelRatio()) < 0.01) return false;
    scale = next; renderer.setPixelRatio(pr); lastChange = performance.now(); return true;
  }
  function updateResolution(frameMs, active) {
    if (!active) { slowTime = fastTime = 0; return; }
    if (performance.now() - lastChange < 4000) return; // let each change settle before judging it
    if (frameMs > 40) { slowTime += Math.min(frameMs, 100); fastTime = 0; }
    else if (frameMs < 22) { fastTime += frameMs; slowTime = Math.max(0, slowTime - frameMs); }
    if (slowTime > 2000 && scale > budget.minScale) {
      slowTime = 0;
      if (!applyScale(Math.max(budget.minScale, scale - 0.1))) scale = budget.minScale;
    } else if (fastTime > 8000 && scale < 1) {
      fastTime = 0; applyScale(Math.min(1, scale + 0.1));
    }
  }

  // ---------- public ----------
  let scanTimer = 0, lightTimer = 0, started = false;
  function start() {
    started = true;
    registerLights();
    registerMeshes();
    setProxyCount(budget.lights);
  }
  function setQuality(q) {
    quality = QUALITY_BUDGET[q] ? q : 'medium';
    budget = QUALITY_BUDGET[quality];
    if (started) { setProxyCount(budget.lights); showAllDetail(); }
  }
  function update(dt, frameMs, active) {
    if (!started) return;
    camera.getWorldPosition(camPos);
    scanTimer += dt; lightTimer += dt;
    if (scanTimer > 3) { scanTimer = 0; registerLights(); registerMeshes(); }
    if (lightTimer > 0.2) { lightTimer = 0; updateLights(); }
    updateDetail(10);
    updateResolution(frameMs, active);
  }
  return {
    start, update, setQuality, setBasePixelRatio, attachSky, applyViewDistance, celestialDistance,
    get stats() { return { sources: sources.length, proxies: proxies.length, detail: detail.length, scale, quality }; },
  };
}
