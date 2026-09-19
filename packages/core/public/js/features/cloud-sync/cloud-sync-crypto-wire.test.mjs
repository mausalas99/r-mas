import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateDek } from './crypto.mjs';
import {
  isEncryptedContentPath,
  encryptOpsForPush,
  decryptOpsFromPull,
  decryptRoomStateFromPull,
  listContentFieldEntries,
  needsReencryption,
} from './cloud-sync-crypto-wire.mjs';

describe('isEncryptedContentPath', () => {
  it('matches clinical content paths', () => {
    assert.equal(isEncryptedContentPath('clinicalOps'), true);
    assert.equal(isEncryptedContentPath('entries/p1/note'), true);
    assert.equal(isEncryptedContentPath('entries/p1/indicaciones'), true);
    assert.equal(isEncryptedContentPath('entries/p1/historiaClinica'), true);
    assert.equal(isEncryptedContentPath('entries/p1/eventualidades'), true);
    assert.equal(isEncryptedContentPath('entries/p1/monitoreo'), true);
    assert.equal(isEncryptedContentPath('entries/p1/medReceta'), true);
    assert.equal(isEncryptedContentPath('labSidecars/p1/set1'), true);
    assert.equal(isEncryptedContentPath('todos/t1'), true);
  });

  it('does not match identity / structural paths (Interno + census dependency)', () => {
    assert.equal(isEncryptedContentPath('entries/p1'), false);
    assert.equal(isEncryptedContentPath('entries/p1/fields'), false);
    assert.equal(isEncryptedContentPath('agenda'), false);
    assert.equal(isEncryptedContentPath('agenda/a1'), false);
    assert.equal(isEncryptedContentPath('tombstones/p1'), false);
  });
});

describe('encryptOpsForPush / decryptOpsFromPull', () => {
  it('round-trips content ops through encrypt then decrypt', async () => {
    const dek = await generateDek();
    const ops = [
      { path: 'entries/p1/note', value: { text: 'estable' }, updatedAt: 't1', actorId: 'a1' },
      { path: 'entries/p1/fields', value: { nombre: 'Juan Perez' }, updatedAt: 't1', actorId: 'a1' },
    ];
    const encrypted = await encryptOpsForPush(dek, ops);
    assert.equal(encrypted[0].value.enc, 1); // content path — encrypted
    assert.deepEqual(encrypted[1].value, { nombre: 'Juan Perez' }); // identity path — untouched

    const decrypted = await decryptOpsFromPull(dek, encrypted);
    assert.deepEqual(decrypted[0].value, { text: 'estable' });
    assert.deepEqual(decrypted[1].value, { nombre: 'Juan Perez' });
  });

  it('is a no-op with no DEK (room never opted into E2EE)', async () => {
    const ops = [{ path: 'entries/p1/note', value: { text: 'estable' } }];
    const out = await encryptOpsForPush(null, ops);
    assert.deepEqual(out, ops);
  });

  it('leaves ciphertext untouched when decrypting without a DEK (not yet unwrapped)', async () => {
    const dek = await generateDek();
    const ops = [{ path: 'entries/p1/note', value: { text: 'estable' } }];
    const encrypted = await encryptOpsForPush(dek, ops);
    const decrypted = await decryptOpsFromPull(null, encrypted);
    assert.equal(decrypted[0].value.enc, 1); // still ciphertext, not garbage, no throw
  });
});

