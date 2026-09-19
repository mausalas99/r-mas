/**
 * "Nuevo pendiente" modal — design handoff screen 7b, "tres campos y listo".
 * Kit-styled (reuses the workbench confirm modal shell classes) 3-field
 * form: qué hay que hacer (texto), prioridad, vence. Reuses the existing
 * priority chip and due-date composer instead of reinventing them.
 */
import { escHtml } from '../dom-escape.mjs';
import { createTodoPrioChip } from './todos-priority-ui.mjs';
import { createTodoDueAddSection } from './todos-due-composer.mjs';
import { addTodoWithFields } from './todos-mutations.mjs';

/** @type {{ backdrop: HTMLElement, onKeydown: (ev: KeyboardEvent) => void }|null} */
let activeModal = null;

function closeActiveTodoAddModal() {
  if (!activeModal) return;
  const { backdrop, onKeydown } = activeModal;
  document.removeEventListener('keydown', onKeydown);
  if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  activeModal = null;
}

/** Force-close the modal (e.g. on route change). */
export function closeTodoAddModal() {
  closeActiveTodoAddModal();
}

/**
 * @param {{ patientContext?: string }} opts
 * @returns {string}
 */
export function buildTodoAddModalHtml(opts = {}) {
  const { patientContext = '' } = opts;
  return (
    '<div class="wb-confirm-body wb-todo-add-body">' +
    '<div class="wb-todo-add-header">' +
    '<span class="wb-confirm-title">Nuevo pendiente</span>' +
    (patientContext ? `<span class="wb-todo-add-context">${escHtml(patientContext)}</span>` : '') +
    '</div>' +
    '<div class="wb-todo-add-field">' +
    '<span class="wb-todo-add-label">Qué hay que hacer</span>' +
    '<textarea class="wb-todo-add-text" rows="2" placeholder="Describe el pendiente"></textarea>' +
    '</div>' +
    '<div class="wb-todo-add-row">' +
    '<div class="wb-todo-add-field">' +
    '<span class="wb-todo-add-label">Prioridad</span>' +
    '<div class="wb-todo-add-prio-slot" data-wb-todo-add-prio-slot></div>' +
    '</div>' +
    '<div class="wb-todo-add-field wb-todo-add-field--due">' +
    '<span class="wb-todo-add-label">Vence</span>' +
    '<div class="wb-todo-add-due-slot" data-wb-todo-add-due-slot></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="wb-confirm-footer">' +
    '<div class="wb-confirm-footer-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-wb-todo-add-cancel>Cancelar</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-wb-todo-add-ok>Agregar pendiente</button>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {{
 *   patientContext?: string,
 *   onAdded?: () => void,
 *   onClose?: () => void,
 * }} [opts]
 * @returns {HTMLElement|undefined}
 */
export function openTodoAddModal(opts = {}) {
  if (typeof document === 'undefined') return undefined;
  closeActiveTodoAddModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'wb-scrim';
  backdrop.setAttribute('data-wb-todo-add-backdrop', '');

  const modal = document.createElement('div');
  modal.className = 'wb-confirm-modal wb-todo-add-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = buildTodoAddModalHtml(opts);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
  raf(() => backdrop.classList.add('wb-scrim--open'));

  const textEl = modal.querySelector('.wb-todo-add-text');
  let priority = 'media';
  const prioChip = createTodoPrioChip('media', (next) => {
    priority = next;
  });
  modal.querySelector('[data-wb-todo-add-prio-slot]').appendChild(prioChip);

  const dueComposer = createTodoDueAddSection('todo-add-modal-');
  modal.querySelector('[data-wb-todo-add-due-slot]').appendChild(dueComposer.element);

  function close() {
    closeActiveTodoAddModal();
    if (typeof opts.onClose === 'function') opts.onClose();
  }

  function submit() {
    const text = String(textEl.value || '').trim();
    if (!text) {
      textEl.focus();
      return;
    }
    const added = addTodoWithFields({ text, priority, dueFields: dueComposer.getFields() });
    closeActiveTodoAddModal();
    if (added && typeof opts.onAdded === 'function') opts.onAdded();
  }

  modal.querySelector('[data-wb-todo-add-ok]').addEventListener('click', submit);
  modal.querySelector('[data-wb-todo-add-cancel]').addEventListener('click', close);
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) close();
  });

  const onKeydown = (ev) => {
    if (ev.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);

  activeModal = { backdrop, onKeydown };
  if (typeof textEl.focus === 'function') textEl.focus();
  return backdrop;
}
