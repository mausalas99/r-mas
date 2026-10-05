import Foundation

public enum DocxError: Error, CustomStringConvertible {
    case template(String)

    public var description: String {
        switch self { case .template(let s): s }
    }
}

/// Folder that holds template.docx, template_indicaciones.docx and template_listado.docx
/// (`packages/core/` in the repo). The app bundle must ship the same three files.
public struct DocxTemplates: Sendable {
    public var directory: URL
    public init(directory: URL) { self.directory = directory }

    func load(_ fileName: String) throws -> [ZipEntry] {
        let url = directory.appendingPathComponent(fileName)
        guard let data = try? Data(contentsOf: url) else { throw DocxError.template("Plantilla no encontrada: \(fileName)") }
        return try ZipArchive.read(data)
    }
}

enum DocxShared {
    /// Text → safe inside <w:t>. "$" becomes &#36; like the Node `esc`, so a value can never act as
    /// a replacement pattern there; Swift needs no such care but the XML must stay the same.
    static func esc(_ text: String) -> String {
        var out = String.UnicodeScalarView()
        for u in text.unicodeScalars {
            switch u.value {
            case 0...8, 0xB, 0xC, 0xE...0x1F, 0xFFFE, 0xFFFF: out.append(" ")
            case 0x26: out.append(contentsOf: "&amp;".unicodeScalars)
            case 0x3C: out.append(contentsOf: "&lt;".unicodeScalars)
            case 0x3E: out.append(contentsOf: "&gt;".unicodeScalars)
            case 0x22: out.append(contentsOf: "&quot;".unicodeScalars)
            case 0x24: out.append(contentsOf: "&#36;".unicodeScalars)
            default: out.append(u)
            }
        }
        return String(out)
    }

    static func replaceT(_ xml: String, _ old: String, _ new: String) -> String {
        let eOld = esc(old), eNew = esc(new)
        var out = JS.replaceAll(xml, "<w:t>\(eOld)</w:t>", "<w:t>\(eNew)</w:t>")
        out = JS.replaceAll(out, "<w:t xml:space=\"preserve\">\(eOld)</w:t>", "<w:t xml:space=\"preserve\">\(eNew)</w:t>")
        return out
    }

    /// Template entries with `word/document.xml` (and optionally more) replaced, packed as .docx.
    static func pack(_ entries: [ZipEntry], replacing changes: [String: String]) -> Data {
        var out = entries
        for i in out.indices {
            if let text = changes[out[i].name] { out[i].data = Data(text.utf8) }
        }
        return ZipArchive.write(out)
    }

    static func text(_ entries: [ZipEntry], _ name: String, template: String) throws -> String {
        guard let e = entries.first(where: { $0.name == name }) else {
            throw DocxError.template("\(template): falta \(name)")
        }
        return String(decoding: e.data, as: UTF8.self)
    }

    /// Text of `<w:p ...>...</w:p>` blocks in document order. Same scan as the JS regex
    /// `/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g`, done by hand so a 360 KB file costs no regex backtracking.
    static func findParagraphs(_ xml: String) -> [String] {
        var out: [String] = []
        var pos = xml.startIndex
        while let r = xml.range(of: "<w:p", options: .literal, range: pos..<xml.endIndex) {
            let after = r.upperBound
            if after < xml.endIndex, JS.isWordByte(xml.unicodeScalars[after]) { pos = after; continue }
            guard let gt = xml.range(of: ">", options: .literal, range: after..<xml.endIndex),
                  let end = xml.range(of: "</w:p>", options: .literal, range: gt.upperBound..<xml.endIndex)
            else { break }
            out.append(String(xml[r.lowerBound..<end.upperBound]))
            pos = end.upperBound
        }
        return out
    }
}
