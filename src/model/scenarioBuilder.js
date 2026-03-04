/**
 * Salvo generator (Step 2)
 *
 * Build a list of trackable objects:
 * - real warheads: nMissiles * mirvsPerMissile
 * - decoys: realWarheads * decoysPerWarhead
 * Each object becomes a target in the detection/classify/engage loop.
 */

import { shuffle } from '../utils/rng.js';

export function generateTargets(params) {
  const { nMissiles, mirvsPerMissile, decoysPerWarhead } = params;

  const realWarheads = nMissiles * mirvsPerMissile;
  const decoys = realWarheads * decoysPerWarhead;

  const targets = [];

  for (let w = 0; w < realWarheads; w++) {
    targets.push({ kind: "warhead", id: `W${w}` });
  }
  for (let d = 0; d < decoys; d++) {
    targets.push({ kind: "decoy", id: `D${d}` });
  }

  shuffle(targets);
  return { targets, realWarheads, decoys };
}
