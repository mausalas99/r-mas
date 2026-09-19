-- room_state_labs (schema 008) still hard-caps at 2MB per row because it
-- stores a whole patient's lab history as one blob. A long stay eventually
-- crosses that ceiling and every future push for that patient fails forever
-- (payload_too_large on every retry — no size a client can send fixes it).
--
-- One row per lab SET instead: a single set is already bounded by
-- QUOTAS.labMutationMaxBytes (1MB, checked client-side per op before it is
-- ever sent), so no row here can approach the D1 cap regardless of how long
-- a patient's history grows. History length stops being a failure mode.
--
-- No data migration: sync.js loadRoomState() still reads legacy whole-patient
-- rows from room_state_labs as a base layer (frozen, never written again),
-- and overlays per-set rows from this table on top by (patient_id, set_id).
-- A patient migrates lazily, one set at a time, only when that specific set
-- is next touched — never a bulk rewrite of their existing history.
CREATE TABLE room_state_lab_sets (
  room_id TEXT NOT NULL REFERENCES rooms(id),
  patient_id TEXT NOT NULL,
  set_id TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (room_id, patient_id, set_id)
);
