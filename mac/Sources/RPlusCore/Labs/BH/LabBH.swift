import Foundation

/// Unit "BH": port of labs-bh.mjs (text/number logic), labs-bh-merge.mjs, labs-reticulocito-corregido.mjs.
public enum LabBH {
    // MARK: constants (labs-bh.mjs)

    public static let BH_EXTRA_DISPLAY_LABELS: [String: String] = [
        "RBC": "Eri", "CHCM": "CHCM", "RDW": "RDW", "MPV": "VPM", "Ret": "Ret", "Lin": "Lin#", "Mono": "Mono#",
        "Baso": "Baso#", "NeuPct": "Seg", "LinPct": "Lin", "MonoPct": "Mono", "EosPct": "Eos", "BasoPct": "Baso",
        "Bandas": "Band", "Mielo": "Mielo", "Metamielo": "Meta", "Promielo": "Prom", "Blastos": "Blast", "Atipicos": "Atip",
    ]
    public static let BH_DIFF_DISPLAY_ORDER = [
        "NeuPct", "LinPct", "MonoPct", "EosPct", "BasoPct",
        "Bandas", "Mielo", "Metamielo", "Promielo", "Blastos", "Atipicos",
    ]
    public static let BH_SCALAR_EXT_ORDER = ["RBC", "CHCM", "RDW", "MPV", "Ret", "Lin", "Mono", "Baso"]
    public static let BH_SOME_TREND_ORDER = [
        "RBC", "Hb", "Hto", "VCM", "HCM", "CHCM", "RDW",
        "Leu", "Neu", "NeuPct", "Lin", "LinPct", "Mono", "MonoPct", "Eos", "EosPct", "Baso", "BasoPct",
        "Plt", "MPV", "Ret", "TP", "TTP", "INR", "Fib", "DD",
        "Bandas", "Mielo", "Metamielo", "Promielo", "Blastos", "Atipicos",
    ]
    public static let QS_SOME_TREND_ORDER = [
        "Glu", "BUN", "Cr", "BUN/CR", "eTFG", "AU", "PCR", "PCT",
        "COL", "HDL", "LDL", "VLDL", "TGL", "IA", "CTHDL", "VSG", "CPK",
    ]
    public static let BH_TREND_TITLES: [String: String] = [
        "NeuPct": "Segmentados", "LinPct": "Linfocitos", "MonoPct": "Monocitos", "EosPct": "Eosinófilos",
        "BasoPct": "Basófilos", "Bandas": "Bandas", "Mielo": "Mielocitos", "Metamielo": "Metamielocitos",
        "Promielo": "Promielocitos", "Blastos": "Blastos", "Atipicos": "Linf. atípicos",
    ]
    static let BH_DIFF_RANGE_LABELS: [String: [String]] = [
        "NeuPct": ["SEGMENTADOS", "NEU%", "NEUTROFILOS%"],
        "LinPct": ["LINFOCITOS", "LYM%", "LINFOCITOS%"],
        "MonoPct": ["MONOCITOS", "MONO%"],
        "EosPct": ["EOSINOFILOS", "EOS%"],
        "BasoPct": ["BASOFILOS", "BASO%"],
        "Bandas": ["BANDAS", "CAYADOS"],
        "Mielo": ["MIELOCITOS"],
        "Metamielo": ["METAMIELOCITOS"],
        "Promielo": ["PROMIELOCITOS"],
        "Blastos": ["BLASTOS"],
        "Atipicos": ["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"],
    ]
    static let BH_OUTPUT_LABEL_TO_FIELD: [String: String] = [
        "Seg": "NeuPct", "Lin": "LinPct", "Mono": "MonoPct", "Eos": "EosPct", "Baso": "BasoPct", "Band": "Bandas",
        "Meta": "Metamielo", "Mielo": "Mielo", "Prom": "Promielo", "Blast": "Blastos", "Atip": "Atipicos",
        "NeuPct": "NeuPct", "LinPct": "LinPct", "MonoPct": "MonoPct", "EosPct": "EosPct", "BasoPct": "BasoPct",
        "Bandas": "Bandas", "Metamielo": "Metamielo", "Promielo": "Promielo", "Blastos": "Blastos", "Atipicos": "Atipicos",
        "Hb": "Hb", "Hto": "Hto", "VCM": "VCM", "HCM": "HCM", "Leu": "Leu", "Neu": "Neu", "Plt": "Plt",
        "RBC": "RBC", "Eri": "RBC", "CHCM": "CHCM", "RDW": "RDW", "VPM": "MPV", "MPV": "MPV", "Ret": "Ret",
        "TP": "TP", "TTP": "TTP", "INR": "INR", "Fib": "Fib", "DD": "DD",
    ]

