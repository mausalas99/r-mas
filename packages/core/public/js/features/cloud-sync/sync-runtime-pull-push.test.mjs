import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutbox } from './outbox.mjs';
import { createPullPush } from './sync-runtime-pull-push.mjs';

// Node's navigator has no onLine; the flush skips while offline.
Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

/**
 * Device at revision 5 pushes one op. `pushResult` is what the Worker answers;
 * the pull answers with whatever other devices wrote meanwhile.
 */
let seq = 0;
function setup(pushResult) {
  seq += 1; // distinct op per test: the echo guard drops an op it already sent
  const mem = [];
  const outbox = createOutbox({ load: () => mem.slice(), save: (rows) => mem.splice(0, mem.length, ...rows) });
  outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: `entries/p${seq}/note`, value: { texto: 'b' }, updatedAt: '2026-09-27T08:00:00.000Z', actorId: 'b' }] });
  let revision = 5;
  const pulls = [];
  const applied = [];
  const api = {
    push: async () => pushResult,
    pull: async (_roomId, since) => {
      pulls.push(since);
      return { revision: 9, ops: [{ path: 'entries/p2/fields', value: { nombre: 'DEMO' } }] };
    },
  };
  const { flushOutbox } = createPullPush(
    {
      api,
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => revision,
      setRevision: (r) => { revision = r; },
      applyPullResult: async (res) => { applied.push(...(res?.ops || [])); },
    },
    () => {},
    { pendingCount: () => outbox.list().length, refreshIdleStatus() {} },
    { markLocalWrite() {} },
  );
  return { flushOutbox, pulls, applied, getRevision: () => revision };
}

test('push answered with needPull: the pull starts from the old revision, so other devices\' ops arrive', async () => {
  const s = setup({ revision: 9, applied: [], rejected: [], needPull: true });
  await s.flushOutbox();
  assert.deepEqual(s.pulls, [5]);
  assert.deepEqual(s.applied.map((o) => o.path), ['entries/p2/fields']);
  assert.equal(s.getRevision(), 9);
});

test('push with nothing new on the server: jump to the post-push revision, no extra pull', async () => {
  const s = setup({ revision: 6, applied: [], rejected: [], needPull: false });
  await s.flushOutbox();
  assert.deepEqual(s.pulls, []);
  assert.equal(s.getRevision(), 6);
});
