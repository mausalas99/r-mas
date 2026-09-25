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

  it('auto-dismisses if the user never clicks Deshacer or close', () => {
    if (typeof document === 'undefined') return;
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const host = document.createElement('div');
      const toast = showUndoToast({ message: 'Guardado', container: host });
      assert.ok(host.contains(toast));
      mock.timers.tick(5000);
      assert.equal(host.contains(toast), false);
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

  it('replaces the previous toast in the same host instead of stacking', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    const first = showUndoToast({ message: 'Pendiente 1 marcado como listo', container: host });
    const second = showUndoToast({ message: 'Pendiente 2 marcado como listo', container: host });
    assert.equal(host.contains(first), false);
    assert.equal(host.contains(second), true);
    assert.equal(host.querySelectorAll('.wb-undo-toast').length, 1);
    second.querySelector('[data-wb-undo-close]').click();
  });

  it('does not touch a toast from a different host', () => {
    if (typeof document === 'undefined') return;
    const hostA = document.createElement('div');
    const hostB = document.createElement('div');
    const toastA = showUndoToast({ message: 'A', container: hostA });
    const toastB = showUndoToast({ message: 'B', container: hostB });
    assert.equal(hostA.contains(toastA), true);
    assert.equal(hostB.contains(toastB), true);
    toastA.querySelector('[data-wb-undo-close]').click();
    toastB.querySelector('[data-wb-undo-close]').click();
  });
});
