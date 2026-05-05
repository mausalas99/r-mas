import Foundation
import XCTest
@testable import RPlusMac

final class SharedJSONCodecTests: XCTestCase {
    private func fixtureURL() throws -> URL {
        let bundle = Bundle(for: SharedJSONCodecTests.self)
        return try XCTUnwrap(bundle.url(forResource: "minimal-patient", withExtension: "json"))
    }

    func testRoundTripPreservesPatientIdAndLabEntries() throws {
        let inputURL = try fixtureURL()
        let inputData = try Data(contentsOf: inputURL)

        let codec = SharedJSONCodec()
        let domain = try codec.importFromSharedJSON(inputData)
        let outputData = try codec.exportToSharedJSON(domain)
        let reparsed = try codec.importFromSharedJSON(outputData)

        XCTAssertEqual(reparsed.patients.count, domain.patients.count)
        XCTAssertEqual(reparsed.patients.first?.id, domain.patients.first?.id)
        XCTAssertEqual(reparsed.patients.first?.name, domain.patients.first?.name)
        XCTAssertEqual(reparsed.notesByPatientId["patient-001"], domain.notesByPatientId["patient-001"])
        XCTAssertEqual(reparsed.indicacionesByPatientId["patient-001"], domain.indicacionesByPatientId["patient-001"])
        XCTAssertEqual(reparsed.labHistoryByPatientId["patient-001"]?.count, domain.labHistoryByPatientId["patient-001"]?.count)
        XCTAssertEqual(reparsed.labHistoryByPatientId["patient-001"]?.first?.date, domain.labHistoryByPatientId["patient-001"]?.first?.date)
        XCTAssertEqual(reparsed.labHistoryByPatientId["patient-001"]?.first?.rawText, domain.labHistoryByPatientId["patient-001"]?.first?.rawText)
        XCTAssertEqual(reparsed.settings["updateChannel"], domain.settings["updateChannel"])
    }

    func testImportThrowsForMalformedJSON() {
        let malformed = Data("{\"patients\": [".utf8)
        let codec = SharedJSONCodec()

        XCTAssertThrowsError(try codec.importFromSharedJSON(malformed))
    }
}
