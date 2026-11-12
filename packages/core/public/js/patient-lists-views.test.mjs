import test from 'node:test';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { sameHtml as same } from './features/preact-html-compare.mjs';

// Preact writes void tags as <input/>; HTML parses both the same.
const sameHtml = (a, b, name) => same(a.replace(/\/>/g, '>'), b, name);

const view = await loadJsx(import.meta.url, `import { SalaOptions } from './patient-sala-view.jsx';
  import { RegistroRows } from './patient-registro-modal-view.jsx';
  import { DxRows } from './patient-data-censo-view.jsx';
  import { AccesoRows } from './patient-data-accesos-view.jsx';
  export const sala = (p) => renderToString(<SalaOptions {...p} />);
  export const reg = (p) => renderToString(<RegistroRows {...p} />);
  export const dx = (p) => renderToString(<DxRows {...p} />);
  export const acc = (p) => renderToString(<AccesoRows {...p} />);`);

// Expected strings are what the old string builders wrote for the same synthetic input.
test('sala options equal the old markup', () => {
  sameHtml(view.sala({ selected: ' B ', values: ['A', 'B'] }),
    '<option value="">— Seleccionar —</option><option value="A">A</option><option value="B" selected>B</option>', 'sala');
});

const regRow = (i, val, ph, hidden) => `<div class="vpo-dx-row list-row"><input type="text" class="ea-input m-registro-row-input" value="${val}" placeholder="${ph}" data-oninput="onRegistroModalInput" data-oninput-args="[${i}]" data-oninput-pass="value" data-onpaste="onRegistroModalRowPaste" data-onpaste-args="[${i}]" data-onpaste-pass="event"><button type="button" class="btn-remove" data-onclick="removeRegistroModalRow" data-onclick-args="[${i}]"${hidden ? ' style="visibility:hidden"' : ''} aria-label="Eliminar">×</button></div>`;

test('registro rows equal the old markup', () => {
  sameHtml(view.reg({ rows: ['1234567-8'], multi: false }), regRow(0, '1234567-8', '0000000-0', true), 'single');
  sameHtml(view.reg({ rows: ['a"b', ''], multi: true }), regRow(0, 'a&quot;b', 'Registro 1', false) + regRow(1, '', 'Registro 2', false), 'multi');
});

const dxRow = (n, val, rm) => `<li><label class="exp-datos-list__n" for="patient-dx-${n}">${n}</label><input type="text" id="patient-dx-${n}" class="exp-datos-q" value="${val}"${val ? '' : ' placeholder="Diagnóstico · pegar DX1 + DX2"'} aria-label="Diagnóstico ${n}" style="text-transform:uppercase;" data-oninput="onPatientDxInput" data-oninput-args="[${n - 1}]" data-oninput-pass="value" data-onpaste="splitPatientDxPaste" data-onpaste-args="[${n - 1}]" data-onpaste-pass="event" data-onkeydown="addPatientDxRow" data-onkeydown-keys="Enter">${rm ? `<button type="button" class="exp-datos-list__rm" data-onclick="removePatientDxRow" data-onclick-args="[${n - 1}]" aria-label="Quitar diagnóstico ${n}">×</button>` : ''}</li>`;

test('dx rows equal the old markup', () => {
  sameHtml(view.dx({ rows: [''] }), dxRow(1, '', false), 'one empty');
  sameHtml(view.dx({ rows: ['NEUMONÍA <X>', ''] }), dxRow(1, 'NEUMONÍA &lt;X>', true) + dxRow(2, '', true), 'two');
});

const via = (i, sel) => `<select class="exp-datos-q patient-acceso-via" data-onchange="onPatientAccesoVia" data-onchange-args="[${i}]" data-onchange-pass="value" aria-label="Vía de acceso"><option value=""${sel === '' ? ' selected' : ''}>— Vía —</option><option value="cvc"${sel === 'cvc' ? ' selected' : ''}>CVC</option></select>`;
const accRow = (i, name, sel, date, tag, rm) => `<div class="exp-datos-prop patient-acceso-row"><span class="exp-datos-prop__k">${name}</span><div class="exp-datos-acc">${via(i, sel)}<label class="exp-datos-acc__date"><span class="visually-hidden">Fecha ${name}</span><input type="date" class="rpc-date-input patient-acceso-fecha" value="${date}" data-oninput="onPatientAccesoFecha" data-oninput-args="[${i}]" data-oninput-pass="value"></label>${tag}${rm ? `<button type="button" class="exp-datos-list__rm" data-onclick="removePatientAccesoRow" data-onclick-args="[${i}]" aria-label="Quitar ${name}">×</button>` : ''}</div></div>`;

test('acceso rows equal the old markup', () => {
  const now = new Date('2026-01-10T00:00:00').getTime();
  const viaLabels = { cvc: 'CVC' };
  sameHtml(view.acc({ rows: [{ via: '', dateValue: '' }], viaLabels, now }), accRow(0, 'Acceso', '', '', '', false), 'one empty');
  sameHtml(view.acc({ rows: [{ via: 'cvc', dateValue: '2026-01-05' }, { via: '', dateValue: '2026-02-01' }], viaLabels, now }),
    accRow(0, 'Acceso 1', 'cvc', '2026-01-05', '<span class="exp-datos-tag exp-datos-tag--muted">día 5</span>', true) + accRow(1, 'Acceso 2', '', '2026-02-01', '', true), 'two, future date has no tag');
});
