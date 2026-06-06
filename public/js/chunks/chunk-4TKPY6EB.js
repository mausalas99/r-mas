// public/js/features/settings-help/runtime.mjs
var defaults = {
  getSettings() {
    return (
      /** @type {any} */
      {}
    );
  },
  getActiveInner() {
    return null;
  },
  getActiveId() {
    return null;
  },
  setActiveId() {
  },
  switchInnerTab() {
  },
  renderInnerTabs() {
  },
  renderEstadoActualButton() {
  },
  renderEstadoActualBar() {
  },
  switchAppTab() {
  },
  showToast() {
  },
  launchConfetti() {
  },
  syncPreimportBackupUi() {
  },
  syncSettingsLanHostDiskSection() {
  },
  closeProfileModal() {
  },
  openProfileModal() {
  },
  renderMedRecetaPanel() {
  },
  renderListadoForm() {
  },
  openAddModalFromLabPatient() {
  },
  refreshAllTodoUIs() {
  },
  refreshExpedienteAfterPatientSelect() {
  }
};
var state = { rt: { ...defaults } };
function getSettingsHelpRuntime() {
  return state.rt;
}
function registerSettingsHelpRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(state.rt, ctx);
  import("/js/chunks/presentation-mode-HJCGEQUL.js").then(function(mod) {
    if (typeof mod.registerPresentationRuntime === "function") {
      mod.registerPresentationRuntime(state.rt);
    }
  }).catch(function(err) {
    console.warn("[settings-help] presentation runtime", err);
  });
}

export {
  getSettingsHelpRuntime,
  registerSettingsHelpRuntime
};
//# sourceMappingURL=/js/chunks/chunk-4TKPY6EB.js.map
