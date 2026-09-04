/**
 * Cierre unificado de ventanas modales: Escape y clic en el fondo (backdrop).
 * Las capas se evalúan en orden inverso al registro (la última registrada gana).
 *
 * También centraliza el atrapado de foco (Tab no sale del diálogo, el foco
 * vuelve al disparador al cerrar) para toda capa registrada que no maneje su
 * propio ciclo de apertura/cierre (ver `skipAutoFocusTrap`). La capa que
 * corresponde en cada momento se resuelve dinámicamente, así que sigue a la
 * que esté más arriba aunque haya diálogos anidados.
 */

/** @param {HTMLElement|null|undefined} el */
export function isRpcOverlayVisible(el) {
  if (!el || !el.isConnected) return false;
  var cs = window.getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  var op = parseFloat(cs.opacity);
  if (!Number.isNaN(op) && op <= 0) return false;
  return true;
}

/** @param {HTMLElement|null|undefined} el */
export function getOverlayZIndex(el) {
  if (!el || !isRpcOverlayVisible(el)) return -1;
  var z = parseInt(window.getComputedStyle(el).zIndex, 10);
  return Number.isNaN(z) ? 0 : z;
}

/** @param {HTMLElement} backdrop @param {string|undefined} panelSelector */
export function getDismissPanel(backdrop, panelSelector) {
  if (panelSelector) {
    var custom = backdrop.querySelector(panelSelector);
    if (custom) return custom;
  }
  return (
    backdrop.querySelector('[role="dialog"]') ||
    backdrop.querySelector('.modal') ||
    null
  );
}

/** @param {HTMLElement} backdrop @param {string|undefined} panelSelector @param {EventTarget|null} target */
export function isBackdropOutsideClick(backdrop, panelSelector, target) {
  if (target == null || typeof target !== 'object') return false;
  if (typeof backdrop.contains !== 'function' || !backdrop.contains(target)) return false;
  if (target === backdrop) return true;
  var panel = getDismissPanel(backdrop, panelSelector);
  if (!panel) return target === backdrop;
  return !panel.contains(target);
}

export function bindBackdropDismiss(backdropEl, requestClose, panelSelector) {
  if (!backdropEl || backdropEl.dataset.rpcBackdropDismiss === '2') return;
  backdropEl.dataset.rpcBackdropDismiss = '2';
  var selector = panelSelector || '.modal, [role="dialog"]';
  backdropEl.addEventListener('click', function (ev) {
    var panel = backdropEl.querySelector(selector);
    if (panel && panel.contains(ev.target)) return;
    requestClose();
  });
}

var FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** @param {HTMLElement|null|undefined} container */
export function getFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(function (el) {
    return !el.disabled && el.tabIndex !== -1;
  });
}

/** @param {HTMLElement} panel */
export function focusFirstFocusable(panel) {
  var focusables = getFocusableElements(panel);
  if (focusables.length) focusables[0].focus();
  else if (panel && typeof panel.focus === 'function') panel.focus();
}

/** @param {Element|null|undefined} el */
export function restoreFocus(el) {
  if (!el || typeof el.focus !== 'function') return;
  try {
    el.focus();
  } catch (_e) {
    void _e;
  }
}

/**
 * Wires Tab-containment + stray-focus-redirect onto a single panel. For
 * callers that already control their own open/close lifecycle explicitly
 * (ui-overlay.mjs, and the handful of modals not on the shared registry) —
 * they call this directly instead of going through the auto-detection below.
 * @param {HTMLElement} panel
 * @returns {{ unwire: () => void }}
 */
export function wireFocusTrap(panel) {
  function onTrapKeydown(ev) {
    if (ev.key !== 'Tab') return;
    var focusables = getFocusableElements(panel);
    if (!focusables.length) {
      ev.preventDefault();
      return;
    }
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  }

  function onFocusIn(ev) {
    if (!panel.contains(ev.target)) {
      focusFirstFocusable(panel);
    }
  }

  panel.addEventListener('keydown', onTrapKeydown);
  document.addEventListener('focusin', onFocusIn);
  return {
    unwire: function () {
      panel.removeEventListener('keydown', onTrapKeydown);
      document.removeEventListener('focusin', onFocusIn);
    },
  };
}