describe('registro/diagnosis sub-key encryption inside patient identity ops', () => {
  it('fields op: locks registro + diagnosis keys, leaves cama/servicio/nombre plaintext, attaches registroFp', async () => {
    const dek = await generateDek();
    const ops = [
      {
        path: 'entries/p1/fields',
        value: {
          nombre: 'Juan Perez',
          cama: '12',
          servicio: 'UCI',
          registro: '2026-001234',
          diagnosticosList: ['NEUMONIA'],
          diagnosticosText: '1. NEUMONIA',
        },
        updatedAt: 't1',
        actorId: 'a1',
      },
    ];
    const [encrypted] = await encryptOpsForPush(dek, ops);
    assert.equal(encrypted.value.nombre, 'Juan Perez');
    assert.equal(encrypted.value.cama, '12');
    assert.equal(encrypted.value.servicio, 'UCI');
    assert.equal(encrypted.value.registro.enc, 1);
    assert.equal(encrypted.value.diagnosticosList.enc, 1);
    assert.equal(encrypted.value.diagnosticosText.enc, 1);
    assert.equal(typeof encrypted.value.registroFp, 'string');
    assert.ok(encrypted.value.registroFp.length > 0);
    assert.notEqual(encrypted.value.registroFp, '2026-001234');

    const [decrypted] = await decryptOpsFromPull(dek, [encrypted]);
    assert.equal(decrypted.value.registro, '2026-001234');
    assert.deepEqual(decrypted.value.diagnosticosList, ['NEUMONIA']);
    assert.equal(decrypted.value.diagnosticosText, '1. NEUMONIA');
    assert.equal(decrypted.value.cama, '12'); // sibling untouched throughout
  });

  it('root-stub op (entries/{id}): same registro lock + fingerprint applies', async () => {
    const dek = await generateDek();
    const ops = [{ path: 'entries/p1', value: { id: 'p1', registro: '2026-005555' }, updatedAt: 't1', actorId: 'a1' }];
    const [encrypted] = await encryptOpsForPush(dek, ops);
    assert.equal(encrypted.value.id, 'p1');
    assert.equal(encrypted.value.registro.enc, 1);
    assert.ok(encrypted.value.registroFp);

    const [decrypted] = await decryptOpsFromPull(dek, [encrypted]);
    assert.equal(decrypted.value.registro, '2026-005555');
  });

  it('no dek: patient identity ops pass through unchanged (no registroFp attached)', async () => {
    const ops = [{ path: 'entries/p1/fields', value: { registro: '2026-1', cama: '3' } }];
    const out = await encryptOpsForPush(null, ops);
    assert.deepEqual(out, ops);
  });

  it('tombstone op: real registro is swapped for registroFp, never leaves the device as plaintext', async () => {
    const dek = await generateDek();
    const ops = [{ path: 'tombstones/p1', value: { registro: '2026-009999', deletedAt: 't1' }, updatedAt: 't1', actorId: 'a1' }];
    const [encrypted] = await encryptOpsForPush(dek, ops);
    assert.equal(encrypted.value.registro, undefined);
    assert.equal(typeof encrypted.value.registroFp, 'string');
    assert.equal(encrypted.value.deletedAt, 't1');
  });

  it('tombstone op with no registro is untouched', async () => {
    const dek = await generateDek();
    const ops = [{ path: 'tombstones/p1', value: { deletedAt: 't1' }, updatedAt: 't1', actorId: 'a1' }];
    const [encrypted] = await encryptOpsForPush(dek, ops);
    assert.deepEqual(encrypted.value, { deletedAt: 't1' });
  });
});

describe('decryptRoomStateFromPull', () => {
  it('decrypts clinicalOps, entry content fields, labSidecars, and todos in place', async () => {
    const dek = await generateDek();
    const state = {
      clinicalOps: await (await import('./crypto.mjs')).encryptValue(dek, { teams: [] }),
      entries: [
        {
          id: 'p1',
          nombre: 'Juan Perez', // identity field — never encrypted, passes through untouched
          note: await (await import('./crypto.mjs')).encryptValue(dek, { text: 'nota' }),
          medReceta: await (await import('./crypto.mjs')).encryptValue(dek, { items: [{ id: 'm1' }] }),
        },
      ],
      labSidecars: {
        p1: { set1: await (await import('./crypto.mjs')).encryptValue(dek, { resLabs: ['Hb 12'] }) },
      },
      todos: {
        t1: await (await import('./crypto.mjs')).encryptValue(dek, { text: 'pendiente' }),
      },
    };

    const out = await decryptRoomStateFromPull(dek, state);
    assert.deepEqual(out.clinicalOps, { teams: [] });
    assert.equal(out.entries[0].nombre, 'Juan Perez');
    assert.deepEqual(out.entries[0].note, { text: 'nota' });
    assert.deepEqual(out.entries[0].medReceta, { items: [{ id: 'm1' }] });
    assert.deepEqual(out.labSidecars.p1.set1, { resLabs: ['Hb 12'] });
    assert.deepEqual(out.todos.t1, { text: 'pendiente' });
  });

  it('decrypts registro at the entry root and registro/diagnosis nested under entry.fields', async () => {
    const dek = await generateDek();
    const { encryptValue } = await import('./crypto.mjs');
    const state = {
      entries: [
        {
          id: 'p1',
          registro: await encryptValue(dek, '2026-001234'), // root-stub admit merge
          fields: {
            nombre: 'Juan Perez',
            cama: '12',
            registro: await encryptValue(dek, '2026-001234'), // fields merge
            diagnosticosList: await encryptValue(dek, ['NEUMONIA']),
            diagnosticosText: await encryptValue(dek, '1. NEUMONIA'),
          },
        },
      ],
    };
    const out = await decryptRoomStateFromPull(dek, state);
    assert.equal(out.entries[0].registro, '2026-001234');
    assert.equal(out.entries[0].fields.registro, '2026-001234');
    assert.deepEqual(out.entries[0].fields.diagnosticosList, ['NEUMONIA']);
    assert.equal(out.entries[0].fields.diagnosticosText, '1. NEUMONIA');
    assert.equal(out.entries[0].fields.cama, '12'); // sibling untouched
    assert.equal(out.entries[0].fields.nombre, 'Juan Perez');
  });

  it('passes through an unencrypted (legacy) snapshot unchanged', async () => {
    const state = {
      clinicalOps: { teams: [] },
      entries: [{ id: 'p1', nombre: 'Juan', note: 'plain text note' }],
    };
    const out = await decryptRoomStateFromPull(null, state);
    assert.deepEqual(out, state);
  });
});

