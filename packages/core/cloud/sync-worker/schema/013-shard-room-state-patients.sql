-- One row per patient instead of one fat core blob (room_state) holding every
-- entry, tombstone and entityVersions key. Every push used to rewrite that
-- whole blob, so cost grew with room size and a 74-patient bulk delete made
-- D1 answer "DB is overloaded". See docs/superpowers/plans/2026-09-28-cheap-room-pushes.md.
--
-- Phase 1 (this migration + reader): nothing writes this table yet. The
-- reader only looks here when the core blob carries `patientsSharded: 1`;
-- without that marker any rows here are ignored. Same lazy, no-bulk-migration
-- pattern as 010.
CREATE TABLE room_state_patients (
  room_id TEXT NOT NULL REFERENCES rooms(id),
  patient_id TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (room_id, patient_id)
);
