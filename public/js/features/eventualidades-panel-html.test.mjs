import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventualidadesPanelHtml } from './eventualidades-panel-html.mjs';

const emptyCtx = {
  editingEntryId: null,
  composeMode: 'note',
  dayOpenPrefs: new Map(),
};

test('buildEventualidadesPanelHtml: timeline + compose, no Labs tab', () => {
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
    null,
    { entries: [], labsText: '' },
    'note',
    emptyCtx
  );
  assert.match(html, /ev-panel/);
  assert.match(html, /ev-timeline/);
  assert.match(html, /class="ev-compose"/);
  assert.match(html, /id="eventualidades-input"/);
  assert.match(html, /id="eventualidades-add"/);
  assert.doesNotMatch(html, /ev-mode-switch/);
  assert.doesNotMatch(html, />Labs</);
  assert.doesNotMatch(html, /id="eventualidades-labs"/);
  assert.doesNotMatch(html, /Interpretación/);
});

test('buildEventualidadesPanelHtml empty: compose visible, no Labs copy', () => {
  const html = buildEventualidadesPanelHtml(
    [],
    false,
    null,
    { entries: [], labsText: 'LABS 03/08/2026\nEN LA BIOMETRÍA' },
    'labs',
    { ...emptyCtx, composeMode: 'labs' }
  );
  assert.match(html, /data-ev-view="note"/);
  assert.match(html, /class="ev-compose"/);
  assert.match(html, /Aún no hay eventualidades\. Agrégalas abajo\./);
  assert.doesNotMatch(html, /ev-mode-switch/);
  assert.doesNotMatch(html, />Labs</);
  assert.doesNotMatch(html, /interpretaciones/i);
});
