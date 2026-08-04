import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventualidadesPanelHtml } from './eventualidades-panel-html.mjs';

const emptyCtx = {
  editingEntryId: null,
  composeMode: 'note',
  dayOpenPrefs: new Map(),
};

test('buildEventualidadesPanelHtml note mode: timeline + compose, no labs dock', () => {
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
  assert.doesNotMatch(html, /id="eventualidades-labs"/);
  assert.doesNotMatch(html, /Interpretación de laboratorios/);
});

test('buildEventualidadesPanelHtml labs mode: timeline only, no compose dock', () => {
  const html = buildEventualidadesPanelHtml(
    [],
    false,
    null,
    {
      entries: [],
      labsText: 'LABS 03/08/2026 06:45\nEN LA BIOMETRÍA SE APRECIA ANEMIA.',
    },
    'labs',
    { ...emptyCtx, composeMode: 'labs' }
  );
  assert.match(html, /data-ev-view="labs"/);
  assert.match(html, /data-ev-timeline="labs"/);
  assert.doesNotMatch(html, /class="ev-compose"/);
  assert.doesNotMatch(html, /id="eventualidades-labs"/);
  assert.doesNotMatch(html, /Interpretación de laboratorios/);
});
