import Foundation

/// Unit "Panels": labs-panel-defs.mjs, labs-panel-parse.mjs, labs-panel-overlay*.mjs, labs-reum-parse.mjs.
public enum PanelParsers {
    /// `LAB_EXTENDED_SECTION_KEYS` (built-in defs only, like Node).
    public static var LAB_EXTENDED_SECTION_KEYS: [String] { PanelDefs.LAB_EXTENDED_SECTION_KEYS }

    /// `labExtendedSectionAlt_()`.
    public static func labExtendedSectionAlt() -> String { PanelDefs.labExtendedSectionAlt() }

    /// `reumToSomeShape(texto, registroPorNombre)` (bulk paste).
    public static func reumToSomeShape(_ texto: String, _ registroPorNombre: ((String) -> String?)? = nil) -> String {
        ReumParse.reumToSomeShape(texto, registroPorNombre)
    }

    private static let bactStopSource =
        #"(?<!\n)\n\s*(?:QUIMICA\s+CLINICA|BIOMETRIA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|CITOQUIMICO|ELECTROLITOS|PFH|COAGULACION|URIANALISIS|EXAMEN\s+GENERAL\s+DE\s+ORINA|CUADERNILLO|MYCOBACTERIAS)\b"#
    private static let bactBlockRe = JSRegex(#"BACTERIOLOGIA\b[\s\S]*?(?="# + bactStopSource + #"|$)"#, "gi")
    private static let bactRe = JSRegex(#"BACTERIOLOGIA"#, "i")

    /// `stripBacteriologiaBlocks_`: drops BACTERIOLOGIA blocks (antibiogram "VANCOMICINA 2 S" is not a level).
    static func stripBacteriologiaBlocks(_ t: String) -> String {
        if !bactRe.test(t) { return t }
        return bactBlockRe.replace(t, with: "\n")
    }

    private static func panelGatesMatch(_ def: PanelDef, _ texto: String) -> Bool {
        if def.gates.isEmpty { return true }
        return def.gates.contains { $0.test(texto) }
    }

    static func parseNumericPanel(_ def: PanelDef, _ texto: String, _ priorRefs: [String: [Double]]?) -> String {
        if texto.isEmpty || !panelGatesMatch(def, texto) { return "" }
        var parts: [String] = []
        for f in def.fields {
            let val = LabExtract.fmtLabRanged(LabExtract.extraerConRangoPanel(f.labels, texto), f.key, priorRefs)
            if val != "---" { parts += [f.key, val] }
        }
        if parts.isEmpty { return "" }
        return def.sectionKey + "\t" + parts.joined(separator: " ")
    }

    private static let trailingZerosRe = JSRegex(#"0+$"#)
    private static let trailingDotRe = JSRegex(#"\.$"#)

    private static func formatQualSco(_ raw: String) -> String {
        guard let n = jsParseFloat(BaseJS.replaceFirst(raw, ",", ".")), n.isFinite else { return raw.jsTrim }
        return trailingDotRe.replace(trailingZerosRe.replace(jsToFixed(n, 3), with: ""), with: "")
    }

    private static func qualShort(_ qual: String) -> String {
        switch qual.uppercased() {
        case "NEGATIVO": return "neg"
        case "POSITIVO": return "pos*"
        case "INDETERMINADO": return "indet*"
        default: return ""
        }
    }

    private static let noiseHeaderRe = JSRegex(#"^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$"#, "i")
    private static let noiseScoRe = JSRegex(#"^S\/CO$"#, "i")
    private static let noiseRefRe = JSRegex(#"^(Positivo|Indeterminado|Negativo)\s*[<>=]"#, "i")

    private static func isQualFollowNoiseLine(_ t: String) -> Bool {
        if t.isEmpty || t == ":" { return true }
        return noiseHeaderRe.test(t) || noiseScoRe.test(t) || noiseRefRe.test(t)
    }

    private static let dupTitleRe = JSRegex(#"^(Anticuerpos|Ant[ií]geno|Antigeno)\b"#, "i")

    private static func qualDupTitleDecision(_ t: String, _ j: Int, _ i: Int, _ sco: String?, _ qual: String) -> String {
        if !dupTitleRe.test(t) || j <= i + 1 { return "none" }
        if sco == nil && qual.isEmpty { return "skip" }
        return "break"
    }

    private static let starRe = JSRegex(#"\*"#, "g")
    private static let scoNumRe = JSRegex(#"^(\d+\.\d+|\d+)$"#)
    private static let qualWordRe = JSRegex(#"^(NEGATIVO|POSITIVO|INDETERMINADO)$"#, "i")

    private static func readQualFromFollowLines(_ lineas: [String], _ i: Int) -> (sco: String?, qual: String)? {
        var sco: String? = nil
        var qual = ""
        var j = i + 1
        while j < min(i + 12, lineas.count) {
            defer { j += 1 }
            let t = starRe.replace(lineas[j], with: "").jsTrim
            if isQualFollowNoiseLine(t) { continue }
            let dup = qualDupTitleDecision(t, j, i, sco, qual)
            if dup == "skip" { continue }
            if dup == "break" { break }
            if sco == nil, let m = scoNumRe.firstMatch(t) {
                sco = m[1]
                continue
            }
            if let mQ = qualWordRe.firstMatch(t) {
                qual = (mQ[1] ?? "").uppercased()
                break
            }
        }
        return qual.isEmpty ? nil : (sco, qual)
    }

    private static let tabTailRe = JSRegex(#"\t.*$"#)

    private static func extractQualField(_ lineas: [String], _ patterns: [JSRegex]) -> (sco: String?, qual: String)? {
        for i in lineas.indices {
            let line = tabTailRe.replace(lineas[i], with: "").jsTrim
            if line.isEmpty || !patterns.contains(where: { $0.test(line) }) { continue }
            return readQualFromFollowLines(lineas, i)
        }
        return nil
    }

    static func parseQualPanel(_ def: PanelDef, _ texto: String) -> String {
        if texto.isEmpty || !panelGatesMatch(def, texto) { return "" }
        let lineas = texto.jsLines.map { $0.jsTrim }
        var parts: [String] = []
        for f in def.fields {
            guard let res = extractQualField(lineas, f.patterns ?? []), !res.qual.isEmpty else { continue }
            let q = qualShort(res.qual)
            if q.isEmpty { continue }
            var token = f.key + " " + q
            if let sco = res.sco { token += " (" + formatQualSco(sco) + ")" }
            parts.append(token)
        }
        if parts.isEmpty { return "" }
        return def.sectionKey + "\t" + parts.joined(separator: " ")
    }

    static func parsePanelDef(_ def: PanelDef, _ texto: String, _ priorRefs: [String: [Double]]?) -> String {
        def.mode == "qual" ? parseQualPanel(def, texto) : parseNumericPanel(def, texto, priorRefs)
    }

    private static func mergeSectionLines(_ lines: [String]) -> [String] {
        var bodies: [String: [String]] = [:], order: [String] = []
        for line in lines {
            let tab = BaseJS.indexOf(line, "\t")
            if tab < 0 { continue }
            let key = BaseJS.slice(line, 0, tab)
            let body = BaseJS.slice(line, tab + 1).jsTrim
            if body.isEmpty { continue }
            if bodies[key] == nil { bodies[key] = []; order.append(key) }
            bodies[key]!.append(body)
        }
        return order.map { $0 + "\t" + bodies[$0]!.joined(separator: " ") }
    }

    /// `parseExtendedLabPanels_(text, priorBySec)`: one row per panel found (repeated sections merged).
    public static func parseExtendedLabPanels(_ text: String, priorBySec: [String: [String: [Double]]] = [:]) -> [String] {
        parseExtendedLabPanels(text, priorBySec: priorBySec, defs: PanelOverlay.getEffectivePanelDefs())
    }

    /// Same, with explicit defs (tests pass overlay defs without touching the shared store).
    static func parseExtendedLabPanels(_ text: String, priorBySec: [String: [String: [Double]]], defs: [PanelDef]) -> [String] {
        if text.isEmpty { return [] }
        let texto = stripBacteriologiaBlocks(text)
        var out: [String] = []
        for def in defs {
            let line = parsePanelDef(def, texto, priorBySec[def.sectionKey])
            if !line.isEmpty { out.append(line) }
        }
        return mergeSectionLines(out + ReumParse.parseReumatologiaPanels(texto))
    }
}
