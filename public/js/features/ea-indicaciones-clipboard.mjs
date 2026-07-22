/**
 * Pure SOAP/indicaciones clipboard block from confirmed EA meds + insulin pump.
 * Human-in-the-loop copy into hospital Word/EMR — no auto-export.
 */
import { MED_FIELD_KEYS } from './estado-actual-data-constants.mjs';
import { formatNmDietClause } from './estado-actual-diet-text.mjs';
import { partitionAnalgesiaForSoap, partitionNmMedsForSoap } from './estado-actual-med-soap-split.mjs';
import { medsClauseOrEmpty, medsListForSoap } from './estado-actual-text-build.mjs';
import { insulinPumpAlgorithmFromMonitoreo } from './estado-actual-insulin-pump.mjs';
import { formatInsulinPumpAlgoritmoLabel } from '../insulin-pump-some-detect.mjs';
import { hasActiveDietProposal } from './estado-actual-meds-diet.mjs';

/**
 * Confirmed clinical state only (excludes unconfirmed receta proposals).
 * @param {Record<string, unknown>|null|undefined} monitoreo
 * @returns {Record<string, unknown>}
 */
export function pickConfirmedEstadoClinico(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return {};
  var ec =
    monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object'
      ? Object.assign({}, /** @type {Record<string, unknown>} */ (monitoreo.estadoClinico))
      : {};
  var pend =
    monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
      ? /** @type {Record<string, unknown>} */ (monitoreo.pendienteReceta)
      : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object'
      ? /** @type {Record<string, unknown>} */ (monitoreo.confirmado)
      : {};

  MED_FIELD_KEYS.forEach(function (key) {
    if (conf[key]) return;
    var pending = pend[key];
    if (pending == null || !String(pending).trim()) return;
    // Unconfirmed proposal must not leak into clipboard even if ec was mirrored.
    if (String(ec[key] || '').trim() === String(pending).trim()) {
      delete ec[key];
    }
  });

  if (hasActiveDietProposal(pend) && !conf.dieta) {
    delete ec.dieta;
    delete ec.kcal;
    delete ec.kcalKg;
    delete ec.proteinG;
  }
  return ec;
}

/**
 * @param {Record<string, unknown>} ec
 * @param {number|null} bombaAlgoritmo
 * @returns {string[]}
 */
export function buildEaIndicacionesClipboardLines(ec, bombaAlgoritmo) {
  var e = ec && typeof ec === 'object' ? ec : {};
  var analgesiaSplit = partitionAnalgesiaForSoap(e.analgesia);
  var nmPartition = partitionNmMedsForSoap(e.nm);
  var hasDieta = e.dieta != null && String(e.dieta).trim() !== '';
  var dietaClause = hasDieta
    ? formatNmDietClause(e, e.kcal != null ? String(e.kcal) : '', { includeProtein: true })
    : '';
  var nmOther = medsListForSoap(nmPartition.other, ' || ');
  var nmInsulin = medsListForSoap(nmPartition.insulin, ', ');
  var bombaLabel = formatInsulinPumpAlgoritmoLabel(bombaAlgoritmo);

  /** @type {string[]} */
  var nmParts = [];
  if (dietaClause) nmParts.push(dietaClause);
  if (nmOther) nmParts.push(nmOther);
  if (nmPartition.rescatesDisponibles) nmParts.push('RESCATES DE INSULINA DISPONIBLES');
  if (bombaLabel) nmParts.push(bombaLabel);
  if (nmInsulin) nmParts.push('INSULINA: ' + nmInsulin);

  var lines = [
    'ANALGESIA: ' + medsClauseOrEmpty(analgesiaSplit.analgesia),
    'ANTIEMETICOS: ' + medsClauseOrEmpty(e.antiemeticos || analgesiaSplit.antiemeticos),
    'SEDACION: ' + medsClauseOrEmpty(e.sedacion),
    'ANTIEPILEPTICOS: ' + medsClauseOrEmpty(e.antiepilepticos),
    'ANTIPARKINSONIANOS: ' + medsClauseOrEmpty(e.antiparkinsonianos),
    'ANTIDOTOS: ' + medsClauseOrEmpty(e.antidotos),
    'VIA AEREA: ' + medsClauseOrEmpty(e.viaAerea),
    'VASOPRESORES: ' + medsClauseOrEmpty(e.vasop),
    'ANTIHIPERTENSIVOS: ' + medsClauseOrEmpty(e.antihta),
    'TROMBOPROFILAXIS: ' + medsClauseOrEmpty(e.antitromboticos),
    'ANTICOAGULACION: ' + medsClauseOrEmpty(e.anticoagulacion),
    'ANTIARRITMICOS: ' + medsClauseOrEmpty(e.antiarritmicos),
    'DIURETICOS: ' + medsClauseOrEmpty(e.diureticos),
    'ESTATINAS: ' + medsClauseOrEmpty(e.estatinas),
    'ANTIBIOTICOTERAPIA: ' + medsClauseOrEmpty(e.abx),
    'TRANSFUSIONES: ' + medsClauseOrEmpty(e.transfusiones),
    'NM: ' + (nmParts.length ? nmParts.join(' || ') : ''),
  ];
  return lines;
}

/**
 * Drop empty "LABEL: " lines so the paste stays tight for EMR.
 * @param {string[]} lines
 */
export function pruneEmptyIndicacionesLines(lines) {
  return (lines || []).filter(function (line) {
    var s = String(line || '');
    var colon = s.indexOf(':');
    if (colon === -1) return !!s.trim();
    return !!s.slice(colon + 1).trim();
  });
}

/**
 * @param {Record<string, unknown>|null|undefined} monitoreo
 * @returns {string}
 */
export function buildEaIndicacionesClipboardText(monitoreo) {
  var ec = pickConfirmedEstadoClinico(monitoreo);
  var bomba = insulinPumpAlgorithmFromMonitoreo(monitoreo);
  return pruneEmptyIndicacionesLines(buildEaIndicacionesClipboardLines(ec, bomba)).join('\n');
}

/**
 * @param {Record<string, unknown>|null|undefined} monitoreo
 */
export function hasEaIndicacionesClipboardContent(monitoreo) {
  return !!buildEaIndicacionesClipboardText(monitoreo).trim();
}
