import Foundation
import GRDB

// Port of schema-primitives.mjs, schema-migrate-v1-v10.mjs, schema-migrate-v11-*.mjs.
extension Schema {
    static let ddlV1 = [
        "CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        """
        CREATE TABLE clinical_blob (
          namespace TEXT NOT NULL DEFAULT 'desktop',
          blob_key TEXT NOT NULL,
          json TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (namespace, blob_key)
          )
        """,
        """
        CREATE TABLE lan_host_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          version INTEGER NOT NULL,
          team_code_hash TEXT NOT NULL,
          json TEXT NOT NULL,
          updated_at TEXT NOT NULL
          )
        """,
        """
        CREATE TABLE forensic_audit_chain (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          client_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload_hash TEXT NOT NULL,
          previous_hash TEXT NOT NULL,
          current_hash TEXT NOT NULL
          )
        """,
        "CREATE INDEX idx_audit_ts ON forensic_audit_chain(timestamp)",
        "CREATE INDEX idx_audit_type ON forensic_audit_chain(event_type)",
    ]

    /// Idempotent clinical-access tables (users, teams, guardias, patient columns).
    static func ensureClinicalAccessTables(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS users (
              user_id TEXT PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              rank TEXT NOT NULL CHECK(rank IN ('R1', 'R2', 'R3', 'R4', 'Admin')),
              public_key TEXT NOT NULL,
              encrypted_private_key TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS teams (
              team_id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              service TEXT NOT NULL CHECK(service IN ('Sala', 'Torre HU', 'Eme', 'UX', 'Interconsultas', 'Área A/Pensionistas')),
              sub_area_fraction TEXT,
              on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6),
              created_by TEXT,
              FOREIGN KEY(created_by) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS team_membership (
              team_id TEXT,
              user_id TEXT,
              PRIMARY KEY(team_id, user_id),
              FOREIGN KEY(team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
              FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS active_guardias (
              guardia_id TEXT PRIMARY KEY,
              patient_id TEXT NOT NULL,
              covering_user_id TEXT NOT NULL,
              source_team_id TEXT NOT NULL,
              is_critical INTEGER DEFAULT 0 CHECK(is_critical IN (0, 1)),
              pendientes_json TEXT,
              vitals_frequency TEXT DEFAULT 'None' CHECK(vitals_frequency IN ('1h', '2h', '4h', 'Shift_Once', 'None')),
              last_vitals_check DATETIME DEFAULT CURRENT_TIMESTAMP,
              assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Resolved')),
              FOREIGN KEY(covering_user_id) REFERENCES users(user_id)
            );
            """)

        if try !tableExists(db, "patients") {
            try db.execute(sql: "CREATE TABLE patients (id TEXT PRIMARY KEY)")
        }
        let patientCols = try columns(db, "patients")
        if !patientCols.contains("interconsult_type") {
            try db.execute(sql: "ALTER TABLE patients ADD COLUMN interconsult_type TEXT DEFAULT 'None' CHECK(interconsult_type IN ('Ephemeral_VPO', 'Follow-up', 'None', 'Under'))")
        }
        if !patientCols.contains("interconsult_status") {
            try db.execute(sql: "ALTER TABLE patients ADD COLUMN interconsult_status TEXT DEFAULT 'Pending' CHECK(interconsult_status IN ('Pending', 'Resolved', 'Active'))")
        }
        if !patientCols.contains("prognosis_classification") {
            try db.execute(sql: "ALTER TABLE patients ADD COLUMN prognosis_classification TEXT DEFAULT 'Buen Pronóstico'")
        }
        if !patientCols.contains("negativa_maniobras_firmada") {
            try db.execute(sql: "ALTER TABLE patients ADD COLUMN negativa_maniobras_firmada INTEGER DEFAULT 0 CHECK(negativa_maniobras_firmada IN (0, 1))")
        }
    }

    static func migrateToV1(_ db: Database) throws {
        for sql in ddlV1 { try db.execute(sql: sql) }
        try ensureClinicalAccessTables(db)
        try setVersion(db, 1)
        let createdAt = ISO8601DateFormatter.withMillis.string(from: Date())
        try db.execute(
            sql: "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            arguments: ["created_at", createdAt])
    }

    static func migrateToV2(_ db: Database) throws {
        // Pre–clinical-access DBs may have schema_version=1 without users/teams.
        try ensureClinicalAccessTables(db)
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS rotation_cycles (
              cycle_id TEXT PRIMARY KEY,
              month_end_at TEXT NOT NULL,
              preview_days INTEGER NOT NULL DEFAULT 2,
              preview_start_at TEXT NOT NULL,
              effective_at TEXT NOT NULL,
              archived_at TEXT,
              created_by TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY(created_by) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS patient_team_assignment (
              patient_id TEXT NOT NULL,
              team_id TEXT NOT NULL,
              effective_at TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              PRIMARY KEY (patient_id, team_id, effective_at),
              FOREIGN KEY(patient_id) REFERENCES patients(id),
              FOREIGN KEY(team_id) REFERENCES teams(team_id)
            );

            CREATE TABLE IF NOT EXISTS team_guardia_today (
              team_id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              declared_at TEXT NOT NULL,
              FOREIGN KEY(team_id) REFERENCES teams(team_id),
              FOREIGN KEY(user_id) REFERENCES users(user_id)
            );
            """)
        if try tableExists(db, "teams") {
            try addColumn(db, "teams", "archived_at", "TEXT")
        }
        // Electron writes the final version here, not 2. Kept so version reads match.
        try setVersion(db, version)
    }

    static func migrateToV3(_ db: Database) throws {
        try addColumn(db, "users", "clinical_name", "TEXT")
        try addColumn(db, "users", "sala", "TEXT CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E') OR sala IS NULL)")
        try addColumn(db, "teams", "sala", "TEXT CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E') OR sala IS NULL)")
        try addColumn(db, "teams", "team_leader_name", "TEXT")
        try setVersion(db, 3)
    }

    static func migrateToV4(_ db: Database) throws {
        try addColumn(db, "teams", "leader_user_id", "TEXT REFERENCES users(user_id)")
        try addColumn(db, "teams", "rotation_active", "INTEGER NOT NULL DEFAULT 1 CHECK(rotation_active IN (0, 1))")
        try setVersion(db, 4)
    }

    static func migrateToV5(_ db: Database) throws {
        try addColumn(db, "users", "is_program_admin", "INTEGER NOT NULL DEFAULT 0")
        try db.execute(sql: "UPDATE users SET is_program_admin = 1 WHERE rank = 'Admin'")
        try setVersion(db, 5)
    }

    static func migrateToV6(_ db: Database) throws {
        try addColumn(db, "team_membership", "sub_area_fraction", "TEXT")
        try db.execute(sql: """
            UPDATE team_membership
            SET sub_area_fraction = (
              SELECT t.sub_area_fraction
              FROM teams t
              JOIN users u ON u.user_id = team_membership.user_id
              WHERE t.team_id = team_membership.team_id
                AND u.rank = 'R2'
                AND t.sub_area_fraction IS NOT NULL
            )
            WHERE sub_area_fraction IS NULL
            """)
        try setVersion(db, 6)
    }

    static func migrateToV7(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS sala_interno_access (
              sala TEXT PRIMARY KEY CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E')),
              access_token TEXT NOT NULL,
              is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
              rotated_at TEXT,
              rotated_by TEXT,
              FOREIGN KEY(rotated_by) REFERENCES users(user_id)
            );
            """)
        for sala in ["Sala 1", "Sala 2", "Sala E"] {
            try db.execute(
                sql: "INSERT OR IGNORE INTO sala_interno_access (sala, access_token, is_active) VALUES (?, ?, 1)",
                arguments: [sala, randomTokenHex()])
        }
        try setVersion(db, 7)
    }

    static func migrateToV8(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS entrega_template_user (
              template_id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              name TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY(user_id) REFERENCES users(user_id)
            );
            CREATE TABLE IF NOT EXISTS entrega_template_team (
              template_id TEXT PRIMARY KEY,
              team_id TEXT NOT NULL,
              name TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              created_by TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY(team_id) REFERENCES teams(team_id),
              FOREIGN KEY(created_by) REFERENCES users(user_id)
            );
            """)
        try setVersion(db, 8)
    }

    static func migrateToV9(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS lan_sync_outbox (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              room_id TEXT NOT NULL,
              kind TEXT NOT NULL CHECK (kind IN ('bundle', 'patch', 'clinical_ops')),
              payload_json TEXT NOT NULL,
              enqueued_at TEXT NOT NULL,
              attempts INTEGER NOT NULL DEFAULT 0,
              last_error TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
            """)
        try setVersion(db, 9)
    }

    /// Rebuilds `lan_sync_outbox` with a wider `kind` CHECK. Shared by v10, v12 and v14.
    static func rebuildLanOutbox(_ db: Database, suffix: String, kinds: String) throws {
        try db.execute(sql: """
            CREATE TABLE lan_sync_outbox_\(suffix) (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              room_id TEXT NOT NULL,
              kind TEXT NOT NULL CHECK (kind IN (\(kinds))),
              payload_json TEXT NOT NULL,
              enqueued_at TEXT NOT NULL,
              attempts INTEGER NOT NULL DEFAULT 0,
              last_error TEXT
            );
            INSERT INTO lan_sync_outbox_\(suffix)
              (id, room_id, kind, payload_json, enqueued_at, attempts, last_error)
            SELECT id, room_id, kind, payload_json, enqueued_at, attempts, last_error
            FROM lan_sync_outbox;
            DROP TABLE lan_sync_outbox;
            ALTER TABLE lan_sync_outbox_\(suffix) RENAME TO lan_sync_outbox;
            CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
            """)
    }

    static func migrateToV10(_ db: Database) throws {
        try rebuildLanOutbox(db, suffix: "v10", kinds: "'bundle', 'patch', 'clinical_ops', 'delta'")
        try setVersion(db, 10)
    }

    // MARK: v11 (also reused by v21)

    /// CASE remapping any sala outside the current list to the first value (NULL stays NULL).
    static func salaRemapCase() -> String {
        "CASE WHEN sala IS NULL THEN NULL WHEN sala IN (\(sqlList(salaValues))) THEN sala ELSE '\(salaValues[0])' END"
    }

    static func migrateUsersTableV11(_ db: Database, salaCheck: String) throws {
        guard try tableExists(db, "users") else { return }
        let hasLast = try columns(db, "users").contains("last_activity_at")
        let lastCol = hasLast ? ", last_activity_at TEXT" : ""
        let lastList = hasLast ? ", last_activity_at" : ""
        try db.execute(sql: """
            CREATE TABLE users_v11 (
              user_id TEXT PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              rank TEXT NOT NULL CHECK(rank IN ('R1', 'R2', 'R3', 'R4', 'Admin')),
              public_key TEXT NOT NULL,
              encrypted_private_key TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              clinical_name TEXT,
              sala TEXT \(salaCheck),
              is_program_admin INTEGER NOT NULL DEFAULT 0\(lastCol)
            );
            INSERT INTO users_v11 (
              user_id, username, password_hash, rank, public_key, encrypted_private_key,
              created_at, clinical_name, sala, is_program_admin\(lastList)
            )
            SELECT
              user_id, username, password_hash, rank, public_key, encrypted_private_key,
              created_at, clinical_name, \(salaRemapCase()), is_program_admin\(lastList)
            FROM users;
            DROP TABLE users;
            ALTER TABLE users_v11 RENAME TO users;
            """)
    }

    static func migrateTeamsTableV11(_ db: Database, salaCheck: String) throws {
        guard try tableExists(db, "teams") else { return }
        let hasUpdated = try columns(db, "teams").contains("updated_at")
        let updatedCol = hasUpdated ? ", updated_at TEXT" : ""
        let updatedList = hasUpdated ? ", updated_at" : ""
        try db.execute(sql: """
            CREATE TABLE teams_v11 (
              team_id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              service TEXT NOT NULL CHECK(service IN ('Sala', 'Torre HU', 'Eme', 'UX', 'Interconsultas', 'Área A/Pensionistas')),
              sub_area_fraction TEXT,
              on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6),
              created_by TEXT,
              sala TEXT \(salaCheck),
              team_leader_name TEXT,
              leader_user_id TEXT REFERENCES users(user_id),
              rotation_active INTEGER NOT NULL DEFAULT 1 CHECK(rotation_active IN (0, 1)),
              archived_at TEXT\(updatedCol),
              FOREIGN KEY(created_by) REFERENCES users(user_id)
            );
            INSERT INTO teams_v11 (
              team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
              sala, team_leader_name, leader_user_id, rotation_active, archived_at\(updatedList)
            )
            SELECT
              team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
              \(salaRemapCase()), team_leader_name, leader_user_id, rotation_active, archived_at\(updatedList)
            FROM teams;
            DROP TABLE teams;
            ALTER TABLE teams_v11 RENAME TO teams;
            """)
    }

    static func migrateSalaInternoAccessV11(_ db: Database, salaCheckNotNull: String) throws {
        if try tableExists(db, "sala_interno_access") {
            // Old rows may hold a sala the current list no longer has. Remap to the first value,
            // and dedupe on the PK (prefer the active, most recently rotated token).
            try db.execute(sql: """
                CREATE TABLE sala_interno_access_v11 (
                  sala TEXT PRIMARY KEY \(salaCheckNotNull),
                  access_token TEXT NOT NULL,
                  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
                  rotated_at TEXT,
                  rotated_by TEXT,
                  FOREIGN KEY(rotated_by) REFERENCES users(user_id)
                );
                INSERT OR IGNORE INTO sala_interno_access_v11 (sala, access_token, is_active, rotated_at, rotated_by)
                SELECT
                  CASE WHEN sala IN (\(sqlList(salaValues))) THEN sala ELSE '\(salaValues[0])' END,
                  access_token, is_active, rotated_at, rotated_by
                FROM sala_interno_access
                ORDER BY is_active DESC, rotated_at DESC;
                DROP TABLE sala_interno_access;
                ALTER TABLE sala_interno_access_v11 RENAME TO sala_interno_access;
                """)
            return
        }
        try db.execute(sql: """
            CREATE TABLE sala_interno_access (
              sala TEXT PRIMARY KEY \(salaCheckNotNull),
              access_token TEXT NOT NULL,
              is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
              rotated_at TEXT,
              rotated_by TEXT,
              FOREIGN KEY(rotated_by) REFERENCES users(user_id)
            );
            """)
    }

    static func seedSalaInternoTokensV11(_ db: Database) throws {
        for sala in salaValues {
            try db.execute(
                sql: "INSERT OR IGNORE INTO sala_interno_access (sala, access_token, is_active) VALUES (?, ?, 1)",
                arguments: [sala, randomTokenHex()])
        }
    }

    static func migrateToV11(_ db: Database) throws {
        let check = salaCheck(allowNull: true)
        let checkNotNull = salaCheck(allowNull: false)
        try migrateUsersTableV11(db, salaCheck: check)
        try migrateTeamsTableV11(db, salaCheck: check)
        try migrateSalaInternoAccessV11(db, salaCheckNotNull: checkNotNull)
        try seedSalaInternoTokensV11(db)
        try setVersion(db, 11)
    }

    static func migrateToV12(_ db: Database) throws {
        if try tableExists(db, "lan_sync_outbox") {
            try rebuildLanOutbox(db, suffix: "v12", kinds: "'bundle', 'patch', 'clinical_ops', 'delta', 'command'")
        }
        try setVersion(db, 12)
    }

    static func migrateToV13(_ db: Database) throws {
        if try tableExists(db, "teams"), try !columns(db, "teams").contains("updated_at") {
            try db.execute(sql: "ALTER TABLE teams ADD COLUMN updated_at TEXT")
            try db.execute(sql: "UPDATE teams SET updated_at = COALESCE(archived_at, datetime('now')) WHERE updated_at IS NULL")
        }
        try setVersion(db, 13)
    }

    static func migrateToV14(_ db: Database) throws {
        if try tableExists(db, "lan_sync_outbox") {
            try rebuildLanOutbox(db, suffix: "v14", kinds: "'bundle', 'patch', 'clinical_ops', 'delta', 'command', 'lab_history_upsert', 'nota_replace', 'indicaciones_replace', 'patient_fields'")
        }
        try setVersion(db, 14)
    }
}

extension ISO8601DateFormatter {
    /// Same shape as JS `Date.toISOString()`: 2026-10-05T11:28:00.000Z.
    nonisolated(unsafe) static let withMillis: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
