import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

// learn-hub.mjs reads saved progress and pulls in UI modules that expect a browser: give them a bare one.
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.document = { addEventListener() {}, documentElement: {}, querySelector: () => null, querySelectorAll: () => [], readyState: 'complete', getElementById: () => null };

const view = await loadJsx(import.meta.url, `import { buildLearnHubModel } from './settings-help/learn-hub.mjs';
  import { LearnHubBody } from './learn-hub-view.jsx';
  export const body = (focus) => renderToString(<LearnHubBody {...buildLearnHubModel(focus)} />);`);

test('learn hub body renders with no saved progress', () => {
  for (const k of Object.keys(store)) delete store[k];
  const html = view.body(undefined);
  assert.ok(html.length > 0);
  assert.match(html, /<button|<a /);
});
