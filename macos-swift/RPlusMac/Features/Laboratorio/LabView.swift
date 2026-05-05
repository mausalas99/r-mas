import SwiftUI

struct LabView: View {
    @ObservedObject var sessionStore: PatientSessionStore

    var body: some View {
        Group {
            if let patient = sessionStore.selectedPatient {
                Text("Laboratorio: \(patient.displayName)")
            } else {
                Text("Laboratorio: Sin paciente")
            }
        }
    }
}
