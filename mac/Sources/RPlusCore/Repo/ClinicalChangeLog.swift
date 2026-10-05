import Foundation
import GRDB

public struct ChangeLogEntry: Equatable, Sendable {
    public var changeId: String
    public var commandType: String
    /// JSON array text, exactly as stored.
    public var blobKeys: String
    public var patientId: String?
    public var actorId: String?
    public var origin: String
    public var createdAt: String
}

/// Port of lib/clinical-repo/change-log.mjs: the list of local writes that Nube sync still has to send.
public enum ClinicalChangeLog {
    /// Blob key that carries a patient's registro number inside `blob_keys`.
    public static func registroBlobKey(_ registro: String?) -> String {
        let r = (registro ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return r.isEmpty ? "" : "__reg:\(r)"
    }

    /// Trimmed, non-blank keys of a JS array.
    private static func cleanKeys(_ items: [JSON]) -> [String] {
        items.map { $0.isTruthy ? $0.jsString.trimmingCharacters(in: .whitespacesAndNewlines) : "" }.filter { !$0.isEmpty }
    }

    /// `raw` is the stored `blob_keys`: an array, or text holding a JSON array. Anything else gives no keys.
    public static func parseBlobKeysAndRegistro(_ raw: JSON) -> (blobKeys: [String], registro: String) {
        var keys: [String] = []
        switch raw {
        case .array(let items): keys = cleanKeys(items)
        case .string(let s) where !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty:
            if case .array(let items)? = try? JSON.parse(s) { keys = cleanKeys(items) }
        default: break
        }
        var registro = ""
        var blobKeys: [String] = []
        for k in keys {
            if k.hasPrefix("__reg:") { registro = String(k.dropFirst("__reg:".count)); continue }
            blobKeys.append(k)
        }
        return (blobKeys, registro)
    }

    /// Adds one unsynced row. Call it in the same transaction as the blob write. Returns the new `change_id`.
    @discardableResult
    public static func append(
        _ db: Database, commandType: String, blobKeys: [String], patientId: String? = nil, actorId: String? = nil,
        origin: String? = nil, registro: String? = nil, now: Date = Date()
    ) throws -> String {
        let changeId = "chg_" + UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        let trimmedOrigin = origin?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        var keys = blobKeys
        let regKey = registroBlobKey(registro)
        if !regKey.isEmpty { keys.append(regKey) }
        try db.execute(
            sql: """
                INSERT INTO clinical_change_log
                  (change_id, command_type, blob_keys, patient_id, actor_id, origin, created_at, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
                """,
            arguments: [changeId, commandType, JSON.array(keys.map { .string($0) }).stringify(), patientId, actorId,
                        trimmedOrigin.isEmpty ? "ui" : trimmedOrigin, isoTimestamp(now)])
        return changeId
    }

    /// Oldest first. With `changeIds` (blank ones dropped) only those rows, no limit.
    /// Otherwise `limit` is 100 when 0 and clamped to 1...500.
    public static func listUnsynced(_ db: Database, limit: Int = 100, changeIds: [String] = []) throws -> [ChangeLogEntry] {
        let ids = changeIds.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        let select = """
            SELECT change_id, command_type, blob_keys, patient_id, actor_id, origin, created_at
            FROM clinical_change_log WHERE synced_at IS NULL
            """
        let rows: [Row]
        if !ids.isEmpty {
            rows = try Row.fetchAll(db, sql: "\(select) AND change_id IN (\(ids.map { _ in "?" }.joined(separator: ","))) ORDER BY id ASC",
                                    arguments: StatementArguments(ids))
        } else {
            rows = try Row.fetchAll(db, sql: "\(select) ORDER BY id ASC LIMIT ?", arguments: [max(1, min(500, limit == 0 ? 100 : limit))])
        }
        return rows.map {
            ChangeLogEntry(changeId: $0["change_id"], commandType: $0["command_type"], blobKeys: $0["blob_keys"],
                           patientId: $0["patient_id"], actorId: $0["actor_id"], origin: $0["origin"], createdAt: $0["created_at"])
        }
    }

    /// Stamps rows that are still unsynced. Returns how many changed.
    @discardableResult
    public static func markSynced(_ db: Database, changeIds: [String], syncedAt: String) throws -> Int {
        let ids = changeIds.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        var n = 0
        try db.inSavepoint {
            for id in ids {
                try db.execute(sql: "UPDATE clinical_change_log SET synced_at = ? WHERE change_id = ? AND synced_at IS NULL", arguments: [syncedAt, id])
                n += db.changesCount
            }
            return .commit
        }
        return n
    }
}
