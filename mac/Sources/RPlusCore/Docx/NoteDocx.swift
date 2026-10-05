import Foundation

/// Port of packages/core/lib/doc-generators/note.js and note-xml-fill.js.
/// Same method: find the template's sample text and swap it for the patient's. Same order of swaps.
enum NoteDocx {
    private static let rprNormal =
        "<w:rPr><w:color w:val=\"231F20\"/><w:spacing w:val=\"6\"/><w:sz w:val=\"23\"/><w:lang w:val=\"es-ES\"/></w:rPr>"
    private static let headerName = "SINTETICO DE PRUEBA UNO"

    static func build(patient: DocxPatient, note: DocxNote, templates: DocxTemplates) throws -> Data {
        let entries = try templates.load("template.docx")
        let base = try DocxShared.text(entries, "word/document.xml", template: "template.docx")
        let xml = try fill(base, patient, note)
        return DocxShared.pack(entries, replacing: ["word/document.xml": xml])
    }

    static func documentXML(patient: DocxPatient, note: DocxNote, templates: DocxTemplates) throws -> String {
        let entries = try templates.load("template.docx")
        return try fill(DocxShared.text(entries, "word/document.xml", template: "template.docx"), patient, note)
    }

    static func fill(_ xml: String, _ patient: DocxPatient, _ note: DocxNote) throws -> String {
        let t = DocxShared.replaceT
        var out = t(xml, "08/04/2026", note.fecha)
        out = t(out, "09:00", note.hora)
        out = t(out, NoteTemplateText.interr, note.interrogatorio.uppercased())
        out = fillPatientHeader(out, patient)
        out = fillLines(out, normalizeLines(note.evolucion), NoteTemplateText.evolLines)
        out = fillLines(out, normalizeLines(note.estudios), NoteTemplateText.estudiosLines)
        out = stripLabPrefixes(out)
        let (dx1, dx2) = diagnosticos(note)
        out = t(out, "CONTROL METABÓLICO", dx1)
        out = t(out, "ABSCESO HEPÁTICO EN LÓBULO HEPÁTICO IZQUIERDO", dx2)
        out = fillVitals(out, note)
        out = try fillTratamiento(out, fitSlots(normalizeList(note.tratamiento), 10), note.medico)
        out = t(out, "DRA. MÓNICA SANCHEZ", note.profesor)
        out = JS.replaceFirst(out, "<w:t xml:space=\"preserve\"> _____</w:t>", "<w:t xml:space=\"preserve\"> </w:t>")
        return out
    }

    // MARK: Input shaping

    /// The template has a fixed number of slots: fold extra lines into the last one, never drop them.
    static func fitSlots(_ lines: [String], _ n: Int) -> [String] {
        lines.count <= n ? lines : Array(lines[..<(n - 1)]) + [lines[(n - 1)...].joined(separator: " | ")]
    }

    static func normalizeLines(_ raw: String) -> [String] {
        JS.splitLines(raw).map(JS.trim).filter { !$0.isEmpty }.map { $0.uppercased() }
    }

    static func normalizeList(_ items: [String]) -> [String] {
        items.map(JS.trim).filter { !$0.isEmpty }
    }

    private static func tx(_ list: [String], _ i: Int) -> String { i < list.count ? list[i].uppercased() : "" }

    private static func diagnosticos(_ note: DocxNote) -> (String, String) {
        let d = normalizeList(note.diagnosticos)
        let dx1 = d.count > 0 ? d[0].uppercased() : ""
        var dx2 = d.count > 1 ? d[1].uppercased() : ""
        if d.count > 2 { dx2 += " | " + d[2...].map { $0.uppercased() }.joined(separator: " | ") }
        return (dx1, dx2)
    }

    // MARK: Fillers

