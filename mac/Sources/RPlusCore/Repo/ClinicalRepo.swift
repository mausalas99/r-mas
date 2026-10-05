import Foundation
import GRDB

public struct CommandMeta: Sendable {
    public var actorId: String?
    public var source: String?
    public init(actorId: String? = nil, source: String? = nil) { self.actorId = actorId; self.source = source }
}

public enum CommandResult: Equatable, Sendable {
    case ok(changedKeys: [String], changeId: String)
    case failed(String)
}

/// Port of lib/clinical-repo/index.mjs `executeClinicalCommand`.
/// Each command writes its blobs and its change-log row in ONE transaction: both or neither.
/// Eventualidades commands are not ported yet: they answer `not_ported`.
public enum ClinicalRepo {
    private static let eventualidadTypes: Set<String> = [
        "eventualidad.upsert", "eventualidad.delete", "eventualidades.labs.set", "eventualidades.labs.merge",
    ]

    public static func execute(_ queue: DatabaseQueue, _ command: JSON, meta: CommandMeta = CommandMeta(), now: Date = Date()) throws -> CommandResult {
        let type = (command["type"]?.isTruthy ?? false) ? command["type"]!.jsString : ""
        if type.isEmpty { return .failed("unknown_command") }
        if eventualidadTypes.contains(type) { return .failed("not_ported") }
        let actor = (meta.actorId?.isEmpty ?? true) ? nil : meta.actorId
        let source = (meta.source?.isEmpty ?? true) ? nil : meta.source

        switch type {
        case "clinical.persistSnapshot":
            let picked = ClinicalBlobs.pickPersistSnapshot(command)
            guard case .ok(let changed, let snapshot) = picked else {
                if case .failed(let e) = picked { return .failed(e) }
                return .failed("empty_snapshot")
            }
            return try queue.write { db in
                try ClinicalBlobs.saveValues(db, snapshot: snapshot, updatedAt: isoTimestamp(now))
                let id = try ClinicalChangeLog.append(db, commandType: type, blobKeys: changed, actorId: actor, origin: source, now: now)
                return .ok(changedKeys: changed, changeId: id)
            }

        case "patient.upsert":
            let patient = command["patient"] ?? .null
            // `patient.id != null` in Node: the id the change log records, trimmed.
            let loggedId = patient["id"].flatMap { $0 == .null ? nil : $0.jsString.trimmingCharacters(in: .whitespacesAndNewlines) }
            return try commitPatients(queue, type: type, patientId: loggedId, registro: nil, actor: actor, source: source, now: now) {
                ClinicalPatients.applyUpsert($0, patient: patient)
            }

        case "patient.delete":
            let idValue = command["patientId"] ?? .null
            let patientId = (idValue.isTruthy ? idValue.jsString : "").trimmingCharacters(in: .whitespacesAndNewlines)
            let regValue = command["registro"] ?? .null
            let registro = (regValue.isTruthy ? regValue.jsString : "").trimmingCharacters(in: .whitespacesAndNewlines)
            return try commitPatients(queue, type: type, patientId: patientId, registro: registro.isEmpty ? nil : registro, actor: actor, source: source, now: now) {
                ClinicalPatients.applyDelete($0, patientId: patientId)
            }

        default:
            return .failed("unknown_command")
        }
    }

    /// Load census, transform, save, log. A failed transform writes nothing and logs nothing.
    private static func commitPatients(
        _ queue: DatabaseQueue, type: String, patientId: String?, registro: String?, actor: String?, source: String?, now: Date,
        transform: ([JSON]) -> ClinicalPatients.Transform
    ) throws -> CommandResult {
        try queue.write { db in
            let result = transform(try ClinicalPatients.load(db))
            guard case .ok(let patients) = result else {
                if case .failed(let e) = result { return .failed(e) }
                return .failed("transform_failed")
            }
            try ClinicalPatients.save(db, patients, updatedAt: isoTimestamp(now))
            let id = try ClinicalChangeLog.append(db, commandType: type, blobKeys: ["patients"], patientId: patientId,
                                                  actorId: actor, origin: source, registro: registro, now: now)
            return .ok(changedKeys: ["patients"], changeId: id)
        }
    }
}
