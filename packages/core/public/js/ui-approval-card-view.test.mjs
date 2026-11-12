import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { escHtml } from './dom-escape.mjs';

// What showConfirmDialog wrote into the backdrop before the port.
function wrapConfirmInConflictModal(innerHtml) {
  return (
    '<div class="lab-conflict-modal material-glass ui-overlay-dialog ui-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ui-confirm-title">' +
    innerHtml +
    '</div>'
  );
}

/**
 * Destructive confirm (title + lead + optional list). No quiz chrome, no ×.
 * @param {{
 *   title?: string,
 *   question?: string,
 *   items?: string[],
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 * }} opts
 */
function buildConfirmCardHtml(opts) {
  opts = opts || {};
  var title = String(opts.title || '').trim();
  var lead = String(opts.question || '').trim();
  if (!title && lead) {
    title = lead;
    lead = '';
  }
  var items = Array.isArray(opts.items) ? opts.items.filter(Boolean) : [];
  var itemsHtml = items.length
    ? '<ul class="ui-confirm-list">' +
      items
        .map(function (item) {
          return '<li>' + escHtml(item) + '</li>';
        })
        .join('') +
      '</ul>'
    : '';
  var leadHtml = lead ? '<p class="ui-confirm-lead" id="ui-confirm-lead">' + escHtml(lead) + '</p>' : '';
  return (
    '<div class="ui-confirm ui-approval-card ui-approval-card--confirm">' +
    '<h3 class="ui-confirm-title" id="ui-confirm-title">' +
    escHtml(title) +
    '</h3>' +
    leadHtml +
    itemsHtml +
    '<div class="ui-confirm-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary ui-pressable" data-approval-cancel>' +
    escHtml(opts.cancelLabel || 'Cancelar') +
    '</button>' +
    '<button type="button" class="wb-btn wb-btn-danger ui-pressable" data-approval-confirm>' +
    escHtml(opts.confirmLabel || 'Eliminar') +
    '</button></div></div>'
  );
}


// Preact prints a bare data attribute as `data-x="true"` and leaves `>` raw in text. Same DOM.
const norm = (h) => h.replace(/&gt;/g, '>').replace(/(data-[\w-]+)="true"/g, '$1');

test('ConfirmDialog matches the old markup', async () => {
  const mod = await loadJsx(import.meta.url, `import { ConfirmDialog } from './ui-approval-card-view.jsx';
    export const html = (o) => renderToString(<ConfirmDialog {...o} />);`);
  const cases = [
    { title: 'Eliminar paciente', question: '¿Seguro "Ana" & co?', items: ['Notas', 'Labs <1>'], confirmLabel: 'Borrar', cancelLabel: 'No' },
    { question: 'Solo pregunta' },
    { title: 'Solo título', items: [] },
    {},
  ];
  for (const o of cases) assert.equal(norm(mod.html(o)), norm(wrapConfirmInConflictModal(buildConfirmCardHtml(o))));
});
