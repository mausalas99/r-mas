/** Shared runtime + module UI state for medications panel. */
let rt = {
  getActiveId() {
    return null;
  },
  showToast() {},
  getSettings() {
    return {};
  },
};

export function registerMedicationsRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}

export { rt };

export let medOutputTab = "full";

export function setMedOutputTabState(tab) {
  if (tab === "full" || tab === "simple") medOutputTab = tab;
}

let lastMedPanelPatientId = null;
let medPanelCacheKey = "";

export function getLastMedPanelPatientId() {
  return lastMedPanelPatientId;
}

export function setLastMedPanelPatientId(id) {
  lastMedPanelPatientId = id;
}

export function getMedPanelCacheKey() {
  return medPanelCacheKey;
}

export function setMedPanelCacheKey(key) {
  medPanelCacheKey = key;
}

export function bustMedPanelCache() {
  medPanelCacheKey = "";
}

export let medRecetaPasteModalWired = false;

export function markMedRecetaPasteModalWired() {
  medRecetaPasteModalWired = true;
}
