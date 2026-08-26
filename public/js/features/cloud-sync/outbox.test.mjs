import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOutbox, CLOUD_OUTBOX_CHANGED_EVENT } from './outbox.mjs';

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

  it('merges by path — a smaller re-enqueue does not drop paths the pending batch already had', () => {
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
      ops: [
        { path: 'entries/p1/fields', value: { cama: '2' } },
        { path: 'entries/p1/monitoreo', value: { historial: [1] } },
        { path: 'entries/p1/eventualidades', value: { entries: [] } },
      ],
    });
    // A degraded rebuild (e.g. session lock stripped signed fields) re-enqueues
    // the same batch id with only eventualidades — monitoreo/fields must survive.
    ob.enqueue({
      clientMutationId: 'm1',
      ops: [{ path: 'entries/p1/eventualidades', value: { entries: [] } }],
    });
    assert.equal(ob.list().length, 1);
    const paths = ob.list()[0].ops.map((op) => op.path).sort();
    assert.deepEqual(paths, [
      'entries/p1/eventualidades',
      'entries/p1/fields',
      'entries/p1/monitoreo',
    ]);
  });

  it('enqueueMany does one load/save round trip for many items (backfill loop was quadratic on localStorage)', () => {
    const mem = [];
    let loads = 0;
    let saves = 0;
    const ob = createOutbox({
      load: () => {
        loads += 1;
        return mem.slice();
      },
      save: (rows) => {
        saves += 1;
        mem.length = 0;
        mem.push(...rows);
      },
    });
    ob.enqueueMany([
      { clientMutationId: 'labSidecars/p1', ops: [{ path: 'labSidecars/p1/lab-1', value: {} }] },
      { clientMutationId: 'labSidecars/p2', ops: [{ path: 'labSidecars/p2/lab-1', value: {} }] },
      { clientMutationId: 'labSidecars/p3', ops: [{ path: 'labSidecars/p3/lab-1', value: {} }] },
    ]);
    assert.equal(loads, 1);
    assert.equal(saves, 1);
    assert.equal(ob.list().length, 3);
    assert.deepEqual(
      ob.list().map((row) => row.clientMutationId).sort(),
      ['labSidecars/p1', 'labSidecars/p2', 'labSidecars/p3']
    );
  });

  it('enqueueMany merges by path against an already-queued clientMutationId, same as enqueue', () => {
    const mem = [];
    const ob = createOutbox({
      load: () => mem.slice(),
      save: (rows) => {
        mem.length = 0;
        mem.push(...rows);
      },
    });
    ob.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }] });
    ob.enqueueMany([{ clientMutationId: 'm1', ops: [{ path: 'b', value: 2 }] }]);
    assert.equal(ob.list().length, 1);
    const paths = ob.list()[0].ops.map((op) => op.path).sort();
    assert.deepEqual(paths, ['a', 'b']);
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

  it('notifies rpc-cloud-outbox-changed on enqueue/remove', () => {
    assert.equal(CLOUD_OUTBOX_CHANGED_EVENT, 'rpc-cloud-outbox-changed');
    const mem = [];
    const ob = createOutbox({
      load: () => mem.slice(),
      save: (rows) => {
        mem.length = 0;
        mem.push(...rows);
      },
    });
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
      ob.enqueue({ clientMutationId: 'm1', ops: [] });
      ob.remove('m1');
      assert.equal(count, 2);
    } finally {
      delete globalThis.document;
    }
  });
});
