/**
 * Two small confirm dialogs of the patient modal: «Paciente similar encontrado» and
 * «Falta el número de expediente». Preact: same DOM, ids, classes and inline styles the string
 * builders in patients-modal-dialogs.mjs made. That module owns the backdrop, the data rules and
 * the callbacks. Each draw unmounts first, so the DOM is rebuilt from scratch like the old swap.
 */
import { render } from 'preact';

const CANCEL_STYLE = 'background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:#1f2937;';
const OK_STYLE = 'background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;';

export function DuplicateWarning({ existing, fecha, onCancel, onConfirm }) {
  return (
    <div class="lab-conflict-modal">
      <h3>Paciente similar encontrado</h3>
      <p>
        <strong>{existing.nombre}</strong>
        <br />
        {'Cto. ' + (existing.cuarto || '—') + ' Cama ' + (existing.cama || '—')}
        {existing.registro ? <><br />{'Registro: ' + existing.registro}</> : null}
        {fecha ? <><br />{'Ingreso: ' + fecha}</> : null}
      </p>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button id="dup-confirm-cancel-btn" style={CANCEL_STYLE} onClick={onCancel}>Cancelar</button>
        <button id="dup-confirm-btn" style={OK_STYLE} onClick={onConfirm}>Agregar de todas formas</button>
      </div>
    </div>
  );
}

export function ExpedienteAdvice({ advice, onCancel, onConfirm }) {
  return (
    <div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="exp-advice-title">
      <h3 id="exp-advice-title">{advice.title}</h3>
      <p>{advice.body}</p>
      <div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" id="exp-advice-cancel" onClick={onCancel}>{advice.cancelLabel}</button>
        <button type="button" class="wb-btn wb-btn-primary wb-btn-block" id="exp-advice-confirm" onClick={onConfirm}>{advice.confirmLabel}</button>
      </div>
    </div>
  );
}

export function drawDuplicateWarning(host, props) {
  render(null, host);
  host.textContent = '';
  render(<DuplicateWarning {...props} />, host);
}

export function drawExpedienteAdvice(host, props) {
  render(null, host);
  host.textContent = '';
  render(<ExpedienteAdvice {...props} />, host);
}
