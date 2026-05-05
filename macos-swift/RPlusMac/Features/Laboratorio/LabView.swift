import SwiftUI

final class SaveCoordinator {
    var editorBuffer = ""

    private let saveAction: () throws -> Void
    private let rollbackAction: (() -> Void)?

    init(
        saveAction: @escaping () throws -> Void,
        rollbackAction: (() -> Void)? = nil
    ) {
        self.saveAction = saveAction
        self.rollbackAction = rollbackAction
    }

    convenience init(persistenceController: PersistenceController = .shared) {
        self.init(saveAction: { try persistenceController.saveOrRollback() })
    }

    func commit() throws {
        do {
            try saveAction()
        } catch {
            rollbackAction?()
            throw error
        }
    }
}

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
