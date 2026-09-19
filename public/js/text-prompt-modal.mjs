/**
 * Small dynamically-built text-input modal — a working replacement for
 * `window.prompt()`, which Electron's BrowserWindow never renders a UI for
 * (only `alert`/`confirm` show a native dialog; `prompt()` resolves
 * immediately with no visible input). Uses the app's existing
 * `.modal-backdrop`/`.modal` CSS (base.css).
 */
import { escHtml, escAttr } from './dom-escape.mjs';

/**
 * @param {{title?: string, message?: string, placeholder?: string, defaultValue?: string, confirmLabel?: string}} [opts]
 * @returns {Promise<string|null>} typed value, or null if cancelled/dismissed
 */
export function askTextPrompt(opts) {
  var o = opts || {};
  return new Promise(function (resolve) {
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      (o.title ? '<h3>' + escHtml(o.title) + '</h3>' : '') +
      (o.message ? '<p>' + escHtml(o.message) + '</p>' : '') +
      '<input type="text" class="ea-input" data-text-prompt-input style="width:100%;margin-bottom:12px" ' +
      'value="' + escAttr(o.defaultValue || '') + '" placeholder="' + escAttr(o.placeholder || '') + '">' +
      '<div style="display:flex;justify-content:flex-end;gap:8px">' +
      '<button type="button" class="ea-btn" data-text-prompt-cancel>Cancelar</button>' +
      '<button type="button" class="ea-btn ea-btn--primary" data-text-prompt-confirm>' +
      escHtml(o.confirmLabel || 'Aceptar') +
      '</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(backdrop);

    var input = backdrop.querySelector('[data-text-prompt-input]');
    var settled = false;
    function finish(value) {
      if (settled) return;
      settled = true;
      backdrop.remove();
      resolve(value);
    }
    backdrop.querySelector('[data-text-prompt-confirm]').addEventListener('click', function () {
      finish(input.value);
    });
    backdrop.querySelector('[data-text-prompt-cancel]').addEventListener('click', function () {
      finish(null);
    });
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) finish(null);
    });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') finish(input.value);
      if (ev.key === 'Escape') finish(null);
    });
    input.focus();
    input.select();
  });
}
