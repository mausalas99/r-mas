import CoreData
import Foundation

@MainActor
final class NoteStore: ObservableObject {
    @Published private(set) var draft: NoteDraft = .empty(patientId: "")

    private let persistenceController: PersistenceController
    private var backingObject: CDNoteDraft?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(persistenceController: PersistenceController = .shared) {
        self.persistenceController = persistenceController
    }

    func load(patientId: String) {
        let context = persistenceController.viewContext
        let request = NSFetchRequest<CDNoteDraft>(entityName: "CDNoteDraft")
        request.predicate = NSPredicate(format: "patientId == %@", patientId)
        // NOTE: Uniqueness constraints are not currently encoded in this lightweight model file.
        // Keep fetch deterministic in case duplicate rows exist for a patient.

        do {
            let matches = try context.fetch(request).sorted {
                $0.objectID.uriRepresentation().absoluteString < $1.objectID.uriRepresentation().absoluteString
            }

            let entity: CDNoteDraft
            if let existing = matches.first {
                entity = existing
            } else {
                let created = NSEntityDescription.insertNewObject(
                    forEntityName: "CDNoteDraft",
                    into: context
                ) as! CDNoteDraft
                created.patientId = patientId
                created.fecha = ""
                created.hora = ""
                created.interrogatorio = ""
                created.evolucion = ""
                created.estudios = ""
                created.diagnosticosJSON = "[]"
                created.ta = ""
                created.fr = ""
                created.fc = ""
                created.temp = ""
                created.peso = ""
                created.tratamientoJSON = "[]"
                created.medico = ""
                created.profesor = ""
                entity = created
            }

            backingObject = entity
            draft = NoteDraft(
                patientId: entity.patientId,
                fecha: entity.fecha,
                hora: entity.hora,
                interrogatorio: entity.interrogatorio,
                evolucion: entity.evolucion,
                estudios: entity.estudios,
                diagnosticos: decodeStrings(entity.diagnosticosJSON),
                ta: entity.ta,
                fr: entity.fr,
                fc: entity.fc,
                temp: entity.temp,
                peso: entity.peso,
                tratamiento: decodeStrings(entity.tratamientoJSON),
                medico: entity.medico,
                profesor: entity.profesor
            )
        } catch {
            backingObject = nil
            draft = .empty(patientId: patientId)
        }
    }

    func updateInterrogatorio(_ value: String) {
        draft.interrogatorio = value
        backingObject?.interrogatorio = value
    }

    func flush() throws {
        syncAllFieldsToEntity()
        try persistenceController.saveOrRollback()
    }

    private func decodeStrings(_ value: String) -> [String] {
        guard let data = value.data(using: .utf8),
              let decoded = try? decoder.decode([String].self, from: data) else {
            return []
        }
        return decoded
    }

    private func encodeStrings(_ value: [String]) -> String {
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
        backingObject.interrogatorio = draft.interrogatorio
        backingObject.evolucion = draft.evolucion
        backingObject.estudios = draft.estudios
        backingObject.diagnosticosJSON = encodeStrings(draft.diagnosticos)
        backingObject.ta = draft.ta
        backingObject.fr = draft.fr
        backingObject.fc = draft.fc
        backingObject.temp = draft.temp
        backingObject.peso = draft.peso
        backingObject.tratamientoJSON = encodeStrings(draft.tratamiento)
        backingObject.medico = draft.medico
        backingObject.profesor = draft.profesor
    }
}
