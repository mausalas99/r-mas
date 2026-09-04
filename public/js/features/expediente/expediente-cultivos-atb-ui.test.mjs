import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { wireAtbRisHoverPanels } from './expediente-cultivos-atb-ui.mjs';

const FIXTURE_HTML = `
  <div class="cult-atb-ris-chip-wrap">
    <span class="atb-chip atb-chip--r" tabindex="0" role="button">R</span>
    <div class="atb-ris-hover-panel atb-ris-hover-panel--r" role="region" aria-label="Resistencias">panel</div>
  </div>
`;

describe('wireAtbRisHoverPanels — antibiogram chip keyboard activation (WU7)', () => {
  it('opens the hover panel on Enter, same as hover/focus (chip has role=button tabindex=0, no click handler)', () => {
    if (typeof document === 'undefined') return;
    const root = document.createElement('div');
    root.innerHTML = FIXTURE_HTML;
    document.body.appendChild(root);
    try {
      wireAtbRisHoverPanels(root);
      const chip = root.querySelector('.atb-chip');
      const panel = document.querySelector('.atb-ris-hover-panel');
      assert.equal(panel.classList.contains('is-open'), false);
      chip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      assert.equal(panel.classList.contains('is-open'), true);
    } finally {
      root.remove();
      document.querySelectorAll('.atb-ris-hover-panel').forEach((p) => p.remove());
    }
  });

  it('opens the hover panel on Space too, and ignores other keys', () => {
    if (typeof document === 'undefined') return;
    const root = document.createElement('div');
    root.innerHTML = FIXTURE_HTML;
    document.body.appendChild(root);
    try {
      wireAtbRisHoverPanels(root);
      const chip = root.querySelector('.atb-chip');
      const panel = document.querySelector('.atb-ris-hover-panel');
      chip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      assert.equal(panel.classList.contains('is-open'), false);
      chip.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      assert.equal(panel.classList.contains('is-open'), true);
    } finally {
      root.remove();
      document.querySelectorAll('.atb-ris-hover-panel').forEach((p) => p.remove());
    }
  });
});
