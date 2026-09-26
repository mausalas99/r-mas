import { isModeSala } from './mode-features.mjs';
import { isMobileWeb } from './mobile-web.mjs';
import { getPatients, getLabHistory, getMedRecetaByPatient, getVpoByPatient, persistClinicalState } from './app-state.mjs';
import { storage } from './storage.js';
import { buildCensusPayload } from './censo-build.mjs';
import { loadCensoHiddenCols, openCensoPreviewInApp } from './censo-preview-html.mjs';
import { attachCensoLabDiagrams } from './censo-labs-diagrams.mjs';
import { migratePatientDiagnosticosFromVpo } from './patient-diagnosticos.mjs';
import { setAsyncButtonLoading } from './ui-motion.mjs';
import { activePatientTeamId, activeRotationTeamIds, teamLabelById } from './patient-team-assign-ui.mjs';
import {
  exportWithOutputDirFallback,
  guardDocExportBlocked,
  saveOutputDirSelection,
} from './document-export-client.mjs';

var rt = {
  getSettings() {
    return {};
  },
  showToast() {},
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse() {
    return Promise.resolve(null);
  },
  incrementPendingJobs() {},
  decrementPendingJobs() {},
  syncOfflineButtonStates() {},
  guardMobileDocExport() {
    return false;
  },
  isRpcOffline() {
    return false;
  },
};

export function registerCensoRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

var CENSO_EXPORT_BUTTON_IDS = [
  'btn-export-censo-header',
  'btn-export-censo-settings',
  'btn-export-censo',
];

var CENSO_INLINE_FLEX_BUTTON_IDS = ['btn-export-censo-header'];

export function syncCensoExportButtonVisibility() {
  var show = isModeSala(rt.getSettings()) && !isMobileWeb();
  CENSO_EXPORT_BUTTON_IDS.forEach(function (id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    if (id === 'btn-export-censo-settings') return;
    if (!show) {
      btn.style.display = 'none';
      return;
    }
    btn.style.display = CENSO_INLINE_FLEX_BUTTON_IDS.indexOf(id) >= 0 ? 'inline-flex' : '';
  });
  var settingsRow = document.getElementById('btn-export-censo-settings-row');
  if (settingsRow) settingsRow.style.display = show ? '' : 'none';
}


function buildTodosMap() {
  var map = Object.create(null);
  getPatients().forEach(function (p) {
    if (!p || !p.id) return;
    map[p.id] = storage.getTodos(p.id);
  });
  return map;
}

function preparePatientsForCensus() {
  getPatients().forEach(function (p) {
    if (!p) return;
    migratePatientDiagnosticosFromVpo(p, getVpoByPatient()[p.id]);
  });
  persistClinicalState();
}

function patientsForCensoExport() {
  if (typeof rt.getCensusPatients === 'function') {
    return rt.getCensusPatients();
  }
  return getPatients();
}

function ensureCensoModal() {
  var existing = document.getElementById('censo-export-modal');
  if (existing) return existing;
  var backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'censo-export-modal';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML =
    '<div class="modal lab-display-prefs-modal censo-export-dialog" role="dialog" aria-modal="true" aria-labelledby="censo-export-title">' +
    '<h3 id="censo-export-title" class="modal-title">Censo</h3>' +
    '<p class="censo-export-date"><span id="censo-export-fecha-label"></span> · <span id="censo-export-mes-label"></span></p>' +
    '<div class="lab-display-prefs-fields censo-export-options">' +
    '<div class="lab-pref-row">' +
    '<span class="lab-pref-row-label" id="censo-export-archived-lbl">Incluir archivados</span>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-archived" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-archived-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '<div class="lab-pref-row">' +
    '<div class="lab-pref-row-copy"><span class="lab-pref-row-label" id="censo-export-pancenso-lbl">Pancenso</span>' +
    '<span class="lab-pref-row-hint">Todos los equipos de la rotación.</span></div>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-pancenso" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-pancenso-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '<div class="lab-pref-row">' +
    '<span class="lab-pref-row-label" id="censo-export-diagramas-lbl">Labs como diagramas</span>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-diagramas" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-diagramas-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '</div>' +
    '<p class="censo-export-note">En la vista previa eliges columnas, editas celdas y generas el PDF.</p>' +
    '<div class="modal-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" id="censo-export-cancel">Cancelar</button>' +
    '<button type="button" class="wb-btn wb-btn-primary wb-btn-lg" id="censo-export-preview">Vista previa</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  return backdrop;
}

