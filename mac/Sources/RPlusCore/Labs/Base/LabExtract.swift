import Foundation

/// `{ valor, min, max }` from the extraer* functions. nil min/max = JS null.
struct LabValorRango: Equatable, Sendable {
    var valor: String
    var min: Double? = nil
    var max: Double? = nil
    static let vacio = LabValorRango(valor: "---")
}

/// Port of labs-extract.mjs.
enum LabExtract {
    private static let valorRe = JSRegex(#"-?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d,])|-?\d+[.,]?\d*"#)
    private static let expRe = JSRegex(#"^[eE][+-]?\d"#)
    private static let milesRe = JSRegex(#"^-?\d{1,3}(,\d{3})+(\.\d+)?$"#)
    private static let signRe = JSRegex(#"([<>]) ?$"#)
    static let rangoRe = JSRegex(#"(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)"#)

    /// `matchValorLab_(s)`: first lab number in `s` -> (index of the number, value with a `<`/`>` sign kept), or nil.
    static func matchValorLab(_ s: String) -> (index: Int, valor: String)? {
        guard let m = valorRe.firstMatch(s) else { return nil }
        if expRe.test(BaseJS.slice(s, m.end)) { return nil }
        let v = milesRe.test(m.whole) ? m.whole.replacingOccurrences(of: ",", with: "") : m.whole
        let sign = signRe.firstMatch(BaseJS.slice(s, Swift.max(0, m.index - 2), m.index))
        return (m.index, (sign?[1] ?? "") + v)
    }

    private static let starRe = JSRegex(#"\*"#, "g")
    private static let ineqRe = JSRegex(#"^[<>]\s*"#)

    /// `labValueNumber_(v)`: number of an output value («12.3», «<0.01*») without sign or «*», or nil.
    static func labValueNumber(_ v: String?) -> Double? {
        guard let v else { return nil }
        let s = BaseJS.replaceFirst(ineqRe.replace(starRe.replace(v, with: ""), with: ""), ",", ".")
        guard let n = jsParseFloat(s), n.isFinite else { return nil }
        return n
    }

    /// `extraer(nombres, bloque)`: `nombres` are regex source text.
    static func extraer(_ nombres: [String], _ bloque: String?) -> String {
        guard let bloque, !bloque.isEmpty else { return "---" }
        for nombre in nombres {
            // ponytail: regex built per call (Node caches it in a Map); add a locked cache if profiling shows it.
            let re = JSRegex(nombre + #"[^0-9-]{0,60}(-?\d+\.?\d*)"#, "i")
            if let m = re.firstMatch(bloque) { return m[1] ?? "" }
        }
        return "---"
    }

    private static let trailingSpaceRe = JSRegex(#"\s$"#)
    private static let trailingSpacesRe = JSRegex(#"\s+$"#)

    private static func nombreConBoundary(_ nombre: String) -> String {
        let esc = BaseJS.escapeRegex(nombre)
        return trailingSpaceRe.test(nombre) ? trailingSpacesRe.replace(esc, with: #"\s"#) : esc
    }

    /// `esValorDelRango_(mValor, mRango)`.
    static func esValorDelRango(_ mValor: (index: Int, valor: String), _ mRango: JSRegex.Match?) -> Bool {
        mRango != nil && mValor.index == mRango!.index
    }

    private static func num(_ s: String?) -> Double? { jsParseFloat(BaseJS.replaceFirst(s ?? "", ",", ".")) }

    private static func conRango(_ valor: String, _ mRango: JSRegex.Match?) -> LabValorRango {
        guard let mRango else { return LabValorRango(valor: valor) }
        return LabValorRango(valor: valor, min: num(mRango[1]), max: num(mRango[2]))
    }

    /// `extraerConRango(nombres, texto)`.
    static func extraerConRango(_ nombres: [String], _ texto: String?) -> LabValorRango {
        guard let texto, !texto.isEmpty else { return .vacio }
        let t = texto.uppercased()
        for n in nombres {
            let nombre = n.uppercased()
            guard let m = JSRegex(nombreConBoundary(nombre)).firstMatch(t) else { continue }
            let start = m.index + BaseJS.len(nombre)
            let sub = BaseJS.substring(texto, start, start + 220)
            guard let mValor = matchValorLab(sub) else { continue }
            let mRango = rangoRe.firstMatch(sub)
            if esValorDelRango(mValor, mRango) { continue }
            return conRango(mValor.valor, mRango)
        }
        return .vacio
    }

    private static let urinarioRe = JSRegex(#"^\s*(EN\s+ORINA|URINARIO|URINARIA)\b"#)
    private static func esContextoUrinario(_ texto: String, _ idx: Int, _ len: Int) -> Bool {
        urinarioRe.test(BaseJS.substring(texto, idx + len, idx + len + 48).uppercased())
    }

    private static let fraccionColRe = JSRegex(#"^\s*(HDL|LDL)\b"#)
    private static func esFraccionColesterol(_ texto: String, _ idx: Int, _ len: Int) -> Bool {
        fraccionColRe.test(BaseJS.substring(texto, idx + len, idx + len + 16).uppercased())
    }

    private static let depuracionRe = JSRegex(#"DEPURACION\s+DE\s*$"#)
    private static func esDepuracionCreatinina(_ texto: String, _ idx: Int) -> Bool {
        depuracionRe.test(BaseJS.substring(texto, Swift.max(0, idx - 16), idx).uppercased())
    }

    private static let marcasOrinaNombres = ["URIANALISIS", "EXAMEN GENERAL DE ORINA", "ANALISIS DE ORINA"]

    private static func marcasOrina(_ t: String) -> [(Int, Int)] {
        var out: [(Int, Int)] = []
        for m in marcasOrinaNombres {
            var p = BaseJS.indexOf(t, m)
            while p != -1 { out.append((p, p + BaseJS.len(m))); p = BaseJS.indexOf(t, m, p + 1) }
        }
        return out
    }

    private static let campoRe = JSRegex(#"\/CAMPO\b"#, "i")
    private static let unidadOrinaRe = JSRegex(#"Leucocitos\/uL|Hem\/uL|E\.U\.\/dL"#, "i")
    private static let bhMarcaRe = JSRegex(#"BIOMETRIA\s+HEMATICA|\bHGB\b|\bWBC\b|\bRBC\s+\d|\bPLT\s+\d"#, "i")

    private static func esContextoSedimentoOrina(_ texto: String, _ idx: Int, _ len: Int, _ t: String, _ marcas: [(Int, Int)]) -> Bool {
        let w = BaseJS.substring(texto, idx, Swift.min(BaseJS.len(texto), idx + len + 120))
        if campoRe.test(w) { return true }
        if unidadOrinaRe.test(w) { return true }
        let ini = Swift.max(0, idx - 4500)
        var lastOrina = -1, hay = false
        for (a, b) in marcas where a >= ini && b <= idx {
            hay = true
            if a > lastOrina { lastOrina = a }
        }
        if !hay { return false }
        return !bhMarcaRe.test(BaseJS.substring(t, lastOrina, idx))
    }

    /// `extraerConRangoBH(nombres, texto)`: skips urine sediment ERITROCITOS/LEUCOCITOS.
    static func extraerConRangoBH(_ nombres: [String], _ texto: String?) -> LabValorRango {
        guard let texto, !texto.isEmpty else { return .vacio }
        let t = texto.uppercased()
        let marcas = marcasOrina(t)
        for n in nombres {
            let nombre = n.uppercased(), len = BaseJS.len(nombre)
            var start = 0
            while true {
                let idx = BaseJS.indexOf(t, nombre, start)
                if idx == -1 { break }
                start = idx + len
                if esContextoSedimentoOrina(texto, idx, len, t, marcas) { continue }
                let sub = BaseJS.substring(texto, idx + len, idx + len + 220)
                guard let mValor = matchValorLab(sub) else { continue }
                let mRango = rangoRe.firstMatch(sub)
                if esValorDelRango(mValor, mRango) { continue }
                return conRango(mValor.valor, mRango)
            }
        }
        return .vacio
    }

    private static let glicosiladaRe = JSRegex(#"^\s*GLICOSILADA"#, "i")

    private static func esOcurrenciaExcluidaSuero(_ texto: String, _ idx: Int, _ nombre: String) -> Bool {
        let len = BaseJS.len(nombre)
        if esContextoUrinario(texto, idx, len) { return true }
        if nombre == "COLESTEROL" && esFraccionColesterol(texto, idx, len) { return true }
        if nombre == "CREATININA" && esDepuracionCreatinina(texto, idx) { return true }
        if nombre == "HEMOGLOBINA" && glicosiladaRe.test(BaseJS.substring(texto, idx + len, idx + len + 16)) { return true }
        return false
    }

    private static func extraerValorRangoTrasIndice(_ texto: String, _ subStart: Int) -> LabValorRango? {
        let sub = BaseJS.substring(texto, subStart, subStart + 220)
        guard let mValor = matchValorLab(sub) else { return nil }
        let mRango = rangoRe.firstMatch(sub)
        if esValorDelRango(mValor, mRango) { return nil }
        return conRango(mValor.valor, mRango)
    }

    /// `extraerConRangoSuero(nombres, texto)`: skips urine context, HDL/LDL, 24 h clearance, HbA1c.
    static func extraerConRangoSuero(_ nombres: [String], _ texto: String?) -> LabValorRango {
        guard let texto, !texto.isEmpty else { return .vacio }
        let t = texto.uppercased()
        for n in nombres {
            let nombre = n.uppercased()
            var start = 0
            while true {
                let idx = BaseJS.indexOf(t, nombre, start)
                if idx == -1 { break }
                start = idx + BaseJS.len(nombre)
                if esOcurrenciaExcluidaSuero(texto, idx, nombre) { continue }
                if let r = extraerValorRangoTrasIndice(texto, idx + BaseJS.len(nombre)) { return r }
            }
        }
        return .vacio
    }

    private static let riesgoRe = JSRegex(#"(\d+[.,]?\d*)\s*RIESGO"#)

    /// `extraerIndiceAterogenico_(texto)`: value + «N RIESGO PROM.» threshold.
    static func extraerIndiceAterogenico(_ texto: String?) -> LabValorRango {
        guard let texto, !texto.isEmpty else { return .vacio }
        let t = texto.uppercased()
        for n in ["INDICE ATEROGENICO", "ÍNDICE ATEROGÉNICO", "INDICE ATEROGÉNICO"] {
            let nombre = n.uppercased(), len = BaseJS.len(nombre)
            var start = 0
            while true {
                let idx = BaseJS.indexOf(t, nombre, start)
                if idx == -1 { break }
                let sub = BaseJS.substring(texto, idx + len, idx + len + 220)
                guard let mValor = matchValorLab(sub) else { start = idx + len; continue }
                if let mRiesgo = riesgoRe.firstMatch(sub) {
                    return LabValorRango(valor: mValor.valor, min: 0, max: num(mRiesgo[1]))
                }
                return conRango(mValor.valor, rangoRe.firstMatch(sub))
            }
        }
        return .vacio
    }

    // MARK: coagulación

    private static let coagRowBoundaries = [
        "TIEMPO DE PROTROMBINA", "TIEMPO DE TROMBOPLASTINA", "INR", "FIBRINOGENO", "FIBRINÓGENO",
        "DIMERO D", "D-DIMERO", "D DIMERO", "TESTIGO", "OBSERVACIONES", "FROTIS", "DIFERENCIAL", "BIOMETRIA",
    ]

    private static let coagTitleRe = JSRegex(#"^\s*Y\s+TROMBO"#)
    private static func isCoagPanelTitleAfter(_ tUpper: String, _ idx: Int, _ len: Int) -> Bool {
        coagTitleRe.test(BaseJS.substring(tUpper, idx + len, idx + len + 24))
    }

    private static let inrRe = JSRegex(#"(?:^|[^A-Z0-9])INR(?![A-Z0-9])"#, "g")
    private static func findCoagBoundaryPos(_ tUpper: String, _ fromIdx: Int, _ bound: String) -> Int {
        if bound != "INR" { return BaseJS.indexOf(tUpper, bound, fromIdx) }
        let slice = BaseJS.substring(tUpper, fromIdx)
        guard let m = inrRe.firstMatch(slice) else { return -1 }
        return fromIdx + m.index + BaseJS.indexOf(m.whole, "INR")
    }

    private static func coagWindowEnd(_ tUpper: String, _ fromIdx: Int, _ nombre: String) -> Int {
        var end = Swift.min(BaseJS.len(tUpper), fromIdx + 220)
        let nombreU = nombre.uppercased()
        for bound in coagRowBoundaries where bound != nombreU {
            let pos = findCoagBoundaryPos(tUpper, fromIdx, bound)
            if pos > fromIdx && pos < end { end = pos }
        }
        return end
    }

    private static let testigoRe = JSRegex(#"TESTIGO[\s\S]*$"#, "i")
    private static let membreteRe = JSRegex(#"\b(?:Campo|Labo)\s*-?\d+"#, "gi")

    private static func parseCoagValorRango(_ sub: String) -> LabValorRango? {
        if sub.isEmpty { return nil }
        let clean = membreteRe.replace(testigoRe.replace(sub, with: " "), with: " ")
        let mRango = rangoRe.firstMatch(clean)
        let beforeRango = mRango.map { BaseJS.substring(clean, 0, $0.index) } ?? clean
        guard let mValor = matchValorLab(beforeRango) else { return nil }
        return LabValorRango(valor: mValor.valor, min: mRango.flatMap { num($0[1]) }, max: mRango.flatMap { num($0[2]) })
    }

    private static let fibNombreRe = JSRegex(#"^FIBRIN[OÓ]GENO$"#)
    private static let uefRe = JSRegex(#"\bUEF\b"#)
    private static let equivalentesRe = JSRegex(#"EQUIVALENTES\s+DE\s*$"#, "i")
    private static let alnumRe = JSRegex(#"[A-Z0-9]"#)

    private static func isUefFibrinogenoMatch(_ tUpper: String, _ idx: Int) -> Bool {
        let before = BaseJS.substring(tUpper, Swift.max(0, idx - 48), idx)
        if uefRe.test(before) { return true }
        return equivalentesRe.test(before) // Node trims the end first; `\s*$` already allows it.
    }

    private static func shouldSkipCoagMatch(_ tUpper: String, _ nombre: String, _ idx: Int) -> Bool {
        if nombre == "TIEMPO DE PROTROMBINA" && isCoagPanelTitleAfter(tUpper, idx, BaseJS.len(nombre)) { return true }
        if fibNombreRe.test(nombre) && isUefFibrinogenoMatch(tUpper, idx) { return true }
        if nombre != "INR" { return false }
        let before = idx - 1 < 0 ? " " : BaseJS.charAt(tUpper, idx - 1)
        let after = BaseJS.charAt(tUpper, idx + 3)
        return alnumRe.test(before.isEmpty ? " " : before) || alnumRe.test(after.isEmpty ? " " : after)
    }

    private static func tryParseCoagAt(_ texto: String, _ tUpper: String, _ nombre: String, _ idx: Int, _ maxInr: Double) -> LabValorRango? {
        if shouldSkipCoagMatch(tUpper, nombre, idx) { return nil }
        let subStart = idx + BaseJS.len(nombre)
        guard let parsed = parseCoagValorRango(BaseJS.substring(texto, subStart, coagWindowEnd(tUpper, subStart, nombre))) else { return nil }
        if nombre == "INR", let n = labValueNumber(parsed.valor), n > maxInr { return nil }
        if fibNombreRe.test(nombre) {
            let fibN = labValueNumber(parsed.valor)
            if fibN == nil || fibN! < 10 || fibN! > 2000 { return nil }
        }
        return parsed
    }

    /// `extraerConRangoCoag(nombres, texto, opts)`: does not cross into the next study; `maxInr` default 8.
    static func extraerConRangoCoag(_ nombres: [String], _ texto: String?, maxInr: Double = 8) -> LabValorRango {
        guard let texto, !texto.isEmpty else { return .vacio }
        let t = texto.uppercased()
        for n in nombres {
            let nombre = n.uppercased()
            var start = 0
            while true {
                let idx = BaseJS.indexOf(t, nombre, start)
                if idx == -1 { break }
                if let parsed = tryParseCoagAt(texto, t, nombre, idx, maxInr) { return parsed }
                start = idx + BaseJS.len(nombre)
            }
        }
        return .vacio
    }

    /// `extraerConRangoPanel(nombres, texto)`: removes repeats of the name in the window (T4, C3, B12, CA 125).
    static func extraerConRangoPanel(_ nombres: [String], _ texto: String?) -> LabValorRango {
        guard let texto, !texto.isEmpty else { return .vacio }
        let t = texto.uppercased()
        for n in nombres {
            let nombre = n.uppercased(), len = BaseJS.len(nombre)
            let idx = BaseJS.indexOf(t, nombre)
            if idx == -1 { continue }
            let sub = BaseJS.substring(texto, idx + len, idx + len + 260)
            let stripped = JSRegex(BaseJS.escapeRegex(nombre), "gi").replace(sub, with: " ")
            guard let mValor = matchValorLab(stripped) else { continue }
            let mRango = rangoRe.firstMatch(stripped)
            if esValorDelRango(mValor, mRango) { continue }
            return conRango(mValor.valor, mRango)
        }
        return .vacio
    }

    /// `marcarSegunRango(valorStr, min, max)`: appends «*» when out of [min, max].
    static func marcarSegunRango(_ valorStr: String, _ min: Double?, _ max: Double?) -> String {
        if valorStr == "---" { return valorStr }
        guard let v = labValueNumber(valorStr), let min, let max else { return valorStr }
        return (v < min || v > max) ? valorStr + "*" : valorStr
    }

    private static let signStartRe = JSRegex(#"^[<>]"#)

    /// `fmt(val)`: normalizes the number (keeps `<`/`>` and «*»).
    static func fmt(_ val: String) -> String {
        if val.isEmpty || val == "---" { return val }
        let star = val.hasSuffix("*")
        let body = star ? BaseJS.slice(val, 0, -1) : val
        let sign = signStartRe.test(body) ? BaseJS.charAt(body, 0) : ""
        guard let n = jsParseFloat(BaseJS.replaceFirst(BaseJS.slice(body, BaseJS.len(sign)), ",", ".")) else { return val }
        return sign + jsString(n) + (star ? "*" : "")
    }

    /// `fmtLabRanged_(data, fieldKey, priorRefs, defaults)`: report range, then prior refs, then defaults
    /// (`DEFAULT_LAB_REFS` when `defaults` is nil).
    static func fmtLabRanged(_ data: LabValorRango, _ fieldKey: String, _ priorRefs: [String: [Double]]?, _ defaults: [String: [Double]]? = nil) -> String {
        if data.valor == "---" { return data.valor }
        guard let range = LabRefs.resolveLabFieldRange(data, fieldKey, priorRefs, defaults) else { return fmt(data.valor) }
        return fmt(marcarSegunRango(data.valor, range.min, range.max))
    }

    /// `toNum_(v)`: number for derived values (eTFG, BUN/Cr, AG). «<x»/«>x» -> nil.
    static func toNum(_ v: String?) -> Double? {
        guard let v, v != "---" else { return nil }
        return jsParseFloat(BaseJS.replaceFirst(v, ",", "."))
    }
}
