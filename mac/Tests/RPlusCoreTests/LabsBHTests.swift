import Foundation
import Testing
@testable import RPlusCore

@Suite("Labs BH") struct LabsBHTests {
    @Test(arguments: labsFixtureNames) func parseBH(_ name: String) throws {
        let f = labsFixture(name)
        let c = f.expected["core"]!
        let got: LabJSON = try LabBH.parseBH(c["textoParaBh"]!.stringValue!, priorRefs: nil, priorBhValues: [:]).map { try LabJSON.of($0) } ?? .null
        #expect(got == c["bh"]!, "bh \(name)")
    }
}
