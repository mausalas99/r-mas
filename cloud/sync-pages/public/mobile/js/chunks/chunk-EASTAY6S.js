import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/workbench/undo-toast.mjs
var DEFAULT_UNDO_LABEL = "Deshacer";
var OM_RISE_DURATION_MS = 4200;
function buildUndoToastHtml({ message = "", undoLabel = DEFAULT_UNDO_LABEL } = {}) {
  return `<div class="wb-undo-toast om-rise" role="status"><span class="wb-undo-toast-message">${escHtml(message)}</span>` + (undoLabel ? `<button type="button" class="wb-undo-toast-btn" data-wb-undo>${escHtml(undoLabel)}</button>` : "") + "</div>";
}
function showUndoToast(opts = {}) {
  if (typeof document === "undefined") return null;
  const host = opts.container || document.body;
  const wrap = document.createElement("div");
  wrap.innerHTML = buildUndoToastHtml(opts);
  const toast = wrap.firstElementChild;
  host.appendChild(toast);
  const undoBtn = toast.querySelector("[data-wb-undo]");
  if (undoBtn && typeof opts.onUndo === "function") {
    undoBtn.addEventListener("click", () => {
      opts.onUndo();
      remove();
    });
  }
  function remove() {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }
  toast.addEventListener("animationend", remove, { once: true });
  setTimeout(remove, opts.durationMs || OM_RISE_DURATION_MS);
  return toast;
}

// public/js/features/workbench/confirm.mjs
var activeConfirm = null;
function confirmButtonClass(weight) {
  return weight === "destructive" ? "wb-btn wb-btn-danger" : "wb-btn wb-btn-primary";
}
function buildConsequenceHtml(weight, consequenceLabel, consequenceText) {
  if (weight !== "consequence" || !consequenceText) return "";
  const labelHtml = consequenceLabel ? `<span class="wb-confirm-consequence-label">${escHtml(consequenceLabel)}</span>` : "";
  return '<div class="wb-confirm-consequence">' + labelHtml + `<span class="wb-confirm-consequence-text">${escHtml(consequenceText)}</span></div>`;
}
function buildSecondaryHtml(secondaryLabel) {
  return secondaryLabel ? `<button type="button" class="wb-btn wb-btn-link" data-wb-confirm-secondary>${escHtml(secondaryLabel)}</button>` : "";
}
function footerClassForWeight(weight) {
  return weight === "consequence" ? "wb-confirm-footer wb-confirm-footer--rail" : "wb-confirm-footer";
}
function buildConfirmModalHtml(opts = {}) {
  const {
    weight,
    title = "",
    message = "",
    consequenceLabel = "",
    consequenceText = "",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    secondaryLabel = ""
  } = opts;
  const confirmClass = confirmButtonClass(weight);
  const consequenceHtml = buildConsequenceHtml(weight, consequenceLabel, consequenceText);
  const secondaryHtml = buildSecondaryHtml(secondaryLabel);
  const footerClass = footerClassForWeight(weight);
  return `<div class="wb-scrim" data-wb-confirm-backdrop><div class="wb-confirm-modal wb-confirm-modal--${weight}" role="dialog" aria-modal="true"><div class="wb-confirm-body"><span class="wb-confirm-title">${escHtml(title)}</span>` + consequenceHtml + (message ? `<span class="wb-confirm-message">${escHtml(message)}</span>` : "") + `</div><div class="${footerClass}">` + secondaryHtml + `<div class="wb-confirm-footer-actions"><button type="button" class="wb-btn wb-btn-secondary" data-wb-confirm-cancel>${escHtml(cancelLabel)}</button><button type="button" class="${confirmClass}" data-wb-confirm-ok>${escHtml(confirmLabel)}</button></div></div></div></div>`;
}
function closeActiveConfirm(result) {
  if (!activeConfirm) return;
  const { backdrop, onKeydown, resolve } = activeConfirm;
  document.removeEventListener("keydown", onKeydown);
  if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  activeConfirm = null;
  if (typeof resolve === "function") resolve(result);
}
function openModalConfirm(opts) {
  return new Promise((resolve) => {
    if (activeConfirm) closeActiveConfirm("cancel");
    const wrap = document.createElement("div");
    wrap.innerHTML = buildConfirmModalHtml(opts);
    const backdrop = wrap.firstElementChild;
    document.body.appendChild(backdrop);
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
    raf(() => backdrop.classList.add("wb-scrim--open"));
    const onKeydown = (ev) => {
      if (ev.key === "Escape") {
        if (typeof opts.onCancel === "function") opts.onCancel();
        closeActiveConfirm("cancel");
      }
    };
    document.addEventListener("keydown", onKeydown);
    backdrop.addEventListener("click", (ev) => {
      if (ev.target === backdrop) {
        if (typeof opts.onCancel === "function") opts.onCancel();
        closeActiveConfirm("cancel");
      }
    });
    backdrop.querySelector("[data-wb-confirm-cancel]").addEventListener("click", () => {
      if (typeof opts.onCancel === "function") opts.onCancel();
      closeActiveConfirm("cancel");
    });
    backdrop.querySelector("[data-wb-confirm-ok]").addEventListener("click", () => {
      if (typeof opts.onConfirm === "function") opts.onConfirm();
      closeActiveConfirm("confirm");
    });
    const secondaryBtn = backdrop.querySelector("[data-wb-confirm-secondary]");
    if (secondaryBtn && typeof opts.onSecondary === "function") {
      secondaryBtn.addEventListener("click", () => opts.onSecondary());
    }
    activeConfirm = { backdrop, onKeydown, resolve };
  });
}
function openConfirm(opts = {}) {
  const { weight } = opts;
  if (weight === "reversible") {
    showUndoToast({ message: opts.message || "", undoLabel: opts.undoLabel, onUndo: opts.onUndo });
    return Promise.resolve("reversible");
  }
  if (weight === "destructive" || weight === "consequence") {
    return openModalConfirm(opts);
  }
  throw new Error(`wb-confirm: unknown weight "${weight}"`);
}

export {
  showUndoToast,
  openConfirm
};
//# sourceMappingURL=/js/chunks/chunk-EASTAY6S.js.map
