import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { DashboardView } from './dashboard-view.jsx';
  import { MODELS } from './dashboard-view-models.mjs';
  export const html = (k) => renderToString(<DashboardView model={MODELS[k]} now={new Date('2026-06-01T12:00:00')} />);`);

// Markup renderDashboardHtml wrote before the port (synthetic models in dashboard-view-models.mjs).
const OLD = createRequire(import.meta.url)('./dashboard-view-old-html.json');
const voids = (s) => s.replace(/<input([^>]*?)\/>/g, '<input$1>');
const entities = (s) => s.replace(/&#8593;/g, '↑').replace(/&#8595;/g, '↓').replace(/&#8594;/g, '→').replace(/&middot;/g, '·');

for (const key of Object.keys(OLD)) {
  test(`dashboard ${key} equals the old HTML`, () => {
    sameHtml(voids(view.html(key)), entities(OLD[key]), key);
  });
}

test('deferred labs card has no draws and no cultivos card', () => {
  const html = view.html('PENDING_LABS');
  assert.ok(html.includes('data-dash-labs'));
  assert.ok(!html.includes('day-draws'));
  assert.ok(!html.includes('cultivos-card'));
});
