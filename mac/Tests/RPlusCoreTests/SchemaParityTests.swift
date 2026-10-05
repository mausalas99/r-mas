import Foundation
import GRDB
import Testing
@testable import RPlusCore

/// Fixtures come from Fixtures/make-schema-fixtures.mjs: Node's applyMigrations on the same
/// starting file gives expected-*.json. Swift must reach the same tables, SQL and rows.
private struct Dump: Codable, Equatable {
    var schema: [[String]]
    var data: [String: [[String]]]
    var fkViolations: Int
}

private let fixtures = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Fixtures")

private let dataQueries: [String: String] = [
    "users": "SELECT * FROM users",
    // Same masking as the Node generator: v13 stamps updated_at with the clock.
    "teams": """
        SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, sala, team_leader_name,
        leader_user_id, rotation_active, archived_at,
        CASE WHEN updated_at IS NULL THEN 'NULL' WHEN updated_at LIKE '2026-04-05%' THEN updated_at ELSE 'NOW' END,
        succeeds_team_id FROM teams
        """,
    "team_membership": "SELECT * FROM team_membership", "active_guardias": "SELECT * FROM active_guardias",
    "patients": "SELECT * FROM patients", "patient_team_assignment": "SELECT * FROM patient_team_assignment",
    "lan_sync_outbox": "SELECT * FROM lan_sync_outbox", "user_activity_log": "SELECT * FROM user_activity_log",
    "equipos_device": "SELECT device_type, status FROM equipos_device",
    "sala_interno_access": "SELECT sala, is_active FROM sala_interno_access",
    "app_meta": "SELECT key, value FROM app_meta WHERE key = 'schema_version'",
]

/// Same whitespace rule as the Node generator: collapse runs, drop space around ( ) ,
private func norm(_ sql: String?) -> String {
    guard var s = sql else { return "NULL" }
    s = s.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    s = s.replacingOccurrences(of: #"\s*([(),])\s*"#, with: "$1", options: .regularExpression)
    return s.trimmingCharacters(in: .whitespaces)
}

private func cell(_ v: DatabaseValue) -> String {
    switch v.storage {
    case .null: "NULL"
    case .int64(let i): String(i)
    case .double(let d): String(d)
    case .string(let s): s
    case .blob: "BLOB"
    }
}

private func dump(_ db: Database) throws -> Dump {
    let schema = try Row.fetchAll(db, sql: "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
        .map { [$0["type"] as String, $0["name"] as String, $0["tbl_name"] as String, norm($0["sql"] as String?)] }
    var data: [String: [[String]]] = [:]
    for (table, sql) in dataQueries where try Schema.tableExists(db, table) {
        data[table] = try Row.fetchAll(db, sql: "\(sql) ORDER BY rowid").map { row in row.map { cell($0.1) } }
    }
    let fk = try Row.fetchAll(db, sql: "PRAGMA foreign_key_check").count
    return Dump(schema: schema, data: data, fkViolations: fk)
}

private func upgrade(startFixture: String?) throws -> Dump {
    let path = NSTemporaryDirectory() + "rplus-schema-\(UUID().uuidString).db"
    defer { for s in ["", "-wal", "-shm"] { try? FileManager.default.removeItem(atPath: path + s) } }
    if let startFixture {
        try FileManager.default.copyItem(at: fixtures.appendingPathComponent(startFixture), to: URL(fileURLWithPath: path))
    }
    let queue = try DatabaseQueue(path: path)
    try Schema.apply(to: queue)
    return try queue.read { try dump($0) }
}

private func expected(_ name: String) throws -> Dump {
    try JSONDecoder().decode(Dump.self, from: Data(contentsOf: fixtures.appendingPathComponent("expected-\(name).json")))
}

private func expectSame(_ name: String, from start: String?) throws {
    let got = try upgrade(startFixture: start)
    let want = try expected(name)
    #expect(got.schema == want.schema, "schema differs for \(name)")
    for table in Set(got.data.keys).union(want.data.keys).sorted() {
        #expect(got.data[table] == want.data[table], "rows differ in \(table) for \(name)")
    }
    #expect(got.fkViolations == want.fkViolations)
}

@Test func freshDatabaseMatchesNode() throws {
    try expectSame("fresh", from: nil)
}

@Test(arguments: [1, 3, 5, 10, 14, 20, 24, 28])
func upgradeFromOldVersionMatchesNode(version: Int) throws {
    try expectSame("v\(version)", from: "start-v\(version).db")
}

@Test func currentVersionIsNoOp() throws {
    let queue = try DatabaseQueue()
    try Schema.apply(to: queue)
    let first = try queue.read { try dump($0) }
    try Schema.apply(to: queue)
    #expect(try queue.read { try dump($0) } == first)
    #expect(try queue.read { try Schema.readVersion($0) } == Schema.version)
}
