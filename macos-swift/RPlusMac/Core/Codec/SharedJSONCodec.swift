import Foundation

final class SharedJSONCodec {
    func importFromSharedJSON(_ data: Data) throws -> SharedDomain {
        let decoded = try JSONDecoder().decode(SharedRoot.self, from: data)
        var notesByPatientId = decoded.data.notes
        var indicacionesByPatientId = decoded.data.indicaciones
        for patient in decoded.data.patients {
            if let noteDraft = patient.noteDraft, let jsonValue = encodeJSONValue(noteDraft) {
                notesByPatientId[patient.id] = jsonValue
            }
            if let indicacionesDraft = patient.indicacionesDraft, let jsonValue = encodeJSONValue(indicacionesDraft) {
                indicacionesByPatientId[patient.id] = jsonValue
            }
        }
        return SharedDomain(
            format: decoded.format,
            version: decoded.version,
            exportedAt: decoded.exportedAt,
            appVersion: decoded.appVersion,
            theme: decoded.theme,
            guidedTourDoneForVersion: decoded.guidedTourDoneForVersion,
            patients: decoded.data.patients.map { DomainPatient(id: $0.id, name: $0.name) },
            notesByPatientId: notesByPatientId,
            indicacionesByPatientId: indicacionesByPatientId,
            labHistoryByPatientId: decoded.data.labHistory.mapValues { entries in
                entries.map { DomainLabEntry(date: $0.date, rawText: $0.rawText) }
            },
            medRecetaByPatient: decoded.data.medRecetaByPatient,
            settings: decoded.data.settings,
            medCatalog: decoded.data.medCatalog
        )
    }

    func exportToSharedJSON(_ domain: SharedDomain) throws -> Data {
        let root = SharedRoot(
            format: domain.format,
            version: domain.version,
            exportedAt: domain.exportedAt,
            appVersion: domain.appVersion,
            theme: domain.theme,
            guidedTourDoneForVersion: domain.guidedTourDoneForVersion,
            data: SharedDataPayload(
                patients: domain.patients.map { patient in
                    SharedPatient(
                        id: patient.id,
                        name: patient.name,
                        noteDraft: domain.notesByPatientId[patient.id].flatMap { decodeJSONValue($0, as: SharedNoteDraft.self) },
                        indicacionesDraft: domain.indicacionesByPatientId[patient.id].flatMap { decodeJSONValue($0, as: SharedIndicacionesDraft.self) }
                    )
                },
                notes: domain.notesByPatientId,
                indicaciones: domain.indicacionesByPatientId,
                labHistory: domain.labHistoryByPatientId.mapValues { entries in
                    entries.map { SharedLabEntry(date: $0.date, rawText: $0.rawText) }
                },
                medRecetaByPatient: domain.medRecetaByPatient,
                settings: domain.settings,
                medCatalog: domain.medCatalog
            )
        )
        return try JSONEncoder().encode(root)
    }

    private func encodeJSONValue<T: Encodable>(_ value: T) -> JSONValue? {
        guard
            let data = try? JSONEncoder().encode(value),
            let jsonValue = try? JSONDecoder().decode(JSONValue.self, from: data)
        else {
            return nil
        }
        return jsonValue
    }

    private func decodeJSONValue<T: Decodable>(_ value: JSONValue, as type: T.Type) -> T? {
        guard
            let data = try? JSONEncoder().encode(value),
            let decoded = try? JSONDecoder().decode(type, from: data)
        else {
            return nil
        }
        return decoded
    }
}
