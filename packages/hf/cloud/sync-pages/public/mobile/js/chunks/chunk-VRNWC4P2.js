import {
  projectMomentum,
  rubberband
} from "/mobile/js/chunks/chunk-UDWVBKE4.js";
import {
  getReleaseVelocity,
  prefersReducedMotion
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";

// public/js/ui-toast.mjs
var MAX_TOASTS = 3;
var TOAST_MS = 3500;
var TOAST_MS_WARN = 5500;
var GLYPH = { success: "\u2713", error: "\u2715", warn: "!", info: "\xB7" };
var TOAST_SWIPE_DISMISS_VELOCITY = 0.11;
var nextId = 1;
var toastEntries = /* @__PURE__ */ new Map();
var visibilityHooked = false;
var documentHiddenPaused = false;
function normalizeToastType(type) {
  const t = String(type || "").trim().toLowerCase();
  if (t === "ok") return "success";
  if (t === "warning") return "warn";
  if (t === "success" || t === "error" || t === "warn" || t === "info") return t;
  return "";
}
function ensureToastStack() {
  let stack = document.getElementById("toast-stack");
  if (stack) return stack;
  const legacy = document.getElementById("toast");
  stack = document.createElement("div");
  stack.id = "toast-stack";
  stack.className = "toast-stack";
  stack.setAttribute("role", "status");
  stack.setAttribute("aria-live", "polite");
  stack.setAttribute("aria-atomic", "false");
  if (legacy && legacy.parentNode) {
    legacy.parentNode.replaceChild(stack, legacy);
  } else {
    document.body.appendChild(stack);
  }
  return stack;
}
function ensureVisibilityHook() {
  if (visibilityHooked || typeof document === "undefined") return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
      documentHiddenPaused = true;
      toastEntries.forEach(function(entry) {
        pauseToastTimer(entry);
      });
      return;
    }
    documentHiddenPaused = false;
    toastEntries.forEach(function(entry) {
      resumeToastTimer(entry);
    });
  });
}
function clearToastTimer(entry) {
  if (!entry) return;
  if (entry.timer != null) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
}
function pauseToastTimer(entry) {
  if (!entry || entry.pausedAt != null) return;
  clearToastTimer(entry);
  entry.pausedAt = Date.now();
}
function resumeToastTimer(entry) {
  if (!entry || entry.pausedAt == null) return;
  const remaining = Math.max(0, entry.endAt - entry.pausedAt);
  entry.pausedAt = null;
  if (remaining <= 0) {
    removeToastEl(entry.el, false);
    return;
  }
  entry.endAt = Date.now() + remaining;
  entry.timer = setTimeout(function() {
    removeToastEl(entry.el, false);
  }, remaining);
}
function shouldDismissToastSwipe(velocityX, dragX) {
  var projected = (Number(dragX) || 0) + projectMomentum((Number(velocityX) || 0) * 1e3);
  return projected > 80 || Number(velocityX) >= TOAST_SWIPE_DISMISS_VELOCITY;
}
function buildToastEl(msg, kind, id, action) {
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " " + kind : "");
  el.dataset.toastId = String(id);
  el.tabIndex = -1;
  const glyph = document.createElement("span");
  glyph.className = "toast-glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = kind ? GLYPH[kind] || "" : "";
  const text = document.createElement("span");
  text.className = "toast-text";
  text.textContent = String(msg || "");
  if (kind) el.appendChild(glyph);
  el.appendChild(text);
  if (action && action.label) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = String(action.label);
    actionBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (typeof action.onClick === "function") action.onClick();
      removeToastEl(el, false);
    });
    el.appendChild(actionBtn);
  }
  return el;
}
function finishToastExit(el, instant) {
  if (!el || !el.parentNode) return;
  const id = Number(el.dataset.toastId);
  toastEntries.delete(id);
  if (instant || prefersReducedMotion()) {
    el.remove();
    return;
  }
  el.remove();
}
function removeToastEl(el, instant) {
  if (!el || !el.parentNode) return;
  const id = Number(el.dataset.toastId);
  const entry = toastEntries.get(id);
  if (entry) clearToastTimer(entry);
  toastEntries.delete(id);
  if (instant || prefersReducedMotion()) {
    el.remove();
    return;
  }
  el.classList.remove("show");
  el.classList.add("toast--leave");
  let done = false;
  function cleanup() {
    if (done) return;
    done = true;
    el.removeEventListener("transitionend", onEnd);
    finishToastExit(el, false);
  }
  function onEnd(ev) {
    if (ev.target !== el) return;
    if (ev.propertyName !== "opacity" && ev.propertyName !== "transform") return;
    cleanup();
  }
  el.addEventListener("transitionend", onEnd);
  setTimeout(cleanup, 320);
}
function trimToastStack(stack) {
  while (stack.children.length > MAX_TOASTS) {
    removeToastEl(stack.firstElementChild, true);
  }
}
function scheduleDismiss(entry, ms) {
  clearToastTimer(entry);
  entry.endAt = Date.now() + ms;
  entry.pausedAt = null;
  entry.timer = setTimeout(function() {
    removeToastEl(entry.el, false);
  }, ms);
}
function dismissMsForKind(kind, opts) {
  if (opts && typeof opts.durationMs === "number" && opts.durationMs > 0) {
    return opts.durationMs;
  }
  return kind === "warn" ? TOAST_MS_WARN : TOAST_MS;
}
function wireSwipeDismiss(el) {
  let pointerHistory = [];
  let dragging = false;
  let startX = 0;
  let dragX = 0;
  function resetDrag() {
    dragging = false;
    dragX = 0;
    pointerHistory = [];
    el.style.transform = "";
  }
  function onPointerDown(ev) {
    if (ev.button !== 0) return;
    dragging = true;
    startX = ev.clientX;
    dragX = 0;
    pointerHistory = [{ t: ev.timeStamp, x: ev.clientX, y: ev.clientY }];
    if (typeof el.setPointerCapture === "function") el.setPointerCapture(ev.pointerId);
  }
  function onPointerMove(ev) {
    if (!dragging) return;
    dragX = ev.clientX - startX;
    pointerHistory.push({ t: ev.timeStamp, x: ev.clientX, y: ev.clientY });
    if (dragX > 0) {
      el.style.transform = "translateX(" + dragX + "px)";
    } else if (dragX < 0 && !prefersReducedMotion()) {
      el.style.transform = "translateX(" + rubberband(dragX, 220) + "px)";
    }
  }
  function onPointerUp(ev) {
    if (!dragging) return;
    dragging = false;
    if (typeof el.releasePointerCapture === "function") {
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch (_e) {
        void _e;
      }
    }
    pointerHistory.push({ t: ev.timeStamp, x: ev.clientX, y: ev.clientY });
    const velocity = getReleaseVelocity(pointerHistory, { axis: "x", now: ev.timeStamp });
    if (shouldDismissToastSwipe(velocity, dragX)) {
      removeToastEl(el, false);
      return;
    }
    resetDrag();
  }
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
}
function showToast(msg, type, opts) {
  if (type && typeof type === "object" && !Array.isArray(type)) {
    opts = type;
    type = "";
  }
  opts = opts || {};
  ensureVisibilityHook();
  const stack = ensureToastStack();
  const kind = normalizeToastType(type);
  const id = nextId++;
  const el = buildToastEl(msg, kind, id, opts.action);
  stack.appendChild(el);
  trimToastStack(stack);
  requestAnimationFrame(function() {
    el.classList.add("show");
  });
  const entry = {
    id,
    el,
    timer: null,
    endAt: 0,
    pausedAt: null
  };
  toastEntries.set(id, entry);
  scheduleDismiss(entry, dismissMsForKind(kind, opts));
  if (documentHiddenPaused || typeof document !== "undefined" && document.hidden) {
    pauseToastTimer(entry);
  }
  el.addEventListener("mouseenter", function() {
    pauseToastTimer(entry);
  });
  el.addEventListener("mouseleave", function() {
    if (documentHiddenPaused || typeof document !== "undefined" && document.hidden) return;
    resumeToastTimer(entry);
  });
  if (typeof opts.onClick === "function") {
    el.classList.add("toast--clickable");
    el.addEventListener("click", function(ev) {
      if (ev.target && ev.target.closest && ev.target.closest(".toast-action")) return;
      opts.onClick();
      removeToastEl(el, false);
    });
  } else {
    el.addEventListener("click", function(ev) {
      if (ev.target && ev.target.closest && ev.target.closest(".toast-action")) return;
      removeToastEl(el, false);
    });
  }
  if (!prefersReducedMotion()) wireSwipeDismiss(el);
}

export {
  TOAST_SWIPE_DISMISS_VELOCITY,
  shouldDismissToastSwipe,
  showToast
};
//# sourceMappingURL=/js/chunks/chunk-VRNWC4P2.js.map
