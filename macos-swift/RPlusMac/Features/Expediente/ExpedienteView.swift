import SwiftUI

struct ExpedienteView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    @ObservedObject var drafts: ClinicalDraftStore

    var titleText: String {
        if let patient = sessionStore.selectedPatient {
            return "Expediente: \(patient.displayName)"
        }
        return "Expediente: Sin paciente"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Label(titleText, systemImage: "doc.text.fill")
                    .font(.title2.weight(.semibold))

                GroupBox {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Nota de evolución (borrador)", systemImage: "note.text")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        TextEditor(text: drafts.noteBinding(patientId: sessionStore.selectedPatient?.id))
                            .font(.body)
                            .frame(minHeight: 120, maxHeight: 200)
                            .disabled(sessionStore.selectedPatient == nil)
                            .opacity(sessionStore.selectedPatient == nil ? 0.45 : 1)
                    }
                    .padding(.vertical, 4)
                }

                GroupBox {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Indicaciones (borrador)", systemImage: "list.clipboard")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        TextEditor(text: drafts.indicacionesBinding(patientId: sessionStore.selectedPatient?.id))
                            .font(.body)
                            .frame(minHeight: 100, maxHeight: 180)
                            .disabled(sessionStore.selectedPatient == nil)
                            .opacity(sessionStore.selectedPatient == nil ? 0.45 : 1)
                    }
                    .padding(.vertical, 4)
                }

                Text("Los borradores son locales a esta sesión. La persistencia completa llegará con Core Data + respaldo JSON.")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    func saveEditorBuffer(
        _ buffer: String,
        persistenceController: PersistenceController = .shared
    ) throws {
        let coordinator = SaveCoordinator(persistenceController: persistenceController)
        try saveEditorBuffer(buffer, coordinator: coordinator)
    }

    func saveEditorBuffer(
        _ buffer: String,
        coordinator: SaveCoordinator
    ) throws {
        coordinator.editorBuffer = buffer
        try coordinator.commit()
    }
}
