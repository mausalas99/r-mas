import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mergeLiveSyncBundles,
  compareIso,
  buildRoomSnapshotFromStorage,
} from './live-sync-room.mjs';

describe('live-sync-room merge LWW', () => {
  it('compareIso ordena timestamps', () => {
    assert.ok(compareIso('2026-05-16T10:00:00.000Z', '2026-05-16T09:00:00.000Z') > 0);
    assert.strictEqual(compareIso('x', 'x'), 0);
  });

  it('gana agenda con updatedAt más reciente', () => {
    const merged = mergeLiveSyncBundles([
      {
        agenda: [
          {
            id: 'e1',
            patientId: 'p1',
            procedure: 'A',
            location: 'X',
            start: '2026-05-16T08:00:00.000Z',
            updatedAt: '2026-05-16T08:00:00.000Z',
          },
        ],
        todos: {},
      },
      {
        agenda: [
          {
            id: 'e1',
            patientId: 'p1',
            procedure: 'B',
            location: 'Y',
            start: '2026-05-16T08:00:00.000Z',
            updatedAt: '2026-05-16T10:00:00.000Z',
          },
        ],
        todos: {},
      },
    ]);
    assert.strictEqual(merged.agenda.length, 1);
    assert.strictEqual(merged.agenda[0].procedure, 'B');
  });

  it('delete gana sobre upsert anterior', () => {
    const merged = mergeLiveSyncBundles([
      {
        agenda: [
          {
            id: 'e1',
            patientId: 'p1',
            procedure: 'A',
            location: 'X',
            start: '2026-05-16T08:00:00.000Z',
            updatedAt: '2026-05-16T08:00:00.000Z',
          },
        ],
      },
      {
        type: 'livesync:patch',
        entity: 'agenda',
        op: 'delete',
        id: 'e1',
        updatedAt: '2026-05-16T11:00:00.000Z',
      },
    ]);
    assert.strictEqual(merged.agenda.length, 0);
  });

  it('merge todos por paciente', () => {
    const merged = mergeLiveSyncBundles([
      { agenda: [], todos: { p1: [{ id: 't1', text: 'viejo', updatedAt: '2026-05-16T08:00:00.000Z' }] } },
      { agenda: [], todos: { p1: [{ id: 't1', text: 'nuevo', updatedAt: '2026-05-16T12:00:00.000Z' }] } },
    ]);
    assert.strictEqual(merged.todos.p1.length, 1);
    assert.strictEqual(merged.todos.p1[0].text, 'nuevo');
  });
});

describe('buildRoomSnapshotFromStorage', () => {
  it('excluye demo-', () => {
    const snap = buildRoomSnapshotFromStorage(
      {
        getScheduledProcedures: () => [{ id: '1', patientId: 'demo-x', procedure: 'x', location: 'y' }],
        getTodos: () => [],
      },
      ['demo-a', 'p1']
    );
    assert.strictEqual(snap.agenda.length, 0);
  });
});
