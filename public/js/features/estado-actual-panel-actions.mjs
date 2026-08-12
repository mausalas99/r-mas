/** EA panel actions — registro submit, guardar/copiar, propuestas. */
import { persistClinicalState, getMedRecetaByPatient, getMedNotaSelectionByPatient, getNotes } from '../app-state.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import {
  ensureMonitoreo,
  appendMedicion,
  removeMedicion,
  resolveDietWeightKg,
  syncDietKcalFromWeight,
} from './estado-actual-data.mjs';
import {
  parseIoEgresoLine,
  parseIoEvacField,
  parseIoIngresoField,
  diuresisValueFromParts,
} from './estado-actual-io.mjs';
import {
  datetimeLocalToIso,
  isoToHHmm,
  formatEaSavedLabel,
} from './estado-actual-panel-format.mjs';
import {
  parseVitalsFromForm,
  parseGlucometriasFromForm,
  parseBombaFromForm,
} from './estado-actual-panel-parse-form.mjs';
import { validateVitalSeriesTurnLimits } from './estado-actual-panel-vitals.mjs';
import { MAX_VITAL_READINGS_PER_DAY } from './estado-actual-vital-series.mjs';
import {
  confirmMedField,
  discardMedProposal,
  confirmAllMedProposals,
  confirmDietProposal,
  discardDietProposal,
} from './estado-actual-meds.mjs';
import { backfillDietPendingMacrosFromReceta, selectDietOption } from './estado-actual-meds-diet.mjs';
import { reclassifyEaMedProposal } from './estado-actual-med-reclassify.mjs';
import { EA_MED_FIELD_LABELS } from './estado-actual-med-ui.mjs';
import { bustMedPanelCache } from './medications-runtime-state.mjs';
import { renderMedRecetaPanel } from './medications-panel-render.mjs';
import { renderEstadoActualBar } from './soap-estado.mjs';
import { migrateGranularInner } from '../expediente-tabs.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { findActivePatient } from './estado-actual-panel-core.mjs';
import { eaPanelBridge } from './estado-actual-panel-bridge.mjs';
import {
  flushEaEstadoClinicoFieldsFromDom,
  persistEstadoClinicoAndRefresh,
  getEstadoActualTextForPatient,
} from './estado-actual-panel-clinico.mjs';
import {
  buildRegistroFormMarkup,
  wireEaRegistroForm,
  resetEaRegistroForm,
  applyEstadoActualParsedToForm,
} from './estado-actual-panel-registro.mjs';
import {
  buildEaIndicacionesClipboardText,
  hasEaIndicacionesClipboardContent,
} from './ea-indicaciones-clipboard.mjs';
import { resolveEaNoteSend } from './estado-actual-send-note.mjs';
import { isModeSala } from '../mode-features.mjs';
import { buildRecommendationCardHtml } from '../ui-recommendation.mjs';
import { wrapApprovalInConflictModal } from '../ui-approval-card.mjs';

function parseFormMedicion() {
  var form = document.getElementById('ea-form');
  if (!form) return null;

  var recordedLocal = /** @type {HTMLInputElement | null} */ (document.getElementById('ea-recorded-at'));
  var recordedAt = datetimeLocalToIso(recordedLocal ? recordedLocal.value : '');
  var defaultTime = isoToHHmm(recordedAt);

  var vitalBlock = parseVitalsFromForm(form, defaultTime);
  var bombaToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('ea-bomba-enabled'));
  var bombaOn = !!(bombaToggle && bombaToggle.checked);
  var glucometrias = bombaOn ? [] : parseGlucometriasFromForm(form, defaultTime);
  var bombaInsulina = bombaOn ? parseBombaFromForm(form, defaultTime) : [];

  var ingEl = document.getElementById('ea-io-ing');
  var egrEl = document.getElementById('ea-io-egr');
  var evacEl = document.getElementById('ea-io-evac');
  var egrParts = parseIoEgresoLine(egrEl && 'value' in egrEl ? String(egrEl.value) : '');

  return {
    id: Date.now().toString() + '-ea',
    recordedAt: recordedAt,
    vitals: vitalBlock.vitals,
    vitalSeries: vitalBlock.vitalSeries,
    alteredAt: vitalBlock.alteredAt,
    glucometrias: glucometrias,
    bombaInsulina: bombaInsulina,
    io: {
      ing: parseIoIngresoField(ingEl && 'value' in ingEl ? ingEl.value : ''),
      egr: diuresisValueFromParts(egrParts),
      egrParts: egrParts,
      evac: parseIoEvacField(evacEl && 'value' in evacEl ? evacEl.value : ''),
    },
  };
}

