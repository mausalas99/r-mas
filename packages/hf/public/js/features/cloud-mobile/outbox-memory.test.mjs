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
