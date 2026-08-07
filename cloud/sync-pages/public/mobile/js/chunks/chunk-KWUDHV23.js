// public/js/app-shell-lazy-panels.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-M2XCF2YY.js");
}
function shellCloseSettingsDropdown() {
  void importLazyRoutes().then(function(routes) {
    routes.shellCloseSettingsDropdown();
  });
}
function shellToggleSettingsDropdown() {
  void importLazyRoutes().then(function(routes) {
    routes.shellToggleSettingsDropdown();
  });
}
function shellSyncTeamSyncHeaderButton() {
  void importLazyRoutes().then(function(routes) {
    routes.shellSyncTeamSyncHeaderButton();
  });
}
function openCommandPaletteFromShell() {
  void import("/mobile/js/chunks/command-palette-ZSIYBDWH.js").then(function(mod) {
    mod.openCommandPalette();
  });
}
function openDocQueuePanelFromShell() {
  void import("/mobile/js/chunks/doc-queue-panel-TTDYNSLX.js").then(function(mod) {
    mod.openDocQueuePanel();
  });
}
function closeDocQueuePanelFromShell() {
  void import("/mobile/js/chunks/doc-queue-panel-TTDYNSLX.js").then(function(mod) {
    mod.closeDocQueuePanel();
  });
}
function refreshDocQueueBadgeFromShell() {
  void import("/mobile/js/chunks/doc-queue-panel-TTDYNSLX.js").then(function(mod) {
    mod.refreshDocQueueBadge();
  });
}
function openEntregaPrepPanelFromShell() {
  void import("/mobile/js/chunks/entrega-prep-panel-BFG5HQ37.js").then(function(mod) {
    mod.openEntregaPrepPanel();
  });
}
function closeEntregaPrepPanelFromShell() {
  void import("/mobile/js/chunks/entrega-prep-panel-BFG5HQ37.js").then(function(mod) {
    mod.closeEntregaPrepPanel();
  });
}
function refreshEntregaPrepBadgeFromShell() {
  void import("/mobile/js/chunks/entrega-prep-panel-BFG5HQ37.js").then(function(mod) {
    mod.refreshEntregaPrepBadge();
  });
}
function openCultivoQueuePanelFromShell() {
  void import("/mobile/js/chunks/cultivo-queue-panel-JY5H2B7U.js").then(function(mod) {
    mod.openCultivoQueuePanel();
  });
}
function closeCultivoQueuePanelFromShell() {
  void import("/mobile/js/chunks/cultivo-queue-panel-JY5H2B7U.js").then(function(mod) {
    mod.closeCultivoQueuePanel();
  });
}
function refreshCultivoQueueBadgeFromShell() {
  void import("/mobile/js/chunks/cultivo-queue-panel-JY5H2B7U.js").then(function(mod) {
    mod.refreshCultivoQueueBadge();
  });
}

export {
  shellCloseSettingsDropdown,
  shellToggleSettingsDropdown,
  shellSyncTeamSyncHeaderButton,
  openCommandPaletteFromShell,
  openDocQueuePanelFromShell,
  closeDocQueuePanelFromShell,
  refreshDocQueueBadgeFromShell,
  openEntregaPrepPanelFromShell,
  closeEntregaPrepPanelFromShell,
  refreshEntregaPrepBadgeFromShell,
  openCultivoQueuePanelFromShell,
  closeCultivoQueuePanelFromShell,
  refreshCultivoQueueBadgeFromShell
};
//# sourceMappingURL=/js/chunks/chunk-KWUDHV23.js.map
