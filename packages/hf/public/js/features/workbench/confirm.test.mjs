import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConfirmModalHtml, openConfirm, closeConfirm } from './confirm.mjs';

describe('buildConfirmModalHtml', () => {
  it('destructive weight: scrim modal with an alert-colored confirm button', () => {
    const html = buildConfirmModalHtml({
      weight: 'destructive',
      title: '¿Quitar a Pérez García de tu lista?',
      message: 'Se borran los 4 pendientes de este paciente en R+.',
      confirmLabel: 'Quitar de la lista',
    });
    assert.match(html, /wb-confirm-modal--destructive/);
    assert.match(html, /wb-btn-danger" data-wb-confirm-ok>Quitar de la lista/);
    assert.doesNotMatch(html, /wb-confirm-footer--rail/);
  });

  it('consequence weight: teal primary button, rail footer, one-sentence consequence', () => {
    const html = buildConfirmModalHtml({
      weight: 'consequence',
      title: 'Entregar la guardia',
      consequenceLabel: 'Queda abierto',
      consequenceText: '2 pendientes vencidos · 7 camas sin toma de 08:00',
      message: 'Pasan al turno de la mañana tal como están.',
      confirmLabel: 'Entregar',
    });
    assert.match(html, /wb-confirm-modal--consequence/);
    assert.match(html, /wb-confirm-footer--rail/);
    assert.match(html, /wb-btn-primary" data-wb-confirm-ok>Entregar/);
    assert.match(html, /2 pendientes vencidos · 7 camas sin toma de 08:00/);
  });
});

describe('openConfirm', () => {
  it('reversible weight shows no modal, just triggers the undo toast', async () => {
    const result = await openConfirm({ weight: 'reversible', message: 'Guardado' });
    assert.equal(result, 'reversible');
  });

  it('rejects an unknown weight', () => {
    assert.throws(() => openConfirm({ weight: 'nope' }));
  });

  it('destructive/consequence open a scrim modal, Esc and click-outside close it', async () => {
    if (typeof document === 'undefined') return;
    let cancelled = false;
    const p = openConfirm({
      weight: 'destructive',
      title: 'Borrar',
      onCancel: () => (cancelled = true),
    });
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'modal backdrop should be in the DOM');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const result = await p;
    assert.equal(result, 'cancel');
    assert.equal(cancelled, true);
    assert.equal(document.querySelector('[data-wb-confirm-backdrop]'), null);
    closeConfirm();
  });

  it('confirm button resolves with confirm and calls onConfirm', async () => {
    if (typeof document === 'undefined') return;
    let confirmed = false;
    const p = openConfirm({
      weight: 'consequence',
      title: 'Entregar la guardia',
      consequenceText: '2 pendientes vencidos',
      onConfirm: () => (confirmed = true),
    });
    document.querySelector('[data-wb-confirm-ok]').click();
    const result = await p;
    assert.equal(result, 'confirm');
    assert.equal(confirmed, true);
  });
});
