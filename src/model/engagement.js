/**
 * Classification and Engagement logic.
 *
 * Supports both legacy (single interceptor type) and multi-type engagement.
 */

import { bernoulli } from '../utils/rng.js';

/**
 * Classify a detected object as "warhead track" or "not warhead track".
 * @returns {boolean} classifiedAsWarhead
 */
export function classifyTarget(tgt, params) {
  const { pClassifyWarhead, pFalseAlarmDecoy } = params;
  if (tgt.kind === "warhead") return bernoulli(pClassifyWarhead);
  return bernoulli(pFalseAlarmDecoy);
}

/**
 * Engage a single target with a specific interceptor type's Pk and inventory.
 *
 * @param {Object} tgt — target object ({kind, id, ...})
 * @param {number} pk — probability of kill per shot for this interceptor type
 * @param {Object} doctrineParams — { doctrineMode, shotsPerTarget, maxShotsPerTarget, pReengage }
 * @param {number} inventory — remaining interceptors of this type
 * @returns {{ killed: boolean, shotsFired: number, inventoryRemaining: number }}
 */
export function engageWithType(tgt, pk, doctrineParams, inventory) {
  const { doctrineMode, shotsPerTarget, maxShotsPerTarget, pReengage } = doctrineParams;

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
    shotsFired += 1;
    if (bernoulli(pk)) {
      return {
        killed: true,
        shotsFired,
        inventoryRemaining: inventory - shotsFired,
      };
    }
    if (!bernoulli(pReengage)) break;
  }

  return {
    killed: false,
    shotsFired,
    inventoryRemaining: inventory - shotsFired,
  };
}

/**
 * Legacy engageTarget — wraps engageWithType using the old single-Pk interface.
 * Kept for backward compatibility.
 */
export function engageTarget(tgt, params, inventory) {
  const pk = tgt.kind === "warhead" ? params.pkWarhead : params.pkDecoy;
  return engageWithType(tgt, pk, params, inventory);
}
