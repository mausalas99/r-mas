import Foundation

final class SharedJSONCodec {
    func importFromSharedJSON(_ data: Data) throws -> SharedDomain {
        let decoded = try JSONDecoder().decode(SharedRoot.self, from: data)
        var notesByPatientId = decoded.data.notes
        var indicacionesByPatientId = decoded.data.indicaciones
        for patient in decoded.data.patients {
            if let noteDraft = patient.noteDraft {
                let overlay = noteOverlayFields(noteDraft)
                if !overlay.isEmpty {
                    notesByPatientId[patient.id] = mergeOverlay(base: notesByPatientId[patient.id], overlay: overlay)
                }
            }
            if let indicacionesDraft = patient.indicacionesDraft {
                let overlay = indicacionesOverlayFields(indicacionesDraft)
                if !overlay.isEmpty {
                    indicacionesByPatientId[patient.id] = mergeOverlay(base: indicacionesByPatientId[patient.id], overlay: overlay)
                }
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

    private func mergeOverlay(base: JSONValue?, overlay: [String: JSONValue]) -> JSONValue {
        var mergedObject: [String: JSONValue]
        if case .object(let existing)? = base {
            mergedObject = existing
        } else {
            mergedObject = [:]
        }
        for (key, value) in overlay {
            mergedObject[key] = value
        }
        return .object(mergedObject)
    }

    private func noteOverlayFields(_ note: SharedNoteDraft) -> [String: JSONValue] {
        var overlay: [String: JSONValue] = [:]
        if let fecha = note.fecha, !fecha.isEmpty { overlay["fecha"] = .string(fecha) }
        if let hora = note.hora, !hora.isEmpty { overlay["hora"] = .string(hora) }
        if let interrogatorio = note.interrogatorio, !interrogatorio.isEmpty { overlay["interrogatorio"] = .string(interrogatorio) }
        if let evolucion = note.evolucion, !evolucion.isEmpty { overlay["evolucion"] = .string(evolucion) }
        if let estudios = note.estudios, !estudios.isEmpty { overlay["estudios"] = .string(estudios) }
        if let diagnosticos = note.diagnosticos, !diagnosticos.isEmpty {
            overlay["diagnosticos"] = .array(diagnosticos.map { .string($0) })
        }
        if let tratamiento = note.tratamiento, !tratamiento.isEmpty {
            overlay["tratamiento"] = .array(tratamiento.map { .string($0) })
        }
        return overlay
    }

    private func indicacionesOverlayFields(_ indicaciones: SharedIndicacionesDraft) -> [String: JSONValue] {
        var overlay: [String: JSONValue] = [:]
        if let fecha = indicaciones.fecha, !fecha.isEmpty { overlay["fecha"] = .string(fecha) }
        if let hora = indicaciones.hora, !hora.isEmpty { overlay["hora"] = .string(hora) }
        if let descripcion = indicaciones.descripcion, !descripcion.isEmpty { overlay["descripcion"] = .string(descripcion) }
        if let medicos = indicaciones.medicos, !medicos.isEmpty { overlay["medicos"] = .string(medicos) }
        if let dieta = indicaciones.dieta, !dieta.isEmpty { overlay["dieta"] = .string(dieta) }
        if let cuidados = indicaciones.cuidados, !cuidados.isEmpty { overlay["cuidados"] = .string(cuidados) }
        if let estudios = indicaciones.estudios, !estudios.isEmpty { overlay["estudios"] = .string(estudios) }
        if let medicamentos = indicaciones.medicamentos, !medicamentos.isEmpty { overlay["medicamentos"] = .string(medicamentos) }
        if let interconsultas = indicaciones.interconsultas, !interconsultas.isEmpty { overlay["interconsultas"] = .string(interconsultas) }
        return overlay
    }
}
