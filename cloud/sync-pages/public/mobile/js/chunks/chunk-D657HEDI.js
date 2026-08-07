// public/js/app-shell-lazy-panels.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-ZCXKOWSO.js");
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
  void import("/mobile/js/chunks/command-palette-DQASHBQG.js").then(function(mod) {
    mod.openCommandPalette();
  });
}

export {
  shellCloseSettingsDropdown,
  shellToggleSettingsDropdown,
  shellSyncTeamSyncHeaderButton,
  openCommandPaletteFromShell
};
//# sourceMappingURL=/js/chunks/chunk-D657HEDI.js.map
