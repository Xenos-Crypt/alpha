use wasm_bindgen::prelude::*;

const VEHICLE_GRAVITY: f64 = 9.81;

#[wasm_bindgen]
pub fn impact_damage(delta_speed: f64, scale: f64) -> f64 {
    (delta_speed - 2.0).max(0.0).powi(2) * scale
}

#[wasm_bindgen]
pub fn segment_distance(px: f64, pz: f64, sx: f64, sz: f64, ex: f64, ez: f64) -> f64 {
    let dx = ex - sx;
    let dz = ez - sz;
    let denom = dx * dx + dz * dz;
    let denom = if denom == 0.0 { 1.0 } else { denom };
    let t = (((px - sx) * dx + (pz - sz) * dz) / denom).clamp(0.0, 1.0);
    ((px - sx - t * dx).powi(2) + (pz - sz - t * dz).powi(2)).sqrt()
}

/// Returns [impulse, aDelta, bDelta]
#[wasm_bindgen]
pub fn collision_impulse(
    a_vx: f64,
    a_vz: f64,
    b_vx: f64,
    b_vz: f64,
    nx: f64,
    nz: f64,
    a_mass: f64,
    b_mass: f64,
    restitution: f64,
) -> Vec<f64> {
    let closing = -((a_vx - b_vx) * nx + (a_vz - b_vz) * nz);
    if closing <= 0.0 {
        return vec![0.0, 0.0, 0.0];
    }
    let impulse = (1.0 + restitution) * closing / (1.0 / a_mass + 1.0 / b_mass);
    vec![impulse, impulse / a_mass, impulse / b_mass]
}

/// Returns [height, slope, side, edgeNorth, edgeSouth]; height is NaN when null.
#[wasm_bindgen]
pub fn lift_bridge_surface(
    z: f64,
    angle: f64,
    base: f64,
    start: f64,
    end: f64,
    thickness: f64,
) -> Vec<f64> {
    if z < start || z > end {
        return vec![base, 0.0, 0.0, f64::NAN, f64::NAN];
    }
    let half = (end - start) / 2.0;
    let c = angle.cos();
    let s = angle.sin();
    let edge_north = start + half * c - thickness * 0.5 * s;
    let edge_south = end - half * c + thickness * 0.5 * s;

    if angle < 0.001 {
        return vec![base, 0.0, 0.0, edge_north, edge_south];
    }
    if z <= edge_north {
        let height = base - thickness / 2.0 + (z - start) * angle.tan() + thickness / (2.0 * c);
        return vec![height, angle.tan(), 1.0, edge_north, edge_south];
    }
    if z >= edge_south {
        let height = base - thickness / 2.0 + (end - z) * angle.tan() + thickness / (2.0 * c);
        return vec![height, -angle.tan(), -1.0, edge_north, edge_south];
    }
    vec![f64::NAN, 0.0, 0.0, edge_north, edge_south]
}

/// Returns [vx, vz, vy, x, y, z]
#[wasm_bindgen]
pub fn launch_bridge_jump(
    speed: f64,
    angle: f64,
    heading: f64,
    x: f64,
    y: f64,
    z: f64,
) -> Vec<f64> {
    let horizontal = speed.abs() * angle.cos();
    let direction = if speed == 0.0 { 1.0 } else { speed.signum() };
    vec![
        heading.sin() * horizontal * direction,
        heading.cos() * horizontal * direction,
        speed.abs() * angle.sin(),
        x,
        y,
        z,
    ]
}

/// Returns [x, y, z, vx, vy, vz]
#[wasm_bindgen]
pub fn advance_bridge_jump(
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    dt: f64,
) -> Vec<f64> {
    let nx = x + vx * dt;
    let nz = z + vz * dt;
    let ny = y + vy * dt - 0.5 * VEHICLE_GRAVITY * dt * dt;
    let nvy = vy - VEHICLE_GRAVITY * dt;
    vec![nx, ny, nz, vx, nvy, vz]
}
