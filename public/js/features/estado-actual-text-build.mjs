/**
 * Pure SOAP line builders for Estado Actual text.
 */
import { resolveDietWeightKg, computeDietKcalTotal, isDietaSuplemento } from './estado-actual-data.mjs';
import { formatNmDietClause } from './estado-actual-diet-text.mjs';
import { formatInsulinRescatesClause } from './estado-actual-glu-rescue.mjs';
import { formatIoClauseForSoap } from './estado-actual-io.mjs';

/**
 * @param {unknown} v
 */
export function num(v) {
  return v !== '' && v != null ? String(v) : '___';
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
 * @param {Record<string, string>} snapAlt
 */
export function buildHiTempClause(v, snapAlt) {
  var tempActual = v.temp;
  var tempPeak = v.tempPeak;
  var hiTemp = 'TEMPERATURA ' + num(tempActual) + ' °C';
  if (tempPeak != null && tempPeak !== '' && String(tempPeak) !== String(tempActual)) {
    hiTemp += ' (PICO ' + num(tempPeak) + ' °C';
    if (snapAlt.tempPeak) hiTemp += ' @ ' + snapAlt.tempPeak;
    hiTemp += ')';
  } else if (snapAlt.temp) {
    hiTemp += ' @ ' + snapAlt.temp;
  }
  return hiTemp;
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
    var seg = num(bb.value) + ' mg/dL';
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
 */
export function buildNmClause(ec, kcalDisplay, snapIo, btTurno, glSrc, bombaSrc) {
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
    var rescatesClause = formatInsulinRescatesClause(glSrc);
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
    'HD: ESTABLE, TA ' +
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
    'HI: AFEBRIL, ' + hiTemp + ' || ANTIBIÓTICOS: ' + medsClauseOrFallback(ec.abx, 'NINGUNO'),
    'NM: ' + nmClause,
  ];
}
