/**
 * Auto-append lab interpretation into Eventualidades after Procesar / repo / batch.
 * Solo labs del día actual.
 */
import { patients } from '../app-state.mjs';
import { normalizeFechaLabHistory } from '../tend-core.mjs';
import {
  buildLabEventualidadInterpretText,
  formatLocalTodayFecha,
} from './lab-eventualidad-interpret.mjs';
import { normalizeEventualidadText } from './eventualidades-store.mjs';
import {
  renderEventualidadesPanel,
  savePatientEventualidad,
} from './eventualidades-panel.mjs';

/**
 * @param {object|null|undefined} patient
 * @param {string} text
 * @returns {boolean}
 */
function hasDuplicateEventualidadText(patient, text) {
  var want = normalizeEventualidadText(text);
  if (!want) return false;
  var entries =
    patient && patient.eventualidades && Array.isArray(patient.eventualidades.entries)
      ? patient.eventualidades.entries
      : [];
  var n = entries.length;
  var start = Math.max(0, n - 8);
  for (var i = start; i < n; i++) {
    var e = entries[i];
    if (e && normalizeEventualidadText(e.text) === want) return true;
  }
  return false;
}

function findPatientById(patientId) {
  var id = String(patientId || '');
  return (patients || []).find(function (p) {
    return p && String(p.id) === id;
  });
}

function refreshEventualidadesUi() {
  if (typeof document === 'undefined') return;
  var mount = document.getElementById('exp-pane-eventualidades');
  if (!mount) return;
  renderEventualidadesPanel(mount);
}

/**
 * @param {object} patient
 * @param {object[]} labSets
 * @param {{ filterToday?: boolean, todayFecha?: string }} [opts]
 * @returns {Promise<{ ok: boolean, reason?: string, skipped?: string }>}
 */
export async function autosendLabsToEventualidad(patient, labSets, opts) {
  if (!patient) return { ok: false, reason: 'no-patient' };
  var o = opts || {};
  var filterToday = o.filterToday !== false;
  var text = buildLabEventualidadInterpretText(labSets || [], {
    filterToday: filterToday,
    todayFecha: o.todayFecha || formatLocalTodayFecha(),
    normalizeFecha: normalizeFechaLabHistory,
    includeFallbackCompact: true,
  });
  if (!String(text || '').trim()) return { ok: false, reason: 'empty' };
  if (hasDuplicateEventualidadText(patient, text)) {
    return { ok: true, skipped: 'dup' };
  }
  var out = await savePatientEventualidad(patient, text);
  if (out && out.ok) refreshEventualidadesUi();
  return out && out.ok ? { ok: true } : { ok: false, reason: (out && out.reason) || 'save' };
}

/**
 * After bulk store: one eventualidad per patient with newly stored sets (hoy).
 * @param {Record<string, object[]>} storedByPatient
 * @param {{ showToast?: (msg: string, type?: string) => void }} [opts]
 * @returns {Promise<{ sent: number, skipped: number }>}
 */
export async function autosendLabsEventualidadForStored(storedByPatient, opts) {
  var map = storedByPatient || {};
  var ids = Object.keys(map);
  var sent = 0;
  var skipped = 0;
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var sets = map[id];
    if (!sets || !sets.length) continue;
    var patient = findPatientById(id);
    if (!patient) {
      skipped += 1;
      continue;
    }
    var out = await autosendLabsToEventualidad(patient, sets, { filterToday: true });
    if (out && out.ok && !out.skipped) sent += 1;
    else skipped += 1;
  }
  if (sent > 0 && opts && typeof opts.showToast === 'function') {
    opts.showToast(
      sent === 1
        ? 'Labs enviados a Eventualidades.'
        : sent + ' pacientes: labs → Eventualidades.',
      'success'
    );
  }
  return { sent: sent, skipped: skipped };
}
