import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveDraftConflict,
  listDraftConflicts,
  deleteDraftConflict,
  __test,
} from './draft-conflict-store.mjs';

beforeEach(() => {
  __test.resetMemory();
  __test.useMemoryBackend(true);
});

test('deleteDraftConflict removes draft from list (resolution cleanup)', async () => {
  const id = await saveDraftConflict({
    entityType: 'todo',
    entityId: '1779818716558-j75u',
    roomId: 'room-a',
    conflictingKeys: ['*'],
    serverSnapshot: { version: 2, data: { text: 'Host', completed: false } },
    localSnapshot: { expectedVersion: 1, data: { text: 'Local' } },
  });
  assert.strictEqual((await listDraftConflicts()).length, 1);
  await deleteDraftConflict(id);
  assert.strictEqual((await listDraftConflicts()).length, 0);
});

test('room bundle draft stores entityType for labeling', async () => {
  const id = await saveDraftConflict({
    scope: 'room:room-a',
    entityType: 'roomBundle',
    roomId: 'room-a',
    conflictingKeys: ['*'],
    localBundle: { agenda: [], todos: {} },
    serverBundle: { agenda: [], todos: { p1: [] } },
  });
  const got = (await listDraftConflicts()).find((d) => d.id === id);
  assert.strictEqual(got.entityType, 'roomBundle');
  await deleteDraftConflict(id);
});
