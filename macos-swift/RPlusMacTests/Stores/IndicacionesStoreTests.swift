import XCTest
@testable import RPlusMac

final class IndicacionesStoreTests: XCTestCase {
    @MainActor
    func testAutosaveReloadsDraftPerPatient() throws {
        let persistence = PersistenceController(inMemory: true)
        let store = IndicacionesStore(persistenceController: persistence)

        store.load(patientId: "p-1")
        store.updateDescripcion("INDICACIONES POR MEDICINA INTERNA")
        try store.flush()

        let reloaded = IndicacionesStore(persistenceController: persistence)
        reloaded.load(patientId: "p-1")
        XCTAssertEqual(reloaded.draft.descripcion, "INDICACIONES POR MEDICINA INTERNA")
    }
}
