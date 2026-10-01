// Test-only: a D1-shaped adapter over node:sqlite with the real schema/*.sql,
// so tests prove behaviour against real constraints, not SQL-string fakes.
// `calls` counts D1 round trips (each first/all/run and each batch = 1).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { sha256Hex } from './session.js';
import { encodeRoomState } from './crypto-at-rest.js';
import { emptyRoomState } from './rooms.js';

const SCHEMA_DIR = new URL('../schema/', import.meta.url);
const READ_RE = /^\s*(SELECT|WITH)\b/i;
const toArg = (v) => (v === undefined ? null : v instanceof ArrayBuffer ? new Uint8Array(v) : v);

export function sqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  for (const f of readdirSync(SCHEMA_DIR).filter((n) => n.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(f, SCHEMA_DIR), 'utf8'));
  }
  const d1 = { calls: 0, sqlite };
  const exec = (sql, args) => {
    const p = sqlite.prepare(sql);
    if (READ_RE.test(sql)) return { results: p.all(...args), meta: { changes: 0 } };
    return { results: [], meta: { changes: Number(p.run(...args).changes) } };
  };
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a.map(toArg)),
    exec: () => exec(sql, args),
    async first() { d1.calls += 1; return sqlite.prepare(sql).get(...args) ?? null; },
    async all() { d1.calls += 1; return { results: sqlite.prepare(sql).all(...args) }; },
    async run() { d1.calls += 1; return exec(sql, args); },
  });
  d1.prepare = (sql) => stmt(sql);
  d1.batch = async (stmts) => {
    d1.calls += 1;
    sqlite.exec('BEGIN');
    try {
      const out = stmts.map((s) => s.exec());
      sqlite.exec('COMMIT');
      return out;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  };
  return d1;
}

const NOW = '2026-09-30T00:00:00.000Z';

/** Seeds a user with a session token and (optionally) a room they belong to. */
export async function seedUser(d1, { env,  id, role = 'member', token, roomId, member = true, expiresAt = '2999-01-01T00:00:00.000Z' }) {
  const db = d1.sqlite;
  db.prepare(`INSERT INTO users (id, username, password_salt, password_hash, created_at, updated_at, role)
              VALUES (?, ?, x'00', x'00', ?, ?, ?)`).run(id, id, NOW, NOW, role);
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(await sha256Hex(token), id, NOW, expiresAt);
  if (roomId) {
    db.prepare(`INSERT OR IGNORE INTO rooms (id, code, sala, owner_user_id, created_at, updated_at)
                VALUES (?, ?, 'MI', ?, ?, ?)`).run(roomId, roomId, id, NOW, NOW);
    const { ciphertext, iv } = await encodeRoomState(env, emptyRoomState());
    db.prepare('INSERT OR IGNORE INTO room_state (room_id, ciphertext, iv, updated_at) VALUES (?, ?, ?, ?)')
      .run(roomId, toArg(ciphertext), toArg(iv), NOW);
    if (member) db.prepare('INSERT INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)').run(roomId, id, NOW);
  }
}
