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
});
