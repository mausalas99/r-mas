import SwiftUI

struct PatientListView: View {
    @ObservedObject var sessionStore: PatientSessionStore

    private let patients: [PatientSummary] = [
        PatientSummary(id: "p-1", displayName: "Paciente Demo")
    ]

    var body: some View {
        List(selection: Binding(
            get: { sessionStore.selectedPatient?.id },
            set: { newId in
                if let id = newId, let p = patients.first(where: { $0.id == id }) {
                    sessionStore.select(p)
                }
            }
        )) {
            Section {
                ForEach(patients, id: \.id) { patient in
                    Label(patient.displayName, systemImage: "person.fill")
                        .tag(Optional(patient.id))
                }
            } header: {
                Text("Pacientes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("R+")
        .onAppear {
            if sessionStore.selectedPatient == nil, let first = patients.first {
                sessionStore.select(first)
            }
        }
    }
}
