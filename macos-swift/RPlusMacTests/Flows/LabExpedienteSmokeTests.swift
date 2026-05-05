import XCTest
@testable import RPlusMac

final class LabExpedienteSmokeTests: XCTestCase {
    func testAppBootstrapsWithPersistenceController() {
        let controller = PersistenceController(inMemory: true)
        XCTAssertNotNil(controller.container.viewContext.persistentStoreCoordinator)
    }

    @MainActor
    func testSelectingPatientPropagatesToLabAndExpediente() {
        let store = PatientSessionStore()
        let patient = PatientSummary(id: "p-1", displayName: "Paciente Demo")
        let labView = LabView(sessionStore: store)
        let expedienteView = ExpedienteView(sessionStore: store)
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
}
