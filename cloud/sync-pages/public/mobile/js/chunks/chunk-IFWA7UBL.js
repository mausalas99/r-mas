// public/js/app-shell-lazy-panels.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-D4435ZDH.js");
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
  void import("/mobile/js/chunks/command-palette-FIU3HR72.js").then(function(mod) {
    mod.openCommandPalette();
  });
}
function openDocQueuePanelFromShell() {
  void import("/mobile/js/chunks/doc-queue-panel-J74URDGA.js").then(function(mod) {
    mod.openDocQueuePanel();
  });
}
function closeDocQueuePanelFromShell() {
  void import("/mobile/js/chunks/doc-queue-panel-J74URDGA.js").then(function(mod) {
    mod.closeDocQueuePanel();
  });
}
function refreshDocQueueBadgeFromShell() {
  void import("/mobile/js/chunks/doc-queue-panel-J74URDGA.js").then(function(mod) {
    mod.refreshDocQueueBadge();
  });
}
function openEntregaPrepPanelFromShell() {
  void import("/mobile/js/chunks/entrega-prep-panel-X6JGKA5Y.js").then(function(mod) {
    mod.openEntregaPrepPanel();
  });
}
function closeEntregaPrepPanelFromShell() {
  void import("/mobile/js/chunks/entrega-prep-panel-X6JGKA5Y.js").then(function(mod) {
    mod.closeEntregaPrepPanel();
  });
}
function refreshEntregaPrepBadgeFromShell() {
  void import("/mobile/js/chunks/entrega-prep-panel-X6JGKA5Y.js").then(function(mod) {
    mod.refreshEntregaPrepBadge();
  });
}
function openCultivoQueuePanelFromShell() {
  void import("/mobile/js/chunks/cultivo-queue-panel-MTDLCMFX.js").then(function(mod) {
    mod.openCultivoQueuePanel();
  });
}
function closeCultivoQueuePanelFromShell() {
  void import("/mobile/js/chunks/cultivo-queue-panel-MTDLCMFX.js").then(function(mod) {
    mod.closeCultivoQueuePanel();
  });
}
function refreshCultivoQueueBadgeFromShell() {
  void import("/mobile/js/chunks/cultivo-queue-panel-MTDLCMFX.js").then(function(mod) {
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
//# sourceMappingURL=/js/chunks/chunk-IFWA7UBL.js.map
