import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSnapshotSection } from './estado-actual-panel-snapshot.mjs';
import { deriveSnapshot } from './estado-actual-data.mjs';

test('snapshot is one card per system and keeps the #ea-snapshot patch target', () => {
  const html = renderSnapshotSection(deriveSnapshot({}), 0, 0);
  assert.match(html, /id="ea-snapshot"/);
  for (const t of ['Hemodinámico', 'Respiratorio', 'Infeccioso', 'Renal y balance']) {
    assert.ok(html.includes(t), t);
  }
  assert.equal((html.match(/ea-sys-card /g) || []).length, 5);
  assert.match(html, /T\/A/);
  assert.match(html, /openEaTurnosBalanceModal/);
});
