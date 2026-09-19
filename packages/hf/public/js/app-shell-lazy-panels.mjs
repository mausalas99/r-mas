/** Lazy dynamic-import wrappers for shell sidebar panels. */

function importLazyRoutes() {
  return import('./lazy-feature-routes.mjs');
}

export function shellCloseSettingsDropdown() {
  void importLazyRoutes().then(function (routes) {
    routes.shellCloseSettingsDropdown();
  });
}

export function shellToggleSettingsDropdown() {
  void importLazyRoutes().then(function (routes) {
    routes.shellToggleSettingsDropdown();
  });
}

export function shellSyncTeamSyncHeaderButton() {
  void importLazyRoutes().then(function (routes) {
    routes.shellSyncTeamSyncHeaderButton();
  });
}

export function openCommandPaletteFromShell() {
  void import('./features/command-palette.mjs').then(function (mod) {
    mod.openCommandPalette();
  });
}
