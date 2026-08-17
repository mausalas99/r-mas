import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateDek } from './crypto.mjs';
import {
  isEncryptedContentPath,
  encryptOpsForPush,
  decryptOpsFromPull,
  decryptRoomStateFromPull,
} from './cloud-sync-crypto-wire.mjs';

describe('isEncryptedContentPath', () => {
  it('matches clinical content paths', () => {
    assert.equal(isEncryptedContentPath('clinicalOps'), true);
    assert.equal(isEncryptedContentPath('entries/p1/note'), true);
    assert.equal(isEncryptedContentPath('entries/p1/indicaciones'), true);
    assert.equal(isEncryptedContentPath('entries/p1/historiaClinica'), true);
    assert.equal(isEncryptedContentPath('entries/p1/eventualidades'), true);
    assert.equal(isEncryptedContentPath('entries/p1/monitoreo'), true);
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
    assert.deepEqual(out.labSidecars.p1.set1, { resLabs: ['Hb 12'] });
    assert.deepEqual(out.todos.t1, { text: 'pendiente' });
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
