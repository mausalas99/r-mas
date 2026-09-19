/**
 * Pure SOAP line builders for Estado Actual text.
 */
import { resolveDietWeightKg, computeDietKcalTotal, isDietaSuplemento } from './estado-actual-data.mjs';
import { formatNmDietClause } from './estado-actual-diet-text.mjs';
import { formatInsulinRescatesClause } from './estado-actual-glu-rescue.mjs';
import { formatIoClauseForSoap } from './estado-actual-io.mjs';
import { partitionAnalgesiaForSoap, partitionNmMedsForSoap } from './estado-actual-med-soap-split.mjs';
import { isTempFebrile, isTempFeverPeak } from './estado-actual-ranges.mjs';
import {
  gluPointMs,
  vitalAlteredTimeForDisplay,
  formatEaVitalPointShorthand,
} from './estado-actual-registro-defaults.mjs';
import {
  formatSoporteVentilatorioClause,
  formatVentilatorioCalcClause,
} from './estado-actual-ventilatorio.mjs';

/** Máximo de antigüedad del pico febril para documentarlo en SOAP. */
export const TEMP_PICO_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * @param {unknown} v
 */
export function num(v) {
  return v !== '' && v != null ? String(v) : '___';
}

/**
 * @param {Record<string, string>} snapAlt
 * @param {{ recordedAt?: string, time?: string } | null | undefined} tempPeakAt
 */
function resolveTempPeakAtLabel(snapAlt, tempPeakAt) {
  if (tempPeakAt && tempPeakAt.recordedAt) {
    var timeHm =
      tempPeakAt.time != null && String(tempPeakAt.time).trim()
        ? String(tempPeakAt.time)
        : snapAlt.tempPeak || '';
    return formatEaVitalPointShorthand(tempPeakAt.recordedAt, timeHm);
  }
  return vitalAlteredTimeForDisplay(snapAlt.tempPeak);
}

/**
 * @param {unknown} tempPeak
 * @param {unknown} tempActual
 * @param {{ recordedAt?: string, time?: string } | null | undefined} tempPeakAt
 * @param {Date} [now]
 */
export function shouldDocumentTempPeak(tempPeak, tempActual, tempPeakAt, now) {
  if (tempPeak == null || tempPeak === '') return false;
  if (String(tempPeak) === String(tempActual)) return false;
  if (!isTempFeverPeak(tempPeak)) return false;
  if (!tempPeakAt || !tempPeakAt.recordedAt) return true;
  var peakMs = gluPointMs(
    String(tempPeakAt.recordedAt),
    tempPeakAt.time != null ? String(tempPeakAt.time) : ''
  );
  if (!peakMs) return true;
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
  return ref.getTime() - peakMs <= TEMP_PICO_MAX_AGE_MS;
}

/**
 * @param {Record<string, unknown>} v
 * @param {Record<string, string>} snapAlt
 * @param {{ recordedAt?: string, time?: string } | null | undefined} [tempPeakAt]
 * @param {Date} [now]
 */
export function buildHiTempClause(v, snapAlt, tempPeakAt, now) {
  var tempActual = v.temp;
  var tempPeak = v.tempPeak;
  var hiTemp = 'TEMPERATURA ' + num(tempActual) + ' °C';
  if (shouldDocumentTempPeak(tempPeak, tempActual, tempPeakAt, now)) {
    hiTemp += ' (PICO ' + num(tempPeak) + ' °C';
    var peakLabel = resolveTempPeakAtLabel(snapAlt, tempPeakAt);
    if (peakLabel) hiTemp += ' @ ' + peakLabel;
    hiTemp += ')';
  } else {
    var curTime = vitalAlteredTimeForDisplay(snapAlt.temp);
    if (curTime) hiTemp += ' @ ' + curTime;
  }
  return hiTemp;
}

/**
 * @param {unknown} fieldVal
 * @param {string} joiner
 */
