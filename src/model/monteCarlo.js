/**
 * Monte Carlo simulation runner — batches trials and collects distributions.
 */

import { seed } from '../utils/rng.js';
import { runOneTrial } from './simulationEngine.js';
import { computeSummary } from './metrics.js';

/**
 * Run Monte Carlo and summarize distributions.
 */
export function runMonteCarlo(params) {
  // Seed PRNG for reproducibility (null → auto-seed from Date.now())
  seed(params.seed);

  const { nTrials } = params;

  const penReal = [];
  const intReal = [];

  const detObj = [];
  const detReal = [];

  const tp = [];
  const fn = [];
  const fp = [];

  const shotsTot = [];
  const shotsW = [];
  const shotsD = [];

  const invLeft = [];
  const systemUpFlags = [];

  // Multi-phase arrays
  const boostMissilesKilled = [];
  const boostWarheadsDestroyed = [];
  const midcourseWarheadsKilled = [];
  const terminalWarheadsKilled = [];
  const ktDelivered = [];

  let realWarheadsConst = null;
  let totalMissiles = null;

  for (let t = 0; t < nTrials; t++) {
    const r = runOneTrial(params);
    if (realWarheadsConst === null) realWarheadsConst = r.realWarheads;

    penReal.push(r.penetratedRealWarheads);
    intReal.push(r.interceptedRealWarheads);

    detObj.push(r.detectedObjects);
    detReal.push(r.detectedRealWarheads);

    tp.push(r.truePositives);
    fn.push(r.falseNegatives);
    fp.push(r.falsePositives);

    shotsTot.push(r.shotsTotal);
    shotsW.push(r.shotsAtTrueWarheads);
    shotsD.push(r.shotsAtDecoys);

    invLeft.push(r.inventoryRemaining);
    systemUpFlags.push(r.systemUp ? 1 : 0);

    boostMissilesKilled.push(r.boostMissilesKilled);
    boostWarheadsDestroyed.push(r.boostWarheadsDestroyed);
    midcourseWarheadsKilled.push(r.midcourseWarheadsKilled);
    terminalWarheadsKilled.push(r.terminalWarheadsKilled);
    ktDelivered.push(r.ktDelivered);
  }

  const summary = computeSummary(
    {
      penReal, intReal,
      detObj, detReal,
      tp, fn, fp,
      shotsTot, shotsW, shotsD,
      invLeft, systemUpFlags,
      boostMissilesKilled, boostWarheadsDestroyed,
      midcourseWarheadsKilled, terminalWarheadsKilled,
      ktDelivered,
    },
    realWarheadsConst,
    params
  );

  return {
    penReal,
    intReal,
    shotsTot,
    fp,
    ktDelivered,
    summary,
  };
}
