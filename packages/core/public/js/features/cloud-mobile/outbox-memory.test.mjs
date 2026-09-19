import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryOutbox } from './outbox-memory.mjs';
import { CLOUD_OUTBOX_CHANGED_EVENT } from '../cloud-sync/cloud-outbox-events.mjs';

describe('createMemoryOutbox', () => {
  it('dedupes by clientMutationId', () => {
    const ob = createMemoryOutbox();
    ob.enqueue({ clientMutationId: 'a', ops: [{ path: 'x' }] });
    ob.enqueue({ clientMutationId: 'a', ops: [{ path: 'y' }] });
    assert.equal(ob.list().length, 1);
    assert.equal(ob.list()[0].ops[0].path, 'y');
  });

  it('enqueueMany enqueues several items in one call, last write wins per id', () => {
    const ob = createMemoryOutbox();
    ob.enqueue({ clientMutationId: 'a', ops: [{ path: 'x' }] });
    ob.enqueueMany([
      { clientMutationId: 'a', ops: [{ path: 'y' }] },
      { clientMutationId: 'b', ops: [{ path: 'z' }] },
    ]);
    const rows = ob.list();
    assert.equal(rows.length, 2);
    assert.equal(rows.find((r) => r.clientMutationId === 'a').ops[0].path, 'y');
    assert.equal(rows.find((r) => r.clientMutationId === 'b').ops[0].path, 'z');
  });

  it('enqueueMany is a no-op for an empty or non-array list', () => {
    const ob = createMemoryOutbox();
    ob.enqueueMany([]);
    ob.enqueueMany(undefined);
    assert.equal(ob.list().length, 0);
  });

  it('removeOps drops only the acked ops (by path+updatedAt), keeping the rest', () => {
    const ob = createMemoryOutbox();
    ob.enqueue({
      clientMutationId: 'labSidecars/p1',
      ops: [
        { path: 'labSidecars/p1/set-1', value: {}, updatedAt: 't1' },
        { path: 'labSidecars/p1/set-2', value: {}, updatedAt: 't2' },
      ],
    });
    ob.removeOps('labSidecars/p1', [{ path: 'labSidecars/p1/set-1', updatedAt: 't1' }]);
    assert.equal(ob.list().length, 1);
    assert.deepEqual(
      ob.list()[0].ops.map((op) => op.path),
      ['labSidecars/p1/set-2']
    );
  });

  it('removeOps deletes the row once every op is acked', () => {
    const ob = createMemoryOutbox();
    ob.enqueue({
      clientMutationId: 'm1',
      ops: [{ path: 'a', value: 1, updatedAt: 't1' }],
    });
    ob.removeOps('m1', [{ path: 'a', updatedAt: 't1' }]);
    assert.equal(ob.list().length, 0);
  });

  it('removeOps leaves an op merged in after the acked snapshot untouched (survives mid-flight enqueue)', () => {
    const ob = createMemoryOutbox();
    ob.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 1, updatedAt: 't1' }] });
    // A concurrent local edit re-enqueues the same id with a newer value.
    ob.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 2, updatedAt: 't2' }] });
    // The in-flight drain only acks the original snapshot (t1) — already
    // overwritten in the row, so this is a no-op, not a data loss.
    ob.removeOps('m1', [{ path: 'a', updatedAt: 't1' }]);
    assert.equal(ob.list().length, 1);
    assert.equal(ob.list()[0].ops[0].updatedAt, 't2');
  });

  it('notifies outbox-changed on enqueue/remove', () => {
    const ob = createMemoryOutbox();
    let count = 0;
    function onChange() {
      count += 1;
    }
    const listeners = new Map();
    globalThis.document = {
      addEventListener(type, fn) {
        listeners.set(type, fn);
      },
      removeEventListener(type, fn) {
        if (listeners.get(type) === fn) listeners.delete(type);
      },
      dispatchEvent(ev) {
        const fn = listeners.get(ev.type);
        if (fn) fn(ev);
        return true;
      },
    };
    try {
      document.addEventListener(CLOUD_OUTBOX_CHANGED_EVENT, onChange);
      ob.enqueue({ clientMutationId: 'a', ops: [] });
      ob.remove('a');
      assert.equal(count, 2);
    } finally {
      delete globalThis.document;
    }
  });
});
