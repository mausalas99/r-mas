import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  openLabPasteModal,
  closeLabPasteModal,
  isLabPasteModalOpen,
} from './lab-paste-modal.mjs';

function mountBackdrop() {
  document.body.innerHTML =
    '<div id="lab-paste-modal-backdrop" class="modal-backdrop" aria-hidden="true">' +
    '<div class="modal lab-paste-modal">' +
    '<textarea id="lab-input"></textarea>' +
    '</div></div>';
}

describe('lab-paste-modal open/close', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') return;
    mountBackdrop();
  });

  it('starts closed', () => {
    if (typeof document === 'undefined') return;
    assert.equal(isLabPasteModalOpen(), false);
  });

  it('openLabPasteModal adds .open and clears aria-hidden', () => {
    if (typeof document === 'undefined') return;
    openLabPasteModal();
    var backdrop = document.getElementById('lab-paste-modal-backdrop');
    assert.equal(backdrop.classList.contains('open'), true);
    assert.equal(backdrop.getAttribute('aria-hidden'), 'false');
    assert.equal(isLabPasteModalOpen(), true);
  });

  it('closeLabPasteModal removes .open and restores aria-hidden', () => {
    if (typeof document === 'undefined') return;
    openLabPasteModal();
    closeLabPasteModal();
    var backdrop = document.getElementById('lab-paste-modal-backdrop');
    assert.equal(backdrop.classList.contains('open'), false);
    assert.equal(backdrop.getAttribute('aria-hidden'), 'true');
    assert.equal(isLabPasteModalOpen(), false);
  });

  it('is a no-op when the backdrop is not mounted', () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = '';
    assert.doesNotThrow(function () {
      openLabPasteModal();
      closeLabPasteModal();
    });
  });
});
