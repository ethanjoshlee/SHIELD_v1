/**
 * SHIELD — App entry point.
 * Wires UI controls to the simulation engine.
 */

import { renderAppHTML, setSLSVisibility, readParamsFromUI } from './ui/controls.js';
import { injectChartCSS, renderCharts } from './ui/charts.js';
import { renderSummary } from './ui/tables.js';
import { runMonteCarlo } from './model/monteCarlo.js';

// Mount UI
document.getElementById("app").innerHTML = renderAppHTML();
injectChartCSS();
setSLSVisibility();

// Wire doctrine toggle
document.getElementById("doctrineMode").addEventListener("change", setSLSVisibility);

// Wire run button
function runAndRender() {
  const params = readParamsFromUI();
  const result = runMonteCarlo(params);
  document.getElementById("output").textContent = renderSummary(params, result);
  renderCharts(result);
}

document.getElementById("runBtn").addEventListener("click", runAndRender);

// Run once at load
runAndRender();
