// Makes the schema parity fixtures. Run with Electron's Node (the app's real engine):
//   ELECTRON_RUN_AS_NODE=1 <Electron binary> make-schema-fixtures.mjs <path to better-sqlite3-multiple-ciphers>
// Writes start-vN.db (synthetic data at schema version N) and expected-*.json (what Node's
// applyMigrations makes of it). Swift must reach the same schema and rows.
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbDir = resolve(here, '../../../../packages/core/lib/db');
const Database = createRequire(import.meta.url)(resolve(process.argv[2]));
const mod = (f) => import(join(dbDir, f));

const { applyMigrations } = await mod('schema.mjs');
const v1 = await mod('schema-migrate-v1-v10.mjs');
const v11 = await mod('schema-migrate-v11-v14.mjs');
const v15 = await mod('schema-migrate-v15-v17.mjs');
const steps = [
  null, v1.migrateToV1, v1.migrateToV2, v1.migrateToV3, v1.migrateToV4, v1.migrateToV5, v1.migrateToV6,
  v1.migrateToV7, v1.migrateToV8, v1.migrateToV9, v1.migrateToV10, v11.migrateToV11, v11.migrateToV12,
  v11.migrateToV13, v11.migrateToV14, v15.migrateToV15LanHostTables, v15.migrateToV16UserLastActivity,
  v15.migrateToV17UserActivityBackfill,
  (await mod('schema-migrate-v18-equipos.mjs')).migrateToV18Equipos,
  (await mod('schema-migrate-v19-equipos-alert-photos.mjs')).migrateToV19EquiposAlertPhotos,
  (await mod('schema-migrate-v20-equipos-push.mjs')).migrateToV20EquiposPush,
  (await mod('schema-migrate-v21-clinical-sala-check.mjs')).migrateToV21ClinicalSalaCheck,
  (await mod('schema-migrate-v22-user-activity-log.mjs')).migrateToV22UserActivityLog,
  (await mod('schema-migrate-v23-clinical-change-log.mjs')).migrateToV23ClinicalChangeLog,
  (await mod('schema-migrate-v24-active-guardias-index.mjs')).migrateToV24ActiveGuardiasIndex,
  (await mod('schema-migrate-v25-interconsult-under.mjs')).migrateToV25InterconsultUnder,
  (await mod('schema-migrate-v26-teams-succeeds.mjs')).migrateToV26TeamsSucceedsTeamId,
  (await mod('schema-migrate-v27-cloud-outbox.mjs')).migrateToV27CloudOutbox,
  (await mod('schema-migrate-v28-sync-write-clocks.mjs')).migrateToV28SyncWriteClocks,
  (await mod('schema-migrate-v29-assignment-tombstone.mjs')).migrateToV29AssignmentTombstone,
];

