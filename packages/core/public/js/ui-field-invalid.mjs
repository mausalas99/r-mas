/** Accessible field-level validation errors: aria-invalid + aria-describedby + focus. */

let uid = 0;

/**
 * Mark `field` invalid for assistive tech: sets aria-invalid, links a
 * visible error message right after it via aria-describedby, and moves
 * keyboard focus there.
 * @param {HTMLElement|null|undefined} field
 * @param {string} message
 */
export function markFieldInvalid(field, message) {
  if (!field) return;
  if (!field.id) field.id = 'field-invalid-' + ++uid;
  const errId = field.id + '-error';
  let errEl = document.getElementById(errId);
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.id = errId;
    errEl.className = 'field-invalid-msg';
    errEl.style.cssText = 'display:block;color:#c0392b;font-size:12px;margin-top:4px;';
    field.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = message;
  errEl.hidden = false;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', errId);
  field.focus();
}

/**
 * Clear a field previously marked by markFieldInvalid.
 * @param {HTMLElement|null|undefined} field
 */
export function clearFieldInvalid(field) {
  if (!field) return;
  field.removeAttribute('aria-invalid');
  const errId = field.getAttribute('aria-describedby');
  field.removeAttribute('aria-describedby');
  if (errId) document.getElementById(errId)?.remove();
}
