import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyOps, emptyState } from './lww.js';
import { QUOTAS } from './quotas.js';

describe('applyOps LWW', () => {
  it('newer updatedAt wins same path', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/note',
        value: { texto: 'old' },
        updatedAt: '2026-08-01T10:00:00.000Z',
        actorId: 'a',
      },
    ]));
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/note',
        value: { texto: 'new' },
        updatedAt: '2026-08-01T11:00:00.000Z',
        actorId: 'b',
      },
    ]));
    assert.equal(s.entries.find((e) => e.id === 'p1').note.texto, 'new');
  });

  it('todo delete with fresh clock wins; same clock as upsert is stale', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'todos/t1',
        value: { id: 't1', patientId: 'p1', text: 'lab' },
        updatedAt: '2026-08-07T10:00:00.000Z',
        actorId: 'a',
      },
    ]));
    const staleDelete = applyOps(s, [
      {
        path: 'todos/t1',
        value: { id: 't1', patientId: 'p1', _deleted: true, updatedAt: '2026-08-07T10:00:00.000Z' },
        updatedAt: '2026-08-07T10:00:00.000Z',
        actorId: 'a',
      },
    ]);
    assert.equal(staleDelete.rejected.length, 1);
    assert.equal(staleDelete.rejected[0].reason, 'stale');
    assert.equal(staleDelete.state.todos.t1._deleted, undefined);

    ({ state: s } = applyOps(s, [
      {
        path: 'todos/t1',
        value: {
          id: 't1',
          patientId: 'p1',
          _deleted: true,
          updatedAt: '2026-08-07T10:00:01.000Z',
        },
        updatedAt: '2026-08-07T10:00:01.000Z',
        actorId: 'b',
      },
    ]));
    assert.equal(s.todos.t1._deleted, true);
  });

  it('lab sidecar append is uncapped', () => {
    let s = emptyState();
    for (let i = 0; i < 25; i++) {
      ({ state: s } = applyOps(s, [
        {
          path: `labSidecars/p1/${i}`,
          value: {
            setAt: `2026-08-01T${String(i).padStart(2, '0')}:00:00.000Z`,
            resLabs: [],
          },
          updatedAt: `2026-08-01T${String(i).padStart(2, '0')}:00:00.000Z`,
          actorId: 'a',
        },
      ]));
    }
    assert.equal(Object.keys(s.labSidecars.p1 || {}).length, 25);
  });

  it('applies eventualidades entry path', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/eventualidades',
        value: {
          entries: [{ id: 'ev_b', text: 'KEEP' }],
          deletedIds: { ev_a: '2026-08-03T12:00:00.000Z' },
        },
        updatedAt: '2026-08-03T12:00:00.000Z',
        actorId: 'a',
      },
    ]));
    const row = s.entries.find((e) => e.id === 'p1');
    assert.equal(row.eventualidades.entries[0].id, 'ev_b');
    assert.ok(row.eventualidades.deletedIds.ev_a);
  });

  it('applies monitoreo entry path independent of fields', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/fields',
        value: { nombre: 'PAC', cuarto: '412' },
        updatedAt: '2026-08-03T10:30:00.000Z',
        actorId: 'a',
      },
      {
        path: 'entries/p1/monitoreo',
        value: { estadoClinico: { four: '15' }, estadoClinicoUpdatedAt: '2026-08-03T11:00:00.000Z' },
        updatedAt: '2026-08-03T11:00:00.000Z',
        actorId: 'a',
      },
    ]));
    const staleFields = applyOps(s, [
      {
        path: 'entries/p1/fields',
        value: { nombre: 'PAC', cuarto: '100' },
        updatedAt: '2026-08-03T10:00:00.000Z',
        actorId: 'b',
      },
    ]);
    assert.equal(staleFields.rejected.length, 1);
    s = staleFields.state;
    const row = s.entries.find((e) => e.id === 'p1');
    assert.equal(row.fields.cuarto, '412');
    assert.equal(row.monitoreo.estadoClinico.four, '15');
  });

  it('rejects 51st distinct patient entry via rejected flag', () => {
    let s = emptyState();
    for (let i = 0; i < QUOTAS.maxLivePatients; i++) {
      ({ state: s } = applyOps(s, [
        {
          path: `entries/p${i}`,
          value: { id: `p${i}`, nombre: `Paciente ${i}` },
          updatedAt: '2026-08-01T10:00:00.000Z',
          actorId: 'a',
        },
      ]));
    }
    assert.equal(s.entries.length, QUOTAS.maxLivePatients);

    const result = applyOps(s, [
      {
        path: 'entries/p-overflow',
        value: { id: 'p-overflow', nombre: 'Overflow' },
        updatedAt: '2026-08-01T11:00:00.000Z',
        actorId: 'a',
      },
    ]);
    assert.equal(result.applied.length, 0);
    assert.equal(result.rejected.length, 1);
    assert.equal(result.rejected[0].reason, 'quota_exceeded');
    assert.equal(result.state.entries.length, QUOTAS.maxLivePatients);
  });

  it('tombstone wipes entry and blocks stale sidecar/todo sync', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/fields',
        value: { nombre: 'BORRAR', registro: '2166042-4' },
        updatedAt: '2026-08-05T10:00:00.000Z',
        actorId: 'a',
      },
      {
        path: 'labSidecars/p1/set1',
        value: { setAt: '2026-08-05T09:00:00.000Z', resLabs: [] },
        updatedAt: '2026-08-05T09:00:00.000Z',
        actorId: 'a',
      },
      {
        path: 'todos/t1',
        value: { id: 't1', patientId: 'p1', text: 'pendiente' },
        updatedAt: '2026-08-05T10:00:00.000Z',
        actorId: 'a',
      },
      {
        path: 'agenda/a1',
        value: { id: 'a1', patientId: 'p1', title: 'US' },
        updatedAt: '2026-08-05T10:00:00.000Z',
        actorId: 'a',
      },
    ]));
    assert.equal(s.entries.length, 1);
    assert.ok(s.labSidecars.p1);
    assert.ok(s.todos.t1);
    assert.equal(s.agenda.length, 1);

    ({ state: s } = applyOps(s, [
      {
        path: 'tombstones/p1',
        value: { registro: '2166042-4', deletedAt: '2026-08-05T12:00:00.000Z' },
        updatedAt: '2026-08-05T12:00:00.000Z',
        actorId: 'a',
      },
    ]));
    assert.equal(s.entries.length, 0);
    assert.equal(s.labSidecars.p1, undefined);
    assert.equal(s.todos.t1, undefined);
    assert.equal(s.agenda.length, 0);
    assert.equal(s.tombstones.p1.registro, '2166042-4');
    assert.equal(s.tombstones.p1.actorId, 'a');

    ({ state: s } = applyOps(s, [
      {
        path: 'labSidecars/p1/set2',
        value: { setAt: '2026-08-05T11:00:00.000Z' },
        updatedAt: '2026-08-05T11:00:00.000Z',
        actorId: 'a',
      },
      {
        path: 'todos/t2',
        value: { id: 't2', patientId: 'p1', text: 'no' },
        updatedAt: '2026-08-05T11:00:00.000Z',
        actorId: 'a',
      },
    ]));
    assert.equal(s.entries.length, 0);
    assert.equal(s.labSidecars.p1, undefined);
    assert.equal(s.todos.t2, undefined);
  });

  it('any actor may re-admit after tombstone with newer entry op', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/fields',
        value: { nombre: 'BORRAR', registro: '2166042-4' },
        updatedAt: '2026-08-05T10:00:00.000Z',
        actorId: 'a',
      },
      {
        path: 'tombstones/p1',
        value: { registro: '2166042-4', deletedAt: '2026-08-05T12:00:00.000Z' },
        updatedAt: '2026-08-05T12:00:00.000Z',
        actorId: 'a',
      },
    ]));
    assert.equal(s.entries.length, 0);
    assert.ok(s.tombstones.p1);

    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/fields',
        value: { nombre: 'REINGRESO', registro: '2166042-4' },
        updatedAt: '2026-08-05T13:00:00.000Z',
        actorId: 'a',
      },
    ]));
    assert.equal(s.entries.length, 1);
    assert.equal(s.entries[0].fields.nombre, 'REINGRESO');
    assert.equal(s.tombstones.p1, undefined);
  });

  it('all-stale ops keep the same state object (no snapshot clone)', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'labSidecars/p1/s1',
        value: { id: 's1' },
        updatedAt: '2026-08-14T10:00:00.000Z',
        actorId: 'a',
      },
    ]));
    const stale = applyOps(s, [
      {
        path: 'labSidecars/p1/s1',
        value: { id: 's1', resLabs: ['ignored'] },
        updatedAt: '2026-08-14T09:00:00.000Z',
        actorId: 'b',
      },
    ]);
    assert.equal(stale.applied.length, 0);
    assert.equal(stale.rejected.length, 1);
    assert.equal(stale.rejected[0].reason, 'stale');
    assert.equal(stale.state, s);
  });

  it('clinicalOps join snapshot without assignments keeps peer patient_team_assignment', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'clinicalOps',
        value: {
          teams: [{ team_id: 't1', name: 'A', sala: 'Sala 1' }],
          team_membership: [{ team_id: 't1', user_id: 'u-a' }],
          patient_team_assignment: [
            {
              patient_id: 'p1',
              team_id: 't1',
              effective_at: '2026-08-13T10:00:00.000Z',
            },
          ],
        },
        updatedAt: '2026-08-13T10:00:00.000Z',
        actorId: 'u-a',
      },
    ]));
    ({ state: s } = applyOps(s, [
      {
        path: 'clinicalOps',
        value: {
          teams: [{ team_id: 't1', name: 'A', sala: 'Sala 1' }],
          team_membership: [{ team_id: 't1', user_id: 'u-b' }],
          patient_team_assignment: [],
        },
        updatedAt: '2026-08-13T18:00:00.000Z',
        actorId: 'u-b',
      },
    ]));
    const assignments = s.clinicalOps?.patient_team_assignment || [];
    assert.equal(assignments.length, 1);
    assert.equal(assignments[0].patient_id, 'p1');
    assert.equal(assignments[0].team_id, 't1');
    const members = s.clinicalOps?.team_membership || [];
    assert.equal(members.length, 2);
    assert.ok(members.some((row) => row.user_id === 'u-a'));
    assert.ok(members.some((row) => row.user_id === 'u-b'));
  });

  it('encrypted clinicalOps envelope stored as-is without merge', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'clinicalOps',
        value: { teams: [{ team_id: 't1' }], patient_team_assignment: [{ patient_id: 'p1', team_id: 't1' }] },
        updatedAt: '2026-08-13T10:00:00.000Z',
        actorId: 'u-a',
      },
    ]));
    const envelope = { enc: 1, alg: 'A256GCM', iv: 'aaaaaa', ct: 'ciphertext' };
    ({ state: s } = applyOps(s, [
      {
        path: 'clinicalOps',
        value: envelope,
        updatedAt: '2026-08-14T10:00:00.000Z',
        actorId: 'u-b',
      },
    ]));
    assert.deepEqual(s.clinicalOps, envelope);
  });

  it('encrypted clinicalOps LWW: newer timestamp wins', () => {
    let s = emptyState();
    const old = { enc: 1, alg: 'A256GCM', iv: 'old', ct: 'old-ct' };
    const fresh = { enc: 1, alg: 'A256GCM', iv: 'new', ct: 'new-ct' };
    ({ state: s } = applyOps(s, [
      { path: 'clinicalOps', value: old, updatedAt: '2026-08-14T08:00:00.000Z', actorId: 'u-a' },
    ]));
    ({ state: s } = applyOps(s, [
      { path: 'clinicalOps', value: fresh, updatedAt: '2026-08-14T09:00:00.000Z', actorId: 'u-b' },
    ]));
    assert.deepEqual(s.clinicalOps, fresh);
    // stale push must not overwrite
    ({ state: s } = applyOps(s, [
      { path: 'clinicalOps', value: old, updatedAt: '2026-08-14T08:00:00.000Z', actorId: 'u-a' },
    ]));
    assert.deepEqual(s.clinicalOps, fresh);
  });

  it('new patient id with same registro clears tombstone on re-admit', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'tombstones/p-old',
        value: { registro: '8888-1', deletedAt: '2026-08-05T12:00:00.000Z' },
        updatedAt: '2026-08-05T12:00:00.000Z',
        actorId: 'admin',
      },
    ]));
    assert.ok(s.tombstones['p-old']);

    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p-new/fields',
        value: { nombre: 'NUEVO', registro: '8888-1' },
        updatedAt: '2026-08-05T13:00:00.000Z',
        actorId: 'a',
      },
    ]));
    assert.equal(s.entries.length, 1);
    assert.equal(s.entries[0].id, 'p-new');
    assert.equal(s.tombstones['p-old'], undefined);
  });

  it('monitoreo merges historial by id instead of the newer push wiping the older one', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/monitoreo',
        value: {
          historial: [
            { id: 'm1', recordedAt: '2026-08-01T08:00:00.000Z', tas: 120 },
            { id: 'm2', recordedAt: '2026-08-01T09:00:00.000Z', tas: 122 },
          ],
        },
        updatedAt: '2026-08-01T09:00:00.000Z',
        actorId: 'desktop',
      },
    ]));
    // iPad pushes later with a newer clock but a shorter local history (only today's reading).
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/monitoreo',
        value: {
          historial: [{ id: 'm3', recordedAt: '2026-08-01T10:00:00.000Z', tas: 118 }],
        },
        updatedAt: '2026-08-01T10:00:00.000Z',
        actorId: 'ipad',
      },
    ]));
    const ids = s.entries
      .find((e) => e.id === 'p1')
      .monitoreo.historial.map((row) => row.id)
      .sort();
    assert.deepEqual(ids, ['m1', 'm2', 'm3']);
  });

  it('monitoreo keeps the newest row per id when both sides edited the same reading', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/monitoreo',
        value: { historial: [{ id: 'm1', recordedAt: '2026-08-01T08:00:00.000Z', tas: 120 }] },
        updatedAt: '2026-08-01T08:00:00.000Z',
        actorId: 'desktop',
      },
    ]));
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/monitoreo',
        value: { historial: [{ id: 'm1', recordedAt: '2026-08-01T08:05:00.000Z', tas: 130 }] },
        updatedAt: '2026-08-01T08:05:00.000Z',
        actorId: 'ipad',
      },
    ]));
    const hist = s.entries.find((e) => e.id === 'p1').monitoreo.historial;
    assert.equal(hist.length, 1);
    assert.equal(hist[0].tas, 130);
  });

  it('a brand-new patient monitoreo push still lands with no prior entry to merge against', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p-new/monitoreo',
        value: { historial: [{ id: 'm1', recordedAt: '2026-08-01T08:00:00.000Z', tas: 120 }] },
        updatedAt: '2026-08-01T08:00:00.000Z',
        actorId: 'ipad',
      },
    ]));
    assert.equal(s.entries.find((e) => e.id === 'p-new').monitoreo.historial.length, 1);
  });

  it('encrypted monitoreo bypasses historial merge — Worker cannot read ciphertext, newest wins whole', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/monitoreo',
        value: { historial: [{ id: 'm1', recordedAt: '2026-08-01T08:00:00.000Z', tas: 120 }] },
        updatedAt: '2026-08-01T08:00:00.000Z',
        actorId: 'desktop',
      },
    ]));
    ({ state: s } = applyOps(s, [
      {
        path: 'entries/p1/monitoreo',
        value: { enc: 1, iv: 'AAAA', ct: 'BBBB' },
        updatedAt: '2026-08-01T09:00:00.000Z',
        actorId: 'ipad',
      },
    ]));
    const row = s.entries.find((e) => e.id === 'p1');
    assert.deepEqual(row.monitoreo, { enc: 1, iv: 'AAAA', ct: 'BBBB' });
  });
});
