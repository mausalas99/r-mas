import {
  isGlucometriaMarkedAltered,
  isVitalAltered
} from "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import {
  gluPointMs,
  isGluPointInRegistroWindow
} from "/mobile/js/chunks/chunk-URXNXYS2.js";

// public/js/features/estado-actual-charts-series.mjs
var VITAL_LABELS = {
  tas: "TAS",
  tad: "TAD",
  fc: "FC",
  fr: "FR",
  temp: "Temp",
  sat: "SatO\u2082"
};
var VITAL_FAMILIES = [
  { id: "hemo", title: "Hemodin\xE1mico", keys: ["tas", "tad", "fc"] },
  { id: "resp", title: "Respiratorio", keys: ["fr", "sat"] },
  { id: "metab", title: "Metab\xF3lico", keys: ["temp"] }
];
var VITAL_COLOR_TOKENS = [
  "--ea-chart-vital-1",
  "--ea-chart-vital-2",
  "--ea-chart-vital-3",
  "--ea-chart-vital-4",
  "--ea-chart-vital-5",
  "--ea-chart-vital-6"
];
var CHART_TOKEN_FALLBACKS = {
  "--ea-chart-vital-1": "var(--color-accent)",
  "--ea-chart-vital-2": "#c62828",
  "--ea-chart-vital-3": "#047857",
  "--ea-chart-vital-4": "#b45309",
  "--ea-chart-vital-5": "#0891b2",
  "--ea-chart-vital-6": "#7c3aed",
  "--ea-chart-glu": "#047857",
  "--ea-chart-io-ing": "#60a5fa",
  "--ea-chart-io-egr": "#f87171",
  "--ea-chart-io-balance": "var(--color-accent)",
  "--ea-chart-altered": "#b45309"
};
var chartColorCache = null;
function ensureChartColorCache() {
  if (chartColorCache) return chartColorCache;
  var out = {};
  Object.keys(CHART_TOKEN_FALLBACKS).forEach(function(token) {
    var fallback = CHART_TOKEN_FALLBACKS[token] || "var(--color-accent)";
    if (typeof document === "undefined") {
      out[token] = fallback;
      return;
    }
    var value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    out[token] = value || fallback;
  });
  chartColorCache = out;
  return out;
}
function chartColor(token) {
  var cache = ensureChartColorCache();
  return cache[token] || CHART_TOKEN_FALLBACKS[token] || "var(--color-accent)";
}
function vitalSeriesColor(index) {
  var token = VITAL_COLOR_TOKENS[index % VITAL_COLOR_TOKENS.length];
  return chartColor(token);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatChartLabel(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return formatChartLocalDateTime(d);
}
function formatChartLocalDateTime(d) {
  return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function formatChartLabelFromMs(ms) {
  if (!ms) return "";
  var d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return formatChartLocalDateTime(d);
}
function hasIoPair(io) {
  if (!io || typeof io !== "object") return false;
  var ing = (
    /** @type {{ ing?: unknown, egr?: unknown }} */
    io.ing
  );
  var egr = (
    /** @type {{ ing?: unknown, egr?: unknown }} */
    io.egr
  );
  if (ing == null || ing === "" || egr == null || egr === "") return false;
  var ingN = Number(ing);
  var egrN = Number(egr);
  return Number.isFinite(ingN) && Number.isFinite(egrN);
}
function historialSortedAsc(historial) {
  return historial.slice().sort(function(a, b) {
    var ra = typeof a === "object" && a && "recordedAt" in a ? String(
      /** @type {any} */
      a.recordedAt
    ) : "";
    var rb = typeof b === "object" && b && "recordedAt" in b ? String(
      /** @type {any} */
      b.recordedAt
    ) : "";
    return ra.localeCompare(rb);
  });
}
function buildIoChartData(histAsc) {
  var labels = [];
  var ing = [];
  var egr = [];
  var turnBalance = [];
  var globalBalance = [];
  var running = 0;
  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== "object") continue;
    var io = (
      /** @type {any} */
      row.io && typeof /** @type {any} */
      row.io === "object" ? (
        /** @type {any} */
        /** @type {any} */
        row.io
      ) : {}
    );
    if (!hasIoPair(io)) continue;
    var ingN = Number(io.ing);
    var egrN = Number(io.egr);
    var turn = ingN - egrN;
    running += turn;
    labels.push(formatChartLabel(
      /** @type {any} */
      row.recordedAt
    ));
    ing.push(ingN);
    egr.push(egrN);
    turnBalance.push(turn);
    globalBalance.push(running);
  }
  return { labels, ing, egr, turnBalance, globalBalance };
}
function lineDataset(labels, values, alteredFlags, color) {
  var hasAltered = false;
  for (var ai = 0; ai < alteredFlags.length; ai += 1) {
    if (alteredFlags[ai]) {
      hasAltered = true;
      break;
    }
  }
  if (!hasAltered) {
    return {
      label: "",
      data: values,
      borderColor: color,
      backgroundColor: color,
      pointRadius: 2,
      tension: 0,
      spanGaps: true
    };
  }
  var alteredColor = chartColor("--ea-chart-altered");
  var pointRadius = values.map(function(_v, i) {
    return alteredFlags[i] ? 6 : 3;
  });
  var pointBackgroundColor = values.map(function(_v, i) {
    return alteredFlags[i] ? alteredColor : color;
  });
  return {
    label: "",
    data: values,
    borderColor: color,
    backgroundColor: color,
    pointRadius,
    pointBackgroundColor,
    pointBorderColor: pointBackgroundColor,
    tension: 0,
    spanGaps: true
  };
}
function rowHasVitalKeys(row, keys) {
  var vit = (
    /** @type {any} */
    row.vitals && typeof /** @type {any} */
    row.vitals === "object" ? (
      /** @type {any} */
      /** @type {any} */
      row.vitals
    ) : {}
  );
  for (var ki = 0; ki < keys.length; ki++) {
    var raw = vit[keys[ki]];
    if (raw != null && raw !== "") return true;
  }
  return false;
}
function filterHistorialWithVitals(histAsc, keys) {
  var rows = [];
  for (var ri = 0; ri < histAsc.length; ri++) {
    var row = histAsc[ri];
    if (!row || typeof row !== "object") continue;
    if (rowHasVitalKeys(row, keys)) rows.push(row);
  }
  return rows;
}
function buildVitalDatasetForKey(rows, labels, key, k) {
  var values = [];
  var alteredFlags = [];
  var count = 0;
  for (var j = 0; j < rows.length; j++) {
    var r2 = rows[j];
    var vit2 = (
      /** @type {any} */
      r2.vitals && typeof /** @type {any} */
      r2.vitals === "object" ? (
        /** @type {any} */
        /** @type {any} */
        r2.vitals
      ) : {}
    );
    var raw2 = vit2[key];
    if (raw2 == null || raw2 === "") {
      values.push(null);
      alteredFlags.push(false);
      continue;
    }
    var n = Number(raw2);
    if (!Number.isFinite(n)) {
      values.push(null);
      alteredFlags.push(false);
      continue;
    }
    values.push(n);
    count++;
    var rowAlt = (
      /** @type {any} */
      r2.alteredAt && typeof /** @type {any} */
      r2.alteredAt === "object" ? (
        /** @type {Record<string, string>} */
        /** @type {any} */
        r2.alteredAt
      ) : {}
    );
    alteredFlags.push(isVitalAltered(key, raw2) || !!(rowAlt && rowAlt[key]));
  }
  if (count < 2) return null;
  var color = vitalSeriesColor(k);
  var ds = lineDataset(labels, values, alteredFlags, color);
  ds.label = VITAL_LABELS[key] || key;
  return ds;
}
function buildVitalsFamilyData(histAsc, keys) {
  var rows = filterHistorialWithVitals(histAsc, keys);
  if (rows.length < 2) return null;
  var labels = rows.map(function(r) {
    return formatChartLabel(
      /** @type {any} */
      r.recordedAt
    );
  });
  var datasets = [];
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var ds = buildVitalDatasetForKey(rows, labels, key, k);
    if (ds) datasets.push(ds);
  }
  if (!datasets.length) return null;
  return { labels, datasets };
}
function pushGluReadingPoints(points, recordedAt, readings, now, opts) {
  opts = opts || {};
  var forCharts = opts.forCharts === true;
  for (var g = 0; g < readings.length; g++) {
    var glu = readings[g];
    if (!glu || typeof glu !== "object") continue;
    var val = Number(
      /** @type {any} */
      glu.value
    );
    if (!Number.isFinite(val)) continue;
    var timeHm = (
      /** @type {any} */
      glu.time ? String(
        /** @type {any} */
        glu.time
      ) : ""
    );
    var ms = gluPointMs(recordedAt, timeHm);
    if (!forCharts && !isGluPointInRegistroWindow(ms, now)) continue;
    points.push({
      ms,
      label: formatChartLabelFromMs(ms),
      value: val,
      altered: isGlucometriaMarkedAltered(
        /** @type {{ altered?: boolean, value?: unknown }} */
        glu
      )
    });
  }
}
function buildGluSeries(histAsc, now, seriesOpts) {
  var points = [];
  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== "object") continue;
    var recordedAt = String(
      /** @type {any} */
      row.recordedAt || ""
    );
    var glus = Array.isArray(
      /** @type {any} */
      row.glucometrias
    ) ? (
      /** @type {any} */
      /** @type {any} */
      row.glucometrias
    ) : [];
    pushGluReadingPoints(points, recordedAt, glus, now, seriesOpts);
    var bombas = Array.isArray(
      /** @type {any} */
      row.bombaInsulina
    ) ? (
      /** @type {any} */
      /** @type {any} */
      row.bombaInsulina
    ) : [];
    pushGluReadingPoints(points, recordedAt, bombas, now, seriesOpts);
  }
  points.sort(function(a, b) {
    return a.ms - b.ms;
  });
  return {
    labels: points.map(function(p) {
      return p.label;
    }),
    values: points.map(function(p) {
      return p.value;
    }),
    alteredFlags: points.map(function(p) {
      return p.altered;
    })
  };
}
function glucometriaSignature(rows) {
  return rows.map(function(g) {
    if (!g || typeof g !== "object") return "";
    return String(
      /** @type {any} */
      g.time || ""
    ) + "@" + String(
      /** @type {any} */
      g.value || ""
    );
  }).join(";");
}
function vitalsFingerprint(vit) {
  return String(vit.tas || "") + "/" + String(vit.tad || "") + "/" + String(vit.fc || "") + "/" + String(vit.fr || "") + "/" + String(vit.temp || "") + "/" + String(vit.sat || "");
}
function eaHistorialRowFingerprint(row) {
  if (!row || typeof row !== "object") return "";
  var r = row;
  var vit = r.vitals && typeof r.vitals === "object" ? r.vitals : {};
  var io = r.io && typeof r.io === "object" ? r.io : {};
  var gluSig = glucometriaSignature(Array.isArray(r.glucometrias) ? r.glucometrias : []);
  var bombaSig = glucometriaSignature(Array.isArray(r.bombaInsulina) ? r.bombaInsulina : []);
  return String(r.id || "") + "@" + String(r.recordedAt || "") + ":" + vitalsFingerprint(vit) + ":" + String(io.ing || "") + "/" + String(io.egr || "") + ":" + gluSig + ":" + bombaSig;
}
function buildEaChartsSignatureFromHist(histAsc) {
  var parts = ["n" + histAsc.length];
  for (var i = 0; i < histAsc.length; i += 1) {
    parts.push(eaHistorialRowFingerprint(histAsc[i]));
  }
  return parts.join("|");
}
function historialChartRevision(hist) {
  var n = hist.length;
  if (!n) return "0";
  var parts = ["n" + n];
  for (var i = Math.max(0, n - 4); i < n; i += 1) {
    parts.push(eaHistorialRowFingerprint(hist[i]));
  }
  return parts.join("|");
}
function countFiniteVitalValues(rows, key) {
  var count = 0;
  for (var j = 0; j < rows.length; j++) {
    var vit2 = (
      /** @type {any} */
      rows[j].vitals && typeof /** @type {any} */
      rows[j].vitals === "object" ? (
        /** @type {any} */
        /** @type {any} */
        rows[j].vitals
      ) : {}
    );
    var raw2 = vit2[key];
    if (raw2 == null || raw2 === "") continue;
    if (!Number.isFinite(Number(raw2))) continue;
    count += 1;
  }
  return count;
}
function scanFamilyChartReady(histAsc, keys) {
  var rows = filterHistorialWithVitals(histAsc, keys);
  if (rows.length < 2) return false;
  for (var k = 0; k < keys.length; k++) {
    if (countFiniteVitalValues(rows, keys[k]) >= 2) return true;
  }
  return false;
}
function scanEaChartsSummary(monitoreo) {
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var vitalsReady = false;
  for (var fi = 0; fi < VITAL_FAMILIES.length; fi += 1) {
    if (scanFamilyChartReady(histAsc, VITAL_FAMILIES[fi].keys)) {
      vitalsReady = true;
      break;
    }
  }
  var gluSeries = buildGluSeries(histAsc, void 0, { forCharts: true });
  var ioData = buildIoChartData(histAsc);
  return {
    measurementCount: histAsc.length,
    vitalsReady,
    gluReady: gluSeries.values.length >= 2,
    gluLatest: gluSeries.values.length ? gluSeries.values[gluSeries.values.length - 1] : null,
    gluPointCount: gluSeries.values.length,
    ioReady: ioData.labels.length >= 2,
    ioPointCount: ioData.labels.length,
    ioTurn: ioData.labels.length >= 2 && ioData.turnBalance.length ? ioData.turnBalance[ioData.turnBalance.length - 1] : null
  };
}

