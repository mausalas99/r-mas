import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventualidadesPanelHtml, removeEventualidadCardEl } from './eventualidades-panel-html.mjs';

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

test('removeEventualidadCardEl drops one card and keeps the other', { skip: typeof document === 'undefined' }, () => {
  const mount = document.createElement('div');
  mount.innerHTML = buildEventualidadesPanelHtml(
    [
      {
        day: '2026-08-03',
        label: 'Hoy',
        isToday: true,
        entries: [
          { id: 'ev_1', at: '2026-08-03T10:00:00.000Z', text: 'NAUSEA' },
          { id: 'ev_2', at: '2026-08-03T11:00:00.000Z', text: 'FIEBRE' },
        ],
      },
    ],
    true,
    null,
    { entries: [], labsText: '' },
    'note',
    emptyCtx
  );
  assert.equal(removeEventualidadCardEl(mount, 'ev_1'), true);
  assert.equal(mount.querySelector('[data-entry-id="ev_1"]'), null);
  assert.ok(mount.querySelector('[data-entry-id="ev_2"]'));
  assert.ok(mount.querySelector('.ev-day'));
});

test('removeEventualidadCardEl shows empty timeline when last card is removed', { skip: typeof document === 'undefined' }, () => {
  const mount = document.createElement('div');
  mount.innerHTML = buildEventualidadesPanelHtml(
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
  assert.equal(removeEventualidadCardEl(mount, 'ev_1'), true);
  assert.equal(mount.querySelector('[data-entry-id]'), null);
  assert.ok(mount.querySelector('.ev-timeline--empty'));
  assert.match(mount.innerHTML, /Aún no hay eventualidades/);
});
