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

import { resolveDietWeightKg, computeDietKcalTotal } from './estado-actual-data.mjs';

/**
 * Pure SOAP Estado Actual texto (sin Subjetivo): snapshot SV/glu/io + estado clínico + balance de turno.
 * @param {Record<string, unknown> | null | undefined} estadoClinico
 * @param {{ vitals?: Record<string, unknown>, glucometrias?: Array<{ value?: unknown }>, io?: { ing?: unknown, egr?: unknown } } | null | undefined} snapshot
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
  var ing =
    snapshot && typeof snapshot === 'object' && snapshot.io && typeof snapshot.io === 'object'
      ? /** @type {{ ing?: unknown }} */ (snapshot.io).ing
      : undefined;
  var egr =
    snapshot && typeof snapshot === 'object' && snapshot.io && typeof snapshot.io === 'object'
      ? /** @type {{ egr?: unknown }} */ (snapshot.io).egr
      : undefined;
  var btTurno =
    balances && typeof balances === 'object' ? /** @type {{ balanceTurno?: unknown }} */ (balances).balanceTurno : undefined;
  const balance =
    btTurno != null && btTurno !== ''
      ? /** @type {string} */ ((Number(btTurno) > 0 ? '+' : '') + btTurno)
      : '___';
  /** @type {Record<string, string>} */
  const soporteMap = {
    'Aire ambiente': 'AL AIRE AMBIENTE',
    'Puntillas nasales': 'POR PUNTILLAS NASALES',
    'Alto flujo': 'POR ALTO FLUJO',
    'VM no invasiva': 'CON VENTILACIÓN MECÁNICA NO INVASIVA',
  };
  const soporteKey = ec.soporte != null ? String(ec.soporte) : '';
  const soporte = soporteMap[soporteKey] || 'AL AIRE AMBIENTE';

  const gluParts = [];
  const glSrc =
    snapshot && typeof snapshot === 'object' && Array.isArray(snapshot.glucometrias) ? snapshot.glucometrias : [];
  for (var gi = 0; gi < glSrc.length; gi++) {
    var gg = glSrc[gi];
    var gv = gg && typeof gg === 'object' ? /** @type {{ value?: unknown }} */ (gg).value : undefined;
    gluParts.push(num(gv));
  }
  while (gluParts.length < 3) gluParts.push('___');

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

  const lines = [
    'N: FOUR ' +
      num(ec.four) +
      '/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ' +
      num(ec.esferas) +
      ' ESFERAS, ALERTA || ANALGESIA CON ' +
      val(ec.analgesia),
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
      val(ec.antihta || 'NINGUNO') +
      ' || VASOPRESORES: ' +
      val(ec.vasop || 'NINGUNO'),
    'HI: AFEBRIL, TEMPERATURA ' +
      num(v.temp) +
      ' °C || ANTIBIÓTICOS: ' +
      val(ec.abx || 'NINGUNO'),
    'NM: DIETA ' +
      val(ec.dieta) +
      ' CALCULADA A ' +
      num(ec.kcalKg) +
      ' KCAL/KG (' +
      num(kcalDisplay) +
      ' KCAL) PARA PESO DE ' +
      num(weightKg != null ? weightKg : '') +
      ' KG || INGRESOS ' +
      num(ing) +
      ' CC, EGRESOS ' +
      num(egr) +
      ' CC, BALANCE ' +
      balance +
      ' CC || GLUCOMETRÍAS CAPILARES (' +
      gluParts.join(', ') +
      ' MG/DL)' +
      (options.includeInsulinRescates
        ? ' || RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE'
        : ''),
  ];
  return lines.join('\n');
}
