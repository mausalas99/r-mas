import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { CENSO_COL_WEIGHTS } from './censo-table-columns.mjs';

const view = await loadJsx(import.meta.url, `import { CensoPreviewModal, CensoColumnChips } from './censo-preview-html-view.jsx';
  export const modal = () => renderToString(<CensoPreviewModal />);
  export const chips = (cols, hidden) => renderToString(<CensoColumnChips cols={cols} hidden={hidden} />);`);

// Exact markup censo-preview-html.mjs made before the port (backdrop.innerHTML and the chips host, from the old code).
const { default: OLD } = await import('./censo-preview-html-view.old.json', { with: { type: 'json' } });

const norm = (s) => s.replace(/ ?\/>/g, '>').replace(/<(iframe|div)([^>]*)><\/\1>/g, '<$1$2></$1>');
const cols = CENSO_COL_WEIGHTS.filter((c) => c.key !== 'num');

test('Censo preview modal HTML equals the old builder', () => {
  assert.equal(norm(view.modal()), OLD.modal);
});
for (const [name, hidden] of [['allVisible', []], ['someHidden', ['cultivos', 'dx']]]) {
  test(`Censo column chips HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.chips(cols, hidden)), OLD['chips-' + name]);
  });
}
