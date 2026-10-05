import Foundation

/// Port of indicaciones.js, indicaciones-cells.js and indicaciones-table-fill.js.
enum IndicacionesDocx {
    private static let sz = "<w:sz w:val=\"16\"/><w:szCs w:val=\"16\"/>"
    private static let listNumId = "52"

    static func build(patient: DocxPatient, indicaciones: DocxIndicaciones, templates: DocxTemplates) throws -> Data {
        let (entries, xml) = try fill(patient, indicaciones, templates)
        return DocxShared.pack(entries, replacing: ["word/document.xml": xml])
    }

    static func documentXML(patient: DocxPatient, indicaciones: DocxIndicaciones, templates: DocxTemplates) throws -> String {
        try fill(patient, indicaciones, templates).1
    }

    private static func fill(_ patient: DocxPatient, _ ind: DocxIndicaciones, _ templates: DocxTemplates) throws -> ([ZipEntry], String) {
        let entries = try templates.load("template_indicaciones.docx")
        var xml = try DocxShared.text(entries, "word/document.xml", template: "template_indicaciones.docx")
        let servicio = (patient.servicio.isEmpty ? "MEDICINA INTERNA" : patient.servicio).uppercased()
        xml = try fillTable(xml, ind, servicio)
        xml = fillPatientFields(xml, patient, servicio)
        return (entries, xml)
    }

    // MARK: Cells

    private static func mkR(_ text: String, bold: Bool = false) -> String {
        let b = bold ? "<w:b/><w:bCs/>" : ""
        return "<w:r><w:rPr>\(b)\(sz)</w:rPr><w:t xml:space=\"preserve\">\(DocxShared.esc(text))</w:t></w:r>"
    }

    private static func mkP(_ content: String, centered: Bool = false) -> String {
        let jc = centered ? "<w:jc w:val=\"center\"/>" : ""
        return "<w:p><w:pPr>\(jc)<w:rPr>\(sz)</w:rPr></w:pPr>\(content)</w:p>"
    }

    private static func mkListP(_ text: String) -> String {
        "<w:p><w:pPr><w:pStyle w:val=\"ListParagraph\"/>"
            + "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"\(listNumId)\"/></w:numPr><w:rPr>\(sz)</w:rPr></w:pPr>"
            + "<w:r><w:rPr>\(sz)</w:rPr><w:t xml:space=\"preserve\">\(DocxShared.esc(text))</w:t></w:r></w:p>"
    }

    private static func sectionXml(_ title: String, _ content: String) -> String {
        var xml = mkP(mkR(title, bold: true))
        let body = JS.trim(content)
        if !body.isEmpty {
            for line in JS.splitLines(body) {
                let stripped = JS.trim(line)
                if !stripped.isEmpty { xml += mkListP(stripped) }
            }
        }
        return xml
    }

    private static func cellR0c0(_ fecha: String, _ hora: String) -> String {
        "<w:tc><w:tcPr><w:tcW w:w=\"1980\" w:type=\"dxa\"/></w:tcPr>\(mkP(mkR(fecha)))\(mkP(mkR("\(hora) HORAS")))</w:tc>"
    }

    private static func cellR0c1(_ servicio: String) -> String {
        "<w:tc><w:tcPr><w:tcW w:w=\"8916\" w:type=\"dxa\"/></w:tcPr>"
            + "\(mkP(mkR("INDICACIONES POR \(servicio)"), centered: true))</w:tc>"
    }

    private static func cellR1c0(_ medicos: String) -> String {
        var content = mkP("")
        for line in JS.splitLines(medicos).map(JS.trim).filter({ !$0.isEmpty }) { content += mkP(mkR(line)) }
        return "<w:tc><w:tcPr><w:tcW w:w=\"1980\" w:type=\"dxa\"/></w:tcPr>\(content)</w:tc>"
    }

