import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mapPatientEntryToOps,
  mapBundleEnvelopeToOps,
  pickCensusFields,
  labSetId,
  pushCloudClinicalOpsNow,
} from './mutate-bridge.mjs';

const meta = { actorId: 'user-1', updatedAt: '2026-08-02T12:00:00.000Z' };
const dir = dirname(fileURLToPath(import.meta.url));
const mutateBridgeSrc = readFileSync(join(dir, 'mutate-bridge.mjs'), 'utf8');
const mutateBridgeClinicalOpsSrc = readFileSync(join(dir, 'mutate-bridge-clinical-ops.mjs'), 'utf8');

describe('mutate-bridge op mapping', () => {
  it('maps patient entry to note, fields, and lab sidecar ops', () => {
    const ops = mapPatientEntryToOps(
      {
        patient: {
          id: 'p1',
          nombre: 'PACIENTE UNO',
          registro: '12345',
          lanUpdatedAt: '2026-08-02T11:00:00.000Z',
          historiaClinica: { version: 1, data: { motivo: 'dolor' } },
        },
        note: { texto: 'Evolución' },
        indicaciones: { items: [] },
        labHistory: [
          {
            id: 'lab-1',
            fecha: '2026-08-01',
            resLabs: [{ nombre: 'Hb', valor: '12' }],
            sourceText: 'PASTE'.repeat(1000),
          },
        ],
      },
      meta
    );

    const paths = ops.map((op) => op.path);
    assert.ok(paths.includes('entries/p1/fields'));
    assert.ok(paths.includes('entries/p1/note'));
    assert.ok(paths.includes('entries/p1/indicaciones'));
    assert.ok(paths.includes('entries/p1/historiaClinica'));
    assert.ok(paths.includes('labSidecars/p1/lab-1'));

    const fieldsOp = ops.find((op) => op.path === 'entries/p1/fields');
    assert.equal(fieldsOp?.updatedAt, '2026-08-02T11:00:00.000Z');
    const noteOp = ops.find((op) => op.path === 'entries/p1/note');
    assert.equal(noteOp?.value?.texto, 'Evolución');
    assert.equal(noteOp?.actorId, 'user-1');
    const labOp = ops.find((op) => op.path === 'labSidecars/p1/lab-1');
    assert.equal(labOp?.value?.sourceText, 'PASTE'.repeat(1000));
    assert.ok(labOp?.value?.resLabs);
  });

  it('seeds missing lanUpdatedAt with a floor clock (not Date.now)', () => {
    assert.match(mutateBridgeSrc, /CENSUS_SEED_CLOCK/);
    assert.match(mutateBridgeSrc, /2000-01-01T00:00:00\.000Z/);
  });

  it('skips fields op when patient has no lanUpdatedAt (avoids batch-clock overwrite)', () => {
    const ops = mapPatientEntryToOps(
      {
        patient: { id: 'p1', nombre: 'PAC', cuarto: '412' },
        note: {},
        indicaciones: {},
        labHistory: [{ id: 'lab-1', fecha: '2026-08-01', resLabs: [] }],
      },
      meta
    );
    assert.equal(
      ops.some((op) => op.path === 'entries/p1/fields'),
      false
    );
    assert.ok(ops.some((op) => op.path === 'labSidecars/p1/lab-1'));
  });

  it('labSetId falls back to fecha then index', () => {
    assert.equal(labSetId({ id: 'a' }, 0), 'a');
    assert.equal(labSetId({ fecha: '2026-08-01' }, 1), '2026-08-01');
    assert.equal(labSetId({}, 3), 'idx-3');
  });

  it('pickCensusFields skips historiaClinica, id, monitoreo and eventualidades', () => {
    const fields = pickCensusFields({
      id: 'p1',
      nombre: 'X',
      cuarto: '412',
      historiaClinica: { v: 1 },
      monitoreo: { estadoClinico: { four: '15' } },
      eventualidades: { entries: [], deletedIds: { ev_0: '2026-08-03T10:00:00.000Z' } },
    });
    assert.equal(fields.nombre, 'X');
    assert.equal(fields.cuarto, '412');
    assert.equal(fields.historiaClinica, undefined);
    assert.equal(fields.monitoreo, undefined);
    assert.equal(fields.eventualidades, undefined);
    assert.equal(fields.id, undefined);
  });

  it('fields and monitoreo ops use content clocks not batch updatedAt', () => {
    const ops = mapPatientEntryToOps(
      {
        patient: {
          id: 'p1',
          nombre: 'PAC',
          cuarto: '412',
          lanUpdatedAt: '2026-08-03T09:00:00.000Z',
          monitoreo: {
            estadoClinico: { four: '15' },
            estadoClinicoUpdatedAt: '2026-08-03T09:30:00.000Z',
            historial: [],
            textoGuardado: { text: '', savedAt: null },
          },
        },
        note: { texto: 'n', updatedAt: '2026-08-03T08:00:00.000Z' },
        indicaciones: {},
        labHistory: [],
      },
      meta
    );
    const fieldsOp = ops.find((op) => op.path === 'entries/p1/fields');
    const monOp = ops.find((op) => op.path === 'entries/p1/monitoreo');
    const noteOp = ops.find((op) => op.path === 'entries/p1/note');
    assert.equal(fieldsOp?.updatedAt, '2026-08-03T09:00:00.000Z');
    assert.equal(fieldsOp?.value?.cuarto, '412');
    assert.equal(fieldsOp?.value?.monitoreo, undefined);
    assert.equal(monOp?.updatedAt, '2026-08-03T09:30:00.000Z');
    assert.equal(monOp?.value?.estadoClinico?.four, '15');
    assert.equal(noteOp?.updatedAt, '2026-08-03T08:00:00.000Z');
  });

  it('mapBundleEnvelopeToOps includes todos and agenda items', () => {
    const ops = mapBundleEnvelopeToOps(
      {
        entries: [],
        todos: {
          p1: [{ id: 't1', patientId: 'p1', text: 'Pendiente' }],
        },
        agenda: [{ id: 'a1', title: 'Procedimiento' }],
      },
      meta
    );
    assert.ok(ops.some((op) => op.path === 'todos/t1'));
    assert.ok(ops.some((op) => op.path === 'agenda/a1'));
  });

  it('mapBundleEnvelopeToOps injects patientId on todos from map key', () => {
    const ops = mapBundleEnvelopeToOps(
      {
        entries: [],
        todos: {
          msgkce1rtd1kd: [
            {
              id: 't1',
              text: 'IC cardio',
              updatedAt: '2026-08-06T13:26:20.809Z',
            },
          ],
        },
      },
      meta
    );
    const todoOp = ops.find((op) => op.path === 'todos/t1');
    assert.ok(todoOp);
    assert.equal(todoOp.value.patientId, 'msgkce1rtd1kd');
    assert.equal(todoOp.updatedAt, '2026-08-06T13:26:20.809Z');
    assert.notEqual(todoOp.updatedAt, meta.updatedAt);
  });

  it('mapBundleEnvelopeToOps stamps registro on todos from bundle entries', () => {
    const ops = mapBundleEnvelopeToOps(
      {
        entries: [
          {
            patient: { id: 'remote_p', registro: '2166042-4', nombre: 'PAC' },
            note: {},
            indicaciones: {},
            labHistory: [],
          },
        ],
        todos: {
          remote_p: [{ id: 't1', text: 'Lab', updatedAt: '2026-08-07T12:00:00.000Z' }],
        },
      },
      meta
    );
    const todoOp = ops.find((op) => op.path === 'todos/t1');
    assert.equal(todoOp?.value?.registro, '2166042-4');
  });

  it('mapBundleEnvelopeToOps pushes monitoreo for estado actual sync', () => {
    const ops = mapBundleEnvelopeToOps(
      {
        entries: [
          {
            patient: {
              id: 'p1',
              nombre: 'PAC',
              lanUpdatedAt: '2026-08-03T09:00:00.000Z',
              monitoreo: {
                estadoClinico: { four: '15' },
                estadoClinicoUpdatedAt: '2026-08-03T09:30:00.000Z',
              },
            },
            note: {},
            indicaciones: {},
            labHistory: [],
          },
        ],
      },
      meta
    );
    const monOp = ops.find((op) => op.path === 'entries/p1/monitoreo');
    assert.ok(monOp);
    assert.equal(monOp.updatedAt, '2026-08-03T09:30:00.000Z');
    assert.equal(monOp.value.estadoClinico.four, '15');
    assert.equal(ops.some((op) => op.path === 'entries/p1/note'), false);
  });
});

