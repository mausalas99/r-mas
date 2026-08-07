import {
  formatInsulinPumpAlgoritmoLabel,
  isIoNumericValue,
  patients,
  vitalSeriesFromMedicion
} from "/mobile/js/chunks/chunk-2VPNV3XW.js";
import {
  isGlucometriaMarkedAltered,
  isVitalAltered
} from "/mobile/js/chunks/chunk-GHZK4QF3.js";
import {
  displayBalance,
  displayValue,
  formatEaVitalStampDateOnly,
  formatEaVitalStampForSnapshot,
  formatEgresoPartForText,
  formatEvacForText,
  formatIoBalanceDisplay,
  pad2,
  toEaSalidaText
} from "/mobile/js/chunks/chunk-KHHZMCJO.js";
import {
  escAttr,
  escHtml
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";

// public/js/features/estado-actual-panel-runtime.mjs
var rt = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  onMedicionRegistered() {
  },
  getSettings() {
    return {};
  },
  switchConsolidatedTab() {
  },
  copyToClipboardSafe(_text) {
    return Promise.resolve(false);
  }
};
function registerEstadoActualPanelRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}
function getEaPanelRuntime() {
  return rt;
}

// public/js/features/estado-actual-panel-core.mjs
var _eaPanelCache = { shellKey: "", dataKey: "" };
function invalidateEaPanelCache() {
  _eaPanelCache.shellKey = "";
  _eaPanelCache.dataKey = "";
}
function findActivePatient() {
  var activeId = getEaPanelRuntime().getActiveId();
  if (!activeId) return null;
  return patients.find(function(p) {
    return String(p.id) === String(activeId);
  }) || null;
}

// public/js/features/estado-actual-panel-constants.mjs
var VITAL_KEYS = ["tas", "tad", "fc", "fr", "temp", "sat"];
var VITAL_LABELS = {
  tas: "TAS",
  tad: "TAD",
  fc: "FC",
  fr: "FR",
  temp: "Temp",
  sat: "Saturaci\xF3n"
};
var VITAL_UNITS = {
  tas: "mmHg",
  tad: "mmHg",
  fc: "lpm",
  fr: "rpm",
  temp: "\xB0C",
  sat: "%"
};
var SOPORTE_OPTIONS = [
  "Aire ambiente",
  "Puntillas nasales",
  "Alto flujo",
  "VM no invasiva",
  "Traqueostom\xEDa"
];

// public/js/features/estado-actual-panel-snapshot-format.mjs
function formatSnapshotEgresos(io) {
  io = io || {};
  if (Array.isArray(io.egrParts) && io.egrParts.length) {
    return escHtml(io.egrParts.map(formatEgresoPartForText).join(" \xB7 "));
  }
  var egr = io.egr;
  if (egr == null || egr === "") return "\u2014";
  if (isIoNumericValue(egr)) return escHtml(String(egr) + " CC (DIURESIS)");
  return escHtml(toEaSalidaText(egr));
}

