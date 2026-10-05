import Foundation
import GRDB

/// Schema upgrades v1 -> v29. Port of packages/core/lib/db/schema-*.mjs.
/// SQL is copied verbatim so both apps build the same tables. Parity is proven by
/// SchemaParityTests, which upgrades Node-made databases here and compares them with Node's result.
public enum Schema {
    public static let version = 29

    public static let salaValues = [
        "Sala 1", "Sala 2", "Sala E", "Torre HU", "Área A/Pensionistas", "Interconsultas", "UX", "Eme",
    ]

    /// Upgrade an open database to the current version. Safe to call on every launch.
    public static func apply(to queue: DatabaseQueue) throws {
        try queue.writeWithoutTransaction { try apply($0) }
    }

    static func apply(_ db: Database) throws {
        let current = try readVersion(db)
        if current == version { return }

        try transaction(db) {
            var v = current
            if v == nil { try migrateToV1(db); v = 1 }
            let at = v ?? 1
            if at < 2 { try migrateToV2(db) }
            if at < 3 { try migrateToV3(db) }
            if at < 4 { try migrateToV4(db) }
            if at < 5 { try migrateToV5(db) }
            if at < 6 { try migrateToV6(db) }
            if at < 7 { try migrateToV7(db) }
            if at < 8 { try migrateToV8(db) }
            if at < 9 { try migrateToV9(db) }
            if at < 10 { try migrateToV10(db) }
        }

        if try below(db, 11) {
            try withoutForeignKeys(db) { try transaction(db) { try migrateToV11(db) } }
        }
        let steps: [(Int, (Database) throws -> Void)] = [
            (12, migrateToV12), (13, migrateToV13), (14, migrateToV14),
            (15, migrateToV15), (16, migrateToV16), (17, migrateToV17),
            (18, migrateToV18), (19, migrateToV19), (20, migrateToV20),
        ]
        for (n, step) in steps {
            if try below(db, n) { try transaction(db) { try step(db) } }
        }
        // v21 ran without a transaction in Electron. Wrapped here: same result, no half-done state.
        if try below(db, 21) {
            try withoutForeignKeys(db) { try transaction(db) { try migrateToV21(db) } }
        }
        if try below(db, 22) { try transaction(db) { try migrateToV22(db) } }
        if try below(db, 23) { try transaction(db) { try migrateToV23(db) } }
        if try below(db, 24) { try transaction(db) { try migrateToV24(db) } }
        if try below(db, 25) {
            try withoutForeignKeys(db) { try transaction(db) { try migrateToV25(db) } }
        }
        if try below(db, 26) { try transaction(db) { try migrateToV26(db) } }
        if try below(db, 27) { try transaction(db) { try migrateToV27(db) } }
        if try below(db, 28) { try transaction(db) { try migrateToV28(db) } }
        if try below(db, 29) {
            try withoutForeignKeys(db) { try transaction(db) { try migrateToV29(db) } }
        }
    }

    // MARK: helpers

    static func readVersion(_ db: Database) throws -> Int? {
        guard try tableExists(db, "app_meta") else { return nil }
        guard let value = try String.fetchOne(db, sql: "SELECT value FROM app_meta WHERE key = 'schema_version'")
        else { return nil }
        return Int(value)
    }

    static func below(_ db: Database, _ n: Int) throws -> Bool {
        (try readVersion(db) ?? 0) < n
    }

    static func setVersion(_ db: Database, _ n: Int) throws {
        try db.execute(
            sql: "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            arguments: ["schema_version", String(n)])
    }

    static func tableExists(_ db: Database, _ name: String) throws -> Bool {
        try Int.fetchOne(db, sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", arguments: [name]) != nil
    }

    static func columns(_ db: Database, _ table: String) throws -> [String] {
        try Row.fetchAll(db, sql: "PRAGMA table_info(\(table))").map { $0["name"] as String }
    }

    static func columnExists(_ db: Database, _ table: String, _ column: String) throws -> Bool {
        guard try tableExists(db, table) else { return false }
        return try columns(db, table).contains(column)
    }

    /// Add a column only when it is missing (the Electron code does this check inline each time).
    static func addColumn(_ db: Database, _ table: String, _ column: String, _ definition: String) throws {
        if try !columns(db, table).contains(column) {
            try db.execute(sql: "ALTER TABLE \(table) ADD COLUMN \(column) \(definition)")
        }
    }

    static func transaction(_ db: Database, _ body: () throws -> Void) throws {
        try db.inTransaction { try body(); return .commit }
    }

    static func withoutForeignKeys(_ db: Database, _ body: () throws -> Void) throws {
        try db.execute(sql: "PRAGMA foreign_keys = OFF")
        defer { try? db.execute(sql: "PRAGMA foreign_keys = ON") }
        try body()
    }

    static func randomTokenHex() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    static func sqlList(_ values: [String]) -> String {
        values.map { "'\($0.replacingOccurrences(of: "'", with: "''"))'" }.joined(separator: ", ")
    }

    /// `clinicalSalaSqlCheck` in clinical-salas.mjs.
    static func salaCheck(allowNull: Bool) -> String {
        allowNull ? "CHECK(sala IN (\(sqlList(salaValues))) OR sala IS NULL)" : "CHECK(sala IN (\(sqlList(salaValues))))"
    }
}
