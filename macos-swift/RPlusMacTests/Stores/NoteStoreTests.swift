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
}
