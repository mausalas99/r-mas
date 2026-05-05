import Foundation
import Combine

struct PatientSummary: Equatable {
    let id: String
    let displayName: String
}

@MainActor
final class PatientSessionStore: ObservableObject {
    @Published private(set) var selectedPatient: PatientSummary?

    func select(_ patient: PatientSummary) {
        selectedPatient = patient
    }
}
