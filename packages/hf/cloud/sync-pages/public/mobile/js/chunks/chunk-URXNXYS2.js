import {
  escAttr
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/estado-actual-io.mjs
function toEaSalidaText(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).toUpperCase();
}
function formatBalanceLive(bal) {
  if (!Number.isFinite(bal)) return "\u2014";
  return (bal > 0 ? "+" : "") + bal + " CC";
}
function hasIoEgressDeclared(io) {
  if (!io || typeof io !== "object") return false;
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) return true;
  return o.egr != null && String(o.egr).trim() !== "";
}
function isIoIngresoNc(io) {
  if (!io || typeof io !== "object") return false;
  var o = io;
  return o.ing === "NC" || String(o.ing || "").toUpperCase() === "NC";
}
function isIoBalanceNc(io) {
  if (isIoIngresoNc(io)) return true;
  return hasIoEgressDeclared(io) && ioNumericEgressTotal(io) == null;
}
function formatIoBalanceDisplay(ing, io) {
  io = io || {};
  if (isIoIngresoNc(io) || ing === "NC" || String(ing || "").toUpperCase() === "NC") return "NC";
  var bal = computeIoBalanceFromIngEgr(ing, io);
  if (Number.isFinite(bal)) return formatBalanceLive(bal);
  if (isIoBalanceNc(io)) return "NC";
  return "\u2014";
}
function parseIoIngresoField(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  if (/^nc$/i.test(s) || /no\s+cuantificad/i.test(s)) return "NC";
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  return parseIoNumber(s);
}
function parseIoNumber(raw) {
  if (raw == null) return null;
  var s = String(raw).trim().replace(/\s/g, "").replace(/,/g, "");
  if (!s) return null;
  var n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function isIoNumericValue(v) {
  if (v == null || v === "") return false;
  if (v === "NC" || String(v).toUpperCase() === "NC") return false;
  var n = Number(v);
  return Number.isFinite(n);
}
function normalizeEvacAbbrev(val) {
  if (val == null || val === "") return val;
  var s = String(val).trim();
  if (/^nc$/i.test(s)) return "NC";
  if (/no\s+reportad|sin\s+evacuacion|sin\s+evac\b|no\s+hubo\s+evac/i.test(s)) return "NC";
  return val;
}
function parseIoEvacField(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  var abbrev = normalizeEvacAbbrev(s);
  if (abbrev === "NC") return "NC";
  if (/sin\s+evacuaciones/i.test(s)) return toEaSalidaText(s);
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  var n2 = parseIoNumber(s);
  if (n2 != null) return n2;
  return s.toUpperCase();
}
function normalizeIoNcAbbrev(val) {
  if (val == null || val === "") return val;
  if (val === "NC" || String(val).toUpperCase() === "NC") return "NC";
  if (typeof val === "string" && /no\s+cuantificad/i.test(val)) return "NC";
  return val;
}
function parseSegmentValue(seg) {
  var s = String(seg || "").trim();
  if (/^nc$/i.test(s)) return "NC";
  if (/no\s+cuantificad/i.test(s)) return "NC";
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  var n2 = parseIoNumber(s);
  if (n2 != null) return n2;
  return s.toUpperCase();
}
function splitIoSegments(text) {
  var s = String(text || "").trim();
  if (!s) return [];
  var tokens = [];
  var buf = "";
  var depth = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch === "(") {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      continue;
    }
    if ((ch === "," || ch === ";") && depth === 0) {
      if (buf.trim()) tokens.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) tokens.push(buf.trim());
  return tokens;
}
function ncDiuresisPart() {
  return { kind: "diuresis", label: "DIURESIS", value: "NC" };
}
function classifyDiuresisSegment(s) {
  var rest = s.replace(/^(?:DIURESIS|ORINA)\s*/i, "").trim();
  var value = !rest || /no\s+cuantificad/i.test(rest) ? rest ? parseSegmentValue(rest) : "NC" : parseSegmentValue(rest);
  return { kind: "diuresis", label: "DIURESIS", value };
}
function classifyDrainSegment(s) {
  var dRest = s.replace(/^DRENAJ(?:E|ES)?\s*/i, "").trim();
  return { kind: "drain", label: "DRENAJE", value: parseSegmentValue(dRest || s) };
}
function classifyGastrostomySegment(s) {
  var gRest = s.replace(/^GASTROSTOM(?:ÍA|IA)?\s*/i, "").trim();
  return { kind: "gastrostomy", label: "GASTROSTOM\xCDA", value: parseSegmentValue(gRest || s) };
}
function classifyNephroSegment(s, u) {
  var side = "";
  if (/IZQ|IZQUIERDA/i.test(u)) side = "IZQUIERDA";
  else if (/\bDER\b|DERECHA/i.test(u)) side = "DERECHA";
  var nRest = s.replace(/^NEFRO(?:STOM(?:ÍA|IA))?/i, "").trim();
  nRest = nRest.replace(/\b(IZQ|IZQUIERDA|DER|DERECHA)\b/gi, "").trim();
  var label = side ? "NEFROSTOM\xCDA " + side : "NEFROSTOM\xCDA";
  return { kind: "nephro", label, value: parseSegmentValue(nRest || s) };
}
function classifyFallbackDiuresisSegment(s, u) {
  var n = parseIoNumber(s);
  if (n != null) return { kind: "diuresis", label: "DIURESIS", value: n };
  if (/no\s+cuantificad/i.test(s)) return ncDiuresisPart();
  return { kind: "diuresis", label: "DIURESIS", value: u };
}
function classifyEgresoSegment(seg) {
  var s = String(seg || "").trim();
  var u = s.toUpperCase();
  if (/^NC$/i.test(s) || /^no\s+cuantificad/i.test(s)) return ncDiuresisPart();
  if (/^DIURESIS\b/i.test(s) || /^ORINA\b/i.test(s)) return classifyDiuresisSegment(s);
  if (/DRENAJ/i.test(u)) return classifyDrainSegment(s);
  if (/GASTROSTOM/i.test(u)) return classifyGastrostomySegment(s);
  if (/NEFRO/i.test(u)) return classifyNephroSegment(s, u);
  return classifyFallbackDiuresisSegment(s, u);
}
function parseIoEgresoLine(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return [];
  var segments = splitIoSegments(s);
  if (!segments.length) segments = [s];
  return segments.map(classifyEgresoSegment);
}
function diuresisValueFromParts(parts) {
  if (!Array.isArray(parts)) return null;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p && p.kind === "diuresis") return p.value;
  }
  return null;
}
function sumNumericEgressFromParts(parts) {
  if (!Array.isArray(parts)) return 0;
  var sum = 0;
  var any = false;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (!p) continue;
    if (isIoNumericValue(p.value)) {
      sum += Number(p.value);
      any = true;
    }
  }
  return any ? sum : 0;
}
function ioNumericEgressTotal(io) {
  if (!io || typeof io !== "object") return null;
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) {
    var sum = sumNumericEgressFromParts(o.egrParts);
    return sum > 0 ? sum : null;
  }
  if (isIoNumericValue(o.egr)) return Number(o.egr);
  return null;
}
function ioDiuresisForBalance(io) {
  if (!io || typeof io !== "object") return null;
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) {
    return diuresisValueFromParts(o.egrParts);
  }
  return o.egr != null && o.egr !== "" ? o.egr : null;
}
function computeIoBalanceFromIngEgr(ing, io) {
  if (!isIoNumericValue(ing)) return NaN;
  var egrTotal = ioNumericEgressTotal(io);
  if (egrTotal == null) return NaN;
  return Number(ing) - egrTotal;
}
function formatEgresoPartForText(part) {
  if (!part) return "";
  var val = normalizeIoNcAbbrev(part.value);
  var valStr = val === "NC" ? "NC" : isIoNumericValue(val) ? String(val) + " CC" : String(val).toUpperCase();
  return part.label.toUpperCase() + " " + valStr;
}
function serializeEgrPartsToFormText(parts) {
  if (!Array.isArray(parts) || !parts.length) return "";
  return parts.map(formatEgresoPartForText).join(", ");
}
function legacyEgrToParts(egrLegacy) {
  if (egrLegacy == null || egrLegacy === "") return [];
  return parseIoEgresoLine(String(egrLegacy));
}
function formatEvacForText(evac) {
  if (evac == null || evac === "") return "___";
  var norm = normalizeEvacAbbrev(evac);
  if (norm === "NC" || String(norm).toUpperCase() === "NC") return "NC";
  if (isIoNumericValue(evac)) return String(evac);
  return String(evac).toUpperCase();
}
function appendLegacyEgrClause(clauses, egr) {
  var egrNorm = normalizeIoNcAbbrev(egr);
  if (isIoNumericValue(egrNorm)) clauses.push("DIURESIS " + String(egrNorm) + " CC");
  else if (egrNorm === "NC") clauses.push("DIURESIS NC");
  else clauses.push(String(egrNorm).toUpperCase());
}
function appendEgressClauses(clauses, io) {
  var parts = Array.isArray(io.egrParts) && io.egrParts.length ? io.egrParts : legacyEgrToParts(io.egr);
  if (parts.length) {
    for (var i = 0; i < parts.length; i++) clauses.push(formatEgresoPartForText(parts[i]));
    return;
  }
  if (io.egr != null && io.egr !== "") appendLegacyEgrClause(clauses, io.egr);
  else clauses.push("DIURESIS ___");
}
function resolveSoapBalanceNum(io, balanceTurno) {
  if (balanceTurno != null && balanceTurno !== "" && Number.isFinite(Number(balanceTurno))) {
    return Number(balanceTurno);
  }
  var fromIo = computeIoBalanceFromIngEgr(io.ing, io);
  return Number.isFinite(fromIo) ? fromIo : NaN;
}
function formatIoClauseForSoap(io, balanceTurno) {
  io = io || {};
  if (isIoIngresoNc(io)) {
    var ncClauses = ["INGRESOS NC", "DIURESIS NC"];
    if (io.evac != null && io.evac !== "") ncClauses.push("EVACUACIONES " + formatEvacForText(io.evac));
    ncClauses.push("BALANCE NC");
    return ncClauses.join(", ");
  }
  var clauses = ["INGRESOS " + (io.ing != null && io.ing !== "" ? String(io.ing) : "___") + " CC"];
  appendEgressClauses(clauses, io);
  if (io.evac != null && io.evac !== "") clauses.push("EVACUACIONES " + formatEvacForText(io.evac));
  if (isIoBalanceNc(io)) {
    clauses.push("BALANCE NC");
    return clauses.join(", ");
  }
  var balNum = resolveSoapBalanceNum(io, balanceTurno);
  var balance = Number.isFinite(balNum) ? (balNum > 0 ? "+" : "") + balNum : "___";
  clauses.push("BALANCE " + balance + " CC");
  return clauses.join(", ");
}

