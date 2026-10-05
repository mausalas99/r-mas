import Foundation

/// Unit "Chem": labs-chemistry.mjs (+ calcium corrected via LabAnionGap.formatTenths), labs-egfr.mjs.
/// Troponin is in LabTroponin.swift. Every parse function returns "" when Node returns ''/null.
public enum LabChem {
    /// Copy of `QS_SOME_TREND_ORDER` (labs-bh.mjs; BH unit owns the original).
    static let qsSomeTrendOrder = [
        "Glu", "BUN", "Cr", "BUN/CR", "eTFG", "AU",
        "PCR", "PCT",
        "COL", "HDL", "LDL", "VLDL", "TGL", "IA", "CTHDL",
        "VSG", "CPK",
    ]
    static let escMergeFieldOrder = ["Na", "Cl", "K", "Ca", "F", "Mg"]
    static let pfhMergeFieldOrder = ["Alb", "AST", "ALT", "FA", "GGT", "Prot", "BT", "BD", "BI", "LDH", "Amil"]
    static let lipasaMergeFieldOrder = ["Lip"]

    private static let pairValueRe = JSRegex(#"^(-?\d+(?:[.,]\d+)?%?)\*?$|^---$"#)

    // MARK: procalcitonina

    private static let pctValRe = JSRegex(#"(-?\d+[.,]?\d*)"#)
    private static let pctAdultoRe = JSRegex(#"ADULTO[^0-9<]*<\s*=?\s*(\d+[.,]?\d*)"#, "i")

    /// `extraerProcalcitonina_(texto)`.
    static func extraerProcalcitonina(_ texto: String) -> LabValorRango {
        let defaultRange = LabValorRango(valor: "---", min: 0, max: 0.05)
        if texto.isEmpty { return defaultRange }
        let t = texto.uppercased()
        let name = "PROCALCITONINA", nameLen = BaseJS.len(name)
        var positions: [Int] = []
        var start = 0
        while true {
            let p = BaseJS.indexOf(t, name, start)
            if p == -1 { break }
            positions.append(p)
            start = p + nameLen
        }
        for p in positions.reversed() {
            let pos = p + nameLen
            let sub = BaseJS.substring(texto, pos, pos + 220)
            guard let mVal = pctValRe.firstMatch(sub) else { continue }
            let rangeM = pctAdultoRe.firstMatch(sub)
            let max = rangeM.flatMap { jsParseFloat(BaseJS.replaceFirst($0[1] ?? "", ",", ".")) } ?? 0.05
            return LabValorRango(valor: mVal[1] ?? "", min: 0, max: max)
        }
        return defaultRange
    }

    // MARK: QS

    private static func appendQsPair(_ p: inout [String], _ key: String, _ val: String) {
        if val != "---" { p.append(contentsOf: [key, val]) }
    }

    private static func appendBunCrRatioIfEligible(_ p: inout [String], _ bunVal: String, _ crVal: String) {
        guard let bunNum = LabExtract.toNum(bunVal), let crNum = LabExtract.toNum(crVal), crNum > 0 else { return }
        p.append(contentsOf: ["BUN/CR", jsToFixed(BaseJS.round((bunNum / crNum) * 10) / 10, 1)])
    }

    private static func appendEgfrIfEligible(_ p: inout [String], _ crData: LabValorRango, _ ctx: EgfrPatientCtx?) {
        guard let ctx else { return }
        let sexo = ctx.sexo
        guard let ageY = ageYearsFromLabDemographics(ctx.edad, ctx.edadUnidad), ageY >= 18, sexo == "M" || sexo == "F" else { return }
        guard let scrNum = LabExtract.toNum(crData.valor), scrNum > 0 else { return }
        if let egfr = computeEgfrCkdEpi2021Creatinine(scrNum, ageY, sexo == "F") {
            p.append(contentsOf: ["eTFG", jsString(BaseJS.round(egfr))])
        }
    }

    private static let depuracionCrRe = JSRegex(#"DEPURACION\s+DE\s+CREATININA"#, "i")

    /// `parseQS_(texto, patientCtx, priorRefs)`.
    public static func parseQS(_ text: String, demograf: EgfrPatientCtx?, prior: [String: [Double]]?) -> String {
        let s = { (names: [String], key: String) in LabExtract.fmtLabRanged(LabExtract.extraerConRangoSuero(names, text), key, prior) }
        let crData = depuracionCrRe.test(text)
            ? LabValorRango(valor: "---")
            : LabExtract.extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], text)
        let glu = s(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], "Glu")
        let cr = LabExtract.fmtLabRanged(crData, "Cr", prior)
        let bun = s(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], "BUN")
        let pcr = s(["PROTEINA C REACTIVA", "PROTEÍNA C REACTIVA"], "PCR")
        let pct = LabExtract.fmtLabRanged(extraerProcalcitonina(text), "PCT", prior)
        let au = s(["ACIDO URICO EN SANGRE", "ACIDO URICO", "ÁCIDO ÚRICO"], "AU")
        let col = s(["COLESTEROL"], "COL")
        let hdl = s(["COLESTEROL HDL", "HDL COLESTEROL"], "HDL")
        let ldl = s(["COLESTEROL LDL", "LDL COLESTEROL"], "LDL")
        let vldl = s(["VLDL"], "VLDL")
        let tgl = s(["TRIGLICERIDOS", "TRIGLICÉRIDOS"], "TGL")
        let ia = LabExtract.fmtLabRanged(LabExtract.extraerIndiceAterogenico(text), "IA", prior)
        let cthdl = s(["COCIENTE COL.TOT/HDL", "COCIENTE COL.TOT / HDL", "COCIENTE COL TOT/HDL"], "CTHDL")
        let vsg = s(["VSG ", "VELOCIDAD DE SEDIMENTACION"], "VSG")
        // No 'CK ' alone: it matches «SHOCK».
        let cpk = s(["CPK CREATIN FOSFO QUINASA", "CPK CREATINA FOSFOQUINASA", "CREATINA FOSFOQUINASA",
                     "CREATIN FOSFO QUINASA", "CREATINA KINASA", "CK TOTAL", "CPK TOTAL", "CPK "], "CPK")
        let vals = [glu, cr, bun, pcr, pct, au, col, hdl, ldl, vldl, tgl, ia, cthdl, vsg, cpk]
        if vals.allSatisfy({ $0 == "---" }) { return "" }

        var p: [String] = []
        appendQsPair(&p, "Glu", glu)
        if cr != "---" {
            p.append(contentsOf: ["Cr", cr])
            appendEgfrIfEligible(&p, crData, demograf)
        }
        appendQsPair(&p, "BUN", bun)
        if cr != "---" && bun != "---" { appendBunCrRatioIfEligible(&p, bun, cr) }
        for (k, v) in [("PCR", pcr), ("PCT", pct), ("AU", au), ("COL", col), ("HDL", hdl), ("LDL", ldl),
                       ("VLDL", vldl), ("TGL", tgl), ("IA", ia), ("CTHDL", cthdl), ("VSG", vsg), ("CPK", cpk)] {
            appendQsPair(&p, k, v)
        }
        return "QS\t" + p.joined(separator: " ")
    }

