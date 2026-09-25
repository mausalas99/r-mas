// Lab panel — injected runtime callbacks
var rt = {
  showToast() {},
  getSettings() {
    return {};
  },
  getActiveId() {
    return null;
  },
  setActiveId() {},
  selectPatient() {},
  refreshTendenciasOrCultivosPanel() {},
  onboardingAdvanceAfterParse() {},
  onboardingAdvanceAfterSend() {},
  tourAfterBulkLabParse() {},
  findPatientByRegistro() {
    return null;
  },
  addAuditEntry() {},
  renderDiagramas() {},
  pushUndoSnapshot() {},
  setMedTabAttention() {},
  switchAppTab() {},
  switchInnerTab() {},
  closeSettingsDropdown() {},
  extractParsedValues(_resLabs) {
    return {};
  },
  buildParsedBySectionFromResLabs() {},
  ensureParsedLabHistory() {
    return [];
  },
  rebuildEstudiosFromLabHistory() {},
  inferFechaLabSetFromId() {},
  dayKeyFromLabSet() {},
  primaryTipoForLabSet() {},
  refreshAllTodoUIs() {},
  emitLiveSyncTodoUpsert() {},
  refreshManejoPanel() {},
  removeAtbRisPanelsFromBody() {},
  wireAtbRisHoverPanels() {},
  copyToClipboardSafe(_t) {
    return Promise.resolve(false);
  },
  getLabOutputPrefs() {
    return { showBhExtendedLine: false, hideGasoAdvInterp: false };
  },
  isGasoInterpretacionResLabChunk() {
    return false;
  },
  isCitoquimInterpretacionResLabChunk() {
    return false;
  },
  isAscitisInterpretacionResLabChunk() {
    return false;
  },
  citoquimInterpretacionBody_(text) {
    return String(text || '');
  },
  ascitisInterpretacionBody_(text) {
    return String(text || '');
  },
  formatBhExtendedTabLine() {
    return "";
  },
  isBhMainResLabChunk() {
    return false;
  },
  isResLabChunkPureCultivo() {
    return false;
  },
  buildCultivoOutputHtmlFragments() {
    return "";
  },
  buildLabSetDateLine() {
    return "";
  },
};

export function registerLabPanelRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(rt, ctx);
}

export { rt };
