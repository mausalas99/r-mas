import Foundation
import GRDB

/// `new Date().toISOString()`: UTC, milliseconds, trailing Z.
public func isoTimestamp(_ date: Date = Date()) -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: date)
}

/// Port of lib/db/clinical-blobs.mjs, clinical-blob-keys.mjs and lib/clinical-repo/adapters/blobs.mjs.
/// All functions take the open `Database` so callers can group them in one transaction.
public enum ClinicalBlobs {
    /// localStorage `rpc-*` key -> `clinical_blob.blob_key`.
    public static let lsKeyToBlob: [String: String] = [
        "rpc-patients": "patients", "rpc-notes": "notes", "rpc-indicaciones": "indicaciones",
        "rpc-labHistory": "labHistory", "rpc-medRecetaByPatient": "medRecetaByPatient",
        "rpc-listado-problemas": "listadoProblemas", "rpc-vpoByPatient": "vpoByPatient",
        "rpc-medPharmProfileByPatient": "medPharmProfileByPatient", "rpc-medCatalog": "medCatalog",
        "rpc-todos": "todos", "rpc-scheduled-procedures": "scheduledProcedures",
    ]

    /// Blobs a `clinical.persistSnapshot` command may write (transforms/persist-snapshot.mjs).
    public static let persistKeys = [
        "patients", "notes", "indicaciones", "labHistory", "medRecetaByPatient",
        "medPharmProfileByPatient", "listadoProblemas", "vpoByPatient",
    ]

    // MARK: Raw text

    public static func upsert(_ db: Database, key: String, json: String, updatedAt: String = isoTimestamp()) throws {
        try db.execute(
            sql: """
                INSERT INTO clinical_blob (namespace, blob_key, json, updated_at) VALUES ('desktop', ?, ?, ?)
                ON CONFLICT(namespace, blob_key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at
                """,
            arguments: [key, json, updatedAt])
    }

    public static func get(_ db: Database, key: String) throws -> String? {
        try String.fetchOne(db, sql: "SELECT json FROM clinical_blob WHERE namespace = 'desktop' AND blob_key = ?", arguments: [key])
    }

    public static func loadAll(_ db: Database) throws -> [String: String] {
        var out: [String: String] = [:]
        for row in try Row.fetchAll(db, sql: "SELECT blob_key, json FROM clinical_blob WHERE namespace = 'desktop'") {
            out[row["blob_key"]] = row["json"]
        }
        return out
    }

    /// Blank keys are ignored. Returns rows deleted.
    @discardableResult
    public static func delete(_ db: Database, keys: [String]) throws -> Int {
        var n = 0
        for key in keys.map({ $0.trimmingCharacters(in: .whitespacesAndNewlines) }) where !key.isEmpty {
            try db.execute(sql: "DELETE FROM clinical_blob WHERE namespace = 'desktop' AND blob_key = ?", arguments: [key])
            n += db.changesCount
        }
        return n
    }

    // MARK: Typed values

    private static func fallback(_ key: String) -> JSON { key == "patients" ? .array([]) : .object([]) }

    /// Missing, empty, unparsable or wrong-shaped text gives `[]` for patients and `{}` for every other key.
    public static func loadValue(_ db: Database, key rawKey: String) throws -> JSON {
        let key = rawKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let raw = try get(db, key: key), !raw.isEmpty, let parsed = try? JSON.parse(raw) else { return fallback(key) }
        switch (key == "patients", parsed) {
        case (true, .array): return parsed
        case (false, .object): return parsed
        default: return fallback(key)
        }
    }

    /// Blank key: no write.
    public static func saveValue(_ db: Database, key rawKey: String, value: JSON, updatedAt: String = isoTimestamp()) throws {
        let key = rawKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { return }
        try upsert(db, key: key, json: value.stringify(), updatedAt: updatedAt)
    }

    /// Write guard: only keys that are present in `snapshot` are written. A key left out keeps what is stored.
    /// (Absent must never mean "cleared": that was the 2026-09-17 note-wipe bug.) Keys outside `persistKeys` are ignored.
    public static func saveValues(_ db: Database, snapshot: [String: JSON], updatedAt: String = isoTimestamp()) throws {
        for key in persistKeys {
            guard let value = snapshot[key] else { continue }
            try saveValue(db, key: key, value: value, updatedAt: updatedAt)
        }
    }

    // MARK: Persist-snapshot pick (transforms/persist-snapshot.mjs)

    public enum Pick: Equatable {
        case ok(changedKeys: [String], snapshot: [String: JSON])
        case failed(String)
    }

    /// Validates a `clinical.persistSnapshot` command. Present keys must have the right shape
    /// (patients: array, others: object). No key present gives `empty_snapshot`.
    public static func pickPersistSnapshot(_ payload: JSON) -> Pick {
        var snapshot: [String: JSON] = [:]
        var changed: [String] = []
        for key in persistKeys {
            guard let value = payload[key] else { continue }
            if key == "patients" {
                guard case .array = value else { return .failed("invalid_patients") }
            } else {
                guard case .object = value else { return .failed("invalid_\(key)") }
            }
            snapshot[key] = value
            changed.append(key)
        }
        return changed.isEmpty ? .failed("empty_snapshot") : .ok(changedKeys: changed, snapshot: snapshot)
    }
}