    // MARK: ESC / PFH / Lipasa

    /// `computeCorrectedCalcium_(caStr, albStr)`: cCa = Ca + 0.8 × (4 − Alb), «*» outside 8.5–10.5.
    static func computeCorrectedCalcium(_ caStr: String, _ albStr: String) -> String {
        func num(_ s: String) -> Double? {
            if s == "---" || s.isEmpty { return nil }
            return jsParseFloat(BaseJS.replaceFirst(s, ",", "."))
        }
        guard let ca = num(caStr), let alb = num(albStr) else { return "---" }
        let cac = ca + 0.8 * (4 - alb)
        if !cac.isFinite { return "---" }
        return LabExtract.marcarSegunRango(LabAnionGap.formatTenths(cac), 8.5, 10.5)
    }

    /// `parseESC_(texto, priorRefs)`.
    public static func parseESC(_ text: String, prior: [String: [Double]]?) -> String {
        let na = LabExtract.extraerConRangoSuero(["SODIO"], text)
        let cl = LabExtract.extraerConRangoSuero(["CLORO"], text)
        let k = LabExtract.extraerConRangoSuero(["POTASIO"], text)
        let ca = LabExtract.extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], text)
        let f = LabExtract.extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "FÓSFORO"], text)
        let mg = LabExtract.extraerConRangoSuero(["MAGNESIO"], text)
        let alb = LabExtract.extraerConRangoSuero(["ALBUMINA"], text)
        if [na, cl, k, ca, f, mg].allSatisfy({ $0.valor == "---" }) { return "" }
        let pairs: [(String, String)] = [
            ("Na", LabExtract.fmtLabRanged(na, "Na", prior)),
            ("Cl", LabExtract.fmtLabRanged(cl, "Cl", prior)),
            ("K", LabExtract.fmtLabRanged(k, "K", prior)),
            ("Ca", LabExtract.fmtLabRanged(ca, "Ca", prior)),
            ("cCa", computeCorrectedCalcium(ca.valor, alb.valor)),
            ("F", LabExtract.fmtLabRanged(f, "F", prior)),
            ("Mg", LabExtract.fmtLabRanged(mg, "Mg", prior)),
        ]
        return row("ESC", pairs)
    }

    private static func row(_ head: String, _ pairs: [(String, String)]) -> String {
        head + "\t" + pairs.filter { $0.1 != "---" }.flatMap { [$0.0, $0.1] }.joined(separator: " ")
    }

    /// `parsePFH_(tNorm, priorRefs)`.
    public static func parsePFH(_ text: String, prior: [String: [Double]]?) -> String {
        let r = { (d: LabValorRango, key: String) in (key, LabExtract.fmtLabRanged(d, key, prior)) }
        let pairs = [
            r(LabExtract.extraerConRangoSuero(["ALBUMINA"], text), "Alb"),
            r(LabExtract.extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], text), "AST"),
            r(LabExtract.extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], text), "ALT"),
            r(LabExtract.extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], text), "FA"),
            r(LabExtract.extraerConRango(["GGT", "GAMA GLUTAMIL TRANSFERASA", "GAMMA GLUTAMIL TRANSFERASA"], text), "GGT"),
            r(LabExtract.extraerConRangoSuero(["PROTEINAS TOTALES", "PROTEÍNAS TOTALES"], text), "Prot"),
            r(LabExtract.extraerConRango(["BILIRRUBINA TOTAL"], text), "BT"),
            r(LabExtract.extraerConRango(["BILIRRUBINA DIRECTA"], text), "BD"),
            r(LabExtract.extraerConRango(["BILIRRUBINA INDIRECTA"], text), "BI"),
            r(LabExtract.extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH DESHIDROGENASA LAC", "LDH "], text), "LDH"),
            r(LabExtract.extraerConRango(["AMILASA SERICA", "AMILASA"], text), "Amil"),
        ]
        if pairs.allSatisfy({ $0.1 == "---" }) { return "" }
        return row("PFHs", pairs)
    }

    /// `parseLipasa_(texto, priorRefs)`.
    public static func parseLipasa(_ text: String, prior: [String: [Double]]?) -> String {
        let lip = LabExtract.fmtLabRanged(LabExtract.extraerConRango(["LIPASA SERICA", "LIPASA"], text), "Lip", prior)
        return lip == "---" ? "" : "LIPASA\tLip " + lip
    }

    /// `parseTroponina_(textoBruto)`. `prior` is not used (Node takes no refs).
    public static func parseTroponina(_ text: String, prior: [String: [Double]]?) -> String {
        LabTroponin.parseTroponina(text)
    }

    // MARK: merge rows of the same panel

    private static let wsRe = JSRegex(#"\s+"#)
    private static let colonEndRe = JSRegex(#":$"#)
    private static let digitRe = JSRegex(#"\d"#)

    private static func pairTokenScore(_ s: String) -> Int {
        var score = BaseJS.len(s)
        if s.contains("*") { score += 5 }
        if digitRe.test(s) { score += 2 }
        return score
    }

    private static func ingestTabPairBody(_ body: String, _ into: inout [(key: String, val: String, score: Int)]) {
        let tokens = wsRe.split(body.jsTrim).filter { !$0.isEmpty }
        var i = 0
        while i < tokens.count {
            guard i + 1 < tokens.count, pairValueRe.test(tokens[i + 1]) else { i += 1; continue }
            let next = tokens[i + 1]
            let key = colonEndRe.replace(tokens[i], with: "")
            let score = pairTokenScore(next)
            if let j = into.firstIndex(where: { $0.key == key }) {
                if score > into[j].score { into[j] = (key, next, score) }
            } else {
                into.append((key, next, score))
            }
            i += 2
        }
    }

    private static let tabRe = JSRegex(#"\t"#)
    private static let anyWsRe = JSRegex(#"\s"#)
    private static let esCollator = Locale(identifier: "es")

    /// JS `a.localeCompare(b, 'es')` (ICU collation, Spanish).
    static func localeCompareEs(_ a: String, _ b: String) -> ComparisonResult {
        a.compare(b, options: [], range: nil, locale: esCollator)
    }

    /// `mergeTabPairResLabRows_(rows, sectionRe, preferredOrder)`: joins Label/value rows of one panel.
    /// `sectionRe` is the section anchor at the start, no `g` flag.
    public static func mergeTabPairResLabRows(_ rows: [String], sectionRe: JSRegex, preferredOrder: [String]) -> String {
        let list = rows.map { $0.jsTrim }.filter { !$0.isEmpty && sectionRe.test($0) }
        guard let first = list.first else { return "" }
        if list.count == 1 { return first }
        var header = tabRe.split(first).first.flatMap { $0.isEmpty ? nil : $0 }
            ?? anyWsRe.split(first).first ?? ""
        var byKey: [(key: String, val: String, score: Int)] = []
        for row in list {
            let tab = BaseJS.indexOf(row, "\t")
            let body = tab >= 0 ? BaseJS.slice(row, tab + 1) : sectionRe.replace(row, with: "").jsTrim
            if tab >= 0 {
                let h = BaseJS.slice(row, 0, tab).jsTrim
                if !h.isEmpty { header = h }
            }
            ingestTabPairBody(body, &byKey)
        }
        if byKey.isEmpty { return list[list.count - 1] }
        var rank: [String: Int] = [:]
        for (i, k) in preferredOrder.enumerated() { rank[k] = i }
        let sorted = byKey.enumerated().sorted { x, y in
            let ra = rank[x.element.key] ?? 9999, rb = rank[y.element.key] ?? 9999
            if ra != rb { return ra < rb }
            switch localeCompareEs(x.element.key, y.element.key) {
            case .orderedAscending: return true
            case .orderedDescending: return false
            case .orderedSame: return x.offset < y.offset
            }
        }
        return header + "\t" + sorted.flatMap { [$0.element.key, $0.element.val] }.joined(separator: " ")
    }

    private static let qsSectionRe = JSRegex(#"^QS\b"#, "i")
    private static let escSectionRe = JSRegex(#"^ESC\b"#, "i")
    private static let pfhSectionRe = JSRegex(#"^PFHS?\b"#, "i")
    private static let lipasaSectionRe = JSRegex(#"^LIPASA\b"#, "i")

    /// `mergeQsResLabRows_(rows)`.
    public static func mergeQsResLabRows(_ rows: [String]) -> String {
        mergeTabPairResLabRows(rows, sectionRe: qsSectionRe, preferredOrder: qsSomeTrendOrder)
    }
    /// `mergeEscResLabRows_(rows)`.
    public static func mergeEscResLabRows(_ rows: [String]) -> String {
        mergeTabPairResLabRows(rows, sectionRe: escSectionRe, preferredOrder: escMergeFieldOrder)
    }
    /// `mergePfhResLabRows_(rows)`.
    public static func mergePfhResLabRows(_ rows: [String]) -> String {
        mergeTabPairResLabRows(rows, sectionRe: pfhSectionRe, preferredOrder: pfhMergeFieldOrder)
    }
    /// `mergeLipasaResLabRows_(rows)`.
    public static func mergeLipasaResLabRows(_ rows: [String]) -> String {
        mergeTabPairResLabRows(rows, sectionRe: lipasaSectionRe, preferredOrder: lipasaMergeFieldOrder)
    }

    // MARK: eGFR (labs-egfr.mjs)

    /// `normalizePatientSexoForEgfr(sexo)`.
    static func normalizePatientSexoForEgfr(_ sexo: String?) -> String {
        let s = (sexo ?? "").jsTrim.uppercased()
        if ["F", "FEMENINO", "MUJER", "FEMALE"].contains(s) { return "F" }
        if ["M", "MASCULINO", "HOMBRE", "MALE"].contains(s) { return "M" }
        return ""
    }

    private static let edadRe = JSRegex(#"^(\d+)\s*(años|meses|días|dias|semanas)?"#, "i")

    /// JS `String(patient.edad == null ? '' : patient.edad)`.
    private static func jsStringOf(_ v: LabJSON?) -> String {
        switch v {
        case .string(let s): return s
        case .number(let d): return jsString(d)
        case .bool(let b): return b ? "true" : "false"
        default: return "" // ponytail: arrays/objects never come as edad
        }
    }

    /// `patientEdadPartsForEgfr(patient)`.
    static func patientEdadPartsForEgfr(_ patient: ProcesarLabsOptions.ChartPatient?) -> (edadRaw: String, edadUnidad: String) {
        guard let patient else { return ("", "años") }
        let raw = jsStringOf(patient.edad).jsTrim
        if raw.isEmpty { return ("", "años") }
        guard let m = edadRe.firstMatch(raw) else {
            let n = jsParseInt(raw, radix: 10)
            return (n.map { jsString(Double($0)) } ?? "", "años")
        }
        var unit = (m[2] ?? "años").lowercased()
        if unit == "dias" { unit = "días" }
        return (m[1] ?? "", unit)
    }

    /// `buildEgfrPatientCtx(hdrEdadRaw, hdrEdadUnidad, chartPatient)`.
    public static func buildEgfrPatientCtx(edadRaw: String, edadUnidad: String, chartPatient: ProcesarLabsOptions.ChartPatient?) -> EgfrPatientCtx? {
        guard let chartPatient else { return nil }
        let sexo = normalizePatientSexoForEgfr(chartPatient.sexo)
        if sexo.isEmpty { return nil }
        let parts = patientEdadPartsForEgfr(chartPatient)
        let edad = !parts.edadRaw.isEmpty ? parts.edadRaw : edadRaw
        let unidad = !parts.edadRaw.isEmpty ? parts.edadUnidad : (edadUnidad.isEmpty ? "años" : edadUnidad)
        return EgfrPatientCtx(edad: edad, edadUnidad: unidad, sexo: sexo)
    }

    /// `ageYearsFromLabDemographics(edadRaw, edadUnidad)`.
    static func ageYearsFromLabDemographics(_ edadRaw: String, _ edadUnidad: String) -> Double? {
        guard let n = jsParseInt(edadRaw.jsTrim, radix: 10), n >= 0 else { return nil }
        let u = (edadUnidad.isEmpty ? "años" : edadUnidad).lowercased()
        let d = Double(n)
        if u == "meses" { return d / 12 }
        if u == "días" || u == "dias" { return d / 365.25 }
        if u == "semanas" { return d / 52.143 }
        return d
    }

    /// `computeEgfrCkdEpi2021Creatinine(scr, ageYears, isFemale)`: CKD-EPI 2021, nil when not valid.
    static func computeEgfrCkdEpi2021Creatinine(_ scr: Double, _ age: Double, _ isFemale: Bool) -> Double? {
        if !scr.isFinite || scr <= 0 { return nil }
        if !age.isFinite || age < 18 || age > 120 { return nil }
        let k = isFemale ? 0.7 : 0.9
        let alpha = isFemale ? -0.241 : -0.302
        let scrK = scr / k
        let egfr = 142 * pow(Swift.min(scrK, 1), alpha) * pow(Swift.max(scrK, 1), -1.2)
            * pow(0.9938, age) * (isFemale ? 1.012 : 1)
        if !egfr.isFinite || egfr <= 0 { return nil }
        return egfr
    }
}
