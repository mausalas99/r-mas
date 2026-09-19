/**
 * Estado Actual dashboard cards (Descongestión, Congestión/POCUS, Identidad,
 * Estado clínico, Nutrición, Medicamentos) + DOM sync. Each card is a
 * compact read-only summary; clicking one opens a modal with the actual
 * editable fields (see `estado-actual-panel-card-modal.mjs` for the shared
 * modal plumbing, and `estado-actual-panel-cards-html.mjs` for the card
 * faces). Congestión/POCUS keeps its own dedicated modal
 * (`cardio/estado-actual-congestion-modal.mjs`) since it edits a dated log,
 * not live monitoreo state.
 */
import { getPatients, getMedRecetaByPatient, persistClinicalState, getLabHistory } from '../app-state.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import {
  ensureMonitoreo,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  resolveDietWeightKg,
  syncDietKcalFromWeight,
  computeDietKcalTotal,
  isDietaSuplemento,
  isDietaParenteral,
} from './estado-actual-data.mjs';
import {
  hasPendingEaProposals,
  estadoClinicoForDisplay,
  estadoClinicoForText,
  resolveEaAbxFechaActualizacion,
} from './estado-actual-meds.mjs';
import { getDietOptions } from './estado-actual-meds-diet.mjs';
import { renderMedCategoryGrid, wireMedCategoryGrid } from './estado-actual-med-ui.mjs';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { eaPanelBridge } from './estado-actual-panel-bridge.mjs';
import { renderVitalsRowHtml, renderNutricionModalBodyHtml } from './estado-actual-panel-clinico-html.mjs';
import { applyEstadoClinicoFieldChange, hasDietProposal } from './estado-actual-panel-clinico-fields.mjs';
import { resolveVentilatorioLabContext } from './estado-actual-ventilatorio-labs.mjs';
import { DIET_PENDING_KEYS } from './estado-actual-meds.mjs';
import { buildDescongestionStats } from './cardio/estado-actual-cardio-data.mjs';
import { renderDescongestionFormHtml, renderIdentityRowHtml } from './cardio/estado-actual-cardio-html.mjs';
import { fenotipoFromFevi } from '../../../lib/cardio/hf-enums.mjs';
import {
  applyCardioFieldChange,
  applyCardioOverrideChange,
  recalcularCardioOverrides,
} from './cardio/estado-actual-cardio-wire.mjs';
import { openEaCongestionModal } from './cardio/estado-actual-congestion-modal.mjs';
import { renderEaDashboardGridHtml } from './estado-actual-panel-cards-html.mjs';
import { openEaCardModal, closeEaCardModal } from './estado-actual-panel-card-modal.mjs';

/**
 * @param {string | null} activeId
 */
function eaManejoFechaOpts(activeId, monitoreo) {
  var medRecetaByPatient = getMedRecetaByPatient();
  var fechaActualizacion = resolveEaAbxFechaActualizacion(activeId, medRecetaByPatient, monitoreo);
  return fechaActualizacion
    ? { fechaActualizacion: fechaActualizacion, activeId: activeId, medRecetaByPatient: medRecetaByPatient }
    : { activeId: activeId, medRecetaByPatient: medRecetaByPatient };
}

function resolveKcalDisplay(ec, pend, dietPending, dietWeight, dietaParenteral) {
  if ((dietPending && String(pend.kcal || '').trim()) || dietWeight == null || dietaParenteral) {
    return ec.kcal;
  }
  var kcalComputed = computeDietKcalTotal(ec.kcalKg, dietWeight);
  return kcalComputed != null ? String(kcalComputed) : ec.kcal;
}

function buildDietWeightHint(dietWeight) {
  return dietWeight != null
    ? 'Peso para cálculo: ' + dietWeight + ' kg (datos del paciente)'
    : 'Peso para cálculo: — (captura peso en Datos del paciente)';
}

function resolveDietOptionSelected(monitoreo) {
  return monitoreo && monitoreo.dietOptionSelected != null ? Number(monitoreo.dietOptionSelected) : 0;
}