export function registrarEstadoActualMedicion() {
  var patient = findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast('Selecciona un paciente primero', 'error');
    return;
  }
  ensureMonitoreo(patient);
  var medicion = parseFormMedicion();
  if (!medicion) {
    getEaPanelRuntime().showToast('Formulario no disponible', 'error');
    return;
  }
  var vitalLimit = validateVitalSeriesTurnLimits(patient.monitoreo.historial, medicion.vitalSeries || {});
  if (!vitalLimit.ok) {
    getEaPanelRuntime().showToast(
      'Máximo ' + MAX_VITAL_READINGS_PER_DAY + ' lecturas de ' + vitalLimit.label + ' en el turno',
      'error'
    );
    return;
  }
  var result = appendMedicion(patient.monitoreo, medicion);
  if (!result.ok) {
    getEaPanelRuntime().showToast('No se pudo registrar la medición', 'error');
    return;
  }
  syncDietKcalFromWeight(
    patient.monitoreo.estadoClinico,
    resolveDietWeightKg({
      patientPeso: patient.peso,
      pesoRef: patient.monitoreo.estadoClinico && patient.monitoreo.estadoClinico.pesoRef,
    })
  );
  persistClinicalState();
  scheduleCloudSyncPush();
  resetEaRegistroForm(null);
  if (getEaPanelRuntime().invalidateInnerTabRenderCache) getEaPanelRuntime().invalidateInnerTabRenderCache('estadoActual');
  if (typeof window.closeEstadoActualRegistroModal === 'function') window.closeEstadoActualRegistroModal();
  eaPanelBridge.renderEstadoActualPanel({ syncHeavy: true, dataOnly: true });
  getEaPanelRuntime().showToast('Medición registrada ✓', 'success');
  if (typeof getEaPanelRuntime().onMedicionRegistered === 'function') getEaPanelRuntime().onMedicionRegistered();
}

export function ensureEaRegistroModalForm() {
  var body = document.getElementById('ea-registro-modal-body');
  if (!body) return;
  if (
    !body.querySelector('#ea-form') ||
    !body.querySelector('.ea-registro-shell') ||
    !body.querySelector('[data-ea-vital-stack="tas"]') ||
    !body.querySelector('#ea-add-glu.ea-glu-add-inline')
  ) {
    body.innerHTML = buildRegistroFormMarkup();
  }
  var patient = findActivePatient();
  wireEaRegistroForm(patient && patient.monitoreo ? patient.monitoreo : null);
}

/**
 * @param {string} id
 */
export function eliminarEstadoActualMedicion(id) {
  var patient = findActivePatient();
  if (!patient || !id) return;
  ensureMonitoreo(patient);
  removeMedicion(patient.monitoreo, id);
  persistClinicalState();
  scheduleCloudSyncPush();
  eaPanelBridge.renderEstadoActualPanel({ syncHeavy: true });
  getEaPanelRuntime().showToast('Medición eliminada', 'success');
}

/**
 * @param {ReturnType<typeof findActivePatient>} patient
 * @param {string} text
 */
function persistEstadoActualTexto(patient, text) {
  if (!patient || !patient.monitoreo) return;
  patient.monitoreo.textoGuardado = {
    text: text,
    savedAt: new Date().toISOString(),
  };
  persistClinicalState();
  scheduleCloudSyncPush();
  renderEstadoActualBar();
  var meta = document.getElementById('ea-meta-guardado');
  if (meta && patient.monitoreo.textoGuardado.savedAt) {
    meta.textContent = formatEaSavedLabel(patient.monitoreo.textoGuardado.savedAt);
  }
}

