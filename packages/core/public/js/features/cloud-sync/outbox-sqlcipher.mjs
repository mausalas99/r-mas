import { createOutbox } from './outbox.mjs';

function dbApi() {
  return (typeof window !== 'undefined' && (window.rplusDb || window.electronAPI)) || null;
}

/**
 * Desktop outbox: same in-memory shape and sync API as `createOutbox()`/
 * `createMemoryOutbox()`, but every save mirrors the whole (small) queue to
 * the encrypted clinical DB, so pending Nube edits survive a closed or
 * crashed app. Writes are serialized so an out-of-order IPC reply can never
 * overwrite a newer state with a stale one; each is best-effort — the
 * in-memory copy stays authoritative for the running session.
 */
export function createSqlcipherOutbox() {
  let cache = [];
  let writeChain = Promise.resolve();

  const outbox = createOutbox({
    load: () => cache,
    save: (rows) => {
      cache = rows;
      const snapshot = rows.slice();
      writeChain = writeChain.then(() =>
        Promise.resolve(dbApi()?.dbCloudOutboxReplaceAll?.(snapshot)).catch(() => {})
      );
    },
  });

  /** Populate the in-memory queue from the encrypted DB once at startup. */
  async function hydrate() {
    try {
      const res = await dbApi()?.dbCloudOutboxList?.();
      if (res?.ok && Array.isArray(res.rows) && res.rows.length) {
        outbox.replaceAll(res.rows);
      }
    } catch {
      /* best effort — in-memory queue starts empty, same as before this ran */
    }
  }

  return { ...outbox, hydrate };
}
