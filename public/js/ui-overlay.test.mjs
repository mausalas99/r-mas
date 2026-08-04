import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openDialog,
  openSheet,
  openMenu,
  shouldDismissSheet,
  rubberBandSheetOffset,
} from './ui-overlay.mjs';
import { createModalDismissRegistry } from './modal-dismiss.mjs';

test('shouldDismissSheet: velocity threshold', () => {
  assert.equal(shouldDismissSheet(0, 400, 0.12, 0.11), true);
  assert.equal(shouldDismissSheet(0, 400, 0.05, 0.11), false);
});

test('shouldDismissSheet: drag fraction threshold', () => {
  assert.equal(shouldDismissSheet(150, 400, 0, 0.11), true);
  assert.equal(shouldDismissSheet(100, 400, 0, 0.11), false);
});

test('rubberBandSheetOffset resists upward drag', () => {
  assert.equal(rubberBandSheetOffset(-40), -10);
  assert.equal(rubberBandSheetOffset(40), 40);
});

test('openDialog restores focus on close', async () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<button type="button" id="focus-anchor">anchor</button>' +
    '<div id="scrim" hidden><div id="panel" role="dialog"><button type="button" id="in-panel">ok</button></div></div>';
  var anchor = document.getElementById('focus-anchor');
  var scrim = document.getElementById('scrim');
  var panel = document.getElementById('panel');
  anchor.focus();
  assert.equal(document.activeElement, anchor);

  var overlay = openDialog({ panel, scrim });
  assert.notEqual(document.activeElement, anchor);

  overlay.close('test');
  await new Promise(function (r) {
    setTimeout(r, 50);
  });
  assert.equal(document.activeElement, anchor);
});

test('nested dialog applies solid elevated classes', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div id="scrim-n" hidden><div id="panel-n" role="dialog"></div></div>';
  var panel = document.getElementById('panel-n');
  var scrim = document.getElementById('scrim-n');
  openDialog({ panel, scrim, nested: true });
  assert.ok(panel.classList.contains('ui-overlay-nested'));
  assert.ok(panel.classList.contains('material-solid-elevated'));
  assert.equal(panel.classList.contains('material-glass'), false);
});

test('reduced motion dialog skips scale transform on open', () => {
  if (typeof document === 'undefined') return;
  var prior = globalThis.matchMedia;
  globalThis.matchMedia = function (q) {
    return {
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q,
      addEventListener() {},
      removeEventListener() {},
    };
  };
  try {
    document.body.innerHTML =
      '<div id="scrim-r" hidden><div id="panel-r" role="dialog"></div></div>';
    var panel = document.getElementById('panel-r');
    var scrim = document.getElementById('scrim-r');
    openDialog({ panel, scrim });
    assert.equal(panel.style.transform, '');
    assert.equal(panel.style.opacity, '0');
  } finally {
    globalThis.matchMedia = prior;
  }
});

test('Esc closes top overlay layer via dismiss registry integration', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div id="s1" hidden><div id="p1" class="ui-overlay-panel" role="dialog"></div></div>' +
    '<div id="s2" hidden><div id="p2" class="ui-overlay-panel" role="dialog"></div></div>';
  var closed = [];
  var reg = createModalDismissRegistry();
  reg.init();
  reg.register({
    isOpen: function () {
      return true;
    },
    close: function () {
      closed.push('first');
    },
  });
  reg.register({
    isOpen: function () {
      return true;
    },
    close: function () {
      closed.push('second');
    },
  });
  var ev = { key: 'Escape', preventDefault() {}, stopPropagation() {} };
  document.dispatchEvent(
    Object.assign(new Event('keydown'), { key: 'Escape', preventDefault() {}, stopPropagation() {} })
  );
  reg.closeTopmost(ev);
  assert.deepEqual(closed, ['second']);
});

test('openSheet close() is exposed and reduced motion avoids slide transform', () => {
  if (typeof document === 'undefined') return;
  var prior = globalThis.matchMedia;
  globalThis.matchMedia = function (q) {
    return {
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q,
      addEventListener() {},
      removeEventListener() {},
    };
  };
  try {
    document.body.innerHTML =
      '<div id="sheet-scrim" hidden><div id="sheet-panel" role="dialog"></div></div>';
    var panel = document.getElementById('sheet-panel');
    var scrim = document.getElementById('sheet-scrim');
    var overlay = openSheet({ panel, scrim });
    assert.equal(typeof overlay.close, 'function');
    assert.equal(panel.style.transform, 'none');
    overlay.close('test');
  } finally {
    globalThis.matchMedia = prior;
  }
});

test('openMenu sets transform origin from trigger', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<button type="button" id="menu-trigger" style="position:absolute;left:10px;top:20px;width:40px;height:20px"></button>' +
    '<div id="menu-panel" hidden></div>';
  var trigger = document.getElementById('menu-trigger');
  var panel = document.getElementById('menu-panel');
  openMenu({ panel, trigger });
  var origin = panel.style.getPropertyValue('--ui-overlay-origin');
  assert.ok(origin.includes('30px'));
  assert.ok(origin.includes('20px'));
});
