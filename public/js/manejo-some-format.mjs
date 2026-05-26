/**
 * Conversión de catálogos Manejo → pedidos SOME estructurados.
 * Campos: medicamento, dosis, vía, dilución, frecuencia, velocidad, comentarios.
 */
import { toSomeUpper } from './electrolyte-manejo.mjs';
import {
  DEXTROSE_5,
  DEXTROSE_5_FULL,
  NACL_09,
  NACL_09_FULL,
  normalizeFluidTerms,
} from './manejo-fluid-terms.mjs';
import { insulinUnitsPerHourForGlucose } from './manejo-insulin-pump-algorithms.mjs';

/** @typedef {{ medication: string, route: string, doseValue: number|string, doseUnit: string, dilution: string, frequency: string, infusionRateMlHr: number|null|string, comments: string, requiresDilution?: boolean }} SomeOrderLike */

/** @param {Partial<SomeOrderLike>} parts */
export function buildSomeOrder(parts) {
  var p = parts || {};
  return {
    medication: p.medication || '',
    route: p.route || '',
    doseValue: p.doseValue != null ? p.doseValue : '',
    doseUnit: p.doseUnit || '',
    dilution: p.dilution || '',
    frequency: p.frequency || '',
    infusionRateMlHr: p.infusionRateMlHr != null ? p.infusionRateMlHr : null,
    comments: p.comments || '',
    requiresDilution: !!p.requiresDilution,
  };
}

function normalizeFrequency(raw) {
  var s = String(raw || '').trim();
  if (!s) return '';
  var cH = s.match(/c\s*\/\s*(\d+)\s*h(?:oras?)?/i);
  if (cH) return 'CADA ' + cH[1] + ' H';
  var cada = s.match(/cada\s+(\d+)\s*h(?:oras?)?/i);
  if (cada) return 'CADA ' + cada[1] + ' H';
  var qH = s.match(/\bq\s*(\d+)\s*h\b/i);
  if (qH) return 'CADA ' + qH[1] + ' H';
  if (/dosis\s+[úu]nica\s+diaria/i.test(s)) return 'CADA 24 H (DOSIS ÚNICA)';
  if (/c\/24\s*h/i.test(s)) return 'CADA 24 H';
  if (/c\/12\s*h/i.test(s)) return 'CADA 12 H';
  if (/c\/8\s*h/i.test(s)) return 'CADA 8 H';
  if (/c\/6\s*h/i.test(s)) return 'CADA 6 H';
  return toSomeUpper(s);
}

function extractFrequencyFromText(text) {
  var src = String(text || '');
  var patterns = [
    /\bc\s*\/\s*\d+\s*h(?:oras?)?(?:\s*\([^)]*\))?/i,
    /\bcada\s+\d+\s*h(?:oras?)?/i,
    /\bq\s*\d+\s*h\b/i,
    /\d+\s*h\s+c\/\d+\s*h/i,
    /dosis\s+[úu]nica\s+diaria/i,
    /c\/12\s*h/i,
    /c\/8\s*h/i,
    /c\/6\s*h/i,
    /c\/24\s*h/i,
    /c\/4\s*[–-]\s*6\s*h/i,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = src.match(patterns[i]);
    if (m) return normalizeFrequency(m[0]);
  }
  return '';
}

function extractDilutionFromText(text) {
  var src = String(text || '');
  var m =
    src.match(
      /(?:en|diluir\s+en)\s+(\d+\s*cc[^.;]*(?:glucosado|g5%|ss\s*0\.?9%|fisiol|soluci[oó]n)[^.;]*)/i
    ) ||
    src.match(/(\d+\s*cc\s+(?:de\s+)?glucosado[^.;]*)/i) ||
    src.match(/(\d+\s*cc\s+ss\s*0\.?9%[^.;]*)/i);
  if (m) return toSomeUpper(normalizeFluidTerms(m[1].trim()));
  if (/no diluir/i.test(src)) return 'NO DILUIR';
  return '';
}

