import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/cloud-sync/stacked-overlay.mjs
var STACKED_BACKDROP_CLASS = "lab-conflict-backdrop lab-conflict-backdrop--stacked";

// public/js/features/cloud-sync/recovery-modal.mjs
var DEFAULT_TITLE = "C\xF3digo de recuperaci\xF3n";
var BODY_COPY = "Guarda este c\xF3digo de recuperaci\xF3n. No lo volveremos a mostrar.";
var CHECKBOX_LABEL = "Lo guard\xE9 en un lugar seguro";
var CONTINUE_LABEL = "Continuar";
var COPY_LABEL = "Copiar";
function recoveryModalMarkup(code, title) {
  const heading = esc(title || DEFAULT_TITLE);
  const safeCode = esc(code);
  return '<div class="' + STACKED_BACKDROP_CLASS + '" data-recovery-code-modal><div class="lab-conflict-modal cloud-sync-recovery-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true"><h3 style="margin:0 0 10px;">' + heading + '</h3><p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);">' + esc(BODY_COPY) + '</p><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px;"><code data-recovery-code style="font-family:ui-monospace,monospace;font-size:15px;letter-spacing:0.04em;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);flex:1;min-width:0;word-break:break-all;">' + safeCode + '</code><button type="button" data-recovery-copy class="cloud-sync-btn cloud-sync-btn--ghost" style="flex-shrink:0;">' + COPY_LABEL + '</button></div><label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.4;cursor:pointer;margin:0 0 16px;"><input type="checkbox" data-recovery-confirm style="margin-top:3px;flex-shrink:0;" /><span>' + esc(CHECKBOX_LABEL) + '</span></label><div style="display:flex;justify-content:flex-end;"><button type="button" data-recovery-continue class="cloud-sync-btn" disabled>' + CONTINUE_LABEL + "</button></div></div></div>";
}
function copyRecoveryCode(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(function() {
    });
  }
  return Promise.resolve();
}
function wireRecoveryModal(overlay, code, resolve) {
  const copyBtn = overlay.querySelector("[data-recovery-copy]");
  if (copyBtn) {
    copyBtn.addEventListener("click", function() {
      copyRecoveryCode(code);
    });
  }
  const continueBtn = overlay.querySelector("[data-recovery-continue]");
  if (!continueBtn) {
    overlay.remove();
    resolve();
    return;
  }
  const confirmBox = overlay.querySelector("[data-recovery-confirm]");
  if (confirmBox) {
    continueBtn.disabled = true;
    confirmBox.addEventListener("change", function() {
      continueBtn.disabled = !/** @type {HTMLInputElement} */
      confirmBox.checked;
    });
  }
  continueBtn.addEventListener("click", function() {
    const checked = confirmBox && /** @type {HTMLInputElement} */
    confirmBox.checked;
    if (!checked) {
      if (confirmBox && typeof confirmBox.focus === "function") confirmBox.focus();
      return;
    }
    overlay.remove();
    resolve();
  });
}
function showRecoveryCodeModal({ code, title }) {
  return new Promise(function(resolve) {
    const host = document.createElement("div");
    host.innerHTML = recoveryModalMarkup(code, title);
    const overlay = host.firstElementChild;
    if (!overlay) {
      resolve();
      return;
    }
    document.body.appendChild(overlay);
    wireRecoveryModal(
      /** @type {HTMLElement} */
      overlay,
      code,
      resolve
    );
  });
}

export {
  STACKED_BACKDROP_CLASS,
  recoveryModalMarkup,
  showRecoveryCodeModal
};
//# sourceMappingURL=/js/chunks/chunk-YR5I2T5V.js.map
