import SwiftUI

struct ExpedienteView: View {
    @ObservedObject var sessionStore: PatientSessionStore

    var body: some View {
        Group {
            if let patient = sessionStore.selectedPatient {
                Text("Expediente: \(patient.displayName)")
            } else {
                Text("Expediente: Sin paciente")
            }
        }
    }
}
