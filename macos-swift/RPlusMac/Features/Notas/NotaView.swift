import AppKit
import SwiftUI
import UniformTypeIdentifiers

struct NotaView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    @ObservedObject var store: NoteStore
    private let exporter = DocxDocumentExporter()

    var titleText: String {
        if let patient = sessionStore.selectedPatient {
            return "Nota: \(patient.displayName)"
        }
        return "Nota: Sin paciente"
    }

    private var interrogatorioBinding: Binding<String> {
        Binding(
            get: { store.draft.interrogatorio },
            set: { store.updateInterrogatorio($0) }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(titleText, systemImage: "note.text")
                .font(.headline)
            Button("Exportar DOCX") {
                exportDOCX()
            }
            .disabled(sessionStore.selectedPatient == nil)
            TextEditor(text: interrogatorioBinding)
                .font(.body)
                .frame(minHeight: 120, maxHeight: 200)
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
        panel.nameFieldStringValue = "nota-\(patient.id).docx"
        panel.canCreateDirectories = true

        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            try store.flush()
            try exporter.exportNota(store.draft, patientName: patient.displayName, outputURL: url)
        } catch {
            NSSound.beep()
        }
    }
}
