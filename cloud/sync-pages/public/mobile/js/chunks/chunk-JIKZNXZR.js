import {
  primaryTipoForLabSet,
  resLabsHasGasometria
} from "/mobile/js/chunks/chunk-7FIP2ETS.js";
import {
  extractLabExpedienteFromReport,
  procesarLabs,
  sanitizeResLabsChunks,
  sortResLabsByClinicalOrder
} from "/mobile/js/chunks/chunk-CZ2M277B.js";
import {
  getLabHistory
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  collectPriorRefsFromHistory,
  gasometriaFingerprintFromResLabs,
  looksLikeSomeLabReport,
  mergeBhResLabRows_,
  mergeCoagResLabRows_,
  mergeEscResLabRows_,
  mergeLipasaResLabRows_,
  mergePfhResLabRows_,
  mergeQsResLabRows_,
  mergeTroponinaResLabRows_,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  normalizeLabLine,
  parseFechaLabToMs,
  reprocessLabResultLines_,
  sortLabHistoryChronological
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";

// public/js/lab-consolidation-cluster.mjs
var LAB_CONSOLIDATION_WINDOW_MS = 2 * 60 * 60 * 1e3;
var LAB_CONSOLIDATION_UNBOUNDED_WINDOW_MS = Number.MAX_SAFE_INTEGER;
function labConsolidationFamily(tipo) {
  if (tipo === "mixed") return "mixed";
  if (tipo === "cultivo") return "cultivo";
  return "labwork";
}
function resolveLabConsolidationWindowMs(tipo, windowMs) {
  void tipo;
  return typeof windowMs === "number" && isFinite(windowMs) ? windowMs : LAB_CONSOLIDATION_WINDOW_MS;
}
function labTimestampMsFromFechaHora(fecha, hora) {
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || "").trim();
  if (!fechaNorm || fechaNorm === "Anterior") return null;
  var ms = parseFechaLabToMs(fechaNorm, normalizeHoraLabHistory(hora));
  return typeof ms === "number" && isFinite(ms) ? ms : null;
}
function clusterByTimeWindow(items, getMs, windowMs) {
  var list = items || [];
  if (!list.length) return [];
  var w = typeof windowMs === "number" && isFinite(windowMs) ? windowMs : LAB_CONSOLIDATION_WINDOW_MS;
  var timed = [];
  var untimed = [];
  list.forEach(function(item) {
    var ms = getMs(item);
    if (ms == null) untimed.push(item);
    else timed.push({ item, ms });
  });
  timed.sort(function(a, b) {
    return a.ms - b.ms;
  });
  var clusters = [];
  var cur = [];
  var prevMs = null;
  timed.forEach(function(entry) {
    if (!cur.length || prevMs != null && entry.ms - prevMs <= w) {
      cur.push(entry.item);
    } else {
      clusters.push(cur);
      cur = [entry.item];
    }
    prevMs = entry.ms;
  });
  if (cur.length) clusters.push(cur);
  if (untimed.length === 1) {
    clusters.push(untimed);
  } else if (untimed.length > 1) {
    clusters.push(untimed.slice());
  }
  return clusters;
}
function chainTimedEntries(entries, windowMs) {
  var clusters = [];
  var cur = [];
  var prevMs = null;
  (entries || []).forEach(function(entry) {
    if (!cur.length || prevMs != null && entry.ms - prevMs <= windowMs) {
      cur.push(entry);
    } else {
      clusters.push(cur);
      cur = [entry];
    }
    prevMs = entry.ms;
  });
  if (cur.length) clusters.push(cur);
  return clusters;
}
function minAbsDistToCluster(ms, clusterEntries) {
  var dist = Infinity;
  (clusterEntries || []).forEach(function(e) {
    var d = Math.abs(ms - e.ms);
    if (d < dist) dist = d;
  });
  return dist;
}
function defaultGasometriaKey(item) {
  if (!item) return "";
  if (Array.isArray(item.resLabs)) return gasometriaFingerprintFromResLabs(item.resLabs);
  if (item.result && Array.isArray(item.result.resLabs)) {
    return gasometriaFingerprintFromResLabs(item.result.resLabs);
  }
  return "";
}
function buildGasoIdentityGroups(gasoEntries, getGasoKey, windowMs) {
  var byFp = /* @__PURE__ */ Object.create(null);
  var uniqueSeq = 0;
  (gasoEntries || []).forEach(function(g, gi) {
    var raw = typeof getGasoKey === "function" ? String(getGasoKey(g.item) || "").trim() : "";
    if (!raw) raw = defaultGasometriaKey(g.item);
    var fp = raw || "\0unique:" + uniqueSeq++ + ":" + gi;
    if (!byFp[fp]) byFp[fp] = [];
    byFp[fp].push(g);
  });
  var groups = [];
  Object.keys(byFp).forEach(function(fp) {
    chainTimedEntries(byFp[fp], windowMs).forEach(function(chain) {
      if (!chain.length) return;
      groups.push({
        fingerprint: fp,
        entries: chain,
        rep: chain[0]
      });
    });
  });
  groups.sort(function(a, b) {
    return a.rep.ms - b.rep.ms;
  });
  return groups;
}
function gasoGroupIsSerial(gi, gasoGroups, windowMs) {
  var ms = gasoGroups[gi].rep.ms;
  for (var j = 0; j < gasoGroups.length; j++) {
    if (j === gi) continue;
    if (Math.abs(gasoGroups[j].rep.ms - ms) <= windowMs) return true;
  }
  return false;
}
function assignGasoGroupsToClosestLabClusters(labClusters, gasoGroups, windowMs) {
  var assigned = labClusters.map(function() {
    return null;
  });
  var candidates = [];
  gasoGroups.forEach(function(grp, gi) {
    var serial = gasoGroupIsSerial(gi, gasoGroups, windowMs);
    labClusters.forEach(function(cluster, ci) {
      var dist = minAbsDistToCluster(grp.rep.ms, cluster);
      if (serial && dist > windowMs) return;
      candidates.push({ gi, ci, dist, ms: grp.rep.ms });
    });
  });
  candidates.sort(function(a, b) {
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.ms - b.ms;
  });
  var groupUsed = /* @__PURE__ */ Object.create(null);
  var clusterUsed = /* @__PURE__ */ Object.create(null);
  candidates.forEach(function(c) {
    if (groupUsed[c.gi] || clusterUsed[c.ci]) return;
    groupUsed[c.gi] = true;
    clusterUsed[c.ci] = true;
    assigned[c.ci] = gasoGroups[c.gi];
  });
  return { assigned, groupUsed };
}
function clustersFromLabGasoGroupAssignment(labClusters, assignedGroups) {
  return labClusters.map(function(cluster, ci) {
    var entries = cluster.slice();
    if (assignedGroups[ci]) {
      assignedGroups[ci].entries.forEach(function(e) {
        entries.push(e);
      });
    }
    entries.sort(function(a, b) {
      return a.ms - b.ms;
    });
    return entries.map(function(e) {
      return e.item;
    });
  });
}
function appendUntimedLabworkClusters(out, untimed, hasGasoFn, getGasoKey) {
  var labs = [];
  var gasos = [];
  (untimed || []).forEach(function(item) {
    if (hasGasoFn(item)) gasos.push(item);
    else labs.push(item);
  });
  if (labs.length) out.push(labs);
  var byFp = /* @__PURE__ */ Object.create(null);
  var uniqueSeq = 0;
  gasos.forEach(function(g, gi) {
    var raw = typeof getGasoKey === "function" ? String(getGasoKey(g) || "").trim() : "";
    if (!raw) raw = defaultGasometriaKey(g);
    var fp = raw || "\0unique:" + uniqueSeq++ + ":" + gi;
    if (!byFp[fp]) byFp[fp] = [];
    byFp[fp].push(g);
  });
  Object.keys(byFp).forEach(function(fp) {
    out.push(byFp[fp]);
  });
}
function clusterLabworkByTimeWindow(items, getMs, hasGaso, windowMs, getGasoKey) {
  var list = items || [];
  if (!list.length) return [];
  var w = typeof windowMs === "number" && isFinite(windowMs) ? windowMs : LAB_CONSOLIDATION_WINDOW_MS;
  var gasoFn = typeof hasGaso === "function" ? hasGaso : function() {
    return false;
  };
  var timed = [];
  var untimed = [];
  list.forEach(function(item) {
    var ms = getMs(item);
    if (ms == null) untimed.push(item);
    else timed.push({ item, ms, isGaso: !!gasoFn(item) });
  });
  timed.sort(function(a, b) {
    return a.ms - b.ms;
  });
  var labsEntries = timed.filter(function(e) {
    return !e.isGaso;
  });
  var gasoEntries = timed.filter(function(e) {
    return e.isGaso;
  });
  var labClusters = chainTimedEntries(labsEntries, w);
  var gasoGroups = buildGasoIdentityGroups(gasoEntries, getGasoKey, w);
  var pairing = assignGasoGroupsToClosestLabClusters(labClusters, gasoGroups, w);
  var out = clustersFromLabGasoGroupAssignment(labClusters, pairing.assigned);
  gasoGroups.forEach(function(grp, gi) {
    if (pairing.groupUsed[gi]) return;
    out.push(
      grp.entries.map(function(e) {
        return e.item;
      })
    );
  });
  out.sort(function(a, b) {
    var ma = getMs(a[0]);
    var mb = getMs(b[0]);
    return (ma == null ? 0 : ma) - (mb == null ? 0 : mb);
  });
  appendUntimedLabworkClusters(out, untimed, gasoFn, getGasoKey);
  return out;
}
function clusterLabConsolidationGroup(items, getMs, getTipo, hasGaso, windowMs) {
  var tipo = getTipo((items || [])[0]);
  if (labConsolidationFamily(tipo) === "labwork") {
    return clusterLabworkByTimeWindow(items, getMs, hasGaso, windowMs);
  }
  return clusterByTimeWindow(items, getMs, resolveLabConsolidationWindowMs(tipo, windowMs));
}
function clusterByDayTipoAndTimeWindow(items, getDayKey, getTipo, getMs, hasGaso, windowMs) {
  var groups = /* @__PURE__ */ Object.create(null);
  var mixedSingles = [];
  var gasoFn = typeof hasGaso === "function" ? hasGaso : function(item) {
    return getTipo(item) === "gaso";
  };
  (items || []).forEach(function(item) {
    var tipo = getTipo(item);
    if (tipo === "mixed") {
      mixedSingles.push([item]);
      return;
    }
    var dk = getDayKey(item);
    if (!dk || dk === "unknown" || dk === "Anterior") return;
    var gk = dk + "" + labConsolidationFamily(tipo);
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(item);
  });
  var out = mixedSingles.slice();
  Object.keys(groups).forEach(function(gk) {
    var family = String(gk.split("")[1] || "labwork");
    var groupItems = groups[gk];
    var clusterFn = family === "labwork" ? function() {
      return clusterLabworkByTimeWindow(groupItems, getMs, gasoFn, windowMs);
    } : function() {
      var tipo = getTipo(groupItems[0]);
      return clusterByTimeWindow(groupItems, getMs, resolveLabConsolidationWindowMs(tipo, windowMs));
    };
    clusterFn().forEach(function(cluster) {
      out.push(cluster);
    });
  });
  return out;
}

