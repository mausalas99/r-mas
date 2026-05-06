import XCTest
@testable import RPlusMac

final class NoteStoreTests: XCTestCase {
    func testDefaultNoteDraftHasExpectedEmptySections() {
        let draft = NoteDraft.empty(patientId: "p-1")
        XCTAssertEqual(draft.patientId, "p-1")
        XCTAssertEqual(draft.interrogatorio, "")
        XCTAssertEqual(draft.diagnosticos, [])
        XCTAssertEqual(draft.tratamiento, [])
    }

    func testDefaultIndicacionesDraftHasExpectedEmptySections() {
        let draft = IndicacionesDraft.empty(patientId: "p-1")
        XCTAssertEqual(draft.patientId, "p-1")
        XCTAssertEqual(draft.descripcion, "")
        XCTAssertEqual(draft.medicos, "")
        XCTAssertEqual(draft.otros, [])
    }

    @MainActor
    func testAutosaveReloadsNoteDraftPerPatient() throws {
        let persistence = PersistenceController(inMemory: true)
        let store = NoteStore(persistenceController: persistence)

        store.load(patientId: "p-note")
        store.updateInterrogatorio("PACIENTE ESTABLE")
        try store.flush()

        let reloaded = NoteStore(persistenceController: persistence)
        reloaded.load(patientId: "p-note")
        XCTAssertEqual(reloaded.draft.interrogatorio, "PACIENTE ESTABLE")
    }

    @MainActor
    func testFlushFailureRollsBackContextAndRestoresNoteDraft() {
        let persistence = PersistenceController(inMemory: true)
        let expectedError = NSError(domain: "NoteStoreTests", code: 777)
        let store = NoteStore(
            persistenceController: persistence,
            saveAction: { throw expectedError }
        )

        store.load(patientId: "p-note-rollback")
        XCTAssertEqual(store.draft.interrogatorio, "")
        store.updateInterrogatorio("CAMBIO TEMPORAL")

        XCTAssertThrowsError(try store.flush()) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, expectedError.domain)
            XCTAssertEqual(nsError.code, expectedError.code)
        }
        XCTAssertEqual(store.draft.interrogatorio, "")
        XCTAssertEqual(persistence.viewContext.hasChanges, false)
    }
}