// public/js/features/estado-actual-panel-format.mjs
function pad2(n) {
  return String(n).padStart(2, "0");
}
function displayValue(value) {
  return value != null && value !== "" ? String(value) : "\u2014";
}
function displayBalance(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "\u2014";
  return formatBalanceLive(n);
}
function escAttrNumeric(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return "";
  const n = Number(raw);
  return Number.isFinite(n) ? escAttr(String(n)) : "";
}
function formatEaSavedLabel(savedAt) {
  if (!savedAt) return "";
  var d = new Date(savedAt);
  if (isNaN(d.getTime())) return "";
  return "Guardado " + pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function toDatetimeLocalValue(when) {
  var d = when == null ? /* @__PURE__ */ new Date() : when instanceof Date ? when : new Date(when);
  if (isNaN(d.getTime())) return "";
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function datetimeLocalToIso(localValue) {
  if (!localValue || !String(localValue).trim()) return (/* @__PURE__ */ new Date()).toISOString();
  var d = new Date(localValue);
  return isNaN(d.getTime()) ? (/* @__PURE__ */ new Date()).toISOString() : d.toISOString();
}
function isoToHHmm(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function parseNumOrNull(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  var n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// public/js/features/estado-actual-registro-defaults.mjs
var STANDARD_GLUCOMETRIA_TIMES = ["08:00", "16:00", "00:00"];
var TURN_CLOSE_HM = "00:00";
function isTurnCloseHm(time) {
  return String(time || "").trim() === TURN_CLOSE_HM;
}
function vitalAlteredTimeForDisplay(time) {
  var t = String(time || "").trim();
  if (!t || isTurnCloseHm(t)) return "";
  return t;
}
function formatEaVitalStampForSnapshot(recordedAt, timeHm) {
  var rec = recordedAt != null ? String(recordedAt) : "";
  if (!rec) return vitalAlteredTimeForDisplay(timeHm);
  if (isTurnCloseHm(timeHm) || !String(timeHm || "").trim()) {
    var ms = gluPointMs(rec, "");
    if (!ms) return "";
    var d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1);
  }
  return formatEaVitalPointShorthand(rec, timeHm);
}
function formatEaVitalStampDateOnly(recordedAt, timeHm) {
  var full = formatEaVitalStampForSnapshot(recordedAt, timeHm);
  var m = String(full || "").trim().match(/^(\d{1,2}\/\d{1,2})/);
  return m ? m[1] : "";
}
function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function getDefaultRegistroRecordedAt(now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  return startOfLocalDay(ref);
}
function getGlucometriaRegistroWindow(now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  var end = startOfLocalDay(ref);
  var start = new Date(end);
  start.setDate(start.getDate() - 1);
  start.setHours(8, 0, 0, 0);
  return { start, end };
}
function parseRecordedAt(iso) {
  if (!iso) return null;
  var d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
function isStartOfLocalDay(d) {
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
}
function gluPointMs(recordedAt, timeHm) {
  var base = parseRecordedAt(recordedAt);
  if (!base) return 0;
  if (!timeHm || !String(timeHm).trim()) return base.getTime();
  var parts = String(timeHm).trim().split(":");
  var h = Number(parts[0]);
  var m = Number(parts[1] != null ? parts[1] : 0);
  if (!Number.isFinite(h)) return base.getTime();
  var d = new Date(base);
  d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
  if (isStartOfLocalDay(base)) {
    var hm = String(timeHm).trim();
    if (hm === "08:00" || hm === "16:00") {
      d.setDate(d.getDate() - 1);
    }
  }
  return d.getTime();
}
function formatEaVitalPointShorthand(recordedAt, timeHm) {
  var rec = recordedAt != null ? String(recordedAt) : "";
  if (!rec) return "";
  var ms = gluPointMs(rec, timeHm != null ? String(timeHm) : "");
  if (!ms) return "";
  var d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function sortGlucometriasChronologically(glus, recordedAt) {
  var list = Array.isArray(glus) ? glus.slice() : [];
  var rec = recordedAt != null ? String(recordedAt) : "";
  list.sort(function(a, b) {
    var ta = a && typeof a === "object" && a.time != null ? String(a.time) : "";
    var tb = b && typeof b === "object" && b.time != null ? String(b.time) : "";
    var ma = gluPointMs(rec, ta);
    var mb = gluPointMs(rec, tb);
    if (ma !== mb) return ma - mb;
    return String(a && typeof a === "object" ? a.value : "").localeCompare(
      String(b && typeof b === "object" ? b.value : "")
    );
  });
  return list;
}
function isGluPointInRegistroWindow(ms, now) {
  if (!ms) return false;
  var win = getGlucometriaRegistroWindow(now);
  return ms >= win.start.getTime() && ms <= win.end.getTime();
}

export {
  toEaSalidaText,
  formatIoBalanceDisplay,
  parseIoIngresoField,
  isIoNumericValue,
  normalizeEvacAbbrev,
  parseIoEvacField,
  normalizeIoNcAbbrev,
  parseIoEgresoLine,
  diuresisValueFromParts,
  ioNumericEgressTotal,
  ioDiuresisForBalance,
  computeIoBalanceFromIngEgr,
  formatEgresoPartForText,
  serializeEgrPartsToFormText,
  formatEvacForText,
  formatIoClauseForSoap,
  pad2,
  displayValue,
  displayBalance,
  escAttrNumeric,
  formatEaSavedLabel,
  toDatetimeLocalValue,
  datetimeLocalToIso,
  isoToHHmm,
  parseNumOrNull,
  STANDARD_GLUCOMETRIA_TIMES,
  isTurnCloseHm,
  vitalAlteredTimeForDisplay,
  formatEaVitalStampForSnapshot,
  formatEaVitalStampDateOnly,
  getDefaultRegistroRecordedAt,
  getGlucometriaRegistroWindow,
  gluPointMs,
  formatEaVitalPointShorthand,
  sortGlucometriasChronologically,
  isGluPointInRegistroWindow
};
//# sourceMappingURL=/js/chunks/chunk-URXNXYS2.js.map
