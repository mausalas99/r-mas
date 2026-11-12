/**
 * "Los estudios ya tienen datos" conflict modal. Preact: same DOM, ids and classes the string
 * builder in lab-panel-workbench.mjs made. Drawn once; the workbench wires the buttons by id.
 */
import { render } from 'preact';

export function LabConflictModal({ existingDate }) {
  return (
    <div class="lab-conflict-modal">
      <h3>Los estudios ya tienen datos</h3>
      <p>El bloque reciente ya tiene labs del <strong>{existingDate}</strong>. ¿Qué hago con los nuevos labs?</p>
      <div class="lab-conflict-actions">
        <button class="wb-btn wb-btn-primary wb-btn-block" id="btn-conflict-move">📋 Mover anterior + agregar reciente<br /><span class="conflict-hint">Los labs actuales pasan al bloque anterior y los nuevos quedan como recientes</span></button>
        <button class="wb-btn wb-btn-secondary wb-btn-block" id="btn-conflict-replace">🔄 Reemplazar fecha reciente<br /><span class="conflict-hint">Los labs actuales se borran, se escriben los nuevos</span></button>
        <button class="wb-btn wb-btn-ghost" id="btn-conflict-cancel">Cancelar</button>
      </div>
    </div>
  );
}

export function drawLabConflictModal(backdrop, existingDate) {
  render(<LabConflictModal existingDate={existingDate} />, backdrop);
}
