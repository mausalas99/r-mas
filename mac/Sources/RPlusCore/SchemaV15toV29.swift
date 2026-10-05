import Foundation
import GRDB

// Port of schema-migrate-v15-v17.mjs and schema-migrate-v18 … v29.
extension Schema {
    static func migrateToV15(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS lan_host_meta (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              version INTEGER NOT NULL,
              team_code_hash TEXT NOT NULL,
              patients_json TEXT NOT NULL DEFAULT '[]',
              rooms_json TEXT NOT NULL DEFAULT '[]',
              room_revisions_json TEXT,
              migration_generation INTEGER,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lan_room_bundles (
              room_id TEXT PRIMARY KEY,
              revision INTEGER NOT NULL,
              entity_versions_json TEXT,
              agenda_json TEXT,
              todos_json TEXT,
              manejo_json TEXT,
              clinical_ops_json TEXT,
              delta_log_json TEXT,
              committed_at TEXT,
              audit_log_json TEXT,
              uploaded_by_client_id TEXT,
              entities_json TEXT
            );

            CREATE TABLE IF NOT EXISTS lan_bundle_entries (
              room_id TEXT NOT NULL,
              patient_id TEXT NOT NULL,
              entry_json TEXT NOT NULL,
              nota_version INTEGER,
              indicaciones_version INTEGER,
              lab_meta_json TEXT,
              PRIMARY KEY (room_id, patient_id)
            );

            CREATE TABLE IF NOT EXISTS lan_lab_sets (
              room_id TEXT NOT NULL,
              patient_id TEXT NOT NULL,
              set_id TEXT NOT NULL,
              set_json TEXT NOT NULL,
              sort_date TEXT NOT NULL,
              client_timestamp INTEGER NOT NULL,
              PRIMARY KEY (room_id, patient_id, set_id)
            );

            CREATE TABLE IF NOT EXISTS lan_lab_set_order (
              room_id TEXT NOT NULL,
              patient_id TEXT NOT NULL,
              pos INTEGER NOT NULL,
              set_id TEXT NOT NULL,
              PRIMARY KEY (room_id, patient_id, pos)
            );
            """)
        try setVersion(db, 15)
    }

    static func migrateToV16(_ db: Database) throws {
        if try tableExists(db, "users") {
            try addColumn(db, "users", "last_activity_at", "TEXT")
        }
        try setVersion(db, 16)
    }

    static func migrateToV17(_ db: Database) throws {
        if try tableExists(db, "users") {
            let cols = try columns(db, "users")
            if cols.contains("last_activity_at") && cols.contains("created_at") {
                try db.execute(sql: """
                    UPDATE users
                    SET last_activity_at = created_at
                    WHERE last_activity_at IS NULL AND created_at IS NOT NULL
                    """)
            }
        }
        try setVersion(db, 17)
    }

    // MARK: v18 equipos

    static let equiposDeviceTypes = ["lumify", "ekg", "ultrasound"]

    static func migrateToV18(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS equipos_program_access (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              access_token TEXT NOT NULL,
              is_active INTEGER NOT NULL DEFAULT 1,
              rotated_at TEXT,
              rotated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS equipos_device (
              device_type TEXT PRIMARY KEY CHECK(device_type IN ('lumify', 'ekg', 'ultrasound')),
              status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'in_use', 'alert')),
              holder_name TEXT,
              holder_rotation TEXT,
              previous_holder_name TEXT,
              previous_holder_rotation TEXT,
              checked_out_at TEXT,
              charge_pct INTEGER,
              gel_empty INTEGER,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS equipos_waitlist (
              id TEXT PRIMARY KEY,
              device_type TEXT NOT NULL CHECK(device_type IN ('lumify', 'ekg', 'ultrasound')),
              reporter_name TEXT NOT NULL,
              rotation TEXT NOT NULL,
              joined_at TEXT NOT NULL,
              position INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_equipos_waitlist_device ON equipos_waitlist(device_type, position);

            CREATE TABLE IF NOT EXISTS equipos_sessions (
              id TEXT PRIMARY KEY,
              device_type TEXT NOT NULL,
              holder_name TEXT NOT NULL,
              holder_rotation TEXT NOT NULL,
              checked_out_at TEXT NOT NULL,
              returned_at TEXT,
              duration_seconds INTEGER,
              closed_reason TEXT CHECK(closed_reason IN ('return', 'admin_purge', 'admin_force_return')),
              lumify_pickup_charge_pct INTEGER,
              lumify_charge_pct INTEGER,
              lumify_gel_empty INTEGER,
              pickup_photo_id TEXT,
              return_photo_id TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_equipos_sessions_device ON equipos_sessions(device_type, checked_out_at);

            CREATE TABLE IF NOT EXISTS equipos_team_reports (
              id TEXT PRIMARY KEY,
              device_type TEXT NOT NULL,
              kind TEXT NOT NULL CHECK(kind IN ('missing_material', 'malfunction')),
              message TEXT,
              reporter_name TEXT NOT NULL,
              rotation TEXT NOT NULL,
              created_at TEXT NOT NULL,
              acknowledged_at TEXT,
              acknowledged_by_name TEXT,
              acknowledged_by_rotation TEXT,
              active INTEGER NOT NULL DEFAULT 1,
              photo_id TEXT
            );

            CREATE TABLE IF NOT EXISTS equipos_events (
              id TEXT PRIMARY KEY,
              device_type TEXT,
              event_type TEXT NOT NULL,
              reporter_name TEXT,
              rotation TEXT,
              meta_json TEXT,
              created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_equipos_events_created ON equipos_events(created_at);

            CREATE TABLE IF NOT EXISTS equipos_photos (
              id TEXT PRIMARY KEY,
              session_id TEXT,
              report_id TEXT,
              device_type TEXT NOT NULL,
              photo_kind TEXT NOT NULL CHECK(photo_kind IN ('pickup', 'return', 'alert')),
              file_path TEXT NOT NULL,
              captured_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS equipos_host_lease (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              mode TEXT NOT NULL DEFAULT 'primary' CHECK(mode IN ('primary', 'temporary')),
              host_url TEXT,
              holder_user_id TEXT,
              holder_rank TEXT,
              holder_name TEXT,
              promoted_at TEXT,
              remembered_primary_url TEXT,
              superseded_at TEXT
            );
            """)

        let now = ISO8601DateFormatter.withMillis.string(from: Date())
        for device in equiposDeviceTypes {
            try db.execute(
                sql: "INSERT OR IGNORE INTO equipos_device (device_type, status, updated_at) VALUES (?, 'available', ?)",
                arguments: [device, now])
        }
        if try Int.fetchOne(db, sql: "SELECT id FROM equipos_program_access WHERE id = 1") == nil {
            try db.execute(
                sql: "INSERT INTO equipos_program_access (id, access_token, is_active, rotated_at) VALUES (1, ?, 1, ?)",
                arguments: [randomTokenHex(), now])
        }
        try db.execute(
            sql: "INSERT OR IGNORE INTO equipos_host_lease (id, mode, promoted_at) VALUES (1, 'primary', ?)",
            arguments: [now])
        try setVersion(db, 18)
    }

