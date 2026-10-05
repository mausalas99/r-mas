import Testing
@testable import RPlusCore

@Suite("Labs Cultivo") struct LabsCultivoTests {
    @Test(arguments: labsFixtureNames) func cultivo(_ name: String) throws {
        let f = labsFixture(name)
        #expect(LabJSON.string(CultivoParser.parse(f.text)) == f.expected["cultivo"]!, "cultivo \(name)")
    }
}
