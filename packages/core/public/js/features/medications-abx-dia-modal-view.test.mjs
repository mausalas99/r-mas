import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { normHtml } from './preact-html-compare.mjs';
import { esc } from '../dom-escape.mjs';
import { STACKED_BACKDROP_CLASS } from './cloud-sync/stacked-overlay.mjs';

const view = await loadJsx(import.meta.url, `import { AbxDiaModal } from './medications-abx-dia-modal-view.jsx';
  export const html = (o) => renderToString(<AbxDiaModal {...o} />);`);

// Old string builder (medications-abx-dia-modal.mjs before the port), kept as the oracle.
const oldHtml = (opts) =>
  '<div class="' + STACKED_BACKDROP_CLASS + '" data-abx-dia-modal>' +
  '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="abx-dia-title">' +
  '<h3 id="abx-dia-title" style="margin:0 0 10px;">' + esc(opts.title) + '</h3>' +
  '<p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);">' + esc(opts.message) + '</p>' +
  opts.rows.map((r) =>
    '<label style="display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:13px;">' +
    '<span style="flex:1;">' + esc(r.label) + '</span>' + 'Día ' +
    '<input type="number" min="1" step="1" class="profile-input" style="width:72px;" data-abx-dia-id="' + esc(r.id) + '" value="' + esc(String(r.dia)) + '" aria-label="Día de ' + esc(r.label) + '" />' +
    '</label>').join('') +
  '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">' +
  '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-abx-dia-cancel>Cancelar</button>' +
  '<button type="button" class="cloud-sync-btn" data-abx-dia-ok>Guardar</button>' +
  '</div></div></div>';

const n = (s) => normHtml(s).replace(/ ?\/>/g, '>');
const cases = {
  none: { title: 'Día de antibiótico', message: 'Confirma', rows: [] },
  rows: { title: 'Día <hoy>', message: 'Solo "hoy" & mañana', rows: [{ id: 'a1', label: 'CEFTRIAXONA 1 g', dia: 3 }, { id: "b'2", label: 'A&B', dia: 1 }] },
};
for (const [name, o] of Object.entries(cases)) {
  test(`abx dia modal equals the old builder: ${name}`, () => assert.equal(n(view.html(o)), n(oldHtml(o))));
}
