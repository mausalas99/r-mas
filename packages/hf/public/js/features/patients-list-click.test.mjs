import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { patientCardIdFromEvent, shouldHandleTouchPointerUp } from './patients-list-click.mjs';

function cardFixture() {
  const root = document.createElement('div');
  root.id = 'patient-list';
  root.innerHTML =
    '<div class="patient-card" data-patient-id="p-42" role="button">' +
    '<button type="button" class="btn-delete-card">×</button>' +
    '<div class="p-name">PEREZ, ANA</div>' +
    '</div>';
  document.body.appendChild(root);
  return root;
}

describe('patientCardIdFromEvent', () => {
  it('resolves the card from a child element tap', () => {
    if (typeof document === 'undefined') return;
    const root = cardFixture();
    const name = root.querySelector('.p-name');
    assert.equal(patientCardIdFromEvent({ target: name }), 'p-42');
    root.remove();
  });

  it('resolves the card from a text-node target (iOS Safari)', () => {
    if (typeof document === 'undefined') return;
    const root = cardFixture();
    const name = root.querySelector('.p-name');
    const text = name.firstChild;
    assert.equal(text && text.nodeType, 3);
    assert.equal(patientCardIdFromEvent({ target: text }), 'p-42');
    root.remove();
  });

  it('ignores toolbar button taps', () => {
    if (typeof document === 'undefined') return;
    const root = cardFixture();
    const btn = root.querySelector('.btn-delete-card');
    assert.equal(patientCardIdFromEvent({ target: btn }), '');
    root.remove();
  });
});

describe('shouldHandleTouchPointerUp', () => {
  it('handles touch and pen, not mouse (click already fires)', () => {
    assert.equal(shouldHandleTouchPointerUp({ pointerType: 'touch' }), true);
    assert.equal(shouldHandleTouchPointerUp({ pointerType: 'pen' }), true);
    assert.equal(shouldHandleTouchPointerUp({ pointerType: 'mouse' }), false);
    assert.equal(shouldHandleTouchPointerUp({}), false);
  });
});
