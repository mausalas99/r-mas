import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyOps, emptyState } from '../../../../cloud/sync-worker/src/lww.js';
import {
  buildPatientAdmitOpsForCloud,
  buildRestoredPatientOps,
  partitionPatientEntriesByOperationalSala,
  resolveOperationalPatientSala,
} from './cloud-census-sala-push.mjs';

describe('cloud-census-sala-push', () => {
  it('resolveOperationalPatientSala prefers team assignment over stale patient.sala', () => {
    const context = {
      teams: [{ team_id: 't-airon', sala: 'Sala E' }],
      assignments: [
        { patient_id: 'p1', team_id: 't-airon', effective_at: '2026-08-01T00:00:00Z' },
      ],
      now: '2026-08-10T12:00:00Z',
    };
    assert.equal(
      resolveOperationalPatientSala({ id: 'p1', sala: 'Sala 2' }, context),
      'Sala E'
    );
  });

  it('partitionPatientEntriesByOperationalSala splits cross-sala entries', () => {
    const entries = [
      { patient: { id: 'p1', sala: 'Sala 2' } },
      { patient: { id: 'p2', sala: 'Sala E' } },
      { patient: { id: 'p3', sala: 'Sala E' } },
    ];
    const { active, crossBySala } = partitionPatientEntriesByOperationalSala(entries, 'Sala 2');
    assert.equal(active.length, 1);
    assert.equal(active[0].patient.id, 'p1');
    assert.equal(crossBySala.get('Sala E')?.length, 2);
  });

  it('buildPatientAdmitOpsForCloud emits fields and registro ops', () => {
    const ops = buildPatientAdmitOpsForCloud(
      {
        id: 'p1',
        nombre: 'TEST',
        registro: '123',
        lanUpdatedAt: '2026-08-10T10:00:00.000Z',
      },
      'actor-1'
    );
    assert.ok(ops.some((op) => String(op.path).includes('/fields')));
    assert.ok(ops.some((op) => op.path === 'entries/p1' && op.value?.registro === '123'));
  });

  it('undo of a delete: restored chart clears the room tombstone and brings labs back', async () => {
    const T0 = '2026-09-27T10:00:00.000Z';
    const patient = { id: 'p1', nombre: 'SINTETICO', registro: '9000013-4', lanUpdatedAt: T0 };
    const labs = [{ id: 'set1', fecha: T0, resultados: { Hb: 12 } }];
    let s = emptyState();
    // Room before the delete: chart + one lab set, all on the chart's own clock.
    ({ state: s } = applyOps(s, await buildRestoredPatientOps(patient, labs, 'a', T0)));
    ({ state: s } = applyOps(s, [
      { path: 'tombstones/p1', value: { deletedAt: '2026-09-27T10:05:00.000Z' }, updatedAt: '2026-09-27T10:05:00.000Z', actorId: 'a' },
    ]));
    assert.ok(s.tombstones.p1);
    assert.equal(s.labSidecars.p1, undefined);

    // Undo restores the old local copy (old clocks); push it with a fresh stamp.
    const ops = await buildRestoredPatientOps(patient, labs, 'a', '2026-09-27T10:10:00.000Z');
    ({ state: s } = applyOps(s, ops));
    assert.equal(s.tombstones.p1, undefined);
    assert.equal(s.entries.find((e) => e.id === 'p1')?.fields?.nombre, 'SINTETICO');
    assert.ok(s.labSidecars.p1?.set1, 'lab set pushed again despite fingerprint index');
  });
});
