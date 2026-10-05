import Foundation
import GRDB

/// Patient census in the `patients` blob, plus the `patients` table rows.
/// Port of transforms/patients.mjs, the patients part of adapters/sqlcipher.mjs and clinical-access-assignments.mjs.
public enum ClinicalPatients {
    public enum Transform: Equatable {
        case ok([JSON])
        case failed(String)
    }

    /// The census, in stored order. Bad or missing blob gives an empty list.
    public static func load(_ db: Database) throws -> [JSON] {
        if case .array(let rows) = try ClinicalBlobs.loadValue(db, key: "patients") { return rows }
        return []
    }

    public static func save(_ db: Database, _ patients: [JSON], updatedAt: String = isoTimestamp()) throws {
        try ClinicalBlobs.saveValue(db, key: "patients", value: .array(patients), updatedAt: updatedAt)
    }

    /// Trimmed census ids. Bad text or wrong shape gives an empty set.
    public static func censusIds(_ db: Database) throws -> Set<String> {
        guard let raw = try ClinicalBlobs.get(db, key: "patients"), !raw.isEmpty,
              case .array(let rows)? = try? JSON.parse(raw) else { return [] }
        var ids = Set<String>()
        for row in rows {
            let v = row["id"] ?? .null
            let id = v.isTruthy ? v.jsString.trimmingCharacters(in: .whitespacesAndNewlines) : ""
            if !id.isEmpty { ids.insert(id) }
        }
        return ids
    }

    /// JS `p && String(p.id)`: nil for a falsy row, "undefined" when the row has no id.
    private static func idString(_ p: JSON) -> String? {
        guard p.isTruthy else { return nil }
        return p["id"]?.jsString ?? "undefined"
    }

    /// Adds the patient, or replaces the row with the same id in place. Needs a non-blank id.
    public static func applyUpsert(_ patients: [JSON], patient: JSON) -> Transform {
        guard case .object = patient, let raw = patient["id"], raw != .null else { return .failed("invalid_patient") }
        let id = raw.jsString.trimmingCharacters(in: .whitespacesAndNewlines)
        if id.isEmpty { return .failed("invalid_patient") }
        let next = patient.setting("id", .string(id))
        guard let index = patients.firstIndex(where: { idString($0) == id }) else { return .ok(patients + [next]) }
        var out = patients
        out[index] = next
        return .ok(out)
    }

    /// Removes every row with this id. An id that is not there is fine.
    public static func applyDelete(_ patients: [JSON], patientId: String) -> Transform {
        let id = patientId.trimmingCharacters(in: .whitespacesAndNewlines)
        if id.isEmpty { return .failed("invalid_patient_id") }
        return .ok(patients.filter { idString($0) != id })
    }

    // MARK: `patients` table

    /// Makes sure the table has a row for this patient. Blank id: nothing.
    public static func ensureRow(_ db: Database, patientId: String) throws {
        let id = patientId.trimmingCharacters(in: .whitespacesAndNewlines)
        if id.isEmpty { return }
        try db.execute(sql: "INSERT OR IGNORE INTO patients (id) VALUES (?)", arguments: [id])
    }

    /// Team a patient belongs to at `nowIso`: latest assignment with `effective_at <= now`.
    /// nil when none, or when the latest one is a no-team tombstone (empty team id).
    public static func activeTeamId(_ db: Database, patientId: String, nowIso: String = isoTimestamp()) throws -> String? {
        let pid = patientId.trimmingCharacters(in: .whitespacesAndNewlines)
        if pid.isEmpty { return nil }
        let team = try String.fetchOne(db, sql: """
            SELECT team_id FROM patient_team_assignment
            WHERE patient_id = ? AND effective_at <= ?
            ORDER BY effective_at DESC, created_at DESC LIMIT 1
            """, arguments: [pid, nowIso])?.trimmingCharacters(in: .whitespacesAndNewlines)
        return (team ?? "").isEmpty ? nil : team
    }
}
