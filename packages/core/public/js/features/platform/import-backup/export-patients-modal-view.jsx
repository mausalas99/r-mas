/** «Exportar pacientes» dialog. Preact: same DOM, ids and inline styles the string builder wrote. */
import { render } from 'preact';

const GHOST = 'background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);';

/** items: [{ id, label, checked }] */
export function ExportPatientsModal({ items }) {
  return (
    <div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">
      <h3 style="margin:0 0 8px;">Exportar pacientes</h3>
      <p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca los pacientes que quieres incluir. El archivo JSON se puede importar con <strong>Importar paciente…</strong> o <strong>Importar rango…</strong>.</p>
      <div style="overflow-y:auto;flex:0 1 auto;max-height:42vh;padding-right:4px;">
        <ul style="margin:0;padding-left:0;list-style:none;font-size:13px;">
          {items.length
            ? items.map((it) => (
              <li style="margin:6px 0;">
                <label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;">
                  <input type="checkbox" class="export-patients-cb" data-patient-id={it.id} checked={it.checked} style="margin-top:3px;flex-shrink:0;" />
                  <span>{it.label}</span>
                </label>
              </li>
            ))
            : <li style="font-size:13px;color:var(--text-muted);">No hay pacientes exportables en el censo visible.</li>}
        </ul>
      </div>
      <p id="export-patients-count" style="font-size:12px;color:var(--text-muted);margin:10px 0 6px;">Ningún paciente seleccionado</p>
      <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;">
        <button type="button" id="export-patients-none" style={GHOST}>Quitar todos</button>
        <button type="button" id="export-patients-all" style={GHOST}>Seleccionar todos</button>
        <button type="button" id="export-patients-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button>
        <button type="button" id="export-patients-ok" disabled aria-disabled="true" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Exportar JSON…</button>
      </div>
    </div>
  );
}

export function drawExportPatientsModal(backdrop, props) {
  render(null, backdrop);
  backdrop.textContent = '';
  render(<ExportPatientsModal {...props} />, backdrop);
}
