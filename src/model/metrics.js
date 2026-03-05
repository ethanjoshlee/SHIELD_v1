/**
 * Results and analytics — aggregate trial outputs into summary statistics.
 */

import { mean, percentile } from '../utils/rng.js';

/**
 * Compute the total architecture cost (deterministic, not per-trial).
 * @param {Object} params — must have params.interceptors
 * @returns {number} total cost in $M
 */
export function computeArchitectureCost(params) {
  if (!params.interceptors) return 0;
  let totalCost_M = 0;
  for (const cfg of Object.values(params.interceptors)) {
    totalCost_M += cfg.deployed * (cfg.costPerUnit_M ?? 0);
  }
  return totalCost_M;
}

/**
 * Compute summary statistics from Monte Carlo trial arrays.
 */
export function computeSummary(arrays, realWarheadsConst, params = {}) {
  const {
    penReal, intReal,
    detObj, detReal,
    tp, fn, fp,
    shotsTot, shotsW, shotsD,
    invLeft, systemUpFlags,
    boostMissilesKilled = [],
    boostWarheadsDestroyed = [],
    midcourseWarheadsKilled = [],
    terminalWarheadsKilled = [],
    ktDelivered = [],
  } = arrays;

  const meanSystemUp = mean(systemUpFlags);

  const summary = {
    realWarheads: realWarheadsConst,

    meanPenReal: mean(penReal),
    p10PenReal: percentile(penReal, 10),
    medianPenReal: percentile(penReal, 50),
    p90PenReal: percentile(penReal, 90),

    meanIntReal: mean(intReal),

    meanDetObjects: mean(detObj),
    meanDetReal: mean(detReal),

    meanTP: mean(tp),
    meanFN: mean(fn),
    meanFP: mean(fp),

    meanShotsTotal: mean(shotsTot),
    meanShotsWarheads: mean(shotsW),
    meanShotsDecoys: mean(shotsD),

    meanInventoryRemaining: mean(invLeft),

    meanSystemUp,
    meanPenRateReal:
      realWarheadsConst > 0 ? mean(penReal) / realWarheadsConst : 0,
  };

  // Per-phase stats (only populated in multi-phase mode)
  if (boostMissilesKilled.length > 0) {
    summary.meanBoostMissilesKilled = mean(boostMissilesKilled);
    summary.meanBoostWarheadsDestroyed = mean(boostWarheadsDestroyed);
    summary.meanMidcourseWarheadsKilled = mean(midcourseWarheadsKilled);
    summary.meanTerminalWarheadsKilled = mean(terminalWarheadsKilled);
  }

  // Kiloton delivery stats
  if (ktDelivered.length > 0 && mean(ktDelivered) > 0) {
    summary.meanKtDelivered = mean(ktDelivered);
    summary.p10KtDelivered = percentile(ktDelivered, 10);
    summary.medianKtDelivered = percentile(ktDelivered, 50);
    summary.p90KtDelivered = percentile(ktDelivered, 90);
  }

  // Architecture cost
  summary.architectureCost_M = computeArchitectureCost(params);
  summary.architectureCost_B = summary.architectureCost_M / 1000;

  return summary;
}
