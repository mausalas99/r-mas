import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEntregaRosterRowHtml } from './entrega-roster-render.mjs';

test('roster row defaults clinical status badge to Estable when unset', () => {
  const p = { id: 'p1', bed_label: '3', name: 'Juan', service: 'MI' };
  const guardiasMap = new Map([
    ['p1', { pendientes_json: JSON.stringify({ version: 2, items: [], handoffContext: {} }) }],
  ]);
  const html = renderEntregaRosterRowHtml(p, guardiasMap);
  assert.match(html, /roster-sbadge--stable">Estable<\/span>/);
  assert.doesNotMatch(html, />—<\/span>/);
});
