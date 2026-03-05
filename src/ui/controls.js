/**
 * UI controls — HTML template, parameter reading, and doctrine toggle.
 */

import { clamp01 } from '../utils/rng.js';
import { DEFAULTS } from '../state.js';

/**
 * Generate the main app HTML template.
 */
export function renderAppHTML() {
  const d = DEFAULTS;
  return `
  <div class="container">
    <h1>SHIELD Demo (Steps 2\u20135)</h1>
    <p class="subtitle">
      Missiles \u2192 MIRVs \u2192 decoys-as-objects; detection+tracking; classification; engage-only-warhead-tracks;
      doctrine (Barrage vs Shoot-Look-Shoot); common-mode reliability.
      <br/>
      <b>Key output:</b> penetrated <b>real warheads</b>.
    </p>

    <div class="grid">
      <label>
        Incoming missiles (N missiles)
        <input id="nMissiles" type="number" min="0" step="1" value="${d.nMissiles}" />
      </label>

      <label>
        MIRVs per missile
        <input id="mirvsPerMissile" type="number" min="1" step="1" value="${d.mirvsPerMissile}" />
      </label>

      <label>
        Decoys per real warhead
        <input id="decoysPerWarhead" type="number" min="0" step="1" value="${d.decoysPerWarhead}" />
      </label>

      <label>
        Detection + tracking probability (0\u20131)
        <input id="pDetectTrack" type="number" min="0" max="1" step="0.01" value="${d.pDetectTrack}" />
      </label>

      <label>
        Classifier: P(classify warhead | warhead) (0\u20131)
        <input id="pClassifyWarhead" type="number" min="0" max="1" step="0.01" value="${d.pClassifyWarhead}" />
      </label>

      <label>
        Classifier: P(classify warhead | decoy) (0\u20131)
        <input id="pFalseAlarmDecoy" type="number" min="0" max="1" step="0.01" value="${d.pFalseAlarmDecoy}" />
      </label>

      <label>
        Doctrine mode
        <select id="doctrineMode">
          <option value="barrage"${d.doctrineMode === "barrage" ? " selected" : ""}>Barrage (allocate shots immediately)</option>
          <option value="sls"${d.doctrineMode === "sls" ? " selected" : ""}>Shoot-Look-Shoot (SLS)</option>
        </select>
      </label>

      <label>
        Barrage: shots per engaged track
        <input id="shotsPerTarget" type="number" min="0" step="1" value="${d.shotsPerTarget}" />
      </label>

      <label>
        SLS: max shots per engaged track
        <input id="maxShotsPerTarget" type="number" min="0" step="1" value="${d.maxShotsPerTarget}" />
      </label>

      <label>
        SLS: P(re-engage after miss) (0\u20131)
        <input id="pReengage" type="number" min="0" max="1" step="0.01" value="${d.pReengage}" />
      </label>

      <label>
        Pk per shot vs TRUE warhead (0\u20131)
        <input id="pkWarhead" type="number" min="0" max="1" step="0.01" value="${d.pkWarhead}" />
      </label>

      <label>
        Pk per shot vs TRUE decoy (0\u20131)
        <input id="pkDecoy" type="number" min="0" max="1" step="0.01" value="${d.pkDecoy}" />
      </label>

      <label>
        Interceptor inventory (N)
        <input id="nInventory" type="number" min="0" step="1" value="${d.nInventory}" />
      </label>

      <label>
        Monte Carlo trials
        <input id="nTrials" type="number" min="1" step="100" value="${d.nTrials}" />
      </label>

      <label>
        Seed (blank = random)
        <input id="seed" type="number" step="1" value="" placeholder="auto" />
      </label>

      <label>
        System reliability: P(system up) (0\u20131)
        <input id="pSystemUp" type="number" min="0" max="1" step="0.01" value="${d.pSystemUp}" />
      </label>

      <label>
        If system down: detection degrade factor (0\u20131)
        <input id="detectDegradeFactor" type="number" min="0" max="1" step="0.01" value="${d.detectDegradeFactor}" />
      </label>

      <label>
        If system down: Pk degrade factor (0\u20131)
        <input id="pkDegradeFactor" type="number" min="0" max="1" step="0.01" value="${d.pkDegradeFactor}" />
      </label>
    </div>

    <div class="note">
      <b>Classifier note:</b> "P(classify warhead | warhead)" is the true-positive rate.
      "P(classify warhead | decoy)" is the false-alarm rate (decoys mis-labeled as threats).
      The defense <b>only shoots</b> at tracks classified as warheads.
    </div>

    <button id="runBtn">Run simulation</button>

    <pre id="output" class="output"></pre>

    <div class="charts">
      <h3>Charts</h3>
      <div id="chartsArea" class="charts-area"></div>
    </div>
  </div>
`;
}

