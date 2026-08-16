import {
  isCitoquimInterpretacionResLabChunk,
  isParsedCultivoHeaderLine,
  looksLikeLabSectionChunk,
  parseCuentaFromCultivoChunkLines,
  sortResLabsByClinicalOrder
} from "/mobile/js/chunks/chunk-CZ2M277B.js";
import {
  inferFechaLabSetFromId
} from "/mobile/js/chunks/chunk-US2NRS5S.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  compareLabSetIdForDedupe,
  looksLikeSomeLabReport,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  parseFechaLabToMs
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";

// public/js/cultivo-block-core.mjs
var CULTIVO_BASE_START_PATTERNS = [
  /^CULTIVO\b/i,
  null,
  /^BACTERIOLOGIA\b/i,
  /^UROCULTIVO\b/i,
  /^HEMOCULTIVO\b/i,
  /^FUNGICULTIVO\b/i,
  /^TINCION\s+DE\s+GRAM/i,
  /^CATETER\b/i,
  /^ATB\b/i,
  /^Cuenta:/i,
  /^[•\u2022\u00B7]\s*/,
  /^Cultivos$/i
];
var LAB_SECTION_BASE = /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS|SEROL|GS|HECES|LIPASA|TROP|TIR|ENDO|CARD|FE|FEB|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)\b/i;
function matchesAnyPattern(t, patterns) {
  for (var i = 0; i < patterns.length; i++) {
    var p = patterns[i];
    if (p === null) {
      if (isParsedCultivoHeaderLine(t)) return true;
    } else if (p.test(t)) {
      return true;
    }
  }
  return false;
}
function matchesAllCapsSiteHeader(t) {
  if (t.indexOf("	") !== -1) return false;
  if (!/^[A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+){1,4}$/.test(t)) return false;
  var ws = t.split(/\s+/).filter(Boolean);
  if (ws.length < 2 || ws[0].length < 5 || ws[1].length < 3) return false;
  if (/^(INTERCONSULTA|SALA|SERVICIO|UNIDAD|PACIENTE|HOSPITAL|AREA|CONTROL|DEPARTAMENTO)/i.test(ws[0])) {
    return false;
  }
  if (/^(CARDIOLOGIA|CIRUGIA|URGENCIAS|INTERNA|MEDICINA|PEDIATRIA|NEFROLOGIA|HEMATOLOGIA)$/i.test(ws[1])) {
    return false;
  }
  return true;
}
function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (matchesAnyPattern(t, CULTIVO_BASE_START_PATTERNS)) return true;
  if (matchesAllCapsSiteHeader(t)) return true;
  return false;
}
function isLabSectionHeaderLine(s) {
  return LAB_SECTION_BASE.test(String(s).trim());
}
function splitResLabsByTipo(rows) {
  var labs = [];
  var cultivo = [];
  var inCultivo = false;
  (rows || []).forEach(function(row) {
    var raw = row == null ? "" : row;
    var s = String(raw).trim();
    if (isLabSectionHeaderLine(s)) {
      inCultivo = false;
      labs.push(raw);
      return;
    }
    if (inCultivo) {
      cultivo.push(raw);
      return;
    }
    if (isCultivoBlockStartLine(s)) {
      inCultivo = true;
      cultivo.push(raw);
      return;
    }
    labs.push(raw);
  });
  return { labs, cultivo };
}
function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || "").replace(/\s+/g, " ").trim();
  var beforeColon = (s.split(":")[0] || s).toUpperCase();
  if (/^HEMOCULTIVO\b/.test(beforeColon)) return "hemo";
  if (/^UROCULTIVO\b/.test(beforeColon)) return "uro";
  if (/^FUNGICULTIVO\b/.test(beforeColon)) return "fungi";
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return "gram";
  if (/^CATETER\b/.test(beforeColon)) return "cateter";
  return "otro";
}
function completePartialFechaForCultivo(dm, set) {
  if (!dm) return "";
  var parts = String(dm).trim().split("/");
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? "20" + parts[2] : parts[2];
    var joined = parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = (/* @__PURE__ */ new Date()).getFullYear();
  if (set && set.fecha && set.fecha !== "Anterior") {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, "");
    if (typeof ms === "number" && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y;
}
function cultureBlockLooksNegative(left, right) {
  var L = (left + " " + right).toUpperCase();
  if (!String(right || "").trim()) return true;
  return /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(
    L
  );
}
function germHintFromCultivoHeadLine(headLine) {
  var line = String(headLine || "").replace(/\s+/g, " ").trim();
  var colon = line.lastIndexOf(":");
  if (colon >= 0) {
    var right = line.slice(colon + 1).trim();
    if (right) return right;
  }
  return line;
}
function germQueryFromCultivoChunkHead(headLine) {
  var h = germHintFromCultivoHeadLine(headLine);
  var base = h.split(/\s*·\s*/)[0].trim();
  return base || h;
}
function isCultureTableHeaderLine(t) {
  return isParsedCultivoHeaderLine(t);
}
function parseCultureHeaderLeftRight(line) {
  var colon = line.indexOf(":");
  return {
    left: colon >= 0 ? line.slice(0, colon).trim() : line,
    right: colon >= 0 ? line.slice(colon + 1).trim() : ""
  };
}
function parseCultureSitioAndFecha(left, set) {
  var fechaMuestra = "";
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (!dm) return { fechaMuestra, sitio };
  fechaMuestra = completePartialFechaForCultivo(dm[1], set);
  sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, "").trim();
  return { fechaMuestra, sitio };
}
function resolveCultureOrganismo(left, right) {
  var organismo = right.replace(/\s+/g, " ").trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = "Negativo";
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = "Negativo";
  else if (!organismo) organismo = "\u2014";
  return { organismo, negativo };
}
function cultureSortKeyMs(sortMs, fechaMuestra) {
  if (!fechaMuestra) return sortMs;
  var fmNorm = normalizeFechaLabHistory(fechaMuestra) || fechaMuestra;
  var fmParsed = parseFechaLabToMs(fmNorm, "");
  if (typeof fmParsed === "number" && isFinite(fmParsed)) return fmParsed;
  return sortMs;
}
function cultureSetSortMs(set) {
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs === "number" && isFinite(sortMs)) return sortMs;
  return 0;
}
function parseCultureBlockFromLineArray(lines, set, seq) {
  var rawHeader = String(lines[0] || "");
  var line = rawHeader.replace(/\s+/g, " ").trim();
  var lr = parseCultureHeaderLeftRight(line);
  var sf = parseCultureSitioAndFecha(lr.left, set);
  var org = resolveCultureOrganismo(lr.left, lr.right);
  var sortMs = cultureSetSortMs(set);
  return {
    row: {
      fechaMuestra: sf.fechaMuestra || "\u2014",
      sitio: sf.sitio || "\u2014",
      organismo: org.organismo,
      cuenta: parseCuentaFromCultivoChunkLines(lines.slice(1)) || "",
      negativo: org.negativo,
      sortMs,
      sortKeyMs: cultureSortKeyMs(sortMs, sf.fechaMuestra),
      tipoKey: classifyCultureTipoKeyFromHeaderLine(rawHeader),
      labSetId: set && set.id != null ? set.id : "",
      _seq: typeof seq === "number" ? seq : 0
    }
  };
}
function normalizeCultivoOrganismoQuery(organismoQuery) {
  return String(organismoQuery || "").replace(/\s+/g, " ").trim().toUpperCase();
}
function cultivoChunkMatchesQuery(head, q) {
  var gq = germQueryFromCultivoChunkHead(head).replace(/\s+/g, " ").trim().toUpperCase();
  if (!gq) return false;
  if (gq === q || gq.indexOf(q) !== -1 || q.indexOf(gq) !== -1) return true;
  var gTok = gq.split(/\s+/).filter(Boolean)[0] || "";
  var qTok = q.split(/\s+/).filter(Boolean)[0] || "";
  return gTok.length > 3 && qTok.length > 3 && (gTok === qTok || gq.indexOf(qTok) === 0 || q.indexOf(gTok) === 0);
}
function splitCultivoEntryChunks(entry) {
  return String(entry || "").split(/\n\n+/).map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function findCultivoChunkInSet(set, organismoQuery) {
  if (!set || !set.resLabs) return null;
  var q = normalizeCultivoOrganismoQuery(organismoQuery);
  if (!q || q === "\u2014") return null;
  var cult = splitResLabsByTipo(set.resLabs).cultivo;
  for (var ei = 0; ei < cult.length; ei++) {
    var chunks = splitCultivoEntryChunks(cult[ei]);
    for (var ci = 0; ci < chunks.length; ci++) {
      var head = chunks[ci].split(/\n/)[0] || "";
      if (cultivoChunkMatchesQuery(head, q)) return chunks[ci];
    }
  }
  return null;
}

// public/js/lab-history-format.mjs
function labSetParseFingerprint(set) {
  if (!set) return "";
  var parts = [];
  if (set.resLabs && set.resLabs.length) {
    parts.push("r:" + set.resLabs.join("\n"));
  }
  if (set.sourceText) parts.push("s:" + String(set.sourceText));
  if (set.bhExtras) {
    try {
      parts.push("b:" + JSON.stringify(set.bhExtras));
    } catch (_e) {
      void _e;
    }
  }
  return parts.join("|");
}
function isLikelyLabDataLine(line) {
  if (!line) return false;
  var t = line.trim();
  if (!t) return false;
  if (/^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$/.test(t)) return false;
  if (looksLikeLabSectionChunk(t)) return true;
  if (isCultivoBlockStartLine(t)) return true;
  return false;
}
function extractLabDataLines(lines) {
  return (lines || []).filter(isLikelyLabDataLine);
}
function buildLabSetDateLine(set) {
  if (!set) return "";
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim() || inferFechaLabSetFromId(set) || "";
  var rawHora = normalizeHoraLabHistory(set.hora);
  if (!rawDate) return "";
  return rawHora ? rawDate + " " + rawHora.slice(0, 5) : rawDate;
}
function buildLabSetDateLineForNota(set) {
  if (!set) return "";
  if (set.fecha === "Anterior" || set.id === "migrated-anterior") return "Anterior";
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim() || inferFechaLabSetFromId(set) || "";
  if (!rawDate) return "";
  if (rawDate.length >= 5 && rawDate.indexOf("/") !== -1) return rawDate.slice(0, 5);
  return rawDate;
}
function resolveInferFn(inferFechaLabSetFromId2) {
  return typeof inferFechaLabSetFromId2 === "function" ? inferFechaLabSetFromId2 : function() {
    return "";
  };
}
function resolveLabHistoryRawFe(set, infer) {
  if (set.fecha === "Anterior") return "";
  return normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim() || infer(set) || "";
}
function resolveLabHistoryFeLabel(set, infer, anteriorFallback) {
  var rawFe = resolveLabHistoryRawFe(set, infer);
  if (set.id === "migrated-anterior") {
    return rawFe ? "Anterior \xB7 " + rawFe : anteriorFallback;
  }
  return rawFe || (set.fecha === "Anterior" ? "Anterior" : "\u2014");
}
function formatLabHistoryListMeta(set, inferFechaLabSetFromId2) {
  if (!set) return "\u2014";
  var fe = resolveLabHistoryFeLabel(set, resolveInferFn(inferFechaLabSetFromId2), "Anterior (sin fecha en bloque)");
  var n = set.resLabs && set.resLabs.length ? set.resLabs.length : 0;
  return fe + " \xB7 " + n + " bloque" + (n === 1 ? "" : "s");
}
function labHistoryTipoLabel(resLabs, primaryTipoFn) {
  var tipoFn = typeof primaryTipoFn === "function" ? primaryTipoFn : function() {
    return "labs";
  };
  var tipo = tipoFn(resLabs || []);
  if (tipo === "cultivo") return "Cultivo";
  if (tipo === "mixed") return "Mixto";
  return "Labs";
}
function formatLabHistoryDateSelectLabel(set, inferFechaLabSetFromId2, primaryTipoFn) {
  if (!set) return "\u2014";
  var fe = resolveLabHistoryFeLabel(set, resolveInferFn(inferFechaLabSetFromId2), "Anterior");
  var tipoLabel = labHistoryTipoLabel(set.resLabs, primaryTipoFn);
  if (set.origin === "externo") tipoLabel = tipoLabel + " \xB7 Ext";
  var horaDisp = normalizeHoraLabHistory(set.hora);
  horaDisp = horaDisp ? String(horaDisp).trim().slice(0, 5) : "";
  if (horaDisp && fe !== "\u2014" && fe.indexOf("Anterior") !== 0) {
    return fe + " " + horaDisp + " \xB7 " + tipoLabel;
  }
  return fe + " \xB7 " + tipoLabel;
}
function labSetIsFromSome(set) {
  if (!set) return false;
  var src = String(set.sourceText || "").trim();
  if (!src) return false;
  if (/^Expediente\s*:/im.test(src)) return true;
  return looksLikeSomeLabReport(src);
}
function dayKeyFromLabSet(set) {
  if (!set || set.fecha === "Anterior") return "Anterior";
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms === "number" && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  var n = normalizeFechaLabHistory(set.fecha);
  if (n && n !== "Anterior") {
    var ms2 = parseFechaLabToMs(n, set.hora);
    if (typeof ms2 === "number" && isFinite(ms2)) {
      var d2 = new Date(ms2);
      return d2.getFullYear() + "-" + (d2.getMonth() + 1) + "-" + d2.getDate();
    }
  }
  return "unknown";
}
function dayKeyToSortMs(dk) {
  if (dk === "Anterior") return Number.NEGATIVE_INFINITY;
  if (dk === "unknown") return Number.MIN_SAFE_INTEGER;
  var p = dk.split("-").map(function(x) {
    return parseInt(x, 10);
  });
  if (p.length !== 3 || !isFinite(p[0])) return 0;
  return new Date(p[0], p[1] - 1, p[2]).getTime();
}
function resLabsHasGasometria(resLabs) {
  return (resLabs || []).some(function(chunk) {
    var s = String(chunk || "").trim();
    return /^GASES\b/i.test(s) || /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(s);
  });
}
function isGasometriaOnlyResLabs(resLabs) {
  var sp = splitResLabsByTipo(resLabs || []);
  if (sp.cultivo.some(function(r) {
    return String(r || "").trim();
  })) {
    return false;
  }
  var labRows = sp.labs.filter(function(r) {
    return String(r || "").trim();
  });
  if (!labRows.length) return false;
  return labRows.every(function(chunk) {
    var s = String(chunk).trim();
    return /^GASES\b/i.test(s) || /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(s);
  });
}
function primaryTipoForLabSet(resLabs) {
  if (isGasometriaOnlyResLabs(resLabs)) return "gaso";
  var sp = splitResLabsByTipo(resLabs || []);
  var hasL = sp.labs.some(function(r) {
    return String(r || "").trim();
  });
  var hasC = sp.cultivo.some(function(r) {
    return String(r || "").trim();
  });
  if (hasC && hasL) return "mixed";
  if (hasC) return "cultivo";
  return "labs";
}
function sortLabSetsWithinDay(a, b) {
  var ta = parseFechaLabToMs(a.fecha, a.hora);
  var tb = parseFechaLabToMs(b.fecha, b.hora);
  if (typeof ta === "number" && typeof tb === "number" && isFinite(ta) && isFinite(tb) && ta !== tb) {
    return tb - ta;
  }
  return compareLabSetIdForDedupe(a, b);
}
function sortLabHistoryDayKeys(a, b) {
  if (a === "Anterior") return 1;
  if (b === "Anterior") return -1;
  return dayKeyToSortMs(b) - dayKeyToSortMs(a);
}
function dayGroupLabel(dayKey, sets) {
  if (dayKey === "Anterior") return "Anterior";
  var header = sets[0];
  var dateLine = buildLabSetDateLineForNota(header) || dayKey;
  if (sets.length > 1) return dateLine + " \xB7 " + sets.length + " env\xEDos";
  return dateLine;
}
function groupLabHistoryByDay(orderedSets) {
  var byDay = /* @__PURE__ */ Object.create(null);
  (orderedSets || []).forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var dk = dayKeyFromLabSet(set);
    if (!byDay[dk]) byDay[dk] = { dayKey: dk, sets: [] };
    byDay[dk].sets.push(set);
  });
  return Object.keys(byDay).sort(sortLabHistoryDayKeys).map(function(dk) {
    var sets = byDay[dk].sets.slice().sort(sortLabSetsWithinDay);
    return { dayKey: dk, sets, label: dayGroupLabel(dk, sets) };
  });
}
function buildEstudiosCopyLinesFromLabSets(orderedSets, options) {
  var only = options && options.onlyDayKeys;
  var allowDay = null;
  if (only) {
    allowDay = only instanceof Set ? only : new Set(only);
  }
  var groups = groupLabHistoryByDay(orderedSets);
  var lines = [];
  groups.forEach(function(group) {
    if (allowDay && !allowDay.has(group.dayKey)) return;
    var sets = group.sets;
    var multiOnDay = sets.length > 1;
    sets.forEach(function(set) {
      var sp = splitResLabsByTipo(set.resLabs);
      var labsAcc = [];
      var cultAcc = [];
      sp.labs.forEach(function(row) {
        var clean = String(row == null ? "" : row).trim();
        if (!clean || isCitoquimInterpretacionResLabChunk(clean)) return;
        labsAcc.push(row);
      });
      sp.cultivo.forEach(function(row) {
        var clean = String(row == null ? "" : row).trim();
        if (!clean) return;
        cultAcc.push(row);
      });
      if (!labsAcc.length && !cultAcc.length) return;
      labsAcc = sortResLabsByClinicalOrder(labsAcc);
      var dateLine = buildLabSetDateLineForNota(set);
      if (multiOnDay) {
        var hora = normalizeHoraLabHistory(set.hora);
        if (hora && dateLine) dateLine = dateLine + " " + hora.slice(0, 5);
      }
      if (dateLine) lines.push(dateLine);
      if (labsAcc.length) {
        labsAcc.forEach(function(row) {
          var clean = String(row == null ? "" : row).trim();
          if (clean) lines.push(clean);
        });
      }
      if (cultAcc.length) {
        if (labsAcc.length) lines.push("");
        lines.push("Cultivos");
        cultAcc.forEach(function(row) {
          var clean = String(row == null ? "" : row).trim();
          if (clean) lines.push(clean);
        });
      }
      lines.push("");
    });
  });
  while (lines.length && !String(lines[lines.length - 1]).trim()) lines.pop();
  return lines;
}
function resolveEstudiosCopyOptions(orderedSets, settings) {
  if (isModeSala(settings)) return {};
  var groups = groupLabHistoryByDay(orderedSets);
  if (!groups.length) return {};
  return { onlyDayKeys: [groups[0].dayKey] };
}

export {
  splitResLabsByTipo,
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  findCultivoChunkInSet,
  labSetParseFingerprint,
  extractLabDataLines,
  buildLabSetDateLine,
  buildLabSetDateLineForNota,
  formatLabHistoryListMeta,
  formatLabHistoryDateSelectLabel,
  labSetIsFromSome,
  dayKeyFromLabSet,
  resLabsHasGasometria,
  isGasometriaOnlyResLabs,
  primaryTipoForLabSet,
  groupLabHistoryByDay,
  buildEstudiosCopyLinesFromLabSets,
  resolveEstudiosCopyOptions
};
//# sourceMappingURL=/js/chunks/chunk-7FIP2ETS.js.map
