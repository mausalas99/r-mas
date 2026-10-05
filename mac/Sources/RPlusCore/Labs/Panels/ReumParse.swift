import Foundation

/// labs-reum-parse.mjs: Laboratorio Clínico (Reumatología) PDF text -> INM / ANA / ENA / APL / TB rows.
enum ReumParse {
    private static func num(_ s: String) -> Double? { jsParseFloat(BaseJS.replaceFirst(s, ",", ".")) }

    /// `flagNum_(op, raw, min, max)`: «*» when out of [min, max].
    private static func flagNum(_ op: String, _ raw: String, _ min: Double?, _ max: Double?) -> String {
        let out = op + raw
        guard let min, let max, let v = num(raw) else { return out }
        let low = op == "<" ? v <= min : op == "" && v < min
        let high = op == ">" ? v >= max : op == "" && v > max
        return low || high ? out + "*" : out
    }

    private static let posRe = JSRegex(#"^POS"#, "i")
    private static let wsRe = JSRegex(#"\s+"#, "g")

    private static func qualTok(_ key: String, _ qual: String, _ raw: String) -> String {
        let pos = posRe.test(qual)
        let val = raw.isEmpty ? "" : wsRe.replace(raw, with: "")
        return key + " " + (!val.isEmpty ? val + (pos ? "*" : "") : pos ? "pos*" : "neg")
    }

    private static let NUM = #"\d+(?:[.,]\d+)?"#
    private static let qualRe = JSRegex(#"\b(POSITIVO|NEGATIVO|INDETERMINADO)\b\s*(1\s*:\s*\d+|[<>]?\s*"# + NUM + ")?", "i")

    private typealias Hit = (m: JSRegex.Match, rest: String)

    private static func eachLine(_ lineas: [String], _ re: JSRegex, _ fn: (JSRegex.Match, String) -> Void) {
        for l in lineas { if let m = re.firstMatch(l) { fn(m, BaseJS.slice(l, m.end)) } }
    }

    private static func firstLine(_ lineas: [String], _ re: JSRegex) -> Hit? {
        for l in lineas { if let m = re.firstMatch(l) { return (m, BaseJS.slice(l, m.end)) } }
        return nil
    }

    private static func qualVal(_ rest: String) -> (qual: String, val: String)? {
        guard let q = qualRe.firstMatch(rest) else { return nil }
        return (q[1] ?? "", wsRe.replace(q[2] ?? "", with: ""))
    }

    private static let numRowRe = JSRegex(#"([<>]?)\s*("# + NUM + #")\s*(?:mg\/dL|U\s*Ig[GMA]-FL\/mL)(.*)$"#, "i")
    private static let bracketRe = JSRegex(#"\[.*?\]"#, "g")
    private static let numGRe = JSRegex(NUM, "g")

    private static func numRow(_ rest: String) -> String {
        guard let m = numRowRe.firstMatch(rest) else { return "" }
        let refs = numGRe.allMatches(bracketRe.replace(m[3] ?? "", with: " ")).map(\.whole)
        return flagNum(m[1] ?? "", m[2] ?? "", refs.count > 1 ? num(refs[0]) : nil, refs.count > 1 ? num(refs[1]) : nil)
    }

    private static let inmRes = ["C3", "C4"].map { ($0, JSRegex(#"^\s*"# + $0 + #"\b"#)) }

    private static func parseInm(_ lineas: [String]) -> String {
        var toks: [String] = []
        for (k, re) in inmRes {
            if let hit = firstLine(lineas, re) {
                let v = numRow(hit.rest)
                if !v.isEmpty { toks.append(k + " " + v) }
            }
        }
        return toks.isEmpty ? "" : "INM\t" + toks.joined(separator: " ")
    }

    private static let acRe = JSRegex(#"^\s*(AC-\d+(?:\s*,\s*AC-\d+)*)\b"#, "i")
    private static let titerRe = JSRegex(#"1\s*:\s*(\d+)"#)
    /// (family 0=ana 1=ena 2=apl, key, regex)
    private static let autoRows: [(Int, String, JSRegex)] = [
        (0, "dsDNA", JSRegex(#"^\s*Anti-dsDNA(?![-\w])"#, "i")),
        (0, "NcX", JSRegex(#"^\s*Anti-dsDNA-NcX"#, "i")),
        (1, "SSA", JSRegex(#"^\s*Anti-SS-A\/Ro"#, "i")),
        (1, "SSB", JSRegex(#"^\s*Anti[\s-]*SS-B\/La"#, "i")),
        (1, "Sm", JSRegex(#"^\s*Anti-Sm\b"#, "i")),
        (2, "B2GP-CIA", JSRegex(#"^\s*B2GP1\b"#, "i")),
    ]
    private static let b2gpRe = JSRegex(#"^\s*[ßβB]2-?\s*Glicoprote[ií]na\s*1\s*Ig([GMA])"#, "i")
    private static let aclRe = JSRegex(#"^\s*Cardiolipina\s*Ig([GMA])"#, "i")
    private static let APL_ORDER = ["B2GP-G", "B2GP-M", "B2GP-A", "B2GP-CIA", "aCL-G", "aCL-M", "aCL-A"]

    private static func parseAuto(_ lineas: [String]) -> [String] {
        var fam: [[String]] = [[], [], []]
        if let hit = firstLine(lineas, acRe), let titer = titerRe.firstMatch(hit.rest) {
            fam[0].append("ANA 1:" + (titer[1] ?? "") + "* ICAP " + wsRe.replace(hit.m[1] ?? "", with: ""))
        }
        for (f, key, re) in autoRows {
            if let h = firstLine(lineas, re), let q = qualVal(h.rest) { fam[f].append(qualTok(key, q.qual, q.val)) }
        }
        eachLine(lineas, b2gpRe) { m, rest in
            if let q = qualVal(rest) { fam[2].append(qualTok("B2GP-" + (m[1] ?? "").uppercased(), q.qual, q.val)) }
        }
        eachLine(lineas, aclRe) { m, rest in
            let v = numRow(rest)
            if !v.isEmpty { fam[2].append("aCL-" + (m[1] ?? "").uppercased() + " " + v) }
        }
        // Stable sort like V8; unknown keys = -1 like indexOf.
        func rank(_ s: String) -> Int { APL_ORDER.firstIndex(of: String(s.split(separator: " ", omittingEmptySubsequences: false)[0])) ?? -1 }
        let apl = fam[2].enumerated().sorted { (rank($0.element), $0.offset) < (rank($1.element), $1.offset) }.map(\.element)
        return [
            fam[0].isEmpty ? "" : "ANA\t" + fam[0].joined(separator: " "),
            fam[1].isEmpty ? "" : "ENA\t" + fam[1].joined(separator: " "),
            apl.isEmpty ? "" : "APL\t" + apl.joined(separator: " "),
        ]
    }

    private static let tbRows: [(String, JSRegex)] = [
        ("TB1", JSRegex(#"^\s*Ag-TB1\b"#, "i")), ("TB2", JSRegex(#"^\s*Ag-TB2\b"#, "i")), ("Mit", JSRegex(#"^\s*Mit[oó]geno\b"#, "i")),
    ]
    private static let tbStripRe = JSRegex(#"\([^)]*\)|UI\/mL"#, "gi")
    private static let tbNumRe = JSRegex(#"[<>]?\s*\d+(?:[.,]\d+)?"#, "g")
    private static let ltStartRe = JSRegex(#"^<"#)
    private static let ltWsRe = JSRegex(#"[<\s]"#, "g")
    private static let interpRe = JSRegex(#"^\s*Interpretaci[oó]n\b"#, "i")
    private static let qftWordRe = JSRegex(#"\b(NEGATIVO|POSITIVO|INDETERMINADO)\b"#, "i")

    private static func parseTb(_ lineas: [String], _ texto: String) -> String {
        var toks: [String] = []
        for (key, re) in tbRows {
            guard let h = firstLine(lineas, re) else { continue }
            let nums = tbNumRe.allMatches(tbStripRe.replace(h.rest, with: " ")).map(\.whole)
            if nums.isEmpty { continue }
            let val = wsRe.replace(nums[nums.count - 1], with: "")
            let ref = nums.count > 1 && ltStartRe.test(nums[0].jsTrim) ? num(ltWsRe.replace(nums[0], with: "")) : nil
            toks.append(key + " " + flagNum("", val, 0, ref))
        }
        if toks.count == 3, let ih = firstLine(lineas, interpRe), let iq = qftWordRe.firstMatch(ih.rest) {
            return "TB\t" + toks.joined(separator: " ") + " QFT " + qftShort(iq[1] ?? "")
        }
        return parseTbScrambled(texto)
    }

    private static let negStartRe = JSRegex(#"^NEG"#, "i")

    private static func qftShort(_ q: String) -> String {
        negStartRe.test(q) ? "neg" : posRe.test(q) ? "pos*" : "indet*"
    }

    private static let qftGateRe = JSRegex(#"Quantifer[oó]n|Ag-TB1"#, "i")
    private static let scrambledRe = JSRegex(#"([\d.,]+)\s*UI\/mL(?:\s*<\s*([\d.,]+))?"#, "g")

    private static func parseTbScrambled(_ texto: String) -> String {
        if !qftGateRe.test(texto) { return "" }
        let vals = Array(scrambledRe.allMatches(texto).prefix(3))
        if vals.count < 3 { return "" }
        let last = vals[2].end
        let keys = ["TB1", "TB2", "Mit"]
        var toks = vals.enumerated().map { i, v in keys[i] + " " + flagNum("", v[1] ?? "", 0, v[2].flatMap(num)) }
        if let q = qftWordRe.firstMatch(BaseJS.slice(texto, last)) { toks.append("QFT " + qftShort(q[1] ?? "")) }
        return "TB\t" + toks.joined(separator: " ")
    }

    private static let nbspRe = JSRegex("\u{00A0}", "g")
    private static let labClinRe = JSRegex(#"Laboratorio\s+Cl[ií]nico"#, "i")

    /// `parseReumatologiaPanels_(textoBruto)`.
    static func parseReumatologiaPanels(_ textoBruto: String) -> [String] {
        let t = nbspRe.replace(textoBruto, with: " ")
        if !labClinRe.test(t) { return [] }
        let lineas = t.jsLines
        return ([parseInm(lineas)] + parseAuto(lineas) + [parseTb(lineas, t)]).filter { !$0.isEmpty }
    }

    // MARK: reumToSomeShape

    private static let pacRe = JSRegex(#"^[ \t]*Paciente\s*:.*\bId\s*:"#, "im")
    private static let pageSplitRe = JSRegex(#"^(?=[ \t]*Paciente\s*:.*\bId\s*:)"#, "im")
    private static let pacLineRe = JSRegex(#"^[ \t]*Paciente\s*:\s*(.*?)\s+Id\s*:[ \t]*(\S*?)[ \t]+Edad\s*:[ \t]*([^\n\r]*)"#, "im")
    private static let fechaRe = JSRegex(#"\bFecha\s*:\s*(\d{1,2}[-/][A-Za-z0-9]+[-/]\d{2,4})"#, "i")
    private static let horaRe = JSRegex(#"\bHora\s*:\s*(\d{1,2}:\d{2})"#, "i")
    private static let headerLineRe = JSRegex(#"^\s*(?:Servicio\s+de\s+Reumatolog[ií]a\b|Laboratorio\s+Cl[ií]nico\s*$|Paciente\s*:|M[eé]dico\s*:|C[eé]dula\s*:)"#, "i")
    private static let dmyRe = JSRegex(#"^(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{2,4})$"#)
    private static let digitStartRe = JSRegex(#"^\d"#)
    private static let MESES = ["ENE": "01", "FEB": "02", "MAR": "03", "ABR": "04", "MAY": "05", "JUN": "06",
                                "JUL": "07", "AGO": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DIC": "12"]

    private static func pad2(_ s: String) -> String { BaseJS.len(s) < 2 ? String(repeating: "0", count: 2 - BaseJS.len(s)) + s : s }

    private static func fechaDMY(_ raw: String) -> String {
        guard let m = dmyRe.firstMatch(raw) else { return "" }
        let m2 = m[2] ?? "", m3 = m[3] ?? ""
        let mon = digitStartRe.test(m2) ? pad2(m2) : MESES[m2.uppercased()]
        let y = BaseJS.len(m3) == 2 ? "20" + m3 : m3
        guard let mon, !mon.isEmpty else { return "" }
        return pad2(m[1] ?? "") + "/" + mon + "/" + y
    }

    /// `reumToSomeShape(texto, registroPorNombre)`: rewrites Reumatología pages to a SOME-style header
    /// (Expediente/Nombre/Fecha Registro); pages of the same person+date+time are joined. No header -> text unchanged.
    static func reumToSomeShape(_ texto: String, _ registroPorNombre: ((String) -> String?)? = nil) -> String {
        let t = nbspRe.replace(texto, with: " ")
        if !pacRe.test(t) { return texto }
        var groups: [(head: String, bodies: [String])] = []
        var byKey: [String: Int] = [:]
        for chunk in pageSplitRe.split(t) {
            guard let p = pacLineRe.firstMatch(chunk) else { continue }
            let name = p[1] ?? ""
            let fm = fechaRe.firstMatch(chunk)
            let hora = horaRe.firstMatch(chunk).flatMap { $0[1] }
            let fecha = fm.map { fechaDMY($0[1] ?? "") } ?? ""
            var reg = registroPorNombre?(name) ?? ""
            if reg.isEmpty { reg = p[2] ?? "" }
            if reg.isEmpty { reg = "S/N" }
            let key = reg + "|" + fecha + "|" + (hora ?? "")
            let body = chunk.jsLines.filter { !headerLineRe.test($0) }.joined(separator: "\n").jsTrim
            if byKey[key] == nil {
                let head = "Expediente: " + reg + "\nNombre: " + name + "\nEdad: " + (p[3] ?? "").jsTrim + "\nLaboratorio Clínico" +
                    (!fecha.isEmpty ? "\nFecha Registro: " + fecha + (hora != nil ? " " + hora! : "") : "")
                byKey[key] = groups.count
                groups.append((head, []))
            }
            groups[byKey[key]!].bodies.append(body)
        }
        if groups.isEmpty { return texto }
        return groups.map { $0.head + "\n" + $0.bodies.joined(separator: "\n") }.joined(separator: "\n")
    }
}