    public static func bhExtraDisplayLabel(_ key: String) -> String { BH_EXTRA_DISPLAY_LABELS[key] ?? key }
    public static func bhTrendDisplayTitle(_ fieldKey: String) -> String { BH_TREND_TITLES[fieldKey] ?? bhExtraDisplayLabel(fieldKey) }
    /// Report label (Seg, Band, VPM...) -> field key in parsedBySection.BH.
    public static func bhFieldKeyFromOutputLabel(_ label: String) -> String { BH_OUTPUT_LABEL_TO_FIELD[label] ?? label }

    // MARK: trend values from a resLabs row

    /// `{ val, ab }` cell of `parseBhTrendValuesFromResLab`.
    public struct BhCell: Equatable, Sendable {
        public var val: String
        public var ab: Bool
    }

    private static let wsRe = JSRegex(#"\s+"#)
    private static let tokenRe = JSRegex(#"^([<>]?-?\d+(?:[.,]\d+)?)(?:%)?(\*)?$"#)

    private static func parseBhTokenPairs(_ text: String, _ into: inout [String: BhCell]) {
        if text.isEmpty { return }
        let tokens = wsRe.split(text.jsTrim)
        var i = 0
        while i < tokens.count {
            let label = tokens[i]
            if label.isEmpty || label == "-" { i += 1; continue }
            guard i + 1 < tokens.count else { i += 1; continue }
            let next = tokens[i + 1]
            if let m = tokenRe.firstMatch(next) {
                into[bhFieldKeyFromOutputLabel(label)] = BhCell(val: BaseJS.replaceFirst(m[1] ?? "", ",", "."), ab: next.contains("*"))
                i += 2
            } else {
                i += 1
            }
        }
    }

    private static let colonEndRe = JSRegex(#":$"#)

    /// `parseBhTrendValuesFromResLab(entry)`: field -> value pairs of one BH resLabs entry (compact line or block).
    public static func parseBhTrendValuesFromResLab(_ entry: String?) -> [String: BhCell] {
        var out: [String: BhCell] = [:]
        guard let entry, !entry.isEmpty else { return out }
        for line in entry.jsLines {
            let trimmed = line.jsTrim
            if trimmed.isEmpty { continue }
            let tab = BaseJS.indexOf(trimmed, "\t")
            if tab < 0 { continue }
            // Node: BH/COAG heads and other heads take the same path.
            let body = BaseJS.substring(trimmed, tab + 1).jsTrim
            if !body.isEmpty { parseBhTokenPairs(body, &out) }
        }
        return out
    }

    // MARK: display helpers

    private static func formatBhDiffPctDisplay(_ key: String, _ rawVal: String, _ tNorm: String, _ priorRefs: [String: [Double]]?) -> String {
        let label = bhExtraDisplayLabel(key)
        var val = rawVal
        if let labels = BH_DIFF_RANGE_LABELS[key], !tNorm.isEmpty {
            let d = LabExtract.extraerConRangoBH(labels, tNorm)
            if !d.valor.isEmpty && d.valor != "---" { val = LabExtract.fmtLabRanged(d, key, priorRefs) }
        } else if !val.isEmpty && val != "---" {
            val = LabExtract.fmtLabRanged(LabValorRango(valor: val), key, priorRefs)
        }
        if val.hasSuffix("*") { return label + " " + BaseJS.slice(val, 0, -1) + "%*" }
        return label + " " + val + "%"
    }

    /// `formatBhExtrasDisplayParts(bhExtras, sourceText)`. Keys outside the two orders come sorted
    /// (ponytail: Swift dict has no insertion order; parseBH never makes such keys).
    public static func formatBhExtrasDisplayParts(_ bhExtras: [String: String]?, _ sourceText: String?) -> [String] {
        guard let bhExtras else { return [] }
        let tNorm = sourceText ?? ""
        var parts: [String] = []
        var seen = Set<String>()
        for k in BH_SCALAR_EXT_ORDER {
            guard !seen.contains(k), let v = bhExtras[k], !v.jsTrim.isEmpty else { continue }
            seen.insert(k)
            parts.append(bhExtraDisplayLabel(k) + " " + v)
        }
        for k in BH_DIFF_DISPLAY_ORDER {
            guard !seen.contains(k), let v = bhExtras[k], !v.isEmpty else { continue }
            seen.insert(k)
            parts.append(formatBhDiffPctDisplay(k, v, tNorm, nil))
        }
        for k in bhExtras.keys.sorted() {
            guard !seen.contains(k), let v = bhExtras[k], !v.jsTrim.isEmpty else { continue }
            seen.insert(k)
            parts.append(BH_DIFF_DISPLAY_ORDER.contains(k) ? formatBhDiffPctDisplay(k, v, tNorm, nil) : bhExtraDisplayLabel(k) + " " + v)
        }
        return parts
    }

    public static func formatBhExtrasDisplayLine(_ bhExtras: [String: String]?, _ sourceText: String?) -> String {
        let parts = formatBhExtrasDisplayParts(bhExtras, sourceText)
        return parts.isEmpty ? "" : "BH ext\t" + parts.joined(separator: "  ")
    }

    static func pairListToDisplay(_ pairs: [String]) -> String {
        stride(from: 0, to: pairs.count - 1, by: 2).map { pairs[$0] + " " + pairs[$0 + 1] }.joined(separator: "  ")
    }

    private static func formatCoagResLabLine(_ coagDisplay: [String]) -> String {
        coagDisplay.isEmpty ? "" : "COAG\t" + coagDisplay.joined(separator: "  ")
    }

    private static let coagLineRe = JSRegex(#"^(?:COAG|Coag\.?)\t(.+)"#, "i")

    static func extractCoagBodyFromBhLine(_ line: String?) -> String {
        coagLineRe.firstMatch(line ?? "").map { ($0[1] ?? "").jsTrim } ?? ""
    }

    private static let COAG_FIELD_MERGE_ORDER = ["TP", "TTP", "INR", "Fib", "DD"]
    private static let twoSpaceRe = JSRegex(#"\s{2,}"#)

    /// `mergeCoagResLabRows_(rows)`: one COAG row, per analyte the richest token.
    public static func mergeCoagResLabRows(_ rows: [String]?) -> String {
        var keys: [String] = []
        var byKey: [String: (tok: String, score: Int)] = [:]
        for row in rows ?? [] {
            let body = extractCoagBodyFromBhLine(row)
            if body.isEmpty { continue }
            for tok in twoSpaceRe.split(body) {
                let t = tok.jsTrim
                if t.isEmpty { continue }
                let key = wsRe.split(t)[0]
                let score = LabGaso.lineRichnessScore(t)
                if let prev = byKey[key] {
                    if score > prev.score { byKey[key] = (t, score) }
                } else {
                    keys.append(key)
                    byKey[key] = (t, score)
                }
            }
        }
        if keys.isEmpty { return "" }
        func rank(_ k: String) -> Int { COAG_FIELD_MERGE_ORDER.firstIndex(of: k) ?? 999 }
        // ponytail: localeCompare approximated with an "en" locale compare; only unknown coag keys reach it.
        let sorted = keys.enumerated().sorted { a, b in
            let ra = rank(a.element), rb = rank(b.element)
            if ra != rb { return ra < rb }
            let c = a.element.compare(b.element, locale: Locale(identifier: "en"))
            return c == .orderedSame ? a.offset < b.offset : c == .orderedAscending
        }.map(\.element)
        return formatCoagResLabLine(sorted.map { byKey[$0]!.tok })
    }

    // MARK: extraction

    private static let simpleNumRe = JSRegex(#"(-?\d+[.,]?\d*)"#)
    private static let wordCharRe = JSRegex(#"[A-Z0-9_]"#)
    private static let alnumRe = JSRegex(#"[A-Z0-9]"#)

    private static func extraerSimpleBh(_ labels: [String], _ texto: String) -> String {
        if texto.isEmpty { return "" }
        let up = texto.uppercased()
        for lbl in labels {
            var idx = -1
            let lu = lbl.uppercased()
            let luLen = BaseJS.len(lu)
            var from = 0
            while true {
                let p = BaseJS.indexOf(up, lu, from)
                if p == -1 { break }
                let after = BaseJS.charAt(up, p + luLen)
                let beforeRaw = BaseJS.charAt(up, p - 1)
                let before = beforeRaw.isEmpty ? " " : beforeRaw
                let boundaryBefore = !wordCharRe.test(before)
                let exact = BaseJS.charAt(lu, luLen - 1) == "%" || !alnumRe.test(after)
                if boundaryBefore && exact { idx = p + luLen; break }
                from = p + luLen
            }
            if idx == -1 { continue }
            let sub = BaseJS.substring(texto, idx, idx + 80)
            guard let m = simpleNumRe.firstMatch(sub) else { continue }
            let mRango = LabExtract.rangoRe.firstMatch(sub)
            if LabExtract.esValorDelRango((m.index, m[1] ?? ""), mRango) { continue }
            return BaseJS.replaceFirst(m[1] ?? "", ",", ".")
        }
        return ""
    }

    /// Walk every RETICULOCITOS hit: section title first, then the result row.
    private static func extraerBhReticulocitos(_ tNorm: String) -> LabValorRango {
        let t = tNorm.uppercased()
        let nombre = "RETICULOCITOS"
        var start = 0
        while true {
            let idx = BaseJS.indexOf(t, nombre, start)
            if idx == -1 { return .vacio }
            let got = LabExtract.extraerConRango([nombre], BaseJS.substring(tNorm, idx))
            if got.valor != "---" { return got }
            start = idx + BaseJS.len(nombre)
        }
    }

    /// Fill a missing Hto/Ret from the most recent prior draw (never both).
    private static func retCFuenteMixta(_ retRaw: String, _ htoRaw: String, _ prior: [String: Double]?) -> (ret: String, hto: String) {
        if retRaw != "---" && htoRaw == "---", let h = prior?["Hto"] { return (retRaw, jsString(h)) }
        if htoRaw != "---" && retRaw == "---", let r = prior?["Ret"] { return (jsString(r), htoRaw) }
        return (retRaw, htoRaw)
    }

    private struct Fields {
        var Hb, Hto, VCM, HCM, CHCM, RDW, Leu, RBC, Plt, MPV, Ret, RetC, TP, TTP, INR, Fib, DD, Neu, Eos: String
    }

    private static func extractBhScalarFields(_ t: String, _ pr: [String: [Double]]?, _ prior: [String: Double]?) -> Fields {
        typealias E = LabExtract
        func f(_ d: LabValorRango, _ k: String) -> String { E.fmtLabRanged(d, k, pr) }
        let htoData = E.extraerConRango(["HCT ", "HEMATOCRITO"], t)
        let retData = extraerBhReticulocitos(t)
        let retC = retCFuenteMixta(retData.valor, htoData.valor, prior)
        return Fields(
            Hb: f(E.extraerConRangoSuero(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], t), "Hb"),
            Hto: f(htoData, "Hto"),
            VCM: f(E.extraerConRango(["MCV ", "VCM "], t), "VCM"),
            HCM: f(E.extraerConRango(["MCH ", "HCM "], t), "HCM"),
            CHCM: f(E.extraerConRango(["MCHC", "CHCM"], t), "CHCM"),
            RDW: f(E.extraerConRango(["RDW "], t), "RDW"),
            Leu: f(E.extraerConRango(["WBC "], t), "Leu"),
            RBC: f(E.extraerConRangoBH(["RBC ", "ERITROCITOS", "HEMATIES"], t), "RBC"),
            Plt: f(E.extraerConRango(["PLT "], t), "Plt"),
            MPV: f(E.extraerConRango(["MPV ", "VPM "], t), "MPV"),
            Ret: f(retData, "Ret"),
            RetC: computeRetiCorregido(retC.ret, retC.hto),
            TP: f(E.extraerConRangoCoag(["TIEMPO DE PROTROMBINA"], t), "TP"),
            TTP: f(E.extraerConRangoCoag(["TIEMPO DE TROMBOPLASTINA"], t), "TTP"),
            INR: f(E.extraerConRangoCoag(["INR ", "INR"], t), "INR"),
            Fib: f(E.extraerConRangoCoag(["FIBRINOGENO", "FIBRINÓGENO"], t), "Fib"),
            DD: f(E.extraerConRangoCoag(["DIMERO D", "D-DIMERO", "D DIMERO"], t), "DD"),
            Neu: f(E.extraerConRango(["NEU "], t), "Neu"),
            Eos: f(E.extraerConRango(["EOS "], t), "Eos")
        )
    }

    private static func pushBhExtra(_ extras: inout [String: String], _ key: String, _ value: String) {
        if !value.isEmpty && value != "---" { extras[key] = value }
    }

    private static func buildBhExtras(_ t: String, _ Leu: String) -> [String: String] {
        var x: [String: String] = [:]
        let lin = LabExtract.extraerConRango(["LYM ", "LINFOCITOS"], t)
        let mono = LabExtract.extraerConRango(["MONO "], t)
        let baso = LabExtract.extraerConRango(["BASO "], t)
        if Leu != "---" {
            pushBhExtra(&x, "Lin", lin.valor)
            pushBhExtra(&x, "Mono", mono.valor)
            pushBhExtra(&x, "Baso", baso.valor)
        }
        pushBhExtra(&x, "NeuPct", extraerSimpleBh(["NEU%", "NEUTROFILOS%", "SEGMENTADOS"], t))
        pushBhExtra(&x, "LinPct", extraerSimpleBh(["LYM%", "LINFOCITOS%", "LINFOCITOS"], t))
        pushBhExtra(&x, "MonoPct", extraerSimpleBh(["MONO%", "MONOCITOS%", "MONOCITOS"], t))
        pushBhExtra(&x, "EosPct", extraerSimpleBh(["EOS%", "EOSINOFILOS%", "EOSINOFILOS"], t))
        pushBhExtra(&x, "BasoPct", extraerSimpleBh(["BASO%", "BASOFILOS%", "BASOFILOS"], t))
        pushBhExtra(&x, "Bandas", extraerSimpleBh(["BANDAS", "CAYADOS"], t))
        pushBhExtra(&x, "Mielo", extraerSimpleBh(["MIELOCITOS"], t))
        pushBhExtra(&x, "Metamielo", extraerSimpleBh(["METAMIELOCITOS"], t))
        pushBhExtra(&x, "Promielo", extraerSimpleBh(["PROMIELOCITOS"], t))
        pushBhExtra(&x, "Blastos", extraerSimpleBh(["BLASTOS"], t))
        pushBhExtra(&x, "Atipicos", extraerSimpleBh(["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"], t))
        return x
    }

    private static func buildBhCorePairs(_ f: Fields) -> [String] {
        var p: [String] = []
        for (k, v) in [("Hb", f.Hb), ("Hto", f.Hto), ("VCM", f.VCM), ("HCM", f.HCM), ("Ret", f.Ret), ("RetC", f.RetC),
                       ("Leu", f.Leu), ("Neu", f.Neu), ("Eos", f.Eos), ("Plt", f.Plt)] where v != "---" {
            p += [k, v]
        }
        return p
    }

    private static func buildBhCoagDisplay(_ f: Fields) -> [String] {
        [("TP", f.TP), ("TTP", f.TTP), ("INR", f.INR), ("Fib", f.Fib), ("DD", f.DD)].filter { $0.1 != "---" }.map { $0.0 + " " + $0.1 }
    }

    private static func mergeBhIndexExtras(_ extras: inout [String: String], _ f: Fields) {
        for (k, v) in [("RBC", f.RBC), ("CHCM", f.CHCM), ("RDW", f.RDW), ("MPV", f.MPV), ("Ret", f.Ret)] where v != "---" {
            pushBhExtra(&extras, k, v)
        }
    }

    private static func buildBhDiffDisplay(_ extras: [String: String], _ t: String, _ compact: Bool, _ pr: [String: [Double]]?) -> [String] {
        if compact { return [] }
        return BH_DIFF_DISPLAY_ORDER.compactMap { k in
            guard let v = extras[k], !v.isEmpty, v != "0" else { return nil }
            return formatBhDiffPctDisplay(k, v, t, pr)
        }
    }

    private static func buildBhIndexDisplay(_ f: Fields, _ compact: Bool) -> [String] {
        if compact { return [] }
        return [("Eri", f.RBC), ("CHCM", f.CHCM), ("RDW", f.RDW), ("VPM", f.MPV), ("Ret", f.Ret)].filter { $0.1 != "---" }.map { $0.0 + " " + $0.1 }
    }

    private static let bhHeadRe = JSRegex(#"^BH:\s*$"#)
    private static let difRe = JSRegex(#"^Dif\."#, "i")
    private static let hemRe = JSRegex(#"^Hem\.\t"#, "i")

    /// `flattenBhHemOnlyVisible(text)`: folds a `BH:\n  Hem.\t...` block (no Dif.) into `BH\t...`.
    public static func flattenBhHemOnlyVisible(_ text: String?) -> String {
        let s = text ?? ""
        let lines = s.jsLines
        if !bhHeadRe.test((lines.first ?? "").jsTrim) { return s }
        var hemBody = ""
        for line in lines.dropFirst() {
            let t = line.jsTrim
            if t.isEmpty { continue }
            if difRe.test(t) { return s }
            if hemRe.test(t) {
                if !hemBody.isEmpty { return s }
                hemBody = BaseJS.slice(t, BaseJS.indexOf(t, "\t") + 1).jsTrim
                continue
            }
            return s
        }
        return hemBody.isEmpty ? s : "BH\t" + hemBody
    }

    private static func buildBhVisibleLine(_ compact: Bool, _ core: [String], _ index: [String], _ diff: [String]) -> String {
        if compact { return "BH\t" + pairListToDisplay(core) }
        if index.isEmpty && diff.isEmpty { return "" }
        if !index.isEmpty && diff.isEmpty { return "BH\t" + index.joined(separator: "  ") }
        var sub = ["BH:"]
        if !index.isEmpty { sub.append("  Hem.\t" + index.joined(separator: "  ")) }
        if !diff.isEmpty { sub.append("  Dif.\t" + diff.joined(separator: "  ")) }
        return flattenBhHemOnlyVisible(sub.joined(separator: "\n"))
    }

    private static func bhHasAnyData(_ f: Fields, _ extras: [String: String]) -> Bool {
        let all = [f.Hb, f.Hto, f.VCM, f.HCM, f.Leu, f.Neu, f.Eos, f.Plt, f.RBC, f.CHCM, f.RDW, f.MPV, f.Ret, f.TP, f.TTP, f.INR, f.Fib, f.DD]
        return all.contains { $0 != "---" } || !extras.isEmpty
    }

    /// `parseBH_(texto, priorRefs, priorBhValues)`. Node never returns null, so this is never nil.
    public static func parseBH(_ text: String, priorRefs: [String: [Double]]?, priorBhValues: [String: Double]?) -> BHResult? {
        let f = extractBhScalarFields(text, priorRefs, priorBhValues)
        var extras = buildBhExtras(text, f.Leu)
        if !bhHasAnyData(f, extras) { return BHResult(visible: "", coagVisible: "", extras: [:]) }
        let core = buildBhCorePairs(f)
        let compact = !core.isEmpty
        let coag = buildBhCoagDisplay(f)
        if compact || !coag.isEmpty { mergeBhIndexExtras(&extras, f) }
        let visible = buildBhVisibleLine(compact, core, buildBhIndexDisplay(f, compact), buildBhDiffDisplay(extras, text, compact, priorRefs))
        return BHResult(visible: visible, coagVisible: formatCoagResLabLine(coag), extras: extras)
    }
}
