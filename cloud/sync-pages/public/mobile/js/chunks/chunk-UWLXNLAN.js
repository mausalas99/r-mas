import {
  clearLabHistoryDateSelectCache,
  dedupeConsolidatedRowsBySection,
  labPanelBridge,
  labSetIdForHistory,
  loadLabHistorySetIntoOutput,
  maybeShowLabHistoryForActivePatient,
  refreshSameDayAscitisForPatient,
  renderLabHistoryPanel,
  setLabHistorySelectedSetId
} from "/mobile/js/chunks/chunk-JTFIIC4P.js";
import {
  rt
} from "/mobile/js/chunks/chunk-RMUFSCXL.js";
import {
  LAB_BULK_PATIENT_SEPARATOR,
  LAB_CONSOLIDATION_UNBOUNDED_WINDOW_MS,
  clusterLabConsolidationGroup,
  clusterLabworkByTimeWindow,
  dedupeConsolidatedLabRows,
  isGasometriaOnlyResLabs,
  labConsolidationFamily,
  labTimestampMsFromFechaHora,
  mergeBulkParseResultsForStorage,
  pickLatestDayMergedLabDisplay,
  primaryTipoForLabSet,
  resLabsHasGasometria
} from "/mobile/js/chunks/chunk-WEOKZTSW.js";
import {
  sanitizeResLabsChunks
} from "/mobile/js/chunks/chunk-7XJNQXQX.js";
import {
  enqueueCloudLabSidecarsForPatient
} from "/mobile/js/chunks/chunk-B7NNRK4H.js";
import {
  getLabHistory,
  getNotes,
  getPatients,
  persistClinicalState
} from "/mobile/js/chunks/chunk-MLLRKYO6.js";
import {
  areLabSetsEquivalent,
  buildRefsBySectionFromReport,
  bumpLabHistoryRevision,
  compareLabSetIdForDedupe,
  findExactDuplicateLabGroups,
  findLabSetsByDateTime,
  gasometriaFingerprintFromResLabs,
  looksLikeSomeLabReport,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  parseFechaLabToMs,
  planLabHistoryDateTimeUpsert,
  sortLabHistoryChronological
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  esc,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/labs-some-table-parse-loop.mjs
function handleSomeCultureBlock(state, lines, i, trimmed, h) {
  if (h.normalizeDeptKey(state.currentDept.key) !== "BACTERIOLOGIA") return null;
  if (!h.isCultureSampleTitle(trimmed, lines.slice(i + 1, i + 9))) return null;
  var cultBlock = h.parseBacteriologiaCultureGroup(lines, i);
  h.ensureGroup(cultBlock.title);
  cultBlock.rows.forEach(function(r) {
    state.currentGroup.rows.push(r);
  });
  return cultBlock.nextIdx - 1;
}
function handleSomeTipoMuestra(state, lines, i, _trimmed, h) {
  var idx = i + 1;
  while (idx < lines.length) {
    var tipoNext = h.cleanEstudio(lines[idx]);
    idx++;
    if (!tipoNext) continue;
    if (h.isFlagToken(tipoNext)) continue;
    if (h.isCitoGroupTitle(tipoNext) || h.CITO_GROUP_RE.test(tipoNext)) {
      h.ensureGroup(tipoNext);
      continue;
    }
    break;
  }
  return idx - 2;
}
function handleSomeComentario(state, lines, i, _trimmed, h) {
  var fluidVal = "";
  var fj = i + 1;
  while (fj < lines.length) {
    var fline = h.cleanEstudio(lines[fj]);
    fj++;
    if (!fline) break;
    if (h.isDepartmentLine(fline) || h.isTableHeaderLine(fline)) {
      fj--;
      break;
    }
    if (h.isFlagToken(fline)) continue;
    fluidVal = fline;
    break;
  }
  if (state.currentGroup) {
    state.currentGroup.fluidSource = fluidVal || state.currentGroup.fluidSource || "";
  }
  return fj - 1;
}
function handleSomeSkipResume(state, lines, i, trimmed, h) {
  if (!state.skipSection || h.isCommentNoiseEstudio(trimmed)) return null;
  var resumeIdx = i;
  var nextTrim = h.cleanEstudio(lines[i + 1] || "");
  if (nextTrim && nextTrim.toUpperCase() === trimmed.toUpperCase()) resumeIdx = i + 1;
  var resumeParsed = h.readRowAt(lines, resumeIdx, state.currentGroup && state.currentGroup.title);
  if (!resumeParsed || !resumeParsed.row || h.isCommentNoiseEstudio(resumeParsed.row.estudio) || !resumeParsed.row.resultado || h.isFlagToken(resumeParsed.row.resultado)) {
    return null;
  }
  state.skipSection = false;
  if (!state.currentGroup) h.ensureGroup("");
  state.currentGroup.rows.push(resumeParsed.row);
  return resumeParsed.nextIdx - 1;
}
function pushGroupTitleRow(state, lines, startIdx, title, h) {
  var dup = h.cleanEstudio(lines[startIdx + 1] || "");
  if (dup && dup.toUpperCase() === title.toUpperCase()) {
    var parsedDup = h.readRowAt(lines, startIdx + 1, title);
    if (parsedDup && parsedDup.row) {
      state.currentGroup.rows.push(parsedDup.row);
      return parsedDup.nextIdx - 1;
    }
    return startIdx + 1;
  }
  return startIdx + 1;
}
function handleSomeFlattenCitoTitle(state, lines, i, trimmed, h) {
  h.ensureGroup(trimmed);
  var citoDup = h.cleanEstudio(lines[i + 1] || "");
  if (citoDup && citoDup.toUpperCase() === trimmed.toUpperCase()) {
    var citoParsed = h.readRowAt(lines, i + 1, trimmed);
    if (citoParsed && citoParsed.row) {
      state.currentGroup.rows.push(citoParsed.row);
      return citoParsed.nextIdx - 1;
    }
    return i + 1;
  }
  return i;
}
function handleSomeGroupTitle(state, lines, i, trimmed, h) {
  if (!h.isLikelyGroupTitle(trimmed, lines.slice(i + 1, i + 9), state.currentGroup && state.currentGroup.title)) {
    return null;
  }
  if (h.FLATTEN_DEPT_KEYS[h.normalizeDeptKey(state.currentDept.key)]) {
    if (h.isCitoGroupTitle(trimmed)) return handleSomeFlattenCitoTitle(state, lines, i, trimmed, h);
    h.ensureGroup("");
    var flatParsed = h.readRowAt(lines, i, "");
    if (flatParsed && flatParsed.row) {
      state.currentGroup.rows.push(flatParsed.row);
      return flatParsed.nextIdx - 1;
    }
    return i;
  }
  h.ensureGroup(trimmed);
  return pushGroupTitleRow(state, lines, i, trimmed, h);
}
function handleSomeFlatStudyRow(state, lines, i, trimmed, h) {
  if (!h.FLATTEN_DEPT_KEYS[h.normalizeDeptKey(state.currentDept.key)]) return null;
  if (h.isCitoGroupTitle(trimmed)) return null;
  if (!h.isStudyRowHeader(trimmed, lines.slice(i + 1, i + 9))) return null;
  if (state.currentGroup && h.isCitoGroupTitle(state.currentGroup.title) && !h.isSerumQcAnalyte(trimmed)) {
    return null;
  }
  if (h.isLikelyGroupTitle(trimmed, lines.slice(i + 1, i + 9), state.currentGroup && state.currentGroup.title)) {
    return null;
  }
  h.ensureGroup("");
  var flatRow = h.readRowAt(lines, i, "");
  if (flatRow && flatRow.row) {
    state.currentGroup.rows.push(flatRow.row);
    return flatRow.nextIdx - 1;
  }
  return null;
}
function handleSomeDataRow(state, lines, i, _trimmed, h) {
  var parsedRow = h.readRowAt(lines, i, state.currentGroup && state.currentGroup.title);
  if (parsedRow && parsedRow.row && (h.isCitoGroupTitle(parsedRow.row.resultado) || h.CITO_GROUP_RE.test(parsedRow.row.resultado || ""))) {
    h.ensureGroup(String(parsedRow.row.resultado).trim());
    return parsedRow.nextIdx - 1;
  }
  var parsed = parsedRow;
  if (!parsed || !parsed.row) return null;
  if (!state.currentGroup) h.ensureGroup("");
  state.currentGroup.rows.push(parsed.row);
  return parsed.nextIdx - 1;
}
function dispatchSomeParseLine(state, lines, i, trimmed, h) {
  if (h.isDepartmentLine(trimmed)) {
    h.ensureDept(h.departmentKey(trimmed));
    state.currentGroup = null;
    state.skipSection = false;
    return i;
  }
  if (h.isTableHeaderLine(trimmed) || !state.currentDept) return i;
  if (trimmed === ":" || trimmed === "\u2014") return i;
  if (h.isSectionDividerRow({ estudio: trimmed, resultado: "", unidades: "", ref: "" })) return i;
  if (h.isSectionDividerEstudio(trimmed)) return h.skipSectionDividerBlock(lines, i) - 1;
  var handlers = [
    function() {
      return handleSomeCultureBlock(state, lines, i, trimmed, h);
    },
    function() {
      if (!/^TIPO\s+DE\s+MUESTRA$/i.test(trimmed)) return null;
      return handleSomeTipoMuestra(state, lines, i, trimmed, h);
    },
    function() {
      if (!/^COMENTARIO$/i.test(trimmed)) return null;
      return handleSomeComentario(state, lines, i, trimmed, h);
    },
    function() {
      if (!h.isSkippedGroupTitle(trimmed)) return null;
      state.skipSection = true;
      state.currentGroup = null;
      return i;
    },
    function() {
      return handleSomeSkipResume(state, lines, i, trimmed, h);
    },
    function() {
      if (!state.skipSection) return null;
      return i;
    },
    function() {
      return handleSomeGroupTitle(state, lines, i, trimmed, h);
    },
    function() {
      return handleSomeFlatStudyRow(state, lines, i, trimmed, h);
    },
    function() {
      return handleSomeDataRow(state, lines, i, trimmed, h);
    }
  ];
  for (var hi = 0; hi < handlers.length; hi++) {
    var next = handlers[hi]();
    if (next != null) return next;
  }
  return i;
}
function finalizeSomeDepartments(departments, h) {
  departments.forEach(function(dept) {
    dept.groups.forEach(function(g) {
      h.normalizeSomeGroup(g);
    });
    dept.groups = dept.groups.filter(function(g) {
      return g.rows.length > 0;
    });
    if (h.FLATTEN_DEPT_KEYS[h.normalizeDeptKey(dept.key)]) {
      h.flattenDeptGroups(dept);
    }
    h.stripCommentNoiseFromDepartment(dept);
  });
  return departments.filter(function(d) {
    return d.groups.length > 0;
  });
}

// public/js/labs-some-table-helpers.mjs
var SOME_DEPARTMENTS = [
  "HEMATOLOGIA",
  "QUIMICA CLINICA",
  "BACTERIOLOGIA",
  "GASOMETRIA",
  "GASOMETRIAS",
  "INMUNOLOGIA",
  "COAGULACION",
  "URIANALISIS",
  "EXAMEN GENERAL DE ORINA",
  "ANALISIS DE ORINA",
  "CULTIVO",
  "BANDEJA"
];
var DEPT_RE = new RegExp(
  "^(" + SOME_DEPARTMENTS.map(function(d) {
    return d.replace(/\s+/g, "\\s+");
  }).join("|") + ")$",
  "i"
);
function normLine(raw) {
  return String(raw == null ? "" : raw).replace(/\r/g, "").trim();
}
function cleanValue(raw) {
  return normLine(raw).replace(/^\*+\s*/, "").trim();
}
function cleanEstudio(raw) {
  return normLine(raw).replace(/\t+$/, "").trim();
}
var SOME_HEADER_TOKEN_RE = /^(ESTUDIO|RESULTADO(\s+UNIDADES)?|UNIDADES|VALOR\s+DE\s+REFERENCIA)$/;
function isTableHeaderLine(line) {
  var u = line.toUpperCase().trim();
  if (/ESTUDIO/.test(u) && /RESULTADO/.test(u)) return true;
  return SOME_HEADER_TOKEN_RE.test(u);
}
function isDepartmentLine(line) {
  var c = cleanEstudio(line).toUpperCase();
  return DEPT_RE.test(c);
}
function departmentKey(line) {
  var c = cleanEstudio(line).toUpperCase();
  var m = c.match(DEPT_RE);
  if (!m) return "";
  var hit = SOME_DEPARTMENTS.find(function(d) {
    return d.replace(/\s+/g, " ") === m[1].replace(/\s+/g, " ");
  });
  return hit || m[1];
}
function isFlagToken(tok) {
  return /^(\*|A|B|CB|CA)$/i.test(String(tok || "").trim());
}
function isAbnormalFlag(flag) {
  return /^(\*|A|B|CB|CA)$/i.test(String(flag || "").trim()) && String(flag).trim() !== "*";
}
var FLATTEN_DEPT_KEYS = {
  "QUIMICA CLINICA": true,
  "EXAMEN GENERAL DE ORINA": true,
  "ANALISIS DE ORINA": true,
  "URIANALISIS": true
};
var CITO_GROUP_RE = /CITOQUIMICO\s+DE\s+LIQUIDOS\s+CORPORALES/i;
function normalizeDeptKey(key) {
  return String(key || "").replace(/\s+/g, " ").trim().toUpperCase();
}
function isSkippedGroupTitle(name) {
  var u = cleanEstudio(name).toUpperCase();
  return isCommentNoiseEstudio(u) || /^OBSERVACIONES?\b/.test(u);
}
function isCommentNoiseEstudio(name) {
  var u = cleanEstudio(name).toUpperCase();
  if (u === "COMENTARIO") return false;
  return /^COMENTARIOS?\s+DE(?:\s+LA)?\s+MUESTRA\b/.test(u) || /^OBSERVACIONES?\b/.test(u) || /^OBSERVACION\b/.test(u) || /^OBS\b/.test(u) || /^SIN\s+VALOR\b/.test(u) || /^TEXTO\s+LIBRE\b/.test(u) || /^VALOR\s+DE\s+REFERENCIA\b/.test(u) || /^NOTA(?:S)?\s+(?:DE\s+)?MUESTRA\b/.test(u);
}
function isCitoGroupTitle(title) {
  return CITO_GROUP_RE.test(String(title || ""));
}
function isSectionDividerEstudio(name) {
  var u = cleanEstudio(name).toUpperCase();
  return /^(FISICO|QUIMICO|SEDIMENTO|MICROSCOPICO)$/.test(u);
}
function skipSectionDividerBlock(lines, startIdx) {
  var label = cleanEstudio(lines[startIdx] || "");
  var i = startIdx + 1;
  while (i < lines.length) {
    var p = cleanEstudio(lines[i]);
    i++;
    if (!p) continue;
    if (isTableHeaderLine(p) || isDepartmentLine(p)) {
      i--;
      break;
    }
    if (isFlagToken(p)) continue;
    if (p.toUpperCase() === label.toUpperCase()) continue;
    if (p === ":" || /^AUSENTE$/i.test(p)) continue;
    break;
  }
  return i;
}
function pruneSomeCultureRows(rows) {
  return (rows || []).filter(function(r) {
    if (!r || !r.estudio || isSectionDividerRow(r)) return false;
    var res = String(r.resultado || "").trim();
    if (/^MICROORGANISMO|^CUENTA|^COMENTARIO/i.test(r.estudio)) {
      return !!res && res !== ":" && res !== "\u2014";
    }
    if (!res || res === ":" || res === "\u2014") return false;
    return true;
  });
}
function pruneSomeRows(rows) {
  var out = [];
  (rows || []).forEach(function(r) {
    if (!r || !r.estudio || isSectionDividerRow(r)) return;
    var res = String(r.resultado || "").trim();
    if (!res || res === ":" || res === "\u2014") return;
    var key = r.estudio.toUpperCase();
    var idx = -1;
    for (var k = 0; k < out.length; k++) {
      if (out[k].estudio.toUpperCase() === key) {
        idx = k;
        break;
      }
    }
    if (idx >= 0) {
      var prevRes = String(out[idx].resultado || "").trim();
      if (!prevRes || prevRes === "\u2014") out[idx] = r;
      return;
    }
    out.push(r);
  });
  return out;
}
function isSectionDividerRow(row) {
  if (!row) return false;
  var u = String(row.estudio || "").trim().toUpperCase();
  if (isSectionDividerEstudio(u)) return true;
  if (/^EXAMEN\s+QUIMICO$/.test(u)) return true;
  if (/^CITOQUIMICO\s+DE\s*$/.test(u)) return true;
  var res = String(row.resultado || "").trim();
  if ((res === ":" || res === "") && !row.unidades && !row.ref && /^EXAMEN\b/.test(u)) return true;
  return false;
}
function formatSomeResultado(row) {
  if (!row) return "\u2014";
  var val = String(row.resultado == null ? "" : row.resultado).trim();
  if (!val) return "\u2014";
  var units = String(row.unidades || "").trim();
  return units ? val + " " + units : val;
}
function isMetadataLine(line) {
  var t = line.trim();
  if (!t) return true;
  if (/^(Expediente|Solicitud|Nombre|Sexo|Edad|Ubicaci[oó]n|M[eé]dico|Fecha\s+Registro)\s*:/i.test(t)) {
    return true;
  }
  if (/^[A-Za-z]{3}\s+\d{1,2}\s+\d{4}/.test(t) && t.indexOf("	") !== -1) return true;
  return false;
}
function stripSomeInlineMetadata(raw) {
  var t = String(raw == null ? "" : raw).trim();
  if (!t) return "";
  if (/^(?:Expediente|Solicitud)\s*:/i.test(t)) return "";
  return t.replace(/\s*(?:Expediente|Solicitud)\s*:[\s\S]*$/i, "").trim();
}
function lineHasSomeMetadata(line) {
  var t = String(line || "").trim();
  if (!t) return false;
  if (isMetadataLine(t)) return true;
  return /\b(?:Expediente|Solicitud)\s*:/i.test(t);
}
function isInvalidStudyHeaderName_(name) {
  return !name || isTableHeaderLine(name) || isDepartmentLine(name) || isFlagToken(name) || /^\d+([.,]\d+)?$/.test(name) || name === ":" || isSkippedGroupTitle(name) || isCommentNoiseEstudio(name) || !/[A-ZÁÉÍÓÚÑ]/.test(name);
}
function studyHeaderMatchesNext_(name, nextLines) {
  var n0 = cleanEstudio(nextLines[0] || "");
  var n1 = cleanEstudio(nextLines[1] || "");
  if (n0 && n0.toUpperCase() === name.toUpperCase()) return true;
  if (isFlagToken(n0)) return true;
  return !!(n0 && n0.toUpperCase() === name.toUpperCase() && isFlagToken(n1));
}
function isStudyRowHeader(line, nextLines) {
  var name = cleanEstudio(line);
  if (isInvalidStudyHeaderName_(name)) return false;
  return studyHeaderMatchesNext_(name, nextLines);
}
function isSerumQcAnalyte(name) {
  return /^(ALBUMINA|COLESTEROL|TRIGLICERIDOS|VLDL|INDICE ATEROGENICO|ÍNDICE ATEROGÉNICO|COCIENTE COL)\b/i.test(
    String(name || "").trim()
  );
}
function isInvalidGroupTitleName_(name) {
  return !name || isTableHeaderLine(name) || isDepartmentLine(name) || /^COMENTARIO$/i.test(name) || /^EXAMEN\s+QUIMICO$/i.test(name) || isFlagToken(name) || /^\d+([.,]\d+)?$/.test(name) || name === ":" || looksLikeUnitsRefLine(name) || !/[A-ZÁÉÍÓÚÑ]/.test(name);
}
function groupTitleLooksLikeSection_(name, nextLines) {
  var upper = name.toUpperCase();
  for (var i = 0; i < Math.min(nextLines.length, 4); i++) {
    var n = cleanEstudio(nextLines[i]);
    if (!n) continue;
    if (isTableHeaderLine(n) || isDepartmentLine(n)) return true;
    if (n.toUpperCase().indexOf(upper + " ") === 0) return true;
    break;
  }
  return /\b(CITOQUIMICO DE|LIQUIDOS CORPORALES|BIOMETRIA HEMATICA|TIEMPO DE|EXAMEN GENERAL DE ORINA|FISICOQUIMICO|FIBRAS VEGETALES|RELACION A\/G|PLAQUETAS CON|FROTIS|VELOCIDAD DE)\b/i.test(
    name
  );
}
function isLikelyGroupTitle(line, nextLines, currentGroupTitle) {
  var name = cleanEstudio(line);
  if (isInvalidGroupTitleName_(name)) return false;
  if (currentGroupTitle && name.toUpperCase() === String(currentGroupTitle).toUpperCase()) return false;
  var upper = name.toUpperCase();
  if (upper !== name && upper.replace(/[^A-ZÁÉÍÓÚÑ0-9\s/().-]/g, "") !== upper) return false;
  return groupTitleLooksLikeSection_(name, nextLines);
}
function stripCommentNoiseFromDepartment(dept) {
  if (!dept || !dept.groups) return dept;
  dept.groups = dept.groups.map(function(g) {
    var title = cleanEstudio(g.title || "");
    if (isSkippedGroupTitle(title) || isCommentNoiseEstudio(title)) return null;
    g.rows = (g.rows || []).filter(function(r) {
      return r && !isCommentNoiseEstudio(r.estudio) && !isSkippedGroupTitle(r.estudio);
    });
    return g;
  }).filter(function(g) {
    return g && g.rows && g.rows.length > 0;
  });
  return dept;
}
function looksLikeReferenceValue(line) {
  var t = String(line || "").trim();
  if (!t) return false;
  if (/^(NEGATIVO|POSITIVO|AUSENTE|AUSENTES|N\/A|NA)$/.test(t)) return true;
  if (/^\d/.test(t) && /\s-\s/.test(t)) return true;
  if (/^\d+([.,]\d+)?\s*-\s*\d+([.,]\d+)?(\/[A-Za-z]+)?$/i.test(t)) return true;
  return false;
}
function looksLikeQualitativeResult(line) {
  var t = String(line || "").trim();
  if (!t) return false;
  return /^(negativo|positivo|ausente|ausentes|escasas?|abundantes?|moderadas?|claro|amarillo|turbi[do]a?|presente|no\s+detectado)$/i.test(
    t
  );
}
function looksLikeUnitsRefLine(line) {
  var t = String(line || "").trim();
  if (!t) return false;
  if (looksLikeQualitativeResult(t)) return false;
  if (/\t/.test(t)) {
    var left = t.split("	")[0].trim();
    if (left && !/^\d/.test(left)) return true;
    if (/\d/.test(t)) return true;
  }
  if (looksLikeReferenceValue(t)) return true;
  if (/^\d/.test(t) && /\s-\s/.test(t)) return true;
  if (/^(g\/dL|mg\/dL|mmol\/L|K\/uL|M\/uL|mm\/hr|mm3|\/CAMPO|UI\/L|IU\/L|E\.U\.|Hem\/uL|Leucocitos\/uL|%|SEG\.?|fL|pg)$/i.test(
    t
  )) {
    return true;
  }
  if (/^[A-Za-z][A-Za-z0-9/.%-]*\/[A-Za-z0-9/.%-]+$/i.test(t)) return true;
  return false;
}
function parseUnitsRef(line) {
  var t = stripSomeInlineMetadata(line);
  if (!t) return { unidades: "", ref: "" };
  var tab = t.indexOf("	");
  if (tab >= 0) {
    return {
      unidades: stripSomeInlineMetadata(t.slice(0, tab)),
      ref: stripSomeInlineMetadata(t.slice(tab + 1))
    };
  }
  if (looksLikeReferenceValue(t)) {
    return { unidades: "", ref: t };
  }
  if (/^\d/.test(t) && /\s-\s/.test(t) && !/[a-zA-Z]{3,}/.test(t.split(/\s-\s/)[0])) {
    return { unidades: "", ref: t };
  }
  return { unidades: t, ref: "" };
}

// public/js/labs-some-table-row-parse.mjs
var CULTURE_SAMPLE_RE = /^(ASPIRADO|UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO|CATETER|LIQUIDO|SECRECION|ABSCESO|BRONCOALVEOLAR|CULTIVO)\b/i;
function isCultureFieldLine(line, cultureFieldRe) {
  var n = cleanEstudio(line);
  return !!(n && cultureFieldRe.test(n));
}
function isInvalidCultureSampleName_(name) {
  return !name || isFlagToken(name) || isDepartmentLine(name) || isTableHeaderLine(name) || isCitoGroupTitle(name) || /^FIBRAS\s+VEGETALES$/i.test(name) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(name);
}
function cultureSampleHasProductFollow_(nextLines) {
  for (var i = 0; i < Math.min(nextLines.length, 8); i++) {
    var n = cleanEstudio(nextLines[i]);
    if (!n || isFlagToken(n)) continue;
    if (/^PRODUCTO|^TINCION|^CALIDAD|^ESTADO(\s+DE)?\s+CULTIVO/i.test(n)) return true;
    if (n.toUpperCase() === cleanEstudio(nextLines[0] || "").toUpperCase()) continue;
    break;
  }
  return false;
}
function isCultureSampleTitle(line, nextLines, cultureFieldRe) {
  var name = cleanEstudio(line);
  if (isInvalidCultureSampleName_(name) || isCultureFieldLine(name, cultureFieldRe)) return false;
  if (CULTURE_SAMPLE_RE.test(name)) return true;
  if (name !== name.toUpperCase()) return false;
  return cultureSampleHasProductFollow_(nextLines);
}
function cultureRowShouldBreak(estudio, t, parts) {
  if (/^MICROORGANISMO$/i.test(estudio) || /^CUENTA/i.test(estudio)) return true;
  return /^PRODUCTO$|^TINCION|^CALIDAD|^ESTADO|^REPORTE\s+PRELIMINAR/i.test(estudio) && parts.length >= 1;
}
function assignRowPrimaryValue_(value, p) {
  if (!value && p !== ":" && p !== "\u2014") return p;
  if (value === ":" && p !== ":" && p !== "\u2014") return p;
  return value;
}
function mergeRowUnitsRef_(unidades, ref, p, value) {
  var ur = parseUnitsRef(p);
  if (!unidades && ur.unidades) unidades = ur.unidades;
  if (!ref && ur.ref) ref = ur.ref;
  if (!unidades && !ref && p !== value) {
    if (/^\d/.test(p) && /\s-\s/.test(p)) ref = p;
    else if (!unidades) unidades = p;
  }
  return { unidades, ref };
}
function finalizeRow(estudio, flag, valueParts) {
  var est = cleanEstudio(estudio);
  if (!est) return null;
  var flagTok = isFlagToken(flag) ? flag.trim() : "*";
  var value = "";
  var unidades = "";
  var ref = "";
  for (var i = 0; i < valueParts.length; i++) {
    var p = cleanValue(stripSomeInlineMetadata(valueParts[i]));
    if (!p || lineHasSomeMetadata(p)) continue;
    var nextValue = assignRowPrimaryValue_(value, p);
    if (nextValue !== value) {
      value = nextValue;
      continue;
    }
    var merged = mergeRowUnitsRef_(unidades, ref, p, value);
    unidades = merged.unidades;
    ref = merged.ref;
  }
  return {
    estudio: est,
    flag: flagTok,
    resultado: value,
    unidades,
    ref,
    abnormal: isAbnormalFlag(flagTok)
  };
}
function shouldStopCultureRow_(t, lines, j, estudio, parts, cultureFieldRe, isSampleTitle) {
  if (isCultureFieldLine(t, cultureFieldRe) || isSampleTitle(t, lines.slice(j, j + 8))) return true;
  if (isDepartmentLine(t) || isTableHeaderLine(t)) return true;
  if (!parts.length && isFlagToken(t)) {
    var peek = cleanEstudio(lines[j] || "");
    return !!(peek && (isCultureFieldLine(peek, cultureFieldRe) || isSampleTitle(peek, lines.slice(j + 1, j + 9))));
  }
  return false;
}
function readCultureSomeRowAt(lines, startIdx, endIdx, cultureFieldRe, isSampleTitle) {
  var estudio = cleanEstudio(lines[startIdx]);
  if (!estudio || !isCultureFieldLine(estudio, cultureFieldRe)) return null;
  var j = startIdx + 1;
  var flag = "*";
  var parts = [];
  while (j < endIdx) {
    var t = cleanEstudio(lines[j]);
    j++;
    if (!t) continue;
    if (shouldStopCultureRow_(t, lines, j, estudio, parts, cultureFieldRe, isSampleTitle)) {
      if (!parts.length && isFlagToken(t)) break;
      j--;
      break;
    }
    if (!parts.length && isFlagToken(t)) {
      flag = t;
      continue;
    }
    if (t.toUpperCase() === estudio.toUpperCase()) continue;
    parts.push(t);
    if (cultureRowShouldBreak(estudio, t, parts)) break;
  }
  var row = finalizeRow(estudio, flag, parts);
  if (!row) return null;
  return { row, nextIdx: j };
}
function isInvalidStandardRowHeader(estudio) {
  return !estudio || isFlagToken(estudio) || isTableHeaderLine(estudio) || isDepartmentLine(estudio) || isSkippedGroupTitle(estudio) || isCommentNoiseEstudio(estudio) || isSectionDividerEstudio(estudio) || estudio === ":" || estudio === "\u2014";
}
function shouldStopAtGroupTitle(t, lines, j, parts, currentGroupTitle) {
  if (!isLikelyGroupTitle(t, lines.slice(j, j + 9), currentGroupTitle)) return false;
  return parts.length > 0 || isCitoGroupTitle(t) || /\b(FIBRAS VEGETALES|BIOMETRIA HEMATICA|TIEMPO DE|FROTIS)\b/i.test(t);
}
function appendUnitsRefIfNext(parts, lines, j) {
  if (parts.length <= 1 || !looksLikeUnitsRefLine(parts[parts.length - 1])) return j;
  var nxtRef = cleanEstudio(lines[j] || "");
  if (nxtRef && looksLikeReferenceValue(nxtRef) && !isFlagToken(cleanEstudio(lines[j + 1] || ""))) {
    parts.push(nxtRef);
    return j + 1;
  }
  return j;
}
function shouldBreakStandardRowAtFlag_(estudio, lines, j) {
  var peekAfterFlag = cleanEstudio(lines[j] || "");
  return /^COMENTARIO/i.test(estudio) && peekAfterFlag && /^(CUENTA|MICROORGANISMO|ANTIBIOGRAMA)\b/i.test(peekAfterFlag);
}
function consumeStandardRowPart_(estudio, t, lines, j, parts, currentGroupTitle) {
  if (lineHasSomeMetadata(t)) {
    var withoutMeta = stripSomeInlineMetadata(t);
    if (!withoutMeta || /^\d+-\d+$/.test(withoutMeta)) return { stop: true, rewind: true };
    parts.push(withoutMeta);
    return { j };
  }
  if (shouldStopAtGroupTitle(t, lines, j, parts, currentGroupTitle)) {
    return { stop: true, rewind: true };
  }
  parts.push(t);
  return { j: appendUnitsRefIfNext(parts, lines, j) };
}
function shouldBreakAfterParts_(parts, lines, j, t) {
  if (parts.length > 1 && looksLikeUnitsRefLine(t)) return true;
  if (parts.length >= 1) {
    var nxtFlag = cleanEstudio(lines[j + 1] || "");
    if (cleanEstudio(lines[j] || "") && isFlagToken(nxtFlag)) return true;
  }
  return parts.length >= 4;
}
function handleStandardRowToken_(estudio, t, lines, j, parts, currentGroupTitle, flagState) {
  if (isTableHeaderLine(t) || isDepartmentLine(t)) return { stop: true, rewind: true, j };
  if (!parts.length && isFlagToken(t)) {
    if (shouldBreakStandardRowAtFlag_(estudio, lines, j)) return { stop: true, j };
    flagState.flag = t;
    return { j };
  }
  if (t.toUpperCase() === estudio.toUpperCase()) return { j };
  return consumeStandardRowPart_(estudio, t, lines, j, parts, currentGroupTitle);
}
function readRowAt(lines, startIdx, currentGroupTitle) {
  var estudio = cleanEstudio(lines[startIdx]);
  if (isInvalidStandardRowHeader(estudio)) return null;
  var j = startIdx + 1;
  var flagState = { flag: "*" };
  var parts = [];
  while (j < lines.length) {
    var t = cleanEstudio(lines[j]);
    j++;
    if (!t) continue;
    var step = handleStandardRowToken_(estudio, t, lines, j, parts, currentGroupTitle, flagState);
    if (step.stop) {
      if (step.rewind) j--;
      break;
    }
    j = step.j;
    if (shouldBreakAfterParts_(parts, lines, j, t)) break;
  }
  var row = finalizeRow(estudio, flagState.flag, parts);
  if (!row) return null;
  return { row, nextIdx: j };
}

// public/js/labs-some-table-row.mjs
var CULTURE_FIELD_RE = /^(PRODUCTO|TINCION|CALIDAD|ESTADO(\s+DE)?\s+CULTIVO|REPORTE\s+PRELIMINAR|MICROORGANISMO|COMENTARIO:?|CUENTA(\s+DE\s+KASS)?|ANTIBIOGRAMA|IDENTIFICACION)/i;
function isCultureSampleTitleBound(line, nextLines) {
  return isCultureSampleTitle(line, nextLines, CULTURE_FIELD_RE);
}
function cultureBlockEndIdx(lines, startIdx) {
  for (var k = startIdx + 1; k < lines.length; k++) {
    var t = cleanEstudio(lines[k]);
    if (!t || isFlagToken(t)) continue;
    if (isDepartmentLine(t) || isTableHeaderLine(t)) return k;
    if (k > startIdx + 1 && isCultureSampleTitleBound(t, lines.slice(k + 1, k + 9))) return k;
  }
  return lines.length;
}
function readCultureSomeRowAtBound(lines, startIdx, endIdx) {
  return readCultureSomeRowAt(lines, startIdx, endIdx, CULTURE_FIELD_RE, isCultureSampleTitleBound);
}
function parseBacteriologiaCultureGroup(lines, startIdx) {
  var title = cleanEstudio(lines[startIdx]);
  var endIdx = cultureBlockEndIdx(lines, startIdx);
  var rows = [];
  var i = startIdx + 1;
  while (i < endIdx) {
    var parsed = readCultureSomeRowAtBound(lines, i, endIdx);
    if (!parsed) {
      i++;
      continue;
    }
    rows.push(parsed.row);
    i = parsed.nextIdx;
  }
  return { title, rows, nextIdx: endIdx };
}
function isCultureGroupTitle(title) {
  var t = cleanEstudio(title);
  if (!t) return false;
  return isCultureSampleTitleBound(t, ["PRODUCTO"]);
}

// public/js/labs-some-table-normalize.mjs
function normalizeSomeGroup(group) {
  if (!group) return group;
  if (group._someNormalized) return group;
  var isCito = group.tableVariant === "cito" || isCitoGroupTitle(group.title);
  var fluidSource = group.fluidSource || "";
  var rows = [];
  group.rows.forEach(function(r) {
    if (/^COMENTARIO$/i.test(r.estudio)) {
      fluidSource = String(r.resultado || "").trim() || fluidSource;
      return;
    }
    if (/^TIPO\s+DE\s+MUESTRA$/i.test(r.estudio)) return;
    if (isCitoGroupTitle(r.resultado) || isCitoGroupTitle(r.estudio)) return;
    if (isSectionDividerRow(r)) return;
    rows.push(r);
  });
  if (isCito) {
    var extracted = extractFluidSourceFromRows(rows);
    rows = extracted.rows;
    fluidSource = fluidSource || extracted.fluid || "";
  }
  group.rows = isCultureGroupTitle(group.title) ? pruneSomeCultureRows(rows) : pruneSomeRows(rows);
  group.fluidSource = fluidSource;
  group.tableVariant = isCito ? "cito" : "standard";
  group._someNormalized = true;
  return group;
}
function flattenDeptGroupsSimple(dept) {
  var rows = [];
  dept.groups.forEach(function(g) {
    rows = rows.concat(g.rows);
  });
  dept.groups = rows.length ? [{ title: "", rows, tableVariant: "standard" }] : [];
}
function extractFluidSourceFromRows(rows) {
  var fluid = "";
  var kept = [];
  rows.forEach(function(r) {
    if (/^COMENTARIO$/i.test(r.estudio)) {
      fluid = String(r.resultado || "").trim() || fluid;
      return;
    }
    if (/^LIQUIDO\s+DE\s+/i.test(r.estudio) || /^CITOQUIMICO\s+DE\s*$/i.test(r.estudio)) {
      if (!fluid && r.resultado) fluid = r.resultado;
      if (/^LIQUIDO\s+DE\s+/i.test(r.estudio) && !r.resultado) fluid = r.estudio;
      return;
    }
    if (!isSectionDividerRow(r)) kept.push(r);
  });
  return { fluid, rows: kept };
}
function flattenQuimicaClinica(dept) {
  var normalRows = [];
  var citoGroups = [];
  dept.groups.forEach(function(g) {
    if (isCitoGroupTitle(g.title) || g.tableVariant === "cito") {
      var extracted = extractFluidSourceFromRows(g.rows);
      g.rows = extracted.rows;
      g.fluidSource = g.fluidSource || extracted.fluid || "";
      normalizeSomeGroup(g);
      if (g.rows.length) citoGroups.push(g);
    } else {
      g.rows.forEach(function(r) {
        if (!isSectionDividerRow(r)) normalRows.push(r);
      });
    }
  });
  var out = [];
  if (normalRows.length) {
    out.push({ title: "", rows: normalRows, tableVariant: "standard" });
  }
  citoGroups.forEach(function(g) {
    out.push(g);
  });
  dept.groups = out;
}
function flattenDeptGroups(dept) {
  var key = normalizeDeptKey(dept.key);
  if (key === "QUIMICA CLINICA") {
    flattenQuimicaClinica(dept);
    return;
  }
  flattenDeptGroupsSimple(dept);
}

// public/js/labs-some-table-parse.mjs
function parseSomeReportTables(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") {
    return { departments: [] };
  }
  var lines = textoBruto.replace(/\r/g, "").split("\n");
  var state = {
    departments: [],
    currentDept: null,
    currentGroup: null,
    skipSection: false
  };
  function ensureDept(key) {
    if (state.currentDept && state.currentDept.key === key) return state.currentDept;
    state.currentDept = { key, label: key, groups: [] };
    state.departments.push(state.currentDept);
    state.currentGroup = null;
    return state.currentDept;
  }
  function ensureGroup(title) {
    if (!state.currentDept) return null;
    var t = title || "";
    if (state.currentGroup && state.currentGroup.title === t) return state.currentGroup;
    state.currentGroup = {
      title: t,
      rows: [],
      tableVariant: isCitoGroupTitle(t) ? "cito" : "standard",
      fluidSource: ""
    };
    state.currentDept.groups.push(state.currentGroup);
    return state.currentGroup;
  }
  var h = {
    cleanEstudio,
    isMetadataLine,
    isDepartmentLine,
    departmentKey,
    isTableHeaderLine,
    normalizeDeptKey,
    isCultureSampleTitle: isCultureSampleTitleBound,
    parseBacteriologiaCultureGroup,
    isSectionDividerRow,
    isSectionDividerEstudio,
    skipSectionDividerBlock,
    isFlagToken,
    isCitoGroupTitle,
    CITO_GROUP_RE,
    isSkippedGroupTitle,
    isCommentNoiseEstudio,
    readRowAt,
    isLikelyGroupTitle,
    FLATTEN_DEPT_KEYS,
    isStudyRowHeader,
    isSerumQcAnalyte,
    ensureDept,
    ensureGroup,
    normalizeSomeGroup,
    flattenDeptGroups,
    stripCommentNoiseFromDepartment
  };
  for (var i = 0; i < lines.length; i++) {
    var trimmed = cleanEstudio(lines[i]);
    if (!trimmed || isMetadataLine(trimmed)) continue;
    var nextI = dispatchSomeParseLine(state, lines, i, trimmed, h);
    if (nextI != null) i = nextI;
  }
  return { departments: finalizeSomeDepartments(state.departments, h) };
}

