import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitCoreState, joinCoreState } from './room-state-shard.js';

const V = (n) => ({ updatedAt: `2026-01-0${n}`, actorId: 'u' });

function fixture() {
  return {
    revision: 7,
    entries: [
      { id: 'b', fields: { nombre: 'B', note: 'nota larga' } },
      { id: 'a', fields: { nombre: 'A' } },
    ],
    entityVersions: {
      'entries/a': V(1),
      'entries/a/fields': V(2),
      'entries/b/fields': V(3),
      'labSidecars/a/s1': V(4),
      'tombstones/gone': V(5),
      'todos/t1': V(6),
      clinicalOps: V(7),
    },
    todos: { t1: { text: 'x' } },
    agenda: [{ id: 'ag1' }],
    clinicalOps: { teams: [] },
    labSidecars: {},
    tombstones: { gone: { deletedAt: '2026-01-05', actorId: 'u' } },
  };
}

describe('splitCoreState / joinCoreState', () => {
  it('join(split(s)) equals s and keeps entries order', () => {
    const s = fixture();
    const { core, shards } = splitCoreState(s);
    const joined = joinCoreState(core, shards);
    // labSidecars has its own shard tables and never goes through this split.
    const expected = { ...s };
    delete expected.labSidecars;
    assert.deepEqual(joined, expected);
    assert.deepEqual(joined.entries.map((e) => e.id), ['b', 'a']);
  });

  it('puts patient-scoped versions in the shard and the rest in core', () => {
    const { core, shards } = splitCoreState(fixture());
    assert.equal(core.patientsSharded, 1);
    assert.deepEqual(Object.keys(core.entityVersions).sort(), ['clinicalOps', 'todos/t1']);
    assert.deepEqual(Object.keys(shards.get('a').versions).sort(), [
      'entries/a',
      'entries/a/fields',
      'labSidecars/a/s1',
    ]);
    assert.ok(shards.get('gone').tombstone);
    assert.equal(shards.get('gone').entry, undefined);
  });

  it('keeps id-less and duplicate-id entries instead of dropping them', () => {
    const s = fixture();
    s.entries.push({ fields: { nombre: 'sin id' } }, { id: 'a', fields: { nombre: 'dup' } });
    const { core, shards } = splitCoreState(s);
    const joined = joinCoreState(core, shards);
    assert.equal(joined.entries.length, 4);
    assert.deepEqual(joined.entries.slice(0, 2).map((e) => e.id), ['b', 'a']);
  });

  it('throws when a listed patient has no shard', () => {
    const { core, shards } = splitCoreState(fixture());
    shards.delete('a');
    assert.throws(() => joinCoreState(core, shards), /a/);
  });
});
