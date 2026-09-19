// public/js/vendor-loader.mjs
var chartPromise = null;
function publicAssetUrl(pathname) {
  var clean = String(pathname || "").replace(/^\/+/, "");
  try {
    return new URL(clean, window.location.href).href;
  } catch {
    return "/" + clean;
  }
}
function injectChartVendorScript() {
  return new Promise(function(resolve, reject) {
    var existing = getChartJsIfLoaded();
    if (existing) {
      resolve(existing);
      return;
    }
    var script = document.createElement("script");
    script.src = publicAssetUrl("vendor/chart.umd.min.js");
    script.async = false;
    script.onload = function() {
      var Chart = getChartJsIfLoaded();
      if (Chart) resolve(Chart);
      else reject(new Error("Chart.js script loaded but Chart global missing"));
    };
    script.onerror = function() {
      reject(new Error("Chart.js script failed: " + script.src));
    };
    document.head.appendChild(script);
  });
}
function loadChartJs() {
  var existing = getChartJsIfLoaded();
  if (existing) return Promise.resolve(existing);
  if (!chartPromise) {
    chartPromise = injectChartVendorScript().catch(function(err) {
      chartPromise = null;
      throw err;
    });
  }
  return chartPromise;
}
function getChartJsIfLoaded() {
  return typeof globalThis !== "undefined" && /** @type {any} */
  globalThis.Chart || typeof window !== "undefined" && /** @type {any} */
  window.Chart || void 0;
}

export {
  loadChartJs,
  getChartJsIfLoaded
};
//# sourceMappingURL=/js/chunks/chunk-MST23B4T.js.map
