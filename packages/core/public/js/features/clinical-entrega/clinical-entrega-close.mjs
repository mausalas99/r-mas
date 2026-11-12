// Entrega modal close. A leaf on purpose: the boot graph reaches it (Esc / backdrop registry),
// while the modal and its Preact view load on first open.
import { closeModalAnimated } from '../../ui-motion.mjs';

/** @type {(() => void)|null} set by clinical-entrega-modal.mjs once the modal has been opened */
let onClosed = null;

export function setEntregaOnClosed(fn) {
  onClosed = fn;
}

export function closeEntregaModal() {
  document.body.classList.remove('entrega-modal-open');
  const bd = document.getElementById('entrega-modal-backdrop');
  if (!bd) return;
  closeModalAnimated(bd, () => onClosed?.());
}
