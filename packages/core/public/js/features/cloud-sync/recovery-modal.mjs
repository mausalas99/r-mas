import { wireFocusTrap, restoreFocus, focusFirstFocusable } from '../../modal-dismiss.mjs';

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
 * @param {{ unwire: () => void }} trap
 * @param {Element|null} previousFocus
 * @param {() => void} dispose unmounts the Preact overlay
 */
function wireRecoveryModal(overlay, code, resolve, trap, previousFocus, dispose) {
  function closeOverlay() {
    trap.unwire();
    dispose();
    overlay.remove();
    restoreFocus(previousFocus);
    resolve();
  }

  const copyBtn = overlay.querySelector('[data-recovery-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      copyRecoveryCode(code);
    });
  }

  const continueBtn = overlay.querySelector('[data-recovery-continue]');
  if (!continueBtn) {
    closeOverlay();
    return;
  }

  const confirmBox = overlay.querySelector('[data-recovery-confirm]');
  if (confirmBox) {
    /** @type {HTMLButtonElement} */ (continueBtn).disabled = true;
    confirmBox.addEventListener('change', function () {
      /** @type {HTMLButtonElement} */ (continueBtn).disabled =
        !/** @type {HTMLInputElement} */ (confirmBox).checked;
    });
  }

  continueBtn.addEventListener('click', function () {
    const checked = confirmBox && /** @type {HTMLInputElement} */ (confirmBox).checked;
    if (!checked) {
      if (confirmBox && typeof confirmBox.focus === 'function') confirmBox.focus();
      return;
    }
    closeOverlay();
  });
}

/**
 * One-shot recovery code reveal. Resolves when the user clicks Continuar.
 * @param {{ code: string, title?: string }} opts
 * @returns {Promise<void>}
 */
export function showRecoveryCodeModal({ code, title }) {
  return import('./recovery-modal-view.jsx').then(function ({ drawRecoveryModal, eraseRecoveryModal }) {
    return new Promise(function (resolve) {
      const host = document.createElement('div');
      drawRecoveryModal(host, code, title);
      const overlay = host.firstElementChild;
      if (!overlay) {
        resolve();
        return;
      }
      const previousFocus = document.activeElement;
      document.body.appendChild(overlay);
      const panel = overlay.querySelector('[role="dialog"]') || overlay;
      const trap = wireFocusTrap(panel);
      focusFirstFocusable(panel);
      wireRecoveryModal(/** @type {HTMLElement} */ (overlay), code, resolve, trap, previousFocus, function () {
        eraseRecoveryModal(host);
      });
    });
  });
}
