import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  equiposActivityHistoryListHtml,
  equiposActivityHistoryModalMarkup,
  equiposRowHistoryButtonHtml,
} from './panel-admin-equipos-history-modal.mjs';

describe('panel-admin-equipos-history-modal', () => {
  const history = [
    { at: '2026-08-07T16:00:00.000Z', source: 'sync' },
    { at: '2026-06-10T08:00:00.000Z', source: 'seed_created' },
  ];

  it('equiposRowHistoryButtonHtml renders modal trigger with count', () => {
    const html = equiposRowHistoryButtonHtml('cindypsc', 'Cindy', history);
    assert.match(html, /data-admin-action="equipos-activity-history"/);
    assert.match(html, /cloud-sync-admin-equipos-history-btn/);
    assert.match(html, />Historial</);
    assert.match(html, />2</);
  });

  it('equiposActivityHistoryModalMarkup includes list and close', () => {
    const html = equiposActivityHistoryModalMarkup({
      handle: 'cindypsc',
      displayName: 'Cindy',
      history,
    });
    assert.match(html, /data-equipos-activity-history-modal/);
    assert.match(html, /lab-conflict-backdrop--stacked/);
    assert.match(html, /Historial de actividad/);
    assert.match(html, /@cindypsc · Cindy/);
    assert.match(html, /Sync/);
    assert.match(html, /Creado/);
    assert.match(html, /data-equipos-history-close/);
  });

  it('equiposActivityHistoryListHtml orders oldest to newest', () => {
    const html = equiposActivityHistoryListHtml(history);
    assert.ok(html.indexOf('Creado') < html.indexOf('Sync'));
  });
});
