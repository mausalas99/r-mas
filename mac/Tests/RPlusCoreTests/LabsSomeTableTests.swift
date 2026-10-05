import Testing
@testable import RPlusCore

@Suite("Labs SomeTable") struct LabsSomeTableTests {
    @Test(arguments: labsFixtureNames) func someTables(_ name: String) throws {
        let f = labsFixture(name)
        let got: LabJSON = try SomeTableParser.parse(f.text).map { try LabJSON.of($0) } ?? .null
        #expect(got == f.expected["someTables"]!, "someTables \(name)")
    }
}
