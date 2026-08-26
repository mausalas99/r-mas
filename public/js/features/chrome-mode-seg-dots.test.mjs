import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { syncHeaderModeSeg } from './chrome.mjs';

function mountSeg() {
  var seg = document.createElement('div');
  seg.id = 'header-mode-seg';
  seg.innerHTML =
    '<button class="header-mode-seg-btn" data-mode="sala"></button>' +
    '<button class="header-mode-seg-btn" data-mode="interconsulta"></button>' +
    '<button class="header-mode-seg-btn" data-mode="guardia"></button>' +
    '<div class="header-mode-seg-dots">' +
    '<span class="header-mode-seg-dot" data-mode="sala"></span>' +
    '<span class="header-mode-seg-dot" data-mode="interconsulta"></span>' +
    '<span class="header-mode-seg-dot" data-mode="guardia"></span>' +
    '</div>';
  document.body.appendChild(seg);
  return seg;
}

describe('syncHeaderModeSeg dots', () => {
  it('marks only the dot matching the current work mode as active', () => {
    if (typeof document === 'undefined') return;
    var seg = mountSeg();
    try {
      localStorage.removeItem('rpc-ui-density');
      localStorage.setItem('rpc-settings', JSON.stringify({ appMode: 'sala' }));
      syncHeaderModeSeg();
      var dots = seg.querySelectorAll('.header-mode-seg-dot');
      assert.equal(dots[0].classList.contains('is-active'), true);
      assert.equal(dots[1].classList.contains('is-active'), false);
      assert.equal(dots[2].classList.contains('is-active'), false);

      localStorage.setItem('rpc-settings', JSON.stringify({ appMode: 'interconsulta' }));
      syncHeaderModeSeg();
      assert.equal(dots[0].classList.contains('is-active'), false);
      assert.equal(dots[1].classList.contains('is-active'), true);
    } finally {
      seg.remove();
      localStorage.removeItem('rpc-settings');
    }
  });
});