    /// The template holds the header twice (a text box's mc:Choice and its mc:Fallback copy).
    /// Each copy is filled in its own slice, so the Fallback never keeps the sample patient.
    private static func fillPatientHeader(_ xml: String, _ p: DocxPatient) -> String {
        var starts: [String.Index] = []
        var from = xml.startIndex
        while let r = xml.range(of: headerName, options: .literal, range: from..<xml.endIndex) {
            starts.append(r.lowerBound)
            from = xml.utf16.index(after: r.lowerBound)
        }
        if starts.count < 2 { return fillPatientHeaderCopy(xml, p) }
        var out = fillPatientHeaderCopy(String(xml[..<starts[1]]), p)
        for k in 1..<starts.count {
            let end = k + 1 < starts.count ? starts[k + 1] : xml.endIndex
            out += fillPatientHeaderCopy(String(xml[starts[k]..<end]), p)
        }
        return out
    }

    private static func fillPatientHeaderCopy(_ xml: String, _ p: DocxPatient) -> String {
        let esc = DocxShared.esc
        // Mark every anchor before writing any value: area "MEDICINA INTERNA" must not be
        // taken for the servicio anchor.
        let slots: [(String, String)] = [
            (headerName, p.nombre.uppercased()), ("8100023-2", p.registro),
            ("CIRUGÍA AB", p.area.uppercased()), ("MEDICINA INTERNA", p.servicio.uppercased()),
        ]
        var out = xml
        for (i, s) in slots.enumerated() { out = JS.replaceFirst(out, s.0, "\u{E000}\(i)\u{E000}") }
        for (i, s) in slots.enumerated() { out = JS.replaceFirst(out, "\u{E000}\(i)\u{E000}", esc(s.1)) }
        out = DocxShared.replaceT(out, "77", p.edad)
        out = JS.replaceFirst(out, "<w:t>F</w:t>", "<w:t>\(esc(p.sexo))</w:t>")
        out = DocxShared.replaceT(out, "440", p.cuarto)
        out = JS.replaceFirst(out, "<w:t xml:space=\"preserve\"> 05</w:t>", "<w:t xml:space=\"preserve\"> \(esc(p.cama))</w:t>")
        return out
    }

    private static func fillLines(_ xml: String, _ lines: [String], _ orig: [String]) -> String {
        var out = xml
        let fit = fitSlots(lines, orig.count)
        for (i, o) in orig.enumerated() { out = DocxShared.replaceT(out, o, i < fit.count ? fit[i] : "") }
        return out
    }

    private static func stripLabPrefixes(_ xml: String) -> String {
        var out = xml
        for prefix in ["QS", "ESC", "BH", "PFHs"] {
            let re = try! NSRegularExpression(pattern: "<w:t(?:\\s[^>]*)?>\(prefix)</w:t>\\s*<w:tab/>")
            out = re.stringByReplacingMatches(in: out, range: NSRange(out.startIndex..., in: out), withTemplate: "<w:t></w:t>")
        }
        return out
    }

    private static func fillVitals(_ xml: String, _ n: DocxNote) -> String {
        let esc = DocxShared.esc
        var out = DocxShared.replaceT(xml, "130/70", n.ta)
        out = DocxShared.replaceT(out, "19", n.fr)
        out = JS.replaceFirst(out, "<w:t xml:space=\"preserve\">72  </w:t>", "<w:t xml:space=\"preserve\">\(esc(n.fc))  </w:t>")
        out = JS.replaceFirst(out, "<w:t xml:space=\"preserve\"> 36°C</w:t>", "<w:t xml:space=\"preserve\"> \(esc(n.temp))°C</w:t>")
        out = JS.replaceFirst(out, "<w:t xml:space=\"preserve\"> 55.000</w:t>", "<w:t xml:space=\"preserve\"> \(esc(n.peso))</w:t>")
        return out
    }

    private static func has(_ s: String, _ needle: String) -> Bool { s.range(of: needle, options: .literal) != nil }

