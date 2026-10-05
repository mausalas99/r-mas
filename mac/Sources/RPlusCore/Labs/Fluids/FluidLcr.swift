import Foundation

/// Port of labs-lcr-parse.mjs + labs-lcr-scan.mjs.
enum FluidLcr {
    private static let chemRe = JSRegex(#"CITOQUIMICO\s+DE\s+LCR[\s\S]*?(?=BACTERIOLOGIA|CUADERNILLO|$)"#, "i")
    private static let microRe = JSRegex(#"CITOQUIMICO\s+LIQ\.?\s+LCR[\s\S]*?(?=CUADERNILLO|$)"#, "i")

    static func collectLcrBlocks(_ t: String) -> [String] {
        var blocks: [String] = []
        if let m = chemRe.firstMatch(t) { blocks.append(m.whole) }
        if let m = microRe.firstMatch(t), !blocks.contains(m.whole) { blocks.append(m.whole) }
        return blocks
    }

    struct Fields {
        var pH = "", aspecto = "", leu = "", glu = "", prot = "", cl = "", gram = "", tinta = "", pmn = "", linf = ""
        var isEmpty: Bool {
            !(!aspecto.isEmpty || !leu.isEmpty || !glu.isEmpty || !prot.isEmpty || !cl.isEmpty || !gram.isEmpty
              || !tinta.isEmpty || !pH.isEmpty || !pmn.isEmpty || !linf.isEmpty)
        }
    }

    private static let labelRe = JSRegex(#"^(RECUENTO(?:\s+CELULAR)?|LEUCOCITOS(?:\s+POLIMORFONUCLEARES|\s*\/\s*MM3?)?|POLIMORFONUCLEARES|LINFOCITOS|%PMN|%LINFOCITOS|GLUCOSA|PROTEINAS|CLORURO|GRAM|TINTA(?:\s+CHINA)?|ERITROCITOS|COAGLUTIN(?:ACION)?|PH\b|ASPECTO|OTROS|LCR|ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|COMENTARIOS?)$"#, "i")
    private static let numStartRe = JSRegex(#"^(\d+(?:[.,]\d+)?)"#)
    private static let headerRe = JSRegex(#"ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA"#, "i")
    private static let numOnlyRe = JSRegex(#"^\d+(?:[.,]\d+)?$"#)
    private static let dashesRe = JSRegex(#"^---+$"#)
    private static let leuNumRe = JSRegex(#"^(\d+(?:[.,]\d+)?)\s*$"#)
    private static let protLetterRe = JSRegex(#"PROTEINAS\s*([A-Z])\s*$"#, "i")
    private static let starGRe = JSRegex(#"\*"#, "g")

    private static func scanNumericAfter(_ c: [String], _ i: Int, _ maxLook: Int) -> String {
        var j = i + 1
        while j < min(i + maxLook, c.count) {
            let raw = c[j]
            j += 1
            if raw.isEmpty { continue }
            if labelRe.test(raw) { break }
            if let m = numStartRe.firstMatch(raw) { return BaseJS.replaceFirst(m[1] ?? "", ",", ".") }
        }
        return ""
    }

    private static func scanTextAfter(_ c: [String], _ i: Int, _ maxLook: Int) -> String {
        var j = i + 1
        while j < min(i + maxLook, c.count) {
            let txt = c[j]
            j += 1
            if txt.isEmpty { continue }
            if headerRe.test(txt) { continue }
            if labelRe.test(txt) { break }
            if numOnlyRe.test(txt) { break }
            if dashesRe.test(txt) { return "" }
            return txt.uppercased()
        }
        return ""
    }

    private static func scanLeucocitos(_ c: [String], _ i: Int) -> String {
        var j = i + 1
        while j < min(i + 6, c.count) {
            let raw = c[j]
            j += 1
            if raw.isEmpty { continue }
            if labelRe.test(raw) { break }
            if dashesRe.test(raw) { return "0" }
            if let m = leuNumRe.firstMatch(raw) { return BaseJS.replaceFirst(m[1] ?? "", ",", ".") }
        }
        return ""
    }

    private static func scanLine(_ f: inout Fields, _ c: [String], _ i: Int, _ linUp: String, _ lin: String) {
        if linUp.hasPrefix("PH") { f.pH = scanNumericAfter(c, i, 4) }
        if linUp.hasPrefix("ASPECTO") { f.aspecto = scanTextAfter(c, i, 4) }
        let esLeuTotal = linUp.hasPrefix("LEUCOCITOS") && !linUp.contains("POLIMORFONUCLEARES")
        if linUp.hasPrefix("RECUENTO CELULAR") || esLeuTotal {
            let v = scanLeucocitos(c, i)
            if !v.isEmpty { f.leu = v }
        }
        if linUp.hasPrefix("GLUCOSA") { f.glu = scanNumericAfter(c, i, 4) }
        if linUp.hasPrefix("PROTEINAS") {
            let letra = protLetterRe.firstMatch(lin)?[1]?.uppercased() ?? ""
            let val = scanNumericAfter(c, i, 4)
            f.prot = val.isEmpty ? "" : val + letra
        }
        if linUp.hasPrefix("CLORURO") { f.cl = scanNumericAfter(c, i, 4) }
        if linUp.hasPrefix("GRAM") { f.gram = scanTextAfter(c, i, 4) }
        if linUp.hasPrefix("TINTA CHINA") { f.tinta = scanTextAfter(c, i, 4) }
        if linUp.hasPrefix("POLIMORFONUCLEARES") || linUp.hasPrefix("LEUCOCITOS POLIMORFONUCLEARES") {
            let v = scanNumericAfter(c, i, 4)
            if !v.isEmpty { f.pmn = v }
        }
        if linUp.hasPrefix("LINFOCITOS") {
            let v = scanNumericAfter(c, i, 4)
            if !v.isEmpty { f.linf = v }
        }
    }

    static func isInvalidLcrTextField(_ val: String) -> Bool {
        if val.isEmpty { return true }
        let s = val.uppercased().jsTrim
        if dashesRe.test(s) { return true }
        return labelRe.test(s)
    }

    private static func parseFieldsFromBlock(_ bloque: String) -> Fields {
        let lineas = bloque.jsLines.map { $0.jsTrim }.filter { !$0.isEmpty }
        let clean = lineas.map { starGRe.replace($0, with: "").jsTrim }
        var f = Fields()
        for i in 0..<lineas.count { scanLine(&f, clean, i, lineas[i].uppercased(), lineas[i]) }
        return f
    }

    static func mergeLcrFields(_ blocks: [String]) -> Fields {
        func scalar(_ a: String, _ n: String) -> String { n.isEmpty ? a : (a.isEmpty ? n : a) }
        func text(_ a: String, _ n: String) -> String { n.isEmpty ? a : (isInvalidLcrTextField(a) ? n : a) }
        var m = Fields()
        for b in blocks {
            let n = parseFieldsFromBlock(b)
            m.pH = scalar(m.pH, n.pH)
            m.aspecto = text(m.aspecto, n.aspecto)
            m.leu = scalar(m.leu, n.leu)
            m.glu = scalar(m.glu, n.glu)
            m.prot = scalar(m.prot, n.prot)
            m.cl = scalar(m.cl, n.cl)
            m.gram = text(m.gram, n.gram)
            m.tinta = text(m.tinta, n.tinta)
            m.pmn = scalar(m.pmn, n.pmn)
            m.linf = scalar(m.linf, n.linf)
        }
        return m
    }

    static func buildLcrLine(_ f: Fields) -> String {
        var p: [String] = []
        if !f.pH.isEmpty { p += ["pH", f.pH] }
        if !f.aspecto.isEmpty { p += ["Asp", f.aspecto] }
        if !f.leu.isEmpty { p += ["Leu", f.leu] }
        if !f.pmn.isEmpty { p += ["PMN", f.pmn + "%"] }
        if !f.linf.isEmpty { p += ["Linf", f.linf + "%"] }
        if !f.glu.isEmpty { p += ["Glu", f.glu] }
        if !f.prot.isEmpty { p += ["Prot", f.prot] }
        if !f.cl.isEmpty { p += ["Cl", f.cl] }
        if !f.gram.isEmpty { p += ["Gram", f.gram] }
        if !f.tinta.isEmpty { p += ["Tinta", f.tinta] }
        return "LCR:\t" + p.joined(separator: " ")
    }

    struct Parsed {
        var line: String
        var pH: Double?, leu: Double?, glu: Double?, protMgdl: Double?
        var gram: String, tinta: String
    }

    static func parseLcrParsed(_ textoBruto: String) -> Parsed? {
        let blocks = collectLcrBlocks(textoBruto)
        if blocks.isEmpty { return nil }
        let f = mergeLcrFields(blocks)
        if f.isEmpty { return nil }
        return Parsed(line: buildLcrLine(f), pH: LabExtract.toNum(f.pH),
                      leu: f.leu.isEmpty ? nil : FluidCito.parseFluidLeu(f.leu),
                      glu: LabExtract.toNum(f.glu), protMgdl: FluidCito.parseLcrProteinMgdl(f.prot),
                      gram: f.gram, tinta: f.tinta)
    }

    static func parsearLCR(_ textoBruto: String) -> String { parseLcrParsed(textoBruto)?.line ?? "" }
}
