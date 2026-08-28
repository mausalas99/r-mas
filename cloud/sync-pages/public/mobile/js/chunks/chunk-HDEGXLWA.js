// public/js/features/app-tabs-runtime.mjs
var rt = {
  getActiveAppTab() {
    return "lab";
  },
  setActiveAppTab() {
  },
  getActiveInner() {
    return "todo";
  },
  setActiveInner() {
  },
  getActiveId() {
    return null;
  },
  renderMedRecetaPanel() {
  },
  renderLabHistoryPanel() {
  },
  renderProcedureAgendaPanel() {
  },
  setMedTabAttention() {
  },
  syncWorkContextChrome() {
  },
  ensureParsedLabHistory() {
    return [];
  },
  splitResLabsByTipo(rows) {
    void rows;
    return { labs: [], cultivo: [] };
  },
  primaryTipoForLabSet(resLabs) {
    void resLabs;
    return "labs";
  },
  getSettings() {
    return { appMode: "sala" };
  }
};
function registerAppTabsRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}

export {
  rt,
  registerAppTabsRuntime
};
//# sourceMappingURL=/js/chunks/chunk-HDEGXLWA.js.map
