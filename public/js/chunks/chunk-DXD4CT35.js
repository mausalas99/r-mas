import {
  ensureStorageHydrated,
  isMeaningfulLabHistorySet,
  normalizeLabHistoryPatientSets,
  storage
} from "/js/chunks/chunk-JQY6DQWH.js";
import {
  migratePatientsClinicalSala
} from "/js/chunks/chunk-IYRQG3WP.js";

// public/js/med-receta-core.mjs
function trimStr(v) {
  return String(v == null ? "" : v).trim();
}
function parseFechaDMYFromTimestampCell(cell) {
  var t = trimStr(cell);
  var m = t.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return m ? m[1] : "";
}
function normalizeDiaMarkerText(s) {
  return String(s == null ? "" : s).replace(/\u2217/g, "*").replace(/\u204E/g, "*").replace(/\uFF0A/g, "*").replace(/\u00B7/g, " ");
}
function extractDiaTratamiento(dosisRaw) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  var m = t.match(/DIA\s*#\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
function setDiaTratamientoInDosis(dosisRaw, dia) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  if (!/DIA\s*#\s*\d+/i.test(t)) return trimStr(dosisRaw);
  var n = parseInt(dia, 10);
  if (!Number.isFinite(n) || n < 1) return trimStr(dosisRaw);
  return t.replace(/(\*?\s*DIA\s*#\s*)\d+(\s*\*?)/i, function(_m, pre, post) {
    return pre + String(n) + post;
  });
}
function incrementMedItemsDiaTratamiento(items) {
  var list = Array.isArray(items) ? items : [];
  var count = 0;
  var next = list.map(function(it) {
    if (!it || it.suspendido || it.diaTratamiento == null) return it;
    var diaNext = it.diaTratamiento + 1;
    count += 1;
    return Object.assign({}, it, {
      diaTratamiento: diaNext,
      dosisRaw: setDiaTratamientoInDosis(it.dosisRaw, diaNext)
    });
  });
  return { items: next, count };
}
function stripDiaMarkersFromDosis(dosisPart) {
  var t = normalizeDiaMarkerText(String(dosisPart || ""));
  return trimStr(
    t.replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, "").replace(/\s+/g, " ")
  );
}
var INDICACIONES_MED_CLASSES = { MEDICAMENTOS: 1, "MEDICAMENTOS P2": 1 };
function normalizeNutrientText(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
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
function dietNutrientBlobFromCols(cols) {
  return [cols[2], cols[4], cols[5]].map(trimStr).filter(Boolean).join(" ");
}
function mergeDietaItems(dietas) {
  var list = Array.isArray(dietas) ? dietas : [];
  var parts = [];
  var kcal = null;
  var proteinG = null;
  for (var i = 0; i < list.length; i += 1) {
    var d = list[i];
    if (!d) continue;
    var desc = trimStr(d.descripcionRaw);
    if (desc) parts.push(desc);
    if (d.kcal != null) kcal = d.kcal;
    if (d.proteinG != null) proteinG = d.proteinG;
  }
  return { descripcion: parts.join(" \xB7 "), kcal, proteinG };
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
  var detalleRaw = trimStr(cols[4]) || trimStr(cols[5]);
  var nutrients = extractDietNutrients(dietNutrientBlobFromCols(cols));
  return {
    id: "dieta-" + Date.now().toString(36) + "-" + lineIndex,
    descripcionRaw: trimStr(cols[2]),
    detalleRaw,
    kcal: nutrients.kcal,
    proteinG: nutrients.proteinG,
    suspendido: false
  };
}
function parseIndicacionesPaste(text) {
  var lines = String(text || "").split(/\r?\n/).map(trimStr).filter(Boolean);
  var items = [];
  var dietas = [];
  var fechas = [];
  var skipped = 0;
  var skippedSummary = { cuidados: 0, estudios: 0, other: 0 };
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split("	");
    var tipoEarly = cols.length >= 2 ? trimStr(cols[1]).toUpperCase() : "";
    if (cols.length < 7) {
      if (cols.length >= 6 && (tipoEarly === "DIETAS" || INDICACIONES_MED_CLASSES[tipoEarly])) {
        while (cols.length < 7) cols.push("");
      } else {
        skipped += 1;
        skippedSummary.other += 1;
        continue;
      }
    }
    var tipo = trimStr(cols[1]).toUpperCase();
    var fd = parseFechaDMYFromTimestampCell(cols[0]);
    if (fd) fechas.push(fd);
    if (INDICACIONES_MED_CLASSES[tipo]) {
      items.push(parseMedRow(cols, i, lines[i]));
      continue;
    }
    if (tipo === "DIETAS") {
      dietas.push(parseDietaRow(cols, i));
      continue;
    }
    skipped += 1;
    if (tipo === "CUIDADOS") skippedSummary.cuidados += 1;
    else if (tipo === "ESTUDIOS") skippedSummary.estudios += 1;
    else skippedSummary.other += 1;
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
  if (!raw.trim() || !/\t/.test(raw)) return false;
  var lines = raw.split(/\r?\n/).map(trimStr).filter(Boolean);
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split("	");
    if (cols.length < 7) continue;
    var tipo = trimStr(cols[1]).toUpperCase();
    if (tipo === "MEDICAMENTOS" || tipo === "MEDICAMENTOS P2" || tipo === "DIETAS") return true;
  }
  return false;
}
function shouldAutoSelectSoap(item) {
  if (!item || item.suspendido) return false;
  var nombre = trimStr(item.nombreRaw);
  if (classifyMedicationSoapCategory(nombre, item.dosisRaw) !== "otros") return true;
  var blob = normalizeNombreForSoapClassify(
    [nombre, item.dosisRaw, item.frecuenciaRaw].join(" ")
  );
  if (/\bINSULINA\b/.test(blob)) return true;
  if (/\b(GLARGINA|DEGLUDEC|DETEMIR|HUMANA\s+RAPIDA|NPH)\b/.test(blob)) return true;
  if (/\bDEXTROSA\s*50\b/.test(blob)) return true;
  if (/\bPRN\b/.test(String(item.frecuenciaRaw || "").toUpperCase())) {
    if (/\b(DESTROXTIS|GLUCOSA|GLUC\s*<|MG\/DL)\b/.test(blob)) return true;
  }
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
var ACCENT_FIRST_WORD = {
  LOSARTAN: "LOSART\xC1N",
  ONDANSETRON: "ONDANSETR\xD3N",
  SENOSIDOS: "SEN\xD3SIDOS"
};
var MAX_CUSTOM_TOKENS_PER_CAT = 400;
var MAX_CUSTOM_TOKEN_LEN = 120;
var MAX_CUSTOM_ACCENTS = 500;
var _catalogOverlay = {
  accents: {},
  soapTokens: { vasop: [], abx: [], analgesia: [], antihta: [] }
};
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeNombreForSoapClassify(nombreRaw) {
  var n = String(nombreRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  n = n.replace(/\bONDASETRON\b/g, "ONDANSETRON");
  return n;
}
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
function applyNombreAccents(n) {
  var table = Object.assign({}, ACCENT_FIRST_WORD, _catalogOverlay.accents);
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
function dosisBeforeSlash(dosisRaw) {
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
  var left = dosisBeforeSlash(raw);
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
function extractRecetaNameOnlyDose(dosisRaw) {
  var parsed = dosisForInfusionParse(dosisRaw);
  if (!parsed) return "";
  var vel = extractVelInfSegment(parsed);
  if (vel) {
    var mcgMin = vel.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
    if (mcgMin) return compactRecetaDoseToken(mcgMin[1] + " MCG/MIN");
    var mcgHr = vel.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
    if (mcgHr) return compactRecetaDoseToken(mcgHr[1] + " MCG/HORA");
    var mgHr = vel.match(/(\d+(?:[.,]\d+)?)\s*MG\s*\/\s*(?:HORA|H)\b/i);
    if (mgHr) return compactRecetaDoseToken(mgHr[1] + " MG/HORA");
    var ccHr = vel.match(/(\d+(?:[.,]\d+)?)\s*CC\s*\/\s*(?:HORA|H)\b/i);
    if (ccHr) {
      var bolusMcg = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
      if (/\bMCG\b/i.test(bolusMcg) && !/\bMG\b/i.test(bolusMcg.replace(/\bMCG\b/gi, ""))) {
        return compactRecetaDoseToken(ccHr[1] + " MCG/HORA");
      }
      return compactRecetaDoseToken(ccHr[1] + " CC/HORA");
    }
    if (/^\d+(?:[.,]\d+)?\s*HORAS?\b/i.test(vel)) {
      var bolusTimed = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
      if (bolusTimed) return compactRecetaDoseToken(bolusTimed);
    }
  }
  var anywhereMcgMin = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
  if (anywhereMcgMin) return compactRecetaDoseToken(anywhereMcgMin[1] + " MCG/MIN");
  var anywhereMcgHr = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
  if (anywhereMcgHr) return compactRecetaDoseToken(anywhereMcgHr[1] + " MCG/HORA");
  var bolus = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
  if (bolus) return compactRecetaDoseToken(bolus);
  return compactRecetaDoseToken(dosisBeforeSlash(dosisRaw));
}
function isPrnItem(item) {
  var f = trimStr(item.frecuenciaRaw).toUpperCase();
  if (f === "PRN") return true;
  return /CRITERIO\s+PRN/i.test(item.dosisRaw || "");
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
function instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido) {
  var verb = verbForVia(viaNorm);
  var nUp = nombreExpandido.toUpperCase();
  var isTab = /\bTABLETA\b/i.test(nombreExpandido);
  var isCap = /\bCÁPSULA\b/i.test(nombreExpandido);
  var mMg = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*MG$/i);
  var mMl = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*ML$/i);
  var mG = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);
  if (mG && verb !== "TOMAR") {
    return verb + " " + mG[1].replace(",", ".") + " G";
  }
  if (verb === "TOMAR" && isTab && mMg) {
    return "TOMAR 1 TABLETA (" + mMg[1].replace(",", ".") + " MG)";
  }
  if (verb === "TOMAR" && isCap && mMg) {
    return "TOMAR 1 C\xC1PSULA (" + mMg[1].replace(",", ".") + " MG)";
  }
  if (verb === "TOMAR" && isTab && mG) {
    return "TOMAR 1 TABLETA (" + mG[1].replace(",", ".") + " G)";
  }
  if (verb === "TOMAR" && mMl) {
    return "TOMAR " + mMl[1].replace(",", ".") + " ML";
  }
  if (verb === "TOMAR" && mG) {
    return "TOMAR " + mG[1].replace(",", ".") + " G";
  }
  if (mMg) {
    return verb + " " + mMg[1].replace(",", ".") + " MG";
  }
  if (mMl) {
    return verb + " " + mMl[1].replace(",", ".") + " ML";
  }
  return verb + " " + dosisPrincipal;
}
function formatMedicationEgresoLine(item) {
  var viaNorm = normalizeVia(item.viaRaw);
  var nombreExpandido = applyNombreAccents(expandNombrePresentacion(item.nombreRaw));
  var dosisPrincipal = dosisBeforeSlash(item.dosisRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var prn = isPrnItem(item);
  if (prn) {
    var critRaw = extractPrnTail(item.dosisRaw);
    if (!critRaw) critRaw = freqNorm;
    if (/HIPOGLUCEMIA/i.test(critRaw)) {
      var hypo = polishHypoPrnCriterion(critRaw);
      return nombreExpandido + " || ADMINISTRAR " + dosisPrincipal + " " + viaNorm + " " + hypo + ".";
    }
    if (/(NAUSEA|NÁUSEA|NAUSEAS|NÁUSEAS)/i.test(critRaw) && /VÓMITO|VOMITO/i.test(critRaw)) {
      var cadaN = extractCadaHorasFromCrit(critRaw) || normalizeFrecuencia("CADA 8 HORAS");
      return nombreExpandido + " || ADMINISTRAR " + dosisPrincipal + " " + viaNorm + " " + cadaN + " EN CASO DE N\xC1USEA O V\xD3MITO.";
    }
    var startFallback = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
    return nombreExpandido + " || " + startFallback + " " + normalizeFrecuencia(critRaw) + ".";
  }
  var instr = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
  var mid = instr + " " + viaNorm + " " + freqNorm;
  if (item.diaTratamiento != null) {
    return nombreExpandido + " || " + mid + " (D\xCDA " + item.diaTratamiento + " DE TRATAMIENTO).";
  }
  return nombreExpandido + " || " + mid + ", SIN SUSPENDER HASTA NUEVO AVISO.";
}
function buildMedRecetaCopyText(items) {
  var list = (items || []).filter(function(it) {
    return it && !it.suspendido;
  });
  var lines = list.map(function(it) {
    return formatMedicationEgresoLine(it);
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
function formatMedicationSoapShort(item) {
  if (!item) return "";
  var nombre = compactSoapDrugName(applyNombreAccents(expandNombrePresentacion(item.nombreRaw)));
  var via = normalizeVia(item.viaRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var dosisCompact = extractRecetaNameOnlyDose(item.dosisRaw);
  var prn = isPrnItem(item);
  if (prn) {
    var critRaw = extractPrnTail(item.dosisRaw) || freqNorm;
    if (/HIPOGLUCEMIA/i.test(critRaw)) {
      var hypoParts = [nombre];
      if (dosisCompact) hypoParts.push(dosisCompact);
      if (via) hypoParts.push(soapViaShort(via));
      hypoParts.push(polishHypoPrnCriterion(critRaw).toUpperCase());
      return hypoParts.join(" ");
    }
    if (/(NAUSEA|NÁUSEA|VÓMITO|VOMITO)/i.test(critRaw)) {
      var nauseaParts = [nombre];
      if (dosisCompact) nauseaParts.push(dosisCompact);
      if (via) nauseaParts.push(soapViaShort(via));
      var cadaN = extractCadaHorasFromCrit(critRaw) || "CADA 8 HORAS";
      nauseaParts.push(soapFreqShort(cadaN));
      nauseaParts.push("EN CASO DE N\xC1USEA O V\xD3MITO");
      return nauseaParts.join(" ");
    }
    if (/(DOLOR|FIEBRE)/i.test(critRaw)) {
      var painParts = [nombre];
      if (dosisCompact) painParts.push(dosisCompact);
      var cadaPain = extractCadaHorasFromCrit(critRaw) || freqNorm;
      if (cadaPain) painParts.push(soapFreqShort(cadaPain));
      painParts.push("EN CASO DE DOLOR LEVE O FIEBRE");
      return painParts.join(" ");
    }
  }
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  if (freqNorm) parts.push(soapFreqShort(freqNorm));
  if (item.diaTratamiento != null) parts.push("DIA " + item.diaTratamiento);
  return parts.join(" ");
}
function buildMedRecetaNameOnlyText(items) {
  var list = (items || []).filter(function(it) {
    return it && !it.suspendido;
  });
  var lines = list.map(function(it) {
    return formatMedicationSoapShort(it);
  });
  return lines.join("\n");
}
var SOAP_DESTINATION_KEYS = [
  "analgesia",
  "antihta",
  "diuretico",
  "antitromboticos",
  "abx",
  "vasop",
  "nm"
];
var SOAP_DESTINATION_LABELS = {
  analgesia: "Analg\xE9sicos / antiem\xE9ticos",
  antihta: "Antihipertensivos",
  diuretico: "Diur\xE9ticos",
  antitromboticos: "Antitromb\xF3ticos",
  abx: "Antibi\xF3ticos / antif\xFAngicos",
  vasop: "Vasopresores / inotr\xF3picos",
  nm: "NM (insulina, tiroides, etc.)"
};
function effectiveSoapCategory(item, classifyFn) {
  if (!item) return "otros";
  var auto = classifyFn(item.nombreRaw, item.dosisRaw);
  if (auto !== "otros") return auto;
  var ov = trimStr(item.soapCatOverride);
  if (ov && SOAP_DESTINATION_KEYS.indexOf(ov) >= 0) return ov;
  return "otros";
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
function classifyMedicationSoapCategory(nombreRaw, dosisRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  var doseBlob = normalizeNombreForSoapClassify(
    [nombreRaw, dosisRaw].filter(Boolean).join(" ")
  );
  if (isAspirinNombre(n)) {
    var mg = extractMgDoseFromMedBlob(doseBlob);
    if (mg == null || mg <= 160) return "antitromboticos";
    return "analgesia";
  }
  var o = _catalogOverlay.soapTokens;
  if (overlayTokensMatch(n, o.vasop)) return "vasop";
  if (overlayTokensMatch(n, o.abx)) return "abx";
  if (overlayTokensMatch(n, o.analgesia)) return "analgesia";
  if (overlayTokensMatch(n, o.antihta)) return "antihta";
  if (/\b(NORADRENALINA|NOREPINEFRINA|EPINEFRINA|ADRENALINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|TERLIPRESINA|FENILEFRINA|MILRINONA|DOPEXAMINA)\b/.test(
    n
  )) {
    return "vasop";
  }
  if (/\b(ERTAPENEM|MEROPENEM|IMIPENEM|CEFTRIAX|CEFEPIME|CEFTAZID|CEFOXIT|CEFUROXI|CEFOTAX|CEFTAROL|CEFACLOR|CEFAZOLINA|PIPERACILINA|TAZOBACTAM|VANCOMICINA|TEICOPLANINA|DALBAVANCINA|ORITAVANCINA|TIGECICLINA|AMIKACINA|GENTAMICINA|TOBRAMICINA|PLAZOMICINA|LEVOFLOX|CIPROFLOX|MOXIFLOX|DELAFLOX|OFLOXACINO|NORFLOXACINO|METRONIDAZOL|LINEZOLID|DAPTOMICINA|AZTREONAM|COLISTINA|POLIMIXINA|CLINDAMICINA|AZITROMICINA|CLARITROMICINA|ERITROMICINA|DOXICICLINA|MINOCICLINA|FOSFOMICINA|NITROFURANTOINA|RIFAMPICINA|RIFAXIMINA|AMPICILINA|SULBACTAM|AMOXICILINA|BENZILPENICILINA|FLUCLOXACIL|PENICILINA|TRIMETOPRIM|SULFAMETOXAZOL|BACTRIM|COTRIMOX|FLUCONAZOL|VORICONAZOL|ITRACONAZOL|POSACONAZOL|ISAVUCONAZOL|ANIDULAFUNGINA|MICAFUNGINA|CASPOFUNGINA|AMFOTERICINA|ACICLOVIR|VALACICLOVIR|GANCICLOVIR|FOSCARNET|OSELTAMIVIR|REMDESIVIR|REM\s*DESIVIR)\b/.test(
    n
  )) {
    return "abx";
  }
  if (/\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|MORFINA|TRAMADOL|IBUPROFENO|NAPROXENO|DICLOFENACO|ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA|BUPRENORFINA|FENTANILO|REMIFENTANILO|SUFENTANILO|HIDROMORFONA|OXICODONA|NALBUFINA|PENTAZOCINA|TAPENTADOL)\b/.test(
    n
  )) {
    return "analgesia";
  }
  if (/\b(HIDROCLOROTIAZ|CLORTALIDONA|INDAPAMIDA|FUROSEMIDA|TORASEMIDA|BUMETANIDA|ESPIRONOLACTONA|EPLERENONA)\b/.test(
    n
  )) {
    return "diuretico";
  }
  if (/\b(ENOXAPARINA|HEPARINA|DALTEPARINA|TINZAPARINA|FONDAPARINUX|NADROPARINA|APIXABAN|RIVAROXABAN|EDOXABAN|DABIGATRAN|WARFARINA|ACENOCUMAROL|CLOPIDOGREL|TICAGRELOR|PRASUGREL|CILOSTAZOL|TICLOPIDINA)\b/.test(
    n
  )) {
    return "antitromboticos";
  }
  if (/\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|LEVOTIROXINA|LIOTIRONINA)\b/.test(
    n
  )) {
    return "nm";
  }
  if (/\b(LOSARTAN|IRBESARTAN|VALSARTAN|TELMISARTAN|OLMESARTAN|CANDESARTAN|ENALAPRIL|LISINOPRIL|RAMIPRIL|CAPTOPRIL|AMLODIPINO|NIFEDIPINO|FELODIPINO|LERCANIDIPINO|CARVEDILOL|METOPROLOL|BISOPROLOL|NEBIVOLOL|PROPRANOLOL|ATENOLOL|LABETALOL|ESMOLOL|SOTALOL|CLONIDINA|HIDRALAZINA|MINOXIDIL|NICARDIPINO|CLEVUDIPINO|DILTIAZEM|VERAPAMILO|NITROGLICERINA|ISOSORBIDE|DINITRATO|SACUBITRIL)\b/.test(
    n
  )) {
    return "antihta";
  }
  if (/\b(METFORMINA|REPAGLINIDA|GLIBENCLAMINA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|DEXAMETASONA|BETAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|PREDNISON|PREDNISOLONA|ATORVASTATINA|ROSUVASTATINA|PRAVASTATINA|SINVASTATINA|SALBUTAMOL|LEVOSALBUTAMOL|TERBUTALINA|BUDESONIDA|BECLOMETASONA|FLUTICASONA|TIOTROPIO|IPRATROPIO|FOLICO|CIANOCOBALAMINA|FERROSO|CLORURO\s+DE\s+POTASIO|SULFATO\s+DE\s+MAGNESIO|LACTULOSA|BISACODILO|SENOSIDOS|PROPOFOL|MIDAZOLAM|LORAZEPAM|DIAZEPAM|CLONAZEPAM|HALOPERIDOL|QUETIAPINA|OLANZAPINA|LEVETIRACETAM|FENITOINA|CARBAMAZEPINA|VALPROATO|GABAPENTINA|PREGABALINA|DONEPECILO|MEMANTINA|BROMOCRIPTINA|FINASTERIDA|TAMSULOSINA|SOLIFENACINA|OXYBUTININA)\b/.test(
    n
  )) {
    return "otros";
  }
  return "otros";
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

// public/js/lab-history-repair.mjs
function patientLabHistoryNeedsRepair(raw) {
  if (raw == null) return false;
  if (!Array.isArray(raw)) return true;
  var usedIds = [];
  for (var i = 0; i < raw.length; i++) {
    var set = raw[i];
    if (!isMeaningfulLabHistorySet(set)) return true;
    if (!set || typeof set !== "object") return true;
    var id = set.id != null ? String(set.id).trim() : "";
    if (!id) return true;
    if (usedIds.indexOf(id) !== -1) return true;
    usedIds.push(id);
  }
  return false;
}
function repairLabHistoryMapInPlace(labHistoryMap) {
  var changed = false;
  Object.keys(labHistoryMap || {}).forEach(function(pid) {
    var raw = labHistoryMap[pid];
    if (!patientLabHistoryNeedsRepair(raw)) return;
    var fixed = normalizeLabHistoryPatientSets(raw);
    if (fixed.length) labHistoryMap[pid] = fixed;
    else delete labHistoryMap[pid];
    changed = true;
  });
  return changed;
}

// public/js/features/estado-actual-io.mjs
function toEaSalidaText(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).toUpperCase();
}
function formatBalanceLive(bal) {
  if (!Number.isFinite(bal)) return "\u2014";
  return (bal > 0 ? "+" : "") + bal + " CC";
}
function parseIoIngresoField(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
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
function classifyEgresoSegment(seg) {
  var s = String(seg || "").trim();
  var u = s.toUpperCase();
  if (/^NC$/i.test(s) || /^no\s+cuantificad/i.test(s)) {
    return { kind: "diuresis", label: "DIURESIS", value: "NC" };
  }
  if (/^DIURESIS\b/i.test(s) || /^ORINA\b/i.test(s)) {
    var rest = s.replace(/^(?:DIURESIS|ORINA)\s*/i, "").trim();
    if (!rest || /no\s+cuantificad/i.test(rest)) {
      return { kind: "diuresis", label: "DIURESIS", value: rest ? parseSegmentValue(rest) : "NC" };
    }
    return { kind: "diuresis", label: "DIURESIS", value: parseSegmentValue(rest) };
  }
  if (/DRENAJ/i.test(u)) {
    var dRest = s.replace(/^DRENAJ(?:E|ES)?\s*/i, "").trim();
    return { kind: "drain", label: "DRENAJE", value: parseSegmentValue(dRest || s) };
  }
  if (/GASTROSTOM/i.test(u)) {
    var gRest = s.replace(/^GASTROSTOM(?:ÍA|IA)?\s*/i, "").trim();
    return { kind: "gastrostomy", label: "GASTROSTOM\xCDA", value: parseSegmentValue(gRest || s) };
  }
  if (/NEFRO/i.test(u)) {
    var side = "";
    if (/IZQ|IZQUIERDA/i.test(u)) side = "IZQUIERDA";
    else if (/\bDER\b|DERECHA/i.test(u)) side = "DERECHA";
    var nRest = s.replace(/^NEFRO(?:STOM(?:ÍA|IA))?/i, "").trim();
    nRest = nRest.replace(/\b(IZQ|IZQUIERDA|DER|DERECHA)\b/gi, "").trim();
    var label = side ? "NEFROSTOM\xCDA " + side : "NEFROSTOM\xCDA";
    return { kind: "nephro", label, value: parseSegmentValue(nRest || s) };
  }
  var n = parseIoNumber(s);
  if (n != null) return { kind: "diuresis", label: "DIURESIS", value: n };
  if (/no\s+cuantificad/i.test(s)) {
    return { kind: "diuresis", label: "DIURESIS", value: "NC" };
  }
  return { kind: "diuresis", label: "DIURESIS", value: u };
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
  if (isIoNumericValue(evac)) return String(evac) + " CC";
  return String(evac).toUpperCase();
}
function formatIoClauseForSoap(io, balanceTurno2) {
  io = io || {};
  var clauses = ["INGRESOS " + (io.ing != null && io.ing !== "" ? String(io.ing) : "___") + " CC"];
  var parts = Array.isArray(io.egrParts) && io.egrParts.length ? io.egrParts : legacyEgrToParts(io.egr);
  if (parts.length) {
    for (var i = 0; i < parts.length; i++) {
      clauses.push(formatEgresoPartForText(parts[i]));
    }
  } else if (io.egr != null && io.egr !== "") {
    var egrNorm = normalizeIoNcAbbrev(io.egr);
    if (isIoNumericValue(egrNorm)) {
      clauses.push("DIURESIS " + String(egrNorm) + " CC");
    } else if (egrNorm === "NC") {
      clauses.push("DIURESIS NC");
    } else {
      clauses.push(String(egrNorm).toUpperCase());
    }
  } else {
    clauses.push("DIURESIS ___");
  }
  if (io.evac != null && io.evac !== "") {
    clauses.push("EVACUACIONES " + formatEvacForText(io.evac));
  }
  var balance = balanceTurno2 != null && balanceTurno2 !== "" && Number.isFinite(Number(balanceTurno2)) ? (Number(balanceTurno2) > 0 ? "+" : "") + balanceTurno2 : "___";
  clauses.push("BALANCE " + balance + " CC");
  return clauses.join(", ");
}

// public/js/features/estado-actual-vital-extras.mjs
var VITAL_BASE_KEYS = ["tas", "tad", "fc", "fr", "temp", "sat"];
function getVitalExtraStorageKey(baseKey) {
  return baseKey === "temp" ? "tempPeak" : baseKey + "Extra";
}

// public/js/features/estado-actual-registro-defaults.mjs
var STANDARD_GLUCOMETRIA_TIMES = ["08:00", "16:00", "00:00"];
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
  return d.getTime();
}
function isGluPointInRegistroWindow(ms, now) {
  if (!ms) return false;
  var win = getGlucometriaRegistroWindow(now);
  return ms >= win.start.getTime() && ms <= win.end.getTime();
}
function collectGlucometriasForRegistroWindow(historial, now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  var hist = Array.isArray(historial) ? historial : [];
  var out = [];
  var seen = /* @__PURE__ */ new Set();
  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== "object") continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : "";
    var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
    for (var j = 0; j < glus.length; j++) {
      var g = glus[j];
      if (!g || typeof g !== "object") continue;
      var val = (
        /** @type {any} */
        g.value
      );
      if (val == null || val === "") continue;
      var time = (
        /** @type {any} */
        g.time != null ? String(
          /** @type {any} */
          g.time
        ) : ""
      );
      var ms = gluPointMs(recordedAt, time);
      if (!isGluPointInRegistroWindow(ms, ref)) continue;
      var key = String(val) + "@" + time;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: val, time });
    }
  }
  out.sort(function(a, b) {
    var ta = String(a.time || "");
    var tb = String(b.time || "");
    if (ta !== tb) return ta.localeCompare(tb);
    return String(a.value).localeCompare(String(b.value));
  });
  return out;
}

// public/js/features/estado-actual-vital-series.mjs
var MAX_VITAL_READINGS_PER_DAY = 4;
var MAX_VITAL_LAYERS_IN_FORM = 4;
function normalizeReading(raw) {
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
function pushReading(list, item) {
  var key = item.value + "@" + (item.time || "");
  for (var i = 0; i < list.length; i++) {
    var k = list[i].value + "@" + (list[i].time || "");
    if (k === key) return;
  }
  list.push(item);
}
function vitalSeriesFromMedicion(medicion) {
  var out = {};
  if (!medicion || typeof medicion !== "object") return out;
  var m = medicion;
  var rawSeries = m.vitalSeries;
  if (rawSeries && typeof rawSeries === "object") {
    for (var sk = 0; sk < VITAL_BASE_KEYS.length; sk++) {
      var bk = VITAL_BASE_KEYS[sk];
      var arr = (
        /** @type {any} */
        rawSeries[bk]
      );
      if (!Array.isArray(arr)) continue;
      out[bk] = [];
      for (var ai = 0; ai < arr.length; ai++) {
        var norm = normalizeReading(arr[ai]);
        if (norm) pushReading(out[bk], norm);
      }
    }
  }
  var vit = m.vitals && typeof m.vitals === "object" ? (
    /** @type {any} */
    m.vitals
  ) : {};
  var alt = m.alteredAt && typeof m.alteredAt === "object" ? (
    /** @type {Record<string, string>} */
    m.alteredAt
  ) : {};
  for (var vi = 0; vi < VITAL_BASE_KEYS.length; vi++) {
    var key = VITAL_BASE_KEYS[vi];
    if (!out[key]) out[key] = [];
    if (vit[key] != null && vit[key] !== "") {
      pushReading(out[key], {
        value: Number(vit[key]),
        time: alt[key] ? String(alt[key]) : void 0
      });
    }
    var extraKey = getVitalExtraStorageKey(key);
    if (vit[extraKey] != null && vit[extraKey] !== "") {
      pushReading(out[key], {
        value: Number(vit[extraKey]),
        time: alt[extraKey] ? String(alt[extraKey]) : void 0
      });
    }
  }
  for (var ck = 0; ck < VITAL_BASE_KEYS.length; ck++) {
    var ckKey = VITAL_BASE_KEYS[ck];
    if (out[ckKey] && out[ckKey].length > MAX_VITAL_READINGS_PER_DAY) {
      out[ckKey] = out[ckKey].slice(-MAX_VITAL_READINGS_PER_DAY);
    }
  }
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
function countVitalReadingsInRegistroWindow(historial, vitalKey, now) {
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
      pushReading(all, rd);
    }
  }
  return all.length;
}
function collectBombaInsulinaForRegistroWindow(historial, now) {
  var hist = Array.isArray(historial) ? historial : [];
  var out = [];
  var seen = /* @__PURE__ */ new Set();
  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== "object") continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : "";
    var entries = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
    for (var j = 0; j < entries.length; j++) {
      var e = entries[j];
      if (!e || typeof e !== "object") continue;
      var val = Number(
        /** @type {any} */
        e.value
      );
      var units = Number(
        /** @type {any} */
        e.units
      );
      if (!Number.isFinite(val)) continue;
      if (!Number.isFinite(units)) units = 0;
      var time = (
        /** @type {any} */
        e.time != null ? String(
          /** @type {any} */
          e.time
        ) : ""
      );
      var ms = gluPointMs(recordedAt, time);
      if (!isGluPointInRegistroWindow(ms, now)) continue;
      var key = val + "@" + units + "@" + time;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: val, units, time });
    }
  }
  out.sort(function(a, b) {
    return String(a.time || "").localeCompare(String(b.time || ""));
  });
  return out;
}

