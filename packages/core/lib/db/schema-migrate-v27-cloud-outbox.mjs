/**
 * cloud_outbox — Nube mutation queue moved off plaintext localStorage into the
 * encrypted clinical DB. Client keeps its own in-memory copy for speed and
 * writes the full queue here after every change (small queue, cheap replace)
 * so a closed/crashed app doesn't lose pending clinical edits.
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV27CloudOutbox(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cloud_outbox (
      client_mutation_id TEXT PRIMARY KEY,
      ops TEXT NOT NULL,
      base_revision INTEGER,
      enqueued_at INTEGER NOT NULL
    );
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '27');
}
