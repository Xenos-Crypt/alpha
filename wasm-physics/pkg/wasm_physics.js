/* @ts-self-types="./wasm_physics.d.ts" */

/**
 * Returns [x, y, z, vx, vy, vz]
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} vx
 * @param {number} vy
 * @param {number} vz
 * @param {number} dt
 * @returns {Float64Array}
 */
export function advance_bridge_jump(x, y, z, vx, vy, vz, dt) {
    const ret = wasm.advance_bridge_jump(x, y, z, vx, vy, vz, dt);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
}

/**
 * Returns [impulse, aDelta, bDelta]
 * @param {number} a_vx
 * @param {number} a_vz
 * @param {number} b_vx
 * @param {number} b_vz
 * @param {number} nx
 * @param {number} nz
 * @param {number} a_mass
 * @param {number} b_mass
 * @param {number} restitution
 * @returns {Float64Array}
 */
export function collision_impulse(a_vx, a_vz, b_vx, b_vz, nx, nz, a_mass, b_mass, restitution) {
    const ret = wasm.collision_impulse(a_vx, a_vz, b_vx, b_vz, nx, nz, a_mass, b_mass, restitution);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
}

/**
 * @param {number} delta_speed
 * @param {number} scale
 * @returns {number}
 */
export function impact_damage(delta_speed, scale) {
    const ret = wasm.impact_damage(delta_speed, scale);
    return ret;
}

/**
 * Returns [vx, vz, vy, x, y, z]
 * @param {number} speed
 * @param {number} angle
 * @param {number} heading
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Float64Array}
 */
export function launch_bridge_jump(speed, angle, heading, x, y, z) {
    const ret = wasm.launch_bridge_jump(speed, angle, heading, x, y, z);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
}

/**
 * Returns [height, slope, side, edgeNorth, edgeSouth]; height is NaN when null.
 * @param {number} z
 * @param {number} angle
 * @param {number} base
 * @param {number} start
 * @param {number} end
 * @param {number} thickness
 * @returns {Float64Array}
 */
export function lift_bridge_surface(z, angle, base, start, end, thickness) {
    const ret = wasm.lift_bridge_surface(z, angle, base, start, end, thickness);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
}

/**
 * @param {number} px
 * @param {number} pz
 * @param {number} sx
 * @param {number} sz
 * @param {number} ex
 * @param {number} ez
 * @returns {number}
 */
export function segment_distance(px, pz, sx, sz, ex, ez) {
    const ret = wasm.segment_distance(px, pz, sx, sz, ex, ez);
    return ret;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./wasm_physics_bg.js": import0,
    };
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('wasm_physics_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
