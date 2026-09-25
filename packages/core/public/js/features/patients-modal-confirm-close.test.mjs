import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { confirmCloseAddPatientModal } from './patients-modal.mjs';

function fieldFixture(id, value) {
  const el = document.createElement('input');
  el.id = id;
  el.value = value;
  document.body.appendChild(el);
  return el;
}

describe('confirmCloseAddPatientModal', () => {
  it('returns true (no consequence modal) when no fields have data', () => {
    if (typeof document === 'undefined') return;
    const result = confirmCloseAddPatientModal();
    assert.equal(result, true);
    assert.equal(document.querySelector('[data-wb-confirm-backdrop]'), null);
  });

  it('opens a consequence confirm and returns false while it is pending; confirming closes the modal', () => {
    if (typeof document === 'undefined') return;
    const el = fieldFixture('m-area', 'Piso 3');
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.classList.add('open');
    document.body.appendChild(modal);

    const result = confirmCloseAddPatientModal();
    assert.equal(result, false, 'blocks the synchronous auto-close path');

    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /¿Cerrar sin guardar\?/);
    assert.match(backdrop.innerHTML, /wb-confirm-modal--consequence/);

    document.querySelector('[data-wb-confirm-ok]').click();
    assert.equal(modal.getAttribute('aria-hidden'), 'true', 'onConfirm calls closeModal');

    el.remove();
    modal.remove();
  });
});
