import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_LAB_FP_INDEX_KEY,
  buildDirtyLabSidecarOpsForPatient,
  cloudLabSidecarFingerprint,
  coalesceLabSidecarOps,
  filterCloudLabSidecarOps,
  noteCloudLabSidecarOpsPushed,
  noteCloudLabSidecarOpsSent,
  noteCloudLabSidecarsFromState,
  shouldSkipCloudLabSidecarPush,
} from './cloud-lab-sidecar-index.mjs';

const meta = { actorId: 'user-1', updatedAt: '2026-08-09T12:00:00.000Z' };

describe('cloud-lab-sidecar-index', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      /** @type {Record<string, string>} */
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      },
    };
  });

  afterEach(() => {
    delete globalThis.localStorage;
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

  it('persists fingerprint index in localStorage', () => {
    noteCloudLabSidecarOpsPushed([
      {
        path: 'labSidecars/p1/x',
        value: { id: 'x', resLabs: ['x'] },
      },
    ]);
    assert.ok(globalThis.localStorage.getItem(CLOUD_LAB_FP_INDEX_KEY));
  });

  it('buildDirtyLabSidecarOpsForPatient reads fingerprint index once, not per set', () => {
    let getItemCalls = 0;
    const origGetItem = globalThis.localStorage.getItem.bind(globalThis.localStorage);
    globalThis.localStorage.getItem = function (key) {
      getItemCalls += 1;
      return origGetItem(key);
    };
    const labs = Array.from({ length: 20 }, (_, i) => ({
      id: `lab-${i}`,
      fecha: '2026-08-09',
      resLabs: [`K ${i}`],
    }));
    buildDirtyLabSidecarOpsForPatient('p1', labs, meta);
    assert.ok(getItemCalls <= 4, `expected O(1) localStorage reads, got ${getItemCalls}`);
  });
});