export function openCensoExportDialog() {
  if (!isModeSala(rt.getSettings())) return;
  if (rt.guardMobileDocExport()) return;
  var modal = ensureCensoModal();
  var now = new Date();
  var fechaEl = document.getElementById('censo-export-fecha-label');
  var mesEl = document.getElementById('censo-export-mes-label');
  if (fechaEl) {
    fechaEl.textContent =
      String(now.getDate()).padStart(2, '0') +
      '/' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '/' +
      now.getFullYear();
  }
  if (mesEl) {
    mesEl.textContent =
      now.toLocaleString('es-MX', { month: 'long' }).replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + now.getFullYear();
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeCensoModal() {
  var modal = document.getElementById('censo-export-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function runCensoPdfExport(payload, opts) {
  var defaultFileName = opts.defaultFileName;
  var successLabel = opts.successLabel;
  var exportBtns = opts.buttons || [];
  exportBtns.forEach(function (btn) {
    setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: 'Exportando…' });
  });
  rt.incrementPendingJobs();

  function buildBody() {
    return {
      header: payload.header,
      rows: payload.rows,
      servicio: payload.servicio,
    };
  }

  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
      return Promise.resolve(undefined);
    }
    return window.electronAPI.selectOutputDir();
  }

  return exportWithOutputDirFallback({
    url: '/generate-censo',
    buildPayload: buildBody,
    defaultFileName: defaultFileName,
    selectOutputDir: selectOutputDir,
    saveOutputDir: function (dir) {
      saveOutputDirSelection(dir, {
        getSettings: rt.getSettings,
        loadSettings: rt.loadSettings,
      });
    },
    onSuccess: function (data) {
      var name =
        data && (data.fileName || data.path)
          ? data.fileName || String(data.path).split(/[/\\]/).pop()
          : 'PDF';
      rt.showToast(successLabel + ' guardado: ' + name, 'success');
    },
    onPrompt: function () {
      rt.showToast('Selecciona una carpeta para guardar el PDF.', 'error');
    },
    onCancel: function () {
      rt.showToast('No se guardó el PDF: no se eligió carpeta.', 'error');
    },
    onError: function (message) {
      rt.showToast('Error: ' + message, 'error');
    },
  })
    .catch(function (e) {
      if (!(e && e.reported)) rt.showToast('Error de conexión al generar el ' + successLabel.toLowerCase(), 'error');
    })
    .finally(function () {
      exportBtns.forEach(function (btn) {
        setAsyncButtonLoading(btn, false);
      });
      rt.decrementPendingJobs();
      if (typeof rt.syncOfflineButtonStates === 'function') rt.syncOfflineButtonStates();
    });
}

/** Diagram mode: labs cell becomes the Laboratorio diagrams (text labs when a patient has none). */
function withLabDiagrams(payload, labDiagrams) {
  return labDiagrams ? attachCensoLabDiagrams(payload) : Promise.resolve(payload);
}

export function exportCensoPdfFromHelp() {
  openCensoExportDialog();
}

/** Etiqueta de equipo por paciente (equipo dueño de la cubeta), para el pancenso. */
function buildTeamLabelMap(patients) {
  var map = Object.create(null);
  (patients || []).forEach(function (p) {
    if (!p || !p.id) return;
    var teamId = activePatientTeamId(String(p.id));
    if (!teamId) return;
    map[String(p.id)] = teamLabelById(teamId);
  });
  return map;
}

/**
 * Pacientes de la rotación activa (todos los equipos), ignorando el filtro
 * de equipo/sala del sidebar — ese filtro es solo para "Censo", no "Pancenso".
 * Excluye demo y cualquier paciente sin asignación vigente a un equipo vivo
 * de esta rotación (mismo mes, misma sala, no archivado).
 */
function patientsForPancensoExport() {
  var validTeamIds = activeRotationTeamIds();
  return getPatients().filter(function (p) {
    if (!p || !p.id || p.isDemo) return false;
    var teamId = activePatientTeamId(String(p.id));
    return !!teamId && !!validTeamIds[teamId];
  });
}

function previewCenso(includeArchived, pancenso, labDiagrams) {
  if (!isModeSala(rt.getSettings())) return;
  preparePatientsForCensus();
  var censusPatients = pancenso ? patientsForPancensoExport() : patientsForCensoExport();
  var payload = buildCensusPayload({
    settings: rt.getSettings(),
    patients: censusPatients,
    includeArchived: !!includeArchived,
    labHistoryByPatient: getLabHistory(),
    medRecetaByPatient: getMedRecetaByPatient(),
    todosByPatient: buildTodosMap(),
    teamLabelByPatientId: pancenso ? buildTeamLabelMap(censusPatients) : undefined,
    labDiagrams: !!labDiagrams,
  });
  if (!payload.rows.length) {
    rt.showToast(pancenso ? 'Sin pacientes para el pancenso' : 'Sin pacientes para el censo', 'error');
    return;
  }
  if (pancenso) payload.header.titleLine = 'Pancenso de Sala';
  payload.header.hiddenCols = loadCensoHiddenCols();
  withLabDiagrams(payload, labDiagrams).then(function () {
    openCensoPreviewInApp(payload, {
      onGenerate: function (edited, btn) {
        if (guardDocExportBlocked({ isRpcOffline: rt.isRpcOffline, showToast: rt.showToast })) return;
        closeCensoModal();
        runCensoPdfExport(edited, {
          defaultFileName: pancenso ? 'Pancenso.pdf' : 'Censo.pdf',
          successLabel: pancenso ? 'Pancenso' : 'Censo',
          buttons: btn ? [btn] : undefined,
        });
      },
    });
  });
}

function wireCensoModalOnce() {
  if (wireCensoModalOnce._done) return;
  wireCensoModalOnce._done = true;
  document.addEventListener('click', function (e) {
    // After one export the button label sits in a <span>: match the button, not the click target.
    var btn = e.target.closest ? e.target.closest('button') : null;
    var id = btn ? btn.id : '';
    if (id === 'censo-export-cancel') {
      closeCensoModal();
      return;
    }
    if (id === 'censo-export-preview') {
      var archivedPreview = !!document.getElementById('censo-export-archived')?.checked;
      var pancensoPreview = !!document.getElementById('censo-export-pancenso')?.checked;
      var diagramasPreview = !!document.getElementById('censo-export-diagramas')?.checked;
      previewCenso(archivedPreview, pancensoPreview, diagramasPreview);
      return;
    }
    var modal = document.getElementById('censo-export-modal');
    if (modal && e.target === modal) closeCensoModal();
  });
}

if (typeof document !== 'undefined') {
  wireCensoModalOnce();
}
