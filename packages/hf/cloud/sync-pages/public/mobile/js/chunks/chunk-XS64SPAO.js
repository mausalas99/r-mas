import {
  projectMomentum,
  rubberband
} from "/mobile/js/chunks/chunk-UDWVBKE4.js";
import {
  getReleaseVelocity,
  prefersReducedMotion,
  springTo
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";

// public/js/modal-dismiss.mjs
function isRpcOverlayVisible(el) {
  if (!el || !el.isConnected) return false;
  var cs = window.getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  var op = parseFloat(cs.opacity);
  if (!Number.isNaN(op) && op <= 0) return false;
  return true;
}
function getOverlayZIndex(el) {
  if (!el || !isRpcOverlayVisible(el)) return -1;
  var z = parseInt(window.getComputedStyle(el).zIndex, 10);
  return Number.isNaN(z) ? 0 : z;
}
function bindBackdropDismiss(backdropEl, requestClose, panelSelector) {
  if (!backdropEl || backdropEl.dataset.rpcBackdropDismiss === "2") return;
  backdropEl.dataset.rpcBackdropDismiss = "2";
  var selector = panelSelector || '.modal, [role="dialog"]';
  backdropEl.addEventListener("click", function(ev) {
    var panel = backdropEl.querySelector(selector);
    if (panel && panel.contains(ev.target)) return;
    requestClose();
  });
}
function createModalDismissRegistry() {
  var layers = [];
  var globalWired = false;
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
  function onKeydown(ev) {
    if (ev.key !== "Escape" && ev.key !== "Esc") return;
    closeTopmost(ev);
  }
  function init() {
    if (globalWired) return;
    globalWired = true;
    document.addEventListener("keydown", onKeydown, true);
    layers.forEach(function(layer) {
      if (!layer.backdropEl) return;
      var el = layer.backdropEl();
      if (!el) return;
      bindBackdropDismiss(el, function() {
        tryCloseLayer(layer, null);
      }, layer.panelSelector);
    });
  }
  return { register, init, closeTopmost, bindBackdropDismiss };
}

// public/js/ui-overlay.mjs
var FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
var DEFAULT_DISMISS_VELOCITY = 0.11;
var SHEET_DISMISS_FRACTION = 0.3;
var dismissRegistry = null;
var wiredScrims = typeof WeakSet !== "undefined" ? /* @__PURE__ */ new WeakSet() : null;
function shouldDismissSheet(dragPx, height, velocity, threshold) {
  var v = threshold == null ? DEFAULT_DISMISS_VELOCITY : threshold;
  if (typeof velocity === "number" && velocity < 0) return false;
  var projected = dragPx + projectMomentum((velocity || 0) * 1e3);
  if (height > 0 && projected > height * SHEET_DISMISS_FRACTION) return true;
  if (typeof velocity === "number" && velocity >= v && dragPx > 0) return true;
  return false;
}
function rubberBandSheetOffset(dragPx, dimension) {
  if (dragPx <= 0) return rubberband(dragPx, dimension || 400, 0.55);
  return dragPx;
}
function ensureDismissRegistry() {
  if (!dismissRegistry) {
    dismissRegistry = createModalDismissRegistry();
    dismissRegistry.init();
  }
  return dismissRegistry;
}
function getFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== "function") return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(function(el) {
    return !el.disabled && el.tabIndex !== -1;
  });
}
function applyPanelMaterial(panel, nested, kind) {
  panel.classList.add("ui-overlay-panel", "ui-overlay-" + kind);
  if (nested) {
    panel.classList.add("ui-overlay-nested", "material-solid-elevated");
  } else {
    panel.classList.add("material-glass");
  }
}
function wireScrimDismiss(scrim) {
  if (!scrim) return;
  if (wiredScrims && wiredScrims.has(scrim)) return;
  if (wiredScrims) wiredScrims.add(scrim);
  bindBackdropDismiss(scrim, function() {
    ensureDismissRegistry().closeTopmost(null);
  }, ".ui-overlay-panel");
}
function showScrim(scrim) {
  if (!scrim) return;
  scrim.classList.add("ui-overlay-scrim");
  scrim.hidden = false;
  scrim.style.display = "";
  scrim.setAttribute("aria-hidden", "false");
}
function hideScrim(scrim) {
  if (!scrim) return;
  scrim.hidden = true;
  scrim.setAttribute("aria-hidden", "true");
}
function restoreFocus(el) {
  if (!el || typeof el.focus !== "function") return;
  try {
    el.focus();
  } catch (_e) {
    void _e;
  }
}
function focusPanelFirst(panel) {
  var focusables = getFocusableElements(panel);
  if (focusables.length) focusables[0].focus();
  else if (typeof panel.focus === "function") panel.focus();
}
function wireFocusTrap(panel) {
  function onTrapKeydown(ev) {
    if (ev.key !== "Tab") return;
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
      focusPanelFirst(panel);
    }
  }
  panel.addEventListener("keydown", onTrapKeydown);
  document.addEventListener("focusin", onFocusIn);
  return {
    unwire: function() {
      panel.removeEventListener("keydown", onTrapKeydown);
      document.removeEventListener("focusin", onFocusIn);
    }
  };
}
function runSpring(el, keyframes, options) {
  return springTo(el, keyframes, options);
}
function afterSpring(controls, cleanup) {
  var done = controls && controls.finished ? controls.finished : Promise.resolve();
  done.then(cleanup).catch(cleanup);
}
function registerOverlayLayer(isOpen, scrim, closeLayer) {
  ensureDismissRegistry().register({
    isOpen,
    close: closeLayer,
    backdropEl: function() {
      return scrim || null;
    },
    panelSelector: ".ui-overlay-panel"
  });
}
function revealPanel(panel, scrim) {
  showScrim(scrim);
  panel.hidden = false;
  panel.style.display = "";
  panel.setAttribute("aria-hidden", "false");
}
function hidePanel(panel) {
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");
  panel.style.transform = "";
  panel.style.opacity = "";
  panel.style.removeProperty("--ui-overlay-origin");
}
function openDialog(opts) {
  var panel = opts.panel;
  var scrim = opts.scrim;
  var reduced = prefersReducedMotion();
  var closed = false;
  var animControls = null;
  var previousFocus = typeof document !== "undefined" ? document.activeElement : null;
  applyPanelMaterial(panel, opts.nested, "dialog");
  revealPanel(panel, scrim);
  setOverlayOrigin(panel, opts.trigger);
  panel.style.opacity = "0";
  if (!reduced) panel.style.transform = "scale(0.95)";
  var openKf = { opacity: [0, 1] };
  if (!reduced) openKf.transform = ["scale(0.95)", "scale(1)"];
  animControls = runSpring(panel, openKf, { bounce: 0, duration: 0.32 });
  wireScrimDismiss(scrim);
  var trap = wireFocusTrap(panel);
  focusPanelFirst(panel);
  function cleanup() {
    trap.unwire();
    hidePanel(panel);
    hideScrim(scrim);
    restoreFocus(previousFocus);
    if (opts.onClose) opts.onClose();
  }
  function closeLayer(reason) {
    if (closed) return;
    closed = true;
    if (animControls) animControls.stop();
    var closeKf = { opacity: [1, 0] };
    if (!reduced) closeKf.transform = ["scale(1)", "scale(0.95)"];
    afterSpring(runSpring(panel, closeKf, { bounce: 0.1, duration: 0.28 }), cleanup);
    void reason;
  }
  registerOverlayLayer(function() {
    return !closed;
  }, scrim, function() {
    closeLayer("esc");
  });
  return {
    close: function(reason) {
      closeLayer(reason || "explicit");
    }
  };
}
function releaseSheetCapture(panel, pointerId) {
  if (typeof panel.releasePointerCapture !== "function") return;
  try {
    panel.releasePointerCapture(pointerId);
  } catch (_e) {
    void _e;
  }
}
function captureSheetPointer(panel, pointerId) {
  if (typeof panel.setPointerCapture !== "function") return;
  try {
    panel.setPointerCapture(pointerId);
  } catch (_e) {
    void _e;
  }
}
function sheetTransformY(y) {
  return "translateY(" + y + "px)";
}
function wireSheetPointer(panel, reduced, dismissVelocity, requestClose) {
  var animControls = null;
  var pointerHistory = [];
  var dragPx = 0;
  var dragging = false;
  var sheetHeight = panel.offsetHeight || panel.getBoundingClientRect().height || 1;
  function springSheetTo(targetPx, velocity) {
    if (animControls) animControls.stop();
    if (reduced) return;
    var springOpts = { bounce: 0, duration: 0.34 };
    if (typeof velocity === "number" && Math.abs(velocity) > 0.15) springOpts.bounce = 0.08;
    if (velocity != null) springOpts.velocity = velocity;
    animControls = runSpring(panel, {
      transform: [sheetTransformY(dragPx), sheetTransformY(targetPx)]
    }, springOpts);
    dragPx = targetPx;
  }
  function onPointerDown(ev) {
    if (reduced) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    dragging = true;
    pointerHistory = [{ t: ev.timeStamp, y: ev.clientY }];
    dragPx = 0;
    sheetHeight = panel.offsetHeight || panel.getBoundingClientRect().height || 1;
    captureSheetPointer(panel, ev.pointerId);
    if (animControls) animControls.stop();
  }
  function onPointerMove(ev) {
    if (!dragging || reduced) return;
    pointerHistory.push({ t: ev.timeStamp, y: ev.clientY });
    var delta = ev.clientY - pointerHistory[0].y;
    dragPx = rubberBandSheetOffset(delta, sheetHeight);
    panel.style.transform = sheetTransformY(dragPx);
  }
  function onPointerUp(ev) {
    if (!dragging) return;
    dragging = false;
    releaseSheetCapture(panel, ev.pointerId);
    if (reduced) return;
    pointerHistory.push({ t: ev.timeStamp, y: ev.clientY });
    var velocity = getReleaseVelocity(pointerHistory, { axis: "y", now: ev.timeStamp });
    if (shouldDismissSheet(dragPx, sheetHeight, velocity, dismissVelocity)) {
      requestClose();
      return;
    }
    springSheetTo(0, velocity);
  }
  panel.addEventListener("pointerdown", onPointerDown);
  panel.addEventListener("pointermove", onPointerMove);
  panel.addEventListener("pointerup", onPointerUp);
  panel.addEventListener("pointercancel", onPointerUp);
  return {
    unwire: function() {
      panel.removeEventListener("pointerdown", onPointerDown);
      panel.removeEventListener("pointermove", onPointerMove);
      panel.removeEventListener("pointerup", onPointerUp);
      panel.removeEventListener("pointercancel", onPointerUp);
    },
    stopAnim: function() {
      if (animControls) animControls.stop();
    },
    getDragPx: function() {
      return dragPx;
    },
    sheetTransform: sheetTransformY
  };
}
function openSheet(opts) {
  var panel = opts.panel;
  var scrim = opts.scrim;
  var reduced = prefersReducedMotion();
  var closed = false;
  var animControls = null;
  var previousFocus = typeof document !== "undefined" ? document.activeElement : null;
  var dismissVelocity = opts.dismissVelocity == null ? DEFAULT_DISMISS_VELOCITY : opts.dismissVelocity;
  applyPanelMaterial(panel, opts.nested, "sheet");
  revealPanel(panel, scrim);
  panel.style.opacity = reduced ? "0" : "1";
  panel.style.transform = reduced ? "none" : "translateY(100%)";
  var openKf = reduced ? { opacity: [0, 1] } : { transform: ["translateY(100%)", "translateY(0)"] };
  animControls = runSpring(panel, openKf, { bounce: 0, duration: 0.38 });
  wireScrimDismiss(scrim);
  var trap = wireFocusTrap(panel);
  focusPanelFirst(panel);
  var pointer = wireSheetPointer(panel, reduced, dismissVelocity, function() {
    closeLayer("drag");
  });
  function cleanup() {
    trap.unwire();
    pointer.unwire();
    hidePanel(panel);
    hideScrim(scrim);
    restoreFocus(previousFocus);
    if (opts.onClose) opts.onClose();
  }
  function closeLayer(reason) {
    if (closed) return;
    closed = true;
    if (animControls) animControls.stop();
    pointer.stopAnim();
    var dragPx = pointer.getDragPx();
    var closeKf = reduced ? { opacity: [1, 0] } : { transform: [pointer.sheetTransform(dragPx), "translateY(100%)"] };
    afterSpring(runSpring(panel, closeKf, { bounce: 0.05, duration: 0.3 }), cleanup);
    void reason;
  }
  registerOverlayLayer(function() {
    return !closed;
  }, scrim, function() {
    closeLayer("esc");
  });
  return {
    close: function(reason) {
      closeLayer(reason || "explicit");
    }
  };
}
function overlayOriginFromRects(triggerRect, panelRect) {
  if (!triggerRect || !panelRect) return "";
  var ox = triggerRect.left + triggerRect.width / 2 - panelRect.left;
  var oy = triggerRect.top - panelRect.top;
  return ox + "px " + oy + "px";
}
function setOverlayOrigin(panel, trigger) {
  if (!trigger || typeof trigger.getBoundingClientRect !== "function") return;
  if (!panel || typeof panel.getBoundingClientRect !== "function") return;
  var origin = overlayOriginFromRects(trigger.getBoundingClientRect(), panel.getBoundingClientRect());
  if (origin) panel.style.setProperty("--ui-overlay-origin", origin);
}
function openMenu(opts) {
  var panel = opts.panel;
  var reduced = prefersReducedMotion();
  var closed = false;
  var animControls = null;
  var previousFocus = typeof document !== "undefined" ? document.activeElement : null;
  applyPanelMaterial(panel, opts.nested, "menu");
  panel.hidden = false;
  panel.style.display = "";
  panel.setAttribute("aria-hidden", "false");
  setOverlayOrigin(panel, opts.trigger);
  panel.style.opacity = "0";
  if (!reduced) panel.style.transform = "scale(0.95)";
  var openKf = { opacity: [0, 1] };
  if (!reduced) openKf.transform = ["scale(0.95)", "scale(1)"];
  animControls = runSpring(panel, openKf, { bounce: 0, duration: 0.26 });
  var trap = wireFocusTrap(panel);
  focusPanelFirst(panel);
  function cleanup() {
    trap.unwire();
    hidePanel(panel);
    restoreFocus(previousFocus);
    if (opts.onClose) opts.onClose();
  }
  function closeLayer(reason) {
    if (closed) return;
    closed = true;
    if (animControls) animControls.stop();
    var closeKf = { opacity: [1, 0] };
    if (!reduced) closeKf.transform = ["scale(1)", "scale(0.95)"];
    afterSpring(runSpring(panel, closeKf, { bounce: 0.1, duration: 0.22 }), cleanup);
    void reason;
  }
  ensureDismissRegistry().register({
    isOpen: function() {
      return !closed;
    },
    close: function() {
      closeLayer("esc");
    }
  });
  return {
    close: function(reason) {
      closeLayer(reason || "explicit");
    }
  };
}
function mountHybridDemoSheet() {
  if (typeof document === "undefined") {
    return { close: function() {
    } };
  }
  var priorScrim = document.getElementById("hybrid-demo-sheet-scrim");
  if (priorScrim) priorScrim.remove();
  var priorPanel = document.getElementById("hybrid-demo-sheet-panel");
  if (priorPanel) priorPanel.remove();
  var scrim = document.createElement("div");
  scrim.id = "hybrid-demo-sheet-scrim";
  var panel = document.createElement("div");
  panel.id = "hybrid-demo-sheet-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Demo sheet Hybrid H");
  panel.innerHTML = '<div class="ui-overlay-sheet__handle" aria-hidden="true"></div><p style="margin:16px 20px 8px;font-size:15px;font-weight:600;color:var(--text);">Sheet de prueba</p><p style="margin:0 20px 24px;font-size:13px;line-height:1.45;color:var(--text-muted);">Arrastr\xE1 hacia abajo para cerrar (velocidad o m\xE1s del 30% de altura).</p>';
  document.body.appendChild(scrim);
  document.body.appendChild(panel);
  return openSheet({
    panel,
    scrim,
    onClose: function() {
      scrim.remove();
      panel.remove();
    }
  });
}

export {
  isRpcOverlayVisible,
  getOverlayZIndex,
  createModalDismissRegistry,
  shouldDismissSheet,
  rubberBandSheetOffset,
  openDialog,
  openSheet,
  overlayOriginFromRects,
  openMenu,
  mountHybridDemoSheet
};
//# sourceMappingURL=/js/chunks/chunk-XS64SPAO.js.map
