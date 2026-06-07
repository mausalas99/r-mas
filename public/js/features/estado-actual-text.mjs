/**
 * @param {unknown} v
 * @returns {string}
 */
function num(v) {
  return v !== '' && v != null ? String(v) : '___';
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function val(v) {
  return v ? String(v).toUpperCase() : '___';
}

/**
 * @param {unknown} fieldVal
 * @param {string} joiner
 * @returns {string}
 */
function medsListForSoap(fieldVal, joiner) {
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
 * @returns {string}
 */
function medsClauseOrFallback(fieldVal, fallback) {
  var list = medsListForSoap(fieldVal, ', ');
  return list || fallback;
}

import { resolveDietWeightKg, computeDietKcalTotal } from './estado-actual-data.mjs';
import { formatIoClauseForSoap } from './estado-actual-io.mjs';

/**
 * Pure SOAP Estado Actual texto (sin Subjetivo): snapshot SV/glu/io + estado clínico + balance de turno.
 * @param {Record<string, unknown> | null | undefined} estadoClinico
 * @param {{ vitals?: Record<string, unknown>, glucometrias?: Array<{ value?: unknown }>, io?: { ing?: unknown, egr?: unknown, egrParts?: unknown[], evac?: unknown } } | null | undefined} snapshot
 * @param {{ balanceTurno?: unknown } | null | undefined} balances
 * @param {{ patientPeso?: unknown, includeInsulinRescates?: boolean } | null | undefined} [options]
 * @returns {string}
 */
export function buildEstadoActualText(estadoClinico, snapshot, balances, options) {
  options = options || {};
  /** @type {Record<string, unknown>} */
  const ec = estadoClinico && typeof estadoClinico === 'object' ? /** @type {Record<string, unknown>} */ (estadoClinico) : {};
  /** @type {Record<string, unknown>} */
  const v = snapshot && typeof snapshot === 'object' && snapshot.vitals && typeof snapshot.vitals === 'object' ? snapshot.vitals : {};
  var snapIo =
    snapshot && typeof snapshot === 'object' && snapshot.io && typeof snapshot.io === 'object'
      ? /** @type {{ ing?: unknown, egr?: unknown, egrParts?: unknown[], evac?: unknown }} */ (snapshot.io)
      : {};
  var btTurno =
    balances && typeof balances === 'object' ? /** @type {{ balanceTurno?: unknown }} */ (balances).balanceTurno : undefined;
  const ioClause = formatIoClauseForSoap(snapIo, btTurno);
  /** @type {Record<string, string>} */
  const soporteMap = {
    'Aire ambiente': 'AL AIRE AMBIENTE',
    'Puntillas nasales': 'POR PUNTILLAS NASALES',
    'Alto flujo': 'POR ALTO FLUJO',
    'VM no invasiva': 'CON VENTILACIÓN MECÁNICA NO INVASIVA',
  };
  const soporteKey = ec.soporte != null ? String(ec.soporte) : '';
  const soporte = soporteMap[soporteKey] || 'AL AIRE AMBIENTE';
  var snapAlt =
    snapshot && typeof snapshot === 'object' && snapshot.alteredAt && typeof snapshot.alteredAt === 'object'
      ? /** @type {Record<string, string>} */ (snapshot.alteredAt)
      : {};
  var tempActual = v.temp;
  var tempPeak = v.tempPeak;
  var hiTemp =
    'TEMPERATURA ' +
    num(tempActual) +
    ' °C';
  if (tempPeak != null && tempPeak !== '' && String(tempPeak) !== String(tempActual)) {
    hiTemp +=
      ', TEMPERATURA ' +
      num(tempPeak) +
      ' °C' +
      (snapAlt.tempPeak ? ' @ ' + snapAlt.tempPeak : '');
  } else if (snapAlt.temp) {
    hiTemp += ' @ ' + snapAlt.temp;
  }

  const gluParts = [];
  const glSrc =
    snapshot && typeof snapshot === 'object' && Array.isArray(snapshot.glucometrias) ? snapshot.glucometrias : [];
  for (var gi = 0; gi < glSrc.length; gi++) {
    var gg = glSrc[gi];
    var gv = gg && typeof gg === 'object' ? /** @type {{ value?: unknown }} */ (gg).value : undefined;
    gluParts.push(num(gv));
  }
  while (gluParts.length < 3) gluParts.push('___');

  var bombaParts = [];
  var bombaSrc =
    snapshot && typeof snapshot === 'object' && Array.isArray(snapshot.bombaInsulina)
      ? snapshot.bombaInsulina
      : [];
  for (var bi = 0; bi < bombaSrc.length; bi++) {
    var bb = bombaSrc[bi];
    if (!bb || typeof bb !== 'object') continue;
    var bv = /** @type {{ value?: unknown, units?: unknown }} */ (bb).value;
    var bu = /** @type {{ value?: unknown, units?: unknown }} */ (bb).units;
    var seg = num(bv) + ' mg/dL';
    if (bu != null && bu !== '') seg += ' (' + num(bu) + ' U)';
    bombaParts.push(seg);
  }
  var bombaClause =
    bombaParts.length > 0 ? ' || BOMBA DE INSULINA (' + bombaParts.join(', ') + ')' : '';

  const weightKg = resolveDietWeightKg({
    patientPeso: options.patientPeso,
    pesoRef: ec.pesoRef,
  });
  const kcalComputed = computeDietKcalTotal(ec.kcalKg, weightKg);
  const kcalDisplay =
    kcalComputed != null
      ? String(kcalComputed)
      : ec.kcal != null && ec.kcal !== ''
        ? ec.kcal
        : '';

  var vasopList = medsListForSoap(ec.vasop, ', ');
  var vasopClause = vasopList ? 'VASOPRESORES: ' + vasopList : 'SIN VASOPRESORES';
  var nmMedsClause = medsListForSoap(ec.nm, ' || ');
  var nmDiet =
    'DIETA ' +
    val(ec.dieta) +
    ' CALCULADA A ' +
    num(ec.kcalKg) +
    ' KCAL/KG (' +
    num(kcalDisplay) +
    ' KCAL) PARA PESO DE ' +
    num(weightKg != null ? weightKg : '') +
    ' KG';
  var nmParts = [nmDiet];
  if (nmMedsClause) nmParts.push(nmMedsClause);
  nmParts.push(ioClause);
  nmParts.push('GLUCOMETRÍAS CAPILARES (' + gluParts.join(', ') + ' MG/DL)');
  if (bombaClause) nmParts.push(bombaClause.replace(/^\s*\|\|\s*/, ''));
  if (options.includeInsulinRescates) {
    nmParts.push('RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE');
  }

  const lines = [
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
      ' || ' +
      vasopClause,
    'HI: AFEBRIL, ' +
      hiTemp +
      ' || ANTIBIÓTICOS: ' +
      medsClauseOrFallback(ec.abx, 'NINGUNO'),
    'NM: ' + nmParts.join(' || '),
  ];
  return lines.join('\n');
}