function extractInfusionRateFromText(text) {
  var src = String(text || '');
  var ccHr = src.match(/(\d+(?:\.\d+)?)\s*cc\s*\/\s*h/i);
  if (ccHr) return ccHr[1];
  var mcgMin = src.match(/(\d+(?:\.\d+)?)\s*mcg\s*\/\s*min/i);
  if (mcgMin) return mcgMin[1] + ' MCG/MIN';
  var uMin = src.match(/(\d+(?:\.\d+)?)\s*u\s*\/\s*min/i);
  if (uMin) return uMin[1] + ' U/MIN';
  var mgMin = src.match(/(\d+(?:\.\d+)?)\s*mg\s*\/\s*min/i);
  if (mgMin) return mgMin[1] + ' MG/MIN';
  var uKgH = src.match(/(\d+(?:\.\d+)?)\s*u\s*\/\s*kg\s*\/\s*h/i);
  if (uKgH) return uKgH[1] + ' U/KG/H';
  var paraH = src.match(/para\s+(\d+)\s*h/i);
  var enCc = src.match(/en\s+(\d+)\s*cc/i);
  if (paraH && enCc) {
    var rate = Math.round((Number(enCc[1]) / Number(paraH[1])) * 10) / 10;
    if (Number.isFinite(rate)) return String(rate);
  }
  return null;
}

function stripFrequencyFromDose(text, frequencyRaw) {
  var dose = String(text || '').trim();
  if (!dose) return '';
  dose = dose.replace(/\s*\([^)]*ajustar[^)]*\)\s*/gi, ' ').trim();
  if (frequencyRaw) {
    dose = dose.replace(frequencyRaw, '').trim();
  }
  dose = dose.replace(/\s*;\s*$/, '').replace(/\s+\.\s*$/, '').trim();
  return dose;
}

function splitDoseParts(doseText) {
  var dose = String(doseText || '').trim();
  if (!dose) return { doseValue: '', doseUnit: '' };
  var m = dose.match(/^([\d.,\s–\-]+(?:\s*mg|\s*g|\s*mcg|\s*ui|\s*u|\s*meq)?(?:\/[\d.]+\s*mg)?)/i);
  if (m) {
    return {
      doseValue: m[1].trim(),
      doseUnit: dose.slice(m[1].length).trim() || '',
    };
  }
  return { doseValue: dose, doseUnit: '' };
}

/** @param {string} adultDose @param {string} route @param {string} [renalNote] */
export function parseDoseLineToSomeFields(adultDose, route, renalNote) {
  var src = String(adultDose || '').trim();
  var frequency = extractFrequencyFromText(src);
  var dilution = extractDilutionFromText(src);
  var infusionRateMlHr = extractInfusionRateFromText(src);
  var doseOnly = stripFrequencyFromDose(src, frequency ? src.match(/\bc\s*\/\s*\d+\s*h[^;]*/i)?.[0] : '');
  if (!doseOnly) doseOnly = src.split(';')[0].trim();
  var parts = splitDoseParts(doseOnly.replace(/\s+IV\b.*$/i, '').replace(/\s+VO\b.*$/i, '').trim());
  return buildSomeOrder({
    doseValue: parts.doseValue,
    doseUnit: parts.doseUnit,
    route: route || 'IV',
    dilution: dilution,
    frequency: frequency,
    infusionRateMlHr: infusionRateMlHr,
    comments: renalNote || '',
    requiresDilution: !!dilution && dilution !== 'NO DILUIR',
  });
}

