import { esc } from '../../dom-escape.mjs';

const DEFAULT_TITLE = 'Código de recuperación';
const BODY_COPY = 'Guardá este código de recuperación. No lo volveremos a mostrar.';
const CHECKBOX_LABEL = 'Lo guardé en un lugar seguro';
const CONTINUE_LABEL = 'Continuar';
const COPY_LABEL = 'Copiar';
const UNCHECKED_CONFIRM =
  '¿Continuar sin confirmar que guardaste el código? No lo volveremos a mostrar.';

/**
 * Pure HTML for the recovery reveal overlay (testing + innerHTML mount).
 * @param {string} code
 * @param {string} [title]
 * @returns {string}
 */
export function recoveryModalMarkup(code, title) {
  const heading = esc(title || DEFAULT_TITLE);
  const safeCode = esc(code);
  return (
    '<div class="lab-conflict-backdrop" data-recovery-code-modal>' +
    '<div class="lab-conflict-modal cloud-sync-recovery-modal" role="dialog" aria-modal="true">' +
    '<h3 style="margin:0 0 10px;">' +
    heading +
    '</h3>' +
    '<p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);">' +
    esc(BODY_COPY) +
    '</p>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px;">' +
    '<code data-recovery-code style="font-family:ui-monospace,monospace;font-size:15px;letter-spacing:0.04em;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);flex:1;min-width:0;word-break:break-all;">' +
    safeCode +
    '</code>' +
    '<button type="button" data-recovery-copy class="cloud-sync-btn cloud-sync-btn--ghost" style="flex-shrink:0;">' +
    COPY_LABEL +
    '</button></div>' +
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.4;cursor:pointer;margin:0 0 16px;">' +
    '<input type="checkbox" data-recovery-confirm style="margin-top:3px;flex-shrink:0;" />' +
    '<span>' +
    esc(CHECKBOX_LABEL) +
    '</span></label>' +
    '<div style="display:flex;justify-content:flex-end;">' +
    '<button type="button" data-recovery-continue class="cloud-sync-btn">' +
    CONTINUE_LABEL +
    '</button></div></div></div>'
  );
}

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
function copyRecoveryCode(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(function () {});
  }
  return Promise.resolve();
}

/**
 * @param {HTMLElement} overlay
 * @param {string} code
 * @param {() => void} resolve
 */
function wireRecoveryModal(overlay, code, resolve) {
  let warnedUnchecked = false;

  const copyBtn = overlay.querySelector('[data-recovery-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      copyRecoveryCode(code);
    });
  }

  const continueBtn = overlay.querySelector('[data-recovery-continue]');
  if (!continueBtn) {
    overlay.remove();
    resolve();
    return;
  }

  continueBtn.addEventListener('click', function () {
    const confirmBox = overlay.querySelector('[data-recovery-confirm]');
    const checked = confirmBox && /** @type {HTMLInputElement} */ (confirmBox).checked;
    if (!checked && !warnedUnchecked) {
      warnedUnchecked = true;
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        window.confirm(UNCHECKED_CONFIRM);
      }
    }
    overlay.remove();
    resolve();
  });
}

/**
 * One-shot recovery code reveal. Resolves when the user clicks Continuar.
 * @param {{ code: string, title?: string }} opts
 * @returns {Promise<void>}
 */
export function showRecoveryCodeModal({ code, title }) {
  return new Promise(function (resolve) {
    const host = document.createElement('div');
    host.innerHTML = recoveryModalMarkup(code, title);
    const overlay = host.firstElementChild;
    if (!overlay) {
      resolve();
      return;
    }
    document.body.appendChild(overlay);
    wireRecoveryModal(/** @type {HTMLElement} */ (overlay), code, resolve);
  });
}