// public/js/features/estado-actual-data.mjs
var MED_FIELD_KEYS = (
  /** @type {const} */
  [
    "analgesia",
    "abx",
    "antihta",
    "diureticos",
    "antitromboticos",
    "vasop",
    "nm"
  ]
);
function buildEaMonitoreoRevision(monitoreoLike, activeId, medRecetaByPatient2) {
  var m = monitoreoLike || {};
  var h = Array.isArray(m.historial) ? m.historial.length : 0;
  var parts = ["h" + h];
  for (var i = 0; i < Math.min(4, h); i += 1) {
    var row = m.historial[i];
    parts.push(String(row && row.id ? row.id : "") + "@" + String(row && row.recordedAt ? row.recordedAt : ""));
  }
  var tg = m.textoGuardado && m.textoGuardado.savedAt != null ? String(m.textoGuardado.savedAt) : "";
  parts.push("t" + tg);
  var ec = m.estadoClinico && typeof m.estadoClinico === "object" ? m.estadoClinico : {};
  var pend = m.pendienteReceta && typeof m.pendienteReceta === "object" ? m.pendienteReceta : {};
  var conf = m.confirmado && typeof m.confirmado === "object" ? m.confirmado : {};
  parts.push(
    String(ec.four || ""),
    String(ec.esferas || ""),
    String(ec.soporte || ""),
    String(ec.dieta || ""),
    String(ec.kcalKg || ""),
    String(ec.kcal || ""),
    String(ec.proteinG || "")
  );
  for (var k of MED_FIELD_KEYS) {
    parts.push(String(ec[k] || ""), String(pend[k] || ""), conf[k] ? "1" : "0");
  }
  var block = activeId && medRecetaByPatient2 ? medRecetaByPatient2[activeId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  parts.push("r" + items.length);
  for (var j = 0; j < Math.min(4, items.length); j += 1) {
    var it = items[j];
    parts.push(String(it && it.id ? it.id : "") + (it && it.suspendido ? "s" : "a"));
  }
  return parts.join(":");
}
function emptyEstadoClinico() {
  return {
    four: "",
    esferas: "",
    analgesia: "",
    abx: "",
    antihta: "",
    diureticos: "",
    antitromboticos: "",
    vasop: "",
    nm: "",
    soporte: "",
    tempContext: "",
    dieta: "",
    kcalKg: "",
    kcal: "",
    proteinG: "",
    pesoRef: ""
  };
}
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
}
function emptyPendienteReceta() {
  const o = {};
  for (var k of Object.keys(emptyEstadoClinico())) {
    o[k] = "";
  }
  return o;
}
function emptyMonitoreo() {
  var confirmado = {};
  for (var mk of MED_FIELD_KEYS) {
    confirmado[mk] = false;
  }
  return {
    estadoClinico: emptyEstadoClinico(),
    confirmado,
    pendienteReceta: emptyPendienteReceta(),
    historial: [],
    textoGuardado: { text: "", savedAt: null }
  };
}
var VITAL_KEYS = ["tas", "tad", "fc", "fr", "temp", "sat"];
function hasIoNumber(v) {
  return v != null && v !== "";
}
function isIoNumericValue2(v) {
  return isIoNumericValue(v);
}
function compareSavedAt(a, b) {
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
  if (compareSavedAt(legSaved, tg.savedAt) > 0) {
    tg.text = legText;
    tg.savedAt = legSaved;
  } else if ((!tg.text || tg.text === "") && !(tg.savedAt != null && String(tg.savedAt).length > 0) && legText) {
    tg.text = legText;
    tg.savedAt = legSaved != null ? legSaved : tg.savedAt;
  }
  delete p.estadoActual;
  return true;
}
function mergePatientMonitoreoFromImported(target, source) {
  if (!target || typeof target !== "object") return false;
  if (!source || typeof source !== "object") return migratePatientMonitoreo(target);
  var s = source;
  var t = target;
  try {
    if ("monitoreo" in s && s.monitoreo != null && typeof s.monitoreo === "object") {
      t.monitoreo = JSON.parse(JSON.stringify(s.monitoreo));
    }
    if ("estadoActual" in s && s.estadoActual != null && typeof s.estadoActual === "object") {
      t.estadoActual = JSON.parse(JSON.stringify(s.estadoActual));
    }
  } catch (_e) {
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
function deriveSnapshot(monitoreoLike) {
  var emptyVitals = {};
  var emptyAltered = {};
  for (var zk of VITAL_KEYS) {
    emptyVitals[zk] = null;
  }
  var snap = {
    vitals: emptyVitals,
    alteredAt: emptyAltered,
    glucometrias: (
      /** @type {Array<{ value?: unknown, time?: string }>} */
      []
    ),
    io: (
      /** @type {{ ing: null | unknown, egr: null | unknown }} */
      { ing: null, egr: null }
    )
  };
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  var vitals = {};
  for (var v0 of VITAL_KEYS) vitals[v0] = null;
  var alteredAt = {};
  for (var iRow = 0; iRow < sortedAsc.length; iRow++) {
    var row = sortedAsc[iRow];
    if (!row || typeof row !== "object") continue;
    var rv = (
      /** @type {any} */
      row.vitals && typeof /** @type {any} */
      row.vitals === "object" ? (
        /** @type {any} */
        row.vitals
      ) : {}
    );
    var rowAlt = (
      /** @type {any} */
      row.alteredAt && typeof /** @type {any} */
      row.alteredAt === "object" ? (
        /** @type {Record<string, string>} */
        /** @type {any} */
        row.alteredAt
      ) : {}
    );
    for (var vk of VITAL_KEYS) {
      var val = rv[vk];
      if (val != null && val !== "") {
        vitals[vk] = val;
        if (rowAlt && rowAlt[vk] != null && String(rowAlt[vk]).length > 0) {
          alteredAt[vk] = String(rowAlt[vk]);
        } else {
          delete alteredAt[vk];
        }
      }
    }
    for (var ex = 0; ex < VITAL_BASE_KEYS.length; ex++) {
      var baseK = VITAL_BASE_KEYS[ex];
      var extraK = getVitalExtraStorageKey(baseK);
      var extraVal = rv[extraK];
      if (extraVal != null && extraVal !== "") {
        vitals[extraK] = extraVal;
        if (rowAlt && rowAlt[extraK] != null && String(rowAlt[extraK]).length > 0) {
          alteredAt[extraK] = String(rowAlt[extraK]);
        } else {
          delete alteredAt[extraK];
        }
      }
    }
  }
  var gluChosen = [];
  var bombaChosen = [];
  for (var j = sortedAsc.length - 1; j >= 0; j--) {
    var r2 = sortedAsc[j];
    if (!r2 || typeof r2 !== "object") continue;
    var barr = Array.isArray(
      /** @type {any} */
      r2.bombaInsulina
    ) ? (
      /** @type {any} */
      r2.bombaInsulina
    ) : [];
    if (barr.length) {
      bombaChosen = barr.map(function(e) {
        if (!e || typeof e !== "object") return null;
        var v = Number(
          /** @type {any} */
          e.value
        );
        var u = Number(
          /** @type {any} */
          e.units
        );
        if (!Number.isFinite(v)) return null;
        return {
          value: v,
          units: Number.isFinite(u) ? u : 0,
          time: (
            /** @type {any} */
            e.time != null ? String(
              /** @type {any} */
              e.time
            ) : void 0
          )
        };
      }).filter(Boolean);
      gluChosen = [];
      break;
    }
    var garr = Array.isArray(
      /** @type {any} */
      r2.glucometrias
    ) ? (
      /** @type {any} */
      r2.glucometrias
    ) : [];
    var nonempty = (
      /** @type {typeof gluChosen} */
      []
    );
    for (var gg of garr) {
      if (!gg || typeof gg !== "object") continue;
      if (
        /** @type {any} */
        gg.value != null && /** @type {any} */
        gg.value !== ""
      ) nonempty.push(gg);
    }
    if (nonempty.length > 0) {
      gluChosen = nonempty;
      bombaChosen = [];
      break;
    }
  }
  var ingSeen = (
    /** @type {null | unknown} */
    null
  );
  var egrSeen = (
    /** @type {null | unknown} */
    null
  );
  var egrPartsSeen = null;
  var evacSeen = (
    /** @type {null | unknown} */
    null
  );
  for (var k2 = sortedAsc.length - 1; k2 >= 0; k2--) {
    var rIo = sortedAsc[k2];
    if (!rIo || typeof rIo !== "object") continue;
    var ioObj = (
      /** @type {any} */
      rIo.io && typeof /** @type {any} */
      rIo.io === "object" ? (
        /** @type {any} */
        /** @type {any} */
        rIo.io
      ) : {}
    );
    if (egrPartsSeen === null && Array.isArray(ioObj.egrParts) && ioObj.egrParts.length) {
      egrPartsSeen = ioObj.egrParts.slice();
      egrSeen = ioNumericEgressTotal(ioObj) ?? ioDiuresisForBalance(ioObj);
    }
    if (egrSeen === null && ioObj.egr != null && ioObj.egr !== "") egrSeen = ioObj.egr;
    if (evacSeen === null && ioObj.evac != null && ioObj.evac !== "") evacSeen = ioObj.evac;
    if (ingSeen === null && hasIoNumber(ioObj.ing)) ingSeen = ioObj.ing;
    if (ingSeen !== null && (egrSeen !== null || egrPartsSeen) && evacSeen !== null) break;
  }
  var vitalSeries = {};
  for (var si = sortedAsc.length - 1; si >= 0; si--) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== "object") continue;
    var fromRow = vitalSeriesFromMedicion(srow);
    VITAL_BASE_KEYS.forEach(function(bk) {
      if (!vitalSeries[bk]) vitalSeries[bk] = [];
      var list = fromRow[bk] || [];
      for (var ri = 0; ri < list.length; ri++) {
        var rd = list[ri];
        var dup = vitalSeries[bk].some(function(x) {
          return x.value === rd.value && (x.time || "") === (rd.time || "");
        });
        if (!dup) vitalSeries[bk].push(rd);
      }
    });
  }
  snap.vitals = vitals;
  snap.alteredAt = alteredAt;
  snap.vitalSeries = vitalSeries;
  snap.glucometrias = gluChosen.slice();
  snap.bombaInsulina = bombaChosen;
  var snapIo = { ing: ingSeen, egr: egrSeen };
  if (egrPartsSeen) snapIo.egrParts = egrPartsSeen;
  if (evacSeen !== null) snapIo.evac = evacSeen;
  snap.io = snapIo;
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
  result.historial = structuredClone((rHist.length > lHist.length ? remote : local).historial || []);
  var locT = result.textoGuardado || { text: "", savedAt: null };
  var remT = remote.textoGuardado || { text: "", savedAt: null };
  result.textoGuardado = compareSavedAt(remT.savedAt, locT.savedAt) > 0 ? structuredClone(remT) : structuredClone(locT);
  var resEco = result.estadoClinico || emptyEstadoClinico();
  var resCf = result.confirmado || {};
  var remEco = remote.estadoClinico || emptyEstadoClinico();
  var remCf = remote.confirmado || {};
  for (var mk of MED_FIELD_KEYS) {
    if (remCf[mk] && !resCf[mk]) {
      resEco[mk] = remEco[mk];
      resCf[mk] = true;
    }
  }
  result.estadoClinico = resEco;
  result.confirmado = resCf;
  return result;
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
  var total = computeDietKcalTotal(estadoClinico.kcalKg, weightKg);
  if (total == null) return false;
  estadoClinico.kcal = String(total);
  return true;
}

