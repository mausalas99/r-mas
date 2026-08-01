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

export function openDocQueuePanelFromShell() {
  void import('./features/doc-queue-panel.mjs').then(function (mod) {
    mod.openDocQueuePanel();
  });
}

export function closeDocQueuePanelFromShell() {
  void import('./features/doc-queue-panel.mjs').then(function (mod) {
    mod.closeDocQueuePanel();
  });
}

export function refreshDocQueueBadgeFromShell() {
  void import('./features/doc-queue-panel.mjs').then(function (mod) {
    mod.refreshDocQueueBadge();
  });
}

export function openEntregaPrepPanelFromShell() {
  void import('./features/entrega-prep-panel.mjs').then(function (mod) {
    mod.openEntregaPrepPanel();
  });
}

export function closeEntregaPrepPanelFromShell() {
  void import('./features/entrega-prep-panel.mjs').then(function (mod) {
    mod.closeEntregaPrepPanel();
  });
}

export function refreshEntregaPrepBadgeFromShell() {
  void import('./features/entrega-prep-panel.mjs').then(function (mod) {
    mod.refreshEntregaPrepBadge();
  });
}

export function openCultivoQueuePanelFromShell() {
  void import('./features/cultivo-queue-panel.mjs').then(function (mod) {
    mod.openCultivoQueuePanel();
  });
}

export function closeCultivoQueuePanelFromShell() {
  void import('./features/cultivo-queue-panel.mjs').then(function (mod) {
    mod.closeCultivoQueuePanel();
  });
}

export function refreshCultivoQueueBadgeFromShell() {
  void import('./features/cultivo-queue-panel.mjs').then(function (mod) {
    mod.refreshCultivoQueueBadge();
  });
}
