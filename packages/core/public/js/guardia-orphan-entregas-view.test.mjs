import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './features/preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { OrphanStrip, orphanStripRows } from './guardia-orphan-entregas-view.jsx';
  export const html = (list, hint) => renderToString(<OrphanStrip rows={orphanStripRows(list, hint)} onOpen={() => {}} onDelete={() => {}} />);`);

// Exact markup renderOrphanEntregasStrip made before the port (host.innerHTML, from the old code).
const { default: OLD } = await import('./guardia-orphan-entregas-view.old.json', { with: { type: 'json' } });

// Same wording as vitalsHintForRow; the fixture rows carry the alert the real one derives from the plan.
const hint = (row) => {
  const a = row._alert;
  if (!a) return 'Sin alerta de signos activa';
  return a.level === 'overdue' ? `Signos vencidos (${a.freqLabel})` : `Signos pronto (${a.freqLabel})`;
};
const ROWS = {
  plain: [{ patient_id: 'p1', guardia_id: 'g1' }],
  mixed: [
    { patient_id: 'abcdefghijklmnopqrstuvwxyz', guardia_id: 'g<2>', _alert: { level: 'overdue', freqLabel: 'c/4 h' } },
    { patient_id: 'p"3', guardia_id: 'g3', _alert: { level: 'warning', freqLabel: 'c/1 h' } },
    { patient_id: 'p4', guardia_id: 'g4' },
  ],
};
// Whitespace between tags and at the edges of a block is not significant; a space between text and an inline tag is.
const norm = (s) => s.replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/\s+(<\/(?:p|li|summary)>)/g, '$1').replace(/(<(?:p|li|summary)\b[^>]*>)\s+/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

for (const [name, list] of Object.entries(ROWS)) {
  test(`Orphan entregas strip HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.html(list, hint)), norm(OLD[name].html));
  });
}