describe('listContentFieldEntries', () => {
  it('enumerates clinicalOps, entry content fields, labSidecars, and todos, plus any entries/{id}/fields blob', () => {
    const state = {
      clinicalOps: { teams: [] },
      entries: [
        { id: 'p1', nombre: 'Juan Perez', note: 'nota', medReceta: { items: [] }, fields: { cama: '12' } },
        { id: 'p2', indicaciones: 'omeprazol' },
      ],
      labSidecars: { p1: { set1: { resLabs: ['Hb 12'] } } },
      todos: { t1: { text: 'pendiente' } },
    };
    const out = listContentFieldEntries(state);
    assert.deepEqual(out, [
      { path: 'clinicalOps', value: { teams: [] } },
      { path: 'entries/p1/note', value: 'nota' },
      { path: 'entries/p1/medReceta', value: { items: [] } },
      { path: 'entries/p1/fields', value: { cama: '12' } }, // no locked key here, listed anyway
      { path: 'entries/p2/indicaciones', value: 'omeprazol' },
      { path: 'labSidecars/p1/set1', value: { resLabs: ['Hb 12'] } },
      { path: 'todos/t1', value: { text: 'pendiente' } },
    ]);
  });

  it('also lists the entries/{id} root when it carries a registro', () => {
    const state = {
      entries: [
        {
          id: 'p1',
          registro: '2026-001234', // root-stub admit merge
          fields: { registro: '2026-001234', diagnosticosList: ['NEUMONIA'] },
        },
        { id: 'p2', nombre: 'no registro at all — no root entry listed' },
      ],
    };
    const out = listContentFieldEntries(state);
    assert.deepEqual(out, [
      { path: 'entries/p1', value: { registro: '2026-001234' } },
      { path: 'entries/p1/fields', value: { registro: '2026-001234', diagnosticosList: ['NEUMONIA'] } },
    ]);
  });

  it('returns an empty list for an empty or malformed state', () => {
    assert.deepEqual(listContentFieldEntries(null), []);
    assert.deepEqual(listContentFieldEntries({}), []);
  });
});

describe('needsReencryption', () => {
  it('content paths: true only while the value is not yet an encrypted envelope', () => {
    assert.equal(needsReencryption('entries/p1/note', 'plano'), true);
    assert.equal(needsReencryption('entries/p1/note', { enc: 1, iv: 'x', ct: 'y' }), false);
  });

  it('identity paths: true only when a locked sub-key is still plaintext', () => {
    assert.equal(needsReencryption('entries/p1', { registro: '2026-1' }), true);
    assert.equal(needsReencryption('entries/p1', { registro: { enc: 1, iv: 'x', ct: 'y' } }), false);
    assert.equal(needsReencryption('entries/p1/fields', { cama: '12' }), false); // no locked key present
    assert.equal(needsReencryption('entries/p1/fields', { diagnosticosText: '1. NEUMONIA' }), true);
  });

  it('any other path: never needs re-encryption', () => {
    assert.equal(needsReencryption('agenda', { anything: true }), false);
    assert.equal(needsReencryption('tombstones/p1', { registro: '2026-1' }), false);
  });
});
