/** Lazy Chart.js (BN-09) — vendor script + esbuild chunk with absolute /js/ URLs. */

let chartPromise = null;

/**
 * @param {Record<string, unknown>} mod
 * @returns {typeof Chart}
 */
function resolveChartExport(mod) {
  var Chart = /** @type {any} */ (mod).default;
  if (!Chart && /** @type {any} */ (mod).Chart) Chart = /** @type {any} */ (mod).Chart;
  if (!Chart) throw new Error('chart.js export missing');
  if (typeof globalThis !== 'undefined') /** @type {any} */ (globalThis).Chart = Chart;
  if (typeof window !== 'undefined') /** @type {any} */ (window).Chart = Chart;
  return Chart;
}

function chartVendorScriptUrl() {
  try {
    return new URL('/vendor/chart.umd.min.js', window.location.origin).href;
  } catch (_e) {
    return '/vendor/chart.umd.min.js';
  }
}

/**
 * @returns {Promise<typeof Chart>}
 */
function loadChartJsScript() {
  return new Promise(function (resolve, reject) {
    var existing = getChartJsIfLoaded();
    if (existing) {
      resolve(existing);
      return;
    }
    var script = document.createElement('script');
    script.src = chartVendorScriptUrl();
    script.async = false;
    script.onload = function () {
      var Chart = getChartJsIfLoaded();
      if (Chart) resolve(Chart);
      else reject(new Error('Chart.js script loaded but Chart global missing'));
    };
    script.onerror = function () {
      reject(new Error('Chart.js script failed: ' + script.src));
    };
    document.head.appendChild(script);
  });
}

/**
 * @returns {Promise<string | null>}
 */
async function resolveChartChunkUrl() {
  try {
    var res = await fetch('/js/chart-chunk.json', { cache: 'no-store' });
    if (res.ok) {
      var data = await res.json();
      if (data && typeof data.importUrl === 'string') return data.importUrl;
    }
  } catch (_e) {}
  return null;
}

async function loadChartJsEsm() {
  var url = await resolveChartChunkUrl();
  var mod = url
    ? await import(/* @vite-ignore */ url)
    : await import('chart.js/auto');
  return resolveChartExport(mod);
}

/**
 * @returns {Promise<typeof Chart>}
 */
export function loadChartJs() {
  var existing = getChartJsIfLoaded();
  if (existing) return Promise.resolve(existing);

  if (!chartPromise) {
    chartPromise = loadChartJsEsm()
      .catch(function (esmErr) {
        console.warn('[R+ Chart] ESM chunk failed, trying vendor script', esmErr);
        return loadChartJsScript();
      })
      .catch(function (err) {
        chartPromise = null;
        throw err;
      });
  }
  return chartPromise;
}

/** @returns {typeof Chart | undefined} */
export function getChartJsIfLoaded() {
  return (
    (typeof globalThis !== 'undefined' && /** @type {any} */ (globalThis).Chart) ||
    (typeof window !== 'undefined' && /** @type {any} */ (window).Chart) ||
    undefined
  );
}
