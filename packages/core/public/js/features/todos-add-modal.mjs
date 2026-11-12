/**
 * "Nuevo pendiente" modal — design handoff screen 7b, "tres campos y listo".
 * Kit-styled (reuses the workbench confirm modal shell classes) 3-field
 * form: qué hay que hacer (texto), prioridad, vence. Reuses the existing
 * priority chip and due-date composer instead of reinventing them.
 */
import { createTodoPrioChip } from './todos-priority-ui.mjs';
import { createTodoDueAddSection } from './todos-due-composer.mjs';
import { addTodoWithFields } from './todos-mutations.mjs';
import { wireFocusTrap, restoreFocus } from '../modal-dismiss.mjs';

/** @type {{ backdrop: HTMLElement, onKeydown: (ev: KeyboardEvent) => void, trap: { unwire: () => void }, previousFocus: Element|null }|null} */
let activeModal = null;

function closeActiveTodoAddModal() {
  if (!activeModal) return;
  const { backdrop, onKeydown, trap, previousFocus } = activeModal;
  document.removeEventListener('keydown', onKeydown);
  trap.unwire();
  if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  activeModal = null;
  restoreFocus(previousFocus);
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
  const previousFocus = document.activeElement;

  const backdrop = document.createElement('div');
  backdrop.className = 'wb-scrim';
  backdrop.setAttribute('data-wb-todo-add-backdrop', '');

  const modal = document.createElement('div');
  modal.className = 'wb-confirm-modal wb-todo-add-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
  raf(() => backdrop.classList.add('wb-scrim--open'));

  // The body is a Preact view loaded on first use (a static import would join the boot graph).
  const noop = () => {};
  activeModal = { backdrop, onKeydown: noop, trap: { unwire: noop }, previousFocus };
  import('./todos-add-modal-view.jsx').then(
    (m) => {
      if (!activeModal || activeModal.backdrop !== backdrop) return;
      m.drawTodoAddModal(modal, opts);
      wireTodoAddModal(backdrop, modal, opts);
    },
    () => closeActiveTodoAddModal()
  );
  return backdrop;
}

function wireTodoAddModal(backdrop, modal, opts) {
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
    // Escape inside the «Fecha límite» picker closes only the picker.
    if (ev.key === 'Escape' && modal.contains(document.activeElement)) close();
  };
  document.addEventListener('keydown', onKeydown);

  const trap = wireFocusTrap(modal);
  activeModal.onKeydown = onKeydown;
  activeModal.trap = trap;
  if (typeof textEl.focus === 'function') textEl.focus();
}
