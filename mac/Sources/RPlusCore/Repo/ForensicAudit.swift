import CryptoKit
import Foundation
import GRDB

public struct AuditRow: Equatable, Sendable {
    public var id: Int64
    public var timestamp: String
    public var clientId: String
    public var eventType: String
    public var payloadHash: String
    public var previousHash: String
    public var currentHash: String
}

/// Port of lib/db/forensic-audit.mjs: a hash chain over `forensic_audit_chain`.
public enum ForensicAudit {
    public static let genesisPreviousHash = String(repeating: "0", count: 64)

    private static func sha256Hex(_ text: String) -> String {
        SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    /// sha256 of the canonical JSON of `meta`. Missing or falsy meta hashes as `{}` (JS `meta || {}`).
    public static func hashPayload(_ meta: JSON?) -> String {
        sha256Hex(meta.flatMap { $0.isTruthy ? $0 : nil }?.canonical() ?? "{}")
    }

    public static func computeBlockHash(_ row: AuditRow) -> String {
        sha256Hex([String(row.id), row.timestamp, row.clientId, row.eventType, row.payloadHash, row.previousHash].joined(separator: "|"))
    }

    /// Id of the first broken row, or nil when the chain is intact. `rows` must be in id order.
    public static func verify(_ rows: [AuditRow]) -> Int64? {
        var previous = genesisPreviousHash
        for r in rows {
            if r.previousHash != previous { return r.id }
            if computeBlockHash(r) != r.currentHash { return r.id }
            previous = r.currentHash
        }
        return nil
    }

    public static func loadAll(_ db: Database) throws -> [AuditRow] {
        try Row.fetchAll(db, sql: """
            SELECT id, timestamp, client_id, event_type, payload_hash, previous_hash, current_hash
            FROM forensic_audit_chain ORDER BY id ASC
            """).map {
            AuditRow(id: $0["id"], timestamp: $0["timestamp"], clientId: $0["client_id"], eventType: $0["event_type"],
                     payloadHash: $0["payload_hash"], previousHash: $0["previous_hash"], currentHash: $0["current_hash"])
        }
    }

    /// Adds one block. Call inside a transaction, like Node's `appendAuditInTransaction`.
    @discardableResult
    public static func append(_ db: Database, clientId: String, eventType: String, meta: JSON? = nil, now: Date = Date()) throws -> (id: Int64, currentHash: String) {
        let payloadHash = hashPayload(meta)
        let previousHash = try String.fetchOne(db, sql: "SELECT current_hash FROM forensic_audit_chain ORDER BY id DESC LIMIT 1") ?? genesisPreviousHash
        let timestamp = isoTimestamp(now)
        try db.execute(
            sql: """
                INSERT INTO forensic_audit_chain (timestamp, client_id, event_type, payload_hash, previous_hash, current_hash)
                VALUES (?, ?, ?, ?, ?, 'pending')
                """,
            arguments: [timestamp, clientId, eventType, payloadHash, previousHash])
        let id = db.lastInsertedRowID
        let currentHash = computeBlockHash(AuditRow(id: id, timestamp: timestamp, clientId: clientId, eventType: eventType,
                                                    payloadHash: payloadHash, previousHash: previousHash, currentHash: ""))
        try db.execute(sql: "UPDATE forensic_audit_chain SET current_hash = ? WHERE id = ?", arguments: [currentHash, id])
        return (id, currentHash)
    }
}