// public/js/tend-export-helpers.mjs
var THEMES = {
  default: {
    labelHeader: "Analito",
    fontSize: 11,
    rowH: 22,
    headerH: 26,
    cellPad: 8,
    labelMin: 100,
    labelMax: 220,
    colMin: 56,
    colMax: 120,
    titleAlign: "left",
    titleSize: 10,
    zebra: false,
    outerRadius: 0
  },
  some: {
    labelHeader: "Estudio",
    fontSize: 12,
    rowH: 26,
    headerH: 28,
    cellPad: 10,
    labelMin: 140,
    labelMax: 520,
    colMin: [140, 110],
    colMax: [320, 360],
    titleAlign: "center",
    titleSize: 13,
    zebra: true,
    outerRadius: 8
  },
  "some-cito": {
    labelHeader: "Estudio",
    fontSize: 12,
    rowH: 26,
    headerH: 28,
    cellPad: 10,
    labelMin: 140,
    labelMax: 520,
    colMin: [200],
    colMax: [420],
    titleAlign: "center",
    titleSize: 13,
    zebra: true,
    outerRadius: 8
  }
};
function isSomeCitoColumns(columns) {
  return columns && columns.length === 1 && /resultado/i.test(String(columns[0].header || ""));
}
function isSomeStandardColumns(columns) {
  return columns && columns.length === 2 && /resultado/i.test(String(columns[0].header || "")) && /referencia/i.test(String(columns[1].header || ""));
}
function resolveTableTheme(model) {
  if (model?.theme && THEMES[model.theme]) return THEMES[model.theme];
  const columns = model?.columns;
  if (isSomeCitoColumns(columns)) return THEMES["some-cito"];
  if (isSomeStandardColumns(columns)) return THEMES.some;
  return THEMES.default;
}
function isSomeTheme(theme) {
  return theme === THEMES.some || theme === THEMES["some-cito"];
}
function measureTextWidth(ctx, text, font) {
  ctx.font = font;
  return ctx.measureText(String(text || "")).width;
}
function truncateToWidth(ctx, text, maxW, font) {
  var t = String(text == null ? "" : text);
  if (measureTextWidth(ctx, t, font) <= maxW) return t;
  var ell = "\u2026";
  while (t.length > 1 && measureTextWidth(ctx, t + ell, font) > maxW) {
    t = t.slice(0, -1);
  }
  return t + ell;
}
function fitCellText(ctx, text, maxW, font) {
  var t = String(text == null ? "" : text);
  if (measureTextWidth(ctx, t, font) <= maxW) return t;
  return truncateToWidth(ctx, t, maxW, font);
}
function drawRoundRect(ctx, x, y, w, h, r) {
  var radius = Math.min(r, w / 2, h / 2);
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
function cellDisplayText(cell, theme) {
  if (!cell) return "\u2014";
  var text = cell.text != null ? String(cell.text) : "";
  if (!text) text = "\u2014";
  if (isSomeTheme(theme) && cell.flag && cell.flag !== "*" && text !== "\u2014") {
    return String(cell.flag).toUpperCase() + " " + text;
  }
  return text;
}
function colWidthLimits(theme, colIndex) {
  if (theme.colMin && Array.isArray(theme.colMin)) {
    return {
      min: theme.colMin[colIndex] || theme.colMin[0] || 56,
      max: theme.colMax && theme.colMax[colIndex] || theme.colMax[0] || 160
    };
  }
  return { min: theme.colMin, max: theme.colMax };
}
function measureCellContentWidth(ctx, cell, theme, font, fontBold) {
  if (!cell) return measureTextWidth(ctx, "\u2014", font);
  var text = cell.text != null ? String(cell.text) : "\u2014";
  if (!text) text = "\u2014";
  if (isSomeTheme(theme) && cell.flag && cell.flag !== "*" && text !== "\u2014") {
    var flagFont = "700 " + theme.fontSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
    var valueFont = cell.abnormal ? fontBold : font;
    return measureTextWidth(ctx, String(cell.flag).toUpperCase() + " ", flagFont) + measureTextWidth(ctx, text, valueFont);
  }
  var useFont = cell.abnormal ? fontBold : font;
  return measureTextWidth(ctx, cellDisplayText(cell, theme), useFont);
}
function fallbackCopyText(text) {
  try {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
function writePngToClipboardOrDownload(pngBlob, title, done) {
  if (navigator.clipboard && window.ClipboardItem) {
    navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]).then(function() {
      done(true);
    }).catch(function() {
      downloadPngBlob(pngBlob, title);
      done(true);
    });
    return;
  }
  downloadPngBlob(pngBlob, title);
  done(true);
}
function downloadPngBlob(pngBlob, title) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(pngBlob);
  a.download = String(title || "tabla").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").toLowerCase() + ".png";
  a.click();
  setTimeout(function() {
    URL.revokeObjectURL(a.href);
  }, 500);
}