    static func migrateToV19(_ db: Database) throws {
        if try tableExists(db, "equipos_team_reports"), try !columnExists(db, "equipos_team_reports", "photo_id") {
            try db.execute(sql: "ALTER TABLE equipos_team_reports ADD COLUMN photo_id TEXT")
        }
        if try tableExists(db, "equipos_photos"), try !columnExists(db, "equipos_photos", "report_id") {
            try db.execute(sql: """
                CREATE TABLE equipos_photos_v19 (
                  id TEXT PRIMARY KEY,
                  session_id TEXT,
                  report_id TEXT,
                  device_type TEXT NOT NULL,
                  photo_kind TEXT NOT NULL CHECK(photo_kind IN ('pickup', 'return', 'alert')),
                  file_path TEXT NOT NULL,
                  captured_at TEXT NOT NULL
                );
                INSERT INTO equipos_photos_v19 (id, session_id, report_id, device_type, photo_kind, file_path, captured_at)
                SELECT id, session_id, NULL, device_type, photo_kind, file_path, captured_at
                FROM equipos_photos;
                DROP TABLE equipos_photos;
                ALTER TABLE equipos_photos_v19 RENAME TO equipos_photos;
                """)
        }
        try setVersion(db, 19)
    }

    static func migrateToV20(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS equipos_push_subscriptions (
              id TEXT PRIMARY KEY,
              endpoint TEXT NOT NULL,
              p256dh TEXT NOT NULL,
              auth TEXT NOT NULL,
              reporter_name TEXT NOT NULL,
              rotation TEXT NOT NULL,
              device_type TEXT NOT NULL CHECK(device_type IN ('lumify', 'ekg', 'ultrasound')),
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              UNIQUE(endpoint, device_type)
            );
            CREATE INDEX IF NOT EXISTS idx_equipos_push_waitlist
              ON equipos_push_subscriptions(device_type, reporter_name, rotation);
            """)
        try setVersion(db, 20)
    }

    /// Widen users/teams/sala_interno_access sala CHECK to the full list.
    static func migrateToV21(_ db: Database) throws {
        let check = salaCheck(allowNull: true)
        let checkNotNull = salaCheck(allowNull: false)
        try migrateUsersTableV11(db, salaCheck: check)
        try migrateTeamsTableV11(db, salaCheck: check)
        if try tableExists(db, "users") {
            try migrateSalaInternoAccessV11(db, salaCheckNotNull: checkNotNull)
            try seedSalaInternoTokensV11(db)
        }
        try setVersion(db, 21)
    }

    // MARK: v22

    static func migrateToV22(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS user_activity_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              at_iso TEXT NOT NULL,
              source TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_at
              ON user_activity_log(user_id, at_iso DESC);
            """)
        try backfillUserActivityLog(db)
        try setVersion(db, 22)
    }

    /// Seeds history from users.created_at and users.last_activity_at.
    static func backfillUserActivityLog(_ db: Database) throws {
        guard try tableExists(db, "users") else { return }
        let cols = try columns(db, "users")
        let hasCreated = cols.contains("created_at")
        let hasLast = cols.contains("last_activity_at")
        if !hasCreated && !hasLast { return }

        var select = ["user_id"]
        if hasCreated { select.append("created_at") }
        if hasLast { select.append("last_activity_at") }
        let users = try Row.fetchAll(db, sql: "SELECT \(select.joined(separator: ", ")) FROM users")

        func text(_ row: Row, _ col: String) -> String? { String.fromDatabaseValue(row[col]) }
        func seen(_ uid: String, _ at: String) throws -> Bool {
            try Int.fetchOne(db, sql: "SELECT 1 AS ok FROM user_activity_log WHERE user_id = ? AND at_iso = ? LIMIT 1",
                             arguments: [uid, at]) != nil
        }
        func insert(_ uid: String, _ at: String, _ source: String) throws {
            try db.execute(sql: "INSERT INTO user_activity_log (user_id, at_iso, source) VALUES (?, ?, ?)",
                           arguments: [uid, at, source])
        }
        for user in users {
            let uid = (text(user, "user_id") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if uid.isEmpty { continue }
            let created = hasCreated ? normalizeActivityIso(text(user, "created_at")) : ""
            let last = hasLast ? normalizeActivityIso(text(user, "last_activity_at")) : ""
            if !created.isEmpty, try !seen(uid, created) { try insert(uid, created, "seed_created") }
            if !last.isEmpty, last != created, try !seen(uid, last) { try insert(uid, last, "seed_last") }
        }
    }

    /// Like JS `new Date(Date.parse(...)).toISOString()` for the formats the app writes:
    /// "YYYY-MM-DD HH:MM:SS" (UTC) and ISO strings with or without a zone (no zone = local time).
    // ponytail: JS's loose Date.parse formats are not ported; unparseable text is kept as-is.
    static func normalizeActivityIso(_ raw: String?) -> String {
        let s = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return "" }
        let candidate: String
        if s.contains("T") {
            candidate = s
        } else if let space = s.firstIndex(of: " ") {
            candidate = s.replacingCharacters(in: space...space, with: "T") + "Z"
        } else {
            candidate = s + "Z"
        }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let d = ISO8601DateFormatter.withMillis.date(from: candidate) ?? plain.date(from: candidate) {
            return ISO8601DateFormatter.withMillis.string(from: d)
        }
        let local = DateFormatter()
        local.locale = Locale(identifier: "en_US_POSIX")
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm"] {
            local.dateFormat = format
            if let d = local.date(from: candidate) { return ISO8601DateFormatter.withMillis.string(from: d) }
        }
        return s
    }

    // MARK: v23 – v29

    static func migrateToV23(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS clinical_change_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              change_id TEXT NOT NULL UNIQUE,
              command_type TEXT NOT NULL,
              blob_keys TEXT NOT NULL,
              patient_id TEXT,
              actor_id TEXT,
              origin TEXT NOT NULL DEFAULT 'ui',
              created_at TEXT NOT NULL,
              synced_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_clinical_change_log_unsynced
              ON clinical_change_log(synced_at, id);
            """)
        try setVersion(db, 23)
    }

    static func migrateToV24(_ db: Database) throws {
        if try tableExists(db, "active_guardias") {
            try db.execute(sql: """
                CREATE INDEX IF NOT EXISTS idx_active_guardias_patient_status
                  ON active_guardias(patient_id, status);
                CREATE INDEX IF NOT EXISTS idx_active_guardias_status_covering
                  ON active_guardias(status, covering_user_id);
                CREATE INDEX IF NOT EXISTS idx_active_guardias_status_assigned
                  ON active_guardias(status, assigned_at);
                """)
        }
        if try tableExists(db, "team_membership") {
            try db.execute(sql: "CREATE INDEX IF NOT EXISTS idx_team_membership_user ON team_membership(user_id);")
        }
        if try tableExists(db, "team_guardia_today") {
            try db.execute(sql: "CREATE INDEX IF NOT EXISTS idx_team_guardia_today_user ON team_guardia_today(user_id);")
        }
        try setVersion(db, 24)
    }

    struct SchemaError: Error, CustomStringConvertible { let description: String }

    /// Widen patients.interconsult_type CHECK to add 'Under'. Reuses the table's real DDL so no column is lost.
    static func migrateToV25(_ db: Database) throws {
        if try tableExists(db, "patients"), try columns(db, "patients").contains("interconsult_type") {
            let original = try String.fetchOne(db, sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='patients'") ?? ""
            let oldCheck = try NSRegularExpression(
                pattern: #"CHECK\s*\(\s*interconsult_type\s+IN\s*\([^)]*\)\s*\)"#, options: .caseInsensitive)
            let createHead = try NSRegularExpression(
                pattern: #"CREATE TABLE\s+"?patients\b"?"#, options: .caseInsensitive)
            func replaceFirst(_ re: NSRegularExpression, in s: String, with new: String) -> String? {
                guard let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)),
                      let r = Range(m.range, in: s) else { return nil }
                return s.replacingCharacters(in: r, with: new)
            }
            guard let widened = replaceFirst(
                oldCheck, in: original, with: "CHECK(interconsult_type IN ('Ephemeral_VPO', 'Follow-up', 'None', 'Under'))")
            else {
                throw SchemaError(description: "migrateToV25: could not find interconsult_type CHECK in patients DDL, aborting to avoid dropping columns")
            }
            let sql = replaceFirst(createHead, in: widened, with: "CREATE TABLE patients_v25") ?? widened
            try db.execute(sql: """
                \(sql);
                INSERT INTO patients_v25 SELECT * FROM patients;
                DROP TABLE patients;
                ALTER TABLE patients_v25 RENAME TO patients;
                """)
        }
        try setVersion(db, 25)
    }

    static func migrateToV26(_ db: Database) throws {
        if try tableExists(db, "teams") {
            try addColumn(db, "teams", "succeeds_team_id", "TEXT REFERENCES teams(team_id)")
        }
        try setVersion(db, 26)
    }

    static func migrateToV27(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS cloud_outbox (
              client_mutation_id TEXT PRIMARY KEY,
              ops TEXT NOT NULL,
              base_revision INTEGER,
              enqueued_at INTEGER NOT NULL
            );
            """)
        try setVersion(db, 27)
    }

    static func migrateToV28(_ db: Database) throws {
        for (table, column) in [("team_membership", "cycle_set_at"), ("active_guardias", "updated_at")] {
            if try tableExists(db, table) { try addColumn(db, table, column, "TEXT") }
        }
        try setVersion(db, 28)
    }

    /// A patient with no team is a row with team_id ''. It must sync, so it cannot point at teams(team_id):
    /// rebuild patient_team_assignment without that foreign key. Skips a table already rebuilt.
    static func migrateToV29(_ db: Database) throws {
        if try tableExists(db, "patient_team_assignment") {
            let sql = try String.fetchOne(db, sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='patient_team_assignment'") ?? ""
            let refsTeams = try NSRegularExpression(pattern: #"REFERENCES\s+"?teams\b"#, options: .caseInsensitive)
                .firstMatch(in: sql, range: NSRange(sql.startIndex..., in: sql)) != nil
            if refsTeams {
                try db.execute(sql: """
                    CREATE TABLE patient_team_assignment_v29 (
                      patient_id TEXT NOT NULL,
                      team_id TEXT NOT NULL,
                      effective_at TEXT NOT NULL,
                      created_at TEXT NOT NULL DEFAULT (datetime('now')),
                      PRIMARY KEY (patient_id, team_id, effective_at),
                      FOREIGN KEY(patient_id) REFERENCES patients(id)
                    );
                    INSERT INTO patient_team_assignment_v29 (patient_id, team_id, effective_at, created_at)
                      SELECT patient_id, team_id, effective_at, created_at FROM patient_team_assignment;
                    DROP TABLE patient_team_assignment;
                    ALTER TABLE patient_team_assignment_v29 RENAME TO patient_team_assignment;
                    """)
            }
        }
        try setVersion(db, 29)
    }
}
