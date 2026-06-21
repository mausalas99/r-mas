// Laboratorio pane — barrel: runtime registration, chrome, re-exports
import { patients } from '../app-state.mjs';
import { isPaseMode } from './chrome.mjs';
import {
  closeLabSomeTablesModal,
  openLabSomeTablesModal,
  registerLabSomeTablesModalRuntime,
  syncLabSomeTablesBtn,
} from './lab-some-tables-modal.mjs';
import {
  closeSesionIngresoSendModal,
  openSesionIngresoSendModal,
  registerSesionIngresoSendRuntime,
} from './sesion-ingreso-send-modal.mjs';
import { rt, registerLabPanelRuntime as _registerRt } from './lab-panel-runtime-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import {
  renderLabHistoryPanel,
  setLabHistoryPanelCollapsed,
  syncLabHistoryCollapseUI,
  expandLabHistoryList,
  replayLabHistorySet,
  reprocessLabHistorySet,
  deleteLabHistorySet,
  onLabHistoryDateChange,
  reprocessSelectedLabHistorySet,
  deleteSelectedLabHistorySet,
  labHistoryPanelIsCollapsed,
  toggleLabHistoryPanel,
} from './lab-panel-history.mjs';
import {
  openLabHistoryDedupeReview,
  consolidateLabHistoryByDayAndTipo,
} from './lab-panel-history-dedupe.mjs';
import {
  limpiarReporte,
  enviarLabsANota,
  insertLabPatientSeparator,
  openLabPatientPicker,
  copiarLabsAlPortapapeles,
  clearLabInputAfterSuccessfulParse,
} from './lab-panel-workbench.mjs';
import { applyDriveImportLabSets } from './lab-panel-workbench-store.mjs';
import { procesarReporte, renderOutput } from './lab-panel-parse.mjs';

var activeLab = null;

labPanelBridge.getActiveLab = function () {
  return activeLab;
};
labPanelBridge.setActiveLab = function (next) {
  activeLab = next;
};
labPanelBridge.renderOutput = renderOutput;
labPanelBridge.syncLabOutputChrome = syncLabOutputChrome;
labPanelBridge.renderLabHistoryPanel = renderLabHistoryPanel;

export function registerLabPanelRuntime(ctx) {
  _registerRt(ctx);
}

export function getActiveLab() {
  return activeLab;
}

export function setActiveLab(next) {
  activeLab = next;
}

export function rerenderParsedLabOutputAfterPrefsChange() {
  if (activeLab && activeLab.resLabs && activeLab.resLabs.length) renderOutput(activeLab);
}

export function safeAttrJsString(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

var labCopyFabBound = false;

function ensureLabCopyFabController() {
  var fab = document.getElementById('lab-copy-fab');
  if (!fab || labCopyFabBound) return;
  labCopyFabBound = true;
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
    copiarLabsAlPortapapeles();
  });
}

export function syncLabCopyFab(show) {
  ensureLabCopyFabController();
  var visible = !!show;
  var fab = document.getElementById('lab-copy-fab');
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
  document.documentElement.classList.toggle('lab-copy-fab-active', visible);
}

export function labOutputHasCopyableContent() {
  var sec = document.getElementById('lab-output-section');
  return !!(
    sec &&
    sec.style.display !== 'none' &&
    activeLab &&
    activeLab.resLabs &&
    activeLab.resLabs.length
  );
}

registerLabSomeTablesModalRuntime({
  showToast: function (msg, kind) {
    rt.showToast(msg, kind);
  },
  getParsed: function () {
    return activeLab && activeLab.someTablesParsed ? activeLab.someTablesParsed : null;
  },
  isPaseMode: isPaseMode,
  syncLabCopyFab: syncLabCopyFab,
  syncLabOutputChrome: function () {
    syncLabOutputChrome();
  },
  openSesionIngresoSend: function () {
    openSesionIngresoSendModal();
  },
});

registerSesionIngresoSendRuntime({
  showToast: function (msg, kind) {
    rt.showToast(msg, kind);
  },
  getParsed: function () {
    return activeLab && activeLab.someTablesParsed ? activeLab.someTablesParsed : null;
  },
  getPatientLabel: function () {
    var patient = patients.find(function (p) {
      return p.id === rt.getActiveId();
    });
    return patient ? patient.nombre || patient.registro || '' : '';
  },
  getReportDate: function () {
    if (activeLab && activeLab.patient && activeLab.patient.fecha) {
      return String(activeLab.patient.fecha).trim();
    }
    return '';
  },
  sendPayload: function (payload) {
    if (window.electronAPI && window.electronAPI.sendToSesionIngreso) {
      window.electronAPI.sendToSesionIngreso(payload).then(function (ok) {
        if (ok) rt.showToast('Enviado a Neo', 'ok');
        else rt.showToast('No se pudo abrir Neo', 'warn');
      });
      return;
    }
    rt.showToast('Integración disponible solo en la app de escritorio', 'warn');
  },
});

export function syncLabOutputChrome() {
  var sec = document.getElementById('lab-output-section');
  var show = !!(sec && sec.style.display !== 'none');
  if (isPaseMode()) {
    syncLabCopyFab(false);
    syncLabSomeTablesBtn(false);
    closeLabSomeTablesModal();
    return;
  }
  var hasSome = !!(
    activeLab &&
    activeLab.someTablesParsed &&
    activeLab.someTablesParsed.departments &&
    activeLab.someTablesParsed.departments.length
  );
  syncLabCopyFab(show);
  syncLabSomeTablesBtn(show && hasSome);
}

export { openLabSomeTablesModal, closeLabSomeTablesModal };

export function closeLabHistoryMoreMenu() {
  document.querySelectorAll('.lab-history-more[open], .lab-output-more[open]').forEach(function (d) {
    d.removeAttribute('open');
  });
}

export function clearLabWorkbenchMinimalDom() {
  var b = document.getElementById('lab-banner');
  if (b) b.style.display = 'none';
  var sec = document.getElementById('lab-output-section');
  if (sec) sec.style.display = 'none';
  var box = document.getElementById('lab-output-box');
  if (box) box.innerHTML = '';
  var ta = document.getElementById('lab-input');
  if (ta) ta.value = '';
  syncLabOutputChrome();
}

export {
  renderLabHistoryPanel,
  setLabHistoryPanelCollapsed,
  syncLabHistoryCollapseUI,
  expandLabHistoryList,
  limpiarReporte,
  enviarLabsANota,
  applyDriveImportLabSets,
  insertLabPatientSeparator,
};

export const windowHandlers = {
  procesarReporte,
  clearLabInputAfterSuccessfulParse,
  limpiarReporte,
  replayLabHistorySet,
  reprocessLabHistorySet,
  deleteLabHistorySet,
  toggleLabHistoryPanel,
  syncLabHistoryCollapseUI,
  setLabHistoryPanelCollapsed,
  labHistoryPanelIsCollapsed,
  copiarLabsAlPortapapeles,
  openLabSomeTablesModal,
  closeLabSomeTablesModal,
  openSesionIngresoSendModal,
  closeSesionIngresoSendModal,
  closeLabHistoryMoreMenu,
  openLabPatientPicker,
  openLabHistoryDedupeReview,
  expandLabHistoryList,
  consolidateLabHistoryByDayAndTipo,
  insertLabPatientSeparator,
  onLabHistoryDateChange,
  reprocessSelectedLabHistorySet,
  deleteSelectedLabHistorySet,
};
