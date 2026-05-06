import CoreData
import Foundation

@MainActor
final class IndicacionesStore: ObservableObject {
    @Published private(set) var draft: IndicacionesDraft = .empty(patientId: "")

    private let persistenceController: PersistenceController
    private var backingObject: CDIndicacionesDraft?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let saveAction: () throws -> Void

    init(
        persistenceController: PersistenceController = .shared,
        saveAction: (() throws -> Void)? = nil
    ) {
        self.persistenceController = persistenceController
        if let saveAction {
            self.saveAction = saveAction
        } else {
            self.saveAction = { try persistenceController.saveOrRollback() }
        }
    }

    func load(patientId: String) {
        let context = persistenceController.viewContext
        let request = CDIndicacionesDraft.fetchRequest()
        request.predicate = NSPredicate(format: "patientId == %@", patientId)
        // NOTE: Uniqueness constraints are not currently encoded in this lightweight model file.
        // Keep fetch deterministic in case duplicate rows exist for a patient.

        do {
            let matches = try context.fetch(request).sorted {
                $0.objectID.uriRepresentation().absoluteString < $1.objectID.uriRepresentation().absoluteString
            }
            let entity: CDIndicacionesDraft
            if let existing = matches.first {
                entity = existing
            } else {
                let created = CDIndicacionesDraft(context: context)
                created.patientId = patientId
                created.fecha = ""
                created.hora = ""
                created.descripcion = ""
                created.medicos = ""
                created.dieta = ""
                created.cuidados = ""
                created.estudios = ""
                created.medicamentos = ""
                created.interconsultas = ""
                created.otrosJSON = "[]"
                entity = created
            }

            backingObject = entity
            draft = IndicacionesDraft(
                patientId: entity.patientId,
                fecha: entity.fecha,
                hora: entity.hora,
                descripcion: entity.descripcion,
                medicos: entity.medicos,
                dieta: entity.dieta,
                cuidados: entity.cuidados,
                estudios: entity.estudios,
                medicamentos: entity.medicamentos,
                interconsultas: entity.interconsultas,
                otros: decodeOtros(entity.otrosJSON)
            )
        } catch {
            backingObject = nil
            draft = .empty(patientId: patientId)
        }
    }

    func updateDescripcion(_ value: String) {
        draft.descripcion = value
        backingObject?.descripcion = value
    }

    func flush() throws {
        syncAllFieldsToEntity()
        do {
            try saveAction()
        } catch {
            persistenceController.viewContext.rollback()
            if let backingObject {
                draft = IndicacionesDraft(
                    patientId: backingObject.patientId,
                    fecha: backingObject.fecha,
                    hora: backingObject.hora,
                    descripcion: backingObject.descripcion,
                    medicos: backingObject.medicos,
                    dieta: backingObject.dieta,
                    cuidados: backingObject.cuidados,
                    estudios: backingObject.estudios,
                    medicamentos: backingObject.medicamentos,
                    interconsultas: backingObject.interconsultas,
                    otros: decodeOtros(backingObject.otrosJSON)
                )
            }
            throw error
        }
    }

    private func decodeOtros(_ value: String) -> [IndicacionesExtraSection] {
        guard let data = value.data(using: .utf8),
              let decoded = try? decoder.decode([IndicacionesExtraSection].self, from: data) else {
            return []
        }
        return decoded
    }

    private func encodeOtros(_ value: [IndicacionesExtraSection]) -> String {
        guard let data = try? encoder.encode(value),
              let encoded = String(data: data, encoding: .utf8) else {
            return "[]"
        }
        return encoded
    }

    private func syncAllFieldsToEntity() {
        guard let backingObject else { return }
        backingObject.patientId = draft.patientId
        backingObject.fecha = draft.fecha
        backingObject.hora = draft.hora
        backingObject.descripcion = draft.descripcion
        backingObject.medicos = draft.medicos
        backingObject.dieta = draft.dieta
        backingObject.cuidados = draft.cuidados
        backingObject.estudios = draft.estudios
        backingObject.medicamentos = draft.medicamentos
        backingObject.interconsultas = draft.interconsultas
        backingObject.otrosJSON = encodeOtros(draft.otros)
    }
}