// public/js/features/estado-actual-charts-display.mjs
var EA_CHART_DISPLAY_POINTS = 100;
var EA_CHART_CACHE_REV = "glu-dt-v2";
function stripMonitoreoChartRuntimeCache(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  var m = monitoreo;
  delete m._eaChartBundle;
  delete m._eaChartBundleRev;
  delete m._eaChartsSummary;
  delete m._eaChartsSummaryRev;
}
function eaChartCacheRev(hist) {
  return historialChartRevision(hist) + "|" + EA_CHART_CACHE_REV;
}
function buildEaDisplayIndices(length, maxPoints) {
  var slots = maxPoints == null ? EA_CHART_DISPLAY_POINTS : maxPoints;
  if (length <= slots) {
    var all = [];
    for (var i = 0; i < length; i += 1) all.push(i);
    return all;
  }
  var out = [];
  for (var j = 0; j < slots; j += 1) {
    out.push(Math.round(j * (length - 1) / (slots - 1)));
  }
  return out;
}
function downsampleEaChartSeries(labels, values, alteredFlags, maxPoints) {
  var indices = buildEaDisplayIndices(labels.length, maxPoints);
  return {
    labels: indices.map(function(i) {
      return labels[i];
    }),
    values: indices.map(function(i) {
      return values[i];
    }),
    alteredFlags: alteredFlags ? indices.map(function(i) {
      return !!alteredFlags[i];
    }) : [],
    sourceIndices: indices,
    fullLabels: labels,
    fullValues: values
  };
}
function attachEaSeriesMetadata(ds, fullLabels, fullValues, sourceIndices) {
  ds._eaFullLabels = fullLabels;
  ds._eaFullValues = fullValues;
  ds._eaSourceIndices = sourceIndices;
}
function displayVitalsFamilyData(famData) {
  if (famData.labels.length <= EA_CHART_DISPLAY_POINTS) {
    famData.datasets.forEach(function(ds) {
      var indices2 = buildEaDisplayIndices(famData.labels.length);
      attachEaSeriesMetadata(ds, famData.labels, ds.data, indices2);
    });
    return famData;
  }
  var indices = buildEaDisplayIndices(famData.labels.length);
  var labels = indices.map(function(i) {
    return famData.labels[i];
  });
  var datasets = famData.datasets.map(function(ds) {
    var next = Object.assign({}, ds);
    next.data = indices.map(function(i) {
      return ds.data[i];
    });
    if (Array.isArray(ds.pointRadius)) {
      next.pointRadius = indices.map(function(i) {
        return ds.pointRadius[i];
      });
    }
    if (Array.isArray(ds.pointBackgroundColor)) {
      next.pointBackgroundColor = indices.map(function(i) {
        return ds.pointBackgroundColor[i];
      });
      next.pointBorderColor = next.pointBackgroundColor;
    }
    attachEaSeriesMetadata(next, famData.labels, ds.data, indices);
    return next;
  });
  return { labels, datasets };
}
function displayGluChartData(gluData) {
  var ds = gluData.datasets[0];
  if (!ds) return gluData;
  var alteredFlags = Array.isArray(gluData._alteredFlags) ? gluData._alteredFlags : [];
  var sampled = downsampleEaChartSeries(
    gluData.labels,
    /** @type {number[]} */
    ds.data,
    alteredFlags,
    EA_CHART_DISPLAY_POINTS
  );
  var nextDs = lineDataset(
    sampled.labels,
    sampled.values,
    sampled.alteredFlags,
    ds.borderColor || chartColor("--ea-chart-glu")
  );
  nextDs.label = ds.label || "Glu (mg/dL)";
  attachEaSeriesMetadata(nextDs, sampled.fullLabels, sampled.fullValues, sampled.sourceIndices);
  return { labels: sampled.labels, datasets: [nextDs] };
}
function displayIoChartData(ioSlot) {
  if (ioSlot.labels.length <= EA_CHART_DISPLAY_POINTS) return ioSlot;
  var indices = buildEaDisplayIndices(ioSlot.labels.length);
  var pick = function(arr) {
    return indices.map(function(i) {
      return arr[i];
    });
  };
  var fullLabels = ioSlot.labels;
  var fullIng = ioSlot.datasets[0].data;
  var fullEgr = ioSlot.datasets[1].data;
  var fullBal = ioSlot.datasets[2].data;
  var meta = { _eaFullLabels: fullLabels, _eaSourceIndices: indices };
  return {
    labels: pick(fullLabels),
    datasets: [
      Object.assign({ label: "Ingresos", data: pick(fullIng) }, meta, { _eaFullValues: fullIng }),
      Object.assign({ label: "Egresos", data: pick(fullEgr) }, meta, { _eaFullValues: fullEgr }),
      Object.assign(
        { type: "line", label: "Balance global", data: pick(fullBal) },
        meta,
        { _eaFullValues: fullBal }
      )
    ]
  };
}
function displaySlotForChart(slotData, slotId) {
  if (slotId.indexOf("vital:") === 0) {
    var fam = slotData[slotId];
    return fam ? displayVitalsFamilyData(fam) : null;
  }
  if (slotId === "glu") {
    return slotData.glu ? displayGluChartData(slotData.glu) : null;
  }
  if (slotId === "io") {
    return slotData.io ? displayIoChartData(slotData.io) : null;
  }
  return slotData[slotId] || null;
}
function prepareEaChartBundle(monitoreo) {
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var slotData = {};
  var layoutParts = [];
  var vitalsReady = false;
  VITAL_FAMILIES.forEach(function(fam) {
    var famData = buildVitalsFamilyData(histAsc, fam.keys);
    layoutParts.push(fam.id + ":" + (famData ? "1" : "0"));
    if (famData) {
      vitalsReady = true;
      slotData["vital:" + fam.id] = { labels: famData.labels, datasets: famData.datasets };
    }
  });
  var gluSeries = buildGluSeries(histAsc, void 0, { forCharts: true });
  layoutParts.push("g" + gluSeries.values.length);
  if (gluSeries.values.length >= 2) {
    var gluColor = chartColor("--ea-chart-glu");
    var gluDs = lineDataset(gluSeries.labels, gluSeries.values, gluSeries.alteredFlags || [], gluColor);
    gluDs.label = "Glu (mg/dL)";
    slotData.glu = {
      labels: gluSeries.labels,
      datasets: [gluDs],
      _alteredFlags: gluSeries.alteredFlags || []
    };
  }
  var ioData = buildIoChartData(histAsc);
  layoutParts.push("i" + ioData.labels.length);
  if (ioData.labels.length >= 2) {
    slotData.io = {
      labels: ioData.labels,
      datasets: [
        { label: "Ingresos", data: ioData.ing },
        { label: "Egresos", data: ioData.egr },
        {
          type: "line",
          label: "Balance global",
          data: ioData.globalBalance
        }
      ]
    };
  }
  var summary = scanEaChartsSummary(monitoreo);
  summary.vitalsReady = vitalsReady;
  return {
    histAsc,
    slotData,
    layoutKey: layoutParts.join("|"),
    signature: buildEaChartsSignatureFromHist(histAsc),
    summary
  };
}
function getCachedEaChartBundle(monitoreo) {
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var rev = eaChartCacheRev(hist);
  if (m._eaChartBundle && m._eaChartBundleRev === rev) {
    return m._eaChartBundle;
  }
  var bundle = prepareEaChartBundle(monitoreo);
  m._eaChartBundleRev = rev;
  m._eaChartBundle = bundle;
  return bundle;
}
function getCachedEaChartsSummary(monitoreo) {
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var rev = eaChartCacheRev(hist);
  if (m._eaChartsSummary && m._eaChartsSummaryRev === rev) {
    return m._eaChartsSummary;
  }
  var summary = scanEaChartsSummary(monitoreo);
  m._eaChartsSummaryRev = rev;
  m._eaChartsSummary = summary;
  return summary;
}

