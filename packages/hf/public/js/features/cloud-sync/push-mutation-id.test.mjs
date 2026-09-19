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

  it('suffixes clinicalOps and entity ids so re-edits are not Worker-deduped', () => {
    assert.equal(
      resolveCloudPushMutationId({ clientMutationId: 'clinicalOps', enqueuedAt: 42 }),
      'clinicalOps:42'
    );
    assert.equal(
      resolveCloudPushMutationId({ clientMutationId: 'todos/t1', enqueuedAt: 99 }),
      'todos/t1:99'
    );
  });

  it('falls back when clientMutationId missing', () => {
    assert.match(
      resolveCloudPushMutationId({ enqueuedAt: 7 }),
      /^cloud-push:7$/
    );
  });
});