function buildVitalsCtx(monitoreo, activeId, patient) {
  var snap = deriveSnapshot(monitoreo);
  return {
    fr: snap && snap.vitals ? snap.vitals.fr : '',
    sat: snap && snap.vitals ? snap.vitals.sat : '',
    pesoKg: patient && patient.peso,
    lab: resolveVentilatorioLabContext(activeId, getLabHistory()),
  };
}

/**
 * Computes everything the dashboard cards + their modals need from the
 * current monitoreo/patient state. Called on every render and again, fresh,
 * whenever a card is clicked (so a stale render never leaks into a modal).
 */
function buildEaDashboardCtx(monitoreo, activeId, patient) {
  var pend = monitoreo.pendienteReceta || {};
  var dietPending = hasDietProposal(pend);
  var ec = estadoClinicoForDisplay(monitoreo, eaManejoFechaOpts(activeId, monitoreo));
  var dietaSuplemento = isDietaSuplemento(ec.dieta);
  var dietaParenteral = isDietaParenteral(ec.dieta);
  var dietWeight = resolveDietWeightKg({ patientPeso: patient && patient.peso, pesoRef: ec.pesoRef });
  var cardio = (patient && patient.cardio) || null;
  return {
    ec: ec,
    dietPending: dietPending,
    dietaSuplemento: dietaSuplemento,
    dietaParenteral: dietaParenteral,
    kcalDisplay: resolveKcalDisplay(ec, pend, dietPending, dietWeight, dietaParenteral),
    dietWeightHint: buildDietWeightHint(dietWeight),
    dietOptions: getDietOptions(monitoreo),
    dietOptionSelected: resolveDietOptionSelected(monitoreo),
    vitalsCtx: buildVitalsCtx(monitoreo, activeId, patient),
    cardio: cardio,
    descongestionStats: cardio
      ? buildDescongestionStats(patient, monitoreo, { balanceGlobalMl: balanceGlobalHistorico(monitoreo) })
      : null,
    monitoreo: monitoreo,
    activeId: activeId,
    medRecetaByPatient: getMedRecetaByPatient(),
    anyMedPending: hasPendingEaProposals(pend),
  };
}

function renderEaDashboardSection(monitoreo, activeId, patient) {
  return renderEaDashboardGridHtml(buildEaDashboardCtx(monitoreo, activeId, patient));
}

function getEstadoActualTextForPatient(patient) {
  if (!patient || !patient.monitoreo) return '';
  return generateEstadoActualText(patient.monitoreo, patient);
}

export function flushEaEstadoClinicoFieldsFromDom(patient, root) {
  var p = patient;
  if (!p) {
    var activeId = getEaPanelRuntime().getActiveId();
    if (!activeId) return false;
    p = getPatients().find(function (x) { return x && x.id === activeId; }) || null;
  }
  if (!p) return false;
  ensureMonitoreo(p);
  /** @type {any} */
  var mon = p.monitoreo;
  if (!mon || !mon.estadoClinico) return false;
  // Fields live inside whichever card modal is currently open (if any) —
  // not always inside `#exp-pane-estado-actual` — so a document-wide sweep
  // is what actually keeps this a correct safety net now. Each field also
  // already applies itself on every input/change event, so this is
  // typically a no-op; it only catches something that somehow slipped past.
  var mount =
    root && typeof root.querySelector === 'function'
      ? root
      : typeof document !== 'undefined'
        ? document
        : null;
  if (!mount) return false;
  var conf =
    mon.confirmado && typeof mon.confirmado === 'object' ? mon.confirmado : {};
  var dietProposalActive = hasDietProposal(mon.pendienteReceta) && !conf.dieta;
  var changed = false;
  mount.querySelectorAll('[data-ea-ec]').forEach(function (el) {
    var key = el.getAttribute('data-ea-ec');
    if (!key) return;
    var val = 'value' in el ? String(el.value) : '';
    if (String(mon.estadoClinico[key] || '') !== val) {
      mon.estadoClinico[key] = val;
      changed = true;
    }
    if (dietProposalActive && DIET_PENDING_KEYS.indexOf(key) >= 0) {
      if (!mon.pendienteReceta || typeof mon.pendienteReceta !== 'object') mon.pendienteReceta = {};
      if (String(mon.pendienteReceta[key] || '') !== val) {
        mon.pendienteReceta[key] = val;
        changed = true;
      }
    }
  });
  if (changed) mon.estadoClinicoUpdatedAt = new Date().toISOString();
  return changed;
}

