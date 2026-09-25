import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderNotaEvolucionPrimaryTab,
  showNotaEvolucionClassicView,
} from './nota-evolucion-primary-tab.mjs';

test('renderNotaEvolucionPrimaryTab is a safe no-op without a DOM (no #note-form mount)', () => {
  assert.doesNotThrow(() => renderNotaEvolucionPrimaryTab());
  assert.doesNotThrow(() => showNotaEvolucionClassicView());
});
