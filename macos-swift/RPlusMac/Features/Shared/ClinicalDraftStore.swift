import Combine
import SwiftUI

/// Borradores en memoria por paciente (fase 1). Sustituir por Core Data + JSON compartido en iteraciones posteriores.
@MainActor
final class ClinicalDraftStore: ObservableObject {
    @Published var notesByPatientId: [String: String] = [:]
    @Published var indicacionesByPatientId: [String: String] = [:]
    @Published var labRawByPatientId: [String: String] = [:]

    func clearLabDraft(patientId: String) {
        var copy = labRawByPatientId
        copy[patientId] = ""
        labRawByPatientId = copy
    }

    func setLabRaw(_ text: String, patientId: String) {
        var copy = labRawByPatientId
        copy[patientId] = text
        labRawByPatientId = copy
    }

    func noteBinding(patientId: String?) -> Binding<String> {
        Binding(
            get: {
                guard let id = patientId else { return "" }
                return self.notesByPatientId[id] ?? ""
            },
            set: { newValue in
                guard let id = patientId else { return }
                var copy = self.notesByPatientId
                copy[id] = newValue
                self.notesByPatientId = copy
            }
        )
    }

    func indicacionesBinding(patientId: String?) -> Binding<String> {
        Binding(
            get: {
                guard let id = patientId else { return "" }
                return self.indicacionesByPatientId[id] ?? ""
            },
            set: { newValue in
                guard let id = patientId else { return }
                var copy = self.indicacionesByPatientId
                copy[id] = newValue
                self.indicacionesByPatientId = copy
            }
        )
    }

    func labRawBinding(patientId: String?) -> Binding<String> {
        Binding(
            get: {
                guard let id = patientId else { return "" }
                return self.labRawByPatientId[id] ?? ""
            },
            set: { newValue in
                guard let id = patientId else { return }
                var copy = self.labRawByPatientId
                copy[id] = newValue
                self.labRawByPatientId = copy
            }
        )
    }
}
