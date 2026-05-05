import Foundation
import XCTest
@testable import RPlusMac

final class SharedJSONCodecTests: XCTestCase {
    func testRoundTripPreservesPatientIdAndLabEntries() throws {
        let bundle = Bundle(for: SharedJSONCodecTests.self)
        let inputURL = try XCTUnwrap(
            bundle.url(forResource: "minimal-patient", withExtension: "json", subdirectory: "shared-json")
        )
        let inputData = try Data(contentsOf: inputURL)

        let codec = SharedJSONCodec()
        let domain = try codec.importFromSharedJSON(inputData)
        let outputData = try codec.exportToSharedJSON(domain)
        let reparsed = try codec.importFromSharedJSON(outputData)

        XCTAssertEqual(reparsed.patients.first?.id, domain.patients.first?.id)
        XCTAssertEqual(reparsed.patients.first?.labs.count, domain.patients.first?.labs.count)
    }
}
