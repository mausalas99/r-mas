import Foundation

/// Port of listado.js and listado-table-body.js.
enum ListadoDocx {
    private static let cellRprDefault =
        "<w:rPr><w:rFonts w:ascii=\"Times New Roman\" w:hAnsi=\"Times New Roman\" w:cs=\"Times New Roman\"/>"
        + "<w:color w:val=\"373435\"/><w:sz w:val=\"16\"/><w:szCs w:val=\"16\"/></w:rPr>"
    private static let cellRprBold =
        "<w:rPr><w:rFonts w:ascii=\"Times New Roman\" w:hAnsi=\"Times New Roman\" w:cs=\"Times New Roman\"/>"
        + "<w:b/><w:bCs/><w:color w:val=\"373435\"/><w:sz w:val=\"16\"/><w:szCs w:val=\"16\"/></w:rPr>"
    private static let paraRprDefault =
        "<w:rPr><w:rFonts w:ascii=\"Times New Roman\" w:hAnsi=\"Times New Roman\" w:cs=\"Times New Roman\"/>"
        + "<w:sz w:val=\"16\"/><w:szCs w:val=\"16\"/></w:rPr>"
    private static let listLvl0LeftDxa = 720
    private static let listBodyChunkMax = 110
    private static let listNumIdBase = 35
    private static let listNumIdDynamicStart = 9000
    private static let templateName = "template_listado.docx"

    /// Numbering ids handed out while the rows are built (JS `numIdAlloc`).
    private struct NumIds {
        var next = listNumIdDynamicStart
        var used: Set<Int> = []
    }

    struct Output {
        var entries: [ZipEntry]
        var documentXML: String
        var numberingXML: String?
    }

    static func build(patient: DocxPatient, listado: DocxListado, medicos: DocxMedicos, templates: DocxTemplates) throws -> Data {
        let o = try make(patient, listado, medicos, templates)
        var changes = ["word/document.xml": o.documentXML]
        if let n = o.numberingXML { changes["word/numbering.xml"] = n }
        return DocxShared.pack(o.entries, replacing: changes)
    }

    static func make(_ patient: DocxPatient, _ listado: DocxListado, _ medicos: DocxMedicos, _ templates: DocxTemplates) throws -> Output {
        let entries = try templates.load(templateName)
        let base = try DocxShared.text(entries, "word/document.xml", template: templateName)
        var ids = NumIds()
        let xml = try fillDocument(base, patient, listado, medicos, &ids)
        var numbering: String?
        if let e = entries.first(where: { $0.name == "word/numbering.xml" }) {
            numbering = injectNumbering(String(decoding: e.data, as: UTF8.self), ids)
        }
        return Output(entries: entries, documentXML: xml, numberingXML: numbering)
    }

    // MARK: Text helpers

    static func fmtFecha(_ s: String) -> String {
        let t = JS.trim(s)
        let p = t.split(separator: "-", omittingEmptySubsequences: false)
        if p.count == 3, p[0].count == 4, p[1].count == 2, p[2].count == 2,
           t.unicodeScalars.allSatisfy({ $0.isASCII && ($0 == "-" || ($0.value >= 48 && $0.value <= 57)) }) {
            return "\(p[2])/\(p[1])/\(p[0])"
        }
        return t
    }

    private static func mkPara(_ content: String, centered: Bool = false) -> String {
        let jc = centered ? "<w:jc w:val=\"center\"/>" : ""
        return "<w:p><w:pPr><w:pStyle w:val=\"TableParagraph\"/>\(jc)\(paraRprDefault)</w:pPr>\(content)</w:p>"
    }

    private static func mkRun(_ text: String, bold: Bool = false) -> String {
        "<w:r>\(bold ? cellRprBold : cellRprDefault)<w:t xml:space=\"preserve\">\(DocxShared.esc(text))</w:t></w:r>"
    }

    /// Cut position (UTF-16 units) inside `window`, or its length when no good break exists.
    private static func bestBreak(_ window: NSString, minCut: Int = 24) -> Int {
        var best = -1
        for sep in [". ", "? ", "! ", "; ", ", ", " "] {
            let r = window.range(of: sep, options: [.literal, .backwards])
            if r.location != NSNotFound, r.location >= minCut, r.location + sep.utf16.count > best {
                best = r.location + sep.utf16.count
            }
        }
        return best > 0 ? best : window.length
    }

