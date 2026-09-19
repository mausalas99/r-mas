ALTER TABLE users ADD COLUMN active_room_id TEXT REFERENCES rooms(id);
