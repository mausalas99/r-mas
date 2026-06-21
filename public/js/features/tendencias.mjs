// Tendencias — barrel: runtime registration + re-exports
import { patients } from '../app-state.mjs';
import { TEND_UNITS } from './tendencias-constants.mjs';
import { registerSesionIngresoTrendsRuntime } from '../sesion-ingreso-trends-export.mjs';
import {
  closeSesionIngresoTrendsSendModal,
  openSesionIngresoTrendsSendModal,
  registerSesionIngresoTrendsSendRuntime,
} from './sesion-ingreso-trends-send-modal.mjs';
import { rt } from './tendencias-runtime-state.mjs';
import { tendenciasBridge } from './tendencias-bridge.mjs';
import * as tc from './tendencias-core.mjs';
import { renderTendencias } from './tendencias-render.mjs';

import { mountTendCardSortables, syncTendHiddenModalIfOpen } from './tendencias-ui-shell.mjs';

tendenciasBridge.renderTendencias = renderTendencias;
tendenciasBridge.mountTendCardSortables = mountTendCardSortables;
tendenciasBridge.syncTendHiddenModalIfOpen = syncTendHiddenModalIfOpen;

export function registerTendenciasRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
  tc.initTendGroupModal();
  tc.ensureTendHiddenModalDelegation();
  tc.ensureTendenciasClickDelegation();
  registerSesionIngresoTrendsRuntime({
    buildCatalog: tc.buildMergedTrendSeriesCatalog,
    sectionLabel: tc.getTendSectionLabel,
    refForSeries: function (history, sectionKey, fieldKey) {
      return tc.tendRefForSeries(history, sectionKey, fieldKey, null);
    },
    unitForField: function (fieldKey) {
      return TEND_UNITS[fieldKey] || '';
    },
  });
  registerSesionIngresoTrendsSendRuntime({
    showToast: function (msg, kind) {
      rt.showToast(msg, kind);
    },
    getHistory: function () {
      var pid = tc.aid();
      return pid ? tc.tendParsedHistoryDesc(pid) : [];
    },
    getPatientLabel: function () {
      var pid = tc.aid();
      var patient = (patients || []).find(function (p) {
        return p.id === pid;
      });
      return patient ? patient.nombre || patient.registro || '' : '';
    },
    getPatientId: function () {
      return tc.aid() || '';
    },
    sendPayload: function (payload) {
      if (window.electronAPI && window.electronAPI.sendToSesionIngreso) {
        window.electronAPI.sendToSesionIngreso(payload).then(function (ok) {
          if (ok) rt.showToast('Tendencias enviadas a Neo', 'ok');
          else rt.showToast('No se pudo abrir Neo', 'warn');
        });
        return;
      }
      rt.showToast('Integración disponible solo en la app de escritorio', 'warn');
    },
  });
}


export { renderTendencias } from './tendencias-render.mjs';
export {
  getLabOutputPrefs,
  setLabOutputPrefs,
  isGasoInterpretacionResLabChunk,
  isAscitisInterpretacionResLabChunk,
  ascitisInterpretacionBody_,
  isBhMainResLabChunk,
  formatBhExtendedTabLine,
  openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged,
} from './tendencias-lab-prefs.mjs';
export {
  inferFechaLabSetFromId,
  formatDMYDate,
  seedTendHiddenDefaults,
  isTendGroupModalOpen,
  closeTendDetail,
  openTendGroupModal,
  openTendGasoExtendedModal,
  closeTendGroupModal,
  setTendGroupTab,
  copyTendGroupTablePng,
  copyTendGroupTableText,
  toggleTendSection,
  toggleTendAbnormalOnlyFilter,
  tendHideSeriesFromCard,
  tendUnhideSeries,
  tendResetAllHiddenSeries,
  openTendHiddenModal,
  closeTendHiddenModal,
  openTendDetail,
  tendCardActivate,
} from './tendencias-core.mjs';

export const tendenciasWindowHandlers = {
  openSesionIngresoTrendsSendModal,
  closeSesionIngresoTrendsSendModal,
  closeTendDetail: tc.closeTendDetail,
  openTendGroupModal: tc.openTendGroupModal,
  openTendGasoExtendedModal: tc.openTendGasoExtendedModal,
  closeTendGroupModal: tc.closeTendGroupModal,
  setTendGroupTab: tc.setTendGroupTab,
  copyTendGroupTablePng: tc.copyTendGroupTablePng,
  copyTendGroupTableText: tc.copyTendGroupTableText,
  toggleTendSection: tc.toggleTendSection,
  toggleTendAbnormalOnlyFilter: tc.toggleTendAbnormalOnlyFilter,
  tendHideSeriesFromCard: tc.tendHideSeriesFromCard,
  tendUnhideSeries: tc.tendUnhideSeries,
  tendResetAllHiddenSeries: tc.tendResetAllHiddenSeries,
  openTendHiddenModal: tc.openTendHiddenModal,
  closeTendHiddenModal: tc.closeTendHiddenModal,
  openTendDetail: tc.openTendDetail,
  tendCardActivate: tc.tendCardActivate,
  openLabDisplayPrefsModal: tc.openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal: tc.closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged: tc.onLabDisplayPrefsChanged,
};
