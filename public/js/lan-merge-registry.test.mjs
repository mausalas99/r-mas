import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLiveSyncFullBundles } from './lan-merge-registry.mjs';

/** Golden: two LAN bundle sources merge like pre-registry inline merge. */
const sourceA = {
  entityVersions: { 'a:e1': 2, 't:p1:t1': 1 },
  agenda: [
    {
      id: 'e1',
      patientId: 'p1',
      procedure: 'New',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  todos: { p1: [{ id: 't1', text: 'uno', updatedAt: '2026-05-16T08:00:00.000Z' }] },
  entries: [
    {
      patient: { id: 'p1', registro: 'R1', nombre: 'Alice', version: 2 },
      note: { texto: 'nueva nota' },
    },
  ],
  patientDeletes: [],
  clinicalOps: { teams: [{ team_id: 't1', name: 'Equipo A', updated_at: '2026-06-01T00:00:00.000Z' }] },
};

const sourceB = {
  entityVersions: { 'a:e1': 1, 't:p1:t2': 1 },
  agenda: [
    {
      id: 'e1',
      patientId: 'p1',
      procedure: 'Old',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
  ],
  todos: { p1: [{ id: 't2', text: 'dos', updatedAt: '2026-05-16T09:00:00.000Z' }] },
  entries: [
    {
      patient: { id: 'p1', registro: 'R1', nombre: 'Alice', version: 1 },
      note: { texto: 'vieja nota' },
    },
  ],
  patientDeletes: [{ id: 'p9', registro: 'R9', deleted: true }],
  clinicalOps: { teams: [{ team_id: 't1', name: 'Equipo B', updated_at: '2026-05-01T00:00:00.000Z' }] },
};

describe('lan-merge-registry', () => {
  it('mergeLiveSyncFullBundles matches golden two-source merge', () => {
    const merged = mergeLiveSyncFullBundles([sourceA, sourceB]);

    assert.strictEqual(merged.agenda.length, 1);
    assert.strictEqual(merged.agenda[0].procedure, 'New');

    assert.ok(merged.todos.p1);
    assert.strictEqual(merged.todos.p1.length, 2);
    const texts = merged.todos.p1.map((t) => t.text).sort();
    assert.deepEqual(texts, ['dos', 'uno']);

    assert.ok(Array.isArray(merged.entries));
    assert.ok(merged.entries.length >= 1);
    const entry = merged.entries.find((e) => e && e.patient && e.patient.registro === 'R1');
    assert.ok(entry);
    assert.strictEqual(entry.note.texto, 'nueva nota');

    assert.ok(merged.clinicalOps && Array.isArray(merged.clinicalOps.teams));
    const team = merged.clinicalOps.teams.find((t) => t && t.team_id === 't1');
    assert.ok(team);
    assert.ok(team.name === 'Equipo A' || team.name === 'Equipo B');
  });

  it('empty sources yield empty merge shape', () => {
    const merged = mergeLiveSyncFullBundles([]);
    assert.ok(Array.isArray(merged.agenda));
    assert.ok(merged.todos && typeof merged.todos === 'object');
    assert.ok(Array.isArray(merged.entries));
  });
});
