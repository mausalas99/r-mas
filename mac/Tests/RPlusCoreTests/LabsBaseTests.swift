import Testing
@testable import RPlusCore

@Suite("Labs Base") struct LabsBaseTests {
    @Test(arguments: labsFixtureNames) func gasoAndPie(_ name: String) throws {
        let f = labsFixture(name)
        let b = f.expected["base"]!
        let got = LabGaso.parseGaso(bloque: b["bloqueGaso"]!.stringValue!, textoQS: b["textoQS"]!.stringValue!, gasRefs: nil)
        #expect(got.map { LabJSON.string($0) } ?? .null == b["gaso"]!, "gaso \(name)")
        let tNorm = JSRegex(#"\s+"#, "g").replace(f.text, with: " ")
        #expect(LabGaso.parsePIE(tNorm: tNorm).map { LabJSON.string($0) } ?? .null == b["pie"]!, "pie \(name)")
    }
}
