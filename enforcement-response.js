// Wanted level dispatches officers; it does not authorize firearm use.
export function enforcementResponse({ armed = false, fired = false, resisting = false, warnedFor = 0 } = {}) {
  if (armed || fired) return 'firearm';
  if (resisting && warnedFor >= 5) return 'laser';
  return 'arrest';
}
