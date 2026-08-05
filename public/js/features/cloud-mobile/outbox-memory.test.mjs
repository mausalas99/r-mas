import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryOutbox } from './outbox-memory.mjs';

describe('createMemoryOutbox', () => {
  it('dedupes by clientMutationId', () => {
    const ob = createMemoryOutbox();
    ob.enqueue({ clientMutationId: 'a', ops: [{ path: 'x' }] });
    ob.enqueue({ clientMutationId: 'a', ops: [{ path: 'y' }] });
    assert.equal(ob.list().length, 1);
    assert.equal(ob.list()[0].ops[0].path, 'y');
  });
});