// public/js/tend-export-render.mjs
function buildTableFonts(theme, isSome) {
  var font = theme.fontSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
  return {
    font,
    fontBold: "600 " + font,
    fontLabel: "600 " + font,
    fontTitle: (isSome ? "600 " : "bold ") + theme.titleSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',
    fontHeader: "700 " + (isSome ? "10" : "11") + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif'
  };
}
function measureLabelColumnWidth(probe, theme, labelHeader, visibleRows, fonts) {
  var labelColW = Math.max(
    theme.labelMin,
    measureTextWidth(probe, labelHeader, fonts.fontHeader) + theme.cellPad * 2
  );
  visibleRows.forEach(function(row) {
    labelColW = Math.max(
      labelColW,
      measureTextWidth(probe, row.label || "", fonts.fontLabel) + theme.cellPad * 2
    );
  });
  if (theme.labelMax > 0) labelColW = Math.min(labelColW, theme.labelMax);
  return labelColW;
}
function measureDataColumnWidths(probe, model, theme, visibleCols, visibleRows, fonts, isSome) {
  return visibleCols.map(function(col, ci) {
    var limits = colWidthLimits(theme, ci);
    var hdr = col.header || "";
    var w = measureTextWidth(probe, hdr, fonts.fontHeader) + theme.cellPad * 2;
    if (isSome) {
      w = Math.max(w, measureTextWidth(probe, hdr.toUpperCase(), fonts.fontHeader) + theme.cellPad * 2);
    }
    visibleRows.forEach(function(row) {
      var cell = row.cells[model.columns.indexOf(col)];
      if (!cell) return;
      w = Math.max(
        w,
        measureCellContentWidth(probe, cell, theme, fonts.font, fonts.fontBold) + theme.cellPad * 2
      );
    });
    return Math.min(Math.max(w, limits.min), limits.max);
  });
}
function buildTablePngLayout(model) {
  var visibleCols = model.columns.filter(function(c) {
    return !c.hidden;
  });
  var visibleRows = model.rows.filter(function(r) {
    return !r.hidden;
  });
  if (!visibleCols.length || !visibleRows.length) return null;
  var theme = resolveTableTheme(model);
  var isSome = isSomeTheme(theme);
  var fonts = buildTableFonts(theme, isSome);
  var labelHeader = model.labelHeader || theme.labelHeader;
  var probe = document.createElement("canvas").getContext("2d");
  var labelColW = measureLabelColumnWidth(probe, theme, labelHeader, visibleRows, fonts);
  var colWidths = measureDataColumnWidths(probe, model, theme, visibleCols, visibleRows, fonts, isSome);
  var tableW = labelColW + colWidths.reduce(function(a, b) {
    return a + b;
  }, 0);
  var tableH = theme.headerH + visibleRows.length * theme.rowH;
  var margin = isSome ? 16 : 12;
  var titleH = isSome ? 36 : 22;
  var framePad = theme.outerRadius > 0 ? 1 : 0;
  return {
    model,
    theme,
    isSome,
    fonts,
    labelHeader,
    visibleCols,
    visibleRows,
    labelColW,
    colWidths,
    tableW,
    tableH,
    margin,
    titleH,
    framePad,
    scale: 2,
    canvasW: tableW + margin * 2 + framePad * 2,
    canvasH: tableH + titleH + margin * 2 + framePad * 2
  };
}
function drawTableTitle(ctx, layout, title) {
  var theme = layout.theme;
  var isSome = layout.isSome;
  var ox = layout.margin + layout.framePad;
  var oy = layout.margin + layout.framePad;
  var titleText = String(title || "Tabla").trim();
  if (theme.outerRadius > 0) {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    drawRoundRect(ctx, ox - 1, oy - 1, layout.tableW + 2, layout.tableH + layout.titleH + 2, theme.outerRadius + 1);
    ctx.stroke();
  }
  ctx.save();
  ctx.font = layout.fonts.fontTitle;
  ctx.fillStyle = isSome ? "#334155" : "#9ca3af";
  ctx.textAlign = theme.titleAlign;
  ctx.textBaseline = "top";
  var titleX = theme.titleAlign === "center" ? ox + layout.tableW / 2 : ox;
  var titleY = oy + (isSome ? 10 : 0);
  ctx.fillText(titleText, titleX, titleY);
  if (isSome && titleText) {
    var titleW = measureTextWidth(ctx, titleText, layout.fonts.fontTitle);
    var underlineY = titleY + theme.titleSize + 4;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(titleX - titleW / 2, underlineY);
    ctx.lineTo(titleX + titleW / 2, underlineY);
    ctx.stroke();
  }
  ctx.restore();
  return { tableOx: ox, tableOy: oy + layout.titleH };
}
function fillCell(ctx, x, y, w, h, fill) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
}
function strokeCell(ctx, x, y, w, h) {
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function drawSomeFlagCell(ctx, cell, theme, colWidth, rowY, rowH, cellPad, font, fontBold, cx) {
  var flag = String(cell.flag).toUpperCase();
  var valuePart = cell.text != null ? String(cell.text) : "\u2014";
  var flagFont = "700 " + theme.fontSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
  ctx.font = flagFont;
  ctx.fillStyle = "#dc2626";
  var flagLabel = flag + " ";
  var flagW = measureTextWidth(ctx, flagLabel, flagFont);
  ctx.fillText(flagLabel, cx + cellPad, rowY + rowH / 2);
  ctx.font = cell.abnormal ? fontBold : font;
  ctx.fillStyle = cell.abnormal ? "#dc2626" : "#0f172a";
  ctx.fillText(
    fitCellText(ctx, valuePart, colWidth - cellPad * 2 - flagW, ctx.font),
    cx + cellPad + flagW,
    rowY + rowH / 2
  );
}
function drawBodyCell(ctx, layout, row, rowIndex, colIndex, visibleCol, cx, ry) {
  var theme = layout.theme;
  var isSome = layout.isSome;
  var colIdx = layout.model.columns.indexOf(visibleCol);
  var cell = row.cells[colIdx];
  var abnormal = !!(cell && cell.abnormal);
  var cellText = cellDisplayText(cell, theme);
  var cellFill = abnormal ? "#fef2f2" : theme.zebra && rowIndex % 2 === 1 ? "#f8fafc" : null;
  var colWidth = layout.colWidths[colIndex];
  var rowH = theme.rowH;
  var cellPad = theme.cellPad;
  fillCell(ctx, cx, ry, colWidth, rowH, cellFill);
  strokeCell(ctx, cx, ry, colWidth, rowH);
  if (isSome && cell && cell.flag && cell.flag !== "*" && cellText !== "\u2014") {
    drawSomeFlagCell(ctx, cell, theme, colWidth, ry, rowH, cellPad, layout.fonts.font, layout.fonts.fontBold, cx);
    return;
  }
  ctx.font = abnormal ? layout.fonts.fontBold : layout.fonts.font;
  ctx.fillStyle = abnormal ? "#dc2626" : isSome && colIndex > 0 ? "#64748b" : "#0f172a";
  ctx.fillText(
    fitCellText(ctx, cellText, colWidth - cellPad * 2, ctx.font),
    cx + cellPad,
    ry + rowH / 2
  );
}
function drawTableHeader(ctx, layout, tableOx, tableOy) {
  var theme = layout.theme;
  var isSome = layout.isSome;
  var cellPad = theme.cellPad;
  var headerH = theme.headerH;
  fillCell(ctx, tableOx, tableOy, layout.tableW, headerH, isSome ? "#f1f5f9" : "#f3f4f6");
  ctx.font = layout.fonts.fontHeader;
  ctx.fillStyle = isSome ? "#64748b" : "#6b7280";
  var hx = tableOx;
  strokeCell(ctx, hx, tableOy, layout.labelColW, headerH);
  var headerLabel = isSome ? layout.labelHeader.toUpperCase() : layout.labelHeader;
  ctx.fillText(
    fitCellText(ctx, headerLabel, layout.labelColW - cellPad * 2, layout.fonts.fontHeader),
    hx + cellPad,
    tableOy + headerH / 2
  );
  hx += layout.labelColW;
  for (var ci = 0; ci < layout.visibleCols.length; ci++) {
    strokeCell(ctx, hx, tableOy, layout.colWidths[ci], headerH);
    var hdr = layout.visibleCols[ci].header || "";
    if (isSome) hdr = hdr.toUpperCase();
    ctx.fillText(
      fitCellText(ctx, hdr, layout.colWidths[ci] - cellPad * 2, layout.fonts.fontHeader),
      hx + cellPad,
      tableOy + headerH / 2
    );
    hx += layout.colWidths[ci];
  }
}
function drawTableBody(ctx, layout, tableOx, tableOy) {
  var theme = layout.theme;
  var cellPad = theme.cellPad;
  var rowH = theme.rowH;
  var headerH = theme.headerH;
  for (var ri = 0; ri < layout.visibleRows.length; ri++) {
    var row = layout.visibleRows[ri];
    var ry = tableOy + headerH + ri * rowH;
    var zebraFill = theme.zebra && ri % 2 === 1 ? "#f8fafc" : null;
    var cx = tableOx;
    fillCell(ctx, cx, ry, layout.labelColW, rowH, zebraFill);
    strokeCell(ctx, cx, ry, layout.labelColW, rowH);
    ctx.font = layout.fonts.fontLabel;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(
      fitCellText(ctx, row.label || "", layout.labelColW - cellPad * 2, layout.fonts.fontLabel),
      cx + cellPad,
      ry + rowH / 2
    );
    cx += layout.labelColW;
    for (var cj = 0; cj < layout.visibleCols.length; cj++) {
      drawBodyCell(ctx, layout, row, ri, cj, layout.visibleCols[cj], cx, ry);
      cx += layout.colWidths[cj];
    }
  }
}
function renderTableModelToCanvas(layout, title) {
  var canvas = document.createElement("canvas");
  canvas.width = layout.canvasW * layout.scale;
  canvas.height = layout.canvasH * layout.scale;
  var ctx = canvas.getContext("2d");
  ctx.scale(layout.scale, layout.scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);
  var origin = drawTableTitle(ctx, layout, title);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  drawTableHeader(ctx, layout, origin.tableOx, origin.tableOy);
  drawTableBody(ctx, layout, origin.tableOx, origin.tableOy);
  return canvas;
}
function renderChartWithLegendToCanvas(chart, title, visibleDatasets) {
  var dpr = chart.canvas.width / chart.width;
  var titleH = Math.round(28 * dpr);
  var legendH = Math.round(30 * dpr);
  var pad = Math.round(12 * dpr);
  var canvas = document.createElement("canvas");
  canvas.width = chart.canvas.width + pad * 2;
  canvas.height = chart.canvas.height + titleH + legendH + pad * 2;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "bold " + Math.round(13 * dpr) + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
  ctx.fillStyle = "#334155";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(String(title || ""), pad, pad);
  ctx.drawImage(chart.canvas, pad, pad + titleH);
  var legendFont = Math.round(11 * dpr) + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
  ctx.font = legendFont;
  ctx.textBaseline = "middle";
  var lx = pad;
  var ly = pad + titleH + chart.canvas.height + legendH / 2;
  var swatch = Math.round(10 * dpr);
  var gap = Math.round(6 * dpr);
  (visibleDatasets || []).forEach(function(ds) {
    var color = ds.borderColor || "#10b981";
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly - swatch / 2, swatch, swatch);
    lx += swatch + gap;
    var label = String(ds.label || ds.fieldKey || "");
    ctx.fillStyle = "#111827";
    ctx.fillText(label, lx, ly);
    lx += measureTextWidth(ctx, label, legendFont) + Math.round(18 * dpr);
  });
  return canvas;
}
function copyTableModelAsPng(model, title, onDone, writePng) {
  var done = typeof onDone === "function" ? onDone : function() {
  };
  if (!model || !model.columns || !model.rows) {
    done(false);
    return;
  }
  var layout = buildTablePngLayout(model);
  if (!layout) {
    done(false);
    return;
  }
  var canvas = renderTableModelToCanvas(layout, title);
  canvas.toBlob(function(pngBlob) {
    if (!pngBlob) {
      done(false);
      return;
    }
    writePng(pngBlob, title, done);
  }, "image/png");
}