// public/js/app-state.mjs
var patients = [];
var notes = {};
var indicaciones = {};
var labHistory = {};
var medRecetaByPatient = {};
var medPharmProfileByPatient = {};
var recetaHuByPatient = {};
var listadoProblemas = {};
var vpoByPatient = {};
var medNotaSelectionByPatient = {};
var _beforeSave = null;
var _afterSave = null;
var _onSaveResult = null;
var _persistPatientsResolver = null;
var _saveTimer = null;
var _saveInFlight = null;
var _flushSaveQueued = false;
var SAVE_DEBOUNCE_MS = 400;
function setPersistPatientsResolver(fn) {
  _persistPatientsResolver = typeof fn === "function" ? fn : null;
}
function patientsForPersistence() {
  if (_persistPatientsResolver) {
    const overridden = _persistPatientsResolver();
    if (Array.isArray(overridden) && overridden.length) return overridden;
    const filtered = patients.filter(function(p) {
      return p && p.id !== "demo-pitch" && p.id !== "demo-pitch-2" && !p.isDemo;
    });
    if (filtered.length) return filtered;
    const stored = storage.getPatients();
    if (Array.isArray(stored) && stored.length) return stored;
    return [];
  }
  return patients;
}
function setPatients(next) {
  patients = next;
}
function setNotes(next) {
  notes = next;
}
function setIndicaciones(next) {
  indicaciones = next;
}
function setLabHistory(next) {
  labHistory = next;
}
function setMedRecetaByPatient(next) {
  medRecetaByPatient = next;
}
function setMedPharmProfileByPatient(next) {
  medPharmProfileByPatient = next;
}
function setVpoByPatient(next) {
  vpoByPatient = next;
}
function setRecetaHuByPatient(next) {
  recetaHuByPatient = next;
}
function clonePlainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_e) {
    return {};
  }
}
function replaceAppStateFromBackupData(data) {
  if (!data || typeof data !== "object") return;
  var nextPatients = Array.isArray(data.patients) ? data.patients : [];
  setPatients(
    nextPatients.filter(function(p) {
      return p && !p.isDemo;
    })
  );
  setNotes(clonePlainRecord(data.notes));
  setIndicaciones(clonePlainRecord(data.indicaciones));
  setLabHistory(clonePlainRecord(data.labHistory));
  setMedRecetaByPatient(clonePlainRecord(data.medRecetaByPatient));
  setMedPharmProfileByPatient(clonePlainRecord(data.medPharmProfileByPatient));
  listadoProblemas = clonePlainRecord(data.listadoProblemas);
  vpoByPatient = clonePlainRecord(data.vpoByPatient);
  medNotaSelectionByPatient = {};
}
function setSaveStateHooks({ before, after, onSaveResult } = {}) {
  if (before !== void 0) _beforeSave = before;
  if (after !== void 0) _afterSave = after;
  if (onSaveResult !== void 0) _onSaveResult = onSaveResult;
}
function repairLabHistoryInMemory() {
  return repairLabHistoryMapInPlace(labHistory);
}
async function bootHydrateFromDb() {
  await ensureStorageHydrated();
  initAppState();
}
function initAppState() {
  setPatients(storage.getPatients());
  setNotes(storage.getNotes());
  setIndicaciones(storage.getIndicaciones());
  setLabHistory(storage.getLabHistory());
  setMedRecetaByPatient(storage.getMedRecetaByPatient());
  setMedPharmProfileByPatient(storage.getMedPharmProfileByPatient());
  setRecetaHuByPatient(storage.getRecetaHuByPatient());
  listadoProblemas = storage.getListadoProblemas();
  vpoByPatient = storage.getVpoByPatient();
  var medCatalog = storage.getMedCatalog();
  applyMedCatalogOverlay(medCatalog);
  applySomePharmCatalogOverlay(medCatalog);
  medNotaSelectionByPatient = {};
  var monitoreoMigrated = false;
  for (var pi = 0; pi < patients.length; pi += 1) {
    if (migratePatientMonitoreo(patients[pi])) monitoreoMigrated = true;
  }
  var salaMigrated = 0;
  try {
    var rpcSettings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    var clinicalSala = String(rpcSettings.clinicalSala || "").trim();
    if (clinicalSala) {
      salaMigrated = migratePatientsClinicalSala(patients, { sala: clinicalSala });
    }
  } catch (_e) {
  }
  if (repairLabHistoryInMemory() || monitoreoMigrated || salaMigrated > 0) {
    saveState({ immediate: true });
  }
}
function notifySaveResult(result) {
  if (_onSaveResult && result) _onSaveResult(result);
}
function runSaveNow() {
  if (_beforeSave) _beforeSave();
  var promise = storage.saveAll(
    patientsForPersistence(),
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient,
    vpoByPatient,
    medPharmProfileByPatient
  );
  _saveInFlight = promise;
  return promise.then(function(result) {
    notifySaveResult(result);
    if (_afterSave) _afterSave();
    return result;
  }).finally(function() {
    if (_saveInFlight === promise) _saveInFlight = null;
  });
}
function saveState(opts) {
  var immediate = !!(opts && opts.immediate);
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (immediate) {
    return runSaveNow();
  }
  return new Promise(function(resolve) {
    _saveTimer = setTimeout(function() {
      _saveTimer = null;
      runSaveNow().then(resolve);
    }, SAVE_DEBOUNCE_MS);
  });
}
function flushSaveState() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_saveInFlight) {
    _flushSaveQueued = true;
    return _saveInFlight.then(function() {
      if (_flushSaveQueued) {
        _flushSaveQueued = false;
        return runSaveNow();
      }
    });
  }
  _flushSaveQueued = false;
  return runSaveNow();
}

