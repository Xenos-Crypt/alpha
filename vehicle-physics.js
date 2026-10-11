// Game-scale impact calculations; speeds are metres per second, masses kilograms.
// Backed by the Rust/WebAssembly module in wasm-physics/ (built to wasm-physics/pkg/).
import init, { impact_damage, segment_distance, collision_impulse } from './wasm-physics/pkg/wasm_physics.js';

let wasmBytes;
if (typeof window === 'undefined' && typeof document === 'undefined') {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  wasmBytes = await readFile(fileURLToPath(new URL('./wasm-physics/pkg/wasm_physics_bg.wasm', import.meta.url)));
}
await init(wasmBytes ? { module_or_path: wasmBytes } : undefined);

export function impactDamage(deltaSpeed, scale = 0.32) {
  return impact_damage(deltaSpeed, scale);
}
export function segmentDistance(point, start, end) {
  return segment_distance(point.x, point.z, start.x, start.z, end.x, end.z);
}
export function collisionImpulse(aVelocity, bVelocity, normal, aMass, bMass, restitution = 0.08) {
  const [impulse, aDelta, bDelta] = collision_impulse(
    aVelocity.x, aVelocity.z, bVelocity.x, bVelocity.z, normal.x, normal.z, aMass, bMass, restitution
  );
  return { impulse, aDelta, bDelta };
}