// public/js/tend-export.mjs
function buildTableTsv(model) {
  if (!model || !model.columns || !model.rows) return "";
  var theme = resolveTableTheme(model);
  var visibleCols = model.columns.filter(function(c) {
    return !c.hidden;
  });
  var labelHeader = model.labelHeader || theme.labelHeader;
  var lines = [];
  lines.push(
    [labelHeader].concat(
      visibleCols.map(function(c) {
        return c.header || "";
      })
    ).join("	")
  );
  model.rows.forEach(function(row) {
    if (row.hidden) return;
    var cells = row.cells.map(function(cell, ci) {
      return { cell, col: model.columns[ci] };
    }).filter(function(x) {
      return x.col && !x.col.hidden;
    }).map(function(x) {
      return x.cell && x.cell.text != null ? String(x.cell.text) : "";
    });
    lines.push([row.label || ""].concat(cells).join("	"));
  });
  return lines.join("\n");
}
function copyTableText(text, onDone) {
  var done = typeof onDone === "function" ? onDone : function() {
  };
  var t = text == null ? "" : String(text);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function() {
      done(true);
    }).catch(function() {
      done(fallbackCopyText(t));
    });
    return;
  }
  done(fallbackCopyText(t));
}
function copyTableModelAsPng2(model, title, onDone) {
  copyTableModelAsPng(model, title, onDone, writePngToClipboardOrDownload);
}
function copyChartPng(chart, title, visibleDatasets, onDone) {
  var done = typeof onDone === "function" ? onDone : function() {
  };
  if (!chart || !chart.canvas) {
    done(false);
    return;
  }
  var canvas = renderChartWithLegendToCanvas(chart, title, visibleDatasets);
  canvas.toBlob(function(blob) {
    if (!blob) {
      done(false);
      return;
    }
    writePngToClipboardOrDownload(blob, title, done);
  }, "image/png");
}

// public/js/labs-some-table-export.mjs
function buildSomeGroupExportModel(group) {
  var g = normalizeSomeGroup(group || { rows: [] });
  var rows = g.rows || [];
  var isCito = g.tableVariant === "cito";
  var columns = [{ header: "Resultado", hidden: false }];
  if (!isCito) {
    columns.push({ header: "Valor de Referencia", hidden: false });
  }
  return {
    theme: isCito ? "some-cito" : "some",
    labelHeader: "Estudio",
    columns,
    rows: rows.map(function(r) {
      var resTxt = formatSomeResultado(r);
      if (r.flag && r.flag !== "*" && resTxt === "\u2014") resTxt = r.flag;
      var cells = [
        {
          text: resTxt,
          abnormal: r.abnormal,
          flag: r.flag
        }
      ];
      if (!isCito) {
        cells.push({ text: r.ref || "", abnormal: false });
      }
      return {
        label: r.estudio,
        hidden: false,
        cells
      };
    })
  };
}
function buildSomeGroupTsv(group, title) {
  var model = buildSomeGroupExportModel(group);
  var tsv = buildTableTsv(model);
  if (!tsv) return "";
  var lines = tsv.split("\n");
  if (lines.length) lines[0] = lines[0].replace(/^Analito\t/, "Estudio	");
  if (title) lines.unshift(String(title));
  return lines.join("\n");
}
function buildSomeDeptTsv(dept, title) {
  var tsv = buildTableTsv(buildSomeDeptExportModel(dept, title));
  if (!tsv) return "";
  var lines = tsv.split("\n");
  if (lines.length) lines[0] = lines[0].replace(/^Analito\t/, "Estudio	");
  if (title) lines.unshift(String(title));
  return lines.join("\n");
}
function buildSomeDeptExportModel(dept, _title) {
  var rows = [];
  (dept.groups || []).forEach(function(group) {
    var g = normalizeSomeGroup(group);
    var isCito = g.tableVariant === "cito";
    (g.rows || []).forEach(function(r) {
      var resTxt = formatSomeResultado(r);
      var cells = [{ text: resTxt, abnormal: r.abnormal, flag: r.flag }];
      if (!isCito) cells.push({ text: r.ref || "", abnormal: false });
      rows.push({ label: r.estudio, cells });
    });
  });
  var hasCitoOnly = dept.groups && dept.groups.length && dept.groups.every(function(g) {
    return normalizeSomeGroup(g).tableVariant === "cito";
  });
  return {
    theme: hasCitoOnly ? "some-cito" : "some",
    labelHeader: "Estudio",
    columns: hasCitoOnly ? [{ header: "Resultado", hidden: false }] : [
      { header: "Resultado", hidden: false },
      { header: "Valor de Referencia", hidden: false }
    ],
    rows
  };
}

// public/js/labs-some-table-render.mjs
function renderSomeTableToolbarHtml(options, exportLabel, deptIndex, groupIndex) {
  if (options.hideToolbar) return "";
  var deptAttr = deptIndex != null ? ' data-dept-index="' + escHtml(String(deptIndex)) + '"' : "";
  var groupAttr = groupIndex != null ? ' data-group-index="' + escHtml(String(groupIndex)) + '"' : "";
  return '<div class="lab-some-table-toolbar"><button type="button" class="lab-some-export-btn" data-export="tsv"' + deptAttr + groupAttr + ' data-label="' + escHtml(exportLabel) + '" title="Copiar tabla como texto"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>TSV</button><button type="button" class="lab-some-export-btn" data-export="png"' + deptAttr + groupAttr + ' data-label="' + escHtml(exportLabel) + '" title="Copiar tabla como imagen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>PNG</button></div>';
}
function renderSomeTableBodyRowsHtml(rows, isCito) {
  var html = "";
  rows.forEach(function(r) {
    var resClass = r.abnormal ? " lab-some-abnormal" : "";
    var rowClass = r.abnormal ? ' class="lab-some-row--abnormal"' : "";
    var flagHtml = r.flag && r.flag !== "*" ? '<span class="lab-some-flag" aria-label="Fuera de rango">' + escHtml(r.flag) + "</span>" : "";
    var resDisplay = formatSomeResultado(r);
    html += "<tr" + rowClass + ">";
    html += '<td class="lab-some-estudio">' + escHtml(r.estudio) + "</td>";
    html += '<td class="lab-some-resultado' + resClass + '" data-unidades="' + escHtml(r.unidades || "") + '" data-ref="' + escHtml(r.ref || "") + '">' + flagHtml + '<span class="lab-some-resultado-val">' + escHtml(resDisplay) + "</span></td>";
    if (!isCito) html += '<td class="lab-some-ref">' + escHtml(r.ref || "") + "</td>";
    html += "</tr>";
  });
  return html;
}
function coalesceGroupsForModal(groups) {
  var list = Array.isArray(groups) ? groups : [];
  var out = [];
  var bucket = null;
  list.forEach(function(group) {
    var g = normalizeSomeGroup(group || { rows: [] });
    if (!(g.rows && g.rows.length)) return;
    if (g.tableVariant === "cito") {
      if (bucket) {
        out.push(bucket);
        bucket = null;
      }
      out.push(g);
      return;
    }
    if (!bucket) {
      bucket = {
        title: "",
        rows: g.rows.slice(),
        tableVariant: "standard"
      };
      return;
    }
    bucket.rows = bucket.rows.concat(g.rows);
  });
  if (bucket) out.push(bucket);
  return out;
}
function renderSomeGroupOpenTag_(options, isCito, tableId, deptIndex, groupIndex) {
  return '<div class="lab-some-group' + (isCito ? " lab-some-group--cito" : "") + '"' + (tableId ? ' data-table-id="' + escHtml(tableId) + '"' : "") + (deptIndex != null ? ' data-dept-index="' + escHtml(String(deptIndex)) + '"' : "") + (groupIndex != null ? ' data-group-index="' + escHtml(String(groupIndex)) + '"' : "") + ' data-variant="' + (isCito ? "cito" : "standard") + '">';
}
function renderSomeGroupHeaderHtml_(g, options, title, isCito) {
  var html = "";
  if (title && !options.hideGroupTitles) {
    html += '<div class="lab-some-group-title">' + escHtml(title) + "</div>";
  }
  if (isCito && g.fluidSource) {
    html += '<div class="lab-some-fluid-source"><span class="lab-some-fluid-label">Origen del l\xEDquido:</span> ' + escHtml(g.fluidSource) + "</div>";
  }
  return html;
}
function renderSomeTableGroupHtml(group, opts) {
  var options = opts || {};
  var g = normalizeSomeGroup(group || { rows: [] });
  var rows = g.rows || [];
  if (!rows.length) return "";
  var isCito = g.tableVariant === "cito";
  var title = g.title ? String(g.title) : "";
  var tableId = options.tableId || "";
  var exportLabel = options.exportLabel || title || "Tabla";
  if (!options.exportLabel && isCito && g.fluidSource) {
    exportLabel = (exportLabel + " \u2014 " + g.fluidSource).trim();
  }
  var deptIndex = options.deptIndex;
  var groupIndex = options.groupIndex;
  var html = renderSomeGroupOpenTag_(options, isCito, tableId, deptIndex, groupIndex);
  html += renderSomeGroupHeaderHtml_(g, options, title, isCito);
  html += renderSomeTableToolbarHtml(options, exportLabel, deptIndex, groupIndex);
  var colCount = isCito ? "2" : "3";
  html += '<div class="lab-some-table-wrap"><table class="lab-some-table lab-some-table--cols-' + colCount + '"><colgroup><col class="lab-some-col-estudio" /><col class="lab-some-col-resultado" />' + (isCito ? "" : '<col class="lab-some-col-ref" />') + '</colgroup><thead><tr><th scope="col">Estudio</th><th scope="col">Resultado</th>' + (isCito ? "" : '<th scope="col">Valor de referencia</th>') + "</tr></thead><tbody>";
  html += renderSomeTableBodyRowsHtml(rows, isCito);
  html += "</tbody></table></div></div>";
  return html;
}
function renderSomeDeptExportActions(deptLabel, deptIndex) {
  var label = escHtml(deptLabel);
  return '<span class="lab-some-dept-summary-actions" onclick="event.stopPropagation()"><button type="button" class="lab-some-export-btn lab-some-dept-export-btn" data-export="tsv" data-dept-index="' + deptIndex + '" data-label="' + label + '" title="Copiar secci\xF3n como texto">TSV</button><button type="button" class="lab-some-export-btn lab-some-dept-export-btn" data-export="png" data-dept-index="' + deptIndex + '" data-label="' + label + '" title="Copiar secci\xF3n como imagen">PNG</button></span>';
}
function renderSomeReportTablesHtml(parsed, opts) {
  var options = opts || {};
  if (!parsed || !parsed.departments || !parsed.departments.length) return "";
  var modalLayout = !!options.modalLayout;
  var html = '<div class="lab-some-tables' + (modalLayout ? " lab-some-tables--modal" : "") + '">';
  parsed.departments.forEach(function(dept, di) {
    html += '<section class="lab-some-dept" data-dept="' + escHtml(dept.key) + '" data-dept-index="' + di + '">';
    if (modalLayout) {
      html += '<details class="lab-some-dept-details" open><summary class="lab-some-dept-summary"><span class="lab-some-dept-summary-label">' + escHtml(dept.label) + "</span>" + renderSomeDeptExportActions(dept.label, di) + '</summary><div class="lab-some-dept-body">';
    } else {
      html += '<header class="lab-some-dept-header">' + escHtml(dept.label) + "</header>";
    }
    var groups = modalLayout ? coalesceGroupsForModal(dept.groups) : dept.groups;
    groups.forEach(function(group, gi) {
      var tableId = "some-" + di + "-" + gi;
      var g = normalizeSomeGroup(group);
      var exportLabel = (dept.label + (g.title ? " \u2014 " + g.title : "")).trim();
      if (g.tableVariant === "cito" && g.fluidSource) {
        exportLabel += " \u2014 " + g.fluidSource;
      }
      html += renderSomeTableGroupHtml(g, {
        tableId,
        exportLabel,
        hideGroupTitles: !!options.hideGroupTitles,
        hideToolbar: modalLayout,
        deptIndex: di,
        groupIndex: gi
      });
    });
    html += modalLayout ? "</div></details>" : "";
    html += "</section>";
  });
  html += "</div>";
  return html;
}

// public/js/labs-some-table-wire.mjs
function exportSomeGroupCopy(group, format, title, onDone) {
  var done = typeof onDone === "function" ? onDone : function() {
  };
  var model = buildSomeGroupExportModel(group);
  if (format === "png") {
    copyTableModelAsPng2(model, title || "Tabla SOME", done);
    return;
  }
  copyTableText(buildSomeGroupTsv(group, title || ""), done);
}
function exportSomeDeptCopy(dept, format, title, onDone) {
  var done = typeof onDone === "function" ? onDone : function() {
  };
  if (!dept) {
    done(false);
    return;
  }
  var label = title || dept.label || "Tabla";
  if (format === "png") {
    copyTableModelAsPng2(buildSomeDeptExportModel(dept, label), label, done);
    return;
  }
  copyTableText(buildSomeDeptTsv(dept, label), done);
}
function resolveSomeExportLookup(lookup) {
  if (typeof lookup === "function") {
    return { getDept: lookup, getGroup: null };
  }
  if (lookup && typeof lookup === "object") {
    return {
      getDept: typeof lookup.getDept === "function" ? lookup.getDept : null,
      getGroup: typeof lookup.getGroup === "function" ? lookup.getGroup : null
    };
  }
  return { getDept: null, getGroup: null };
}
function readSomeExportIndices(btn, groupEl) {
  var di = parseInt(btn.getAttribute("data-dept-index") || "", 10);
  var gi = parseInt(btn.getAttribute("data-group-index") || "", 10);
  if ((!Number.isFinite(di) || !Number.isFinite(gi)) && groupEl) {
    di = parseInt(groupEl.getAttribute("data-dept-index") || "", 10);
    gi = parseInt(groupEl.getAttribute("data-group-index") || "", 10);
  }
  return { deptIndex: di, groupIndex: gi };
}
function wireSomeTableExportButtons(container, onToast, lookup) {
  if (!container) return;
  var resolved = resolveSomeExportLookup(lookup);
  container.querySelectorAll(".lab-some-export-btn").forEach(function(btn) {
    if (btn.dataset.someWired === "1") return;
    btn.dataset.someWired = "1";
    btn.addEventListener("click", function() {
      var format = btn.getAttribute("data-export");
      var label = btn.getAttribute("data-label") || "";
      if (btn.classList.contains("lab-some-dept-export-btn") && resolved.getDept) {
        var deptIndex = parseInt(btn.getAttribute("data-dept-index") || "", 10);
        var dept = resolved.getDept(deptIndex);
        exportSomeDeptCopy(dept, format, label || dept && dept.label || "", function(ok) {
          if (typeof onToast === "function") {
            onToast(
              ok ? "Secci\xF3n copiada \u2713" : "No se pudo copiar la secci\xF3n",
              ok ? "success" : "error"
            );
          }
        });
        return;
      }
      if (!resolved.getGroup) return;
      var groupEl = btn.closest(".lab-some-group");
      var indices = readSomeExportIndices(btn, groupEl);
      if (!Number.isFinite(indices.deptIndex) || !Number.isFinite(indices.groupIndex)) return;
      var group = resolved.getGroup(indices.deptIndex, indices.groupIndex);
      if (!group) return;
      exportSomeGroupCopy(group, format, label, function(ok) {
        if (typeof onToast === "function") {
          onToast(
            ok ? "Tabla copiada \u2713" : "No se pudo copiar la tabla",
            ok ? "success" : "error"
          );
        }
      });
    });
  });
}

// public/js/labs-some-table.mjs
function uniqueSourceTexts(sources) {
  const unique = [];
  (Array.isArray(sources) ? sources : [sources]).forEach((s) => {
    const t = String(s || "").trim();
    if (t && unique.indexOf(t) < 0) unique.push(t);
  });
  return unique;
}
function parsedIfDepartments(parsed) {
  if (parsed && parsed.departments && parsed.departments.length) return parsed;
  return null;
}
function parseSomeTablesFromSources(sources) {
  const unique = uniqueSourceTexts(sources);
  let i;
  for (i = 0; i < unique.length; i++) {
    if (!looksLikeSomeLabReport(unique[i])) continue;
    const hit = parsedIfDepartments(parseSomeReportTables(unique[i]));
    if (hit) return hit;
  }
  const someOnly = unique.filter(looksLikeSomeLabReport);
  if (someOnly.length < 2) return null;
  return parsedIfDepartments(parseSomeReportTables(someOnly.join("\n\n---\n\n")));
}

// public/js/features/lab-some-tables-modal.mjs
var rt2 = {
  showToast() {
  },
  getParsed() {
    return null;
  },
  syncLabCopyFab() {
  },
  syncLabOutputChrome() {
  }
};
function registerLabSomeTablesModalRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt2, ctx);
}
function syncLabSomeTablesBtn(show) {
  var btn = document.getElementById("lab-some-tables-btn");
  if (!btn) return;
  var visible = !!show;
  if (visible) {
    btn.removeAttribute("hidden");
    btn.setAttribute("aria-hidden", "false");
  } else {
    btn.setAttribute("hidden", "");
    btn.setAttribute("aria-hidden", "true");
  }
}
function openLabSomeTablesModal() {
  var parsed = rt2.getParsed();
  if (!parsed || !parsed.departments || !parsed.departments.length) {
    rt2.showToast("No hay tablas SOME para este d\xEDa", "info");
    return;
  }
  var backdrop = document.getElementById("lab-some-tables-backdrop");
  var body = document.getElementById("lab-some-tables-modal-body");
  if (!backdrop || !body) return;
  body.innerHTML = renderSomeReportTablesHtml(parsed, {
    hideGroupTitles: true,
    modalLayout: true
  });
  wireSomeTableExportButtons(body, function(msg, kind) {
    rt2.showToast(msg, kind);
  }, {
    getDept: function(deptIndex) {
      return parsed.departments && parsed.departments[deptIndex] ? parsed.departments[deptIndex] : null;
    },
    getGroup: function(deptIndex, groupIndex) {
      var dept = parsed.departments && parsed.departments[deptIndex];
      return dept && dept.groups ? dept.groups[groupIndex] : null;
    }
  });
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("lab-some-tables-modal-open");
  rt2.syncLabCopyFab(false);
}
function closeLabSomeTablesModal() {
  var backdrop = document.getElementById("lab-some-tables-backdrop");
  var body = document.getElementById("lab-some-tables-modal-body");
  if (!backdrop) return;
  var wasOpen = backdrop.classList.contains("open");
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("lab-some-tables-modal-open");
  if (body) body.innerHTML = "";
  if (wasOpen) rt2.syncLabOutputChrome();
}

