/** Estado clínico general section + DOM sync. */
import { getPatients, getMedRecetaByPatient, persistClinicalState, getLabHistory } from '../app-state.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import {
  ensureMonitoreo,
  deriveSnapshot,
  balanceTurno,
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
import { renderEstadoClinicoBodyHtml } from './estado-actual-panel-clinico-html.mjs';
import { applyEstadoClinicoFieldChange, hasDietProposal } from './estado-actual-panel-clinico-fields.mjs';
import { syncSoporteParamsVisibility } from './estado-actual-panel-soporte-html.mjs';
import { resolveVentilatorioLabContext } from './estado-actual-ventilatorio-labs.mjs';
import { DIET_PENDING_KEYS } from './estado-actual-meds.mjs';

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

function renderEstadoClinicoSection(monitoreo, activeId, patient) {
  var pend = monitoreo.pendienteReceta || {};
  var dietPending = hasDietProposal(pend);
  var ec = estadoClinicoForDisplay(monitoreo, eaManejoFechaOpts(activeId, monitoreo));
  var dietaSuplemento = isDietaSuplemento(ec.dieta);
  var dietaParenteral = isDietaParenteral(ec.dieta);
  var dietWeight = resolveDietWeightKg({ patientPeso: patient && patient.peso, pesoRef: ec.pesoRef });
  var kcalDisplay = resolveKcalDisplay(ec, pend, dietPending, dietWeight, dietaParenteral);
  var dietWeightHint = buildDietWeightHint(dietWeight);
  var medFieldsHtml = renderMedCategoryGrid(monitoreo, activeId, getMedRecetaByPatient());
  var anyPending = hasPendingEaProposals(pend);
  var dietOptions = getDietOptions(monitoreo);
  var dietOptionSelected = resolveDietOptionSelected(monitoreo);
  var vitalsCtx = buildVitalsCtx(monitoreo, activeId, patient);

  return (
    '<details class="ea-estado-clinico"' +
    (anyPending ? ' open' : '') +
    '>' +
    '<summary>Estado clínico general</summary>' +
    renderEstadoClinicoBodyHtml(
      ec,
      dietPending,
      dietaSuplemento,
      kcalDisplay,
      dietWeightHint,
      medFieldsHtml,
      anyPending,
      dietOptions,
      dietOptionSelected,
      dietaParenteral,
      vitalsCtx
    ) +
    '</details>'
  );
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
  var mount =
    root && typeof root.querySelector === 'function'
      ? root
      : typeof document !== 'undefined'
        ? document.getElementById('exp-pane-estado-actual')
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
  if (toastMsg) getEaPanelRuntime().showToast(toastMsg, 'success');
}

function persistEstadoClinicoLight(_monitoreo, patient) {
  flushEaEstadoClinicoFieldsFromDom(patient);
  persistClinicalState();
  scheduleCloudSyncPush();
}

function captureEaPanelUiState(mount) {
  if (!mount) return { clinicoOpen: false, historialOpen: false };
  var det = mount.querySelector('.ea-estado-clinico');
  var hist = mount.querySelector('.ea-historial');
  return { clinicoOpen: !!(det && det.open), historialOpen: !!(hist && hist.open) };
}

function restoreEaPanelUiState(mount, state) {
  if (!mount || !state) return;
  if (state.clinicoOpen) {
    var det = mount.querySelector('.ea-estado-clinico');
    if (det) det.open = true;
  }
  if (state.historialOpen) {
    var hist = mount.querySelector('.ea-historial');
    if (hist) hist.open = true;
  }
}

function wireEstadoClinicoInteractions(mount, patient) {
  if (!mount || !patient) return;
  mount.querySelectorAll('[data-ea-ec]').forEach(function (el) {
    var tag = (el.tagName || '').toUpperCase();
    var handler = function () {
      applyEstadoClinicoFieldChange(el, patient);
      if (el.getAttribute('data-ea-ec') === 'soporte') {
        syncSoporteParamsVisibility(mount, el.value);
        eaPanelBridge.renderEstadoActualPanel({
          dataOnly: true,
          refreshClinico: true,
          skipChartsSummary: true,
        });
      }
    };
    if (tag === 'SELECT') el.addEventListener('change', handler);
    else el.addEventListener('input', handler);
  });
  var soporteSel = mount.querySelector('[data-ea-ec="soporte"]');
  if (soporteSel && 'value' in soporteSel) {
    syncSoporteParamsVisibility(mount, soporteSel.value);
  }
  wireMedCategoryGrid(mount, {
    patient: patient,
    medRecetaByPatient: getMedRecetaByPatient(),
    getActiveId: function () { return getEaPanelRuntime().getActiveId(); },
    persistClinicalState: persistClinicalState,
    syncTextarea: function () {},
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
  renderEstadoClinicoSection,
  wireEstadoClinicoInteractions,
  generateEstadoActualText,
};
