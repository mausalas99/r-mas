import AppKit
import SwiftUI
import UniformTypeIdentifiers

struct IndicacionesView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    @ObservedObject var store: IndicacionesStore
    private let exporter = DocxDocumentExporter()

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
            Button("Exportar DOCX") {
                exportDOCX()
            }
            .disabled(sessionStore.selectedPatient == nil)
            TextEditor(text: descripcionBinding)
                .font(.body)
                .frame(minHeight: 100, maxHeight: 180)
                .disabled(sessionStore.selectedPatient == nil)
                .opacity(sessionStore.selectedPatient == nil ? 0.45 : 1)
        }
    }

    private func exportDOCX() {
        guard let patient = sessionStore.selectedPatient else { return }
        let panel = NSSavePanel()
        if let docxType = UTType(filenameExtension: "docx") {
            panel.allowedContentTypes = [docxType]
        }
        panel.nameFieldStringValue = "indicaciones-\(patient.id).docx"
        panel.canCreateDirectories = true

        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            try store.flush()
            try exporter.exportIndicaciones(store.draft, patientName: patient.displayName, outputURL: url)
        } catch {
            NSSound.beep()
        }
    }
}
