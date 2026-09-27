import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCloudDiagnosticsHumanView } from './cloud-sync-diagnostics-human.mjs';

describe('cloud-sync-diagnostics-human', () => {
  it('buildCloudDiagnosticsHumanView hides stale WS 1006 issue when sync is healthy on poll, but still flags the channel as down', () => {
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
    // A live room always wants a WS — sitting on poll means the channel is
    // down/reconnecting, so the overall verdict must not read as green.
    assert.equal(view.verdict.level, 'warn');
    assert.match(view.verdict.headline, /sin canal en vivo/i);
    const wsIssue = view.issues.find(function (item) {
      return item.title.includes('interrumpido');
    });
    assert.equal(wsIssue, undefined);
  });

});