export function medsListForSoap(fieldVal, joiner) {
  if (fieldVal == null || !String(fieldVal).trim()) return '';
  return String(fieldVal)
    .split(' | ')
    .map(function (part) {
      return String(part).trim();
    })
    .filter(Boolean)
    .map(function (part) {
      return part.toUpperCase();
    })
    .join(joiner);
}

/**
 * @param {unknown} fieldVal
 * @param {string} fallback
 */
export function medsClauseOrFallback(fieldVal, fallback) {
  var list = medsListForSoap(fieldVal, ', ');
  return list || fallback;
}

/**
 * @param {unknown} fieldVal
 * @returns {string}
 */
export function medsClauseOrEmpty(fieldVal) {
  return medsListForSoap(fieldVal, ', ');
}

/** Fallback when a required SOAP med category has no drugs. */
export const SOAP_EMPTY_MED_FALLBACK = 'NINGUNO';

/**
 * Build "LABEL: value" for SOAP/indicaciones. Empty optional categories return "".
 * Required categories (always) use {@link SOAP_EMPTY_MED_FALLBACK}.
 * @param {string} label
 * @param {string} clause
 * @param {{ always?: boolean }} [opts]
 * @returns {string}
 */
export function soapMedCategorySegment(label, clause, opts) {
  var val = clause != null ? String(clause).trim() : '';
  if (val) return label + ': ' + val;
  if (opts && opts.always) return label + ': ' + SOAP_EMPTY_MED_FALLBACK;
  return '';
}

/**
 * @param {Array<string|false|null|undefined>} segments
 * @param {string} [joiner]
 * @returns {string}
 */
export function joinSoapMedSegments(segments, joiner) {
  return (segments || [])
    .map(function (s) {
      return s != null ? String(s).trim() : '';
    })
    .filter(Boolean)
    .join(joiner != null ? joiner : ' | ');
}

/**
 * @param {Record<string, unknown>} ec
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown }} [ctx]
 */
export function resolveSoporteClause(ec, ctx) {
  return formatSoporteVentilatorioClause(ec) + formatVentilatorioCalcClause(ec, ctx);
}

/**
 * @param {Record<string, unknown>} v
 */
export function resolveFebrilLabel(v) {
  return isTempFebrile(v.temp) ? 'FEBRIL' : 'AFEBRIL';
}

/**
 * @param {Record<string, unknown>} v
 * @param {Record<string, unknown>} ec
 */
export function resolveHemodynamicLabel(v, ec) {
  return 'ESTABLE';
}

/**
 * @param {{ value?: unknown, postRescueValue?: unknown, rescueUnits?: unknown }} gg
 * @returns {string}
 */
export function formatGluSoapSegment(gg) {
  if (!gg || typeof gg !== 'object') return '';
  var rescueUnits = Number(gg.rescueUnits);
  var hasRescue = Number.isFinite(rescueUnits) && rescueUnits > 0;
  if (hasRescue && gg.value != null && gg.value !== '') {
    return num(gg.value) + ', ' + num(rescueUnits) + 'UI';
  }
  var gv = gg.postRescueValue != null && gg.postRescueValue !== '' ? gg.postRescueValue : gg.value;
  if (gv == null || gv === '') return '';
  return num(gv);
}

/**
 * @param {Array<{ value?: unknown, postRescueValue?: unknown, rescueUnits?: unknown }>} glSrc
 */
export function collectGluDisplayValues(glSrc) {
  var gluParts = [];
  for (var gi = 0; gi < glSrc.length; gi++) {
    var seg = formatGluSoapSegment(glSrc[gi]);
    if (seg) gluParts.push(seg);
  }
  return gluParts;
}

/**
 * @param {Array<{ value?: unknown, units?: unknown }>} bombaSrc
 * @param {number | null | undefined} [algorithmNumber]
 */
