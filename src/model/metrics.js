/**
 * Results and analytics — aggregate trial outputs into summary statistics.
 */

import { mean, percentile } from '../utils/rng.js';

/**
 * Compute summary statistics from Monte Carlo trial arrays.
 */
export function computeSummary(arrays, realWarheadsConst) {
  const {
    penReal, intReal,
    detObj, detReal,
    tp, fn, fp,
    shotsTot, shotsW, shotsD,
    invLeft, systemUpFlags,
  } = arrays;

  const meanSystemUp = mean(systemUpFlags);

  return {
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
}
