import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEventualidadesPanelHtml,
  buildEventualidadesComposeHtml,
} from './eventualidades-panel-html.mjs';

test('buildEventualidadesPanelHtml: timeline inline, no compose dock', () => {
  const html = buildEventualidadesPanelHtml(
    [
      {
        day: '2026-08-03',
        label: 'Hoy',
        isToday: true,
        entries: [{ id: 'ev_1', at: '2026-08-03T10:00:00.000Z', text: 'NAUSEA' }],
      },
    ],
    true,
    { editingEntryId: null, dayOpenPrefs: new Map() }
  );
  assert.match(html, /ev-panel/);
  assert.match(html, /ev-timeline/);
  assert.match(html, /ev-actions/);
  assert.match(html, /data-ev-open-compose="note"/);
  assert.doesNotMatch(html, /class="ev-compose"/);
});

test('buildEventualidadesComposeHtml: sheet compose with solid labs inset', () => {
  const store = { entries: [], labsText: 'BH HB 9' };
  const html = buildEventualidadesComposeHtml(null, store, 'labs');
  assert.match(html, /ev-compose--sheet/);
  assert.match(html, /ev-sheet__labs-preview/);
  assert.match(html, /material-solid-elevated/);
  assert.match(html, /id="eventualidades-labs"/);
  assert.match(html, /id="eventualidades-input"/);
});

test('buildEventualidadesComposeHtml: edit mode locks labs tab', () => {
  const entry = { id: 'ev_x', at: '2026-08-03T10:00:00.000Z', text: 'CAIDA' };
  const html = buildEventualidadesComposeHtml(entry, { entries: [entry], labsText: '' }, 'note');
  assert.match(html, /Editar eventualidad/);
  assert.match(html, /disabled title="Termina la edición para cambiar a Labs"/);
  assert.match(html, /id="eventualidades-cancel"/);
});
