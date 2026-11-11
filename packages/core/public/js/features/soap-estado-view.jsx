/**
 * The «¿Reemplazar evolución?» confirm dialog of the SOAP template. Preact: same DOM, ids, classes
 * and inline styles the innerHTML string in soap-estado.mjs made. That module owns the backdrop,
 * the "evolución already has text" rule and what each button does. Each draw unmounts first, so the
 * DOM is rebuilt from scratch like the old swap.
 */
import { render } from 'preact';

const CANCEL_STYLE = 'background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;';
const OK_STYLE = 'background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;';

export function SoapReplaceConfirm({ onCancel, onReplace }) {
  return (
    <div class="lab-conflict-modal">
      <h3>¿Reemplazar evolución?</h3>
      <p>La evolución ya tiene contenido. ¿Reemplazarlo con la plantilla?</p>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button id="soap-confirm-cancel-btn" style={CANCEL_STYLE} onClick={onCancel}>Cancelar</button>
        <button id="soap-confirm-replace-btn" style={OK_STYLE} onClick={onReplace}>Reemplazar</button>
      </div>
    </div>
  );
}

export function drawSoapReplaceConfirm(host, props) {
  render(null, host);
  host.textContent = '';
  render(<SoapReplaceConfirm {...props} />, host);
}
