/**
 * Classification (Step 3) and Engagement (Step 4)
 */

import { bernoulli } from '../utils/rng.js';

/**
 * Classify a detected object as "warhead track" or "not warhead track".
 * This is a compressed model of discrimination / track classification.
 *
 * @returns {boolean} classifiedAsWarhead
 */
export function classifyTarget(tgt, params) {
  const { pClassifyWarhead, pFalseAlarmDecoy } = params;
  if (tgt.kind === "warhead") return bernoulli(pClassifyWarhead); // true positive rate
  return bernoulli(pFalseAlarmDecoy); // false positive rate
}

/**
 * Engage an object given doctrine and finite inventory.
 * The defense engages ONLY objects classified as warhead (enforced outside this function).
 *
 * - Barrage: allocate up to shotsPerTarget immediately (subject to remaining inventory)
 * - SLS: fire sequentially up to maxShotsPerTarget, but after each miss, the next shot
 *        only happens if bernoulli(pReengage) is true.
 *
 * Uses pkWarhead vs pkDecoy based on the TRUE target type (simplification).
 *
 * @returns {Object} { killed, shotsFired, inventoryRemaining }
 */
export function engageTarget(tgt, params, inventory) {
  const {
    doctrineMode,
    shotsPerTarget,
    maxShotsPerTarget,
    pReengage,
    pkWarhead,
    pkDecoy,
  } = params;

  const pk = tgt.kind === "warhead" ? pkWarhead : pkDecoy;

  if (inventory <= 0) {
    return { killed: false, shotsFired: 0, inventoryRemaining: inventory };
  }

  if (doctrineMode === "barrage") {
    const alloc = Math.min(shotsPerTarget, inventory);
    if (alloc <= 0) {
      return { killed: false, shotsFired: 0, inventoryRemaining: inventory };
    }

    let killed = false;
    for (let s = 0; s < alloc; s++) {
      if (bernoulli(pk)) {
        killed = true;
        break;
      }
    }

    return {
      killed,
      shotsFired: alloc,
      inventoryRemaining: inventory - alloc,
    };
  }

  // Shoot-Look-Shoot (SLS)
  const cap = Math.min(maxShotsPerTarget, inventory);
  let shotsFired = 0;

  for (let s = 0; s < cap; s++) {
    // Fire one shot
    shotsFired += 1;
    const hit = bernoulli(pk);
    if (hit) {
      return {
        killed: true,
        shotsFired,
        inventoryRemaining: inventory - shotsFired,
      };
    }

    // Miss: decide whether re-engagement is feasible for next shot
    // (geometry/time-to-go proxy)
    const canReengage = bernoulli(pReengage);
    if (!canReengage) break;
  }

  return {
    killed: false,
    shotsFired,
    inventoryRemaining: inventory - shotsFired,
  };
}
