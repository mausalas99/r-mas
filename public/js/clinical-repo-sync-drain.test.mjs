import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { drainClinicalSyncProjector } from './clinical-repo-sync-drain.mjs';
import { configureCloudMutateBridge } from './features/cloud-sync/mutate-bridge.mjs';

describe('clinical-repo-sync-drain', () => {
  const prev = globalThis.window;
  /** @type {{ clientMutationId: string, ops: unknown[] }[]} */
  let outbox;
  let flushed;

  beforeEach(() => {
    outbox = [];
    flushed = 0;
    globalThis.window = {
      electronAPI: {
        dbClinicalProjectUnsynced: async () => ({
          ok: true,
          mutations: [
            {
              clientMutationId: 'chg_1',
              ops: [
                {
                  path: 'entries/p1/eventualidades',
                  value: { entries: [{ id: 'ev_1', text: 'x' }] },
                  updatedAt: '2026-08-11T12:00:00.000Z',
                  actorId: 'u1',
                },
              ],
            },
          ],
          skipIds: ['chg_skip'],
        }),
        dbClinicalMarkSynced: async (payload) => {
          assert.ok(payload.changeIds.includes('chg_1'));
          assert.ok(payload.changeIds.includes('chg_skip'));
          return { ok: true, marked: payload.changeIds.length };
        },
      },
    };
    configureCloudMutateBridge({
      outbox: {
        enqueue: (item) => {
          outbox.push(item);
        },
      },
      flush: async () => {
        flushed += 1;
      },
      getRevision: () => 0,
    });
  });

  afterEach(() => {
    configureCloudMutateBridge(/** @type {any} */ (null));
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  });

  it('enqueues projected ops, marks synced, and flushes without memory bundle', async () => {
    const res = await drainClinicalSyncProjector({ actorId: 'u1' });
    assert.equal(res.ok, true);
    assert.equal(res.projected, 1);
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].clientMutationId, 'chg_1');
    assert.equal(outbox[0].ops[0].path, 'entries/p1/eventualidades');
    assert.equal(flushed, 1);
  });
});
