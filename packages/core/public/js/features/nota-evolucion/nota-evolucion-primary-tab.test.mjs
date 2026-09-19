import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderNotaEvolucionPrimaryTab,
  getNotaEvolucionPrimaryTabView,
  showNotaEvolucionClassicView,
  resetNotaEvolucionPrimaryTabViewForTests,
} from './nota-evolucion-primary-tab.mjs';

test('defaults to the "nueva" (S/O/A/P) view', () => {
  resetNotaEvolucionPrimaryTabViewForTests();
  assert.equal(getNotaEvolucionPrimaryTabView(), 'nueva');
});

test('showNotaEvolucionClassicView forces the legacy "Plantilla clásica" view', () => {
  resetNotaEvolucionPrimaryTabViewForTests();
  showNotaEvolucionClassicView();
  assert.equal(getNotaEvolucionPrimaryTabView(), 'classic');
  resetNotaEvolucionPrimaryTabViewForTests();
  assert.equal(getNotaEvolucionPrimaryTabView(), 'nueva');
});

test('renderNotaEvolucionPrimaryTab is a safe no-op without a DOM (no #note-form mount)', () => {
  resetNotaEvolucionPrimaryTabViewForTests();
  // The Electron-node test runtime has no `document` global at all — this
  // must not throw, matching the guard pattern used throughout
  // nota-evolucion-panel.mjs (see openNotaEvolucionPanel's own test).
  assert.doesNotThrow(() => renderNotaEvolucionPrimaryTab());
});
