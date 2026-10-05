import Foundation
import GRDB
import Testing
@testable import RPlusCore

private let keyA = String(repeating: "ab", count: 32)
private let keyB = String(repeating: "cd", count: 32)

private func tempPath() -> String {
    NSTemporaryDirectory() + "rplus-\(UUID().uuidString).db"
}

@Test func encryptedRoundTripAndWrongKey() throws {
    let path = tempPath()
    defer { for s in ["", "-wal", "-shm"] { try? FileManager.default.removeItem(atPath: path + s) } }

    do {
        let db = try ClinicalDatabase.open(path: path, keyHex: keyA)
        try db.write { try $0.execute(sql: "CREATE TABLE t(x TEXT); INSERT INTO t VALUES ('hola')") }
        #expect(try ClinicalDatabase.cipherName(db) == "chacha20")
    }
    let db = try ClinicalDatabase.open(path: path, keyHex: keyA)
    #expect(try db.read { try String.fetchOne($0, sql: "SELECT x FROM t") } == "hola")

    #expect(throws: ClinicalDatabaseError.unreadable) {
        _ = try ClinicalDatabase.open(path: path, keyHex: keyB)
    }
    // File must not be plain SQLite.
    let head = try Data(contentsOf: URL(fileURLWithPath: path)).prefix(15)
    #expect(String(decoding: head, as: UTF8.self) != "SQLite format 3")
}

/// Parity: a file made by the Electron app's engine (synthetic data) opens here.
@Test func opensFileMadeByElectron() throws {
    let fixture = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().appendingPathComponent("Fixtures/electron-sample.db")
    let copy = tempPath()
    defer { for s in ["", "-wal", "-shm"] { try? FileManager.default.removeItem(atPath: copy + s) } }
    try FileManager.default.copyItem(at: fixture, to: URL(fileURLWithPath: copy))

    let db = try ClinicalDatabase.open(path: copy, keyHex: keyA)
    #expect(try db.read { try String.fetchOne($0, sql: "SELECT nombre FROM patients") } == "Paciente Sintético")
}

@Test func rejectsBadKey() {
    #expect(throws: ClinicalDatabaseError.invalidKey) {
        _ = try ClinicalDatabase.open(path: tempPath(), keyHex: "x'; DROP TABLE t; --")
    }
}
