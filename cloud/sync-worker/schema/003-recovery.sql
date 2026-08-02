-- cloud/sync-worker/schema/003-recovery.sql
ALTER TABLE users ADD COLUMN recovery_salt BLOB;
ALTER TABLE users ADD COLUMN recovery_hash BLOB;
ALTER TABLE users ADD COLUMN recovery_updated_at TEXT;
