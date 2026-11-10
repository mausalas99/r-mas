import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { DuplicateWarning, ExpedienteAdvice } from './patients-modal-dialogs-view.jsx';
  const noop = () => {};
  export const dup = (existing, fecha) => renderToString(<DuplicateWarning existing={existing} fecha={fecha} onCancel={noop} onConfirm={noop} />);
  export const advice = (a) => renderToString(<ExpedienteAdvice advice={a} onCancel={noop} onConfirm={noop} />);`);

// Exact markup the string builders in patients-modal-dialogs.mjs made before the port.
const OLD = JSON.parse(fs.readFileSync(new URL('./patients-modal-dialogs-old-html.json', import.meta.url), 'utf8'));
// Preact escapes '>' and quotes in text and writes <br/>; HTML parses both the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/<br\/>/g, '<br>');

for (const [key, who, fecha] of [
  ['dup:full:fecha', 'full', OLD.fecha], ['dup:full:nofecha', 'full', ''],
  ['dup:bare:nofecha', 'bare', ''], ['dup:reg:fecha', 'reg', OLD.fecha],
]) {
  test('duplicate warning matches the old markup: ' + key, () => {
    assert.equal(norm(view.dup(OLD.people[who], fecha)), norm(OLD[key]));
  });
}

test('expediente advice matches the old markup', () => {
  assert.equal(norm(view.advice(OLD.adviceIn)), norm(OLD['advice:html']));
});
