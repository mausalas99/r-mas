function trimStr(v) {
  return String(v == null ? '' : v).trim();
}

export function parseFechaDMYFromTimestampCell(cell) {
  var t = trimStr(cell);
  var m = t.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return m ? m[1] : '';
}

function normalizeDiaMarkerText(s) {
  return String(s == null ? '' : s)
    .replace(/\u2217/g, '*')
    .replace(/\u204E/g, '*')
    .replace(/\uFF0A/g, '*')
    .replace(/\u00B7/g, ' ');
}

export function extractDiaTratamiento(dosisRaw) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  var m = t.match(/DIA\s*#\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** @param {string} fechaDMY dd/mm/yyyy */
export function parseFechaDMYToLocalDate(fechaDMY) {
  var m = trimStr(fechaDMY).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  var day = parseInt(m[1], 10);
  var mon = parseInt(m[2], 10) - 1;
  var y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  var d = new Date(y, mon, day);
  if (d.getFullYear() !== y || d.getMonth() !== mon || d.getDate() !== day) return null;
  return d;
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Días calendario desde fechaDMY (inclusive) hasta refDate (por defecto hoy).
 * @param {string} fechaDMY
 * @param {Date} [refDate]
 */
export function calendarDaysSinceFechaDMY(fechaDMY, refDate) {
  var start = parseFechaDMYToLocalDate(fechaDMY);
  if (!start) return 0;
  var ref = refDate ? startOfLocalDay(refDate) : startOfLocalDay(new Date());
  var diff = Math.round((ref.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

/** Suma dayOffset a cada marcador DIA n en texto SOAP (p. ej. MEROPENEM … DIA 10 → DIA 12). */
export function advanceDiaInMedSoapText(text, dayOffset) {
  var off = parseInt(dayOffset, 10);
  if (!Number.isFinite(off) || off <= 0 || text == null || !String(text).trim()) {
    return trimStr(text);
  }
  return String(text).replace(/\bDIA\s+(\d+)\b/gi, function (_m, n) {
    return 'DIA ' + (parseInt(n, 10) + off);
  });
}

/**
 * Antibióticos en EA: el DIA guardado es relativo a fechaActualizacion de Manejo;
 * en pantalla se avanza por días calendario transcurridos.
 * @param {string} text
 * @param {string} fechaActualizacion dd/mm/yyyy
 * @param {Date} [refDate]
 */
export function advanceAbxMedTextForManejoDate(text, fechaActualizacion, refDate) {
  var offset = calendarDaysSinceFechaDMY(fechaActualizacion, refDate);
  return advanceDiaInMedSoapText(text, offset);
}

/**
 * Día de tratamiento efectivo hoy (o refDate) respecto a fechaActualizacion de Manejo.
 * @param {number | null | undefined} baseDia
 * @param {string | null | undefined} fechaActualizacion
 * @param {Date} [refDate]
 */
export function effectiveDiaTratamiento(baseDia, fechaActualizacion, refDate) {
  if (baseDia == null || !Number.isFinite(baseDia)) return null;
  var fecha = trimStr(fechaActualizacion);
  if (!fecha) return baseDia;
  return baseDia + calendarDaysSinceFechaDMY(fecha, refDate);
}

/** Reemplaza el primer marcador DIA# en dosisRaw conservando formato (*DIA# n*). */
export function setDiaTratamientoInDosis(dosisRaw, dia) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  if (!/DIA\s*#\s*\d+/i.test(t)) return trimStr(dosisRaw);
  var n = parseInt(dia, 10);
  if (!Number.isFinite(n) || n < 1) return trimStr(dosisRaw);
  return t.replace(/(\*?\s*DIA\s*#\s*)\d+(\s*\*?)/i, function (_m, pre, post) {
    return pre + String(n) + post;
  });
}

/** Incrementa día en ítems con DIA# (no suspendidos). */
export function incrementMedItemsDiaTratamiento(items) {
  var list = Array.isArray(items) ? items : [];
  var count = 0;
  var next = list.map(function (it) {
    if (!it || it.suspendido || it.diaTratamiento == null) return it;
    var diaNext = it.diaTratamiento + 1;
    count += 1;
    return Object.assign({}, it, {
      diaTratamiento: diaNext,
      dosisRaw: setDiaTratamientoInDosis(it.dosisRaw, diaNext),
    });
  });
  return { items: next, count: count };
}

function stripDiaMarkersFromDosis(dosisPart) {
  var t = normalizeDiaMarkerText(String(dosisPart || ''));
  return trimStr(
    t.replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, '').replace(/\s+/g, ' ')
  );
}

var INDICACIONES_MED_CLASSES = { MEDICAMENTOS: 1, 'MEDICAMENTOS P2': 1 };

function normalizeNutrientText(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function parseProteinGrams(t) {
  var unit = '(?:GRS?|GRAMOS?|G)';
  var patterns = [
    new RegExp('(\\d+)\\s*' + unit + '\\s*(?:DE\\s+)?PROTEINAS?\\b'),
    new RegExp('PROTEINAS?\\s*(?:DE\\s+)?(\\d+)\\s*' + unit + '\\b'),
    new RegExp('(\\d+)\\s*' + unit + '\\s*(?:DE\\s+)?PROT\\b'),
  ];
  for (var i = 0; i < patterns.length; i += 1) {
    var m = t.match(patterns[i]);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function extractDietNutrients(detalleRaw) {
  var t = normalizeNutrientText(trimStr(detalleRaw));
  var kcalM = t.match(/(\d+)\s*KCAL\b/);
  return {
    kcal: kcalM ? parseInt(kcalM[1], 10) : null,
    proteinG: parseProteinGrams(t),
  };
}

/** Texto combinado de columnas SOME donde suelen ir kcal/proteína en filas DIETAS. */
export function dietNutrientBlobFromCols(cols) {
  return [cols[2], cols[4], cols[5]].map(trimStr).filter(Boolean).join(' ');
}

export function mergeDietaItems(dietas) {
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
  return { descripcion: parts.join(' · '), kcal: kcal, proteinG: proteinG };
}

export function buildDietProposalText(merged) {
  var base = trimStr(merged && merged.descripcion);
  var bits = [];
  if (merged && merged.kcal != null) bits.push(String(merged.kcal) + ' kcal');
  if (merged && merged.proteinG != null) bits.push(String(merged.proteinG) + ' g prot');
  if (!bits.length) return base;
  if (!base) return bits.join(', ');
  return base + ' (' + bits.join(', ') + ')';
}

function parseMedRow(cols, lineIndex, lineText) {
  var dosisRaw = trimStr(cols[4]);
  var dia = extractDiaTratamiento(dosisRaw);
  if (dia == null) dia = extractDiaTratamiento(lineText);
  return {
    id: 'med-' + Date.now().toString(36) + '-' + lineIndex + '-' + Math.random().toString(36).slice(2, 5),
    tipoRaw: trimStr(cols[1]).toUpperCase(),
    nombreRaw: trimStr(cols[2]),
    viaRaw: trimStr(cols[3]),
    dosisRaw: dosisRaw,
    frecuenciaRaw: trimStr(cols[5]),
    suspendido: false,
    diaTratamiento: dia,
  };
}

function parseDietaRow(cols, lineIndex) {
  var detalleRaw = trimStr(cols[4]) || trimStr(cols[5]);
  var nutrients = extractDietNutrients(dietNutrientBlobFromCols(cols));
  return {
    id: 'dieta-' + Date.now().toString(36) + '-' + lineIndex,
    descripcionRaw: trimStr(cols[2]),
    detalleRaw: detalleRaw,
    kcal: nutrients.kcal,
    proteinG: nutrients.proteinG,
    suspendido: false,
  };
}

export function parseIndicacionesPaste(text) {
  var lines = String(text || '')
    .split(/\r?\n/)
    .map(trimStr)
    .filter(Boolean);
  var items = [];
  var dietas = [];
  var fechas = [];
  var skipped = 0;
  var skippedSummary = { cuidados: 0, estudios: 0, other: 0 };
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split('\t');
    var tipoEarly = cols.length >= 2 ? trimStr(cols[1]).toUpperCase() : '';
    if (cols.length < 7) {
      if (cols.length >= 6 && (tipoEarly === 'DIETAS' || INDICACIONES_MED_CLASSES[tipoEarly])) {
        while (cols.length < 7) cols.push('');
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
    if (tipo === 'DIETAS') {
      dietas.push(parseDietaRow(cols, i));
      continue;
    }
    skipped += 1;
    if (tipo === 'CUIDADOS') skippedSummary.cuidados += 1;
    else if (tipo === 'ESTUDIOS') skippedSummary.estudios += 1;
    else skippedSummary.other += 1;
  }
  return {
    items: items,
    dietas: dietas,
    fechas: fechas,
    skipped: skipped,
    skippedSummary: skippedSummary,
  };
}

export function parseMedicationPaste(text) {
  var r = parseIndicacionesPaste(text);
  return { items: r.items, fechas: r.fechas, skipped: r.skipped };
}

/** Bloque TSV SOME (medicamentos, dietas, etc.). */
export function looksLikeSomeIndicacionesPaste(text) {
  var raw = String(text || '');
  if (!raw.trim() || !/\t/.test(raw)) return false;
  var lines = raw.split(/\r?\n/).map(trimStr).filter(Boolean);
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split('\t');
    if (cols.length < 7) continue;
    var tipo = trimStr(cols[1]).toUpperCase();
    if (tipo === 'MEDICAMENTOS' || tipo === 'MEDICAMENTOS P2' || tipo === 'DIETAS') return true;
  }
  return false;
}

export function looksLikeSomeMedicationPaste(text) {
  return looksLikeSomeIndicacionesPaste(text);
}

export function shouldAutoSelectSoap(item) {
  if (!item || item.suspendido) return false;
  var nombre = trimStr(item.nombreRaw);
  if (classifyMedicationSoapCategory(nombre, item.dosisRaw) !== 'otros') return true;
  var blob = normalizeNombreForSoapClassify(
    [nombre, item.dosisRaw, item.frecuenciaRaw].join(' ')
  );
  if (/\bINSULINA\b/.test(blob)) return true;
  if (/\b(GLARGINA|DEGLUDEC|DETEMIR|HUMANA\s+RAPIDA|NPH)\b/.test(blob)) return true;
  if (/\bDEXTROSA\s*50\b/.test(blob)) return true;
  if (/\bPRN\b/.test(String(item.frecuenciaRaw || '').toUpperCase())) {
    if (/\b(DESTROXTIS|GLUCOSA|GLUC\s*<|MG\/DL)\b/.test(blob)) return true;
  }
  return false;
}

export function resolveFechaActualizacion(fechas, fallbackDMY) {
  var list = (fechas || []).filter(Boolean);
  if (!list.length) return trimStr(fallbackDMY) || '';
  var counts = Object.create(null);
  for (var i = 0; i < list.length; i += 1) {
    var k = list[i];
    counts[k] = (counts[k] || 0) + 1;
  }
  var best = list[0];
  var bestN = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > bestN) {
      bestN = counts[k];
      best = k;
    }
  });
  return best;
}

var ACCENT_FIRST_WORD = {
  LOSARTAN: 'LOSARTÁN',
  ONDANSETRON: 'ONDANSETRÓN',
  SENOSIDOS: 'SENÓSIDOS',
};

var MAX_CUSTOM_TOKENS_PER_CAT = 400;
var MAX_CUSTOM_TOKEN_LEN = 120;
var MAX_CUSTOM_ACCENTS = 500;

var _catalogOverlay = {
  accents: {},
  soapTokens: { vasop: [], abx: [], analgesia: [], antihta: [] },
};

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeNombreForSoapClassify(nombreRaw) {
  var n = String(nombreRaw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  // Alias clínicos frecuentes para tolerar variantes de captura.
  n = n.replace(/\bONDASETRON\b/g, 'ONDANSETRON');
  return n;
}

function sanitizeAccentMap(raw) {
  var out = Object.create(null);
  if (!raw || typeof raw !== 'object') return out;
  var n = 0;
  for (var k in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    if (n >= MAX_CUSTOM_ACCENTS) break;
    var key = String(k || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
    if (!key) continue;
    var val = String(raw[k] == null ? '' : raw[k]).trim();
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
  var seen = Object.create(null);
  for (var i = 0; i < arr.length && out.length < MAX_CUSTOM_TOKENS_PER_CAT; i += 1) {
    var t = String(arr[i] || '').trim();
    if (t.length > MAX_CUSTOM_TOKEN_LEN) t = t.slice(0, MAX_CUSTOM_TOKEN_LEN);
    if (!t) continue;
    var k = t.toUpperCase();
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(t);
  }
  return out;
}

/**
 * Ajustes personalizados: acentos al inicio del nombre y tokens extra para clasificación SOAP.
 * Llamar tras cargar o importar desde almacenamiento.
 */
export function applyMedCatalogOverlay(raw) {
  var o = raw && typeof raw === 'object' ? raw : {};
  var soap = o.soapTokens && typeof o.soapTokens === 'object' ? o.soapTokens : {};
  _catalogOverlay = {
    accents: sanitizeAccentMap(o.accents),
    soapTokens: {
      vasop: sanitizeTokenList(soap.vasop),
      abx: sanitizeTokenList(soap.abx),
      analgesia: sanitizeTokenList(soap.analgesia),
      antihta: sanitizeTokenList(soap.antihta),
    },
  };
}

export function getMedCatalogOverlaySnapshot() {
  return {
    accents: Object.assign({}, _catalogOverlay.accents),
    soapTokens: {
      vasop: _catalogOverlay.soapTokens.vasop.slice(),
      abx: _catalogOverlay.soapTokens.abx.slice(),
      analgesia: _catalogOverlay.soapTokens.analgesia.slice(),
      antihta: _catalogOverlay.soapTokens.antihta.slice(),
    },
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
  return new RegExp('\\b(' + parts.join('|') + ')\\b').test(nNorm);
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
  return s.replace(/\s+/g, ' ').replace(/(\d)\s+%/g, '$1%');
}

function stripListaMarkers(nombre) {
  return trimStr(
    nombre
      .replace(/\s*\(\+\*\)\s*$/i, '')
      .replace(/\s*\(\*\)\s*$/i, '')
      .replace(/\s*\(\+\*\)/gi, '')
      .replace(/\s*\(\*\)/gi, '')
  );
}

function expandSolInyClause(n) {
  return n.replace(/\bSOL INY\s+(\d+(?:[.,]\d+)?)\s*ML\b/gi, function (_full, ml, _off, str) {
    var idx = arguments[arguments.length - 2];
    var before = str.slice(0, idx);
    if (/\b50\s*%/i.test(before) && String(ml).replace(',', '.') === '50') {
      return 'SOLUCIÓN INYECTABLE 50 ML';
    }
    return 'SOLUCIÓN INYECTABLE';
  }).replace(/\bSOL INY\b/gi, 'SOLUCIÓN INYECTABLE');
}

function expandNombrePresentacion(nombre) {
  var n = normalizeSpacesPct(stripListaMarkers(nombre));
  n = expandSolInyClause(n);
  n = n.replace(/\bCOMPRIMIDO\b/gi, 'TABLETA');
  n = n.replace(/\bCAPSULA\b/gi, 'CÁPSULA');
  n = n.replace(/\bCAPSULAS\b/gi, 'CÁPSULAS');
  n = n.replace(/\bJARABE\s+\d+\s*ML\b/gi, 'JARABE');
  n = n.replace(/\bGEL\s+\d+\s*ML\b/gi, 'GEL');
  var m = n.match(/^(POLIETILENGLICOL\s+3350)\s+POLVO\s+(\d+\s*G)\s*$/i);
  if (m) {
    return normalizeSpacesPct(m[1] + ' ' + m[2] + ' POLVO');
  }
  return normalizeSpacesPct(n);
}

function normalizeVia(viaRaw) {
  var v = trimStr(viaRaw).toUpperCase();
  if (v === 'VIA ORAL') return 'VÍA ORAL';
  if (v === 'VIA INTRAVENOSA') return 'VÍA INTRAVENOSA';
  if (v === 'VIA SUBCUTANEA') return 'VÍA SUBCUTÁNEA';
  return viaRaw;
}

function verbForVia(viaNorm) {
  if (viaNorm === 'VÍA ORAL') return 'TOMAR';
  if (viaNorm === 'VÍA SUBCUTÁNEA') return 'APLICAR';
  return 'ADMINISTRAR';
}

function normalizeFrecuencia(fr) {
  var t = trimStr(fr);
  t = t.replace(/\bHRS\b/gi, 'HORAS');
  t = t.replace(/\bHR\b/gi, 'HORA');
  return t;
}

/** Parte de dosis aplicada antes de comentarios del sistema (// …). Usado en receta y en tarjetas Pase. */
export function dosisBeforeSlash(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf('//');
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}

/** Inserta espacios en textos SOME pegados sin separación (p. ej. 450MCGDILUIREN:). */
function expandSmashedInfusionDosis(s) {
  return String(s || '')
    .replace(/DILUIREN/gi, ' DILUIREN ')
    .replace(/DILUIR\s*EN/gi, ' DILUIR EN ')
    .replace(/VEL\.?\s*INF\.?/gi, ' VEL.INF ')
    .replace(/(MCG|MG|G|ML|UI)(?=\/)/gi, '$1 ')
    .replace(/(MCG|MG|G|ML|UI)(?=[A-Z])/gi, '$1 ')
    .replace(/(CC)(?=\/)/gi, '$1 ')
    .replace(/(CC)(?=\d)/gi, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dosisForInfusionParse(dosisRaw) {
  var raw = trimStr(dosisRaw);
  if (!raw) return '';
  var left = dosisBeforeSlash(raw);
  var after =
    raw.indexOf('//') === -1
      ? ''
      : stripDiaMarkersFromDosis(raw.slice(raw.indexOf('//') + 2));
  return normalizeSpacesPct(expandSmashedInfusionDosis(left + ' ' + after)).toUpperCase();
}

function extractVelInfSegment(dosisParsed) {
  var m = String(dosisParsed || '').match(/VEL\.INF\s*:\s*(.+)$/i);
  return m ? trimStr(m[1]) : '';
}

function extractBolusBeforeDilution(dosisLeft) {
  var t = normalizeSpacesPct(expandSmashedInfusionDosis(dosisLeft)).toUpperCase();
  var cut = t.split(/\bDILUIREN\b|\bDILUIR\s+EN\b/i)[0];
  cut = trimStr(cut.replace(/\bVEL\.INF\b.*$/i, ''));
  var amount = cut.match(
    /(\d+(?:[.,]\d+)?)\s*(MCG\/(?:MIN|HORA|H)|MG\/(?:MIN|HORA|H)|MCG|MG|G|ML|UI|U)\b/i
  );
  return amount ? trimStr(amount[1] + ' ' + amount[2]).replace(/\s+/g, ' ') : cut;
}

function compactRecetaDoseToken(dosePhrase) {
  var t = trimStr(dosePhrase).toUpperCase().replace(/\s+/g, ' ');
  var rate = t.match(
    /^(\d+(?:[.,]\d+)?)\s*(MCG\/(?:MIN|HORA|H)|MG\/(?:MIN|HORA|H)|CC\/(?:HORA|H))$/i
  );
  if (rate) {
    return String(rate[1]).replace(',', '.') + ' ' + rate[2].replace(/\s+/g, '');
  }
  var grams = t.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);
  if (grams) return String(grams[1]).replace(',', '.') + ' G';
  return t
    .replace(/(\d(?:[.,]\d+)?)\s*(MG|G|ML|MCG|UI|U)\b/gi, function (_m, n, u) {
      return String(n).replace(',', '.') + String(u).toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Dosis compacta para pestaña «Simple» de receta: omite dilución y usa tasa VEL.INF
 * (MCG/MIN, MCG/HORA) o dosis bolus cuando la infusión es por tiempo (p. ej. vancomicina 3 h).
 */
export function extractRecetaNameOnlyDose(dosisRaw) {
  var parsed = dosisForInfusionParse(dosisRaw);
  if (!parsed) return '';

  var vel = extractVelInfSegment(parsed);
  if (vel) {
    var mcgMin = vel.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
    if (mcgMin) return compactRecetaDoseToken(mcgMin[1] + ' MCG/MIN');

    var mcgHr = vel.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
    if (mcgHr) return compactRecetaDoseToken(mcgHr[1] + ' MCG/HORA');

    var mgHr = vel.match(/(\d+(?:[.,]\d+)?)\s*MG\s*\/\s*(?:HORA|H)\b/i);
    if (mgHr) return compactRecetaDoseToken(mgHr[1] + ' MG/HORA');

    var ccHr = vel.match(/(\d+(?:[.,]\d+)?)\s*CC\s*\/\s*(?:HORA|H)\b/i);
    if (ccHr) {
      var bolusMcg = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
      if (/\bMCG\b/i.test(bolusMcg) && !/\bMG\b/i.test(bolusMcg.replace(/\bMCG\b/gi, ''))) {
        return compactRecetaDoseToken(ccHr[1] + ' MCG/HORA');
      }
      return compactRecetaDoseToken(ccHr[1] + ' CC/HORA');
    }

    if (/^\d+(?:[.,]\d+)?\s*HORAS?\b/i.test(vel)) {
      var bolusTimed = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
      if (bolusTimed) return compactRecetaDoseToken(bolusTimed);
    }
  }

  var anywhereMcgMin = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
  if (anywhereMcgMin) return compactRecetaDoseToken(anywhereMcgMin[1] + ' MCG/MIN');

  var anywhereMcgHr = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
  if (anywhereMcgHr) return compactRecetaDoseToken(anywhereMcgHr[1] + ' MCG/HORA');

  var bolus = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
  if (bolus) return compactRecetaDoseToken(bolus);
  return compactRecetaDoseToken(dosisBeforeSlash(dosisRaw));
}

function isPrnItem(item) {
  var f = trimStr(item.frecuenciaRaw).toUpperCase();
  if (f === 'PRN') return true;
  return /CRITERIO\s+PRN/i.test(item.dosisRaw || '');
}

function extractPrnTail(dosisRaw) {
  var t = trimStr(dosisRaw);
  var m = t.match(/CRITERIO\s+PRN:\s*(.+)$/i);
  return m ? trimStr(m[1]) : '';
}

function polishHypoPrnCriterion(crit) {
  var c = normalizeFrecuencia(trimStr(crit));
  c = c.replace(/\bHIPOGLUCEMIA\s*<\s*70\b/gi, 'HIPOGLUCEMIA <70 MG/DL');
  if (!/SEG[ÚU]N\s+REQUERIMIENTO/i.test(c)) {
    c = trimStr(c) + ' SEGÚN REQUERIMIENTO';
  }
  return c;
}

function extractCadaHorasFromCrit(crit) {
  var m = String(crit || '').match(/CADA\s+(\d+)\s*H(?:RS|ORAS)?/i);
  return m ? 'CADA ' + m[1] + ' HORAS' : '';
}

function instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido) {
  var verb = verbForVia(viaNorm);
  var nUp = nombreExpandido.toUpperCase();
  var isTab = /\bTABLETA\b/i.test(nombreExpandido);
  var isCap = /\bCÁPSULA\b/i.test(nombreExpandido);
  var mMg = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*MG$/i);
  var mMl = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*ML$/i);
  var mG = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);

  if (mG && verb !== 'TOMAR') {
    return verb + ' ' + mG[1].replace(',', '.') + ' G';
  }

  if (verb === 'TOMAR' && isTab && mMg) {
    return 'TOMAR 1 TABLETA (' + mMg[1].replace(',', '.') + ' MG)';
  }
  if (verb === 'TOMAR' && isCap && mMg) {
    return 'TOMAR 1 CÁPSULA (' + mMg[1].replace(',', '.') + ' MG)';
  }
  if (verb === 'TOMAR' && isTab && mG) {
    return 'TOMAR 1 TABLETA (' + mG[1].replace(',', '.') + ' G)';
  }
  if (verb === 'TOMAR' && mMl) {
    return 'TOMAR ' + mMl[1].replace(',', '.') + ' ML';
  }
  if (verb === 'TOMAR' && mG) {
    return 'TOMAR ' + mG[1].replace(',', '.') + ' G';
  }
  if (mMg) {
    return verb + ' ' + mMg[1].replace(',', '.') + ' MG';
  }
  if (mMl) {
    return verb + ' ' + mMl[1].replace(',', '.') + ' ML';
  }
  return verb + ' ' + dosisPrincipal;
}

/**
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} item
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function formatMedicationEgresoLine(item, opts) {
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
      return (
        nombreExpandido +
        ' || ADMINISTRAR ' +
        dosisPrincipal +
        ' ' +
        viaNorm +
        ' ' +
        hypo +
        '.'
      );
    }
    if (/(NAUSEA|NÁUSEA|NAUSEAS|NÁUSEAS)/i.test(critRaw) && /VÓMITO|VOMITO/i.test(critRaw)) {
      var cadaN = extractCadaHorasFromCrit(critRaw) || normalizeFrecuencia('CADA 8 HORAS');
      return (
        nombreExpandido +
        ' || ADMINISTRAR ' +
        dosisPrincipal +
        ' ' +
        viaNorm +
        ' ' +
        cadaN +
        ' EN CASO DE NÁUSEA O VÓMITO.'
      );
    }
    var startFallback = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
    return nombreExpandido + ' || ' + startFallback + ' ' + normalizeFrecuencia(critRaw) + '.';
  }

  var instr = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
  var mid = instr + ' ' + viaNorm + ' ' + freqNorm;

  var dia =
    item.diaTratamiento != null
      ? effectiveDiaTratamiento(item.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate)
      : null;
  if (dia != null) {
    return (
      nombreExpandido +
      ' || ' +
      mid +
      ' (DÍA ' +
      dia +
      ' DE TRATAMIENTO).'
    );
  }

  return nombreExpandido + ' || ' + mid + ', SIN SUSPENDER HASTA NUEVO AVISO.';
}

/**
 * @param {unknown[]} items
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function buildMedRecetaCopyText(items, opts) {
  var list = (items || []).filter(function (it) {
    return it && !it.suspendido;
  });
  var lines = list.map(function (it) {
    return formatMedicationEgresoLine(it, opts);
  });
  return lines.join('\n\n');
}

function soapViaShort(viaNorm) {
  if (viaNorm === 'VÍA INTRAVENOSA') return 'IV';
  if (viaNorm === 'VÍA ORAL') return 'VO';
  if (viaNorm === 'VÍA SUBCUTÁNEA') return 'SC';
  return trimStr(viaNorm).toUpperCase();
}

function soapFreqShort(freqNorm) {
  var t = trimStr(freqNorm).toUpperCase();
  var m = t.match(/^CADA\s+(\d+)\s+H(?:ORA|ORAS)?$/);
  if (m) return 'C/' + m[1] + 'H';
  return t;
}

function formulationTailStartIndex(nombre) {
  var n = trimStr(nombre);
  if (!n) return -1;
  var re =
    /\s+(?=\d+\s*%|\d+\/\d+(?:\s*G\/MG|\s*MG\/\d+(?:[.,]\d+)?\s*MG)?|\d+(?:[.,]\d+)?\s*(?:MG|G|ML|MCG|UI|U)\b|\bSOLUCIÓN INYECTABLE\b|\bSOL\s+INY\b|\bTABLETAS?\b|\bCÁPSULAS?\b|\bCAPSULAS?\b|\bCOMPRIMIDOS?\b|\bPOLVO\b|\bJARABE\b|\bGEL\b)/i;
  var m = n.match(re);
  return m && m.index != null ? m.index : -1;
}

function compactSoapDrugName(nombreExpandido) {
  var n = trimStr(nombreExpandido);
  if (!n) return '';
  var cutAt = formulationTailStartIndex(n);
  if (cutAt > 0) n = trimStr(n.slice(0, cutAt));
  n = n.toUpperCase();
  n = n
    .replace(/\s+TABLETA\b.*$/i, '')
    .replace(/\s+CÁPSULAS?\b.*$/i, '')
    .replace(/\s+CAPSULAS?\b.*$/i, '')
    .replace(/\s+POLVO\b.*$/i, '');
  var trimmed = trimStr(n.replace(/\s+\d+(?:[.,]\d+)?\s*(?:MG|G|ML|MCG|UI|U)\b.*$/i, ''));
  return trimmed || n;
}

/**
 * Indicación compacta para SOAP / Estado Actual (p. ej. NIFEDIPINO 60MG VO C/12H, MEROPENEM 1G IV C/8H DIA 13).
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} item
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 * @returns {string}
 */
export function formatMedicationSoapShort(item, opts) {
  if (!item) return '';
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
      return hypoParts.join(' ');
    }
    if (/(NAUSEA|NÁUSEA|VÓMITO|VOMITO)/i.test(critRaw)) {
      var nauseaParts = [nombre];
      if (dosisCompact) nauseaParts.push(dosisCompact);
      if (via) nauseaParts.push(soapViaShort(via));
      var cadaN = extractCadaHorasFromCrit(critRaw) || 'CADA 8 HORAS';
      nauseaParts.push(soapFreqShort(cadaN));
      nauseaParts.push('EN CASO DE NÁUSEA O VÓMITO');
      return nauseaParts.join(' ');
    }
    if (/(DOLOR|FIEBRE)/i.test(critRaw)) {
      var painParts = [nombre];
      if (dosisCompact) painParts.push(dosisCompact);
      var cadaPain = extractCadaHorasFromCrit(critRaw) || freqNorm;
      if (cadaPain) painParts.push(soapFreqShort(cadaPain));
      painParts.push('EN CASO DE DOLOR LEVE O FIEBRE');
      return painParts.join(' ');
    }
  }

  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  if (freqNorm) parts.push(soapFreqShort(freqNorm));
  var dia =
    item.diaTratamiento != null
      ? effectiveDiaTratamiento(item.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate)
      : null;
  if (dia != null) parts.push('DIA ' + dia);
  return parts.join(' ');
}

/**
 * Versión resumida para copia rápida:
 * - Medicamento.
 * - Vía y dosis (en ese orden).
 * - Frecuencia.
 * - Día de uso cuando exista.
 */
/**
 * @param {unknown[]} items
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function buildMedRecetaNameOnlyText(items, opts) {
  var list = (items || []).filter(function (it) {
    return it && !it.suspendido;
  });
  var lines = list.map(function (it) {
    return formatMedicationSoapShort(it, opts);
  });
  return lines.join('\n');
}

/** Destinos SOAP asignables manualmente cuando la clasificación automática es «otros». */
export const SOAP_DESTINATION_KEYS = [
  'analgesia',
  'antihta',
  'diuretico',
  'antitromboticos',
  'abx',
  'vasop',
  'nm',
];

export const SOAP_DESTINATION_LABELS = {
  analgesia: 'Analgésicos / antieméticos',
  antihta: 'Antihipertensivos',
  diuretico: 'Diuréticos',
  antitromboticos: 'Antitrombóticos',
  abx: 'Antibióticos / antifúngicos',
  vasop: 'Vasopresores / inotrópicos',
  nm: 'NM (insulina, tiroides, etc.)',
};

/**
 * Categoría efectiva para volcar a SOAP: auto-clasificación o override manual en «otros».
 * @param {{ nombreRaw?: string, soapCatOverride?: string }} item
 * @param {(nombreRaw: string) => string} classifyFn
 */
export function effectiveSoapCategory(item, classifyFn) {
  if (!item) return 'otros';
  var auto = classifyFn(item.nombreRaw, item.dosisRaw);
  if (auto !== 'otros') return auto;
  var ov = trimStr(item.soapCatOverride);
  if (ov && SOAP_DESTINATION_KEYS.indexOf(ov) >= 0) return ov;
  return 'otros';
}

/**
 * Medicamentos «otros» marcados SOAP sin destino asignado.
 * @param {unknown[]} items
 * @param {Record<string, boolean>} selMap
 * @param {(nombreRaw: string) => string} classifyFn
 */
export function unassignedOtrosSoapItems(items, selMap, classifyFn) {
  var out = [];
  var list = Array.isArray(items) ? items : [];
  list.forEach(function (it) {
    if (!it || !selMap[it.id] || it.suspendido) return;
    if (effectiveSoapCategory(it, classifyFn) === 'otros') out.push(it);
  });
  return out;
}

function extractMgDoseFromMedBlob(blob) {
  var m = String(blob || '').match(/\b(\d+(?:[.,]\d+)?)\s*MG\b/);
  if (!m) return null;
  var v = parseFloat(String(m[1]).replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function isAspirinNombre(n) {
  return /\b(ACETILSALICILICO|ACIDO\s+ACETILSALICILICO|ACIDO\s+ACETIL\s+SALICILICO|ASPIRINA)\b/.test(
    n
  );
}

/**
 * Clasificación automática para campos SOAP / Estado Actual (sin override manual).
 * @param {string} [dosisRaw] — opcional; desambigua dosis (p. ej. AAS 100 mg antiplaquetario vs 500 mg analgésico).
 */
export function classifyMedicationSoapCategory(nombreRaw, dosisRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  var doseBlob = normalizeNombreForSoapClassify(
    [nombreRaw, dosisRaw].filter(Boolean).join(' ')
  );
  if (isAspirinNombre(n)) {
    var mg = extractMgDoseFromMedBlob(doseBlob);
    if (mg == null || mg <= 160) return 'antitromboticos';
    return 'analgesia';
  }
  var o = _catalogOverlay.soapTokens;
  if (overlayTokensMatch(n, o.vasop)) return 'vasop';
  if (overlayTokensMatch(n, o.abx)) return 'abx';
  if (overlayTokensMatch(n, o.analgesia)) return 'analgesia';
  if (overlayTokensMatch(n, o.antihta)) return 'antihta';
  if (
    /\b(NORADRENALINA|NOREPINEFRINA|EPINEFRINA|ADRENALINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|TERLIPRESINA|FENILEFRINA|MILRINONA|DOPEXAMINA)\b/.test(
      n
    )
  ) {
    return 'vasop';
  }
  if (
    /\b(ERTAPENEM|MEROPENEM|IMIPENEM|CEFTRIAX|CEFEPIME|CEFTAZID|CEFOXIT|CEFUROXI|CEFOTAX|CEFTAROL|CEFACLOR|CEFAZOLINA|PIPERACILINA|TAZOBACTAM|VANCOMICINA|TEICOPLANINA|DALBAVANCINA|ORITAVANCINA|TIGECICLINA|AMIKACINA|GENTAMICINA|TOBRAMICINA|PLAZOMICINA|LEVOFLOX|CIPROFLOX|MOXIFLOX|DELAFLOX|OFLOXACINO|NORFLOXACINO|METRONIDAZOL|LINEZOLID|DAPTOMICINA|AZTREONAM|COLISTINA|POLIMIXINA|CLINDAMICINA|AZITROMICINA|CLARITROMICINA|ERITROMICINA|DOXICICLINA|MINOCICLINA|FOSFOMICINA|NITROFURANTOINA|RIFAMPICINA|RIFAXIMINA|AMPICILINA|SULBACTAM|AMOXICILINA|BENZILPENICILINA|FLUCLOXACIL|PENICILINA|TRIMETOPRIM|SULFAMETOXAZOL|BACTRIM|COTRIMOX|FLUCONAZOL|VORICONAZOL|ITRACONAZOL|POSACONAZOL|ISAVUCONAZOL|ANIDULAFUNGINA|MICAFUNGINA|CASPOFUNGINA|AMFOTERICINA|ACICLOVIR|VALACICLOVIR|GANCICLOVIR|FOSCARNET|OSELTAMIVIR|REMDESIVIR|REM\s*DESIVIR)\b/.test(
      n
    )
  ) {
    return 'abx';
  }
  if (
    /\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|MORFINA|TRAMADOL|IBUPROFENO|NAPROXENO|DICLOFENACO|ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA|BUPRENORFINA|FENTANILO|REMIFENTANILO|SUFENTANILO|HIDROMORFONA|OXICODONA|NALBUFINA|PENTAZOCINA|TAPENTADOL)\b/.test(
      n
    )
  ) {
    return 'analgesia';
  }
  if (
    /\b(HIDROCLOROTIAZ|CLORTALIDONA|INDAPAMIDA|FUROSEMIDA|TORASEMIDA|BUMETANIDA|ESPIRONOLACTONA|EPLERENONA)\b/.test(
      n
    )
  ) {
    return 'diuretico';
  }
  if (
    /\b(ENOXAPARINA|HEPARINA|DALTEPARINA|TINZAPARINA|FONDAPARINUX|NADROPARINA|APIXABAN|RIVAROXABAN|EDOXABAN|DABIGATRAN|WARFARINA|ACENOCUMAROL|CLOPIDOGREL|TICAGRELOR|PRASUGREL|CILOSTAZOL|TICLOPIDINA)\b/.test(
      n
    )
  ) {
    return 'antitromboticos';
  }
  if (
    /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|LEVOTIROXINA|LIOTIRONINA)\b/.test(
      n
    )
  ) {
    return 'nm';
  }
  if (
    /\b(LOSARTAN|IRBESARTAN|VALSARTAN|TELMISARTAN|OLMESARTAN|CANDESARTAN|ENALAPRIL|LISINOPRIL|RAMIPRIL|CAPTOPRIL|AMLODIPINO|NIFEDIPINO|FELODIPINO|LERCANIDIPINO|CARVEDILOL|METOPROLOL|BISOPROLOL|NEBIVOLOL|PROPRANOLOL|ATENOLOL|LABETALOL|ESMOLOL|SOTALOL|CLONIDINA|HIDRALAZINA|MINOXIDIL|NICARDIPINO|CLEVUDIPINO|DILTIAZEM|VERAPAMILO|NITROGLICERINA|ISOSORBIDE|DINITRATO|SACUBITRIL)\b/.test(
      n
    )
  ) {
    return 'antihta';
  }
  if (
    /\b(METFORMINA|REPAGLINIDA|GLIBENCLAMINA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|DEXAMETASONA|BETAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|PREDNISON|PREDNISOLONA|ATORVASTATINA|ROSUVASTATINA|PRAVASTATINA|SINVASTATINA|SALBUTAMOL|LEVOSALBUTAMOL|TERBUTALINA|BUDESONIDA|BECLOMETASONA|FLUTICASONA|TIOTROPIO|IPRATROPIO|FOLICO|CIANOCOBALAMINA|FERROSO|CLORURO\s+DE\s+POTASIO|SULFATO\s+DE\s+MAGNESIO|LACTULOSA|BISACODILO|SENOSIDOS|PROPOFOL|MIDAZOLAM|LORAZEPAM|DIAZEPAM|CLONAZEPAM|HALOPERIDOL|QUETIAPINA|OLANZAPINA|LEVETIRACETAM|FENITOINA|CARBAMAZEPINA|VALPROATO|GABAPENTINA|PREGABALINA|DONEPECILO|MEMANTINA|BROMOCRIPTINA|FINASTERIDA|TAMSULOSINA|SOLIFENACINA|OXYBUTININA)\b/.test(
      n
    )
  ) {
    return 'otros';
  }
  return 'otros';
}