export function buildBombaClause(bombaSrc, algorithmNumber) {
  var bombaParts = [];
  for (var bi = 0; bi < bombaSrc.length; bi++) {
    var bb = bombaSrc[bi];
    if (!bb || typeof bb !== 'object') continue;
    var seg = num(bb.value);
    if (bb.units != null && bb.units !== '') seg += ' (' + num(bb.units) + ' U)';
    bombaParts.push(seg);
  }
  var alg = algorithmNumber != null && Number.isFinite(Number(algorithmNumber)) ? Number(algorithmNumber) : null;
  var prefix = alg != null ? 'BOMBA DE INSULINA EN ALGORITMO ' + alg : 'BOMBA DE INSULINA';
  if (bombaParts.length > 0) {
    return ' || ' + prefix + ' (' + bombaParts.join(', ') + ')';
  }
  if (alg != null) return ' || ' + prefix;
  return '';
}

/**
 * @param {Record<string, unknown>} ec
 * @param {{ patientPeso?: unknown }} options
 */
export function resolveKcalDisplay(ec, options) {
  options = options || {};
  var weightKg = isDietaSuplemento(ec.dieta)
    ? null
    : resolveDietWeightKg({ patientPeso: options.patientPeso, pesoRef: ec.pesoRef });
  var kcalComputed = weightKg != null ? computeDietKcalTotal(ec.kcalKg, weightKg) : null;
  if (kcalComputed != null) return String(kcalComputed);
  return ec.kcal != null && ec.kcal !== '' ? String(ec.kcal) : '';
}

/**
 * @param {Record<string, unknown>} ec
 * @param {string} kcalDisplay
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: unknown[], evac?: unknown }} snapIo
 * @param {unknown} btTurno
 * @param {Array<{ value?: unknown, postRescueValue?: unknown, rescueUnits?: number }>} glSrc
 * @param {Array<{ value?: unknown, units?: unknown }>} bombaSrc
 * @param {{ rescatesInSome?: boolean, bombaAlgoritmo?: number | null }} [opts]
 */
export function buildNmClause(ec, kcalDisplay, snapIo, btTurno, glSrc, bombaSrc, opts) {
  opts = opts || {};
  var ioClause = formatIoClauseForSoap(snapIo, btTurno);
  var gluParts = collectGluDisplayValues(glSrc);
  var bombaClause = buildBombaClause(bombaSrc, opts.bombaAlgoritmo);
  var nmPartition = partitionNmMedsForSoap(ec.nm);
  var nmOtherClause = medsListForSoap(nmPartition.other, ' || ');
  var nmInsulinClause = medsListForSoap(nmPartition.insulin, ', ');
  var hasAppliedRescates = glSrc.some(function (g) {
    if (!g || typeof g !== 'object') return false;
    var u = Number(/** @type {{ rescueUnits?: unknown }} */ (g).rescueUnits);
    return Number.isFinite(u) && u > 0;
  });
  /** @type {string[]} */
  var nmParts = [formatNmDietClause(ec, kcalDisplay, { includeProtein: true })];
  if (nmOtherClause) nmParts.push(nmOtherClause);
  nmParts.push(ioClause);
  if (gluParts.length) {
    var gluHasRescueFmt = gluParts.some(function (p) {
      return /UI$/.test(p);
    });
    var gluSuffix = gluHasRescueFmt ? '' : ' MG/DL';
    nmParts.push('GLUCOMETRÍAS CAPILARES (' + gluParts.join(', ') + gluSuffix + ')');
  }
  if (bombaClause) nmParts.push(bombaClause.replace(/^\s*\|\|\s*/, ''));
  else if (!hasAppliedRescates) {
    var rescatesClause = nmPartition.rescatesDisponibles
      ? 'RESCATES DE INSULINA DISPONIBLES'
      : formatInsulinRescatesClause(glSrc, { rescatesInSome: opts.rescatesInSome });
    if (rescatesClause) nmParts.push(rescatesClause);
  }
  if (nmInsulinClause) nmParts.push('INSULINA: ' + nmInsulinClause);
  return nmParts.join(' || ');
}

