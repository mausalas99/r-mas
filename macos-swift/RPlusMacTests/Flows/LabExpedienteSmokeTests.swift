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
    func testNotaAndIndicacionesViewsTrackSelectedPatient() {
        let session = PatientSessionStore()
        let noteStore = NoteStore(persistenceController: .init(inMemory: true))
        let indStore = IndicacionesStore(persistenceController: .init(inMemory: true))

        session.select(PatientSummary(id: "p-1", displayName: "Paciente Demo"))
        noteStore.load(patientId: "p-1")
        indStore.load(patientId: "p-1")

        XCTAssertEqual(noteStore.draft.patientId, "p-1")
        XCTAssertEqual(indStore.draft.patientId, "p-1")
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
