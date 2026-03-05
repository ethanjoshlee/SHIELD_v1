/**
 * Global app state and default parameter values.
 *
 * Legacy flat params are used when the old UI is active.
 * Multi-phase params (interceptors, missileClasses, countermeasures)
 * are populated when country presets are selected.
 */

export const DEFAULTS = {
  // --- Legacy flat params (backward compatible) ---
  nMissiles: 20,
  mirvsPerMissile: 5,
  decoysPerWarhead: 2,
  pDetectTrack: 0.80,
  pClassifyWarhead: 0.80,
  pFalseAlarmDecoy: 0.20,
  doctrineMode: "barrage",
  shotsPerTarget: 2,
  maxShotsPerTarget: 4,
  pReengage: 0.85,
  pkWarhead: 0.60,
  pkDecoy: 0.80,
  nInventory: 200,
  nTrials: 2000,
  pSystemUp: 0.90,
  detectDegradeFactor: 0.50,
  pkDegradeFactor: 0.70,
  seed: null,

  // --- Multi-phase params (populated by presets or future UI) ---
  // constellationAltitudeKm: 1000,
  // regionalCoverageFactor: 1.0,
  // pDecoyBurnup: 0.7,
  // interceptors: { ... },    // per-type: { deployed, pk, costPerUnit_M, phase }
  // missileClasses: { ... },  // per-class: { count, mirvsPerMissile, decoysPerWarhead, yieldKt, boostEvasion }
  // countermeasures: { asatType, asatDetectPenalty, asatSpacePkPenalty },
};