// public/js/features/estado-actual-charts-chartjs.mjs
var eaChartInstance = null;
function resolveChartCtor(ChartCtor) {
  if (ChartCtor) return ChartCtor;
  if (typeof globalThis !== "undefined" && /** @type {any} */
  globalThis.Chart) {
    return (
      /** @type {any} */
      globalThis.Chart
    );
  }
  if (typeof window !== "undefined" && /** @type {any} */
  window.Chart) {
    return (
      /** @type {any} */
      window.Chart
    );
  }
  return null;
}
function destroyEaChartInstance() {
  if (eaChartInstance) {
    try {
      eaChartInstance.destroy();
    } catch (_e) {
      void _e;
    }
    eaChartInstance = null;
  }
}
function eaChartTooltipPlugin() {
  return {
    tooltip: {
      animation: false,
      mode: "index",
      intersect: false,
      position: "nearest",
      callbacks: {
        title: function(items) {
          if (!items || !items.length) return "";
          var ds = items[0].dataset;
          var idx = items[0].dataIndex;
          var src = ds._eaSourceIndices && ds._eaSourceIndices[idx] != null ? ds._eaSourceIndices[idx] : idx;
          if (ds._eaFullLabels && ds._eaFullLabels[src] != null) return String(ds._eaFullLabels[src]);
          return String(items[0].label || "");
        },
        label: function(ctx) {
          var ds = ctx.dataset;
          var idx = ctx.dataIndex;
          var src = ds._eaSourceIndices && ds._eaSourceIndices[idx] != null ? ds._eaSourceIndices[idx] : idx;
          var val = ds._eaFullValues && ds._eaFullValues[src] != null ? ds._eaFullValues[src] : ctx.parsed.y;
          var label = ds.label || "";
          return label ? label + ": " + val : String(val);
        }
      }
    }
  };
}
function eaLineChartOptions(extra) {
  return Object.assign(
    {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      transitions: {
        active: { animation: { duration: 0 } }
      },
      layout: { padding: { right: 12, left: 4, top: 8, bottom: 4 } },
      interaction: { mode: "index", intersect: false, axis: "x" },
      plugins: Object.assign(
        {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, font: { size: 11 }, padding: 10 }
          }
        },
        eaChartTooltipPlugin()
      ),
      elements: {
        point: { radius: 3, hoverRadius: 5 },
        line: { borderWidth: 2, tension: 0.25 }
      },
      scales: {
        y: { grace: "5%", ticks: { font: { size: 11 }, maxTicksLimit: 6 } },
        x: {
          ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 },
          offset: true
        }
      }
    },
    extra || {}
  );
}
function eaIoChartOptions() {
  return eaLineChartOptions({
    plugins: Object.assign(
      { legend: { position: "bottom", labels: { font: { size: 11 } } } },
      eaChartTooltipPlugin()
    ),
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "cc", font: { size: 11 } },
        ticks: { font: { size: 11 }, maxTicksLimit: 6 }
      },
      y1: {
        position: "right",
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Balance acum.", font: { size: 11 } },
        ticks: { font: { size: 11 }, maxTicksLimit: 6 }
      },
      x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } }
    }
  });
}
function paintEaChart(ChartCtor, canvas, spec) {
  var Chart = resolveChartCtor(ChartCtor);
  if (!Chart || !canvas) return null;
  var sameCanvas = eaChartInstance && eaChartInstance.canvas === canvas;
  var sameType = sameCanvas && eaChartInstance.config && eaChartInstance.config.type === spec.type;
  if (sameCanvas && sameType) {
    eaChartInstance.data.labels = spec.data.labels;
    eaChartInstance.data.datasets = spec.data.datasets;
    eaChartInstance.options = spec.options;
    eaChartInstance._eaSlotId = spec.slotId || "";
    eaChartInstance.update("none");
    return eaChartInstance;
  }
  destroyEaChartInstance();
  eaChartInstance = new /** @type {any} */
  Chart(canvas, {
    type: spec.type,
    data: spec.data,
    options: spec.options
  });
  eaChartInstance._eaSlotId = spec.slotId || "";
  return eaChartInstance;
}

