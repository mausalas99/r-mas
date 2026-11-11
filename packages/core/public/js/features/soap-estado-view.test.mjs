import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { SoapReplaceConfirm } from './soap-estado-view.jsx';
  const noop = () => {};
  export const confirm = () => renderToString(<SoapReplaceConfirm onCancel={noop} onReplace={noop} />);`);

test('replace-evolución dialog asks before replacing', () => {
  const html = view.confirm();
  assert.ok(html.includes('¿Reemplazar evolución?'));
  assert.ok(html.includes('Reemplazar'));
  assert.ok(html.includes('Cancelar'));
});

test('dialog keeps the ids soap-estado.mjs and the modal dismiss list read', () => {
  assert.match(view.confirm(), /id="soap-confirm-cancel-btn"/);
  assert.match(view.confirm(), /id="soap-confirm-replace-btn"/);
});
