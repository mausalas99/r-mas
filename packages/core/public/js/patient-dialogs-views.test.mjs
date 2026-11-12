import test from 'node:test';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { sameHtml as same } from './features/preact-html-compare.mjs';

// Preact writes void tags as <input/> and <br/>; HTML parses both the same.
const sameHtml = (a, b, name) => same(a.replace(/\s?\/>/g, '>'), b, name);

const view = await loadJsx(import.meta.url, `import { TunnelConfirm } from './patient-registro-tunnel-view.jsx';
  import { ExportPatientsModal } from './features/platform/import-backup/export-patients-modal-view.jsx';
  export const tunnel = (p) => renderToString(<TunnelConfirm {...p} />);
  export const exp = (p) => renderToString(<ExportPatientsModal {...p} />);`);

// Expected strings are what the old innerHTML builders wrote for the same synthetic input.
const tunnelHtml = (title, nombre, reg, studies, stop, omit) =>
  `<div class="lab-conflict-modal" role="dialog" aria-modal="true"><h3>${title}</h3><p><strong>${nombre}</strong><br>Registro: ${reg}${studies}</p>` +
  `<div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">${stop}` +
  `<button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" id="patient-registro-tunnel-cancel">${omit}</button>` +
  `<button type="button" class="wb-btn wb-btn-primary wb-btn-block" id="patient-registro-tunnel-confirm">Agregar al censo</button></div></div>`;

test('tunnel confirm equals the old markup', () => {
  sameHtml(view.tunnel({ title: '¿Es este paciente?', nombre: 'DEMO <A>', reg: '1234567-8', studyCount: 0, omitLabel: 'Cancelar', showStop: false }),
    tunnelHtml('¿Es este paciente?', 'DEMO &lt;A>', '1234567-8', '', '', 'Cancelar'), 'single');
  sameHtml(view.tunnel({ title: '¿Es este paciente? (1 de 3)', nombre: 'DEMO B', reg: '7654321-0', studyCount: 1, omitLabel: 'Omitir', showStop: true }),
    tunnelHtml('¿Es este paciente? (1 de 3)', 'DEMO B', '7654321-0', '<br>1 estudio en el rango',
      '<button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" id="patient-registro-tunnel-stop">Detener cola</button>', 'Omitir'), 'batch');
});

const GHOST = 'background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);';
const exportHtml = (list) =>
  '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Exportar pacientes</h3>' +
  '<p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca los pacientes que quieres incluir. El archivo JSON se puede importar con <strong>Importar paciente…</strong> o <strong>Importar rango…</strong>.</p>' +
  '<div style="overflow-y:auto;flex:0 1 auto;max-height:42vh;padding-right:4px;"><ul style="margin:0;padding-left:0;list-style:none;font-size:13px;">' + list + '</ul></div>' +
  '<p id="export-patients-count" style="font-size:12px;color:var(--text-muted);margin:10px 0 6px;">Ningún paciente seleccionado</p>' +
  '<div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;">' +
  `<button type="button" id="export-patients-none" style="${GHOST}">Quitar todos</button><button type="button" id="export-patients-all" style="${GHOST}">Seleccionar todos</button>` +
  '<button type="button" id="export-patients-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button>' +
  '<button type="button" id="export-patients-ok" disabled aria-disabled="true" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Exportar JSON…</button></div></div>';
const li = (id, label, checked) => `<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="export-patients-cb" data-patient-id="${id}"${checked ? ' checked' : ''} style="margin-top:3px;flex-shrink:0;"><span>${label}</span></label></li>`;

test('export patients modal equals the old markup', () => {
  sameHtml(view.exp({ items: [{ id: 'p1', label: '12-A — DEMO UNO • 111', checked: true }, { id: 'p<2', label: 'DEMO & DOS', checked: false }] }),
    exportHtml(li('p1', '12-A — DEMO UNO • 111', true) + li('p&lt;2', 'DEMO &amp; DOS', false)), 'list');
  sameHtml(view.exp({ items: [] }), exportHtml('<li style="font-size:13px;color:var(--text-muted);">No hay pacientes exportables en el censo visible.</li>'), 'empty');
});
