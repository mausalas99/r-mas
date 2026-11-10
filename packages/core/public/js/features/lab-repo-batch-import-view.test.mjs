import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { LabRepoBatchList, LabChemistrySkeleton } from './lab-repo-batch-import-view.jsx';
  export const list = (rows, busy) => renderToString(<LabRepoBatchList rows={rows} busy={busy} />);
  export const skeleton = () => renderToString(<LabChemistrySkeleton />);`);

// Exact markup the old string builders in lab-repo-batch-import.mjs / ui-skeleton.mjs made (synthetic rows).
const OLD = JSON.parse(fs.readFileSync(new URL('./lab-repo-batch-import-view.old.json', import.meta.url), 'utf8'));

// Preact writes void tags as <x/> and leaves '>' unescaped; HTML parses both the same.
const norm = (s) => s.replace(/ \/>/g, '>').replace(/\/>/g, '>').replace(/&gt;/g, '>');

test('batch list HTML equals the old builder', () => {
  assert.equal(norm(view.list(OLD.rows, false)), norm(OLD.idle));
});
test('busy list disables every checkbox, as before', () => {
  assert.equal(norm(view.list(OLD.rows, true)), norm(OLD.busy));
});
test('no rows gives the empty message', () => {
  assert.equal(view.list([], false), OLD.empty);
});
test('chemistry skeleton HTML equals the old builder', () => {
  assert.equal(norm(view.skeleton()), norm(OLD.skeleton));
});