function persistEstadoClinicoAndRefresh(monitoreo, toastMsg, patient) {
  flushEaEstadoClinicoFieldsFromDom(patient);
  persistClinicalState();
  scheduleCloudSyncPush();
  eaPanelBridge.renderEstadoActualPanel({ dataOnly: true, refreshClinico: true, skipChartsSummary: true });
  if (patient) refreshOpenEaCardModal(patient, monitoreo, getEaPanelRuntime().getActiveId());
  if (toastMsg) getEaPanelRuntime().showToast(toastMsg, 'success');
}

function persistEstadoClinicoLight(_monitoreo, patient) {
  flushEaEstadoClinicoFieldsFromDom(patient);
  persistClinicalState();
  scheduleCloudSyncPush();
}

function captureEaPanelUiState(mount) {
  if (!mount) return { historialOpen: false };
  var hist = mount.querySelector('.ea-historial');
  return { historialOpen: !!(hist && hist.open) };
}

function restoreEaPanelUiState(mount, state) {
  if (!mount || !state) return;
  if (state.historialOpen) {
    var hist = mount.querySelector('.ea-historial');
    if (hist) hist.open = true;
  }
}

function scrollBodyHtml(contentHtml) {
  return '<div class="ea-registro-form-scroll">' + contentHtml + '</div>';
}

function closeFooterHtml() {
  return (
    '<footer class="ea-registro-modal-foot">' +
    '<div class="modal-actions ea-registro-modal-actions">' +
    '<button type="button" class="btn-med-secondary" data-ea-card-close>Cerrar</button>' +
    '</div>' +
    '</footer>'
  );
}

function wireCloseButton(bodyEl) {
  var btn = bodyEl.querySelector('[data-ea-card-close]');
  if (btn) btn.addEventListener('click', closeEaCardModal);
}

/**
 * Re-renders whichever card modal is currently open, if any — used after a
 * background action (confirm/discard a proposal, "Confirmar todas", etc.)
 * mutates the same monitoreo/cardio state a currently-open modal is showing,
 * so the modal doesn't sit there showing stale values.
 */
function refreshOpenEaCardModal(patient, monitoreo, activeId) {
  var backdrop = typeof document !== 'undefined' ? document.getElementById('ea-card-modal-backdrop') : null;
  var body = typeof document !== 'undefined' ? document.getElementById('ea-card-modal-body') : null;
  if (!backdrop || !body || !backdrop.classList.contains('open')) return;
  var type = body.dataset.eaCardType;
  if (!type) return;
  openCardModalByType(type, patient, monitoreo, activeId);
}

function eaCardioDeps() {
  return {
    persist: function () {
      persistClinicalState();
      scheduleCloudSyncPush();
    },
    refresh: function () {
      eaPanelBridge.renderEstadoActualPanel({ dataOnly: true, refreshClinico: true, skipChartsSummary: true });
    },
  };
}

