/**
 * Random number generation and statistical utilities.
 *
 * Uses a seeded mulberry32 PRNG for reproducibility.
 * Call seed(n) before a simulation run to get deterministic results.
 */

let _state = 0;

/**
 * Seed the PRNG. Pass null or undefined to auto-seed from Date.now().
 */
export function seed(s) {
  _state = (s != null ? s : Date.now()) >>> 0;
}

// Auto-seed on module load
seed(null);

export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Mulberry32 PRNG — returns a float in [0, 1).
 */
export function randUniform() {
  _state |= 0;
  _state = (_state + 0x6D2B79F5) | 0;
  let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function bernoulli(p) {
  return randUniform() < p;
}

// Fisher-Yates shuffle (in-place)
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randUniform() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// percentile on numeric array (0-100)
export function percentile(arr, p) {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function mean(arr) {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
