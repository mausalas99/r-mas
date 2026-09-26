import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cloudHeaderSyncModifier, cloudHeaderStateWords } from './cloud-sync-header-chrome.mjs';
import { nubePopoverHtml } from './panel-conexion-html.mjs';

describe('cloud-sync-header-chrome', () => {
  it('cloudHeaderSyncModifier maps runtime states to header classes', () => {
    assert.equal(cloudHeaderSyncModifier('idle', 'ws'), 'live');
    assert.equal(cloudHeaderSyncModifier('idle', 'poll'), 'local');
    assert.equal(cloudHeaderSyncModifier('syncing', 'ws'), 'syncing');
    assert.equal(cloudHeaderSyncModifier('pending', 'poll'), 'degraded');
    assert.equal(cloudHeaderSyncModifier('reconnecting', 'poll'), 'degraded');
    // No contact at all gets its own red-square state.
    assert.equal(cloudHeaderSyncModifier('error', 'ws'), 'offline');
    assert.equal(cloudHeaderSyncModifier('offline', 'poll'), 'offline');
  });

  it('state words never fall back to a raw status key', () => {
    assert.equal(cloudHeaderStateWords('idle'), 'Todo al día');
    assert.equal(cloudHeaderStateWords('reconnecting'), 'Reconectando');
    assert.equal(cloudHeaderStateWords('nonsense'), 'Todo al día');
  });

  it('popover (board «Nube C»): state, sala + code, 3 stats, Sincronizar and Abrir panel', () => {
    const now = Date.parse('2026-09-26T12:00:00Z');
    const html = nubePopoverHtml({
      status: 'idle',
      room: { sala: 'Sala 2', turnKey: '2026-09', code: 'CUC24G', memberCount: 17 },
      pending: 0,
      lastPushAt: '2026-09-26T11:59:00Z',
      lastPullAt: '2026-09-26T11:59:50Z',
      now,
      formatWhen: (iso) => (iso ? 'hace X' : '—'),
      stateWords: cloudHeaderStateWords,
      modifier: cloudHeaderSyncModifier,
    });
    assert.match(html, /nube-pop-title">Todo al día</);
    assert.match(html, /<b>Sala 2<\/b><span>Septiembre 2026 · 17 miembros<\/span>/);
    assert.match(html, />CUC24G</);
    assert.deepEqual([...html.matchAll(/nube-pop-stat"><span>([^<]+)</g)].map((m) => m[1]), ['En espera', 'Envío', 'Descarga']);
    assert.match(html, /data-nube-pop="sync">Sincronizar</);
    assert.match(html, /data-nube-pop="open-panel">Abrir panel</);
    assert.equal((html.match(/cloud-sync-btn--primary/g) || []).length, 1);
  });
});
