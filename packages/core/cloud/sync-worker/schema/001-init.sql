CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_salt BLOB NOT NULL,
  password_hash BLOB NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  sala TEXT NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  revision INTEGER NOT NULL DEFAULT 0,
  storage_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE room_state (
  room_id TEXT PRIMARY KEY REFERENCES rooms(id),
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE mutations (
  room_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  client_mutation_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  ops_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (room_id, revision)
);

CREATE UNIQUE INDEX idx_mutations_client ON mutations(room_id, client_mutation_id);

CREATE TABLE tombstones (
  room_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  registro TEXT,
  deleted_at TEXT NOT NULL,
  PRIMARY KEY (room_id, patient_id)
);
