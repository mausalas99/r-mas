import Foundation
import GRDB

public enum ClinicalDatabaseError: Error, Equatable {
    case invalidKey
    case unreadable
}

/// Opens the encrypted clinical DB. Same engine and settings as the Electron app
/// (packages/core/lib/db/db-manager-auth-internals.mjs): default cipher, raw 32-byte hex key.
public enum ClinicalDatabase {
    public static func open(path: String, keyHex: String) throws -> DatabaseQueue {
        // Trust boundary: the key goes into a PRAGMA string, so allow only 64 hex chars.
        guard keyHex.count == 64, keyHex.allSatisfy(\.isHexDigit) else {
            throw ClinicalDatabaseError.invalidKey
        }
        var config = Configuration()
        config.prepareDatabase { db in
            try db.execute(sql: "PRAGMA key = \"x'\(keyHex)'\"")
            _ = try String.fetchOne(db, sql: "PRAGMA journal_mode = WAL")
        }
        do {
            let queue = try DatabaseQueue(path: path, configuration: config)
            _ = try queue.read { try Int.fetchOne($0, sql: "SELECT count(*) FROM sqlite_master") }
            return queue
        } catch let error as DatabaseError where error.resultCode == .SQLITE_NOTADB {
            throw ClinicalDatabaseError.unreadable
        }
    }

    /// Name of the cipher in use. Electron files report "chacha20".
    public static func cipherName(_ queue: DatabaseQueue) throws -> String? {
        try queue.read { try String.fetchOne($0, sql: "PRAGMA cipher") }
    }
}