// public/js/features/lab-paste-modal.mjs
var BACKDROP_ID = "lab-paste-modal-backdrop";
function backdropEl() {
  return document.getElementById(BACKDROP_ID);
}
function openLabPasteModal() {
  var backdrop = backdropEl();
  if (!backdrop) return;
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  var ta = document.getElementById("lab-input");
  if (ta && typeof ta.focus === "function") {
    setTimeout(function() {
      ta.focus();
    }, 0);
  }
}
function closeLabPasteModal() {
  var backdrop = backdropEl();
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
}

// public/js/lab-consolidation-plan.mjs
function labDayTipoGroupKey(dayKey, tipo) {
  return String(dayKey || "") + "" + labConsolidationFamily(tipo);
}
function splitLabDayTipoGroupKey(gk) {
  var parts = String(gk || "").split("");
  var family = parts[1] || "labwork";
  return {
    dayKey: parts[0] || "",
    tipo: family === "labwork" ? "labs" : family,
    family
  };
}
function defaultIsGasoOnly(getTipo) {
  return function(set) {
    return getTipo(set) === "gaso";
  };
}
function groupSetsByDayFamily(sets, getDayKey, getTipo) {
  var groups = /* @__PURE__ */ Object.create(null);
  (sets || []).forEach(function(set) {
    var tipo = getTipo(set);
    if (tipo === "mixed") return;
    var dk = getDayKey(set);
    if (!dk || dk === "unknown" || dk === "Anterior") return;
    var gk = labDayTipoGroupKey(dk, tipo);
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(set);
  });
  return groups;
}
function sameDateTimeGasoFingerprintOk(group, gasoFn) {
  if (!group.every(gasoFn)) return true;
  var fps = /* @__PURE__ */ Object.create(null);
  group.forEach(function(s) {
    var fp = gasometriaFingerprintFromResLabs(s.resLabs || []);
    if (fp) fps[fp] = true;
  });
  return Object.keys(fps).length <= 1;
}
function sameDateTimeJobForSet(sets, set, getTipo, gasoFn, seen) {
  if (!set || set.id == null) return null;
  var tipo = getTipo(set);
  if (tipo === "mixed" || labConsolidationFamily(tipo) !== "labwork") return null;
  var fecha = String(set.fecha || "").trim();
  var hora = String(set.hora || "").trim();
  if (!fecha || !hora || fecha === "Anterior") return null;
  var group = findLabSetsByDateTime(sets, fecha, hora).filter(function(s) {
    var t = getTipo(s);
    return t !== "mixed" && labConsolidationFamily(t) === "labwork";
  });
  if (group.length < 2) return null;
  var key = String(group[0].fecha || "").trim() + "" + String(group[0].hora || "").trim().slice(0, 5);
  if (seen[key]) return null;
  seen[key] = true;
  if (!sameDateTimeGasoFingerprintOk(group, gasoFn)) return null;
  return {
    groupKey: "dt:" + key,
    kind: "same-datetime",
    sets: group.slice()
  };
}
function buildSameDateTimeLabMergeJobs(sets, getTipo, isGasoOnly) {
  var gasoFn = typeof isGasoOnly === "function" ? isGasoOnly : function(set) {
    return getTipo(set) === "gaso";
  };
  var seen = /* @__PURE__ */ Object.create(null);
  var jobs = [];
  (sets || []).forEach(function(set) {
    var job = sameDateTimeJobForSet(sets, set, getTipo, gasoFn, seen);
    if (job) jobs.push(job);
  });
  return jobs;
}
function buildLabConsolidationMergeJobs(sets, getDayKey, getTipo, getMs, outlierGroupKeys, isGasoOnly, windowMs) {
  var gasoFn = typeof isGasoOnly === "function" ? isGasoOnly : defaultIsGasoOnly(getTipo);
  var outlierSet = outlierGroupKeys instanceof Set ? outlierGroupKeys : outlierGroupKeys ? new Set(outlierGroupKeys) : /* @__PURE__ */ new Set();
  var groups = groupSetsByDayFamily(sets, getDayKey, getTipo);
  var jobs = [];
  Object.keys(groups).forEach(function(gk) {
    var arr = groups[gk];
    if (arr.length < 2) return;
    var split = splitLabDayTipoGroupKey(gk);
    if (outlierSet.has(gk)) {
      if (split.family === "labwork") {
        clusterLabworkByTimeWindow(arr, getMs, gasoFn, LAB_CONSOLIDATION_UNBOUNDED_WINDOW_MS).forEach(function(cluster) {
          if (cluster.length >= 2) {
            jobs.push({ groupKey: gk, kind: "outlier", sets: cluster.slice() });
          }
        });
      } else {
        jobs.push({ groupKey: gk, kind: "outlier", sets: arr.slice() });
      }
      return;
    }
    clusterLabConsolidationGroup(arr, getMs, getTipo, gasoFn, windowMs).forEach(function(cluster) {
      if (cluster.length >= 2) {
        jobs.push({ groupKey: gk, kind: "auto", sets: cluster.slice() });
      }
    });
  });
  return jobs;
}
function labSetSectionSummary(resLabs) {
  var seen = /* @__PURE__ */ Object.create(null);
  var keys = [];
  (resLabs || []).forEach(function(row) {
    var s = String(row || "").trim();
    if (!s) return;
    var m = s.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
    if (!m) return;
    var k = m[1].toUpperCase();
    if (seen[k]) return;
    seen[k] = true;
    keys.push(k);
  });
  return keys.join(" \xB7 ");
}
function listLabConsolidationCandidates(sets, getDayKey, getTipo) {
  return (sets || []).filter(function(set) {
    if (!set || set.id == null) return false;
    var tipo = getTipo(set);
    if (tipo === "mixed") return false;
    var dk = getDayKey(set);
    return !!(dk && dk !== "unknown" && dk !== "Anterior");
  });
}
function validateManualConsolidationGroup(setIds, setsById, getDayKey, getTipo) {
  var ids = (setIds || []).map(String).filter(Boolean);
  if (ids.length < 2) return { ok: false, error: "Selecciona al menos 2 conjuntos" };
  var dayKey = "";
  var family = "";
  for (var i = 0; i < ids.length; i++) {
    var set = setsById[ids[i]];
    if (!set) return { ok: false, error: "Conjunto no encontrado" };
    var tipo = getTipo(set);
    if (tipo === "mixed") return { ok: false, error: "No se pueden fusionar conjuntos mixtos" };
    var dk = getDayKey(set);
    if (!dk || dk === "unknown" || dk === "Anterior") {
      return { ok: false, error: "Solo conjuntos con fecha conocida" };
    }
    var fam = labConsolidationFamily(tipo);
    if (!dayKey) {
      dayKey = dk;
      family = fam;
      continue;
    }
    if (dk !== dayKey) return { ok: false, error: "Los conjuntos del grupo deben ser del mismo d\xEDa" };
    if (fam !== family) {
      return { ok: false, error: "No mezcles laboratorio con cultivos en el mismo grupo" };
    }
  }
  return { ok: true, dayKey, family };
}
function buildManualLabConsolidationJobs(groups, setsById) {
  var jobs = [];
  var used = /* @__PURE__ */ Object.create(null);
  (groups || []).forEach(function(ids) {
    var arr = [];
    (ids || []).forEach(function(id) {
      var sid = String(id);
      if (used[sid]) return;
      var set = setsById[sid];
      if (!set) return;
      arr.push(set);
    });
    if (arr.length < 2) return;
    arr.forEach(function(set) {
      used[String(set.id)] = true;
    });
    jobs.push({ groupKey: "manual", kind: "manual", sets: arr });
  });
  return jobs;
}

// public/js/features/lab-panel-history-consolidate-refresh.mjs
function toastConsolidateResult_(deps, patientId, mergedCount) {
  var show = deps && deps.showToast;
  if (typeof show !== "function") return;
  if (mergedCount > 0) {
    if (typeof deps.addAuditEntry === "function") {
      deps.addAuditEntry("lab-history-consolidate", "ok", mergedCount, String(patientId));
    }
    show("Fusionados " + mergedCount + " conjunto(s) \u2713", "success");
    return;
  }
  show("No hab\xEDa conjuntos para fusionar con la selecci\xF3n actual", "success");
}
function runLabConsolidateUiRefresh(deps, patientId, mergedCount, opts) {
  var d = deps || {};
  if (typeof d.persistClinicalState === "function") d.persistClinicalState({ immediate: true });
  var preferSetId = opts && opts.preferSetId != null ? String(opts.preferSetId) : "";
  if (patientId && preferSetId && typeof d.setLabHistorySelectedSetId === "function") {
    d.setLabHistorySelectedSetId(patientId, preferSetId);
  }
  if (typeof d.setActiveLab === "function") d.setActiveLab(null);
  if (typeof d.renderLabHistoryPanel === "function") d.renderLabHistoryPanel();
  if (typeof d.refreshTendenciasOrCultivosPanel === "function") d.refreshTendenciasOrCultivosPanel();
  if (typeof d.syncEstudiosTextarea === "function") d.syncEstudiosTextarea(patientId);
  toastConsolidateResult_(d, patientId, mergedCount);
}
function preferKeeperSetIdFromConsolidateResult(result) {
  if (!result || !result.keeperIds || !result.keeperIds.length) return "";
  return String(result.keeperIds[0]);
}

// public/js/features/lab-panel-history-consolidate-modal.mjs
function tipoLabel(tipo) {
  if (tipo === "cultivo") return "Cultivo";
  if (tipo === "gaso") return "Gasometr\xEDa";
  return "Labs";
}
function groupSetsByDay(candidates) {
  var byDay = /* @__PURE__ */ Object.create(null);
  (candidates || []).forEach(function(c) {
    var dk = c.dayKey || "unknown";
    if (!byDay[dk]) byDay[dk] = [];
    byDay[dk].push(c);
  });
  return Object.keys(byDay).sort(function(a, b) {
    return String(b).localeCompare(String(a));
  }).map(function(dk) {
    return { dayKey: dk, dayLabel: byDay[dk][0].dayLabel || dk, sets: byDay[dk] };
  });
}
function assignedSetIds(groups) {
  var used = /* @__PURE__ */ Object.create(null);
  (groups || []).forEach(function(g) {
    (g.setIds || []).forEach(function(id) {
      used[String(id)] = true;
    });
  });
  return used;
}
function renderSetRow(c, used) {
  var sid = String(c.id);
  var taken = !!used[sid];
  return '<label class="lab-consolidate-set-row' + (taken ? " lab-consolidate-set-row--taken" : "") + '" style="display:flex;gap:10px;align-items:flex-start;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:' + (taken ? "default" : "pointer") + ";background:var(--surface);opacity:" + (taken ? "0.55" : "1") + ';"><input type="checkbox" class="lab-consolidate-set-cb" data-sid="' + esc(sid) + '"' + (taken ? " disabled" : "") + ' style="margin-top:3px;flex-shrink:0;" /><span style="font-size:13px;line-height:1.4;"><strong>' + esc(c.label || sid) + "</strong>" + (c.sections ? '<br><span style="color:var(--text-muted);font-size:12px;">' + esc(c.sections) + "</span>" : "") + (taken ? '<br><span style="color:var(--text-muted);font-size:11px;">Ya est\xE1 en un grupo</span>' : "") + "</span></label>";
}
function renderDayBlock(day, used) {
  return '<div class="lab-consolidate-day" style="margin:0 0 14px;"><p style="margin:0 0 6px;font-size:12px;font-weight:600;color:var(--text-muted);">' + esc(day.dayLabel || day.dayKey) + "</p>" + day.sets.map(function(c) {
    return renderSetRow(c, used);
  }).join("") + "</div>";
}
function renderGroupCard(group, idx, candidatesById) {
  var labels = (group.setIds || []).map(function(id) {
    var c = candidatesById[String(id)];
    return c ? c.label : String(id);
  }).join(" + ");
  return '<div class="lab-consolidate-group-card" data-gi="' + esc(String(idx)) + '" style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);"><span style="font-size:13px;line-height:1.4;"><strong>Grupo ' + esc(String(idx + 1)) + '</strong><br><span style="color:var(--text-muted);font-size:12px;">' + esc(labels) + '</span></span><button type="button" class="lab-consolidate-group-remove" data-gi="' + esc(String(idx)) + '" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);flex-shrink:0;">Quitar</button></div>';
}
function renderBodyHtml(candidates, groups) {
  var used = assignedSetIds(groups);
  var byId = /* @__PURE__ */ Object.create(null);
  (candidates || []).forEach(function(c) {
    byId[String(c.id)] = c;
  });
  var days = groupSetsByDay(candidates);
  var setsHtml = days.map(function(d) {
    return renderDayBlock(d, used);
  }).join("");
  var groupsHtml = groups.length > 0 ? groups.map(function(g, i) {
    return renderGroupCard(g, i, byId);
  }).join("") : '<p style="margin:0;font-size:12px;color:var(--text-muted);">Ning\xFAn grupo a\xFAn. Marca \u22652 conjuntos del mismo d\xEDa y pulsa \xABA\xF1adir grupo\xBB.</p>';
  return '<div style="margin:0 0 12px;"><p style="margin:0 0 8px;font-size:12px;font-weight:600;color:var(--text-muted);">Conjuntos</p>' + setsHtml + '</div><div style="margin:0 0 4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><button type="button" id="lab-consolidate-add-group" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:7px 12px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">A\xF1adir grupo</button><span id="lab-consolidate-hint" style="font-size:12px;color:var(--text-muted);"></span></div><div style="margin:14px 0 0;"><p style="margin:0 0 8px;font-size:12px;font-weight:600;color:var(--text-muted);">Grupos a fusionar</p><div id="lab-consolidate-groups">' + groupsHtml + "</div></div>";
}
function buildLabConsolidateModalHtml(opts) {
  var candidates = opts.candidates || [];
  return '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Consolidar historial</h3><p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Elige qu\xE9 conjuntos unir. Arma uno o m\xE1s grupos (mismo d\xEDa; no mezcles labs con cultivos). Solo se fusionan los grupos que crees.</p><div id="lab-consolidate-body" style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">' + renderBodyHtml(candidates, []) + '</div><div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;"><button type="button" id="lab-consolidate-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button><button type="button" id="lab-consolidate-ok" disabled style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Consolidar</button></div></div>';
}
function selectedSetIds(backdrop) {
  var ids = [];
  backdrop.querySelectorAll(".lab-consolidate-set-cb:checked:not(:disabled)").forEach(function(cb) {
    var sid = cb.getAttribute("data-sid");
    if (sid) ids.push(sid);
  });
  return ids;
}
function setOkEnabled(backdrop, groups) {
  var ok = document.getElementById("lab-consolidate-ok");
  if (!ok) return;
  var enabled = groups.length > 0;
  ok.disabled = !enabled;
  ok.style.opacity = enabled ? "1" : "0.55";
  ok.style.cursor = enabled ? "pointer" : "not-allowed";
}
function setHint(msg, isError) {
  var el = document.getElementById("lab-consolidate-hint");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "#B91C1C" : "var(--text-muted)";
}
function wireLabConsolidateModal(backdrop, opts) {
  var candidates = opts && opts.candidates || [];
  var validateGroup = opts && typeof opts.validateGroup === "function" ? opts.validateGroup : function() {
    return { ok: true };
  };
  var onConfirm = opts && typeof opts.onConfirm === "function" ? opts.onConfirm : function() {
  };
  var groups = [];
  function refresh() {
    var body = document.getElementById("lab-consolidate-body");
    if (body) body.innerHTML = renderBodyHtml(candidates, groups);
    setOkEnabled(backdrop, groups);
    setHint("");
    bindDynamic();
  }
  function bindDynamic() {
    var addBtn = document.getElementById("lab-consolidate-add-group");
    if (addBtn) {
      addBtn.onclick = function() {
        var ids = selectedSetIds(backdrop);
        var check = validateGroup(ids);
        if (!check || !check.ok) {
          setHint(check && check.error || "Grupo inv\xE1lido", true);
          return;
        }
        var used = assignedSetIds(groups);
        for (var i = 0; i < ids.length; i++) {
          if (used[ids[i]]) {
            setHint("Ese conjunto ya est\xE1 en otro grupo", true);
            return;
          }
        }
        groups.push({ setIds: ids.slice() });
        refresh();
      };
    }
    backdrop.querySelectorAll(".lab-consolidate-group-remove").forEach(function(btn) {
      btn.onclick = function() {
        var gi = parseInt(btn.getAttribute("data-gi") || "", 10);
        if (!isFinite(gi) || gi < 0) return;
        groups.splice(gi, 1);
        refresh();
      };
    });
  }
  document.getElementById("lab-consolidate-cancel").onclick = function() {
    backdrop.remove();
  };
  document.getElementById("lab-consolidate-ok").onclick = function() {
    if (!groups.length) return;
    var payload = groups.map(function(g) {
      return g.setIds.slice();
    });
    backdrop.remove();
    onConfirm(payload);
  };
  bindDynamic();
  setOkEnabled(backdrop, groups);
}
function finishLabConsolidateUi(patientId, mergedCount, opts) {
  runLabConsolidateUiRefresh(
    {
      persistClinicalState,
      setActiveLab: function(v) {
        labPanelBridge.setActiveLab(v);
      },
      renderLabHistoryPanel: function() {
        labPanelBridge.renderLabHistoryPanel();
      },
      refreshTendenciasOrCultivosPanel: function() {
        rt.refreshTendenciasOrCultivosPanel();
      },
      syncEstudiosTextarea: function(pid) {
        var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
        if (el && pid && getNotes()[pid]) {
          el.value = getNotes()[pid].estudios || "";
        }
      },
      addAuditEntry: function(action, status, n, detail) {
        rt.addAuditEntry(action, status, n, detail);
      },
      showToast: function(msg, kind) {
        rt.showToast(msg, kind);
      }
    },
    patientId,
    mergedCount,
    opts
  );
}