/** @param {{ name?: string, route?: string, adultDose?: string, renalNote?: string, calculatorId?: string }} drug @param {{ copyLine?: string, totalMg?: number, volumeCc?: number, unitsPerHour?: number }|null} calcResult */
export function drugToSomeOrder(drug, calcResult) {
  if (!drug) return buildSomeOrder({});
  var base = parseDoseLineToSomeFields(drug.adultDose, drug.route, drug.renalNote);
  base.medication = drug.name || '';

  if (calcResult && calcResult.copyLine) {
    var copy = String(calcResult.copyLine);
    if (/vancomicina/i.test(copy)) {
      var mg = calcResult.totalMg != null ? calcResult.totalMg : copy.match(/(\d+)\s*mg/i)?.[1];
      var vol = calcResult.volumeCc != null ? calcResult.volumeCc : copy.match(/(\d+)\s*cc/i)?.[1];
      var infH = copy.match(/(\d+)\s*h/i);
      var rate =
        vol && infH && Number(infH[1]) > 0
          ? Math.round((Number(vol) / Number(infH[1])) * 10) / 10
          : null;
      return buildSomeOrder({
        medication: drug.name,
        doseValue: mg != null ? String(mg) : '',
        doseUnit: 'MG',
        route: 'IV',
        dilution: vol != null ? vol + ' ML DE GLUCOSADO 5%' : '',
        frequency: 'CADA 12 H',
        infusionRateMlHr: rate,
        comments: [drug.renalNote, 'INFUSIÓN 2 H'].filter(Boolean).join('; '),
        requiresDilution: true,
      });
    }
    if (/insulina/i.test(copy)) {
      var uH = calcResult.unitsPerHour != null ? calcResult.unitsPerHour : copy.match(/→\s*([\d.]+)/)?.[1];
      return buildSomeOrder({
        medication: 'INSULINA REGULAR',
        doseValue: uH != null ? String(uH) : '',
        doseUnit: 'U/H',
        route: 'IV',
        dilution: '100 ML DE ' + NACL_09,
        frequency: 'INFUSIÓN CONTINUA',
        infusionRateMlHr: null,
        comments: normalizeFluidTerms([copy, drug.renalNote].filter(Boolean).join('; ')),
      });
    }
    base.comments = [copy, base.comments].filter(Boolean).join('; ');
    var calcParts = parseDoseLineToSomeFields(copy, drug.route, drug.renalNote);
    if (calcParts.doseValue) base.doseValue = calcParts.doseValue;
    if (calcParts.doseUnit) base.doseUnit = calcParts.doseUnit;
    if (calcParts.dilution) base.dilution = calcParts.dilution;
    if (calcParts.frequency) base.frequency = calcParts.frequency;
    if (calcParts.infusionRateMlHr != null) base.infusionRateMlHr = calcParts.infusionRateMlHr;
  }

  return normalizeSomeOrder(base);
}

function normalizeSomeOrder(order) {
  var o = order || {};
  return buildSomeOrder({
    medication: normalizeFluidTerms(o.medication),
    route: o.route,
    doseValue: o.doseValue,
    doseUnit: normalizeFluidTerms(o.doseUnit),
    dilution: normalizeFluidTerms(o.dilution),
    frequency: o.frequency,
    infusionRateMlHr: o.infusionRateMlHr,
    comments: normalizeFluidTerms(o.comments),
    requiresDilution: o.requiresDilution,
  });
}

/**
 * @param {{ na?: number|null, k?: number|null, glucoseMgDl?: number|null }} labs
 */
export function suggestIvFluidCarrier(labs) {
  var L = labs || {};
  var na = L.na != null && isFinite(Number(L.na)) ? Number(L.na) : null;
  var glu = L.glucoseMgDl != null && isFinite(Number(L.glucoseMgDl)) ? Number(L.glucoseMgDl) : null;
  var warnings = [];
  var useDextrose = false;
  var bagLabel = NACL_09_FULL + ' (1000 ML)';

  if (na != null && na >= 145) {
    warnings.push(
      'Na ' + na + ' mEq/L: evitar carga adicional de sodio; preferir ' + DEXTROSE_5 + ' si la glucosa lo permite.'
    );
    if (glu != null && glu < 250) {
      useDextrose = true;
      bagLabel = DEXTROSE_5_FULL + ' (1000 ML)';
    } else {
      warnings.push(
        'Hiperglucemia concurrente: mantener ' +
          NACL_09 +
          ' con vigilancia estrecha de Na; reevaluar diluyente al corregir glucosa.'
      );
    }
  }

  if (glu != null && glu >= 250 && !useDextrose) {
    warnings.push(
      'Glucosa ' + glu + ' mg/dL: priorizar corrección con insulina IV; agregar dextrosa a fluidos cuando glucosa ~250 mg/dL.'
    );
  }

  if (L.k != null && L.k >= 5.2) {
    warnings.push('K ' + L.k + ' mEq/L: no suplementar potasio en fluidos hasta < 5.2 mEq/L.');
  }

  return {
    carrier: useDextrose ? DEXTROSE_5 : NACL_09,
    bagLabel: bagLabel,
    dilutionPhrase: 'EN ' + bagLabel,
    warnings: warnings,
    useDextrose: useDextrose,
  };
}

