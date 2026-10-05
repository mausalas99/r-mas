import Foundation

/// Port of labs-troponin.mjs (no HTML/trend helpers).
public enum LabTroponin {
    /// hs-cTnI upper limit (ng/L) when the report has no useful numeric range.
    public static let troponinaHsNormalMaxNgL: Double = 34

    public static let troponinaTestNames = [
        "TROPONINA I (ALTA SENSIBILIDAD)",
        "HS TNL O TROPONINA I",
        "HSTNL O TROPONINA I",
        "HSTNL O TROPONINA",
        "TROPONINA I",
        "TROPONINA",
    ]

    /// One TnI value. `raw` follows JS: nil = `null`, `.nan` = `NaN`.
    public struct Value: Equatable, Sendable {
        public var display: String
        public var raw: Double?
        public init(display: String, raw: Double?) { self.display = display; self.raw = raw }
    }

    struct Hit { var valor: String; var min: Double?; var max: Double?; var qual: String; var index: Int }

    private static let indetRe = JSRegex(#"INDETERMINADO"#, "i")
    private static let posRe = JSRegex(#"POSITIVO"#, "i")
    private static let negRe = JSRegex(#"NEGATIVO"#, "i")

    private static func troponinaQualFromSub(_ sub: String) -> String {
        if indetRe.test(sub) { return "indet" }
        if posRe.test(sub) { return "pos" }
        if negRe.test(sub) { return "neg" }
        return ""
    }

    private static func troponinaRefsFromHit(_ hit: Hit) -> (min: Double, max: Double) {
        if let mx = hit.max, let mn = hit.min, mx > mn { return (mn, mx) }
        return (0, troponinaHsNormalMaxNgL)
    }

    private static func formatTnIDisplay(_ valorStr: String, _ qual: String, _ minRef: Double, _ maxRef: Double) -> String {
        var out = LabExtract.fmt(LabExtract.marcarSegunRango(valorStr, minRef, maxRef))
        let v = LabExtract.labValueNumber(valorStr)
        let flagged = qual == "indet" || qual == "pos" || (v.map { $0 > maxRef || $0 < minRef } ?? false)
        if flagged && out != "---" && !out.hasSuffix("*") { out += "*" }
        return out
    }

    private static let tnINumRe = JSRegex(#"^([\d.]+)"#)

    private static func parseTnINum(_ token: String) -> Double? {
        guard let m = tnINumRe.firstMatch(token) else { return nil }
        return jsParseFloat(m[1] ?? "") ?? .nan
    }

    /// `troponinaDeltaPct_(v1, v2)`: (TnI2 − TnI1) / TnI1 × 100. nil args act as JS `null` (0 in math).
    public static func troponinaDeltaPct(_ v1: Double?, _ v2: Double?) -> Double? {
        let a = v1 ?? 0, b = v2 ?? 0
        if !a.isFinite || !b.isFinite || (v1 != nil && a == 0) { return nil }
        return ((b - a) / a) * 100
    }

    /// `formatTroponinaDeltaPct_(pct)`.
    public static func formatTroponinaDeltaPct(_ pct: Double?) -> String {
        guard let pct, pct.isFinite else { return "" }
        let rounded = BaseJS.round(pct * 10) / 10
        return (rounded == rounded.rounded(.towardZero) ? jsString(rounded) : jsToFixed(rounded, 1)) + "%"
    }

    private static let crRe = JSRegex(#"\r"#, "g")

    /// `extractAllTroponinaFromText_(textoBruto)`.
    static func extractAllTroponinaFromText(_ textoBruto: String) -> [Hit] {
        if textoBruto.isEmpty { return [] }
        let texto = crRe.replace(textoBruto, with: "")
        let tUp = texto.uppercased()
        var hits: [Hit] = []
        for nombre in troponinaTestNames {
            let nameUp = nombre.uppercased(), nameLen = BaseJS.len(nameUp)
            var start = 0
            while true {
                let idx = BaseJS.indexOf(tUp, nameUp, start)
                if idx == -1 { break }
                let sub = BaseJS.substring(texto, idx, idx + 320)
                let subText = BaseJS.substring(texto, idx + nameLen, idx + nameLen + 220)
                let mValor = LabExtract.matchValorLab(subText)
                let mRango = mValor != nil ? LabExtract.rangoRe.firstMatch(subText) : nil
                if let mValor, !LabExtract.esValorDelRango(mValor, mRango) {
                    hits.append(Hit(
                        valor: mValor.valor,
                        min: mRango.flatMap { jsParseFloat(BaseJS.replaceFirst($0[1] ?? "", ",", ".")) },
                        max: mRango.flatMap { jsParseFloat(BaseJS.replaceFirst($0[2] ?? "", ",", ".")) },
                        qual: troponinaQualFromSub(sub),
                        index: idx))
                }
                start = idx + nameLen
            }
        }
        let sorted = hits.enumerated().sorted { ($0.element.index, $0.offset) < ($1.element.index, $1.offset) }.map(\.element)
        var deduped: [Hit] = []
        for h in sorted where !deduped.contains(where: { abs($0.index - h.index) < 100 && $0.valor == h.valor }) {
            deduped.append(h)
        }
        return deduped
    }

    /// `buildTroponinaResLabLine_(values)`.
    public static func buildTroponinaResLabLine(_ values: [Value]) -> String {
        let list = values.filter { !$0.display.isEmpty && $0.display != "---" }
        guard let v1 = list.first, let v2 = list.last else { return "" }
        if list.count == 1 { return "TROP\tTnI " + v1.display }
        let delta = formatTroponinaDeltaPct(troponinaDeltaPct(v1.raw, v2.raw))
        var body = "TnI1 " + v1.display + " TnI2 " + v2.display
        if !delta.isEmpty { body += " Δ% " + delta }
        return "TROP\t" + body
    }

    private static let tropRowRe = JSRegex(#"^TROP\b"#, "i")
    private static let tnITokenRe = JSRegex(#"\bTnI(\d?)\s+([<>]?[\d.]+\*?)"#, "gi")

    /// `parseTnIDisplayTokensFromResLabRow_(row)`.
    public static func parseTnIDisplayTokensFromResLabRow(_ row: String) -> [Value] {
        if !tropRowRe.test(row.jsTrim) { return [] }
        return tnITokenRe.allMatches(row).map { m in
            let d = m[2] ?? ""
            return Value(display: d, raw: parseTnINum(d))
        }
    }

    /// `mergeTroponinaResLabRows_(rows)`: joins several TROP rows into a pair + Δ%.
    public static func mergeTroponinaResLabRows(_ rows: [String]) -> String {
        let tokens = rows.flatMap(parseTnIDisplayTokensFromResLabRow)
        guard let first = tokens.first, let last = tokens.last else { return "" }
        if tokens.count == 1 { return "TROP\tTnI " + first.display }
        return buildTroponinaResLabLine([first, last])
    }

    /// `parseTroponina_(textoBruto)`.
    public static func parseTroponina(_ textoBruto: String) -> String {
        if textoBruto.isEmpty { return "" }
        let tUp = textoBruto.uppercased()
        if !tUp.contains("TROPONINA") && !tUp.contains("HSTNL") && !tUp.contains("HS TNL") { return "" }
        let hits = extractAllTroponinaFromText(textoBruto)
        if hits.isEmpty { return "" }
        let values = hits.map { hit -> Value in
            let refs = troponinaRefsFromHit(hit)
            return Value(display: formatTnIDisplay(hit.valor, hit.qual, refs.min, refs.max),
                         raw: jsParseFloat(BaseJS.replaceFirst(hit.valor, ",", ".")) ?? .nan)
        }
        if values.count == 1 { return buildTroponinaResLabLine(values) }
        return buildTroponinaResLabLine([values[0], values[values.count - 1]])
    }
}
