/**
 * Scenario builder — generates missiles and expands to warheads/decoys.
 *
 * Two modes:
 * 1. Legacy: flat params (nMissiles, mirvsPerMissile, decoysPerWarhead) → generateTargets()
 * 2. Multi-class: params.missileClasses → generateMissiles() + expandToWarheadsAndDecoys()
 */

import { shuffle } from '../utils/rng.js';

/**
 * Legacy: generate a flat list of warheads + decoys (single class, no missile objects).
 * Kept for backward compatibility with the old UI.
 */
export function generateTargets(params) {
  const { nMissiles, mirvsPerMissile, decoysPerWarhead } = params;

  const realWarheads = nMissiles * mirvsPerMissile;
  const decoys = realWarheads * decoysPerWarhead;

  const targets = [];

  for (let w = 0; w < realWarheads; w++) {
    targets.push({ kind: "warhead", id: `W${w}` });
  }
  for (let d = 0; d < decoys; d++) {
    targets.push({ kind: "decoy", id: `D${d}` });
  }

  shuffle(targets);
  return { targets, realWarheads, decoys };
}

/**
 * Generate missile objects from missile class definitions.
 * Each missile carries metadata about its class, MIRV count, decoys, yield, and boost evasion.
 *
 * @param {Object} params — must have params.missileClasses
 * @returns {Object[]} array of missile objects
 */
export function generateMissiles(params) {
  const missiles = [];

  for (const [className, cls] of Object.entries(params.missileClasses)) {
    for (let i = 0; i < cls.count; i++) {
      missiles.push({
        id: `${className}_${i}`,
        missileClass: className,
        mirvsPerMissile: cls.mirvsPerMissile,
        decoysPerWarhead: cls.decoysPerWarhead,
        yieldKt: cls.yieldKt,
        boostEvasion: cls.boostEvasion,
      });
    }
  }

  shuffle(missiles);
  return missiles;
}

/**
 * Expand surviving missiles into individual warhead + decoy targets (post-MIRV separation).
 * Called after boost phase on the missiles that survived.
 *
 * @param {Object[]} survivingMissiles — missiles that were not intercepted in boost phase
 * @returns {{ targets: Object[], realWarheads: number, decoys: number }}
 */
export function expandToWarheadsAndDecoys(survivingMissiles) {
  const targets = [];
  let realWarheads = 0;
  let decoys = 0;

  for (const m of survivingMissiles) {
    for (let w = 0; w < m.mirvsPerMissile; w++) {
      targets.push({
        kind: "warhead",
        id: `${m.id}_W${w}`,
        yieldKt: m.yieldKt,
        missileClass: m.missileClass,
      });
      realWarheads++;

      for (let d = 0; d < m.decoysPerWarhead; d++) {
        targets.push({
          kind: "decoy",
          id: `${m.id}_W${w}_D${d}`,
          missileClass: m.missileClass,
        });
        decoys++;
      }
    }
  }

  shuffle(targets);
  return { targets, realWarheads, decoys };
}
