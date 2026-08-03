/**
 * Shell patient field updates from header/sidebar inputs.
 */
import { ensurePatientAccesos, syncLegacyAccesoFields } from './patient-accesos.mjs';
import { dateInputValueToAccesoFecha } from './patient-date-fields.mjs';
import { isPaseMode } from './features/chrome.mjs';
import {
  renderPatientList,
  renderRoundOverviewPanels,
} from './features/patients.mjs';
import { patients, saveState } from './app-state.mjs';
import { touchPatientLanUpdatedAt } from './features/lan/patient-entries.mjs';
import { scheduleLiveSyncPush } from './features/lan/push.mjs';

function normalizePatientFieldValue(field, value) {
  if (field === 'nombre' || field === 'area' || field === 'servicio') {
    return String(value || '').toUpperCase();
  }
  if (field === 'sala') {
    return String(value || '').trim();
  }
  if (field === 'fiuxFecha' || field === 'fimiFecha') {
    return dateInputValueToAccesoFecha(value) || String(value || '').trim();
  }
  return value;
}

function applyPatientAccesoField(p, field, next) {
  if (field !== 'viaAcceso' && field !== 'accesoFecha') return;
  ensurePatientAccesos(p);
  var accRow =
    p.accesosList.find(function (a) {
      return String((a && a.via) || '').trim();
    }) || p.accesosList[0];
  if (field === 'viaAcceso') accRow.via = String(next || '').trim();
  else accRow.fecha = String(next || '').trim();
  syncLegacyAccesoFields(p);
}

/**
 * @param {{ getActiveId: () => unknown, getActiveAppTab: () => string, getActiveInner: () => string }} shellCtx
 * @param {() => void} syncWorkContextChrome
 */
export function createPatientUpdateHandler(shellCtx, syncWorkContextChrome) {
  function refreshPatientChromeAfterUpdate() {
    saveState();
    renderPatientList();
    syncWorkContextChrome();
    if (!isPaseMode()) return;
    void import('./features/pase-board.mjs').then(function (mod) {
      mod.renderPaseBoard();
    });
    renderRoundOverviewPanels();
    if (shellCtx.getActiveAppTab() === 'agenda') {
      void import('./features/agenda.mjs').then(function (mod) {
        mod.renderProcedureAgendaPanel();
      });
    }
  }

  function updatePatient(field, value) {
    if (shellCtx.getActiveId() == null) return;
    var pid = String(shellCtx.getActiveId());
    var p = patients.find(function (pl) {
      return String(pl.id) === pid;
    });
    if (!p) return;
    var next = normalizePatientFieldValue(field, value);
    if (String(p[field] || '') === String(next || '')) return;
    p[field] = next;
    applyPatientAccesoField(p, field, next);
    touchPatientLanUpdatedAt(pid);
    refreshPatientChromeAfterUpdate();
    scheduleLiveSyncPush();
  }

  return { updatePatient };
}
