import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  __resetLabSidecarIndexForTests,
  buildDirtyLabSidecarOpsForPatient,
  cloudLabSidecarFingerprint,
  coalesceLabSidecarOps,
  filterCloudLabSidecarOps,
  noteCloudLabSidecarOpsPushed,
  noteCloudLabSidecarOpsSent,
  noteCloudLabSidecarsFromState,
  readLabFingerprintIndex,
  shouldSkipCloudLabSidecarPush,
} from './cloud-lab-sidecar-index.mjs';

const meta = { actorId: 'user-1', updatedAt: '2026-08-09T12:00:00.000Z' };

describe('cloud-lab-sidecar-index', () => {
  beforeEach(() => {
    __resetLabSidecarIndexForTests();
  });

  it('fingerprint ignores non-SOME paste and matches slim payload', () => {
    const fp = cloudLabSidecarFingerprint({
      id: 'lab-1',
      fecha: '2026-08-09',
      resLabs: ['Hb 12'],
      sourceText: 'RAW',
    });
    const fp2 = cloudLabSidecarFingerprint({
      id: 'lab-1',
      fecha: '2026-08-09',
      resLabs: ['Hb 12'],
      sourceText: 'OTHER RAW',
    });
    assert.equal(fp, fp2);
  });

  it('fingerprint includes SOME sourceText', () => {
    const some =
      'Expediente: 1\nNombre: Ana\nFecha Registro: 03/08/2026 08:00\nHEMATOLOGÍA\n';
    const fp = cloudLabSidecarFingerprint({
      id: 'lab-1',
      fecha: '2026-08-09',
      resLabs: ['Hb 12'],
      sourceText: some,
    });
    const fp2 = cloudLabSidecarFingerprint({
      id: 'lab-1',
      fecha: '2026-08-09',
      resLabs: ['Hb 12'],
      sourceText: some + 'QS\n',
    });
    assert.notEqual(fp, fp2);
  });

  it('shouldSkipCloudLabSidecarPush after pull index', () => {
    const set = { id: 'lab-1', fecha: '2026-08-09', resLabs: ['Na 140'] };
    assert.equal(shouldSkipCloudLabSidecarPush('p1', set, 'lab-1'), false);
    noteCloudLabSidecarsFromState({
      labSidecars: { p1: { 'lab-1': set } },
    });
    assert.equal(shouldSkipCloudLabSidecarPush('p1', set, 'lab-1'), true);
  });

  it('buildDirtyLabSidecarOpsForPatient skips unchanged sets', () => {
    const set = { id: 'lab-1', fecha: '2026-08-09', resLabs: ['K 4.0'] };
    noteCloudLabSidecarsFromState({ labSidecars: { p1: { 'lab-1': set } } });
    const ops = buildDirtyLabSidecarOpsForPatient('p1', [set, { id: 'lab-2', fecha: '2026-08-08', resLabs: ['Hb 11'] }], meta);
    assert.equal(ops.length, 1);
    assert.equal(ops[0].path, 'labSidecars/p1/lab-2');
  });

  it('coalesceLabSidecarOps keeps latest updatedAt per path', () => {
    const ops = coalesceLabSidecarOps([
      { path: 'labSidecars/p1/a', value: { id: 'a', resLabs: ['1'] }, updatedAt: '2026-08-01T10:00:00.000Z' },
      { path: 'entries/p1/fields', value: { nombre: 'X' }, updatedAt: '2026-08-01T10:00:00.000Z' },
      { path: 'labSidecars/p1/a', value: { id: 'a', resLabs: ['2'] }, updatedAt: '2026-08-02T10:00:00.000Z' },
    ]);
    assert.equal(ops.length, 2);
    const lab = ops.find((op) => op.path === 'labSidecars/p1/a');
    assert.equal(lab?.value?.resLabs?.[0], '2');
  });

  it('filterCloudLabSidecarOps drops ops already in index', () => {
    const op = {
      path: 'labSidecars/p1/lab-1',
      value: { id: 'lab-1', fecha: '2026-08-09', resLabs: ['Ca 9'] },
      updatedAt: meta.updatedAt,
      actorId: meta.actorId,
    };
    noteCloudLabSidecarOpsPushed([op]);
    const kept = filterCloudLabSidecarOps([op, { path: 'entries/p1/fields', value: { nombre: 'Y' } }]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].path, 'entries/p1/fields');
  });

  it('noteCloudLabSidecarOpsSent fingerprints the pre-trim value, not the sent (trimmed) one', () => {
    // A heavy lab set: sanitizeOpsForCloudPush would trim resLabs to fit quota
    // before sending, but the fingerprint must be noted from the ORIGINAL
    // value so it matches what filterCloudLabSidecarOps computes next time
    // (it always reads the full, untrimmed set fresh from labHistory).
    const original = {
      path: 'labSidecars/p1/lab-1',
      value: { id: 'lab-1', fecha: '2026-08-09', resLabs: ['Hb 12', 'Na 140'] },
      updatedAt: meta.updatedAt,
      actorId: meta.actorId,
    };
    const sent = {
      ...original,
      value: { id: 'lab-1', fecha: '2026-08-09', resLabs: ['Hb 12'] }, // trimmed by quota fit
    };
    noteCloudLabSidecarOpsSent([original], [sent]);
    const kept = filterCloudLabSidecarOps([original]);
    assert.equal(kept.length, 0, 'unchanged set must not resurface after being sent trimmed');
  });

  it('persists the fingerprint index', () => {
    noteCloudLabSidecarOpsPushed([
      {
        path: 'labSidecars/p1/x',
        value: { id: 'x', resLabs: ['x'] },
      },
    ]);
    assert.ok('labSidecars/p1/x' in readLabFingerprintIndex());
  });

  it('evicts oldest entries once the index passes ~1MB so it can never alone bloat unbounded', () => {
    const big = 'x'.repeat(2000);
    for (let i = 0; i < 700; i += 1) {
      noteCloudLabSidecarOpsPushed([
        { path: `labSidecars/p${i}/set-${i}`, value: { id: `set-${i}`, resLabs: [big] } },
      ]);
    }
    const idx = readLabFingerprintIndex();
    assert.ok(JSON.stringify(idx).length <= 1_000_000, 'index must stay under the byte budget');
    assert.ok(!('labSidecars/p0/set-0' in idx), 'oldest entry should have been evicted');
    assert.ok('labSidecars/p699/set-699' in idx, 'newest entry should survive');
  });

  it('buildDirtyLabSidecarOpsForPatient computes the right dirty set for a full patient batch', () => {
    const labs = Array.from({ length: 20 }, (_, i) => ({
      id: `lab-${i}`,
      fecha: '2026-08-09',
      resLabs: [`K ${i}`],
    }));
    const ops = buildDirtyLabSidecarOpsForPatient('p1', labs, meta);
    assert.equal(ops.length, 20, 'none synced yet, so all 20 sets are dirty');
  });
});
