import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { SoapReplaceConfirm } from './soap-estado-view.jsx';
  const noop = () => {};
  export const confirm = () => renderToString(<SoapReplaceConfirm onCancel={noop} onReplace={noop} />);`);

// Exact markup the innerHTML string in soap-estado.mjs made before the port.
const OLD = JSON.parse(fs.readFileSync(new URL('./soap-estado-view.old.json', import.meta.url), 'utf8'));

test('replace-evolución dialog equals the old string', () => {
  assert.equal(view.confirm(), OLD.confirm);
});
test('dialog keeps the ids soap-estado.mjs and the modal dismiss list read', () => {
  assert.match(view.confirm(), /id="soap-confirm-cancel-btn"/);
  assert.match(view.confirm(), /id="soap-confirm-replace-btn"/);
});