/**
 * @param {Record<string, unknown>} ec
 * @param {Record<string, unknown>} v
 * @param {string} soporte
 * @param {string} hiTemp
 * @param {string} nmClause
 */
export function assembleSoapLines(ec, v, soporte, hiTemp, nmClause) {
  var analgesiaSplit = partitionAnalgesiaForSoap(ec.analgesia);
  var analgesiaClause = medsClauseOrEmpty(analgesiaSplit.analgesia);
  var antipireticosClause = medsClauseOrEmpty(analgesiaSplit.antipireticos);
  var antiemeticosClause = medsClauseOrEmpty(ec.antiemeticos || analgesiaSplit.antiemeticos);
  var sedacionClause = medsClauseOrEmpty(ec.sedacion);
  var antiepilepticosClause = medsClauseOrEmpty(ec.antiepilepticos);
  var antiparkinsonianosClause = medsClauseOrEmpty(ec.antiparkinsonianos);
  var antidotosClause = medsClauseOrEmpty(ec.antidotos);
  var viaAereaClause = medsClauseOrEmpty(ec.viaAerea);
  var vasopClause = medsClauseOrEmpty(ec.vasop);
  var nMeds = joinSoapMedSegments([
    soapMedCategorySegment('ANALGESIA', analgesiaClause),
    soapMedCategorySegment('ANALGESIA / ANTIPIRETICOS', antipireticosClause),
    soapMedCategorySegment('ANTIEMETICOS', antiemeticosClause),
    soapMedCategorySegment('SEDACION', sedacionClause),
    soapMedCategorySegment('ANTIEPILEPTICOS', antiepilepticosClause),
    soapMedCategorySegment('ANTIPARKINSONIANOS', antiparkinsonianosClause),
    soapMedCategorySegment('ANTIDOTOS', antidotosClause),
  ]);
  var hdMeds = joinSoapMedSegments([
    soapMedCategorySegment('VASOPRESORES', vasopClause, { always: true }),
    soapMedCategorySegment('ANTIHIPERTENSIVOS', medsClauseOrEmpty(ec.antihta), { always: true }),
    soapMedCategorySegment('TROMBOPROFILAXIS', medsClauseOrEmpty(ec.antitromboticos), {
      always: true,
    }),
    soapMedCategorySegment('ANTICOAGULACION', medsClauseOrEmpty(ec.anticoagulacion)),
    soapMedCategorySegment('ANTIARRITMICOS', medsClauseOrEmpty(ec.antiarritmicos)),
    soapMedCategorySegment('DIURÉTICOS', medsClauseOrEmpty(ec.diureticos)),
    soapMedCategorySegment('ESTATINAS', medsClauseOrEmpty(ec.estatinas)),
  ]);
  var hiMeds = joinSoapMedSegments([
    soapMedCategorySegment('ANTIBIOTICOTERAPIA', medsClauseOrEmpty(ec.abx), { always: true }),
    soapMedCategorySegment('TRANSFUSIONES', medsClauseOrEmpty(ec.transfusiones)),
  ]);
  return [
    'N: FOUR ' +
      num(ec.four) +
      '/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ' +
      num(ec.esferas) +
      ' ESFERAS, ALERTA' +
      (nMeds ? ' || ' + nMeds : ''),
    'V: FR ' +
      num(v.fr) +
      ' RPM, SATO2 ' +
      num(v.sat) +
      '% ' +
      soporte +
      ' | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS' +
      (viaAereaClause ? ' || VIA AEREA: ' + viaAereaClause : ''),
    'HD: ' +
      resolveHemodynamicLabel(v, ec) +
      ', TA ' +
      num(v.tas) +
      '/' +
      num(v.tad) +
      ' MMHG, FC ' +
      num(v.fc) +
      ' LPM || ' +
      hdMeds,
    'HI: ' + resolveFebrilLabel(v) + ', ' + hiTemp + ' || ' + hiMeds,
    'NM: ' + nmClause,
  ];
}
