// Game-scale impact calculations; speeds are metres per second, masses kilograms.
export function impactDamage(deltaSpeed, scale = 0.32) {
  return Math.max(0, deltaSpeed - 2) ** 2 * scale;
}
export function segmentDistance(point, start, end) {
  const dx = end.x - start.x, dz = end.z - start.z;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point.x - start.x - t * dx, point.z - start.z - t * dz);
}
export function collisionImpulse(aVelocity, bVelocity, normal, aMass, bMass, restitution = 0.08) {
  const closing = -((aVelocity.x - bVelocity.x) * normal.x + (aVelocity.z - bVelocity.z) * normal.z);
  if (closing <= 0) return { impulse: 0, aDelta: 0, bDelta: 0 };
  const impulse = (1 + restitution) * closing / (1 / aMass + 1 / bMass);
  return { impulse, aDelta: impulse / aMass, bDelta: impulse / bMass };
}