// public/js/features/lab-panel-history-dedupe-modal.mjs
function renderLabDedupeRowsHtml(rows) {
  return rows.map(function(r) {
    return '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="lab-dedupe-cb" data-pid="' + esc(r.patientId) + '" data-sid="' + esc(r.id) + '" checked style="margin-top:3px;flex-shrink:0;" /> <span>' + esc(r.summary) + "</span></label></li>";
  }).join("");
}
function renderLabDedupePatientBlock(sec) {
  const exact = sec.rows.filter(function(r) {
    return r.kind === "exact";
  });
  const loose = sec.rows.filter(function(r) {
    return r.kind === "loose";
  });
  const head = '<h4 style="margin:12px 0 8px;font-size:14px;font-weight:700;color:var(--text);">' + esc(sec.nombre || "\u2014") + (sec.registro ? ' <span style="opacity:0.85;font-weight:500">\xB7 ' + esc(sec.registro) + "</span>" : "") + "</h4>";
  let part = '<div class="lab-dedupe-patient-block">' + head;
  if (exact.length) {
    part += '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Duplicados exactos (misma fecha, hora y texto del reporte)</p><ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">' + renderLabDedupeRowsHtml(exact) + "</ul>";
  }
  if (loose.length) {
    part += '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Posibles duplicados (misma fecha/hora y mismos valores num\xE9ricos parseados; el texto del reporte puede diferir)</p><ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">' + renderLabDedupeRowsHtml(loose) + "</ul>";
  }
  return part + "</div>";
}
function buildLabDedupeModalHtml(sections) {
  const blocks = sections.map(renderLabDedupePatientBlock).join("");
  const defaultCount = sections.reduce(function(acc, s) {
    return acc + s.rows.length;
  }, 0);
  return '<div class="lab-conflict-modal" style="max-width:520px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Sincronizar historial de laboratorio</h3><p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca las entradas a eliminar. Por defecto se seleccionan las copias redundantes y se conserva el conjunto con id m\xE1s antiguo en cada grupo.</p><div style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">' + blocks + '</div><div style="display:flex;gap:10px;margin-top:14px;justify-content:space-between;flex-wrap:wrap;align-items:center;"><span style="font-size:12px;color:var(--text-muted);" id="lab-dedupe-count">' + defaultCount + " seleccionada" + (defaultCount === 1 ? "" : "s") + '</span><div style="display:flex;gap:10px;flex-wrap:wrap;"><button type="button" id="lab-dedupe-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todas</button><button type="button" id="lab-dedupe-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todas</button><button type="button" id="lab-dedupe-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button><button type="button" id="lab-dedupe-ok" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Eliminar seleccionadas</button></div></div></div>';
}
function wireLabDedupeModal(backdrop, onConfirm) {
  function updateCount() {
    const n = backdrop.querySelectorAll(".lab-dedupe-cb:checked").length;
    const el = document.getElementById("lab-dedupe-count");
    if (el) el.textContent = n + " seleccionada" + (n === 1 ? "" : "s");
  }
  backdrop.querySelectorAll(".lab-dedupe-cb").forEach(function(cb) {
    cb.addEventListener("change", updateCount);
  });
  document.getElementById("lab-dedupe-none").onclick = function() {
    backdrop.querySelectorAll(".lab-dedupe-cb").forEach(function(cb) {
      cb.checked = false;
    });
    updateCount();
  };
  document.getElementById("lab-dedupe-all").onclick = function() {
    backdrop.querySelectorAll(".lab-dedupe-cb").forEach(function(cb) {
      cb.checked = true;
    });
    updateCount();
  };
  document.getElementById("lab-dedupe-cancel").onclick = function() {
    backdrop.remove();
  };
  document.getElementById("lab-dedupe-ok").onclick = function() {
    const mapByPatient = {};
    backdrop.querySelectorAll(".lab-dedupe-cb:checked").forEach(function(cb) {
      const pid = cb.getAttribute("data-pid");
      const sid = cb.getAttribute("data-sid");
      if (!pid || !sid) return;
      if (!mapByPatient[pid]) mapByPatient[pid] = [];
      mapByPatient[pid].push(sid);
    });
    backdrop.remove();
    const nSel = Object.keys(mapByPatient).reduce(function(a, pid) {
      return a + mapByPatient[pid].length;
    }, 0);
    if (!nSel) {
      rt.showToast("No seleccionaste entradas para eliminar", "error");
      return;
    }
    if (typeof rt.pushUndoSnapshot === "function") {
      rt.pushUndoSnapshot("Eliminar duplicados de historial de labs (" + nSel + ")");
    }
    const removedTotal = onConfirm(mapByPatient);
    persistClinicalState({ immediate: true });
    labPanelBridge.renderLabHistoryPanel();
    rt.refreshTendenciasOrCultivosPanel();
    const el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el && rt.getActiveId() && getNotes()[rt.getActiveId()]) {
      el.value = getNotes()[rt.getActiveId()].estudios || "";
    }
    rt.addAuditEntry("lab-history-dedupe", "ok", removedTotal, Object.keys(mapByPatient).length + " pacientes");
    rt.showToast("Eliminadas " + removedTotal + " entrada" + (removedTotal === 1 ? "" : "s") + " \u2713", "success");
  };
}

// public/js/features/lab-panel-history-dedupe.mjs
function labDedupeSummaryLine(set) {
  if (!set) return "\u2014";
  return rt.formatLabHistoryListMeta(set) + " \xB7 id " + String(set.id).slice(-12);
}
function labParsedFingerprintForDedupe(set) {
  var p = set && set.parsed;
  if (!p || !Object.keys(p).length) p = rt.extractParsedValues(set.resLabs || []);
  var keys = Object.keys(p).filter(function(k) {
    var v = p[k];
    return v != null && isFinite(Number(v));
  }).sort();
  if (!keys.length) return "";
  return keys.map(function(k) {
    return k + ":" + Number(p[k]);
  }).join("|");
}
function labLooseDupeKey(set) {
  if (!set) return "";
  var dk = rt.dayKeyFromLabSet(set);
  if (!dk || dk === "unknown" || dk === "Anterior") return "";
  var fp = labParsedFingerprintForDedupe(set);
  if (!fp) return "";
  return "d:" + dk + "||" + fp;
}
function buildLabDedupeChecklistSections(patientId) {
  var sets = rt.ensureParsedLabHistory(patientId);
  var byId = {};
  sets.forEach(function(s) {
    if (s && s.id != null) byId[String(s.id)] = s;
  });
  var rows = [];
  var exactRemoveIds = /* @__PURE__ */ new Set();
  findExactDuplicateLabGroups(sets).forEach(function(g) {
    g.removeIds.forEach(function(id) {
      exactRemoveIds.add(id);
      var s = byId[id];
      if (!s) return;
      rows.push({
        patientId,
        id,
        kind: "exact",
        checked: true,
        summary: labDedupeSummaryLine(s)
      });
    });
  });
  var looseByKey = /* @__PURE__ */ Object.create(null);
  sets.forEach(function(s) {
    if (!s || s.id == null) return;
    var k = labLooseDupeKey(s);
    if (!k) return;
    if (!looseByKey[k]) looseByKey[k] = [];
    looseByKey[k].push(s);
  });
  Object.keys(looseByKey).forEach(function(k) {
    var arr = looseByKey[k];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    arr.slice(1).forEach(function(s) {
      var sid = String(s.id);
      if (exactRemoveIds.has(sid)) return;
      rows.push({
        patientId,
        id: sid,
        kind: "loose",
        checked: true,
        summary: labDedupeSummaryLine(s)
      });
    });
  });
  return rows;
}
function applyLabDedupeFromChecklist(mapByPatient) {
  var removedTotal = 0;
  Object.keys(mapByPatient).forEach(function(pid) {
    var ids = mapByPatient[pid];
    if (!ids || !ids.length || !getLabHistory()[pid]) return;
    var idSet = new Set(ids.map(String));
    var before = getLabHistory()[pid].length;
    getLabHistory()[pid] = getLabHistory()[pid].filter(function(s) {
      return !idSet.has(String(s.id));
    });
    if (!getLabHistory()[pid].length) delete getLabHistory()[pid];
    rt.rebuildEstudiosFromLabHistory(pid);
    removedTotal += before - (getLabHistory()[pid] ? getLabHistory()[pid].length : 0);
    if (before !== (getLabHistory()[pid] ? getLabHistory()[pid].length : 0)) bumpLabHistoryRevision(pid);
  });
  return removedTotal;
}
function showLabDedupeChecklistModal(sections) {
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "lab-dedupe-backdrop";
  backdrop.innerHTML = buildLabDedupeModalHtml(sections);
  document.body.appendChild(backdrop);
  wireLabDedupeModal(backdrop, applyLabDedupeFromChecklist);
}
function openLabHistoryDedupeReview(scope) {
  scope = scope || "active";
  if (scope === "active") {
    if (!rt.getActiveId()) {
      rt.showToast("Selecciona un paciente primero", "error");
      return;
    }
    var rows = buildLabDedupeChecklistSections(rt.getActiveId());
    if (!rows.length) {
      rt.showToast("No hay duplicados ni coincidencias por fecha/valores en este paciente", "success");
      return;
    }
    var p = getPatients().find(function(x) {
      return x.id === rt.getActiveId();
    });
    showLabDedupeChecklistModal([
      {
        patientId: rt.getActiveId(),
        nombre: p ? p.nombre : "",
        registro: p ? p.registro : "",
        rows
      }
    ]);
    return;
  }
  if (scope === "all") {
    rt.closeSettingsDropdown();
    runLabDedupeReviewAllPatients();
  }
}
function runLabDedupeReviewAllPatients() {
  var list = getPatients().filter(function(p) {
    return p && !p.isDemo;
  });
  if (!list.length) {
    rt.showToast("No hay pacientes para revisar", "error");
    return;
  }
  rt.showToast("Buscando duplicados en " + list.length + " pacientes\u2026", "success");
  var sections = [];
  var index = 0;
  function step() {
    if (index >= list.length) {
      if (!sections.length) {
        rt.showToast("No se encontraron duplicados ni coincidencias por fecha/valores", "success");
        return;
      }
      showLabDedupeChecklistModal(sections);
      return;
    }
    var batchEnd = Math.min(index + 4, list.length);
    while (index < batchEnd) {
      var p = list[index];
      index += 1;
      var r = buildLabDedupeChecklistSections(p.id);
      if (r.length) {
        sections.push({
          patientId: p.id,
          nombre: p.nombre || "\u2014",
          registro: p.registro || "",
          rows: r
        });
      }
    }
    setTimeout(step, 0);
  }
  setTimeout(step, 0);
}
function labSetDayKey(set) {
  return rt.dayKeyFromLabSet(set);
}
function labSetTipo(set) {
  return rt.primaryTipoForLabSet(set.resLabs);
}
function labSetHasGasometria(set) {
  return resLabsHasGasometria(set && set.resLabs);
}
function labSetIsGasometriaOnly(set) {
  return isGasometriaOnlyResLabs(set && set.resLabs);
}
function combineConsolidationResults_(a, b) {
  return {
    merged: (a.merged || 0) + (b.merged || 0),
    removedIds: [].concat(a.removedIds || [], b.removedIds || []),
    keeperIds: [].concat(a.keeperIds || [], b.keeperIds || [])
  };
}
function labSetTimestampMs(set) {
  return labTimestampMsFromFechaHora(set.fecha, set.hora);
}
function mergeLabHistorySetsCluster(patientId, setsToMerge, tipoGrupo) {
  var removedIds = [];
  if (!setsToMerge || setsToMerge.length < 2) return removedIds;
  var arr = setsToMerge.slice();
  arr.sort(compareLabSetIdForDedupe);
  var keeper = arr[0];
  var mergeOrder = arr.slice().sort(function(a, b) {
    var sa = rt.labSetIsFromSome(a) ? 1 : 0;
    var sb = rt.labSetIsFromSome(b) ? 1 : 0;
    if (sa !== sb) return sa - sb;
    return compareLabSetIdForDedupe(a, b);
  });
  var merged = [];
  var sourceParts = [];
  mergeOrder.forEach(function(set) {
    var other = set.resLabs || [];
    if (merged.length && other.length) merged.push("");
    merged = merged.concat(other);
    if (set.sourceText && String(set.sourceText).trim()) sourceParts.push(String(set.sourceText).trim());
  });
  var deduped = sanitizeResLabsChunks(dedupeConsolidatedRowsBySection(merged, tipoGrupo));
  keeper.resLabs = deduped;
  keeper.parsed = rt.extractParsedValues(deduped);
  var mergedBhExtras = {};
  mergeOrder.forEach(function(sMerge) {
    if (sMerge && sMerge.bhExtras && typeof sMerge.bhExtras === "object") {
      Object.keys(sMerge.bhExtras).forEach(function(bk) {
        mergedBhExtras[bk] = sMerge.bhExtras[bk];
      });
    }
  });
  keeper.bhExtras = mergedBhExtras;
  keeper.parsedBySection = rt.buildParsedBySectionFromResLabs(deduped, keeper.bhExtras);
  if (sourceParts.length) keeper.sourceText = sourceParts.join("\n\n---\n\n");
  refreshSameDayAscitisForPatient(patientId, keeper.id);
  var horas = {};
  arr.forEach(function(s) {
    var h = String(s.hora || "").trim().slice(0, 5);
    if (h) horas[h] = true;
  });
  var horaKeys = Object.keys(horas);
  if (horaKeys.length === 1) keeper.hora = horaKeys[0];
  else keeper.hora = "";
  for (var j = 1; j < arr.length; j++) {
    removedIds.push(String(arr[j].id));
  }
  return removedIds;
}
function executeLabConsolidationMergeJobs(patientId, jobs) {
  var out = { merged: 0, removedIds: [], keeperIds: [] };
  if (!patientId || !jobs || !jobs.length || !getLabHistory()[patientId]) return out;
  var todo = [];
  var keeperIds = [];
  jobs.forEach(function(job) {
    var tipoGrupo = job.sets.some(function(s) {
      return labSetTipo(s) === "labs";
    }) ? "labs" : labSetTipo(job.sets[0]) || "labs";
    var removed = mergeLabHistorySetsCluster(patientId, job.sets, tipoGrupo);
    if (!removed.length) return;
    removed.forEach(function(id) {
      todo.push(id);
    });
    keeperIds.push(String(job.sets[0].id));
  });
  if (!todo.length) return out;
  var idRemove = new Set(todo);
  getLabHistory()[patientId] = getLabHistory()[patientId].filter(function(s) {
    return !idRemove.has(String(s.id));
  });
  if (!getLabHistory()[patientId].length) delete getLabHistory()[patientId];
  bumpLabHistoryRevision(patientId);
  clearLabHistoryDateSelectCache();
  out.merged = todo.length;
  out.removedIds = todo;
  out.keeperIds = keeperIds;
  return out;
}
function dayLabelFromDayKey(dayKey) {
  if (!dayKey || dayKey === "unknown") return "\u2014";
  var parts = String(dayKey).split("-").map(function(x) {
    return parseInt(x, 10);
  });
  if (parts.length !== 3 || !isFinite(parts[0])) return dayKey;
  var dd = String(parts[2]).padStart(2, "0");
  var mm = String(parts[1]).padStart(2, "0");
  return dd + "/" + mm + "/" + parts[0];
}
function buildConsolidationCandidateRows(patientId) {
  rt.ensureParsedLabHistory(patientId);
  var sets = getLabHistory()[patientId] ? getLabHistory()[patientId].slice() : [];
  return listLabConsolidationCandidates(sets, labSetDayKey, labSetTipo).map(function(set) {
    var tipo = labSetTipo(set);
    return {
      id: String(set.id),
      label: rt.formatLabHistoryDateSelectLabel(set),
      dayKey: labSetDayKey(set),
      dayLabel: dayLabelFromDayKey(labSetDayKey(set)),
      tipo,
      tipoLabel: tipoLabel(tipo),
      sections: labSetSectionSummary(set.resLabs)
    };
  });
}
function setsByIdForPatient(patientId) {
  var map = /* @__PURE__ */ Object.create(null);
  (getLabHistory()[patientId] || []).forEach(function(set) {
    if (set && set.id != null) map[String(set.id)] = set;
  });
  return map;
}
function runLabConsolidationForPatient(patientId, outlierGroupKeys) {
  if (!patientId || !getLabHistory()[patientId] || getLabHistory()[patientId].length < 2) {
    return { merged: 0, removedIds: [], keeperIds: [] };
  }
  rt.ensureParsedLabHistory(patientId);
  var sets = getLabHistory()[patientId].slice();
  var sameDtJobs = buildSameDateTimeLabMergeJobs(sets, labSetTipo, labSetIsGasometriaOnly);
  var sameDtResult = executeLabConsolidationMergeJobs(patientId, sameDtJobs);
  sets = getLabHistory()[patientId] ? getLabHistory()[patientId].slice() : [];
  var jobs = sets.length >= 2 ? buildLabConsolidationMergeJobs(
    sets,
    labSetDayKey,
    labSetTipo,
    labSetTimestampMs,
    outlierGroupKeys,
    labSetHasGasometria
  ) : [];
  var windowResult = executeLabConsolidationMergeJobs(patientId, jobs);
  var result = combineConsolidationResults_(sameDtResult, windowResult);
  if (result.merged) rt.rebuildEstudiosFromLabHistory(patientId);
  return result;
}
function runManualLabConsolidationForPatient(patientId, groups) {
  if (!patientId || !getLabHistory()[patientId] || !groups || !groups.length) {
    return { merged: 0, removedIds: [], keeperIds: [] };
  }
  rt.ensureParsedLabHistory(patientId);
  var byId = setsByIdForPatient(patientId);
  var jobs = buildManualLabConsolidationJobs(groups, byId);
  var result = executeLabConsolidationMergeJobs(patientId, jobs);
  if (result.merged) rt.rebuildEstudiosFromLabHistory(patientId);
  return result;
}
function runLabHistoryDayTipoConsolidation(patientId) {
  return runLabConsolidationForPatient(patientId, null);
}
function autoConsolidateLabHistoryForPatient(patientId) {
  return runLabHistoryDayTipoConsolidation(patientId);
}
function findDisplayLabHistorySetId(patientId, displayResult) {
  if (!patientId || !displayResult) return "";
  var hist = sortLabHistoryChronological(
    rt.ensureParsedLabHistoryCached ? rt.ensureParsedLabHistoryCached(patientId) : rt.ensureParsedLabHistory(patientId, { readOnly: true })
  );
  if (!hist.length) return "";
  var targetDay = rt.dayKeyFromLabSet({
    fecha: displayResult.patient && displayResult.patient.fecha,
    hora: displayResult.patient && displayResult.patient.hora
  });
  var candidates = hist.filter(function(set) {
    return rt.dayKeyFromLabSet(set) === targetDay;
  });
  if (!candidates.length) candidates = [hist[0]];
  candidates.sort(function(a, b) {
    var la = a.resLabs && a.resLabs.length || 0;
    var lb = b.resLabs && b.resLabs.length || 0;
    if (lb !== la) return lb - la;
    var ta = parseFechaLabToMs(a.fecha, a.hora);
    var tb = parseFechaLabToMs(b.fecha, b.hora);
    if (typeof ta === "number" && typeof tb === "number" && isFinite(ta) && isFinite(tb) && tb !== ta) {
      return tb - ta;
    }
    return 0;
  });
  var pick = candidates[0];
  var idx = hist.indexOf(pick);
  return labSetIdForHistory(pick, idx >= 0 ? idx : 0);
}
function consolidateLabHistoryByDayAndTipo() {
  if (!rt.getActiveId()) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var patientId = rt.getActiveId();
  var list = getLabHistory()[patientId];
  if (!list || list.length < 2) {
    rt.showToast("Se necesitan al menos 2 conjuntos en el historial", "error");
    return;
  }
  var candidates = buildConsolidationCandidateRows(patientId);
  if (candidates.length < 2) {
    rt.showToast("No hay suficientes conjuntos con fecha para consolidar", "success");
    return;
  }
  var byDay = /* @__PURE__ */ Object.create(null);
  candidates.forEach(function(c) {
    byDay[c.dayKey] = (byDay[c.dayKey] || 0) + 1;
  });
  var hasPairableDay = Object.keys(byDay).some(function(dk) {
    return byDay[dk] >= 2;
  });
  if (!hasPairableDay) {
    rt.showToast("Necesitas al menos 2 conjuntos del mismo d\xEDa para armar un grupo", "success");
    return;
  }
  function applyManualGroups(groups) {
    if (typeof rt.pushUndoSnapshot === "function") {
      rt.pushUndoSnapshot("Consolidar historial de labs (grupos manuales)");
    }
    var result = runManualLabConsolidationForPatient(patientId, groups);
    var preferSetId = preferKeeperSetIdFromConsolidateResult(result);
    if (preferSetId) setLabHistorySelectedSetId(patientId, preferSetId);
    finishLabConsolidateUi(patientId, result.merged);
  }
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "lab-consolidate-backdrop";
  backdrop.innerHTML = buildLabConsolidateModalHtml({ candidates });
  document.body.appendChild(backdrop);
  wireLabConsolidateModal(backdrop, {
    candidates,
    validateGroup: function(setIds) {
      return validateManualConsolidationGroup(
        setIds,
        setsByIdForPatient(patientId),
        labSetDayKey,
        labSetTipo
      );
    },
    onConfirm: applyManualGroups
  });
}

