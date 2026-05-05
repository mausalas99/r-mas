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
        store.select(patient)

        XCTAssertEqual(store.selectedPatient?.id, "p-1")
    }
}
