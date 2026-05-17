import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isMobileWeb, blockIfMobileDocExport, activateMobileWebRoot } from './mobile-web.mjs';

describe('mobile-web', () => {
  it('isMobileWeb es false sin flag', () => {
    assert.equal(isMobileWeb(), false);
  });

  it('activateMobileWebRoot activa clase', () => {
    if (typeof document === 'undefined') return;
    activateMobileWebRoot();
    assert.equal(isMobileWeb(), true);
    assert.ok(document.documentElement.classList.contains('rpc-mobile-web'));
  });

  it('blockIfMobileDocExport solo en móvil', () => {
    if (typeof document === 'undefined') return;
    activateMobileWebRoot();
    assert.equal(blockIfMobileDocExport(), true);
  });
});
