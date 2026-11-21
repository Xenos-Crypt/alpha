// DEVICE PROFILE: what this computer or phone can handle, so the game picks graphics that suit it.
//
// Laptops differ a lot: a gaming laptop with an NVIDIA card, a MacBook, and an office laptop with Intel UHD
// graphics all run the same game very differently. At start-up we look at the graphics chip (its name, from
// WebGL), the number of processor cores, the memory and the screen size, and pick a starting quality:
//   software rendering (no GPU)             -> low
//   older Intel HD/UHD, phones' small GPUs  -> low
//   Intel Iris / Xe, AMD Radeon (APU), Apple M-series base, newer phone GPUs -> medium
//   NVIDIA GeForce / RTX, AMD Radeon RX, Apple M Pro / Max / Ultra -> high (ultra on the strongest)
// The game then keeps watching the frame rate and moves the quality down (or back up, never above what the
// device can handle) while you play. Settings > Graphics still lets you choose yourself; that always wins.
const ORDER = ['low', 'medium', 'high', 'ultra'];

export function profileDevice(gl) {
  let gpu = '';
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch { }
  const g = gpu.toLowerCase(), cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 8;
  const touch = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
  const pixels = screen.width * screen.height * (devicePixelRatio || 1) ** 2;
  let tier, why;
  if (/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(g)) { tier = 'low'; why = 'no graphics card (software rendering)'; }
  else if (/rtx\s*[34]0[789]0|rtx\s*[34]090|radeon rx\s*[67]9|apple m\d (max|ultra)/.test(g)) { tier = 'ultra'; why = 'a powerful graphics card'; }
  else if (/nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|apple m\d (pro|max|ultra)|arc a\d/.test(g)) { tier = 'high'; why = 'a dedicated graphics card'; }
  else if (/iris|xe graphics|apple m\d|apple gpu|radeon(\(tm\))? graphics|radeon vega|adreno.*(7\d\d|6[5-9]\d)|mali-g7\d|mali-g6[1-9]/.test(g)) { tier = 'medium'; why = 'built-in graphics (a good one)'; }
  else if (/intel|uhd|hd graphics|mali|adreno|powervr|videocore/.test(g)) { tier = 'low'; why = 'built-in graphics'; }
  else { tier = touch ? 'low' : 'medium'; why = 'an unknown graphics chip'; }
  // little memory or few cores holds it back; phones start no higher than medium
  if ((mem <= 4 || cores <= 4) && tier !== 'low') { tier = ORDER[Math.max(0, ORDER.indexOf(tier) - 1)]; why += ', few cores or little memory'; }
  if (touch && ORDER.indexOf(tier) > 1) tier = 'medium';
  // a sharp screen (4K laptop) on a modest chip: cap the pixel ratio so we don't draw millions of pixels it can't keep up with
  const maxPixelRatio = tier === 'low' ? Math.min(1, Math.sqrt(2.2e6 / Math.max(1, screen.width * screen.height))) : tier === 'medium' ? Math.min(1.5, Math.sqrt(4e6 / Math.max(1, screen.width * screen.height))) : 2;
  return { gpu, cores, mem, touch, pixels, tier, why, maxPixelRatio, cap: tier === 'ultra' ? 'ultra' : ORDER[Math.min(3, ORDER.indexOf(tier) + 1)] };
}

// Watches the frame time and suggests a step down when the game is slow for a while, or a step up when it has
// been comfortably fast for a long while (up to the device's cap). Returns the new level or null.
export function createQualityGovernor(profile) {
  let slow = 0, fast = 0, cooldown = 0;
  return {
    frame(ms, level) {
      cooldown = Math.max(0, cooldown - ms);
      if (ms > 40) { slow += Math.min(ms, 250); fast = 0; } else { slow = Math.max(0, slow - 60); if (ms < 22) fast += ms; else fast = Math.max(0, fast - ms); }
      const i = ORDER.indexOf(level);
      if (slow > 3500 && i > 0 && cooldown <= 0) { slow = 0; fast = 0; cooldown = 8000; return ORDER[i - 1]; }
      if (fast > 30000 && i < ORDER.indexOf(profile.cap) && cooldown <= 0) { fast = 0; cooldown = 20000; return ORDER[i + 1]; }
      return null;
    },
  };
}

// THE OPTIMISER: tunes the whole game, not just the picture. Every frame it times the game's own work (moving
// people, cars, the city, every system) and the drawing, separately. When the game's work is what makes frames
// late (a busy city, a weak processor), it eases the load where you won't notice:
//   - background systems (far-off districts, wildlife, the economy, news, weather, map records...) run every
//     2nd, 3rd or 4th frame instead of every frame, each catching up on the time it skipped; the things you
//     touch (you, your vehicle, doors, lifts, rides, trains, enemies, shots) always run every frame
//   - fewer close-up detailed people and grass clumps, and shadows redrawn less often
// When the drawing is what's slow, the graphics side (quality level, render resolution, view distance) eases
// instead. As soon as there's room again it all steps back up, so a strong machine runs everything at full rate.
export function createOptimiser(profile) {
  const MAX = 3;
  let level = profile.cores <= 2 || profile.mem <= 2 ? 2 : profile.cores <= 4 || profile.mem <= 4 ? 1 : 0;
  let sim = 4, draw = 4, frame = 16.7, judge = 0, calm = 0, spikes = 0, frameNo = 0;
  const acc = new Map(), slot = new Map();
  return {
    get level() { return level; },
    get stride() { return level + 1; },
    get crowd() { return [1, 0.8, 0.62, 0.45][level]; },          // share of detailed people and grass clumps
    get shadowEvery() { return [2, 2, 3, 4][level]; },             // redraw the shadows every N frames
    get cpuHeavy() { return sim + draw > 11; },                     // the game's own work, not the drawing, is the slow part
    get stats() { return { level, simMs: +sim.toFixed(1), drawMs: +draw.toFixed(1), frameMs: +frame.toFixed(1) }; },
    beginFrame() { frameNo++; },
    force(l) { level = Math.max(0, Math.min(MAX, l)); },   // (for testing)
    // run a background system: every `stride` frames, with all the time since its last run (never more than 0.25 s)
    run(key, dt, fn) {
      let s = slot.get(key); if (s == null) { s = slot.size; slot.set(key, s); }
      const a = (acc.get(key) || 0) + dt, stride = level + 1;
      if (stride > 1 && frameNo % stride !== s % stride) { acc.set(key, a); return; }
      acc.set(key, 0); fn(Math.min(a, 0.25));
    },
    // feed one frame's timings (ms); `active` while actually playing
    sample(simMs, drawMs, frameMs, dt, active) {
      if (!active) { judge = calm = spikes = 0; return; }
      const k = 0.06; sim += (simMs - sim) * k; draw += (drawMs - draw) * k; frame += (Math.min(frameMs, 200) - frame) * k;
      if (frameMs > 55) spikes++;
      judge += dt;
      if (judge < 2) return;
      judge = 0;
      const cpuBound = sim + draw > 11 && frame > 19, hitches = spikes >= 6;
      spikes = 0;
      if ((cpuBound || hitches) && level < MAX) { level++; calm = 0; return; }
      if (sim + draw < 7 && frame < 17.5) { if ((calm += 2) >= 10 && level > 0) { level--; calm = 0; } }
      else calm = 0;
    },
  };
}
