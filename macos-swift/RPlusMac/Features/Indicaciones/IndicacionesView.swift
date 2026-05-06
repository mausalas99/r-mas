import SwiftUI

struct IndicacionesView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    @ObservedObject var store: IndicacionesStore

    var titleText: String {
        if let patient = sessionStore.selectedPatient {
            return "Indicaciones: \(patient.displayName)"
        }
        return "Indicaciones: Sin paciente"
    }

    private var descripcionBinding: Binding<String> {
        Binding(
            get: { store.draft.descripcion },
            set: { store.updateDescripcion($0) }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(titleText, systemImage: "list.clipboard")
                .font(.headline)
            TextEditor(text: descripcionBinding)
                .font(.body)
                .frame(minHeight: 100, maxHeight: 180)
                .disabled(sessionStore.selectedPatient == nil)
                .opacity(sessionStore.selectedPatient == nil ? 0.45 : 1)
        }
    }
}