/** @param {'cad'|'ehh'} mode @param {number|null} weightKg @param {{ na?: number, k?: number, glucoseMgDl?: number }} labs */
export function cadEhhFluidSomeOrder(mode, weightKg, labs) {
  var carrier = suggestIvFluidCarrier(labs);
  var comments = carrier.warnings.slice();

  if (mode === 'ehh') {
    var mlHr = weightKg != null && isFinite(weightKg) ? Math.round(weightKg * 17.5) : null;
    comments.unshift('CORREGIR OSMOLALIDAD < 3 MOSM/KG/H');
    return normalizeSomeOrder(
      buildSomeOrder({
        medication: NACL_09,
        doseValue: mlHr != null ? String(mlHr) : '15–20',
        doseUnit: mlHr != null ? 'ML/H' : 'ML/KG/H',
        route: 'IV',
        dilution: '',
        frequency: 'INFUSIÓN CONTINUA',
        infusionRateMlHr: mlHr,
        comments: comments.join('; '),
      })
    );
  }

  comments.unshift(
    'SI NO HAY SHOCK. CONTINUAR NaCl 0.45% O NaCl 0.9%; REPOSICIÓN DE DÉFICIT EN 24–48 H'
  );
  return normalizeSomeOrder(
    buildSomeOrder({
      medication: NACL_09,
      doseValue: '1000',
      doseUnit: 'ML',
      route: 'IV',
      dilution: '',
      frequency: 'PRIMERA HORA',
      infusionRateMlHr: '1000',
      comments: comments.join('; '),
    })
  );
}

/** @param {object} row @param {{ na?: number, k?: number, glucoseMgDl?: number }|null} labs */
export function kRepletionToSomeOrder(row, labs) {
  var carrier = suggestIvFluidCarrier(labs || {});
  var detail = normalizeFluidTerms(String(row.detail || row.copyLine || ''));
  var comments = [detail].concat(carrier.warnings).filter(Boolean);

  if (row.holdInsulin) {
    return normalizeSomeOrder(
      buildSomeOrder({
        medication: 'CLORURO DE POTASIO',
        doseValue: '20',
        doseUnit: 'MEQ/H',
        route: 'IV',
        dilution: 'EN ' + NACL_09_FULL + ' (VOLUMEN SEGÚN CONCENTRACIÓN MÁXIMA INSTITUCIONAL)',
        frequency: 'INFUSIÓN CONTINUA',
        infusionRateMlHr: null,
        comments:
          'SUSPENDER INSULINA HASTA K > 3.3 MEQ/L. MÁX 40 MEQ/H CON MONITOR ECG. REEVALUAR ELECTROLITOS SÉRICOS C/2 H. ' +
          comments.join('; '),
      })
    );
  }

  if (row.addMeqPerLiter != null && row.addMeqPerLiter > 0) {
    return normalizeSomeOrder(
      buildSomeOrder({
        medication: 'CLORURO DE POTASIO',
        doseValue: String(row.addMeqPerLiter),
        doseUnit: 'MEQ',
        route: 'IV',
        dilution: carrier.dilutionPhrase,
        frequency: 'CONTINUO EN FLUIDOS DE MANTENIMIENTO',
        infusionRateMlHr: null,
        comments:
          'AGREGAR ' +
          row.addMeqPerLiter +
          ' MEQ POR LITRO DE ' +
          carrier.carrier +
          ' SI HAY DIURESIS. VIGILAR ELECTROLITOS SÉRICOS C/2–4 H. ' +
          comments.join('; '),
      })
    );
  }

  return normalizeSomeOrder(
    buildSomeOrder({
      medication: 'CLORURO DE POTASIO',
      doseValue: '',
      doseUnit: '',
      route: 'IV',
      dilution: '',
      frequency: 'MONITOREO',
      infusionRateMlHr: null,
      comments:
        'NO AGREGAR POTASIO A FLUIDOS. VIGILAR ELECTROLITOS SÉRICOS SERIADOS HASTA K < 5.2 MEQ/L. ' +
        comments.join('; '),
    })
  );
}

