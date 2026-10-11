import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyNeumoStudiesToPatient,
  fitNeumoStudiesToQuota,
  hasNeumoStudies,
  mergeNeumoStudies,
  neumoStudiesUpdatedAt,
} from './neumo-studies-sync.mjs';
import { mergeNeumoStudiesLww } from '../../../../cloud/sync-worker/src/neumoStudies-lww.js';
import { generateDek } from './crypto.mjs';
import { decryptOpsFromPull, encryptOpsForPush, isEncryptedContentPath } from './cloud-sync-crypto-wire.mjs';
import { mapPatientEntryToCloudBundleOps, pickCensusFields } from './mutate-bridge-ops.mjs';
import { opsToLanEntries } from './pull-apply-state.mjs';
import { slimCloudOp } from './cloud-op-slim.mjs';

const T1 = '2026-10-07T08:00:00.000Z';
const T2 = '2026-10-07T09:00:00.000Z';
const NOW = '2026-10-07T12:00:00.000Z';
const study = (id, date, updatedAt, extra = {}) => ({ id, date, inputs: { fev1: 2.1 }, result: { pattern: 'normal' }, engine: 'abc', updatedAt, ...extra });
const path = 'entries/p1/neumoStudies';

describe('neumoStudies client merge', () => {
  it('matches the Worker merge on the same cases', () => {
    const cases = [
      [{ spirometry: [study('a', '2026-10-05', T1)] }, { spirometry: [study('b', '2026-10-04', T2)], pleural: [study('c', '2026-10-06', T1)] }],
      [{ spirometry: [study('a', '2026-10-05', T2)] }, { spirometry: [study('a', '2026-10-05', T1, { result: {} })] }],
      [{ pleural: [study('p', '2026-10-05', T1)] }, { pleural: [study('p', '2026-10-05', T1, { deleted: true })] }],
      [{ pleural: [study('n', '2026-10-05', undefined)] }, { pleural: [study('n', '2026-10-05', T1, { deleted: true })] }],
    ];
    for (const [a, b] of cases) assert.deepEqual(mergeNeumoStudies(a, b), mergeNeumoStudiesLww(a, b));
  });

  it('tie keeps local; missing updatedAt loses; tombstone wins when newer', () => {
    const local = { spirometry: [study('a', '2026-10-05', T1, { result: { mine: 1 } }), study('n', '2026-10-06', undefined)], pleural: [study('p', '2026-10-01', T1)] };
    const incoming = { spirometry: [study('a', '2026-10-05', T1), study('n', '2026-10-06', T1)], pleural: [study('p', '2026-10-01', T2, { deleted: true })] };
    const m = mergeNeumoStudies(local, incoming);
    assert.deepEqual(m.spirometry[0].result, { mine: 1 });
    assert.equal(m.spirometry[1].updatedAt, T1);
    assert.equal(m.pleural[0].deleted, true);
  });

  it('op clock is the newest study, epoch when none', () => {
    assert.equal(neumoStudiesUpdatedAt({ spirometry: [study('a', 'x', T1)], pleural: [study('b', 'y', T2)] }), T2);
    assert.equal(neumoStudiesUpdatedAt({ spirometry: [], pleural: [] }), '1970-01-01T00:00:00.000Z');
    assert.equal(hasNeumoStudies({ spirometry: [], pleural: [] }), false);
  });
});

describe('neumoStudies pull', () => {
  it('never loses a local study and asks for a re-push when the room lacks one', () => {
    const patient = { id: 'p1', neumoStudies: { spirometry: [study('local', '2026-10-01', T1)], pleural: [] } };
    const r = applyNeumoStudiesToPatient(patient, { spirometry: [study('room', '2026-10-02', T2)], pleural: [] }, NOW);
    assert.deepEqual(r, { changed: true, repush: true });
    assert.deepEqual(patient.neumoStudies.spirometry.map((s) => s.id), ['local', 'room']);
    assert.equal(patient.neumoStudies.spirometry[0].updatedAt, NOW, 'local-only study re-stamped so the union op wins');
    assert.ok(neumoStudiesUpdatedAt(patient.neumoStudies) > T2);
    const again = applyNeumoStudiesToPatient(patient, patient.neumoStudies, NOW);
    assert.deepEqual(again, { changed: false, repush: false });
  });

  it('skips ciphertext it cannot read', () => {
    const patient = { id: 'p1', neumoStudies: { spirometry: [study('a', 'd', T1)], pleural: [] } };
    const r = applyNeumoStudiesToPatient(patient, { enc: 1, iv: 'x', ct: 'y' });
    assert.deepEqual(r, { changed: false, repush: false });
    assert.equal(patient.neumoStudies.spirometry.length, 1);
  });

  it('folds two ops in one pull by id instead of keeping only the last', () => {
    const [entry] = opsToLanEntries([
      { path, value: { spirometry: [study('a', '2026-10-01', T1)], pleural: [] }, updatedAt: T1, actorId: 'iphone' },
      { path, value: { spirometry: [study('b', '2026-10-02', T2)], pleural: [] }, updatedAt: T2, actorId: 'desktop' },
    ]);
    assert.deepEqual(entry.patient.neumoStudies.spirometry.map((s) => s.id), ['a', 'b']);
  });
});

describe('neumoStudies push', () => {
  it('emits the full value with the newest study clock, never inside fields', () => {
    const patient = { id: 'p1', nombre: 'Sintético', lanUpdatedAt: T1, neumoStudies: { spirometry: [study('a', '2026-10-01', T2)], pleural: [] } };
    const ops = mapPatientEntryToCloudBundleOps({ patient }, { actorId: 'desktop', updatedAt: NOW });
    const op = ops.find((o) => o.path === path);
    assert.equal(op.updatedAt, T2);
    assert.deepEqual(op.value, patient.neumoStudies);
    assert.equal('neumoStudies' in pickCensusFields(patient), false);
    const none = mapPatientEntryToCloudBundleOps({ patient: { id: 'p1', lanUpdatedAt: T1 } }, { actorId: 'desktop', updatedAt: NOW });
    assert.equal(none.some((o) => o.path === path), false);
  });

  it('drops the oldest studies from the op to fit, never locally', () => {
    const big = 'x'.repeat(40 * 1024);
    const value = {
      spirometry: [study('s1', '2026-01-01', T1, { inputs: { big } }), study('s3', '2026-03-01', T1, { inputs: { big } })],
      pleural: [study('p2', '2026-02-01', T1, { inputs: { big } }), study('p4', '2026-04-01', T1, { inputs: { big } })],
    };
    const fitted = fitNeumoStudiesToQuota(value);
    assert.deepEqual(fitted.spirometry.map((s) => s.id), ['s3']);
    assert.deepEqual(fitted.pleural.map((s) => s.id), ['p2', 'p4']);
    assert.equal(value.spirometry.length, 2);
    assert.deepEqual(slimCloudOp({ path, value }).value, fitted);
  });

  it('is encrypted with a room DEK and round-trips', async () => {
    assert.equal(isEncryptedContentPath(path), true);
    const dek = await generateDek();
    const value = { spirometry: [study('a', '2026-10-01', T1)], pleural: [] };
    const [enc] = await encryptOpsForPush(dek, [{ path, value, updatedAt: T1, actorId: 'desktop' }]);
    assert.equal(enc.value.enc, 1);
    assert.equal(JSON.stringify(enc.value).includes('fev1'), false);
    const [dec] = await decryptOpsFromPull(dek, [enc]);
    assert.deepEqual(dec.value, value);
  });
});
