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
}