export function estadoActualGuardar() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    getEaPanelRuntime().showToast('No hay texto para guardar', 'error');
    return;
  }
  persistEstadoActualTexto(patient, text);
  getEaPanelRuntime().showToast('Estado Actual guardado ✓', 'success');
}

export async function estadoActualGuardarCopiar() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    getEaPanelRuntime().showToast('No hay texto para guardar', 'error');
    return;
  }
  persistEstadoActualTexto(patient, text);
  var ok = await getEaPanelRuntime().copyToClipboardSafe(text);
  getEaPanelRuntime().showToast(
    ok ? 'Estado Actual guardado y copiado ✓' : 'Guardado, pero no se pudo copiar',
    ok ? 'success' : 'error'
  );
}

function navigateToNotasAfterEaSend() {
  var runtime = getEaPanelRuntime();
  if (typeof runtime.switchInnerTab === 'function') {
    runtime.switchInnerTab('notas');
    return;
  }
  if (typeof runtime.switchConsolidatedTab === 'function') {
    runtime.switchConsolidatedTab('clinico');
  }
}

function showEaReplaceEvolucionConfirm(onReplace) {
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'ea-note-confirm-backdrop';
  var altsOpen = false;
  function paint() {
    var card = buildRecommendationCardHtml({
      title: '¿Reemplazar evolución?',
      bodyHtml: '<p>La evolución ya tiene contenido. ¿Reemplazarlo con el estado actual?</p>',
      signal: 2,
      tone: 'var(--color-accent)',
      confidenceLabel: 'Revisión humana',
      primaryLabel: 'Reemplazar',
      alternativesLabel: 'Alternativas',
      alternativesOpen: altsOpen,
      alternatives: [
        { key: 'keep', short: 'Conservar la evolución actual', label: 'Sin cambios', signal: 1 },
      ],
    });
    backdrop.innerHTML = wrapApprovalInConflictModal(card);
    var dismiss = function () { backdrop.remove(); };
    var accept = backdrop.querySelector('[data-rec-accept]');
    var altsBtn = backdrop.querySelector('[data-rec-alts]');
    if (accept) {
      accept.addEventListener('click', function () {
        backdrop.remove();
        onReplace();
      });
    }
    if (altsBtn) {
      altsBtn.addEventListener('click', function () {
        altsOpen = !altsOpen;
        paint();
      });
    }
    var keep = backdrop.querySelector('[data-rec-alt="keep"]');
    if (keep) keep.addEventListener('click', dismiss);
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) dismiss();
    });
  }
  paint();
  document.body.appendChild(backdrop);
}

function commitEstadoActualToNote(patient, replaceEvolucion) {
  var activeId = getEaPanelRuntime().getActiveId();
  if (!activeId) return;
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  if (!getNotes()[activeId]) getNotes()[activeId] = {};
  var note = getNotes()[activeId];
  var result = resolveEaNoteSend(patient, note, {
    replaceEvolucion: replaceEvolucion,
    getEstadoActualText: getEstadoActualTextForPatient,
  });
  if (result.status === 'empty') {
    getEaPanelRuntime().showToast('No hay texto para enviar a la nota', 'error');
    return;
  }
  if (result.status === 'confirm') {
    showEaReplaceEvolucionConfirm(function () {
      commitEstadoActualToNote(patient, true);
    });
    return;
  }
  persistClinicalState();
  scheduleCloudSyncPush();
  navigateToNotasAfterEaSend();
  if (typeof getEaPanelRuntime().renderNoteForm === 'function') {
    getEaPanelRuntime().renderNoteForm();
  }
  getEaPanelRuntime().showToast('Estado actual enviado a la nota ✓', 'success');
}

