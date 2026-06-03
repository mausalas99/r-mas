import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordLanSyncError,
  getLanSyncDiagnostics,
  formatDiagnosticsReport,
  redactLanSecrets,
} from './lan-sync-diagnostics.mjs';

describe('lan-sync-diagnostics', () => {
  it('getLanSyncDiagnostics returns plain object without secrets in fields', () => {
    const diag = getLanSyncDiagnostics({
      hostUrl: 'http://10.0.0.1:3738',
      pingAt: '2026-06-03T12:00:00.000Z',
      pingStatus: 200,
      wsSync: true,
      wsLive: false,
      roomId: 'sala-1',
      phase: 'live',
      bundleRevision: 3,
      outboxCount: 2,
      pinnedHost: 'http://10.0.0.1:3738',
      teamCodeAligned: true,
    });
    assert.equal(diag.hostUrl, 'http://10.0.0.1:3738');
    assert.equal(diag.phase, 'live');
    assert.equal(diag.outboxCount, 2);
    assert.ok(Array.isArray(diag.lastErrors));
  });

  it('recordLanSyncError keeps at most 5 entries', () => {
    for (let i = 0; i < 7; i += 1) {
      recordLanSyncError({ op: 'ping', code: 'ERR', message: 'm' + i });
    }
    const diag = getLanSyncDiagnostics();
    assert.equal(diag.lastErrors.length, 5);
    assert.equal(diag.lastErrors[0].message, 'm6');
    assert.equal(diag.lastErrors[4].message, 'm2');
  });

  it('formatDiagnosticsReport redacts Bearer and teamCode', () => {
    recordLanSyncError({
      op: 'fetch',
      code: '401',
      message: 'Bearer abc123secret token failed',
    });
    const raw = formatDiagnosticsReport(
      getLanSyncDiagnostics({
        hostUrl: 'http://192.168.1.5:3738',
        teamCode: 'should-not-appear',
      })
    );
    assert.ok(!raw.includes('abc123secret'));
    assert.ok(raw.includes('Bearer ***') || !/Bearer\s+[A-Za-z0-9]/i.test(raw));
    const redacted = redactLanSecrets(
      '{"teamCode":"super-secret-32chars-minimum-here","Authorization":"Bearer xyz"}'
    );
    assert.ok(!redacted.includes('super-secret'));
    assert.match(redacted, /teamCode.*\*\*\*/);
    assert.match(redacted, /Bearer \*\*\*/);
  });
});
