import Foundation

final class SharedJSONCodec {
    func importFromSharedJSON(_ data: Data) throws -> SharedDomain {
        let decoded = try JSONDecoder().decode(SharedRoot.self, from: data)
        return SharedDomain(
            patients: decoded.patients.map { DomainPatient(id: $0.id, name: $0.name) },
            notesByPatientId: decoded.notes,
            indicacionesByPatientId: decoded.indicaciones,
            labHistoryByPatientId: decoded.labHistory.mapValues { entries in
                entries.map { DomainLabEntry(date: $0.date, rawText: $0.rawText) }
            },
            settings: decoded.settings
        )
    }

    func exportToSharedJSON(_ domain: SharedDomain) throws -> Data {
        let root = SharedRoot(
            patients: domain.patients.map { SharedPatient(id: $0.id, name: $0.name) },
            notes: domain.notesByPatientId,
            indicaciones: domain.indicacionesByPatientId,
            labHistory: domain.labHistoryByPatientId.mapValues { entries in
                entries.map { SharedLabEntry(date: $0.date, rawText: $0.rawText) }
            },
            settings: domain.settings
        )
        return try JSONEncoder().encode(root)
    }
}
