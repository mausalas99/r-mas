import Foundation

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