// public/js/features/estado-actual-panel-snapshot-html.mjs
function formatSnapshotIngresos(ing) {
  if (ing === "NC" || String(ing || "").toUpperCase() === "NC") return escHtml("NC");
  if (ing == null || ing === "") return escHtml("\u2014");
  return escHtml(String(ing) + " CC");
}
var SNAPSHOT_STRIP_VITAL_KEYS = ["fc", "fr", "temp", "sat"];
var SNAPSHOT_STRIP_LABELS = {
  fc: VITAL_LABELS.fc,
  fr: VITAL_LABELS.fr,
  temp: VITAL_LABELS.temp,
  sat: "SatO\u2082"
};
var VITAL_HISTORY_TITLES = {
  bp: "T/A",
  fc: VITAL_LABELS.fc,
  fr: VITAL_LABELS.fr,
  temp: VITAL_LABELS.temp,
  sat: VITAL_LABELS.sat
};
function vitalHistoryTitle(vitalKey) {
  return VITAL_HISTORY_TITLES[vitalKey] || vitalKey;
}
function getVitalHistoryEntries(vitalKey, snapshot) {
  if (vitalKey === "bp") {
    var pairs = Array.isArray(snapshot.bpPairs) ? snapshot.bpPairs.slice() : [];
    return pairs.slice().reverse().map(function(p) {
      return {
        value: formatBpPairValue(p.tas, p.tad),
        unit: "mmHg",
        stamp: formatEaVitalStampForSnapshot(p.recordedAt, p.time),
        altered: isVitalAltered("tas", p.tas) || isVitalAltered("tad", p.tad)
      };
    });
  }
  var series = snapshot.vitalSeries && Array.isArray(snapshot.vitalSeries[vitalKey]) ? snapshot.vitalSeries[vitalKey].slice() : [];
  return series.slice().reverse().map(function(reading) {
    return {
      value: displayValue(reading.value),
      unit: VITAL_UNITS[vitalKey] || "",
      stamp: formatEaVitalStampForSnapshot(reading.recordedAt, reading.time),
      altered: isVitalAltered(vitalKey, reading.value)
    };
  });
}
function vitalHasHistory(vitalKey, snapshot) {
  return getVitalHistoryEntries(vitalKey, snapshot).length > 1;
}
function renderVitalHistoryListHtml(entries) {
  if (!entries.length) {
    return '<p class="ea-muted">Sin lecturas registradas.</p>';
  }
  return '<ol class="ea-vital-history-list">' + entries.map(function(entry, idx) {
    var cls = "ea-vital-history-row" + (idx === 0 ? " ea-vital-history-row--latest" : "");
    if (entry.altered) cls += " ea-vital-history-row--altered";
    var badge = idx === 0 ? '<span class="ea-vital-history-badge">Actual</span>' : "";
    var unitHtml = entry.unit ? '<span class="ea-vital-history-unit">' + escHtml(entry.unit) + "</span>" : "";
    var stampHtml = entry.stamp ? '<span class="ea-vital-history-stamp">' + escHtml(entry.stamp) + "</span>" : "";
    return '<li class="' + cls + '"><div class="ea-vital-history-metric"><span class="ea-vital-history-value">' + escHtml(entry.value) + "</span>" + unitHtml + '</div><div class="ea-vital-history-meta">' + stampHtml + badge + "</div></li>";
  }).join("") + "</ol>";
}
function snapshotItemInteractionAttrs(vitalKey, hasHistory) {
  if (!hasHistory) return "";
  var safeKey = String(vitalKey).replace(/'/g, "\\'");
  return ' role="button" tabindex="0" data-ea-vital-history="' + escAttr(vitalKey) + `" onclick="openEaVitalHistoryModal('` + safeKey + `')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEaVitalHistoryModal('` + safeKey + `')}" title="Ver historial del turno"`;
}
function formatBpPairValue(tas, tad) {
  return displayValue(tas) + "/" + displayValue(tad);
}
function resolveVitalStamp(reading, fallbackKey, snapshot) {
  if (reading && reading.recordedAt) {
    return formatEaVitalStampDateOnly(reading.recordedAt, reading.time);
  }
  if (fallbackKey && snapshot.alteredAt) {
    return formatEaVitalStampDateOnly("", snapshot.alteredAt[fallbackKey]);
  }
  return "";
}
function renderSnapshotVitalRow(opts) {
  var cls = "ea-snapshot-row" + (opts.altered ? " ea-snapshot-row--altered" : "") + (opts.hasHistory ? " ea-snapshot-row--interactive" : "");
  var unitHtml = opts.unit ? '<span class="ea-snapshot-row-unit">' + escHtml(opts.unit) + "</span>" : "";
  var stampHtml = opts.stamp ? '<span class="ea-snapshot-row-stamp">' + escHtml(opts.stamp) + "</span>" : '<span class="ea-snapshot-row-stamp ea-snapshot-row-stamp--empty" aria-hidden="true"></span>';
  return '<div class="' + cls + '"' + snapshotItemInteractionAttrs(opts.vitalKey, opts.hasHistory) + '><span class="ea-snapshot-row-label">' + escHtml(opts.label) + '</span><span class="ea-snapshot-row-reading"><span class="ea-snapshot-row-value">' + escHtml(opts.value) + "</span>" + unitHtml + "</span>" + stampHtml + "</div>";
}
function renderVitalSnapshotItem(key, snapshot) {
  var unit = VITAL_UNITS[key] || "";
  var series = snapshot.vitalSeries && Array.isArray(snapshot.vitalSeries[key]) ? snapshot.vitalSeries[key] : [];
  var latestVal = snapshot.vitals[key];
  var latestFromSeries = series.length ? series[series.length - 1] : null;
  var displayVal = latestVal != null && latestVal !== "" ? latestVal : latestFromSeries && latestFromSeries.value != null ? latestFromSeries.value : null;
  return renderSnapshotVitalRow({
    label: SNAPSHOT_STRIP_LABELS[key] || VITAL_LABELS[key] || key,
    value: displayValue(displayVal),
    unit,
    stamp: resolveVitalStamp(latestFromSeries, key, snapshot),
    vitalKey: key,
    altered: isVitalAltered(key, displayVal),
    hasHistory: vitalHasHistory(key, snapshot)
  });
}
function renderBpSnapshotItem(snapshot) {
  var pairs = Array.isArray(snapshot.bpPairs) ? snapshot.bpPairs : [];
  if (!pairs.length) {
    var tasOnly = snapshot.vitals.tas;
    var tadOnly = snapshot.vitals.tad;
    if (tasOnly != null && tasOnly !== "" || tadOnly != null && tadOnly !== "") {
      pairs = [{ tas: tasOnly, tad: tadOnly, recordedAt: "", time: void 0 }];
    }
  }
  if (!pairs.length) {
    return renderSnapshotVitalRow({
      label: "T/A",
      value: "\u2014",
      unit: "mmHg",
      stamp: "",
      vitalKey: "bp",
      altered: false,
      hasHistory: false
    });
  }
  var latest = pairs[pairs.length - 1];
  return renderSnapshotVitalRow({
    label: "T/A",
    value: formatBpPairValue(latest.tas, latest.tad),
    unit: "mmHg",
    stamp: formatEaVitalStampDateOnly(latest.recordedAt, latest.time),
    vitalKey: "bp",
    altered: isVitalAltered("tas", latest.tas) || isVitalAltered("tad", latest.tad),
    hasHistory: vitalHasHistory("bp", snapshot)
  });
}
function renderSnapshotVitalsHtml(snapshot) {
  var html = renderBpSnapshotItem(snapshot);
  for (var ki = 0; ki < SNAPSHOT_STRIP_VITAL_KEYS.length; ki++) {
    html += renderVitalSnapshotItem(SNAPSHOT_STRIP_VITAL_KEYS[ki], snapshot);
  }
  return html;
}
function renderBombaChip(b) {
  var t = b.time ? ' <span class="ea-snapshot-glu-time">' + b.time + "</span>" : "";
  var u = b.units != null && b.units !== "" && Number(b.units) !== 0 ? ' <span class="ea-snapshot-glu-units">(' + displayValue(b.units) + " U)</span>" : "";
  return '<span class="ea-snapshot-glu-chip ea-snapshot-glu-chip--bomba">' + displayValue(b.value) + " MG/DL" + u + t + "</span>";
}
function renderGluChip(g) {
  var t = g.time ? ' <span class="ea-snapshot-glu-time">' + g.time + "</span>" : "";
  var rescue = g.rescueUnits != null && g.rescueUnits !== "" && Number(g.rescueUnits) !== 0 ? ' <span class="ea-snapshot-glu-rescue">(' + displayValue(g.rescueUnits) + " U rescate)</span>" : "";
  var postRescue = g.postRescueValue != null && g.postRescueValue !== "" ? ' <span class="ea-snapshot-glu-post">\u2192 ' + displayValue(g.postRescueValue) + " MG/DL</span>" : "";
  var alteredCls = isGlucometriaMarkedAltered(g) ? " ea-snapshot-glu-chip--altered" : "";
  return '<span class="ea-snapshot-glu-chip' + alteredCls + '">' + displayValue(g.value) + " MG/DL" + rescue + postRescue + t + "</span>";
}
function renderSnapshotGluZoneTitle(snapshot) {
  var alg = snapshot.bombaInsulinaAlgoritmo;
  if (alg != null && Number.isFinite(Number(alg))) {
    return formatInsulinPumpAlgoritmoLabel(Number(alg)) || "Glucometr\xEDas";
  }
  if (snapshot.bombaInsulina && snapshot.bombaInsulina.length) return "Bomba de insulina";
  return "Glucometr\xEDas";
}
function renderSnapshotGluHtml(snapshot) {
  var algLabel = snapshot.bombaInsulinaAlgoritmo != null && Number.isFinite(Number(snapshot.bombaInsulinaAlgoritmo)) ? formatInsulinPumpAlgoritmoLabel(Number(snapshot.bombaInsulinaAlgoritmo)) : "";
  if (snapshot.bombaInsulina && snapshot.bombaInsulina.length) {
    var chips = snapshot.bombaInsulina.map(renderBombaChip).join("");
    if (algLabel) {
      return '<span class="ea-snapshot-glu-alg-badge ea-muted">' + escHtml(algLabel) + "</span>" + chips;
    }
    return chips;
  }
  if (algLabel) {
    return '<span class="ea-snapshot-glu-alg-badge ea-muted">' + escHtml(algLabel) + "</span>";
  }
  if (snapshot.glucometrias && snapshot.glucometrias.length) {
    return snapshot.glucometrias.map(renderGluChip).join("");
  }
  return '<span class="ea-muted">\u2014</span>';
}
function renderSnapshotIoHtml(snapshot, balGlobal) {
  var evacHtml = snapshot.io.evac != null && snapshot.io.evac !== "" ? '<div><span class="ea-snapshot-label">Evacuaciones</span><span class="ea-snapshot-io-val">' + escHtml(formatEvacForText(snapshot.io.evac)) + "</span></div>" : "";
  return '<div class="ea-snapshot-io"><div><span class="ea-snapshot-label">Ingresos</span><span class="ea-snapshot-io-val">' + formatSnapshotIngresos(snapshot.io.ing) + '</span></div><div class="ea-snapshot-io-egr"><span class="ea-snapshot-label">Egresos</span><span class="ea-snapshot-io-val">' + formatSnapshotEgresos(snapshot.io) + "</span></div>" + evacHtml + '<div><span class="ea-snapshot-label">Turno</span><span class="ea-snapshot-io-val">' + formatIoBalanceDisplay(snapshot.io.ing, snapshot.io) + '</span></div><div><span class="ea-snapshot-label">Global</span><span class="ea-snapshot-io-val">' + displayBalance(balGlobal) + "</span></div></div>";
}
function formatHistorialWhen(recordedAt) {
  var d = new Date(recordedAt || "");
  if (isNaN(d.getTime())) return "\u2014";
  return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function buildHistorialRowParts(row) {
  var parts = [];
  var rowSeries = vitalSeriesFromMedicion(row);
  VITAL_KEYS.forEach(function(vk) {
    var list = rowSeries[vk] || [];
    for (var rsi = 0; rsi < list.length; rsi++) {
      var rd = list[rsi];
      var part = (VITAL_LABELS[vk] || vk) + " " + rd.value;
      if (rd.time) part += " @ " + rd.time;
      parts.push(part);
    }
  });
  appendHistorialGluParts(parts, row);
  appendHistorialIoParts(parts, row.io || {});
  return parts;
}
function appendHistorialGluParts(parts, row) {
  var bombas = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
  if (bombas.length) {
    bombas.forEach(function(b) {
      if (!b || typeof b !== "object" || b.value == null || b.value === "") return;
      var bp = "Bomba Glu " + b.value;
      if (b.units != null && b.units !== "") bp += " (" + b.units + " U)";
      if (b.time) bp += " @ " + b.time;
      parts.push(bp);
    });
    return;
  }
  var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
  glus.forEach(function(g) {
    if (!g || g.value == null || g.value === "") return;
    var gp = "Glu " + g.value;
    if (g.altered) gp += " alterada";
    if (g.rescueUnits != null && g.rescueUnits !== "" && Number(g.rescueUnits) !== 0) {
      gp += " (" + g.rescueUnits + " U rescate)";
    }
    if (g.postRescueValue != null && g.postRescueValue !== "") gp += " \u2192 DXT " + g.postRescueValue;
    parts.push(gp + (g.time ? " @ " + g.time : ""));
  });
}
function appendHistorialIoParts(parts, io) {
  if (io.ing != null && io.ing !== "") parts.push("Ing " + io.ing);
  if (Array.isArray(io.egrParts) && io.egrParts.length) {
    parts.push(io.egrParts.map(formatEgresoPartForText).join(", "));
  } else if (io.egr != null && io.egr !== "") {
    parts.push("Egr " + io.egr);
  }
  if (io.evac != null && io.evac !== "") parts.push("Evac " + formatEvacForText(io.evac));
}

export {
  registerEstadoActualPanelRuntime,
  getEaPanelRuntime,
  _eaPanelCache,
  invalidateEaPanelCache,
  findActivePatient,
  VITAL_KEYS,
  VITAL_LABELS,
  VITAL_UNITS,
  SOPORTE_OPTIONS,
  vitalHistoryTitle,
  getVitalHistoryEntries,
  vitalHasHistory,
  renderVitalHistoryListHtml,
  renderSnapshotVitalsHtml,
  renderSnapshotGluZoneTitle,
  renderSnapshotGluHtml,
  renderSnapshotIoHtml,
  formatHistorialWhen,
  buildHistorialRowParts
};
//# sourceMappingURL=/js/chunks/chunk-5OEZNMAY.js.map
