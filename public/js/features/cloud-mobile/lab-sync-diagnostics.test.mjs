import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  countLabOpsInPullResult,
  countLabSidecarsInState,
  recordLabPullApply,
  recordLabPullIngress,
  buildLabSyncDiagnosticsIssues,
  formatLabSyncDiagnosticsText,
  clearLabSyncDiagnostics,
} from './lab-sync-diagnostics.mjs';

describe('lab-sync-diagnostics', () => {
  beforeEach(() => {
    clearLabSyncDiagnostics();
  });

  it('countLabSidecarsInState tallies patients and sets', () => {
    const n = countLabSidecarsInState({
      labSidecars: {
        p1: { s1: { id: 's1' }, s2: { id: 's2' } },
        p2: { s3: { id: 's3' } },
      },
    });
    assert.deepEqual(n, { patients: 2, sets: 3 });
  });

  it('countLabOpsInPullResult reads snapshot sidecars', () => {
    const n = countLabOpsInPullResult({
      needSnapshot: true,
      state: { labSidecars: { p1: { a: {} } } },
    });
    assert.equal(n, 1);
  });

  it('issues flag missing lab payload on pull', () => {
    recordLabPullIngress({
      needSnapshot: true,
      revision: 5,
      opsCount: 0,
      labOpsInPayload: 0,
      rawSidecars: { patients: 0, sets: 0 },
      filteredSidecars: { patients: 0, sets: 0 },
    });
    const issues = buildLabSyncDiagnosticsIssues({ activePatientId: 'p1' });
    assert.ok(issues.some((line) => line.includes('no trajo labSidecars')));
  });

  it('prioritizes network failure over missing labSidecars hint', async () => {
    const diag = await import('../cloud-sync/cloud-sync-diagnostics.mjs');
    diag.clearCloudSyncErrors();
    diag.recordCloudSyncError({ op: 'push', code: '', message: 'Failed to fetch' });
    diag.noteCloudSyncCycle(false);
    recordLabPullIngress({
      needSnapshot: true,
      revision: 5,
      opsCount: 0,
      labOpsInPayload: 0,
      rawSidecars: { patients: 0, sets: 0 },
      filteredSidecars: { patients: 0, sets: 0 },
    });
    const issues = buildLabSyncDiagnosticsIssues({ activePatientId: 'p1' });
    assert.ok(issues.some((line) => line.includes('Sin contacto estable con Nube')));
    assert.ok(!issues.some((line) => line.includes('no trajo labSidecars')));
    diag.noteCloudSyncCycle(true);
    diag.clearCloudSyncErrors();
  });

  it('formatLabSyncDiagnosticsText includes revision and issues', () => {
    recordLabPullIngress({
      needSnapshot: false,
      revision: 12,
      opsCount: 2,
      labOpsInPayload: 1,
      rawSidecars: { patients: 1, sets: 1 },
      filteredSidecars: { patients: 1, sets: 1 },
    });
    recordLabPullApply({
      patientsUpdated: 1,
      labSetsReceived: 1,
      labSetsKeptAfterWindow: 1,
      activePatientId: 'p1',
    });
    const text = formatLabSyncDiagnosticsText({ activePatientId: 'p1' });
    assert.match(text, /R\+ Labs · diagnóstico Nube/);
    assert.match(text, /labOps=1/);
    assert.match(text, /Última aplicación/);
  });

  it('ensureLabMobileSyncDiagPanel no monta UI y limpia chrome legado', async () => {
    if (typeof document === 'undefined') return;
    const body = document.createElement('div');
    body.className = 'card-body';
    const legacy = document.createElement('div');
    legacy.id = 'lab-mobile-sync-diag';
    body.appendChild(legacy);
    document.body.appendChild(body);
    const { ensureLabMobileSyncDiagPanel } = await import('./lab-sync-diagnostics.mjs');
    assert.equal(ensureLabMobileSyncDiagPanel(), null);
    assert.equal(document.getElementById('lab-mobile-sync-diag'), null);
    body.remove();
  });
});
