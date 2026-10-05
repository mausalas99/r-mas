import Foundation
import Testing
@testable import RPlusCore

/// Core compares only what Core owns. Rows from Fluids/Panels/Cultivo/Base units are not checked here
/// (see LabsParityTests for the whole result).
@Suite("Labs Core") struct LabsCoreTests {
    static let coreKeys: Set<String> = ["BH", "QS", "ESC", "PFHs", "COAG", "LIPASA", "TROP", "PltCit"]

    @Test(arguments: labsFixtureNames) func headerAndPlainRows(_ name: String) throws {
        let f = labsFixture(name)
        let got = ProcesarLabs.run(f.text, options: f.options)
        let exp = f.expected["procesarLabs"]!
        #expect(try LabJSON.of(got.patient) == exp["patient"]!, "patient \(name)")
        let keep = { (r: String) in Self.coreKeys.contains(labsRowKey(r)) }
        #expect(got.resLabs.filter(keep) == exp["resLabs"]!.stringArray.filter(keep), "core rows \(name)")
        let expRefs = try JSONDecoder().decode([String: [String: [Double]]].self, from: JSONEncoder().encode(exp["refsBySection"]!))
        #expect(got.refsBySection.filter { Self.coreKeys.contains($0.key) } == expRefs.filter { Self.coreKeys.contains($0.key) }, "core refs \(name)")
        if f.options == nil {
            let expExtras = try JSONDecoder().decode([String: String].self, from: JSONEncoder().encode(exp["bhExtras"]!))
            #expect(got.bhExtras == expExtras, "bhExtras \(name)")
        }
    }

    @Test(arguments: labsFixtureNames) func bulkSplitAndDedupe(_ name: String) throws {
        let f = labsFixture(name)
        #expect(LabBulk.splitByPatient(f.text) == f.expected["bulkSplit"]!.stringArray, "split \(name)")
        if let dedupe = f.expected["dedupe"], let second = f.secondText {
            let rows = ProcesarLabs.run(f.text).resLabs + ProcesarLabs.run(second).resLabs
            #expect(try LabJSON.of(LabBulk.dedupeConsolidatedRows(rows, tipo: "labs")) == dedupe, "dedupe \(name)")
        }
    }
}
