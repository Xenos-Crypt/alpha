// Patterned floors so rooms aren't flat single-colour slabs: wooden boards, ceramic tiles, chequered
// tiles, carpet, marble, stone flags, parquet, terracotta and dark tech tiles. Each texture is drawn
// once per (kind, colour) and tiled to the floor's size in metres.
import * as THREE from 'three';

const cache = new Map();
const hex = c => '#' + c.toString(16).padStart(6, '0');
const shade = (c, k) => { const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * k)), g = Math.min(255, Math.max(0, ((c >> 8) & 255) * k)), b = Math.min(255, Math.max(0, (c & 255) * k)); return `rgb(${r | 0},${g | 0},${b | 0})`; };
// metres covered by one copy of each texture
const TILE_M = { wood: 2, tiles: 1.2, checker: 1.2, carpet: 2, marble: 2.4, stone: 2.4, parquet: 1.6, terracotta: 1.2, tech: 1.6 };

// Textures are drawn once per kind in light neutral tones and tinted by the material colour, so the
// whole game shares nine small floor textures.
export function floorTexture(makeTex, kind, _base, w = 4, d = 4) {
  const base = kind === 'tech' ? 0x3a4250 : 0xdedede;
  const key = kind;
  let t = cache.get(key);
  if (!t) {
    t = makeTex(128, 128, g => {
      g.scale(0.5, 0.5); const S = 256;   // drawn at 256 px, stored at 128
      g.fillStyle = hex(base); g.fillRect(0, 0, S, S);
      if (kind === 'wood') {
        for (let i = 0; i < 8; i++) { const y = i * 32; g.fillStyle = shade(base, 0.86 + ((i * 37) % 7) * 0.04); g.fillRect(0, y, S, 31); const off = (i * 97) % S; g.fillStyle = shade(base, 0.62); g.fillRect(off, y, 2, 31); g.fillRect((off + 128) % S, y, 2, 31);
          for (let k = 0; k < 6; k++) { g.strokeStyle = shade(base, 0.78); g.lineWidth = 1; g.beginPath(); g.moveTo(0, y + 5 + k * 4); g.bezierCurveTo(80, y + 3 + k * 4, 170, y + 8 + k * 4, S, y + 5 + k * 4); g.stroke(); } g.fillStyle = shade(base, 0.55); g.fillRect(0, y + 31, S, 1); }
      } else if (kind === 'tiles' || kind === 'terracotta' || kind === 'tech') {
        const n = kind === 'tech' ? 2 : 4, s = S / n;
        for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { g.fillStyle = shade(base, 0.93 + ((i * 3 + k * 5) % 4) * 0.035); g.fillRect(i * s + 2, k * s + 2, s - 4, s - 4); }
        g.fillStyle = kind === 'terracotta' ? '#d9cbb3' : kind === 'tech' ? '#3fb6ff' : shade(base, 0.7);
        for (let i = 0; i <= n; i++) { g.fillRect(i * s - 2, 0, 3, S); g.fillRect(0, i * s - 2, S, 3); }
        if (kind === 'tech') { g.globalAlpha = 0.25; g.fillRect(S / 4, S / 4, S / 2, 2); g.globalAlpha = 1; }
      } else if (kind === 'checker') {
        const s = S / 4; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { g.fillStyle = (i + k) % 2 ? shade(base, 0.45) : shade(base, 1.08); g.fillRect(i * s, k * s, s, s); }
        g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i <= 4; i++) { g.fillRect(i * s - 1, 0, 2, S); g.fillRect(0, i * s - 1, S, 2); }
      } else if (kind === 'carpet') {
        for (let i = 0; i < 4000; i++) { g.fillStyle = shade(base, 0.85 + Math.random() * 0.3); g.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
        g.strokeStyle = shade(base, 0.75); g.lineWidth = 3; for (let i = 0; i < S; i += 64) { g.strokeRect(i + 8, 8, 48, S - 16); }
        g.fillStyle = shade(base, 1.2); for (let i = 0; i < S; i += 64) for (let k = 0; k < S; k += 64) { g.beginPath(); g.arc(i + 32, k + 32, 6, 0, Math.PI * 2); g.fill(); }
      } else if (kind === 'marble') {
        const s = S / 2; for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) { g.fillStyle = shade(base, 0.96 + ((i + k) % 2) * 0.06); g.fillRect(i * s, k * s, s, s); }
        for (let v = 0; v < 14; v++) { g.strokeStyle = `rgba(80,80,90,${0.08 + Math.random() * 0.15})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * S, y = 0; g.moveTo(x, y); while (y < S) { x += (Math.random() - 0.5) * 40; y += 20 + Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
        g.fillStyle = shade(base, 0.75); g.fillRect(0, s - 1, S, 2); g.fillRect(s - 1, 0, 2, S);
      } else if (kind === 'stone') {
        for (let row = 0; row < 4; row++) { let x = -((row * 41) % 60); while (x < S) { const w = 50 + ((x * 7 + row * 13) & 31); g.fillStyle = shade(base, 0.85 + ((x + row) % 5) * 0.05); g.fillRect(x + 2, row * 64 + 2, w - 4, 60); x += w; } }
      } else if (kind === 'parquet') {
        const s = 32; for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) { g.fillStyle = shade(base, 0.85 + ((i + k) % 3) * 0.08); if ((i + k) % 2) { for (let j = 0; j < 4; j++) g.fillRect(i * s + j * 8 + 1, k * s + 1, 6, s - 2); } else { for (let j = 0; j < 4; j++) g.fillRect(i * s + 1, k * s + j * 8 + 1, s - 2, 6); } }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; cache.set(key, t);
  }
  const c = t.clone(); c.needsUpdate = true; const m = TILE_M[kind] || 2; c.repeat.set(Math.max(1, w / m), Math.max(1, d / m)); return c;
}
export function floorMaterial(makeTex, kind, base, w, d, rough = kind === 'marble' || kind === 'tiles' || kind === 'checker' ? 0.35 : 0.8) {
  const tint = kind === 'tech' ? new THREE.Color(0xc4cddc) : new THREE.Color(base).multiplyScalar(1.12);
  return new THREE.MeshStandardMaterial({ map: floorTexture(makeTex, kind, base, w, d), color: tint, roughness: rough });
}
