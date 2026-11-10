import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

// learn-hub.mjs reads saved progress and pulls in UI modules that expect a browser: give them a bare one.
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.document = { addEventListener() {}, documentElement: {}, querySelector: () => null, querySelectorAll: () => [], readyState: 'complete', getElementById: () => null };

const view = await loadJsx(import.meta.url, `import { buildLearnHubModel } from './settings-help/learn-hub.mjs';
  import { LearnHubBody } from './learn-hub-view.jsx';
  export const body = (focus) => renderToString(<LearnHubBody {...buildLearnHubModel(focus)} />);`);

// Exact body markup the old string builders in learn-hub.mjs made, for synthetic progress (5 states).
const OLD = JSON.parse(fs.readFileSync(new URL('./learn-hub-view.old.json', import.meta.url), 'utf8'));

// Preact writes void tags as <x/>, closes svg shapes and leaves '>' unescaped; HTML parses both the same.
const norm = (s) => s.replace(/<\/(path|circle)>/g, '').replace(/ \/>/g, '>').replace(/\/>/g, '>').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

for (const [name, old] of Object.entries(OLD)) {
  test(`learn hub body equals the old builder: ${name}`, () => {
    for (const k of Object.keys(store)) delete store[k];
    Object.assign(store, old.setup.store);
    assert.equal(norm(view.body(old.setup.focus)), norm(old.html));
  });
}
