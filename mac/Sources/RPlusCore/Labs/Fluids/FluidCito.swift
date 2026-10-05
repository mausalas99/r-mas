import Foundation

/// Port of labs-fluidos.mjs (citoquímico de líquidos) + labs-citoquimico-scan.mjs
/// + labs-citoquimico-tipo-override.mjs (default path: no override) + labs-fluid-interpret-values.mjs.
enum FluidCito {
    // MARK: labs-fluidos.mjs

    private static let citoNextBoundaryRe = JSRegex(#"\n\n\s*---\s*\n\n|\n\n\s*(?:QUIMICA\s+CLINICA|BIOMETRIA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|BACTERIOLOGIA)\b"#, "i")
    private static let otherDeptBetweenCitoPairRe = JSRegex(#"\b(?:QUIMICA\s+CLINICA|BIOMETRIA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|ELECTROLITOS|PFH|COAGULACION|URIANALISIS|EXAMEN\s+GENERAL\s+DE\s+ORINA|CUADERNILLO)\b"#, "i")
    private static let crRe = JSRegex(#"\r"#, "g")
    private static let wsRe = JSRegex(#"\s+"#, "g")

    private static func search(_ re: JSRegex, _ s: String) -> Int { re.firstMatch(s)?.index ?? -1 }

    private static func boundCitoquimicoOccurrence(_ t: String, _ u: String, _ idx: Int, _ key: String) -> String {
        let stop = search(citoNextBoundaryRe, BaseJS.substring(u, idx + BaseJS.len(key)))
        return stop == -1 ? BaseJS.substring(t, idx) : BaseJS.substring(t, idx, idx + BaseJS.len(key) + stop)
    }

    static func bloqueCitoquimicoLiquidosFull(_ textoBruto: String) -> String {
        let t = crRe.replace(textoBruto, with: "")
        let u = t.uppercased()
        let key = "CITOQUIMICO DE LIQUIDOS CORPORALES"
        let kl = BaseJS.len(key)
        var occ: [Int] = []
        var p = BaseJS.indexOf(u, key)
        while p != -1 { occ.append(p); p = BaseJS.indexOf(u, key, p + kl) }
        if occ.isEmpty { return "" }
        var i0 = occ[0]
        var i2 = -1
        for k in occ.indices.dropFirst() {
            let gap = BaseJS.substring(u, i0 + kl, occ[k])
            if !otherDeptBetweenCitoPairRe.test(gap) { i2 = occ[k]; break }
            i0 = occ[k]
        }
        if i2 == -1 { return boundCitoquimicoOccurrence(t, u, i0, key) }
        let stop2 = search(citoNextBoundaryRe, BaseJS.substring(u, i2 + kl))
        let end = stop2 == -1 ? BaseJS.len(t) : i2 + kl + stop2
        return BaseJS.substring(t, i0, end)
    }

    private static let stopSrc = #"(?<!\n)\n\s*(?:QUIMICA\s+CLINICA|BIOMETRIA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|BACTERIOLOGIA|ELECTROLITOS|PFH|COAGULACION|URIANALISIS|EXAMEN\s+GENERAL\s+DE\s+ORINA|CUADERNILLO)\b"#
    private static let citoquimicoBlockRe = JSRegex(#"CITOQUIMICO\b[\s\S]*?(?="# + stopSrc + #"|$)"#, "gi")

    static func citoquimicoBlocksNormText(_ textoBruto: String) -> [String] {
        let t = crRe.replace(textoBruto, with: "")
        return citoquimicoBlockRe.allMatches(t).map { wsRe.replace($0.whole, with: " ") }
    }

    private static let trailFlagIRe = JSRegex(#"[A-Z*]$"#, "i")
    private static let trailFlagRe = JSRegex(#"[A-Z*]$"#)
    private static let anyWsRe = JSRegex(#"\s"#, "g")

    static func normalizarProteinasFluidoGdl(_ valStr: String, _ unidad: String) -> Double? {
        guard let n = LabExtract.toNum(trailFlagIRe.replace(valStr, with: "")) else { return nil }
        let u = anyWsRe.replace(unidad.uppercased(), with: "")
        if u.hasPrefix("MG/DL") { return n / 1000 }
        if u.hasPrefix("G/DL") { return n }
        if u.hasPrefix("G/L") { return n / 10 }
        return nil
    }

    private static let pleuralRe = JSRegex(#"\bPLEURAL\b"#)
    private static let liqPleuralRe = JSRegex(#"\bL[IÍ]QUIDO\s+PLEURAL\b"#)
    private static let ascitRe = JSRegex(#"\bASCIT"#, "i")
    private static let peritonealRe = JSRegex(#"\bPERITONEAL\b"#)
    private static let liqPeritonealRe = JSRegex(#"\bL[IÍ]QUIDO\s+PERITONEAL\b"#)

    static func esLiquidoPleural(_ fluid: String, _ com: String, _ bloque: String) -> Bool {
        let s = (fluid + " " + com + " " + bloque).uppercased()
        return pleuralRe.test(s) || liqPleuralRe.test(s)
    }

    static func esLiquidoAscitico(_ fluid: String, _ com: String, _ bloque: String) -> Bool {
        if esLiquidoPleural(fluid, com, bloque) { return false }
        let s = (fluid + " " + com + " " + bloque).uppercased()
        return ascitRe.test(s) || peritonealRe.test(s) || liqPeritonealRe.test(s)
    }

    static func computeGasaValue(_ serumAlbGdl: Double?, _ asciticAlbGdl: Double?) -> Double? {
        guard let s = serumAlbGdl, let a = asciticAlbGdl else { return nil }
        return BaseJS.round((s - a) * 100) / 100
    }

    /// `serumTextWithoutCitoBlock_`.
    private static func serumTextWithoutCitoBlock(_ textoBruto: String) -> String {
        if textoBruto.isEmpty { return "" }
        let bloqueCito = bloqueCitoquimicoLiquidosFull(textoBruto)
        if bloqueCito.isEmpty { return textoBruto }
        let tNorm = wsRe.replace(textoBruto, with: " ")
        let bloqueNorm = wsRe.replace(crRe.replace(bloqueCito, with: ""), with: " ")
        return BaseJS.replaceFirst(tNorm, bloqueNorm, " ")
    }

    /// `resolveSerumGlucoseForInterpret_(textoBruto)` without serumOpts.
    static func resolveSerumGlucoseForInterpret(_ textoBruto: String) -> Double? {
        let t = serumTextWithoutCitoBlock(textoBruto)
        if t.isEmpty { return nil }
        return LabExtract.toNum(LabExtract.extraerConRangoSuero(["GLUCOSA"], t).valor)
    }

    /// `resolveSerumAlbuminForGasa_(textoBruto, bloque)` without serumOpts.
    static func resolveSerumAlbuminForGasa(_ textoBruto: String) -> Double? {
        let t = serumTextWithoutCitoBlock(textoBruto)
        if t.isEmpty { return nil }
        return LabExtract.toNum(LabExtract.extraerConRangoSuero(["ALBUMINA"], t).valor)
    }

    private static let citologRe = JSRegex(#"\bCITOLOG"#, "i")
    private static let citoAscitRe = JSRegex(#"\b(ASCIT|PERITONEAL|LIQUIDO\s+ASCIT)\b"#)
    private static let citoPosRe = JSRegex(#"\b(POSITIVO|MALIGN|ADENOCARCINOMA|CARCINOMA|CARCINOMATOSIS|METÁSTASIS|METASTASIS)\b"#)
    private static let citoNegRe = JSRegex(#"\bNEGATIVO\b"#)

    static func extraerCitologiaAscitica(_ textoBruto: String) -> String? {
        let t = textoBruto.uppercased()
        let idx = search(citologRe, t)
        if idx == -1 { return nil }
        let chunk = BaseJS.substring(t, idx, idx + 1200)
        if !citoAscitRe.test(chunk) { return nil }
        if citoPosRe.test(chunk) { return "positive" }
        if citoNegRe.test(chunk) { return "negative" }
        return nil
    }

    static func evaluarCriteriosLight(_ pleuralProtGdl: Double?, _ pleuralLdh: Double?, _ serumProtGdl: Double?, _ serumLdh: Double?, _ serumLdhUln: Double?) -> String {
        var hits: [String] = []
        var details: [String] = []
        var nEval = 0
        if let pp = pleuralProtGdl, let sp = serumProtGdl, sp > 0 {
            let r1 = pp / sp
            if r1 > 0.5 { hits.append("prot") }
            details.append("Prot " + jsToFixed(r1, 2) + (r1 > 0.5 ? "" : "−"))
            nEval += 1
        }
        if let pl = pleuralLdh, let sl = serumLdh, sl > 0 {
            let r2 = pl / sl
            if r2 > 0.6 { hits.append("ldh") }
            details.append("LDH " + jsToFixed(r2, 2) + (r2 > 0.6 ? "" : "−"))
            nEval += 1
        }
        if let pl = pleuralLdh, let uln = serumLdhUln, uln > 0 {
            let umbral = (2.0 / 3.0) * uln
            if pl > umbral { hits.append("ldhUln") }
            details.append("LDH>2/3" + (pl > umbral ? "" : "−"))
            nEval += 1
        }
        if nEval == 0 || details.isEmpty { return "" }
        let d = details.joined(separator: ", ")
        if !hits.isEmpty { return "Light EXUDADO (" + d + ")" }
        if nEval == 3 { return "Light TRASUDADO (" + d + ")" }
        return "Light TRASUDADO parcial (" + d + ")"
    }

    private static let starGRe = JSRegex(#"\*"#, "g")
    private static let milesRe = JSRegex(#"^\d{1,3},\d{3}$"#)

    static func normalizarRecuentoCelular(_ valStr: String) -> String {
        let c = starGRe.replace(valStr, with: "").jsTrim
        if milesRe.test(c) { return BaseJS.replaceFirst(c, ",", "") }
        return BaseJS.replaceFirst(c, ",", ".")
    }

    static func fmtProteinaFluido(_ valStr: String, _ unidad: String) -> String {
        guard let g = normalizarProteinasFluidoGdl(valStr, unidad) else { return trailFlagIRe.replace(valStr, with: "") }
        let star = trailFlagRe.test(valStr)
        let s = g >= 10 ? jsString(BaseJS.round(g * 10) / 10) : jsString(BaseJS.round(g * 100) / 100)
        return s + (star ? "*" : "")
    }

    private static func buildLightPleural(_ bloque: String, _ protRaw: String, _ ldhRaw: String, _ textoBruto: String, _ protUnit: String) -> String {
        let pleuralProt = normalizarProteinasFluidoGdl(protRaw, protUnit)
        let pleuralLdh = LabExtract.toNum(ldhRaw)
        if pleuralProt == nil && pleuralLdh == nil { return "" }
        // extraerSueroParaLight_
        var t = textoBruto
        if !bloque.isEmpty { t = BaseJS.replaceFirst(t, bloque, " ") }
        let protData = LabExtract.extraerConRangoSuero(["PROTEINAS TOTALES EN SANGRE", "PROTEINAS TOTALES", "PROTEINA TOTAL EN SANGRE", "PROTEINAS EN SANGRE"], t)
        let ldhData = LabExtract.extraerConRangoSuero(["LDH DESHIDROGENASA LACTICA", "LDH "], t)
        let serumProt = normalizarProteinasFluidoGdl(protData.valor, "g/dL")
        var ldhUln = ldhData.max
        if ldhUln == nil && !bloque.isEmpty {
            let ldhRef = LabExtract.extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH "], bloque)
            if ldhRef.max != nil { ldhUln = ldhRef.max }
        }
        return evaluarCriteriosLight(pleuralProt, pleuralLdh, serumProt, LabExtract.toNum(ldhData.valor), ldhUln)
    }

    struct Parsed {
        var line = ""
        var esAscitico = false
        var esPleural = false
        var alb: Double?
        var serumAlb: Double?
        var gasaVal: Double?
        var protGdl: Double?
        var tgl: Double?
        var amil: Double?
        var citologia: String?
        var lightTxt = ""
        var leu: Double?
        var pmnInfo = PmnInfo()
        var glu: Double?
        var pH: Double?
        var gram = ""
    }

    static func parseCitoquimicoLiquidosParsed(_ textoBruto: String) -> Parsed {
        let bloque = bloqueCitoquimicoLiquidosFull(textoBruto)
        if bloque.isEmpty { return Parsed() }
        let lineas = bloque.jsLines.map { $0.jsTrim }
        let clean = lineas.map { starGRe.replace($0, with: "").jsTrim }
        var f = Fields()
        for i in 0..<lineas.count {
            scanCitoquimicoLine(&f, lineas, clean, i, lineas[i], lineas[i].uppercased())
        }
        if f.fluid.isEmpty && !f.com.isEmpty && !citoDeptHeaderRe.test(f.com) { f.fluid = f.com }
        if f.fluid.isEmpty && esLiquidoPleural(f.fluid, f.com, bloque) { f.fluid = "LIQUIDO PLEURAL" }
        if f.isEmpty { return Parsed() }

        var r = Parsed()
        r.esPleural = esLiquidoPleural(f.fluid, f.com, bloque)
        r.esAscitico = esLiquidoAscitico(f.fluid, f.com, bloque)
        r.leu = parseFluidLeu(f.leu)
        r.pmnInfo = parsePmnField(f.pmn, r.leu, f.pmnUnit)
        r.lightTxt = r.esPleural ? buildLightPleural(bloque, f.prot, f.ldh, textoBruto, f.protUnit) : ""
        if r.esAscitico && !f.alb.isEmpty {
            r.alb = LabExtract.toNum(f.alb)
            r.serumAlb = resolveSerumAlbuminForGasa(textoBruto)
            r.gasaVal = computeGasaValue(r.serumAlb, r.alb)
        }
        // Tipo override store: default path (no override set) only.
        let p = buildCitoquimicoParts(f, gasaVal: r.gasaVal)
        r.line = p[0] + "\t" + p.dropFirst().joined(separator: " ")
        r.protGdl = normalizarProteinasFluidoGdl(f.prot, f.protUnit)
        r.tgl = LabExtract.toNum(f.tgl)
        r.amil = LabExtract.toNum(f.amil)
        r.citologia = extraerCitologiaAscitica(textoBruto)
        r.glu = LabExtract.toNum(f.glu)
        r.pH = LabExtract.toNum(f.pH)
        r.gram = f.gram
        return r
    }

    // MARK: labs-citoquimico-scan.mjs

    struct Fields {
        var fluid = "", dens = "", pH = "", glu = "", prot = "", protUnit = "", ldh = "", alb = "", tgl = "", amil = ""
        var aspecto = "", leu = "", rec = "", pmn = "", pmnUnit = "", linf = "", eri = "", gram = "", com = ""
        var isEmpty: Bool {
            [fluid, dens, pH, glu, prot, protUnit, ldh, alb, tgl, amil, aspecto, leu, rec, pmn, pmnUnit, linf, eri, gram, com].allSatisfy { $0.isEmpty }
        }
    }

    private static let headerRe = JSRegex(#"^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$"#, "i")

    static func nextMeaningfulLine(_ clean: [String], _ i0: Int, _ maxJ: Int) -> String {
        var j = i0 + 1
        while j < min(i0 + maxJ, clean.count) {
            let txt = clean[j]
            j += 1
            if txt.isEmpty || headerRe.test(txt) { continue }
            return txt
        }
        return ""
    }

    private static let unidadRe = JSRegex(#"^(%\s*PMN|%|MG\s*\/\s*DL|G\s*\/\s*DL|G\s*\/\s*L|U\s*\/\s*L|I?UI?\s*\/\s*L|MEQ\s*\/\s*L|CEL(?:ULAS)?\s*\/\s*MM3|LEUCOCITOS\s*\/\s*MM3)$"#, "i")
    private static let tabRe = JSRegex(#"\t"#)

    private static func scanUnitAfter(_ clean: [String], _ i: Int, _ maxLook: Int) -> String {
        var j = i + 1
        while j < min(i + maxLook, clean.count) {
            let txt = clean[j]
            j += 1
            if txt.isEmpty { continue }
            let head = tabRe.split(txt)[0].jsTrim
            if unidadRe.test(head) { return head }
        }
        return ""
    }

    private static let numRe = JSRegex(#"(\d+(\.\d+)?)"#)
    private static let oneLetterRe = JSRegex(#"^[A-Z]$"#, "i")

    private static func scanNumericAfter(_ lineas: [String], _ i: Int, _ maxLook: Int) -> String {
        var j = i + 1
        while j < min(i + maxLook, lineas.count) {
            if let m = numRe.firstMatch(lineas[j]) { return m[1] ?? "" }
            j += 1
        }
        return ""
    }

    private static func scanNumericSkipLetterFlag(_ clean: [String], _ i: Int, _ maxLook: Int) -> String {
        var j = i + 1
        while j < min(i + maxLook, clean.count) {
            let c = clean[j]
            j += 1
            if oneLetterRe.test(c) { continue }
            if let m = numRe.firstMatch(c) { return m[1] ?? "" }
        }
        return ""
    }

    static let citoDeptHeaderRe = JSRegex(#"^(BACTERIOLOGIA|QUIMICA\s+CLINICA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|CITOQUIMICO)\b"#, "i")
    private static let citoDeEndRe = JSRegex(#"^CITOQUIMICO DE\s*$"#, "i")
    private static let corporalesRe = JSRegex(#"CORPORALES"#, "i")
    private static let colonRe = JSRegex(#"^:$"#)
    private static let citoDeSpRe = JSRegex(#"^CITOQUIMICO DE\s+"#, "i")
    private static let citoDeTipoRe = JSRegex(#"^CITOQUIMICO DE\s+(.+)$"#, "i")
    private static let protLetterRe = JSRegex(#"PROTEINAS\s*([A-Z])\s*$"#, "i")
    private static let recNumRe = JSRegex(#"^\d+[.,]?\d*$"#)
    private static let leucoStartRe = JSRegex(#"^LEUCOCITOS"#, "i")
    private static let starsOnlyRe = JSRegex(#"^\*+$"#)

    private static func scanCitoquimicoLine(_ f: inout Fields, _ lineas: [String], _ clean: [String], _ i: Int, _ lin: String, _ linUp: String) {
        // scanCitoFluidType_
        if citoDeEndRe.test(lin) && !corporalesRe.test(lin) {
            let fl = nextMeaningfulLine(clean, i, 6)
            if !fl.isEmpty && !colonRe.test(fl) && !citoDeptHeaderRe.test(fl) { f.fluid = fl.uppercased() }
        }
        if citoDeSpRe.test(lin) && !corporalesRe.test(lin) {
            if let m = citoDeTipoRe.firstMatch(lin), let g = m[1], !g.jsTrim.isEmpty, !citoDeptHeaderRe.test(g.jsTrim) {
                f.fluid = g.jsTrim.uppercased()
            }
        }
        // scanCitoChemistry_
        if linUp.hasPrefix("DENSIDAD") { f.dens = scanNumericAfter(lineas, i, 5) }
        if linUp == "PH" || linUp.hasPrefix("PH\t") { f.pH = scanNumericAfter(lineas, i, 5) }
        if linUp.hasPrefix("GLUCOSA") { f.glu = scanNumericAfter(lineas, i, 5) }
        if linUp.hasPrefix("PROTEINAS") {
            let letra = protLetterRe.firstMatch(lin)?[1]?.uppercased() ?? ""
            let protVal = scanNumericAfter(lineas, i, 5)
            if !protVal.isEmpty {
                f.prot = protVal + letra
                f.protUnit = scanUnitAfter(clean, i, 5)
            }
        }
        if linUp.hasPrefix("LDH") { f.ldh = scanNumericSkipLetterFlag(clean, i, 8) }
        if linUp.hasPrefix("ALBUMINA") { f.alb = scanNumericSkipLetterFlag(clean, i, 8) }
        if linUp.hasPrefix("TRIGLICER") { f.tgl = scanNumericSkipLetterFlag(clean, i, 8) }
        if linUp.hasPrefix("AMILASA") { f.amil = scanNumericSkipLetterFlag(clean, i, 8) }
        // scanCitoMicroscopy_
        if linUp.hasPrefix("ASPECTO") {
            let a = nextMeaningfulLine(clean, i, 5)
            if !a.isEmpty && !colonRe.test(a) { f.aspecto = a.uppercased() }
        }
        // scanRecuentoField_
        if linUp.hasPrefix("RECUENTO") && !linUp.contains("LEUCOCITOS") {
            var numero = "", letra = ""
            var j = i + 1
            while j < min(i + 5, clean.count) {
                let c = clean[j]
                j += 1
                if c.isEmpty { continue }
                if leucoStartRe.test(c) { break }
                if numero.isEmpty && recNumRe.test(c) { numero = c }
                else if letra.isEmpty && oneLetterRe.test(c) { letra = c.uppercased() }
                if !numero.isEmpty && !letra.isEmpty { break }
            }
            if !numero.isEmpty { f.rec = numero + letra }
        }
        // scanLeucocitosField_
        if leucoStartRe.test(linUp) {
            var found = false
            var k = i - 1
            while k >= max(0, i - 6) {
                if recNumRe.test(clean[k]) { f.leu = normalizarRecuentoCelular(clean[k]); found = true; break }
                k -= 1
            }
            if !found {
                var m = i + 1
                while m < min(i + 8, clean.count) {
                    if recNumRe.test(clean[m]) { f.leu = normalizarRecuentoCelular(clean[m]); break }
                    m += 1
                }
            }
        }
        // scanCitoDiffCounts_
        if linUp.hasPrefix("POLIMORFONUCLEARES") {
            let ptxt = nextMeaningfulLine(clean, i, 5)
            if !ptxt.isEmpty {
                f.pmn = ptxt.uppercased()
                f.pmnUnit = scanUnitAfter(clean, i, 5)
            }
        }
        if linUp.hasPrefix("LINFOCITOS") {
            let ltxt = nextMeaningfulLine(clean, i, 5)
            if !ltxt.isEmpty && ltxt != "%" && ltxt != "---" { f.linf = BaseJS.replaceFirst(ltxt, ",", ".") }
        }
        if linUp.hasPrefix("ERITROCITOS") {
            let etxt = nextMeaningfulLine(clean, i, 5)
            if !etxt.isEmpty { f.eri = etxt.uppercased() }
        }
        if linUp.hasPrefix("GRAM") {
            let g = nextMeaningfulLine(clean, i, 5)
            if !g.isEmpty { f.gram = g.uppercased() }
        }
        if linUp.hasPrefix("COMENTARIO") {
            let cx = nextMeaningfulLine(clean, i, 4)
            if !cx.isEmpty && !starsOnlyRe.test(cx) { f.com = cx.uppercased() }
        }
    }

    private static let digitStartRe = JSRegex(#"^\d"#)
    private static let pctRe = JSRegex(#"%"#)

    static func buildCitoquimicoParts(_ f: Fields, gasaVal: Double?) -> [String] {
        var p = ["Liq:"]
        let pairs: [(String, String, String)] = [
            ("fluid", "Tipo", f.fluid), ("dens", "Dens", f.dens), ("pH", "pH", f.pH), ("glu", "Glu", f.glu),
            ("prot", "Prot", f.prot), ("alb", "Alb", f.alb), ("tgl", "TGL", f.tgl), ("amil", "Amil", f.amil),
            ("ldh", "LDH", f.ldh), ("aspecto", "Asp", f.aspecto), ("rec", "Rec", f.rec), ("leu", "Leu", f.leu),
            ("pmn", "PMN", f.pmn), ("linf", "Linf", f.linf), ("eri", "Eri", f.eri), ("gram", "Gram", f.gram), ("com", "Obs", f.com),
        ]
        for (key, label, raw) in pairs {
            if raw.isEmpty || (key == "pmn" && raw == "---") || (key == "com" && raw == f.fluid) { continue }
            let v: String
            switch key {
            case "prot": v = fmtProteinaFluido(raw, f.protUnit)
            case "pmn": v = raw + (digitStartRe.test(raw) && !pctRe.test(raw) && pctRe.test(f.pmnUnit) ? "%" : "")
            case "linf": v = raw + (pctRe.test(raw) ? "" : "%")
            default: v = raw
            }
            p.append(label)
            p.append(v)
        }
        if let g = gasaVal { p.append("GASA"); p.append(jsString(g)) }
        return p
    }

    // MARK: labs-fluid-interpret-values.mjs

    struct PmnInfo { var pmnNum: Double?; var pmnPct: Double?; var predominant = false }

    static func parseFluidLeu(_ raw: String) -> Double? {
        var c = starGRe.replace(raw, with: "").jsTrim
        if c.isEmpty { return nil }
        c = milesRe.test(c) ? BaseJS.replaceFirst(c, ",", "") : BaseJS.replaceFirst(c, ",", ".")
        return LabExtract.toNum(c)
    }

    private static let predominRe = JSRegex(#"PREDOMIN"#, "i")
    private static let pmnPctRe = JSRegex(#"^(\d+(?:[.,]\d+)?)\s*%?$"#)

    static func parsePmnField(_ raw: String, _ leuNum: Double?, _ unidad: String) -> PmnInfo {
        if raw.isEmpty { return PmnInfo() }
        let s = starGRe.replace(raw, with: "").jsTrim.uppercased()
        if predominRe.test(s) { return PmnInfo(predominant: true) }
        guard let m = pmnPctRe.firstMatch(s), let n = LabExtract.toNum(m[1]) else { return PmnInfo() }
        if pctRe.test(s) || pctRe.test(unidad) {
            return PmnInfo(pmnNum: leuNum.map { BaseJS.round(($0 * n) / 100) }, pmnPct: n, predominant: n >= 50)
        }
        if n > 100 { return PmnInfo(pmnNum: n, pmnPct: nil, predominant: true) }
        return PmnInfo()
    }

    private static let gramNegRe = JSRegex(#"\bNEGAT"#, "i")
    private static let gramPosRe = JSRegex(#"\b(POSITIV|COCC|BACIL)"#, "i")

    static func isGramNegative(_ raw: String) -> Bool { gramNegRe.test(raw) }

    static func gramIsPositive(_ raw: String) -> Bool {
        let s = raw.jsTrim
        if s.isEmpty || isGramNegative(s) { return false }
        return gramPosRe.test(s)
    }

    private static let lcrProtRe = JSRegex(#"^(\d+(?:[.,]\d+)?)"#)

    static func parseLcrProteinMgdl(_ raw: String) -> Double? {
        let s = starGRe.replace(raw, with: "").jsTrim
        if s.isEmpty { return nil }
        return lcrProtRe.firstMatch(s).flatMap { LabExtract.toNum($0[1]) }
    }
}
