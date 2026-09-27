import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSnapshotVitalsHtml, renderSnapshotVitalsZoneTitle } from './estado-actual-panel-snapshot-html.mjs';

test('renderSnapshotVitalsZoneTitle — fecha común en el título, la distinta queda en su fila', () => {
  var at = function (d) {
    return new Date(2026, 5, d, 6, 0, 0).toISOString();
  };
  /** @type {any} */
  var snap = {
    vitals: { fc: 80, fr: 18, temp: 36.5 },
    vitalSeries: {
      fc: [{ value: 80, recordedAt: at(25) }],
      fr: [{ value: 18, recordedAt: at(25) }],
      temp: [{ value: 36.5, recordedAt: at(21) }],
    },
  };
  var html = renderSnapshotVitalsHtml(snap);
  assert.match(renderSnapshotVitalsZoneTitle(snap), /ea-snapshot-zone-stamp">25\/06</);
  assert.equal((html.match(/ea-snapshot-row-stamp">/g) || []).length, 1);
  assert.match(html, /ea-snapshot-row-stamp">21\/06</);
});