// public/js/features/estado-actual-charts-tabs.mjs
function getCanvas() {
  return (
    /** @type {HTMLCanvasElement | null} */
    document.getElementById("ea-charts-canvas")
  );
}
function getTabNav() {
  return document.getElementById("ea-charts-tab-nav");
}
function getVitalsNav() {
  return document.getElementById("ea-charts-vitals-nav");
}
function getChartTitle() {
  return document.getElementById("ea-charts-chart-title");
}
function getEmptyEl() {
  return document.getElementById("ea-charts-empty");
}
function destroyAllEaTabCharts(_mountEl) {
  destroyEaChartInstance();
}
function eaChartTabHasData(slotData, tab) {
  if (tab === "vitals") {
    return VITAL_FAMILIES.some(function(fam) {
      return !!slotData["vital:" + fam.id];
    });
  }
  if (tab === "glu") return !!slotData.glu;
  if (tab === "io") return !!slotData.io;
  return false;
}
function defaultEaChartTab(slotData) {
  if (eaChartTabHasData(slotData, "vitals")) return "vitals";
  if (eaChartTabHasData(slotData, "glu")) return "glu";
  return "io";
}
function defaultEaVitalFamilyId(slotData) {
  for (var i = 0; i < VITAL_FAMILIES.length; i += 1) {
    if (slotData["vital:" + VITAL_FAMILIES[i].id]) return VITAL_FAMILIES[i].id;
  }
  return "";
}
function buildEaChartsTabNav(slotData) {
  var tabs = [
    { id: "vitals", label: "Signos vitales" },
    { id: "glu", label: "Glucometr\xEDas" },
    { id: "io", label: "Balance h\xEDdrico" }
  ];
  return tabs.map(function(t) {
    var has = eaChartTabHasData(slotData, t.id);
    return '<button type="button" role="tab" class="ea-charts-tab" data-ea-chart-tab="' + t.id + '" aria-selected="false"' + (has ? "" : " disabled") + ">" + t.label + "</button>";
  }).join("");
}
function buildEaVitalsFamilyNav(slotData) {
  return VITAL_FAMILIES.filter(function(fam) {
    return !!slotData["vital:" + fam.id];
  }).map(function(fam) {
    return '<button type="button" role="tab" class="ea-vitals-family-btn" data-ea-vital-family="' + fam.id + '" aria-selected="false">' + fam.title + "</button>";
  }).join("");
}
function markEaVitalFamilyActive(famId) {
  var nav = getVitalsNav();
  if (!nav) return;
  nav.querySelectorAll("[data-ea-vital-family]").forEach(function(btn) {
    var active = btn.getAttribute("data-ea-vital-family") === famId;
    btn.classList.toggle("ea-vitals-family-btn--active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}
function markEaTabActive(tab) {
  var nav = getTabNav();
  if (!nav) return;
  nav.querySelectorAll(".ea-charts-tab").forEach(function(btn) {
    var active = btn.getAttribute("data-ea-chart-tab") === tab;
    btn.classList.toggle("ea-charts-tab--active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}
function syncActiveEaChartsRef(mountEl, tab) {
  var chart = mountEl._eaChartInstance;
  mountEl._eaCharts = chart ? [chart] : [];
  mountEl._eaChartSlotIds = chart && chart._eaSlotId ? [chart._eaSlotId] : [];
  mountEl._eaActiveChartTab = tab;
}
function paintEaVitalsTab(mountEl, ChartCtor, famId, bundle, canvas, titleEl, vitalsNav) {
  var slotData = bundle.slotData;
  var familyId = famId || mountEl._eaActiveVitalFamily || defaultEaVitalFamilyId(slotData);
  if (!slotData["vital:" + familyId]) familyId = defaultEaVitalFamilyId(slotData);
  mountEl._eaActiveVitalFamily = familyId;
  if (vitalsNav) {
    vitalsNav.hidden = false;
    markEaVitalFamilyActive(familyId);
  }
  var fam = VITAL_FAMILIES.find(function(f) {
    return f.id === familyId;
  });
  var raw = slotData["vital:" + familyId];
  if (!raw || !fam) return;
  var famData = displayVitalsFamilyData(raw);
  if (titleEl) titleEl.textContent = fam.title;
  mountEl._eaChartInstance = paintEaChart(ChartCtor, canvas, {
    type: "line",
    slotId: "vital:" + familyId,
    data: { labels: famData.labels, datasets: famData.datasets },
    options: eaLineChartOptions()
  });
}
function paintEaGluTab(ChartCtor, bundle, canvas, titleEl) {
  var gluRaw = bundle.slotData.glu;
  if (!gluRaw) return;
  var gluDisplay = displayGluChartData(gluRaw);
  if (titleEl) titleEl.textContent = "Serie temporal";
  return paintEaChart(ChartCtor, canvas, {
    type: "line",
    slotId: "glu",
    data: gluDisplay,
    options: eaLineChartOptions({
      plugins: Object.assign({ legend: { display: false } }, eaChartTooltipPlugin()),
      scales: {
        y: { grace: "5%", title: { display: true, text: "mg/dL", font: { size: 11 } } },
        x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 12 } }
      }
    })
  });
}
function paintEaIoTab(ChartCtor, bundle, canvas, titleEl) {
  var ioRaw = bundle.slotData.io;
  if (!ioRaw) return;
  var ioDisplay = displayIoChartData(ioRaw);
  if (titleEl) titleEl.textContent = "Ingresos / egresos y balance global";
  return paintEaChart(ChartCtor, canvas, {
    type: "bar",
    slotId: "io",
    data: {
      labels: ioDisplay.labels,
      datasets: [
        {
          label: "Ingresos",
          data: ioDisplay.datasets[0].data,
          backgroundColor: chartColor("--ea-chart-io-ing"),
          borderRadius: 4,
          order: 2
        },
        {
          label: "Egresos",
          data: ioDisplay.datasets[1].data,
          backgroundColor: chartColor("--ea-chart-io-egr"),
          borderRadius: 4,
          order: 2
        },
        {
          type: "line",
          label: "Balance global",
          data: ioDisplay.datasets[2].data,
          borderColor: chartColor("--ea-chart-io-balance"),
          backgroundColor: chartColor("--ea-chart-io-balance"),
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.25,
          yAxisID: "y1",
          order: 1
        }
      ]
    },
    options: eaIoChartOptions()
  });
}
function paintEaChartView(mountEl, ChartCtor, tab, famId, bundle) {
  var canvas = getCanvas();
  var titleEl = getChartTitle();
  var emptyEl = getEmptyEl();
  var vitalsNav = getVitalsNav();
  if (!canvas) return;
  if (emptyEl) emptyEl.hidden = true;
  canvas.hidden = false;
  if (tab === "vitals") {
    paintEaVitalsTab(mountEl, ChartCtor, famId, bundle, canvas, titleEl, vitalsNav);
    return;
  }
  if (vitalsNav) vitalsNav.hidden = true;
  if (tab === "glu") {
    mountEl._eaChartInstance = paintEaGluTab(ChartCtor, bundle, canvas, titleEl);
    return;
  }
  if (tab === "io") {
    mountEl._eaChartInstance = paintEaIoTab(ChartCtor, bundle, canvas, titleEl);
  }
}
function activateEaChartTab(mountEl, tab, bundle, ChartCtor, layoutKey) {
  if (!mountEl || !resolveChartCtor(ChartCtor) || !eaChartTabHasData(bundle.slotData, tab)) return;
  markEaTabActive(tab);
  paintEaChartView(mountEl, ChartCtor, tab, void 0, bundle);
  syncActiveEaChartsRef(mountEl, tab);
  mountEl._eaChartsLayoutKey = layoutKey;
  mountEl._eaChartsSig = bundle.signature;
}
function wireEaChartsTabs(mountEl, bundle, ChartCtor, layoutKey) {
  mountEl._eaChartBundle = bundle;
  mountEl._eaChartLayoutKey = layoutKey;
  mountEl._eaChartCtor = ChartCtor;
  if (mountEl._eaChartsTabsWired) return;
  mountEl._eaChartsTabsWired = true;
  mountEl.addEventListener("click", function(ev) {
    var target = (
      /** @type {HTMLElement | null} */
      ev.target
    );
    if (!target || typeof target.closest !== "function") return;
    var liveBundle = mountEl._eaChartBundle || bundle;
    var liveChart = mountEl._eaChartCtor || resolveChartCtor(null);
    var liveLayoutKey = mountEl._eaChartLayoutKey || layoutKey;
    var famBtn = (
      /** @type {HTMLElement | null} */
      target.closest("[data-ea-vital-family]")
    );
    if (famBtn && !famBtn.disabled) {
      var famId = famBtn.getAttribute("data-ea-vital-family");
      if (famId && famId !== mountEl._eaActiveVitalFamily) {
        paintEaChartView(mountEl, liveChart, "vitals", famId, liveBundle);
        syncActiveEaChartsRef(mountEl, "vitals");
      }
      return;
    }
    var btn = (
      /** @type {HTMLElement | null} */
      target.closest("[data-ea-chart-tab]")
    );
    if (!btn || btn.disabled) return;
    var tab = btn.getAttribute("data-ea-chart-tab");
    if (!tab || tab === mountEl._eaActiveChartTab) return;
    activateEaChartTab(mountEl, tab, liveBundle, liveChart, liveLayoutKey);
  });
}
function mountEaChartsChrome(mountEl, slotData) {
  var tabNav = getTabNav();
  var vitalsNav = getVitalsNav();
  if (tabNav) tabNav.innerHTML = buildEaChartsTabNav(slotData);
  if (vitalsNav) vitalsNav.innerHTML = buildEaVitalsFamilyNav(slotData);
}

// public/js/features/estado-actual-charts.mjs
function destroyEstadoActualCharts(mountEl) {
  if (!mountEl) return;
  destroyAllEaTabCharts(mountEl);
  destroyEaChartInstance();
  mountEl._eaCharts = [];
  mountEl._eaChartSlotIds = [];
  mountEl._eaChartInstance = null;
  mountEl._eaChartsSig = "";
  mountEl._eaChartsLayoutKey = "";
  mountEl._eaActiveChartTab = "";
  mountEl._eaChartsTabsWired = false;
}
function patchEaChartFromSlot(chart, slotId, slotData) {
  var ch = chart;
  var next = displaySlotForChart(slotData, slotId);
  if (!ch || !next || !ch.data) return false;
  ch.data.labels = next.labels;
  ch.data.datasets = next.datasets;
  if (typeof ch.update === "function") ch.update("none");
  return true;
}
function updateEstadoActualChartsInPlace(mountEl, monitoreo, slotDataIn) {
  var slotData = slotDataIn || getCachedEaChartBundle(monitoreo).slotData;
  var chart = mountEl._eaChartInstance;
  var slotIds = mountEl._eaChartSlotIds;
  if (chart && Array.isArray(slotIds) && slotIds.length === 1) {
    if (patchEaChartFromSlot(chart, slotIds[0], slotData)) {
      syncActiveEaChartsRef(mountEl, mountEl._eaActiveChartTab || "");
      return true;
    }
  }
  return false;
}
function buildEaHistorialChartsRevision(monitoreo) {
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  return historialChartRevision(hist);
}
function eaChartsSummaryTile(label, value, hint) {
  return '<div class="ea-charts-summary-tile"><span class="ea-charts-summary-tile-label">' + label + '</span><span class="ea-charts-summary-tile-value">' + value + "</span>" + (hint ? '<span class="ea-charts-summary-tile-hint">' + hint + "</span>" : "") + "</div>";
}
function renderEaChartsSummarySection(monitoreo) {
  var summary = getCachedEaChartsSummary(monitoreo);
  var vitalsValue = summary.vitalsReady ? "Listo" : "\u2014";
  var vitalsHint = summary.vitalsReady ? summary.measurementCount + " mediciones" : "M\xEDn. 2 mediciones con signos";
  var gluValue = summary.gluReady ? String(summary.gluLatest) + " mg/dL" : summary.gluPointCount === 1 ? "1 punto" : "\u2014";
  var gluHint = summary.gluReady ? summary.gluPointCount + " puntos" : "M\xEDn. 2 glucometr\xEDas";
  var ioValue = summary.ioReady && summary.ioTurn != null ? (summary.ioTurn >= 0 ? "+" : "") + summary.ioTurn + " cc" : "\u2014";
  var ioHint = summary.ioReady ? summary.ioPointCount + " registros I/O" : "M\xEDn. 2 pares ingreso/egreso";
  var canOpen = summary.measurementCount >= 2 && (summary.vitalsReady || summary.gluReady || summary.ioReady);
  return '<section class="ea-section ea-charts-summary" id="ea-charts-summary"><div class="ea-charts-summary-head"><h3 class="ea-section-title">Gr\xE1ficas de monitoreo</h3>' + (canOpen ? '<button type="button" class="ea-btn ea-btn--ghost ea-charts-open-btn" onclick="openEstadoActualChartsModal()"><svg class="ea-charts-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-10"/><path d="M3 12l5-4 4 3 9-7"/></svg><span>Ver gr\xE1ficas</span></button>' : '<div class="ea-charts-summary-empty" role="status"><span class="empty-state-title">Sin datos para graficar</span><span class="empty-state-lead">Registra al menos 2 mediciones para ver gr\xE1ficas.</span></div>') + '</div><div class="ea-charts-summary-grid">' + eaChartsSummaryTile("Signos vitales", vitalsValue, vitalsHint) + eaChartsSummaryTile("Glucometr\xEDas", gluValue, gluHint) + eaChartsSummaryTile("Balance h\xEDdrico", ioValue, ioHint) + "</div></section>";
}
function hideEaChartsEmptyState() {
  var empty = document.getElementById("ea-charts-empty");
  if (empty) empty.hidden = true;
}
function renderEstadoActualCharts(mountEl, monitoreo, ChartCtor, _opts) {
  if (!mountEl) return;
  var bundle = getCachedEaChartBundle(monitoreo);
  var sig = bundle.signature;
  var slotData = bundle.slotData;
  var layoutKey = bundle.layoutKey;
  var Chart = resolveChartCtor(ChartCtor);
  if (mountEl._eaChartsSig === sig && mountEl._eaChartInstance) {
    mountEl._eaChartBundle = bundle;
    hideEaChartsEmptyState();
    return;
  }
  if (mountEl._eaChartsLayoutKey === layoutKey && mountEl._eaChartsSig !== sig && updateEstadoActualChartsInPlace(mountEl, monitoreo, slotData)) {
    mountEl._eaChartsSig = sig;
    hideEaChartsEmptyState();
    return;
  }
  var histAsc = bundle.histAsc;
  if (histAsc.length < 2) {
    var empty = document.getElementById("ea-charts-empty");
    if (empty) {
      empty.className = "ea-charts-empty empty-state empty-state--compact";
      empty.setAttribute("role", "status");
      empty.innerHTML = '<span class="empty-state-title">Sin datos para graficar</span><span class="empty-state-lead">Registra al menos 2 mediciones para ver gr\xE1ficas.</span>';
      empty.hidden = false;
    }
    return;
  }
  if (!Chart) return;
  hideEaChartsEmptyState();
  mountEaChartsChrome(mountEl, slotData);
  mountEl._eaChartBundle = bundle;
  wireEaChartsTabs(mountEl, bundle, Chart, layoutKey);
  activateEaChartTab(mountEl, defaultEaChartTab(slotData), bundle, Chart, layoutKey);
}

export {
  stripMonitoreoChartRuntimeCache,
  destroyEaChartInstance,
  destroyEstadoActualCharts,
  buildEaHistorialChartsRevision,
  renderEaChartsSummarySection,
  renderEstadoActualCharts
};
//# sourceMappingURL=/js/chunks/chunk-DKL3XNPH.js.map
