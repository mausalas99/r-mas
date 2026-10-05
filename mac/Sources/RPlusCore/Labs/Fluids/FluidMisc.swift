import Foundation

/// Port of labs-fluidos-misc.mjs, labs-ego-parse.mjs, labs-ego-parse-helpers.mjs, labs-grupo-sangre.mjs.
enum FluidMisc {
    private static let starGRe = JSRegex(#"\*"#, "g")
    private static let headerRe = JSRegex(#"^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$"#, "i")
    private static let numOnlyRe = JSRegex(#"^\d+(\.\d+)?$"#)
    private static let abhlRe = JSRegex(#"^[ABHL]$"#)
    private static let punctOnlyRe = JSRegex(#"^[-–:/.]+$"#)
    private static let signedNumRe = JSRegex(#"^(-?\d+[.,]?\d*)"#)
    private static let tabRestRe = JSRegex(#"\t.*$"#)
    private static let tabRest2Re = JSRegex(#"\t.*"#)
    private static let wsGRe = JSRegex(#"\s+"#, "g")

    private static func lines(_ t: String, strip: Bool) -> [String] {
        t.jsLines.map { (strip ? starGRe.replace($0, with: "") : $0).jsTrim }
    }

    // MARK: heces

    private static let hecesRows: [(String, String)] = [
        ("ASPECTO", "Asp"), ("PH", "pH"), ("PROTEINAS", "Prot"), ("GLUCOSA", "Glu"), ("LEUCOCITOS", "Leu"),
        ("ERITROCITOS", "Eri"), ("GRASA", "Grasa"), ("FIBRAS MUSCULARES", "Fibra"),
        ("COPROPARASITOSCOPICO INMEDIATO", "Copro"), ("OBSERVACIONES", "Obs"),
    ]
    private static let hecesStopRe = JSRegex(#"^(BACTERIOLOGIA|HEMATOLOGIA|QUIMICA CLINICA|INMUNOLOGIA|GASOMETRIA|COAGULACION|URIANALISIS|EXAMEN GENERAL DE ORINA|CULTIVO)\b"#, "i")
    private static let firmaRe = JSRegex(#"^(DRA?\.?\s|Q\.?\s?F\.?\s?B\b|C[EÉ]D(ULA|\.)?\s)"#, "i")

    private static func nextMeaningfulInBlock(_ b: [String], _ iStart: Int, _ maxStep: Int, _ skipNumericOnly: Bool) -> String {
        var k = iStart + 1
        while k < min(iStart + maxStep, b.count) {
            let txt = starGRe.replace(b[k], with: "").jsTrim
            k += 1
            if txt.isEmpty || txt == ":" { continue }
            if headerRe.test(txt) { continue }
            if skipNumericOnly && numOnlyRe.test(txt) { continue }
            return txt
        }
        return ""
    }

    static func parseFisicoquimicoHeces(_ textoBruto: String) -> String {
        if textoBruto.isEmpty || !textoBruto.uppercased().contains("FISICOQUIMICO DE HECES") { return "" }
        let lineas = lines(textoBruto, strip: false)
        guard let i0 = lineas.firstIndex(where: { $0.uppercased().contains("FISICOQUIMICO DE HECES") }) else { return "" }
        var i1 = lineas.count
        for j in (i0 + 1)..<max(lineas.count, i0 + 1) where hecesStopRe.test(lineas[j]) || firmaRe.test(lineas[j]) {
            i1 = j
            break
        }
        let bloque = Array(lineas[i0..<i1])
        var p: [String] = []
        for (key, out) in hecesRows {
            var v = ""
            if let bi = bloque.firstIndex(where: { $0.uppercased().hasPrefix(key) }) {
                v = nextMeaningfulInBlock(bloque, bi, 7, false)
                if key == "ASPECTO" && numOnlyRe.test(v) {
                    let v2 = nextMeaningfulInBlock(bloque, bi, 10, true)
                    if !v2.isEmpty { v = v + " " + v2 }
                }
                v = v.uppercased()
            }
            if !v.isEmpty { p += [out, v] }
        }
        return p.isEmpty ? "" : "HECES\t" + p.joined(separator: " ")
    }

    // MARK: frotis

    private static let frotisLineRe = JSRegex(#"^FROTIS DE SANGRE PERIFERICA$"#, "i")
    private static let commaSplitRe = JSRegex(#"\s*,\s*"#)
    private static let plaqRe = JSRegex(#"PLAQUET|MACROPLAQUET"#, "i")
    private static let calRe = JSRegex(#"HIPOCROM|ANISOCIT|POIKILOCIT|ESFEROCIT|ELIPT|DACRIOCIT|ESQUIZOCIT|BITE|ROD|HELIN|CABEZA|CUELLO|CABEZA DE FLECHA|POLICROM|NORMOCROM|NORMOCIT|MACROCIT|MICROCIT|\+"#, "i")
    private static let plaqDismRe = JSRegex(#"PLAQUETAS\s+DISMINUIDAS"#, "i")
    private static let obsRe = JSRegex(#"^OBSERVACIONES$"#, "i")
    private static let abhlIRe = JSRegex(#"^[ABHL]$"#, "i")
    private static let frotisStopRe = JSRegex(#"^FROTIS|TIEMPO DE|FIBRINOGENO|DIMERO|HEMATOLOGIA"#, "i")
    private static let plaquetasRe = JSRegex(#"PLAQUETAS"#, "i")

    static func parseFrotisSangre(_ textoBruto: String) -> String {
        let key = "FROTIS DE SANGRE PERIFERICA"
        if textoBruto.isEmpty || !textoBruto.uppercased().contains(key) { return "" }
        let lineas = lines(textoBruto, strip: false)
        guard let i0 = lineas.firstIndex(where: { $0.uppercased().contains(key) }) else { return "" }
        func nextMeaningful(_ iStart: Int, _ maxStep: Int) -> String {
            var j = iStart + 1
            while j < min(iStart + maxStep, lineas.count) {
                let txt = starGRe.replace(lineas[j], with: "").jsTrim
                j += 1
                if txt.isEmpty || txt == ":" || headerRe.test(txt) || frotisLineRe.test(txt) { continue }
                return txt
            }
            return ""
        }
        var desc = ""
        var k = i0
        while k < min(i0 + 20, lineas.count) {
            if lineas[k].uppercased().hasPrefix(key) {
                desc = nextMeaningful(k, 8)
                if !desc.isEmpty { break }
            }
            k += 1
        }
        if desc.isEmpty { return "" }
        var out = formatFrotisSangreLines(desc)
        let plaqObs = extraerObservacionPlaquetasHema(textoBruto)
        if !plaqObs.isEmpty {
            out = !out.isEmpty ? out + "\nFROTIS\tPlaqObs " + plaqObs : "FROTIS\tPlaqObs " + plaqObs
        }
        return out
    }

    private static func extraerObservacionPlaquetasHema(_ textoBruto: String) -> String {
        if textoBruto.isEmpty || !plaqDismRe.test(textoBruto) { return "" }
        let lineas = lines(textoBruto, strip: true)
        for i in lineas.indices where obsRe.test(lineas[i]) {
            var j = i + 1
            while j < min(i + 6, lineas.count) {
                let t = lineas[j]
                j += 1
                if t.isEmpty || abhlIRe.test(t) { continue }
                if frotisStopRe.test(t) { break }
                if plaquetasRe.test(t) { return t.uppercased() }
            }
        }
        return "PLAQUETAS DISMINUIDAS"
    }

    private static func formatFrotisSangreLines(_ desc: String) -> String {
        let up = desc.uppercased().jsTrim
        if up.isEmpty { return "" }
        var cal: [String] = [], plaq: [String] = [], otros: [String] = []
        for chunk in commaSplitRe.split(up) {
            let c = chunk.jsTrim
            if c.isEmpty { continue }
            if plaqRe.test(c) { plaq.append(c) } else if calRe.test(c) { cal.append(c) } else { otros.append(c) }
        }
        var ls: [String] = []
        if !cal.isEmpty { ls.append("FROTIS\tCal " + cal.joined(separator: ", ")) }
        if !plaq.isEmpty { ls.append("FROTIS\tPlaq " + plaq.joined(separator: ", ")) }
        if !otros.isEmpty { ls.append("FROTIS\tObs " + otros.joined(separator: ", ")) }
        if ls.isEmpty { ls.append("FROTIS\tObs " + up) }
        return ls.joined(separator: "\n")
    }

    // MARK: plaquetas citrato

    private static let pltCitRe = JSRegex(#"PLAQUETAS\s+CON\s+CITRATO"#, "i")
    private static let pltCitBlockRe = JSRegex(#"PLAQUETAS\s+CON\s+CITRATO[\s\S]*?(?=\n\s*(?:HEMATOLOGIA|QUIMICA\s+CLINICA|URIANALISIS|BACTERIOLOGIA|GASOMETRIA|BIOMETRIA|COAGULACION)\b|$)"#, "i")

    static func parsePlaquetasCitrato(_ textoBruto: String, _ tNorm: String, _ priorRefs: [String: [Double]]?) -> String {
        if tNorm.isEmpty || !pltCitRe.test(tNorm) { return "" }
        let bloque = pltCitBlockRe.firstMatch(textoBruto).map { wsGRe.replace($0.whole, with: " ") } ?? tNorm
        let plt = LabExtract.extraerConRango(["CUENTA DE PLAQUETAS", "PLT "], bloque)
        if plt.valor == "---" { return "" }
        return "PltCit\tPlt " + LabExtract.fmtLabRanged(plt, "Plt", priorRefs)
    }

    // MARK: serología banco de sangre

    private static let scoRe = JSRegex(#"^S\/CO$"#, "i")
    private static let qualRefRe = JSRegex(#"^(Positivo|Indeterminado|Negativo)\s*[<>=]"#, "i")
    private static let anticuerposRe = JSRegex(#"^(Anticuerpos|Ant[ií]geno)\b"#, "i")
    private static let scoNumRe = JSRegex(#"^(\d+\.\d+|\d+)$"#)
    private static let qualRe = JSRegex(#"^(NEGATIVO|POSITIVO|INDETERMINADO)$"#, "i")
    private static let trailZerosRe = JSRegex(#"0+$"#)
    private static let trailDotRe = JSRegex(#"\.$"#)
    private static let bancoRe = JSRegex(#"^BANCO\s+DE\s+SANGRE$"#, "i")
    private static let hivRe = JSRegex(#"HIV\s*1\s*\/\s*HIV\s*2"#, "i")
    private static let vhcRe = JSRegex(#"ANTI\s+VIRUS\s+DE\s+LA\s+HEPATITIS\s+C"#, "i")
    private static let hbsRe = JSRegex(#"ANTIGENO\s+DE\s+SUPERFICIE.*HEPATITIS\s+B"#, "i")
    private static let estudios: [(String, [JSRegex])] = [
        ("VIH", [hivRe, JSRegex(#"\bANTI\s+HIV"#, "i")]),
        ("VHC", [vhcRe, JSRegex(#"HEPATITIS\s+C"#, "i")]),
        ("HBsAg", [hbsRe, JSRegex(#"\bHBSAG\b"#, "i")]),
    ]

    private static func formatSerolSco(_ raw: String) -> String {
        guard let n = jsParseFloat(BaseJS.replaceFirst(raw, ",", ".")), n.isFinite else { return raw.jsTrim }
        return trailDotRe.replace(trailZerosRe.replace(jsToFixed(n, 3), with: ""), with: "")
    }

    private static func readSerolQual(_ lineas: [String], _ i: Int) -> (sco: String?, qual: String)? {
        var sco: String?
        var qual = ""
        var j = i + 1
        while j < min(i + 12, lineas.count) {
            let t = starGRe.replace(lineas[j], with: "").jsTrim
            j += 1
            if t.isEmpty || t == ":" || headerRe.test(t) || scoRe.test(t) || qualRefRe.test(t) { continue }
            if anticuerposRe.test(t) { break }
            if let m = scoNumRe.firstMatch(t), sco == nil { sco = m[1]; continue }
            if let m = qualRe.firstMatch(t) { qual = (m[1] ?? "").uppercased(); break }
        }
        return qual.isEmpty ? nil : (sco, qual)
    }

    static func parseSerologiaBancoSangre(_ textoBruto: String) -> String {
        if textoBruto.isEmpty { return "" }
        if !textoBruto.uppercased().contains("BANCO DE SANGRE") && !(hivRe.test(textoBruto) || vhcRe.test(textoBruto) || hbsRe.test(textoBruto)) { return "" }
        let lineas = lines(textoBruto, strip: false)
        let start = lineas.firstIndex(where: { bancoRe.test($0) }) ?? 0
        var parts: [String] = []
        for (key, patterns) in estudios {
            var res: (sco: String?, qual: String)?
            for i in start..<max(lineas.count, start) {
                let line = tabRestRe.replace(lineas[i], with: "").jsTrim
                if line.isEmpty || !patterns.contains(where: { $0.test(line) }) { continue }
                res = readSerolQual(lineas, i)
                break
            }
            guard let res else { continue }
            let q: String
            switch res.qual {
            case "NEGATIVO": q = "neg"
            case "POSITIVO": q = "pos*"
            case "INDETERMINADO": q = "indet*"
            default: q = ""
            }
            if q.isEmpty { continue }
            var token = key + " " + q
            if let sco = res.sco { token += " (" + formatSerolSco(sco) + ")" }
            parts.append(token)
        }
        return parts.isEmpty ? "" : "SEROL\t" + parts.joined(separator: " ")
    }

    // MARK: orina

    private static let upperLetterRe = JSRegex(#"^[A-Z]$"#)
    private static let numDotRe = JSRegex(#"^(\d+\.?\d*)"#)
    private static let cuantNextRe = JSRegex(#"\n(?:HEMATOLOGIA|BACTERIOLOGIA|CULTIVO|EXAMEN GENERAL|GASOMETRIA|BIOMETRIA)\b"#, "i")
    private static let orina12Re = JSRegex(#"orina\s+de\s+12"#, "i")

    private static func readNumericFromLines(_ lineas: [String], _ i: Int, _ maxLook: Int) -> String {
        var j = i + 1
        while j < min(i + maxLook, lineas.count) {
            let v = lineas[j]
            j += 1
            if v.isEmpty || upperLetterRe.test(v) { continue }
            if let m = numDotRe.firstMatch(v) { return m[1] ?? "" }
        }
        return "---"
    }

    static func parseCuantOrina(_ textoBruto: String) -> String {
        let startIdx = BaseJS.indexOf(textoBruto.uppercased(), "CUANTIFICACION PROTEINAS")
        if startIdx == -1 { return "" }
        var bloque = BaseJS.substring(textoBruto, startIdx)
        if let ns = cuantNextRe.firstMatch(bloque), ns.index > 0 { bloque = BaseJS.substring(bloque, 0, ns.index) }
        let lineas = bloque.jsLines.map { tabRest2Re.replace(starGRe.replace($0, with: ""), with: "").jsTrim }
        var vol = "---", res = "---"
        for i in lineas.indices {
            let lUp = lineas[i].uppercased()
            if lUp.contains("VOLUMEN") { vol = readNumericFromLines(lineas, i, 6) }
            if lUp == "RESULTADO" { res = readNumericFromLines(lineas, i, 6) }
        }
        if res == "---" { return "" }
        let tipo = orina12Re.test(bloque) ? "12h" : "24h"
        var parts: [String] = []
        if vol != "---" { parts.append("Vol " + vol + "ml") }
        parts += ["Prot", res + "*", "gr/vol"]
        if vol != "---" {
            // calcularIndiceProteinCreatinina_
            if let crU = valorTrasEtiqueta(lines(textoBruto, strip: true), ["CREATININA EN ORINA"]) {
                let mgdl = ((jsParseFloat(res) ?? .nan) * 100000) / (jsParseFloat(vol) ?? .nan)
                let ratio = mgdl / (jsParseFloat(crU) ?? .nan)
                if ratio.isFinite { parts += ["IPC", jsToFixed(ratio, 2)] }
            }
        }
        return "Prot" + tipo + "\t" + parts.joined(separator: " ")
    }

    private static func valorTrasUltimaEtiqueta(_ lineas: [String], _ etiqueta: String) -> String? {
        let lbl = etiqueta.uppercased()
        guard let idx = lineas.lastIndex(where: { $0.uppercased() == lbl }) else { return nil }
        var j = idx + 1
        while j < min(idx + 10, lineas.count) {
            let l = lineas[j].jsTrim
            j += 1
            if l.isEmpty || abhlRe.test(l) || punctOnlyRe.test(l) { continue }
            if let m = signedNumRe.firstMatch(l) { return BaseJS.replaceFirst(m[1] ?? "", ",", ".") }
        }
        return nil
    }

    static func parseDepuracionCreatinina(_ textoBruto: String) -> String {
        if textoBruto.isEmpty || !textoBruto.uppercased().contains("DEPURACION DE CREATININA") { return "" }
        let lineas = lines(textoBruto, strip: true)
        var parts: [String] = []
        if let v = valorTrasEtiqueta(lineas, ["TIEMPO"]), !v.isEmpty { parts += ["Tiempo", v + "min"] }
        if let v = valorTrasUltimaEtiqueta(lineas, "DEPURACION DE CREATININA"), !v.isEmpty { parts += ["Dep", v + "ml/min"] }
        if let v = valorTrasEtiqueta(lineas, ["CREATININA SERICA"]), !v.isEmpty { parts += ["CrS", v] }
        if let v = valorTrasEtiqueta(lineas, ["CREATININA EN ORINA"]), !v.isEmpty { parts += ["CrU", v] }
        return parts.isEmpty ? "" : "DepCr\t" + parts.joined(separator: " ")
    }

    private static let clOrinaRe = JSRegex(#"CLORO\s+EN\s+ORINA\s*:?\s*(\d+[.,]?\d*)"#, "i")

    static func parseElectrolitosOrina(_ textoBruto: String) -> String {
        if textoBruto.isEmpty { return "" }
        let lineas = lines(textoBruto, strip: true)
        let na = valorTrasEtiqueta(lineas, ["SODIO EN ORINA"])
        let k = valorTrasEtiqueta(lineas, ["POTASIO EN ORINA"])
        let cr = textoBruto.uppercased().contains("DEPURACION DE CREATININA") ? nil : valorTrasEtiqueta(lineas, ["CREATININA EN ORINA"])
        let cl = clOrinaRe.firstMatch(textoBruto).map { BaseJS.replaceFirst($0[1] ?? "", ",", ".") }
        var parts: [String] = []
        for (lbl, v) in [("Na", na), ("K", k), ("Cl", cl), ("Cr", cr)] {
            if let v, !v.isEmpty { parts += [lbl, v] }
        }
        return parts.isEmpty ? "" : "EU\t" + parts.joined(separator: " ")
    }

    // MARK: EGO helpers

    private static let egoSkipSearch = JSRegex(#"^(N\/A|EstudioResultado|ESTUDIO|SEDIMENTO|QUIMICO|FISICO|MICROSCOPICO|URIANALISIS|EXAMEN GENERAL|OBSERVACIONES)"#, "i")
    private static let egoSkipLabel = JSRegex(#"^(N\/A|Estudio|Resultado|Unidades|Valor de Referencia|VALOR DE REF)"#, "i")
    private static let egoAbbrev: [String: String] = [
        "NEGATIVO": "NEG", "NEGATIVE": "NEG", "POSITIVO": "POS", "POSITIVE": "POS", "AUSENTES": "AUS", "AUSENTE": "AUS",
        "ESCASAS": "ESC", "ESCASO": "ESC", "MODERADAS": "MOD", "MODERADO": "MOD", "ABUNDANTES": "ABD", "ABUNDANTE": "ABD",
        "AMARILLO": "AMAR", "TURBIO": "TURB", "CLARO": "CLARO",
    ]

    static func valorTrasEtiqueta(_ lineas: [String], _ etiquetas: [String]) -> String? {
        for e in etiquetas {
            let lbl = e.uppercased()
            for i in lineas.indices where lineas[i].uppercased() == lbl {
                var j = i + 1
                while j < min(i + 10, lineas.count) {
                    let l = lineas[j].jsTrim
                    j += 1
                    if l.isEmpty || abhlRe.test(l) || egoSkipLabel.test(l) || punctOnlyRe.test(l) { continue }
                    if let m = signedNumRe.firstMatch(l) { return BaseJS.replaceFirst(m[1] ?? "", ",", ".") }
                }
            }
        }
        return nil
    }

    private static let unidadEgoRe = JSRegex(#"^(Hem\/uL|Leucocitos\/uL|E\.U\.\/dL|mOsm\/L|mg\/dL|mmol\/L|g\/dL|\/CAMPO|K\/uL|fL|pg|uL|U\/L|SEG\.?)$"#, "i")
    private static let unitPairRe = JSRegex(#"^[a-zA-Z]+\/[a-zA-Z]+$"#)
    private static let monthRe = JSRegex(#"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)"#, "i")
    private static let refRangeRe = JSRegex(#"^\d[\d.,]*\s+[-–]\s+\d[\d.,]*$"#)
    private static let rangeSlashRe = JSRegex(#"^\d+[-–]\d+\/"#)
    private static let rangeRe = JSRegex(#"^\d+[-–]\d+$"#)
    private static let fourDigitsRe = JSRegex(#"\d{4,}"#)
    private static let valorRefRe = JSRegex(#"VALOR DE REF"#, "i")
    private static let egoPunctRe = JSRegex(#"^[:\-/.\s]+$"#)

    private static func tryParseEgoValue(_ l: String) -> String? {
        if let m = monthRe.firstMatch(l) { return m[1] }
        if unidadEgoRe.test(l) || unitPairRe.test(l) { return nil }
        if refRangeRe.test(l) || rangeSlashRe.test(l) { return nil }
        if rangeRe.test(l) { return l }
        if let m = signedNumRe.firstMatch(l) { return BaseJS.replaceFirst(m[1] ?? "", ",", ".") }
        if BaseJS.len(l) <= 30 && !fourDigitsRe.test(l) && !valorRefRe.test(l) { return l.uppercased() }
        return nil
    }

    private static func buscarValorEGO(_ lineas: [String], _ nombres: [String]) -> String {
        for n in nombres {
            let nu = n.uppercased()
            for i in lineas.indices where lineas[i].uppercased() == nu {
                var j = i + 1
                while j < min(i + 8, lineas.count) {
                    let l = lineas[j].jsTrim
                    j += 1
                    if l.isEmpty || abhlRe.test(l) || egoPunctRe.test(l) || egoSkipSearch.test(l) { continue }
                    if let v = tryParseEgoValue(l) { return v }
                }
            }
        }
        return "---"
    }

    private static func abreviarEGO(_ val: String) -> String {
        if val.isEmpty || val == "---" { return "---" }
        let v = val.uppercased().jsTrim
        return egoAbbrev[v].flatMap { $0.isEmpty ? nil : $0 } ?? v
    }

    private static let egoRangeCapRe = JSRegex(#"^(\d+)[-–](\d+)$"#)

    private static func marcarEGO(_ val: String, _ tipo: String) -> String {
        if val.isEmpty || val == "---" { return "---" }
        let ab = abreviarEGO(val)
        let v = jsParseFloat(val)
        func range(_ lo: Double, _ hi: Double) -> String { (v.map { $0 < lo || $0 > hi } ?? false) ? ab + "*" : ab }
        func threshold(_ t: Double) -> String {
            if let m = egoRangeCapRe.firstMatch(val) { return Double(jsParseInt(m[1] ?? "") ?? 0) > t ? ab + "*" : ab }
            return (v.map { $0 > t } ?? false) ? ab + "*" : ab
        }
        switch tipo {
        case "SANG":
            if let s = v { return s > 0 ? val + "*" : "NEG" }
            return ab != "NEG" && ab != "AUS" ? ab + "*" : ab
        case "UROBIL": return (v.map { $0 > 1 } ?? false) ? ab + "*" : ab
        case "PH": return range(5.5, 6.5)
        case "DENS": return range(1.005, 1.025)
        case "LEU": return threshold(5)
        case "ERI": return threshold(2)
        case "PROT", "GLU", "CET", "BILI", "NITR", "ESTLEU": return ab != "NEG" && ab != "AUS" ? ab + "*" : ab
        case "BACT", "CELEP", "CLING", "CLINH", "LEVAD", "MOCO": return ab != "AUS" ? ab + "*" : ab
        default: return ab
        }
    }

    /// (section 0 fisico / 1 quimico / 2 sedimento, labels, prefix, tipo, skipAus)
    private static let egoFields: [(Int, [String], String, String, Bool)] = [
        (0, ["COLOR"], "", "COLOR", false),
        (0, ["ASPECTO"], "", "ASPECTO", false),
        (0, ["PH"], "pH ", "PH", false),
        (0, ["DENSIDAD", "GRAVEDAD ESPECIFICA"], "D ", "DENS", false),
        (1, ["PROTEINAS", "PROTEINURIA"], "Prot ", "PROT", false),
        (1, ["GLUCOSA"], "Glu ", "GLU", false),
        (1, ["CETONAS", "CUERPOS CETONICOS"], "Cet ", "CET", false),
        (1, ["BILIRRUBINAS", "BILIRRUBINA"], "Bili ", "BILI", false),
        (1, ["SANGRE"], "Sang ", "SANG", false),
        (1, ["NITRITOS"], "Nitr ", "NITR", false),
        (1, ["UROBILINOGENO", "UROBILINÓGENO"], "Urobil ", "UROBIL", false),
        (1, ["ESTERASA LEUCOCITARIA"], "EstLeu ", "ESTLEU", false),
        (2, ["LEUCOCITOS"], "Leu ", "LEU", false),
        (2, ["ERITROCITOS", "HEMATIES"], "Eri ", "ERI", false),
        (2, ["BACTERIAS"], "Bact ", "BACT", true),
        (2, ["CELULAS EPITELIALES"], "CelEp ", "CELEP", true),
        (2, ["CILINDROS GRANOLOSOS"], "CilinG ", "CLING", true),
        (2, ["CILINDROS HIALINOS"], "CilinH ", "CLINH", true),
        (2, ["LEVADURAS"], "Levad ", "LEVAD", true),
        (2, ["MOCO"], "Moco ", "MOCO", true),
    ]

    private static let egoFinRe = JSRegex(#"BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA"#)

    static func parseEGO(_ textoBruto: String) -> String {
        let tUp = textoBruto.uppercased()
        var pos = -1
        for k in ["EXAMEN GENERAL DE ORINA", "ANALISIS DE ORINA", "URIANALISIS"] {
            pos = BaseJS.indexOf(tUp, k)
            if pos != -1 { break }
        }
        if pos == -1 { return "" }
        let fin = egoFinRe.firstMatch(tUp)?.index ?? -1
        let bloque = fin != -1 && fin > pos ? BaseJS.substring(textoBruto, pos, fin) : BaseJS.substring(textoBruto, pos)
        let lineas = lines(bloque, strip: true)
        let vals = egoFields.map { buscarValorEGO(lineas, $0.1) }
        // egoHasMinimalFields_: color, aspecto, ph, leu, eri
        if ![0, 1, 2, 12, 13].contains(where: { vals[$0] != "---" }) { return "" }
        var sections: [[String]] = [[], [], []]
        for (i, d) in egoFields.enumerated() {
            let val = vals[i]
            if val == "---" { continue }
            if d.4 && abreviarEGO(val) == "AUS" { continue }
            sections[d.0].append(d.2 + marcarEGO(val, d.3))
        }
        if sections.allSatisfy({ $0.isEmpty }) { return "" }
        var sub = ["EGO:"]
        for s in sections where !s.isEmpty { sub.append("  " + s.joined(separator: "  ")) }
        return sub.joined(separator: "\n")
    }

    // MARK: grupo sanguíneo / Coombs

    private static let gsMarkRe = [JSRegex(#"GRUPO\s+SANGU[IÍ]NEO"#, "i"), JSRegex(#"COOMBS\s+DIRECTO"#, "i"), JSRegex(#"COOMBS\s+INDIRECTO"#, "i")]
    private static let minusRe = JSRegex(#"−"#, "g")
    private static let grupoRhRe = JSRegex(#"^(A|B|AB|O)\s*(POSITIVO|NEGATIVO|\+|-)$"#)
    private static let strengthRe = JSRegex(#"(?:^|[^0-9A-Z])([1-4]\+)(?![0-9A-Z])"#)
    private static let posRe = JSRegex(#"\bPOSITIVO\b"#)
    private static let negRe = JSRegex(#"\bNEGATIVO\b"#)
    private static let noiseRes = [
        JSRegex(#"^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$"#, "i"), JSRegex(#"^BANCO\s+DE\s+SANGRE$"#, "i"),
        JSRegex(#"^REPORTE\s+DE\s+GRUPO"#, "i"), JSRegex(#"^GRUPO\s+SANGU"#, "i"), JSRegex(#"^COOMBS\s+(DIRECTO|INDIRECTO)"#, "i"),
    ]
    private static let gsStopRe = JSRegex(#"^GRUPO\s+SANGU|^COOMBS\s+(DIRECTO|INDIRECTO)"#, "i")
    private static let tabGRe = JSRegex(#"\t"#, "g")
    private static let grupoLabelRe = JSRegex(#"^GRUPO\s+SANGU[IÍ]NEO(?:\s*\/\s*RH)?$"#, "i")
    private static let cdLabelRe = JSRegex(#"^COOMBS\s+DIRECTO$"#, "i")
    private static let ciLabelRe = JSRegex(#"^COOMBS\s+INDIRECTO$"#, "i")

    private static func normalizeGrupoRh(_ raw: String) -> String {
        let s = wsGRe.replace(minusRe.replace(raw.uppercased(), with: "-"), with: " ").jsTrim
        guard !s.isEmpty, let m = grupoRhRe.firstMatch(s) else { return "" }
        return (m[1] ?? "") + (m[2] == "POSITIVO" || m[2] == "+" ? "+" : "-")
    }

    private static func formatCoombsToken(_ raw: String) -> String {
        let s = wsGRe.replace(raw.uppercased(), with: " ").jsTrim
        if s.isEmpty { return "" }
        let strength = strengthRe.firstMatch(s)?[1]
        if posRe.test(s) || strength != nil { return (strength ?? "pos") + "*" }
        return negRe.test(s) ? "neg" : ""
    }

    private static func isLabelOrNoise(_ line: String) -> Bool { line.isEmpty || noiseRes.contains { $0.test(line) } }

    private static func findEstudioResult(_ lineas: [String], _ pattern: JSRegex) -> String {
        for i in lineas.indices {
            let head = tabRestRe.replace(lineas[i], with: "").jsTrim
            if !pattern.test(head) { continue }
            let same = lineas[i]
            let tabIdx = BaseJS.indexOf(same, "\t")
            if tabIdx >= 0 {
                let after = tabGRe.replace(BaseJS.substring(same, tabIdx + 1), with: " ").jsTrim
                if !after.isEmpty && !isLabelOrNoise(after) { return after }
            }
            var j = i + 1
            while j < min(i + 6, lineas.count) {
                let t = tabGRe.replace(lineas[j], with: " ").jsTrim
                j += 1
                if isLabelOrNoise(t) {
                    if gsStopRe.test(t) { break }
                    continue
                }
                return t
            }
            return ""
        }
        return ""
    }

    static func parseGrupoSangreCoombs(_ textoBruto: String) -> String {
        if textoBruto.isEmpty || !gsMarkRe.contains(where: { $0.test(textoBruto) }) { return "" }
        let lineas = lines(textoBruto, strip: false)
        var parts: [String] = []
        let grupo = normalizeGrupoRh(findEstudioResult(lineas, grupoLabelRe))
        let cd = formatCoombsToken(findEstudioResult(lineas, cdLabelRe))
        let ci = formatCoombsToken(findEstudioResult(lineas, ciLabelRe))
        if !grupo.isEmpty { parts.append(grupo) }
        if !cd.isEmpty { parts.append("CD " + cd) }
        if !ci.isEmpty { parts.append("CI " + ci) }
        return parts.isEmpty ? "" : "GS\t" + parts.joined(separator: " ")
    }
}
