/**
 * Registro form pieces, Preact: the body of the extra-source / event rows of the balance table and the
 * hemodialysis reminder at the top of the form. The callers in estado-actual-panel-registro.mjs create
 * the row element, render the body into it, then set values and wire events on the real DOM.
 * Loaded lazily (dynamic import) so Preact stays off the boot path.
 */
import { render } from 'preact';

/** @param {{ options: Array<{ value: string, label: string }> }} props */
export function IoExtraRowBody({ options }) {
  return (
    <>
      <div class="ea-io-row-name">
        <select data-ea-io-extra-kind="" aria-label="Fuente">
          <option value="">Tipo de fuente…</option>
          {options.map((o) => <option value={o.value}>{o.label}</option>)}
        </select>
        <input type="text" class="ea-input" data-ea-io-extra-custom="" hidden placeholder="Nombre" autocomplete="off" />
        <button type="button" class="ea-io-remove" data-ea-io-extra-remove="" title="Quitar" aria-label="Quitar fuente">×</button>
      </div>
      <input type="text" class="ea-input" data-ea-io-extra-value="" inputmode="decimal" autocomplete="off" placeholder="cc" aria-label="Volumen" />
    </>
  );
}

/** @param {{ kinds: Array<{ value: string, label: string }>, turnos: string[] }} props */
export function IoEventRowBody({ kinds, turnos }) {
  return (
    <>
      <div class="ea-io-row-name">
        <select data-ea-io-event-kind="" aria-label="Evento">
          <option value="">Evento…</option>
          {kinds.map((k) => <option value={k.value}>{k.label}</option>)}
        </select>
        <button type="button" class="ea-io-remove" data-ea-io-event-remove="" title="Quitar" aria-label="Quitar evento">×</button>
      </div>
      <select class="ea-input" data-ea-io-event-turno="" aria-label="Turno">
        {turnos.map((t) => <option value={t}>{t.toLocaleUpperCase('es')}</option>)}
      </select>
      <input type="text" class="ea-input" data-ea-io-event-detail="" autocomplete="off" aria-label="Detalle" />
      <input type="text" class="ea-input" data-ea-io-event-ml="" inputmode="decimal" autocomplete="off" aria-label="Volumen" />
    </>
  );
}

/** @param {{ reminderId: string }} props */
export function RegistroLead({ reminderId }) {
  return (
    <div class="ea-registro-lead">
      <div class="ea-registro-hint ea-registro-hint--hemodialisis">
        <span>Hay hemodiálisis indicada. Registra el ultrafiltrado en egresos.</span>
        <button type="button" class="ea-btn ea-btn--ghost" data-ea-hemodialisis-no-fue={reminderId}>No se realizó hoy</button>
      </div>
    </div>
  );
}

/** Fresh, caller-owned row: Preact owns its children until the row is removed. */
export function renderIoExtraRowBody(row, options) {
  render(<IoExtraRowBody options={options} />, row);
}
export function renderIoEventRowBody(row, kinds, turnos) {
  render(<IoEventRowBody kinds={kinds} turnos={turnos} />, row);
}

/** Puts the reminder first in `form` (call after removing the previous one). */
export function insertRegistroLead(form, reminderId) {
  const holder = document.createElement('div');
  render(<RegistroLead reminderId={reminderId} />, holder);
  form.prepend(holder.firstElementChild);
}
