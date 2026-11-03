-- New iOS users request a sala and wait for desktop approval. Existing users stay approved.
ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved';

CREATE TABLE IF NOT EXISTS sala_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  requested_sala TEXT NOT NULL,
  assigned_sala TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sala_requests_user ON sala_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sala_requests_status ON sala_requests(status);
