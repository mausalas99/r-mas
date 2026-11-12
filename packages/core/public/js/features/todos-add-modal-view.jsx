/**
 * Body of the «Nuevo pendiente» modal (Preact). Same DOM the string builder in todos-add-modal.mjs
 * made; the prio chip and due composer are mounted by the caller into the two slots.
 */
import { render } from 'preact';

export function TodoAddModalBody({ patientContext = '' }) {
  return (
    <>
      <div class="wb-confirm-body wb-todo-add-body">
        <div class="wb-todo-add-header">
          <span class="wb-confirm-title">Nuevo pendiente</span>
          {patientContext ? <span class="wb-todo-add-context">{patientContext}</span> : null}
        </div>
        <div class="wb-todo-add-field">
          <span class="wb-todo-add-label">Qué hay que hacer</span>
          <textarea class="wb-todo-add-text" rows={2} placeholder="Describe el pendiente"></textarea>
        </div>
        <div class="wb-todo-add-row">
          <div class="wb-todo-add-field">
            <span class="wb-todo-add-label">Prioridad</span>
            <div class="wb-todo-add-prio-slot" data-wb-todo-add-prio-slot=""></div>
          </div>
          <div class="wb-todo-add-field wb-todo-add-field--due">
            <span class="wb-todo-add-label">Vence</span>
            <div class="wb-todo-add-due-slot" data-wb-todo-add-due-slot=""></div>
          </div>
        </div>
      </div>
      <div class="wb-confirm-footer">
        <div class="wb-confirm-footer-actions">
          <button type="button" class="wb-btn wb-btn-secondary" data-wb-todo-add-cancel="">Cancelar</button>
          <button type="button" class="wb-btn wb-btn-primary" data-wb-todo-add-ok="">Agregar pendiente</button>
        </div>
      </div>
    </>
  );
}

/** @param {HTMLElement} host @param {{ patientContext?: string }} opts */
export function drawTodoAddModal(host, opts) {
  render(<TodoAddModalBody patientContext={(opts && opts.patientContext) || ''} />, host);
}
