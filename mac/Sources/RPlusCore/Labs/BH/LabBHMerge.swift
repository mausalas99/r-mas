import Foundation

// Port of labs-bh-merge.mjs and labs-reticulocito-corregido.mjs.
extension LabBH {
    private static let BH_COMPACT_MERGE_ORDER = ["Hb", "Hto", "VCM", "HCM", "Ret", "Leu", "Neu", "Eos", "Plt"]

    private static func formatBhMergedCell(_ cell: BhCell?) -> String {
        guard let cell, !cell.val.jsTrim.isEmpty else { return "" }
        return cell.ab && !cell.val.contains("*") ? cell.val + "*" : cell.val
    }

    private static func collectBhCompactFields(_ rows: [String]) -> [String: BhCell] {
        var byField: [String: BhCell] = [:]
        for row in rows {
            let cells = parseBhTrendValuesFromResLab(flattenBhHemOnlyVisible(row))
            for fk in BH_COMPACT_MERGE_ORDER where byField[fk] == nil {
                if let c = cells[fk] { byField[fk] = c }
            }
        }
        return byField
    }

    private static let retCTokenRe = JSRegex(#"\bRetC\s+([\d.]+\s*\((?:arregenerativa|regenerativa)\))"#, "i")

    private static func findExistingRetCToken(_ rows: [String]) -> String? {
        for r in rows { if let m = retCTokenRe.firstMatch(r) { return m[1] } }
        return nil
    }

    private static func insertRetCPair(_ pairs: inout [String], _ byField: [String: BhCell], _ rows: [String]) {
        var retC: String?
        if let hto = byField["Hto"]?.val, let ret = byField["Ret"]?.val {
            let computed = computeRetiCorregido(ret, hto)
            if computed != "---" { retC = computed }
        }
        if retC == nil || retC!.isEmpty { retC = findExistingRetCToken(rows) }
        guard let retC, !retC.isEmpty else { return }
        let retIdx = pairs.firstIndex(of: "Ret")
        pairs.insert(contentsOf: ["RetC", retC], at: retIdx.map { $0 + 2 } ?? pairs.count)
    }

    private static func formatBhMergedCompactLine(_ byField: [String: BhCell], _ rows: [String]) -> String {
        var pairs: [String] = []
        for fk in BH_COMPACT_MERGE_ORDER {
            let disp = formatBhMergedCell(byField[fk])
            if !disp.isEmpty { pairs += [fk, disp] }
        }
        if pairs.isEmpty { return "" }
        insertRetCPair(&pairs, byField, rows)
        return "BH\t" + pairListToDisplay(pairs)
    }

    private static func pickRichestBhLine(_ list: [String]) -> String {
        var best = list[0]
        var bestScore = LabGaso.lineRichnessScore(best)
        for s in list.dropFirst() {
            let sc = LabGaso.lineRichnessScore(s)
            if sc > bestScore { bestScore = sc; best = s }
        }
        return best
    }

    private static let bhStartRe = JSRegex(#"^BH\b"#, "i")
    private static let coagStartRe = JSRegex(#"^(?:\s*Coag\.|COAG)\t"#, "i")

    /// `mergeBhResLabRows_(rows)`: joins BH rows of one cluster (CBC + Ret/diff from another order).
    public static func mergeBhResLabRows(_ rows: [String?]?) -> (bh: String, coag: String) {
        let list = (rows ?? []).map { $0 ?? "" }.filter { bhStartRe.test($0.jsTrim) }
        if list.isEmpty { return ("", "") }
        var coagRows: [String] = []
        for row in list {
            for line in row.jsLines where !extractCoagBodyFromBhLine(line).isEmpty { coagRows.append(line) }
        }
        let coag = mergeCoagResLabRows(coagRows)
        let compact = formatBhMergedCompactLine(collectBhCompactFields(list), list)
        if !compact.isEmpty { return (compact, coag) }
        let lines = pickRichestBhLine(list).jsLines.filter { !coagStartRe.test($0.jsTrim) }
        return (lines.joined(separator: "\n").jsTrim, coag)
    }

    // MARK: reticulocito corregido: RetC = Ret% x (Hto / 45); >= 2 regenerativa.

    private static func parseLabNum(_ s: String?) -> Double? {
        guard let s, s != "---", !s.isEmpty else { return nil }
        return jsParseFloat(BaseJS.replaceFirst(s, ",", "."))
    }

    public static func computeRetiCorregidoValue(_ retStr: String?, _ htoStr: String?) -> Double? {
        guard let ret = parseLabNum(retStr), let hto = parseLabNum(htoStr) else { return nil }
        return ret * (hto / 45)
    }

    public static func classifyRetiCorregido(_ value: Double?) -> String? {
        guard let value, value.isFinite else { return nil }
        return value >= 2 ? "regenerativa" : "arregenerativa"
    }

    /// `computeRetiCorregido_(retStr, htoStr)`: "1.2 (arregenerativa)" or "---".
    public static func computeRetiCorregido(_ retStr: String?, _ htoStr: String?) -> String {
        guard let value = computeRetiCorregidoValue(retStr, htoStr) else { return "---" }
        let rounded = BaseJS.round((value + BaseJS.epsilon) * 100) / 100
        let valStr = rounded == rounded.rounded(.towardZero) ? jsToFixed(rounded, 0) : jsString(rounded)
        return valStr + " (" + (classifyRetiCorregido(value) ?? "null") + ")"
    }
}
