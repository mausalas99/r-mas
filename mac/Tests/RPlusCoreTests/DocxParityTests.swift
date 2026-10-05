import Foundation
import Testing
@testable import RPlusCore

/// Fixtures come from Fixtures/docx/make-docx-fixtures.mjs: Node builds each document from an
/// invented patient. Swift gets the same input and must make the same word/document.xml.
private struct Case: Decodable {
    struct Input: Decodable {
        var patient: DocxPatient
        var note: DocxNote?
        var indicaciones: DocxIndicaciones?
        var listado: DocxListado?
        var medicos: DocxMedicos?
    }
    var kind: String
    var input: Input
    var fileName: String
    var numberingInject: String?
}

private let here = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
private let fixtures = here.appendingPathComponent("Fixtures/docx")
private let templateDir = here.appendingPathComponent("../../../packages/core").standardized
private let templates = DocxTemplates(directory: templateDir)

private let caseNames = [
    "note-full", "note-sparse", "indicaciones-full", "indicaciones-sparse", "listado-full", "listado-sparse",
]

/// Same rule as the Node generator: drop line breaks (and indent) between tags.
private func normalize(_ xml: String) -> String {
    let re = try! NSRegularExpression(pattern: #">\s*[\r\n]\s*<"#)
    let s = re.stringByReplacingMatches(in: xml, range: NSRange(xml.startIndex..., in: xml), withTemplate: "><")
    return s.trimmingCharacters(in: .whitespacesAndNewlines)
}

/// First point where two long strings differ, with a little context. A 300 KB dump helps nobody.
private func firstDiff(_ a: String, _ b: String) -> String {
    let x = Array(a.utf16), y = Array(b.utf16)
    var i = 0
    while i < x.count, i < y.count, x[i] == y[i] { i += 1 }
    func cut(_ u: [UInt16]) -> String {
        String(decoding: u[max(0, i - 80)..<min(u.count, i + 120)], as: UTF16.self)
    }
    return "differ at \(i) (lengths \(x.count) vs \(y.count))\n swift: …\(cut(x))\n node:  …\(cut(y))"
}

func runUnzipTest(_ data: Data) throws -> (status: Int32, output: String) {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("rplus-\(UUID().uuidString).docx")
    try data.write(to: url)
    defer { try? FileManager.default.removeItem(at: url) }
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
    p.arguments = ["-t", url.path]
    let pipe = Pipe()
    p.standardOutput = pipe
    p.standardError = pipe
    try p.run()
    let out = pipe.fileHandleForReading.readDataToEndOfFile()
    p.waitUntilExit()
    return (p.terminationStatus, String(decoding: out, as: UTF8.self))
}

@Suite struct DocxParityTests {
    @Test(arguments: caseNames)
    func documentMatchesNode(name: String) throws {
        let c = try JSONDecoder().decode(Case.self, from: Data(contentsOf: fixtures.appendingPathComponent("\(name).json")))
        let expected = try String(contentsOf: fixtures.appendingPathComponent("\(name).document.xml"), encoding: .utf8)

        let result: DocxExport.Result
        switch c.kind {
        case "note":
            result = try DocxExport.note(patient: c.input.patient, note: try #require(c.input.note), templates: templates)
        case "indicaciones":
            result = try DocxExport.indicaciones(patient: c.input.patient, indicaciones: try #require(c.input.indicaciones), templates: templates)
        default:
            result = try DocxExport.listado(
                patient: c.input.patient, listado: try #require(c.input.listado),
                medicos: c.input.medicos ?? DocxMedicos(), templates: templates)
        }
        if let dir = ProcessInfo.processInfo.environment["RPLUS_DOCX_OUT"] {
            try result.data.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).docx"))
        }

        // The file opens: the system unzip checks every entry and its CRC.
        let check = try runUnzipTest(result.data)
        #expect(check.status == 0, "unzip -t failed:\n\(check.output)")

        let entries = try ZipArchive.read(result.data)
        let doc = try #require(entries.first { $0.name == "word/document.xml" })
        let got = normalize(String(decoding: doc.data, as: UTF8.self))
        #expect(got == expected, Comment(rawValue: firstDiff(got, expected)))

        // Every other file of the template is carried over unchanged (except numbering.xml in Listado).
        let template = try templates.load(c.kind == "note" ? "template.docx" : "template_\(c.kind).docx")
        #expect(entries.map(\.name) == template.map(\.name))
        for (e, t) in zip(entries, template) where e.name != "word/document.xml" && e.name != "word/numbering.xml" {
            #expect(e.data == t.data, "\(e.name) changed")
        }

        if c.kind == "listado" {
            #expect(result.fileName.hasPrefix(c.fileName.replacingOccurrences(of: "STAMP.docx", with: "")))
            #expect(result.fileName.range(of: #"_\d\d-\d\d-\d\d\.docx$"#, options: .regularExpression) != nil)
            let num = try #require(entries.first { $0.name == "word/numbering.xml" })
            let numText = String(decoding: num.data, as: UTF8.self)
            if let inject = c.numberingInject {
                let at = try #require(numText.range(of: "<w:num w:numId=\"9000\">"))
                #expect(String(numText[at.lowerBound...]) == inject)
            } else {
                #expect(numText.range(of: "<w:num w:numId=\"9000\">") == nil)
            }
        } else {
            #expect(result.fileName == c.fileName)
        }
    }

    @Test func listadoFileNameStamp() throws {
        var comps = DateComponents()
        comps.year = 2026; comps.month = 10; comps.day = 5; comps.hour = 7; comps.minute = 4; comps.second = 9
        let now = try #require(Calendar.current.date(from: comps))
        let r = try DocxExport.listado(patient: DocxPatient(), listado: DocxListado(), templates: templates, now: now)
        #expect(r.fileName == "Listado_Problemas___07-04-09.docx")
    }

    @Test func safeNameRules() {
        #expect(DocxExport.safeName("José Ñandú, Pérez-López") == "José_Ñandú__Pérez_López")
        #expect(DocxExport.safeName("a😀b") == "a__b")
        #expect(DocxExport.safeName(String(repeating: "x", count: 100)).count == 80)
        // NFD input ("e" + combining acute) becomes one NFC letter first.
        #expect(DocxExport.safeName("Jose\u{301}") == "José")
    }

    @Test func missingTemplateIsNamed() {
        let bad = DocxTemplates(directory: templateDir.appendingPathComponent("nope"))
        #expect(throws: DocxError.self) {
            try DocxExport.note(patient: DocxPatient(), note: DocxNote(), templates: bad)
        }
    }
}
