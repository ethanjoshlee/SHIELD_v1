/**
 * Monte Carlo simulation runner — batches trials and collects distributions.
 */

import { runOneTrial } from './simulationEngine.js';
import { computeSummary } from './metrics.js';

/**
 * Run Monte Carlo and summarize distributions.
 */
export function runMonteCarlo(params) {
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

  let realWarheadsConst = null;

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
  }

  const summary = computeSummary(
    { penReal, intReal, detObj, detReal, tp, fn, fp, shotsTot, shotsW, shotsD, invLeft, systemUpFlags },
    realWarheadsConst
  );

  return {
    penReal,
    intReal,
    shotsTot,
    fp,
    summary,
  };
}
