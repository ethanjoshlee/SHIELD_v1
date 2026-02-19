import "./styles.css";

/**
 * SHIELD Demo (Steps 2–5 combined)
 * - Salvo generator: missiles → MIRVs (real warheads) → decoys-as-objects
 * - Detection+tracking (compressed)
 * - Classification/discrimination (compressed): engage ONLY tracks classified as "warhead"
 * - Doctrine: Barrage vs Shoot-Look-Shoot (SLS) with re-engagement feasibility gate
 * - Trial-level common-mode failure / reliability (pSystemUp + degradation multipliers)
 * - Optional different Pk vs true warheads vs true decoys
 * - Outputs: penetrated REAL warheads + diagnostics + lightweight histograms
 *
 * Not implemented yet: boost availability, ASAT, explicit sensor/engagement capacity saturation,
 * site geometry, time-to-go, discrimination-by-sensor physics. This is an intuition model.
 */

/* --------------------------
   Helpers
-------------------------- */

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function randUniform() {
  return Math.random();
}

function bernoulli(p) {
  return randUniform() < p;
}

// Fisher–Yates shuffle (in-place)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randUniform() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// percentile on numeric array (0-100)
function percentile(arr, p) {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function mean(arr) {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function fmt(x, digits = 2) {
  if (!Number.isFinite(x)) return "NaN";
  return x.toFixed(digits);
}

/* --------------------------
   Salvo generator (Step 2)
-------------------------- */

/**
 * Build a list of trackable objects:
 * - real warheads: nMissiles * mirvsPerMissile
 * - decoys: realWarheads * decoysPerWarhead
 * Each object becomes a target in the detection/classify/engage loop.
 */
function generateTargets(params) {
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

/* --------------------------
   Classification (Step 3)
-------------------------- */

/**
 * Classify a detected object as "warhead track" or "not warhead track".
 * This is a compressed model of discrimination / track classification.
 *
 * @returns {boolean} classifiedAsWarhead
 */
function classifyTarget(tgt, params) {
  const { pClassifyWarhead, pFalseAlarmDecoy } = params;
  if (tgt.kind === "warhead") return bernoulli(pClassifyWarhead); // true positive rate
  return bernoulli(pFalseAlarmDecoy); // false positive rate
}

/* --------------------------
   Engagement (Step 4)
-------------------------- */

/**
 * Engage an object given doctrine and finite inventory.
 * The defense engages ONLY objects classified as warhead (enforced outside this function).
 *
 * - Barrage: allocate up to shotsPerTarget immediately (subject to remaining inventory)
 * - SLS: fire sequentially up to maxShotsPerTarget, but after each miss, the next shot
 *        only happens if bernoulli(pReengage) is true.
 *
 * Uses pkWarhead vs pkDecoy based on the TRUE target type (simplification).
 *
 * @returns {Object} { killed, shotsFired, inventoryRemaining }
 */
function engageTarget(tgt, params, inventory) {
  const {
    doctrineMode,
    shotsPerTarget,
    maxShotsPerTarget,
    pReengage,
    pkWarhead,
    pkDecoy,
  } = params;

  const pk = tgt.kind === "warhead" ? pkWarhead : pkDecoy;

  if (inventory <= 0) {
    return { killed: false, shotsFired: 0, inventoryRemaining: inventory };
  }

  if (doctrineMode === "barrage") {
    const alloc = Math.min(shotsPerTarget, inventory);
    if (alloc <= 0) {
      return { killed: false, shotsFired: 0, inventoryRemaining: inventory };
    }

    let killed = false;
    for (let s = 0; s < alloc; s++) {
      if (bernoulli(pk)) {
        killed = true;
        break;
      }
    }

    return {
      killed,
      shotsFired: alloc,
      inventoryRemaining: inventory - alloc,
    };
  }

  // Shoot-Look-Shoot (SLS)
  const cap = Math.min(maxShotsPerTarget, inventory);
  let shotsFired = 0;

  for (let s = 0; s < cap; s++) {
    // Fire one shot
    shotsFired += 1;
    const hit = bernoulli(pk);
    if (hit) {
      return {
        killed: true,
        shotsFired,
        inventoryRemaining: inventory - shotsFired,
      };
    }

    // Miss: decide whether re-engagement is feasible for next shot
    // (geometry/time-to-go proxy)
    const canReengage = bernoulli(pReengage);
    if (!canReengage) break;
  }

  return {
    killed: false,
    shotsFired,
    inventoryRemaining: inventory - shotsFired,
  };
}

/* --------------------------
   Trial reliability (Step 5)
-------------------------- */

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

/* --------------------------
   Core simulation
-------------------------- */

/**
 * Run one trial.
 *
 * Process for each object:
 * 1) Detect+track (compressed)
 * 2) If detected: classify as warhead-track vs not-warhead-track
 * 3) Engage ONLY warhead-tracks (finite inventory + doctrine)
 *
 * Key outcome: penetrated REAL warheads
 */
function runOneTrial(params) {
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

/**
 * Run Monte Carlo and summarize distributions.
 */
function runMonteCarlo(params) {
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

  const meanSystemUp = mean(systemUpFlags);

  return {
    penReal,
    intReal,
    shotsTot,
    fp,
    summary: {
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

      meanSystemUp, // share of trials where system is "up"
      meanPenRateReal:
        realWarheadsConst > 0 ? mean(penReal) / realWarheadsConst : 0,
    },
  };
}

/* --------------------------
   Visualization helpers
-------------------------- */

/**
 * Make a lightweight histogram (HTML bars) for an array of numbers.
 * @param {number[]} arr
 * @param {number} bins
 * @param {string} title
 * @param {Object} opts
 */
function renderHistogramHTML(arr, bins, title, opts = {}) {
  const width =
    opts && opts.width !== undefined && opts.width !== null ? opts.width : 320;

  const height =
    opts && opts.height !== undefined && opts.height !== null
      ? opts.height
      : 140;

  if (!arr || arr.length === 0) {
    return `<div class="chart"><div class="chart-title">${title}</div><div class="chart-empty">No data</div></div>`;
  }

  let minV = Math.min(...arr);
  let maxV = Math.max(...arr);
  if (minV === maxV) {
    minV = minV - 0.5;
    maxV = maxV + 0.5;
  }

  const counts = new Array(bins).fill(0);
  const span = maxV - minV;

  for (const v of arr) {
    let idx = Math.floor(((v - minV) / span) * bins);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }

  const maxC = Math.max(...counts);
  const barW = Math.floor(width / bins);

  const bars = counts
    .map((c, i) => {
      const barH = maxC > 0 ? Math.round((c / maxC) * height) : 0;
      const labelLo = minV + (i / bins) * span;
      const labelHi = minV + ((i + 1) / bins) * span;
      const tooltip = `${title}\nBin: ${labelLo.toFixed(1)}–${labelHi.toFixed(
        1
      )}\nCount: ${c}`;
      return `<div class="bar" title="${tooltip}" style="width:${barW}px;height:${barH}px"></div>`;
    })
    .join("");

  return `
    <div class="chart">
      <div class="chart-title">${title}</div>
      <div class="chart-frame" style="width:${width}px;height:${height}px">
        ${bars}
      </div>
      <div class="chart-axis">
        <span>${minV.toFixed(1)}</span>
        <span>${maxV.toFixed(1)}</span>
      </div>
    </div>
  `;
}

/* --------------------------
   UI
-------------------------- */

document.getElementById("app").innerHTML = `
  <div class="container">
    <h1>SHIELD Demo (Steps 2–5)</h1>
    <p class="subtitle">
      Missiles → MIRVs → decoys-as-objects; detection+tracking; classification; engage-only-warhead-tracks;
      doctrine (Barrage vs Shoot-Look-Shoot); common-mode reliability.
      <br/>
      <b>Key output:</b> penetrated <b>real warheads</b>.
    </p>

    <div class="grid">
      <label>
        Incoming missiles (N missiles)
        <input id="nMissiles" type="number" min="0" step="1" value="20" />
      </label>

      <label>
        MIRVs per missile
        <input id="mirvsPerMissile" type="number" min="1" step="1" value="5" />
      </label>

      <label>
        Decoys per real warhead
        <input id="decoysPerWarhead" type="number" min="0" step="1" value="2" />
      </label>

      <label>
        Detection + tracking probability (0–1)
        <input id="pDetectTrack" type="number" min="0" max="1" step="0.01" value="0.80" />
      </label>

      <label>
        Classifier: P(classify warhead | warhead) (0–1)
        <input id="pClassifyWarhead" type="number" min="0" max="1" step="0.01" value="0.80" />
      </label>

      <label>
        Classifier: P(classify warhead | decoy) (0–1)
        <input id="pFalseAlarmDecoy" type="number" min="0" max="1" step="0.01" value="0.20" />
      </label>

      <label>
        Doctrine mode
        <select id="doctrineMode">
          <option value="barrage">Barrage (allocate shots immediately)</option>
          <option value="sls">Shoot-Look-Shoot (SLS)</option>
        </select>
      </label>

      <label>
        Barrage: shots per engaged track
        <input id="shotsPerTarget" type="number" min="0" step="1" value="2" />
      </label>

      <label>
        SLS: max shots per engaged track
        <input id="maxShotsPerTarget" type="number" min="0" step="1" value="4" />
      </label>

      <label>
        SLS: P(re-engage after miss) (0–1)
        <input id="pReengage" type="number" min="0" max="1" step="0.01" value="0.85" />
      </label>

      <label>
        Pk per shot vs TRUE warhead (0–1)
        <input id="pkWarhead" type="number" min="0" max="1" step="0.01" value="0.60" />
      </label>

      <label>
        Pk per shot vs TRUE decoy (0–1)
        <input id="pkDecoy" type="number" min="0" max="1" step="0.01" value="0.80" />
      </label>

      <label>
        Interceptor inventory (N)
        <input id="nInventory" type="number" min="0" step="1" value="200" />
      </label>

      <label>
        Monte Carlo trials
        <input id="nTrials" type="number" min="1" step="100" value="2000" />
      </label>

      <label>
        System reliability: P(system up) (0–1)
        <input id="pSystemUp" type="number" min="0" max="1" step="0.01" value="0.90" />
      </label>

      <label>
        If system down: detection degrade factor (0–1)
        <input id="detectDegradeFactor" type="number" min="0" max="1" step="0.01" value="0.50" />
      </label>

      <label>
        If system down: Pk degrade factor (0–1)
        <input id="pkDegradeFactor" type="number" min="0" max="1" step="0.01" value="0.70" />
      </label>
    </div>

    <div class="note">
      <b>Classifier note:</b> “P(classify warhead | warhead)” is the true-positive rate.
      “P(classify warhead | decoy)” is the false-alarm rate (decoys mis-labeled as threats).
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

/* Add minimal CSS for charts if your styles.css is sparse */
(function injectChartCSS() {
  const css = `
    .charts { margin-top: 18px; }
    .charts-area { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start; }
    .chart { border:1px solid rgba(0,0,0,0.15); border-radius:8px; padding:10px; background:#fff; }
    .chart-title { font-weight:600; margin-bottom:8px; }
    .chart-frame { display:flex; align-items:flex-end; gap:1px; background:rgba(0,0,0,0.03); padding:6px; border-radius:6px; overflow:hidden; }
    .bar { background:rgba(0,0,0,0.55); border-radius:2px 2px 0 0; }
    .chart-axis { display:flex; justify-content:space-between; font-size:12px; opacity:0.75; margin-top:6px; }
    .chart-empty { font-size:12px; opacity:0.75; }
    .note { margin:12px 0; padding:10px; border:1px solid rgba(0,0,0,0.12); border-radius:8px; background:rgba(0,0,0,0.02); }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

function setSLSVisibility() {
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

document
  .getElementById("doctrineMode")
  .addEventListener("change", setSLSVisibility);
setSLSVisibility();

function readParamsFromUI() {
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
  };
}

function renderSummary(params, result) {
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
    `  Classifier TPR (warhead→warhead):   ${fmt(params.pClassifyWarhead, 2)}`,
    `  Classifier FPR (decoy→warhead):     ${fmt(params.pFalseAlarmDecoy, 2)}`,
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
    )} (observed ≈ ${fmt(s.meanSystemUp, 2)})`,
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
    `  True positives (warheads→warhead):  ${fmt(s.meanTP, 2)}`,
    `  False negatives (warheads→not):     ${fmt(s.meanFN, 2)}`,
    `  False positives (decoys→warhead):   ${fmt(s.meanFP, 2)}`,
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

function renderCharts(result) {
  const chartsArea = document.getElementById("chartsArea");
  const h1 = renderHistogramHTML(
    result.penReal,
    20,
    "Histogram: penetrated real warheads (per trial)",
    { width: 360, height: 140 }
  );
  const h2 = renderHistogramHTML(
    result.shotsTot,
    20,
    "Histogram: total shots fired (per trial)",
    { width: 360, height: 140 }
  );
  chartsArea.innerHTML = h1 + h2;
}

/* --------------------------
   Run wiring
-------------------------- */

function runAndRender() {
  const params = readParamsFromUI();
  const result = runMonteCarlo(params);

  document.getElementById("output").textContent = renderSummary(params, result);
  renderCharts(result);
}

document.getElementById("runBtn").addEventListener("click", runAndRender);

// Run once at load
runAndRender();
