import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPatients } from '../app-state.mjs';
import { registerEstadoActualPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { refreshEaCopyFabVisibility, syncEaCopyFab } from './estado-actual-panel-actions.mjs';

function setupEaCopyFabDom() {
  document.documentElement.classList.remove('ea-copy-fab-active');
  var fab = document.getElementById('ea-copy-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'ea-copy-fab';
    document.body.appendChild(fab);
  }
  fab.setAttribute('hidden', '');
  fab.style.display = 'none';
  return fab;
}

function stubEaRuntime(overrides) {
  registerEstadoActualPanelRuntime(
    Object.assign(
      {
        getActiveId() {
          return 'p1';
        },
        getActiveAppTab() {
          return 'nota';
        },
        getActiveInner() {
          return 'estadoActual';
        },
        getSettings() {
          return { appMode: 'sala' };
        },
      },
      overrides || {}
    )
  );
}

test('refreshEaCopyFabVisibility — muestra FAB en Estado actual con paciente activo', () => {
  if (typeof document === 'undefined') return;
  const fab = setupEaCopyFabDom();
  getPatients().length = 0;
  getPatients().push({ id: 'p1', monitoreo: { estadoClinico: {}, historial: [] } });
  stubEaRuntime();

  refreshEaCopyFabVisibility();

  assert.equal(fab.hasAttribute('hidden'), false);
  assert.equal(fab.style.display, 'flex');
  assert.equal(document.documentElement.classList.contains('ea-copy-fab-active'), true);
});

test('refreshEaCopyFabVisibility — oculta FAB fuera de Estado actual aunque haya paciente', () => {
  if (typeof document === 'undefined') return;
  const fab = setupEaCopyFabDom();
  getPatients().length = 0;
  getPatients().push({ id: 'p1', monitoreo: { estadoClinico: {}, historial: [] } });
  stubEaRuntime({ getActiveInner() { return 'todo'; } });

  syncEaCopyFab(true);

  assert.equal(fab.hasAttribute('hidden'), true);
  assert.equal(document.documentElement.classList.contains('ea-copy-fab-active'), false);
});

test('refreshEaCopyFabVisibility — restaura FAB al volver con caché fresca (inner ya en estadoActual)', () => {
  if (typeof document === 'undefined') return;
  const fab = setupEaCopyFabDom();
  getPatients().length = 0;
  getPatients().push({ id: 'p1', monitoreo: { estadoClinico: {}, historial: [] } });
  stubEaRuntime({ getActiveInner() { return 'todo'; } });

  syncEaCopyFab(true);
  assert.equal(fab.hasAttribute('hidden'), true);

  stubEaRuntime({ getActiveInner() { return 'estadoActual'; } });
  refreshEaCopyFabVisibility();

  assert.equal(fab.hasAttribute('hidden'), false);
  assert.equal(fab.style.display, 'flex');
});
