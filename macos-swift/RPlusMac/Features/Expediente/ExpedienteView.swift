import SwiftUI

struct ExpedienteView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    var titleText: String {
        if let patient = sessionStore.selectedPatient {
            return "Expediente: \(patient.displayName)"
        }
        return "Expediente: Sin paciente"
    }

    var body: some View {
        Text(titleText)
    }

    func saveEditorBuffer(
        _ buffer: String,
        persistenceController: PersistenceController = .shared
    ) throws {
        let coordinator = SaveCoordinator(persistenceController: persistenceController)
        coordinator.editorBuffer = buffer
        try coordinator.commit()
    }
}
