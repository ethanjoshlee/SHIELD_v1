/**
 * Chart rendering — lightweight HTML histograms.
 */

/**
 * Make a lightweight histogram (HTML bars) for an array of numbers.
 * @param {number[]} arr
 * @param {number} bins
 * @param {string} title
 * @param {Object} opts
 */
export function renderHistogramHTML(arr, bins, title, opts = {}) {
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
      const tooltip = `${title}\nBin: ${labelLo.toFixed(1)}\u2013${labelHi.toFixed(
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

/**
 * Inject minimal CSS for charts.
 */
export function injectChartCSS() {
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
}

/**
 * Render histograms into the charts area.
 */
export function renderCharts(result) {
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
