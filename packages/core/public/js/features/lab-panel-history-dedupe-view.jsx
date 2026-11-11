/**
 * "Sincronizar historial de laboratorio" checklist modal body. Preact: same DOM, ids, classes and
 * data-* hooks the string builder in lab-panel-history-dedupe.mjs made. It is drawn once into the
 * backdrop and never redrawn: the checkboxes and the count text are then edited in place by the
 * handlers in lab-panel-history-dedupe.mjs, so nothing here may re-render.
 */
import { render } from 'preact';

const BTN_GHOST = 'background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);';
const HEAD = 'margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;';
const UL = 'margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;';

function Rows({ rows }) {
  return (
    <>
      {rows.map((r) => (
        <li style="margin:6px 0;">
          <label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;">
            <input type="checkbox" class="lab-dedupe-cb" data-pid={r.patientId} data-sid={r.id} checked style="margin-top:3px;flex-shrink:0;" />
            {' '}<span>{r.summary}</span>
          </label>
        </li>
      ))}
    </>
  );
}

function PatientBlock({ sec }) {
  const exact = sec.rows.filter((r) => r.kind === 'exact');
  const loose = sec.rows.filter((r) => r.kind === 'loose');
  return (
    <div class="lab-dedupe-patient-block">
      <h4 style="margin:12px 0 8px;font-size:14px;font-weight:700;color:var(--text);">
        {sec.nombre || '—'}
        {sec.registro ? <>{' '}<span style="opacity:0.85;font-weight:500">{'· ' + sec.registro}</span></> : null}
      </h4>
      {exact.length > 0 && (
        <>
          <p style={HEAD}>Duplicados exactos (misma fecha, hora y texto del reporte)</p>
          <ul style={UL}><Rows rows={exact} /></ul>
        </>
      )}
      {loose.length > 0 && (
        <>
          <p style={HEAD}>Posibles duplicados (misma fecha/hora y mismos valores numéricos parseados; el texto del reporte puede diferir)</p>
          <ul style={UL}><Rows rows={loose} /></ul>
        </>
      )}
    </div>
  );
}

export function LabDedupeModal({ sections }) {
  const n = sections.reduce((acc, s) => acc + s.rows.length, 0);
  return (
    <div class="lab-conflict-modal" style="max-width:520px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">
      <h3 style="margin:0 0 8px;">Sincronizar historial de laboratorio</h3>
      <p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca las entradas a eliminar. Por defecto se seleccionan las copias redundantes y se conserva el conjunto con id más antiguo en cada grupo.</p>
      <div style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">
        {sections.map((sec) => <PatientBlock sec={sec} />)}
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;justify-content:space-between;flex-wrap:wrap;align-items:center;">
        <span style="font-size:12px;color:var(--text-muted);" id="lab-dedupe-count">{n + ' seleccionada' + (n === 1 ? '' : 's')}</span>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" id="lab-dedupe-none" style={BTN_GHOST}>Quitar todas</button>
          <button type="button" id="lab-dedupe-all" style={BTN_GHOST}>Seleccionar todas</button>
          <button type="button" id="lab-dedupe-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button>
          <button type="button" id="lab-dedupe-ok" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Eliminar seleccionadas</button>
        </div>
      </div>
    </div>
  );
}

export function drawLabDedupeModal(backdrop, sections) {
  render(<LabDedupeModal sections={sections} />, backdrop);
}
