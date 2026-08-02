import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOutbox } from './outbox.mjs';

describe('cloud outbox', () => {
  it('dedupes clientMutationId (last wins)', () => {
    const mem = [];
    const ob = createOutbox({
      load: () => mem.slice(),
      save: (rows) => {
        mem.length = 0;
        mem.push(...rows);
      },
    });
    ob.enqueue({
      clientMutationId: 'm1',
      ops: [{ path: 'entries/p1/note', value: { texto: 'a' } }],
    });
    ob.enqueue({
      clientMutationId: 'm1',
      ops: [{ path: 'entries/p1/note', value: { texto: 'b' } }],
    });
    assert.equal(ob.list().length, 1);
    assert.deepEqual(ob.list()[0].ops, [
      { path: 'entries/p1/note', value: { texto: 'b' } },
    ]);
  });

  it('keeps distinct clientMutationIds', () => {
    const mem = [];
    const ob = createOutbox({
      load: () => mem.slice(),
      save: (rows) => {
        mem.length = 0;
        mem.push(...rows);
      },
    });
    ob.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }] });
    ob.enqueue({ clientMutationId: 'm2', ops: [{ path: 'b', value: 2 }] });
    assert.equal(ob.list().length, 2);
  });

  it('remove drops one entry by clientMutationId', () => {
    const mem = [];
    const ob = createOutbox({
      load: () => mem.slice(),
      save: (rows) => {
        mem.length = 0;
        mem.push(...rows);
      },
    });
    ob.enqueue({ clientMutationId: 'm1', ops: [] });
    ob.enqueue({ clientMutationId: 'm2', ops: [] });
    ob.remove('m1');
    assert.equal(ob.list().length, 1);
    assert.equal(ob.list()[0].clientMutationId, 'm2');
  });

  it('clear removes all entries', () => {
    const mem = [];
    const ob = createOutbox({
      load: () => mem.slice(),
      save: (rows) => {
        mem.length = 0;
        mem.push(...rows);
      },
    });
    ob.enqueue({ clientMutationId: 'm1', ops: [] });
    ob.clear();
    assert.equal(ob.list().length, 0);
  });
});
