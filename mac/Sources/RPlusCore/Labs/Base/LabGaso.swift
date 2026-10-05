import Foundation

/// A result row for dedupe: a plain line, or an object row (BH `{ visible, extras }`).
/// `labRowText` = Node `labRowText_(row)`; `labRowString` = Node `String(row)` ("[object Object]" for objects).
protocol LabResultRow {
    var labRowText: String { get }
    var labRowString: String { get }
}

extension String: LabResultRow {
    var labRowText: String { self }
    var labRowString: String { self }
}

/// Port of labs-gaso-section.mjs and labs-gaso-interpret.mjs (no `parsearLCR`: LCR unit owns it).
public enum LabGaso {
    // MARK: parseGaso_

    private static let crRe = JSRegex(#"\r"#, "g")
    private static let wsRe = JSRegex(#"\s+"#, "g")

    private static func gasoBlockForExtract(_ bloque: String) -> String {
        wsRe.replace(crRe.replace(bloque, with: ""), with: " ")
    }

    private static func extractGasoPh(_ bloqueX: String) -> LabValorRango {
        let ph = LabExtract.extraerConRango(["PH "], bloqueX)
        return ph.valor == "---" ? LabExtract.extraerConRango(["PH"], bloqueX) : ph
    }

    private static func fmtGasoRanged(_ data: LabValorRango, _ fieldKey: String, _ gasRefs: [String: [Double]]?) -> String {
        LabExtract.fmtLabRanged(data, fieldKey, gasRefs, LabRefs.DEFAULT_GASO_REFS)
    }

    /// `parseGaso_(bloqueGaso, textoFuera, gasRefs)`: «GASES\t…» line, "" when there is no pH (Node returns '').
    public static func parseGaso(bloque: String, textoQS: String, gasRefs: [String: [Double]]?) -> String? {
        if bloque.isEmpty { return "" }
        let x = gasoBlockForExtract(bloque)
        let ph = extractGasoPh(x)
        if ph.valor == "---" { return "" }
        let fuera: String? = textoQS.isEmpty ? nil : textoQS
        let ex = LabExtract.extraerConRango
        let hco3 = ex(["HCO3"], x)
        let naAG = fuera.map { LabExtract.extraerConRangoSuero(["SODIO"], $0).valor } ?? "---"
        let clAG = fuera.map { LabExtract.extraerConRangoSuero(["CLORO"], $0).valor } ?? "---"
        let albAG = fuera.map { LabExtract.extraerConRangoSuero(["ALBUMINA"], $0).valor } ?? "---"
        let urine = LabAnionGap.extractUrineElectrolytes(fuera)
        let iCa = ex(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], x)
        let agEff = LabAnionGap.resolveEffectiveAnionGapValue(naAG, clAG, hco3.valor, albAG)
        let pairs: [(String, String)] = [
            ("pH", fmtGasoRanged(ph, "pH", gasRefs)),
            ("pCO2", fmtGasoRanged(ex(["PCO2"], x), "pCO2", gasRefs)),
            ("pO2", fmtGasoRanged(ex(["PO2 "], x), "pO2", gasRefs)),
            ("Na", fmtGasoRanged(ex(["SODIO"], x), "Na", gasRefs)),
            ("K", fmtGasoRanged(ex(["POTASIO"], x), "K", gasRefs)),
            ("GLU", fmtGasoRanged(ex(["GLUCOSA"], x), "GLU", gasRefs)),
            ("Lactato", fmtGasoRanged(ex(["LACTATO"], x), "Lactato", gasRefs)),
            ("Bica", fmtGasoRanged(hco3, "Bica", gasRefs)),
            ("AG", LabAnionGap.computeAnionGap(naAG, clAG, hco3.valor)),
            ("cAG", LabAnionGap.computeAlbuminCorrectedAnionGap(naAG, clAG, hco3.valor, albAG)),
            ("UAG", LabAnionGap.computeUrinaryAnionGap(urine.na, urine.k, urine.cl)),
            ("Delta-Delta", computeDeltaDelta(agEff, hco3.valor)),
            ("Hto", fmtGasoRanged(ex(["HCT ", "HEMATOCRITO"], x), "Hto", gasRefs)),
            ("iCa", fmtGasoRanged(iCa, "iCa", gasRefs)),
        ]
        return "GASES\t" + pairs.filter { $0.1 != "---" }.map { $0.0 + " " + $0.1 }.joined(separator: " ")
    }

    // MARK: interpretation

    /// Product policy in Node: auto gasometry interpretation line is disabled.
    static let GASO_AUTO_INTERPRETATION_ENABLED = false

    /// `buildGasoInterpretacion_(bloqueGaso, textoFuera)`.
    static func buildGasoInterpretacion(_ bloque: String?, _ textoFuera: String?) -> String {
        if !GASO_AUTO_INTERPRETATION_ENABLED { return "" }
        guard let bloque, !bloque.isEmpty else { return "" }
        let x = gasoBlockForExtract(bloque)
        let ph = extractGasoPh(x)
        if ph.valor == "---" { return "" }
        let pco2 = LabExtract.extraerConRango(["PCO2"], x)
        let hco3 = LabExtract.extraerConRango(["HCO3"], x)
        let fuera = (textoFuera ?? "").isEmpty ? nil : textoFuera
        let naAG = fuera.map { LabExtract.extraerConRangoSuero(["SODIO"], $0).valor } ?? "---"
        let clAG = fuera.map { LabExtract.extraerConRangoSuero(["CLORO"], $0).valor } ?? "---"
        let albAG = fuera.map { LabExtract.extraerConRangoSuero(["ALBUMINA"], $0).valor } ?? "---"
        let ag = LabAnionGap.resolveEffectiveAnionGapValue(naAG, clAG, hco3.valor, albAG)
        let dd = computeDeltaDeltaValue(ag, hco3.valor)
        let pH = LabExtract.toNum(ph.valor), pCO2 = LabExtract.toNum(pco2.valor), h = LabExtract.toNum(hco3.valor)
        guard let pH, pCO2 != nil || h != nil else { return "" }
        return buildGasoInterpretacionFromValues(pH, pCO2, h, ag, dd)
    }

    private static let respRe = JSRegex(#"respiratoria"#, "i")
    private static let metaRe = JSRegex(#"metabólica"#, "i")
    private static let acidMetaStartRe = JSRegex(#"^Acidosis metabólica"#, "i")
    private static let alcMetaStartRe = JSRegex(#"^Alcalosis metabólica"#, "i")

    /// `buildGasoInterpretacionFromValues_(pH, pCO2, hco3, ag, dd)` (labs-gaso-interpret.mjs).
    static func buildGasoInterpretacionFromValues(_ pH: Double?, _ pCO2: Double?, _ hco3: Double?, _ ag: Double?, _ dd: Double?) -> String {
        let metaLow = hco3 != nil && hco3! < 22, metaHigh = hco3 != nil && hco3! > 26
        let respLow = pCO2 != nil && pCO2! < 35, respHigh = pCO2 != nil && pCO2! > 45

        var primaria = ""
        if let pH, pCO2 != nil || hco3 != nil {
            if pH < 7.35 { primaria = metaLow ? "Acidosis metabólica" : respHigh ? "Acidosis respiratoria" : "" }
            else if pH > 7.45 { primaria = metaHigh ? "Alcalosis metabólica" : respLow ? "Alcalosis respiratoria" : "" }
            else if hco3 != nil && pCO2 != nil {
                if metaLow && respLow { primaria = "Acidosis metabólica con compensación respiratoria" }
                else if metaHigh && respHigh { primaria = "Alcalosis metabólica con compensación respiratoria" }
                else if metaLow { primaria = "Acidosis metabólica con compensación respiratoria" }
                else if metaHigh { primaria = "Alcalosis metabólica con compensación respiratoria" }
            }
        }
        if primaria.isEmpty, let pH, pH >= 7.35, pH <= 7.45 {
            primaria = metaLow ? "Acidosis metabólica" : metaHigh ? "Alcalosis metabólica" : ""
        }

        var partes = [primaria.isEmpty ? "Trastorno ácido-base compensado" : primaria]
        // appendGasoConcomitantes_
        if metaLow && respLow && respRe.test(primaria) { partes.append("Acidosis metabólica concomitante (HCO3 bajo)") }
        if metaHigh && respHigh && respRe.test(primaria) { partes.append("Alcalosis metabólica concomitante (HCO3 alto)") }
        if metaLow && respHigh && metaRe.test(primaria) { partes.append("Acidosis respiratoria concomitante (PCO2 alto)") }
        else if metaHigh && respLow && metaRe.test(primaria) { partes.append("Alcalosis respiratoria concomitante (PCO2 bajo)") }
        // appendGasoAgParts_
        if let ag, ag > 12, let dd {
            if dd < 0.8 {
                partes.append(acidMetaStartRe.test(primaria)
                    ? "Componente hiperclorémico con anion gap elevado (Delta-Delta bajo)"
                    : "Acidosis metabólica hiperclorémica con anion gap elevado (Delta-Delta bajo)")
            } else if dd > 2 {
                partes.append(alcMetaStartRe.test(primaria)
                    ? "Componente agregado con anion gap elevado (Delta-Delta alto), considerar acidosis respiratoria crónica"
                    : "Alcalosis metabólica agregada o acidosis respiratoria crónica con anion gap elevado (Delta-Delta alto)")
            } else {
                partes.append("Anion gap elevado")
            }
        }
        return ("Interpretación gasometría:\t" + partes.joined(separator: "; ")).uppercased()
    }

    // MARK: section keys and dedupe

    private static let sectionWordRe = JSRegex(#"^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b"#)

    /// `labSectionKey_(line)`: «QS», «LCR:», … in upper case.
    static func labSectionKey(_ line: String?) -> String {
        let s = (line ?? "").jsTrim
        if s.isEmpty { return "" }
        let tab = BaseJS.indexOf(s, "\t")
        if tab >= 0 { return BaseJS.substring(s, 0, tab).jsTrim.uppercased() }
        let colon = BaseJS.indexOf(s, ":")
        if colon > 0 { return BaseJS.substring(s, 0, colon + 1).jsTrim.uppercased() }
        return sectionWordRe.firstMatch(s).map { ($0[1] ?? "").uppercased() } ?? s.uppercased()
    }

    private static let richTokenRe = JSRegex(#"\b(?:AG|AGC|UAG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b"#, "gi")
    private static let digitRe = JSRegex(#"\d"#, "g")

    /// `lineRichnessScore_(line)`: length + 8 per gas token + 1 per digit.
    static func lineRichnessScore(_ line: String?) -> Int {
        let s = normalizeLabLine(line)
        if s.isEmpty { return 0 }
        return BaseJS.len(s) + richTokenRe.allMatches(s).count * 8 + digitRe.allMatches(s).count
    }

    private static let interpGasoRe = JSRegex(#"^Interpretación gasometría:"#, "i")

    private static func normalizeLabLine(_ line: String?) -> String {
        var s = line ?? ""
        if interpGasoRe.test(s.jsTrim) { s = s.uppercased() }
        return wsRe.replace(s, with: " ").jsTrim
    }

    /// `frotisPartKey_(key, rowText)`: FROTIS dedupes per part (Cal / Plaq / PlaqObs).
    static func frotisPartKey(_ key: String, _ rowText: String) -> String {
        if key != "FROTIS" { return key }
        let parts = normalizeLabLine(rowText).components(separatedBy: " ")
        return key + ":" + (parts.count > 1 ? parts[1] : "")
    }

    private static let singletonSections: Set<String> = [
        "BH", "QS", "ESC", "PFHS", "LIPASA", "TROP", "GASES", "PIE", "LCR:", "LIQ:",
        "HECES", "FROTIS", "EGO", "EU", "SEROL", "GS", "PROT12H", "PROT24H", "INTERPRETACIÓN GASOMETRÍA:",
        "INTERPRETACIÓN ASCITIS:", "INTERPRETACIÓN CITOQUÍMICO:",
        "TIR", "ENDO", "CARD", "FE", "INFL", "INM", "META", "NEF", "NIVEL", "TM", "NUT",
        "GI", "TOX", "HEPB", "VIRAL", "FEB", "MICRO", "ANA", "ENA", "APL", "TB",
    ]

    /// `dedupeSingletonSections_(rows)`: one row per singleton section (richest; ties -> last).
    static func dedupeSingletonSections<Row: LabResultRow>(_ rows: [Row]) -> [Row] {
        let list = rows.filter { !normalizeLabLine($0.labRowText).isEmpty }
        var best: [String: (idx: Int, score: Int)] = [:]
        for (i, raw) in list.enumerated() {
            let text = raw.labRowText
            let sec = labSectionKey(text)
            if !singletonSections.contains(sec) { continue }
            let key = frotisPartKey(sec, text)
            let score = lineRichnessScore(text)
            if let prev = best[key], !(score > prev.score || (score == prev.score && i > prev.idx)) { continue }
            best[key] = (i, score)
        }
        let chosen = Set(best.values.map { $0.idx })
        return list.enumerated().filter { j, row in
            !singletonSections.contains(labSectionKey(row.labRowText)) || chosen.contains(j)
        }.map { $0.1 }
    }

    private static func valueFromSectionLine(_ line: String, _ key: String) -> String? {
        let s = normalizeLabLine(line)
        if s.isEmpty { return nil }
        let re = JSRegex(#"(?:^|\s)"# + BaseJS.escapeRegex(key) + #"\s+(-?\d+(?:\.\d+)?)(\*)?"#, "i")
        guard let m = re.firstMatch(s) else { return nil }
        return (m[1] ?? "") + (m[2] ?? "")
    }

    private static let trailingStarRe = JSRegex(#"\*$"#)

    private static func markGasoToken(_ valStr: String, _ gasRefs: [String: [Double]]?, _ fieldKey: String) -> String {
        if valStr.isEmpty { return valStr }
        let bare = trailingStarRe.replace(valStr, with: "")
        if let range = LabRefs.resolveLabFieldRange(LabValorRango(valor: bare), fieldKey, gasRefs, LabRefs.DEFAULT_GASO_REFS) {
            return LabExtract.fmt(LabExtract.marcarSegunRango(bare, range.min, range.max))
        }
        return LabExtract.fmt(valStr.hasSuffix("*") ? bare + "*" : bare)
    }

    private static func pickBestSectionLine<Row: LabResultRow>(_ rows: [Row], _ sectionName: String) -> String {
        let sec = sectionName.uppercased()
        var best: (row: String, idx: Int, score: Int)? = nil
        for (idx, row) in rows.enumerated() where labSectionKey(row.labRowString) == sec {
            let r = row.labRowString, score = lineRichnessScore(r)
            if best == nil || score > best!.score || (score == best!.score && idx > best!.idx) { best = (r, idx, score) }
        }
        return best?.row ?? ""
    }

    private static func formatNumericToken(_ n: Double?) -> String {
        guard let n, n.isFinite else { return "" }
        return LabAnionGap.formatTenths(n)
    }

    private static func appendAnionGapDerivedTokens(_ out: inout [String], _ base: String, _ na: String?, _ cl: String?, _ bica: String?, _ alb: String?) {
        func or(_ s: String?) -> String { (s ?? "").isEmpty ? "---" : s! }
        let agRaw = LabAnionGap.computeAnionGapValue(or(na), or(cl), or(bica))
        if let agRaw { out += ["AG", LabExtract.marcarSegunRango(formatNumericToken(agRaw), 8, 12)] }
        let agc = LabAnionGap.computeAlbuminCorrectedAnionGapValue(or(na), or(cl), or(bica), or(alb))
        if let agc { out += ["cAG", LabExtract.marcarSegunRango(formatNumericToken(agc), 8, 12)] }
        if let uag = valueFromSectionLine(base, "UAG"), !uag.isEmpty {
            out += ["UAG", trailingStarRe.replace(uag, with: "")]
        }
        if let ddv = computeDeltaDeltaValue(agc ?? agRaw, or(bica)) { out += ["Delta-Delta", formatNumericToken(ddv)] }
    }

    /// `extractElectrolytesFromResLabs(rows)`: serum Na/Cl (QS, then ESC) and Alb (PFHS) from result rows.
    static func extractElectrolytesFromResLabs<Row: LabResultRow>(_ rows: [Row]) -> (na: String?, cl: String?, alb: String?) {
        let qs = pickBestSectionLine(rows, "QS"), esc = pickBestSectionLine(rows, "ESC"), pfhs = pickBestSectionLine(rows, "PFHS")
        return (valueFromSectionLine(qs, "Na") ?? valueFromSectionLine(esc, "Na"),
                valueFromSectionLine(qs, "Cl") ?? valueFromSectionLine(esc, "Cl"),
                valueFromSectionLine(pfhs, "Alb"))
    }

    private static func rebuildGasesFromResults<Row: LabResultRow>(_ rows: [Row], _ gasRefs: [String: [Double]]?, _ fb: (na: String?, cl: String?, alb: String?)?) -> String {
        let gases = pickBestSectionLine(rows, "GASES")
        if gases.isEmpty { return "" }
        let base = normalizeLabLine(gases)
        var out = ["GASES"]
        let orderedKeys = ["pH", "pCO2", "pO2", "Na", "K", "GLU", "Lactato", "Bica", "Hto", "iCa"]
        var values: [String: String] = [:]
        for k in orderedKeys { values[k] = valueFromSectionLine(base, k) }
        func or(_ a: String?, _ b: String?) -> String? { (a ?? "").isEmpty ? b : a }
        let own = extractElectrolytesFromResLabs(rows)
        let na = or(or(own.na, values["Na"]), fb?.na), cl = or(own.cl, fb?.cl), alb = or(own.alb, fb?.alb)
        for k in orderedKeys { if let v = values[k], !v.isEmpty { out += [k, markGasoToken(v, gasRefs, k)] } }
        appendAnionGapDerivedTokens(&out, base, na, cl, values["Bica"], alb)
        return out[0] + "\t" + out.dropFirst().joined(separator: " ")
    }

    /// `reprocessLabResultLines_(rows, { gasRefs, fallbackElectrolytes })`: dedupe and rebuild the GASES line
    /// from QS/ESC/PFHS rows. The rebuilt line is appended as a `String` row via `makeRow`.
    static func reprocessLabResultLines<Row: LabResultRow>(_ rows: [Row], gasRefs: [String: [Double]]? = nil,
                                                           fallbackElectrolytes: (na: String?, cl: String?, alb: String?)? = nil,
                                                           makeRow: (String) -> Row) -> [Row] {
        let clean = dedupeSingletonSections(rows)
        let gasesLine = rebuildGasesFromResults(clean, gasRefs, fallbackElectrolytes)
        var out = clean.filter {
            let k = labSectionKey($0.labRowString)
            return k != "GASES" && k != "INTERPRETACIÓN GASOMETRÍA:"
        }
        if !gasesLine.isEmpty { out.append(makeRow(gasesLine)) }
        return dedupeSingletonSections(out)
    }

    static func reprocessLabResultLines(_ rows: [String], gasRefs: [String: [Double]]? = nil,
                                        fallbackElectrolytes: (na: String?, cl: String?, alb: String?)? = nil) -> [String] {
        reprocessLabResultLines(rows, gasRefs: gasRefs, fallbackElectrolytes: fallbackElectrolytes) { $0 }
    }

    // MARK: delta-delta

    private static func computeDeltaDeltaValue(_ agValue: Double?, _ hco3Str: String?) -> Double? {
        guard let agValue, let hco3 = jsParseFloat(BaseJS.replaceFirst(hco3Str ?? "undefined", ",", ".")) else { return nil }
        let delta = 24 - hco3
        if delta <= 0 { return nil }
        return (agValue - 12) / delta
    }

    private static func computeDeltaDelta(_ agValue: Double?, _ hco3Str: String?) -> String {
        guard let dd = computeDeltaDeltaValue(agValue, hco3Str) else { return "---" }
        return LabAnionGap.formatTenths(dd, epsilon: false)
    }

    // MARK: PIE

    private static let pieInmunoRe = JSRegex(#"PRUEBA INMUNOLOGICA DE EMBARAZO"#, "i")
    private static let piePruebaRe = JSRegex(#"PRUEBA DE EMBARAZO"#, "i")
    private static let negPosRe = JSRegex(#"\b(NEGATIVO|POSITIVO)\b"#, "i")

    /// `parsePIE_(tNorm)`: «PIE\tNEGATIVO*» / «PIE\tPOSITIVO*», "" when absent (Node returns '').
    public static func parsePIE(tNorm: String) -> String? {
        let hasInmuno = pieInmunoRe.test(tNorm), hasPrueba = piePruebaRe.test(tNorm)
        if !hasInmuno && !hasPrueba { return "" }
        let up = tNorm.uppercased()
        if hasInmuno {
            let idx = BaseJS.indexOf(up, "PRUEBA INMUNOLOGICA DE EMBARAZO")
            let sub = BaseJS.substring(tNorm, idx, idx + 400)
            let subUp = sub.uppercased()
            var m: JSRegex.Match? = nil
            let suero = BaseJS.indexOf(subUp, "SUERO")
            if suero != -1 { m = negPosRe.firstMatch(BaseJS.substring(sub, suero, suero + 100)) }
            if m == nil {
                let orina = BaseJS.indexOf(subUp, "ORINA")
                if orina != -1 { m = negPosRe.firstMatch(BaseJS.substring(sub, orina, orina + 100)) }
            }
            guard let m else { return "" }
            return "PIE\t" + (m[1] ?? "").uppercased() + "*"
        }
        let idx = BaseJS.indexOf(up, "PRUEBA DE EMBARAZO")
        guard let m = negPosRe.firstMatch(BaseJS.substring(tNorm, idx, idx + 300)) else { return "" }
        return "PIE\t" + (m[1] ?? "").uppercased() + "*"
    }
}
