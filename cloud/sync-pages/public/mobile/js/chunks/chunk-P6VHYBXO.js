import {
  setEaFormOpenPatientId
} from "/mobile/js/chunks/chunk-HVYKQKG5.js";
import {
  formatEstadoActualParsePreview,
  parseEstadoActualPaste
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";

// public/js/features/estado-actual-paste-modal.mjs
var rt = {
  showToast() {
  },
  applyParsed() {
  }
};
var SAMPLE_TEXT = "T\xB0: 38.7 \xB0C\nFC: 113 LPM\nFR: 19 RPM\nTA: 140/60 MMHG\nDXT: 198, 174, 101, 252 MG/DL\nSAT: 97% AL AIRE AMBIENTE\nI: 2,815 CC\nE: NO CUANTIFICADA\nB: NC\nEVAC: NO REPORTADAS";
function registerEstadoActualPasteModalRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function getTextarea() {
  return (
    /** @type {HTMLTextAreaElement | null} */
    document.getElementById("ea-paste-input")
  );
}
function getPreviewEl() {
  return document.getElementById("ea-paste-preview");
}
function refreshPreview() {
  var ta = getTextarea();
  var preview = getPreviewEl();
  if (!preview) return;
  var parsed = parseEstadoActualPaste(ta ? ta.value : "");
  preview.textContent = formatEstadoActualParsePreview(parsed);
  preview.classList.toggle("ea-paste-preview--error", !parsed.ok);
}
function ensureRegistroModalOpen() {
  var reg = document.getElementById("ea-registro-backdrop");
  if (reg && reg.classList.contains("open")) return;
  if (typeof window.openEstadoActualRegistroModal === "function") {
    window.openEstadoActualRegistroModal();
  }
}
function openEstadoActualPasteModal(opts) {
  opts = opts || {};
  if (!opts.skipRegistro) ensureRegistroModalOpen();
  var backdrop = document.getElementById("ea-paste-backdrop");
  var ta = getTextarea();
  if (!backdrop || !ta) {
    rt.showToast("Pegar monitoreo no disponible", "error");
    return;
  }
  ta.value = opts.prefillSample ? SAMPLE_TEXT : "";
  refreshPreview();
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  ta.focus();
}
function closeEstadoActualPasteModal() {
  var backdrop = document.getElementById("ea-paste-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
}
function confirmEstadoActualPaste() {
  var ta = getTextarea();
  var parsed = parseEstadoActualPaste(ta ? ta.value : "");
  if (!parsed.ok) {
    rt.showToast(parsed.error || "No se pudo interpretar el texto", "error");
    return;
  }
  closeEstadoActualPasteModal();
  if (typeof rt.applyParsed === "function") {
    rt.applyParsed(parsed, { fromNestedPaste: true });
    rt.showToast("Datos aplicados \u2014 revisa y registra", "success");
  }
}
function wireEstadoActualPasteModal() {
  var ta = getTextarea();
  if (ta && !ta.dataset.eaPasteWired) {
    ta.dataset.eaPasteWired = "1";
    ta.addEventListener("input", refreshPreview);
    ta.placeholder = SAMPLE_TEXT;
  }
}
var windowHandlers = {
  openEstadoActualPasteModal,
  closeEstadoActualPasteModal,
  confirmEstadoActualPaste
};

// public/js/features/estado-actual-registro-modal.mjs
var rt2 = {
  ensureForm() {
  },
  resetForm() {
  },
  showToast() {
  }
};
var dismissWired = false;
function registerEstadoActualRegistroModalRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt2, ctx);
}
function getBackdrop() {
  return document.getElementById("ea-registro-backdrop");
}
function getPasteBackdrop() {
  return document.getElementById("ea-paste-backdrop");
}
function handleEaModalEscape(ev) {
  if (ev.key !== "Escape" && ev.key !== "Esc") return;
  var pasteBd = getPasteBackdrop();
  if (pasteBd && pasteBd.classList.contains("open")) {
    closeEstadoActualPasteModal();
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }
  var reg = getBackdrop();
  if (reg && reg.classList.contains("open")) {
    closeEstadoActualRegistroModal();
    ev.preventDefault();
    ev.stopPropagation();
  }
}
function wireEaModalDismiss() {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener("keydown", handleEaModalEscape, true);
  var reg = getBackdrop();
  var pasteBd = getPasteBackdrop();
  if (reg) {
    reg.addEventListener("click", function(ev) {
      if (!reg.classList.contains("open")) return;
      if (ev.target !== reg) return;
      closeEstadoActualRegistroModal();
    });
  }
  if (pasteBd) {
    pasteBd.addEventListener("click", function(ev) {
      if (!pasteBd.classList.contains("open")) return;
      var panel = pasteBd.querySelector(".ea-paste-modal");
      if (panel && panel.contains(
        /** @type {Node} */
        ev.target
      )) return;
      closeEstadoActualPasteModal();
    });
  }
}
function openEstadoActualRegistroModal(opts) {
  var backdrop = getBackdrop();
  if (!backdrop) {
    rt2.showToast("Formulario de registro no disponible", "error");
    return;
  }
  rt2.ensureForm();
  if (!opts || !opts.preserveForm) rt2.resetForm();
  else if (typeof rt2.syncGluMode === "function") rt2.syncGluMode();
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("ea-registro-modal-open");
  var first = backdrop.querySelector('[data-ea-vital="tas"], [data-ea-vital="temp"]');
  if (first && "focus" in first) first.focus();
}
function closeEstadoActualRegistroModal() {
  closeEstadoActualPasteModal();
  setEaFormOpenPatientId(null);
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("ea-registro-modal-open");
}
var windowHandlers2 = {
  openEstadoActualRegistroModal,
  closeEstadoActualRegistroModal
};

export {
  registerEstadoActualPasteModalRuntime,
  wireEstadoActualPasteModal,
  windowHandlers,
  registerEstadoActualRegistroModalRuntime,
  wireEaModalDismiss,
  openEstadoActualRegistroModal,
  closeEstadoActualRegistroModal,
  windowHandlers2
};
//# sourceMappingURL=/js/chunks/chunk-P6VHYBXO.js.map
