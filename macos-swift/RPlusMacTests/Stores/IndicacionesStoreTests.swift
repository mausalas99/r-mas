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

    @MainActor
    func testFlushFailureRollsBackContextAndRestoresDraft() {
        let persistence = PersistenceController(inMemory: true)
        let expectedError = NSError(domain: "IndicacionesStoreTests", code: 999)
        let store = IndicacionesStore(
            persistenceController: persistence,
            saveAction: { throw expectedError }
        )

        store.load(patientId: "p-rollback")
        XCTAssertEqual(store.draft.descripcion, "")
        store.updateDescripcion("CAMBIO TEMPORAL")

        XCTAssertThrowsError(try store.flush()) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, expectedError.domain)
            XCTAssertEqual(nsError.code, expectedError.code)
        }
        XCTAssertEqual(store.draft.descripcion, "")
        XCTAssertEqual(persistence.viewContext.hasChanges, false)
    }
}
