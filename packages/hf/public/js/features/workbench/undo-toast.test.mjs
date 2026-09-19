import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildUndoToastHtml, showUndoToast } from './undo-toast.mjs';

describe('buildUndoToastHtml', () => {
  it('renders the om-rise animation class, message and Deshacer button', () => {
    const html = buildUndoToastHtml({ message: 'Pendiente marcado como listo' });
    assert.match(html, /class="wb-undo-toast om-rise"/);
    assert.match(html, /Pendiente marcado como listo/);
    assert.match(html, /data-wb-undo>Deshacer/);
  });

  it('supports a custom undo label', () => {
    const html = buildUndoToastHtml({ message: 'Guardado', undoLabel: 'Anular' });
    assert.match(html, /data-wb-undo>Anular/);
  });
});

describe('showUndoToast', () => {
  it('appends the toast and wires the undo button', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let undone = false;
    const toast = showUndoToast({
      message: 'Guardado',
      onUndo: () => (undone = true),
      container: host,
      durationMs: 10,
    });
    assert.ok(host.contains(toast));
    toast.querySelector('[data-wb-undo]').click();
    assert.equal(undone, true);
    assert.equal(host.contains(toast), false);
  });
});