export {
  incrementMedItemsDiaTratamiento,
  mergeDietaItems,
  buildDietProposalText,
  parseIndicacionesPaste,
  looksLikeSomeIndicacionesPaste,
  shouldAutoSelectSoap,
  resolveFechaActualizacion,
  applyMedCatalogOverlay,
  dosisBeforeSlash,
  formatMedicationEgresoLine,
  buildMedRecetaCopyText,
  formatMedicationSoapShort,
  buildMedRecetaNameOnlyText,
  SOAP_DESTINATION_KEYS,
  SOAP_DESTINATION_LABELS,
  effectiveSoapCategory,
  unassignedOtrosSoapItems,
  classifyMedicationSoapCategory,
  applySomePharmCatalogOverlay,
  listSomePharmFilterLabels,
  isSomePharmCategoryLabel,
  rowSomePharmCategory,
  assignSomePharmCategory,
  assignSomePharmCategories,
  toEaSalidaText,
  formatBalanceLive,
  parseIoIngresoField,
  isIoNumericValue,
  normalizeEvacAbbrev,
  parseIoEvacField,
  normalizeIoNcAbbrev,
  parseIoEgresoLine,
  diuresisValueFromParts,
  ioNumericEgressTotal,
  computeIoBalanceFromIngEgr,
  formatEgresoPartForText,
  serializeEgrPartsToFormText,
  formatEvacForText,
  formatIoClauseForSoap,
  getVitalExtraStorageKey,
  STANDARD_GLUCOMETRIA_TIMES,
  getDefaultRegistroRecordedAt,
  getGlucometriaRegistroWindow,
  gluPointMs,
  isGluPointInRegistroWindow,
  collectGlucometriasForRegistroWindow,
  MAX_VITAL_READINGS_PER_DAY,
  MAX_VITAL_LAYERS_IN_FORM,
  vitalSeriesFromMedicion,
  vitalSeriesToLegacyFields,
  countVitalReadingsInRegistroWindow,
  collectBombaInsulinaForRegistroWindow,
  MED_FIELD_KEYS,
  buildEaMonitoreoRevision,
  isIoNumericValue2,
  ensureMonitoreo,
  migratePatientMonitoreo,
  mergePatientMonitoreoFromImported,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  appendMedicion,
  removeMedicion,
  mergeMonitoreo,
  resolveDietWeightKg,
  computeDietKcalTotal,
  computeDietKcalKgFromTotal,
  syncDietKcalFromWeight,
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  medPharmProfileByPatient,
  recetaHuByPatient,
  listadoProblemas,
  vpoByPatient,
  medNotaSelectionByPatient,
  setPersistPatientsResolver,
  setPatients,
  setNotes,
  setIndicaciones,
  setLabHistory,
  setMedRecetaByPatient,
  setMedPharmProfileByPatient,
  setVpoByPatient,
  setRecetaHuByPatient,
  replaceAppStateFromBackupData,
  setSaveStateHooks,
  repairLabHistoryInMemory,
  bootHydrateFromDb,
  initAppState,
  saveState,
  flushSaveState
};
//# sourceMappingURL=/js/chunks/chunk-DXD4CT35.js.map