function openDescongestionModal(patient, monitoreo, activeId) {
  var ctx = buildEaDashboardCtx(monitoreo, activeId, patient);
  var deps = eaCardioDeps();
  openEaCardModal({
    title: 'Descongestión',
    cardType: 'descongestion',
    bodyHtml: scrollBodyHtml(renderDescongestionFormHtml(ctx.descongestionStats)) + closeFooterHtml(),
    wire: function (body) {
      body.querySelectorAll('[data-ea-cardio]').forEach(function (el) {
        var tag = (el.tagName || '').toUpperCase();
        var handler = function () {
          applyCardioFieldChange(el, patient, deps.persist, function () {
            deps.refresh();
          });
        };
        el.addEventListener(tag === 'SELECT' || el.type === 'date' ? 'change' : 'input', handler);
      });
      body.querySelectorAll('[data-ea-cardio-override]').forEach(function (el) {
        el.addEventListener('change', function () {
          applyCardioOverrideChange(el, patient, deps.persist, function () {
            deps.refresh();
            openDescongestionModal(patient, patient.monitoreo, getEaPanelRuntime().getActiveId());
          });
        });
      });
      var recalcBtn = body.querySelector('[data-ea-cardio-action="recalcular"]');
      if (recalcBtn) {
        recalcBtn.addEventListener('click', function () {
          recalcularCardioOverrides(patient, deps.persist, function () {
            deps.refresh();
            openDescongestionModal(patient, patient.monitoreo, getEaPanelRuntime().getActiveId());
          });
        });
      }
      wireCloseButton(body);
    },
  });
}

function openIdentidadModal(patient, monitoreo, activeId) {
  var ctx = buildEaDashboardCtx(monitoreo, activeId, patient);
  var deps = eaCardioDeps();
  openEaCardModal({
    title: 'Identidad',
    cardType: 'identidad',
    bodyHtml: scrollBodyHtml(renderIdentityRowHtml(ctx.cardio)) + closeFooterHtml(),
    wire: function (body) {
      body.querySelectorAll('[data-ea-cardio]').forEach(function (el) {
        var handler = function () {
          applyCardioFieldChange(el, patient, deps.persist, function () {
            deps.refresh();
          });
        };
        el.addEventListener('input', handler);
      });
      // Typing a FEVI auto-selects the matching fenotipo option (doctor can
      // still override the dropdown by hand afterwards — HFimpEF needs a
      // history call the number alone can't make).
      var feviInput = body.querySelector('[data-ea-cardio="fevi"]');
      var fenotipoSelect = body.querySelector('[data-ea-cardio="fenotipo"]');
      if (feviInput && fenotipoSelect) {
        feviInput.addEventListener('input', function () {
          var derived = fenotipoFromFevi(feviInput.value);
          if (!derived) return;
          fenotipoSelect.value = derived;
          patient.cardio.fenotipo = derived;
          deps.persist();
          deps.refresh();
        });
      }
      wireCloseButton(body);
    },
  });
}

function openEstadoClinicoModal(patient, monitoreo, activeId) {
  var ctx = buildEaDashboardCtx(monitoreo, activeId, patient);
  openEaCardModal({
    title: 'Estado clínico',
    cardType: 'estado-clinico',
    bodyHtml:
      scrollBodyHtml('<div class="ea-clinico-grid">' + renderVitalsRowHtml(ctx.ec, ctx.vitalsCtx) + '</div>') +
      closeFooterHtml(),
    wire: function (body) {
      body.querySelectorAll('[data-ea-ec]').forEach(function (el) {
        var tag = (el.tagName || '').toUpperCase();
        var handler = function () {
          applyEstadoClinicoFieldChange(el, patient);
          eaPanelBridge.renderEstadoActualPanel({ dataOnly: true, refreshClinico: true, skipChartsSummary: true });
          if (el.getAttribute('data-ea-ec') === 'soporte') {
            openEstadoClinicoModal(patient, patient.monitoreo, getEaPanelRuntime().getActiveId());
          }
        };
        el.addEventListener(tag === 'SELECT' ? 'change' : 'input', handler);
      });
      wireCloseButton(body);
    },
  });
}