describe('pushCloudClinicalOpsNow', () => {
  it('returns bridge_inactive when cloud sync is not active', async () => {
    const result = await pushCloudClinicalOpsNow();
    assert.deepEqual(result, { ok: false, reason: 'bridge_inactive' });
  });
});

describe('enqueueCloudTodoDelete clock', () => {
  it('does not fall back to todo.updatedAt (stale LWW vs prior upsert)', () => {
    const fn = mutateBridgeSrc.slice(
      mutateBridgeSrc.indexOf('export function enqueueCloudTodoDelete'),
      mutateBridgeSrc.indexOf('export function enqueueCloudAgendaUpsert')
    );
    assert.match(
      fn,
      /updatedAt:\s*String\(updatedAt \|\| new Date\(\)\.toISOString\(\)\)/
    );
    assert.doesNotMatch(fn, /updatedAt \|\| todo\.updatedAt/);
  });

  it('stamps registro on todo upsert and delete payloads', () => {
    assert.match(mutateBridgeSrc, /stampCloudTodoRow/);
    assert.match(mutateBridgeSrc, /registroForPatientId/);
  });
});

describe('mutate-bridge LAN decoupling (Phase 3)', () => {
  it('mutate-bridge source has zero features/lan imports', () => {
    assert.equal(/features\/lan\//.test(mutateBridgeSrc), false);
    assert.equal(/['"]\.\.\/lan\//.test(mutateBridgeSrc), false);
    assert.equal(/push-bridge/.test(mutateBridgeSrc), false);
    assert.equal(/buildLiveSyncBundleEnvelope/.test(mutateBridgeSrc), false);
  });

  it('mutate-bridge-clinical-ops source has zero features/lan imports', () => {
    assert.equal(/features\/lan\//.test(mutateBridgeClinicalOpsSrc), false);
    assert.equal(/['"]\.\.\/lan\//.test(mutateBridgeClinicalOpsSrc), false);
    assert.match(mutateBridgeClinicalOpsSrc, /clinical-ops-sync\.mjs/);
  });

  it('pushCloudBundleOps builds from cloud-census-collect without clinicalOps stamp', () => {
    assert.match(mutateBridgeSrc, /collectPatientEntriesForCloudPush/);
    assert.match(mutateBridgeSrc, /collectTodosMapForCloudPush/);
    assert.match(mutateBridgeSrc, /collectAgendaForCloudPush/);
    assert.match(mutateBridgeSrc, /mapBundleEnvelopeToOps/);
    assert.doesNotMatch(
      mutateBridgeSrc,
      /rpc-clinical-ops-synced[\s\S]{0,120}scheduleCloudSyncPush/
    );
    const bundleFn = mutateBridgeSrc.slice(
      mutateBridgeSrc.indexOf('export function mapBundleEnvelopeToOps'),
      mutateBridgeSrc.indexOf('export function mapBundleEnvelopeToOps') + 900
    );
    assert.doesNotMatch(bundleFn, /path: 'clinicalOps'/);
  });
});
