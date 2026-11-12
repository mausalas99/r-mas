import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { MedNotaFooter } from './medications-soap-footer-view.jsx';
  export const html = (sala) => renderToString(<MedNotaFooter sala={sala} />);`);

// Exact markup renderMedNotaFooter made before the port (foot.innerHTML, from the old code).
const { default: OLD } = await import('./medications-soap-footer-view.old.json', { with: { type: 'json' } });

for (const [name, sala] of [['sala', true], ['guardia', false]]) {
  test(`Manejo footer HTML equals the old builder: ${name}`, () => {
    assert.equal(view.html(sala), OLD[name]);
  });
}
