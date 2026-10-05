import Testing
@testable import RPlusCore

/// Integration: the whole procesarLabs result must match Node (all units wired through LabParser).
@Suite("Labs parity") struct LabsParityTests {
    @Test func enoughFixtures() { #expect(labsFixtures.count >= 15) }

    @Test(arguments: labsFixtureNames) func fullProcesarLabs(_ name: String) throws {
        let f = labsFixture(name)
        let got = LabParser.procesarLabs(f.text, options: f.options)
        #expect(try LabJSON.of(got) == f.expected["procesarLabs"]!, "full \(name)")
    }
}
