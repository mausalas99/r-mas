import Foundation

final class SharedJSONCodec {
    func importFromSharedJSON(_ data: Data) throws -> SharedDomain {
        let decoded = try JSONDecoder().decode(SharedRoot.self, from: data)
        return SharedDomain(
            format: decoded.format,
            version: decoded.version,
            exportedAt: decoded.exportedAt,
            appVersion: decoded.appVersion,
            theme: decoded.theme,
            guidedTourDoneForVersion: decoded.guidedTourDoneForVersion,
            patients: decoded.data.patients.map { DomainPatient(id: $0.id, name: $0.name) },
            notesByPatientId: decoded.data.notes,
            indicacionesByPatientId: decoded.data.indicaciones,
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
                patients: domain.patients.map { SharedPatient(id: $0.id, name: $0.name) },
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
}
