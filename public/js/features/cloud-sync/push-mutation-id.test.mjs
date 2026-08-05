import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';

describe('resolveCloudPushMutationId', () => {
  it('suffixes batch census pushes with enqueuedAt', () => {
    const id = resolveCloudPushMutationId({
      clientMutationId: 'cloud-room-push',
      enqueuedAt: 1700000000000,
    });
    assert.equal(id, 'cloud-room-push:1700000000000');
  });

  it('keeps distinct mutation ids unchanged', () => {
    assert.equal(
      resolveCloudPushMutationId({ clientMutationId: 'todo-1', enqueuedAt: 1 }),
      'todo-1'
    );
  });
});
