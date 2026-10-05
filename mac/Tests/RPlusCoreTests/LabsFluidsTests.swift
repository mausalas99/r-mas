import Testing
@testable import RPlusCore

@Suite("Labs Fluids") struct LabsFluidsTests {
    @Test(arguments: labsFixtureNames) func citoquimicoAndLcr(_ name: String) throws {
        let f = labsFixture(name)
        #expect(LabJSON.string(FluidParsers.parsearCitoquimicoLiquidos(f.text)) == f.expected["citoLiquidos"]!, "cito \(name)")
        #expect(LabJSON.string(FluidParsers.parsearLCR(f.text)) == f.expected["lcr"]!, "lcr \(name)")
    }
}
