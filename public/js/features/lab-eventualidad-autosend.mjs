/**
 * Auto-merge lab interpretation into Eventualidades labsText after Procesar / repo / batch.
 * Solo labs del día actual. No crea entradas clínicas nuevas.
 */
import { patients } from '../app-state.mjs';
import { normalizeFechaLabHistory } from '../tend-core.mjs';
import {
  buildLabEventualidadInterpretText,
  formatLocalTodayFecha,
} from './lab-eventualidad-interpret.mjs';
import {
  renderEventualidadesPanel,
  savePatientEventualidadesLabs,
  selectEventualidadesLabsMode,
} from './eventualidades-panel.mjs';

function findPatientById(patientId) {
  var id = String(patientId || '');
  return (patients || []).find(function (p) {
    return p && String(p.id) === id;
  });
}

function refreshEventualidadesUi() {
  selectEventualidadesLabsMode();
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
  });
  if (!String(text || '').trim()) return { ok: false, reason: 'empty' };
  var out = await savePatientEventualidadesLabs(patient, text, { mode: 'merge' });
  if (out && out.ok && !out.skipped) refreshEventualidadesUi();
  return out && out.ok
    ? { ok: true, skipped: out.skipped }
    : { ok: false, reason: (out && out.reason) || 'save' };
}

/**
 * After bulk store: one labsText merge per patient with newly stored sets (hoy).
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
        ? 'Labs enviados a interpretación en Eventualidades.'
        : sent + ' pacientes: labs → interpretación en Eventualidades.',
      'success'
    );
  }
  return { sent: sent, skipped: skipped };
}
