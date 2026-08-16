import { trimStr } from './med-receta-util.mjs';
import { stripDiaMarkersFromDosis, effectiveDiaTratamiento } from './med-receta-dates.mjs';
import {
  applyNombreAccents,
  expandNombrePresentacion,
  normalizeVia,
  verbForVia,
  normalizeFrecuencia,
  normalizeSpacesPct,
} from './med-receta-nombre.mjs';
import {
  formatInsulinPumpAlgoritmoLabel,
  insulinPumpAlgorithmForMedicationItem,
  isInsulinPumpCarrierMedicationItem,
} from './insulin-pump-some-detect.mjs';
import { formatRhzeComboSoapShort, isRhzeComboMedicationItem } from './med-receta-tb-combo.mjs';
import { applyIvToOralForEgreso } from './med-receta-iv-oral.mjs';
import { pluralizeOralForm } from './med-receta-iv-oral-some.mjs';

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
function extractVelRateDose_(vel, dosisRaw) {
  var matchers = [
    [/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i, ' MCG/MIN'],
    [/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i, ' MCG/HORA'],
    [/(\d+(?:[.,]\d+)?)\s*MG\s*\/\s*(?:HORA|H)\b/i, ' MG/HORA'],
  ];
  for (var i = 0; i < matchers.length; i++) {
    var m = vel.match(matchers[i][0]);
    if (m) return compactRecetaDoseToken(m[1] + matchers[i][1]);
  }
  var ccHr = vel.match(/(\d+(?:[.,]\d+)?)\s*CC\s*\/\s*(?:HORA|H)\b/i);
  if (ccHr) {
    var bolusMcg = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
    var suffix = /\bMCG\b/i.test(bolusMcg) && !/\bMG\b/i.test(bolusMcg.replace(/\bMCG\b/gi, ''))
      ? ' MCG/HORA'
      : ' CC/HORA';
    return compactRecetaDoseToken(ccHr[1] + suffix);
  }
  if (/^\d+(?:[.,]\d+)?\s*HORAS?\b/i.test(vel)) {
    var bolusTimed = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
    if (bolusTimed) return compactRecetaDoseToken(bolusTimed);
  }
  return '';
}

export function extractRecetaNameOnlyDose(dosisRaw) {
  var parsed = dosisForInfusionParse(dosisRaw);
  if (!parsed) return '';

  var vel = extractVelInfSegment(parsed);
  if (vel) {
    var fromVel = extractVelRateDose_(vel, dosisRaw);
    if (fromVel) return fromVel;
  }

  var anywhereMcgMin = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
  if (anywhereMcgMin) return compactRecetaDoseToken(anywhereMcgMin[1] + ' MCG/MIN');

  var anywhereMcgHr = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
  if (anywhereMcgHr) return compactRecetaDoseToken(anywhereMcgHr[1] + ' MCG/HORA');

  var bolus = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
  if (bolus) return compactRecetaDoseToken(bolus);
  return compactRecetaDoseToken(dosisBeforeSlash(dosisRaw));
}

export function isPrnMedicationItem(item) {
  if (!item) return false;
  var f = trimStr(item.frecuenciaRaw).toUpperCase();
  if (f === 'PRN') return true;
  return /CRITERIO\s+PRN/i.test(item.dosisRaw || '');
}

function isPrnItem(item) {
  return isPrnMedicationItem(item);
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

function formatTomarSolid_(verb, formLabel, amount, unit, count) {
  var n = count > 1 ? count : 1;
  return verb + ' ' + n + ' ' + pluralizeOralForm(formLabel, n) + ' (' + amount.replace(',', '.') + ' ' + unit + ')';
}

function oralEquivUnits_(item) {
  var eq = item && item.oralEquiv;
  return eq && eq.units > 1 ? eq.units : 0;
}

export function formatOralEquivSuffix(item) {
  var eq = item && item.oralEquiv;
  if (!eq || !(eq.units > 1)) return '';
  var unitLabel = eq.unitMg >= 1000 && eq.unitMg % 1000 === 0
    ? eq.unitMg / 1000 + 'G'
    : String(eq.unitMg).replace(/\.0$/, '') + 'MG';
  return ' (' + eq.units + ' ' + pluralizeOralForm(eq.form, eq.units) + ' DE ' + unitLabel + ')';
}

function formatTomarAmount_(mMl, mG) {
  if (mMl) return 'TOMAR ' + mMl[1].replace(',', '.') + ' ML';
  if (mG) return 'TOMAR ' + mG[1].replace(',', '.') + ' G';
  return '';
}

function instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido) {
  var verb = verbForVia(viaNorm);
  var isTab = /\bTABLETA\b/i.test(nombreExpandido);
  var isCap = /\bCÁPSULA\b/i.test(nombreExpandido);
  var mMg = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*MG$/i);
  var mMl = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*ML$/i);
  var mG = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);

  var packUnits = oralEquivUnits_(item);
  if (mG && verb !== 'TOMAR') return verb + ' ' + mG[1].replace(',', '.') + ' G';
  if (verb === 'TOMAR') {
    if (isTab && mMg) return formatTomarSolid_(verb, 'TABLETA', mMg[1], 'MG', packUnits);
    if (isCap && mMg) return formatTomarSolid_(verb, 'CÁPSULA', mMg[1], 'MG', packUnits);
    if (isTab && mG) return formatTomarSolid_(verb, 'TABLETA', mG[1], 'G', packUnits);
    if (isCap && mG) return formatTomarSolid_(verb, 'CÁPSULA', mG[1], 'G', packUnits);
    var tomarAmt = formatTomarAmount_(mMl, mG);
    if (tomarAmt) return tomarAmt;
  }
  if (mMg) return verb + ' ' + mMg[1].replace(',', '.') + ' MG';
  if (mMl) return verb + ' ' + mMl[1].replace(',', '.') + ' ML';
  return verb + ' ' + dosisPrincipal;
}

