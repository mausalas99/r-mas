export const SCHEMA_VERSION = 1;

const DDL_V1 = [
  `CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE clinical_blob (
  namespace TEXT NOT NULL DEFAULT 'desktop',
  blob_key TEXT NOT NULL,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (namespace, blob_key)
)`,
  `CREATE TABLE lan_host_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  team_code_hash TEXT NOT NULL,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE forensic_audit_chain (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  client_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL
)`,
  `CREATE INDEX idx_audit_ts ON forensic_audit_chain(timestamp)`,
  `CREATE INDEX idx_audit_type ON forensic_audit_chain(event_type)`,
];

function readSchemaVersion(db) {
  const hasMeta = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'"
  ).get();
  if (!hasMeta) return null;
  const row = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
  if (!row) return null;
  return Number(row.value);
}

/** @param {import('better-sqlite3').Database} db */
export function applyMigrations(db) {
  if (readSchemaVersion(db) === SCHEMA_VERSION) return;

  const createdAt = new Date().toISOString();
  const migrate = db.transaction(() => {
    for (const sql of DDL_V1) {
      db.exec(sql);
    }
    const upsert = db.prepare(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    upsert.run('schema_version', String(SCHEMA_VERSION));
    upsert.run('created_at', createdAt);
  });
  migrate();
}
