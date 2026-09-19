-- cloud/sync-worker/schema/005-interno-access.sql
CREATE TABLE IF NOT EXISTS sala_interno_access (
  sala TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  rotated_at TEXT,
  rotated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_sala_interno_access_active ON sala_interno_access(is_active);
