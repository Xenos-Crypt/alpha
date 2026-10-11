/* tslint:disable */
/* eslint-disable */

/**
 * Returns [x, y, z, vx, vy, vz]
 */
export function advance_bridge_jump(x: number, y: number, z: number, vx: number, vy: number, vz: number, dt: number): Float64Array;

/**
 * Returns [impulse, aDelta, bDelta]
 */
export function collision_impulse(a_vx: number, a_vz: number, b_vx: number, b_vz: number, nx: number, nz: number, a_mass: number, b_mass: number, restitution: number): Float64Array;

export function impact_damage(delta_speed: number, scale: number): number;

/**
 * Returns [vx, vz, vy, x, y, z]
 */
export function launch_bridge_jump(speed: number, angle: number, heading: number, x: number, y: number, z: number): Float64Array;

/**
 * Returns [height, slope, side, edgeNorth, edgeSouth]; height is NaN when null.
 */
export function lift_bridge_surface(z: number, angle: number, base: number, start: number, end: number, thickness: number): Float64Array;

export function segment_distance(px: number, pz: number, sx: number, sz: number, ex: number, ez: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly advance_bridge_jump: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly collision_impulse: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly impact_damage: (a: number, b: number) => number;
    readonly launch_bridge_jump: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly lift_bridge_surface: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly segment_distance: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
