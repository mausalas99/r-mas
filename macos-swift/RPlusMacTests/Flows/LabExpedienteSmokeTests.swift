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
}
