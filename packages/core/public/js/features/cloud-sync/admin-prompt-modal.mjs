import { wireFocusTrap } from '../../modal-dismiss.mjs';

/**
 * Electron renderer often cannot use window.prompt (returns null immediately).
 * In-app text prompt for admin type-to-confirm / temporary password.
 *
 * @param {{
 *   title: string,
 *   message: string,
 *   placeholder?: string,
 *   confirmLabel?: string,
 *   inputType?: 'text' | 'password',
 * }} opts
 * @returns {Promise<string | null>} trimmed value, or null if cancelled
 */
export function showAdminPromptModal(opts) {
  const title = String(opts?.title || 'Confirmar');
  const message = String(opts?.message || '');
  const placeholder = String(opts?.placeholder || '');
  const confirmLabel = String(opts?.confirmLabel || 'Confirmar');
  const inputType = opts?.inputType === 'password' ? 'password' : 'text';

  return new Promise(function (resolve) {
    import('./cloud-sync-overlays-view.jsx').then(function ({ drawAdminPromptModal }) {
      const overlay = drawAdminPromptModal({ title, message, placeholder, confirmLabel, inputType });
      if (!overlay) {
        resolve(null);
        return;
      }
      document.body.appendChild(overlay);
      wireAdminPromptModal(overlay, resolve);
    }, function () {
      resolve(null);
    });
  });
}

/**
 * @param {HTMLElement} overlay
 * @param {(value: string | null) => void} resolve
 */
function wireAdminPromptModal(overlay, resolve) {
  const input = overlay.querySelector('[data-admin-prompt-input]');
  const okBtn = overlay.querySelector('[data-admin-prompt-ok]');
  const cancelBtn = overlay.querySelector('[data-admin-prompt-cancel]');

  // Registered trap: stops the Administración panel's focus trap from stealing focus back.
  const trap = wireFocusTrap(/** @type {HTMLElement} */ (overlay.firstElementChild || overlay));

  function finish(value) {
    trap.unwire();
    overlay.remove();
    resolve(value);
  }

  cancelBtn?.addEventListener('click', function () {
    finish(null);
  });
  okBtn?.addEventListener('click', function () {
    const raw = input instanceof HTMLInputElement ? input.value : '';
    finish(String(raw).trim());
  });
  overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay) finish(null);
  });
  if (input instanceof HTMLInputElement) {
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        finish(String(input.value || '').trim());
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(null);
      }
    });
    queueMicrotask(function () {
      input.focus();
    });
  }
}