/**
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} item
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function formatMedicationEgresoLine(item, opts) {
  item = applyIvToOralForEgreso(item, opts);
  var viaNorm = normalizeVia(item.viaRaw);
  var nombreExpandido = applyNombreAccents(expandNombrePresentacion(item.nombreRaw));
  var dosisPrincipal = dosisBeforeSlash(item.dosisRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var prn = isPrnItem(item);

  if (prn) {
    var critRaw = extractPrnTail(item.dosisRaw);
    if (!critRaw) critRaw = freqNorm;
    var prnAmount =
      viaNorm === 'VÍA ORAL'
        ? instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido)
        : 'ADMINISTRAR ' + dosisPrincipal;
    if (/HIPOGLUCEMIA/i.test(critRaw)) {
      var hypo = polishHypoPrnCriterion(critRaw);
      return (
        nombreExpandido +
        ' || ' +
        prnAmount +
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
        ' || ' +
        prnAmount +
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
  var all = items || [];
  var list = all.filter(function (it) {
    return it && !it.suspendido && !isInsulinPumpCarrierMedicationItem(it, all);
  });
  var lines = list.map(function (it) {
    var alg = insulinPumpAlgorithmForMedicationItem(all, it);
    if (alg != null) {
      return formatInsulinPumpAlgoritmoLabel(alg) + ', SIN SUSPENDER HASTA NUEVO AVISO.';
    }
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
function formatSoapPrnHypo_(nombre, dosisCompact, via, critRaw) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  parts.push(polishHypoPrnCriterion(critRaw).toUpperCase());
  return parts.join(' ');
}

function formatSoapPrnNausea_(nombre, dosisCompact, via, critRaw) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  parts.push(soapFreqShort(extractCadaHorasFromCrit(critRaw) || 'CADA 8 HORAS'));
  parts.push('EN CASO DE NÁUSEA O VÓMITO');
  return parts.join(' ');
}

function formatSoapPrnPain_(nombre, dosisCompact, critRaw, freqNorm) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  parts.push(soapFreqShort(extractCadaHorasFromCrit(critRaw) || freqNorm));
  parts.push('EN CASO DE DOLOR LEVE O FIEBRE');
  return parts.join(' ');
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
  return '';
}

function buildSoapStandardLine_(nombre, dosisCompact, via, freqNorm, equivSuffix, item, opts) {
  var parts = [nombre];
  if (dosisCompact) parts.push(dosisCompact);
  if (via) parts.push(soapViaShort(via));
  if (freqNorm) parts.push(soapFreqShort(freqNorm));
  var equiv = equivSuffix.trim();
  if (equiv) parts.push(equiv);
  var dia =
    item.diaTratamiento != null
      ? effectiveDiaTratamiento(item.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate)
      : null;
  if (dia != null) parts.push('DIA ' + dia);
  return parts.join(' ');
}

export function formatMedicationSoapShort(item, opts) {
  if (!item) return '';
  item = applyIvToOralForEgreso(item, opts);
  if (isRhzeComboMedicationItem(item)) return formatRhzeComboSoapShort(item, opts);
  var nombre = compactSoapDrugName(applyNombreAccents(expandNombrePresentacion(item.nombreRaw)));
  var via = normalizeVia(item.viaRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var dosisCompact = extractRecetaNameOnlyDose(item.dosisRaw);
  // Suffix de conversión IV→VO (p.ej. "2 TABLETAS DE 500MG") es contenido de receta,
  // no de Estado Actual. Solo se incluye cuando el llamador lo pide explícitamente.
  var equivSuffix = opts && opts.includeOralEquiv ? formatOralEquivSuffix(item) : '';

  if (isPrnItem(item)) {
    var critRaw = extractPrnTail(item.dosisRaw) || freqNorm;
    var prnLine = formatSoapPrnLine_(nombre, dosisCompact, via, critRaw, freqNorm, equivSuffix);
    if (prnLine) return prnLine;
  }

  return buildSoapStandardLine_(nombre, dosisCompact, via, freqNorm, equivSuffix, item, opts);
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
  var all = items || [];
  var list = all.filter(function (it) {
    return it && !it.suspendido && !isInsulinPumpCarrierMedicationItem(it, all);
  });
  var soapOpts = Object.assign({}, opts, { includeOralEquiv: true });
  var lines = list.map(function (it) {
    var alg = insulinPumpAlgorithmForMedicationItem(all, it);
    if (alg != null) return formatInsulinPumpAlgoritmoLabel(alg);
    return formatMedicationSoapShort(it, soapOpts);
  });
  return lines.join('\n');
}
