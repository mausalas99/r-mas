import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLiveSyncSnapshot,
  createLiveSyncEvent,
  applyLiveSyncSnapshot,
  applyLiveSyncEvent,
  listConflictRecords,
} from './live-sync-core.mjs';

function baseState() {
  return {
    patients: [{ id: 'p1', nombre: 'UNO', registro: '123' }],
    notes: { p1: { fecha: '11/05/2026', evolucion: 'estable' } },
    indicaciones: { p1: { dieta: 'AYUNO' } },
    labHistory: { p1: [{ id: 'l1', fecha: '11/05/2026', hora: '08:00', resLabs: ['Hb 12'] }] },
    medRecetaByPatient: { p1: { rows: [{ id: 'm1', name: 'MEROPENEM' }] } },
    listadoProblemas: { p1: { activos: [{ id: 'a1', descripcion: 'Sepsis' }], inactivos: [] } },
    settings: { appMode: 'sala' },
    medCatalog: { v: 1, accents: {}, soapTokens: { vasop: [], abx: [], analgesia: [], antihta: [] } },
    liveSyncMeta: { appliedEventIds: [], entityVersions: {}, conflicts: [] },
  };
}

test('buildLiveSyncSnapshot includes full local data families', () => {
  const snapshot = buildLiveSyncSnapshot(baseState(), {
    sessionId: 's1',
    sourceDeviceId: 'dev-a',
    now: '2026-05-11T19:00:00.000Z',
  });

  assert.equal(snapshot.format, 'r-plus-live-sync-snapshot');
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.sessionId, 's1');
  assert.equal(snapshot.sourceDeviceId, 'dev-a');
  assert.equal(snapshot.createdAt, '2026-05-11T19:00:00.000Z');
  assert.deepEqual(snapshot.data.patients.map((p) => p.id), ['p1']);
  assert.equal(snapshot.data.notes.p1.evolucion, 'estable');
  assert.equal(snapshot.data.settings.appMode, 'sala');
});

test('applyLiveSyncSnapshot replaces clinical data and preserves local theme outside snapshot', () => {
  const local = baseState();
  local.theme = 'dark';
  const incoming = buildLiveSyncSnapshot(baseState(), {
    sessionId: 's1',
    sourceDeviceId: 'dev-a',
    now: '2026-05-11T19:00:00.000Z',
  });
  incoming.data.patients[0].nombre = 'UNO EDITADO';

  const next = applyLiveSyncSnapshot(local, incoming);
  assert.equal(next.patients[0].nombre, 'UNO EDITADO');
  assert.equal(next.theme, 'dark');
  assert.deepEqual(next.liveSyncMeta.appliedEventIds, []);
});

test('createLiveSyncEvent creates stable envelope', () => {
  const event = createLiveSyncEvent({
    sessionId: 's1',
    sourceDeviceId: 'dev-a',
    entityType: 'notes',
    entityId: 'p1',
    op: 'notes.update',
    payload: { evolucion: 'mejor' },
    baseVersion: 2,
    eventId: 'evt-1',
    now: '2026-05-11T19:01:00.000Z',
  });

  assert.equal(event.format, 'r-plus-live-sync-event');
  assert.equal(event.eventId, 'evt-1');
  assert.equal(event.op, 'notes.update');
  assert.equal(event.baseVersion, 2);
});

test('applyLiveSyncEvent ignores duplicate eventId', () => {
  const state = baseState();
  const event = createLiveSyncEvent({
    sessionId: 's1',
    sourceDeviceId: 'dev-a',
    entityType: 'notes',
    entityId: 'p1',
    op: 'notes.update',
    payload: { evolucion: 'mejor' },
    eventId: 'evt-1',
  });

  const once = applyLiveSyncEvent(state, event);
  const twice = applyLiveSyncEvent(once, event);

  assert.equal(twice.notes.p1.evolucion, 'mejor');
  assert.deepEqual(twice.liveSyncMeta.appliedEventIds, ['evt-1']);
});

test('applyLiveSyncEvent appends labHistory without duplicating same lab set', () => {
  const state = baseState();
  const event = createLiveSyncEvent({
    sessionId: 's1',
    sourceDeviceId: 'dev-a',
    entityType: 'labHistory',
    entityId: 'p1',
    op: 'labHistory.append',
    eventId: 'evt-lab',
    payload: { id: 'l2', fecha: '11/05/2026', hora: '08:00', resLabs: ['Hb 12'] },
  });

  const next = applyLiveSyncEvent(state, event);
  assert.equal(next.labHistory.p1.length, 1);
  assert.equal(next.labHistory.p1[0].id, 'l1');
});

test('applyLiveSyncEvent records conflict when baseVersion is stale', () => {
  const state = baseState();
  state.liveSyncMeta.entityVersions.notes = { p1: 4 };
  const event = createLiveSyncEvent({
    sessionId: 's1',
    sourceDeviceId: 'dev-a',
    entityType: 'notes',
    entityId: 'p1',
    op: 'notes.update',
    eventId: 'evt-stale',
    baseVersion: 2,
    payload: { evolucion: 'remota' },
    now: '2026-05-11T19:02:00.000Z',
  });

  const next = applyLiveSyncEvent(state, event);
  assert.equal(next.notes.p1.evolucion, 'remota');
  assert.equal(listConflictRecords(next).length, 1);
  assert.equal(listConflictRecords(next)[0].entityType, 'notes');
});
