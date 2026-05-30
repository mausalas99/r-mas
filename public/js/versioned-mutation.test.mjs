import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMutationBuilder, wrapLiveSyncPatch } from './versioned-mutation.mjs';

test('builder captures base and changedKeys', () => {
  const b = createMutationBuilder('todo', 't1');
  const m = b
    .captureBase({ id: 't1', text: 'a', version: 2, patientId: 'p1' })
    .set('text', 'b')
    .build({ roomId: 'r1', patientId: 'p1' });
  assert.deepStrictEqual(m.changedKeys, ['text']);
  assert.strictEqual(m.expectedVersion, 2);
  assert.strictEqual(m.data.text, 'b');
  assert.strictEqual(m.entityType, 'todo');
  assert.strictEqual(m.entityId, 't1');
  assert.deepStrictEqual(m.baseData, { id: 't1', text: 'a', version: 2, patientId: 'p1' });
});

test('wrapLiveSyncPatch builds livesync envelope', () => {
  const mutation = { entityType: 'patient', entityId: 'p1', expectedVersion: 1 };
  const patch = wrapLiveSyncPatch('room-1', 'client-abc', mutation);
  assert.deepStrictEqual(patch, {
    type: 'livesync:patch',
    roomId: 'room-1',
    clientId: 'client-abc',
    mutation,
  });
});

test('builder without captureBase uses expectedVersion 0', () => {
  const m = createMutationBuilder('agenda', 'ev1').set('title', 'x').build();
  assert.strictEqual(m.expectedVersion, 0);
  assert.strictEqual(m.baseData, null);
  assert.deepStrictEqual(m.changedKeys, ['title']);
});
