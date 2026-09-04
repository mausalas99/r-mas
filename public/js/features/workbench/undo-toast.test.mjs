import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildUndoToastHtml, showUndoToast } from './undo-toast.mjs';

describe('buildUndoToastHtml', () => {
  it('renders the om-rise animation class, message, Deshacer and close buttons', () => {
    const html = buildUndoToastHtml({ message: 'Pendiente marcado como listo' });
    assert.match(html, /class="wb-undo-toast om-rise"/);
    assert.match(html, /Pendiente marcado como listo/);
    assert.match(html, /data-wb-undo>Deshacer/);
    assert.match(html, /data-wb-undo-close/);
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
    });
    assert.ok(host.contains(toast));
    toast.querySelector('[data-wb-undo]').click();
    assert.equal(undone, true);
    assert.equal(host.contains(toast), false);
  });

  it('does not schedule an auto-dismiss timer — it is the only undo path', () => {
    if (typeof document === 'undefined') return;
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const host = document.createElement('div');
      const toast = showUndoToast({ message: 'Guardado', container: host });
      mock.timers.tick(60000);
      assert.ok(host.contains(toast), 'undo toast must stay on screen until dismissed manually');
    } finally {
      mock.timers.reset();
    }
  });

  it('renders a close button that dismisses the toast', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    const toast = showUndoToast({ message: 'Guardado', container: host });
    const closeBtn = toast.querySelector('[data-wb-undo-close]');
    assert.ok(closeBtn);
    closeBtn.click();
    assert.equal(host.contains(toast), false);
  });
});
