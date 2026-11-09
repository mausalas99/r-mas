import test from 'node:test';
import assert from 'node:assert/strict';
import { isPreactFile, scanPreactSource, scanRepoForPreactInnerHtml } from './no-innerhtml-in-preact.mjs';

test('jsx files and files importing preact count as Preact; old modules and tests do not', () => {
  assert.equal(isPreactFile('public/js/features/a.jsx', ''), true);
  assert.equal(isPreactFile('public/js/ui-kit/use-store.mjs', "import { useState } from 'preact/hooks';"), true);
  assert.equal(isPreactFile('public/js/features/old.mjs', 'el.innerHTML = x;'), false);
  assert.equal(isPreactFile('public/js/features/a.test.mjs', "import 'preact';"), false);
  assert.equal(isPreactFile('public/js/chunks/x.js', "import 'preact';"), false);
});

test('flags every HTML-string write in a Preact file, ignores comments', () => {
  const src = [
    "import { h } from 'preact';",
    '// el.innerHTML = nope (comment)',
    'a.innerHTML = x;',
    'b.insertAdjacentHTML("beforeend", y);',
    '<div dangerouslySetInnerHTML={{ __html: z }} />',
    'document.write(w);',
  ].join('\n');
  const hits = scanPreactSource(src, 'public/js/features/a.mjs');
  assert.deepEqual(hits.map((h) => h.line), [3, 4, 5, 6]);
});

test('the same writes in an old non-Preact module are not flagged', () => {
  assert.deepEqual(scanPreactSource('el.innerHTML = x;', 'public/js/features/old.mjs'), []);
});

test('the repo has no HTML-string writes in Preact files', () => {
  assert.deepEqual(scanRepoForPreactInnerHtml(), []);
});
