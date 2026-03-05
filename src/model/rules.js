/**
 * Phase sequencing, constellation coverage, and countermeasure penalty logic.
 */

import { clamp01 } from '../utils/rng.js';

const R_EARTH = 6371; // km

/**
 * Compute the fraction of a LEO constellation covering a launch region.
 * Formula: (1 - cos(theta)) / 2, theta = arccos(R_earth / (R_earth + altitude))
 *
 * @param {number} altitudeKm — orbit altitude in km (default 1000)
 * @param {number} regionalFactor — geographic modifier (0–1, default 1.0)
 * @returns {number} fraction of constellation in position (e.g., ~0.067 at 1000km)
 */
export function constellationCoverage(altitudeKm = 1000, regionalFactor = 1.0) {
  const theta = Math.acos(R_EARTH / (R_EARTH + altitudeKm));
  const baseFraction = (1 - Math.cos(theta)) / 2;
  return clamp01(baseFraction * regionalFactor);
}

/**
 * Compute available boost-phase interceptors from deployed count and coverage.
 */
export function boostAvailable(deployed, coverageFraction) {
  return Math.max(0, Math.floor(deployed * coverageFraction));
}

/**
 * Apply boost-evasion penalty to an interceptor's Pk.
 */
export function applyBoostEvasion(pk, boostEvasion) {
  return clamp01(pk * (1 - boostEvasion));
}

/**
 * Apply ASAT penalty to detection/tracking probability.
 * Multiplicative: effectiveP = pDetect * (1 - penalty)
 */
export function applyAsatDetectPenalty(pDetect, asatDetectPenalty) {
  return clamp01(pDetect * (1 - asatDetectPenalty));
}

/**
 * Apply ASAT penalty to space-based interceptor Pk.
 * Multiplicative: effectivePk = pk * (1 - penalty)
 */
export function applyAsatPkPenalty(pk, asatSpacePkPenalty) {
  return clamp01(pk * (1 - asatSpacePkPenalty));
}

/**
 * ASAT effect lookup table.
 */
export const ASAT_EFFECTS = {
  none:         { detectPenalty: 0.00, spacePkPenalty: 0.00 },
  conventional: { detectPenalty: 0.10, spacePkPenalty: 0.15 },
  nuclear:      { detectPenalty: 0.25, spacePkPenalty: 0.30 },
};

/**
 * Returns true if an interceptor type is space-based (affected by ASAT).
 */
export function isSpaceBased(interceptorType) {
  return interceptorType.startsWith("boost_") ||
         interceptorType === "midcourse_kinetic" ||
         interceptorType === "midcourse_laser";
}

/**
 * Get the phase for an interceptor type.
 */
export function interceptorPhase(interceptorType) {
  if (interceptorType.startsWith("boost_")) return "boost";
  if (interceptorType.startsWith("midcourse_")) return "midcourse";
  if (interceptorType.startsWith("terminal_")) return "terminal";
  return "unknown";
}

/**
 * Sort interceptor types within a phase by cost (cheapest first).
 */
export function sortByPriority(interceptorTypes, interceptorConfigs) {
  return [...interceptorTypes].sort((a, b) => {
    const costA = interceptorConfigs[a]?.costPerUnit_M ?? 0;
    const costB = interceptorConfigs[b]?.costPerUnit_M ?? 0;
    return costA - costB;
  });
}
