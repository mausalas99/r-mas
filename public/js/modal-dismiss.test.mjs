import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createModalDismissRegistry,
  isRpcOverlayVisible,
  getOverlayZIndex,
  isBackdropOutsideClick,
  getDismissPanel,
} from './modal-dismiss.mjs';

test('closeTopmost cierra la capa abierta con mayor z-index', () => {
  var closed = [];
  var lowEl = { isConnected: true };
  var highEl = { isConnected: true };
  globalThis.window = globalThis;
  globalThis.getComputedStyle = function (el) {
    if (el === highEl) {
      return { display: 'flex', visibility: 'visible', opacity: '1', zIndex: '1100' };
    }
    if (el === lowEl) {
      return { display: 'flex', visibility: 'visible', opacity: '1', zIndex: '100' };
    }
    return { display: 'none', visibility: 'hidden', opacity: '1', zIndex: '0' };
  };
  var reg = createModalDismissRegistry();
  reg.register({
    isOpen: function () {
      return true;
    },
    close: function () {
      closed.push('low');
    },
    backdropEl: function () {
      return lowEl;
    },
  });
  reg.register({
    isOpen: function () {
      return true;
    },
    close: function () {
      closed.push('high');
    },
    backdropEl: function () {
      return highEl;
    },
  });
  var ev = { key: 'Escape', preventDefault() {}, stopPropagation() {} };
  assert.equal(reg.closeTopmost(ev), true);
  assert.deepEqual(closed, ['high']);
});

test('isBackdropOutsideClick distingue fondo vs panel', () => {
  var inner = {};
  var panel = {
    contains: function (n) {
      return n === panel || n === inner;
    },
  };
  var backdrop = {
    contains: function (n) {
      return n === backdrop || n === panel || n === inner;
    },
    querySelector: function (sel) {
      if (sel === '[role="dialog"]' || sel === '.modal') return panel;
      return null;
    },
  };
  assert.equal(isBackdropOutsideClick(backdrop, null, backdrop), true);
  assert.equal(isBackdropOutsideClick(backdrop, null, inner), false);
  assert.equal(getDismissPanel(backdrop, null), panel);
});

test('isRpcOverlayVisible ignora display none', () => {
  var el = { isConnected: true };
  globalThis.window = globalThis;
  globalThis.getComputedStyle = function () {
    return { display: 'none', visibility: 'visible', opacity: '1', zIndex: '0' };
  };
  assert.equal(isRpcOverlayVisible(/** @type {HTMLElement} */ (el)), false);
});

test('getOverlayZIndex lee z-index del backdrop', () => {
  var el = { isConnected: true };
  globalThis.getComputedStyle = function () {
    return { display: 'flex', visibility: 'visible', opacity: '1', zIndex: '1100' };
  };
  assert.equal(getOverlayZIndex(/** @type {HTMLElement} */ (el)), 1100);
});

/** Builds a fake focusable element: tracks focus via the shared fakeDoc. */
function fakeFocusable(fakeDoc) {
  var el = { disabled: false, tabIndex: 0 };
  el.focus = function () {
    fakeDoc.activeElement = el;
  };
  return el;
}

/** Builds a fake panel containing the given focusable children, in order. */
function fakePanel(focusables) {
  var panel = {
    contains: function (n) {
      return n === panel || focusables.indexOf(n) !== -1;
    },
    querySelectorAll: function () {
      return focusables;
    },
    addEventListener: function () {},
    removeEventListener: function () {},
  };
  return panel;
}

/** Builds a fake backdrop resolving `[role="dialog"]`/`.modal` to the given panel. */
function fakeBackdrop(panel) {
  return {
    dataset: {},
    querySelector: function (sel) {
      if (sel === '[role="dialog"]' || sel === '.modal') return panel;
      return null;
    },
    addEventListener: function () {},
  };
}

test('el trap de foco: Tab desde el último foco vuelve al primero, y el foco vuelve al disparador al cerrar', () => {
  var priorDocument = globalThis.document;
  try {
    var fakeDoc = { addEventListener: function () {}, removeEventListener: function () {} };
    var trigger = fakeFocusable(fakeDoc);
    var first = fakeFocusable(fakeDoc);
    var last = fakeFocusable(fakeDoc);
    var panel = fakePanel([first, last]);
    var backdrop = fakeBackdrop(panel);
    fakeDoc.activeElement = trigger;
    globalThis.document = fakeDoc;

    var open = true;
    var reg = createModalDismissRegistry();
    reg.register({
      isOpen: function () {
        return open;
      },
      close: function () {
        open = false;
      },
      backdropEl: function () {
        return backdrop;
      },
    });
    reg.init();

    // The modal "opens": nothing has moved focus yet, so the registry steals
    // it into the panel's first focusable — this is what makes Tab-trapping
    // meaningful in the first place.
    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, first);

    // Tab from the last focusable wraps to the first, not out of the dialog.
    fakeDoc.activeElement = last;
    var tabEv = {
      key: 'Tab',
      shiftKey: false,
      defaultPrevented: false,
      preventDefault: function () {
        this.defaultPrevented = true;
      },
    };
    reg.handleKeydown(tabEv);
    assert.equal(tabEv.defaultPrevented, true);
    assert.equal(fakeDoc.activeElement, first);

    // Shift+Tab from the first wraps to the last.
    var shiftTabEv = {
      key: 'Tab',
      shiftKey: true,
      defaultPrevented: false,
      preventDefault: function () {
        this.defaultPrevented = true;
      },
    };
    reg.handleKeydown(shiftTabEv);
    assert.equal(fakeDoc.activeElement, last);

    // Closing the layer restores focus to whatever opened it.
    open = false;
    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, trigger);
  } finally {
    globalThis.document = priorDocument;
  }
});

