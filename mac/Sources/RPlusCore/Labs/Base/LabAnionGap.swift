import Foundation

/// Port of labs-anion-gap.mjs: serum AG, albumin-corrected cAG, urinary UAG.
enum LabAnionGap {
    private static func parseLabNum(_ str: String?) -> Double? {
        guard let str, str != "---", !str.isEmpty else { return nil }
        return jsParseFloat(BaseJS.replaceFirst(str, ",", "."))
    }

    /// Round to 1 decimal like Node (`Math.round((n + EPSILON) * 10) / 10`), "" for non-finite.
    static func formatTenths(_ n: Double, epsilon: Bool = true) -> String {
        let rounded = BaseJS.round((n + (epsilon ? BaseJS.epsilon : 0)) * 10) / 10
        return rounded == rounded.rounded(.towardZero) ? jsToFixed(rounded, 0) : jsString(rounded)
    }

    private static func formatAgToken(_ ag: Double?) -> String {
        guard let ag, ag.isFinite else { return "---" }
        return LabExtract.marcarSegunRango(formatTenths(ag), 8, 12)
    }

    private static func formatPlainToken(_ n: Double?) -> String {
        guard let n, n.isFinite else { return "---" }
        return formatTenths(n)
    }

    /// `computeAnionGapValue_`: AG = Na - (Cl + HCO3).
    static func computeAnionGapValue(_ naStr: String?, _ clStr: String?, _ hco3Str: String?) -> Double? {
        guard let na = parseLabNum(naStr), let cl = parseLabNum(clStr), let hco3 = parseLabNum(hco3Str) else { return nil }
        return na - (cl + hco3)
    }

    /// `computeAlbuminCorrectedAnionGapValue_`: AG + 2.5 * (4 - Alb).
    static func computeAlbuminCorrectedAnionGapValue(_ naStr: String?, _ clStr: String?, _ hco3Str: String?, _ albStr: String?) -> Double? {
        guard let ag = computeAnionGapValue(naStr, clStr, hco3Str), let alb = parseLabNum(albStr) else { return nil }
        return ag + 2.5 * (4 - alb)
    }

    /// `computeUrinaryAnionGapValue_`: Na + K - Cl (urine).
    static func computeUrinaryAnionGapValue(_ naUStr: String?, _ kUStr: String?, _ clUStr: String?) -> Double? {
        guard let na = parseLabNum(naUStr), let k = parseLabNum(kUStr), let cl = parseLabNum(clUStr) else { return nil }
        return na + k - cl
    }

    /// `computeAnionGap_`: formatted, «*» outside 8-12.
    static func computeAnionGap(_ naStr: String?, _ clStr: String?, _ hco3Str: String?) -> String {
        formatAgToken(computeAnionGapValue(naStr, clStr, hco3Str))
    }

    /// `computeAlbuminCorrectedAnionGap_`: formatted, «---» without albumin.
    static func computeAlbuminCorrectedAnionGap(_ naStr: String?, _ clStr: String?, _ hco3Str: String?, _ albStr: String?) -> String {
        formatAgToken(computeAlbuminCorrectedAnionGapValue(naStr, clStr, hco3Str, albStr))
    }

    /// `computeUrinaryAnionGap_`: formatted, no range.
    static func computeUrinaryAnionGap(_ naUStr: String?, _ kUStr: String?, _ clUStr: String?) -> String {
        formatPlainToken(computeUrinaryAnionGapValue(naUStr, kUStr, clUStr))
    }

    /// `extractUrineElectrolytes_(texto)`: urine Na/K/Cl values (serum ignored).
    static func extractUrineElectrolytes(_ texto: String?) -> (na: String, k: String, cl: String) {
        guard let texto, !texto.isEmpty else { return ("---", "---", "---") }
        return (LabExtract.extraerConRango(["SODIO EN ORINA", "SODIO URINARIO"], texto).valor,
                LabExtract.extraerConRango(["POTASIO EN ORINA", "POTASIO URINARIO"], texto).valor,
                LabExtract.extraerConRango(["CLORO EN ORINA", "CLORO URINARIO"], texto).valor)
    }

    /// `resolveEffectiveAnionGapValue_`: cAG when albumin is present, else raw AG.
    static func resolveEffectiveAnionGapValue(_ naStr: String?, _ clStr: String?, _ hco3Str: String?, _ albStr: String?) -> Double? {
        computeAlbuminCorrectedAnionGapValue(naStr, clStr, hco3Str, albStr) ?? computeAnionGapValue(naStr, clStr, hco3Str)
    }
}
