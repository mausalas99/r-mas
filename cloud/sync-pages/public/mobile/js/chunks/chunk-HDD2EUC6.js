import {
  computeIoBalanceFromIngEgr,
  gluPointMs,
  ioDiuresisForBalance,
  ioNumericEgressTotal,
  isGluPointInRegistroWindow,
  isIoNumericValue,
  sortGlucometriasChronologically
} from "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  compareIso
} from "/mobile/js/chunks/chunk-WAILSXBQ.js";

// public/js/med-receta-catalog.mjs
var MAX_CUSTOM_TOKENS_PER_CAT = 400;
var MAX_CUSTOM_TOKEN_LEN = 120;
var MAX_CUSTOM_ACCENTS = 500;
var _catalogOverlay = {
  accents: {},
  soapTokens: { vasop: [], abx: [], analgesia: [], antihta: [] }
};
function sanitizeAccentMap(raw) {
  var out = /* @__PURE__ */ Object.create(null);
  if (!raw || typeof raw !== "object") return out;
  var n = 0;
  for (var k in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    if (n >= MAX_CUSTOM_ACCENTS) break;
    var key = String(k || "").trim().toUpperCase().replace(/\s+/g, " ");
    if (!key) continue;
    var val = String(raw[k] == null ? "" : raw[k]).trim();
    if (!val) continue;
    if (val.length > 80) val = val.slice(0, 80);
    out[key] = val;
    n += 1;
  }
  return out;
}
function sanitizeTokenList(arr) {
  if (!Array.isArray(arr)) return [];
  var out = [];
  var seen = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < arr.length && out.length < MAX_CUSTOM_TOKENS_PER_CAT; i += 1) {
    var t = String(arr[i] || "").trim();
    if (t.length > MAX_CUSTOM_TOKEN_LEN) t = t.slice(0, MAX_CUSTOM_TOKEN_LEN);
    if (!t) continue;
    var k = t.toUpperCase();
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(t);
  }
  return out;
}
function applyMedCatalogOverlay(raw) {
  var o = raw && typeof raw === "object" ? raw : {};
  var soap = o.soapTokens && typeof o.soapTokens === "object" ? o.soapTokens : {};
  _catalogOverlay = {
    accents: sanitizeAccentMap(o.accents),
    soapTokens: {
      vasop: sanitizeTokenList(soap.vasop),
      abx: sanitizeTokenList(soap.abx),
      analgesia: sanitizeTokenList(soap.analgesia),
      antihta: sanitizeTokenList(soap.antihta)
    }
  };
}
function getMedCatalogAccentMap() {
  return _catalogOverlay.accents;
}
function getMedCatalogSoapTokens() {
  return _catalogOverlay.soapTokens;
}

// public/js/med-receta-util.mjs
function trimStr(v) {
  return String(v == null ? "" : v).trim();
}

// public/js/med-receta-dates.mjs
function normalizeDiaMarkerText(s) {
  return String(s == null ? "" : s).replace(/\u2217/g, "*").replace(/\u204E/g, "*").replace(/\uFF0A/g, "*").replace(/\u00B7/g, " ");
}
function stripDiaMarkersFromDosis(dosisPart) {
  var t = normalizeDiaMarkerText(String(dosisPart || ""));
  return trimStr(
    t.replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, "").replace(/\s+/g, " ")
  );
}
function parseFechaDMYFromTimestampCell(cell) {
  var t = trimStr(cell);
  var m = t.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return m ? m[1] : "";
}
function extractDiaTratamiento(dosisRaw) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  var m = t.match(/DIA\s*#\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
function parseFechaDMYToLocalDate(fechaDMY) {
  var t = trimStr(fechaDMY);
  var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  var day;
  var mon;
  var y;
  if (m) {
    day = parseInt(m[1], 10);
    mon = parseInt(m[2], 10) - 1;
    y = parseInt(m[3], 10);
  } else {
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    y = parseInt(m[1], 10);
    mon = parseInt(m[2], 10) - 1;
    day = parseInt(m[3], 10);
  }
  if (y < 100) y += 2e3;
  var d = new Date(y, mon, day);
  if (d.getFullYear() !== y || d.getMonth() !== mon || d.getDate() !== day) return null;
  return d;
}
function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function calendarDaysSinceFechaDMY(fechaDMY, refDate) {
  var start = parseFechaDMYToLocalDate(fechaDMY);
  if (!start) return 0;
  var ref = refDate ? startOfLocalDay(refDate) : startOfLocalDay(/* @__PURE__ */ new Date());
  var diff = Math.round((ref.getTime() - start.getTime()) / 864e5);
  return diff > 0 ? diff : 0;
}
function advanceDiaInMedSoapText(text, dayOffset) {
  var off = parseInt(dayOffset, 10);
  if (!Number.isFinite(off) || off <= 0 || text == null || !String(text).trim()) {
    return trimStr(text);
  }
  return String(text).replace(/\bD[IÍ]A\s*#?\s*(\d+)\b/gi, function(_m, n) {
    return "DIA " + (parseInt(n, 10) + off);
  });
}
function advanceAbxMedTextForManejoDate(text, fechaActualizacion, refDate) {
  var offset = calendarDaysSinceFechaDMY(fechaActualizacion, refDate);
  return advanceDiaInMedSoapText(text, offset);
}
function effectiveDiaTratamiento(baseDia, fechaActualizacion, refDate) {
  if (baseDia == null || !Number.isFinite(baseDia)) return null;
  var fecha = trimStr(fechaActualizacion);
  if (!fecha) return baseDia;
  return baseDia + calendarDaysSinceFechaDMY(fecha, refDate);
}
function applyDiaToken(text, dia) {
  if (dia == null || !Number.isFinite(dia)) return text;
  if (/\bD[IÍ]A\s*#?\s*\d+\b/i.test(text)) {
    return String(text).replace(/\bD[IÍ]A\s*#?\s*\d+\b/gi, "DIA " + dia);
  }
  return text;
}
function recetaItemMatchesAbxLine(line, item) {
  if (!item || item.suspendido || item.diaTratamiento == null) return false;
  var token = String(item.nombreRaw || "").trim().split(/\s+/)[0];
  return token.length >= 4 && line.toUpperCase().indexOf(token.toUpperCase()) !== -1;
}
function recetaItemForAbxLine(line, items) {
  var list = Array.isArray(items) ? items : [];
  for (var i = 0; i < list.length; i += 1) {
    if (recetaItemMatchesAbxLine(line, list[i])) return list[i];
  }
  return null;
}
function rewriteAbxDisplayText(text, fechaActualizacion, recetaItems, refDate) {
  var base = trimStr(text);
  if (!base) return base;
  var fecha = trimStr(fechaActualizacion);
  return base.split(" | ").map(function(part) {
    var item = recetaItemForAbxLine(part, recetaItems);
    if (item) return applyDiaToken(part, effectiveDiaTratamiento(item.diaTratamiento, fecha, refDate));
    return fecha ? advanceAbxMedTextForManejoDate(part, fecha, refDate) : part;
  }).join(" | ");
}

// public/js/med-receta-diet.mjs
function normalizeNutrientText(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
function isParenteralNutritionText(text) {
  var t = normalizeNutrientText(text);
  if (!t) return false;
  if (/\bPARENTERAL\b/.test(t)) return true;
  if (/\bNUTRICION\s+PARENTERAL\b/.test(t)) return true;
  if (/\bNPT\b/.test(t)) return true;
  if (/\bKAVIBEN\b/.test(t)) return true;
  if (/\bSMOFKABIVEN\b/.test(t)) return true;
  if (/\bOLICLINOMEL\b/.test(t)) return true;
  return false;
}
function parenteralProductLabel(text) {
  var t = normalizeNutrientText(text);
  if (/\bKAVIBEN\b/.test(t)) return "KAVIBEN";
  if (/\bSMOFKABIVEN\b/.test(t)) return "SMOFKABIVEN";
  if (/\bOLICLINOMEL\b/.test(t)) return "OLICLINOMEL";
  if (/\bNUTRICION\s+PARENTERAL\s+TOTAL\b/.test(t)) return "NPT calculada";
  if (/\bNUTRICION\s+PARENTERAL\s+CENTRAL\b/.test(t)) return "NPT central";
  if (/\bNUTRICION\s+PARENTERAL\b/.test(t)) return "NPT";
  return "";
}
function isNutritionMedicationItem(item) {
  if (!item || item.suspendido) return false;
  var nombre = normalizeNutrientText(item.nombreRaw);
  if (!nombre) return false;
  if (/\bNUTRICION\s+PARENTERAL\b/.test(nombre)) return true;
  if (/\bALIMENTACION\b/.test(nombre)) return true;
  if (/\bSUPLEMENTO\b/.test(nombre) && /\d+\s*ML\b/.test(nombre)) return true;
  var via = normalizeNutrientText(item.viaRaw);
  if (/\bSUPLEMENTO\b/.test(nombre) && /\b(?:GASTROSTOMIA|NASOGASTR|ENTER)/.test(via)) {
    return true;
  }
  return false;
}
function nutritionMedItemToDieta(item, lineIndex) {
  var nombre = normalizeNutrientText(item && item.nombreRaw);
  var blob = [item && item.nombreRaw, item && item.dosisRaw, item && item.frecuenciaRaw].map(trimStr).filter(Boolean).join(" ");
  var nutrients = extractDietNutrients(blob);
  var desc;
  if (/\bNUTRICION\s+PARENTERAL\b/.test(nombre)) {
    var product = parenteralProductLabel(blob);
    desc = product ? "PARENTERAL \u2014 " + product : "PARENTERAL";
  } else if (/\bSUPLEMENTO\b/.test(nombre)) {
    desc = "SUPLEMENTO";
  } else {
    desc = trimStr(item && item.nombreRaw);
  }
  var detalle = [item && item.viaRaw, item && item.dosisRaw, item && item.frecuenciaRaw].map(trimStr).filter(Boolean).join(" \xB7 ");
  return {
    id: "dieta-nutri-" + Date.now().toString(36) + "-" + (lineIndex == null ? 0 : lineIndex),
    descripcionRaw: desc,
    detalleRaw: detalle,
    kcal: nutrients.kcal,
    proteinG: nutrients.proteinG,
    suspendido: !!(item && item.suspendido)
  };
}
function parseProteinGrams(t) {
  var unit = "(?:GRS?|GRAMOS?|G)";
  var patterns = [
    new RegExp("(\\d+)\\s*" + unit + "\\s*(?:DE\\s+)?PROTEINAS?\\b"),
    new RegExp("PROTEINAS?\\s*(?:DE\\s+)?(\\d+)\\s*" + unit + "\\b"),
    new RegExp("(\\d+)\\s*" + unit + "\\s*(?:DE\\s+)?PROT\\b")
  ];
  for (var i = 0; i < patterns.length; i += 1) {
    var m = t.match(patterns[i]);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}
function extractDietNutrients(detalleRaw) {
  var t = normalizeNutrientText(trimStr(detalleRaw));
  var kcalM = t.match(/(\d+)\s*KCAL\b/);
  return {
    kcal: kcalM ? parseInt(kcalM[1], 10) : null,
    proteinG: parseProteinGrams(t)
  };
}
function isDietNutrientCell(s) {
  var t = normalizeNutrientText(trimStr(s));
  if (!t) return false;
  return /\d+\s*KCAL\b/.test(t) || /\bPROTEIN/.test(t) || /\d+\s*(?:GRS?|GRAMOS?|G)\s*(?:DE\s+)?PROT\b/.test(t);
}
function normalizeDietaCols(cols) {
  var c = cols.slice();
  while (c.length < 7) c.push("");
  var via = trimStr(c[3]);
  var next = trimStr(c[4]);
  if (isDietNutrientCell(via) && !isDietNutrientCell(next)) {
    var tail = next;
    var freq = "";
    var nw = trimStr(c[5]);
    if (/^NW$/i.test(tail)) nw = tail;
    else if (tail) freq = tail;
    return [c[0], c[1], c[2], "", via, freq, nw];
  }
  return c;
}
function dietNutrientBlobFromCols(cols) {
  var norm = normalizeDietaCols(cols);
  return [norm[2], norm[4], norm[5]].map(trimStr).filter(Boolean).join(" ");
}
function resolveDietaDescripcionRaw(cols, norm) {
  var primary = trimStr(cols[2]);
  if (primary && !isDietNutrientCell(primary)) return primary;
  var candidates = [trimStr(norm[2]), trimStr(norm[3])];
  for (var i = 0; i < candidates.length; i += 1) {
    var c = candidates[i];
    if (c && !isDietNutrientCell(c)) return c;
  }
  return primary;
}
function dietProposalFingerprint(merged) {
  return String(merged && merged.descripcion != null ? merged.descripcion : "").trim().toUpperCase() + "|" + (merged && merged.kcal != null ? String(merged.kcal) : "") + "|" + (merged && merged.proteinG != null ? String(merged.proteinG) : "");
}
function normalizeParenteralDietaItem(d) {
  if (!d) return d;
  var desc = trimStr(d.descripcionRaw).replace(/^\*+/, "");
  if (/^PARENTERAL\s*(?:[—\-]|·)\s*\S/.test(desc)) {
    return Object.assign({}, d, { descripcionRaw: desc });
  }
  var detalle = trimStr(d.detalleRaw);
  var blob = [desc, detalle].filter(Boolean).join(" ");
  if (!isParenteralNutritionText(blob)) return d;
  var nutrients = extractDietNutrients(blob);
  var product = parenteralProductLabel(blob);
  var next = Object.assign({}, d);
  next.descripcionRaw = product ? "PARENTERAL \u2014 " + product : "PARENTERAL";
  if (next.kcal == null && nutrients.kcal != null) next.kcal = nutrients.kcal;
  if (next.proteinG == null && nutrients.proteinG != null) next.proteinG = nutrients.proteinG;
  return next;
}
function dietaItemToMerged(d) {
  var normalized = normalizeParenteralDietaItem(d);
  var desc = trimStr(normalized && normalized.descripcionRaw);
  if (!desc) {
    var det = trimStr(normalized && normalized.detalleRaw);
    if (det && !isDietNutrientCell(det)) desc = det;
  }
  return {
    descripcion: desc,
    kcal: normalized && normalized.kcal != null ? normalized.kcal : null,
    proteinG: normalized && normalized.proteinG != null ? normalized.proteinG : null
  };
}
function dietCandidateFingerprint(merged) {
  return dietProposalFingerprint(merged);
}
function listDietCandidates(dietas) {
  var list = Array.isArray(dietas) ? dietas : [];
  var out = [];
  var seen = {};
  for (var i = 0; i < list.length; i += 1) {
    var d = list[i];
    if (!d || d.suspendido) continue;
    var merged = dietaItemToMerged(d);
    if (!trimStr(merged.descripcion) && merged.kcal == null && merged.proteinG == null) continue;
    var fp = dietCandidateFingerprint(merged);
    if (seen[fp]) continue;
    seen[fp] = true;
    var label = buildDietProposalText(merged);
    out.push({
      id: "diet-opt-" + i + "-" + fp.slice(0, 24),
      label,
      descripcion: merged.descripcion,
      kcal: merged.kcal,
      proteinG: merged.proteinG,
      source: String(d.id || "").indexOf("dieta-nutri-") === 0 ? "medicamentos" : "dietas"
    });
  }
  return out;
}
function mergeDietaItems(dietas) {
  var candidates = listDietCandidates(dietas);
  if (!candidates.length) return { descripcion: "", kcal: null, proteinG: null };
  if (candidates.length === 1) {
    return {
      descripcion: candidates[0].descripcion,
      kcal: candidates[0].kcal,
      proteinG: candidates[0].proteinG
    };
  }
  var parts = [];
  var kcal = null;
  var proteinG = null;
  for (var i = 0; i < candidates.length; i += 1) {
    if (candidates[i].descripcion) parts.push(candidates[i].descripcion);
    if (candidates[i].kcal != null) kcal = candidates[i].kcal;
    if (candidates[i].proteinG != null) proteinG = candidates[i].proteinG;
  }
  return { descripcion: parts.join(" \xB7 "), kcal, proteinG };
}
function collectDietasFromRecetaBlock(block) {
  var dietas = Array.isArray(block && block.dietas) ? block.dietas.map(normalizeParenteralDietaItem) : [];
  var items = Array.isArray(block && block.items) ? block.items : [];
  for (var i = 0; i < items.length; i += 1) {
    if (isNutritionMedicationItem(items[i])) {
      dietas.push(nutritionMedItemToDieta(items[i], i));
    }
  }
  return dietas;
}
function listDietCandidatesFromRecetaBlock(block) {
  return listDietCandidates(collectDietasFromRecetaBlock(block));
}
function buildDietProposalText(merged) {
  var base = trimStr(merged && merged.descripcion);
  var bits = [];
  if (merged && merged.kcal != null) bits.push(String(merged.kcal) + " kcal");
  if (merged && merged.proteinG != null) bits.push(String(merged.proteinG) + " g prot");
  if (!bits.length) return base;
  if (!base) return bits.join(", ");
  return base + " (" + bits.join(", ") + ")";
}

// public/js/med-receta-nombre.mjs
var ACCENT_FIRST_WORD = {
  LOSARTAN: "LOSART\xC1N",
  ONDANSETRON: "ONDANSETR\xD3N",
  SENOSIDOS: "SEN\xD3SIDOS"
};
function normalizeNombreForSoapClassify(nombreRaw) {
  var n = String(nombreRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  n = n.replace(/\bONDASETRON\b/g, "ONDANSETRON");
  return n;
}
function applyNombreAccents(n) {
  var table = Object.assign({}, ACCENT_FIRST_WORD, getMedCatalogAccentMap());
  var u = n.toUpperCase();
  for (var k in table) {
    if (Object.prototype.hasOwnProperty.call(table, k) && u.indexOf(k) === 0) {
      return table[k] + n.slice(k.length);
    }
  }
  return n;
}
function normalizeSpacesPct(s) {
  return s.replace(/\s+/g, " ").replace(/(\d)\s+%/g, "$1%");
}
function stripListaMarkers(nombre) {
  return trimStr(
    nombre.replace(/\s*\(\+\*\)\s*$/i, "").replace(/\s*\(\*\)\s*$/i, "").replace(/\s*\(\+\*\)/gi, "").replace(/\s*\(\*\)/gi, "")
  );
}
function expandSolInyClause(n) {
  return n.replace(/\bSOL INY\s+(\d+(?:[.,]\d+)?)\s*ML\b/gi, function(_full, ml, _off, str) {
    var idx = arguments[arguments.length - 2];
    var before = str.slice(0, idx);
    if (/\b50\s*%/i.test(before) && String(ml).replace(",", ".") === "50") {
      return "SOLUCI\xD3N INYECTABLE 50 ML";
    }
    return "SOLUCI\xD3N INYECTABLE";
  }).replace(/\bSOL INY\b/gi, "SOLUCI\xD3N INYECTABLE");
}
function expandNombrePresentacion(nombre) {
  var n = normalizeSpacesPct(stripListaMarkers(nombre));
  n = expandSolInyClause(n);
  n = n.replace(/\bCOMPRIMIDO\b/gi, "TABLETA");
  n = n.replace(/\bCAPSULA\b/gi, "C\xC1PSULA");
  n = n.replace(/\bCAPSULAS\b/gi, "C\xC1PSULAS");
  n = n.replace(/\bJARABE\s+\d+\s*ML\b/gi, "JARABE");
  n = n.replace(/\bGEL\s+\d+\s*ML\b/gi, "GEL");
  var m = n.match(/^(POLIETILENGLICOL\s+3350)\s+POLVO\s+(\d+\s*G)\s*$/i);
  if (m) {
    return normalizeSpacesPct(m[1] + " " + m[2] + " POLVO");
  }
  return normalizeSpacesPct(n);
}
function normalizeVia(viaRaw) {
  var v = trimStr(viaRaw).toUpperCase();
  if (v === "VIA ORAL") return "V\xCDA ORAL";
  if (v === "VIA INTRAVENOSA") return "V\xCDA INTRAVENOSA";
  if (v === "VIA SUBCUTANEA") return "V\xCDA SUBCUT\xC1NEA";
  return viaRaw;
}
function verbForVia(viaNorm) {
  if (viaNorm === "V\xCDA ORAL") return "TOMAR";
  if (viaNorm === "V\xCDA SUBCUT\xC1NEA") return "APLICAR";
  return "ADMINISTRAR";
}
function normalizeFrecuencia(fr) {
  var t = trimStr(fr);
  t = t.replace(/\bHRS\b/gi, "HORAS");
  t = t.replace(/\bHR\b/gi, "HORA");
  return t;
}

// public/js/insulin-pump-some-detect.mjs
var BOMBA_ALGORITMO_RE = /BOMBA\s+(?:EN\s+)?ALGORITMO\s*(\d)/i;
var INSULIN_IV_RE = /\bINSULINA\b/i;
var IV_VIA_RE = /\b(?:VIA\s+)?INTRAVENOSA\b|\bIV\b/i;
function parseInsulinPumpAlgorithmFromText(text) {
  var m = String(text || "").match(BOMBA_ALGORITMO_RE);
  if (!m) return null;
  var n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 4) return null;
  return n;
}
function isInsulinIvMedicationItem(item) {
  if (!item || item.suspendido) return false;
  var nombre = String(item.nombreRaw || "");
  if (!INSULIN_IV_RE.test(nombre)) return false;
  var via = String(item.viaRaw || "");
  return IV_VIA_RE.test(via) || /\bINTRAVENOSA\b/i.test(via);
}
function detectInsulinPumpAlgorithmFromRecetaItems(items) {
  var list = Array.isArray(items) ? items : [];
  var algorithm = null;
  var hasInsulinIv = false;
  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    if (!it || typeof it !== "object" || it.suspendido) continue;
    if (isInsulinIvMedicationItem(it)) hasInsulinIv = true;
    var blob = [it.nombreRaw, it.dosisRaw, it.frecuenciaRaw, it.viaRaw].join(" ");
    var alg = parseInsulinPumpAlgorithmFromText(blob);
    if (alg != null) algorithm = alg;
  }
  if (algorithm != null && hasInsulinIv) return algorithm;
  return null;
}
function detectInsulinPumpAlgorithmFromRecetaBlock(block) {
  if (!block) return null;
  var fromItems = detectInsulinPumpAlgorithmFromRecetaItems(block.items);
  if (fromItems != null) return fromItems;
  if (Array.isArray(block.items) && block.items.length) return null;
  var raw = String(block.pasteRaw || "");
  if (!raw.trim()) return null;
  return detectInsulinPumpAlgorithmFromRecetaItems(parseIndicacionesPaste(raw).items);
}
function patientHasInsulinPumpInReceta(block) {
  return detectInsulinPumpAlgorithmFromRecetaBlock(block) != null;
}
function formatInsulinPumpAlgoritmoLabel(algorithmNumber) {
  var n = Number(algorithmNumber);
  if (!Number.isFinite(n) || n < 1 || n > 4) return "";
  return "BOMBA DE INSULINA EN ALGORITMO " + n;
}
function formatInsulinPumpAlgorithmPill(algorithmNumber) {
  var n = Number(algorithmNumber);
  if (!Number.isFinite(n) || n < 1 || n > 4) return "";
  return "ALGORITMO " + n;
}
function isInsulinPumpCarrierMedicationItem(item, allItems) {
  if (!item || typeof item !== "object" || /** @type {{ suspendido?: boolean }} */
  item.suspendido) {
    return false;
  }
  if (isInsulinIvMedicationItem(
    /** @type {Parameters<typeof isInsulinIvMedicationItem>[0]} */
    item
  )) {
    return false;
  }
  if (detectInsulinPumpAlgorithmFromRecetaItems(allItems) == null) return false;
  var blob = [
    /** @type {{ nombreRaw?: unknown, dosisRaw?: unknown, frecuenciaRaw?: unknown, viaRaw?: unknown }} */
    item.nombreRaw,
    /** @type {{ dosisRaw?: unknown }} */
    item.dosisRaw,
    /** @type {{ frecuenciaRaw?: unknown }} */
    item.frecuenciaRaw,
    /** @type {{ viaRaw?: unknown }} */
    item.viaRaw
  ].join(" ");
  return parseInsulinPumpAlgorithmFromText(blob) != null;
}
function insulinPumpAlgorithmForMedicationItem(items, item) {
  if (!isInsulinIvMedicationItem(item)) return null;
  return detectInsulinPumpAlgorithmFromRecetaItems(items);
}
function insulinPumpMedLabelHtml(algorithmNumber, escFn) {
  var pill = formatInsulinPumpAlgorithmPill(algorithmNumber);
  if (!pill) return escFn("BOMBA DE INSULINA");
  return escFn("BOMBA DE INSULINA") + ' <span class="med-insulin-pump-alg-pill">' + escFn(pill) + "</span>";
}

// public/js/med-receta-tb-combo.mjs
function dosisBeforeSlash(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf("//");
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}
var RHZE_PARTS_RE = /\bRIFAMPICINA\b.*\bISONIAZIDA\b.*\bPIRAZINAMIDA\b.*\b(?:ETAMBUTOL|ETHAMBUTOL)\b/i;
var WEEKDAY_TOKEN_RE = /\b(?:LOS\s+)?(LUNES|MARTES|MIERCOLES|MIÉRCOLES|MIE|JUEVES|JUE|VIERNES|VIE|SABADO|SÁBADO|SAB|DOMINGO|DOM|LUN|MAR)\b/gi;
var WEEKDAY_ABBR = {
  LUNES: "LUN",
  LUN: "LUN",
  MARTES: "MAR",
  MAR: "MAR",
  MIERCOLES: "MIE",
  MI\u00C9RCOLES: "MIE",
  MIE: "MIE",
  JUEVES: "JUE",
  JUE: "JUE",
  VIERNES: "VIE",
  VIE: "VIE",
  SABADO: "SAB",
  S\u00C1BADO: "SAB",
  SAB: "SAB",
  DOMINGO: "DOM",
  DOM: "DOM"
};
function isRhzeComboMedicationItem(item) {
  if (!item) return false;
  var n = String(item.nombreRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return RHZE_PARTS_RE.test(n);
}
function extractWeekdayScheduleLabel(dosisRaw) {
  var raw = String(dosisRaw || "");
  var comment = "";
  var slashIdx = raw.indexOf("//");
  if (slashIdx >= 0) comment = raw.slice(slashIdx + 2);
  else comment = raw;
  comment = comment.replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, " ");
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  var m;
  WEEKDAY_TOKEN_RE.lastIndex = 0;
  while ((m = WEEKDAY_TOKEN_RE.exec(comment)) !== null) {
    var token = String(m[1] || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var abbr = WEEKDAY_ABBR[token];
    if (!abbr || seen[abbr]) continue;
    seen[abbr] = 1;
    out.push(abbr);
  }
  return out.length ? out.join("-") : null;
}
function extractRhzeTabletCount(dosisRaw) {
  var left = dosisBeforeSlash(dosisRaw);
  var m = String(left || "").match(/(\d+)\s*TABLETAS?\b/i);
  if (!m) return "";
  var n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return "";
  return String(n) + " TABLETAS";
}
function formatRhzeComboSoapShort(item, opts) {
  var parts = ["DOTBAL"];
  var tablets = extractRhzeTabletCount(item.dosisRaw);
  if (tablets) parts.push(tablets);
  var weekday = extractWeekdayScheduleLabel(item.dosisRaw);
  if (weekday) parts.push(weekday);
  else parts.push("C/24H");
  var dia = item.diaTratamiento != null ? effectiveDiaTratamiento(item.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate) : null;
  if (dia != null) parts.push("DIA " + dia);
  return trimStr(parts.join(" "));
}

// public/js/med-receta-soap-some-map.mjs
var FORM_SKIP = /* @__PURE__ */ new Set([
  "TABLETA",
  "COMPRIMIDO",
  "CAPSULA",
  "GRAGEA",
  "SOLUCION",
  "SUSPENSION",
  "CREMA",
  "UNGUENTO",
  "JARABE",
  "POLVO",
  "OVULO",
  "PARCHE",
  "BOLSA",
  "SUPOSITORIO",
  "AEROSOL",
  "SPRAY",
  "GRANULADO",
  "EFERV",
  "SUPLEMENTO",
  "FORMULA",
  "ALIMENTACION",
  "NUTRICION",
  "PARENTERAL"
]);
var PHRASES = [
  ["VALPROATO DE MAGNESIO", "antiepilepticos"],
  ["VALPROATO SEMISODICO", "antiepilepticos"],
  ["ACIDO VALPROICO", "antiepilepticos"],
  ["SACUBITRILO VALSARTAN", "antihta"],
  ["MONONITRATO DE ISOSORBIDA", "antihta"],
  ["DINITRATO DE ISOSORBIDA", "antihta"],
  ["NITROPRUSIATO DE SODIO", "antihta"],
  ["CLORURO DE SODIO", "nm"],
  ["CLORURO DE CALCIO", "nm"],
  ["ACETATO DE SODIO", "nm"],
  ["BICARBONATO DE SODIO", "nm"],
  ["SULFATO FERROSO", "nm"],
  ["SULFATO DE PROTAMINA", "antidotos"],
  ["ACIDO FOLICO", "nm"],
  ["ACIDO FOLINICO", "antidotos"],
  ["ACIDO TRANEXAMICO", "nm"],
  ["ACIDO URSODESOXICOLICO", "nm"],
  ["ACIDO ASCORBICO", "nm"],
  ["ACIDO MICOFENOLICO", "nm"],
  ["ACIDO AMINOCAPROICO", "nm"],
  ["COMPLEJO DE PROTROMBINA", "transfusiones"],
  ["SEROALBUMINA HUMANA", "transfusiones"]
];
var BY_DEST = {
  abx: [
    "CEFEPIMA",
    "CEFALEXINA",
    "CEFALOTINA",
    "CEFIXIMA",
    "CEFTOLOZANO",
    "AVIBACTAM",
    "DICLOXACILINA",
    "DORIPENEM",
    "ANFOTERICINA",
    "COLISTIN",
    "BENCILPENICILINA",
    "BENZATINA",
    "VALGANCICLOVIR",
    "CLORANFENICOL",
    "CICLOSERINA",
    "BEDAQUILINA",
    "DELAMANID",
    "DAPSONA",
    "ESTREPTOMICINA",
    "ISONIAZIDA",
    "ETAMBUTOL",
    "PIRAZINAMIDA",
    "PROTEONAMIDA",
    "RIFAMICINA",
    "GEMIFLOXACINO",
    "GATIFLOXACINO",
    "TETRACICLINA",
    "OXITETRACICLINA",
    "TINIDAZOL",
    "TRINIDAZOL",
    "KETOCONAZOL",
    "MICONAZOL",
    "CLOTRIMAZOL",
    "TERBINAFINA",
    "NISTATINA",
    "ISOCONAZOL",
    "FUSIDATO",
    "ZANAMIVIR",
    "RIBAVIRINA",
    "NITAZOXANIDA",
    "ANTIMONIATO"
  ],
  analgesia: [
    "KETOROLACO",
    "CLONIXINATO",
    "FENAZOPIRIDINA",
    "METADONA",
    "LOXOPROFENO",
    "ETORICOXIB",
    "PARECOXIB",
    "NIMESULIDA"
  ],
  antiemeticos: [
    "DIFENIDOL",
    "APREPITANT",
    "FOSAPREPITANT",
    "DOLASETRON",
    "TROPISETRON",
    "DOMPERIDONA",
    "MECLIZINA",
    "DOXILAMINA"
  ],
  sedacion: [
    "ALPRAZOLAM",
    "BROMAZEPAM",
    "CLORAZEPATO",
    "TRIAZOLAM",
    "ZOLPIDEM",
    "LOFLAZEPATO",
    "CLOZAPINA",
    "ARIPIPRAZOL",
    "BREXPIPRAZOL",
    "ZIPRASIDONA",
    "ZUCLOPENTIXOL",
    "FLUPENTIXOL",
    "CLORPROMAZINA",
    "LEVOMEPROMAZINA",
    "PERFENAZINA",
    "SULPIRIDA",
    "AMISULPRIDA",
    "KETAMINA",
    "ETOMIDATO",
    "TIOPENTAL",
    "HIDROXIZINA"
  ],
  antiepilepticos: ["CLOBAZAM", "VIGABATRINA", "PRIMIDONA"],
  antiparkinsonianos: [
    "RASAGILINA",
    "ROTIGOTINA",
    "BROMOCRIPTINA",
    "CABERGOLINA"
  ],
  antidotos: [
    "FABOTERAPICO",
    "FABOTERICO",
    "MESNA",
    "SUGAMMADEX",
    "NALTREXONA",
    "DEFERASIROX",
    "DEXRAZOXANO",
    "AMIFOSTINA",
    "NOVEFAZOL"
  ],
  viaAerea: [
    "BENZONATATO",
    "ERDOSTEINA",
    "AMINOFILINA",
    "TEOFILINA",
    "MONTELUKAST",
    "DORNASA",
    "UMECLIDINIO",
    "VILANTEROL",
    "OLODATEROL",
    "GLICOPIRRONIO"
  ],
  vasop: ["LEVOSIMENDAN", "EFEDRINA"],
  antihta: [
    "FIMASARTAN",
    "METILDOPA",
    "PRAZOSINA",
    "APRESOLINA",
    "MONONITRATO",
    "ISOSORBIDA",
    "SACUBITRILO",
    "IVABRADINA",
    "BOSENTAN",
    "ALFUZOSINA"
  ],
  diuretico: [],
  anticoagulacion: ["PARNAPARINA", "ACENOCUMAROL"],
  antitromboticos: [
    "ABCIXIMAB",
    "TIROFIBAN",
    "ANAGRELIDA",
    "INDOBUFENO",
    "ELTROMBOPAG"
  ],
  antiarritmicos: ["DRONEDARONA"],
  estatinas: ["SIMVASTATINA"],
  transfusiones: ["SEROALBUMINA", "FILGRASTIM", "MOLGRAMOSTIM", "ROMIPLOSTIM"],
  nm: [
    "DAPAGLIFOZINA",
    "ALOGLUTAMOL",
    "BEZAFIBRATO",
    "FENOFIBRATO",
    "EZETIMIBA",
    "GEMFIBROZILO",
    "CIPROFIBRATO",
    "PITAVASTATINA",
    "COLESTIRAMINA",
    "LOPERAMIDA",
    "LORATADINA",
    "CLORFENAMINA",
    "CETIRIZINA",
    "DESLORATADINA",
    "LEVOCETIRIZINA",
    "FEXOFENADINA",
    "EBASTINA",
    "ERITROPOYETINA",
    "CARBOXIMALTOSA",
    "DESIDUSTAT",
    "CISAPRIDA",
    "CINITAPRIDA",
    "ITOPRIDA",
    "MOSAPRIDA",
    "LEVOSULPIRIDA",
    "TRIMEBUTINA",
    "PINAVERINO",
    "PINAVERIO",
    "MEBEVERINA",
    "ALVERINA",
    "OXIBUTININA",
    "TOLTERODINA",
    "MIRABEGRON",
    "DUTASTERIDA",
    "LINAGLIPTINA",
    "VILDAGLIPTINA",
    "PIOGLITAZONA",
    "ACARBOSA",
    "GLIPIZIDA",
    "CANAGLIFLOZINA",
    "BARICITINIB",
    "TOCILIZUMAB",
    "SIROLIMUS",
    "LAMIVUDINA",
    "ABACAVIR",
    "TENOFOVIR",
    "EMTRICITABINA",
    "DOLUTEGRAVIR",
    "EFAVIRENZ",
    "RITONAVIR",
    "LOPINAVIR",
    "DARUNAVIR",
    "RALTEGRAVIR",
    "ATAZANAVIR",
    "ZIDOVUDINA",
    "BICTEGRAVIR",
    "NEVIRAPINA",
    "ADEMETIONINA",
    "LEVOCARNITINA",
    "ALENDRONATO",
    "DENOSUMAB",
    "CALCITRIOL",
    "COLECALCIFEROL",
    "TIAMAZOL",
    "FLUDROCORTISONA",
    "HIDROXICLOROQUINA",
    "MESALAZINA",
    "SULFASALAZINA",
    "OCTREOTIDA",
    "DESMOPRESINA",
    "ATRACURIO",
    "SUXAMETONIO",
    "PIRIDOSTIGMINA",
    "NEOSTIGMINA",
    "RIVASTIGMINA",
    "CEREBROLYSIN",
    "CITICOLINA",
    "BETAHISTINA",
    "CINARIZINA",
    "DIOSMINA",
    "PENTOXIFILINA",
    "SILDENAFIL",
    "MELATONINA",
    "MODAFINILO",
    "ATOMOXETINA",
    "ANFEBUTAMONA",
    "DESVENLAFAXINA",
    "VORTIOXETINA",
    "FLUVOXAMINA",
    "IMIPRAMINA",
    "MAPROTILINA",
    "MILNACIPRAN",
    "ALMAGATO",
    "MAGALDRATO",
    "URSODESOXICOLICO",
    "IBANDRONICO",
    "ZOLEDRONICO",
    "RISEDRONICO",
    "TRANEXAMICO",
    "ETAMSILATO",
    "FOLINATO",
    "SACARATO",
    "GLUTAMINA",
    "OLIGOELEMENTOS",
    "PANCREATINA",
    "ESPAVEN",
    "PLANTAGO",
    "PSYLLIUM",
    "PICOSULFATO",
    "LUBIPROSTONA",
    "RACECADOTRILO",
    "DIOSMECTITA",
    "SACCHAROMYCES",
    "TRIMETAZIDINA",
    "NIMODIPINO",
    "LANSOPRAZOL",
    "MISOPROSTOL",
    "OXITOCINA",
    "CARBETOCINA",
    "MEDROXIPROGESTERONA",
    "PROGESTERONA",
    "DIENOGEST",
    "TAMOXIFENO",
    "ANASTROZOL",
    "LETROZOL",
    "HIDROXICARBAMIDA"
  ]
};
var TOKEN_MAP = (function buildTokenMap(byDest) {
  const map = /* @__PURE__ */ Object.create(null);
  const keys = Object.keys(byDest);
  for (let i = 0; i < keys.length; i += 1) {
    const dest = keys[i];
    const list = byDest[dest];
    for (let j = 0; j < list.length; j += 1) {
      const tok = list[j];
      if (!map[tok]) map[tok] = dest;
    }
  }
  return map;
})(BY_DEST);
function isSuerosMedicationNombre(nombreRaw) {
  const n = String(nombreRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!n) return false;
  if (/\b(HARTMANN|RINGER)\b/.test(n)) return true;
  if (/\bAGUA INYECTABLE\b/.test(n)) return true;
  if (/\b(CLORURO DE SODIO|NACL)\b/.test(n) && /\b0\.9\b/.test(n)) return true;
  if (/\b(GLUCOSA|DEXTROSA)\b/.test(n) && /\b(5|10)\s*%/.test(n)) return true;
  return false;
}
function destFromPhrases(n) {
  for (let i = 0; i < PHRASES.length; i += 1) {
    const pair = PHRASES[i];
    if (n.indexOf(pair[0]) !== -1) return pair[1];
  }
  return "";
}
function destFromTokens(n) {
  const tokens = n.split(/[^A-Z]+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (!t || t.length < 5 || FORM_SKIP.has(t)) continue;
    const dest = TOKEN_MAP[t];
    if (dest) return dest;
  }
  return "";
}
function classifyBySomeCatalog(nNorm) {
  const n = String(nNorm || "");
  if (!n) return "";
  return destFromPhrases(n) || destFromTokens(n);
}

// public/js/med-receta-iv-oral-some.mjs
var ORAL_SOLIDS = {
  PARACETAMOL: [
    { mg: 500, form: "TABLETA", preferred: true },
    { mg: 750, form: "TABLETA" },
    { mg: 650, form: "TABLETA" },
    { mg: 160, form: "TABLETA" }
  ],
  ACETAMINOFEN: [{ mg: 500, form: "TABLETA", preferred: true }],
  KETOROLACO: [{ mg: 10, form: "TABLETA" }],
  OMEPRAZOL: [{ mg: 20, form: "C\xC1PSULA" }],
  PANTOPRAZOL: [{ mg: 40, form: "TABLETA" }],
  ESOMEPRAZOL: [{ mg: 40, form: "TABLETA" }],
  ONDANSETRON: [{ mg: 8, form: "TABLETA" }],
  METOCLOPRAMIDA: [{ mg: 10, form: "TABLETA" }],
  BUTILHIOSCINA: [{ mg: 10, form: "TABLETA" }],
  METRONIDAZOL: [{ mg: 400, form: "C\xC1PSULA" }],
  CIPROFLOXACINO: [{ mg: 500, form: "TABLETA", preferred: true }, { mg: 1e3, form: "TABLETA" }],
  LEVOFLOXACINO: [{ mg: 500, form: "TABLETA" }, { mg: 750, form: "TABLETA" }],
  MOXIFLOXACINO: [{ mg: 400, form: "TABLETA" }],
  LINEZOLID: [{ mg: 600, form: "TABLETA" }],
  CLARITROMICINA: [{ mg: 500, form: "TABLETA" }],
  CLINDAMICINA: [{ mg: 300, form: "C\xC1PSULA" }],
  DOXICICLINA: [{ mg: 100, form: "C\xC1PSULA" }],
  FLUCONAZOL: [{ mg: 100, form: "C\xC1PSULA" }],
  ACICLOVIR: [{ mg: 200, form: "TABLETA" }],
  DEXAMETASONA: [{ mg: 4, form: "TABLETA" }, { mg: 0.5, form: "TABLETA" }],
  PREDNISONA: [{ mg: 5, form: "TABLETA" }, { mg: 20, form: "TABLETA" }, { mg: 50, form: "TABLETA" }],
  FUROSEMIDA: [{ mg: 40, form: "TABLETA" }, { mg: 20, form: "TABLETA" }],
  LEVETIRACETAM: [{ mg: 500, form: "TABLETA" }, { mg: 1e3, form: "TABLETA" }],
  TRAMADOL: [{ mg: 50, form: "C\xC1PSULA" }, { mg: 100, form: "C\xC1PSULA" }],
  IBUPROFENO: [{ mg: 400, form: "TABLETA" }, { mg: 600, form: "TABLETA" }, { mg: 800, form: "TABLETA" }],
  DICLOFENACO: [{ mg: 50, form: "TABLETA" }, { mg: 100, form: "TABLETA" }],
  HALOPERIDOL: [{ mg: 5, form: "TABLETA" }, { mg: 10, form: "TABLETA" }],
  FENITOINA: [{ mg: 100, form: "C\xC1PSULA" }],
  ACIDOVALPROICO: [{ mg: 250, form: "C\xC1PSULA" }]
};
var STEM_ALIAS = {
  ACETAMINOFEN: "PARACETAMOL",
  DIPIRONA: "METAMIZOL",
  KETOROLAC: "KETOROLACO",
  VALPROATO: "ACIDOVALPROICO"
};
function catalogKeyFromNombre(nNorm) {
  const n = String(nNorm || "");
  const keys = Object.keys(ORAL_SOLIDS);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === "ACIDOVALPROICO") {
      if (/\b(ACIDO\s+VALPROICO|VALPROATO)\b/.test(n)) return key;
      continue;
    }
    if (new RegExp("\\b" + key + "\\b").test(n)) return STEM_ALIAS[key] || key;
  }
  if (/\bKETOROLAC/.test(n)) return "KETOROLACO";
  if (/\bVALPROATO\b/.test(n)) return "ACIDOVALPROICO";
  return "";
}
function pickOralPackFromStrengths(doseMg, strengths) {
  const list = Array.isArray(strengths) ? strengths : [];
  let best = null;
  let bestScore = 1e9;
  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    if (!s || !(s.mg > 0)) continue;
    const units = doseMg / s.mg;
    if (units < 1 || units > 4 || Math.abs(units - Math.round(units)) > 1e-6) continue;
    const u = Math.round(units);
    const score = (s.preferred ? 0 : 1) + u;
    if (score < bestScore) {
      bestScore = score;
      best = { unitMg: s.mg, units: u, form: s.form };
    }
  }
  return best;
}
function pickSomeOralPack(nNorm, doseMg) {
  const key = catalogKeyFromNombre(nNorm);
  if (!key || !ORAL_SOLIDS[key]) return null;
  return pickOralPackFromStrengths(doseMg, ORAL_SOLIDS[key]);
}
function pluralizeOralForm(form, units) {
  const f = String(form || "TABLETA");
  if (units === 1) return f;
  if (f === "C\xC1PSULA") return "C\xC1PSULAS";
  if (f.endsWith("S")) return f;
  return f + "S";
}

// public/js/med-receta-iv-oral.mjs
function dosisBeforeSlash2(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf("//");
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}
function isIvRoute(viaRaw) {
  return /\bINTRAVENOS/i.test(trimStr(viaRaw));
}
function isContinuousInfusionItem(item) {
  var parsed = dosisBeforeSlash2(item && item.dosisRaw).toUpperCase();
  if (/VEL\.?\s*INF|MCG\s*\/\s*(?:MIN|HORA|H)\b|MG\s*\/\s*(?:MIN|HORA|H)\b|CC\s*\/\s*(?:HORA|H)\b/.test(parsed)) {
    return true;
  }
  var nombre = normalizeNombreForSoapClassify(item && item.nombreRaw);
  return /\b(NORADRENALINA|NOREPINEFRINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|FENILEFRINA|EPINEFRINA|ADRENALINA|NITROPRUSIATO|NITROGLICERINA)\b/.test(
    nombre
  );
}
function shouldSkipIvToOral(item) {
  if (!item || item.suspendido) return true;
  if (!isIvRoute(item.viaRaw)) return true;
  if (isContinuousInfusionItem(item)) return true;
  var nombre = normalizeNombreForSoapClassify(item.nombreRaw);
  if (/\b(DEXTROSA|GLUCOSA|INSULINA|HEPARINA|MEROPENEM|ERTAPENEM|IMIPENEM|VANCOMICINA|TEICOPLANINA|PIPERACILINA|CEFTRIAX|CEFEPIM|CEFTAZID|AMIKACINA|GENTAMICINA|TOBRAMICINA|FENTANILO|PROPOFOL|MIDAZOLAM|KETAMINA|CLORURO|POTASIO|MAGNESIO|FOSFATO|BICARBONATO|ALBUMINA|CONCENTRADO\s+ERITROCITARIO|PLASMA|PLAQUETAS|FIBRINOGENO|ROCURONIO|CISATRACURIO|VECURONIO|SUCCINILCOLINA)\b/.test(
    nombre
  )) {
    return true;
  }
  if (isSuerosMedicationNombre(item.nombreRaw)) return true;
  return false;
}
function parseFixedDoseMg(dosisRaw) {
  var d = dosisBeforeSlash2(dosisRaw).toUpperCase().replace(",", ".");
  var g = d.match(/^(\d+(?:\.\d+)?)\s*G$/);
  if (g) return { mg: parseFloat(g[1]) * 1e3, text: g[1].replace(/\.0$/, "") + " G" };
  var mg = d.match(/^(\d+(?:\.\d+)?)\s*MG$/);
  if (mg) return { mg: parseFloat(mg[1]), text: mg[1].replace(/\.0$/, "") + " MG" };
  return null;
}
function formatMgLabel(mg) {
  if (mg >= 1e3 && mg % 1e3 === 0) return mg / 1e3 + " G";
  var n = Number(mg);
  return (Number.isInteger(n) ? String(n) : String(n).replace(/\.0$/, "")) + " MG";
}
function displayDrugStem(nombreRaw) {
  var n = trimStr(nombreRaw).toUpperCase();
  var cut = n.search(
    /\s+(?:\d+\s*%|\d+\/\d+|\d+(?:[.,]\d+)?\s*(?:MG|G|ML|MCG|UI|U)\b|\bSOL(?:UCI[ÓO]N)?\s+INY\b|\bTABLETAS?\b|\bC[ÁA]PSULAS?\b|\bJARABE\b|\bGEL\b|\bPOLVO\b)/i
  );
  if (cut > 0) n = trimStr(n.slice(0, cut));
  return n.replace(/\s+/g, " ");
}
function withPrnTail(dosisRaw, coreDose) {
  var raw = trimStr(dosisRaw);
  var idx = raw.indexOf("//");
  if (idx === -1) return coreDose;
  return coreDose + " //" + trimStr(raw.slice(idx + 2));
}
function oralItemFrom(item, stem, oralMg, form, units, unitMg) {
  var doseLabel = formatMgLabel(oralMg);
  var packUnits = units > 0 ? units : 1;
  var packUnitMg = unitMg > 0 ? unitMg : oralMg;
  return Object.assign({}, item, {
    nombreRaw: stem + " " + formatMgLabel(packUnitMg) + " " + form,
    viaRaw: "VIA ORAL",
    dosisRaw: withPrnTail(item.dosisRaw, doseLabel),
    oralEquiv: { units: packUnits, unitMg: packUnitMg, form }
  });
}
var KNOWN_ORAL_SWITCH_RE = /\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|ONDANSETRON|GRANISETRON|METOCLOPRAMIDA|DOMPERIDONA|METRONIDAZOL|DEXAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|FUROSEMIDA|LEVETIRACETAM|VALPROATO|ACIDO\s+VALPROICO|TRAMADOL|IBUPROFENO|DICLOFENACO|NAPROXENO|MELOXICAM|CELECOXIB|CIPROFLOXACINO|LEVOFLOXACINO|MOXIFLOXACINO|LINEZOLID|CLARITROMICINA|AZITROMICINA|DOXICICLINA|MINOCICLINA|CLINDAMICINA|FLUCONAZOL|ACICLOVIR|HALOPERIDOL|FENITOINA|BUTILHIOSCINA)\b/;
function steroidOralPrednisoneMg(nombre, doseMg) {
  if (/\bHIDROCORTISONA\b/.test(nombre)) {
    if (doseMg >= 100) return 25;
    if (doseMg >= 50) return 12.5;
    return 5;
  }
  if (/\bMETILPREDNISOLONA\b/.test(nombre)) {
    if (doseMg >= 40) return 50;
    if (doseMg >= 20) return 25;
    return 10;
  }
  return 0;
}
function clinicalOralTarget(nombre, doseMg, stem) {
  if (/\bKETOROLAC/.test(nombre)) {
    return { stem, mg: doseMg >= 15 ? 10 : doseMg };
  }
  if (/\bCIPROFLOXACINO\b/.test(nombre)) {
    return { stem, mg: doseMg >= 400 && doseMg < 500 ? 500 : doseMg };
  }
  if (/\bCLINDAMICINA\b/.test(nombre)) {
    return { stem, mg: doseMg >= 600 ? 300 : doseMg };
  }
  var pred = steroidOralPrednisoneMg(nombre, doseMg);
  if (pred) return { stem: "PREDNISONA", mg: pred };
  return null;
}
function resolveOralPack(nombre, oralMg, outStem, clinical) {
  var pack = pickSomeOralPack(nombre, oralMg) || pickSomeOralPack(outStem, oralMg);
  if (pack) return pack;
  if (clinical || KNOWN_ORAL_SWITCH_RE.test(nombre)) {
    return { unitMg: oralMg, units: 1, form: "TABLETA" };
  }
  return null;
}
function convertByDrugRules(item) {
  var nombre = normalizeNombreForSoapClassify(item.nombreRaw);
  var dose = parseFixedDoseMg(item.dosisRaw);
  if (!dose) return item;
  var stem = displayDrugStem(item.nombreRaw);
  var clinical = clinicalOralTarget(nombre, dose.mg, stem);
  var oralMg = clinical ? clinical.mg : dose.mg;
  var outStem = clinical ? clinical.stem : stem;
  var pack = resolveOralPack(nombre, oralMg, outStem, clinical);
  if (!pack) return item;
  return oralItemFrom(item, outStem, oralMg, pack.form, pack.units, pack.unitMg);
}
function applyIvToOralForEgreso(item, opts) {
  if (!item || opts && opts.ivOral === false) return item;
  if (shouldSkipIvToOral(item)) return item;
  return convertByDrugRules(item);
}

// public/js/med-receta-format.mjs
function dosisBeforeSlash3(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf("//");
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}
function expandSmashedInfusionDosis(s) {
  return String(s || "").replace(/DILUIREN/gi, " DILUIREN ").replace(/DILUIR\s*EN/gi, " DILUIR EN ").replace(/VEL\.?\s*INF\.?/gi, " VEL.INF ").replace(/(MCG|MG|G|ML|UI)(?=\/)/gi, "$1 ").replace(/(MCG|MG|G|ML|UI)(?=[A-Z])/gi, "$1 ").replace(/(CC)(?=\/)/gi, "$1 ").replace(/(CC)(?=\d)/gi, "$1 ").replace(/\s+/g, " ").trim();
}
function dosisForInfusionParse(dosisRaw) {
  var raw = trimStr(dosisRaw);
  if (!raw) return "";
  var left = dosisBeforeSlash3(raw);
  var after = raw.indexOf("//") === -1 ? "" : stripDiaMarkersFromDosis(raw.slice(raw.indexOf("//") + 2));
  return normalizeSpacesPct(expandSmashedInfusionDosis(left + " " + after)).toUpperCase();
}
function extractVelInfSegment(dosisParsed) {
  var m = String(dosisParsed || "").match(/VEL\.INF\s*:\s*(.+)$/i);
  return m ? trimStr(m[1]) : "";
}
function extractBolusBeforeDilution(dosisLeft) {
  var t = normalizeSpacesPct(expandSmashedInfusionDosis(dosisLeft)).toUpperCase();
  var cut = t.split(/\bDILUIREN\b|\bDILUIR\s+EN\b/i)[0];
  cut = trimStr(cut.replace(/\bVEL\.INF\b.*$/i, ""));
  var amount = cut.match(
    /(\d+(?:[.,]\d+)?)\s*(MCG\/(?:MIN|HORA|H)|MG\/(?:MIN|HORA|H)|MCG|MG|G|ML|UI|U)\b/i
  );
  return amount ? trimStr(amount[1] + " " + amount[2]).replace(/\s+/g, " ") : cut;
}
function compactRecetaDoseToken(dosePhrase) {
  var t = trimStr(dosePhrase).toUpperCase().replace(/\s+/g, " ");
  var rate = t.match(
    /^(\d+(?:[.,]\d+)?)\s*(MCG\/(?:MIN|HORA|H)|MG\/(?:MIN|HORA|H)|CC\/(?:HORA|H))$/i
  );
  if (rate) {
    return String(rate[1]).replace(",", ".") + " " + rate[2].replace(/\s+/g, "");
  }
  var grams = t.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);
  if (grams) return String(grams[1]).replace(",", ".") + " G";
  return t.replace(/(\d(?:[.,]\d+)?)\s*(MG|G|ML|MCG|UI|U)\b/gi, function(_m, n, u) {
    return String(n).replace(",", ".") + String(u).toUpperCase();
  }).replace(/\s+/g, "");
}
function extractVelRateDose_(vel, dosisRaw) {
  var matchers = [
    [/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i, " MCG/MIN"],
    [/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i, " MCG/HORA"],
    [/(\d+(?:[.,]\d+)?)\s*MG\s*\/\s*(?:HORA|H)\b/i, " MG/HORA"]
  ];
  for (var i = 0; i < matchers.length; i++) {
    var m = vel.match(matchers[i][0]);
    if (m) return compactRecetaDoseToken(m[1] + matchers[i][1]);
  }
  var ccHr = vel.match(/(\d+(?:[.,]\d+)?)\s*CC\s*\/\s*(?:HORA|H)\b/i);
  if (ccHr) {
    var bolusMcg = extractBolusBeforeDilution(dosisBeforeSlash3(dosisRaw));
    var suffix = /\bMCG\b/i.test(bolusMcg) && !/\bMG\b/i.test(bolusMcg.replace(/\bMCG\b/gi, "")) ? " MCG/HORA" : " CC/HORA";
    return compactRecetaDoseToken(ccHr[1] + suffix);
  }
  if (/^\d+(?:[.,]\d+)?\s*HORAS?\b/i.test(vel)) {
    var bolusTimed = extractBolusBeforeDilution(dosisBeforeSlash3(dosisRaw));
    if (bolusTimed) return compactRecetaDoseToken(bolusTimed);
  }
  return "";
}
function extractRecetaNameOnlyDose(dosisRaw) {
  var parsed = dosisForInfusionParse(dosisRaw);
  if (!parsed) return "";
  var vel = extractVelInfSegment(parsed);
  if (vel) {
    var fromVel = extractVelRateDose_(vel, dosisRaw);
    if (fromVel) return fromVel;
  }
  var anywhereMcgMin = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
  if (anywhereMcgMin) return compactRecetaDoseToken(anywhereMcgMin[1] + " MCG/MIN");
  var anywhereMcgHr = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
  if (anywhereMcgHr) return compactRecetaDoseToken(anywhereMcgHr[1] + " MCG/HORA");
  var bolus = extractBolusBeforeDilution(dosisBeforeSlash3(dosisRaw));
  if (bolus) return compactRecetaDoseToken(bolus);
  return compactRecetaDoseToken(dosisBeforeSlash3(dosisRaw));
}
function isPrnMedicationItem(item) {
  if (!item) return false;
  var f = trimStr(item.frecuenciaRaw).toUpperCase();
  if (f === "PRN") return true;
  return /CRITERIO\s+PRN/i.test(item.dosisRaw || "");
}
function isPrnItem(item) {
  return isPrnMedicationItem(item);
}
function extractPrnTail(dosisRaw) {
  var t = trimStr(dosisRaw);
  var m = t.match(/CRITERIO\s+PRN:\s*(.+)$/i);
  return m ? trimStr(m[1]) : "";
}
function polishHypoPrnCriterion(crit) {
  var c = normalizeFrecuencia(trimStr(crit));
  c = c.replace(/\bHIPOGLUCEMIA\s*<\s*70\b/gi, "HIPOGLUCEMIA <70 MG/DL");
  if (!/SEG[ÚU]N\s+REQUERIMIENTO/i.test(c)) {
    c = trimStr(c) + " SEG\xDAN REQUERIMIENTO";
  }
  return c;
}
function extractCadaHorasFromCrit(crit) {
  var m = String(crit || "").match(/CADA\s+(\d+)\s*H(?:RS|ORAS)?/i);
  return m ? "CADA " + m[1] + " HORAS" : "";
}
function formatTomarSolid_(verb, formLabel, amount, unit, count) {
  var n = count > 1 ? count : 1;
  return verb + " " + n + " " + pluralizeOralForm(formLabel, n) + " (" + amount.replace(",", ".") + " " + unit + ")";
}
function oralEquivUnits_(item) {
  var eq = item && item.oralEquiv;
  return eq && eq.units > 1 ? eq.units : 0;
}
function formatOralEquivSuffix(item) {
  var eq = item && item.oralEquiv;
  if (!eq || !(eq.units > 1)) return "";
  var unitLabel = eq.unitMg >= 1e3 && eq.unitMg % 1e3 === 0 ? eq.unitMg / 1e3 + "G" : String(eq.unitMg).replace(/\.0$/, "") + "MG";
  return " (" + eq.units + " " + pluralizeOralForm(eq.form, eq.units) + " DE " + unitLabel + ")";
}
function formatTomarAmount_(mMl, mG) {
  if (mMl) return "TOMAR " + mMl[1].replace(",", ".") + " ML";
  if (mG) return "TOMAR " + mG[1].replace(",", ".") + " G";
  return "";
}
function instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido) {
  var verb = verbForVia(viaNorm);
  var isTab = /\bTABLETA\b/i.test(nombreExpandido);
  var isCap = /\bCÁPSULA\b/i.test(nombreExpandido);
  var mMg = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*MG$/i);
  var mMl = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*ML$/i);
  var mG = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);
  var packUnits = oralEquivUnits_(item);
  if (mG && verb !== "TOMAR") return verb + " " + mG[1].replace(",", ".") + " G";
  if (verb === "TOMAR") {
    if (isTab && mMg) return formatTomarSolid_(verb, "TABLETA", mMg[1], "MG", packUnits);
    if (isCap && mMg) return formatTomarSolid_(verb, "C\xC1PSULA", mMg[1], "MG", packUnits);
    if (isTab && mG) return formatTomarSolid_(verb, "TABLETA", mG[1], "G", packUnits);
    if (isCap && mG) return formatTomarSolid_(verb, "C\xC1PSULA", mG[1], "G", packUnits);
    var tomarAmt = formatTomarAmount_(mMl, mG);
    if (tomarAmt) return tomarAmt;
  }
  if (mMg) return verb + " " + mMg[1].replace(",", ".") + " MG";
  if (mMl) return verb + " " + mMl[1].replace(",", ".") + " ML";
  return verb + " " + dosisPrincipal;
}
function formatMedicationEgresoLine(item, opts) {
  item = applyIvToOralForEgreso(item, opts);
  var viaNorm = normalizeVia(item.viaRaw);
  var nombreExpandido = applyNombreAccents(expandNombrePresentacion(item.nombreRaw));
  var dosisPrincipal = dosisBeforeSlash3(item.dosisRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var prn = isPrnItem(item);
  if (prn) {
    var critRaw = extractPrnTail(item.dosisRaw);
    if (!critRaw) critRaw = freqNorm;
    var prnAmount = viaNorm === "V\xCDA ORAL" ? instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido) : "ADMINISTRAR " + dosisPrincipal;
    if (/HIPOGLUCEMIA/i.test(critRaw)) {
      var hypo = polishHypoPrnCriterion(critRaw);
      return nombreExpandido + " || " + prnAmount + " " + viaNorm + " " + hypo + ".";
    }
    if (/(NAUSEA|NÁUSEA|NAUSEAS|NÁUSEAS)/i.test(critRaw) && /VÓMITO|VOMITO/i.test(critRaw)) {
      var cadaN = extractCadaHorasFromCrit(critRaw) || normalizeFrecuencia("CADA 8 HORAS");
      return nombreExpandido + " || " + prnAmount + " " + viaNorm + " " + cadaN + " EN CASO DE N\xC1USEA O V\xD3MITO.";
    }
    var startFallback = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
    return nombreExpandido + " || " + startFallback + " " + normalizeFrecuencia(critRaw) + ".";
  }
  var instr = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
  var mid = instr + " " + viaNorm + " " + freqNorm;
  var dia = item.diaTratamiento != null ? effectiveDiaTratamiento(item.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate) : null;
  if (dia != null) {
    return nombreExpandido + " || " + mid + " (D\xCDA " + dia + " DE TRATAMIENTO).";
  }
  return nombreExpandido + " || " + mid + ", SIN SUSPENDER HASTA NUEVO AVISO.";
}
function buildMedRecetaCopyText(items, opts) {
  var all = items || [];
  var list = all.filter(function(it) {
    return it && !it.suspendido && !isInsulinPumpCarrierMedicationItem(it, all);
  });
  var lines = list.map(function(it) {
    var alg = insulinPumpAlgorithmForMedicationItem(all, it);
    if (alg != null) {
      return formatInsulinPumpAlgoritmoLabel(alg) + ", SIN SUSPENDER HASTA NUEVO AVISO.";
    }
    return formatMedicationEgresoLine(it, opts);
  });
  return lines.join("\n\n");
}
function soapViaShort(viaNorm) {
  if (viaNorm === "V\xCDA INTRAVENOSA") return "IV";
  if (viaNorm === "V\xCDA ORAL") return "VO";
  if (viaNorm === "V\xCDA SUBCUT\xC1NEA") return "SC";
  return trimStr(viaNorm).toUpperCase();
}
function soapFreqShort(freqNorm) {
  var t = trimStr(freqNorm).toUpperCase();
  var m = t.match(/^CADA\s+(\d+)\s+H(?:ORA|ORAS)?$/);
  if (m) return "C/" + m[1] + "H";
  return t;
}
function formulationTailStartIndex(nombre) {
  var n = trimStr(nombre);
  if (!n) return -1;
  var re = /\s+(?=\d+\s*%|\d+\/\d+(?:\s*G\/MG|\s*MG\/\d+(?:[.,]\d+)?\s*MG)?|\d+(?:[.,]\d+)?\s*(?:MG|G|ML|MCG|UI|U)\b|\bSOLUCIÓN INYECTABLE\b|\bSOL\s+INY\b|\bTABLETAS?\b|\bCÁPSULAS?\b|\bCAPSULAS?\b|\bCOMPRIMIDOS?\b|\bPOLVO\b|\bJARABE\b|\bGEL\b)/i;
  var m = n.match(re);
  return m && m.index != null ? m.index : -1;
}
function compactSoapDrugName(nombreExpandido) {
  var n = trimStr(nombreExpandido);
  if (!n) return "";
  var cutAt = formulationTailStartIndex(n);
  if (cutAt > 0) n = trimStr(n.slice(0, cutAt));
  n = n.toUpperCase();
  n = n.replace(/\s+TABLETA\b.*$/i, "").replace(/\s+CÁPSULAS?\b.*$/i, "").replace(/\s+CAPSULAS?\b.*$/i, "").replace(/\s+POLVO\b.*$/i, "");
  var trimmed = trimStr(n.replace(/\s+\d+(?:[.,]\d+)?\s*(?:MG|G|ML|MCG|UI|U)\b.*$/i, ""));
  return trimmed || n;
}
function formatSoapPrnHypo_(nombre, dosisCompact, via, critRaw) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  parts.push(polishHypoPrnCriterion(critRaw).toUpperCase());
  return parts.join(" ");
}
function formatSoapPrnNausea_(nombre, dosisCompact, via, critRaw) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  parts.push(soapFreqShort(extractCadaHorasFromCrit(critRaw) || "CADA 8 HORAS"));
  parts.push("EN CASO DE N\xC1USEA O V\xD3MITO");
  return parts.join(" ");
}
function formatSoapPrnPain_(nombre, dosisCompact, critRaw, freqNorm) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  parts.push(soapFreqShort(extractCadaHorasFromCrit(critRaw) || freqNorm));
  parts.push("EN CASO DE DOLOR LEVE O FIEBRE");
  return parts.join(" ");
}
function formatSoapPrnLine_(nombre, dosisCompact, via, critRaw, freqNorm, prnSuffix) {
  if (/HIPOGLUCEMIA/i.test(critRaw)) {
    return formatSoapPrnHypo_(nombre, dosisCompact, via, critRaw) + prnSuffix;
  }
  if (/(NAUSEA|NÁUSEA|VÓMITO|VOMITO)/i.test(critRaw)) {
    return formatSoapPrnNausea_(nombre, dosisCompact, via, critRaw) + prnSuffix;
  }
  if (/(DOLOR|FIEBRE)/i.test(critRaw)) {
    return formatSoapPrnPain_(nombre, dosisCompact, critRaw, freqNorm) + prnSuffix;
  }
  return "";
}
function buildSoapStandardLine_(nombre, dosisCompact, via, freqNorm, equivSuffix, item, opts) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  if (freqNorm) parts.push(soapFreqShort(freqNorm));
  var equiv = equivSuffix.trim();
  if (equiv) parts.push(equiv);
  var dia = item.diaTratamiento != null ? effectiveDiaTratamiento(item.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate) : null;
  if (dia != null) parts.push("DIA " + dia);
  return parts.join(" ");
}
function formatMedicationSoapShort(item, opts) {
  if (!item) return "";
  item = applyIvToOralForEgreso(item, opts);
  if (isRhzeComboMedicationItem(item)) return formatRhzeComboSoapShort(item, opts);
  var nombre = compactSoapDrugName(applyNombreAccents(expandNombrePresentacion(item.nombreRaw)));
  var via = normalizeVia(item.viaRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var dosisCompact = extractRecetaNameOnlyDose(item.dosisRaw);
  var equivSuffix = opts && opts.includeOralEquiv ? formatOralEquivSuffix(item) : "";
  if (isPrnItem(item)) {
    var critRaw = extractPrnTail(item.dosisRaw) || freqNorm;
    var prnLine = formatSoapPrnLine_(nombre, dosisCompact, via, critRaw, freqNorm, equivSuffix);
    if (prnLine) return prnLine;
  }
  return buildSoapStandardLine_(nombre, dosisCompact, via, freqNorm, equivSuffix, item, opts);
}
function buildMedRecetaNameOnlyText(items, opts) {
  var all = items || [];
  var list = all.filter(function(it) {
    return it && !it.suspendido && !isInsulinPumpCarrierMedicationItem(it, all);
  });
  var soapOpts = Object.assign({}, opts, { includeOralEquiv: true });
  var lines = list.map(function(it) {
    var alg = insulinPumpAlgorithmForMedicationItem(all, it);
    if (alg != null) return formatInsulinPumpAlgoritmoLabel(alg);
    return formatMedicationSoapShort(it, soapOpts);
  });
  return lines.join("\n");
}

// public/js/insulin-rescate-detect.mjs
var INSULIN_RE = /\bINSULINA\b/i;
var SC_VIA_RE = /\b(?:VIA\s+)?SUBCUTANEA\b|\bSC\b/i;
var DESTROXTIS_RE = /\b(DESTROXTIS|DESTROXTIAS|GLUCOSA|MG\/DL)\b/i;
function isInsulinRescateMedicationItem(item) {
  if (!item || item.suspendido) return false;
  if (!INSULIN_RE.test(String(item.nombreRaw || ""))) return false;
  var via = String(item.viaRaw || "");
  if (!SC_VIA_RE.test(via)) return false;
  var blob = [item.dosisRaw, item.frecuenciaRaw].join(" ");
  if (!/\bPRN\b/i.test(blob)) return false;
  return DESTROXTIS_RE.test(blob);
}
function insulinRescateItemsFromList(items) {
  return (Array.isArray(items) ? items : []).filter(isInsulinRescateMedicationItem);
}
function patientHasInsulinRescateMeds(items) {
  return insulinRescateItemsFromList(items).length > 0;
}

// public/js/med-receta-soap-families.mjs
var VASOPRESSOR_DRUG_RE = /\b(NORADRENALINA|NOREPINEFRINA|EPINEFRINA|ADRENALINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|TERLIPRESINA|FENILEFRINA|MILRINONA|DOPEXAMINA|ISOPROTERENOL)\b/;
function isInhaledRouteMed_(n) {
  return /\b(INHALAD[OA]?|INHALATORIA|INHALATORIO|NEBULIZ)/.test(n);
}
function isRacemicEpinephrine_(n) {
  return /\b(EPINEFRINA|ADRENALINA)\s+RACEMIC[OA]?\b/.test(n) || /\bRACEMIC[OA]?\s+(EPINEFRINA|ADRENALINA)\b/.test(n);
}
function classifyVasopressors_(n) {
  if (isRacemicEpinephrine_(n)) return false;
  if (isInhaledRouteMed_(n) && VASOPRESSOR_DRUG_RE.test(n)) return false;
  return VASOPRESSOR_DRUG_RE.test(n);
}
function classifyAbx_(n) {
  return /\b(ERTAPENEM|MEROPENEM|IMIPENEM|CEFTRIAX|CEFEPIME|CEFTAZID|CEFOXIT|CEFUROXI|CEFOTAX|CEFTAROL|CEFACLOR|CEFAZOLINA|PIPERACILINA|TAZOBACTAM|VANCOMICINA|TEICOPLANINA|DALBAVANCINA|ORITAVANCINA|TIGECICLINA|AMIKACINA|GENTAMICINA|TOBRAMICINA|PLAZOMICINA|LEVOFLOX|CIPROFLOX|MOXIFLOX|DELAFLOX|OFLOXACINO|NORFLOXACINO|METRONIDAZOL|LINEZOLID|DAPTOMICINA|AZTREONAM|COLISTINA|POLIMIXINA|CLINDAMICINA|AZITROMICINA|CLARITROMICINA|ERITROMICINA|DOXICICLINA|MINOCICLINA|FOSFOMICINA|NITROFURANTOINA|RIFAMPICINA|RIFAXIMINA|AMPICILINA|SULBACTAM|AMOXICILINA|BENZILPENICILINA|FLUCLOXACIL|PENICILINA|TRIMETOPRIM|SULFAMETOXAZOL|BACTRIM|COTRIMOX|FLUCONAZOL|VORICONAZOL|ITRACONAZOL|POSACONAZOL|ISAVUCONAZOL|ANIDULAFUNGINA|MICAFUNGINA|CASPOFUNGINA|AMFOTERICINA|ACICLOVIR|VALACICLOVIR|GANCICLOVIR|FOSCARNET|OSELTAMIVIR|REMDESIVIR|REM\s*DESIVIR|ALBENDAZOL|IVERMECTINA|NITAZOXANIDA|PRAZIQUANTEL|METRONIDAZOL)\b/.test(
    n
  );
}
function classifyAnalgesia_(n) {
  return /\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|MORFINA|TRAMADOL|IBUPROFENO|NAPROXENO|DICLOFENACO|BUPRENORFINA|FENTANILO|REMIFENTANILO|SUFENTANILO|HIDROMORFONA|OXICODONA|NALBUFINA|PENTAZOCINA|TAPENTADOL|ALFENTANILO|MEPERIDINA|PETIDINA|CODEINA|HIDROCODONA|CELECOXIB|MELOXICAM|DEXKETOPROFENO|PARECOXIB|INDOMETACINA|ETORICOXIB|NIMESULIDA)\b/.test(
    n
  );
}
function classifyAntiemeticos_(n) {
  return /\b(ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA)\b/.test(
    n
  );
}
function classifyDiureticos_(n) {
  return /\b(HIDROCLOROTIAZ|CLORTALIDONA|INDAPAMIDA|FUROSEMIDA|TORASEMIDA|BUMETANIDA|ESPIRONOLACTONA|EPLERENONA|MANITOL|ACETAZOLAMIDA)\b/.test(
    n
  );
}
function classifyAntitromboticos_(n) {
  return /\b(ENOXAPARINA|HEPARINA|DALTEPARINA|TINZAPARINA|FONDAPARINUX|NADROPARINA|CLOPIDOGREL|TICAGRELOR|PRASUGREL|CILOSTAZOL|TICLOPIDINA)\b/.test(
    n
  );
}
function classifyAnticoagulacion_(n) {
  return /\b(WARFARINA|ACENOCUMAROL|APIXABAN|RIVAROXABAN|EDOXABAN|DABIGATRAN|ALTEPLASA|TENECTEPLASA|RETEPLASA|ESTREPTOKINASA|UROKINASA|HEPARINA\s+SODICA|ARGATROBAN|BIVALIRUDINA)\b/.test(
    n
  );
}
function classifyEstatinas_(n) {
  return /\b(ATORVASTATINA|ROSUVASTATINA|PRAVASTATINA|SINVASTATINA|FLUVASTATINA|PITAVASTATINA|LOVASTATINA)\b/.test(
    n
  );
}
function classifyViaAerea_(n) {
  if (isRacemicEpinephrine_(n)) return true;
  if (isInhaledRouteMed_(n) && VASOPRESSOR_DRUG_RE.test(n)) return true;
  return /\b(SALBUTAMOL|LEVOSALBUTAMOL|TERBUTALINA|BUDESONIDA|BECLOMETASONA|FLUTICASONA|TIOTROPIO|IPRATROPIO|FORMOTEROL|SALMETEROL|INDACATEROL|OLODATEROL|GLICOPIRRONIO|UMECLIDINIO|AMBROXOL|BROMHEXINA|GUAIFENESINA|DEXTROMETORFANO)\b/.test(
    n
  );
}
function classifySedacion_(n) {
  return /\b(PROPOFOL|MIDAZOLAM|LORAZEPAM|DIAZEPAM|CLONAZEPAM|HALOPERIDOL|QUETIAPINA|OLANZAPINA|RISPERIDONA|DEXMEDETOMIDINA)\b/.test(
    n
  );
}
function classifyAntiepilepticos_(n) {
  return /\b(LEVETIRACETAM|FENITOINA|CARBAMAZEPINA|VALPROATO|GABAPENTINA|PREGABALINA|FENOBARBITAL|LACOSAMIDA|OXCARBAZEPINA|TOPIRAMATO|LAMOTRIGINA)\b/.test(
    n
  );
}
function classifyAntiparkinsonianos_(n) {
  return /\b(LEVODOPA|CARBIDOPA|BENSERAZIDA|ENTACAPONA|PRAMIPEXOL|ROPINIROL|AMANTADINA|BIPERIDENO|TRIHEXIFENIDILO)\b/.test(
    n
  );
}
function classifyAntidotos_(n) {
  return /\b(NALOXONA|FLUMAZENIL|N-ACETILCISTEINA|ACETILCISTEINA|FISOSTIGMINA|HIDROXICOBALAMINA|DIMERCAPROL)\b/.test(
    n
  );
}
function classifyAntiarritmicos_(n) {
  return /\b(AMIODARONA|LIDOCAINA|DIGOXINA|ADENOSINA|PROPAFENONA|FLECAINIDA|SOTALOL|ESMOLOL|VERAPAMILO|DILTIAZEM)\b/.test(
    n
  );
}
function classifyTransfusiones_(n) {
  return /\b(CONCENTRADO\s+DE\s+ERITROCITOS|CONCENTRADO\s+ERITROCITARIO|PAQUETE\s+GLOBULAR|PLAQUETAS|PLAQUETAFILE|PLASMA\s+FRESCO|PLASMA\s+CONGELADO|CRIOPRECIPITADO|ALBUMINA\s+HUMANA|INMUNOGLOBULINA|HEMODERIVADO|SANGRE\s+TOTAL|TRANSFUSION|TRANSFUSIÓN)\b/.test(
    n
  );
}
function classifyNmDiabetesThyroidPpi_(n) {
  return /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|LEVOTIROXINA|LIOTIRONINA|METFORMINA|REPAGLINIDA|GLIBENCLAMIDA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|SEMAGLUTIDA|LIRAGLUTIDA|DULAGLUTIDA|EXENATIDA)\b/.test(
    n
  );
}
function classifyNmSupport_(n) {
  return /\b(DEXAMETASONA|BETAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|PREDNISON|PREDNISOLONA|DEFLAZACORT|MEPREDNISONA|FOLICO|ACIDO\s+FOLICO|CIANOCOBALAMINA|FERROSO|HIERRO|CLORURO\s+DE\s+POTASIO|FOSFATO\s+DE\s+POTASIO|ACETATO\s+DE\s+POTASIO|SULFATO\s+DE\s+MAGNESIO|GLUCONATO\s+DE\s+CALCIO|LACTULOSA|BISACODILO|SENOSIDOS|POLIETILENGLICOL|MACROGOL|RANITIDINA|FAMOTIDINA|SUCRALFATO|GLUCAGON|DONEPECILO|MEMANTINA|BROMOCRIPTINA|FINASTERIDA|TAMSULOSINA|SOLIFENACINA|OXYBUTININA|TIAMINA|BENFOTIAMINA|PIRIDOXINA|COMPLEJO\s+B|METOTREXATO|AZATIOPRINA|MICOFENOLATO|CICLOSPORINA|TACROLIMUS|CICLOFOSFAMIDA|RITUXIMAB|INFLIXIMAB|ALOPURINOL|COLCHICINA|FEBUXOSTAT|PROBENECID|SERTRALINA|FLUOXETINA|PAROXETINA|ESCITALOPRAM|CITALOPRAM|MIRTAZAPINA|VENLAFAXINA|DULOXETINA|TRAZODONA|AMITRIPTILINA|CICLOBENZAPRINA|BACLOFENO|TIZANIDINA|METOCARBAMOL|ORFENADRINA)\b/.test(
    n
  );
}
function classifyAntihta_(n) {
  return /\b(LOSARTAN|IRBESARTAN|VALSARTAN|TELMISARTAN|OLMESARTAN|CANDESARTAN|ENALAPRIL|LISINOPRIL|RAMIPRIL|CAPTOPRIL|AMLODIPINO|NIFEDIPINO|FELODIPINO|LERCANIDIPINO|CARVEDILOL|METOPROLOL|BISOPROLOL|NEBIVOLOL|PROPRANOLOL|ATENOLOL|LABETALOL|CLONIDINA|HIDRALAZINA|MINOXIDIL|NICARDIPINO|CLEVUDIPINO|DILTIAZEM|VERAPAMILO|NITROGLICERINA|ISOSORBIDE|DINITRATO|SACUBITRIL|NITROPRUSIATO)\b/.test(
    n
  );
}

// public/js/med-receta-soap.mjs
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function overlayTokensMatch(nNorm, tokens) {
  if (!tokens || !tokens.length) return false;
  var parts = [];
  for (var i = 0; i < tokens.length; i += 1) {
    var x = normalizeNombreForSoapClassify(tokens[i]);
    if (x) parts.push(escapeRegExp(x));
  }
  if (!parts.length) return false;
  return new RegExp("\\b(" + parts.join("|") + ")\\b").test(nNorm);
}
function extractMgDoseFromMedBlob(blob) {
  var m = String(blob || "").match(/\b(\d+(?:[.,]\d+)?)\s*MG\b/);
  if (!m) return null;
  var v = parseFloat(String(m[1]).replace(",", "."));
  return Number.isFinite(v) ? v : null;
}
function isAspirinNombre(n) {
  return /\b(ACETILSALICILICO|ACIDO\s+ACETILSALICILICO|ACIDO\s+ACETIL\s+SALICILICO|ASPIRINA)\b/.test(
    n
  );
}
var SOAP_DESTINATION_GROUPS = [
  {
    label: "N",
    keys: ["analgesia", "antiemeticos", "sedacion", "antiepilepticos", "antiparkinsonianos", "antidotos"]
  },
  { label: "V", keys: ["viaAerea"] },
  {
    label: "HD",
    keys: [
      "vasop",
      "antihta",
      "antitromboticos",
      "anticoagulacion",
      "antiarritmicos",
      "diuretico",
      "estatinas"
    ]
  },
  { label: "HI", keys: ["abx", "transfusiones"] },
  { label: "NM", keys: ["nm"] }
];
var SOAP_DESTINATION_KEYS = SOAP_DESTINATION_GROUPS.reduce(function(acc, g) {
  return acc.concat(g.keys);
}, []);
var SOAP_DESTINATION_LABELS = {
  analgesia: "Analg\xE9sicos / antipir\xE9ticos",
  antiemeticos: "Antiem\xE9ticos",
  sedacion: "Sedaci\xF3n / delirium",
  antiepilepticos: "Antiepil\xE9pticos",
  antiparkinsonianos: "Antiparkinsonianos",
  antidotos: "Ant\xEDdotos",
  viaAerea: "V\xEDa a\xE9rea (broncodilatadores / mucol\xEDticos)",
  antihta: "Antihipertensivos",
  diuretico: "Diur\xE9ticos",
  antitromboticos: "Tromboprofilaxis / antiagregaci\xF3n",
  anticoagulacion: "Anticoagulaci\xF3n terap\xE9utica",
  antiarritmicos: "Antiarr\xEDtmicos",
  estatinas: "Estatinas",
  abx: "Antibi\xF3ticos / antif\xFAngicos",
  transfusiones: "Transfusiones / hemoderivados",
  vasop: "Vasopresores / inotr\xF3picos",
  nm: "NM (soporte, cr\xF3nicos, etc.)"
};
function mapSoapDestKeyToEaField(soapKey) {
  return soapKey === "diuretico" ? "diureticos" : soapKey;
}
function soapDestinationSelectOptionsHtml(escFn, opts) {
  opts = opts || {};
  var current = opts.current || "";
  var labels = opts.labels || SOAP_DESTINATION_LABELS;
  var mapKey = opts.mapKey || function(k) {
    return k;
  };
  var include = null;
  if (opts.includeKeys && opts.includeKeys.length) {
    include = {};
    opts.includeKeys.forEach(function(k) {
      include[k] = true;
    });
  }
  var html = "";
  if (!opts.omitEmpty) {
    html += '<option value="">' + escFn(opts.emptyLabel || "Elegir destino\u2026") + "</option>";
  }
  SOAP_DESTINATION_GROUPS.forEach(function(g) {
    var inner = "";
    g.keys.forEach(function(soapKey) {
      var k = mapKey(soapKey);
      if (opts.excludeKey && k === opts.excludeKey) return;
      if (include && !include[k]) return;
      var sel = current === k ? " selected" : "";
      inner += '<option value="' + escFn(k) + '"' + sel + ">" + escFn(labels[k] || labels[soapKey] || k) + "</option>";
    });
    if (!inner) return;
    html += '<optgroup label="' + escFn(g.label) + '">' + inner + "</optgroup>";
  });
  return html;
}
function effectiveSoapCategory(item, classifyFn) {
  if (!item) return "otros";
  var ov = trimStr(item.soapCatOverride);
  if (ov && SOAP_DESTINATION_KEYS.indexOf(ov) >= 0) return ov;
  return classifyFn(item.nombreRaw, item.dosisRaw, item.frecuenciaRaw, item.viaRaw);
}
function soapDestinationUiValue(item, classifyFn) {
  if (!item) return "";
  var ov = trimStr(item.soapCatOverride);
  if (ov && SOAP_DESTINATION_KEYS.indexOf(ov) >= 0) return ov;
  var auto = classifyFn(item.nombreRaw, item.dosisRaw, item.frecuenciaRaw, item.viaRaw);
  return auto !== "otros" ? auto : "";
}
function unassignedOtrosSoapItems(items, selMap, classifyFn) {
  var out = [];
  var list = Array.isArray(items) ? items : [];
  list.forEach(function(it) {
    if (!it || !selMap[it.id] || it.suspendido) return;
    if (effectiveSoapCategory(it, classifyFn) === "otros") out.push(it);
  });
  return out;
}
function classifyByCatalogTokens_(n, o) {
  if (overlayTokensMatch(n, o.vasop)) return "vasop";
  if (overlayTokensMatch(n, o.abx)) return "abx";
  if (overlayTokensMatch(n, o.analgesia)) return "analgesia";
  if (overlayTokensMatch(n, o.antihta)) return "antihta";
  return "";
}
var NAME_HEURISTIC_CLASSIFIERS = [
  [classifyAbx_, "abx"],
  [classifyTransfusiones_, "transfusiones"],
  [classifyAnalgesia_, "analgesia"],
  [classifyAntiemeticos_, "antiemeticos"],
  [classifyDiureticos_, "diuretico"],
  [classifyAnticoagulacion_, "anticoagulacion"],
  [classifyAntitromboticos_, "antitromboticos"],
  [classifyEstatinas_, "estatinas"],
  [classifyAntiarritmicos_, "antiarritmicos"],
  [classifyViaAerea_, "viaAerea"],
  [classifyVasopressors_, "vasop"],
  [classifySedacion_, "sedacion"],
  [classifyAntiepilepticos_, "antiepilepticos"],
  [classifyAntiparkinsonianos_, "antiparkinsonianos"],
  [classifyAntidotos_, "antidotos"],
  [classifyNmSupport_, "nm"],
  [classifyNmDiabetesThyroidPpi_, "nm"],
  [classifyAntihta_, "antihta"]
];
function classifyByNameHeuristics_(n) {
  for (var i = 0; i < NAME_HEURISTIC_CLASSIFIERS.length; i++) {
    var pair = NAME_HEURISTIC_CLASSIFIERS[i];
    if (pair[0](n)) return pair[1];
  }
  return "";
}
function shouldIncludeMedicationInSoap(item, classifyFn) {
  if (!item || item.suspendido) return false;
  if (isNutritionMedicationItem(item)) return false;
  if (isSuerosMedicationNombre(item.nombreRaw)) return false;
  var blob = normalizeNombreForSoapClassify(
    [item.nombreRaw, item.dosisRaw, item.frecuenciaRaw].filter(Boolean).join(" ")
  );
  if (/\bDEXTROSA\s*50\b/.test(blob)) return false;
  if (isInsulinRescateMedicationItem(item)) return true;
  if (isPrnMedicationItem(item)) {
    var classify = classifyFn || classifyMedicationSoapCategory;
    return classify(item.nombreRaw, item.dosisRaw) === "analgesia";
  }
  return true;
}
function classifyMedicationSoapCategory(nombreRaw, dosisRaw, frecuenciaRaw, viaRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  var classifyBlob = normalizeNombreForSoapClassify(
    [nombreRaw, dosisRaw, frecuenciaRaw, viaRaw].filter(Boolean).join(" ")
  );
  if (isAspirinNombre(n)) {
    var mg = extractMgDoseFromMedBlob(classifyBlob);
    if (mg == null || mg <= 160) return "antitromboticos";
    return "analgesia";
  }
  if (isRacemicEpinephrine_(classifyBlob)) return "viaAerea";
  if (isInhaledRouteMed_(classifyBlob) && /\b(EPINEFRINA|ADRENALINA)\b/.test(classifyBlob)) {
    return "viaAerea";
  }
  var fromCatalog = classifyByCatalogTokens_(n, getMedCatalogSoapTokens());
  if (fromCatalog === "vasop" && (isRacemicEpinephrine_(classifyBlob) || isInhaledRouteMed_(classifyBlob))) {
    return "viaAerea";
  }
  if (fromCatalog) return fromCatalog;
  var fromHeuristic = classifyByNameHeuristics_(classifyBlob);
  if (fromHeuristic) return fromHeuristic;
  var fromSome = classifyBySomeCatalog(n) || classifyBySomeCatalog(classifyBlob);
  if (fromSome) return fromSome;
  return "otros";
}

// public/js/med-receta-parse.mjs
var SOME_TS_CLASS_RE = /^(\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(?:a\.m\.|p\.m\.))\s+(MEDICAMENTOS(?:\s+P[12])?|MEDICAMENTO(?:\s+P[12])?|DIETAS|CUIDADOS|ESTUDIOS|PROCEDIMIENTO)\s+(.*)$/i;
var SOME_MED_VIA_RE = /\s+(VIA\s+(?:ORAL|INTRAVENOSA|SUBCUT[AÁ]NEA|RECTAL|T[OÓ]PICA|INHALATORIA|NEBULIZACI[OÓ]N|GASTROENTERICA|INTRAMUSCULAR))\s+/i;
var SOME_MED_FREC_TAIL_RE = /\s+(CADA\s+(?:\d+\s+)?(?:HORAS?|HRS?)|PRN|POR\s+TURNO|UNICA\s+VEZ)\s*$/i;
function isIndicacionesMedClass(tipo) {
  return /^MEDICAMENTOS?(?:\s+P[12])?$/i.test(trimStr(tipo));
}
function splitMedSpaceSeparatedTail_(tail) {
  var s = trimStr(tail);
  var viaM = s.match(SOME_MED_VIA_RE);
  if (!viaM || viaM.index == null) return null;
  var nombre = trimStr(s.slice(0, viaM.index));
  var via = trimStr(viaM[1]);
  var mid = trimStr(s.slice(viaM.index + viaM[0].length));
  if (!nombre || !via || !mid) return null;
  var nw = false;
  if (/\s+NW\s*$/i.test(mid)) {
    nw = true;
    mid = trimStr(mid.replace(/\s+NW\s*$/i, ""));
  }
  var frecuencia = "";
  var dosis = mid;
  var frecM = mid.match(SOME_MED_FREC_TAIL_RE);
  if (frecM && frecM.index != null) {
    frecuencia = trimStr(frecM[0]);
    dosis = trimStr(mid.slice(0, frecM.index));
  } else if (/\s+-\s*$/.test(mid)) {
    frecuencia = "-";
    dosis = trimStr(mid.replace(/\s+-\s*$/, ""));
  }
  return [nombre, via, dosis, frecuencia, nw ? "NW" : ""];
}
function splitIndicacionesCols(line) {
  var raw = String(line || "");
  if (raw.indexOf("	") >= 0) return raw.split("	");
  var s = trimStr(raw);
  var m = s.match(SOME_TS_CLASS_RE);
  if (!m) return [s];
  var clase = m[2].toUpperCase();
  var tail = trimStr(m[3]);
  if (clase === "DIETAS") {
    var nw = /\bNW\s*$/i.test(tail);
    var desc = nw ? trimStr(tail.replace(/\s+NW\s*$/i, "")) : tail;
    if (/\s{2,}/.test(desc)) {
      var chunks = desc.split(/\s{2,}/).map(trimStr);
      return padIndicacionesCols_([m[1], clase].concat(chunks).concat(nw ? ["NW"] : []));
    }
    return padIndicacionesCols_([m[1], clase, desc, "", "", nw ? "NW" : "", ""]);
  }
  if (/\s{2,}/.test(tail)) {
    return padIndicacionesCols_([m[1], clase].concat(tail.split(/\s{2,}/).map(trimStr)));
  }
  if (isIndicacionesMedClass(clase)) {
    var medCols = splitMedSpaceSeparatedTail_(tail);
    if (medCols) return padIndicacionesCols_([m[1], clase].concat(medCols));
  }
  return [s];
}
function normalizeIndicacionesPasteText(text) {
  var raw = String(text || "");
  if (/\t/.test(raw)) return raw;
  return raw.split(/\r?\n/).map(function(line) {
    if (!trimStr(line) || line.indexOf("	") >= 0) return line;
    var cols = splitIndicacionesCols(line);
    return cols.length > 1 ? cols.join("	") : line;
  }).join("\n");
}
function indicacionesMinCols_(tipoEarly) {
  if (tipoEarly === "DIETAS") return 4;
  return 6;
}
function parseMedRow(cols, lineIndex, lineText) {
  var dosisRaw = trimStr(cols[4]);
  var dia = extractDiaTratamiento(dosisRaw);
  if (dia == null) dia = extractDiaTratamiento(lineText);
  return {
    id: "med-" + Date.now().toString(36) + "-" + lineIndex + "-" + Math.random().toString(36).slice(2, 5),
    tipoRaw: trimStr(cols[1]).toUpperCase(),
    nombreRaw: trimStr(cols[2]),
    viaRaw: trimStr(cols[3]),
    dosisRaw,
    frecuenciaRaw: trimStr(cols[5]),
    suspendido: false,
    diaTratamiento: dia
  };
}
function parseDietaRow(cols, lineIndex) {
  var norm = normalizeDietaCols(cols);
  var detalleRaw = trimStr(norm[4]) || trimStr(norm[5]);
  var nutrients = extractDietNutrients(dietNutrientBlobFromCols(norm));
  return normalizeParenteralDietaItem({
    id: "dieta-" + Date.now().toString(36) + "-" + lineIndex,
    descripcionRaw: resolveDietaDescripcionRaw(cols, norm),
    detalleRaw,
    kcal: nutrients.kcal,
    proteinG: nutrients.proteinG,
    suspendido: false
  });
}
function padIndicacionesCols_(cols) {
  while (cols.length < 7) cols.push("");
  return cols;
}
function shouldSkipIndicacionesLine_(cols, tipoEarly) {
  var minCols = indicacionesMinCols_(tipoEarly);
  if (cols.length >= 7) return false;
  if (cols.length >= minCols && (tipoEarly === "DIETAS" || isIndicacionesMedClass(tipoEarly))) {
    return false;
  }
  return true;
}
function processIndicacionesLine_(cols, lineIndex, lineText, items, dietas, fechas, skippedSummary) {
  var tipo = trimStr(cols[1]).toUpperCase();
  var fd = parseFechaDMYFromTimestampCell(cols[0]);
  if (fd) fechas.push(fd);
  if (isIndicacionesMedClass(tipo)) {
    var med = parseMedRow(cols, lineIndex, lineText);
    if (isNutritionMedicationItem(med)) {
      dietas.push(nutritionMedItemToDieta(med, lineIndex));
      return 0;
    }
    items.push(med);
    return 0;
  }
  if (tipo === "DIETAS") {
    dietas.push(parseDietaRow(cols, lineIndex));
    return 0;
  }
  if (tipo === "CUIDADOS") skippedSummary.cuidados += 1;
  else if (tipo === "ESTUDIOS") skippedSummary.estudios += 1;
  else if (tipo === "PROCEDIMIENTO") skippedSummary.other += 1;
  else skippedSummary.other += 1;
  return 1;
}
function parseIndicacionesPaste(text) {
  var normalized = normalizeIndicacionesPasteText(text);
  var lines = String(normalized || "").split(/\r?\n/).map(trimStr).filter(Boolean);
  var items = [];
  var dietas = [];
  var fechas = [];
  var skipped = 0;
  var skippedSummary = { cuidados: 0, estudios: 0, other: 0 };
  for (var i = 0; i < lines.length; i += 1) {
    var cols = splitIndicacionesCols(lines[i]);
    var tipoEarly = cols.length >= 2 ? trimStr(cols[1]).toUpperCase() : "";
    if (shouldSkipIndicacionesLine_(cols, tipoEarly)) {
      skipped += 1;
      skippedSummary.other += 1;
      continue;
    }
    if (cols.length < 7) cols = padIndicacionesCols_(cols);
    skipped += processIndicacionesLine_(cols, i, lines[i], items, dietas, fechas, skippedSummary);
  }
  return {
    items,
    dietas,
    fechas,
    skipped,
    skippedSummary
  };
}
function looksLikeSomeIndicacionesPaste(text) {
  var raw = String(text || "");
  if (!raw.trim()) return false;
  var lines = raw.split(/\r?\n/).map(trimStr).filter(Boolean);
  for (var i = 0; i < lines.length; i += 1) {
    var cols = splitIndicacionesCols(lines[i]);
    if (cols.length < 2) continue;
    var tipo = trimStr(cols[1]).toUpperCase();
    if (cols.length < indicacionesMinCols_(tipo)) continue;
    if (isIndicacionesMedClass(tipo) || tipo === "DIETAS") return true;
  }
  return false;
}
function shouldAutoSelectSoap(item) {
  if (!item || item.suspendido) return false;
  if (!shouldIncludeMedicationInSoap(item, classifyMedicationSoapCategory)) return false;
  var nombre = trimStr(item.nombreRaw);
  if (classifyMedicationSoapCategory(nombre, item.dosisRaw) !== "otros") return true;
  var blob = normalizeNombreForSoapClassify(
    [nombre, item.dosisRaw, item.frecuenciaRaw].join(" ")
  );
  if (/\bINSULINA\b/.test(blob)) return true;
  if (/\b(GLARGINA|DEGLUDEC|DETEMIR|NPH)\b/.test(blob)) return true;
  return false;
}
function resolveFechaActualizacion(fechas, fallbackDMY) {
  var list = (fechas || []).filter(Boolean);
  if (!list.length) return trimStr(fallbackDMY) || "";
  var counts = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < list.length; i += 1) {
    var k = list[i];
    counts[k] = (counts[k] || 0) + 1;
  }
  var best = list[0];
  var bestN = 0;
  Object.keys(counts).forEach(function(k2) {
    if (counts[k2] > bestN) {
      bestN = counts[k2];
      best = k2;
    }
  });
  return best;
}

// public/js/med-pharm-some-catalog.mjs
var MAX_TOKENS_PER_CAT = 400;
var MAX_TOKEN_LEN = 64;
var SOME_PHARM_FILTER_ORDER = [
  "AGONISTA ALFA/BETA",
  "ANALG\xC9SICO",
  "ANALG\xC9SICO ANTIPIR\xC9TICO/ANTIINFLAMATORIC",
  "ANEST\xC9SICO",
  "ANTIARR\xCDTMICO",
  "ANTIASM\xC1TICO",
  "ANTIBI\xD3TICO",
  "ANTICOAGULANTE",
  "ANTICONVULSIVO",
  "ANTIDIAB\xC9TICO",
  "ANTIINFLAMATORIO ESTEROIDEO",
  "ANTILIP\xC9MICO",
  "ANTIULCEROSO",
  "BRONCODILATADOR",
  "CORTICOSTEROIDE",
  "DIUR\xC9TICO",
  "LAXANTE",
  "RELAJANTE MUSCULAR PERIF\xC9RICO",
  "SEDANTE",
  "SUEROS",
  "SUPLEMENTO",
  "SUPLEMENTO ELECTROL\xCDTICO",
  "OTROS"
];
var BUILTIN_TOKENS = {
  "AGONISTA ALFA/BETA": [
    "NORADRENALINA",
    "NOREPINEFRINA",
    "EPINEFRINA",
    "DOPAMINA",
    "DOBUTAMINA",
    "VASOPRESINA",
    "FENILEFRINA",
    "FENILEFRIN"
  ],
  "ANALG\xC9SICO": ["METAMIZOL", "MORFINA", "TRAMADOL", "FENTANILO", "REMIFENTANILO"],
  "ANALG\xC9SICO ANTIPIR\xC9TICO/ANTIINFLAMATORIC": ["PARACETAMOL", "KETOROLAC", "IBUPROFENO", "DICLOFENACO"],
  ANEST\u00C9SICO: ["PROPOFOL", "KETAMINA", "LIDOCAINA", "BUPIVACAINA"],
  ANTIARR\u00CDTMICO: ["AMIODARONA", "LIDOCAINA", "METOPROLOL"],
  ANTIASM\u00C1TICO: ["SALBUTAMOL", "IPRATROPIO", "TIOTROPIO", "MONTELUKAST"],
  "ANTIBI\xD3TICO": [
    "ERTAPENEM",
    "CEFALOTINA",
    "CEFTRIAX",
    "CEFEPIME",
    "MEROPENEM",
    "VANCOMICINA",
    "PIPERACILINA",
    "TAZOBACTAM",
    "METRONIDAZOL",
    "LINEZOLID",
    "AZITROMICINA",
    "LEVOFLOX",
    "CIPROFLOX",
    "AMIKACINA",
    "GENTAMICINA",
    "AMPICILINA",
    "FLUCONAZOL"
  ],
  ANTICOAGULANTE: ["ENOXAPARINA", "HEPARINA", "APIXABAN", "RIVAROXABAN", "WARFARINA"],
  ANTICONVULSIVO: ["LEVETIRACETAM", "FENITOINA", "VALPROATO", "CARBAMAZEPINA"],
  "ANTIDIAB\xC9TICO": ["INSULINA", "METFORMINA", "GLARGINA"],
  "ANTIINFLAMATORIO ESTEROIDEO": ["METILPREDNISOLONA", "HIDROCORTISONA"],
  "ANTILIP\xC9MICO": ["ATORVASTATINA", "ROSUVASTATINA", "SINVASTATINA"],
  ANTIULCEROSO: ["OMEPRAZOL", "PANTOPRAZOL", "ESOMEPRAZOL", "RANITIDINA"],
  BRONCODILATADOR: ["SALBUTAMOL", "IPRATROPIO", "TIOTROPIO", "TERBUTALINA"],
  CORTICOSTEROIDE: ["BUDESONIDA", "DEXAMETASONA", "HIDROCORTISONA", "METILPREDNISOLONA"],
  DIUR\u00C9TICO: ["FUROSEMIDA", "ESPIRONOLACTONA", "MANITOL", "TORASEMIDA"],
  LAXANTE: ["LACTULOSA", "POLIETILENGLICOL", "BISACODILO", "SENOSIDO"],
  "RELAJANTE MUSCULAR PERIF\xC9RICO": ["CISATRACURIO", "ROCURONIO", "VECURONIO", "PANCURONIO"],
  SEDANTE: ["DEXMEDETOMIDINA", "PROPOFOL", "MIDAZOLAM"],
  SUEROS: [
    "CLORURO DE SODIO",
    "SOLUCION SALINA",
    "DEXTROSA",
    "LACTATO",
    "RINGER",
    "CLORURO DE POTASIO",
    "SULFATO DE MAGNESIO",
    "SOLUCION GLUCOSADA"
  ],
  SUPLEMENTO: ["MULTIVITAMINICO", "VITAMINA", "ZINC", "HIERRO"],
  "SUPLEMENTO ELECTROL\xCDTICO": ["POTASIO", "MAGNESIO", "FOSFORO", "CALCIO GLUCONATO"]
};
var _overlayTokens = null;
function normName(nombreRaw) {
  return String(nombreRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
function escapeRegExp2(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sanitizeTokenList2(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < arr.length && out.length < MAX_TOKENS_PER_CAT; i += 1) {
    let t = String(arr[i] || "").trim();
    if (t.length > MAX_TOKEN_LEN) t = t.slice(0, MAX_TOKEN_LEN);
    if (!t) continue;
    const k = t.toUpperCase();
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(t);
  }
  return out;
}
function sanitizeSomePharmCatalog(raw) {
  const tokens = /* @__PURE__ */ Object.create(null);
  if (!raw || typeof raw !== "object") return { tokens };
  const src = raw.tokens && typeof raw.tokens === "object" ? raw.tokens : raw;
  SOME_PHARM_FILTER_ORDER.forEach(function(cat) {
    if (cat === "OTROS") return;
    if (Array.isArray(src[cat])) tokens[cat] = sanitizeTokenList2(src[cat]);
  });
  return { tokens };
}
function tokensForCategory(cat) {
  const custom = _overlayTokens && _overlayTokens[cat];
  if (custom && custom.length) return custom;
  return BUILTIN_TOKENS[cat] || [];
}
function tokensMatch(nNorm, tokens) {
  if (!tokens.length) return false;
  const parts = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const x = normName(tokens[i]);
    if (x) parts.push(escapeRegExp2(x));
  }
  if (!parts.length) return false;
  return new RegExp("\\b(" + parts.join("|") + ")\\b").test(nNorm);
}
function applySomePharmCatalogOverlay(catalogFromStorage) {
  const block = catalogFromStorage && catalogFromStorage.somePharm ? catalogFromStorage.somePharm : catalogFromStorage;
  _overlayTokens = sanitizeSomePharmCatalog(block).tokens;
}
function listSomePharmFilterLabels() {
  return ["TODOS"].concat(SOME_PHARM_FILTER_ORDER);
}
function isSomePharmCategoryLabel(cat) {
  return SOME_PHARM_FILTER_ORDER.indexOf(String(cat || "")) >= 0;
}
function classifySomePharmCategory(nombreRaw) {
  const n = normName(nombreRaw);
  if (!n) return "OTROS";
  for (let i = 0; i < SOME_PHARM_FILTER_ORDER.length; i += 1) {
    const cat = SOME_PHARM_FILTER_ORDER[i];
    if (cat === "OTROS") break;
    if (tokensMatch(n, tokensForCategory(cat))) return cat;
  }
  return "OTROS";
}
function rowSomePharmCategory(row) {
  if (!row) return "OTROS";
  if (row.catOverride) return String(row.catOverride);
  if (row.cat) return String(row.cat);
  return classifySomePharmCategory(row.med);
}
function assignSomePharmCategory(row) {
  if (!row) return row;
  const next = Object.assign({}, row);
  if (!next.catOverride) next.cat = classifySomePharmCategory(next.med);
  return next;
}
function assignSomePharmCategories(rows) {
  return (rows || []).map(assignSomePharmCategory);
}

// public/js/features/estado-actual-data-constants.mjs
var MED_FIELD_KEYS = (
  /** @type {const} */
  [
    "analgesia",
    "antiemeticos",
    "sedacion",
    "antiepilepticos",
    "antiparkinsonianos",
    "antidotos",
    "viaAerea",
    "vasop",
    "antihta",
    "antitromboticos",
    "anticoagulacion",
    "antiarritmicos",
    "diureticos",
    "estatinas",
    "abx",
    "transfusiones",
    "nm"
  ]
);
var VITAL_KEYS = ["tas", "tad", "fc", "fr", "temp", "sat"];
var DIET_CALORIC_KEYS = (
  /** @type {const} */
  ["kcalKg", "kcal", "proteinG"]
);

// public/js/features/estado-actual-data-revision.mjs
function appendHistorialRevision(parts, historial) {
  var h = historial.length;
  parts.push("h" + h);
  for (var i = 0; i < Math.min(4, h); i += 1) {
    var row = historial[i];
    parts.push(String(row && row.id ? row.id : "") + "@" + String(row && row.recordedAt ? row.recordedAt : ""));
  }
}
function appendEstadoClinicoRevision(parts, ec, pend, conf) {
  parts.push(
    String(ec.four || ""),
    String(ec.esferas || ""),
    String(ec.soporte || ""),
    String(ec.dieta || ""),
    String(ec.kcalKg || ""),
    String(ec.kcal || ""),
    String(ec.proteinG || "")
  );
  for (var dk of ["dieta", "kcal", "proteinG"]) {
    parts.push(String(pend[dk] || ""), conf[dk] ? "1" : "0");
  }
  for (var k of MED_FIELD_KEYS) {
    parts.push(String(ec[k] || ""), String(pend[k] || ""), conf[k] ? "1" : "0");
  }
}
function dietRevisionToken(di) {
  return String(di && di.descripcionRaw ? di.descripcionRaw : "") + "@" + String(di && di.kcal != null ? di.kcal : "") + "@" + String(di && di.proteinG != null ? di.proteinG : "");
}
function itemRevisionToken(it) {
  return String(it && it.id ? it.id : "") + (it && it.suspendido ? "s" : "a");
}
function appendRecetaRevision(parts, block) {
  var dietas = block && Array.isArray(block.dietas) ? block.dietas : [];
  var items = block && Array.isArray(block.items) ? block.items : [];
  parts.push("f" + String(block && block.fechaActualizacion ? block.fechaActualizacion : ""));
  parts.push("d" + dietas.length);
  for (var d = 0; d < Math.min(2, dietas.length); d += 1) {
    parts.push(dietRevisionToken(dietas[d]));
  }
  parts.push("r" + items.length);
  for (var j = 0; j < Math.min(4, items.length); j += 1) {
    parts.push(itemRevisionToken(items[j]));
  }
}
function appendCalendarDay(parts) {
  var now = /* @__PURE__ */ new Date();
  parts.push(
    "cal" + now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0")
  );
}
function buildEaMonitoreoRevision(monitoreoLike, activeId, medRecetaByPatient) {
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var parts = [];
  appendHistorialRevision(parts, hist);
  var tg = m.textoGuardado && m.textoGuardado.savedAt != null ? String(m.textoGuardado.savedAt) : "";
  parts.push("t" + tg);
  parts.push("bi" + String(m.bombaInsulinaAlgoritmo != null ? m.bombaInsulinaAlgoritmo : ""));
  var ec = m.estadoClinico && typeof m.estadoClinico === "object" ? m.estadoClinico : {};
  var pend = m.pendienteReceta && typeof m.pendienteReceta === "object" ? m.pendienteReceta : {};
  var conf = m.confirmado && typeof m.confirmado === "object" ? m.confirmado : {};
  appendEstadoClinicoRevision(parts, ec, pend, conf);
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  appendRecetaRevision(parts, block);
  appendCalendarDay(parts);
  return parts.join(":");
}

// public/js/livesync-patient-ids.mjs
function findPatientIdByRegistro(patients, registro) {
  const r = String(registro || "").trim();
  if (!r || !Array.isArray(patients)) return "";
  const row = patients.find((p) => p && String(p.registro || "").trim() === r);
  return row && row.id ? String(row.id) : "";
}
function registroForPatientId(patients, patientId) {
  const pid = String(patientId || "").trim();
  if (!pid || !Array.isArray(patients)) return "";
  const row = patients.find((p) => p && String(p.id || "") === pid);
  return String(row?.registro || "").trim();
}
function resolveCloudTodoLocalPatientId(remotePatientId, registro, patients, idMap) {
  const remotePid = String(remotePatientId || "").trim();
  if (!remotePid) return "";
  const map = idMap && typeof idMap === "object" ? idMap : {};
  if (map[remotePid]) return String(map[remotePid]).trim();
  return resolveLiveSyncLocalPatientId(remotePid, registro, patients);
}
function stampCloudTodoRow(patientId, todo, patients) {
  const pid = String(patientId || todo?.patientId || "").trim();
  const registro = String(todo?.registro || registroForPatientId(patients, pid)).trim();
  const row = { ...todo, patientId: pid };
  if (registro) row.registro = registro;
  return row;
}
function resolveLiveSyncLocalPatientId(remotePatientId, registro, patients) {
  const byReg = findPatientIdByRegistro(patients, registro);
  if (byReg) return byReg;
  const rid = String(remotePatientId || "").trim();
  if (!rid) return "";
  const byId = Array.isArray(patients) ? patients.find((p) => p && p.id === rid) : null;
  return byId && byId.id ? String(byId.id) : rid;
}
function mapBundleEntriesToPatientIds(list, map, regByRemote, patients) {
  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (!entry || !entry.patient) continue;
    const remoteId = String(entry.patient.id || "").trim();
    if (!remoteId) continue;
    const reg = String(entry.patient.registro || "").trim();
    if (reg) regByRemote[remoteId] = reg;
    map[remoteId] = resolveLiveSyncLocalPatientId(remoteId, reg, patients);
  }
}
function reconcileLocalPatientIdsByRegistro(patients, map, regByRemote) {
  for (let p = 0; p < (patients || []).length; p += 1) {
    const row = patients[p];
    if (!row || !row.id) continue;
    const localId = String(row.id);
    map[localId] = localId;
    const reg = String(row.registro || "").trim();
    if (!reg) continue;
    for (const remoteId of Object.keys(regByRemote)) {
      if (regByRemote[remoteId] === reg) map[remoteId] = localId;
    }
  }
}
function mapTodoKeysToPatientIds(todos, map, regByRemote, patients) {
  for (const remotePid of Object.keys(todos)) {
    if (map[remotePid]) continue;
    map[remotePid] = resolveLiveSyncLocalPatientId(
      remotePid,
      regByRemote[remotePid] || "",
      patients
    );
  }
}
function buildLiveSyncPatientIdMap(entries, patients, todosMap) {
  const map = {};
  const regByRemote = {};
  const list = Array.isArray(entries) ? entries : [];
  mapBundleEntriesToPatientIds(list, map, regByRemote, patients);
  reconcileLocalPatientIdsByRegistro(patients, map, regByRemote);
  const todos = todosMap && typeof todosMap === "object" ? todosMap : {};
  mapTodoKeysToPatientIds(todos, map, regByRemote, patients);
  return map;
}
function mergeTodoListsById(existing, incoming) {
  const byId = {};
  (Array.isArray(existing) ? existing : []).forEach((t) => {
    if (t && t.id) byId[t.id] = t;
  });
  (Array.isArray(incoming) ? incoming : []).forEach((t) => {
    if (!t || !t.id) return;
    const cur = byId[t.id];
    const at = String(t.updatedAt || t.createdAt || "");
    const curAt = cur ? String(cur.updatedAt || cur.createdAt || "") : "";
    if (!cur || at >= curAt) byId[t.id] = t;
  });
  return Object.keys(byId).map((k) => byId[k]);
}
function remapAgendaPatientIds(agenda, idMap) {
  if (!Array.isArray(agenda)) return [];
  return agenda.map((ev) => {
    if (!ev || !ev.patientId) return ev;
    const pid = String(ev.patientId);
    const local = idMap[pid] || pid;
    if (local === pid) return ev;
    return { ...ev, patientId: local };
  });
}

// public/js/features/estado-actual-vital-extras.mjs
var VITAL_BASE_KEYS = ["tas", "tad", "fc", "fr", "temp", "sat"];
function getVitalExtraStorageKey(baseKey) {
  return baseKey === "temp" ? "tempPeak" : baseKey + "Extra";
}

// public/js/features/estado-actual-vital-series-helpers.mjs
var MAX_VITAL_READINGS_PER_DAY = 4;
function normalizeVitalReading(raw) {
  if (!raw || typeof raw !== "object") return null;
  var val = Number(
    /** @type {any} */
    raw.value
  );
  if (!Number.isFinite(val)) return null;
  var time = (
    /** @type {any} */
    raw.time
  );
  return { value: val, time: time != null && String(time).length ? String(time) : void 0 };
}
function pushVitalReading(list, item) {
  var key = item.value + "@" + (item.time || "");
  for (var i = 0; i < list.length; i++) {
    var k = list[i].value + "@" + (list[i].time || "");
    if (k === key) return;
  }
  list.push(item);
}
function mergeVitalSeriesFromStoredSeries(out, rawSeries) {
  if (!rawSeries || typeof rawSeries !== "object") return;
  for (var sk = 0; sk < VITAL_BASE_KEYS.length; sk++) {
    var bk = VITAL_BASE_KEYS[sk];
    var arr = (
      /** @type {any} */
      rawSeries[bk]
    );
    if (!Array.isArray(arr)) continue;
    out[bk] = [];
    for (var ai = 0; ai < arr.length; ai++) {
      var norm = normalizeVitalReading(arr[ai]);
      if (norm) pushVitalReading(out[bk], norm);
    }
  }
}
function mergeVitalSeriesFromLegacyVitals(out, vit, alt) {
  for (var vi = 0; vi < VITAL_BASE_KEYS.length; vi++) {
    var key = VITAL_BASE_KEYS[vi];
    if (!out[key]) out[key] = [];
    var hadStoredSeries = out[key].length > 0;
    if (vit[key] != null && vit[key] !== "" && !hadStoredSeries) {
      pushVitalReading(out[key], {
        value: Number(vit[key]),
        time: alt[key] ? String(alt[key]) : void 0
      });
    }
    var extraKey = getVitalExtraStorageKey(key);
    if (vit[extraKey] != null && vit[extraKey] !== "") {
      pushVitalReading(out[key], {
        value: Number(vit[extraKey]),
        time: alt[extraKey] ? String(alt[extraKey]) : void 0
      });
    }
  }
}
function capVitalSeriesLengths(out) {
  for (var ck = 0; ck < VITAL_BASE_KEYS.length; ck++) {
    var ckKey = VITAL_BASE_KEYS[ck];
    if (out[ckKey] && out[ckKey].length > MAX_VITAL_READINGS_PER_DAY) {
      out[ckKey] = out[ckKey].slice(-MAX_VITAL_READINGS_PER_DAY);
    }
  }
}

// public/js/features/estado-actual-vital-series.mjs
var MAX_VITAL_READINGS_PER_DAY2 = 4;
var MAX_VITAL_LAYERS_IN_FORM = 4;
function vitalSeriesFromMedicion(medicion) {
  var out = {};
  if (!medicion || typeof medicion !== "object") return out;
  var m = medicion;
  mergeVitalSeriesFromStoredSeries(out, m.vitalSeries);
  var vit = m.vitals && typeof m.vitals === "object" ? (
    /** @type {any} */
    m.vitals
  ) : {};
  var alt = m.alteredAt && typeof m.alteredAt === "object" ? (
    /** @type {Record<string, string>} */
    m.alteredAt
  ) : {};
  mergeVitalSeriesFromLegacyVitals(out, vit, alt);
  capVitalSeriesLengths(out);
  return out;
}
function vitalSeriesToLegacyFields(series) {
  var vitals = {};
  var alteredAt = {};
  VITAL_BASE_KEYS.forEach(function(key) {
    vitals[key] = null;
    var list = series[key] || [];
    if (!list.length) return;
    var last = list[list.length - 1];
    vitals[key] = last.value;
    if (last.time) alteredAt[key] = last.time;
    if (list.length >= 2 && key === "temp") {
      var second = list[list.length - 2];
      vitals.tempPeak = second.value;
      if (second.time) alteredAt.tempPeak = second.time;
    } else if (list.length >= 2) {
      var sec = list[list.length - 2];
      vitals[getVitalExtraStorageKey(key)] = sec.value;
      if (sec.time) alteredAt[getVitalExtraStorageKey(key)] = sec.time;
    }
  });
  return { vitals, alteredAt };
}
function collectVitalReadingsInRegistroWindow(historial, vitalKey, now) {
  var hist = Array.isArray(historial) ? historial : [];
  var all = [];
  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== "object") continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : "";
    var series = vitalSeriesFromMedicion(row);
    var list = series[vitalKey] || [];
    for (var j = 0; j < list.length; j++) {
      var rd = list[j];
      var ms = gluPointMs(recordedAt, rd.time || "");
      if (!isGluPointInRegistroWindow(ms, now)) continue;
      pushVitalReading(all, rd);
    }
  }
  return all;
}

// public/js/features/estado-actual-data-snapshot-helpers.mjs
function hasIoNumber(v) {
  return v != null && v !== "";
}
function applyVitalReading(vitals, alteredAt, key, val, rowAlt) {
  if (val == null || val === "") return;
  vitals[key] = val;
  if (rowAlt && rowAlt[key] != null && String(rowAlt[key]).length > 0) {
    alteredAt[key] = String(rowAlt[key]);
  } else {
    delete alteredAt[key];
  }
}
function rowVitalsAndAltered(row) {
  if (!row || typeof row !== "object") {
    return { rv: {}, rowAlt: {} };
  }
  var r = row;
  var rv = r.vitals && typeof r.vitals === "object" ? r.vitals : {};
  var rowAlt = r.alteredAt && typeof r.alteredAt === "object" ? (
    /** @type {Record<string, string>} */
    r.alteredAt
  ) : {};
  return { rv, rowAlt };
}
function normalizeBombaEntry(e) {
  if (!e || typeof e !== "object") return null;
  var v = Number(e.value);
  var u = Number(e.units);
  if (!Number.isFinite(v)) return null;
  return {
    value: v,
    units: Number.isFinite(u) ? u : 0,
    time: e.time != null ? String(e.time) : void 0
  };
}
function nonemptyGlucometrias(garr) {
  var nonempty = (
    /** @type {Array<{ value?: unknown, time?: string }>} */
    []
  );
  for (var gg of garr) {
    if (!gg || typeof gg !== "object") continue;
    if (gg.value != null && gg.value !== "") nonempty.push(gg);
  }
  return nonempty;
}
function bombaFromRow(row) {
  if (!row || typeof row !== "object") return [];
  var barr = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
  return barr.map(normalizeBombaEntry).filter(Boolean);
}
function glucometriasFromRow(row) {
  if (!row || typeof row !== "object") return [];
  return Array.isArray(row.glucometrias) ? row.glucometrias : [];
}
function absorbIoRow(rowIo, state) {
  if (state.egrPartsSeen === null && Array.isArray(rowIo.egrParts) && rowIo.egrParts.length) {
    state.egrPartsSeen = rowIo.egrParts.slice();
    state.egrSeen = ioNumericEgressTotal(rowIo) ?? ioDiuresisForBalance(rowIo);
  }
  if (state.egrSeen === null && rowIo.egr != null && rowIo.egr !== "") state.egrSeen = rowIo.egr;
  if (state.evacSeen === null && rowIo.evac != null && rowIo.evac !== "") state.evacSeen = rowIo.evac;
  if (state.ingSeen === null && hasIoNumber(rowIo.ing)) state.ingSeen = rowIo.ing;
}

// public/js/features/estado-actual-data-snapshot.mjs
function applyRowVitals(vitals, alteredAt, rv, rowAlt) {
  for (var vk of VITAL_KEYS) {
    applyVitalReading(vitals, alteredAt, vk, rv[vk], rowAlt);
  }
  for (var ex = 0; ex < VITAL_BASE_KEYS.length; ex++) {
    var baseK = VITAL_BASE_KEYS[ex];
    var extraK = getVitalExtraStorageKey(baseK);
    applyVitalReading(vitals, alteredAt, extraK, rv[extraK], rowAlt);
  }
}
function deriveVitalsFromHistorial_(sortedAsc) {
  var vitals = {};
  for (var v0 of VITAL_KEYS) vitals[v0] = null;
  var alteredAt = (
    /** @type {Record<string, string>} */
    {}
  );
  for (var iRow = 0; iRow < sortedAsc.length; iRow++) {
    var parsed = rowVitalsAndAltered(sortedAsc[iRow]);
    applyRowVitals(vitals, alteredAt, parsed.rv, parsed.rowAlt);
  }
  return { vitals, alteredAt };
}
function gluBlockFromRow(row) {
  var bombas = bombaFromRow(row);
  if (bombas.length) return { glucometrias: [], bombaInsulina: bombas };
  var nonempty = nonemptyGlucometrias(glucometriasFromRow(row));
  if (!nonempty.length) return null;
  var rowRecordedAt = row && row.recordedAt != null ? String(row.recordedAt) : "";
  return { glucometrias: sortGlucometriasChronologically(nonempty, rowRecordedAt), bombaInsulina: [] };
}
function deriveGluFromHistorial_(sortedAsc) {
  for (var j = sortedAsc.length - 1; j >= 0; j--) {
    var block = gluBlockFromRow(sortedAsc[j]);
    if (block) return block;
  }
  return { glucometrias: [], bombaInsulina: [] };
}
function deriveIoFromHistorial_(sortedAsc) {
  var state = {
    ingSeen: (
      /** @type {null | unknown} */
      null
    ),
    egrSeen: (
      /** @type {null | unknown} */
      null
    ),
    egrPartsSeen: (
      /** @type {IoEgresoPart[] | null} */
      null
    ),
    evacSeen: (
      /** @type {null | unknown} */
      null
    )
  };
  for (var k2 = sortedAsc.length - 1; k2 >= 0; k2--) {
    var rIo = sortedAsc[k2];
    if (!rIo || typeof rIo !== "object") continue;
    var rowIo = rIo.io && typeof rIo.io === "object" ? rIo.io : {};
    absorbIoRow(rowIo, state);
    if (state.ingSeen !== null && (state.egrSeen !== null || state.egrPartsSeen) && state.evacSeen !== null) break;
  }
  var snapIo = { ing: state.ingSeen, egr: state.egrSeen };
  if (state.egrPartsSeen) snapIo.egrParts = state.egrPartsSeen;
  if (state.evacSeen !== null) snapIo.evac = state.evacSeen;
  return snapIo;
}
function deriveVitalSeriesFromHistorial_(sortedAsc) {
  var vitalSeries = {};
  for (var si = 0; si < sortedAsc.length; si++) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== "object") continue;
    var recordedAt = (
      /** @type {any} */
      srow.recordedAt != null ? String(
        /** @type {any} */
        srow.recordedAt
      ) : ""
    );
    var fromRow = vitalSeriesFromMedicion(srow);
    VITAL_BASE_KEYS.forEach(function(bk) {
      if (!vitalSeries[bk]) vitalSeries[bk] = [];
      var list = fromRow[bk] || [];
      for (var ri = 0; ri < list.length; ri++) {
        var rd = list[ri];
        var dup = vitalSeries[bk].some(function(x) {
          return x.value === rd.value && (x.time || "") === (rd.time || "") && (x.recordedAt || "") === recordedAt;
        });
        if (!dup) vitalSeries[bk].push({ value: rd.value, time: rd.time, recordedAt });
      }
    });
  }
  return vitalSeries;
}
function deriveVitalSeriesProvenanceFromHistorial_(sortedAsc, vitalKey) {
  var out = [];
  for (var si = 0; si < sortedAsc.length; si++) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== "object") continue;
    var recordedAt = (
      /** @type {any} */
      srow.recordedAt != null ? String(
        /** @type {any} */
        srow.recordedAt
      ) : ""
    );
    var fromRow = vitalSeriesFromMedicion(srow)[vitalKey] || [];
    for (var ri = 0; ri < fromRow.length; ri++) {
      var rd = fromRow[ri];
      var dup = out.some(function(x) {
        return x.value === rd.value && (x.time || "") === (rd.time || "") && x.recordedAt === recordedAt;
      });
      if (!dup) out.push({ value: rd.value, time: rd.time, recordedAt });
    }
  }
  return out;
}
function deriveTempPeakAtFromHistorial_(sortedAsc) {
  var series = deriveVitalSeriesProvenanceFromHistorial_(sortedAsc, "temp");
  if (series.length < 2) return null;
  var peak = series[series.length - 2];
  return { recordedAt: peak.recordedAt, time: peak.time };
}
function appendVitalsBpFallback(tasList, tadList, rv, rowAlt) {
  if (!tasList.length && rv.tas != null && rv.tas !== "") {
    tasList.push({ value: Number(rv.tas), time: rowAlt.tas });
  }
  if (!tadList.length && rv.tad != null && rv.tad !== "") {
    tadList.push({ value: Number(rv.tad), time: rowAlt.tad });
  }
}
function collectBpListsFromHistorialRow(row) {
  if (!row || typeof row !== "object") return null;
  var r = row;
  var recordedAt = r.recordedAt != null ? String(r.recordedAt) : "";
  var fromRow = vitalSeriesFromMedicion(row);
  var tasList = (fromRow.tas || []).slice();
  var tadList = (fromRow.tad || []).slice();
  var rv = r.vitals && typeof r.vitals === "object" ? r.vitals : {};
  var rowAlt = r.alteredAt && typeof r.alteredAt === "object" ? r.alteredAt : {};
  appendVitalsBpFallback(tasList, tadList, rv, rowAlt);
  return { recordedAt, tasList, tadList };
}
function appendBpPairsFromLayers(pairs, recordedAt, tasList, tadList) {
  var layers = Math.max(tasList.length, tadList.length);
  if (!layers) return;
  for (var li = 0; li < layers; li++) {
    var tasReading = tasList[li] || null;
    var tadReading = tadList[li] || null;
    if (!tasReading && !tadReading) continue;
    var time = tasReading && tasReading.time ? String(tasReading.time) : tadReading && tadReading.time ? String(tadReading.time) : void 0;
    pairs.push({
      tas: tasReading && Number.isFinite(Number(tasReading.value)) ? Number(tasReading.value) : null,
      tad: tadReading && Number.isFinite(Number(tadReading.value)) ? Number(tadReading.value) : null,
      recordedAt,
      time
    });
  }
}
function deriveBpPairsFromHistorial_(sortedAsc) {
  var pairs = [];
  for (var i = 0; i < sortedAsc.length; i++) {
    var collected = collectBpListsFromHistorialRow(sortedAsc[i]);
    if (!collected) continue;
    appendBpPairsFromLayers(pairs, collected.recordedAt, collected.tasList, collected.tadList);
  }
  return pairs;
}

// public/js/features/estado-actual-data-model.mjs
function emptyEstadoClinico() {
  return {
    four: "",
    esferas: "",
    analgesia: "",
    antiemeticos: "",
    sedacion: "",
    antiepilepticos: "",
    antiparkinsonianos: "",
    antidotos: "",
    viaAerea: "",
    abx: "",
    transfusiones: "",
    antihta: "",
    diureticos: "",
    antitromboticos: "",
    anticoagulacion: "",
    antiarritmicos: "",
    estatinas: "",
    vasop: "",
    nm: "",
    soporte: "",
    soporteLitros: "",
    soporteFlujoLmin: "",
    soporteFio2: "",
    vmModo: "",
    vmPeep: "",
    vmVt: "",
    vmFlujo: "",
    vmPmeseta: "",
    vmPsoporte: "",
    pao2: "",
    tempContext: "",
    dieta: "",
    kcalKg: "",
    kcal: "",
    proteinG: "",
    pesoRef: ""
  };
}
function emptyPendienteReceta() {
  const o = {};
  for (var k of Object.keys(emptyEstadoClinico())) {
    o[k] = "";
  }
  return o;
}
function emptyMonitoreo() {
  var confirmado = { dieta: false };
  for (var mk of MED_FIELD_KEYS) {
    confirmado[mk] = false;
  }
  return {
    estadoClinico: emptyEstadoClinico(),
    confirmado,
    pendienteReceta: emptyPendienteReceta(),
    historial: [],
    textoGuardado: { text: "", savedAt: null },
    bombaInsulinaAlgoritmo: null
  };
}

// public/js/features/estado-actual-data-merge.mjs
var DIET_KEYS = ["dieta", "kcal", "proteinG"];
var EC_SCALAR_KEYS = ["four", "esferas", "soporte", "kcalKg", "tempContext", "pesoRef"];
function compareSavedAt(a, b) {
  if ((a == null || a === "") && (b == null || b === "")) return 0;
  if (a == null || a === "") return -1;
  if (b == null || b === "") return 1;
  return String(a).localeCompare(String(b));
}
function medicionMergeKey(row) {
  if (!row || typeof row !== "object") return "";
  var r = row;
  if (r.recordedAt != null && String(r.recordedAt).trim()) return String(r.recordedAt);
  if (r.createdAt != null && String(r.createdAt).trim()) return String(r.createdAt);
  return String(r.id || "");
}
function mergeHistorialMonitoreo(localHist, remoteHist) {
  var map = /* @__PURE__ */ new Map();
  var combined = (localHist || []).concat(remoteHist || []);
  for (var i = 0; i < combined.length; i += 1) {
    var row = combined[i];
    if (!row || typeof row !== "object") continue;
    var r = row;
    var id = String(r.id || "").trim();
    if (!id) continue;
    var cur = map.get(id);
    if (!cur || compareSavedAt(medicionMergeKey(r), medicionMergeKey(cur)) > 0) {
      map.set(id, structuredClone(r));
    }
  }
  return Array.from(map.values()).sort(function(a, b) {
    return compareSavedAt(medicionMergeKey(a), medicionMergeKey(b));
  });
}
function mergeEstadoClinicoScalars(resEco, remEco, localAt, remoteAt) {
  var remoteNewer = compareSavedAt(remoteAt, localAt) > 0;
  for (var sk = 0; sk < EC_SCALAR_KEYS.length; sk += 1) {
    var scalarKey = EC_SCALAR_KEYS[sk];
    var localScalar = String(resEco[scalarKey] || "").trim();
    var remoteScalar = String(remEco[scalarKey] || "").trim();
    if (remoteNewer) {
      if (remoteScalar || !localScalar) resEco[scalarKey] = remEco[scalarKey];
    } else if (!localScalar && remoteScalar) {
      resEco[scalarKey] = remEco[scalarKey];
    }
  }
}
function mergeConfirmedMedFields(resEco, resCf, remEco, remCf) {
  for (var mk of MED_FIELD_KEYS) {
    if (remCf[mk] && !resCf[mk]) {
      resEco[mk] = remEco[mk];
      resCf[mk] = true;
    }
  }
}
function pendienteOf(monitoreo) {
  return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" ? monitoreo.pendienteReceta : {};
}
function mergeDietPending(result, resEco, resCf, local, remote) {
  var locPend = pendienteOf(local);
  var remPend = pendienteOf(remote);
  var remEco = remote.estadoClinico || emptyEstadoClinico();
  var remCf = remote.confirmado || {};
  if (!result.pendienteReceta || typeof result.pendienteReceta !== "object") {
    result.pendienteReceta = emptyPendienteReceta();
  }
  if (resCf.dieta || String(resEco.dieta || "").trim()) {
    clearDietPending(result.pendienteReceta);
    return;
  }
  if (remCf.dieta && String(remEco.dieta || "").trim()) {
    applyRemoteConfirmedDiet(resEco, remEco, result.pendienteReceta, resCf);
    return;
  }
  mergeDietPendingFields(result.pendienteReceta, locPend, remPend);
  if (resCf.dieta == null) resCf.dieta = !!remCf.dieta;
}
function clearDietPending(pendienteReceta) {
  for (var dk of DIET_KEYS) pendienteReceta[dk] = "";
}
function applyRemoteConfirmedDiet(resEco, remEco, pendienteReceta, resCf) {
  for (var dk2 of DIET_KEYS) {
    resEco[dk2] = remEco[dk2];
    pendienteReceta[dk2] = "";
  }
  resCf.dieta = true;
}
function mergeDietPendingFields(pendienteReceta, locPend, remPend) {
  for (var dk3 of DIET_KEYS) {
    var localPending = locPend[dk3];
    var remotePending = remPend[dk3];
    if (localPending != null && String(localPending).trim()) {
      pendienteReceta[dk3] = String(localPending).trim();
    } else if (remotePending != null && String(remotePending).trim()) {
      pendienteReceta[dk3] = String(remotePending).trim();
    } else {
      pendienteReceta[dk3] = "";
    }
  }
}
function mergeTextoGuardadoLww(result, remote) {
  var locT = result.textoGuardado || { text: "", savedAt: null };
  var remT = remote.textoGuardado || { text: "", savedAt: null };
  result.textoGuardado = compareSavedAt(remT.savedAt, locT.savedAt) > 0 ? structuredClone(remT) : structuredClone(locT);
}
function applyEstadoClinicoUpdatedAt(result, localEcAt, remoteEcAt) {
  if (compareSavedAt(remoteEcAt, localEcAt) > 0) {
    result.estadoClinicoUpdatedAt = remoteEcAt;
  } else if (localEcAt) {
    result.estadoClinicoUpdatedAt = localEcAt;
  }
}
function mergeMonitoreo(localIn, remoteIn) {
  var local = (
    /** @type {any} */
    structuredClone(localIn)
  );
  var remote = (
    /** @type {any} */
    structuredClone(remoteIn)
  );
  var lHist = Array.isArray(local?.historial) ? local.historial : [];
  var rHist = Array.isArray(remote?.historial) ? remote.historial : [];
  var result = (
    /** @type {any} */
    structuredClone(localIn)
  );
  result.historial = mergeHistorialMonitoreo(lHist, rHist);
  mergeTextoGuardadoLww(result, remote);
  var resEco = result.estadoClinico || emptyEstadoClinico();
  var resCf = result.confirmado || {};
  var remEco = remote.estadoClinico || emptyEstadoClinico();
  var remCf = remote.confirmado || {};
  var localEcAt = local && local.estadoClinicoUpdatedAt != null ? String(local.estadoClinicoUpdatedAt) : "";
  var remoteEcAt = remote && remote.estadoClinicoUpdatedAt != null ? String(remote.estadoClinicoUpdatedAt) : "";
  mergeEstadoClinicoScalars(resEco, remEco, localEcAt, remoteEcAt);
  mergeConfirmedMedFields(resEco, resCf, remEco, remCf);
  mergeDietPending(result, resEco, resCf, local, remote);
  result.estadoClinico = resEco;
  result.confirmado = resCf;
  applyEstadoClinicoUpdatedAt(result, localEcAt, remoteEcAt);
  return result;
}

// public/js/features/estado-actual-meds-diet.mjs
var DIET_PENDING_KEYS = (
  /** @type {const} */
  ["dieta", "kcal", "proteinG"]
);
function dietMatchFingerprint(dietaText, kcal, proteinG) {
  var label = stripDietaMacroSuffixFromLabel(dietaText);
  if (isDietaSuplemento(label)) return "SUPLEMENTO||";
  if (isDietaAyuno(label)) return "AYUNO||";
  var k = kcal != null && kcal !== "" ? String(kcal) : "";
  var p = proteinG != null && proteinG !== "" ? String(proteinG) : "";
  return label + "|" + k + "|" + p;
}
function confirmedDietFingerprint(ec) {
  return dietMatchFingerprint(ec.dieta, ec.kcal, ec.proteinG);
}
function mergedDietFingerprint(merged) {
  var dietaText = String(merged.descripcion || "").trim() || buildDietProposalText(merged);
  return dietMatchFingerprint(dietaText, merged.kcal, merged.proteinG);
}
function normalizedDietTypeLabel(dietaText) {
  var label = stripDietaMacroSuffixFromLabel(dietaText);
  if (isDietaSuplemento(label)) return "SUPLEMENTO";
  if (isDietaAyuno(label)) return "AYUNO";
  return label;
}
function hasActiveDietProposal(pendienteReceta) {
  return DIET_PENDING_KEYS.some(function(k) {
    return pendienteReceta && pendienteReceta[k] && String(pendienteReceta[k]).trim();
  });
}
function dietStateObjects(monitoreo) {
  var ec = monitoreo.estadoClinico && typeof monitoreo.estadoClinico === "object" ? monitoreo.estadoClinico : {};
  var conf = monitoreo.confirmado && typeof monitoreo.confirmado === "object" ? monitoreo.confirmado : {};
  return { ec, conf };
}
function mergedMatchesConfirmedDiet(ec, merged) {
  if (confirmedDietFingerprint(ec) === mergedDietFingerprint(merged)) return true;
  var mergedDietaText = String(merged.descripcion || "").trim() || buildDietProposalText(merged);
  if (normalizedDietTypeLabel(ec.dieta) === normalizedDietTypeLabel(mergedDietaText)) return true;
  return mergedDietFingerprint(merged) === confirmedDietFingerprint(ec);
}
function shouldSkipDietProposal(monitoreo, opts, merged) {
  opts = opts || {};
  if (isRecetaProposalDismissed(monitoreo, "dieta")) return true;
  if (!opts.force && hasActiveDietProposal(getPendienteReceta(monitoreo))) return true;
  var state = dietStateObjects(monitoreo);
  if (merged && mergedDietHasContent(merged) && mergedMatchesConfirmedDiet(state.ec, merged)) {
    return true;
  }
  if (!state.conf.dieta) return false;
  if (merged && mergedDietHasContent(merged)) return mergedMatchesConfirmedDiet(state.ec, merged);
  return true;
}
function backfillPendingMacroField(pend, field, mergedValue) {
  if (String(pend[field] || "").trim()) return;
  if (mergedValue == null || mergedValue === "") return;
  pend[field] = String(mergedValue);
}
function backfillDietPendingMacrosFromReceta(monitoreo, recetaBlock) {
  if (!monitoreo || !hasActiveDietProposal(getPendienteReceta(monitoreo))) return;
  if (!recetaBlock || !Array.isArray(recetaBlock.dietas) || !recetaBlock.dietas.length) return;
  var merged = mergedDietFromReceta(recetaBlock.dietas);
  if (!mergedDietHasContent(merged)) return;
  var pend = getPendienteReceta(monitoreo);
  if (!pend) return;
  var mergedDietaText = String(merged.descripcion || "").trim() || buildDietProposalText(merged);
  if (normalizedDietTypeLabel(pend.dieta) !== normalizedDietTypeLabel(mergedDietaText)) return;
  backfillPendingMacroField(pend, "kcal", merged.kcal);
  backfillPendingMacroField(pend, "proteinG", merged.proteinG);
}
function clearDietPending2(monitoreo) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") return;
  DIET_PENDING_KEYS.forEach(function(k) {
    monitoreo.pendienteReceta[k] = "";
  });
}
function clearDietOptions(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  delete monitoreo.dietOptions;
  delete monitoreo.dietOptionSelected;
}
function getDietOptions(monitoreo) {
  return Array.isArray(monitoreo && monitoreo.dietOptions) ? monitoreo.dietOptions : [];
}
function storeDietOptions(monitoreo, candidates) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  monitoreo.dietOptions = Array.isArray(candidates) ? candidates.slice() : [];
  monitoreo.dietOptionSelected = 0;
}
function writeDietProposalFromCandidate(monitoreo, candidate) {
  writeDietProposal(monitoreo, {
    descripcion: candidate.descripcion,
    kcal: candidate.kcal,
    proteinG: candidate.proteinG
  });
}
function selectDietOption(monitoreo, index) {
  var options = getDietOptions(monitoreo);
  if (!options.length || index < 0 || index >= options.length) return false;
  monitoreo.dietOptionSelected = index;
  var candidate = options[index];
  writeDietProposalFromCandidate(monitoreo, candidate);
  return true;
}
function tryAutoConfirmMatchingDiet(monitoreo, merged) {
  if (!monitoreo || !merged || !mergedDietHasContent(merged)) return false;
  var ec = monitoreo.estadoClinico && typeof monitoreo.estadoClinico === "object" ? monitoreo.estadoClinico : {};
  var conf = monitoreo.confirmado && typeof monitoreo.confirmado === "object" ? monitoreo.confirmado : {};
  if (conf.dieta) return false;
  if (confirmedDietFingerprint(ec) !== mergedDietFingerprint(merged)) return false;
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") {
    monitoreo.confirmado = {};
  }
  monitoreo.confirmado.dieta = true;
  clearDietPending2(monitoreo);
  return true;
}
function markDietAsManuallyConfirmed(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") {
    monitoreo.confirmado = {};
  }
  monitoreo.confirmado.dieta = true;
  clearDietPending2(monitoreo);
  clearDietOptions(monitoreo);
}
function getPendienteReceta(monitoreo) {
  return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" ? monitoreo.pendienteReceta : null;
}
function ensurePendienteRecetaObject(monitoreo) {
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") {
    monitoreo.pendienteReceta = {};
  }
  return monitoreo.pendienteReceta;
}
function resolveDietProposalText(merged) {
  var dietaText = String(merged.descripcion || "").trim() || buildDietProposalText(merged);
  dietaText = stripDietaMacroSuffixFromLabel(dietaText) || String(dietaText || "").trim();
  if (isDietaSuplemento(dietaText)) dietaText = "SUPLEMENTO";
  return dietaText;
}
function writeDietProposalMacros(pendienteReceta, merged, dietaText) {
  if (!applyDietaSuplementoPolicy(pendienteReceta) && !isDietaParenteral(dietaText)) {
    pendienteReceta.kcal = merged.kcal != null ? String(merged.kcal) : "";
    pendienteReceta.proteinG = merged.proteinG != null ? String(merged.proteinG) : "";
  } else if (isDietaParenteral(dietaText)) {
    pendienteReceta.kcal = merged.kcal != null ? String(merged.kcal) : "";
    pendienteReceta.proteinG = merged.proteinG != null ? String(merged.proteinG) : "";
    pendienteReceta.kcalKg = "";
  }
}
function writeDietProposal(monitoreo, merged) {
  var pendienteReceta = ensurePendienteRecetaObject(monitoreo);
  var dietaText = resolveDietProposalText(merged);
  pendienteReceta.dieta = dietaText;
  writeDietProposalMacros(pendienteReceta, merged, dietaText);
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") {
    monitoreo.confirmado = {};
  }
  monitoreo.confirmado.dieta = false;
}
function mergedDietFromReceta(dietas) {
  return mergeDietaItems(dietas);
}
function mergedDietHasContent(merged) {
  var desc = String(merged.descripcion || "").trim();
  return !!(desc || merged.kcal != null || merged.proteinG != null);
}

// public/js/insulin-pump-receta-display.mjs
function insulinPumpNmSoapFragment(allItems, soapSelectedItems) {
  var alg = detectInsulinPumpAlgorithmFromRecetaItems(allItems);
  if (alg == null) return null;
  var selected = Array.isArray(soapSelectedItems) ? soapSelectedItems : [];
  var hasInsulinSoap = selected.some(function(it) {
    return isInsulinIvMedicationItem(it);
  });
  if (!hasInsulinSoap) return null;
  return formatInsulinPumpAlgoritmoLabel(alg);
}
function skipRecetaItemForNmSoapBucket(item, allItems) {
  var alg = detectInsulinPumpAlgorithmFromRecetaItems(allItems);
  if (alg == null) return false;
  return isInsulinIvMedicationItem(item);
}
function skipRecetaItemForInsulinPumpCarrier(item, allItems) {
  return isInsulinPumpCarrierMedicationItem(item, allItems);
}

// public/js/insulin-rescate-display.mjs
var INSULIN_RESCATE_GROUP_ID = "__insulin_rescate_group__";
var INSULIN_RESCATE_NM_LABEL = "RESCATES DE INSULINA";
function insulinRescateNmSoapFragment(allItems, soapSelected) {
  if (!patientHasInsulinRescateMeds(allItems)) return null;
  var selected = Array.isArray(soapSelected) ? soapSelected : [];
  var hasRescateSoap = selected.some(isInsulinRescateMedicationItem);
  if (!hasRescateSoap) return null;
  return INSULIN_RESCATE_NM_LABEL;
}
function skipRecetaItemForInsulinRescateBucket(item, allItems) {
  if (!patientHasInsulinRescateMeds(allItems)) return false;
  return isInsulinRescateMedicationItem(item);
}
function insulinRescateMedLabelHtml(escFn) {
  return escFn(INSULIN_RESCATE_NM_LABEL);
}
function isInsulinRescateGroupSoapSelected(patientId, items, isSelectedFn) {
  var rescates = insulinRescateItemsFromList(items);
  if (!rescates.length) return false;
  return rescates.some(function(it) {
    return isSelectedFn(patientId, String(
      /** @type {{ id?: unknown }} */
      it.id || ""
    ));
  });
}
function isInsulinRescateGroupSuspended(items, isSuspendedFn) {
  var rescates = insulinRescateItemsFromList(items);
  if (!rescates.length) return false;
  return rescates.every(function(it) {
    return isSuspendedFn(String(
      /** @type {{ id?: unknown }} */
      it.id || ""
    ));
  });
}

// public/js/insulin-prandial-detect.mjs
var INSULIN_RE2 = /\bINSULINA\b/i;
var SC_VIA_RE2 = /\b(?:VIA\s+)?SUBCUT[AÁ]NEA\b|\bSC\b/i;
var PRANDIAL_SLOT_PATTERNS = [
  {
    key: "desayuno",
    label: "DESAYUNO",
    re: /\b(?:ANTES\s+DEL\s+DESAYUNO|ANTES\s+DE\s+(?:LA\s+)?DESAYUNO|EN\s+AM)\b/i
  },
  {
    key: "comida",
    label: "COMIDA",
    re: /\b(?:ANTES\s+DE\s+LA\s+COMIDA|ANTES\s+DEL\s+ALMUERZO|EN\s+MEDIOD[IÍ]A)\b/i
  },
  {
    key: "cena",
    label: "CENA",
    re: /\b(?:ANTES\s+DE\s+LA\s+CENA|ANTES\s+DEL\s+CENA|EN\s+PM)\b/i
  }
];
var PRANDIAL_MEAL_ORDER = ["desayuno", "comida", "cena"];
function itemBlob(item) {
  return [item.dosisRaw, item.frecuenciaRaw].map(function(x) {
    return String(x || "");
  }).join(" ");
}
function parseInsulinPrandialSlot(blob) {
  var s = String(blob || "");
  for (var i = 0; i < PRANDIAL_SLOT_PATTERNS.length; i += 1) {
    var slot = PRANDIAL_SLOT_PATTERNS[i];
    if (slot.re.test(s)) return slot.key;
  }
  return null;
}
function extractInsulinPrandialUnits(dosisRaw) {
  var left = String(dosisRaw || "").split("//")[0].trim();
  var m = left.match(/(\d+(?:[.,]\d+)?)\s*(?:UI|U\.?I\.?|UNIDADES?)\b/i);
  if (!m) return null;
  var n = Number(String(m[1]).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}
function isInsulinPrandialMedicationItem(item) {
  if (!item || item.suspendido) return false;
  if (isInsulinRescateMedicationItem(item)) return false;
  if (!INSULIN_RE2.test(String(item.nombreRaw || ""))) return false;
  if (!SC_VIA_RE2.test(String(item.viaRaw || ""))) return false;
  return parseInsulinPrandialSlot(itemBlob(item)) != null;
}
function insulinPrandialItemsFromList(items) {
  return (Array.isArray(items) ? items : []).filter(isInsulinPrandialMedicationItem);
}
function patientHasInsulinPrandialMeds(items) {
  return insulinPrandialItemsFromList(items).length > 0;
}
function insulinPrandialSlotLabel(slotKey) {
  for (var i = 0; i < PRANDIAL_SLOT_PATTERNS.length; i += 1) {
    if (PRANDIAL_SLOT_PATTERNS[i].key === slotKey) return PRANDIAL_SLOT_PATTERNS[i].label;
  }
  return String(slotKey || "").toUpperCase();
}

// public/js/insulin-prandial-display.mjs
var INSULIN_PRANDIAL_GROUP_ID = "__insulin_prandial_group__";
var INSULIN_PRANDIAL_NM_PREFIX = "INSULINA PREPRANDIAL";
function itemBlob2(item) {
  return [item.dosisRaw, item.frecuenciaRaw].map(function(x) {
    return String(x || "");
  }).join(" ");
}
function insulinPrandialLatestBySlot(items) {
  var bySlot = {};
  insulinPrandialItemsFromList(items).forEach(function(it) {
    var slot = parseInsulinPrandialSlot(itemBlob2(
      /** @type {{ dosisRaw?: unknown, frecuenciaRaw?: unknown }} */
      it
    ));
    if (slot) bySlot[slot] = it;
  });
  return bySlot;
}
function formatInsulinPrandialUnits(units) {
  if (units == null) return "";
  return String(units).replace(/\.0$/, "") + " UI SC";
}
function formatInsulinPrandialNmBody(bySlot) {
  var slots = [];
  PRANDIAL_MEAL_ORDER.forEach(function(key) {
    if (!bySlot[key]) return;
    var item = (
      /** @type {{ dosisRaw?: unknown }} */
      bySlot[key]
    );
    slots.push({ key, units: extractInsulinPrandialUnits(item.dosisRaw) });
  });
  if (!slots.length) return "";
  var unitValues = slots.map(function(s) {
    return s.units;
  }).filter(function(u) {
    return u != null;
  });
  var allSameUnits = unitValues.length >= 2 && unitValues.length === slots.length && unitValues.every(function(u) {
    return u === unitValues[0];
  });
  if (allSameUnits && unitValues[0] != null) {
    return formatInsulinPrandialUnits(unitValues[0]) + " PREVIO A COMIDAS";
  }
  var parts = [];
  slots.forEach(function(s) {
    var label = insulinPrandialSlotLabel(s.key);
    if (s.units == null) parts.push(label);
    else parts.push(formatInsulinPrandialUnits(s.units) + " " + label);
  });
  return parts.join(", ");
}
function insulinPrandialNmSoapFragment(allItems, soapSelected) {
  if (!patientHasInsulinPrandialMeds(allItems)) return null;
  var selected = (Array.isArray(soapSelected) ? soapSelected : []).filter(isInsulinPrandialMedicationItem);
  if (!selected.length) return null;
  var bySlot = insulinPrandialLatestBySlot(selected);
  var body = formatInsulinPrandialNmBody(bySlot);
  if (!body) return null;
  return INSULIN_PRANDIAL_NM_PREFIX + ": " + body;
}
function skipRecetaItemForInsulinPrandialBucket(item, allItems) {
  if (!patientHasInsulinPrandialMeds(allItems)) return false;
  return isInsulinPrandialMedicationItem(item);
}
function insulinPrandialMedLabelHtml(allItems, escFn) {
  var frag = insulinPrandialNmSoapFragment(allItems, allItems);
  return escFn(frag || INSULIN_PRANDIAL_NM_PREFIX);
}
function isInsulinPrandialGroupSoapSelected(patientId, items, isSelectedFn) {
  var prandial = insulinPrandialItemsFromList(items);
  if (!prandial.length) return false;
  return prandial.some(function(it) {
    return isSelectedFn(patientId, String(
      /** @type {{ id?: unknown }} */
      it.id || ""
    ));
  });
}
function isInsulinPrandialGroupSuspended(items, isSuspendedFn) {
  var prandial = insulinPrandialItemsFromList(items);
  if (!prandial.length) return false;
  return prandial.every(function(it) {
    return isSuspendedFn(String(
      /** @type {{ id?: unknown }} */
      it.id || ""
    ));
  });
}

// public/js/potassium-repos-detect.mjs
var KCL_RE = /\bCLORURO\s+DE\s+POTASIO\b/i;
var K_PHOS_RE = /\bFOSFATO\s+DE\s+POTASIO\b/i;
var K_ACETATE_RE = /\bACETATO\s+DE\s+POTASIO\b/i;
var NACL_RE = /\bCLORURO\s+DE\s+SODIO\b/i;
var HOUR_UNIT_RE = "(?:HORA|HORAS|HRS?|HR)";
var CC_ML_RE = "(?:CC|ML)";
function parseInfusionNum(raw) {
  if (raw == null || raw === "") return null;
  var n = Number(String(raw).replace(/,/g, ".").trim());
  return Number.isFinite(n) ? n : null;
}
function normalizeInfusionCarrierBlob(parts) {
  var t = (parts || []).map(function(x) {
    return trimStr(x);
  }).join(" ");
  t = t.replace(/VEL\.?\s*INF\.?/gi, " VEL.INF ").replace(/VEL\s+DE\s+INFUSI[ÓO]N/gi, " VEL.INF ").replace(/VELOCIDAD\s+DE\s+INFUSI[ÓO]N/gi, " VEL.INF ").replace(/(\d+(?:[.,]\d+)?)(CC|ML)\b/gi, "$1 $2").replace(/(\d)(CC|ML)(?=\/)/gi, "$1 $2").replace(/(CC|ML)\s*\/\s*/gi, "$1 / ").replace(/(\d)(CC|ML)(?=\s*(?:\/|HR|HRS|H\b|HORA|HORAS|POR))/gi, "$1 $2").replace(/\bHRS\b/gi, "HORAS").replace(/\bHR\b/gi, "HORA").replace(/\bPOR\s+HORA\b/gi, "/ HORA").replace(/\bAL\s+HORA\b/gi, "/ HORA").replace(
    new RegExp(
      "\\bA\\s+(\\d+(?:[.,]\\d+)?)\\s*(" + CC_ML_RE + ")\\s*(?:\\/\\s*)?(?:POR\\s+)?" + HOUR_UNIT_RE + "\\b",
      "gi"
    ),
    "$1 $2 / HORA"
  ).replace(/\s+/g, " ").trim().toUpperCase();
  return t;
}
function infusionCarrierBlob(parts) {
  return normalizeInfusionCarrierBlob(parts);
}
function formatPotassiumReposHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "";
  var rounded = Math.round(hours * 10) / 10;
  var label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, "");
  return "A " + label + " HORAS";
}
function extractInfusionVolumeMl(blob) {
  var sources = [blob.split(/VEL\.INF/i)[0], blob];
  for (var i = 0; i < sources.length; i++) {
    var m = sources[i].match(new RegExp("(\\d+(?:[.,]\\d+)?)\\s*" + CC_ML_RE + "\\b", "i"));
    if (m) return parseInfusionNum(m[1]);
  }
  return null;
}
function extractCcPerHourFromSegment(segment) {
  if (!segment) return null;
  var slashRate = segment.match(
    new RegExp("(\\d+(?:[.,]\\d+)?)\\s*" + CC_ML_RE + "\\s*/\\s*" + HOUR_UNIT_RE + "\\b", "i")
  );
  if (slashRate) return parseInfusionNum(slashRate[1]);
  var plainRate = segment.match(
    new RegExp("(\\d+(?:[.,]\\d+)?)\\s*" + CC_ML_RE + "\\s+(?:POR\\s+)?" + HOUR_UNIT_RE + "\\b", "i")
  );
  if (plainRate) return parseInfusionNum(plainRate[1]);
  return null;
}
function extractVelInfCcPerHour(blob) {
  var segments = [];
  var vel = blob.match(/VEL\.INF\s*:\s*(.+)$/i);
  if (vel) segments.push(vel[1]);
  segments.push(blob);
  for (var i = 0; i < segments.length; i++) {
    var rate = extractCcPerHourFromSegment(segments[i]);
    if (rate != null) return rate;
  }
  return null;
}
function extractExplicitDurationHours(blob) {
  var para = blob.match(
    new RegExp("(?:PARA|EN|A)\\s+(\\d+(?:[.,]\\d+)?)\\s*" + HOUR_UNIT_RE + "\\b", "i")
  );
  if (para) return parseInfusionNum(para[1]);
  var vel = blob.match(/VEL\.INF\s*:\s*(.+)$/i);
  if (vel) {
    var directH = vel[1].match(new RegExp("^(\\d+(?:[.,]\\d+)?)\\s*" + HOUR_UNIT_RE + "\\b", "i"));
    if (directH) return parseInfusionNum(directH[1]);
  }
  return null;
}
function blobLooksLikeInfusionCarrier(blob) {
  if (!blob) return false;
  if (/VEL\.INF/i.test(blob)) return true;
  if (new RegExp("(?:PARA|EN|A)\\s+\\d+(?:[.,]\\d+)?\\s*" + HOUR_UNIT_RE + "\\b", "i").test(blob)) {
    return true;
  }
  if (new RegExp("\\d+(?:[.,]\\d+)?\\s*" + CC_ML_RE + "\\s*/\\s*" + HOUR_UNIT_RE + "\\b", "i").test(blob)) {
    return true;
  }
  return new RegExp(
    "\\d+(?:[.,]\\d+)?\\s*" + CC_ML_RE + "\\s+(?:POR\\s+)?" + HOUR_UNIT_RE + "\\b",
    "i"
  ).test(blob);
}
function potassiumReposDurationFromCarrierBlob(blob) {
  if (!blob) return "";
  var explicit = extractExplicitDurationHours(blob);
  if (explicit != null) return formatPotassiumReposHours(explicit);
  var volumeMl = extractInfusionVolumeMl(blob);
  var ccPerHour = extractVelInfCcPerHour(blob);
  if (volumeMl != null && ccPerHour != null && ccPerHour > 0) {
    return formatPotassiumReposHours(volumeMl / ccPerHour);
  }
  return "";
}
function isPotassiumReposMedicationItem(item) {
  return potassiumReposSaltKind(item) != null;
}
function potassiumReposSaltKind(item) {
  if (!item || item.suspendido) return null;
  var n = normalizeNombreForSoapClassify(item.nombreRaw);
  if (KCL_RE.test(n)) return "kcl";
  if (K_PHOS_RE.test(n)) return "kphos";
  if (K_ACETATE_RE.test(n)) return "kacetate";
  return null;
}
function potassiumReposTotalMeQ(items) {
  var total = 0;
  var any = false;
  potassiumReposItemsFromList(items).forEach(function(it) {
    var n = potassiumItemMeQ(it);
    if (n == null) return;
    total += n;
    any = true;
  });
  return any ? total : null;
}
function potassiumItemMeQ(item) {
  var m = String(item && item.dosisRaw || "").match(/(\d+(?:[.,]\d+)?)\s*MEQ/i);
  if (!m) return null;
  return parseInfusionNum(m[1]);
}
function potassiumReposItemsFromList(items) {
  return (Array.isArray(items) ? items : []).filter(isPotassiumReposMedicationItem);
}
function patientHasPotassiumReposMeds(items) {
  return potassiumReposItemsFromList(items).length > 0;
}
function isPotassiumReposCarrierMedicationItem(item, allItems) {
  if (!item || typeof item !== "object" || /** @type {{ suspendido?: boolean }} */
  item.suspendido) {
    return false;
  }
  if (!patientHasPotassiumReposMeds(allItems)) return false;
  if (isPotassiumReposMedicationItem(item)) return false;
  var n = normalizeNombreForSoapClassify(
    /** @type {{ nombreRaw?: unknown }} */
    item.nombreRaw
  );
  if (!NACL_RE.test(n)) return false;
  return blobLooksLikeInfusionCarrier(carrierItemInfusionBlob(item));
}
function carrierItemInfusionBlob(item) {
  return infusionCarrierBlob([item.dosisRaw, item.frecuenciaRaw]);
}
function findPotassiumReposCarrier(items) {
  var list = Array.isArray(items) ? items : [];
  for (var i = 0; i < list.length; i++) {
    if (isPotassiumReposCarrierMedicationItem(list[i], list)) return list[i];
  }
  return null;
}
function potassiumReposDurationClause(items) {
  var carrier = findPotassiumReposCarrier(items);
  if (!carrier) return "";
  return potassiumReposDurationFromCarrierBlob(
    carrierItemInfusionBlob(
      /** @type {{ dosisRaw?: unknown, frecuenciaRaw?: unknown }} */
      carrier
    )
  );
}

// public/js/potassium-repos-display.mjs
var POTASSIUM_REPOS_NM_PREFIX = "REPOSICI\xD3N DE POTASIO";
function formatMeQTotal(n) {
  var rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
function potassiumReposNmSoapFragment(allItems, soapSelected) {
  if (!patientHasPotassiumReposMeds(allItems)) return null;
  var selected = Array.isArray(soapSelected) ? soapSelected : [];
  var kSelected = selected.filter(isPotassiumReposMedicationItem);
  if (!kSelected.length) return null;
  var clause = POTASSIUM_REPOS_NM_PREFIX;
  var total = potassiumReposTotalMeQ(kSelected);
  if (total != null) clause += " " + formatMeQTotal(total) + " MEQ";
  var duration = potassiumReposDurationClause(allItems);
  if (duration) clause += " " + duration;
  return clause;
}
function skipRecetaItemForPotassiumReposBucket(item, allItems) {
  if (!patientHasPotassiumReposMeds(allItems)) return false;
  return isPotassiumReposMedicationItem(item);
}

// public/js/features/estado-actual-meds-receta-buckets.mjs
function medInstructionFragmentForSoap(it) {
  return formatMedicationSoapShort(it);
}
function maybeAddNmSpecialFragment(it, ctx, cat) {
  if (cat !== "nm") return false;
  if (skipRecetaItemForNmSoapBucket(it, ctx.list)) {
    if (ctx.pumpNmFrag && !ctx.pumpNmAdded) {
      ctx.arrays.nm.push(ctx.pumpNmFrag);
      ctx.pumpNmAdded = true;
    }
    return true;
  }
  if (skipRecetaItemForInsulinRescateBucket(it, ctx.list)) {
    if (ctx.rescateNmFrag && !ctx.rescateNmAdded) {
      ctx.arrays.nm.push(ctx.rescateNmFrag);
      ctx.rescateNmAdded = true;
    }
    return true;
  }
  if (skipRecetaItemForInsulinPrandialBucket(it, ctx.list)) {
    if (ctx.prandialNmFrag && !ctx.prandialNmAdded) {
      ctx.arrays.nm.push(ctx.prandialNmFrag);
      ctx.prandialNmAdded = true;
    }
    return true;
  }
  if (skipRecetaItemForPotassiumReposBucket(it, ctx.list)) {
    if (ctx.kReposNmFrag && !ctx.kReposNmAdded) {
      ctx.arrays.nm.push(ctx.kReposNmFrag);
      ctx.kReposNmAdded = true;
    }
    return true;
  }
  return false;
}
function pushRecetaItemToSoapBucket(it, ctx) {
  if (!it || !ctx.selMap[it.id] || it.suspendido) return;
  if (skipRecetaItemForInsulinPumpCarrier(it, ctx.list)) return;
  if (isPotassiumReposCarrierMedicationItem(it, ctx.list)) return;
  if (!shouldIncludeMedicationInSoap(it, ctx.classifyFn)) return;
  var cat = effectiveSoapCategory(it, ctx.classifyFn);
  if (cat === "otros") return;
  if (maybeAddNmSpecialFragment(it, ctx, cat)) return;
  var frag = medInstructionFragmentForSoap(it);
  if (ctx.arrays[cat]) ctx.arrays[cat].push(frag);
  else ctx.arrays.otros.push(frag);
}
function bucketsFromRecetaItems(items, selMap, classifyFn) {
  var arrays = {
    analgesia: [],
    antiemeticos: [],
    sedacion: [],
    antiepilepticos: [],
    antiparkinsonianos: [],
    antidotos: [],
    viaAerea: [],
    abx: [],
    transfusiones: [],
    antihta: [],
    diuretico: [],
    antitromboticos: [],
    anticoagulacion: [],
    antiarritmicos: [],
    estatinas: [],
    vasop: [],
    nm: [],
    otros: []
  };
  var list = Array.isArray(items) ? items : [];
  var soapSelected = list.filter(function(it) {
    return it && selMap[it.id] && !it.suspendido;
  });
  var pumpNmFrag = insulinPumpNmSoapFragment(list, soapSelected);
  var rescateNmFrag = insulinRescateNmSoapFragment(list, soapSelected);
  var prandialNmFrag = insulinPrandialNmSoapFragment(list, soapSelected);
  var kReposNmFrag = potassiumReposNmSoapFragment(list, soapSelected);
  var bucketCtx = {
    list,
    selMap,
    classifyFn,
    arrays,
    pumpNmFrag,
    pumpNmAdded: false,
    rescateNmFrag,
    rescateNmAdded: false,
    prandialNmFrag,
    prandialNmAdded: false,
    kReposNmFrag,
    kReposNmAdded: false
  };
  list.forEach(function(it) {
    pushRecetaItemToSoapBucket(it, bucketCtx);
  });
  var buckets = {};
  for (var k of MED_FIELD_KEYS) {
    var srcKey = k === "diureticos" ? "diuretico" : k;
    buckets[k] = (arrays[srcKey] || []).join(" | ");
  }
  return buckets;
}

// public/js/features/estado-actual-meds-receta-prune.mjs
function parseMedFieldItemsLocal(raw) {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw).split(" | ").map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function serializeMedFieldItemsLocal(items) {
  return (items || []).map(function(s) {
    return String(s).trim();
  }).filter(Boolean).join(" | ");
}
function normalizeMedSoapLine(text) {
  return String(text || "").trim().toUpperCase().replace(/\s+/g, " ").replace(/\s+DIA\s+\d+\s*$/i, "").replace(/(\d+)\s+G\b/g, "$1G").replace(/(\d+)\s+MG\b/g, "$1MG").replace(/(\d+)\s+MCG\b/g, "$1MCG").trim();
}
function medSoapLineMatchesReceta(line, allowedFrags) {
  var norm = normalizeMedSoapLine(line);
  if (!norm) return false;
  return allowedFrags.some(function(frag) {
    var f = normalizeMedSoapLine(frag);
    return f && (norm === f || norm.indexOf(f) >= 0 || f.indexOf(norm) >= 0);
  });
}
function allowedSoapFragmentsByCategory(items, classifyFn, fechaActualizacion) {
  var byCat = {};
  MED_FIELD_KEYS.forEach(function(k) {
    byCat[k] = [];
  });
  var list = Array.isArray(items) ? items : [];
  list.forEach(function(it) {
    if (!it || /** @type {{ suspendido?: boolean }} */
    it.suspendido) return;
    if (skipRecetaItemForInsulinPumpCarrier(it, list)) return;
    if (!shouldIncludeMedicationInSoap(
      /** @type {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, suspendido?: boolean }} */
      it,
      classifyFn
    )) {
      return;
    }
    if (isInsulinRescateMedicationItem(it)) return;
    if (isInsulinPrandialMedicationItem(it)) return;
    var cat = effectiveSoapCategory(
      /** @type {{ nombreRaw?: string, soapCatOverride?: string }} */
      it,
      classifyFn
    );
    if (cat === "otros") return;
    var key = cat === "diuretico" ? "diureticos" : cat;
    if (key === "nm" && skipRecetaItemForNmSoapBucket(it, list)) return;
    var frag = medInstructionFragmentForSoap(
      /** @type {Parameters<typeof medInstructionFragmentForSoap>[0]} */
      it
    );
    if (key === "abx" && fechaActualizacion) {
      frag = advanceAbxMedTextForManejoDate(frag, fechaActualizacion);
    }
    if (byCat[key]) byCat[key].push(frag);
  });
  var pumpAlg = detectInsulinPumpAlgorithmFromRecetaItems(list);
  if (pumpAlg != null) {
    var pumpLabel = formatInsulinPumpAlgoritmoLabel(pumpAlg);
    if (pumpLabel && byCat.nm) byCat.nm.push(pumpLabel);
  }
  if (patientHasInsulinRescateMeds(list) && byCat.nm) {
    byCat.nm.push(INSULIN_RESCATE_NM_LABEL);
  }
  var prandialFrag = insulinPrandialNmSoapFragment(list, list);
  if (prandialFrag && byCat.nm) {
    byCat.nm.push(prandialFrag);
  }
  return byCat;
}
function pruneEstadoClinicoMedsFromReceta(monitoreo, items, classifyFn, fechaActualizacion) {
  if (!monitoreo || typeof monitoreo !== "object") return false;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== "object") {
    monitoreo.estadoClinico = {};
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") {
    monitoreo.pendienteReceta = {};
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") {
    monitoreo.confirmado = {};
  }
  var allowed = allowedSoapFragmentsByCategory(items, classifyFn, fechaActualizacion || "");
  var changed = false;
  MED_FIELD_KEYS.forEach(function(key) {
    var allowedFrags = allowed[key] || [];
    var ecItems = parseMedFieldItemsLocal(monitoreo.estadoClinico[key]);
    var keptEc = ecItems.filter(function(line) {
      return medSoapLineMatchesReceta(line, allowedFrags);
    });
    if (keptEc.length !== ecItems.length) {
      monitoreo.estadoClinico[key] = serializeMedFieldItemsLocal(keptEc);
      changed = true;
    }
    if (!keptEc.length && monitoreo.confirmado[key]) {
      monitoreo.confirmado[key] = false;
      changed = true;
    }
    var pendVal = monitoreo.pendienteReceta[key];
    if (pendVal != null && String(pendVal).trim()) {
      var pendItems = parseMedFieldItemsLocal(pendVal);
      var keptPend = pendItems.filter(function(line) {
        return medSoapLineMatchesReceta(line, allowedFrags);
      });
      var nextPend = serializeMedFieldItemsLocal(keptPend);
      if (nextPend !== String(pendVal).trim()) {
        monitoreo.pendienteReceta[key] = nextPend;
        changed = true;
      }
    }
  });
  return changed;
}

// public/js/features/estado-actual-meds-dropdown.mjs
function tryAddInsulinRescateDropdownOption(it, ctx) {
  if (ctx.category !== "nm" || !isInsulinRescateMedicationItem(it)) return false;
  if (!ctx.rescateAdded) {
    ctx.options.push({ value: INSULIN_RESCATE_NM_LABEL, label: INSULIN_RESCATE_NM_LABEL });
    ctx.rescateAdded = true;
  }
  return true;
}
function tryAddInsulinPrandialDropdownOption(it, ctx) {
  if (ctx.category !== "nm" || !isInsulinPrandialMedicationItem(it)) return false;
  if (!ctx.prandialAdded) {
    var frag = insulinPrandialNmSoapFragment(ctx.items, ctx.items);
    ctx.options.push({
      value: frag || INSULIN_PRANDIAL_NM_PREFIX,
      label: frag || INSULIN_PRANDIAL_NM_PREFIX
    });
    ctx.prandialAdded = true;
  }
  return true;
}
function medDropdownOptionLabel(it, ctx, value) {
  if (ctx.category === "abx" && ctx.fecha) {
    return formatMedicationSoapShort(
      /** @type {Parameters<typeof formatMedicationSoapShort>[0]} */
      it,
      { fechaActualizacion: ctx.fecha, refDate: ctx.refDate }
    );
  }
  return value;
}
function tryAddMedDropdownOption(it, ctx) {
  if (!it || /** @type {{ suspendido?: boolean }} */
  it.suspendido) return;
  if (skipRecetaItemForInsulinPumpCarrier(it, ctx.items)) return;
  if (!shouldIncludeMedicationInSoap(
    /** @type {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, suspendido?: boolean }} */
    it,
    ctx.classifyFn
  )) {
    return;
  }
  if (tryAddInsulinRescateDropdownOption(it, ctx)) return;
  if (tryAddInsulinPrandialDropdownOption(it, ctx)) return;
  var cat = effectiveSoapCategory(
    /** @type {{ nombreRaw?: string, soapCatOverride?: string }} */
    it,
    ctx.classifyFn
  );
  var matchCat = cat === ctx.category || ctx.category === "diureticos" && cat === "diuretico";
  if (!matchCat) return;
  if (ctx.category === "nm" && skipRecetaItemForNmSoapBucket(it, ctx.items)) return;
  var value = medInstructionFragmentForSoap(
    /** @type {Parameters<typeof medInstructionFragmentForSoap>[0]} */
    it
  );
  if (!value || ctx.seen[value]) return;
  ctx.seen[value] = 1;
  ctx.options.push({ value, label: medDropdownOptionLabel(it, ctx, value) });
}
function buildMedDropdownOptions(activeId, category, medRecetaByPatient, classifyFn, refDate) {
  var options = [];
  var seen = /* @__PURE__ */ Object.create(null);
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fecha = category === "abx" ? resolveManejoFechaActualizacion(activeId, medRecetaByPatient) : "";
  var dropdownCtx = {
    items,
    category,
    classifyFn,
    fecha,
    refDate,
    options,
    seen,
    rescateAdded: false,
    prandialAdded: false
  };
  items.forEach(function(it) {
    tryAddMedDropdownOption(it, dropdownCtx);
  });
  return options;
}

// public/js/features/estado-actual-meds.mjs
function recetaItemsFromOpts(opts) {
  var id = opts && opts.activeId;
  var map = opts && opts.medRecetaByPatient;
  var block = id && map ? map[id] : null;
  return block && Array.isArray(block.items) ? block.items : [];
}
function advanceAbxTextForEa(text, fechaActualizacion, refDate, recetaItems) {
  if (!text) return text;
  return rewriteAbxDisplayText(String(text), fechaActualizacion, recetaItems, refDate);
}
function withAdvancedAbxEc(ec, fechaActualizacion, refDate, recetaItems) {
  if (!ec || !ec.abx || !String(ec.abx).trim()) return ec;
  var next = Object.assign({}, ec);
  next.abx = advanceAbxTextForEa(String(ec.abx), fechaActualizacion, refDate, recetaItems);
  return next;
}
function mergePendingDietProposal(ec, pend, _conf) {
  if (!ec || typeof ec !== "object") return ec;
  if (!hasActiveDietProposal(pend)) return ec;
  DIET_PENDING_KEYS2.forEach(function(k) {
    var pending = pend[k];
    if (pending != null && String(pending).trim()) ec[k] = String(pending).trim();
  });
  applyDietaSuplementoPolicy(ec);
  return ec;
}
function applyDietProposalFromRecetaBlock(monitoreo, recetaBlock, opts) {
  if (!monitoreo || !recetaBlock) return false;
  var candidates = listDietCandidatesFromRecetaBlock(recetaBlock);
  if (!candidates.length) return false;
  if (candidates.length > 1) {
    storeDietOptions(monitoreo, candidates);
    var selected = candidates[0];
    var merged = {
      descripcion: selected.descripcion,
      kcal: selected.kcal,
      proteinG: selected.proteinG
    };
    if (!mergedDietHasContent(merged)) return false;
    if (tryAutoConfirmMatchingDiet(monitoreo, merged)) {
      clearDietOptions(monitoreo);
      return true;
    }
    if (shouldSkipDietProposal(monitoreo, opts, merged)) return false;
    writeDietProposalFromCandidate(monitoreo, selected);
    return true;
  }
  var merged = mergedDietFromReceta(collectDietasFromRecetaBlock(recetaBlock));
  clearDietOptions(monitoreo);
  if (!mergedDietHasContent(merged)) return false;
  if (tryAutoConfirmMatchingDiet(monitoreo, merged)) return true;
  if (shouldSkipDietProposal(monitoreo, opts, merged)) return false;
  writeDietProposal(monitoreo, merged);
  return true;
}
function estadoClinicoForDisplay(monitoreo, opts) {
  if (!monitoreo || typeof monitoreo !== "object") return {};
  var fechaActualizacion = opts && opts.fechaActualizacion ? String(opts.fechaActualizacion).trim() : resolveEaAbxFechaActualizacion(opts && opts.activeId, opts && opts.medRecetaByPatient, monitoreo);
  var refDate = opts && opts.refDate;
  var ec = monitoreo.estadoClinico && typeof monitoreo.estadoClinico === "object" ? Object.assign({}, monitoreo.estadoClinico) : {};
  var pend = monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" ? monitoreo.pendienteReceta : {};
  var conf = monitoreo.confirmado && typeof monitoreo.confirmado === "object" ? monitoreo.confirmado : {};
  mergePendingDietProposal(ec, pend, conf);
  return withAdvancedAbxEc(ec, fechaActualizacion, refDate, recetaItemsFromOpts(opts));
}
function pendingMedValueForText(key, pending, fechaActualizacion, refDate, recetaItems) {
  var val = String(pending).trim();
  return key === "abx" ? advanceAbxTextForEa(val, fechaActualizacion, refDate, recetaItems) : val;
}
function mergePendingMedsForText(ec, pend, conf, fechaActualizacion, refDate, recetaItems) {
  for (var k of MED_FIELD_KEYS) {
    if (conf[k]) continue;
    var pending = pend[k];
    if (pending == null || !String(pending).trim()) continue;
    if (!ec[k] || !String(ec[k]).trim()) {
      ec[k] = pendingMedValueForText(k, String(pending), fechaActualizacion, refDate, recetaItems);
    }
  }
}
function estadoClinicoForText(monitoreo, opts) {
  if (!monitoreo || typeof monitoreo !== "object") return {};
  var fechaActualizacion = opts && opts.fechaActualizacion ? String(opts.fechaActualizacion).trim() : resolveEaAbxFechaActualizacion(opts && opts.activeId, opts && opts.medRecetaByPatient, monitoreo);
  var refDate = opts && opts.refDate;
  var ec = estadoClinicoForDisplay(monitoreo, opts);
  var pend = monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" ? monitoreo.pendienteReceta : {};
  var conf = monitoreo.confirmado && typeof monitoreo.confirmado === "object" ? monitoreo.confirmado : {};
  mergePendingMedsForText(ec, pend, conf, fechaActualizacion, refDate, recetaItemsFromOpts(opts));
  return ec;
}
function syncConfirmedAbxFromReceta(monitoreo, buckets) {
  if (!monitoreo || !monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== "object") return false;
  var conf = monitoreo.confirmado && typeof monitoreo.confirmado === "object" ? monitoreo.confirmado : {};
  if (!conf.abx) return false;
  var next = buckets && buckets.abx != null ? String(buckets.abx).trim() : "";
  if (!next) return false;
  var cur = String(monitoreo.estadoClinico.abx || "").trim();
  if (cur === next) return false;
  monitoreo.estadoClinico.abx = next;
  return true;
}
function syncRecetaProposalsFromSoapSelection(patientId, monitoreo, medRecetaByPatient, medNotaSelectionByPatient, classifyFn) {
  if (!patientId || !monitoreo) return false;
  var block = medRecetaByPatient ? medRecetaByPatient[patientId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fechaActualizacion = resolveManejoFechaActualizacion(patientId, medRecetaByPatient);
  var pruned = pruneEstadoClinicoMedsFromReceta(monitoreo, items, classifyFn, fechaActualizacion);
  var sel = medNotaSelectionByPatient && medNotaSelectionByPatient[patientId];
  var buckets = bucketsFromRecetaItems(items, sel || {}, classifyFn);
  applyRecetaProposal(monitoreo, buckets);
  var syncedAbx = syncConfirmedAbxFromReceta(monitoreo, buckets);
  var hasAny = MED_FIELD_KEYS.some(function(k) {
    return buckets[k] && String(buckets[k]).trim();
  });
  return pruned || hasAny || syncedAbx;
}
function applyRecetaProposal(monitoreo, buckets) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") {
    monitoreo.pendienteReceta = {};
  }
  for (var k of MED_FIELD_KEYS) {
    if (monitoreo.confirmado && monitoreo.confirmado[k]) continue;
    if (isRecetaProposalDismissed(monitoreo, k)) continue;
    var val = buckets && buckets[k];
    monitoreo.pendienteReceta[k] = val != null && String(val).trim() ? String(val).trim() : "";
  }
}
function pendingRecetaValueForKey(monitoreo, key) {
  return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" && monitoreo.pendienteReceta[key];
}
function ensureEstadoClinicoObject(monitoreo) {
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== "object") {
    monitoreo.estadoClinico = {};
  }
  return monitoreo.estadoClinico;
}
function ensureConfirmadoObject(monitoreo) {
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") {
    monitoreo.confirmado = {};
  }
  return monitoreo.confirmado;
}
function clearPendingRecetaKey(monitoreo, key) {
  if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object") {
    monitoreo.pendienteReceta[key] = "";
  }
}
function confirmMedField(monitoreo, key, ctx) {
  if (!monitoreo || !MED_FIELD_KEYS.includes(
    /** @type {typeof MED_FIELD_KEYS[number]} */
    key
  )) return;
  var estadoClinico = ensureEstadoClinicoObject(monitoreo);
  var pending = pendingRecetaValueForKey(monitoreo, key);
  if (pending != null && String(pending).trim()) {
    estadoClinico[key] = String(pending).trim();
  }
  if (key === "abx") {
    ensureAbxDiaAnchorDate(monitoreo, ctx && ctx.patientId, ctx && ctx.medRecetaByPatient);
  }
  var confirmado = ensureConfirmadoObject(monitoreo);
  confirmado[key] = true;
  clearPendingRecetaKey(monitoreo, key);
  clearRecetaProposalDismissedKey(monitoreo, key);
}
function discardMedProposal(monitoreo, key) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") return;
  if (MED_FIELD_KEYS.includes(
    /** @type {typeof MED_FIELD_KEYS[number]} */
    key
  )) {
    monitoreo.pendienteReceta[key] = "";
    ensureRecetaProposalDismissed(monitoreo)[key] = true;
  }
}
function confirmDietProposal(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== "object") {
    monitoreo.estadoClinico = {};
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") return;
  DIET_PENDING_KEYS2.forEach(function(k) {
    var pending = monitoreo.pendienteReceta[k];
    if (pending != null && String(pending).trim()) {
      monitoreo.estadoClinico[k] = String(pending).trim();
      monitoreo.pendienteReceta[k] = "";
    }
  });
  applyDietaSuplementoPolicy(monitoreo.estadoClinico, monitoreo.pendienteReceta);
  if (monitoreo.estadoClinico.dieta) {
    var dietaClean = stripDietaMacroSuffixFromLabel(monitoreo.estadoClinico.dieta);
    if (dietaClean) monitoreo.estadoClinico.dieta = dietaClean;
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") {
    monitoreo.confirmado = {};
  }
  monitoreo.confirmado.dieta = true;
  clearDietPending2(monitoreo);
  clearDietOptions(monitoreo);
  clearRecetaProposalDismissedKey(monitoreo, "dieta");
}
function discardDietProposal(monitoreo) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") return;
  DIET_PENDING_KEYS2.forEach(function(k) {
    monitoreo.pendienteReceta[k] = "";
  });
  clearDietOptions(monitoreo);
  ensureRecetaProposalDismissed(monitoreo).dieta = true;
}
function confirmAllMedProposals(monitoreo) {
  if (DIET_PENDING_KEYS2.some(function(k2) {
    return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" && monitoreo.pendienteReceta[k2] && String(monitoreo.pendienteReceta[k2]).trim();
  })) {
    confirmDietProposal(monitoreo);
  }
  for (var k of MED_FIELD_KEYS) {
    if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" && monitoreo.pendienteReceta[k]) {
      confirmMedField(monitoreo, k);
    }
  }
}

// public/js/tend-core.mjs
var TEND_MESES_MAP = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
  jan: "01",
  apr: "04",
  aug: "08",
  dec: "12"
};
function tendEligibleSectionKey(sec) {
  var u = String(sec == null ? "" : sec).trim().replace(/:+$/, "").toUpperCase();
  if (!u) return false;
  return /^(BH|PLTCIT|QS|ESC|PFHS|GASES|LCR|LIQ|PROT12H|PROT24H|PIE|EGO|CUANTORINA|FROTIS|LIPASA|TROP|TIR|ENDO|CARD|FE|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX)$/.test(
    u
  );
}
function normalizeFechaLabHistory(fechaRaw) {
  if (fechaRaw == null || fechaRaw === "") return "";
  if (String(fechaRaw).trim() === "Anterior") return "Anterior";
  var t = String(fechaRaw).trim();
  var mEn = t.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    var mon = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (mon) return mEn[2].padStart(2, "0") + "/" + mon + "/" + mEn[3];
  }
  var mNum = t.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (mNum) {
    var y = mNum[3] ? String(mNum[3]) : String((/* @__PURE__ */ new Date()).getFullYear());
    if (y.length === 2) y = "20" + y;
    return mNum[1].padStart(2, "0") + "/" + mNum[2].padStart(2, "0") + "/" + y;
  }
  return t;
}
function applyHoraToMs(ms, horaStr) {
  if (horaStr == null || !/^\d{1,2}:\d{2}/.test(String(horaStr).trim())) return ms;
  var h = String(horaStr).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!h) return ms;
  return ms + (parseInt(h[1], 10) * 3600 + parseInt(h[2], 10) * 60) * 1e3;
}
function normalizeHoraLabHistory(horaRaw) {
  if (horaRaw == null) return "";
  var t = String(horaRaw).trim();
  if (!t) return "";
  var m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return "";
  var hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  var mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
function parseFechaLabToMs(fechaStr, horaStr) {
  if (!fechaStr) return null;
  var t = String(fechaStr).trim();
  if (t === "Anterior") return null;
  var mEn = t.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    var monStr = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (monStr) {
      var mo = parseInt(monStr, 10) - 1;
      var ms = new Date(parseInt(mEn[3], 10), mo, parseInt(mEn[2], 10)).getTime();
      return applyHoraToMs(ms, horaStr);
    }
  }
  var mNum = t.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (mNum) {
    var y = mNum[3] ? parseInt(mNum[3], 10) : (/* @__PURE__ */ new Date()).getFullYear();
    if (y < 100) y += 2e3;
    var ms2 = new Date(y, parseInt(mNum[2], 10) - 1, parseInt(mNum[1], 10)).getTime();
    return applyHoraToMs(ms2, horaStr);
  }
  return null;
}
function isAnteriorLabEntry(entry) {
  return !!(entry && (entry.fecha === "Anterior" || entry.id === "migrated-anterior"));
}
function compareAnteriorLabEntries(a, b) {
  var aAnterior = isAnteriorLabEntry(a);
  var bAnterior = isAnteriorLabEntry(b);
  if (aAnterior === bAnterior) return 0;
  return aAnterior ? 1 : -1;
}
function compareLabEntryTimestamps(a, b) {
  var ta = parseFechaLabToMs(a.fecha, a.hora);
  var tb = parseFechaLabToMs(b.fecha, b.hora);
  var aValid = typeof ta === "number" && isFinite(ta);
  var bValid = typeof tb === "number" && isFinite(tb);
  if (aValid !== bValid) return aValid ? -1 : 1;
  if (aValid && bValid && ta !== tb) return tb - ta;
  return 0;
}
function compareLabEntryHoras(a, b) {
  var ha = normalizeHoraLabHistory(a && a.hora);
  var hb = normalizeHoraLabHistory(b && b.hora);
  if (ha && hb && ha !== hb) return hb.localeCompare(ha);
  return 0;
}
function compareLabHistoryEntries(a, b) {
  var anteriorCmp = compareAnteriorLabEntries(a, b);
  if (anteriorCmp !== 0) return anteriorCmp;
  var timeCmp = compareLabEntryTimestamps(a, b);
  if (timeCmp !== 0) return timeCmp;
  return compareLabEntryHoras(a, b);
}
function sortLabHistoryChronological(hist) {
  return (hist || []).slice().sort(compareLabHistoryEntries);
}
function parseTrendNumeric(raw) {
  if (raw == null || raw === "") return null;
  var s = String(typeof raw === "object" && raw.val != null ? raw.val : raw).trim();
  if (!s || s === "---") return null;
  s = s.replace(/\*/g, "").replace(/^<\s*/, "").trim();
  if (!s) return null;
  var n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : null;
}
function getSetTrendValueForSeries(set, sectionKey, fieldKey) {
  if (!set || !set.parsedBySection) return null;
  var pb = set.parsedBySection;
  if (!pb[sectionKey]) return null;
  return parseTrendNumeric(pb[sectionKey][fieldKey]);
}
function columnSetsForFields(historyAsc, sectionKey, fieldKeys) {
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  (historyAsc || []).forEach(function(set) {
    var ms = parseFechaLabToMs(set.fecha, set.hora);
    var colKey = typeof ms === "number" && isFinite(ms) ? "t:" + ms : "f:" + String(set.fecha) + "|h:" + normalizeHoraLabHistory(set.hora);
    if (seen[colKey]) return;
    var has = (fieldKeys || []).some(function(fk) {
      return getSetTrendValueForSeries(set, sectionKey, fk) != null;
    });
    if (!has) return;
    seen[colKey] = true;
    out.push(set);
  });
  return out;
}
function dedupeTrendSetsForSeries(setsDesc, sectionKey, fieldKey) {
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  for (var i = 0; i < (setsDesc || []).length; i++) {
    var s = setsDesc[i];
    var v = getSetTrendValueForSeries(s, sectionKey, fieldKey);
    if (v == null || !isFinite(v)) continue;
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var key = typeof ms === "number" && isFinite(ms) ? "t:" + ms + "|v:" + v + "|" + sectionKey + "|" + fieldKey : "f:" + String(s.fecha) + "|h:" + normalizeHoraLabHistory(s.hora) + "|v:" + v + "|" + sectionKey + "|" + fieldKey;
    if (seen[key]) continue;
    seen[key] = true;
    out.push(s);
  }
  return out;
}
function buildTrendAxisMeta(setsAsc) {
  var cols = setsAsc || [];
  var timeVis = buildTrendColumnTimeVisibility(cols);
  var dayCounts = /* @__PURE__ */ Object.create(null);
  var points = cols.map(function(s, idx) {
    if (s.fecha === "Anterior") {
      return { set: s, x: idx, dayLabel: "Ant.", tooltipTime: "" };
    }
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var d = new Date(ms);
    var dayKey = isFinite(d.getTime()) ? d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() : "raw:" + String(s.fecha);
    dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    var n = dayCounts[dayKey];
    var dd = isFinite(d.getTime()) ? String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") : String(s.fecha).slice(0, 12);
    var hora = normalizeHoraLabHistory(s.hora);
    var jitter = n > 1 ? (n - 1) * 0.12 : 0;
    var showTimeInLabel = !!timeVis[colKeyForTrendSet(s)];
    return {
      set: s,
      x: idx + jitter,
      dayLabel: dd,
      tooltipTime: hora ? hora.slice(0, 5) : "",
      showTimeInLabel
    };
  });
  return {
    points,
    labels: points.map(function(p) {
      if (p.set.fecha === "Anterior") return "Ant.";
      if (p.showTimeInLabel && p.tooltipTime) return p.dayLabel + " " + p.tooltipTime;
      return p.dayLabel;
    })
  };
}
function buildTendChartLabels(setsAsc) {
  return buildTrendAxisMeta(setsAsc).labels;
}
function isErythrocytePercentField(fieldKey) {
  var f = String(fieldKey || "").trim();
  if (/^hto$/i.test(f)) return true;
  if (/^hct$/i.test(f)) return true;
  if (/^rdw$/i.test(f)) return true;
  if (/^ret/i.test(f)) return true;
  return false;
}
var BH_PANEL_FAMILIES = [
  "bh-absolute",
  "bh-quality",
  "bh-diff-manual",
  "bh-coag"
];
var GENERIC_PANEL_FAMILIES = ["gases", "percent-diff", "percent-rbc", "absolute"];
var BH_QUALITY_FIELDS = {
  VCM: true,
  HCM: true,
  CHCM: true,
  RDW: true,
  Hto: true,
  Ret: true,
  MPV: true
};
var BH_ABSOLUTE_FIELDS = {
  Hb: true,
  RBC: true,
  Leu: true,
  Neu: true,
  Lin: true,
  Mono: true,
  Baso: true,
  Eos: true,
  Plt: true
};
var BH_DIFF_FIELDS = {
  NeuPct: true,
  LinPct: true,
  MonoPct: true,
  EosPct: true,
  BasoPct: true,
  Bandas: true,
  Mielo: true,
  Metamielo: true,
  Promielo: true,
  Blastos: true,
  Atipicos: true
};
var BH_COAG_FIELDS = { TP: true, TTP: true, INR: true, Fib: true, DD: true };
function familyOrderForSection(sectionKey) {
  if (sectionKey === "BH") return BH_PANEL_FAMILIES.slice();
  return GENERIC_PANEL_FAMILIES.slice();
}
function migratePanelFamilyKey(sectionKey, familyKey) {
  var fam = String(familyKey || "");
  if (sectionKey !== "BH") return fam;
  if (fam === "percent-rbc") return "bh-quality";
  if (fam === "percent-diff" || fam === "bh-diff") return "bh-diff-manual";
  if (fam === "absolute") return "bh-absolute";
  return fam;
}
function classifyBhPanelFamily(fk, unit) {
  if (BH_COAG_FIELDS[fk]) return "bh-coag";
  if (BH_DIFF_FIELDS[fk] || /Pct$/i.test(fk)) return "bh-diff-manual";
  if (BH_QUALITY_FIELDS[fk] || isErythrocytePercentField(fk)) return "bh-quality";
  if (BH_ABSOLUTE_FIELDS[fk]) return "bh-absolute";
  if (String(unit || "").trim() === "%") return "bh-quality";
  return "bh-absolute";
}
function classifyGenericPanelFamily(fk, unit) {
  if (/Pct$/i.test(fk)) return "percent-diff";
  if (isErythrocytePercentField(fk)) return "percent-rbc";
  if (String(unit || "").trim() === "%" && !/Pct$/i.test(fk)) return "percent-rbc";
  return "absolute";
}
function classifyTendPanelFamily(sectionKey, fieldKey, unit) {
  var fk = String(fieldKey || "").trim();
  if (sectionKey === "GASES") return "gases";
  if (sectionKey === "BH") return classifyBhPanelFamily(fk, unit);
  return classifyGenericPanelFamily(fk, unit);
}
function isPercentPanelFamily(family) {
  return family === "percent-diff" || family === "percent-rbc" || family === "bh-diff-manual" || family === "bh-diff" || family === "bh-quality";
}
function colKeyForTrendSet(set) {
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  return typeof ms === "number" && isFinite(ms) ? "t:" + ms : "f:" + String(set.fecha) + "|h:" + normalizeHoraLabHistory(set.hora);
}
function trendDayKey(set) {
  if (!set || set.fecha === "Anterior") return "anterior";
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms === "number" && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  return "f:" + normalizeFechaLabHistory(set.fecha);
}
function buildTrendColumnTimeVisibility(columns) {
  var byDay = /* @__PURE__ */ Object.create(null);
  (columns || []).forEach(function(set) {
    var dk = trendDayKey(set);
    if (!byDay[dk]) byDay[dk] = [];
    byDay[dk].push(normalizeHoraLabHistory(set.hora));
  });
  var showTime = /* @__PURE__ */ Object.create(null);
  (columns || []).forEach(function(set) {
    var ck = colKeyForTrendSet(set);
    var horasOnDay = byDay[trendDayKey(set)] || [];
    if (horasOnDay.length < 2) {
      showTime[ck] = false;
      return;
    }
    var distinct = /* @__PURE__ */ Object.create(null);
    horasOnDay.forEach(function(h) {
      distinct[h || ""] = true;
    });
    showTime[ck] = Object.keys(distinct).length >= 2;
  });
  return showTime;
}
function formatTrendColumnHeader(set, columns, opts) {
  if (!set) return "";
  if (set.fecha === "Anterior") return "Anterior";
  var cols = columns && columns.length ? columns : [set];
  var vis = opts && opts.timeVisibility || buildTrendColumnTimeVisibility(cols);
  var ck = colKeyForTrendSet(set);
  var showTime = !!vis[ck];
  var date = normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim();
  var hora = normalizeHoraLabHistory(set.hora);
  if (showTime && hora) return date + " " + hora.slice(0, 5);
  return date;
}
function formatTendSeriesLabel(cardTitle, fieldKey, unit) {
  var name = String(cardTitle || fieldKey || "").trim();
  var u = String(unit || "").trim();
  if (u === "%" && /%\s*$/.test(name)) {
    name = name.replace(/\s*%+\s*$/, "").trim();
  }
  return { name: name || fieldKey, unit: u };
}
function buildSectionTableModel(historyAsc, sectionKey, catalogSpecs, getValue) {
  var colSets = [];
  var seenCol = /* @__PURE__ */ Object.create(null);
  historyAsc.forEach(function(set) {
    var ms = parseFechaLabToMs(set.fecha, set.hora);
    var colKey = typeof ms === "number" && isFinite(ms) ? "t:" + ms : "f:" + set.fecha + "|h:" + normalizeHoraLabHistory(set.hora);
    if (seenCol[colKey]) return;
    var hasAny = catalogSpecs.some(function(sp) {
      return getValue(set, sp.fieldKey) != null;
    });
    if (!hasAny) return;
    seenCol[colKey] = true;
    colSets.push(set);
  });
  var rows = catalogSpecs.map(function(sp) {
    return {
      fieldKey: sp.fieldKey,
      label: sp.cardTitle || sp.fieldKey,
      unit: sp.unit || "",
      values: colSets.map(function(set) {
        return getValue(set, sp.fieldKey);
      })
    };
  });
  return { columns: colSets, rows };
}

// public/js/lab-history-cache.mjs
var TREND_SPARK_WINDOW = 5;
var TREND_CATALOG_WINDOW = 12;
var TREND_DETAIL_DOWNSAMPLE = 100;
var TREND_REFRESH_DEBOUNCE_MS = 80;
var _revisionByPatient = /* @__PURE__ */ Object.create(null);
var _listeners = [];
var _trendSeriesIndexCache = { key: "", index: null };
function invalidateTrendSeriesIndexCache() {
  _trendSeriesIndexCache.key = "";
  _trendSeriesIndexCache.index = null;
}
function onLabHistoryRevision(fn) {
  if (typeof fn !== "function") return function() {
  };
  _listeners.push(fn);
  return function() {
    _listeners = _listeners.filter(function(x) {
      return x !== fn;
    });
  };
}
function bumpLabHistoryRevision(patientId) {
  if (patientId == null || patientId === "") return;
  var k = String(patientId);
  _revisionByPatient[k] = (_revisionByPatient[k] || 0) + 1;
  invalidateTrendSeriesIndexCache();
  for (var i = 0; i < _listeners.length; i += 1) {
    try {
      _listeners[i](k);
    } catch (_e) {
      void _e;
    }
  }
}
function getLabHistoryRevision(patientId) {
  if (patientId == null || patientId === "") return 0;
  return _revisionByPatient[String(patientId)] || 0;
}
function getTrendRenderWindow(historyAsc, mode) {
  var hist = historyAsc || [];
  if (mode === "full") return hist.slice();
  var n = mode === "spark" ? TREND_SPARK_WINDOW : TREND_CATALOG_WINDOW;
  if (hist.length <= n) return hist.slice();
  return hist.slice(-n);
}
function trendCatalogSeriesKey(sectionKey, fieldKey) {
  return String(sectionKey) + "|" + String(fieldKey);
}
function buildTrendSeriesIndex(opts) {
  var catalogSpecs = opts.catalogSpecs || [];
  var historyFullDesc = opts.historyFullDesc || [];
  var windowHistoryAsc = opts.windowHistoryAsc || [];
  var tendRefForSeries = opts.tendRefForSeries;
  var windowDesc = windowHistoryAsc.slice().reverse();
  var out = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < catalogSpecs.length; i += 1) {
    var spec = catalogSpecs[i];
    var sk = spec.sectionKey;
    var fk = spec.fieldKey;
    var key = trendCatalogSeriesKey(sk, fk);
    var rawFull = historyFullDesc.filter(function(s) {
      return getSetTrendValueForSeries(s, sk, fk) != null;
    });
    var setsDescFull = dedupeTrendSetsForSeries(rawFull, sk, fk);
    var rawWindow = windowDesc.filter(function(s) {
      return getSetTrendValueForSeries(s, sk, fk) != null;
    });
    var setsDesc = dedupeTrendSetsForSeries(rawWindow, sk, fk);
    var latestSet = setsDescFull.length ? setsDescFull[0] : null;
    var latest = latestSet ? getSetTrendValueForSeries(latestSet, sk, fk) : null;
    var ref = tendRefForSeries(historyFullDesc, sk, fk, latestSet);
    var isAbnormal = ref && latest != null && (latest < ref[0] || latest > ref[1]);
    out[key] = {
      setsDesc,
      setsDescFull,
      latest,
      ref,
      isAbnormal: !!isAbnormal
    };
  }
  return out;
}
function buildTrendSeriesIndexCached(cacheKey, opts) {
  var key = String(cacheKey || "");
  if (key && _trendSeriesIndexCache.key === key && _trendSeriesIndexCache.index) {
    return _trendSeriesIndexCache.index;
  }
  var index = buildTrendSeriesIndex(opts);
  if (key) {
    _trendSeriesIndexCache.key = key;
    _trendSeriesIndexCache.index = index;
  }
  return index;
}

// public/js/med-pharm-profile-core.mjs
function trimStr2(s) {
  return String(s || "").trim();
}
function normKeyPart(s) {
  return trimStr2(s).replace(/\s+/g, " ").toUpperCase();
}
function normDosisForRowKey(dosis) {
  return normKeyPart(
    String(dosis || "").replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, "").replace(/\/{2,}/g, " ")
  );
}
function buildMedPharmRowKey(fields) {
  const med = fields.med != null ? fields.med : fields.nombreRaw;
  const dosis = fields.dosis != null ? fields.dosis : fields.dosisRaw;
  const freq = fields.freq != null ? fields.freq : fields.frecuenciaRaw;
  const via = fields.via != null ? fields.via : fields.viaRaw;
  return [normKeyPart(med), normDosisForRowKey(dosis), normKeyPart(freq), normKeyPart(via)].join("|");
}
function extractMedBaseName(med) {
  let t = trimStr2(med);
  if (!t) return "";
  t = t.replace(/\(\s*\+\s*\*\s*\)/gi, " ").replace(/\(\s*\*\s*\)/gi, " ").replace(/\*+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const doseStart = /\s+(?=\d+(?:[.,]\d+)?\s*(?:%|MG|G|MCG|µG|UG|UI|IU|ML|MEQ|MMOL|UNIDADES?|U\/|MCG\/|MG\/|MCG\/ML|MG\/ML))/i;
  const cut = t.search(doseStart);
  if (cut > 0) return t.slice(0, cut).trim();
  const slash = t.indexOf(" / ");
  if (slash > 0) return t.slice(0, slash).trim();
  return t;
}
function buildMedPharmMedGroupKey(med) {
  return extractMedBaseName(med);
}
function monthKeyFromParts(year, monthIndex) {
  return String(year) + "-" + String(monthIndex + 1).padStart(2, "0");
}
function splitMonthAt(daysInMonth) {
  return Math.ceil(daysInMonth / 2);
}
function dayValueInMap(days, d) {
  if (!days) return 0;
  const v = days[d];
  if (v > 0) return v;
  return days[String(d)] || 0;
}
function isMedPharmRowHidden(row) {
  return !!(row && row.hidden);
}
function toggleNotAdmin(days, notAdmin, dayNum) {
  if (!(dayValueInMap(days, dayNum) > 0)) return notAdmin || {};
  const next = Object.assign({}, notAdmin || {});
  if (next[dayNum] || next[String(dayNum)]) {
    delete next[dayNum];
    delete next[String(dayNum)];
  } else {
    next[dayNum] = true;
  }
  return next;
}
function formatFreqShort(raw) {
  const t = trimStr2(raw).toUpperCase();
  if (!t) return "\u2014";
  if (t === "ONCE" || t === "UNICA" || t === "\xDANICA") return "UNICA";
  if (t === "PRN") return t;
  const m = t.match(/^Q?(\d+)\s*H$/);
  if (m) return m[1] + "H";
  if (t.indexOf("Q") === 0) return t.slice(1);
  return t;
}
function formatViaShort(raw) {
  const v = trimStr2(raw).replace(/^VIA\s+/i, "");
  return v || "\u2014";
}
function isDayHeaderToken(cell) {
  const t = trimStr2(cell);
  if (!/^\d{1,2}$/.test(t)) return false;
  const n = parseInt(t, 10);
  return n >= 1 && n <= 31;
}
function findDayHeaderInfo(cols) {
  let start = -1;
  let count = 0;
  for (let i = 0; i < cols.length; i += 1) {
    if (!isDayHeaderToken(cols[i])) continue;
    if (start < 0) start = i;
    count += 1;
  }
  if (count < 5) return null;
  return { dayStartCol: start };
}
function parseDayCell(raw) {
  const t = trimStr2(raw);
  if (!t || t === "-" || t === "0") return 0;
  const n = parseInt(t, 10);
  if (n === 2) return 2;
  if (n >= 1) return 1;
  return 0;
}
function rowMetaFromCols(cols, dayStartCol) {
  const meta = [];
  for (let i = 0; i < dayStartCol; i += 1) {
    const p = trimStr2(cols[i]);
    if (p) meta.push(p);
  }
  if (meta.length < 4) return null;
  const via = meta[meta.length - 1];
  const freq = meta[meta.length - 2];
  const dosis = meta[meta.length - 3];
  const med = meta.slice(0, meta.length - 3).join(" ");
  if (!med) return null;
  return { med, dosis, freq, via };
}
function parseDaysFromCols(cols, dayStartCol, daysInMonth) {
  const days = {};
  for (let d = 1; d <= daysInMonth; d += 1) {
    const v = parseDayCell(cols[dayStartCol + d - 1]);
    if (v > 0) days[d] = v;
  }
  return days;
}
function parseRowLine(cols, dayStartCol, daysInMonth) {
  let start = dayStartCol;
  let meta = rowMetaFromCols(cols, start);
  if (!meta && cols.length > start + daysInMonth) {
    start = cols.length - daysInMonth;
    meta = rowMetaFromCols(cols, start);
  }
  if (!meta) return null;
  const days = parseDaysFromCols(cols, start, daysInMonth);
  if (!Object.keys(days).length) return null;
  return { meta, days };
}
function looksLikeSomePharmMonthPaste(text) {
  const lines = String(text || "").split(/\r?\n/).map(trimStr2).filter(Boolean);
  if (lines.length < 2) return false;
  for (let i = 0; i < lines.length; i += 1) {
    if (findDayHeaderInfo(lines[i].split("	"))) return true;
  }
  return false;
}
function parseSomePharmMonthPaste(text, opts) {
  const year = opts.year;
  const monthIndex = opts.monthIndex;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthKey = monthKeyFromParts(year, monthIndex);
  const lines = String(text || "").split(/\r?\n/).map(trimStr2).filter(Boolean);
  let headerIdx = -1;
  let dayStartCol = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const info = findDayHeaderInfo(lines[i].split("	"));
    if (!info) continue;
    headerIdx = i;
    dayStartCol = info.dayStartCol;
    break;
  }
  if (headerIdx < 0) {
    return { rows: [], skipped: lines.length, daysInMonth, monthKey, year, monthIndex };
  }
  const rows = [];
  let skipped = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (i === headerIdx) continue;
    const parsedRow = parseRowLine(lines[i].split("	"), dayStartCol, daysInMonth);
    if (!parsedRow) {
      skipped += 1;
      continue;
    }
    rows.push(
      assignSomePharmCategory({
        rowKey: buildMedPharmRowKey(parsedRow.meta),
        med: parsedRow.meta.med,
        dosis: parsedRow.meta.dosis,
        freq: parsedRow.meta.freq,
        via: parsedRow.meta.via,
        cat: "",
        days: parsedRow.days,
        notAdmin: {}
      })
    );
  }
  return {
    rows: coalesceMedPharmRowsByKey(rows),
    skipped,
    daysInMonth,
    monthKey,
    year,
    monthIndex
  };
}
function parseRecetaDateToDay(fechaDMY, year, monthIndex) {
  const m = trimStr2(fechaDMY).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return { ok: false, day: 0 };
  const day = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  if (y !== year || mon !== monthIndex) return { ok: false, day: 0 };
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  if (day < 1 || day > dim) return { ok: false, day: 0 };
  return { ok: true, day };
}
function emptyMonth(year, monthIndex) {
  return {
    monthKey: monthKeyFromParts(year, monthIndex),
    year,
    monthIndex,
    daysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
    rows: []
  };
}
function findRowByKey(rows, key) {
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].rowKey === key) return rows[i];
  }
  return null;
}
function lastIndicatedDay(days, maxDay) {
  let last = 0;
  for (let d = 1; d <= maxDay; d += 1) {
    if (dayValueInMap(days, d) > 0) last = d;
  }
  return last;
}
function maxIndicatedDay(days) {
  let max = 0;
  const dmap = days || {};
  const keys = Object.keys(dmap);
  for (let i = 0; i < keys.length; i += 1) {
    const d = Number(keys[i]);
    if (dayValueInMap(dmap, d) > 0 && d > max) max = d;
  }
  return max;
}
function mergeMedPharmRowDays(into, from) {
  const fromMax = maxIndicatedDay(from.days);
  const intoMaxBefore = maxIndicatedDay(into.days);
  const days = Object.assign({}, into.days || {});
  const srcDays = from.days || {};
  const srcKeys = Object.keys(srcDays);
  for (let i = 0; i < srcKeys.length; i += 1) {
    const d = Number(srcKeys[i]);
    const v = srcDays[srcKeys[i]];
    const prev = dayValueInMap(days, d);
    if (v > prev) days[d] = v;
  }
  into.days = days;
  const notAdmin = Object.assign({}, into.notAdmin || {});
  const srcNa = from.notAdmin || {};
  const naKeys = Object.keys(srcNa);
  for (let j = 0; j < naKeys.length; j += 1) {
    const d = Number(naKeys[j]);
    if (srcNa[naKeys[j]]) notAdmin[d] = true;
  }
  into.notAdmin = notAdmin;
  if (fromMax > intoMaxBefore) {
    into.dosis = from.dosis;
    into.freq = from.freq;
    into.via = from.via;
    into.med = from.med;
    if (from.cat) into.cat = from.cat;
  }
}
function coalesceMedPharmRowsByKey(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byKey = /* @__PURE__ */ Object.create(null);
  const order = [];
  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    if (!row || !row.rowKey) continue;
    if (!byKey[row.rowKey]) {
      byKey[row.rowKey] = Object.assign({}, row, {
        days: Object.assign({}, row.days || {}),
        notAdmin: Object.assign({}, row.notAdmin || {})
      });
      order.push(row.rowKey);
      continue;
    }
    mergeMedPharmRowDays(byKey[row.rowKey], row);
  }
  return order.map(function(key) {
    return byKey[key];
  });
}
function fillGapDays(days, fromDay, toDay) {
  for (let d = fromDay; d < toDay; d += 1) {
    if (dayValueInMap(days, d) > 0) continue;
    days[d] = 1;
  }
}
function mergeRecetaIntoMonth(month, recetaItems, fechaActualizacion) {
  const parsed = parseRecetaDateToDay(fechaActualizacion, month.year, month.monthIndex);
  if (!parsed.ok) return month;
  const target = parsed.day;
  const rows = (month.rows || []).slice();
  const items = recetaItems || [];
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (it.suspendido) continue;
    const fields = {
      med: trimStr2(it.nombreRaw),
      dosis: trimStr2(it.dosisRaw),
      freq: trimStr2(it.frecuenciaRaw),
      via: trimStr2(it.viaRaw)
    };
    const key = buildMedPharmRowKey(fields);
    let row = findRowByKey(rows, key);
    if (!row) {
      row = assignSomePharmCategory(
        Object.assign({}, fields, { rowKey: key, cat: "", days: {}, notAdmin: {} })
      );
      rows.push(row);
    }
    const last = lastIndicatedDay(row.days, month.daysInMonth);
    if (last > 0 && target > last + 1) fillGapDays(row.days, last + 1, target);
    if (!(dayValueInMap(row.days, target) > 0)) row.days[target] = 1;
  }
  return Object.assign({}, month, {
    rows,
    lastRecetaMergeDate: fechaActualizacion
  });
}
function mergeNotAdminFromPrevious(newRow, oldNotAdmin) {
  const notAdmin = {};
  const na = oldNotAdmin || {};
  const keys = Object.keys(newRow.days || {});
  for (let i = 0; i < keys.length; i += 1) {
    const d = parseInt(keys[i], 10);
    if (na[d] || na[String(d)]) notAdmin[d] = true;
  }
  return Object.assign({}, newRow, { notAdmin });
}
function applySomePasteToProfile(profile, parsed) {
  const base = profile && profile.months ? profile : { months: {} };
  const prev = base.months[parsed.monthKey];
  const prevNa = /* @__PURE__ */ Object.create(null);
  if (prev && prev.rows) {
    prev.rows.forEach(function(r) {
      prevNa[r.rowKey] = r.notAdmin || {};
    });
  }
  const prevRows = prev && prev.rows ? prev.rows : [];
  const prevByKey = /* @__PURE__ */ Object.create(null);
  prevRows.forEach(function(r) {
    prevByKey[r.rowKey] = r;
  });
  const rows = parsed.rows.map(function(r) {
    const row = mergeNotAdminFromPrevious(r, prevNa[r.rowKey]);
    const old = prevByKey[r.rowKey];
    if (!old) return assignSomePharmCategory(row);
    const patch = {};
    if (old.catOverride) {
      patch.catOverride = old.catOverride;
      patch.cat = old.catOverride;
    }
    if (old.hidden) patch.hidden = true;
    return assignSomePharmCategory(Object.assign({}, row, patch));
  });
  const months = Object.assign({}, base.months);
  months[parsed.monthKey] = {
    monthKey: parsed.monthKey,
    year: parsed.year,
    monthIndex: parsed.monthIndex,
    daysInMonth: parsed.daysInMonth,
    lastSomePasteAt: (/* @__PURE__ */ new Date()).toISOString(),
    rows
  };
  return { months };
}
function getMonthFromProfile(profile, year, monthIndex) {
  if (!profile || !profile.months) return null;
  return profile.months[monthKeyFromParts(year, monthIndex)] || null;
}
function profileHasMonthData(profile) {
  if (!profile || !profile.months || typeof profile.months !== "object") return false;
  return Object.keys(profile.months).some(function(k) {
    const m = profile.months[k];
    return m && Array.isArray(m.rows) && m.rows.length > 0;
  });
}
function monthHasData(profile, year, monthIndex) {
  const month = getMonthFromProfile(profile, year, monthIndex);
  return !!(month && Array.isArray(month.rows) && month.rows.length);
}
function deleteMonthFromProfile(profile, year, monthIndex) {
  if (!profile || !profile.months) return null;
  const key = monthKeyFromParts(year, monthIndex);
  if (!profile.months[key]) return profile;
  const months = Object.assign({}, profile.months);
  delete months[key];
  const next = Object.assign({}, profile, { months });
  if (!profileHasMonthData(next) && !trimStr2(next.draftPaste)) return null;
  if (!Object.keys(months).length) delete next.months;
  return next;
}
function ensureMonthOnProfile(profile, year, monthIndex) {
  const base = profile && profile.months ? profile : { months: {} };
  const key = monthKeyFromParts(year, monthIndex);
  if (base.months[key]) return base;
  const months = Object.assign({}, base.months);
  months[key] = emptyMonth(year, monthIndex);
  return { months };
}

// public/js/patient-registration-meta.mjs
function stampPatientRegistrationMeta(patient, user) {
  if (!patient) return patient;
  const uid = String(user?.user_id || "").trim();
  if (!uid) return patient;
  if (!patient.registeredByUserId) {
    patient.registeredByUserId = uid;
  }
  if (!patient.registeredAt) {
    patient.registeredAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  return patient;
}
function mergeRegistrationTimestamps(target, srcAt, tgtAt) {
  if (!tgtAt && srcAt) {
    target.registeredAt = srcAt;
    return;
  }
  if (!tgtAt || !srcAt) return;
  const srcMs = new Date(srcAt).getTime();
  const tgtMs = new Date(tgtAt).getTime();
  if (Number.isFinite(srcMs) && Number.isFinite(tgtMs) && srcMs < tgtMs) {
    target.registeredAt = srcAt;
  }
}
function mergePatientRegistrationMeta(target, source) {
  if (!target || !source) return;
  const srcUid = String(source.registeredByUserId || "").trim();
  const tgtUid = String(target.registeredByUserId || "").trim();
  if (!tgtUid && srcUid) {
    target.registeredByUserId = srcUid;
  }
  mergeRegistrationTimestamps(
    target,
    String(source.registeredAt || "").trim(),
    String(target.registeredAt || "").trim()
  );
}

// public/js/patient-date-fields.mjs
var ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
var DMY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
function accesoFechaToDateInputValue(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  if (ISO_RE.test(s)) return s;
  var m = DMY_RE.exec(s);
  if (!m) return "";
  var d = m[1].padStart(2, "0");
  var mo = m[2].padStart(2, "0");
  var y = m[3];
  return y + "-" + mo + "-" + d;
}
function dateInputValueToAccesoFecha(isoValue) {
  var s = String(isoValue == null ? "" : isoValue).trim();
  return ISO_RE.test(s) ? s : "";
}
function formatAccesoFechaDisplay(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  var m = ISO_RE.exec(s);
  if (m) return m[3] + "/" + m[2] + "/" + m[1];
  return s;
}

// public/js/patient-accesos.mjs
var VIA_ACCESO_LABELS = {
  periferica: "EV perif\xE9rica",
  cvc: "CVC",
  picc: "PICC"
};
function viaAccesoLabel(via) {
  var key = String(via || "").trim();
  return VIA_ACCESO_LABELS[key] || key;
}
function ensurePatientAccesos(patient) {
  if (!patient) return;
  if (!Array.isArray(patient.accesosList)) {
    patient.accesosList = [];
    if (patient.viaAcceso || patient.accesoFecha) {
      patient.accesosList.push({
        via: String(patient.viaAcceso || "").trim(),
        fecha: String(patient.accesoFecha || "").trim()
      });
    }
  }
  patient.accesosList = patient.accesosList.map(function(a) {
    return {
      via: String(a && a.via != null ? a.via : "").trim(),
      fecha: String(a && a.fecha != null ? a.fecha : "").trim()
    };
  });
  if (!patient.accesosList.length) {
    patient.accesosList = [{ via: "", fecha: "" }];
  }
  syncLegacyAccesoFields(patient);
}
function syncLegacyAccesoFields(patient) {
  if (!patient) return;
  var list = (patient.accesosList || []).filter(function(a) {
    return String(a && a.via || "").trim();
  });
  var primary = list.find(function(a) {
    return a.via === "cvc";
  }) || list[0];
  if (primary) {
    patient.viaAcceso = primary.via;
    patient.accesoFecha = primary.fecha || "";
  } else {
    patient.viaAcceso = "";
    patient.accesoFecha = "";
  }
}
function formatAccesosForCenso(patient) {
  ensurePatientAccesos(patient);
  return (patient.accesosList || []).map(function(a) {
    var via = viaAccesoLabel(a.via);
    var fecha = formatAccesoFechaDisplay(a.fecha);
    if (!via && !fecha) return "";
    if (via && fecha) return via + " " + fecha;
    return via || fecha;
  }).filter(Boolean).join("\n");
}
function mergeAccesosPatientFields(target, source) {
  if (!target || !source) return;
  if (Array.isArray(source.accesosList) && source.accesosList.length) {
    target.accesosList = source.accesosList.map(function(a) {
      return {
        via: String(a && a.via != null ? a.via : "").trim(),
        fecha: String(a && a.fecha != null ? a.fecha : "").trim()
      };
    });
    ensurePatientAccesos(target);
    return;
  }
  if (source.viaAcceso || source.accesoFecha) {
    if (!Array.isArray(target.accesosList) || !target.accesosList.some(function(a) {
      return String(a && a.via || "").trim();
    })) {
      target.viaAcceso = source.viaAcceso || target.viaAcceso;
      target.accesoFecha = source.accesoFecha || target.accesoFecha;
      ensurePatientAccesos(target);
    }
  }
}

// public/js/patient-diagnosticos.mjs
function normalizePlusSeparators(text) {
  return String(text || "").replace(/[\uFF0B\u2795]/g, "+").replace(/\s+\+\s+/g, " + ");
}
function parseDiagnosticosText(text) {
  var raw = normalizePlusSeparators(String(text || "").trim());
  if (!raw) return [];
  var parts = /\+/.test(raw) ? raw.split(/\s*\+\s*/) : raw.split(/\r?\n/);
  return parts.map(function(p) {
    return String(p || "").trim().replace(/^\d+\.\s*/, "").toUpperCase();
  }).filter(Boolean);
}
function formatDiagnosticosCopy(list) {
  return (list || []).map(function(d, i) {
    return i + 1 + ". " + String(d || "").trim();
  }).filter(function(line) {
    return line.length > 2;
  }).join("\n");
}
function ensurePatientDiagnosticos(patient) {
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [];
  if (!patient.diagnosticosList.length && patient.diagnosticosText) {
    patient.diagnosticosList = parseDiagnosticosText(String(patient.diagnosticosText));
  }
  if (!patient.diagnosticosList.length) patient.diagnosticosList = [""];
  var normalized = patient.diagnosticosList.map(function(d) {
    return String(d || "").trim().toUpperCase();
  });
  patient.diagnosticosList = normalized;
  var nonEmpty = normalized.filter(Boolean);
  patient.diagnosticosText = formatDiagnosticosCopy(nonEmpty);
}
var CENSO_MAX_DIAGNOSTICOS = 3;
function diagnosticosTextForCenso(list, options) {
  var max = options && options.max != null ? options.max : CENSO_MAX_DIAGNOSTICOS;
  return (list || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean).slice(0, max).join(" + ");
}
function migratePatientDiagnosticosFromVpo(patient, vpoState) {
  if (!patient || !vpoState) return false;
  var has = (patient.diagnosticosList || []).some(function(d) {
    return String(d).trim();
  });
  if (has) return false;
  var from = (vpoState.diagnosticosList || []).filter(function(d) {
    return String(d).trim();
  });
  if (!from.length) return false;
  patient.diagnosticosList = from.map(function(d) {
    return String(d).trim().toUpperCase();
  }).concat([""]);
  ensurePatientDiagnosticos(patient);
  return true;
}
function applyPatientDiagnosticosList(patient, list) {
  patient.diagnosticosList = list;
  ensurePatientDiagnosticos(patient);
}
function noteDiagnosticosEmpty(note) {
  var dx = note && note.diagnosticos || [];
  return !dx.some(function(d) {
    return String(d).trim();
  });
}
function patientDiagnosticosNonEmpty(patient) {
  ensurePatientDiagnosticos(patient);
  return (patient.diagnosticosList || []).filter(function(d) {
    return String(d).trim();
  });
}
function preloadNoteDxFromPatient(note, patient) {
  return syncNoteDxFromPatient(note, patient, { mode: "ifEmpty" });
}
function syncNoteDxFromPatient(note, patient, options) {
  if (!note || !patient) return false;
  var mode = options && options.mode || "ifEmpty";
  var from = patientDiagnosticosNonEmpty(patient);
  if (!from.length) return false;
  if (mode === "ifEmpty" && !noteDiagnosticosEmpty(note)) return false;
  note.diagnosticos = from.slice();
  return true;
}
function ensureNoteDxFromPatientForExport(note, patient) {
  return syncNoteDxFromPatient(note, patient, { mode: "ifEmpty" });
}
function diagnosticosListHasContent(list) {
  return (list || []).some(function(d) {
    return String(d || "").trim();
  });
}
function stampCensoFieldsClock(patient, now) {
  if (!patient) return;
  patient.lanUpdatedAt = String(now || (/* @__PURE__ */ new Date()).toISOString());
}
function mergeCensoPatientFields(target, source, options) {
  if (!target || !source) return;
  var keepLocal = !!(options && options.keepLocalWhenPresent);
  mergeAccesosPatientFields(target, source);
  if (source.censoMedsText && !(keepLocal && String(target.censoMedsText || "").trim())) {
    target.censoMedsText = source.censoMedsText;
  }
  if (!diagnosticosListHasContent(source.diagnosticosList)) return;
  if (keepLocal && diagnosticosListHasContent(target.diagnosticosList)) return;
  target.diagnosticosList = source.diagnosticosList;
  if (source.diagnosticosText) target.diagnosticosText = source.diagnosticosText;
  else ensurePatientDiagnosticos(target);
}
function pushDiagnosticosToPatient(patient, list) {
  if (!patient) return;
  var cleaned = (list || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean);
  applyPatientDiagnosticosList(patient, cleaned.length ? cleaned.concat([""]) : [""]);
}

// lib/clinical-text.mjs
function toClinicalHistoryText(value) {
  if (value == null) return "";
  return String(value).toUpperCase();
}

// lib/drive-import/merge-eventualidades.mjs
function dedupeEventualidadKey(entry) {
  const day = String(entry.at || "").slice(0, 10);
  const prefix = toClinicalHistoryText(entry.text).trim().slice(0, 160);
  return day + "|" + prefix;
}
function filterNewEventualidades(existing, incoming) {
  const keys = /* @__PURE__ */ new Set();
  for (const e of existing || []) {
    keys.add(dedupeEventualidadKey(e));
  }
  const toAdd = [];
  let skipped = 0;
  for (const e of incoming || []) {
    const key = dedupeEventualidadKey(e);
    if (keys.has(key)) {
      skipped += 1;
      continue;
    }
    keys.add(key);
    toAdd.push({ at: String(e.at), text: String(e.text) });
  }
  return { toAdd, skipped };
}

// public/js/patient-merge-eventualidades.mjs
function mergeEventualidadRow(byId, row) {
  if (!row || typeof row !== "object") return;
  const id = String(
    /** @type {{ id?: string }} */
    row.id || ""
  ).trim();
  if (!id) return;
  const cur = byId.get(id);
  const at = String(
    /** @type {{ at?: string }} */
    row.at || ""
  );
  const curAt = cur ? String(
    /** @type {{ at?: string }} */
    cur.at || ""
  ) : "";
  if (!cur || compareIso(at, curAt) >= 0) byId.set(id, { ...row });
}
function appendAnonymousEventualidades(byId, leftEntries, rightEntries) {
  const { toAdd } = filterNewEventualidades(
    Array.from(byId.values()),
    rightEntries.filter((row) => !String(
      /** @type {{ id?: string }} */
      row.id || ""
    ).trim())
  );
  for (const row of toAdd) {
    byId.set("anon:" + dedupeEventualidadKey(row), { ...row });
  }
}
function mergeEventualidadesLabsText(a, b) {
  const la = a != null ? String(a).trim() : "";
  const lb = b != null ? String(b).trim() : "";
  if (!la) return lb;
  if (!lb) return la;
  if (la === lb || la.indexOf(lb) >= 0) return la;
  if (lb.indexOf(la) >= 0) return lb;
  return la.length >= lb.length ? la : lb;
}
function mergeEventualidadDeletedIds(a, b) {
  const out = {};
  const left = a && typeof a === "object" ? (
    /** @type {Record<string, unknown>} */
    a
  ) : {};
  const right = b && typeof b === "object" ? (
    /** @type {Record<string, unknown>} */
    b
  ) : {};
  const keys = /* @__PURE__ */ new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const id = String(key || "").trim();
    if (!id) continue;
    const la = String(left[id] || "");
    const ra = String(right[id] || "");
    if (!la && !ra) continue;
    out[id] = compareIso(ra, la) >= 0 ? ra || la : la;
  }
  return out;
}
function asEventualidadesSide(value) {
  if (!value || typeof value !== "object") return null;
  return (
    /** @type {{ entries?: object[], labsText?: string, deletedIds?: Record<string, string>, updatedAt?: string }} */
    value
  );
}
function eventualidadesEntriesOf(side) {
  return side && Array.isArray(side.entries) ? side.entries : [];
}
function finalizeEventualidadEntries(byId, deletedIds) {
  return Array.from(byId.values()).filter(function(row) {
    const id = String(
      /** @type {{ id?: string }} */
      row.id || ""
    ).trim();
    return !id || !deletedIds[id];
  }).sort(function(x, y) {
    return compareIso(
      String(
        /** @type {{ at?: string }} */
        y.at || ""
      ),
      String(
        /** @type {{ at?: string }} */
        x.at || ""
      )
    );
  });
}
function newerIsoClock(leftAt, rightAt) {
  return compareIso(rightAt, leftAt) >= 0 ? rightAt || leftAt : leftAt;
}
function buildMergedEventualidadesStore(left, right) {
  const leftEntries = eventualidadesEntriesOf(left);
  const rightEntries = eventualidadesEntriesOf(right);
  const byId = /* @__PURE__ */ new Map();
  for (const row of leftEntries) mergeEventualidadRow(byId, row);
  for (const row of rightEntries) mergeEventualidadRow(byId, row);
  appendAnonymousEventualidades(byId, leftEntries, rightEntries);
  const deletedIds = mergeEventualidadDeletedIds(left && left.deletedIds, right && right.deletedIds);
  const entries = finalizeEventualidadEntries(byId, deletedIds);
  const labsText = mergeEventualidadesLabsText(left && left.labsText, right && right.labsText);
  const out = labsText ? { entries, labsText } : { entries };
  if (Object.keys(deletedIds).length) out.deletedIds = deletedIds;
  const updatedAt = newerIsoClock(
    left && left.updatedAt ? String(left.updatedAt) : "",
    right && right.updatedAt ? String(right.updatedAt) : ""
  );
  if (updatedAt) out.updatedAt = updatedAt;
  return out;
}
function mergeEventualidades(a, b) {
  const left = asEventualidadesSide(a);
  const right = asEventualidadesSide(b);
  if (!left && !right) return void 0;
  return buildMergedEventualidadesStore(left, right);
}

// public/js/lab-history-auto-store-core.mjs
function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}
function normalizedSourceText(s) {
  return normalizeText(s && s.sourceText).replace(/\s+/g, " ");
}
function normalizeLabLine(line) {
  return normalizeText(line).replace(/\s+/g, " ");
}
function normalizeLabLines(lines) {
  return (Array.isArray(lines) ? lines : []).map(normalizeLabLine).filter(Boolean);
}
var GASO_FINGERPRINT_KEYS = {
  PH: true,
  PCO2: true,
  PO2: true,
  LACTATO: true,
  LAC: true,
  BICA: true,
  HCO3: true,
  BE: true
};
function parseGasometriaCoreValues(line) {
  var out = /* @__PURE__ */ Object.create(null);
  var re = /\b(pH|pCO2|pO2|Lactato|Lac|Bica|HCO3|BE)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/gi;
  var m;
  while (m = re.exec(String(line || ""))) {
    var key = String(m[1] || "").toUpperCase().replace("\xD3", "O");
    if (key === "LAC") key = "LACTATO";
    if (key === "HCO3") key = "BICA";
    if (!GASO_FINGERPRINT_KEYS[key]) continue;
    var num = String(m[2] || "").replace(",", ".");
    out[key] = num;
  }
  return out;
}
function gasometriaFingerprintFromResLabs(resLabs) {
  var merged = /* @__PURE__ */ Object.create(null);
  (resLabs || []).forEach(function(chunk) {
    var s = String(chunk || "").trim();
    if (!s) return;
    if (!/^GASES\b/i.test(s) && !/^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(s)) {
      return;
    }
    var vals = parseGasometriaCoreValues(s);
    Object.keys(vals).forEach(function(k) {
      merged[k] = vals[k];
    });
  });
  var keys = Object.keys(merged).sort();
  if (!keys.length) {
    var parts = [];
    (resLabs || []).forEach(function(chunk) {
      var s = String(chunk || "").trim();
      if (!s) return;
      if (/^GASES\b/i.test(s) || /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(s)) {
        parts.push(normalizeLabLine(s));
      }
    });
    if (!parts.length) return "";
    parts.sort();
    return parts.join("");
  }
  return keys.map(function(k) {
    return k + "=" + merged[k];
  }).join("|");
}
function areLabSetsEquivalent(a, b) {
  var aa = normalizeLabLines(a);
  var bb = normalizeLabLines(b);
  if (aa.length !== bb.length) return false;
  for (var i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}
function normalizeDateValue(value) {
  return normalizeText(value);
}
function normalizeTimeValue(value) {
  var t = normalizeText(value);
  if (!t) return "";
  var m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  var hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  var mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
function areDuplicateLabSets(a, b) {
  if (!a || !b) return false;
  if (normalizeDateValue(a.fecha) !== normalizeDateValue(b.fecha)) return false;
  if (normalizeTimeValue(a.hora) !== normalizeTimeValue(b.hora)) return false;
  return areLabSetsEquivalent(a.resLabs || [], b.resLabs || []);
}
function compareLabSetIdForDedupe(a, b) {
  var sa = String(a.id);
  var sb = String(b.id);
  var na = parseInt(sa, 10);
  var nb = parseInt(sb, 10);
  var aNum = !isNaN(na) && String(na) === sa;
  var bNum = !isNaN(nb) && String(nb) === sb;
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return sa.localeCompare(sb);
}
function exactSignatureForLabSet(s) {
  if (!s || s.id == null || String(s.id) === "") return null;
  var lines = normalizeLabLines(s.resLabs || []);
  return normalizeDateValue(s.fecha) + "" + normalizeTimeValue(s.hora) + "" + lines.join("");
}
function findExactDuplicateLabGroups(sets) {
  var list = (sets || []).filter(function(s2) {
    return s2 && s2.id != null && String(s2.id) !== "";
  });
  var bySig = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var sig = exactSignatureForLabSet(s);
    if (sig == null) continue;
    if (!bySig[sig]) bySig[sig] = [];
    bySig[sig].push(s);
  }
  var groups = [];
  Object.keys(bySig).forEach(function(sig2) {
    var arr = bySig[sig2];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    groups.push({
      kind: "exact",
      keeperId: String(arr[0].id),
      removeIds: arr.slice(1).map(function(x) {
        return String(x.id);
      })
    });
  });
  return groups;
}
function findDuplicateLabSetIdsToRemove(sets) {
  var groups = findExactDuplicateLabGroups(sets);
  var remove = [];
  for (var i = 0; i < groups.length; i++) {
    remove = remove.concat(groups[i].removeIds);
  }
  return remove;
}
function stripExactDuplicateLabSets(sets) {
  var list = sets || [];
  var remove = new Set(findDuplicateLabSetIdsToRemove(list));
  if (!remove.size) return { sets: list, removedIds: [] };
  var removedIds = [];
  var next = list.filter(function(s) {
    if (!s || s.id == null) return true;
    var id = String(s.id);
    if (!remove.has(id)) return true;
    removedIds.push(id);
    return false;
  });
  return { sets: next, removedIds };
}
function analyteFingerprintFromResLabs(resLabs) {
  var pairs = [];
  (resLabs || []).forEach(function(row) {
    var line = String(row == null ? "" : row).split("\n")[0].trim().replace("	", " ");
    if (!line) return;
    var tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return;
    var sec = tokens[0].replace(/:$/, "").toUpperCase();
    var i = 1;
    while (i < tokens.length) {
      var tok = tokens[i];
      var next = tokens[i + 1];
      if (next !== void 0) {
        var n = parseFloat(String(next).replace("*", "").replace(",", "."));
        if (isFinite(n)) {
          pairs.push(sec + "." + String(tok).toUpperCase() + ":" + n);
          i += 2;
          continue;
        }
      }
      i += 1;
    }
  });
  if (!pairs.length) return "";
  pairs.sort();
  return pairs.join("|");
}
function fechaKeyForAnalyteDedupe(set) {
  return normalizeDateValue(set && set.fecha);
}
function findAnalyteDuplicateLabGroups(sets) {
  var list = (sets || []).filter(function(s) {
    return s && s.id != null && String(s.id) !== "";
  });
  var by = /* @__PURE__ */ Object.create(null);
  list.forEach(function(s) {
    var fecha = fechaKeyForAnalyteDedupe(s);
    var fp = analyteFingerprintFromResLabs(s.resLabs || []);
    if (!fecha || !fp) return;
    var key = fecha + "" + fp;
    if (!by[key]) by[key] = [];
    by[key].push(s);
  });
  var groups = [];
  Object.keys(by).forEach(function(key) {
    var arr = by[key];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    groups.push({
      kind: "analyte",
      keeperId: String(arr[0].id),
      removeIds: arr.slice(1).map(function(x) {
        return String(x.id);
      })
    });
  });
  return groups;
}
function applyRemoveIds(sets, removeIds) {
  var remove = new Set(removeIds || []);
  if (!remove.size) return { sets: sets || [], removedIds: [] };
  var removedIds = [];
  var next = (sets || []).filter(function(s) {
    if (!s || s.id == null) return true;
    var id = String(s.id);
    if (!remove.has(id)) return true;
    removedIds.push(id);
    return false;
  });
  return { sets: next, removedIds };
}
function stripDuplicateLabSets(sets) {
  var exact = stripExactDuplicateLabSets(sets);
  var analyteIds = [];
  findAnalyteDuplicateLabGroups(exact.sets).forEach(function(g) {
    analyteIds = analyteIds.concat(g.removeIds);
  });
  var analyte = applyRemoveIds(exact.sets, analyteIds);
  return {
    sets: analyte.sets,
    removedIds: exact.removedIds.concat(analyte.removedIds)
  };
}
function findNormalizedSourceDuplicateGroups(sets) {
  var list = (sets || []).filter(function(s2) {
    if (!s2 || s2.id == null || String(s2.id) === "") return false;
    return normalizedSourceText(s2).length > 24;
  });
  var by = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var k = normalizedSourceText(s);
    if (!by[k]) by[k] = [];
    by[k].push(s);
  }
  var groups = [];
  Object.keys(by).forEach(function(k2) {
    var arr = by[k2];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    groups.push({
      kind: "sourceText",
      preview: k2.slice(0, 72) + (k2.length > 72 ? "\u2026" : ""),
      ids: arr.map(function(x) {
        return String(x.id);
      }),
      fechas: arr.map(function(x) {
        return normalizeDateValue(x.fecha);
      })
    });
  });
  return groups;
}
function findConflictingSameDateTimeGroups(sets) {
  var list = (sets || []).filter(function(s2) {
    return s2 && s2.id != null && String(s2.id) !== "";
  });
  var by = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var k = normalizeDateValue(s.fecha) + "" + normalizeTimeValue(s.hora);
    if (!by[k]) by[k] = [];
    by[k].push(s);
  }
  var out = [];
  Object.keys(by).forEach(function(k2) {
    var arr = by[k2];
    if (arr.length < 2) return;
    var base = arr[0];
    var allSame = arr.every(function(s2) {
      return areLabSetsEquivalent(s2.resLabs || [], base.resLabs || []);
    });
    if (allSame) return;
    out.push({
      kind: "sameDateTimeDifferentLabs",
      fecha: base.fecha,
      hora: base.hora,
      ids: arr.map(function(x) {
        return String(x.id);
      })
    });
  });
  return out;
}
function findLabSetsByDateTime(sets, fecha, hora) {
  var f = normalizeDateValue(fecha);
  var h = normalizeTimeValue(hora);
  if (!f || !h) return [];
  var matches = (sets || []).filter(function(s) {
    if (!s || s.id == null || String(s.id) === "") return false;
    return normalizeDateValue(s.fecha) === f && normalizeTimeValue(s.hora) === h;
  });
  matches.sort(compareLabSetIdForDedupe);
  return matches;
}
function planLabHistoryDateTimeUpsert(existingSets, incoming) {
  var fecha = incoming && incoming.fecha;
  var hora = incoming && incoming.hora;
  var matches = findLabSetsByDateTime(existingSets, fecha, hora);
  if (!matches.length) {
    return { action: "add", keeper: null, siblings: [] };
  }
  var keeper = matches[0];
  var siblings = matches.slice(1);
  if (!siblings.length && areDuplicateLabSets(keeper, {
    fecha,
    hora,
    resLabs: incoming && incoming.resLabs || []
  })) {
    return { action: "skip", keeper, siblings: [] };
  }
  return { action: "merge", keeper, siblings };
}

// public/js/labs-default-refs.mjs
var DEFAULT_LAB_REFS = {
  Hb: [12, 17.5],
  Hto: [36, 53],
  Leu: [4, 11],
  Plt: [150, 400],
  VCM: [80, 100],
  HCM: [27, 33],
  RBC: [4.2, 5.4],
  CHCM: [31.5, 34.5],
  RDW: [11.5, 14.5],
  MPV: [7.4, 10.4],
  Neu: [1.5, 8],
  Eos: [0, 0.6],
  Lin: [0.6, 3.4],
  Mono: [0, 0.9],
  Baso: [0, 0.2],
  NeuPct: [37, 80],
  LinPct: [10, 50],
  MonoPct: [0, 12],
  EosPct: [0, 7],
  BasoPct: [0, 2.5],
  Bandas: [0, 5],
  Mielo: [0, 1],
  Metamielo: [0, 1],
  Promielo: [0, 1],
  Blastos: [0, 1],
  Atipicos: [0, 5],
  Ret: [0.5, 2.5],
  TP: [11, 14],
  TTP: [25, 35],
  INR: [0.8, 1.2],
  Fib: [150, 400],
  DD: [0, 500],
  Glu: [70, 100],
  Cr: [0.5, 1.3],
  BUN: [7, 20],
  PCR: [0, 0.5],
  PCT: [0, 0.05],
  AU: [3.5, 7],
  TGL: [0, 150],
  COL: [0, 200],
  HDL: [40, 60],
  LDL: [0, 130],
  VLDL: [2, 40],
  IA: [0, 3.22],
  CTHDL: [0, 3.1],
  CPK: [30, 200],
  Na: [136, 145],
  K: [3.5, 5],
  Cl: [96, 106],
  HCO3: [22, 28],
  Ca: [8.5, 10.5],
  F: [2.5, 4.5],
  Mg: [1.6, 2.6],
  AST: [10, 40],
  ALT: [7, 56],
  FA: [44, 147],
  GGT: [0, 55],
  Prot: [6, 8.3],
  BT: [0.1, 1.2],
  Alb: [3.5, 5.2],
  BD: [0, 0.3],
  BI: [0.1, 1],
  LDH: [120, 250],
  Amil: [30, 110],
  Lip: [8, 57],
  TnI1: [0, 34],
  TnI2: [0, 34],
  TSH: [0.4, 4],
  T4L: [0.8, 1.8],
  HbA1c: [4, 5.6],
  NTproBNP: [0, 125],
  Fe: [50, 170],
  Ferr: [30, 400],
  CysC: [0.5, 1],
  Vanco: [10, 20],
  B12: [200, 900]
};
var DEFAULT_GASO_REFS = {
  pH: [7.35, 7.45],
  pCO2: [35, 45],
  pO2: [83, 100],
  Lactato: [0.5, 2.2],
  Na: [135, 148],
  K: [3.5, 5.3],
  GLU: [70, 110],
  Hto: [34, 50],
  Bica: [22, 28],
  iCa: [1.12, 1.32]
};
function isValidRangePair_(r) {
  return r && r.length === 2 && isFinite(r[0]) && isFinite(r[1]) && r[1] > r[0];
}
function collectPriorRefsFromHistory(history) {
  var out = /* @__PURE__ */ Object.create(null);
  if (!history || !history.length) return out;
  for (var i = 0; i < history.length; i++) {
    var refs = history[i] && history[i].refsBySection;
    if (!refs || typeof refs !== "object") continue;
    Object.keys(refs).forEach(function(sec) {
      var row = refs[sec];
      if (!row || typeof row !== "object") return;
      if (!out[sec]) out[sec] = /* @__PURE__ */ Object.create(null);
      Object.keys(row).forEach(function(k) {
        var r = row[k];
        if (isValidRangePair_(r)) out[sec][k] = [r[0], r[1]];
      });
    });
  }
  return out;
}
function mergeRefsMap_(base, overlay) {
  var out = /* @__PURE__ */ Object.create(null);
  if (base && typeof base === "object") {
    Object.keys(base).forEach(function(k) {
      if (isValidRangePair_(base[k])) out[k] = [base[k][0], base[k][1]];
    });
  }
  if (overlay && typeof overlay === "object") {
    Object.keys(overlay).forEach(function(k) {
      if (isValidRangePair_(overlay[k])) out[k] = [overlay[k][0], overlay[k][1]];
    });
  }
  return out;
}
function mergeRefsBySection_(reportRefs, priorBySec) {
  var out = /* @__PURE__ */ Object.create(null);
  var prior = priorBySec && typeof priorBySec === "object" ? priorBySec : null;
  var report = reportRefs && typeof reportRefs === "object" ? reportRefs : null;
  var keys = /* @__PURE__ */ Object.create(null);
  if (prior) Object.keys(prior).forEach(function(k) {
    keys[k] = true;
  });
  if (report) Object.keys(report).forEach(function(k) {
    keys[k] = true;
  });
  Object.keys(keys).forEach(function(sec) {
    var merged = mergeRefsMap_(prior && prior[sec], report && report[sec]);
    if (Object.keys(merged).length) out[sec] = merged;
  });
  return out;
}
function mergeGasRefs_(base, overlay) {
  return mergeRefsMap_(base, overlay);
}
function resolveLabFieldRange_(data, fieldKey, priorRefs, defaults) {
  if (data && isValidRangePair_([data.min, data.max])) return [data.min, data.max];
  var fromPrior = priorRefs && priorRefs[fieldKey];
  if (isValidRangePair_(fromPrior)) return [fromPrior[0], fromPrior[1]];
  var table = defaults || DEFAULT_LAB_REFS;
  var d = table[fieldKey];
  return isValidRangePair_(d) ? [d[0], d[1]] : null;
}

// public/js/labs-extract.mjs
function extraerConRango(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t.indexOf(nombre);
    if (idx === -1) continue;
    var start = idx + nombre.length;
    var sub = texto.substring(start, start + 220);
    var mValor = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return {
      valor: valorStr,
      min: parseFloat(mRango[1].replace(",", ".")),
      max: parseFloat(mRango[2].replace(",", "."))
    };
  }
  return { valor: "---", min: null, max: null };
}
function esContextoUrinario_(texto, idxNombre, nombreLen) {
  var after = texto.substring(idxNombre + nombreLen, idxNombre + nombreLen + 48).toUpperCase();
  if (/^\s*(EN\s+ORINA|URINARIO|URINARIA)\b/.test(after)) return true;
  return false;
}
function esFraccionColesterol_(texto, idxNombre, nombreLen) {
  var after = texto.substring(idxNombre + nombreLen, idxNombre + nombreLen + 16).toUpperCase();
  return /^\s*(HDL|LDL)\b/.test(after);
}
function esContextoSedimentoOrina_(texto, idxNombre, nombreLen) {
  var w = texto.substring(idxNombre, Math.min(texto.length, idxNombre + nombreLen + 120));
  if (/\/CAMPO\b/i.test(w)) return true;
  if (/Leucocitos\/uL|Hem\/uL|E\.U\.\/dL/i.test(w)) return true;
  var head = texto.substring(Math.max(0, idxNombre - 4500), idxNombre).toUpperCase();
  if (!/URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA/.test(head)) return false;
  var lastOrina = Math.max(
    head.lastIndexOf("URIANALISIS"),
    head.lastIndexOf("EXAMEN GENERAL DE ORINA"),
    head.lastIndexOf("ANALISIS DE ORINA")
  );
  if (lastOrina === -1) return true;
  var after = head.substring(lastOrina);
  return !/BIOMETRIA\s+HEMATICA|\bHGB\b|\bWBC\b|\bRBC\s+\d|\bPLT\s+\d/i.test(after);
}
function extraerConRangoBH(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoSedimentoOrina_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return {
        valor: valorStr,
        min: parseFloat(mRango[1].replace(",", ".")),
        max: parseFloat(mRango[2].replace(",", "."))
      };
    }
  }
  return { valor: "---", min: null, max: null };
}
function extraerConRangoSuero(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoUrinario_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      if (nombre === "COLESTEROL" && esFraccionColesterol_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return {
        valor: valorStr,
        min: parseFloat(mRango[1].replace(",", ".")),
        max: parseFloat(mRango[2].replace(",", "."))
      };
    }
  }
  return { valor: "---", min: null, max: null };
}
function extraerIndiceAterogenico_(texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  var nombres = ["INDICE ATEROGENICO", "\xCDNDICE ATEROG\xC9NICO", "INDICE ATEROG\xC9NICO"];
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      var sub = texto.substring(idx + nombre.length, idx + nombre.length + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRiesgo = sub.match(/(\d+[.,]?\d*)\s*RIESGO/);
      if (mRiesgo) {
        return {
          valor: valorStr,
          min: 0,
          max: parseFloat(mRiesgo[1].replace(",", "."))
        };
      }
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (mRango) {
        return {
          valor: valorStr,
          min: parseFloat(mRango[1].replace(",", ".")),
          max: parseFloat(mRango[2].replace(",", "."))
        };
      }
      return { valor: valorStr, min: null, max: null };
    }
  }
  return { valor: "---", min: null, max: null };
}
var COAG_ROW_BOUNDARIES_ = [
  "TIEMPO DE PROTROMBINA",
  "TIEMPO DE TROMBOPLASTINA",
  "INR",
  "FIBRINOGENO",
  "FIBRIN\xD3GENO",
  "DIMERO D",
  "D-DIMERO",
  "D DIMERO",
  "TESTIGO",
  "OBSERVACIONES",
  "FROTIS",
  "DIFERENCIAL",
  "BIOMETRIA"
];
function isCoagPanelTitleAfter_(tUpper, idx, nombreLen) {
  var after = tUpper.substring(idx + nombreLen, idx + nombreLen + 24);
  return /^\s*Y\s+TROMBO/.test(after);
}
function findCoagBoundaryPos_(tUpper, fromIdx, bound) {
  if (bound !== "INR") return tUpper.indexOf(bound, fromIdx);
  var slice = tUpper.substring(fromIdx);
  var re = /(?:^|[^A-Z0-9])INR(?![A-Z0-9])/g;
  var m = re.exec(slice);
  if (!m) return -1;
  var at = m[0].indexOf("INR");
  return fromIdx + m.index + at;
}
function coagWindowEnd_(tUpper, fromIdx, nombre) {
  var end = Math.min(tUpper.length, fromIdx + 220);
  var nombreU = String(nombre || "").toUpperCase();
  for (var i = 0; i < COAG_ROW_BOUNDARIES_.length; i++) {
    var bound = COAG_ROW_BOUNDARIES_[i];
    if (bound === nombreU) continue;
    var pos = findCoagBoundaryPos_(tUpper, fromIdx, bound);
    if (pos > fromIdx && pos < end) end = pos;
  }
  return end;
}
function parseCoagValorRango_(sub) {
  if (!sub) return null;
  var clean = String(sub).replace(/TESTIGO[\s\S]*$/i, " ");
  clean = clean.replace(/\b(?:Campo|Labo)\s*-?\d+/gi, " ");
  var mRango = clean.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
  var min = mRango ? parseFloat(mRango[1].replace(",", ".")) : null;
  var max = mRango ? parseFloat(mRango[2].replace(",", ".")) : null;
  var rangoIdx = mRango ? clean.search(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/) : -1;
  var beforeRango = rangoIdx >= 0 ? clean.substring(0, rangoIdx) : clean;
  var mValor = beforeRango.match(/(-?\d+[.,]?\d*)/);
  if (!mValor) return null;
  return { valor: mValor[1], min, max };
}
function isFibrinogenoNombre_(nombre) {
  return /^FIBRIN[OÓ]GENO$/.test(String(nombre || ""));
}
function isUefFibrinogenoMatch_(tUpper, idx) {
  var before = tUpper.substring(Math.max(0, idx - 48), idx);
  if (/\bUEF\b/.test(before)) return true;
  return /EQUIVALENTES\s+DE\s*$/i.test(before.trimEnd());
}
function shouldSkipCoagMatch_(tUpper, nombre, idx) {
  if (nombre === "TIEMPO DE PROTROMBINA" && isCoagPanelTitleAfter_(tUpper, idx, nombre.length)) {
    return true;
  }
  if (isFibrinogenoNombre_(nombre) && isUefFibrinogenoMatch_(tUpper, idx)) {
    return true;
  }
  if (nombre !== "INR") return false;
  var before = tUpper.charAt(idx - 1) || " ";
  var afterCh = tUpper.charAt(idx + 3) || " ";
  return /[A-Z0-9]/.test(before) || /[A-Z0-9]/.test(afterCh);
}
function isImplausibleInr_(valorStr, maxInr) {
  var inrN = parseFloat(String(valorStr || "").replace(",", "."));
  return isFinite(inrN) && inrN > maxInr;
}
function isImplausibleFib_(valorStr) {
  var fibN = parseFloat(String(valorStr || "").replace(",", "."));
  return !isFinite(fibN) || fibN < 10 || fibN > 2e3;
}
function tryParseCoagAt_(texto, tUpper, nombre, idx, maxInr) {
  if (shouldSkipCoagMatch_(tUpper, nombre, idx)) return null;
  var subStart = idx + nombre.length;
  var parsed = parseCoagValorRango_(texto.substring(subStart, coagWindowEnd_(tUpper, subStart, nombre)));
  if (!parsed) return null;
  if (nombre === "INR" && isImplausibleInr_(parsed.valor, maxInr)) return null;
  if (isFibrinogenoNombre_(nombre) && isImplausibleFib_(parsed.valor)) return null;
  return parsed;
}
function extraerConRangoCoag(nombres, texto, opts) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  var maxInr = opts && typeof opts.maxInr === "number" ? opts.maxInr : 8;
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      var parsed = tryParseCoagAt_(texto, t, nombre, idx, maxInr);
      if (parsed) return parsed;
      start = idx + nombre.length;
    }
  }
  return { valor: "---", min: null, max: null };
}
function extraerConRangoPanel(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t.indexOf(nombre);
    if (idx === -1) continue;
    var sub = texto.substring(idx + nombre.length, idx + nombre.length + 260);
    var stripped = sub;
    var reName = new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    stripped = stripped.replace(reName, " ");
    var mValor = stripped.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = stripped.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return {
      valor: valorStr,
      min: parseFloat(mRango[1].replace(",", ".")),
      max: parseFloat(mRango[2].replace(",", "."))
    };
  }
  return { valor: "---", min: null, max: null };
}
function marcarSegunRango(valorStr, min, max) {
  if (valorStr === "---" || valorStr == null) return valorStr;
  var v = parseFloat(String(valorStr).replace(",", "."));
  if (isNaN(v) || min == null || max == null) return valorStr;
  return v < min || v > max ? valorStr + "*" : valorStr;
}
function fmt(val) {
  if (!val || val === "---") return val;
  var star = val.endsWith("*");
  var n = parseFloat((star ? val.slice(0, -1) : val).replace(",", "."));
  if (isNaN(n)) return val;
  return String(n) + (star ? "*" : "");
}
function fmtLabRanged_(data, fieldKey, priorRefs, defaults) {
  if (!data || data.valor === "---" || data.valor == null) return data ? data.valor : "---";
  var range = resolveLabFieldRange_(data, fieldKey, priorRefs, defaults);
  if (!range) return fmt(data.valor);
  return fmt(marcarSegunRango(data.valor, range[0], range[1]));
}
function toNum_(v) {
  if (v === "---" || v == null) return null;
  var n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

// public/js/labs-troponin.mjs
var TROPONINA_HS_NORMAL_MAX_NG_L = 34;
var TROPONINA_TEST_NAMES = [
  "TROPONINA I (ALTA SENSIBILIDAD)",
  "HS TNL O TROPONINA I",
  "HSTNL O TROPONINA I",
  "HSTNL O TROPONINA",
  "TROPONINA I",
  "TROPONINA"
];
function troponinaQualFromSub_(sub) {
  if (/INDETERMINADO/i.test(sub)) return "indet";
  if (/POSITIVO/i.test(sub)) return "pos";
  if (/NEGATIVO/i.test(sub)) return "neg";
  return "";
}
function troponinaRefsFromHit_(hit) {
  if (hit.max != null && hit.min != null && hit.max > hit.min) {
    return { min: hit.min, max: hit.max };
  }
  return { min: 0, max: TROPONINA_HS_NORMAL_MAX_NG_L };
}
function formatTnIDisplay_(valorStr, qual, minRef, maxRef) {
  var out = fmt(marcarSegunRango(valorStr, minRef, maxRef));
  var v = parseFloat(String(valorStr).replace(",", "."));
  var flagged = qual === "indet" || qual === "pos" || isFinite(v) && (v > maxRef || v < minRef);
  if (flagged && out !== "---" && !String(out).endsWith("*")) out += "*";
  return out;
}
function parseTnINum_(token) {
  var m = String(token || "").match(/^([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}
function troponinaDeltaPct_(v1, v2) {
  if (!isFinite(v1) || !isFinite(v2) || v1 === 0) return null;
  return (v2 - v1) / v1 * 100;
}
function formatTroponinaDeltaPct_(pct) {
  if (pct == null || !isFinite(pct)) return "";
  var rounded = Math.round(pct * 10) / 10;
  return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)) + "%";
}
function extractAllTroponinaFromText_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return [];
  var texto = textoBruto.replace(/\r/g, "");
  var tUp = texto.toUpperCase();
  var hits = [];
  TROPONINA_TEST_NAMES.forEach(function(nombre) {
    var nameUp = nombre.toUpperCase();
    var start = 0;
    while (true) {
      var idx = tUp.indexOf(nameUp, start);
      if (idx === -1) break;
      var sub = texto.substring(idx, idx + 320);
      var subText = texto.substring(idx + nameUp.length, idx + nameUp.length + 220);
      var mValor = subText.match(/(-?\d+[.,]?\d*)/);
      if (mValor) {
        var mRango = subText.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
        hits.push({
          valor: mValor[1],
          min: mRango ? parseFloat(mRango[1].replace(",", ".")) : null,
          max: mRango ? parseFloat(mRango[2].replace(",", ".")) : null,
          qual: troponinaQualFromSub_(sub),
          index: idx
        });
      }
      start = idx + nameUp.length;
    }
  });
  hits.sort(function(a, b) {
    return a.index - b.index;
  });
  var deduped = [];
  hits.forEach(function(h) {
    var overlap = deduped.find(function(prev) {
      return Math.abs(prev.index - h.index) < 100 && prev.valor === h.valor;
    });
    if (!overlap) deduped.push(h);
  });
  return deduped;
}
function buildTroponinaResLabLine_(values) {
  var list = (values || []).filter(function(v) {
    return v && v.display && v.display !== "---";
  });
  if (!list.length) return "";
  if (list.length === 1) {
    return "TROP	TnI " + list[0].display;
  }
  var v1 = list[0];
  var v2 = list[list.length - 1];
  var pct = troponinaDeltaPct_(v1.raw, v2.raw);
  var delta = formatTroponinaDeltaPct_(pct);
  var body = "TnI1 " + v1.display + " TnI2 " + v2.display;
  if (delta) body += " \u0394% " + delta;
  return "TROP	" + body;
}
function parseTnIDisplayTokensFromResLabRow_(row) {
  var s = String(row || "");
  if (!/^TROP\b/i.test(s.trim())) return [];
  var out = [];
  var re = /\bTnI(\d?)\s+([\d.]+\*?)/gi;
  var m;
  while (m = re.exec(s)) {
    out.push({ display: m[2], raw: parseTnINum_(m[2]) });
  }
  return out;
}
function mergeTroponinaResLabRows_(rows) {
  var tokens = [];
  (rows || []).forEach(function(row) {
    parseTnIDisplayTokensFromResLabRow_(row).forEach(function(tok) {
      tokens.push(tok);
    });
  });
  if (!tokens.length) return "";
  if (tokens.length === 1) return "TROP	TnI " + tokens[0].display;
  return buildTroponinaResLabLine_([tokens[0], tokens[tokens.length - 1]]);
}
function normalizeTropTrendFields_(row) {
  if (!row || typeof row !== "object") return row;
  if (row.TnI != null && row.TnI1 == null) row.TnI1 = row.TnI;
  delete row.TnI;
  delete row["\u0394%"];
  delete row.dTnI;
  return row;
}
function parseTroponina_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("TROPONINA") === -1 && tUp.indexOf("HSTNL") === -1 && tUp.indexOf("HS TNL") === -1) {
    return "";
  }
  var hits = extractAllTroponinaFromText_(textoBruto);
  if (!hits.length) return "";
  var values = hits.map(function(hit) {
    var refs = troponinaRefsFromHit_(hit);
    return {
      display: formatTnIDisplay_(hit.valor, hit.qual, refs.min, refs.max),
      raw: parseFloat(String(hit.valor).replace(",", "."))
    };
  });
  if (values.length === 1) {
    return buildTroponinaResLabLine_(values);
  }
  return buildTroponinaResLabLine_([values[0], values[values.length - 1]]);
}

// public/js/labs-egfr.mjs
function normalizePatientSexoForEgfr(sexo) {
  var s = String(sexo == null ? "" : sexo).trim().toUpperCase();
  if (!s) return "";
  if (s === "F" || s === "FEMENINO" || s === "MUJER" || s === "FEMALE") return "F";
  if (s === "M" || s === "MASCULINO" || s === "HOMBRE" || s === "MALE") return "M";
  return "";
}
function patientEdadPartsForEgfr(patient) {
  if (!patient) return { edadRaw: "", edadUnidad: "a\xF1os" };
  var raw = String(patient.edad == null ? "" : patient.edad).trim();
  if (!raw) return { edadRaw: "", edadUnidad: "a\xF1os" };
  var m = raw.match(/^(\d+)\s*(años|meses|días|dias|semanas)?/i);
  if (!m) {
    var n = parseInt(raw, 10);
    return { edadRaw: isFinite(n) ? String(n) : "", edadUnidad: "a\xF1os" };
  }
  var unit = (m[2] || "a\xF1os").toLowerCase();
  if (unit === "dias") unit = "d\xEDas";
  return { edadRaw: m[1], edadUnidad: unit };
}
function buildEgfrPatientCtx(hdrEdadRaw, hdrEdadUnidad, chartPatient) {
  if (!chartPatient) return null;
  var sexo = normalizePatientSexoForEgfr(chartPatient.sexo);
  if (!sexo) return null;
  var edadParts = patientEdadPartsForEgfr(chartPatient);
  return {
    edad: edadParts.edadRaw || hdrEdadRaw || "",
    edadUnidad: edadParts.edadRaw ? edadParts.edadUnidad : hdrEdadUnidad || "a\xF1os",
    sexo
  };
}
function ageYearsFromLabDemographics(edadRaw, edadUnidad) {
  var n = parseInt(String(edadRaw == null ? "" : edadRaw).trim(), 10);
  if (!isFinite(n) || n < 0) return null;
  var u = String(edadUnidad || "a\xF1os").toLowerCase();
  if (u === "meses") return n / 12;
  if (u === "d\xEDas" || u === "dias") return n / 365.25;
  if (u === "semanas") return n / 52.143;
  return n;
}
function computeEgfrCkdEpi2021Creatinine(scrMgDl, ageYears, isFemale) {
  var scr = typeof scrMgDl === "number" ? scrMgDl : parseFloat(String(scrMgDl || "").replace(/,/g, "."));
  if (!isFinite(scr) || scr <= 0) return null;
  var age = Number(ageYears);
  if (!isFinite(age) || age < 18 || age > 120) return null;
  var k = isFemale ? 0.7 : 0.9;
  var alpha = isFemale ? -0.241 : -0.302;
  var scrK = scr / k;
  var minTerm = Math.min(scrK, 1);
  var maxTerm = Math.max(scrK, 1);
  var egfr = 142 * Math.pow(minTerm, alpha) * Math.pow(maxTerm, -1.2) * Math.pow(0.9938, age) * (isFemale ? 1.012 : 1);
  if (!isFinite(egfr) || egfr <= 0) return null;
  return egfr;
}

// public/js/labs-anion-gap.mjs
function parseLabNum_(str) {
  if (str === "---" || str == null || str === "") return null;
  var n = parseFloat(String(str).replace(",", "."));
  return isNaN(n) ? null : n;
}
function formatAgToken_(ag) {
  if (ag == null || !isFinite(ag)) return "---";
  var rounded = Math.round((ag + Number.EPSILON) * 10) / 10;
  var agStr = rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
  return marcarSegunRango(agStr, 8, 12);
}
function formatPlainToken_(n) {
  if (n == null || !isFinite(n)) return "---";
  var rounded = Math.round((n + Number.EPSILON) * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function computeAnionGapValue_(naStr, clStr, hco3Str) {
  var na = parseLabNum_(naStr);
  var cl = parseLabNum_(clStr);
  var hco3 = parseLabNum_(hco3Str);
  if (na == null || cl == null || hco3 == null) return null;
  return na - (cl + hco3);
}
function computeAlbuminCorrectedAnionGapValue_(naStr, clStr, hco3Str, albStr) {
  var ag = computeAnionGapValue_(naStr, clStr, hco3Str);
  if (ag == null) return null;
  var alb = parseLabNum_(albStr);
  if (alb == null) return null;
  return ag + 2.5 * (4 - alb);
}
function computeUrinaryAnionGapValue_(naUStr, kUStr, clUStr) {
  var na = parseLabNum_(naUStr);
  var k = parseLabNum_(kUStr);
  var cl = parseLabNum_(clUStr);
  if (na == null || k == null || cl == null) return null;
  return na + k - cl;
}
function computeAnionGap_(naStr, clStr, hco3Str) {
  return formatAgToken_(computeAnionGapValue_(naStr, clStr, hco3Str));
}
function computeAlbuminCorrectedAnionGap_(naStr, clStr, hco3Str, albStr) {
  return formatAgToken_(computeAlbuminCorrectedAnionGapValue_(naStr, clStr, hco3Str, albStr));
}
function computeUrinaryAnionGap_(naUStr, kUStr, clUStr) {
  return formatPlainToken_(computeUrinaryAnionGapValue_(naUStr, kUStr, clUStr));
}
function extractUrineElectrolytes_(texto) {
  if (!texto) return { na: "---", k: "---", cl: "---" };
  var na = extraerConRango(["SODIO EN ORINA", "SODIO URINARIO"], texto);
  var k = extraerConRango(["POTASIO EN ORINA", "POTASIO URINARIO"], texto);
  var cl = extraerConRango(["CLORO EN ORINA", "CLORO URINARIO"], texto);
  return { na: na.valor, k: k.valor, cl: cl.valor };
}
function resolveEffectiveAnionGapValue_(naStr, clStr, hco3Str, albStr) {
  var agc = computeAlbuminCorrectedAnionGapValue_(naStr, clStr, hco3Str, albStr);
  if (agc != null) return agc;
  return computeAnionGapValue_(naStr, clStr, hco3Str);
}

// public/js/labs-fluid-interpret-values.mjs
function parseFluidLeu_(raw) {
  var c = String(raw || "").replace(/\*/g, "").trim();
  if (!c) return null;
  if (/^\d{1,3},\d{3}$/.test(c)) c = c.replace(",", "");
  else c = c.replace(",", ".");
  return toNum_(c);
}
function parsePmnField_(raw, leuNum) {
  var empty = { pmnNum: null, pmnPct: null, predominant: false };
  if (!raw) return empty;
  var s = String(raw).replace(/\*/g, "").trim().toUpperCase();
  if (/PREDOMIN/i.test(s)) return { pmnNum: null, pmnPct: null, predominant: true };
  var pctMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
  if (!pctMatch) return empty;
  var n = toNum_(pctMatch[1]);
  if (n == null) return empty;
  if (/%/.test(s) || n <= 100 && leuNum != null) {
    return {
      pmnNum: leuNum != null ? Math.round(leuNum * n / 100) : null,
      pmnPct: n,
      predominant: n >= 50
    };
  }
  return { pmnNum: n, pmnPct: null, predominant: true };
}
function isGramNegative_(raw) {
  return /\bNEGAT/i.test(String(raw || ""));
}
function gramIsPositive_(raw) {
  var s = String(raw || "").trim();
  if (!s || isGramNegative_(s)) return false;
  return /\b(POSITIV|COCC|BACIL|POLIMORFONUCLE|ABUNDANT)/i.test(s);
}
function parseLcrProteinMgdl_(raw) {
  var s = String(raw || "").replace(/\*/g, "").trim();
  if (!s) return null;
  var m = s.match(/^(\d+(?:[.,]\d+)?)/);
  return m ? toNum_(m[1]) : null;
}

// public/js/labs-lcr-scan.mjs
function isLcrFieldLabel_(txt) {
  return /^(RECUENTO(?:\s+CELULAR)?|LEUCOCITOS(?:\s+POLIMORFONUCLEARES|\s*\/\s*MM3?)?|POLIMORFONUCLEARES|LINFOCITOS|%PMN|%LINFOCITOS|GLUCOSA|PROTEINAS|CLORURO|GRAM|TINTA(?:\s+CHINA)?|ERITROCITOS|COAGLUTIN(?:ACION)?|PH\b|ASPECTO|OTROS|LCR|ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|COMENTARIOS?)$/i.test(
    txt
  );
}
function scanNumericAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var raw = lineas[j].replace(/\*/g, "").trim();
    if (!raw) continue;
    if (isLcrFieldLabel_(raw)) break;
    var m = raw.match(/^(\d+(?:[.,]\d+)?)/);
    if (m) return m[1].replace(",", ".");
  }
  return "";
}
function scanTextAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var txt = lineas[j].replace(/\*/g, "").trim();
    if (!txt) continue;
    if (/ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA/i.test(txt)) continue;
    if (isLcrFieldLabel_(txt)) break;
    if (/^\d+(?:[.,]\d+)?$/.test(txt)) break;
    if (/^---+$/.test(txt)) return "";
    return txt.toUpperCase();
  }
  return "";
}
function scanLeucocitos_(lineas, i) {
  for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
    var raw = lineas[j].replace(/\*/g, "").trim();
    if (!raw) continue;
    if (isLcrFieldLabel_(raw)) break;
    if (/^---+$/.test(raw)) return "0";
    var m = raw.match(/^(\d+(?:[.,]\d+)?)\s*$/);
    if (m) return m[1].replace(",", ".");
  }
  return "";
}
function scanProteinas_(lineas, i, lin) {
  var mL = lin.match(/PROTEINAS\s*([A-Z])\s*$/i);
  var letra = mL ? mL[1].toUpperCase() : "";
  var val = scanNumericAfter_(lineas, i, 4);
  return val ? val + letra : "";
}
function emptyLcrFields_() {
  return { pH: "", aspecto: "", leu: "", glu: "", prot: "", cl: "", gram: "", tinta: "" };
}
function scanLcrLine_(fields, lineas, i, linUp, lin) {
  if (linUp.indexOf("PH") === 0) fields.pH = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf("ASPECTO") === 0) fields.aspecto = scanTextAfter_(lineas, i, 4);
  if (linUp.indexOf("RECUENTO CELULAR") === 0 || linUp.indexOf("LEUCOCITOS") === 0) {
    var leuVal = scanLeucocitos_(lineas, i);
    if (leuVal !== "") fields.leu = leuVal;
  }
  if (linUp.indexOf("GLUCOSA") === 0) fields.glu = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf("PROTEINAS") === 0) fields.prot = scanProteinas_(lineas, i, lin);
  if (linUp.indexOf("CLORURO") === 0) fields.cl = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf("GRAM") === 0) fields.gram = scanTextAfter_(lineas, i, 4);
  if (linUp.indexOf("TINTA CHINA") === 0) fields.tinta = scanTextAfter_(lineas, i, 4);
}
function isInvalidLcrTextField_(val) {
  if (val === "" || val == null) return true;
  var s = String(val).toUpperCase().trim();
  if (/^---+$/.test(s)) return true;
  return isLcrFieldLabel_(s);
}
function lcrFieldsEmpty_(fields) {
  return !(fields.aspecto || fields.leu !== "" || fields.glu || fields.prot || fields.cl || fields.gram || fields.tinta || fields.pH);
}
function buildLcrLine_(fields) {
  var p = ["LCR:"];
  if (fields.pH) p.push("pH", fields.pH);
  if (fields.aspecto) p.push("Asp", fields.aspecto);
  if (fields.leu !== "") p.push("Leu", fields.leu);
  if (fields.glu) p.push("Glu", fields.glu);
  if (fields.prot) p.push("Prot", fields.prot);
  if (fields.cl) p.push("Cl", fields.cl);
  if (fields.gram) p.push("Gram", fields.gram);
  if (fields.tinta) p.push("Tinta", fields.tinta);
  return p[0] + "	" + p.slice(1).join(" ");
}

// public/js/labs-lcr-parse.mjs
function collectLcrBlocks_(textoBruto) {
  var t = String(textoBruto || "");
  var blocks = [];
  var mChem = t.match(/CITOQUIMICO\s+DE\s+LCR[\s\S]*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i);
  if (mChem) blocks.push(mChem[0]);
  var mMicro = t.match(/CITOQUIMICO\s+LIQ\.?\s+LCR[\s\S]*?(?=CUADERNILLO|$)/i);
  if (mMicro) {
    var micro = mMicro[0];
    var dup = blocks.some(function(b) {
      return b === micro;
    });
    if (!dup) blocks.push(micro);
  }
  return blocks;
}
function lcrBlocksNormText_(textoBruto) {
  return collectLcrBlocks_(textoBruto).map(function(b) {
    return b.replace(/\r/g, "").replace(/\s+/g, " ");
  });
}
function parseLcrFieldsFromBlock_(bloque) {
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.trim();
  });
  var fields = emptyLcrFields_();
  for (var i = 0; i < lineas.length; i++) {
    scanLcrLine_(fields, lineas, i, lineas[i].toUpperCase(), lineas[i]);
  }
  return fields;
}
function mergeLcrScalar_(accVal, nextVal) {
  if (nextVal === "" || nextVal == null) return accVal;
  if (accVal === "" || accVal == null) return nextVal;
  return accVal;
}
function mergeLcrText_(accVal, nextVal) {
  if (nextVal === "" || nextVal == null) return accVal;
  if (accVal === "" || accVal == null || isInvalidLcrTextField_(accVal)) return nextVal;
  return accVal;
}
function mergeLcrLeu_(accVal, nextVal) {
  if (nextVal === "" || nextVal == null) return accVal;
  if (accVal === "" || accVal == null) return nextVal;
  return accVal;
}
function mergeLcrFields_(blocks) {
  var merged = emptyLcrFields_();
  for (var b = 0; b < blocks.length; b++) {
    var next = parseLcrFieldsFromBlock_(blocks[b]);
    merged.pH = mergeLcrScalar_(merged.pH, next.pH);
    merged.aspecto = mergeLcrText_(merged.aspecto, next.aspecto);
    merged.leu = mergeLcrLeu_(merged.leu, next.leu);
    merged.glu = mergeLcrScalar_(merged.glu, next.glu);
    merged.prot = mergeLcrScalar_(merged.prot, next.prot);
    merged.cl = mergeLcrScalar_(merged.cl, next.cl);
    merged.gram = mergeLcrText_(merged.gram, next.gram);
    merged.tinta = mergeLcrText_(merged.tinta, next.tinta);
  }
  return merged;
}
function fieldsToLcrParsed_(fields) {
  if (lcrFieldsEmpty_(fields)) return null;
  return {
    line: buildLcrLine_(fields),
    pH: toNum_(fields.pH),
    aspecto: fields.aspecto || "",
    leu: fields.leu === "" ? null : parseFluidLeu_(fields.leu),
    glu: toNum_(fields.glu),
    protMgdl: parseLcrProteinMgdl_(fields.prot),
    cl: toNum_(fields.cl),
    gram: fields.gram || "",
    tinta: fields.tinta || ""
  };
}
function parseLcrParsed(textoBruto) {
  var blocks = collectLcrBlocks_(textoBruto);
  if (!blocks.length) return null;
  return fieldsToLcrParsed_(mergeLcrFields_(blocks));
}
function parsearLCR(textoBruto) {
  var parsed = parseLcrParsed(textoBruto);
  return parsed && parsed.line ? parsed.line : "";
}

// public/js/labs-gaso-section.mjs
function gasoBlockForExtract_(bloqueGaso) {
  return String(bloqueGaso || "").replace(/\r/g, "").replace(/\s+/g, " ");
}
function extractGasoPh_(bloqueX) {
  var phData = extraerConRango(["PH "], bloqueX);
  if (phData.valor === "---") phData = extraerConRango(["PH"], bloqueX);
  return phData;
}
function fmtGasoRanged_(data, fieldKey, gasRefs) {
  return fmtLabRanged_(data, fieldKey, gasRefs, DEFAULT_GASO_REFS);
}
function extractGasoFormatted_(bloqueX, textoFuera, gasRefs) {
  var phData = extractGasoPh_(bloqueX);
  var hco3Data = extraerConRango(["HCO3"], bloqueX);
  var naAG = textoFuera ? extraerConRangoSuero(["SODIO"], textoFuera) : { valor: "---" };
  var clAG = textoFuera ? extraerConRangoSuero(["CLORO"], textoFuera) : { valor: "---" };
  var albAG = textoFuera ? extraerConRangoSuero(["ALBUMINA"], textoFuera) : { valor: "---" };
  var urine = textoFuera ? extractUrineElectrolytes_(textoFuera) : { na: "---", k: "---", cl: "---" };
  var iCaData = extraerConRango(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], bloqueX);
  var agEff = resolveEffectiveAnionGapValue_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  return {
    phData,
    pH: fmtGasoRanged_(phData, "pH", gasRefs),
    pCO2: fmtGasoRanged_(extraerConRango(["PCO2"], bloqueX), "pCO2", gasRefs),
    pO2: fmtGasoRanged_(extraerConRango(["PO2 "], bloqueX), "pO2", gasRefs),
    Na: fmtGasoRanged_(extraerConRango(["SODIO"], bloqueX), "Na", gasRefs),
    K: fmtGasoRanged_(extraerConRango(["POTASIO"], bloqueX), "K", gasRefs),
    GLU: fmtGasoRanged_(extraerConRango(["GLUCOSA"], bloqueX), "GLU", gasRefs),
    Lac: fmtGasoRanged_(extraerConRango(["LACTATO"], bloqueX), "Lactato", gasRefs),
    Bica: fmtGasoRanged_(hco3Data, "Bica", gasRefs),
    Hto: fmtGasoRanged_(extraerConRango(["HCT ", "HEMATOCRITO"], bloqueX), "Hto", gasRefs),
    iCa: fmtGasoRanged_(iCaData, "iCa", gasRefs),
    AG: computeAnionGap_(naAG.valor, clAG.valor, hco3Data.valor),
    AGc: computeAlbuminCorrectedAnionGap_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor),
    UAG: computeUrinaryAnionGap_(urine.na, urine.k, urine.cl),
    DD: computeDeltaDelta_(agEff, hco3Data.valor)
  };
}
function appendGasoPair_(p, key, val) {
  if (val !== "---") p.push(key, val);
}
function buildGasoLine_(g) {
  var p = ["GASES"];
  appendGasoPair_(p, "pH", g.pH);
  appendGasoPair_(p, "pCO2", g.pCO2);
  appendGasoPair_(p, "pO2", g.pO2);
  appendGasoPair_(p, "Na", g.Na);
  appendGasoPair_(p, "K", g.K);
  appendGasoPair_(p, "GLU", g.GLU);
  appendGasoPair_(p, "Lactato", g.Lac);
  appendGasoPair_(p, "Bica", g.Bica);
  appendGasoPair_(p, "AG", g.AG);
  appendGasoPair_(p, "AGc", g.AGc);
  appendGasoPair_(p, "UAG", g.UAG);
  appendGasoPair_(p, "Delta-Delta", g.DD);
  appendGasoPair_(p, "Hto", g.Hto);
  appendGasoPair_(p, "iCa", g.iCa);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseGaso_(bloqueGaso, textoFuera, gasRefs) {
  if (!bloqueGaso) return "";
  var bloqueX = gasoBlockForExtract_(bloqueGaso);
  var g = extractGasoFormatted_(bloqueX, textoFuera, gasRefs);
  if (g.phData.valor === "---") return "";
  return buildGasoLine_(g);
}
function labSectionKey_(line) {
  var s = String(line == null ? "" : line).trim();
  if (!s) return "";
  var tab = s.indexOf("	");
  if (tab >= 0) return s.substring(0, tab).trim().toUpperCase();
  var colon = s.indexOf(":");
  if (colon > 0) return s.substring(0, colon + 1).trim().toUpperCase();
  var m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b/);
  return m ? m[1].toUpperCase() : s.toUpperCase();
}
function lineRichnessScore_(line) {
  var s = normalizeLabLine_(line);
  if (!s) return 0;
  var score = s.length;
  score += (s.match(/\b(?:AG|AGC|UAG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  return score;
}
function normalizeGasometryInterpretationLine_(line) {
  var s = String(line == null ? "" : line);
  return /^Interpretación gasometría:/i.test(s.trim()) ? s.toUpperCase() : s;
}
function normalizeLabLine_(line) {
  return normalizeGasometryInterpretationLine_(line).replace(/\s+/g, " ").trim();
}
function labRowText_(row) {
  if (row && typeof row === "object" && typeof row.visible === "string") return row.visible;
  return String(row == null ? "" : row);
}
function dedupeSingletonSections_(rows) {
  var singleton = {
    BH: 1,
    QS: 1,
    ESC: 1,
    PFHS: 1,
    LIPASA: 1,
    TROP: 1,
    GASES: 1,
    PIE: 1,
    "LCR:": 1,
    "LIQ:": 1,
    HECES: 1,
    FROTIS: 1,
    EGO: 1,
    SEROL: 1,
    GS: 1,
    PROT12H: 1,
    PROT24H: 1,
    "INTERPRETACI\xD3N GASOMETR\xCDA:": 1,
    "INTERPRETACI\xD3N ASCITIS:": 1,
    "INTERPRETACI\xD3N CITOQU\xCDMICO:": 1,
    TIR: 1,
    ENDO: 1,
    CARD: 1,
    FE: 1,
    INFL: 1,
    INM: 1,
    META: 1,
    NEF: 1,
    NIVEL: 1,
    TM: 1,
    NUT: 1,
    GI: 1,
    TOX: 1,
    HEPB: 1,
    VIRAL: 1,
    FEB: 1,
    MICRO: 1
  };
  var list = (rows || []).filter(function(r) {
    return normalizeLabLine_(labRowText_(r)) !== "";
  });
  var best = /* @__PURE__ */ Object.create(null);
  var keep = [];
  for (var i = 0; i < list.length; i++) {
    var raw = list[i];
    var rowText = labRowText_(raw);
    var key = labSectionKey_(rowText);
    if (!singleton[key]) {
      keep.push(raw);
      continue;
    }
    var cand = { row: raw, idx: i, score: lineRichnessScore_(rowText) };
    var prev = best[key];
    if (!prev || cand.score > prev.score || cand.score === prev.score && cand.idx > prev.idx) {
      best[key] = cand;
    }
  }
  var chosen = /* @__PURE__ */ Object.create(null);
  Object.keys(best).forEach(function(k2) {
    chosen[best[k2].idx] = best[k2].row;
  });
  var out = [];
  for (var j = 0; j < list.length; j++) {
    var rowRaw = list[j];
    var rText = labRowText_(rowRaw);
    var k = labSectionKey_(rText);
    if (!singleton[k]) out.push(rowRaw);
    else if (chosen[j]) out.push(chosen[j]);
  }
  return out;
}
function valueFromSectionLine_(line, key) {
  var s = normalizeLabLine_(line);
  if (!s) return null;
  var m = s.match(
    new RegExp(
      "(?:^|\\s)" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+(-?\\d+(?:\\.\\d+)?)(\\*)?",
      "i"
    )
  );
  return m ? m[1] + (m[2] || "") : null;
}
function markGasoToken_(valStr, gasRefs, fieldKey) {
  if (valStr == null || valStr === "") return valStr;
  var bare = String(valStr).replace(/\*$/, "");
  var range = resolveLabFieldRange_(
    { valor: bare, min: null, max: null },
    fieldKey,
    gasRefs,
    DEFAULT_GASO_REFS
  );
  if (range) return fmt(marcarSegunRango(bare, range[0], range[1]));
  var starred = String(valStr).endsWith("*");
  return fmt(starred ? bare + "*" : bare);
}
function pickBestSectionLine_(rows, sectionName) {
  var sec = String(sectionName || "").toUpperCase();
  var best = null;
  (rows || []).forEach(function(row, idx) {
    if (labSectionKey_(row) !== sec) return;
    var cand = { row: String(row), idx, score: lineRichnessScore_(row) };
    if (!best || cand.score > best.score || cand.score === best.score && cand.idx > best.idx) best = cand;
  });
  return best ? best.row : "";
}
function formatNumericToken_(n) {
  if (n == null || !isFinite(n)) return "";
  var rounded = Math.round((n + Number.EPSILON) * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function appendMarkedAgToken_(out, key, value) {
  if (value == null) return;
  out.push(key, marcarSegunRango(formatNumericToken_(value), 8, 12));
}
function appendAnionGapDerivedTokens_(out, base, na, cl, bica, alb) {
  var agRaw = computeAnionGapValue_(na || "---", cl || "---", bica || "---");
  appendMarkedAgToken_(out, "AG", agRaw);
  var agc = computeAlbuminCorrectedAnionGapValue_(
    na || "---",
    cl || "---",
    bica || "---",
    alb || "---"
  );
  appendMarkedAgToken_(out, "AGc", agc);
  var uagExisting = valueFromSectionLine_(base, "UAG");
  if (uagExisting != null && uagExisting !== "") {
    out.push("UAG", String(uagExisting).replace(/\*$/, ""));
  }
  var ddv = computeDeltaDeltaValue_(agc != null ? agc : agRaw, bica || "---");
  if (ddv != null) out.push("Delta-Delta", formatNumericToken_(ddv));
}
function rebuildGasesFromResults_(rows, gasRefs) {
  var gases = pickBestSectionLine_(rows, "GASES");
  if (!gases) return { gasesLine: "", interpLine: "" };
  var base = normalizeLabLine_(gases);
  var out = ["GASES"];
  var orderedKeys = ["pH", "pCO2", "pO2", "Na", "K", "GLU", "Lactato", "Bica", "Hto", "iCa"];
  var values = {};
  orderedKeys.forEach(function(k) {
    values[k] = valueFromSectionLine_(base, k);
  });
  var qs = pickBestSectionLine_(rows, "QS");
  var esc = pickBestSectionLine_(rows, "ESC");
  var pfhs = pickBestSectionLine_(rows, "PFHS");
  var na = valueFromSectionLine_(qs, "Na") || valueFromSectionLine_(esc, "Na") || values.Na;
  var cl = valueFromSectionLine_(qs, "Cl") || valueFromSectionLine_(esc, "Cl");
  var alb = valueFromSectionLine_(pfhs, "Alb");
  orderedKeys.forEach(function(k) {
    if (values[k] != null && values[k] !== "") {
      out.push(k, markGasoToken_(values[k], gasRefs, k));
    }
  });
  appendAnionGapDerivedTokens_(out, base, na, cl, values.Bica, alb);
  return { gasesLine: out[0] + "	" + out.slice(1).join(" "), interpLine: "" };
}
function reprocessLabResultLines_(rows, opts) {
  var gasRefs = opts && opts.gasRefs;
  var clean = dedupeSingletonSections_(rows || []);
  var rebuilt = rebuildGasesFromResults_(clean, gasRefs);
  var out = clean.filter(function(r) {
    var k = labSectionKey_(r);
    return k !== "GASES" && k !== "INTERPRETACI\xD3N GASOMETR\xCDA:";
  });
  if (rebuilt.gasesLine) out.push(rebuilt.gasesLine);
  if (rebuilt.interpLine) out.push(rebuilt.interpLine);
  return dedupeSingletonSections_(out);
}
function computeDeltaDeltaValue_(agValue, hco3Str) {
  if (agValue == null) return null;
  var hco3 = parseFloat(String(hco3Str).replace(",", "."));
  if (isNaN(hco3)) return null;
  var deltaHco3 = 24 - hco3;
  if (deltaHco3 <= 0) return null;
  return (agValue - 12) / deltaHco3;
}
function computeDeltaDelta_(agValue, hco3Str) {
  var dd = computeDeltaDeltaValue_(agValue, hco3Str);
  if (dd == null) return "---";
  var rounded = Math.round(dd * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function parsePIE_(tNorm) {
  var hasPIEInmuno = /PRUEBA INMUNOLOGICA DE EMBARAZO/i.test(tNorm);
  var hasPrueba = /PRUEBA DE EMBARAZO/i.test(tNorm);
  if (!hasPIEInmuno && !hasPrueba) return "";
  if (hasPIEInmuno) {
    var idx = tNorm.toUpperCase().indexOf("PRUEBA INMUNOLOGICA DE EMBARAZO");
    var sub = tNorm.substring(idx, idx + 400);
    var subUp = sub.toUpperCase();
    var sueroIdx = subUp.indexOf("SUERO");
    var m = null;
    if (sueroIdx !== -1) {
      m = sub.substring(sueroIdx, sueroIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    if (!m) {
      var orinaIdx = subUp.indexOf("ORINA");
      if (orinaIdx !== -1) m = sub.substring(orinaIdx, orinaIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    if (!m) return "";
    return "PIE	" + m[1].toUpperCase() + "*";
  }
  var idxPie = tNorm.toUpperCase().indexOf("PRUEBA DE EMBARAZO");
  var subPie = tNorm.substring(idxPie, idxPie + 300);
  var mPie = subPie.match(/\b(NEGATIVO|POSITIVO)\b/i);
  if (!mPie) return "";
  return "PIE	" + mPie[1].toUpperCase() + "*";
}

// public/js/labs-bh.mjs
var BH_EXTRA_DISPLAY_LABELS = {
  RBC: "Eri",
  CHCM: "CHCM",
  RDW: "RDW",
  MPV: "VPM",
  Ret: "Ret",
  Lin: "Lin#",
  Mono: "Mono#",
  Baso: "Baso#",
  NeuPct: "Seg",
  LinPct: "Lin",
  MonoPct: "Mono",
  EosPct: "Eos",
  BasoPct: "Baso",
  Bandas: "Band",
  Mielo: "Mielo",
  Metamielo: "Meta",
  Promielo: "Prom",
  Blastos: "Blast",
  Atipicos: "Atip"
};
var BH_DIFF_DISPLAY_ORDER = [
  "NeuPct",
  "LinPct",
  "MonoPct",
  "EosPct",
  "BasoPct",
  "Bandas",
  "Mielo",
  "Metamielo",
  "Promielo",
  "Blastos",
  "Atipicos"
];
var BH_SCALAR_EXT_ORDER = ["RBC", "CHCM", "RDW", "MPV", "Ret", "Lin", "Mono", "Baso"];
var BH_SOME_TREND_ORDER = [
  "RBC",
  "Hb",
  "Hto",
  "VCM",
  "HCM",
  "CHCM",
  "RDW",
  "Leu",
  "Neu",
  "NeuPct",
  "Lin",
  "LinPct",
  "Mono",
  "MonoPct",
  "Eos",
  "EosPct",
  "Baso",
  "BasoPct",
  "Plt",
  "MPV",
  "Ret",
  "TP",
  "TTP",
  "INR",
  "Fib",
  "DD",
  "Bandas",
  "Mielo",
  "Metamielo",
  "Promielo",
  "Blastos",
  "Atipicos"
];
var QS_SOME_TREND_ORDER = [
  "Glu",
  "BUN",
  "Cr",
  "eTFG",
  "AU",
  "PCR",
  "PCT",
  "COL",
  "HDL",
  "LDL",
  "VLDL",
  "TGL",
  "IA",
  "CTHDL",
  "VSG",
  "CPK"
];
function sortTrendSpecsBySomeOrder(sectionKey, specs) {
  var order = sectionKey === "BH" ? BH_SOME_TREND_ORDER : sectionKey === "QS" ? QS_SOME_TREND_ORDER : null;
  if (!order) return (specs || []).slice();
  var rank = /* @__PURE__ */ Object.create(null);
  order.forEach(function(fk, i) {
    rank[fk] = i;
  });
  return (specs || []).slice().sort(function(a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a.fieldKey) ? rank[a.fieldKey] : 9999;
    var rb = Object.prototype.hasOwnProperty.call(rank, b.fieldKey) ? rank[b.fieldKey] : 9999;
    if (ra !== rb) return ra - rb;
    return String(a.cardTitle || a.fieldKey).localeCompare(String(b.cardTitle || b.fieldKey), "es");
  });
}
var BH_DIFF_RANGE_LABELS = {
  NeuPct: ["SEGMENTADOS", "NEU%", "NEUTROFILOS%"],
  LinPct: ["LINFOCITOS", "LYM%", "LINFOCITOS%"],
  MonoPct: ["MONOCITOS", "MONO%"],
  EosPct: ["EOSINOFILOS", "EOS%"],
  BasoPct: ["BASOFILOS", "BASO%"],
  Bandas: ["BANDAS", "CAYADOS"],
  Mielo: ["MIELOCITOS"],
  Metamielo: ["METAMIELOCITOS"],
  Promielo: ["PROMIELOCITOS"],
  Blastos: ["BLASTOS"],
  Atipicos: ["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"]
};
function bhExtraDisplayLabel(key) {
  return BH_EXTRA_DISPLAY_LABELS[key] || key;
}
var BH_TREND_TITLES = {
  NeuPct: "Segmentados",
  LinPct: "Linfocitos",
  MonoPct: "Monocitos",
  EosPct: "Eosin\xF3filos",
  BasoPct: "Bas\xF3filos",
  Bandas: "Bandas",
  Mielo: "Mielocitos",
  Metamielo: "Metamielocitos",
  Promielo: "Promielocitos",
  Blastos: "Blastos",
  Atipicos: "Linf. at\xEDpicos"
};
function bhTrendDisplayTitle(fieldKey) {
  return BH_TREND_TITLES[fieldKey] || bhExtraDisplayLabel(fieldKey) || fieldKey;
}
var BH_OUTPUT_LABEL_TO_FIELD = {
  Seg: "NeuPct",
  Lin: "LinPct",
  Mono: "MonoPct",
  Eos: "EosPct",
  Baso: "BasoPct",
  Band: "Bandas",
  Meta: "Metamielo",
  Mielo: "Mielo",
  Prom: "Promielo",
  Blast: "Blastos",
  Atip: "Atipicos",
  NeuPct: "NeuPct",
  LinPct: "LinPct",
  MonoPct: "MonoPct",
  EosPct: "EosPct",
  BasoPct: "BasoPct",
  Bandas: "Bandas",
  Metamielo: "Metamielo",
  Promielo: "Promielo",
  Blastos: "Blastos",
  Atipicos: "Atipicos",
  Hb: "Hb",
  Hto: "Hto",
  VCM: "VCM",
  HCM: "HCM",
  Leu: "Leu",
  Neu: "Neu",
  Plt: "Plt",
  RBC: "RBC",
  Eri: "RBC",
  CHCM: "CHCM",
  RDW: "RDW",
  VPM: "MPV",
  MPV: "MPV",
  Ret: "Ret",
  TP: "TP",
  TTP: "TTP",
  INR: "INR",
  Fib: "Fib",
  DD: "DD"
};
function bhFieldKeyFromOutputLabel(label) {
  return BH_OUTPUT_LABEL_TO_FIELD[label] || label;
}
function parseBhTokenPairs_(text, into) {
  if (!text) return;
  var tokens = String(text).trim().split(/\s+/);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    if (!label || label === "-") {
      i++;
      continue;
    }
    var next = tokens[i + 1];
    if (next == null) {
      i++;
      continue;
    }
    var m = next.match(/^(-?\d+(?:[.,]\d+)?)(?:%)?(\*)?$/);
    if (m) {
      var fk = bhFieldKeyFromOutputLabel(label);
      var val = m[1].replace(",", ".");
      into[fk] = { val, ab: next.indexOf("*") >= 0 };
      i += 2;
    } else {
      i++;
    }
  }
}
function parseBhTrendValuesFromResLab(entry) {
  var out = {};
  if (!entry) return out;
  var lines = String(entry).split(/\r?\n/);
  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    var tab = trimmed.indexOf("	");
    if (tab < 0) return;
    var head = trimmed.substring(0, tab).trim().replace(/:$/, "");
    var body = trimmed.substring(tab + 1).trim();
    if (/^BH$/i.test(head) || /^COAG$/i.test(head)) {
      parseBhTokenPairs_(body, out);
      return;
    }
    if (body) parseBhTokenPairs_(body, out);
  });
  return out;
}
function formatBhDiffPctDisplay_(key, rawVal, tNorm, priorRefs) {
  var label = bhExtraDisplayLabel(key);
  var val = String(rawVal);
  var labels = BH_DIFF_RANGE_LABELS[key];
  if (labels && tNorm) {
    var d = extraerConRangoBH(labels, tNorm);
    if (d.valor && d.valor !== "---") {
      val = fmtLabRanged_(d, key, priorRefs);
    }
  } else if (val && val !== "---") {
    val = fmtLabRanged_({ valor: val, min: null, max: null }, key, priorRefs);
  }
  if (val.endsWith("*")) return label + " " + val.slice(0, -1) + "%*";
  return label + " " + val + "%";
}
function formatBhExtrasDisplayParts(bhExtras, sourceText) {
  if (!bhExtras || typeof bhExtras !== "object") return [];
  var tNorm = sourceText ? String(sourceText) : "";
  var parts = [];
  var seen = {};
  function addScalarKey(k) {
    if (seen[k]) return;
    var v = bhExtras[k];
    if (v == null || String(v).trim() === "") return;
    seen[k] = true;
    parts.push(bhExtraDisplayLabel(k) + " " + String(v));
  }
  BH_SCALAR_EXT_ORDER.forEach(addScalarKey);
  BH_DIFF_DISPLAY_ORDER.forEach(function(k) {
    if (seen[k] || !bhExtras[k]) return;
    seen[k] = true;
    parts.push(formatBhDiffPctDisplay_(k, bhExtras[k], tNorm));
  });
  Object.keys(bhExtras).forEach(function(k) {
    if (seen[k]) return;
    var v = bhExtras[k];
    if (v == null || String(v).trim() === "") return;
    seen[k] = true;
    if (BH_DIFF_DISPLAY_ORDER.indexOf(k) !== -1) {
      parts.push(formatBhDiffPctDisplay_(k, v, tNorm));
    } else {
      parts.push(bhExtraDisplayLabel(k) + " " + String(v));
    }
  });
  return parts;
}
function formatBhExtrasDisplayLine(bhExtras, sourceText) {
  var parts = formatBhExtrasDisplayParts(bhExtras, sourceText);
  if (!parts.length) return "";
  return "BH ext	" + parts.join("  ");
}
function pairListToDisplay_(pairs) {
  var out = [];
  for (var i = 0; i < pairs.length; i += 2) {
    if (pairs[i + 1] !== void 0) out.push(pairs[i] + " " + pairs[i + 1]);
  }
  return out.join("  ");
}
function formatCoagResLabLine_(coagDisplay) {
  if (!coagDisplay || !coagDisplay.length) return "";
  return "COAG	" + coagDisplay.join("  ");
}
function extractCoagBodyFromBhLine_(line) {
  var m = String(line || "").match(/^(?:COAG|Coag\.?)\t(.+)/i);
  return m ? m[1].trim() : "";
}
var COAG_FIELD_MERGE_ORDER_ = ["TP", "TTP", "INR", "Fib", "DD"];
function coagFieldMergeRank_(key) {
  var i = COAG_FIELD_MERGE_ORDER_.indexOf(key);
  return i === -1 ? 999 : i;
}
function mergeCoagResLabRows_(rows) {
  var coagByKey = /* @__PURE__ */ Object.create(null);
  (rows || []).forEach(function(row) {
    var body = extractCoagBodyFromBhLine_(row);
    if (!body) return;
    body.split(/\s{2,}/).forEach(function(tok) {
      var t = tok.trim();
      if (!t) return;
      var key = t.split(/\s+/)[0];
      var score = lineRichnessScore_(t);
      var prev = coagByKey[key];
      if (!prev || score > prev.score) coagByKey[key] = { tok: t, score };
    });
  });
  var keys = Object.keys(coagByKey);
  if (!keys.length) return "";
  keys.sort(function(a, b) {
    var ra = coagFieldMergeRank_(a);
    var rb = coagFieldMergeRank_(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  return formatCoagResLabLine_(
    keys.map(function(k) {
      return coagByKey[k].tok;
    })
  );
}
function extraerSimpleBh_(labels, texto) {
  if (!texto) return "";
  for (var li = 0; li < labels.length; li++) {
    var lbl = labels[li];
    var idx = -1;
    var up = String(texto).toUpperCase();
    var lu = lbl.toUpperCase();
    var from = 0;
    while (true) {
      var p = up.indexOf(lu, from);
      if (p === -1) break;
      var after = up.charAt(p + lu.length);
      var before = up.charAt(p - 1) || " ";
      var isWordBoundaryBefore = !/[A-Z0-9_]/.test(before);
      var isExactBoundary = lu.charAt(lu.length - 1) === "%" || !/[A-Z0-9]/.test(after);
      if (isWordBoundaryBefore && isExactBoundary) {
        idx = p + lu.length;
        break;
      }
      from = p + lu.length;
    }
    if (idx === -1) continue;
    var sub = texto.substring(idx, idx + 80);
    var m = sub.match(/(-?\d+[.,]?\d*)/);
    if (m) return m[1].replace(",", ".");
  }
  return "";
}
function fmtBhRanged_(data, fieldKey, priorRefs) {
  return fmtLabRanged_(data, fieldKey, priorRefs);
}
function extractBhScalarFields_(tNorm, priorRefs) {
  return {
    Hb: fmtBhRanged_(extraerConRango(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], tNorm), "Hb", priorRefs),
    Hto: fmtBhRanged_(extraerConRango(["HCT ", "HEMATOCRITO"], tNorm), "Hto", priorRefs),
    VCM: fmtBhRanged_(extraerConRango(["MCV ", "VCM "], tNorm), "VCM", priorRefs),
    HCM: fmtBhRanged_(extraerConRango(["MCH ", "HCM "], tNorm), "HCM", priorRefs),
    CHCM: fmtBhRanged_(extraerConRango(["MCHC", "CHCM"], tNorm), "CHCM", priorRefs),
    RDW: fmtBhRanged_(extraerConRango(["RDW "], tNorm), "RDW", priorRefs),
    Leu: fmtBhRanged_(extraerConRango(["WBC "], tNorm), "Leu", priorRefs),
    RBC: fmtBhRanged_(extraerConRangoBH(["RBC ", "ERITROCITOS", "HEMATIES"], tNorm), "RBC", priorRefs),
    Plt: fmtBhRanged_(extraerConRango(["PLT "], tNorm), "Plt", priorRefs),
    MPV: fmtBhRanged_(extraerConRango(["MPV ", "VPM "], tNorm), "MPV", priorRefs),
    Ret: fmtBhRanged_(extraerConRango(["RETICULOCITOS"], tNorm), "Ret", priorRefs),
    TP: fmtBhRanged_(extraerConRangoCoag(["TIEMPO DE PROTROMBINA"], tNorm), "TP", priorRefs),
    TTP: fmtBhRanged_(extraerConRangoCoag(["TIEMPO DE TROMBOPLASTINA"], tNorm), "TTP", priorRefs),
    INR: fmtBhRanged_(extraerConRangoCoag(["INR ", "INR"], tNorm), "INR", priorRefs),
    Fib: fmtBhRanged_(extraerConRangoCoag(["FIBRINOGENO", "FIBRIN\xD3GENO"], tNorm), "Fib", priorRefs),
    DD: fmtBhRanged_(extraerConRangoCoag(["DIMERO D", "D-DIMERO", "D DIMERO"], tNorm), "DD", priorRefs),
    Neu: fmtBhRanged_(extraerConRango(["NEU "], tNorm), "Neu", priorRefs),
    Eos: fmtBhRanged_(extraerConRango(["EOS "], tNorm), "Eos", priorRefs)
  };
}
function pushBhExtra_(extras, key, value) {
  if (value && value !== "---" && value !== "") extras[key] = String(value);
}
function buildBhExtras_(tNorm, Leu) {
  var extras = {};
  var linData = extraerConRango(["LYM ", "LINFOCITOS"], tNorm);
  var monoData = extraerConRango(["MONO "], tNorm);
  var basoData = extraerConRango(["BASO "], tNorm);
  if (Leu !== "---") {
    pushBhExtra_(extras, "Lin", linData.valor);
    pushBhExtra_(extras, "Mono", monoData.valor);
    pushBhExtra_(extras, "Baso", basoData.valor);
  }
  pushBhExtra_(extras, "NeuPct", extraerSimpleBh_(["NEU%", "NEUTROFILOS%", "SEGMENTADOS"], tNorm));
  pushBhExtra_(extras, "LinPct", extraerSimpleBh_(["LYM%", "LINFOCITOS%", "LINFOCITOS"], tNorm));
  pushBhExtra_(extras, "MonoPct", extraerSimpleBh_(["MONO%", "MONOCITOS%", "MONOCITOS"], tNorm));
  pushBhExtra_(extras, "EosPct", extraerSimpleBh_(["EOS%", "EOSINOFILOS%", "EOSINOFILOS"], tNorm));
  pushBhExtra_(extras, "BasoPct", extraerSimpleBh_(["BASO%", "BASOFILOS%", "BASOFILOS"], tNorm));
  pushBhExtra_(extras, "Bandas", extraerSimpleBh_(["BANDAS", "CAYADOS"], tNorm));
  pushBhExtra_(extras, "Mielo", extraerSimpleBh_(["MIELOCITOS"], tNorm));
  pushBhExtra_(extras, "Metamielo", extraerSimpleBh_(["METAMIELOCITOS"], tNorm));
  pushBhExtra_(extras, "Promielo", extraerSimpleBh_(["PROMIELOCITOS"], tNorm));
  pushBhExtra_(extras, "Blastos", extraerSimpleBh_(["BLASTOS"], tNorm));
  pushBhExtra_(
    extras,
    "Atipicos",
    extraerSimpleBh_(
      ["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"],
      tNorm
    )
  );
  return extras;
}
function buildBhCorePairs_(f) {
  var corePairs = [];
  if (f.Hb !== "---") corePairs.push("Hb", f.Hb);
  if (f.Hto !== "---") corePairs.push("Hto", f.Hto);
  if (f.VCM !== "---") corePairs.push("VCM", f.VCM);
  if (f.HCM !== "---") corePairs.push("HCM", f.HCM);
  if (f.Leu !== "---") corePairs.push("Leu", f.Leu);
  if (f.Neu !== "---") corePairs.push("Neu", f.Neu);
  if (f.Eos !== "---") corePairs.push("Eos", f.Eos);
  if (f.Plt !== "---") corePairs.push("Plt", f.Plt);
  return corePairs;
}
function buildBhCoagDisplay_(f) {
  var coagDisplay = [];
  if (f.TP !== "---") coagDisplay.push("TP " + f.TP);
  if (f.TTP !== "---") coagDisplay.push("TTP " + f.TTP);
  if (f.INR !== "---") coagDisplay.push("INR " + f.INR);
  if (f.Fib !== "---") coagDisplay.push("Fib " + f.Fib);
  if (f.DD !== "---") coagDisplay.push("DD " + f.DD);
  return coagDisplay;
}
function mergeBhIndexExtras_(extras, f) {
  if (f.RBC !== "---") pushBhExtra_(extras, "RBC", f.RBC);
  if (f.CHCM !== "---") pushBhExtra_(extras, "CHCM", f.CHCM);
  if (f.RDW !== "---") pushBhExtra_(extras, "RDW", f.RDW);
  if (f.MPV !== "---") pushBhExtra_(extras, "MPV", f.MPV);
  if (f.Ret !== "---") pushBhExtra_(extras, "Ret", f.Ret);
}
function buildBhDiffDisplay_(extras, tNorm, hasCompactBody, priorRefs) {
  if (hasCompactBody) return [];
  var diffDisplay = [];
  BH_DIFF_DISPLAY_ORDER.forEach(function(k) {
    var v = extras[k];
    if (!v || v === "0") return;
    diffDisplay.push(formatBhDiffPctDisplay_(k, v, tNorm, priorRefs));
  });
  return diffDisplay;
}
function buildBhIndexDisplay_(f, hasCompactBody) {
  if (hasCompactBody) return [];
  var indexDisplay = [];
  if (f.RBC !== "---") indexDisplay.push("Eri " + f.RBC);
  if (f.CHCM !== "---") indexDisplay.push("CHCM " + f.CHCM);
  if (f.RDW !== "---") indexDisplay.push("RDW " + f.RDW);
  if (f.MPV !== "---") indexDisplay.push("VPM " + f.MPV);
  if (f.Ret !== "---") indexDisplay.push("Ret " + f.Ret);
  return indexDisplay;
}
function buildBhVisibleLine_(hasCompactBody, corePairs, indexDisplay, diffDisplay) {
  if (hasCompactBody) return "BH	" + pairListToDisplay_(corePairs);
  if (!indexDisplay.length && !diffDisplay.length) return "";
  var sub = ["BH:"];
  if (indexDisplay.length) sub.push("  Hem.	" + indexDisplay.join("  "));
  if (diffDisplay.length) sub.push("  Dif.	" + diffDisplay.join("  "));
  return sub.join("\n");
}
function bhHasAnyData_(f, extras) {
  var hasCore = [f.Hb, f.Hto, f.VCM, f.HCM, f.Leu, f.Neu, f.Eos, f.Plt].some(function(v) {
    return v !== "---";
  });
  var hasExtIdx = [f.RBC, f.CHCM, f.RDW, f.MPV, f.Ret].some(function(v) {
    return v !== "---";
  });
  var hasCoag = [f.TP, f.TTP, f.INR, f.Fib, f.DD].some(function(v) {
    return v !== "---";
  });
  return hasCore || hasExtIdx || hasCoag || Object.keys(extras).length > 0;
}
function parseBH_(tNorm, priorRefs) {
  var f = extractBhScalarFields_(tNorm, priorRefs);
  var extras = buildBhExtras_(tNorm, f.Leu);
  if (!bhHasAnyData_(f, extras)) return { visible: "", coagVisible: "", extras: {} };
  var corePairs = buildBhCorePairs_(f);
  var hasCompactBody = corePairs.length > 0;
  var coagDisplay = buildBhCoagDisplay_(f);
  if (hasCompactBody || coagDisplay.length) mergeBhIndexExtras_(extras, f);
  var visible = buildBhVisibleLine_(
    hasCompactBody,
    corePairs,
    buildBhIndexDisplay_(f, hasCompactBody),
    buildBhDiffDisplay_(extras, tNorm, hasCompactBody, priorRefs)
  );
  return { visible, coagVisible: formatCoagResLabLine_(coagDisplay), extras };
}
function mergeBhResLabRows_(rows) {
  var list = (rows || []).map(function(r) {
    return String(r == null ? "" : r);
  }).filter(function(s) {
    return /^BH\b/i.test(s.trim());
  });
  if (!list.length) return { bh: "", coag: "" };
  var best = list[0];
  var bestScore = lineRichnessScore_(best);
  for (var i = 1; i < list.length; i++) {
    var sc = lineRichnessScore_(list[i]);
    if (sc > bestScore) {
      bestScore = sc;
      best = list[i];
    }
  }
  var coagRows = [];
  list.forEach(function(row) {
    String(row).split(/\r?\n/).forEach(function(line) {
      if (extractCoagBodyFromBhLine_(line)) coagRows.push(line);
    });
  });
  var coag = mergeCoagResLabRows_(coagRows);
  var lines = best.split(/\r?\n/).filter(function(line) {
    return !/^(?:\s*Coag\.|COAG)\t/i.test(line.trim());
  });
  var bh = lines.join("\n").trim();
  return { bh, coag };
}

// public/js/labs-chemistry.mjs
var ESC_MERGE_FIELD_ORDER = ["Na", "Cl", "K", "Ca", "F", "Mg"];
var PFH_MERGE_FIELD_ORDER = [
  "Alb",
  "AST",
  "ALT",
  "FA",
  "GGT",
  "Prot",
  "BT",
  "BD",
  "BI",
  "LDH",
  "Amil"
];
var LIPASA_MERGE_FIELD_ORDER = ["Lip"];
var PAIR_VALUE_RE_ = /^(-?\d+(?:[.,]\d+)?%?)\*?$|^---$/;
function extraerProcalcitonina_(texto) {
  var defaultRange = { valor: "---", min: 0, max: 0.05 };
  if (!texto) return defaultRange;
  var t = texto.toUpperCase();
  var positions = [];
  var start = 0;
  while (true) {
    var p = t.indexOf("PROCALCITONINA", start);
    if (p === -1) break;
    positions.push(p);
    start = p + "PROCALCITONINA".length;
  }
  if (!positions.length) return defaultRange;
  for (var i = positions.length - 1; i >= 0; i--) {
    var pos = positions[i] + "PROCALCITONINA".length;
    var sub = texto.substring(pos, pos + 220);
    var mVal = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mVal) continue;
    var valor = mVal[1];
    var rangeM = sub.match(/ADULTO[^0-9<]*<\s*=?\s*(\d+[.,]?\d*)/i);
    var max = rangeM ? parseFloat(rangeM[1].replace(",", ".")) : 0.05;
    return { valor, min: 0, max };
  }
  return defaultRange;
}
function fmtSuero_(data, fieldKey, priorRefs) {
  return fmtLabRanged_(data, fieldKey, priorRefs);
}
function appendQsPair_(p, key, val) {
  if (val !== "---") p.push(key, val);
}
function appendEgfrIfEligible_(p, crData, patientCtx) {
  if (!patientCtx) return;
  var ageY = ageYearsFromLabDemographics(patientCtx.edad, patientCtx.edadUnidad);
  var sexo = patientCtx.sexo;
  if (ageY == null || ageY < 18 || sexo !== "M" && sexo !== "F") return;
  var scrNum = toNum_(crData.valor);
  if (scrNum == null || scrNum <= 0) return;
  var egfr = computeEgfrCkdEpi2021Creatinine(scrNum, ageY, sexo === "F");
  if (egfr != null) p.push("eTFG", String(Math.round(egfr)));
}
function extractQsFormatted_(texto, priorRefs) {
  var crData = extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], texto);
  return {
    Glu: fmtSuero_(extraerConRangoSuero(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], texto), "Glu", priorRefs),
    crData,
    Cr: fmtSuero_(crData, "Cr", priorRefs),
    BUN: fmtSuero_(
      extraerConRangoSuero(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], texto),
      "BUN",
      priorRefs
    ),
    PCR: fmtSuero_(extraerConRangoSuero(["PROTEINA C REACTIVA", "PROTE\xCDNA C REACTIVA"], texto), "PCR", priorRefs),
    PCT: fmtSuero_(extraerProcalcitonina_(texto), "PCT", priorRefs),
    AU: fmtSuero_(extraerConRangoSuero(["ACIDO URICO EN SANGRE", "ACIDO URICO", "\xC1CIDO \xDARICO"], texto), "AU", priorRefs),
    COL: fmtSuero_(extraerConRangoSuero(["COLESTEROL"], texto), "COL", priorRefs),
    HDL: fmtSuero_(extraerConRangoSuero(["COLESTEROL HDL", "HDL COLESTEROL"], texto), "HDL", priorRefs),
    LDL: fmtSuero_(extraerConRangoSuero(["COLESTEROL LDL", "LDL COLESTEROL"], texto), "LDL", priorRefs),
    VLDL: fmtSuero_(extraerConRangoSuero(["VLDL"], texto), "VLDL", priorRefs),
    TGL: fmtSuero_(extraerConRangoSuero(["TRIGLICERIDOS", "TRIGLIC\xC9RIDOS"], texto), "TGL", priorRefs),
    IA: fmtSuero_(extraerIndiceAterogenico_(texto), "IA", priorRefs),
    CTHDL: fmtSuero_(
      extraerConRangoSuero(["COCIENTE COL.TOT/HDL", "COCIENTE COL.TOT / HDL", "COCIENTE COL TOT/HDL"], texto),
      "CTHDL",
      priorRefs
    ),
    VSG: fmtSuero_(extraerConRangoSuero(["VSG ", "VELOCIDAD DE SEDIMENTACION"], texto), "VSG", priorRefs),
    CPK: fmtSuero_(
      extraerConRangoSuero(
        [
          "CPK CREATIN FOSFO QUINASA",
          "CPK CREATINA FOSFOQUINASA",
          "CREATINA FOSFOQUINASA",
          "CREATIN FOSFO QUINASA",
          "CREATINA KINASA",
          "CK TOTAL",
          "CPK TOTAL",
          "CPK "
          // No usar 'CK ' solo: coincide con «SHOCK» en ubicación.
        ],
        texto
      ),
      "CPK",
      priorRefs
    )
  };
}
function parseQS_(texto, patientCtx, priorRefs) {
  var q = extractQsFormatted_(texto, priorRefs);
  var vals = [
    q.Glu,
    q.Cr,
    q.BUN,
    q.PCR,
    q.PCT,
    q.AU,
    q.COL,
    q.HDL,
    q.LDL,
    q.VLDL,
    q.TGL,
    q.IA,
    q.CTHDL,
    q.VSG,
    q.CPK
  ];
  if (vals.every(function(v) {
    return v === "---";
  })) {
    return "";
  }
  var p = ["QS"];
  appendQsPair_(p, "Glu", q.Glu);
  if (q.Cr !== "---") {
    p.push("Cr", q.Cr);
    appendEgfrIfEligible_(p, q.crData, patientCtx);
  }
  appendQsPair_(p, "BUN", q.BUN);
  appendQsPair_(p, "PCR", q.PCR);
  appendQsPair_(p, "PCT", q.PCT);
  appendQsPair_(p, "AU", q.AU);
  appendQsPair_(p, "COL", q.COL);
  appendQsPair_(p, "HDL", q.HDL);
  appendQsPair_(p, "LDL", q.LDL);
  appendQsPair_(p, "VLDL", q.VLDL);
  appendQsPair_(p, "TGL", q.TGL);
  appendQsPair_(p, "IA", q.IA);
  appendQsPair_(p, "CTHDL", q.CTHDL);
  appendQsPair_(p, "VSG", q.VSG);
  appendQsPair_(p, "CPK", q.CPK);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseESC_(texto, priorRefs) {
  var naData = extraerConRangoSuero(["SODIO"], texto);
  if (naData.valor === "---") return "";
  var clData = extraerConRangoSuero(["CLORO"], texto);
  var kData = extraerConRangoSuero(["POTASIO"], texto);
  var caData = extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], texto);
  var fData = extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "F\xD3SFORO"], texto);
  var mgData = extraerConRangoSuero(["MAGNESIO"], texto);
  var Na = fmtLabRanged_(naData, "Na", priorRefs);
  var Cl = fmtLabRanged_(clData, "Cl", priorRefs);
  var K = fmtLabRanged_(kData, "K", priorRefs);
  var Ca = fmtLabRanged_(caData, "Ca", priorRefs);
  var F = fmtLabRanged_(fData, "F", priorRefs);
  var Mg = fmtLabRanged_(mgData, "Mg", priorRefs);
  var p = ["ESC"];
  p.push("Na", Na);
  if (Cl !== "---") p.push("Cl", Cl);
  if (K !== "---") p.push("K", K);
  if (Ca !== "---") p.push("Ca", Ca);
  if (F !== "---") p.push("F", F);
  if (Mg !== "---") p.push("Mg", Mg);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parsePFH_(tNorm, priorRefs) {
  var albData = extraerConRangoSuero(["ALBUMINA"], tNorm);
  var astData = extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], tNorm);
  var altData = extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], tNorm);
  var alpData = extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], tNorm);
  var ggtData = extraerConRango(["GGT", "GAMA GLUTAMIL TRANSFERASA", "GAMMA GLUTAMIL TRANSFERASA"], tNorm);
  var protData = extraerConRangoSuero(["PROTEINAS TOTALES", "PROTE\xCDNAS TOTALES"], tNorm);
  var btData = extraerConRango(["BILIRRUBINA TOTAL"], tNorm);
  var bdData = extraerConRango(["BILIRRUBINA DIRECTA"], tNorm);
  var biData = extraerConRango(["BILIRRUBINA INDIRECTA"], tNorm);
  var ldhData = extraerConRango(
    ["LDH DESHIDROGENASA LACTICA", "LDH DESHIDROGENASA LAC", "LDH "],
    tNorm
  );
  var amilData = extraerConRango(["AMILASA SERICA", "AMILASA"], tNorm);
  var Alb = fmtLabRanged_(albData, "Alb", priorRefs);
  var AST = fmtLabRanged_(astData, "AST", priorRefs);
  var ALT = fmtLabRanged_(altData, "ALT", priorRefs);
  var FA = fmtLabRanged_(alpData, "FA", priorRefs);
  var GGT = fmtLabRanged_(ggtData, "GGT", priorRefs);
  var Prot = fmtLabRanged_(protData, "Prot", priorRefs);
  var BT = fmtLabRanged_(btData, "BT", priorRefs);
  var BD = fmtLabRanged_(bdData, "BD", priorRefs);
  var BI = fmtLabRanged_(biData, "BI", priorRefs);
  var LDH = fmtLabRanged_(ldhData, "LDH", priorRefs);
  var Amil = fmtLabRanged_(amilData, "Amil", priorRefs);
  if ([Alb, AST, ALT, FA, GGT, Prot, BT, BD, BI, LDH, Amil].every(function(v) {
    return v === "---";
  })) return "";
  var p = ["PFHs"];
  if (Alb !== "---") p.push("Alb", Alb);
  if (AST !== "---") p.push("AST", AST);
  if (ALT !== "---") p.push("ALT", ALT);
  if (FA !== "---") p.push("FA", FA);
  if (GGT !== "---") p.push("GGT", GGT);
  if (Prot !== "---") p.push("Prot", Prot);
  if (BT !== "---") p.push("BT", BT);
  if (BD !== "---") p.push("BD", BD);
  if (BI !== "---") p.push("BI", BI);
  if (LDH !== "---") p.push("LDH", LDH);
  if (Amil !== "---") p.push("Amil", Amil);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseLipasa_(texto, priorRefs) {
  var lipData = extraerConRango(["LIPASA SERICA", "LIPASA"], texto);
  var Lip = fmtLabRanged_(lipData, "Lip", priorRefs);
  if (Lip === "---") return "";
  return "LIPASA	Lip " + Lip;
}
function pairTokenScore_(val) {
  var s = String(val == null ? "" : val);
  var score = s.length;
  if (s.indexOf("*") >= 0) score += 5;
  if (/\d/.test(s)) score += 2;
  return score;
}
function ingestTabPairBody_(body, into) {
  var tokens = String(body || "").trim().split(/\s+/).filter(Boolean);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    var next = tokens[i + 1];
    if (!label || next == null) {
      i += 1;
      continue;
    }
    if (!PAIR_VALUE_RE_.test(next)) {
      i += 1;
      continue;
    }
    var key = String(label).replace(/:$/, "");
    var score = pairTokenScore_(next);
    var prev = into[key];
    if (!prev || score > prev.score) into[key] = { val: next, score };
    i += 2;
  }
}
function mergeTabPairResLabRows_(rows, sectionRe, preferredOrder) {
  var list = (rows || []).map(function(r) {
    return String(r == null ? "" : r).trim();
  }).filter(function(s) {
    return s && sectionRe.test(s);
  });
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  var header = list[0].split(/\t/)[0] || list[0].split(/\s/)[0] || "";
  var byKey = /* @__PURE__ */ Object.create(null);
  list.forEach(function(row) {
    var tab = row.indexOf("	");
    var body = tab >= 0 ? row.slice(tab + 1) : row.replace(sectionRe, "").trim();
    if (tab >= 0) header = row.slice(0, tab).trim() || header;
    ingestTabPairBody_(body, byKey);
  });
  var keys = Object.keys(byKey);
  if (!keys.length) return list[list.length - 1];
  var order = preferredOrder || [];
  var rank = /* @__PURE__ */ Object.create(null);
  order.forEach(function(k, i) {
    rank[k] = i;
  });
  keys.sort(function(a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a) ? rank[a] : 9999;
    var rb = Object.prototype.hasOwnProperty.call(rank, b) ? rank[b] : 9999;
    if (ra !== rb) return ra - rb;
    return String(a).localeCompare(String(b), "es");
  });
  var parts = [];
  keys.forEach(function(k) {
    parts.push(k, byKey[k].val);
  });
  return header + "	" + parts.join(" ");
}
function mergeQsResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^QS\b/i, QS_SOME_TREND_ORDER);
}
function mergeEscResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^ESC\b/i, ESC_MERGE_FIELD_ORDER);
}
function mergePfhResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^PFHS?\b/i, PFH_MERGE_FIELD_ORDER);
}
function mergeLipasaResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^LIPASA\b/i, LIPASA_MERGE_FIELD_ORDER);
}

// public/js/labs-citoquimico-scan.mjs
function emptyCitoquimicoFields_() {
  return {
    fluid: "",
    dens: "",
    pH: "",
    glu: "",
    prot: "",
    ldh: "",
    alb: "",
    tgl: "",
    amil: "",
    aspecto: "",
    leu: "",
    rec: "",
    pmn: "",
    linf: "",
    eri: "",
    gram: "",
    com: ""
  };
}
function nextMeaningfulLine_(lineas, i0, maxJ) {
  for (var j = i0 + 1; j < Math.min(i0 + maxJ, lineas.length); j++) {
    var txt = lineas[j].replace(/\*/g, "").trim();
    if (!txt) continue;
    if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
    return txt;
  }
  return "";
}
function scanNumericAfter_2(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var m = lineas[j].match(/(\d+(\.\d+)?)/);
    if (m) return m[1];
  }
  return "";
}
function scanNumericSkipLetterFlag_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var c = lineas[j].replace(/\*/g, "").trim();
    if (/^[A-Z]$/i.test(c)) continue;
    var m = c.match(/(\d+(\.\d+)?)/);
    if (m) return m[1];
  }
  return "";
}
function scanCitoFluidType_(fields, lineas, i, lin) {
  if (/^CITOQUIMICO DE\s*$/i.test(lin) && !/CORPORALES/i.test(lin)) {
    var f = nextMeaningfulLine_(lineas, i, 6);
    if (f && !/^:$/.test(f)) fields.fluid = f.toUpperCase();
  }
  if (/^CITOQUIMICO DE\s+/i.test(lin) && !/CORPORALES/i.test(lin)) {
    var mTipo = lin.match(/^CITOQUIMICO DE\s+(.+)$/i);
    if (mTipo && mTipo[1].trim()) fields.fluid = mTipo[1].trim().toUpperCase();
  }
}
function scanCitoChemistry_(fields, lineas, i, lin, linUp) {
  if (linUp.indexOf("DENSIDAD") === 0) fields.dens = scanNumericAfter_2(lineas, i, 5);
  if (linUp === "PH" || linUp.indexOf("PH	") === 0) fields.pH = scanNumericAfter_2(lineas, i, 5);
  if (linUp.indexOf("GLUCOSA") === 0) fields.glu = scanNumericAfter_2(lineas, i, 5);
  if (linUp.indexOf("PROTEINAS") === 0) {
    var mL = lin.match(/PROTEINAS\s*([A-Z])\s*$/i);
    var letra = mL ? mL[1].toUpperCase() : "";
    var protVal = scanNumericAfter_2(lineas, i, 5);
    if (protVal) fields.prot = protVal + letra;
  }
  if (linUp.indexOf("LDH") === 0) fields.ldh = scanNumericSkipLetterFlag_(lineas, i, 8);
  if (linUp.indexOf("ALBUMINA") === 0) fields.alb = scanNumericSkipLetterFlag_(lineas, i, 8);
  if (linUp.indexOf("TRIGLICER") === 0) fields.tgl = scanNumericSkipLetterFlag_(lineas, i, 8);
  if (linUp.indexOf("AMILASA") === 0) fields.amil = scanNumericSkipLetterFlag_(lineas, i, 8);
}
function scanRecuentoField_(fields, lineas, i, linUp) {
  if (linUp.indexOf("RECUENTO") !== 0 || linUp.indexOf("LEUCOCITOS") !== -1) return;
  var bits = [];
  for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
    var c = lineas[j].replace(/\*/g, "").trim();
    if (!c) continue;
    if (/^LEUCOCITOS/i.test(c)) break;
    if (/^\d+[.,]?\d*$/.test(c) || /^[A-Z]$/i.test(c)) bits.push(c.toUpperCase());
    if (bits.length >= 2) break;
  }
  if (bits.length) fields.rec = bits.join(" ");
}
function scanLeucocitosField_(fields, lineas, i, linUp, normalizarRecuentoCelular) {
  if (!/^LEUCOCITOS/i.test(linUp)) return;
  for (var k = i - 1; k >= Math.max(0, i - 6); k--) {
    var prev = lineas[k].replace(/\*/g, "").trim();
    if (/^\d+[.,]?\d*$/.test(prev)) {
      fields.leu = normalizarRecuentoCelular(prev);
      return;
    }
  }
  for (var m = i + 1; m < Math.min(i + 8, lineas.length); m++) {
    var next = lineas[m].replace(/\*/g, "").trim();
    if (/^\d+[.,]?\d*$/.test(next)) {
      fields.leu = normalizarRecuentoCelular(next);
      return;
    }
  }
}
function scanRecuentoAndLeucocitos_(fields, lineas, i, linUp, normalizarRecuentoCelular) {
  scanRecuentoField_(fields, lineas, i, linUp);
  scanLeucocitosField_(fields, lineas, i, linUp, normalizarRecuentoCelular);
}
function scanCitoDiffCounts_(fields, lineas, i, linUp) {
  if (linUp.indexOf("POLIMORFONUCLEARES") === 0) {
    var ptxt = nextMeaningfulLine_(lineas, i, 5);
    if (ptxt) fields.pmn = ptxt.toUpperCase();
  }
  if (linUp.indexOf("LINFOCITOS") === 0) {
    var ltxt = nextMeaningfulLine_(lineas, i, 5);
    if (ltxt && ltxt !== "%" && ltxt !== "---") fields.linf = ltxt.replace(",", ".");
  }
  if (linUp.indexOf("ERITROCITOS") === 0) {
    var etxt = nextMeaningfulLine_(lineas, i, 5);
    if (etxt) fields.eri = etxt.toUpperCase();
  }
  if (linUp.indexOf("GRAM") === 0) {
    var g = nextMeaningfulLine_(lineas, i, 5);
    if (g) fields.gram = g.toUpperCase();
  }
  if (linUp.indexOf("COMENTARIO") === 0) {
    var cx = nextMeaningfulLine_(lineas, i, 4);
    if (cx && !/^\*+$/.test(cx)) fields.com = cx.toUpperCase();
  }
}
function scanCitoMicroscopy_(fields, lineas, i, linUp, normalizarRecuentoCelular) {
  if (linUp.indexOf("ASPECTO") === 0) {
    var a = nextMeaningfulLine_(lineas, i, 5);
    if (a && !/^:$/.test(a)) fields.aspecto = a.toUpperCase();
  }
  scanRecuentoAndLeucocitos_(fields, lineas, i, linUp, normalizarRecuentoCelular);
  scanCitoDiffCounts_(fields, lineas, i, linUp);
}
function scanCitoquimicoLine_(fields, lineas, i, lin, linUp, normalizarRecuentoCelular) {
  scanCitoFluidType_(fields, lineas, i, lin);
  scanCitoChemistry_(fields, lineas, i, lin, linUp);
  scanCitoMicroscopy_(fields, lineas, i, linUp, normalizarRecuentoCelular);
}
function citoquimicoFieldsEmpty_(fields) {
  return !Object.values(fields).some(Boolean);
}
function buildCitoquimicoParts_(fields, ctx) {
  var p = ["Liq:"];
  var pairs = [
    ["fluid", "Tipo", (v) => v],
    ["dens", "Dens", (v) => v],
    ["pH", "pH", (v) => v],
    ["glu", "Glu", (v) => v],
    ["prot", "Prot", (v) => ctx.fmtProteinaFluido(v)],
    ["alb", "Alb", (v) => v],
    ["tgl", "TGL", (v) => v],
    ["amil", "Amil", (v) => v],
    ["ldh", "LDH", (v) => v],
    ["aspecto", "Asp", (v) => v],
    ["rec", "Rec", (v) => v],
    ["leu", "Leu", (v) => v],
    ["pmn", "PMN", (v) => v],
    ["linf", "Linf", (v) => v + (/%/.test(v) ? "" : "%")],
    ["eri", "Eri", (v) => v],
    ["gram", "Gram", (v) => v],
    ["com", "Obs", (v) => v]
  ];
  for (var n = 0; n < pairs.length; n++) {
    var key = pairs[n][0];
    var label = pairs[n][1];
    var fmt2 = pairs[n][2];
    var raw = fields[key];
    if (!raw || key === "pmn" && raw === "---" || key === "com" && raw === fields.fluid) continue;
    p.push(label, fmt2(raw));
  }
  if (ctx.gasaVal != null) p.push("GASA", String(ctx.gasaVal));
  return p;
}

// public/js/labs-fluidos-misc.mjs
var HECES_ROW_DEFS = [
  { key: "ASPECTO", out: "Asp" },
  { key: "PH", out: "pH" },
  { key: "PROTEINAS", out: "Prot" },
  { key: "GLUCOSA", out: "Glu" },
  { key: "LEUCOCITOS", out: "Leu" },
  { key: "ERITROCITOS", out: "Eri" },
  { key: "GRASA", out: "Grasa" },
  { key: "FIBRAS MUSCULARES", out: "Fibra" },
  { key: "COPROPARASITOSCOPICO INMEDIATO", out: "Copro" },
  { key: "OBSERVACIONES", out: "Obs" }
];
function nextMeaningfulInBlock_(bloque, iStart, maxStep, skipNumericOnly) {
  for (var k = iStart + 1; k < Math.min(iStart + maxStep, bloque.length); k++) {
    var txt = (bloque[k] || "").replace(/\*/g, "").trim();
    if (!txt || txt === ":") continue;
    if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
    if (skipNumericOnly && /^\d+(\.\d+)?$/.test(txt)) continue;
    return txt;
  }
  return "";
}
function findHecesBlock_(lineas) {
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf("FISICOQUIMICO DE HECES") !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return null;
  var i1 = lineas.length;
  for (var j = i0 + 1; j < lineas.length; j++) {
    if (/^(BACTERIOLOGIA|HEMATOLOGIA|QUIMICA CLINICA|INMUNOLOGIA|GASOMETRIA|COAGULACION|URIANALISIS|EXAMEN GENERAL DE ORINA|CULTIVO)\b/i.test(
      lineas[j]
    )) {
      i1 = j;
      break;
    }
  }
  return lineas.slice(i0, i1);
}
function readHecesRowValue_(bloque, row) {
  for (var bi = 0; bi < bloque.length; bi++) {
    if (bloque[bi].toUpperCase().indexOf(row.key) !== 0) continue;
    var v = nextMeaningfulInBlock_(bloque, bi, 7, false);
    if (row.key === "ASPECTO" && /^\d+(\.\d+)?$/.test(v)) {
      var v2 = nextMeaningfulInBlock_(bloque, bi, 10, true);
      if (v2) v = v + " " + v2;
    }
    return v ? v.toUpperCase() : "";
  }
  return "";
}
function parseFisicoquimicoHeces_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  if (textoBruto.toUpperCase().indexOf("FISICOQUIMICO DE HECES") === -1) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var bloque = findHecesBlock_(lineas);
  if (!bloque) return "";
  var p = ["HECES"];
  for (var r = 0; r < HECES_ROW_DEFS.length; r++) {
    var v = readHecesRowValue_(bloque, HECES_ROW_DEFS[r]);
    if (v) p.push(HECES_ROW_DEFS[r].out, v);
  }
  if (p.length <= 1) return "";
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseFrotisSangre_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("FROTIS DE SANGRE PERIFERICA") === -1) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf("FROTIS DE SANGRE PERIFERICA") !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return "";
  function nextMeaningful(iStart, maxStep) {
    for (var j = iStart + 1; j < Math.min(iStart + maxStep, lineas.length); j++) {
      var txt = (lineas[j] || "").replace(/\*/g, "").trim();
      if (!txt || txt === ":") continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      if (/^FROTIS DE SANGRE PERIFERICA$/i.test(txt)) continue;
      return txt;
    }
    return "";
  }
  var desc = "";
  for (var k = i0; k < Math.min(i0 + 20, lineas.length); k++) {
    if (lineas[k].toUpperCase().indexOf("FROTIS DE SANGRE PERIFERICA") !== 0) continue;
    desc = nextMeaningful(k, 8);
    if (desc) break;
  }
  if (!desc) return "";
  var lines = formatFrotisSangreLines_(desc);
  var plaqObs = extraerObservacionPlaquetasHema_(textoBruto);
  if (plaqObs) {
    lines = lines ? lines + "\nFROTIS	PlaqObs " + plaqObs : "FROTIS	PlaqObs " + plaqObs;
  }
  return lines;
}
function extraerObservacionPlaquetasHema_(textoBruto) {
  if (!textoBruto || !/PLAQUETAS\s+DISMINUIDAS/i.test(textoBruto)) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").replace(/\*/g, "").trim();
  });
  for (var i = 0; i < lineas.length; i++) {
    if (!/^OBSERVACIONES$/i.test(lineas[i])) continue;
    for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
      var t = lineas[j];
      if (!t || /^[ABHL]$/i.test(t)) continue;
      if (/^FROTIS|TIEMPO DE|FIBRINOGENO|DIMERO|HEMATOLOGIA/i.test(t)) break;
      if (/PLAQUETAS/i.test(t)) return t.toUpperCase();
    }
  }
  return "PLAQUETAS DISMINUIDAS";
}
function formatFrotisSangreLines_(desc) {
  var up = String(desc || "").toUpperCase().trim();
  if (!up) return "";
  var calTokens = [];
  var plaqTokens = [];
  var otros = [];
  up.split(/\s*,\s*/).forEach(function(chunk) {
    var c = chunk.trim();
    if (!c) return;
    if (/PLAQUET|MACROPLAQUET/i.test(c)) plaqTokens.push(c);
    else if (/HIPOCROM|ANISOCIT|POIKILOCIT|ESFEROCIT|ELIPT|DACRIOCIT|ESQUIZOCIT|BITE|ROD|HELIN|CABEZA|CUELLO|CABEZA DE FLECHA|POLICROM|NORMOCROM|NORMOCIT|MACROCIT|MICROCIT|\+/i.test(c)) {
      calTokens.push(c);
    } else otros.push(c);
  });
  var lines = [];
  if (calTokens.length) lines.push("FROTIS	Cal " + calTokens.join(", "));
  if (plaqTokens.length) lines.push("FROTIS	Plaq " + plaqTokens.join(", "));
  if (otros.length) lines.push("FROTIS	Obs " + otros.join(", "));
  if (!lines.length) lines.push("FROTIS	Obs " + up);
  return lines.join("\n");
}
function parsePlaquetasCitrato_(textoBruto, tNorm, priorRefs) {
  if (!tNorm || !/PLAQUETAS\s+CON\s+CITRATO/i.test(tNorm)) return "";
  var bloque = "";
  var m = textoBruto.match(
    /PLAQUETAS\s+CON\s+CITRATO[\s\S]*?(?=\n\s*(?:HEMATOLOGIA|QUIMICA\s+CLINICA|URIANALISIS|BACTERIOLOGIA|GASOMETRIA|BIOMETRIA|COAGULACION)\b|$)/i
  );
  bloque = m ? m[0].replace(/\s+/g, " ") : tNorm;
  var pltData = extraerConRango(["CUENTA DE PLAQUETAS", "PLT "], bloque);
  if (pltData.valor === "---") return "";
  var Plt = fmtLabRanged_(pltData, "Plt", priorRefs);
  return "PltCit	Plt " + Plt;
}
function formatSerolSco_(raw) {
  var n = parseFloat(String(raw || "").replace(",", "."));
  if (!isFinite(n)) return String(raw || "").trim();
  var s = n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return s;
}
function qualSerolShort_(qual) {
  var q = String(qual || "").toUpperCase();
  if (q === "NEGATIVO") return "neg";
  if (q === "POSITIVO") return "pos*";
  if (q === "INDETERMINADO") return "indet*";
  return "";
}
function lineMatchesSerolPatterns_(line, patterns) {
  for (var p = 0; p < patterns.length; p++) {
    if (patterns[p].test(line)) return true;
  }
  return false;
}
function readSerolQualFromFollowLines_(lineas, i) {
  var sco = null;
  var qual = "";
  for (var j = i + 1; j < Math.min(i + 12, lineas.length); j++) {
    var t = String(lineas[j] || "").replace(/\*/g, "").trim();
    if (!t || t === ":") continue;
    if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(t)) continue;
    if (/^S\/CO$/i.test(t)) continue;
    if (/^(Positivo|Indeterminado|Negativo)\s*[<>=]/i.test(t)) continue;
    if (/^(Anticuerpos|Ant[ií]geno)\b/i.test(t)) break;
    var mNum = t.match(/^(\d+\.\d+|\d+)$/);
    if (mNum && sco === null) {
      sco = mNum[1];
      continue;
    }
    var mQ = t.match(/^(NEGATIVO|POSITIVO|INDETERMINADO)$/i);
    if (mQ) {
      qual = mQ[1].toUpperCase();
      break;
    }
  }
  return qual ? { sco, qual } : null;
}
function extraerSerolEstudio_(lineas, iStart, patterns) {
  for (var i = iStart; i < lineas.length; i++) {
    var line = String(lineas[i] || "").replace(/\t.*$/, "").trim();
    if (!line || !lineMatchesSerolPatterns_(line, patterns)) continue;
    return readSerolQualFromFollowLines_(lineas, i);
  }
  return null;
}
function hasSerolReportMarkers_(textoBruto) {
  return /HIV\s*1\s*\/\s*HIV\s*2/i.test(textoBruto) || /ANTI\s+VIRUS\s+DE\s+LA\s+HEPATITIS\s+C/i.test(textoBruto) || /ANTIGENO\s+DE\s+SUPERFICIE.*HEPATITIS\s+B/i.test(textoBruto);
}
function findBancoSangreStart_(lineas) {
  for (var i = 0; i < lineas.length; i++) {
    if (/^BANCO\s+DE\s+SANGRE$/i.test(lineas[i])) return i;
  }
  return 0;
}
function buildSerolToken_(est, res) {
  var qShort = qualSerolShort_(res.qual);
  if (!qShort) return "";
  var token = est.key + " " + qShort;
  if (res.sco != null) token += " (" + formatSerolSco_(res.sco) + ")";
  return token;
}
function parseSerologiaBancoSangre_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("BANCO DE SANGRE") === -1 && !hasSerolReportMarkers_(textoBruto)) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var startSearch = findBancoSangreStart_(lineas);
  var estudios = [
    { key: "VIH", patterns: [/HIV\s*1\s*\/\s*HIV\s*2/i, /\bANTI\s+HIV/i] },
    { key: "VHC", patterns: [/ANTI\s+VIRUS\s+DE\s+LA\s+HEPATITIS\s+C/i, /HEPATITIS\s+C/i] },
    { key: "HBsAg", patterns: [/ANTIGENO\s+DE\s+SUPERFICIE.*HEPATITIS\s+B/i, /\bHBSAG\b/i] }
  ];
  var parts = [];
  for (var e = 0; e < estudios.length; e++) {
    var res = extraerSerolEstudio_(lineas, startSearch, estudios[e].patterns);
    if (!res || !res.qual) continue;
    var token = buildSerolToken_(estudios[e], res);
    if (token) parts.push(token);
  }
  if (!parts.length) return "";
  return "SEROL	" + parts.join(" ");
}
function readNumericFromLines_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var v = lineas[j];
    if (!v || /^[A-Z]$/.test(v)) continue;
    var m = v.match(/^(\d+\.?\d*)/);
    if (m) return m[1];
  }
  return "---";
}
function extractOrinaVolRes_(lineas) {
  var vol = "---";
  var res = "---";
  for (var i = 0; i < lineas.length; i++) {
    var lUp = lineas[i].toUpperCase();
    if (lUp.indexOf("VOLUMEN") !== -1) vol = readNumericFromLines_(lineas, i, 6);
    if (lUp === "RESULTADO") res = readNumericFromLines_(lineas, i, 6);
  }
  return { vol, res };
}
function parseCuantOrina_(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  var startIdx = tUp.indexOf("CUANTIFICACION PROTEINAS");
  if (startIdx === -1) return "";
  var bloque = textoBruto.substring(startIdx);
  var nextSec = bloque.search(/\n(?:HEMATOLOGIA|BACTERIOLOGIA|CULTIVO|EXAMEN GENERAL|GASOMETRIA|BIOMETRIA)\b/i);
  if (nextSec > 0) bloque = bloque.substring(0, nextSec);
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").replace(/\t.*/, "").trim();
  });
  var extracted = extractOrinaVolRes_(lineas);
  if (extracted.res === "---") return "";
  var tipo = /orina\s+de\s+12/i.test(bloque) ? "12h" : "24h";
  var parts = ["Prot" + tipo];
  if (extracted.vol !== "---") parts.push("Vol " + extracted.vol + "ml");
  parts.push(extracted.res + "*");
  parts.push("gr/vol");
  return parts[0] + "	" + parts.slice(1).join(" ");
}

// public/js/labs-fluidos.mjs
function bloqueCitoquimicoLiquidosFull(textoBruto) {
  var t = textoBruto.replace(/\r/g, "");
  var u = t.toUpperCase();
  var key = "CITOQUIMICO DE LIQUIDOS CORPORALES";
  var i0 = u.indexOf(key);
  if (i0 === -1) return "";
  var i2 = u.indexOf(key, i0 + key.length);
  if (i2 === -1) return t.substring(i0);
  var afterSecond = t.substring(i2 + key.length);
  var stop = afterSecond.search(/\n\n\s*(?:QUIMICA CLINICA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA)\b/i);
  var end = stop === -1 ? t.length : i2 + key.length + stop;
  return t.substring(i0, end);
}
function normalizarProteinasFluidoGdl_(valStr) {
  var n = toNum_(String(valStr || "").replace(/[A-Z*]$/i, ""));
  if (n == null) return null;
  if (n >= 1e3) return n / 1e3;
  if (n >= 100) return n / 100;
  return n;
}
function esLiquidoPleural_(fluid, com, bloque) {
  var s = ((fluid || "") + " " + (com || "") + " " + (bloque || "")).toUpperCase();
  return /\bPLEURAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PLEURAL\b/.test(s);
}
function esLiquidoAscitico_(fluid, com, bloque) {
  if (esLiquidoPleural_(fluid, com, bloque)) return false;
  var s = ((fluid || "") + " " + (com || "") + " " + (bloque || "")).toUpperCase();
  return /\bASCIT/i.test(s) || /\bPERITONEAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PERITONEAL\b/.test(s);
}
function computeGasaValue_(serumAlbGdl, asciticAlbGdl) {
  if (serumAlbGdl == null || asciticAlbGdl == null) return null;
  return Math.round((serumAlbGdl - asciticAlbGdl) * 100) / 100;
}
function extraerGlucosaSuero_(textoBruto) {
  var t = serumTextWithoutCitoBlock_(textoBruto);
  if (!t) return null;
  var gluData = extraerConRangoSuero(["GLUCOSA"], t);
  return toNum_(gluData.valor);
}
function extractSerumGlucoseMgdlFromResLabs_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    var key = labSectionKey_(line);
    if (key !== "QS" && key !== "PFHS") continue;
    var m = line.match(/\bGlu\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (m) return toNum_(m[1]);
  }
  return null;
}
function resolveSerumGlucoseForInterpret_(textoBruto, serumOpts) {
  var glu = extraerGlucosaSuero_(textoBruto);
  if (glu != null) return glu;
  var opts = serumOpts || {};
  var extras = opts.extraSourceTexts || [];
  for (var i = 0; i < extras.length; i++) {
    var txt = String(extras[i] || "").trim();
    if (!txt) continue;
    glu = extraerGlucosaSuero_(txt);
    if (glu != null) return glu;
  }
  var labGroups = opts.extraResLabs || [];
  for (var j = 0; j < labGroups.length; j++) {
    glu = extractSerumGlucoseMgdlFromResLabs_(labGroups[j]);
    if (glu != null) return glu;
  }
  return null;
}
function serumTextWithoutCitoBlock_(textoBruto) {
  if (!textoBruto) return "";
  var bloqueCito = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloqueCito) return String(textoBruto);
  var tNorm = String(textoBruto).replace(/\s+/g, " ");
  var bloqueNorm = bloqueCito.replace(/\r/g, "").replace(/\s+/g, " ");
  return tNorm.replace(bloqueNorm, " ");
}
function extraerAlbuminaSueroParaGasa_(textoBruto, _bloqueCito) {
  var t = serumTextWithoutCitoBlock_(textoBruto);
  if (!t) return null;
  var albData = extraerConRangoSuero(["ALBUMINA"], t);
  return toNum_(albData.valor);
}
function extractSerumAlbuminGdlFromResLabs_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    if (labSectionKey_(line) !== "PFHS") continue;
    var m = line.match(/\bAlb\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (m) return toNum_(m[1]);
  }
  return null;
}
function resolveSerumAlbuminForGasa_(textoBruto, bloqueCito, serumOpts) {
  var alb = extraerAlbuminaSueroParaGasa_(textoBruto, bloqueCito);
  if (alb != null) return alb;
  var opts = serumOpts || {};
  var extras = opts.extraSourceTexts || [];
  for (var i = 0; i < extras.length; i++) {
    var txt = String(extras[i] || "").trim();
    if (!txt) continue;
    alb = extraerAlbuminaSueroParaGasa_(txt, bloqueCitoquimicoLiquidosFull(txt));
    if (alb != null) return alb;
  }
  var labGroups = opts.extraResLabs || [];
  for (var j = 0; j < labGroups.length; j++) {
    alb = extractSerumAlbuminGdlFromResLabs_(labGroups[j]);
    if (alb != null) return alb;
  }
  return null;
}
function resLabsHasAsciticFluid_(resLabs) {
  return !!(resLabs || []).some(function(row) {
    var line = String(row || "");
    return labSectionKey_(line) === "LIQ:" && /\bASCIT|PERITONEAL/i.test(line);
  });
}
function resLabsHasPleuralFluid_(resLabs) {
  return !!(resLabs || []).some(function(row) {
    var line = String(row || "");
    return labSectionKey_(line) === "LIQ:" && /\bPLEURAL\b/i.test(line);
  });
}
function extraerCitologiaAscitica_(textoBruto) {
  var t = String(textoBruto || "").toUpperCase();
  var idx = t.search(/\bCITOLOG/i);
  if (idx === -1) return null;
  var chunk = t.substring(idx, idx + 1200);
  if (!/\b(ASCIT|PERITONEAL|LIQUIDO\s+ASCIT)\b/.test(chunk)) return null;
  if (/\b(POSITIVO|MALIGN|ADENOCARCINOMA|CARCINOMA|CARCINOMATOSIS|METÁSTASIS|METASTASIS)\b/.test(chunk)) {
    return "positive";
  }
  if (/\bNEGATIVO\b/.test(chunk)) return "negative";
  return null;
}
function applyLightProtCriterion_(pleuralProtGdl, serumProtGdl, hits, details) {
  if (pleuralProtGdl == null || serumProtGdl == null || serumProtGdl <= 0) return 0;
  var r1 = pleuralProtGdl / serumProtGdl;
  if (r1 > 0.5) hits.push("prot");
  details.push("Prot " + r1.toFixed(2) + (r1 > 0.5 ? "" : "\u2212"));
  return 1;
}
function applyLightLdhCriterion_(pleuralLdh, serumLdh, hits, details) {
  if (pleuralLdh == null || serumLdh == null || serumLdh <= 0) return 0;
  var r2 = pleuralLdh / serumLdh;
  if (r2 > 0.6) hits.push("ldh");
  details.push("LDH " + r2.toFixed(2) + (r2 > 0.6 ? "" : "\u2212"));
  return 1;
}
function applyLightLdhUlnCriterion_(pleuralLdh, serumLdhUln, hits, details) {
  if (pleuralLdh == null || serumLdhUln == null || serumLdhUln <= 0) return 0;
  var umbral = 2 / 3 * serumLdhUln;
  if (pleuralLdh > umbral) hits.push("ldhUln");
  details.push("LDH>2/3" + (pleuralLdh > umbral ? "" : "\u2212"));
  return 1;
}
function evaluarCriteriosLight_(pleuralProtGdl, pleuralLdh, serumProtGdl, serumLdh, serumLdhUln) {
  var hits = [];
  var details = [];
  var nEval = applyLightProtCriterion_(pleuralProtGdl, serumProtGdl, hits, details) + applyLightLdhCriterion_(pleuralLdh, serumLdh, hits, details) + applyLightLdhUlnCriterion_(pleuralLdh, serumLdhUln, hits, details);
  if (!nEval || !details.length) return "";
  if (hits.length > 0) return "Light EXUDADO (" + details.join(", ") + ")";
  if (nEval === 3) return "Light TRASUDADO (" + details.join(", ") + ")";
  return "Light TRASUDADO parcial (" + details.join(", ") + ")";
}
function extraerSueroParaLight_(textoBruto, bloqueCito) {
  var t = textoBruto || "";
  if (bloqueCito) t = t.replace(bloqueCito, " ");
  var protData = extraerConRangoSuero(
    ["PROTEINAS TOTALES EN SANGRE", "PROTEINAS TOTALES", "PROTEINA TOTAL EN SANGRE", "PROTEINAS EN SANGRE"],
    t
  );
  var ldhData = extraerConRangoSuero(["LDH DESHIDROGENASA LACTICA", "LDH "], t);
  return {
    protGdl: normalizarProteinasFluidoGdl_(protData.valor),
    ldh: toNum_(ldhData.valor),
    ldhUln: ldhData.max != null ? ldhData.max : null
  };
}
function normalizarRecuentoCelular_(valStr) {
  var c = String(valStr || "").replace(/\*/g, "").trim();
  if (/^\d{1,3},\d{3}$/.test(c)) return c.replace(",", "");
  return c.replace(",", ".");
}
function fmtProteinaFluido_(valStr) {
  var g = normalizarProteinasFluidoGdl_(valStr);
  if (g == null) return String(valStr || "").replace(/[A-Z*]$/i, "");
  var star = /[A-Z*]$/.test(String(valStr || ""));
  var s = g >= 10 ? String(Math.round(g * 10) / 10) : String(Math.round(g * 100) / 100);
  return s + (star ? "*" : "");
}
function buildLightPleural_(bloque, pleuralProtRaw, pleuralLdhRaw, textoBruto) {
  var pleuralProt = normalizarProteinasFluidoGdl_(pleuralProtRaw);
  var pleuralLdh = toNum_(pleuralLdhRaw);
  if (pleuralProt == null && pleuralLdh == null) return "";
  var suero = extraerSueroParaLight_(textoBruto, bloque);
  var ldhUln = suero.ldhUln;
  if (ldhUln == null && bloque) {
    var ldhRef = extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH "], bloque);
    if (ldhRef.max != null) ldhUln = ldhRef.max;
  }
  return evaluarCriteriosLight_(pleuralProt, pleuralLdh, suero.protGdl, suero.ldh, ldhUln);
}
function parseCitoquimicoLiquidosParsed(textoBruto, serumOpts) {
  var bloque = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloque) return { line: "", esAscitico: false };
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.trim();
  });
  var fields = emptyCitoquimicoFields_();
  for (var i = 0; i < lineas.length; i++) {
    var lin = lineas[i];
    scanCitoquimicoLine_(fields, lineas, i, lin, lin.toUpperCase(), normalizarRecuentoCelular_);
  }
  if (!fields.fluid && fields.com && /\bPLEURAL\b/i.test(fields.com)) fields.fluid = fields.com;
  if (!fields.fluid && esLiquidoPleural_(fields.fluid, fields.com, bloque)) fields.fluid = "LIQUIDO PLEURAL";
  if (citoquimicoFieldsEmpty_(fields)) {
    return { line: "", esAscitico: false };
  }
  var esPleural = esLiquidoPleural_(fields.fluid, fields.com, bloque);
  var esAscitico = esLiquidoAscitico_(fields.fluid, fields.com, bloque);
  var leuNum = parseFluidLeu_(fields.leu);
  var pmnInfo = parsePmnField_(fields.pmn, leuNum);
  var lightTxt = esPleural ? buildLightPleural_(bloque, fields.prot, fields.ldh, textoBruto) : "";
  var gasaVal = null;
  var serumAlb = null;
  var asciticAlb = null;
  if (esAscitico && fields.alb) {
    asciticAlb = toNum_(fields.alb);
    serumAlb = resolveSerumAlbuminForGasa_(textoBruto, bloque, serumOpts);
    gasaVal = computeGasaValue_(serumAlb, asciticAlb);
  }
  var p = buildCitoquimicoParts_(fields, { fmtProteinaFluido: fmtProteinaFluido_, gasaVal });
  return {
    line: p[0] + "	" + p.slice(1).join(" "),
    esAscitico,
    esPleural,
    alb: asciticAlb,
    serumAlb,
    gasaVal,
    protGdl: normalizarProteinasFluidoGdl_(fields.prot),
    tgl: toNum_(fields.tgl),
    amil: toNum_(fields.amil),
    citologia: extraerCitologiaAscitica_(textoBruto),
    lightTxt,
    leu: leuNum,
    pmnInfo,
    glu: toNum_(fields.glu),
    pH: toNum_(fields.pH),
    gram: fields.gram || ""
  };
}
function parsearCitoquimicoLiquidos(textoBruto, serumOpts) {
  return parseCitoquimicoLiquidosParsed(textoBruto, serumOpts).line;
}

// public/js/labs-report-refs.mjs
var LAB_FECHA_MESES_ABBREV = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12", jan: "01", apr: "04", aug: "08", dec: "12" };
function padFechaDMY(d, m, yStr) {
  var y = String(yStr);
  if (y.length === 2) y = "20" + y;
  return String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0") + "/" + y;
}
function extractLabReportFechaDMY(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var t = textoBruto;
  var m = t.match(/Fecha\s+Registro\s*:?\s*\r?\n?\s*([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (m) {
    var mon = LAB_FECHA_MESES_ABBREV[m[1].toLowerCase().slice(0, 3)];
    if (mon) return padFechaDMY(m[2], mon, m[3]);
  }
  var patronesNum = [
    /Fecha\s+(?:de\s+)?(?:Registro|resultado|Resultado|muestra|Muestra|emisi[oó]n|ingreso|extracci[oó]n)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    /(?:Fecha|FECHA)\s+DEL\s+ESTUDIO\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    /Recepci[oó]n\s*(?:de\s*)?(?:muestra)?\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    /(?:Captura|Validaci[oó]n|Reporte)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i
  ];
  for (var i = 0; i < patronesNum.length; i++) {
    m = t.match(patronesNum[i]);
    if (m) return padFechaDMY(m[1], m[2], m[3]);
  }
  var head = t.slice(0, 3200);
  m = head.match(/\bFecha\s*:\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/i);
  if (m) return padFechaDMY(m[1], m[2], m[3]);
  return "";
}
function looksLikeSomeLabReport(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return false;
  var t = textoBruto;
  if (!/Expediente\s*:/i.test(t)) return false;
  if (!/Nombre\s*:/i.test(t)) return false;
  return /Fecha\s+Registro/i.test(t) || /HEMATOLOG[IÍ]A|QU[IÍ]MICA|BIOMETR[IÍ]A|GASOMETR[IÍ]A|BANCO\s+DE\s+SANGRE|TROPONINA/i.test(t);
}
function applyMeridiemHour(hh, meridiemRaw) {
  if (!meridiemRaw) return hh;
  var t = String(meridiemRaw).toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
  var isPm = t === "pm" || t === "p" || t.indexOf("pm") !== -1;
  var isAm = t === "am" || t === "a" || t.indexOf("am") !== -1;
  if (isPm && !isAm) {
    if (hh < 12) return hh + 12;
    return hh;
  }
  if (isAm && !isPm) {
    if (hh === 12) return 0;
    return hh;
  }
  return hh;
}
function horaFromFechaRegistroMatch(m) {
  if (!m) return "";
  var hh = parseInt(m[1], 10);
  var mm = parseInt(m[2], 10);
  if (!isFinite(hh) || !isFinite(mm)) return "";
  hh = applyMeridiemHour(hh, m[4]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
function extractLabReportHora(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var head = textoBruto.slice(0, 4e3);
  var m = head.match(
    /Fecha\s+Registro\s*:?[\s\t]*[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i
  );
  if (m) return horaFromFechaRegistroMatch(m);
  m = head.match(
    /Fecha\s+Registro\s*:?[\s\t]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*((?:a|p)\.?\s*m\.?|AM|PM)?/i
  );
  if (m) return horaFromFechaRegistroMatch(m);
  return "";
}
function putTrendRef_(refs, sectionKey, fieldKey, data) {
  if (!data || data.min == null || data.max == null) return;
  if (data.valor === "---" || data.valor == null) return;
  var min = Number(data.min);
  var max = Number(data.max);
  if (!isFinite(min) || !isFinite(max) || max <= min) return;
  if (!refs[sectionKey]) refs[sectionKey] = {};
  refs[sectionKey][fieldKey] = [min, max];
}
function someReportBlocks_(textoBruto) {
  var tNorm = textoBruto.replace(/\s+/g, " ");
  var mGaso = tNorm.match(
    /GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)/i
  );
  var bloqueGaso = mGaso ? mGaso[0] : "";
  var mLCR = textoBruto.match(/CITOQUIMICO\s+DE\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LIQ\.?\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i);
  var bloqueLCR = mLCR ? mLCR[0] : "";
  var bloqueCitoLC = bloqueCitoquimicoLiquidosFull(textoBruto);
  var mEGO = tNorm.match(
    /(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i
  );
  var bloqueEGO = mEGO ? mEGO[0] : "";
  var tSinLiqCorp = tNorm;
  if (bloqueCitoLC) {
    tSinLiqCorp = tNorm.replace(bloqueCitoLC.replace(/\r/g, "").replace(/\s+/g, " "), " ");
  }
  var textoQS = tSinLiqCorp.replace(bloqueGaso, " ").replace(bloqueEGO, " ").replace(bloqueLCR ? bloqueLCR.replace(/\s+/g, " ") : "", " ");
  var esSoloGaso = /GASOMETRIA/i.test(tNorm) && !/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);
  return { tNorm, tSinLiqCorp, textoQS, bloqueGaso, esSoloGaso };
}
function putBhTrendRefs_(refs, tNorm) {
  putTrendRef_(refs, "BH", "Hb", extraerConRango(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], tNorm));
  putTrendRef_(refs, "BH", "Hto", extraerConRango(["HCT ", "HEMATOCRITO"], tNorm));
  putTrendRef_(refs, "BH", "VCM", extraerConRango(["MCV ", "VCM "], tNorm));
  putTrendRef_(refs, "BH", "HCM", extraerConRango(["MCH ", "HCM "], tNorm));
  putTrendRef_(refs, "BH", "CHCM", extraerConRango(["MCHC", "CHCM"], tNorm));
  putTrendRef_(refs, "BH", "RDW", extraerConRango(["RDW "], tNorm));
  putTrendRef_(refs, "BH", "Leu", extraerConRango(["WBC "], tNorm));
  putTrendRef_(refs, "BH", "Neu", extraerConRango(["NEU "], tNorm));
  putTrendRef_(refs, "BH", "Eos", extraerConRango(["EOS "], tNorm));
  putTrendRef_(refs, "BH", "Lin", extraerConRango(["LYM ", "LINFOCITOS"], tNorm));
  putTrendRef_(refs, "BH", "Mono", extraerConRango(["MONO "], tNorm));
  putTrendRef_(refs, "BH", "Baso", extraerConRango(["BASO "], tNorm));
  putTrendRef_(refs, "BH", "Plt", extraerConRango(["PLT "], tNorm));
  putTrendRef_(refs, "BH", "MPV", extraerConRango(["MPV ", "VPM "], tNorm));
  putTrendRef_(refs, "BH", "RBC", extraerConRango(["RBC ", "ERITROCITOS", "HEMATIES"], tNorm));
  putTrendRef_(refs, "BH", "Ret", extraerConRango(["RETICULOCITOS"], tNorm));
  putTrendRef_(refs, "BH", "TP", extraerConRango(["TIEMPO DE PROTROMBINA"], tNorm));
  putTrendRef_(refs, "BH", "TTP", extraerConRango(["TIEMPO DE TROMBOPLASTINA"], tNorm));
  putTrendRef_(refs, "BH", "INR", extraerConRango(["INR ", "INR"], tNorm));
}
function putQsEscPfhTrendRefs_(refs, textoQS, tNorm) {
  putTrendRef_(refs, "QS", "Glu", extraerConRangoSuero(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], textoQS));
  putTrendRef_(refs, "QS", "Cr", extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], textoQS));
  putTrendRef_(refs, "QS", "BUN", extraerConRangoSuero(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], textoQS));
  putTrendRef_(refs, "QS", "PCR", extraerConRangoSuero(["PROTEINA C REACTIVA", "PROTE\xCDNA C REACTIVA"], textoQS));
  putTrendRef_(refs, "QS", "PCT", extraerProcalcitonina_(textoQS));
  putTrendRef_(refs, "QS", "AU", extraerConRangoSuero(["ACIDO URICO EN SANGRE", "ACIDO URICO", "\xC1CIDO \xDARICO"], textoQS));
  putTrendRef_(refs, "QS", "COL", extraerConRangoSuero(["COLESTEROL"], textoQS));
  putTrendRef_(refs, "QS", "HDL", extraerConRangoSuero(["COLESTEROL HDL", "HDL COLESTEROL"], textoQS));
  putTrendRef_(refs, "QS", "LDL", extraerConRangoSuero(["COLESTEROL LDL", "LDL COLESTEROL"], textoQS));
  putTrendRef_(refs, "QS", "VLDL", extraerConRangoSuero(["VLDL"], textoQS));
  putTrendRef_(refs, "QS", "TGL", extraerConRangoSuero(["TRIGLICERIDOS", "TRIGLIC\xC9RIDOS"], textoQS));
  putTrendRef_(refs, "QS", "IA", extraerIndiceAterogenico_(textoQS));
  putTrendRef_(
    refs,
    "QS",
    "CTHDL",
    extraerConRangoSuero(["COCIENTE COL.TOT/HDL", "COCIENTE COL.TOT / HDL", "COCIENTE COL TOT/HDL"], textoQS)
  );
  putTrendRef_(refs, "QS", "VSG", extraerConRangoSuero(["VSG ", "VELOCIDAD DE SEDIMENTACION"], textoQS));
  putTrendRef_(refs, "QS", "CPK", extraerConRangoSuero(["CPK CREATIN FOSFO QUINASA", "CPK "], textoQS));
  putTrendRef_(refs, "ESC", "Na", extraerConRangoSuero(["SODIO"], textoQS));
  putTrendRef_(refs, "ESC", "Cl", extraerConRangoSuero(["CLORO"], textoQS));
  putTrendRef_(refs, "ESC", "K", extraerConRangoSuero(["POTASIO"], textoQS));
  putTrendRef_(refs, "ESC", "Ca", extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], textoQS));
  putTrendRef_(refs, "ESC", "F", extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "F\xD3SFORO"], textoQS));
  putTrendRef_(refs, "ESC", "Mg", extraerConRangoSuero(["MAGNESIO"], textoQS));
  putTrendRef_(refs, "PFHs", "Alb", extraerConRangoSuero(["ALBUMINA"], tNorm));
  putTrendRef_(refs, "PFHs", "AST", extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], tNorm));
  putTrendRef_(refs, "PFHs", "ALT", extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], tNorm));
  putTrendRef_(refs, "PFHs", "FA", extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], tNorm));
  putTrendRef_(refs, "PFHs", "BT", extraerConRango(["BILIRRUBINA TOTAL"], tNorm));
  putTrendRef_(refs, "PFHs", "BD", extraerConRango(["BILIRRUBINA DIRECTA"], tNorm));
  putTrendRef_(refs, "PFHs", "BI", extraerConRango(["BILIRRUBINA INDIRECTA"], tNorm));
  putTrendRef_(refs, "PFHs", "LDH", extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH DESHIDROGENASA LAC", "LDH "], tNorm));
  putTrendRef_(refs, "PFHs", "Amil", extraerConRango(["AMILASA SERICA", "AMILASA"], tNorm));
  putTrendRef_(refs, "LIPASA", "Lip", extraerConRango(["LIPASA SERICA", "LIPASA "], textoQS));
}
function putTropTrendRefs_(refs, textoBruto) {
  var tropHits = extractAllTroponinaFromText_(textoBruto);
  if (!tropHits.length) return;
  var tropMax = TROPONINA_HS_NORMAL_MAX_NG_L;
  var tropMin = 0;
  var first = tropHits[0];
  if (first.max != null && first.min != null && first.max > first.min) {
    tropMin = first.min;
    tropMax = first.max;
  }
  putTrendRef_(refs, "TROP", "TnI1", { valor: first.valor, min: tropMin, max: tropMax });
  if (tropHits.length > 1) {
    var last = tropHits[tropHits.length - 1];
    putTrendRef_(refs, "TROP", "TnI2", { valor: last.valor, min: tropMin, max: tropMax });
  }
}
function putGasoTrendRefs_(refs, bloqueGaso) {
  if (!bloqueGaso) return;
  putTrendRef_(refs, "GASES", "pH", extraerConRango(["PH "], bloqueGaso));
  putTrendRef_(refs, "GASES", "pCO2", extraerConRango(["PCO2"], bloqueGaso));
  putTrendRef_(refs, "GASES", "pO2", extraerConRango(["PO2 "], bloqueGaso));
  putTrendRef_(refs, "GASES", "Na", extraerConRango(["SODIO"], bloqueGaso));
  putTrendRef_(refs, "GASES", "K", extraerConRango(["POTASIO"], bloqueGaso));
  putTrendRef_(refs, "GASES", "GLU", extraerConRango(["GLUCOSA"], bloqueGaso));
  putTrendRef_(refs, "GASES", "Lactato", extraerConRango(["LACTATO"], bloqueGaso));
  putTrendRef_(refs, "GASES", "Bica", extraerConRango(["HCO3"], bloqueGaso));
  putTrendRef_(refs, "GASES", "Hto", extraerConRango(["HCT ", "HEMATOCRITO"], bloqueGaso));
  var iCaData = extraerConRango(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], bloqueGaso);
  putTrendRef_(refs, "GASES", "iCa", {
    valor: iCaData.valor,
    min: iCaData.min != null ? iCaData.min : 1.12,
    max: iCaData.max != null ? iCaData.max : 1.32
  });
}
function buildRefsBySectionFromReport(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return {};
  var blocks = someReportBlocks_(textoBruto);
  var refs = {};
  if (!blocks.esSoloGaso) {
    putBhTrendRefs_(refs, blocks.tSinLiqCorp);
    putQsEscPfhTrendRefs_(refs, blocks.textoQS, blocks.tSinLiqCorp);
  }
  putTropTrendRefs_(refs, textoBruto);
  putGasoTrendRefs_(refs, blocks.bloqueGaso);
  return refs;
}

// public/js/patient-merge.mjs
function parseDateDMY(value) {
  const t = String(value || "").trim();
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2e3;
  const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? null : d;
}
function docTimestamp(fecha, hora) {
  const d = parseDateDMY(fecha);
  if (!d) return "";
  const hm = String(hora || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (hm) d.setHours(parseInt(hm[1], 10), parseInt(hm[2], 10), 0, 0);
  return d.toISOString();
}
function labSetTimestamp(set) {
  if (!set) return "";
  if (set.updatedAt) return String(set.updatedAt);
  const n = Number(set.id);
  if (!isNaN(n) && n > 1e11) return new Date(n).toISOString();
  return docTimestamp(set.fecha, set.hora);
}
function bestRecordedAtFromHistorial(hist, best) {
  let max = best;
  for (let i = 0; i < hist.length; i += 1) {
    const row = hist[i];
    if (!row || typeof row !== "object") continue;
    const ra = (
      /** @type {any} */
      row.recordedAt != null ? String(
        /** @type {any} */
        row.recordedAt
      ) : ""
    );
    if (ra && compareIso(ra, max) > 0) max = ra;
  }
  return max;
}
function monitoreoUpdatedAt(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return "";
  let best = "";
  const m = monitoreo;
  const ecAt = m.estadoClinicoUpdatedAt != null && String(m.estadoClinicoUpdatedAt).trim() ? String(m.estadoClinicoUpdatedAt) : "";
  if (ecAt) best = ecAt;
  const tg = m.textoGuardado && typeof m.textoGuardado === "object" ? m.textoGuardado : null;
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) {
    const saved = String(tg.savedAt);
    if (compareIso(saved, best) > 0) best = saved;
  }
  const hist = Array.isArray(m.historial) ? m.historial : [];
  return bestRecordedAtFromHistorial(hist, best);
}
function estadoClinicoHasContent(ec) {
  const template = emptyEstadoClinico();
  for (const key of Object.keys(template)) {
    if (String(ec[key] || "").trim()) return true;
  }
  return false;
}
function confirmadoHasContent(conf) {
  for (const key of Object.keys(conf)) {
    if (conf[key]) return true;
  }
  return false;
}
function monitoreoTextoGuardadoHasPayload(tg) {
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) return true;
  return !!String(tg?.text || "").trim();
}
function monitoreoHasLanPayload(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return false;
  return monitoreoHasHistorialOrText(monitoreo) || monitoreoHasClinicalFlags(monitoreo);
}
function monitoreoHasHistorialOrText(monitoreo) {
  const m = monitoreo;
  if (Array.isArray(m.historial) && m.historial.length > 0) return true;
  const tg = m.textoGuardado && typeof m.textoGuardado === "object" ? m.textoGuardado : null;
  return !!(tg && monitoreoTextoGuardadoHasPayload(tg));
}
function monitoreoHasClinicalFlags(monitoreo) {
  const m = monitoreo;
  const ec = m.estadoClinico && typeof m.estadoClinico === "object" ? m.estadoClinico : null;
  if (ec && estadoClinicoHasContent(ec)) return true;
  if (hasPendingEaProposals(m.pendienteReceta)) return true;
  const conf = m.confirmado && typeof m.confirmado === "object" ? m.confirmado : null;
  return !!(conf && confirmadoHasContent(conf));
}
function labSetHasSomeSource(set) {
  return looksLikeSomeLabReport(String(set && set.sourceText || ""));
}
function pickSomeSourceText(a, b) {
  const as = labSetHasSomeSource(a) ? String(a.sourceText || "") : "";
  const bs = labSetHasSomeSource(b) ? String(b.sourceText || "") : "";
  if (as && bs) {
    return compareIso(labSetTimestamp(b), labSetTimestamp(a)) >= 0 ? bs : as;
  }
  return as || bs;
}
function mergeLabSetPreferSome(cur, incoming) {
  if (!cur) return { ...incoming };
  const incomingNewer = compareIso(labSetTimestamp(incoming), labSetTimestamp(cur)) >= 0;
  const newer = incomingNewer ? incoming : cur;
  const older = incomingNewer ? cur : incoming;
  const out = { ...newer };
  const src = pickSomeSourceText(cur, incoming);
  if (!src) return out;
  out.sourceText = src;
  if (!labSetHasSomeSource(newer) && labSetHasSomeSource(older)) {
    if (Array.isArray(older.resLabs)) out.resLabs = older.resLabs;
    if (older.bhExtras) out.bhExtras = older.bhExtras;
  }
  return out;
}
function mergeLabHistorySets(a, b) {
  const map = /* @__PURE__ */ new Map();
  for (const s of a || []) {
    if (!s || !s.id) continue;
    map.set(String(s.id), { ...s });
  }
  for (const s of b || []) {
    if (!s || !s.id) continue;
    const id = String(s.id);
    const cur = map.get(id);
    map.set(id, mergeLabSetPreferSome(cur, s));
  }
  return stripDuplicateLabSets(Array.from(map.values())).sets;
}

// public/js/features/estado-actual-data.mjs
function backfillEstadoClinico(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  var template = emptyEstadoClinico();
  var ec = monitoreo.estadoClinico;
  if (!ec || typeof ec !== "object") {
    monitoreo.estadoClinico = Object.assign({}, template);
  } else {
    Object.keys(template).forEach(function(k) {
      if (ec[k] == null) ec[k] = template[k];
    });
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") {
    monitoreo.pendienteReceta = emptyPendienteReceta();
  } else {
    Object.keys(template).forEach(function(k) {
      if (monitoreo.pendienteReceta[k] == null) monitoreo.pendienteReceta[k] = "";
    });
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") {
    monitoreo.confirmado = {
      dieta: !!String(monitoreo.estadoClinico.dieta || "").trim()
    };
  } else if (monitoreo.confirmado.dieta == null || monitoreo.confirmado.dieta === false) {
    monitoreo.confirmado.dieta = !!String(monitoreo.estadoClinico.dieta || "").trim();
  }
  for (var mk of MED_FIELD_KEYS) {
    if (monitoreo.confirmado[mk] == null) monitoreo.confirmado[mk] = false;
  }
}
function isIoNumericValue2(v) {
  return isIoNumericValue(v);
}
function compareSavedAt2(a, b) {
  if ((a == null || a === "") && (b == null || b === "")) return 0;
  if (a == null || a === "") return -1;
  if (b == null || b === "") return 1;
  return String(a).localeCompare(String(b));
}
function ensureMonitoreo(patient) {
  if (!patient || typeof patient !== "object") return patient;
  if (!/** @type {any} */
  patient.monitoreo) {
    patient.monitoreo = emptyMonitoreo();
  }
  backfillEstadoClinico(
    /** @type {any} */
    patient.monitoreo
  );
  return patient;
}
function migratePatientMonitoreo(patient) {
  if (!patient || typeof patient !== "object") return false;
  var p = patient;
  ensureMonitoreo(p);
  var leg = p.estadoActual;
  var hadLegacyKey = Object.prototype.hasOwnProperty.call(p, "estadoActual");
  if (!leg || typeof leg !== "object") {
    delete p.estadoActual;
    return hadLegacyKey;
  }
  var tg = p.monitoreo.textoGuardado;
  var legText = typeof leg.text === "string" ? leg.text : leg.text != null ? String(leg.text) : "";
  var legSaved = leg.savedAt != null ? String(leg.savedAt) : null;
  if (compareSavedAt2(legSaved, tg.savedAt) > 0) {
    tg.text = legText;
    tg.savedAt = legSaved;
  } else if ((!tg.text || tg.text === "") && !(tg.savedAt != null && String(tg.savedAt).length > 0) && legText) {
    tg.text = legText;
    tg.savedAt = legSaved != null ? legSaved : tg.savedAt;
  }
  delete p.estadoActual;
  return true;
}
function mergeIncomingMonitoreo(target, sourceMonitoreo) {
  var incoming = JSON.parse(JSON.stringify(sourceMonitoreo));
  var localHasPayload = target.monitoreo != null && typeof target.monitoreo === "object" && monitoreoHasLanPayload(target.monitoreo);
  var incomingHasPayload = monitoreoHasLanPayload(incoming);
  if (!incomingHasPayload && localHasPayload) {
    return;
  }
  if (target.monitoreo != null && typeof target.monitoreo === "object") {
    target.monitoreo = mergeMonitoreo(target.monitoreo, incoming);
  } else if (incomingHasPayload) {
    target.monitoreo = incoming;
  }
}
function mergePatientMonitoreoFromImported(target, source) {
  if (!target || typeof target !== "object") return false;
  if (!source || typeof source !== "object") return migratePatientMonitoreo(target);
  var s = source;
  var t = target;
  try {
    if ("monitoreo" in s && s.monitoreo != null && typeof s.monitoreo === "object") {
      mergeIncomingMonitoreo(t, s.monitoreo);
    }
    if ("estadoActual" in s && s.estadoActual != null && typeof s.estadoActual === "object") {
      t.estadoActual = JSON.parse(JSON.stringify(s.estadoActual));
    }
  } catch (_e) {
    void _e;
  }
  return migratePatientMonitoreo(target);
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
function overlayVitalsFromSeries(snap) {
  var series = snap.vitalSeries;
  if (!series || typeof series !== "object") return;
  var hasSeries = VITAL_BASE_KEYS.some(function(k) {
    return Array.isArray(series[k]) && series[k].length > 0;
  });
  if (!hasSeries) return;
  var leg = vitalSeriesToLegacyFields(
    /** @type {Record<string, Array<{ value: number, time?: string }>>} */
    series
  );
  Object.keys(leg.vitals).forEach(function(k) {
    if (leg.vitals[k] != null) snap.vitals[k] = leg.vitals[k];
  });
  Object.keys(leg.alteredAt).forEach(function(k) {
    if (leg.alteredAt[k]) snap.alteredAt[k] = leg.alteredAt[k];
  });
}
function deriveSnapshot(monitoreoLike) {
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  var snap = {
    vitals: {},
    alteredAt: {},
    glucometrias: (
      /** @type {Array<{ value?: unknown, time?: string }>} */
      []
    ),
    io: (
      /** @type {{ ing: null | unknown, egr: null | unknown }} */
      { ing: null, egr: null }
    )
  };
  var vitalsBlock = deriveVitalsFromHistorial_(sortedAsc);
  var gluBlock = deriveGluFromHistorial_(sortedAsc);
  snap.vitals = vitalsBlock.vitals;
  snap.alteredAt = vitalsBlock.alteredAt;
  snap.glucometrias = gluBlock.glucometrias.slice();
  snap.bombaInsulina = gluBlock.bombaInsulina;
  snap.bombaInsulinaAlgoritmo = m.bombaInsulinaAlgoritmo != null && Number.isFinite(Number(m.bombaInsulinaAlgoritmo)) ? Number(m.bombaInsulinaAlgoritmo) : null;
  snap.io = deriveIoFromHistorial_(sortedAsc);
  snap.vitalSeries = deriveVitalSeriesFromHistorial_(sortedAsc);
  snap.tempPeakAt = deriveTempPeakAtFromHistorial_(sortedAsc);
  snap.bpPairs = deriveBpPairsFromHistorial_(sortedAsc);
  overlayVitalsFromSeries(snap);
  return snap;
}
function balanceTurno(monitoreoLike) {
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  for (var i = sortedAsc.length - 1; i >= 0; i--) {
    var row = sortedAsc[i];
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
    var bal = computeIoBalanceFromIngEgr(io.ing, io);
    if (!Number.isFinite(bal)) continue;
    return bal;
  }
  return NaN;
}
function balanceGlobalHistorico(monitoreoLike) {
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  var sum = 0;
  var any = false;
  for (var i = 0; i < sortedAsc.length; i++) {
    var row = sortedAsc[i];
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
    var bal = computeIoBalanceFromIngEgr(io.ing, io);
    if (!Number.isFinite(bal)) continue;
    sum += bal;
    any = true;
  }
  return any ? sum : NaN;
}
function resolveMonitoreoContainer(patientOrMonitoreo) {
  var tgt = patientOrMonitoreo;
  if (!tgt || typeof tgt !== "object") return null;
  if (Array.isArray(tgt.historial)) return tgt;
  if (tgt.monitoreo && typeof tgt.monitoreo === "object" && Array.isArray(tgt.monitoreo.historial))
    return tgt.monitoreo;
  tgt.monitoreo = emptyMonitoreo();
  return tgt.monitoreo;
}
function appendMedicion(patientOrMonitoreo, medicion) {
  if (!medicion || typeof medicion !== "object") return { ok: false, error: "empty" };
  var mon = resolveMonitoreoContainer(patientOrMonitoreo);
  if (!mon) return { ok: false, error: "empty" };
  mon.historial.push(structuredClone(
    /** @type {object} */
    medicion
  ));
  return { ok: true };
}
function removeMedicion(patientOrMonitoreo, id) {
  var mon = resolveMonitoreoContainer(patientOrMonitoreo);
  if (!mon || !Array.isArray(mon.historial)) return;
  mon.historial = mon.historial.filter(function(row) {
    return row && typeof row === "object" && /** @type {any} */
    row.id !== id;
  });
}
function parseWeightKg(raw) {
  if (raw == null || raw === "") return null;
  var n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
function resolveDietWeightKg(opts) {
  opts = opts || {};
  return parseWeightKg(opts.patientPeso) ?? parseWeightKg(opts.pesoRef);
}
function normalizeDietaTypeLabel(dietaText) {
  return String(dietaText || "").trim().replace(/\s+/g, " ").replace(/^[*•-]+\s*/g, "").replace(/\s*[*•-]+$/g, "").toUpperCase().replace(/^DIETA\s+/, "");
}
function stripDietaMacroSuffixFromLabel(dietaText) {
  return normalizeDietaTypeLabel(dietaText).replace(
    /\s*\(\s*\d+\s*KCAL(?:\s*,\s*\d+\s*G\s*PROT)?[^)]*\)\s*$/i,
    ""
  ).trim();
}
function isDietaAyuno(dietaText) {
  return normalizeDietaTypeLabel(dietaText) === "AYUNO";
}
function isDietaSuplemento(dietaText) {
  var t = normalizeDietaTypeLabel(dietaText);
  if (!t) return false;
  if (t === "SUPLEMENTO") return true;
  if (/\bALIMENTACI[OÓ]N\b/.test(t) && /\bSUPLEMENTO\b/.test(t)) return true;
  if (!t.startsWith("SUPLEMENTO")) return false;
  return !/\b(NORMAL|BLANDA|LIQUIDA|LIQUID[OA]|PICAD[OA]|DIABETIC[OA]|HIPERPROTEIC[OA]|RESTRINGID[OA])\b/.test(t);
}
function isDietaParenteral(dietaText) {
  var t = normalizeDietaTypeLabel(dietaText);
  if (!t) return false;
  if (/\bPARENTERAL\b/.test(t)) return true;
  if (/\bNPT\b/.test(t)) return true;
  if (/\bKAVIBEN\b/.test(t)) return true;
  if (/\bSMOFKABIVEN\b/.test(t)) return true;
  if (/\bOLICLINOMEL\b/.test(t)) return true;
  return false;
}
function clearDietCaloricFields(record) {
  if (!record || typeof record !== "object") return;
  DIET_CALORIC_KEYS.forEach(function(k) {
    record[k] = "";
  });
}
function applyDietaSuplementoPolicy(estadoClinico, pendienteReceta) {
  if (!estadoClinico || typeof estadoClinico !== "object") return false;
  if (!isDietaSuplemento(estadoClinico.dieta) && !isDietaAyuno(estadoClinico.dieta)) return false;
  clearDietCaloricFields(estadoClinico);
  if (pendienteReceta && typeof pendienteReceta === "object") {
    clearDietCaloricFields(pendienteReceta);
  }
  return true;
}
function computeDietKcalTotal(kcalKg, weightKg) {
  var k = Number(kcalKg);
  if (!Number.isFinite(k) || k <= 0 || weightKg == null) return null;
  return Math.round(k * weightKg);
}
function computeDietKcalKgFromTotal(kcalTotal, weightKg) {
  var t = Number(kcalTotal);
  if (!Number.isFinite(t) || t <= 0 || weightKg == null || weightKg <= 0) return null;
  return Math.round(t / weightKg * 10) / 10;
}
function syncDietKcalFromWeight(estadoClinico, weightKg) {
  if (!estadoClinico || typeof estadoClinico !== "object" || weightKg == null) return false;
  if (isDietaSuplemento(estadoClinico.dieta) || isDietaParenteral(estadoClinico.dieta)) return false;
  var total = computeDietKcalTotal(estadoClinico.kcalKg, weightKg);
  if (total == null) return false;
  estadoClinico.kcal = String(total);
  return true;
}

// public/js/features/estado-actual-meds-core.mjs
var DIET_PENDING_KEYS2 = (
  /** @type {const} */
  ["dieta", "kcal", "proteinG"]
);
function resolveManejoFechaActualizacion(activeId, medRecetaByPatient) {
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  return block && block.fechaActualizacion ? String(block.fechaActualizacion).trim() : "";
}
function formatTodayDMY(refDate) {
  var d = refDate instanceof Date ? refDate : /* @__PURE__ */ new Date();
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}
function resolveEaAbxFechaActualizacion(activeId, medRecetaByPatient, monitoreo) {
  var manejo = resolveManejoFechaActualizacion(activeId, medRecetaByPatient);
  if (manejo) return manejo;
  if (monitoreo && monitoreo.abxDiaAnchorDate) {
    return String(monitoreo.abxDiaAnchorDate).trim();
  }
  return "";
}
function ensureAbxDiaAnchorDate(monitoreo, activeId, medRecetaByPatient, refDate) {
  if (!monitoreo || typeof monitoreo !== "object") return;
  var manejo = resolveManejoFechaActualizacion(activeId, medRecetaByPatient);
  if (manejo) {
    monitoreo.abxDiaAnchorDate = manejo;
    return;
  }
  if (monitoreo.abxDiaAnchorDate && String(monitoreo.abxDiaAnchorDate).trim()) return;
  monitoreo.abxDiaAnchorDate = formatTodayDMY(refDate);
}
function ensureRecetaProposalDismissed(monitoreo) {
  if (!monitoreo.recetaProposalDismissed || typeof monitoreo.recetaProposalDismissed !== "object") {
    monitoreo.recetaProposalDismissed = {};
  }
  return (
    /** @type {Record<string, boolean>} */
    monitoreo.recetaProposalDismissed
  );
}
function isRecetaProposalDismissed(monitoreo, key) {
  var dismissed = monitoreo && monitoreo.recetaProposalDismissed;
  return dismissed && typeof dismissed === "object" && dismissed[key];
}
function clearRecetaProposalDismissed(monitoreo) {
  if (monitoreo && monitoreo.recetaProposalDismissed) {
    delete monitoreo.recetaProposalDismissed;
  }
}
function clearRecetaProposalDismissedKey(monitoreo, key) {
  if (!monitoreo || !key || !monitoreo.recetaProposalDismissed) return;
  delete monitoreo.recetaProposalDismissed[key];
}
function hasPendingEaProposals(pendienteReceta) {
  var pend = pendienteReceta && typeof pendienteReceta === "object" ? pendienteReceta : {};
  if (DIET_PENDING_KEYS2.some(function(k) {
    return pend[k] && String(pend[k]).trim();
  })) {
    return true;
  }
  return MED_FIELD_KEYS.some(function(k) {
    return pend[k] && String(pend[k]).trim();
  });
}

export {
  advanceAbxMedTextForManejoDate,
  effectiveDiaTratamiento,
  rewriteAbxDisplayText,
  isNutritionMedicationItem,
  listDietCandidates,
  collectDietasFromRecetaBlock,
  buildDietProposalText,
  applyMedCatalogOverlay,
  normalizeNombreForSoapClassify,
  isInsulinIvMedicationItem,
  detectInsulinPumpAlgorithmFromRecetaItems,
  detectInsulinPumpAlgorithmFromRecetaBlock,
  patientHasInsulinPumpInReceta,
  formatInsulinPumpAlgoritmoLabel,
  insulinPumpAlgorithmForMedicationItem,
  insulinPumpMedLabelHtml,
  dosisBeforeSlash3 as dosisBeforeSlash,
  formatMedicationEgresoLine,
  buildMedRecetaCopyText,
  formatMedicationSoapShort,
  buildMedRecetaNameOnlyText,
  isInsulinRescateMedicationItem,
  insulinRescateItemsFromList,
  SOAP_DESTINATION_KEYS,
  SOAP_DESTINATION_LABELS,
  mapSoapDestKeyToEaField,
  soapDestinationSelectOptionsHtml,
  effectiveSoapCategory,
  soapDestinationUiValue,
  unassignedOtrosSoapItems,
  shouldIncludeMedicationInSoap,
  classifyMedicationSoapCategory,
  parseIndicacionesPaste,
  looksLikeSomeIndicacionesPaste,
  shouldAutoSelectSoap,
  resolveFechaActualizacion,
  applySomePharmCatalogOverlay,
  listSomePharmFilterLabels,
  isSomePharmCategoryLabel,
  rowSomePharmCategory,
  assignSomePharmCategory,
  assignSomePharmCategories,
  getVitalExtraStorageKey,
  pushVitalReading,
  MAX_VITAL_READINGS_PER_DAY2 as MAX_VITAL_READINGS_PER_DAY,
  MAX_VITAL_LAYERS_IN_FORM,
  vitalSeriesFromMedicion,
  vitalSeriesToLegacyFields,
  collectVitalReadingsInRegistroWindow,
  MED_FIELD_KEYS,
  buildEaMonitoreoRevision,
  registroForPatientId,
  resolveCloudTodoLocalPatientId,
  stampCloudTodoRow,
  buildLiveSyncPatientIdMap,
  mergeTodoListsById,
  remapAgendaPatientIds,
  DIET_PENDING_KEYS2 as DIET_PENDING_KEYS,
  resolveEaAbxFechaActualizacion,
  ensureAbxDiaAnchorDate,
  clearRecetaProposalDismissed,
  clearRecetaProposalDismissedKey,
  hasPendingEaProposals,
  hasActiveDietProposal,
  backfillDietPendingMacrosFromReceta,
  getDietOptions,
  selectDietOption,
  markDietAsManuallyConfirmed,
  skipRecetaItemForInsulinPumpCarrier,
  INSULIN_RESCATE_GROUP_ID,
  INSULIN_RESCATE_NM_LABEL,
  insulinRescateMedLabelHtml,
  isInsulinRescateGroupSoapSelected,
  isInsulinRescateGroupSuspended,
  isInsulinPrandialMedicationItem,
  insulinPrandialItemsFromList,
  INSULIN_PRANDIAL_GROUP_ID,
  insulinPrandialNmSoapFragment,
  insulinPrandialMedLabelHtml,
  isInsulinPrandialGroupSoapSelected,
  isInsulinPrandialGroupSuspended,
  medInstructionFragmentForSoap,
  bucketsFromRecetaItems,
  pruneEstadoClinicoMedsFromReceta,
  buildMedDropdownOptions,
  applyDietProposalFromRecetaBlock,
  estadoClinicoForDisplay,
  estadoClinicoForText,
  syncConfirmedAbxFromReceta,
  syncRecetaProposalsFromSoapSelection,
  applyRecetaProposal,
  confirmMedField,
  discardMedProposal,
  confirmDietProposal,
  discardDietProposal,
  confirmAllMedProposals,
  tendEligibleSectionKey,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  parseFechaLabToMs,
  sortLabHistoryChronological,
  getSetTrendValueForSeries,
  columnSetsForFields,
  dedupeTrendSetsForSeries,
  buildTrendAxisMeta,
  buildTendChartLabels,
  BH_PANEL_FAMILIES,
  familyOrderForSection,
  migratePanelFamilyKey,
  classifyTendPanelFamily,
  isPercentPanelFamily,
  colKeyForTrendSet,
  formatTrendColumnHeader,
  formatTendSeriesLabel,
  buildSectionTableModel,
  TREND_SPARK_WINDOW,
  TREND_DETAIL_DOWNSAMPLE,
  TREND_REFRESH_DEBOUNCE_MS,
  onLabHistoryRevision,
  bumpLabHistoryRevision,
  getLabHistoryRevision,
  getTrendRenderWindow,
  trendCatalogSeriesKey,
  buildTrendSeriesIndexCached,
  extractMedBaseName,
  buildMedPharmMedGroupKey,
  monthKeyFromParts,
  splitMonthAt,
  dayValueInMap,
  isMedPharmRowHidden,
  toggleNotAdmin,
  formatFreqShort,
  formatViaShort,
  looksLikeSomePharmMonthPaste,
  parseSomePharmMonthPaste,
  mergeRecetaIntoMonth,
  applySomePasteToProfile,
  getMonthFromProfile,
  profileHasMonthData,
  monthHasData,
  deleteMonthFromProfile,
  ensureMonthOnProfile,
  stampPatientRegistrationMeta,
  mergePatientRegistrationMeta,
  accesoFechaToDateInputValue,
  dateInputValueToAccesoFecha,
  formatAccesoFechaDisplay,
  ensurePatientAccesos,
  syncLegacyAccesoFields,
  formatAccesosForCenso,
  parseDiagnosticosText,
  formatDiagnosticosCopy,
  ensurePatientDiagnosticos,
  diagnosticosTextForCenso,
  migratePatientDiagnosticosFromVpo,
  applyPatientDiagnosticosList,
  preloadNoteDxFromPatient,
  syncNoteDxFromPatient,
  ensureNoteDxFromPatientForExport,
  stampCensoFieldsClock,
  mergeCensoPatientFields,
  pushDiagnosticosToPatient,
  toClinicalHistoryText,
  filterNewEventualidades,
  mergeEventualidades,
  normalizeLabLine,
  gasometriaFingerprintFromResLabs,
  areLabSetsEquivalent,
  compareLabSetIdForDedupe,
  findExactDuplicateLabGroups,
  stripDuplicateLabSets,
  findNormalizedSourceDuplicateGroups,
  findConflictingSameDateTimeGroups,
  findLabSetsByDateTime,
  planLabHistoryDateTimeUpsert,
  collectPriorRefsFromHistory,
  mergeRefsBySection_,
  mergeGasRefs_,
  extraerConRangoPanel,
  fmtLabRanged_,
  mergeTroponinaResLabRows_,
  normalizeTropTrendFields_,
  parseTroponina_,
  buildEgfrPatientCtx,
  computeAnionGapValue_,
  computeAlbuminCorrectedAnionGapValue_,
  computeUrinaryAnionGapValue_,
  parseFluidLeu_,
  parsePmnField_,
  isGramNegative_,
  gramIsPositive_,
  lcrBlocksNormText_,
  parseLcrParsed,
  parsearLCR,
  parseGaso_,
  labSectionKey_,
  dedupeSingletonSections_,
  reprocessLabResultLines_,
  parsePIE_,
  sortTrendSpecsBySomeOrder,
  bhTrendDisplayTitle,
  parseBhTrendValuesFromResLab,
  formatBhExtrasDisplayLine,
  mergeCoagResLabRows_,
  parseBH_,
  mergeBhResLabRows_,
  parseQS_,
  parseESC_,
  parsePFH_,
  parseLipasa_,
  mergeQsResLabRows_,
  mergeEscResLabRows_,
  mergePfhResLabRows_,
  mergeLipasaResLabRows_,
  parseFisicoquimicoHeces_,
  parseFrotisSangre_,
  parsePlaquetasCitrato_,
  parseSerologiaBancoSangre_,
  parseCuantOrina_,
  bloqueCitoquimicoLiquidosFull,
  computeGasaValue_,
  resolveSerumGlucoseForInterpret_,
  resolveSerumAlbuminForGasa_,
  resLabsHasAsciticFluid_,
  resLabsHasPleuralFluid_,
  parseCitoquimicoLiquidosParsed,
  parsearCitoquimicoLiquidos,
  extractLabReportFechaDMY,
  looksLikeSomeLabReport,
  extractLabReportHora,
  buildRefsBySectionFromReport,
  labSetTimestamp,
  monitoreoUpdatedAt,
  mergeLabHistorySets,
  isIoNumericValue2 as isIoNumericValue,
  ensureMonitoreo,
  migratePatientMonitoreo,
  mergePatientMonitoreoFromImported,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  appendMedicion,
  removeMedicion,
  resolveDietWeightKg,
  isDietaAyuno,
  isDietaSuplemento,
  isDietaParenteral,
  applyDietaSuplementoPolicy,
  computeDietKcalTotal,
  computeDietKcalKgFromTotal,
  syncDietKcalFromWeight
};
//# sourceMappingURL=/js/chunks/chunk-HDD2EUC6.js.map