test('el trap de foco sigue al modal anidado más arriba y restaura en cascada', () => {
  var priorDocument = globalThis.document;
  try {
    var fakeDoc = { addEventListener: function () {}, removeEventListener: function () {} };
    var trigger = fakeFocusable(fakeDoc);
    var outerFirst = fakeFocusable(fakeDoc);
    var outerPanel = fakePanel([outerFirst]);
    var outerBackdrop = fakeBackdrop(outerPanel);
    var innerFirst = fakeFocusable(fakeDoc);
    var innerPanel = fakePanel([innerFirst]);
    var innerBackdrop = fakeBackdrop(innerPanel);
    fakeDoc.activeElement = trigger;
    globalThis.document = fakeDoc;

    var outerOpen = true;
    var innerOpen = false;
    var reg = createModalDismissRegistry();
    reg.register({
      isOpen: function () {
        return outerOpen;
      },
      close: function () {
        outerOpen = false;
      },
      backdropEl: function () {
        return outerBackdrop;
      },
    });
    reg.register({
      isOpen: function () {
        return innerOpen;
      },
      close: function () {
        innerOpen = false;
      },
      backdropEl: function () {
        return innerBackdrop;
      },
    });
    reg.init();

    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, outerFirst, 'outer modal steals focus on open');

    // A nested confirm opens on top of the outer modal.
    innerOpen = true;
    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, innerFirst, 'nested modal becomes the trap target');

    // Tab now wraps within the nested panel, not the outer one.
    var tabEv = { key: 'Tab', shiftKey: false, preventDefault: function () {} };
    reg.handleKeydown(tabEv);
    assert.equal(fakeDoc.activeElement, innerFirst);

    // Nested modal closes: focus returns to whatever was focused in the
    // outer modal, and the outer modal is still the (still-open) trap target.
    innerOpen = false;
    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, outerFirst);

    // Outer modal closes: focus finally returns to the original trigger.
    outerOpen = false;
    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, trigger);
  } finally {
    globalThis.document = priorDocument;
  }
});

test('el trap de foco se retira si lo que está más arriba maneja su propio ciclo (skipAutoFocusTrap)', () => {
  var priorDocument = globalThis.document;
  try {
    var fakeDoc = { addEventListener: function () {}, removeEventListener: function () {} };
    var trigger = fakeFocusable(fakeDoc);
    var outerFirst = fakeFocusable(fakeDoc);
    var outerPanel = fakePanel([outerFirst]);
    var outerBackdrop = fakeBackdrop(outerPanel);
    fakeDoc.activeElement = trigger;
    globalThis.document = fakeDoc;

    var outerOpen = true;
    var selfManagedOpen = false;
    var reg = createModalDismissRegistry();
    reg.register({
      isOpen: function () {
        return outerOpen;
      },
      close: function () {
        outerOpen = false;
      },
      backdropEl: function () {
        return outerBackdrop;
      },
    });
    // e.g. a ui-overlay dialog: opts out because it wires its own trap.
    reg.register({
      isOpen: function () {
        return selfManagedOpen;
      },
      close: function () {
        selfManagedOpen = false;
      },
      skipAutoFocusTrap: true,
    });
    reg.init();

    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, outerFirst);

    // The self-managed layer opens on top; the auto-trap must back off
    // entirely rather than reaching past it to keep managing the outer one.
    selfManagedOpen = true;
    fakeDoc.activeElement = trigger; // simulates the self-managed layer moving focus itself
    reg.checkFocusTrap();
    assert.equal(fakeDoc.activeElement, trigger, 'auto-trap does not steal focus while a self-managed layer is on top');

    var tabEv = { key: 'Tab', shiftKey: false, preventDefault: function () {} };
    reg.handleKeydown(tabEv);
    assert.equal(fakeDoc.activeElement, trigger, 'auto-trap does not wrap Tab while a self-managed layer is on top');
  } finally {
    globalThis.document = priorDocument;
  }
});

test('stackZ prioriza capa anidada sobre z-index CSS bajo', () => {
  var closed = [];
  globalThis.getComputedStyle = function () {
    return { display: 'flex', visibility: 'visible', opacity: '1', zIndex: '6' };
  };
  var reg = createModalDismissRegistry();
  reg.register({
    isOpen: function () {
      return true;
    },
    close: function () {
      closed.push('registro');
    },
    backdropEl: function () {
      return { isConnected: true };
    },
    stackZ: 140,
  });
  reg.register({
    isOpen: function () {
      return true;
    },
    close: function () {
      closed.push('paste');
    },
    backdropEl: function () {
      return { isConnected: true };
    },
    stackZ: 150,
  });
  var ev = { key: 'Escape', preventDefault() {}, stopPropagation() {} };
  assert.equal(reg.closeTopmost(ev), true);
  assert.deepEqual(closed, ['paste']);
});