    private static func fillTratamiento(_ xml: String, _ list: [String], _ medico: String) throws -> String {
        let esc = DocxShared.esc
        let paragraphs = DocxShared.findParagraphs(xml)
        guard paragraphs.count > 68 else { throw DocxError.template("template.docx: párrafo P68 no encontrado") }
        let p68 = paragraphs[68]
        var ppr = ""
        if let a = p68.range(of: "<w:pPr>", options: .literal),
           let b = p68.range(of: "</w:pPr>", options: .literal, range: a.upperBound..<p68.endIndex) {
            ppr = String(p68[a.lowerBound..<b.upperBound])
        }

        let tx0 = tx(list, 0), tx5 = tx(list, 5)
        let left1 = tx0.isEmpty ? "1. ___________________________________" : "1. \(tx0)"
        let right6 = tx5.isEmpty ? "6. ___________________________________" : "6. \(tx5)"
        let p68New =
            "<w:p><w:pPr>\(ppr)</w:pPr>"
            + "<w:r>\(rprNormal)<w:t xml:space=\"preserve\">\(esc(left1))\(String(repeating: "  ", count: 10))</w:t></w:r>"
            + "<w:r>\(rprNormal)<w:t>\(esc(right6))</w:t></w:r></w:p>"
        var out = JS.replaceFirst(xml, p68, p68New)

        for (i, orig) in NoteTemplateText.txLeft.enumerated() {
            let t = tx(list, i + 1)
            out = JS.replaceFirst(out, orig, esc(t.isEmpty ? orig : "\(i + 2). \(t)"))
        }

        for (i, orig) in NoteTemplateText.txRight.enumerated() {
            let num = i + 7
            let t = tx(list, i + 6)
            if t.isEmpty { continue }
            if has(out, orig) {
                out = JS.replaceFirst(out, orig, esc("\(num). \(t)"))
                continue
            }
            // Slots 7–9: the template splits "7.  " and its blank line into separate runs.
            guard let para = DocxShared.findParagraphs(out).first(where: { has($0, ">\(num).  </w:t>") }) else { continue }
            var filled = JS.replaceFirst(para, ">\(num).  </w:t>", ">\(esc("\(num). \(t)"))</w:t>")
            filled = JS.replaceFirst(filled, ">" + String(repeating: "_", count: 39) + "</w:t>", "></w:t>")
            out = JS.replaceFirst(out, para, filled)
        }
        return replaceMedico(out, medico)
    }

    /// JS: /<w:t>R3<\/w:t>(\s*<\/w:r>\s*<w:r>.*?)<w:t>SUFFIX<\/w:t>/s → keep the group, blank the
    /// R3 text, write the doctor. By hand: the lazy `.*?` over a 360 KB file is a backtracking risk.
    private static func replaceMedico(_ xml: String, _ medico: String) -> String {
        let open = "<w:t>R3</w:t>"
        let target = "<w:t>\(DocxShared.esc(NoteTemplateText.medicoSuffix))</w:t>"
        let sc = xml.unicodeScalars
        func skipSpace(_ i: String.Index) -> String.Index {
            var j = i
            while j < xml.endIndex, sc[j].properties.isWhitespace { j = sc.index(after: j) }
            return j
        }
        var from = xml.startIndex
        while let o = xml.range(of: open, options: .literal, range: from..<xml.endIndex) {
            from = o.upperBound
            var q = skipSpace(o.upperBound)
            guard xml[q...].hasPrefix("</w:r>") else { continue }
            q = skipSpace(xml.index(q, offsetBy: 6))
            guard xml[q...].hasPrefix("<w:r>") else { continue }
            let afterRun = xml.index(q, offsetBy: 5)
            // No target after this start means none after a later start: the regex fails.
            guard let t = xml.range(of: target, options: .literal, range: afterRun..<xml.endIndex) else { return xml }
            return String(xml[..<o.lowerBound]) + "<w:t></w:t>" + String(xml[o.upperBound..<t.lowerBound])
                + "<w:t>\(DocxShared.esc(medico))</w:t>" + String(xml[t.upperBound...])
        }
        return xml
    }
}
