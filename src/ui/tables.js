/**
 * Tabular / text output rendering.
 */

import { fmt } from '../utils/format.js';

export function renderSummary(params, result) {
  const s = result.summary;

  const realWarheads = params.nMissiles * params.mirvsPerMissile;
  const decoys = realWarheads * params.decoysPerWarhead;
  const totalObjects = realWarheads + decoys;

  const doctrineLine =
    params.doctrineMode === "barrage"
      ? `Barrage, shots/track=${params.shotsPerTarget}`
      : `SLS, maxShots/track=${params.maxShotsPerTarget}, pReengage=${fmt(
          params.pReengage,
          2
        )}`;

  const sanity = s.meanPenReal + s.meanIntReal;

  return [
    `Inputs:`,
    `  Missiles:                           ${params.nMissiles}`,
    `  MIRVs per missile:                  ${params.mirvsPerMissile}`,
    `  Decoys per real warhead:            ${params.decoysPerWarhead}`,
    `  ==> Real warheads:                  ${realWarheads}`,
    `  ==> Decoys:                         ${decoys}`,
    `  ==> Total trackable objects:        ${totalObjects}`,
    ``,
    `  Detection + tracking probability:   ${fmt(params.pDetectTrack, 2)}`,
    `  Classifier TPR (warhead\u2192warhead):   ${fmt(params.pClassifyWarhead, 2)}`,
    `  Classifier FPR (decoy\u2192warhead):     ${fmt(params.pFalseAlarmDecoy, 2)}`,
    ``,
    `  Doctrine:                           ${doctrineLine}`,
    `  Pk per shot vs TRUE warhead:        ${fmt(params.pkWarhead, 2)}`,
    `  Pk per shot vs TRUE decoy:          ${fmt(params.pkDecoy, 2)}`,
    `  Inventory (interceptors):           ${params.nInventory}`,
    `  Trials:                             ${params.nTrials}`,
    ``,
    `Common-mode reliability (trial-level):`,
    `  P(system up):                       ${fmt(
      params.pSystemUp,
      2
    )} (observed \u2248 ${fmt(s.meanSystemUp, 2)})`,
    `  If down: detect degrade factor:      ${fmt(
      params.detectDegradeFactor,
      2
    )}`,
    `  If down: Pk degrade factor:          ${fmt(params.pkDegradeFactor, 2)}`,
    ``,
    `Key output (REAL warheads only):`,
    `  Mean penetrated real warheads:      ${fmt(s.meanPenReal, 2)} (${fmt(
      100 * s.meanPenRateReal,
      1
    )}%)`,
    `  Penetrated p10/median/p90:          ${s.p10PenReal.toFixed(
      0
    )} / ${s.medianPenReal.toFixed(0)} / ${s.p90PenReal.toFixed(0)}`,
    `  Mean intercepted real warheads:     ${fmt(s.meanIntReal, 2)}`,
    ``,
    `Detection diagnostics:`,
    `  Mean detected objects (all):        ${fmt(
      s.meanDetObjects,
      2
    )} of ${totalObjects}`,
    `  Mean detected real warheads:        ${fmt(
      s.meanDetReal,
      2
    )} of ${realWarheads}`,
    ``,
    `Classifier diagnostics (means):`,
    `  True positives (warheads\u2192warhead):  ${fmt(s.meanTP, 2)}`,
    `  False negatives (warheads\u2192not):     ${fmt(s.meanFN, 2)}`,
    `  False positives (decoys\u2192warhead):   ${fmt(s.meanFP, 2)}`,
    ``,
    `Engagement / consumption (means):`,
    `  Mean total shots fired:             ${fmt(s.meanShotsTotal, 2)}`,
    `  Mean shots at TRUE warheads:        ${fmt(s.meanShotsWarheads, 2)}`,
    `  Mean shots at decoys:               ${fmt(s.meanShotsDecoys, 2)}`,
    `  Mean inventory remaining:           ${fmt(s.meanInventoryRemaining, 2)}`,
    ``,
    `Sanity check:`,
    `  Mean (penetrated + intercepted):    ${fmt(
      sanity,
      2
    )} (should be close to real warheads = ${realWarheads})`,
  ].join("\n");
}
