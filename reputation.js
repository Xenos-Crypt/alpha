// Public reputation is independent of XP and personal relationships.
export const REPUTATION_ACTIONS = Object.freeze({kindness: 1, monster: 2, assault: -10, knockout: -50, theft: -15, destruction: -20});
export function normalizeReputation(value) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(-1000, Math.min(1000, Math.trunc(value))) : 0; }
export function reputationStanding(value, faction = 'citizens') {
  const score = normalizeReputation(value), favor = faction === 'yatan' ? -score : score;
  const title = score === -1000 ? 'Demon' : score === 1000 ? 'Saint' : score < 0 ? 'Unfavorable' : score > 0 ? 'Favorable' : 'Neutral';
  const relationship = favor === 0 ? 'Neutral' : favor < 0 ? (favor <= -500 ? 'Feared' : 'Unfavorable') : favor >= 1000 ? 'Revered' : favor >= 500 ? 'Trusted friend' : 'Friend';
  return {score, title, favor, relationship, opinion: favor / 10};
}
export function citizenFaction(c) { return c.faith === 'yatan' || (c.faith == null && Number.isInteger(c.id) && c.id % 17 === 0) ? 'yatan' : 'citizens'; }
export function createReputation({onChange = () => {}, now = () => Date.now()} = {}) {
  let score = 0;
  let assaults = new WeakMap();
  return {
    get score() { return score; },
    standing(faction) { return reputationStanding(score, faction); },
    snapshot() { return score; },
    restore(value) { score = normalizeReputation(value); assaults = new WeakMap(); },
    record(action, subject, amount) {
      let delta = Object.hasOwn(REPUTATION_ACTIONS, action) ? REPUTATION_ACTIONS[action] : 0;
      if (action === 'donation') delta = Number.isFinite(amount) && amount > 0 ? Math.min(25, Math.floor(amount / 20)) : 0;
      if (!delta) return 0;
      if (action === 'assault') {
        if (!subject || typeof subject !== 'object') return 0;
        const t = now(), last = assaults.get(subject);
        if (last != null && t - last < 30000) return 0;
        assaults.set(subject, t);
      }
      const previous = score; score = normalizeReputation(score + delta);
      if (score !== previous) onChange({score, previous, delta: score - previous, action});
      return score - previous;
    }
  };
}
