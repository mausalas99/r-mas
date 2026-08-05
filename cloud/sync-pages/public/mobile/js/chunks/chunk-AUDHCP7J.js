// public/js/mode-features.mjs
function isModeSala(settings) {
  if (!settings) return true;
  return (settings.appMode || "sala") === "sala";
}
function getDefaultServicio(settings) {
  if (!settings) return "";
  return String(settings.defaultServicio || "").trim();
}
function getDefaultCuarto(settings) {
  if (!settings) return "";
  return String(settings.defaultCuarto || "").trim();
}
function getDefaultCama(settings) {
  if (!settings) return "";
  return String(settings.defaultCama || "").trim();
}
function migrateToV3(settings) {
  if (!settings || settings._v3MigrationDone) return false;
  if (settings.appMode == null) settings.appMode = "sala";
  if (settings.defaultServicio == null) settings.defaultServicio = "";
  if (settings.defaultCuarto == null) settings.defaultCuarto = "";
  if (settings.defaultCama == null) settings.defaultCama = "";
  settings._v3MigrationDone = true;
  return true;
}

export {
  isModeSala,
  getDefaultServicio,
  getDefaultCuarto,
  getDefaultCama,
  migrateToV3
};
//# sourceMappingURL=/js/chunks/chunk-AUDHCP7J.js.map