// public/js/lab-bulk-dedupe.mjs
function labRowSectionKey(row) {
  var s = String(row || "").trim();
  if (!s) return "";
  var m = s.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
  return m ? m[1].toUpperCase() : "";
}
function labRowRichnessScore(row) {
  var s = String(row || "");
  var score = s.length;
  score += (s.match(/\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  if (/INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A/i.test(s)) score += 20;
  return score;
}
function isBhResLabRow(row) {
  var key = labRowSectionKey(row);
  return key === "BH" || /^BH:/i.test(String(row || "").trim());
}
function isPairMergeSectionKey(key) {
  return key === "QS" || key === "ESC" || key === "PFHS" || key === "LIPASA";
}
function dedupeConsolidatedLabRows(rows, tipo) {
  var normalized = [];
  var seenExact = /* @__PURE__ */ Object.create(null);
  (rows || []).forEach(function(row) {
    var norm = normalizeLabLine(String(row == null ? "" : row));
    if (!norm) return;
    if (seenExact[norm]) return;
    seenExact[norm] = true;
    normalized.push(String(row));
  });
  if (tipo !== "labs") return normalized;
  var bhRows = [];
  var tropRows = [];
  var qsRows = [];
  var escRows = [];
  var pfhRows = [];
  var lipasaRows = [];
  var coagRows = [];
  var otherRows = [];
  normalized.forEach(function(row) {
    if (isBhResLabRow(row)) {
      bhRows.push(row);
      return;
    }
    var key = labRowSectionKey(row);
    if (key === "TROP") tropRows.push(row);
    else if (key === "QS") qsRows.push(row);
    else if (key === "ESC") escRows.push(row);
    else if (key === "PFHS") pfhRows.push(row);
    else if (key === "LIPASA") lipasaRows.push(row);
    else if (key === "COAG") coagRows.push(row);
    else otherRows.push(row);
  });
  var bestBySection = /* @__PURE__ */ Object.create(null);
  otherRows.forEach(function(row, idx) {
    var key = labRowSectionKey(row);
    if (!key || isPairMergeSectionKey(key)) return;
    var cand = { row, idx, score: labRowRichnessScore(row) };
    var prev = bestBySection[key];
    if (!prev || cand.score > prev.score || cand.score === prev.score && cand.idx > prev.idx) {
      bestBySection[key] = cand;
    }
  });
  var out = Object.keys(bestBySection).map(function(k) {
    return bestBySection[k].row;
  });
  var mergedQs = mergeQsResLabRows_(qsRows);
  if (mergedQs) out.push(mergedQs);
  var mergedEsc = mergeEscResLabRows_(escRows);
  if (mergedEsc) out.push(mergedEsc);
  var mergedPfh = mergePfhResLabRows_(pfhRows);
  if (mergedPfh) out.push(mergedPfh);
  var mergedLip = mergeLipasaResLabRows_(lipasaRows);
  if (mergedLip) out.push(mergedLip);
  var mergedTrop = mergeTroponinaResLabRows_(tropRows);
  if (mergedTrop) out.push(mergedTrop);
  if (bhRows.length) {
    var mergedBh = mergeBhResLabRows_(bhRows);
    if (mergedBh.bh) out.push(mergedBh.bh);
    if (mergedBh.coag) coagRows.push(mergedBh.coag);
  }
  var mergedCoag = mergeCoagResLabRows_(coagRows);
  if (mergedCoag) out.push(mergedCoag);
  return sortResLabsByClinicalOrder(out);
}

// public/js/lab-bulk-paste.mjs
var LAB_BULK_PATIENT_SEPARATOR = "--- PACIENTE ---";
function primaryTipoForResLabs(resLabs) {
  return primaryTipoForLabSet(resLabs);
}
function dayKeyFromResult(result) {
  var fecha = normalizeFechaLabHistory(result.patient && result.patient.fecha) || "";
  var hora = normalizeHoraLabHistory(result.patient && result.patient.hora);
  if (fecha === "Anterior") return "Anterior";
  var ms = parseFechaLabToMs(fecha, hora);
  if (typeof ms === "number" && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  return "unknown";
}
function isLabBulkPatientSeparatorLine(line) {
  return /^\s*---\s*PACIENTE\s*---\s*$/i.test(String(line || "").trim());
}
function splitBulkLabTextByPatient(text) {
  var raw = String(text || "");
  if (!raw.trim()) return [];
  var lines = raw.split(/\r?\n/);
  var blocks = [];
  var current = [];
  lines.forEach(function(line) {
    if (isLabBulkPatientSeparatorLine(line)) {
      if (current.length) {
        var chunk = current.join("\n").trim();
        if (chunk) blocks.push(chunk);
        current = [];
      }
      return;
    }
    current.push(line);
  });
  if (current.length) {
    var tail = current.join("\n").trim();
    if (tail) blocks.push(tail);
  }
  return blocks;
}
function splitSomeReportsInBlock(blockText) {
  var raw = String(blockText || "").trim();
  if (!raw) return [];
  return raw.split(/(?=^\s*Expediente\s*:)/im).map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function sortDaysDesc(days) {
  return days.slice().sort(function(a, b) {
    var ma = parseFechaLabToMs(a, "");
    var mb = parseFechaLabToMs(b, "");
    if (typeof ma === "number" && typeof mb === "number" && ma !== mb) return mb - ma;
    return String(b).localeCompare(String(a));
  });
}
function parseReportChunkFailure(reportIndex, error, meta) {
  return { reportIndex, ok: false, error, ...meta };
}
function parseReportChunkSuccess(reportText, reportIndex, result) {
  return {
    reportIndex,
    ok: true,
    reportText,
    result,
    expediente: String(result.patient && result.patient.expediente || "").trim(),
    nombre: String(result.patient && result.patient.name || "").trim(),
    fecha: normalizeFechaLabHistory(result.patient && result.patient.fecha) || "",
    hora: normalizeHoraLabHistory(result.patient && result.patient.hora),
    bloques: result.resLabs.length
  };
}
function resolveChartPatientForReport_(reportText, findPatient) {
  if (!findPatient) return null;
  var exp = extractLabExpedienteFromReport(reportText);
  if (!exp) return null;
  return findPatient(exp) || null;
}
function priorRefsForPatient_(patient) {
  if (!patient || !patient.id) return /* @__PURE__ */ Object.create(null);
  return collectPriorRefsFromHistory(sortLabHistoryChronological(getLabHistory()[patient.id] || []));
}
function parseReportChunk(reportText, reportIndex, findPatient) {
  if (!looksLikeSomeLabReport(reportText)) {
    return parseReportChunkFailure(reportIndex, "No parece reporte SOME (copia desde \xABExpediente:\xBB)");
  }
  try {
    var chartPatient = resolveChartPatientForReport_(reportText, findPatient);
    var priorRefs = priorRefsForPatient_(chartPatient);
    var result = procesarLabs(reportText, {
      patient: chartPatient || void 0,
      priorRefsBySection: priorRefs
    });
    if (!result.resLabs) result.resLabs = [];
    return parseReportChunkSuccess(reportText, reportIndex, result);
  } catch (e) {
    return parseReportChunkFailure(reportIndex, e && e.message ? e.message : "Error al parsear");
  }
}
function collectUniqueExpedientes(okReports) {
  var expedientes = [];
  okReports.forEach(function(r) {
    if (r.expediente && expedientes.indexOf(r.expediente) === -1) expedientes.push(r.expediente);
  });
  return expedientes;
}
function filterUsableReportsForPatient(okReports, match) {
  if (!match) return okReports;
  var patientReg = String(match.registro || "").trim();
  if (!patientReg) return okReports;
  return okReports.filter(function(r) {
    return r.expediente === patientReg;
  });
}
function collectReportDays(usableReports) {
  var days = [];
  usableReports.forEach(function(r) {
    if (r.fecha && days.indexOf(r.fecha) === -1) days.push(r.fecha);
  });
  return days;
}
function countCensusMatchedExpedientes(expedientes, findPatient) {
  if (!findPatient) return (expedientes || []).length;
  var n = 0;
  (expedientes || []).forEach(function(exp) {
    if (exp && findPatient(exp)) n += 1;
  });
  return n;
}
function resolveBulkBlockStatus(chunks, okReports, match, expedientes, usableReports, findPatient) {
  if (!chunks.length) return "empty";
  if (!okReports.length) return "parse-errors";
  if (!match) return "no-patient";
  if (!usableReports.length) return "parse-errors";
  if (countCensusMatchedExpedientes(expedientes, findPatient) > 1) return "mixed-expediente";
  return "ok";
}
function buildBulkBlockPreview(blockText, blockIndex, findPatient) {
  var chunks = splitSomeReportsInBlock(blockText);
  var reports = chunks.map(function(chunk, ri) {
    return parseReportChunk(chunk, ri, findPatient);
  });
  var okReports = reports.filter(function(r) {
    return r.ok;
  });
  var expedientes = collectUniqueExpedientes(okReports);
  var primaryExp = expedientes[0] || "";
  var match = primaryExp && findPatient ? findPatient(primaryExp) : null;
  var usableReports = filterUsableReportsForPatient(okReports, match);
  var days = collectReportDays(usableReports);
  var status = resolveBulkBlockStatus(
    chunks,
    okReports,
    match,
    expedientes,
    usableReports,
    findPatient
  );
  var patientReg = match ? String(match.registro || "").trim() : "";
  var setsAfterMerge = usableReports.length ? mergeBulkParseResultsForStorage(
    usableReports.map(function(r) {
      return { result: r.result, reportText: r.reportText };
    })
  ).length : 0;
  return {
    blockIndex,
    reportCount: chunks.length,
    okReportCount: usableReports.length,
    reports,
    expedientes,
    patient: match,
    patientName: match ? match.nombre || "Sin nombre" : okReports[0] ? okReports[0].nombre || "\u2014" : "\u2014",
    primaryExpediente: patientReg || primaryExp,
    days: sortDaysDesc(days),
    daysLabel: sortDaysDesc(days).join(", ") || "\u2014",
    setsAfterMerge,
    status,
    canProcess: !!match && usableReports.length > 0
  };
}
function buildBulkLabPreview(text, opts) {
  var findPatient = opts && opts.findPatientByRegistro;
  var blocks = splitBulkLabTextByPatient(text);
  if (!blocks.length && String(text || "").trim()) {
    blocks = [String(text).trim()];
  }
  return blocks.map(function(blockText, blockIndex) {
    return buildBulkBlockPreview(blockText, blockIndex, findPatient);
  });
}
function buildMergedPayloadFromGroup(items, tipo) {
  var mergeOrder = (items || []).slice().sort(function(a, b) {
    var sa = a && a.reportText && looksLikeSomeLabReport(a.reportText) ? 1 : 0;
    var sb = b && b.reportText && looksLikeSomeLabReport(b.reportText) ? 1 : 0;
    if (sa !== sb) return sa - sb;
    return 0;
  });
  var merged = [];
  var sourceParts = [];
  var mergedBhExtras = {};
  var mergedRefs = {};
  var newestHora = "";
  var horaSome = "";
  mergeOrder.forEach(function(item, _idx) {
    var result = item.result;
    var rows = (result.resLabs || []).slice();
    if (merged.length && rows.length) merged.push("");
    merged = merged.concat(rows);
    if (item.reportText && String(item.reportText).trim()) sourceParts.push(String(item.reportText).trim());
    if (result.bhExtras && typeof result.bhExtras === "object") {
      Object.keys(result.bhExtras).forEach(function(k) {
        mergedBhExtras[k] = result.bhExtras[k];
      });
    }
    if (result.refsBySection && typeof result.refsBySection === "object") {
      Object.keys(result.refsBySection).forEach(function(k) {
        mergedRefs[k] = result.refsBySection[k];
      });
    }
    var h = normalizeHoraLabHistory(result.patient && result.patient.hora);
    if (h) newestHora = h;
    if (item.reportText && looksLikeSomeLabReport(item.reportText) && h) horaSome = h;
  });
  var deduped = dedupeConsolidatedLabRows(merged, tipo);
  deduped = sanitizeResLabsChunks(
    reprocessLabResultLines_(deduped, {
      gasRefs: mergedRefs.GASES
    })
  );
  var first = mergeOrder[0].result;
  var fecha = normalizeFechaLabHistory(first.patient && first.patient.fecha) || "";
  return {
    resLabs: deduped,
    fecha,
    hora: horaSome || newestHora,
    sourceText: sourceParts.join("\n\n---\n\n"),
    bhExtras: mergedBhExtras,
    refsBySection: mergedRefs,
    patient: first.patient
  };
}
function timestampMsFromParsedItem(item) {
  var result = item && item.result;
  if (!result) return null;
  return labTimestampMsFromFechaHora(result.patient && result.patient.fecha, result.patient && result.patient.hora);
}
function isGasoChunk(chunk) {
  var s = String(chunk || "").trim();
  return /^GASES\b/i.test(s) || /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(s);
}
function stripDuplicateNonGasoChunksAcrossPayloads(payloads) {
  if (!payloads || payloads.length < 2) return payloads;
  var seenByDay = /* @__PURE__ */ Object.create(null);
  return payloads.map(function(payload) {
    var dk = normalizeFechaLabHistory(payload.fecha) || String(payload.fecha || "").trim();
    if (!dk) return payload;
    if (!seenByDay[dk]) seenByDay[dk] = /* @__PURE__ */ Object.create(null);
    var seen = seenByDay[dk];
    var filtered = (payload.resLabs || []).filter(function(chunk) {
      if (isGasoChunk(chunk)) return true;
      var norm = normalizeLabLine(String(chunk || ""));
      if (!norm) return true;
      if (seen[norm]) return false;
      seen[norm] = true;
      return true;
    });
    if (filtered.length === payload.resLabs.length) return payload;
    return Object.assign({}, payload, { resLabs: filtered });
  });
}
function mergeBulkParseResults(parsedItems) {
  var clusters = clusterByDayTipoAndTimeWindow(
    (parsedItems || []).filter(function(item) {
      return item && item.result && item.result.resLabs && item.result.resLabs.length;
    }),
    function(item) {
      return dayKeyFromResult(item.result);
    },
    function(item) {
      return primaryTipoForResLabs(item.result.resLabs || []);
    },
    timestampMsFromParsedItem,
    function(item) {
      return resLabsHasGasometria(item.result.resLabs || []);
    }
  );
  var payloads = clusters.map(function(cluster) {
    var tipo = primaryTipoForResLabs(cluster[0].result.resLabs || []);
    return buildMergedPayloadFromGroup(cluster, tipo);
  });
  return stripDuplicateNonGasoChunksAcrossPayloads(payloads);
}
function mergeBulkParseResultsForStorage(parsedItems) {
  return mergeBulkParseResults(parsedItems);
}
function latestDayKeyFromParsedItems(parsedItems) {
  var latestMs = -Infinity;
  (parsedItems || []).forEach(function(item) {
    if (!item || !item.result) return;
    var fecha = normalizeFechaLabHistory(item.result.patient && item.result.patient.fecha) || "";
    var hora = normalizeHoraLabHistory(item.result.patient && item.result.patient.hora);
    var ms = parseFechaLabToMs(fecha, hora);
    if (typeof ms === "number" && isFinite(ms) && ms > latestMs) latestMs = ms;
  });
  if (!(latestMs > -Infinity)) return "";
  var d = new Date(latestMs);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function wrapSingleParsedLabDisplay(item) {
  if (!item || !item.result) return null;
  return {
    patient: item.result.patient,
    resLabs: item.result.resLabs,
    bhExtras: item.result.bhExtras,
    refsBySection: item.result.refsBySection,
    sourceText: item.reportText,
    expediente: item.result.patient && item.result.patient.expediente
  };
}
function pickLatestDayMergedLabDisplay(parsedItems) {
  var withLabs = (parsedItems || []).filter(function(item) {
    return item && item.result && item.result.resLabs && item.result.resLabs.length;
  });
  var items = withLabs.length ? withLabs : (parsedItems || []).filter(function(item) {
    return item && item.result && Array.isArray(item.result.resLabs);
  });
  if (!items.length) return null;
  if (items.length === 1) return wrapSingleParsedLabDisplay(items[0]);
  var latestDayKey = latestDayKeyFromParsedItems(items);
  var dayItems = latestDayKey ? items.filter(function(item) {
    return dayKeyFromResult(item.result) === latestDayKey;
  }) : items.slice();
  if (!dayItems.length) dayItems = items.slice();
  if (dayItems.length === 1) return wrapSingleParsedLabDisplay(dayItems[0]);
  var latestItem = dayItems[0];
  var latestMs = timestampMsFromParsedItem(latestItem);
  dayItems.slice(1).forEach(function(item) {
    var ms = timestampMsFromParsedItem(item);
    if (typeof ms === "number" && isFinite(ms)) {
      if (typeof latestMs !== "number" || !isFinite(latestMs) || ms > latestMs) {
        latestItem = item;
        latestMs = ms;
      }
    }
  });
  var dayClusters = clusterLabworkByTimeWindow(
    dayItems,
    timestampMsFromParsedItem,
    function(item) {
      return resLabsHasGasometria(item.result.resLabs || []);
    }
  );
  var targetCluster = dayClusters.find(function(cluster) {
    return cluster.indexOf(latestItem) !== -1;
  }) || [latestItem];
  if (targetCluster.length === 1) return wrapSingleParsedLabDisplay(targetCluster[0]);
  var tipo = primaryTipoForResLabs(targetCluster[0].result.resLabs || []);
  return buildMergedPayloadFromGroup(targetCluster, tipo);
}
function bulkBlocksHaveProcessablePatient(blocks) {
  return blocks.some(function(b) {
    return b && b.canProcess && b.okReportCount > 0 && b.patient;
  });
}
function bulkBlocksHaveDisplayableReports(blocks) {
  return blocks.some(function(b) {
    return b && b.okReportCount > 0;
  });
}
function shouldShowBulkLabPreview(blocks, totalOkReports, opts) {
  if (!Array.isArray(blocks) || !blocks.length) return false;
  var quickLabOutput = !!(opts && opts.quickLabOutput);
  if (quickLabOutput && bulkBlocksHaveDisplayableReports(blocks) && !bulkBlocksHaveProcessablePatient(blocks)) {
    return false;
  }
  if (blocks.length === 1 && blocks[0] && blocks[0].status === "no-patient") {
    return false;
  }
  if (blocks.length > 1) return true;
  if (totalOkReports > 1) return true;
  return blocks.some(function(b) {
    return b && b.status !== "ok";
  });
}
function extractLabPatientFromBulkBlock(block) {
  if (!block || !Array.isArray(block.reports)) return null;
  var ok = block.reports.find(function(r) {
    return r.ok && r.result && r.result.patient;
  });
  if (!ok || !ok.result.patient) return null;
  return ok.result.patient;
}
function bulkPreviewStatusLabel(status) {
  switch (status) {
    case "ok":
      return "Listo";
    case "mixed-expediente":
      return "Varios expedientes";
    case "no-patient":
      return "Paciente no encontrado";
    case "parse-errors":
      return "Error al parsear";
    case "empty":
      return "Vac\xEDo";
    default:
      return status || "\u2014";
  }
}

export {
  LAB_CONSOLIDATION_UNBOUNDED_WINDOW_MS,
  labConsolidationFamily,
  labTimestampMsFromFechaHora,
  clusterLabworkByTimeWindow,
  clusterLabConsolidationGroup,
  clusterByDayTipoAndTimeWindow,
  dedupeConsolidatedLabRows,
  LAB_BULK_PATIENT_SEPARATOR,
  buildBulkLabPreview,
  mergeBulkParseResultsForStorage,
  pickLatestDayMergedLabDisplay,
  shouldShowBulkLabPreview,
  extractLabPatientFromBulkBlock,
  bulkPreviewStatusLabel
};
//# sourceMappingURL=/js/chunks/chunk-JIKZNXZR.js.map
