import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCloudDiagnosticsHumanView,
  explainCloudErrorCode,
  explainWsCloseCode,
  formatCloudDiagWhen,
  humanizeCloudSyncError,
  parseWsClose,
} from './cloud-sync-diagnostics-human.mjs';

describe('cloud-sync-diagnostics-human', () => {
  it('parseWsClose reads JSON close payloads', () => {
    assert.deepEqual(parseWsClose('{"code":1006,"reason":""}'), { code: 1006, reason: '' });
    assert.deepEqual(parseWsClose(''), { code: 0, reason: '' });
  });

  it('explainWsCloseCode describes abnormal closure in Spanish', () => {
    const text = explainWsCloseCode(1006);
    assert.match(text, /sin aviso/i);
    assert.match(explainWsCloseCode(1008), /rechazó/i);
  });

  it('humanizeCloudSyncError maps worker codes', () => {
    const row = humanizeCloudSyncError({
      op: 'push',
      code: 'revision_stale',
      message: 'stale',
    });
    assert.equal(row.op, 'Envío a Nube');
    assert.match(row.explain, /desactualizada/i);
  });

  it('explainCloudErrorCode covers HTTP status fallbacks', () => {
    assert.match(explainCloudErrorCode('401'), /iniciar sesión/i);
    assert.match(explainCloudErrorCode('500'), /servidor/i);
  });

  it('formatCloudDiagWhen returns relative Spanish labels', () => {
    const now = Date.parse('2026-08-08T15:00:00.000Z');
    assert.equal(formatCloudDiagWhen('2026-08-08T14:59:40.000Z', now), 'ahora');
    assert.equal(formatCloudDiagWhen('2026-08-08T14:58:00.000Z', now), 'hace 2 min');
  });

  it('buildCloudDiagnosticsHumanView flags WS 1006 as info when on poll fallback and sync failing', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'error',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      revision: 42,
      transport: 'poll',
      lastWsClose: '{"code":1006,"reason":""}',
      lastCycleOk: false,
      outbox: { count: 0, byKind: {} },
    });
    const wsIssue = view.issues.find(function (item) {
      return item.title.includes('interrumpido');
    });
    assert.ok(wsIssue);
    assert.equal(wsIssue.severity, 'info');
  });

  it('buildCloudDiagnosticsHumanView hides stale WS 1006 when sync is healthy on poll', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'idle',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      revision: 42,
      transport: 'poll',
      lastWsClose: '{"code":1006,"reason":""}',
      lastCycleOk: true,
      outbox: { count: 0, byKind: {} },
    });
    assert.equal(view.verdict.level, 'ok');
    const wsIssue = view.issues.find(function (item) {
      return item.title.includes('interrumpido');
    });
    assert.equal(wsIssue, undefined);
  });

  it('buildCloudDiagnosticsHumanView hides stale lastErrors after sync recovered', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'idle',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      transport: 'poll',
      lastCycleOk: true,
      outbox: { count: 0, byKind: {} },
      lastErrors: [
        {
          at: '2026-08-08T14:00:00.000Z',
          op: 'cycle',
          code: '',
          message: 'Sin red hacia Nube',
        },
      ],
    });
    assert.equal(view.recentErrors.length, 0);
    assert.equal(
      view.issues.find(function (item) {
        return item.title === 'Error de sincronización';
      }),
      undefined
    );
  });

  it('buildCloudDiagnosticsHumanView is error when push failed and outbox pending', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'error',
      detail: 'No se pudo enviar',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      transport: 'poll',
      outbox: { count: 2, byKind: { signos: 2 } },
      lastErrors: [
        {
          at: '2026-08-08T14:00:00.000Z',
          op: 'push',
          code: 'revision_stale',
          message: 'stale',
        },
      ],
    });
    assert.equal(view.verdict.level, 'error');
    assert.match(view.verdict.headline, /problemas/i);
    assert.equal(view.recentErrors.length, 1);
    assert.equal(view.tiles.length, 6);
    assert.equal(view.pipeline.length, 4);
    assert.equal(view.outboxBreakdown.length, 1);
    assert.equal(view.outboxBreakdown[0].label, 'signos');
    const queueTile = view.tiles.find(function (tile) {
      return tile.id === 'queue';
    });
    assert.equal(queueTile.value, '2');
    assert.equal(queueTile.status, 'error');
  });

  it('buildCloudDiagnosticsHumanView dedupes repeated sync errors while failing', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'error',
      detail: 'Sin red hacia Nube',
      online: false,
      tokenPresent: true,
      roomId: 'room-1',
      transport: 'poll',
      lastCycleOk: false,
      outbox: { count: 4, byKind: { censo: 4 } },
      lastErrors: [
        {
          at: '2026-08-08T15:00:00.000Z',
          op: 'cycle',
          code: '',
          message: 'Sin red hacia Nube',
        },
        {
          at: '2026-08-08T14:59:00.000Z',
          op: 'cycle',
          code: '',
          message: 'Sin red hacia Nube',
        },
        {
          at: '2026-08-08T14:58:00.000Z',
          op: 'push',
          code: '',
          message: 'Sin red hacia Nube',
        },
      ],
    });
    assert.equal(view.recentErrors.length, 2);
    assert.equal(
      view.issues.filter(function (item) {
        return item.title === 'Error de sincronización';
      }).length,
      0
    );
    assert.equal(
      view.issues.filter(function (item) {
        return item.title === 'El último ciclo de sync falló';
      }).length,
      0
    );
  });

  it('buildCloudDiagnosticsHumanView flags unstable network when online is true', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'error',
      detail: 'Sin red hacia Nube. Revisa Wi‑Fi / VPN e inténtalo de nuevo.',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      transport: 'ws',
      lastCycleOk: false,
      outbox: { count: 1, byKind: { censo: 4 } },
      lastErrors: [
        {
          at: '2026-08-08T15:00:00.000Z',
          op: 'push',
          code: '',
          message: 'Failed to fetch',
        },
      ],
    });
    const networkIssue = view.issues.find(function (item) {
      return item.fixId === 'network_unreachable';
    });
    assert.ok(networkIssue);
    assert.equal(networkIssue.severity, 'error');
    assert.match(networkIssue.detail, /internet/i);
  });

  it('buildCloudDiagnosticsHumanView exposes live channel tile for ws reconnect', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'idle',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      revision: 100,
      transport: 'ws',
      lastWsClose: '{"code":1006,"reason":""}',
      outbox: { count: 0, byKind: {} },
    });
    const live = view.tiles.find(function (tile) {
      return tile.id === 'live';
    });
    assert.equal(live.value, 'Reconectando');
    assert.equal(live.status, 'warn');
  });
});
