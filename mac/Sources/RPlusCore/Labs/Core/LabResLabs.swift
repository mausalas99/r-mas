import Foundation

/// Port of labs-section-order.mjs and labs-reslabs-sanitize.mjs.
enum LabResLabs {
    private static let headRank: [String: Int] = ["BH": 0, "QS": 1, "ESC": 2, "PFHS": 3, "GASES": 4]
    private static let tailRank: [String: Int] = ["DEPCR": 0, "EU": 1, "CUANTORINA": 2, "EGO": 3]
    private static let otrosRank = 5, tailBase = 6
    private static let nlRe = JSRegex(#"\r?\n"#)
    private static let keyRe = JSRegex(#"^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)"#)

    /// `labSectionOrderKey(row)`.
    static func labSectionOrderKey(_ row: String) -> String {
        let s = row.jsTrim
        if s.isEmpty { return "" }
        var first = nlRe.split(s).first ?? ""
        let tab = BaseJS.indexOf(first, "\t")
        if tab >= 0 { first = BaseJS.substring(first, 0, tab) }
        let colon = BaseJS.indexOf(first, ":")
        if colon > 0 { first = BaseJS.substring(first, 0, colon) }
        return keyRe.firstMatch(first).map { ($0[1] ?? "").uppercased() } ?? ""
    }

    private static func sectionRank(_ key: String) -> Int {
        if key.isEmpty { return otrosRank }
        if let r = headRank[key] { return r }
        if let r = tailRank[key] { return tailBase + r }
        return otrosRank
    }

    /// `sortResLabsByClinicalOrder(rows)`: stable BH → QS → ESC → PFHs → GASES → others → DEPCR, EU, CUANTORINA, EGO.
    static func sortResLabsByClinicalOrder(_ rows: [String]) -> [String] {
        rows.enumerated()
            .map { (row: $0.element, idx: $0.offset, rank: sectionRank(labSectionOrderKey($0.element))) }
            .sorted { $0.rank != $1.rank ? $0.rank < $1.rank : $0.idx < $1.idx }
            .map(\.row)
    }

    private static let leadRe = JSRegex(#"^(BH|QS|ESC|PFHs?|GASES|COAG|ORINA|EGO|EU|DEPCR|CUANTORINA|PROT12H|PROT24H|PltCit|LIPASA|CULTIVO|LCR|TROP|GS|SEROL|FROTIS|HECES|PIE|INTERPRETACI[OÓ]N|LIQ|ASCITIS|TIR|ENDO|CARD|FE|FEB|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO|ANA|ENA|APL|TB)\b"#, "i")
    private static let cultivoStartRe = JSRegex(#"^(?:(?:CULTIVO|BACTERIOLOGIA|UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO|COPROCULTIVO|TINCION\s+DE\s+GRAM|CATETER|ATB|Cultivos|BACILOSCOPIA)\b|Cuenta:)"#, "i")
    private static let micoRe = JSRegex(#"^CULTIVO\s+DE\s+MICOBACTERIAS\b"#, "i")
    private static let parsedHeaderRe = JSRegex(#"^(SECRECION|LIQUIDO|ASPIRADO|ABSCESO|BRONCOALVEOLAR)\b"#, "i")
    private static let parsedDatedRe = JSRegex(#"^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ()\s/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S"#, "i")
    private static let bulletRe = JSRegex(#"^[••·]\s*"#)

    private static func firstLine(_ text: String) -> String { nlRe.split(text.jsTrim).first ?? "" }

    private static func isCultivoStartLineLocal(_ first: String) -> Bool {
        let t = first.jsTrim
        if t.isEmpty { return false }
        return cultivoStartRe.test(t) || micoRe.test(t) || parsedHeaderRe.test(t) || parsedDatedRe.test(t) || bulletRe.test(t)
    }

    private static let userRe = JSRegex(#"^USER\b"#, "i")
    private static let laboRe = JSRegex(#"\bLabo\s*-?\d+"#, "i")
    private static let laboTailRe = JSRegex(#"\b(Campo|Feme)\b|\bLabo\s*-?\d+\*?\s+[A-Z]{2,6}\s+\d+"#, "i")
    private static let chromeRe = JSRegex(#"Sistema\s+SOME|\bUNIVERSIDAD\b|FACULTAD\s+DE\s+MEDICINA|\b[A-Z]{2,5}-[A-Z]{2,4}-\d{2,4}-\d{2}-[A-Z]{2}-\d{2,4}\b|REPORTE\s+DE\s+RESULTADOS"#, "i")
    private static let demoRe = JSRegex(#"^(Expediente|Solicitud|Nombre|Sexo|Ubicaci[oó]n|Edad|Medico)\s*:"#, "i")

    /// `isSomeReportChromeLine(line)`.
    static func isSomeReportChromeLine(_ line: String) -> Bool {
        let t = line.jsTrim
        if t.isEmpty { return false }
        if userRe.test(t) { return true }
        if laboRe.test(t) && laboTailRe.test(t) { return true }
        return chromeRe.test(t) || demoRe.test(t)
    }

    static func looksLikeLabSectionChunk(_ text: String) -> Bool {
        let first = firstLine(text)
        return !first.isEmpty && leadRe.test(first)
    }

    private static let trailChromeRe = JSRegex(#"\s*(?:Sistema\s+SOME|\bUNIVERSIDAD\b|FACULTAD\s+DE\s+MEDICINA|\b[A-Z]{2,5}-[A-Z]{2,4}-\d{2,4}-\d{2}-[A-Z]{2}-\d{2,4}\b|REPORTE\s+DE\s+RESULTADOS)[\s\S]*$"#, "i")
    private static let trailExpRe = JSRegex(#"\s*(?:Expediente|Solicitud)\s*:[\s\S]*$"#, "i")
    private static let trailUserRe = JSRegex(#"\s*^USER\b[\s\S]*$"#, "im")

    static func stripTrailingSomeReportChrome(_ text: String) -> String {
        if text.isEmpty { return "" }
        return trailUserRe.replace(trailExpRe.replace(trailChromeRe.replace(text, with: ""), with: ""), with: "").jsTrim
    }

    static func stripChromeLinesFromChunk(_ text: String) -> String {
        if text.jsTrim.isEmpty { return "" }
        return nlRe.split(text).filter { !isSomeReportChromeLine($0) }.joined(separator: "\n").jsTrim
    }

    /// `sanitizeResLabsChunks(rows)`: keep only clinical panel / cultivo chunks.
    static func sanitizeResLabsChunks(_ rows: [String]) -> [String] {
        var out: [String] = []
        for s in rows {
            if s.jsTrim.isEmpty { continue }
            let first = firstLine(s)
            if isSomeReportChromeLine(first) { continue }
            if looksLikeLabSectionChunk(s) {
                let c = stripChromeLinesFromChunk(stripTrailingSomeReportChrome(s))
                if !c.isEmpty && looksLikeLabSectionChunk(c) { out.append(c) }
                continue
            }
            if isCultivoStartLineLocal(first) {
                let c = stripChromeLinesFromChunk(stripTrailingSomeReportChrome(s))
                if !c.isEmpty && isCultivoStartLineLocal(firstLine(c)) { out.append(c) }
            }
        }
        return out
    }
}
