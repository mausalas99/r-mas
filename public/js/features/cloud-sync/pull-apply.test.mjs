import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cloudEntryToLanEntry,
  cloudStateToLanEntries,
  foldCloudOp,
  createOpFold,
  opFoldToLanEntries,
  assembleLabHistoryFromSidecars,
} from './pull-apply-state.mjs';

const pullApplySrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'pull-apply.mjs'),
  'utf8'
);

describe('pull-apply cloud snapshot merge', () => {
  it('assembles lab sidecars into labHistory arrays', () => {
    const labs = assembleLabHistoryFromSidecars({
      s1: { id: 's1', fecha: '2026-08-01' },
      s2: { id: 's2', fecha: '2026-08-02' },
    });
    assert.equal(labs.length, 2);
    assert.ok(labs.some((set) => set.id === 's1'));
  });

  it('cloudEntryToLanEntry merges fields and sidecars', () => {
    const entry = cloudEntryToLanEntry(
      {
        id: 'p1',
        fields: { nombre: 'PACIENTE', registro: '99' },
        note: { texto: 'Nota remota' },
        indicaciones: {},
      },
      { lab1: { id: 'lab1', fecha: '2026-08-01' } }
    );
    assert.equal(entry?.patient?.nombre, 'PACIENTE');
    assert.equal(entry?.note?.texto, 'Nota remota');
    assert.equal(entry?.labHistory?.length, 1);
  });

  it('cloudStateToLanEntries builds LAN entries from tiny snapshot', () => {
    const entries = cloudStateToLanEntries({
      entries: [
        {
          id: 'p1',
          fields: { nombre: 'UNO', registro: '1' },
          note: { texto: 'hola' },
        },
      ],
      labSidecars: {
        p1: { l1: { id: 'l1', fecha: '2026-08-01' } },
      },
      todos: {},
      agenda: [],
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].patient.nombre, 'UNO');
    assert.equal(entries[0].labHistory.length, 1);
  });

  it('foldCloudOp accumulates incremental ops into LAN entries', () => {
    const fold = createOpFold();
    foldCloudOp(fold, {
      path: 'entries/p1/fields',
      value: { nombre: 'DOS', registro: '2' },
    });
    foldCloudOp(fold, {
      path: 'entries/p1/note',
      value: { texto: 'sync' },
    });
    foldCloudOp(fold, {
      path: 'labSidecars/p1/l1',
      value: { id: 'l1', fecha: '2026-08-02' },
    });
    const entries = opFoldToLanEntries(fold);
    assert.equal(entries[0].patient.nombre, 'DOS');
    assert.equal(entries[0].note.texto, 'sync');
    assert.equal(entries[0].labHistory[0].id, 'l1');
  });

  it('eventualidades path overrides stale packed fields copy', () => {
    const fold = createOpFold();
    foldCloudOp(fold, {
      path: 'entries/p1/fields',
      value: {
        nombre: 'PAC',
        eventualidades: {
          entries: [
            { id: 'ev_a', text: 'OLD' },
            { id: 'ev_b', text: 'KEEP' },
          ],
        },
      },
    });
    foldCloudOp(fold, {
      path: 'entries/p1/eventualidades',
      value: {
        entries: [{ id: 'ev_b', text: 'KEEP' }],
        deletedIds: { ev_a: '2026-08-03T12:00:00.000Z' },
      },
    });
    const entries = opFoldToLanEntries(fold);
    assert.deepEqual(entries[0].patient.eventualidades.entries.map((e) => e.id), ['ev_b']);
    assert.ok(entries[0].patient.eventualidades.deletedIds.ev_a);
  });

  it('monitoreo path overrides stale packed fields copy', () => {
    const fold = createOpFold();
    foldCloudOp(fold, {
      path: 'entries/p1/fields',
      value: {
        nombre: 'PAC',
        cuarto: '100',
        monitoreo: { estadoClinico: { four: '10' } },
      },
    });
    foldCloudOp(fold, {
      path: 'entries/p1/monitoreo',
      value: {
        estadoClinico: { four: '15' },
        estadoClinicoUpdatedAt: '2026-08-03T12:00:00.000Z',
      },
    });
    const entries = opFoldToLanEntries(fold);
    assert.equal(entries[0].patient.cuarto, '100');
    assert.equal(entries[0].patient.monitoreo.estadoClinico.four, '15');
  });
});

describe('pull-apply tombstone guard', () => {
  it('shouldApplyCloudTombstone skips stale id when registro was re-admitted', async () => {
    const { shouldApplyCloudTombstone } = await import('./pull-apply.mjs');
    const { patients: patientList } = await import('../../app-state.mjs');
    const before = patientList.slice();
    patientList.length = 0;
    patientList.push({ id: 'p-new', registro: '2166042-4', nombre: 'REINGRESO' });
    try {
      assert.equal(
        shouldApplyCloudTombstone('p-old', { registro: '2166042-4' }),
        false
      );
      assert.equal(shouldApplyCloudTombstone('p-old', { registro: '' }), true);
    } finally {
      patientList.length = 0;
      patientList.push(...before);
    }
  });
});

describe('pull-apply sync-apply wiring (Phase 3)', () => {
  it('imports patient apply/delete from sync-apply not lan', () => {
    assert.match(pullApplySrc, /sync-apply\/patient-entries/);
    assert.match(pullApplySrc, /sync-apply\/patient-delete/);
    assert.equal(/from ['"]\.\.\/lan\/patient-entries/.test(pullApplySrc), false);
    assert.equal(/from ['"]\.\.\/lan\/patient-delete/.test(pullApplySrc), false);
    assert.match(pullApplySrc, /clinical-ops-sync\.mjs/);
  });
});
