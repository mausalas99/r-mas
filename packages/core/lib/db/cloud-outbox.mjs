/**
 * Durable backing store for the Nube mutation outbox — the client keeps a
 * fast in-memory copy and mirrors the whole (small) queue here on every
 * change, so a closed/crashed app still has its pending edits on restart.
 * @param {import('better-sqlite3').Database} db
 * @returns {{ clientMutationId: string, ops: unknown[], baseRevision?: number, enqueuedAt: number }[]}
 */
export function listCloudOutbox(db) {
  const rows = db
    .prepare('SELECT client_mutation_id, ops, base_revision, enqueued_at FROM cloud_outbox ORDER BY enqueued_at ASC')
    .all();
  return rows.map((row) => {
    let ops = [];
    try {
      ops = JSON.parse(row.ops);
    } catch {
      ops = [];
    }
    const entry = {
      clientMutationId: row.client_mutation_id,
      ops: Array.isArray(ops) ? ops : [],
      enqueuedAt: row.enqueued_at,
    };
    if (row.base_revision != null) entry.baseRevision = row.base_revision;
    return entry;
  });
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ clientMutationId: string, ops: unknown[], baseRevision?: number, enqueuedAt: number }[]} rows
 */
export function replaceCloudOutbox(db, rows) {
  db.prepare('DELETE FROM cloud_outbox').run();
  const insert = db.prepare(
    'INSERT INTO cloud_outbox (client_mutation_id, ops, base_revision, enqueued_at) VALUES (?, ?, ?, ?)'
  );
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.clientMutationId || '').trim();
    if (!id) continue;
    insert.run(
      id,
      JSON.stringify(Array.isArray(row.ops) ? row.ops : []),
      row.baseRevision != null ? Number(row.baseRevision) : null,
      Number(row.enqueuedAt) || Date.now()
    );
  }
}