// public/js/features/lab-panel-workbench-store.mjs
function resolveLabHistoryFechaNorm(fecha) {
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || "").trim();
  if (fechaNorm) return fechaNorm;
  var nd = /* @__PURE__ */ new Date();
  return String(nd.getDate()).padStart(2, "0") + "/" + String(nd.getMonth() + 1).padStart(2, "0") + "/" + nd.getFullYear();
}
function buildLabHistorySet(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection, idSeed) {
  var extras = bhExtras && typeof bhExtras === "object" ? bhExtras : {};
  var refs = refsBySection && typeof refsBySection === "object" ? refsBySection : {};
  if (!Object.keys(refs).length && sourceText) {
    refs = buildRefsBySectionFromReport(sourceText);
  }
  var fechaNorm = resolveLabHistoryFechaNorm(fecha);
  var horaNorm = normalizeHoraLabHistory(hora);
  var cleanResLabs = sanitizeResLabsChunks(resLabs);
  var set = {
    id: idSeed != null && String(idSeed).trim() !== "" ? String(Date.now()) + "-" + String(idSeed) : Date.now().toString(),
    fecha: fechaNorm,
    hora: horaNorm,
    resLabs: cleanResLabs,
    bhExtras: extras,
    parsed: rt.extractParsedValues(cleanResLabs),
    parsedBySection: rt.buildParsedBySectionFromResLabs(cleanResLabs, extras),
    refsBySection: refs,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  var raw = String(sourceText || "").trim();
  if (raw) set.sourceText = raw;
  return set;
}
function mergeBhExtras_(into, from) {
  if (!from || typeof from !== "object") return into;
  Object.keys(from).forEach(function(k) {
    into[k] = from[k];
  });
  return into;
}
function mergeRefsBySection_(into, from) {
  if (!from || typeof from !== "object") return into;
  Object.keys(from).forEach(function(k) {
    into[k] = from[k];
  });
  return into;
}
function appendSourceText_(existing, incoming) {
  var a = String(existing || "").trim();
  var b = String(incoming || "").trim();
  if (!b) return a;
  if (!a) return b;
  if (a.indexOf(b) !== -1) return a;
  return a + "\n\n---\n\n" + b;
}
function applyMergedLabsToKeeper_(keeper, mergedRows, sourceText, bhExtras, refsBySection) {
  var clean = sanitizeResLabsChunks(mergedRows);
  keeper.resLabs = clean;
  keeper.bhExtras = mergeBhExtras_(
    keeper.bhExtras && typeof keeper.bhExtras === "object" ? Object.assign({}, keeper.bhExtras) : {},
    bhExtras
  );
  keeper.refsBySection = mergeRefsBySection_(
    keeper.refsBySection && typeof keeper.refsBySection === "object" ? Object.assign({}, keeper.refsBySection) : {},
    refsBySection
  );
  keeper.parsed = rt.extractParsedValues(clean);
  keeper.parsedBySection = rt.buildParsedBySectionFromResLabs(clean, keeper.bhExtras);
  var nextSrc = appendSourceText_(keeper.sourceText, sourceText);
  if (nextSrc) keeper.sourceText = nextSrc;
  keeper.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
function mergeUpsertLabRows_(keeper, siblings, draft) {
  var tipo = primaryTipoForLabSet(keeper.resLabs) || primaryTipoForLabSet(draft.resLabs) || "labs";
  var mergedRows = [];
  [keeper].concat(siblings || []).concat([draft]).forEach(function(s) {
    var rows = s && s.resLabs || [];
    if (mergedRows.length && rows.length) mergedRows.push("");
    mergedRows = mergedRows.concat(rows);
  });
  return dedupeConsolidatedLabRows(mergedRows, tipo === "mixed" ? "labs" : tipo);
}
function removeSiblingsFromHistory_(patientId, siblings) {
  if (!siblings.length) return;
  var remove = new Set(
    siblings.map(function(s) {
      return String(s.id);
    })
  );
  getLabHistory()[patientId] = getLabHistory()[patientId].filter(function(s) {
    return !remove.has(String(s.id));
  });
}
function replaceUpsertKeeper_(keeper, draft) {
  var clean = sanitizeResLabsChunks(draft.resLabs || []);
  keeper.resLabs = clean;
  keeper.bhExtras = draft.bhExtras && typeof draft.bhExtras === "object" ? Object.assign({}, draft.bhExtras) : {};
  keeper.refsBySection = draft.refsBySection && typeof draft.refsBySection === "object" ? Object.assign({}, draft.refsBySection) : {};
  keeper.parsed = rt.extractParsedValues(clean);
  keeper.parsedBySection = rt.buildParsedBySectionFromResLabs(clean, keeper.bhExtras);
  if (draft.sourceText) keeper.sourceText = draft.sourceText;
  keeper.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
function applyUpsertMergePlan_(patientId, plan, draft, opts) {
  var keeper = plan.keeper;
  var siblings = plan.siblings || [];
  var replaceOnMatch = !!(opts && opts.replaceOnMatch) && plan.matchKind === "datetime";
  if (replaceOnMatch) {
    var unchanged = !siblings.length && areLabSetsEquivalent(draft.resLabs || [], keeper.resLabs || []);
    replaceUpsertKeeper_(keeper, draft);
    removeSiblingsFromHistory_(patientId, siblings);
    refreshSameDayAscitisForPatient(patientId, keeper.id);
    bumpLabHistoryRevision(patientId);
    return { action: unchanged ? "skipped" : "merged", set: keeper };
  }
  var deduped = mergeUpsertLabRows_(keeper, siblings, draft);
  if (!areLabSetsEquivalent(deduped, keeper.resLabs || []) || siblings.length) {
    applyMergedLabsToKeeper_(keeper, deduped, draft.sourceText, draft.bhExtras, draft.refsBySection);
    removeSiblingsFromHistory_(patientId, siblings);
    refreshSameDayAscitisForPatient(patientId, keeper.id);
    bumpLabHistoryRevision(patientId);
    return { action: "merged", set: keeper };
  }
  return { action: "skipped", set: keeper };
}
function upsertLabHistory(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection, idSeed, upsertOpts) {
  if (!patientId || !resLabs || !resLabs.length) return { action: "skipped", set: null };
  if (!getLabHistory()[patientId]) getLabHistory()[patientId] = [];
  var draft = buildLabHistorySet(
    patientId,
    resLabs,
    fecha,
    hora,
    sourceText,
    bhExtras,
    refsBySection,
    idSeed
  );
  if (!draft.resLabs || !draft.resLabs.length) return { action: "skipped", set: null };
  var plan = planLabHistoryDateTimeUpsert(getLabHistory()[patientId], draft);
  if (plan.action === "skip") return { action: "skipped", set: plan.keeper };
  if (plan.action === "add") {
    getLabHistory()[patientId].push(draft);
    refreshSameDayAscitisForPatient(patientId, draft.id);
    bumpLabHistoryRevision(patientId);
    return { action: "added", set: draft };
  }
  return applyUpsertMergePlan_(patientId, plan, draft, upsertOpts);
}
function pushLabHistory(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection, idSeed) {
  var result = upsertLabHistory(
    patientId,
    resLabs,
    fecha,
    hora,
    sourceText,
    bhExtras,
    refsBySection,
    idSeed
  );
  return result && result.set ? result.set : null;
}
function pushExternalLabHistory(patientId, opts) {
  var o = opts && typeof opts === "object" ? opts : {};
  var sectionKey = String(o.sectionKey || "LAB").trim() || "LAB";
  var set = pushLabHistory(
    patientId,
    o.resLabs,
    o.fecha,
    o.hora,
    "[entrada manual \xB7 " + sectionKey + "]",
    {},
    {},
    "ext-" + sectionKey
  );
  if (!set) return null;
  set.origin = "externo";
  return set;
}
function pushLabHistoryFromBulkPayload(patientId, payload, idSeed, upsertOpts) {
  if (!payload || !payload.resLabs || !payload.resLabs.length) {
    return { action: "skipped", set: null };
  }
  return upsertLabHistory(
    patientId,
    payload.resLabs,
    payload.fecha,
    payload.hora,
    payload.sourceText,
    payload.bhExtras,
    payload.refsBySection,
    idSeed,
    upsertOpts
  );
}
async function applyDriveImportLabSets(patient, labSets) {
  if (!patient || !patient.id || !labSets || !labSets.length) {
    return { added: 0, skipped: 0 };
  }
  var patientId = patient.id;
  var added = 0;
  var skipped = 0;
  labSets.forEach(function(set, idx) {
    var payload = {
      fecha: set.fecha,
      hora: set.hora || "",
      resLabs: set.resLabs || [],
      sourceText: set.sourceText || ""
    };
    if (!payload.resLabs.length) return;
    var upsert = upsertLabHistory(
      patientId,
      payload.resLabs,
      payload.fecha,
      payload.hora,
      payload.sourceText,
      set.bhExtras || {},
      {},
      "drive-import-" + idx
    );
    if (!upsert || upsert.action === "skipped") {
      skipped += 1;
      return;
    }
    added += 1;
  });
  if (!added) return { added: 0, skipped };
  rt.rebuildEstudiosFromLabHistory(patientId);
  rt.ensureParsedLabHistory(patientId);
  labPanelBridge.setActiveLab(null);
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  return { added, skipped };
}
function finalizeLabHistoryImport(patientId) {
  var consolidation = autoConsolidateLabHistoryForPatient(patientId);
  if (consolidation.merged > 0) {
    if (typeof rt.addAuditEntry === "function") {
      rt.addAuditEntry("lab-history-auto-consolidate", "ok", consolidation.merged, String(patientId));
    }
  }
  rt.rebuildEstudiosFromLabHistory(patientId);
  enqueueCloudLabSidecarsForPatient(patientId);
}
function storeBulkLabBlocks(blocks, processable, opts) {
  if (processable.length > 1 && typeof rt.pushUndoSnapshot === "function") {
    rt.pushUndoSnapshot("Procesar laboratorios (" + processable.length + " pacientes)");
  }
  var storedSets = 0;
  var mergedSets = 0;
  var skippedDupes = 0;
  var storedByPatient = /* @__PURE__ */ Object.create(null);
  processable.forEach(function(block) {
    var patientId = block.patient.id;
    var patientReg = String(block.patient.registro || "").trim();
    var okItems = block.reports.filter(function(r) {
      return r.ok && r.result && (!patientReg || r.expediente === patientReg);
    }).map(function(r) {
      return { result: r.result, reportText: r.reportText };
    });
    var mergedPayloads = mergeBulkParseResultsForStorage(okItems);
    mergedPayloads.forEach(function(payload, idx) {
      var upsert = pushLabHistoryFromBulkPayload(patientId, payload, block.blockIndex + "-" + idx, opts);
      if (!upsert || upsert.action === "skipped") {
        skippedDupes += 1;
        return;
      }
      if (upsert.action === "merged") mergedSets += 1;
      else storedSets += 1;
      if (!storedByPatient[patientId]) storedByPatient[patientId] = [];
      storedByPatient[patientId].push({
        fecha: payload.fecha,
        hora: payload.hora || "",
        resLabs: payload.resLabs || []
      });
    });
    finalizeLabHistoryImport(patientId);
  });
  if (storedSets || mergedSets || skippedDupes) {
    persistClinicalState({ immediate: true });
    labPanelBridge.setActiveLab(null);
    renderLabHistoryPanel();
    rt.refreshTendenciasOrCultivosPanel();
  }
  return {
    storedSets,
    mergedSets,
    skippedDupes,
    skippedBlocks: blocks.length - processable.length,
    storedByPatient
  };
}
function pickDisplayLabResult(blocks, processable, activeId) {
  var activeBlock = null;
  if (activeId) {
    activeBlock = processable.find(function(b) {
      return b.patient && String(b.patient.id) === String(activeId);
    });
  }
  var block = activeBlock || processable[0] || blocks.find(function(b) {
    return b.okReportCount > 0;
  });
  if (!block) return null;
  var patientReg = block.patient ? String(block.patient.registro || "").trim() : "";
  var okItems = block.reports.filter(function(r) {
    return r.ok && r.result && (!patientReg || r.expediente === patientReg);
  }).map(function(r) {
    return { result: r.result, reportText: r.reportText };
  });
  if (!okItems.length) return null;
  var display = pickLatestDayMergedLabDisplay(okItems);
  if (!display) return null;
  return {
    result: {
      patient: display.patient,
      resLabs: display.resLabs,
      bhExtras: display.bhExtras,
      refsBySection: display.refsBySection
    },
    reportText: display.sourceText,
    expediente: display.expediente || display.patient && display.patient.expediente
  };
}

// public/js/features/lab-panel-workbench-finalize.mjs
function storeProcessableBulkBlocks(blocks, processable, opts) {
  if (!processable.length) {
    return {
      storedSets: 0,
      mergedSets: 0,
      skippedDupes: 0,
      skippedBlocks: blocks.length,
      storedByPatient: {}
    };
  }
  var storeSummary = storeBulkLabBlocks(blocks, processable, opts);
  if (typeof rt.addAuditEntry === "function") {
    rt.addAuditEntry(
      "lab-bulk-paste",
      storeSummary.storedSets ? "ok" : "skip",
      storeSummary.storedSets,
      processable.length + " pacientes"
    );
  }
  return storeSummary;
}
function toastNoMatchingPatients(blocks, quickOut) {
  if (quickOut) return;
  if (!blocks.some(function(b) {
    return b.status === "no-patient";
  })) return;
  rt.showToast("Ning\xFAn expediente del pegado coincide con pacientes en la lista", "error");
}
function resolveBulkDisplayPick(blocks, processable, _text) {
  var displayPick = pickDisplayLabResult(blocks, processable, rt.getActiveId());
  if (displayPick) return displayPick;
  return blocks.reduce(function(found, b) {
    if (found) return found;
    var ok = b.reports.find(function(r) {
      return r.ok && r.result;
    });
    if (!ok) return null;
    return { result: ok.result, reportText: ok.reportText, expediente: ok.expediente };
  }, null);
}
function applyBulkLabPatientSwitch(displayPick, displayResult, processable, applyLabPastePatientResolution2) {
  if (processable.length === 1 && processable[0].okReportCount === 1) {
    applyLabPastePatientResolution2(displayResult);
    return;
  }
  if (!displayPick.expediente) return;
  var match = rt.findPatientByRegistro(displayPick.expediente);
  if (!match || match.id === rt.getActiveId()) return;
  rt.selectPatient(match.id);
  rt.showToast("Paciente: " + (match.nombre || "Sin nombre") + " \xB7 Exp " + displayPick.expediente, "success");
}
function syncBulkLabHistorySelection(activeId, displayResult, processable) {
  if (!activeId || !processable.length) return;
  var historySetId = findDisplayLabHistorySetId(activeId, displayResult);
  if (!historySetId) return;
  setLabHistorySelectedSetId(activeId, historySetId);
  loadLabHistorySetIntoOutput(historySetId, { silent: true });
}
function bulkStoreSummaryParts(storeSummary) {
  var parts = [];
  if (storeSummary.storedSets) {
    parts.push(
      storeSummary.storedSets + " conjunto" + (storeSummary.storedSets === 1 ? "" : "s") + " guardado" + (storeSummary.storedSets === 1 ? "" : "s")
    );
  }
  if (storeSummary.mergedSets) {
    parts.push(
      storeSummary.mergedSets + " actualizado" + (storeSummary.mergedSets === 1 ? "" : "s") + " (misma hora)"
    );
  }
  if (storeSummary.skippedDupes) {
    parts.push(
      storeSummary.skippedDupes + " duplicado" + (storeSummary.skippedDupes === 1 ? "" : "s") + " omitido" + (storeSummary.skippedDupes === 1 ? "" : "s")
    );
  }
  if (storeSummary.skippedBlocks) {
    parts.push(
      storeSummary.skippedBlocks + " bloque" + (storeSummary.skippedBlocks === 1 ? "" : "s") + " omitido" + (storeSummary.skippedBlocks === 1 ? "" : "s")
    );
  }
  return parts;
}
function showBulkLabPasteSummaryToast(multi, storeSummary, processable, blocks, quickOut, displayResult) {
  if (multi) {
    var parts = bulkStoreSummaryParts(storeSummary);
    rt.showToast(parts.length ? parts.join(" \xB7 ") + " \u2713" : "Laboratorio procesado \u2713", "success");
    return;
  }
  if (processable.length === 1 && storeSummary.storedSets === 0 && !storeSummary.mergedSets && storeSummary.skippedDupes) {
    rt.showToast("Resultado ya registrado en historial", "success");
    return;
  }
  if (processable.length === 1 && storeSummary.storedSets === 0 && storeSummary.mergedSets) {
    rt.showToast("Labs actualizados en el mismo horario \u2713", "success");
    return;
  }
  if (processable.length === 0 && blocks.length === 1 && blocks[0].status === "no-patient" && quickOut && displayResult) {
    rt.showToast("Laboratorio formateado \xB7 salida r\xE1pida \u2713", "success");
  }
}
function notifyTourAfterBulkLabStore(blocks, storedOrAttempted) {
  if (!storedOrAttempted) return;
  if (typeof rt.tourAfterBulkLabParse === "function") {
    rt.tourAfterBulkLabParse(blocks);
  }
}
function filterProcessableBulkBlocks(blocks) {
  return blocks.filter(function(b) {
    return b.canProcess && b.okReportCount > 0 && b.patient;
  });
}
function isMultiBulkLabPaste(blocks, totalOkReports, processable) {
  return blocks.length > 1 || totalOkReports > 1 || processable.length > 1;
}

// public/js/features/lab-eventualidad-autosend.mjs
function findPatientById(patientId) {
  var id = String(patientId || "");
  return (getPatients() || []).find(function(p) {
    return p && String(p.id) === id;
  });
}
async function autosendLabsEventualidadForStored(storedByPatient, opts) {
  void opts;
  var map = storedByPatient || {};
  var skipped = 0;
  var ids = Object.keys(map);
  for (var i = 0; i < ids.length; i++) {
    if (!findPatientById(ids[i])) skipped += 1;
    else skipped += 1;
  }
  return { sent: 0, skipped };
}

// public/js/features/lab-panel-workbench.mjs
function clearLabInputAfterSuccessfulParse() {
  var ta = document.getElementById("lab-input");
  if (!ta) return;
  ta.value = "";
  try {
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (_e) {
    void _e;
  }
}
function limpiarReporte() {
  document.getElementById("lab-input").value = "";
  document.getElementById("lab-banner").style.display = "none";
  document.getElementById("lab-diagrams-section").style.display = "none";
  document.getElementById("diagrams-grid").innerHTML = "";
  document.getElementById("lab-output-box").innerHTML = "";
  labPanelBridge.setActiveLab(null);
  closeLabSomeTablesModal();
  maybeShowLabHistoryForActivePatient({ forceReload: true });
}
function openLabPatientPicker(opts) {
  var options = opts && typeof opts === "object" ? opts : {};
  var onPick = typeof options.onPick === "function" ? options.onPick : function() {
    enviarLabsANota();
  };
  var titleText = String(options.title || "\xBFA qu\xE9 paciente enviar los labs?");
  var overlay = document.createElement("div");
  overlay.id = "lab-picker-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;";
  var box = document.createElement("div");
  box.style.cssText = "background:#1f2937;border-radius:10px;padding:20px;min-width:260px;max-width:360px;width:90%;";
  var title = document.createElement("div");
  title.textContent = titleText;
  title.style.cssText = "color:#f9fafb;font-size:14px;font-weight:600;margin-bottom:14px;";
  box.appendChild(title);
  getPatients().forEach(function(p) {
    var btn = document.createElement("button");
    btn.textContent = p.nombre + (p.registro ? "  \u2022  " + p.registro : "");
    btn.style.cssText = "display:block;width:100%;text-align:left;background:#374151;color:#f3f4f6;border:none;border-radius:6px;padding:10px 12px;margin-bottom:8px;cursor:pointer;font-size:13px;";
    btn.onmouseenter = function() {
      this.style.background = "#4b5563";
    };
    btn.onmouseleave = function() {
      this.style.background = "#374151";
    };
    btn.onclick = function() {
      document.body.removeChild(overlay);
      rt.selectPatient(p.id);
      onPick(p.id);
    };
    box.appendChild(btn);
  });
  var cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancelar";
  cancelBtn.style.cssText = "display:block;width:100%;background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:6px;padding:8px;cursor:pointer;font-size:13px;margin-top:4px;";
  cancelBtn.onclick = function() {
    document.body.removeChild(overlay);
  };
  box.appendChild(cancelBtn);
  overlay.appendChild(box);
  overlay.onclick = function(e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  };
  document.body.appendChild(overlay);
}
async function copiarLabsAlPortapapeles() {
  var activeLab = labPanelBridge.getActiveLab();
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    rt.showToast("No hay resultados procesados", "error");
    return;
  }
  var text = buildLabLines().join("\n");
  var ok = await rt.copyToClipboardSafe(text);
  rt.showToast(
    ok ? "Labs copiados al portapapeles \u2713" : "Error al copiar al portapapeles",
    ok ? "success" : "error"
  );
}
function enviarLabsANota() {
  var activeLab = labPanelBridge.getActiveLab();
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    rt.showToast("No hay resultados procesados", "error");
    return;
  }
  if (!rt.getActiveId()) {
    if (!getPatients().length) {
      rt.showToast("Agrega un paciente primero", "error");
      return;
    }
    if (getPatients().length === 1) {
      rt.selectPatient(getPatients()[0].id);
    } else {
      openLabPatientPicker();
      return;
    }
  }
  checkStudiosAndInsertLabs();
}
function buildLabLines() {
  var lines = [];
  var prefs = rt.getLabOutputPrefs();
  var activeLab = labPanelBridge.getActiveLab();
  if (activeLab && activeLab.patient) {
    var raw = activeLab.patient.fecha || "";
    var fechaDm = normalizeFechaLabHistory(raw) || String(raw).trim();
    if (fechaDm === "Anterior") fechaDm = "";
    if (!fechaDm && raw) {
      var mesesMap = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12", jan: "01", apr: "04", aug: "08", dec: "12" };
      var mFechaLab = raw.trim().match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
      var monNum = mFechaLab && mesesMap[mFechaLab[1].toLowerCase().slice(0, 3)];
      if (monNum) fechaDm = mFechaLab[2].padStart(2, "0") + "/" + monNum + "/" + mFechaLab[3];
    }
    if (fechaDm) {
      lines.push(fechaDm.length >= 5 && fechaDm.indexOf("/") !== -1 ? fechaDm.slice(0, 5) : fechaDm);
    }
  }
  var dayGroups = activeLab.dayGroups;
  if (dayGroups && dayGroups.length > 1) {
    dayGroups.forEach(function(group) {
      var hora = String(group.hora || "").trim();
      var tipo = String(group.tipoLabel || "").trim();
      lines.push([hora, tipo].filter(Boolean).join(" \xB7 ") || "Env\xEDo");
      var bhExtDone2 = false;
      (group.resLabs || []).forEach(function(entry) {
        if (prefs.hideGasoAdvInterp && rt.isGasoInterpretacionResLabChunk(entry)) return;
        if (rt.isCitoquimInterpretacionResLabChunk && rt.isCitoquimInterpretacionResLabChunk(entry)) return;
        if (rt.isAscitisInterpretacionResLabChunk(entry)) return;
        entry.split(/\r?\n/).forEach(function(subline) {
          var cleaned = subline.replace(/\t/g, " ").replace(/  +/g, " ").trim();
          if (cleaned) lines.push(cleaned);
        });
        if (prefs.showBhExtendedLine && !bhExtDone2 && group.bhExtras && rt.isBhMainResLabChunk(entry)) {
          var extPlain = rt.formatBhExtendedTabLine(group.bhExtras, group.sourceText);
          if (extPlain) {
            extPlain.split(/\r?\n/).forEach(function(subline) {
              var cleanedExt = subline.replace(/\t/g, " ").replace(/  +/g, " ").trim();
              if (cleanedExt) lines.push(cleanedExt);
            });
            bhExtDone2 = true;
          }
        }
      });
      lines.push("");
    });
  } else {
    var bhExtDone = false;
    activeLab.resLabs.forEach(function(entry) {
      if (prefs.hideGasoAdvInterp && rt.isGasoInterpretacionResLabChunk(entry)) return;
      if (rt.isCitoquimInterpretacionResLabChunk && rt.isCitoquimInterpretacionResLabChunk(entry)) return;
      if (rt.isAscitisInterpretacionResLabChunk(entry)) return;
      entry.split(/\r?\n/).forEach(function(subline) {
        var cleaned = subline.replace(/\t/g, " ").replace(/  +/g, " ").trim();
        if (cleaned) lines.push(cleaned);
      });
      if (prefs.showBhExtendedLine && !bhExtDone && activeLab.bhExtras && rt.isBhMainResLabChunk(entry)) {
        var extPlain = rt.formatBhExtendedTabLine(activeLab.bhExtras, activeLab.sourceText);
        if (extPlain) {
          extPlain.split(/\r?\n/).forEach(function(subline) {
            var cleanedExt = subline.replace(/\t/g, " ").replace(/  +/g, " ").trim();
            if (cleanedExt) lines.push(cleanedExt);
          });
          bhExtDone = true;
        }
      }
    });
  }
  return lines;
}
function checkStudiosAndInsertLabs() {
  var lines = buildLabLines();
  var history = sortLabHistoryChronological(rt.ensureParsedLabHistory(rt.getActiveId()));
  var recentDate = history.length ? rt.buildLabSetDateLine(history[0]) : "";
  if (!history.length) {
    insertLabsAsRecent(lines);
  } else {
    showLabConflictModal(lines, recentDate);
  }
}
function insertLabPatientSeparator() {
  var ta = document.getElementById("lab-input");
  if (!ta) return;
  var val = ta.value;
  var start = typeof ta.selectionStart === "number" ? ta.selectionStart : val.length;
  var end = typeof ta.selectionEnd === "number" ? ta.selectionEnd : start;
  var before = val.slice(0, start);
  var after = val.slice(end);
  var insert = LAB_BULK_PATIENT_SEPARATOR;
  if (before && !before.endsWith("\n")) insert = "\n" + insert;
  insert += "\n";
  ta.value = before + insert + after;
  var pos = before.length + insert.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
}
function applyLabPastePatientResolution(result) {
  if (!result || !result.patient) return { shouldAutoStore: true };
  var reg = String(result.patient.expediente || "").trim();
  if (!reg) return { shouldAutoStore: true };
  var match = rt.findPatientByRegistro(reg);
  if (!match) {
    if (!rt.getLabOutputPrefs().quickLabOutput) {
      rt.showToast(
        "Registro " + reg + " no est\xE1 en la lista. No se guard\xF3 en el historial.",
        "error"
      );
    }
    return { shouldAutoStore: false };
  }
  if (match.id !== rt.getActiveId()) {
    rt.selectPatient(match.id);
    rt.showToast("Paciente: " + (match.nombre || "Sin nombre") + " \xB7 Exp " + reg, "success");
    rt.addAuditEntry("lab-patient-auto-switch", "ok", 1, reg);
  }
  return { shouldAutoStore: true };
}
function insertLabsAsRecent(_lines) {
  var activeLab = labPanelBridge.getActiveLab();
  if (!getNotes()[rt.getActiveId()]) getNotes()[rt.getActiveId()] = {};
  pushLabHistory(
    rt.getActiveId(),
    activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : "",
    activeLab.patient && activeLab.patient.hora ? activeLab.patient.hora : "",
    activeLab.sourceText || "",
    activeLab.bhExtras,
    activeLab.refsBySection
  );
  finalizeLabHistoryImport(rt.getActiveId());
  persistClinicalState({ immediate: true });
  rt.refreshTendenciasOrCultivosPanel();
  renderLabHistoryPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el) el.value = getNotes()[rt.getActiveId()].estudios;
  rt.onboardingAdvanceAfterSend();
  rt.showToast("Labs enviados a la nota \u2713", "success");
  rt.setMedTabAttention(true);
  rt.switchInnerTab("notas");
}
function insertLabsAsAnteriorThenRecent(_newLines) {
  var activeLab = labPanelBridge.getActiveLab();
  if (!getNotes()[rt.getActiveId()]) getNotes()[rt.getActiveId()] = {};
  pushLabHistory(
    rt.getActiveId(),
    activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : "",
    activeLab.patient && activeLab.patient.hora ? activeLab.patient.hora : "",
    activeLab.sourceText || "",
    activeLab.bhExtras,
    activeLab.refsBySection
  );
  finalizeLabHistoryImport(rt.getActiveId());
  persistClinicalState({ immediate: true });
  rt.refreshTendenciasOrCultivosPanel();
  renderLabHistoryPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el) el.value = getNotes()[rt.getActiveId()].estudios;
  rt.onboardingAdvanceAfterSend();
  rt.showToast("Fecha anterior guardada + nuevos labs agregados \u2713", "success");
  rt.setMedTabAttention(true);
  rt.switchInnerTab("notas");
}
function showLabConflictModal(newLines, existingDate) {
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "lab-conflict-backdrop";
  backdrop.innerHTML = '<div class="lab-conflict-modal"><h3>Los estudios ya tienen datos</h3><p>El bloque reciente ya tiene labs del <strong>' + esc(existingDate) + '</strong>. \xBFQu\xE9 hago con los nuevos labs?</p><div class="lab-conflict-actions"><button class="btn-conflict-primary" id="btn-conflict-move">\u{1F4CB} Mover anterior + agregar reciente<br><span style="font-size:11px;font-weight:400;opacity:0.8;">Los labs actuales pasan al bloque anterior y los nuevos quedan como recientes</span></button><button class="btn-conflict-secondary" id="btn-conflict-replace">\u{1F504} Reemplazar fecha reciente<br><span style="font-size:11px;font-weight:400;opacity:0.7;">Los labs actuales se borran, se escriben los nuevos</span></button><button class="btn-conflict-cancel" id="btn-conflict-cancel">Cancelar</button></div></div>';
  document.body.appendChild(backdrop);
  document.getElementById("btn-conflict-move").onclick = function() {
    document.body.removeChild(backdrop);
    insertLabsAsAnteriorThenRecent(newLines);
  };
  document.getElementById("btn-conflict-replace").onclick = function() {
    document.body.removeChild(backdrop);
    var activeLab = labPanelBridge.getActiveLab();
    if (!getNotes()[rt.getActiveId()]) getNotes()[rt.getActiveId()] = {};
    pushLabHistory(
      rt.getActiveId(),
      activeLab.resLabs,
      activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : "",
      activeLab.patient && activeLab.patient.hora ? activeLab.patient.hora : "",
      activeLab.sourceText || "",
      activeLab.bhExtras,
      activeLab.refsBySection
    );
    finalizeLabHistoryImport(rt.getActiveId());
    persistClinicalState({ immediate: true });
    rt.refreshTendenciasOrCultivosPanel();
    renderLabHistoryPanel();
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el) el.value = getNotes()[rt.getActiveId()].estudios;
    rt.onboardingAdvanceAfterSend();
    rt.showToast("Fecha reciente reemplazada \u2713", "success");
    rt.setMedTabAttention(true);
    rt.switchInnerTab("notas");
  };
  document.getElementById("btn-conflict-cancel").onclick = function() {
    document.body.removeChild(backdrop);
  };
}
function toastCitoquimInterpFromResult(result) {
  if (!result || !result.resLabs || !result.resLabs.length) return;
  result.resLabs.forEach(function(chunk) {
    var isInterp = rt.isCitoquimInterpretacionResLabChunk && rt.isCitoquimInterpretacionResLabChunk(chunk) || rt.isAscitisInterpretacionResLabChunk(chunk);
    if (!isInterp) return;
    var msg = rt.citoquimInterpretacionBody_ ? rt.citoquimInterpretacionBody_(chunk) : rt.ascitisInterpretacionBody_(chunk);
    if (msg) rt.showToast(msg, "warn");
  });
}
function finalizeBulkLabPaste(text, blocks, totalOkReports, opts) {
  var quickOut = rt.getLabOutputPrefs().quickLabOutput;
  var processable = filterProcessableBulkBlocks(blocks);
  var storeSummary = processable.length ? storeProcessableBulkBlocks(blocks, processable, opts) : {
    storedSets: 0,
    mergedSets: 0,
    skippedDupes: 0,
    skippedBlocks: blocks.length - processable.length,
    storedByPatient: {}
  };
  if (!processable.length) toastNoMatchingPatients(blocks, quickOut);
  var displayPick = resolveBulkDisplayPick(blocks, processable, text);
  if (!displayPick || !displayPick.result) {
    rt.showToast("No se pudo interpretar el laboratorio pegado", "error");
    notifyTourAfterBulkLabStore(blocks, processable.length > 0);
    return;
  }
  var displayResult = displayPick.result;
  displayResult.sourceText = displayPick.reportText || text;
  applyBulkLabPatientSwitch(displayPick, displayResult, processable, applyLabPastePatientResolution);
  bumpLabHistoryRevision(rt.getActiveId());
  labPanelBridge.renderOutput(displayResult);
  toastCitoquimInterpFromResult(displayResult);
  rt.renderDiagramas(displayResult.resLabs);
  syncBulkLabHistorySelection(rt.getActiveId(), displayResult, processable);
  showBulkLabPasteSummaryToast(
    isMultiBulkLabPaste(blocks, totalOkReports, processable),
    storeSummary,
    processable,
    blocks,
    quickOut,
    displayResult
  );
  clearLabInputAfterSuccessfulParse();
  closeLabPasteModal();
  notifyTourAfterBulkLabStore(blocks, true);
  if ((storeSummary.storedSets > 0 || storeSummary.mergedSets > 0) && storeSummary.storedByPatient) {
    void autosendLabsEventualidadForStored(storeSummary.storedByPatient, {
      showToast: function(msg, type) {
        rt.showToast(msg, type);
      }
    });
  }
}

export {
  buildTableTsv,
  copyTableText,
  copyTableModelAsPng2 as copyTableModelAsPng,
  copyChartPng,
  parseSomeTablesFromSources,
  registerLabSomeTablesModalRuntime,
  syncLabSomeTablesBtn,
  openLabSomeTablesModal,
  closeLabSomeTablesModal,
  openLabPasteModal,
  closeLabPasteModal,
  openLabHistoryDedupeReview,
  findDisplayLabHistorySetId,
  consolidateLabHistoryByDayAndTipo,
  pushExternalLabHistory,
  applyDriveImportLabSets,
  finalizeLabHistoryImport,
  clearLabInputAfterSuccessfulParse,
  limpiarReporte,
  openLabPatientPicker,
  copiarLabsAlPortapapeles,
  enviarLabsANota,
  insertLabPatientSeparator,
  finalizeBulkLabPaste
};
//# sourceMappingURL=/js/chunks/chunk-UWLXNLAN.js.map
