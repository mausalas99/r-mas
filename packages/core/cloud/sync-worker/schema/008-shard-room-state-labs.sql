-- D1 hard-caps any single BLOB/string/row at 2,000,000 bytes. room_state
-- stored the whole room (including labSidecars, the field with no set-count
-- cap) as one blob and started hitting SQLITE_TOOBIG. labSidecars moves into
-- its own table, one row per patient, so no single row can approach the cap.
-- No data migration here: sync.js loadRoomState() reads legacy embedded
-- labSidecars from the core row as a fallback, and the next write to a room
-- self-migrates it into these shard rows.
CREATE TABLE room_state_labs (
  room_id TEXT NOT NULL REFERENCES rooms(id),
  patient_id TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (room_id, patient_id)
);
