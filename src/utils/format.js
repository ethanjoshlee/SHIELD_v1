/**
 * Display formatting helpers.
 */

export function fmt(x, digits = 2) {
  if (!Number.isFinite(x)) return "NaN";
  return x.toFixed(digits);
}