export function estadoActualEnviarANota() {
  if (isModeSala(getEaPanelRuntime().getSettings())) return;
  var patient = findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast('Selecciona un paciente primero', 'error');
    return;
  }
  commitEstadoActualToNote(patient, false);
}

var eaCopyFabBound = false;

function eaCopyFabContextActive() {
  var runtime = getEaPanelRuntime();
  if (typeof runtime.getActiveAppTab === 'function' && runtime.getActiveAppTab() !== 'nota') return false;
  if (typeof runtime.getActiveInner !== 'function' || typeof runtime.getSettings !== 'function') return true;
  var inner = migrateGranularInner(runtime.getActiveInner() || 'todo', runtime.getSettings());
  return inner === 'estadoActual';
}

function hideLabCopyFabDom() {
  var fab = document.getElementById('lab-copy-fab');
  if (!fab) return;
  fab.setAttribute('hidden', '');
  fab.style.display = 'none';
  fab.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('lab-copy-fab-active');
}

function ensureEaCopyFabController() {
  var fab = document.getElementById('ea-copy-fab');
  if (!fab || eaCopyFabBound) return;
  eaCopyFabBound = true;
  if (fab.parentElement !== document.body) document.body.appendChild(fab);
  fab.removeAttribute('onclick');
  fab.addEventListener(
    'mousedown',
    function (e) {
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
  fab.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (fab.hidden) return;
    void copiarEstadoActualTexto();
  });
}

export function syncEaCopyFab(show) {
  ensureEaCopyFabController();
  var visible = !!show && eaCopyFabContextActive();
  if (visible) hideLabCopyFabDom();
  var fab = document.getElementById('ea-copy-fab');
  if (fab) {
    if (visible) {
      fab.removeAttribute('hidden');
      fab.style.display = 'flex';
      fab.setAttribute('aria-hidden', 'false');
    } else {
      fab.setAttribute('hidden', '');
      fab.style.display = 'none';
      fab.setAttribute('aria-hidden', 'true');
    }
  }
  document.documentElement.classList.toggle('ea-copy-fab-active', visible);
}

/** Reconcile sticky copy FAB from current tab + active patient (safe after setActiveInner). */
export function refreshEaCopyFabVisibility() {
  syncEaCopyFab(!!findActivePatient());
}

export function eaHasCopyableContent() {
  var patient = findActivePatient();
  if (!patient) return false;
  var text = getEstadoActualTextForPatient(patient);
  return !!String(text || '').trim();
}

export async function copiarEstadoActualTexto() {
  var patient = findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast('Selecciona un paciente primero', 'error');
    return;
  }
  ensureMonitoreo(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    getEaPanelRuntime().showToast('No hay texto para copiar', 'error');
    return;
  }
  var ok = await getEaPanelRuntime().copyToClipboardSafe(text);
  getEaPanelRuntime().showToast(ok ? 'Texto copiado al portapapeles ✓' : 'No se pudo copiar', ok ? 'success' : 'error');
}

/**
 * Bloque SOAP/indicaciones (meds confirmados + bomba) → portapapeles para Word/EMR.
 */
export async function copiarEaIndicacionesClipboard() {
  var patient = findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast('Selecciona un paciente primero', 'error');
    return;
  }
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  if (!hasEaIndicacionesClipboardContent(patient.monitoreo, {
    activeId: patient.id,
    medRecetaByPatient: getMedRecetaByPatient(),
  })) {
    getEaPanelRuntime().showToast('No hay indicaciones confirmadas para copiar', 'error');
    return;
  }
  var text = buildEaIndicacionesClipboardText(patient.monitoreo, {
    activeId: patient.id,
    medRecetaByPatient: getMedRecetaByPatient(),
  });
  var ok = await getEaPanelRuntime().copyToClipboardSafe(text);
  getEaPanelRuntime().showToast(
    ok ? 'Indicaciones copiadas al portapapeles ✓' : 'No se pudo copiar',
    ok ? 'success' : 'error'
  );
}

/**
 * @param {string} key
 */
