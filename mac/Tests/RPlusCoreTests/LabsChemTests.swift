import Foundation
import Testing
@testable import RPlusCore

@Suite("Labs Chem") struct LabsChemTests {
    @Test(arguments: labsFixtureNames) func chemistryAndTroponin(_ name: String) throws {
        let f = labsFixture(name)
        let c = f.expected["core"]!
        let textoQS = f.expected["base"]!["textoQS"]!.stringValue!
        let paraBh = c["textoParaBh"]!.stringValue!
        let ctx: EgfrPatientCtx? = c["egfrCtx"] == .null ? nil
            : try JSONDecoder().decode(EgfrPatientCtx.self, from: JSONEncoder().encode(c["egfrCtx"]!))
        #expect(LabChem.parseQS(textoQS, demograf: ctx, prior: nil) == c["qs"]!.stringValue!, "qs \(name)")
        #expect(LabChem.parseESC(textoQS, prior: nil) == c["esc"]!.stringValue!, "esc \(name)")
        #expect(LabChem.parsePFH(paraBh, prior: nil) == c["pfh"]!.stringValue!, "pfh \(name)")
        #expect(LabChem.parseLipasa(textoQS, prior: nil) == c["lipasa"]!.stringValue!, "lipasa \(name)")
        #expect(LabChem.parseTroponina(f.text, prior: nil) == c["trop"]!.stringValue!, "trop \(name)")
    }
}
