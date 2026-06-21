// Panel Estado Actual (Sala) — barrel: runtime + re-exports
import { registerEstadoActualPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { eaPanelBridge } from './estado-actual-panel-bridge.mjs';
import { invalidateEaPanelCache } from './estado-actual-panel-core.mjs';
import {
  formatEaSavedLabel,
  toDatetimeLocalValue,
  datetimeLocalToIso,
  isoToHHmm,
  parseNumOrNull,
} from './estado-actual-panel-format.mjs';
import { flushEaEstadoClinicoFieldsFromDom } from './estado-actual-panel-clinico.mjs';
import {
  applyEstadoActualParsedToForm,
  buildRegistroFormMarkup,
  wireEaRegistroForm,
  syncEaRegistroGluMode,
  resetEaRegistroForm,
} from './estado-actual-panel-registro.mjs';
import {
  registrarEstadoActualMedicion,
  ensureEaRegistroModalForm,
  eliminarEstadoActualMedicion,
  estadoActualGuardar,
  estadoActualGuardarCopiar,
  syncEaCopyFab,
  eaHasCopyableContent,
  copiarEstadoActualTexto,
  confirmEaMedField,
  discardEaMedProposal,
  confirmEaDietProposal,
  discardEaDietProposal,
  confirmAllEaMedProposals,
  toggleEaEstadoClinico,
  windowHandlers,
} from './estado-actual-panel-actions.mjs';
import { renderEstadoActualPanel, navigateToEstadoActualPanel } from './estado-actual-panel-render.mjs';

eaPanelBridge.renderEstadoActualPanel = renderEstadoActualPanel;
eaPanelBridge.registrarEstadoActualMedicion = registrarEstadoActualMedicion;

export { registerEstadoActualPanelRuntime, invalidateEaPanelCache };
export {
  formatEaSavedLabel,
  toDatetimeLocalValue,
  datetimeLocalToIso,
  isoToHHmm,
  parseNumOrNull,
  flushEaEstadoClinicoFieldsFromDom,
  applyEstadoActualParsedToForm,
  buildRegistroFormMarkup,
  wireEaRegistroForm,
  syncEaRegistroGluMode,
  resetEaRegistroForm,
  renderEstadoActualPanel,
  navigateToEstadoActualPanel,
  registrarEstadoActualMedicion,
  ensureEaRegistroModalForm,
  eliminarEstadoActualMedicion,
  estadoActualGuardar,
  estadoActualGuardarCopiar,
  syncEaCopyFab,
  eaHasCopyableContent,
  copiarEstadoActualTexto,
  confirmEaMedField,
  discardEaMedProposal,
  confirmEaDietProposal,
  discardEaDietProposal,
  confirmAllEaMedProposals,
  toggleEaEstadoClinico,
  windowHandlers,
};
