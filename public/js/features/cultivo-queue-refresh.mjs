/**
 * Fetch lab-repo results on culture date(s) to refresh antibiograma status.
 */
import { patients, labHistory } from '../app-state.mjs';
import { parseFechaLabToMs, normalizeFechaLabHistory } from '../tend-core.mjs';
import {
  labRepoFetchRangeFromDateInputs,
  labRepoToDateInputValue,
} from './lab-repo-import.mjs';
import { classifyLabRepoBatchFetch } from './lab-repo-batch-model.mjs';
import { applyBatchStudyGroups } from './lab-repo-batch-bulk-apply.mjs';
import {
  extractCultivoFollowUpCandidates,
  classifyCultivoFollowUps,
} from './cultivo-queue-model.mjs';

/**
 * @param {string|null|undefined} fechaStr
 * @returns {string|null} YYYY-MM-DD
 */
export function cultivoFechaToIsoDay(fechaStr) {
  var ms = parseFechaLabToMs(fechaStr, '');
  if (ms == null || !isFinite(ms)) return null;
  return labRepoToDateInputValue(new Date(ms));
}

/**
 * @param {{ fecha?: string }[]} items
 * @returns {{ desde: string, hasta: string }|null}
 */
export function cultureDateRangeFromItems(items) {
  var days = [];
  (items || []).forEach(function (it) {
    var iso = cultivoFechaToIsoDay(it && it.fecha);
    if (iso) days.push(iso);
  });
  if (!days.length) return null;
  days.sort();
  return { desde: days[0], hasta: days[days.length - 1] };
}

function patientById(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid) return null;
  var list = patients || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && String(list[i].id) === pid) return list[i];
  }
  return null;
}

function findPatientByRegistro(registro) {
  var reg = String(registro || '').trim();
  if (!reg) return null;
  var list = patients || [];
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    if (p && String(p.registro || '').trim() === reg) return p;
  }
  return null;
}

/**
 * @param {string} patientId
 * @param {Record<string, unknown[]>} [historyByPatient]
 * @returns {{ fecha?: string }[]}
 */
export function pendingAtbCultivoItemsForPatient(patientId, historyByPatient) {
  var pid = String(patientId || '').trim();
  if (!pid) return [];
  var map = historyByPatient || labHistory;
  var candidates = extractCultivoFollowUpCandidates(map[pid] || []);
  return classifyCultivoFollowUps(candidates, null, normalizeFechaLabHistory);
}

/**
 * @param {string} patientId
 * @returns {Promise<{ ok: boolean, kind?: string, reason?: string }>}
 */
export async function refreshPatientCultivoLabsFromRepo(patientId) {
  var items = pendingAtbCultivoItemsForPatient(patientId);
  if (!items.length) return { ok: false, reason: 'no-pending' };
  return refreshCultivoLabsForPatient(patientId, items);
}

/**
 * @param {string} patientId
 * @param {{ fecha?: string }[]} items
 * @returns {{ reason: string }|{ registro: string, range: { desde: Date, hasta: Date } }}
 */
function resolveCultivoRefreshInputs(patientId, items) {
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== 'function') {
    return { reason: 'desktop-only' };
  }
  var p = patientById(patientId);
  var registro = p && p.registro ? String(p.registro).trim() : '';
  if (!registro) return { reason: 'no-registro' };
  var dayRange = cultureDateRangeFromItems(items);
  if (!dayRange) return { reason: 'no-fecha' };
  var range = labRepoFetchRangeFromDateInputs(dayRange.desde, dayRange.hasta);
  if (!range) return { reason: 'bad-range' };
  return { registro: registro, range: range };
}

/**
 * @param {string} kind
 * @returns {{ ok: boolean, kind: string }|null}
 */
function outcomeFromLabRepoFetchKind(kind) {
  if (kind === 'connection') return { ok: false, kind: 'connection' };
  if (kind === 'error') return { ok: false, kind: 'error' };
  if (kind === 'empty') return { ok: true, kind: 'empty' };
  return null;
}

/**
 * @param {string} patientId
 * @param {string} registro
 * @param {unknown[]} studies
 * @param {unknown[]} errors
 */
async function applyCultivoLabRepoBatch(patientId, registro, studies, errors) {
  await import('../lazy-feature-routes.mjs').then(function (routes) {
    return routes.ensureLabsLoaded();
  });
  applyBatchStudyGroups(
    [{ row: { id: String(patientId), registro: registro }, studies: studies, errors: errors }],
    { findPatientByRegistro: findPatientByRegistro }
  );
}

/**
 * @param {string} patientId
 * @param {{ fecha?: string }[]} items
 * @returns {Promise<{ ok: boolean, kind?: string, reason?: string }>}
 */
export async function refreshCultivoLabsForPatient(patientId, items) {
  var inputs = resolveCultivoRefreshInputs(patientId, items);
  if ('reason' in inputs) return { ok: false, reason: inputs.reason };

  var registro = inputs.registro;
  var range = inputs.range;
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: registro,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString(),
    });
    var studies = (res && res.studies) || [];
    var errors = (res && res.errors) || [];
    var kind = classifyLabRepoBatchFetch(studies, errors);
    var early = outcomeFromLabRepoFetchKind(kind);
    if (early) return early;

    await applyCultivoLabRepoBatch(patientId, registro, studies, errors);
    return { ok: true, kind: 'imported' };
  } catch (_err) {
    void _err;
    return { ok: false, kind: 'throw' };
  }
}

/**
 * @param {{ ok: boolean, kind?: string, reason?: string }} outcome
 * @returns {{ toast: string, type: 'ok'|'warn'|'error'|'info' }}
 */
export function cultivoRefreshOutcomeMessage(outcome) {
  var o = outcome || {};
  if (o.reason === 'no-pending') {
    return { toast: 'No hay cultivos con ATB pendiente en este paciente', type: 'info' };
  }
  if (o.reason === 'desktop-only') {
    return { toast: 'Actualizar cultivos solo en la app de escritorio', type: 'warn' };
  }
  if (o.reason === 'no-registro') {
    return { toast: 'Paciente sin registro — no se puede consultar el repositorio', type: 'error' };
  }
  if (o.reason === 'no-fecha' || o.reason === 'bad-range') {
    return { toast: 'Sin fecha de cultivo para consultar', type: 'error' };
  }
  if (o.kind === 'connection') {
    return { toast: 'No se pudo conectar al repositorio de laboratorio', type: 'error' };
  }
  if (o.kind === 'empty') {
    return { toast: 'Sin resultados nuevos en esa fecha', type: 'info' };
  }
  if (o.kind === 'error' || o.kind === 'throw' || !o.ok) {
    return { toast: 'Error al consultar el repositorio', type: 'error' };
  }
  return { toast: 'Labs actualizados — revisa si ya salió el antibiograma', type: 'ok' };
}
