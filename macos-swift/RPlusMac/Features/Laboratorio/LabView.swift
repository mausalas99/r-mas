import SwiftUI

struct LabView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    var titleText: String {
        if let patient = sessionStore.selectedPatient {
            return "Laboratorio: \(patient.displayName)"
        }
        return "Laboratorio: Sin paciente"
    }

    var body: some View {
        Text(titleText)
    }
}
