/**
 * Pure SOAP line builders for Estado Actual text.
 */
import { resolveDietWeightKg, computeDietKcalTotal, isDietaSuplemento } from './estado-actual-data.mjs';
import { formatNmDietClause } from './estado-actual-diet-text.mjs';
import { formatInsulinRescatesClause } from './estado-actual-glu-rescue.mjs';
import { formatIoClauseForSoap } from './estado-actual-io.mjs';
import { isTempFebrile, isHemodynamicallyUnstable, isTempFeverPeak } from './estado-actual-ranges.mjs';
import {
  gluPointMs,
  vitalAlteredTimeForDisplay,
  formatEaVitalPointShorthand,
} from './estado-actual-registro-defaults.mjs';

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

const SOPORTE_MAP = {
  'Aire ambiente': 'AL AIRE AMBIENTE',
  'Puntillas nasales': 'POR PUNTILLAS NASALES',
  'Alto flujo': 'POR ALTO FLUJO',
  'VM no invasiva': 'CON VENTILACIÓN MECÁNICA NO INVASIVA',
  Traqueostomía: 'CON TRAQUEOSTOMÍA',
};

/**
 * @param {Record<string, unknown>} ec
 */
export function resolveSoporteClause(ec) {
  var soporteKey = ec.soporte != null ? String(ec.soporte) : '';
  return SOPORTE_MAP[soporteKey] || 'AL AIRE AMBIENTE';
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
  return isHemodynamicallyUnstable(v, ec.vasop) ? 'INESTABLE' : 'ESTABLE';
}

/**
 * @param {Array<{ value?: unknown, postRescueValue?: unknown }>} glSrc
 */
export function collectGluDisplayValues(glSrc) {
  var gluParts = [];
  for (var gi = 0; gi < glSrc.length; gi++) {
    var gg = glSrc[gi];
    if (!gg || typeof gg !== 'object') continue;
    var gv = gg.postRescueValue != null && gg.postRescueValue !== '' ? gg.postRescueValue : gg.value;
    if (gv == null || gv === '') continue;
    gluParts.push(num(gv));
  }
  return gluParts;
}

/**
 * @param {Array<{ value?: unknown, units?: unknown }>} bombaSrc
 */
export function buildBombaClause(bombaSrc) {
  var bombaParts = [];
  for (var bi = 0; bi < bombaSrc.length; bi++) {
    var bb = bombaSrc[bi];
    if (!bb || typeof bb !== 'object') continue;
    var seg = num(bb.value);
    if (bb.units != null && bb.units !== '') seg += ' (' + num(bb.units) + ' U)';
    bombaParts.push(seg);
  }
  return bombaParts.length > 0 ? ' || BOMBA DE INSULINA (' + bombaParts.join(', ') + ')' : '';
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
 * @param {{ rescatesInSome?: boolean }} [opts]
 */
export function buildNmClause(ec, kcalDisplay, snapIo, btTurno, glSrc, bombaSrc, opts) {
  opts = opts || {};
  var ioClause = formatIoClauseForSoap(snapIo, btTurno);
  var gluParts = collectGluDisplayValues(glSrc);
  var bombaClause = buildBombaClause(bombaSrc);
  var nmMedsClause = medsListForSoap(ec.nm, ' || ');
  var nmParts = [formatNmDietClause(ec, kcalDisplay, { includeProtein: true })];
  if (nmMedsClause) nmParts.push(nmMedsClause);
  nmParts.push(ioClause);
  if (gluParts.length) nmParts.push('GLUCOMETRÍAS CAPILARES (' + gluParts.join(', ') + ' MG/DL)');
  if (bombaClause) nmParts.push(bombaClause.replace(/^\s*\|\|\s*/, ''));
  else {
    var rescatesClause = formatInsulinRescatesClause(glSrc, { rescatesInSome: opts.rescatesInSome });
    if (rescatesClause) nmParts.push(rescatesClause);
  }
  return nmParts.join(' || ');
}

/**
 * @param {Record<string, unknown>} ec
 * @param {Record<string, unknown>} v
 * @param {string} soporte
 * @param {string} hiTemp
 * @param {string} vasopClause
 * @param {string} nmClause
 */
export function assembleSoapLines(ec, v, soporte, hiTemp, vasopClause, nmClause) {
  return [
    'N: FOUR ' +
      num(ec.four) +
      '/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ' +
      num(ec.esferas) +
      ' ESFERAS, ALERTA || ANALGESIA CON ' +
      medsClauseOrFallback(ec.analgesia, '___'),
    'V: FR ' +
      num(v.fr) +
      ' RPM, SATO2 ' +
      num(v.sat) +
      '% ' +
      soporte +
      ' | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS',
    'HD: ' +
      resolveHemodynamicLabel(v, ec) +
      ', TA ' +
      num(v.tas) +
      '/' +
      num(v.tad) +
      ' MMHG, FC ' +
      num(v.fc) +
      ' LPM || ANTIHIPERTENSIVOS: ' +
      medsClauseOrFallback(ec.antihta, 'NINGUNO') +
      ' || DIURÉTICOS: ' +
      medsClauseOrFallback(ec.diureticos, 'NINGUNO') +
      ' || ANTITROMBOTICOS: ' +
      medsClauseOrFallback(ec.antitromboticos, 'NINGUNO') +
      ' || ' +
      vasopClause,
    'HI: ' + resolveFebrilLabel(v) + ', ' + hiTemp + ' || ANTIBIÓTICOS: ' + medsClauseOrFallback(ec.abx, 'NINGUNO'),
    'NM: ' + nmClause,
  ];
}
