import SwiftUI

struct PatientListView: View {
    @ObservedObject var sessionStore: PatientSessionStore

    private let patients: [PatientSummary] = [
        PatientSummary(id: "p-1", displayName: "Paciente Demo")
    ]

    var body: some View {
        List(patients, id: \.id) { patient in
            Button(patient.displayName) {
                sessionStore.select(patient)
            }
            .buttonStyle(.plain)
        }
    }
}