    /// JS `splitLongCellText`. Lengths and cuts count UTF-16 units, like JS `length` and `slice`.
    static func splitLongCellText(_ text: String, maxChars: Int = listBodyChunkMax) -> [String] {
        let t = JS.trim(text)
        if t.isEmpty { return [""] }
        if t.utf16.count <= maxChars { return [t] }
        var chunks: [String] = []
        var rest = t as NSString
        while rest.length > 0 {
            if rest.length <= maxChars { chunks.append(rest as String); break }
            let window = rest.substring(to: maxChars) as NSString
            var cut = bestBreak(window)
            if cut <= 0 || cut >= window.length { cut = maxChars }
            var piece = JS.trimEnd(rest.substring(to: cut))
            if piece.isEmpty {
                cut = min(maxChars, rest.length)
                piece = JS.trimEnd(rest.substring(to: cut))
            }
            chunks.append(piece)
            rest = JS.trimStart(rest.substring(from: cut)) as NSString
        }
        return chunks.filter { !$0.isEmpty }
    }

    private static func mkListContinuationPara(_ chunk: String) -> String {
        "<w:p><w:pPr><w:pStyle w:val=\"TableParagraph\"/><w:ind w:left=\"\(listLvl0LeftDxa)\" w:hanging=\"0\"/>"
            + "<w:contextualSpacing/>\(paraRprDefault)</w:pPr>"
            + "<w:r>\(cellRprDefault)<w:t xml:space=\"preserve\">\(DocxShared.esc(chunk))</w:t></w:r></w:p>"
    }

    private static func mkListPara(_ content: String, _ numId: Int) -> String {
        let chunks = splitLongCellText(content)
        let head =
            "<w:p><w:pPr><w:pStyle w:val=\"TableParagraph\"/>"
            + "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"\(numId)\"/></w:numPr>"
            + "<w:contextualSpacing/>\(paraRprDefault)</w:pPr>"
        if chunks.isEmpty || (chunks.count == 1 && chunks[0].isEmpty) { return head + "</w:p>" }
        let first = head + "<w:r>\(cellRprDefault)<w:t xml:space=\"preserve\">\(DocxShared.esc(chunks[0]))</w:t></w:r></w:p>"
        return first + chunks.dropFirst().map(mkListContinuationPara).joined()
    }

