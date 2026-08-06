import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyCloudOpPath,
  clearCloudSyncDiagnostics,
  cloudSyncErrorCode,
  formatCloudDiagnosticsReport,
  getCloudSyncDiagnostics,
  recordCloudSyncError,
  recordCloudSyncTrace,
  redactCloudSecrets,
  summarizeCloudOutbox,
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

  it('classifyCloudOpPath covers common domains', () => {
    assert.equal(classifyCloudOpPath('patients/x/monitoreo'), 'signos');
    assert.equal(classifyCloudOpPath('todos/abc'), 'pendientes');
    assert.equal(classifyCloudOpPath('patients/x/fields'), 'censo');
    assert.equal(classifyCloudOpPath('clinicalOps'), 'clinicalOps');
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

  it('cloudSyncErrorCode reads worker error codes', () => {
    assert.equal(cloudSyncErrorCode({ data: { error: 'revision_stale' }, status: 409 }), 'revision_stale');
    assert.equal(cloudSyncErrorCode({ status: 500 }), '500');
  });
});
