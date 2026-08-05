// public/js/features/patients-runtime-state.mjs
var rt = {
  getActiveId() {
    return null;
  },
  setActiveId() {
  },
  getActiveAppTab() {
    return "lab";
  },
  getActiveInner() {
    return "todo";
  },
  setActiveInner() {
  },
  getSettings() {
    return {};
  },
  consumeActiveLab() {
    return null;
  },
  restoreActiveLab() {
  },
  clearLabOutputUi() {
  },
  switchAppTab() {
  },
  showToast() {
  },
  renderInnerTabs() {
  },
  refreshExpedienteAfterPatientSelect() {
  },
  invalidateInnerTabRenderCache() {
  },
  renderEstadoActualButton() {
  },
  renderNoteForm() {
  },
  renderPatientDataPane() {
  },
  renderIndicaForm() {
  },
  renderListadoForm() {
  },
  refreshTendenciasOrCultivosPanel() {
  },
  renderLabHistoryPanel() {
  },
  renderMedRecetaPanel() {
  },
  switchInnerTab() {
  },
  syncInnerTabVisualOnly() {
  },
  renderTodoForm() {
  },
  limpiarReporte() {
  },
  setLabHistoryPanelCollapsed() {
  },
  syncLabHistoryCollapseUI() {
  },
  syncWorkContextChrome() {
  },
  rpcPrefersReducedMotion() {
    return false;
  },
  renderProcedureAgendaPanel() {
  },
  refreshAllTodoUIs() {
  },
  renderManejo() {
  },
  renderRecetaHu() {
  },
  renderPaseBoard() {
  },
  pushUndoSnapshot() {
  },
  addAuditEntry() {
  },
  applyDefaultsToNewPatient() {
  },
  applyDefaultsToNewIndicaciones() {
  },
  enviarLabsANota() {
  },
  ensureParsedLabHistory() {
    return [];
  },
  primaryTipoForLabSet() {
    return "labs";
  }
};
function registerPatientsRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}

export {
  rt,
  registerPatientsRuntime
};
//# sourceMappingURL=/js/chunks/chunk-LSPMPOB5.js.map