export function confirmEaMedField(key) {
  var patient = findActivePatient();
  if (!patient || !key) return;
  ensureMonitoreo(patient);
  confirmMedField(patient.monitoreo, key, {
    patientId: patient.id,
    medRecetaByPatient: getMedRecetaByPatient(),
  });
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuesta confirmada', patient);
}

/**
 * @param {string} key
 */
export function discardEaMedProposal(key) {
  var patient = findActivePatient();
  if (!patient || !key) return;
  ensureMonitoreo(patient);
  discardMedProposal(patient.monitoreo, key);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuesta descartada', patient);
}

export function confirmEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  var activeId = getEaPanelRuntime().getActiveId();
  var recetaBlock = activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null;
  backfillDietPendingMacrosFromReceta(patient.monitoreo, recetaBlock);
  confirmDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Dieta confirmada', patient);
}

export function discardEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  discardDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuesta de dieta descartada', patient);
}

export function selectEaDietOption(index) {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  if (!selectDietOption(patient.monitoreo, index)) return;
  persistEstadoClinicoAndRefresh(patient.monitoreo, null, patient);
}

export function confirmAllEaMedProposals() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  confirmAllMedProposals(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuestas confirmadas', patient);
}

export function toggleEaEstadoClinico() {
  var details = document.querySelector('.ea-estado-clinico');
  if (details && 'open' in details) details.open = !details.open;
}

function eaMedReclassifyPanelEl(key) {
  if (!key || typeof document === 'undefined') return null;
  var escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(key)) : String(key);
  return document.querySelector('[data-ea-med-reclassify-panel="' + escaped + '"]');
}

function eaMedReclassifySelectEl(key) {
  if (!key || typeof document === 'undefined') return null;
  var escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(key)) : String(key);
  return document.querySelector('[data-ea-med-reclassify-select="' + escaped + '"]');
}

/**
 * @param {string} key
 */
export function toggleEaMedReclassifyPanel(key) {
  var panel = eaMedReclassifyPanelEl(key);
  if (!panel) return;
  panel.hidden = !panel.hidden;
}

/**
 * @param {string} fromKey
 */
export function applyEaMedReclassification(fromKey) {
  var patient = findActivePatient();
  if (!patient || !fromKey) return;
  var select = eaMedReclassifySelectEl(fromKey);
  var toKey = select && 'value' in select ? String(select.value).trim() : '';
  if (!toKey) {
    getEaPanelRuntime().showToast('Selecciona una categoría destino', 'warn');
    return;
  }
  ensureMonitoreo(patient);
  var activeId = getEaPanelRuntime().getActiveId();
  var ok = reclassifyEaMedProposal({
    patientId: activeId,
    fromKey: fromKey,
    toKey: toKey,
    monitoreo: patient.monitoreo,
    medRecetaByPatient: getMedRecetaByPatient(),
    medNotaSelectionByPatient: getMedNotaSelectionByPatient(),
  });
  if (!ok) {
    getEaPanelRuntime().showToast('No se pudo reclasificar la propuesta', 'error');
    return;
  }
  persistClinicalState();
  scheduleCloudSyncPush();
  bustMedPanelCache();
  renderMedRecetaPanel();
  var label = EA_MED_FIELD_LABELS[toKey] || toKey;
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Categoría reclasificada: ' + label, patient);
}

export const windowHandlers = {
  registrarEstadoActualMedicion,
  eliminarEstadoActualMedicion,
  estadoActualGuardar,
  estadoActualGuardarCopiar,
  estadoActualEnviarANota,
  copiarEstadoActualTexto,
  copiarEaIndicacionesClipboard,
  confirmEaMedField,
  discardEaMedProposal,
  toggleEaMedReclassifyPanel,
  applyEaMedReclassification,
  confirmEaDietProposal,
  discardEaDietProposal,
  selectEaDietOption,
  confirmAllEaMedProposals,
  toggleEaEstadoClinico,
  applyEstadoActualParsedToForm,
};
