import Testing
@testable import RPlusCore

@Suite("Labs Panels") struct LabsPanelsTests {
    @Test(arguments: labsFixtureNames) func extendedPanels(_ name: String) throws {
        let f = labsFixture(name)
        #expect(try LabJSON.of(PanelParsers.parseExtendedLabPanels(f.text)) == f.expected["panels"]!, "panels \(name)")
    }
}
