-- Room revision that last wrote each lab set. Lets a catch-up snapshot pull
-- send only the lab sets written after the client's `since`, instead of every
-- lab of every patient (that full read overloaded D1 on 2026-10-05).
-- Backfill = the room's revision now: a client behind today gets every
-- existing set once, never misses one. Rows the old code writes between this
-- migration and the deploy keep 0, which the pull always sends.
ALTER TABLE room_state_lab_sets ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
UPDATE room_state_lab_sets
  SET revision = (SELECT revision FROM rooms WHERE rooms.id = room_state_lab_sets.room_id);
CREATE INDEX idx_room_state_lab_sets_revision ON room_state_lab_sets (room_id, revision);
