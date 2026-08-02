import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cloudEntryToLanEntry,
  cloudStateToLanEntries,
  foldCloudOp,
  createOpFold,
  opFoldToLanEntries,
  assembleLabHistoryFromSidecars,
} from './pull-apply-state.mjs';

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
});
