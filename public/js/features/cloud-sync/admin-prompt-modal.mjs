import { esc } from '../../dom-escape.mjs';

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
    const host = document.createElement('div');
    host.innerHTML = adminPromptModalMarkup({
      title,
      message,
      placeholder,
      confirmLabel,
      inputType,
    });
    const overlay = host.firstElementChild;
    if (!(overlay instanceof HTMLElement)) {
      resolve(null);
      return;
    }
    document.body.appendChild(overlay);
    wireAdminPromptModal(overlay, resolve);
  });
}

/**
 * @param {{
 *   title: string,
 *   message: string,
 *   placeholder: string,
 *   confirmLabel: string,
 *   inputType: string,
 * }} opts
 */
export function adminPromptModalMarkup(opts) {
  return (
    '<div class="lab-conflict-backdrop" data-admin-prompt-modal>' +
    '<div class="lab-conflict-modal cloud-sync-admin-prompt-modal" role="dialog" aria-modal="true">' +
    '<h3 style="margin:0 0 10px;">' +
    esc(opts.title) +
    '</h3>' +
    '<p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);white-space:pre-wrap;">' +
    esc(opts.message) +
    '</p>' +
    '<input type="' +
    esc(opts.inputType) +
    '" class="profile-input" data-admin-prompt-input autocomplete="off" spellcheck="false" ' +
    'placeholder="' +
    esc(opts.placeholder) +
    '" style="width:100%;margin:0 0 16px;" />' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-prompt-cancel>Cancelar</button>' +
    '<button type="button" class="cloud-sync-btn" data-admin-prompt-ok>' +
    esc(opts.confirmLabel) +
    '</button></div></div></div>'
  );
}

/**
 * @param {HTMLElement} overlay
 * @param {(value: string | null) => void} resolve
 */
function wireAdminPromptModal(overlay, resolve) {
  const input = overlay.querySelector('[data-admin-prompt-input]');
  const okBtn = overlay.querySelector('[data-admin-prompt-ok]');
  const cancelBtn = overlay.querySelector('[data-admin-prompt-cancel]');

  function finish(value) {
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
