// Backed by the Rust/WebAssembly module in wasm-physics/ (built to wasm-physics/pkg/).
import init, { lift_bridge_surface, launch_bridge_jump, advance_bridge_jump } from './wasm-physics/pkg/wasm_physics.js';

let wasmBytes;
if (typeof window === 'undefined' && typeof document === 'undefined') {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  wasmBytes = await readFile(fileURLToPath(new URL('./wasm-physics/pkg/wasm_physics_bg.wasm', import.meta.url)));
}
await init(wasmBytes ? { module_or_path: wasmBytes } : undefined);

export const VEHICLE_GRAVITY = 9.81;

export function liftBridgeSurface(z, angle, base = .55, start = 400, end = 416, thickness = .6) {
  const [height, slope, side, edgeNorth, edgeSouth] = lift_bridge_surface(z, angle, base, start, end, thickness);
  return { height: Number.isNaN(height) ? null : height, slope, side, edgeNorth, edgeSouth };
}

export function launchBridgeJump(speed, angle, heading, x, y, z) {
  const [vx, vz, vy, nx, ny, nz] = launch_bridge_jump(speed, angle, heading, x, y, z);
  return { vx, vz, vy, x: nx, y: ny, z: nz };
}

export function advanceBridgeJump(state, dt) {
  const [x, y, z, vx, vy, vz] = advance_bridge_jump(state.x, state.y, state.z, state.vx, state.vy, state.vz, dt);
  state.x = x; state.y = y; state.z = z; state.vx = vx; state.vy = vy; state.vz = vz;
  return state;
}
