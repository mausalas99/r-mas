import Foundation
@testable import RPlusCore

/// Shared loader for Fixtures/labs (see make-labs-fixtures.mjs). Used by every Labs*Tests file.
let labsFixtureDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    .appendingPathComponent("Fixtures").appendingPathComponent("labs")

struct LabsFixture: Sendable {
    let name: String
    let text: String
    let expected: LabJSON
    var options: ProcesarLabsOptions? {
        guard let o = expected["options"], o != .null else { return nil }
        return try? JSONDecoder().decode(ProcesarLabsOptions.self, from: JSONEncoder().encode(o))
    }
    /// Text of `<name>.second.txt` (only some fixtures have one).
    var secondText: String? { try? String(contentsOf: labsFixtureDir.appendingPathComponent("\(name).second.txt"), encoding: .utf8) }
}

let labsFixtures: [LabsFixture] = {
    let names = ((try? FileManager.default.contentsOfDirectory(atPath: labsFixtureDir.path)) ?? [])
        .filter { $0.hasSuffix(".input.txt") }.map { String($0.dropLast(".input.txt".count)) }.sorted()
    return names.map { n in
        let text = try! String(contentsOf: labsFixtureDir.appendingPathComponent("\(n).input.txt"), encoding: .utf8)
        let data = try! Data(contentsOf: labsFixtureDir.appendingPathComponent("\(n).expected.json"))
        return LabsFixture(name: n, text: text, expected: try! JSONDecoder().decode(LabJSON.self, from: data))
    }
}()

let labsFixtureNames: [String] = labsFixtures.map(\.name)
func labsFixture(_ name: String) -> LabsFixture { labsFixtures.first { $0.name == name }! }

extension LabJSON {
    var arrayValue: [LabJSON] { if case .array(let a) = self { return a }; return [] }
    var stringArray: [String] { arrayValue.compactMap(\.stringValue) }
}

/// resLabs row key: text before the first tab, colon or newline, e.g. "BH", "Liq", "EGO".
func labsRowKey(_ row: String) -> String { String(row.prefix { $0 != "\t" && $0 != ":" && $0 != "\n" }) }
