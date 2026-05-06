import XCTest
@testable import RPlusMac

private final class FailingPersistenceController: PersistenceController {
    private(set) var saveOrRollbackCalled = false

    init() {
        super.init(inMemory: true)
    }

    override func saveOrRollback() throws {
        saveOrRollbackCalled = true
        throw NSError(domain: "test.persistence", code: 900)
    }
}

final class LabExpedienteSmokeTests: XCTestCase {
    func testAppBootstrapsWithPersistenceController() {
        let controller = PersistenceController(inMemory: true)
        XCTAssertNotNil(controller.container.viewContext.persistentStoreCoordinator)
    }

    @MainActor
    func testSelectingPatientPropagatesToLabAndExpediente() {
        let store = PatientSessionStore()
        let drafts = ClinicalDraftStore()
        let patient = PatientSummary(id: "p-1", displayName: "Paciente Demo")
        let labView = LabView(sessionStore: store)
        let expedienteView = ExpedienteView(sessionStore: store, drafts: drafts)
        store.select(patient)

        XCTAssertEqual(store.selectedPatient?.id, "p-1")
        XCTAssertEqual(labView.titleText, "Laboratorio: Paciente Demo")
        XCTAssertEqual(expedienteView.titleText, "Expediente: Paciente Demo")
    }

    func testFailedSaveRollsBackContextAndKeepsEditorBuffer() {
        var didRollback = false
        let coordinator = SaveCoordinator(
            saveAction: { throw NSError(domain: "test", code: 500) },
            rollbackAction: { didRollback = true }
        )
        coordinator.editorBuffer = "BH\nHB 10"

        XCTAssertThrowsError(try coordinator.commit())
        XCTAssertTrue(didRollback)
        XCTAssertEqual(coordinator.editorBuffer, "BH\nHB 10")
    }

    @MainActor
    func testLabViewSaveEditorBufferKeepsBufferWhenCommitFails() {
        let view = LabView(sessionStore: PatientSessionStore())
        var didRollback = false
        let coordinator = SaveCoordinator(
            saveAction: { throw NSError(domain: "test", code: 501) },
            rollbackAction: { didRollback = true }
        )

        XCTAssertThrowsError(try view.saveEditorBuffer("QS\nGLU 120", coordinator: coordinator))
        XCTAssertTrue(didRollback)
        XCTAssertEqual(coordinator.editorBuffer, "QS\nGLU 120")
    }

    @MainActor
    func testLabViewSaveEditorBufferUsesPersistenceControllerEntrypoint() {
        let view = LabView(sessionStore: PatientSessionStore())
        let controller = FailingPersistenceController()

        XCTAssertThrowsError(try view.saveEditorBuffer("BH\nHB 10", persistenceController: controller))
        XCTAssertTrue(controller.saveOrRollbackCalled)
    }

    @MainActor
    func testExpedienteViewSaveEditorBufferUsesPersistenceControllerEntrypoint() {
        let view = ExpedienteView(sessionStore: PatientSessionStore(), drafts: ClinicalDraftStore())
        let controller = FailingPersistenceController()

        XCTAssertThrowsError(try view.saveEditorBuffer("S: paciente estable", persistenceController: controller))
        XCTAssertTrue(controller.saveOrRollbackCalled)
    }
}