export function createModalDismissRegistry() {
  /**
   * @type {Array<{
   *   isOpen: () => boolean,
   *   close: () => void,
   *   confirmClose?: () => boolean,
   *   backdropEl?: () => (HTMLElement|null),
   *   panelSelector?: string,
   *   skipAutoFocusTrap?: boolean,
   * }>}
   */
  var layers = [];
  var globalWired = false;
  /** @type {Array<{ layer: object, panel: HTMLElement, previousFocus: Element|null }>} */
  var focusStack = [];

  function register(layer) {
    layers.push(layer);
  }

  function tryCloseLayer(layer, ev) {
    if (!layer.isOpen()) return false;
    if (layer.confirmClose && layer.confirmClose() === false) return true;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    layer.close();
    return true;
  }

  function closeTopmost(ev) {
    for (var i = layers.length - 1; i >= 0; i--) {
      if (tryCloseLayer(layers[i], ev)) return true;
    }
    return false;
  }

  function resolvePanel(layer) {
    if (!layer.backdropEl) return null;
    var el = layer.backdropEl();
    if (!el) return null;
    return getDismissPanel(el, layer.panelSelector);
  }

  /**
   * Topmost *open* layer, if it both opted into the auto focus-trap and
   * resolves to a panel. If the actual topmost-open layer is self-managed
   * (`skipAutoFocusTrap`, e.g. a ui-overlay dialog wiring its own trap) or
   * has no resolvable panel (e.g. a bare popover), the auto-trap backs off
   * entirely rather than reaching past it to a layer further down — a
   * closed layer is simply not in the way and is skipped over.
   */
  function topmostTrackedOpen() {
    for (var i = layers.length - 1; i >= 0; i--) {
      var layer = layers[i];
      if (!layer.isOpen()) continue;
      if (layer.skipAutoFocusTrap) return null;
      var panel = resolvePanel(layer);
      if (!panel) return null;
      return { layer: layer, panel: panel };
    }
    return null;
  }

  /**
   * Re-checks which tracked layer is topmost-open and reconciles the focus
   * stack: pops+restores anything that actually closed, and pushes+steals
   * focus for a newly-topmost panel. Called from the MutationObserver in
   * `init()`; exposed so tests can trigger it without a real DOM.
   */
  function syncFocusTrap() {
    if (typeof document === 'undefined') return;
    while (focusStack.length && !focusStack[focusStack.length - 1].layer.isOpen()) {
      var closedEntry = focusStack.pop();
      restoreFocus(closedEntry.previousFocus);
    }
    var top = topmostTrackedOpen();
    var stackTop = focusStack.length ? focusStack[focusStack.length - 1] : null;
    if (top && (!stackTop || stackTop.panel !== top.panel)) {
      focusStack.push({
        layer: top.layer,
        panel: top.panel,
        previousFocus: document.activeElement,
      });
      if (!top.panel.contains(document.activeElement)) {
        focusFirstFocusable(top.panel);
      }
    }
  }

  function onTabKeydown(ev) {
    var top = topmostTrackedOpen();
    if (!top) return;
    if (typeof document === 'undefined' || !top.panel.contains(document.activeElement)) return;
    var focusables = getFocusableElements(top.panel);
    if (!focusables.length) {
      ev.preventDefault();
      return;
    }
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  }

  function onGlobalFocusIn(ev) {
    var top = topmostTrackedOpen();
    if (!top) return;
    if (!top.panel.contains(ev.target)) {
      focusFirstFocusable(top.panel);
    }
  }

  function onKeydown(ev) {
    if (ev.key === 'Escape' || ev.key === 'Esc') {
      closeTopmost(ev);
      return;
    }
    if (ev.key === 'Tab') onTabKeydown(ev);
  }

  function init() {
    if (globalWired) return;
    globalWired = true;
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('focusin', onGlobalFocusIn, true);
    if (typeof MutationObserver !== 'undefined' && document.body) {
      new MutationObserver(syncFocusTrap).observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'hidden', 'aria-hidden'],
      });
    }
    layers.forEach(function (layer) {
      if (!layer.backdropEl) return;
      var el = layer.backdropEl();
      if (!el) return;
      bindBackdropDismiss(el, function () {
        tryCloseLayer(layer, null);
      }, layer.panelSelector);
    });
  }

  return {
    register,
    init,
    closeTopmost,
    bindBackdropDismiss,
    handleKeydown: onKeydown,
    checkFocusTrap: syncFocusTrap,
  };
}