/**
 * Toggle visibility of SLS vs Barrage fields based on doctrine selection.
 */
export function setSLSVisibility() {
  const mode = document.getElementById("doctrineMode").value;
  const slsIds = ["maxShotsPerTarget", "pReengage"];
  const barrageIds = ["shotsPerTarget"];

  for (const id of slsIds) {
    const el = document.getElementById(id);
    el.disabled = mode !== "sls";
    el.parentElement.style.opacity = mode === "sls" ? "1" : "0.5";
  }
  for (const id of barrageIds) {
    const el = document.getElementById(id);
    el.disabled = mode !== "barrage";
    el.parentElement.style.opacity = mode === "barrage" ? "1" : "0.5";
  }
}

/**
 * Read all parameter values from the UI form inputs.
 */
export function readParamsFromUI() {
  const nMissiles = Math.max(
    0,
    parseInt(document.getElementById("nMissiles").value, 10) || 0
  );
  const mirvsPerMissile = Math.max(
    1,
    parseInt(document.getElementById("mirvsPerMissile").value, 10) || 1
  );
  const decoysPerWarhead = Math.max(
    0,
    parseInt(document.getElementById("decoysPerWarhead").value, 10) || 0
  );

  const pDetectTrack = clamp01(
    parseFloat(document.getElementById("pDetectTrack").value) || 0
  );

  const pClassifyWarhead = clamp01(
    parseFloat(document.getElementById("pClassifyWarhead").value) || 0
  );
  const pFalseAlarmDecoy = clamp01(
    parseFloat(document.getElementById("pFalseAlarmDecoy").value) || 0
  );

  const doctrineMode = document.getElementById("doctrineMode").value;

  const shotsPerTarget = Math.max(
    0,
    parseInt(document.getElementById("shotsPerTarget").value, 10) || 0
  );
  const maxShotsPerTarget = Math.max(
    0,
    parseInt(document.getElementById("maxShotsPerTarget").value, 10) || 0
  );
  const pReengage = clamp01(
    parseFloat(document.getElementById("pReengage").value) || 0
  );

  const pkWarhead = clamp01(
    parseFloat(document.getElementById("pkWarhead").value) || 0
  );
  const pkDecoy = clamp01(
    parseFloat(document.getElementById("pkDecoy").value) || 0
  );

  const nInventory = Math.max(
    0,
    parseInt(document.getElementById("nInventory").value, 10) || 0
  );
  const nTrials = Math.max(
    1,
    parseInt(document.getElementById("nTrials").value, 10) || 1000
  );

  const pSystemUp = clamp01(
    parseFloat(document.getElementById("pSystemUp").value) || 0
  );
  const detectDegradeFactor = clamp01(
    parseFloat(document.getElementById("detectDegradeFactor").value) || 0
  );
  const pkDegradeFactor = clamp01(
    parseFloat(document.getElementById("pkDegradeFactor").value) || 0
  );

  const seedVal = document.getElementById("seed").value.trim();
  const seed = seedVal === "" ? null : parseInt(seedVal, 10) || 0;

  return {
    nMissiles,
    mirvsPerMissile,
    decoysPerWarhead,
    pDetectTrack,
    pClassifyWarhead,
    pFalseAlarmDecoy,
    doctrineMode,
    shotsPerTarget,
    maxShotsPerTarget,
    pReengage,
    pkWarhead,
    pkDecoy,
    nInventory,
    nTrials,
    pSystemUp,
    detectDegradeFactor,
    pkDegradeFactor,
    seed,
  };
}