function openNutricionModal(patient, monitoreo, activeId) {
  var ctx = buildEaDashboardCtx(monitoreo, activeId, patient);
  openEaCardModal({
    title: 'Nutrición',
    cardType: 'nutricion',
    bodyHtml:
      scrollBodyHtml(
        renderNutricionModalBodyHtml(
          ctx.ec,
          ctx.dietPending,
          ctx.dietaSuplemento,
          ctx.kcalDisplay,
          ctx.dietWeightHint,
          ctx.dietaParenteral,
          ctx.dietOptions,
          ctx.dietOptionSelected
        )
      ) + closeFooterHtml(),
    wire: function (body) {
      body.querySelectorAll('[data-ea-ec]').forEach(function (el) {
        var handler = function () {
          applyEstadoClinicoFieldChange(el, patient);
          eaPanelBridge.renderEstadoActualPanel({ dataOnly: true, refreshClinico: true, skipChartsSummary: true });
        };
        el.addEventListener('input', handler);
      });
      wireCloseButton(body);
    },
  });
}

function openMedicamentosModal(patient, monitoreo, activeId) {
  openEaCardModal({
    title: 'Medicamentos',
    cardType: 'medicamentos',
    bodyHtml: scrollBodyHtml(renderMedCategoryGrid(monitoreo, activeId, getMedRecetaByPatient())) + closeFooterHtml(),
    wire: function (body) {
      wireMedCategoryGrid(body, {
        patient: patient,
        medRecetaByPatient: getMedRecetaByPatient(),
        getActiveId: function () { return getEaPanelRuntime().getActiveId(); },
        persistClinicalState: persistClinicalState,
        syncTextarea: function () {},
      });
      wireCloseButton(body);
    },
  });
}

function openCardModalByType(type, patient, monitoreo, activeId) {
  if (type === 'descongestion') openDescongestionModal(patient, monitoreo, activeId);
  else if (type === 'congestion') openEaCongestionModal(patient, null, eaCardioDeps());
  else if (type === 'identidad') openIdentidadModal(patient, monitoreo, activeId);
  else if (type === 'estado-clinico') openEstadoClinicoModal(patient, monitoreo, activeId);
  else if (type === 'nutricion') openNutricionModal(patient, monitoreo, activeId);
  else if (type === 'medicamentos') openMedicamentosModal(patient, monitoreo, activeId);
}

function wireEstadoClinicoInteractions(mount, patient) {
  if (!mount || !patient) return;
  ensureMonitoreo(patient);
  var monitoreo = patient.monitoreo;
  mount.querySelectorAll('[data-ea-card]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var type = btn.getAttribute('data-ea-card');
      var activeId = getEaPanelRuntime().getActiveId();
      openCardModalByType(type, patient, monitoreo, activeId);
    });
  });
}

function generateEstadoActualText(monitoreo, patient, activeId) {
  var snapshot = deriveSnapshot(monitoreo);
  var weightKg = resolveDietWeightKg({
    patientPeso: patient && patient.peso,
    pesoRef: monitoreo.estadoClinico && monitoreo.estadoClinico.pesoRef,
  });
  if (monitoreo.estadoClinico) syncDietKcalFromWeight(monitoreo.estadoClinico, weightKg);
  var id = activeId != null ? activeId : getEaPanelRuntime().getActiveId();
  var recetaBlock = id && getMedRecetaByPatient() ? getMedRecetaByPatient()[id] : null;
  return buildEstadoActualText(
    estadoClinicoForText(monitoreo, eaManejoFechaOpts(id, monitoreo)),
    snapshot,
    { balanceTurno: balanceTurno(monitoreo) },
    {
      patientId: patient && patient.id,
      patientPeso: patient && patient.peso,
      recetaBlock: recetaBlock,
      bombaAlgoritmo: monitoreo.bombaInsulinaAlgoritmo ?? null,
    }
  );
}

export {
  persistEstadoClinicoAndRefresh,
  persistEstadoClinicoLight,
  captureEaPanelUiState,
  restoreEaPanelUiState,
  getEstadoActualTextForPatient,
  renderEaDashboardSection,
  wireEstadoClinicoInteractions,
  generateEstadoActualText,
};