    /// JS LIST_LINE_RE `^\s*([A-Za-zÑñ])\)\s*(.*)$`: returns the text after "x)".
    private static func listLineContent(_ line: String) -> String? {
        let re = try! NSRegularExpression(pattern: "^\\s*([A-Za-zÑñ])\\)\\s*(.*)\\z")
        guard let m = re.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)),
              let r = Range(m.range(at: 2), in: line) else { return nil }
        return String(line[r])
    }

    private static func textToParagraphs(_ text: String, _ ids: inout NumIds) -> String {
        if text.isEmpty { return "<w:p/>" }
        var paragraphs: [String] = []
        var current: Int?

        func assign(_ ids: inout NumIds) -> Int {
            if !ids.used.contains(listNumIdBase) {
                ids.used.insert(listNumIdBase)
                return listNumIdBase
            }
            let nid = ids.next
            ids.next += 1
            ids.used.insert(nid)
            return nid
        }

        for raw in JS.splitLines(text) {
            let line = raw.unicodeScalars.last == "\r" ? String(raw.unicodeScalars.dropLast()) : raw
            if JS.trim(line).isEmpty {
                paragraphs.append("<w:p/>")
                current = nil
                continue
            }
            if let content = listLineContent(line) {
                if current == nil { current = assign(&ids) }
                paragraphs.append(mkListPara(content, current!))
            } else {
                for part in splitLongCellText(line) { paragraphs.append(mkPara(mkRun(part, bold: true))) }
                current = nil
            }
        }
        return paragraphs.joined()
    }

    private static func plainCell(_ width: Int, _ text: String, centered: Bool = false, borders: String = "") -> String {
        let body = text.isEmpty ? "<w:p/>" : mkPara(mkRun(text), centered: centered)
        return "<w:tc><w:tcPr><w:tcW w:w=\"\(width)\" w:type=\"dxa\"/>\(borders)</w:tcPr>\(body)</w:tc>"
    }

    private static func descCell(_ width: Int, _ text: String, _ ids: inout NumIds, borders: String = "") -> String {
        "<w:tc><w:tcPr><w:tcW w:w=\"\(width)\" w:type=\"dxa\"/>\(borders)</w:tcPr>\(textToParagraphs(text, &ids))</w:tc>"
    }

    private static func buildProblemRow(_ fecha: String, _ num: Int, _ activos: String, _ inactivos: String, _ ids: inout NumIds) -> String {
        let line = "w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"373435\""
        let c1 = plainCell(1542, fmtFecha(fecha), centered: true,
                           borders: "<w:tcBorders><w:left w:val=\"nil\"/><w:right \(line)/></w:tcBorders>")
        let c2 = plainCell(599, "\(num).", centered: true, borders: "<w:tcBorders><w:left \(line)/></w:tcBorders>")
        let c3 = descCell(5387, activos, &ids, borders: "<w:tcBorders><w:right \(line)/></w:tcBorders>")
        let c4 = descCell(3249, inactivos, &ids, borders: "<w:tcBorders><w:left \(line)/><w:right w:val=\"nil\"/></w:tcBorders>")
        return "<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val=\"448\" w:hRule=\"atLeast\"/></w:trPr>\(c1)\(c2)\(c3)\(c4)</w:tr>"
    }

    // MARK: Document

    private static func replaceSentinels(_ xml: String, _ pairs: [(String, String)]) -> String {
        var out = xml
        for (s, v) in pairs { out = JS.replaceAll(out, s, DocxShared.esc(v)) }
        return out
    }

    private static func fillDocument(_ xml: String, _ p: DocxPatient, _ listado: DocxListado, _ m: DocxMedicos, _ ids: inout NumIds) throws -> String {
        var out = replaceSentinels(xml, [
            ("~~NOMBRE~~", p.nombre.uppercased()), ("~~REGISTRO~~", p.registro), ("~~EDAD~~", p.edad),
            ("~~SEXO~~", p.sexo.uppercased()), ("~~AREA~~", p.area.uppercased()),
            ("~~SERVICIO~~", p.servicio.uppercased()), ("~~CUARTO~~", p.cuarto), ("~~CAMA~~", p.cama),
        ])
        out = replaceSentinels(out, [
            ("~~MEDICO_PROFESOR~~", m.profesor), ("~~MEDICO_R4~~", m.r4), ("~~MEDICO_R2~~", m.r2),
            ("~~MEDICO_R1A~~", m.r1a), ("~~MEDICO_R1B~~", m.r1b),
        ])

        guard let mark = out.range(of: "<!--LISTADO_TABLE_BODY-->", options: .literal)
        else { throw DocxError.template("\(templateName): falta marcador LISTADO_TABLE_BODY") }
        guard let tstart = out.range(of: "<w:tbl>", options: [.literal, .backwards], range: out.startIndex..<mark.lowerBound)
        else { throw DocxError.template("\(templateName): tabla de listado no encontrada") }
        guard let tr1 = out.range(of: "<w:tr", options: .literal, range: tstart.lowerBound..<out.endIndex),
              let tr1EndRaw = out.range(of: "</w:tr>", options: .literal, range: tr1.lowerBound..<out.endIndex)
        else { throw DocxError.template("\(templateName): fila de cabecera incompleta") }
        let tr1End = tr1EndRaw.upperBound
        let stub = String(out[tstart.upperBound..<tr1.lowerBound])

        guard let mStart = out.range(of: "<w:tr", options: .literal, range: mark.lowerBound..<out.endIndex),
              let mEnd = out.range(of: "</w:tr>", options: .literal, range: mStart.lowerBound..<out.endIndex)
        else { throw DocxError.template("\(templateName): fila de médicos no encontrada") }
        let medicoRow = String(out[mStart.lowerBound..<mEnd.upperBound])
        guard let tblClose = out.range(of: "</w:tbl>", options: .literal, range: mEnd.upperBound..<out.endIndex)
        else { throw DocxError.template("\(templateName): cierre de tabla no encontrado") }

        var tables: [String] = []
        let total = max(listado.activos.count, listado.inactivos.count)
        for i in 0..<total {
            let a = i < listado.activos.count ? listado.activos[i] : DocxListado.Problema()
            let ina = i < listado.inactivos.count ? listado.inactivos[i] : DocxListado.Problema()
            let fecha = !a.fecha.isEmpty ? a.fecha : ina.fecha
            let row = buildProblemRow(fecha, i + 1, a.descripcion, ina.descripcion, &ids)
            tables.append("<w:tbl>\(stub)\(row)</w:tbl>")
        }
        let tail = tables.joined() + "<w:tbl>\(stub)\(medicoRow)</w:tbl>"
        return String(out[..<tr1End]) + "</w:tbl>" + tail + String(out[tblClose.upperBound...])
    }

    private static func injectNumbering(_ numXml: String, _ ids: NumIds) -> String? {
        let synth = ids.used.filter { $0 != listNumIdBase }.sorted()
        if numXml.isEmpty || synth.isEmpty { return nil }
        let inject = synth.map {
            "<w:num w:numId=\"\($0)\"><w:abstractNumId w:val=\"57\"/>"
                + "<w:lvlOverride w:ilvl=\"0\"><w:startOverride w:val=\"1\"/></w:lvlOverride></w:num>"
        }.joined()
        guard numXml.range(of: "</w:numbering>", options: .literal) != nil else { return nil }
        return JS.replaceFirst(numXml, "</w:numbering>", inject + "</w:numbering>")
    }
}
