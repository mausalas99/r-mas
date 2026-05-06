import SwiftUI

struct NotaView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    @ObservedObject var store: NoteStore

    var titleText: String {
        if let patient = sessionStore.selectedPatient {
            return "Nota: \(patient.displayName)"
        }
        return "Nota: Sin paciente"
    }

    private var interrogatorioBinding: Binding<String> {
        Binding(
            get: { store.draft.interrogatorio },
            set: { store.updateInterrogatorio($0) }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(titleText, systemImage: "note.text")
                .font(.headline)
            TextEditor(text: interrogatorioBinding)
                .font(.body)
                .frame(minHeight: 120, maxHeight: 200)
                .disabled(sessionStore.selectedPatient == nil)
                .opacity(sessionStore.selectedPatient == nil ? 0.45 : 1)
        }
    }
}
