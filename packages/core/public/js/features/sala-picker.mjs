/**
 * Sala <select> with the three non-IM rotation salas folded into one
 * «Otra rotación (fuera de MI)» option plus a pill row (UCI / PostQx /
 * Subespecialidad). The folded option's value is the picked canonical sala,
 * so `select.value` is always the value to submit.
 */
import { CLINICAL_SALA_VALUES, ROTACION_SALA_SLUGS } from '../../../lib/clinical-salas.mjs';
import { escapeHtml, escapeAttr } from '../dom-escape.mjs';

/** `select.value` while «Otra rotación» is chosen but no service is picked yet. */
export const ROTACION_PENDING = 'Rotación';
export const ROTACION_PENDING_MSG = 'Elige tu servicio.';

const PILL_LABELS = { 'UCI': 'UCI', 'PostQx': 'PostQx', 'Subespecialidad': 'Subespecialidad' };

const isRotacion = (sala) => Object.hasOwn(ROTACION_SALA_SLUGS, sala);
const hintText = (sala) => (isRotacion(sala) ? `Tu sala Nube será ${PILL_LABELS[sala]}.` : '');

/** @param {string} [prefilled] */
export function salaPickerOptionsHtml(prefilled = '') {
  const rot = isRotacion(prefilled);
  return (
    CLINICAL_SALA_VALUES.filter((s) => !isRotacion(s))
      .map((s) => `<option value="${escapeAttr(s)}" ${prefilled === s ? 'selected' : ''}>${escapeHtml(s)}</option>`)
      .join('') +
    `<option value="${escapeAttr(rot ? prefilled : ROTACION_PENDING)}" data-rotacion ${rot ? 'selected' : ''}>Otra rotación (fuera de MI)</option>`
  );
}

/** Pill row; place right after the select inside the same `.field-group`. @param {string} [prefilled] */
export function salaPickerRotacionHtml(prefilled = '') {
  const rot = isRotacion(prefilled);
  const pills = Object.entries(PILL_LABELS)
    .map(
      ([sala, label]) =>
        `<button type="button" class="settings-perfil-chip" data-rotacion-sala="${escapeAttr(sala)}" aria-pressed="${prefilled === sala}">${label}</button>`
    )
    .join('');
  return `<fieldset class="sala-rotacion-pick" data-rotacion-pick ${rot ? '' : 'hidden'}>
    <legend>¿En qué servicio? *</legend>
    <div class="settings-perfil-chips" role="group">${pills}</div>
    <p class="clinical-teams-hint" data-rotacion-hint aria-live="polite">${escapeHtml(hintText(prefilled))}</p>
  </fieldset>`;
}

/** @param {HTMLSelectElement} select */
function pickBox(select) {
  return select.parentElement?.querySelector('[data-rotacion-pick]') || null;
}

/** Show/hide pills and sync pressed state + hint to `select.value`. @param {HTMLSelectElement} select */
function syncSalaPicker(select) {
  const box = pickBox(select);
  if (!box) return;
  const opt = select.selectedOptions?.[0];
  box.hidden = !opt?.hasAttribute('data-rotacion');
  for (const b of box.querySelectorAll('[data-rotacion-sala]')) {
    b.setAttribute('aria-pressed', String(b.dataset.rotacionSala === select.value));
  }
  const hint = box.querySelector('[data-rotacion-hint]');
  if (hint) hint.textContent = hintText(select.value);
}

/** Set a sala value, including one of the three rotation salas. @param {HTMLSelectElement | null} select @param {string} value */
export function setSalaPickerValue(select, value) {
  if (!select) return;
  const opt = select.querySelector('option[data-rotacion]');
  if (opt && isRotacion(value)) opt.value = value;
  select.value = value;
  syncSalaPicker(select);
}

/** Wire the select + pill row once. Pill clicks fire `change` on the select. @param {HTMLSelectElement | null} select */
export function wireSalaPicker(select) {
  if (!select || select._rpcSalaPickerWired) return;
  select._rpcSalaPickerWired = true;
  select.addEventListener('change', () => syncSalaPicker(select));
  pickBox(select)?.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest?.('[data-rotacion-sala]');
    if (!btn) return;
    setSalaPickerValue(select, btn.dataset.rotacionSala || '');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  syncSalaPicker(select);
}