const hasTable = (db, t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
const cols = (db, t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);

/** Synthetic rows valid for the schema at version n (no real patient data). */
function seed(db, n) {
  const u = cols(db, 'users');
  const addUser = (id, rank, extra = {}) => {
    const row = { user_id: id, username: id, password_hash: 'x', rank, public_key: 'pk', encrypted_private_key: 'sk',
      created_at: '2026-01-02 03:04:05', ...extra };
    const keys = Object.keys(row).filter((k) => u.includes(k));
    db.prepare(`INSERT INTO users (${keys}) VALUES (${keys.map(() => '?')})`).run(keys.map((k) => row[k]));
  };
  addUser('u1', 'R1', { clinical_name: 'Uno', sala: 'Sala 1', last_activity_at: '2026-02-03T04:05:06.789Z' });
  addUser('u2', 'R2', { sala: 'Sala E', last_activity_at: '2026-03-04 05:06:07' });
  addUser('u3', 'Admin');

  const t = cols(db, 'teams');
  const team = { team_id: 't1', name: 'Equipo', service: 'Sala', sub_area_fraction: '1/2', on_call_day_index: 2,
    created_by: 'u1', sala: 'Sala 2', updated_at: '2026-04-05T00:00:00Z' };
  const tk = Object.keys(team).filter((k) => t.includes(k));
  db.prepare(`INSERT INTO teams (${tk}) VALUES (${tk.map(() => '?')})`).run(tk.map((k) => team[k]));

  db.prepare('INSERT INTO team_membership (team_id, user_id) VALUES (?, ?)').run('t1', 'u1');
  db.prepare('INSERT INTO team_membership (team_id, user_id) VALUES (?, ?)').run('t1', 'u2');
  db.prepare("INSERT INTO patients (id, interconsult_type) VALUES ('p1', 'Follow-up')").run();
  db.prepare("INSERT INTO active_guardias (guardia_id, patient_id, covering_user_id, source_team_id) VALUES ('g1','p1','u1','t1')").run();
  if (hasTable(db, 'patient_team_assignment')) {
    db.prepare("INSERT INTO patient_team_assignment (patient_id, team_id, effective_at) VALUES ('p1','t1','2026-01-01')").run();
  }
  if (hasTable(db, 'lan_sync_outbox')) {
    db.prepare("INSERT INTO lan_sync_outbox (room_id, kind, payload_json, enqueued_at) VALUES ('r','bundle','{}','2026-01-01')").run();
  }
  if (hasTable(db, 'sala_interno_access') && n < 11) {
    db.prepare("UPDATE sala_interno_access SET rotated_at='2026-01-01' WHERE sala='Sala 1'").run();
  }
}

const norm = (s) => (s == null ? 'NULL' : s.replace(/\s+/g, ' ').replace(/\s*([(),])\s*/g, '$1').trim());
const cell = (v) => (v == null ? 'NULL' : String(v));
const DATA = {
  users: 'SELECT * FROM users',
  // v13 backfills updated_at with the clock, so mask it unless it is the seeded value.
  teams: `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, sala, team_leader_name,
    leader_user_id, rotation_active, archived_at,
    CASE WHEN updated_at IS NULL THEN 'NULL' WHEN updated_at LIKE '2026-04-05%' THEN updated_at ELSE 'NOW' END,
    succeeds_team_id FROM teams`,
  team_membership: 'SELECT * FROM team_membership',
  active_guardias: 'SELECT * FROM active_guardias', patients: 'SELECT * FROM patients',
  patient_team_assignment: 'SELECT * FROM patient_team_assignment', lan_sync_outbox: 'SELECT * FROM lan_sync_outbox',
  user_activity_log: 'SELECT * FROM user_activity_log',
  equipos_device: 'SELECT device_type, status FROM equipos_device',
  sala_interno_access: 'SELECT sala, is_active FROM sala_interno_access',
  app_meta: "SELECT key, value FROM app_meta WHERE key = 'schema_version'",
};

function dump(db) {
  const schema = db
    .prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
    .all()
    .map((r) => [r.type, r.name, r.tbl_name, norm(r.sql)]);
  const data = {};
  for (const [table, sql] of Object.entries(DATA)) {
    if (!hasTable(db, table)) continue;
    data[table] = db.prepare(`${sql} ORDER BY rowid`).raw().all().map((row) => row.map(cell));
  }
  return { schema, data, fkViolations: db.pragma('foreign_key_check').length };
}

mkdirSync(here, { recursive: true });
const tmp = join(here, '_tmp.db');
const versions = [1, 3, 5, 10, 14, 20, 24, 28];

function finish(name, startFile) {
  const work = join(here, '_work.db');
  rmSync(work, { force: true });
  if (startFile) copyFileSync(startFile, work);
  const db = new Database(work);
  db.pragma('foreign_keys = ON');
  applyMigrations(db);
  writeFileSync(join(here, `expected-${name}.json`), JSON.stringify(dump(db), null, 1) + '\n');
  db.close();
  rmSync(work, { force: true });
}

finish('fresh', null);
for (const n of versions) {
  rmSync(tmp, { force: true });
  const db = new Database(tmp);
  db.pragma('journal_mode = DELETE');
  for (let i = 1; i <= n; i += 1) {
    if (i === 11) db.pragma('foreign_keys = OFF');
    steps[i](db);
    db.pragma('foreign_keys = ON');
  }
  if (n >= 3) seed(db, n);
  db.close();
  const start = join(here, `start-v${n}.db`);
  copyFileSync(tmp, start);
  finish(`v${n}`, start);
}
rmSync(tmp, { force: true });
console.log('ok');
