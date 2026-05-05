import SwiftUI

struct LabView: View {
    @ObservedObject var sessionStore: PatientSessionStore
    @ObservedObject var drafts: ClinicalDraftStore

    private let parser = LabParsingEngine()

    @State private var parsed: ParsedLabResult?

    var titleText: String {
        if let patient = sessionStore.selectedPatient {
            return "Laboratorio: \(patient.displayName)"
        }
        return "Laboratorio: Sin paciente"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                editorCard
                analyzeRow
                previewCard
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 8)
        }
        .onChange(of: sessionStore.selectedPatient?.id) { _ in
            refreshParseFromDraft()
        }
        .onAppear {
            refreshParseFromDraft()
        }
    }

    private var header: some View {
        Label(titleText, systemImage: "cross.case.fill")
            .font(.title2.weight(.semibold))
            .foregroundStyle(.primary)
    }

    private var editorCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Pegar reporte de laboratorio")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            TextEditor(text: drafts.labRawBinding(patientId: sessionStore.selectedPatient?.id))
                .font(.system(.body, design: .monospaced))
                .frame(minHeight: 140, maxHeight: 220)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color(nsColor: .textBackgroundColor)))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .strokeBorder(Color.secondary.opacity(0.25), lineWidth: 1)
                )
                .disabled(sessionStore.selectedPatient == nil)
                .opacity(sessionStore.selectedPatient == nil ? 0.45 : 1)
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color(nsColor: .controlBackgroundColor)))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.secondary.opacity(0.12), lineWidth: 1)
        )
    }

    private var analyzeRow: some View {
        HStack(spacing: 12) {
            Button {
                runParse()
            } label: {
                Label("Analizar", systemImage: "waveform.path.ecg")
            }
            .buttonStyle(.borderedProminent)
            .disabled(sessionStore.selectedPatient == nil)

            Button("Limpiar") {
                guard let id = sessionStore.selectedPatient?.id else { return }
                drafts.clearLabDraft(patientId: id)
                parsed = nil
            }
            .buttonStyle(.bordered)
            .disabled(sessionStore.selectedPatient == nil)

            Spacer()
        }
    }

    @ViewBuilder
    private var previewCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Vista previa")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)

            if sessionStore.selectedPatient == nil {
                placeholder("Selecciona un paciente en la barra lateral.")
            } else if let parsed {
                ForEach(Array(parsed.sections.enumerated()), id: \.offset) { _, section in
                    sectionBlock(section)
                }
            } else {
                placeholder("Pulsa «Analizar» para interpretar el texto pegado.")
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color(nsColor: .windowBackgroundColor)))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.secondary.opacity(0.12), lineWidth: 1)
        )
    }

    private func placeholder(_ text: String) -> some View {
        Text(text)
            .font(.callout)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
    }

    private func sectionBlock(_ section: LabSection) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(sectionTitle(section.type))
                    .font(.headline)
                Spacer()
                if section.type == .unknown {
                    Text("Revisar")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Color.orange.opacity(0.2)))
                }
            }

            if section.items.isEmpty {
                Text(section.type == .unknown
                     ? "La primera línea debe ser «BH» para biometría en esta versión del parser."
                     : "Sin filas reconocidas.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            } else {
                Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                    ForEach(Array(section.items.enumerated()), id: \.offset) { _, item in
                        GridRow {
                            Text(item.key)
                                .font(.system(.body, design: .monospaced).weight(.medium))
                            Text(item.value)
                                .font(.system(.body, design: .monospaced))
                            Spacer(minLength: 0)
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color(nsColor: .controlBackgroundColor)))
    }

    private func sectionTitle(_ type: LabSectionType) -> String {
        switch type {
        case .biometria: return "Biometría hemática"
        case .unknown: return "Sin clasificar"
        }
    }

    private func runParse() {
        guard let id = sessionStore.selectedPatient?.id else {
            parsed = nil
            return
        }
        let raw = drafts.labRawByPatientId[id] ?? ""
        parsed = parser.parse(raw)
    }

    private func refreshParseFromDraft() {
        runParse()
    }

    // MARK: - Persistencia (tests / futuro Core Data)

    func saveEditorBuffer(
        _ buffer: String,
        persistenceController: PersistenceController = .shared
    ) throws {
        let coordinator = SaveCoordinator(persistenceController: persistenceController)
        try saveEditorBuffer(buffer, coordinator: coordinator)
    }

    func saveEditorBuffer(
        _ buffer: String,
        coordinator: SaveCoordinator
    ) throws {
        coordinator.editorBuffer = buffer
        try coordinator.commit()
    }
}
