/**
 * Core simulation engine — single-trial logic.
 *
 * Process for each object:
 * 1) Detect+track (compressed)
 * 2) If detected: classify as warhead-track vs not-warhead-track
 * 3) Engage ONLY warhead-tracks (finite inventory + doctrine)
 *
 * Key outcome: penetrated REAL warheads
 */

import { clamp01, bernoulli } from '../utils/rng.js';
import { generateTargets } from './scenarioBuilder.js';
import { classifyTarget, engageTarget } from './engagement.js';

/**
 * Apply trial-level common-mode reliability.
 * With probability pSystemUp: no degradation.
 * Else: degrade detection and pk values by factors.
 */
function applyTrialDegradation(params) {
  const up = bernoulli(params.pSystemUp);

  if (up) {
    return {
      pDetectTrack_trial: params.pDetectTrack,
      pkWarhead_trial: params.pkWarhead,
      pkDecoy_trial: params.pkDecoy,
      systemUp: true,
    };
  }

  return {
    pDetectTrack_trial: clamp01(
      params.pDetectTrack * params.detectDegradeFactor
    ),
    pkWarhead_trial: clamp01(params.pkWarhead * params.pkDegradeFactor),
    pkDecoy_trial: clamp01(params.pkDecoy * params.pkDegradeFactor),
    systemUp: false,
  };
}

/**
 * Run one trial.
 */
export function runOneTrial(params) {
  const { targets, realWarheads } = generateTargets(params);

  // Trial-level degradation (common-mode)
  const d = applyTrialDegradation(params);

  const pDetectTrack = d.pDetectTrack_trial;
  const pkWarhead = d.pkWarhead_trial;
  const pkDecoy = d.pkDecoy_trial;

  let inventory = params.nInventory;

  // Outputs (key)
  let penetratedRealWarheads = 0;
  let interceptedRealWarheads = 0;

  // Detection diagnostics
  let detectedObjects = 0;
  let detectedRealWarheads = 0;

  // Classification diagnostics (means)
  let truePositives = 0; // real warheads classified as warhead-track
  let falseNegatives = 0; // real warheads classified as not-warhead-track
  let falsePositives = 0; // decoys classified as warhead-track

  // Shot diagnostics
  let shotsTotal = 0;
  let shotsAtTrueWarheads = 0;
  let shotsAtDecoys = 0;

  for (const tgt of targets) {
    // 1) Detection + tracking
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      // undetected real warheads penetrate
      if (tgt.kind === "warhead") penetratedRealWarheads += 1;
      continue;
    }

    detectedObjects += 1;
    if (tgt.kind === "warhead") detectedRealWarheads += 1;

    // 2) Classification
    const classifiedAsWarhead = classifyTarget(tgt, params);

    if (tgt.kind === "warhead") {
      if (classifiedAsWarhead) truePositives += 1;
      else falseNegatives += 1;
    } else {
      if (classifiedAsWarhead) falsePositives += 1;
    }

    // Engage ONLY warhead-tracks
    if (!classifiedAsWarhead) {
      // If it's a real warhead and we ignore it, it penetrates
      if (tgt.kind === "warhead") penetratedRealWarheads += 1;
      continue;
    }

    // 3) Engagement (finite inventory + doctrine)
    const engageParams = {
      ...params,
      pkWarhead,
      pkDecoy,
    };

    const res = engageTarget(tgt, engageParams, inventory);
    inventory = res.inventoryRemaining;

    shotsTotal += res.shotsFired;
    if (tgt.kind === "warhead") shotsAtTrueWarheads += res.shotsFired;
    else shotsAtDecoys += res.shotsFired;

    if (tgt.kind === "warhead") {
      if (res.killed) interceptedRealWarheads += 1;
      else penetratedRealWarheads += 1;
    }
    // If decoy: outcome irrelevant except consuming shots (already counted)
  }

  return {
    realWarheads,
    penetratedRealWarheads,
    interceptedRealWarheads,

    detectedObjects,
    detectedRealWarheads,

    truePositives,
    falseNegatives,
    falsePositives,

    shotsTotal,
    shotsAtTrueWarheads,
    shotsAtDecoys,

    inventoryRemaining: inventory,
    systemUp: d.systemUp,
  };
}