    private static func cellR1c1(_ ind: DocxIndicaciones, _ servicio: String) -> String {
        var desc = JS.trim(ind.descripcion)
        if desc.isEmpty { desc = "INDICACIONES POR SERVICIO DE \(servicio)" }
        var content = mkP(mkR(desc))
        let sections: [(String, String)] = [
            ("DIETA", ind.dieta), ("CUIDADOS", ind.cuidados), ("ESTUDIOS", ind.estudios),
            ("MEDICAMENTOS", ind.medicamentos), ("INTERCONSULTAS", ind.interconsultas),
        ]
        for (title, body) in sections { content += sectionXml(title, body) }
        for item in ind.otros {
            let titulo = JS.trim(item.titulo).uppercased()
            if !titulo.isEmpty { content += sectionXml(titulo, JS.trim(item.contenido)) }
        }
        return "<w:tc><w:tcPr><w:tcW w:w=\"8916\" w:type=\"dxa\"/></w:tcPr>\(content)</w:tc>"
    }

    // MARK: Table fill

    /// First `<w:tr ...>...</w:tr>` blocks of `s`, like JS `/<w:tr[ >][\s\S]*?<\/w:tr>/g`.
    private static func findRows(_ s: String) -> [String] {
        var out: [String] = []
        var pos = s.startIndex
        while let r = s.range(of: "<w:tr", options: .literal, range: pos..<s.endIndex) {
            guard r.upperBound < s.endIndex, s[r.upperBound] == " " || s[r.upperBound] == ">" else { pos = r.upperBound; continue }
            guard let end = s.range(of: "</w:tr>", options: .literal, range: s.index(after: r.upperBound)..<s.endIndex) else { break }
            out.append(String(s[r.lowerBound..<end.upperBound]))
            pos = end.upperBound
        }
        return out
    }

    private static func findCells(_ s: String) -> [String] {
        var out: [String] = []
        var pos = s.startIndex
        while let r = s.range(of: "<w:tc>", options: .literal, range: pos..<s.endIndex),
              let end = s.range(of: "</w:tc>", options: .literal, range: r.upperBound..<s.endIndex) {
            out.append(String(s[r.lowerBound..<end.upperBound]))
            pos = end.upperBound
        }
        return out
    }

    private static func fillTable(_ xml: String, _ ind: DocxIndicaciones, _ servicio: String) throws -> String {
        let name = "template_indicaciones.docx"
        guard let start = xml.range(of: "<w:tbl>", options: .literal),
              let end = xml.range(of: "</w:tbl>", options: .literal, range: start.lowerBound..<xml.endIndex)
        else { throw DocxError.template("\(name): tabla principal no encontrada") }
        let rows = findRows(String(xml[start.lowerBound..<end.upperBound]))
        guard rows.count >= 2 else { throw DocxError.template("\(name): se esperaban al menos 2 filas") }
        let r0 = findCells(rows[0]), r1 = findCells(rows[1])
        guard r0.count >= 2, r1.count >= 2 else { throw DocxError.template("\(name): celdas incompletas") }

        var out = xml
        out = JS.replaceFirst(out, r0[0], cellR0c0(JS.replaceAll(ind.fecha, "/", "-"), ind.hora))
        out = JS.replaceFirst(out, r0[1], cellR0c1(servicio))
        out = JS.replaceFirst(out, r1[0], cellR1c0(ind.medicos))
        out = JS.replaceFirst(out, r1[1], cellR1c1(ind, servicio))
        return out
    }

    private static func fillPatientFields(_ xml: String, _ p: DocxPatient, _ servicio: String) -> String {
        let slots: [(String, String)] = [
            (" SINTETICO DE PRUEBA UNO", " \(p.nombre.uppercased())"),
            ("8100022-5", p.registro), ("68", p.edad), ("F", p.sexo.uppercased()),
            ("TRAUMATOLOGIA", p.area.uppercased()), ("MEDICINA INTERNA", servicio),
            ("419", p.cuarto), (" 1", " \(p.cama)"),
        ]
        // Mark every anchor before writing any value: area "MEDICINA INTERNA" must not be
        // taken for the servicio anchor.
        var out = xml
        for (i, s) in slots.enumerated() { out = DocxShared.replaceT(out, s.0, "\u{E000}\(i)") }
        for (i, s) in slots.enumerated() { out = DocxShared.replaceT(out, "\u{E000}\(i)", s.1) }
        return out
    }
}
