import XCTest
@testable import RPlusMac

final class LabParsingEngineTests: XCTestCase {
    func testParsesBasicBiometriaBlock() {
        let raw = "BH\nHB 12.3\nHTO 36\nLEU 8.1"
        let parsed = LabParsingEngine().parse(raw)
        XCTAssertEqual(parsed.sections.first?.type, .biometria)
        XCTAssertEqual(parsed.sections.first?.items.count, 3)
    }

    func testDoesNotTreatPartialHeaderAsBiometria() {
        let raw = "XBH\nHB 12.3"
        let parsed = LabParsingEngine().parse(raw)
        XCTAssertEqual(parsed.sections.first?.type, .unknown)
    }
}
