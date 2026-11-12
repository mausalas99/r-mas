import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

// Output of the old string builders (buildStandardGluRowHtml, buildExtraGluRowHtml, bomba row,
// renderEaEmptyPanel, wrapApprovalInConflictModal(buildRecommendationCardHtml(...))), captured before the port.
const { default: OLD } = await import('./estado-actual-panel-views-old-html.json', { with: { type: 'json' } });

// Same markup, different spelling: Preact prints empty-valued boolean/data attributes as `name=""`
// where the old strings had bare `name`; void elements print `/>`; `value=""` may print as bare `value`.
const same = (s) => s.replace(/ ([a-z][a-z-]*)=""/g, " $1").replace(/<option value>/g, "<option value=\"\">").replace(/\/>/g, ">");

async function html(imports, expr) {
  const mod = await loadJsx(import.meta.url, `import { ${imports[1]} } from '${imports[0]}';
    export const html = () => renderToString(${expr});`);
  return mod.html();
}

const GLU = './estado-actual-panel-glu-view.jsx';
test('glu standard row', async () => {
  assert.equal(same(await html([GLU, 'StandardGluRow'], '<StandardGluRow standardTime="07:00" />')), same(OLD.standard0700));
});
test('glu extra row', async () => {
  assert.equal(same(await html([GLU, 'ExtraGluRow'], '<ExtraGluRow />')), same(OLD.extra));
});
test('bomba row', async () => {
  assert.equal(same(await html([GLU, 'BombaRow'], '<BombaRow />')), same(OLD.bombaRow));
});
test('empty panel', async () => {
  assert.equal(same(await html(['./estado-actual-panel-render-view.jsx', 'EmptyPanel'], '<EmptyPanel />')), same(OLD.emptyPanel));
});
test('replace-evolucion conflict card, closed and open drawer', async () => {
  const A = './estado-actual-panel-actions-view.jsx';
  assert.equal(same(await html([A, 'ReplaceEvolucionCard'], '<ReplaceEvolucionCard altsOpen={false} />')), same(OLD.conflictClosed));
  assert.equal(same(await html([A, 'ReplaceEvolucionCard'], '<ReplaceEvolucionCard altsOpen={true} />')), same(OLD.conflictOpen));
});