/** @param {{ title?: string, indicationText?: string, notes?: string[], copyTemplate?: string, someFields?: Partial<SomeOrderLike> }} entry @param {{ copyLine?: string }|null} calcResult */
export function protocolToSomeOrder(entry, calcResult) {
  if (!entry) return buildSomeOrder({});
  if (entry.someFields) {
    var fromFields = normalizeSomeOrder(buildSomeOrder(entry.someFields));
    if (calcResult && calcResult.copyLine) {
      var calcFromFields = parseDoseLineToSomeFields(calcResult.copyLine, 'IV', '');
      if (calcFromFields.doseValue || calcFromFields.doseUnit) {
        fromFields.doseValue = calcFromFields.doseValue || fromFields.doseValue;
        fromFields.doseUnit = calcFromFields.doseUnit || fromFields.doseUnit;
      }
      fromFields.comments = normalizeFluidTerms(
        [calcResult.copyLine, fromFields.comments].filter(Boolean).join('; ')
      );
      if (calcFromFields.infusionRateMlHr != null) {
        fromFields.infusionRateMlHr = calcFromFields.infusionRateMlHr;
      }
    }
    return fromFields;
  }
  var text = normalizeFluidTerms(String(entry.indicationText || entry.copyTemplate || ''));
  var base = parseDoseLineToSomeFields(text, 'IV', (entry.notes || []).join('; '));
  base.medication = normalizeFluidTerms(
    String(entry.title || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
  );

  if (calcResult && calcResult.copyLine) {
    var calc = parseDoseLineToSomeFields(calcResult.copyLine, 'IV', '');
    if (calc.doseValue || calc.doseUnit) {
      base.doseValue = calc.doseValue || base.doseValue;
      base.doseUnit = calc.doseUnit || base.doseUnit;
    }
    base.comments = normalizeFluidTerms([calcResult.copyLine, base.comments].filter(Boolean).join('; '));
    if (calc.infusionRateMlHr != null) base.infusionRateMlHr = calc.infusionRateMlHr;
  }

  if (!base.dilution) base.dilution = extractDilutionFromText(text);
  if (!base.frequency) base.frequency = extractFrequencyFromText(text);
  if (base.infusionRateMlHr == null) base.infusionRateMlHr = extractInfusionRateFromText(text);

  if (!base.doseValue && !base.doseUnit) {
    var lead = text.split(/[.;]/)[0].trim();
    var dp = splitDoseParts(lead);
    base.doseValue = dp.doseValue;
    base.doseUnit = dp.doseUnit;
  }

  return normalizeSomeOrder(base);
}

/** @param {{ phase?: string, text?: string, medication?: string }} item */
export function checklistItemToSomeOrder(item, opts) {
  opts = opts || {};
  var text = normalizeFluidTerms(String(item.text || ''));
  var med = normalizeFluidTerms(item.medication || opts.medication || item.phase || 'PROTOCOLO');
  var base = parseDoseLineToSomeFields(text, opts.route || 'IV', opts.comments || '');
  base.medication = med;
  if (!base.doseValue && !base.doseUnit) {
    base.doseUnit = text;
  }
  return normalizeSomeOrder(base);
}

/** @param {{ study?: string, frequency?: string, route?: string, comments?: string, kind?: string }} item */
export function labMonitorToSomeOrder(item) {
  return normalizeSomeOrder(
    buildSomeOrder({
      medication: item.study || 'ESTUDIO DE LABORATORIO',
      doseValue: '',
      doseUnit: '',
      route: item.route || (item.kind === 'nursing' ? 'CUIDADOS DE ENFERMERÍA' : 'LABORATORIO'),
      dilution: '',
      frequency: item.frequency || '',
      infusionRateMlHr: null,
      comments: item.comments || '',
    })
  );
}

/** @param {number|null} glucoseMgDl @param {number} algorithmIndex */
export function insulinPumpSomeOrder(glucoseMgDl, algorithmIndex) {
  var lookup = insulinUnitsPerHourForGlucose(glucoseMgDl, algorithmIndex);
  return normalizeSomeOrder(
    buildSomeOrder({
      medication: 'INSULINA REGULAR',
      doseValue: lookup && lookup.suspend ? 'SUSPENDER' : lookup && lookup.unitsPerHour != null ? String(lookup.unitsPerHour) : '',
      doseUnit: lookup && !lookup.suspend ? 'U/H' : '',
      route: 'IV',
      dilution: '100 ML DE ' + NACL_09,
      frequency: 'INFUSIÓN CONTINUA EN BOMBA',
      infusionRateMlHr: null,
      comments:
        lookup && lookup.band
          ? 'ALGORITMO ' +
            (algorithmIndex + 1) +
            ' · GLUCOSA ' +
            lookup.band +
            ' MG/DL. REEVALUAR CADA 1 H CON GLUCOMETRÍA CAPILAR.'
          : 'SELECCIONAR ALGORITMO Y GLUCOSA ACTUAL.',
    })
  );
}
