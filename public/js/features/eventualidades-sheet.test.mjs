import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openEventualidadComposeSheet,
  closeEventualidadComposeSheet,
  isEventualidadComposeSheetOpen,
} from './eventualidades-sheet.mjs';

test('openEventualidadComposeSheet applies glass sheet classes', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML = '';
  const prior = globalThis.matchMedia;
  globalThis.matchMedia = function (q) {
    return {
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q,
      addEventListener() {},
      removeEventListener() {},
    };
  };
  try {
    const out = openEventualidadComposeSheet({
      panelHtml: '<div class="ev-compose ev-compose--sheet"></div>',
      ariaLabel: 'Nueva eventualidad',
    });
    const panel = document.querySelector('.ev-sheet');
    assert.ok(panel);
    assert.ok(panel.classList.contains('ui-overlay-sheet'));
    assert.ok(panel.classList.contains('material-glass'));
    assert.ok(document.querySelector('.ui-overlay-scrim'));
    assert.equal(isEventualidadComposeSheetOpen(), true);
    assert.ok(out.mountEl);
    closeEventualidadComposeSheet('test');
    assert.equal(isEventualidadComposeSheetOpen(), false);
    assert.equal(document.querySelector('.ev-sheet'), null);
  } finally {
    globalThis.matchMedia = prior;
  }
});
