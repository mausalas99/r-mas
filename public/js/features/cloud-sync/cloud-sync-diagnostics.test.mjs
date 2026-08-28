import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyCloudOpPath,
  clearCloudSyncDiagnostics,
  clearCloudSyncWsFaults,
  cloudSyncErrorCode,
  formatCloudDiagnosticsReport,
  getCloudSyncDiagnostics,
  hasActiveCloudNetworkFailure,
  noteCloudSyncCycle,
  noteCloudSyncTransport,
  noteCloudSyncWsLifecycle,
  noteCloudSyncWsSignal,
  recordCloudSyncError,
  recordCloudSyncTrace,
  redactCloudSecrets,
  summarizeCloudOutbox,
  isToxicCloudOutboxEntry,
} from './cloud-sync-diagnostics.mjs';

describe('cloud-sync-diagnostics', () => {
  it('summarizeCloudOutbox groups signos and pendientes', () => {
    const out = summarizeCloudOutbox([
      {
        clientMutationId: 'm1',
        enqueuedAt: Date.now() - 5000,
        ops: [
          { path: 'patients/p1/monitoreo', value: {} },
          { path: 'todos/t1', value: {} },
        ],
      },
    ]);
    assert.equal(out.count, 1);
    assert.equal(out.byKind.signos, 1);
    assert.equal(out.byKind.pendientes, 1);
    assert.equal(out.entries[0].opCount, 2);
  });

  it('summarizeCloudOutbox measures the quota-fitted size, not the raw stored value', () => {
    const bigResLabs = Array.from(
      { length: 6000 },
      (_, i) => `Linea de resultado de laboratorio numero ${i} con texto de relleno extra`
    );
    const out = summarizeCloudOutbox([
      {
        clientMutationId: 'labSidecars/p1',
        enqueuedAt: Date.now(),
        ops: [{ path: 'labSidecars/p1/lab-1', value: { id: 'lab-1', resLabs: bigResLabs } }],
      },
    ]);
    const raw = JSON.stringify({ id: 'lab-1', resLabs: bigResLabs }).length;
    assert.ok(raw > 150 * 1024, 'fixture must exceed the 150KB lab quota to be meaningful');
    // Trimmed to the 150KB lab quota (plus a little wrapper overhead) instead of
    // the untrimmed raw size — proves the reading matches what actually gets sent.
    assert.ok(out.entries[0].maxOpBytes < raw / 2);
  });

  it('isToxicCloudOutboxEntry flags legacy cloud-lab-backfill and fat rows', () => {
    assert.equal(
      isToxicCloudOutboxEntry({
        clientMutationId: 'cloud-lab-backfill',
        opCount: 41,
        totalBytes: 1000,
        maxOpBytes: 500,
      }),
      true
    );
    assert.equal(
      isToxicCloudOutboxEntry({
        clientMutationId: 'labSidecars/p1',
        opCount: 1,
        totalBytes: 250 * 1024,
        maxOpBytes: 250 * 1024,
      }),
      true
    );
    assert.equal(
      isToxicCloudOutboxEntry({
        clientMutationId: 'clinicalOps',
        opCount: 1,
        totalBytes: 1024,
        maxOpBytes: 1024,
      }),
      false
    );
  });

  it('classifyCloudOpPath covers common domains', () => {
    assert.equal(classifyCloudOpPath('patients/x/monitoreo'), 'signos');
    assert.equal(classifyCloudOpPath('todos/abc'), 'pendientes');
    assert.equal(classifyCloudOpPath('patients/x/fields'), 'censo');
    assert.equal(classifyCloudOpPath('clinicalOps'), 'clinicalOps');
    assert.equal(classifyCloudOpPath('labSidecars/p1/s1'), 'labs');
  });

  it('recordCloudSyncError keeps at most 8 entries', () => {
    clearCloudSyncDiagnostics();
    for (let i = 0; i < 10; i += 1) {
      recordCloudSyncError({ op: 'push', code: 'ERR', message: 'm' + i });
    }
    const diag = getCloudSyncDiagnostics();
    assert.equal(diag.lastErrors.length, 8);
    assert.equal(diag.lastErrors[0].message, 'm9');
  });

  it('recordCloudSyncTrace appears in diagnostics report', () => {
    clearCloudSyncDiagnostics();
    recordCloudSyncTrace('push', { clientMutationId: 'abc', opCount: 2 });
    const diag = getCloudSyncDiagnostics({ status: 'pending' });
    assert.equal(diag.syncTrace.length, 1);
    assert.equal(diag.syncTrace[0].boundary, 'push');
    const raw = formatCloudDiagnosticsReport(diag);
    assert.match(raw, /syncTrace/);
    assert.match(raw, /clientMutationId/);
  });

  it('includes transport and ws signal in snapshot', () => {
    clearCloudSyncDiagnostics();
    noteCloudSyncTransport('ws');
    noteCloudSyncWsSignal(42);
    const diag = getCloudSyncDiagnostics({ transport: 'ws' });
    assert.equal(diag.transport, 'ws');
    assert.ok(diag.lastWsSignalAt);
  });

  it('formatCloudDiagnosticsReport redacts bearer tokens', () => {
    recordCloudSyncError({
      op: 'push',
      code: '401',
      message: 'Bearer abc123secret failed',
    });
    const raw = formatCloudDiagnosticsReport(
      getCloudSyncDiagnostics({ tokenPresent: true, baseUrl: 'https://example.workers.dev' })
    );
    assert.ok(!raw.includes('abc123secret'));
    const redacted = redactCloudSecrets('{"token":"secret-token","Authorization":"Bearer xyz"}');
    assert.ok(!redacted.includes('secret-token'));
    assert.ok(!redacted.includes('xyz'));
    assert.match(redacted, /"token":"\*\*\*"/);
  });

  it('noteCloudSyncCycle(true) clears recorded errors', () => {
    clearCloudSyncDiagnostics();
    recordCloudSyncError({ op: 'push', code: 'ERR', message: 'falló' });
    noteCloudSyncCycle(false);
    assert.equal(getCloudSyncDiagnostics().lastErrors.length, 1);
    noteCloudSyncCycle(true);
    assert.equal(getCloudSyncDiagnostics().lastErrors.length, 0);
    assert.equal(getCloudSyncDiagnostics().lastCycleOk, true);
  });

  it('noteCloudSyncWsLifecycle open clears ws faults', () => {
    clearCloudSyncDiagnostics();
    noteCloudSyncWsLifecycle({ message: 'WebSocket error' });
    noteCloudSyncWsLifecycle({ code: 1006, reason: '' });
    assert.ok(getCloudSyncDiagnostics().lastWsError);
    assert.ok(getCloudSyncDiagnostics().lastWsClose);
    noteCloudSyncWsLifecycle({ url: 'wss://example/live', open: true });
    const diag = getCloudSyncDiagnostics();
    assert.equal(diag.lastWsError, null);
    assert.equal(diag.lastWsClose, null);
    clearCloudSyncWsFaults();
    assert.equal(getCloudSyncDiagnostics().lastWsClose, null);
  });

  it('cloudSyncErrorCode reads worker error codes', () => {
    assert.equal(cloudSyncErrorCode({ data: { error: 'revision_stale' }, status: 409 }), 'revision_stale');
    assert.equal(cloudSyncErrorCode({ status: 500 }), '500');
  });

  it('hasActiveCloudNetworkFailure detects failed fetch while sync is failing', () => {
    clearCloudSyncDiagnostics();
    recordCloudSyncError({ op: 'push', code: '', message: 'Failed to fetch' });
    noteCloudSyncCycle(false);
    assert.equal(hasActiveCloudNetworkFailure(), true);
    noteCloudSyncCycle(true);
    assert.equal(hasActiveCloudNetworkFailure(), false);
  });
});
