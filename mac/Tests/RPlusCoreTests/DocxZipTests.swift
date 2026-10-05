import Foundation
import Testing
@testable import RPlusCore

@Suite struct DocxZipTests {
    private let templateDir = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().appendingPathComponent("../../../packages/core").standardized

    @Test func readsWordMadeTemplates() throws {
        for name in ["template.docx", "template_indicaciones.docx", "template_listado.docx"] {
            let entries = try ZipArchive.read(Data(contentsOf: templateDir.appendingPathComponent(name)))
            #expect(entries.contains { $0.name == "word/document.xml" }, "\(name)")
            #expect(entries.contains { $0.name == "[Content_Types].xml" }, "\(name)")
            #expect(!entries.contains { $0.name.hasSuffix("/") })
        }
    }

    @Test func roundTripKeepsBytesAndOrder() throws {
        var random = SystemRandomNumberGenerator()
        let noise = Data((0..<5000).map { _ in UInt8.random(in: 0...255, using: &random) })
        let entries = [
            ZipEntry(name: "a/text.xml", data: Data(String(repeating: "<w:t>hola</w:t>", count: 2000).utf8)),
            ZipEntry(name: "empty.txt", data: Data()),
            ZipEntry(name: "noise.bin", data: noise),
            ZipEntry(name: "ñ/acentos.txt", data: Data("áéíóú".utf8)),
        ]
        let zip = ZipArchive.write(entries)
        #expect(try ZipArchive.read(zip) == entries)
        #expect(zip.count < 5000 + 2000, "text must be deflated, noise stored")
        let check = try runUnzipTest(zip)
        #expect(check.status == 0, "unzip -t failed:\n\(check.output)")
        // Same input, same bytes.
        #expect(ZipArchive.write(entries) == zip)
    }

    @Test func rewritingATemplateStillOpens() throws {
        let src = try Data(contentsOf: templateDir.appendingPathComponent("template_indicaciones.docx"))
        let entries = try ZipArchive.read(src)
        let out = ZipArchive.write(entries)
        #expect(try ZipArchive.read(out) == entries)
        let check = try runUnzipTest(out)
        #expect(check.status == 0, "unzip -t failed:\n\(check.output)")
    }

    @Test func rejectsGarbageAndBadChecksum() throws {
        #expect(throws: ZipError.self) { try ZipArchive.read(Data("not a zip".utf8)) }
        var zip = [UInt8](ZipArchive.write([ZipEntry(name: "a.txt", data: Data("hello world".utf8))]))
        // Flip one data byte (right after the 30-byte header + 5-byte name): the CRC no longer fits.
        zip[35] ^= 0xFF
        #expect(throws: ZipError.self) { try ZipArchive.read(Data(zip)) }
    }
}
