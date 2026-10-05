import Foundation

/// Port of labs-cultivo-scan.mjs (only the pieces parseCultivo_ reaches).
enum CultivoScan {
    private typealias J = CultivoJS

    struct GermenRun { let germen: String; let i0: Int; let i1: Int }
    struct SensCruda { let med: String; let mic: String; let interp: String }

    private static func re(_ p: String, _ f: String = "") -> JSRegex { JSRegex(p, f) }
    private static let reCr = re(#"\r"#, "g")
    private static let reStar = re(#"\*"#, "g")
    private static let reStars = re(#"\*+"#, "g")
    private static let reStarsEnd = re(#"\*+$"#, "g")
    private static let reWs = re(#"\s+"#, "g")

    private static func noCr(_ s: String) -> String { reCr.replace(s, with: "") }

    // MARK: tipo / sección

    private static let reBact = re(#"^BACTERIOLOGIA$"#, "i")
    private static let reMyco = re(#"^MYCOBACTERIAS$"#, "i")

    static func findBacteriologiaSectionIdx(_ lineasTexto: [String]) -> Int {
        var idxBact = -1, idxMyco = -1
        for (i, line) in lineasTexto.enumerated() {
            let sec = reWs.replace(noCr(line), with: " ").jsTrim
            if reBact.test(sec) { idxBact = i; break }
            if reMyco.test(sec) { idxMyco = i }
        }
        return idxBact != -1 ? idxBact : idxMyco
    }

    private static let skipRes = [re(#"^BACTERIOLOGIA$"#), re(#"^ESTUDIO\b"#), re(#"^RESULTADO$"#),
                                  re(#"^UNIDADES$"#), re(#"^VALOR DE REFERENCIA$"#)]
    static func isTipoCultivoSkipLine(_ lUp: String) -> Bool { skipRes.contains { $0.test(lUp) } }

    private static let reUro = re(#"\bUROCULTIVO\b"#, "i")
    private static let reHemo = re(#"\bHEMOCULTIVO\b"#, "i")
    private static let reCateter = re(#"^CATETER(\b|$)"#, "i")
    private static let reBacilo = re(#"^BACILOSCOPIA\b"#, "i")
    private static let reCultMico = re(#"^CULTIVO\s+DE\s+MICOBACTERIAS\b"#, "i")
    static func isExplicitTipoCultivoLine(_ l: String, _ lUp: String) -> Bool {
        reUro.test(l) || reHemo.test(l) || reCateter.test(lUp) || reBacilo.test(lUp) || reCultMico.test(lUp)
    }

    private static let reNotCandidate = re(
        #"^(TINCION|CALIDAD|ESTADO|MICROORGANISMO|COMENTARIO|CUENTA|ANTIBIOGRAMA|REPORTE\s+PRELIMINAR|1\s+MUESTRA|OBSERVACIONES|SECCION)\b"#, "i")
    static func isTipoCultivoCandidate(_ lUp: String) -> Bool { !reNotCandidate.test(lUp) }

    private static let reProductoOnly = re(#"^PRODUCTO$"#)
    static func detectTipoCultivoLine(_ lineasTexto: [String]) -> String {
        let idxSec = findBacteriologiaSectionIdx(lineasTexto)
        if idxSec == -1 { return "" }
        var candidate = ""
        var ii = idxSec + 1
        while ii < min(idxSec + 35, lineasTexto.count) {
            defer { ii += 1 }
            let l = reWs.replace(reStar.replace(noCr(lineasTexto[ii]), with: " "), with: " ").jsTrim
            if l.isEmpty { continue }
            let lUp = l.uppercased()
            if isTipoCultivoSkipLine(lUp) { continue }
            if reProductoOnly.test(lUp) { break }
            if isExplicitTipoCultivoLine(l, lUp) { return l }
            if candidate.isEmpty && isTipoCultivoCandidate(lUp) { candidate = l }
        }
        return candidate
    }

    // MARK: micobacterias

    static func cleanMycoLine(_ line: String) -> String {
        reWs.replace(reStars.replace(noCr(line), with: ""), with: " ").jsTrim
    }

    private static let reObs = re(#"^OBSERVACIONES\b"#, "i")
    private static let reObsOnly = re(#"^OBSERVACIONES$"#, "i")
    private static let reObsSkip = re(#"^(ESTUDIO|RESULTADO|UNIDADES|\*+)$"#, "i")
    static func extractMuestraMycobacterias(_ slice: [String]) -> String {
        for o in 0..<slice.count {
            if !reObs.test(cleanMycoLine(slice[o])) { continue }
            var o2 = o + 1
            while o2 < min(o + 8, slice.count) {
                defer { o2 += 1 }
                let obs = cleanMycoLine(slice[o2])
                if obs.isEmpty || reObsOnly.test(obs) { continue }
                if reObsSkip.test(obs) { continue }
                return obs.uppercased()
            }
            break
        }
        return ""
    }

    private static let mycoSkip = [re(#"^(ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|1\s+MUESTRA)$"#, "i"),
                                   re(#"^SECCION\s+DE\s+MICOBACTERIAS"#, "i"), re(#"^REPORTE\s+PRELIMINAR"#, "i")]
    static func isMycoResultSkipLine(_ tUp: String) -> Bool { mycoSkip.contains { $0.test(tUp) } }

    static func readMycoCultivoValue(_ slice: [String], _ k: Int) -> String {
        var k2 = k + 1
        while k2 < min(k + 6, slice.count) {
            let v = cleanMycoLine(slice[k2])
            if !v.isEmpty && J.len(v) > 2 { return v.uppercased() }
            k2 += 1
        }
        return ""
    }

    private static let reMycoStudyStart = re(#"^(BACILOSCOPIA|CULTIVO\s+DE\s+MICOBACTERIAS)"#, "i")
    private static let reObsStart = re(#"^OBSERVACIONES"#, "i")
    private static let reCultivoOnly = re(#"^CULTIVO$"#, "i")
    private static let reMycoResult = re(#"NEGATIVO|POSITIVO|PENDIENTE|EN CURSO|CRECIMIENTO|NO SE AISL"#, "i")
    static func findMycoStudyResult(_ slice: [String], _ fromIdx: Int) -> String {
        var k = fromIdx + 1
        while k < min(fromIdx + 22, slice.count) {
            defer { k += 1 }
            let t = cleanMycoLine(slice[k])
            if t.isEmpty { continue }
            let tUp = t.uppercased()
            if reMycoStudyStart.test(tUp) { break }
            if reObsStart.test(tUp) { break }
            if isMycoResultSkipLine(tUp) { continue }
            if reCultivoOnly.test(tUp) {
                let cultVal = readMycoCultivoValue(slice, k)
                if !cultVal.isEmpty { return cultVal }
                continue
            }
            if reMycoResult.test(tUp) && J.len(t) < 120 { return tUp }
        }
        return "NEGATIVO"
    }

    private static let reMycoSecEnd = re(#"^(HEMATOLOGIA|BACTERIOLOGIA|QUIMICA|BIOMETRIA|GASOMETRIA)\b"#, "i")
    private static let reStudy = re(#"^(BACILOSCOPIA|CULTIVO\s+DE\s+MICOBACTERIAS|CULTIVO\s+DE\s+MYCOBACTERIAS)\b"#, "i")
    static func parseMycobacteriasStudies(_ lineasTexto: [String], _ fechaC: String) -> String {
        guard let idxM = lineasTexto.firstIndex(where: { reMyco.test(cleanMycoLine($0)) }) else { return "" }
        var end = lineasTexto.count
        for j in (idxM + 1)..<max(idxM + 1, lineasTexto.count) where reMycoSecEnd.test(cleanMycoLine(lineasTexto[j])) {
            end = j; break
        }
        let slice = Array(lineasTexto[idxM..<end])
        let muestra = extractMuestraMycobacterias(slice)
        var chunks: [String] = []
        for si in 0..<slice.count {
            var tipo = cleanMycoLine(slice[si])
            if !reStudy.test(tipo) { continue }
            tipo = tipo.uppercased()
            let resultado = findMycoStudyResult(slice, si)
            var header = tipo
            if !muestra.isEmpty && J.indexOf(header, muestra) == -1 { header += " (" + muestra + ")" }
            chunks.append(header + " " + fechaC + ": " + resultado)
        }
        return chunks.joined(separator: "\n\n")
    }

    // MARK: muestra

    private static let reProducto = re(#"^PRODUCTO\b"#, "i")
    private static let muestraStop = [re(#"^TINCION(\s+DE)?\s*GRAM"#, "i"), re(#"^CALIDAD DE LA MUESTRA$"#, "i"),
                                      re(#"^ESTADO DE CULTIVO$"#, "i"), re(#"^REPORTE PRELIMINAR$"#, "i"),
                                      re(#"^MICROORGANISMO$"#, "i"), re(#"^COMENTARIO"#, "i")]
    static func detectMuestraDesdeProducto(_ lineasTexto: [String]) -> String {
        guard let idxProd = lineasTexto.firstIndex(where: { reProducto.test(reStars.replace(noCr($0), with: "").jsTrim) })
        else { return "" }
        var j = idxProd + 1
        while j < min(idxProd + 14, lineasTexto.count) {
            defer { j += 1 }
            let s = reStar.replace(noCr(lineasTexto[j]), with: "").jsTrim
            if s.isEmpty { continue }
            if muestraStop.contains(where: { $0.test(s) }) { break }
            return s
        }
        return ""
    }

    private static let reKeywordGlue = re(#"^(HEMOCULTIVO|UROCULTIVO|FUNGICULTIVO|CATETER)(?=[A-ZÁÉÍÓÚÑ])"#, "i")
    static func insertSpaceAfterCultivoKeyword(_ s: String) -> String {
        reKeywordGlue.replace(s) { ($0[1] ?? "") + " " }
    }

    static func buildCultivoTipoDisplay(_ tipoLine: String, _ muestra: String) -> String {
        let t = tipoLine.isEmpty ? "" : insertSpaceAfterCultivoKeyword(reWs.replace(tipoLine, with: " ").jsTrim.uppercased())
        let m = muestra.isEmpty ? "" : reWs.replace(muestra, with: " ").jsTrim.uppercased()
        if !t.isEmpty && !m.isEmpty { return t + " (" + m + ")" }
        if !t.isEmpty { return t }
        if !m.isEmpty { return "CULTIVO (" + m + ")" }
        return "CULTIVO"
    }

    // MARK: antibiograma interp

    private static let reTabs = re(#"\t+"#)
    private static let reInterpTab = re(#"^(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$"#)
    private static let reNoSuscOnly = re(#"^NO\s+SUSCEPTIBLE$"#, "i")
    private static let reStarsEndOnce = re(#"\*+$"#)
    private static let reMV = re(#"^([<>]=?\s*\d+(?:\.\d+)?(?:\/\d+)?)\s+(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$"#, "i")
    private static let reMN = re(#"^(\d+)\s+(S|R|I|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$"#, "i")
    private static let reSRI = re(#"^(S|R|I)$"#)
    private static let reNoSusc = re(#"NO\s+SUSCEPTIBLE"#, "i")
    private static let reSpace1 = re(#"\s"#, "g")

    static func parseInterpAntibiograma(_ vL: String) -> (mic: String, interp: String)? {
        let vClean = reStarsEnd.replace(vL, with: "").jsTrim
        if vClean.isEmpty { return nil }
        let tabs = reTabs.split(vClean).map(\.jsTrim).filter { !$0.isEmpty }
        if tabs.count >= 2 {
            let interp = reStarsEndOnce.replace(tabs[tabs.count - 1].uppercased(), with: "")
            let mic = tabs.dropLast().joined(separator: " ").jsTrim
            if reInterpTab.test(interp) { return (mic, interp) }
            if reNoSuscOnly.test(interp) { return (mic, "NO SUSCEPTIBLE") }
        }
        if let mV = reMV.firstMatch(vClean) { return (reSpace1.replace(mV[1]!, with: ""), mV[2]!.uppercased()) }
        if let mN = reMN.firstMatch(vClean) { return (mN[1]!, mN[2]!.uppercased()) }
        let lim = vClean.uppercased()
        if reSRI.test(lim) { return ("", lim) }
        if reNoSusc.test(vClean) { return ("", "NO SUSCEPTIBLE") }
        return nil
    }

    // MARK: marcas de resistencia

    static let ordenMarcaResistencia: [String: Int] = [
        "KPC": 1, "NDM": 2, "VIM": 3, "IMP": 4, "OXA-48": 5, "OXA-otras": 6, "MBL": 7, "SPM": 8, "GIM": 9,
        "ESBL": 20, "BLEE": 21, "CRE": 30, "Carb-R": 31, "AmpC": 40, "MRSA": 50, "VRE": 51, "Col-R": 52,
    ]
    private static func orden(_ m: String) -> Int { ordenMarcaResistencia[m] ?? 99 }

    static func normalizeResistenciaText(_ texto: String) -> String {
        var u = texto.uppercased()
        for (a, b) in [("Á", "A"), ("É", "E"), ("Í", "I"), ("Ó", "O"), ("Ú", "U")] { u = J.replaceAll(u, a, b) }
        return u
    }

    private static let rKPC = re(#"\bKPC\b|KPC-"#), rNDM = re(#"\bNDM\b|NDM-"#), rVIM = re(#"\bVIM\b|VIM-"#)
    private static let rIMP1 = re(#"\bIMP-\d|\bIMP\s*1\b|\bIMP1\b"#), rIMP2 = re(#"BETALACTAMASA\s+IMP"#)
    private static let rOXA48 = re(#"\bOXA[- ]?48\b|OXA48\b"#)
    private static let rOXAo = re(#"\bOXA[- ]?(23|24|51|58)(?![0-9])\b"#, "i")
    private static let rMBL = re(#"\bMBL\b|METALO\s*BETA|METALOCARBAPENEMAS|METALO-?\s*BETALACTAMASA|BETALACTAMASA\s+DE\s+ZINC"#)
    private static let rSPM = re(#"\bSPM\b|SPM-"#), rGIM = re(#"\bGIM\b|GIM-"#)
    private static let rCRE = re(#"\bCPE\b|\bCRE\b|ENTEROBACTER(I)?A\s+RESISTENTE\s+A\s+CARBAPEN|BACILO\s+CARBAPEN"#)
    private static let rCarbR = re(
        #"RESISTEN(CIA|TE)\s+.*CARBAPEN|CARBAPEN.*RESIST|NO\s+SUSCEPTIB.*CARBAPEN|ANTICARBAPEN|ANTI-?CARBAPEN|PRODUCTOR\s+DE\s+CARBAPENEMASA|PRODUCTOR(ES)?\s+CARBAPEN|DETECTO\s+CARBAPENEMASA|DETECT[OÓ]\s+CARBAPENEMASA|CARBAPENEMASA\s+DETECTAD"#, "i")
    private static let rESBL = re(#"\bESBL\b|BETALACTAMASAS?\s+DE\s+ESPECTRO|ESPECTRO\s+EXTENDIDO|BLEE\s*\+\s*ESBL"#)
    private static let rBLEE = re(#"\(BLEE\)|\bBLEE\b|BETALACTAMASAS?\s*\(?BLEE\)?|PRODUCTOR\s+DE\s+BETALACTAMASAS(?!\s+DE\s+ESPECTRO)"#)
    private static let rAmpC = re(#"\bAMPC\b|AMP\s*C\b|BETALACTAMASA\s+AMPC|CEPHAMYCIN"#)
    private static let rMRSA = re(#"\bMECA\b|\bMRSA\b|METICILIN(A)?\s*-?\s*RESIST|OXACILIN(A)?\s*:\s*R(?!\s*\d)"#)
    private static let rVRE = re(#"\bVRE\b|VANCOMICIN(A)?\s*-?\s*RESIST|ENTEROCOC.*VANCO\s*R|VANCO\s*[-–]\s*R"#)
    private static let rColR = re(#"COLISTIN(A)?\s*[-–:]?\s*R|POLIMIXIN(A)?\s*[-–:]?\s*R|RESIST.*COLISTIN"#)

    static func extractMarcasResistenciaDesdeTexto(_ texto: String) -> [String] {
        let u = normalizeResistenciaText(texto)
        var seen = Set<String>()
        var tags: [String] = []
        func add(_ tag: String) { if seen.insert(tag).inserted { tags.append(tag) } }
        // applyCarbapenemasaTags_
        if rKPC.test(u) { add("KPC") }
        if rNDM.test(u) { add("NDM") }
        if rVIM.test(u) { add("VIM") }
        if rIMP1.test(u) || rIMP2.test(u) { add("IMP") }
        if rOXA48.test(u) { add("OXA-48") }
        if rOXAo.test(u) { add("OXA-otras") }
        if rMBL.test(u) { add("MBL") }
        if rSPM.test(u) { add("SPM") }
        if rGIM.test(u) { add("GIM") }
        // applyCreCarbTags_
        if rCRE.test(u) { add("CRE") }
        if rCarbR.test(u) && !["KPC", "NDM", "VIM", "IMP", "OXA-48", "MBL"].contains(where: seen.contains) { add("Carb-R") }
        // applyBetaLactamTags_
        if rESBL.test(u) { add("ESBL") }
        if rBLEE.test(u) { add("BLEE") }
        if rAmpC.test(u) { add("AmpC") }
        // applyStaphEnteroColTags_
        if rMRSA.test(u) { add("MRSA") }
        if rVRE.test(u) { add("VRE") }
        if rColR.test(u) { add("Col-R") }
        return J.stableSort(tags, orden)
    }

    private static let reCarbapenemasa = re(#"^(KPC|NDM|VIM|IMP|OXA-48|OXA-otras|MBL|SPM|GIM)$"#)
    static func finalizeMarcasResistencia(_ input: [String]) -> [String] {
        var marcas = J.stableSort(input, orden)
        if marcas.contains("BLEE") { marcas = marcas.filter { $0 != "ESBL" } }
        if marcas.contains(where: { reCarbapenemasa.test($0) }) { marcas = marcas.filter { $0 != "Carb-R" } }
        if marcas.contains("CRE") { marcas = marcas.filter { $0 != "Carb-R" } }
        return marcas
    }

    private static let reAbStart = re(#"^ANTIBIOGRAMA"#, "i")
    private static let reAbEnd = re(#"^MICROORGANISMO|^IDENTIFICACION"#, "i")
    private static let reCarbInterp = re(#"^(KPC|NDM|VIM|IMP|MBL)$"#)
    static func detectMarcasResistenciaCultivoSlice(_ sliceLines: [String]) -> [String] {
        var marcas = extractMarcasResistenciaDesdeTexto(sliceLines.joined(separator: "\n"))
        var seen = Set(marcas)
        var inAb = false
        for line in sliceLines {
            let L = reStarsEnd.replace(line, with: "").jsTrim
            if reAbStart.test(L) { inAb = true; continue }
            if inAb && reAbEnd.test(L) { inAb = false; continue }
            if !inAb { continue }
            guard let p = parseInterpAntibiograma(L), !p.interp.isEmpty else { continue }
            let it = p.interp.uppercased()
            if it == "ESBL" && !seen.contains("ESBL") { marcas.append("ESBL"); seen.insert("ESBL") }
            if it == "BLEE" && !seen.contains("BLEE") { marcas.append("BLEE"); seen.insert("BLEE") }
            if reCarbInterp.test(it) && !seen.contains(it) { marcas.append(it); seen.insert(it) }
        }
        return finalizeMarcasResistencia(marcas)
    }

    // MARK: compactar

    private static let atbRank: [String: Int] = [
        "R": 4, "NO SUSCEPTIBLE": 4, "ESBL": 4, "BLEE": 4, "BLAC": 4, "KPC": 4, "NDM": 4, "VIM": 4, "IMP": 4, "MBL": 4,
        "I": 2, "S": 1, "POS": 1,
    ]
    static func compactarLineasAntibiograma(_ sensCrudas: [SensCruda], _ abreviarFn: (String) -> String) -> String {
        if sensCrudas.isEmpty { return "" }
        var byKey: [String: (interp: String, r: Int)] = [:]
        for s in sensCrudas {
            let key = abreviarFn(s.med)
            if key.isEmpty { continue }
            let it = s.interp.uppercased()
            let r = atbRank[it] ?? 0
            if byKey[key] == nil || r > byKey[key]!.r { byKey[key] = (it, r) }
        }
        var R: [String] = [], I: [String] = [], E: [String] = [], S: [String] = []
        for k in byKey.keys.sorted(by: J.jsLess) {
            let it = byKey[k]!.interp
            if it == "S" || it == "POS" { S.append(k) }
            else if it == "I" { I.append(k) }
            else if it == "ESBL" { E.append(k) }
            else { R.append(k) }
        }
        func cap(_ arr: [String], _ n: Int) -> String {
            if arr.count <= n { return arr.joined(separator: ", ") }
            return arr.prefix(n).joined(separator: ", ") + " +" + String(arr.count - n)
        }
        var parts: [String] = []
        if !R.isEmpty { parts.append("R: " + cap(R, 14)) }
        if !I.isEmpty { parts.append("I: " + cap(I, 8)) }
        if !E.isEmpty { parts.append("ESBL: " + cap(E, 8)) }
        if !S.isEmpty { parts.append("S: " + cap(S, 18)) }
        if parts.isEmpty { return "ATB sin interpretaciones" }
        let line = "ATB " + parts.joined(separator: " | ")
        if J.len(line) <= 220 { return line }
        return "ATB " + parts.joined(separator: "\n")
    }

    // MARK: germen runs

    private static let reLeadJunk = re(#"^[\s*:]+"#)
    private static let reMicroStart = re(#"^MICROORGANISMO"#, "i")
    private static let reMaldi = re(#"MALDI|IDENTIF|ESPECTROMETRIA|ESPECTRO"#, "i")
    private static let reSameLineStop = re(#"^(MICROORGANISMO|COMENTARIO|CUENTA|ANTIBIOGRAMA)\b"#, "i")
    static func germenFromSameLine(_ line: String) -> String? {
        let rest = reLeadJunk.replace(reMicroStart.replace(reLeadJunk.replace(noCr(line), with: ""), with: ""), with: "").jsTrim
        if rest.isEmpty { return nil }
        if reMaldi.test(rest) { return nil }
        if reSameLineStop.test(rest) { return nil }
        return rest.uppercased()
    }

    private static let nameStop = [re(#"^COMENTARIO"#, "i"), re(#"^MICROORGANISMO"#, "i"),
                                   re(#"^ANTIBIOGRAMA"#, "i"), re(#"^CUENTA"#, "i")]
    static func readGermenName(_ lineasTexto: [String], _ i: Int) -> (germen: String, nameEnd: Int)? {
        if let same = germenFromSameLine(lineasTexto[i]) { return (same, i) }
        var k = i + 1
        while k < min(i + 14, lineasTexto.count) {
            defer { k += 1 }
            let cand = reStar.replace(noCr(lineasTexto[k]), with: "").jsTrim
            if cand.isEmpty { continue }
            if nameStop.contains(where: { $0.test(cand) }) { break }
            if !reMaldi.test(cand) { return (cand.uppercased(), k) }
        }
        return nil
    }

    private static let reIdentEspectro = re(#"^IDENTIFICACION\s+POR\s+ESPECTROMETRIA"#, "i")
    static func findGermenRunEnd(_ lineasTexto: [String], _ i: Int, _ nameEnd: Int) -> Int {
        var m = i + 1
        while m < lineasTexto.count {
            let Lm = reStarsEnd.replace(noCr(lineasTexto[m]), with: "").jsTrim
            if reMicroStart.test(Lm) && m > nameEnd { return m }
            if reIdentEspectro.test(Lm) { return m }
            m += 1
        }
        return lineasTexto.count
    }

    static func findCultivoGermenRuns(_ lineasTexto: [String]) -> [GermenRun] {
        var runs: [GermenRun] = []
        var i = 0
        while i < lineasTexto.count {
            defer { i += 1 }
            let L = reStarsEnd.replace(noCr(lineasTexto[i]), with: "").jsTrim
            if !reMicroStart.test(L) { continue }
            guard let named = readGermenName(lineasTexto, i) else { continue }
            let end = findGermenRunEnd(lineasTexto, i, named.nameEnd)
            runs.append(GermenRun(germen: named.germen, i0: i, i1: end))
            i = end - 1
        }
        return runs
    }

    // MARK: cuenta

    private static let reAbWord = re(#"\bANTIBIOGRAMA\b"#, "i")
    private static let reUfc = re(#"\+?\d[\d,]*(?:\.\d+)?\s*UFC(?:\s*\/\s*M?L)?"#, "i")
    private static let reSlash = re(#"\s*\/\s*"#, "g")
    private static let reCmp = re(#"([<>]=?\s?\d+(\.\d+)?\s*[A-Z%/]*)"#, "i")
    private static let reColonias = re(#"(\d[\d,]*\s+COLONIAS?)"#, "i")
    private static let reCuentaStart = re(#"^CUENTA"#, "i")
    private static let reCuentaStop = re(#"^MICROORGANISMO|^ANTIBIOGRAMA|^COMENTARIO"#, "i")
    static func extractCuentaKassFromLineas(_ sliceLines: [String]) -> String {
        let tNorm = reWs.replace(sliceLines.joined(separator: " "), with: " ")
        let tUpper = tNorm.uppercased()
        var pCuenta = J.indexOf(tUpper, "CUENTA DE KASS")
        if pCuenta == -1 { pCuenta = J.indexOf(tUpper, "CUENTA") }
        if pCuenta == -1 { return "" }
        let fragC = J.substring(tNorm, pCuenta, pCuenta + 110)
        let fragBeforeAb = reAbWord.split(fragC)[0]
        if let m = reUfc.firstMatch(fragBeforeAb) {
            return reSlash.replace(reWs.replace(m.whole, with: " "), with: "/").jsTrim.uppercased()
        }
        if let m = reCmp.firstMatch(fragBeforeAb) { return m[1]!.jsTrim.uppercased() }
        if let m = reColonias.firstMatch(fragBeforeAb) { return reWs.replace(m[1]!, with: " ").jsTrim.uppercased() }
        for li in 0..<sliceLines.count {
            let Lc = reStarsEnd.replace(noCr(sliceLines[li]), with: "").jsTrim
            if !reCuentaStart.test(Lc) { continue }
            var lk = li + 1
            while lk < min(li + 6, sliceLines.count) {
                defer { lk += 1 }
                let cand = reStar.replace(noCr(sliceLines[lk]), with: "").jsTrim
                if cand.isEmpty || cand == "*" { continue }
                if reCuentaStop.test(cand) { break }
                return reSlash.replace(reWs.replace(cand, with: " "), with: "/").jsTrim.uppercased()
            }
        }
        return ""
    }

    // MARK: antibiograma formats

    private static let reSliceSkip = re(
        #"ANTIBIOGRAMA|MICROORGANISMO|COMENTARIO:?|CUENTA|PRODUCTO|ESTADO|MUESTRA|GRAM|IDENTIFICACION|ESTUDIO\s+RESULTADO"#, "i")
    static func parseSensCrudasAntibiogramaSlice(_ lineasAb: [String]) -> [SensCruda] {
        var out: [SensCruda] = []
        var i = 0
        while i < lineasAb.count - 1 {
            defer { i += 1 }
            let nL = lineasAb[i], vL = lineasAb[i + 1]
            if nL.isEmpty || J.len(nL) <= 3 || reSliceSkip.test(nL) { continue }
            var parsed = parseInterpAntibiograma(vL)
            if parsed == nil {
                let lim = vL.uppercased()
                if reSRI.test(lim) { parsed = ("", lim) }
            }
            if let p = parsed, !p.interp.isEmpty { out.append(SensCruda(med: nL.uppercased(), mic: p.mic, interp: p.interp)) }
        }
        return out
    }

    private static let reAbPrefix = re(#"^ANTIBIOGRAMA"#, "i")
    private static let reGluedStop = re(#"^(MICROORGANISMO|COMENTARIO|CUENTA|IDENTIFICACION)"#, "i")
    private static let reGlued = re(
        #"^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9/.\- ]*?)\s*([<>]=?\s?\d[\d.\/]*|\d[\d.\/]*)\s*(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$"#, "i")
    private static let reWsG = re(#"\s+"#, "g")
    static func parseSensCrudasAntibiogramaGlued(_ lineasAb: [String]) -> [SensCruda] {
        var out: [SensCruda] = []
        for line in lineasAb {
            let entry = reAbPrefix.replace(line, with: "").jsTrim
            if entry.isEmpty { continue }
            if reGluedStop.test(entry) { break }
            guard let m = reGlued.firstMatch(entry) else { continue }
            let med = m[1]!.jsTrim.uppercased()
            if med.isEmpty { continue }
            out.append(SensCruda(med: med, mic: reWsG.replace(m[2]!, with: ""), interp: m[3]!.uppercased()))
        }
        return out
    }

    private static let reFieldInterp = re(#"^(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL|NO SUSCEPTIBLE)$"#, "i")
    private static let reCmpStart = re(#"^[<>]=?\s?\d"#)
    private static let reDigitStart = re(#"^\d"#)
    private static let reAbOnly = re(#"^ANTIBIOGRAMA$"#, "i")
    static func isAtbFieldValueToken(_ t: String) -> Bool {
        reFieldInterp.test(t) || reCmpStart.test(t) || reDigitStart.test(t)
    }

    static func parseSensCrudasAntibiogramaFieldRows(_ lineasAb: [String]) -> [SensCruda] {
        let tokens = lineasAb.filter { !$0.isEmpty && !reAbOnly.test($0) }
        var out: [SensCruda] = []
        var i = 0
        while i < tokens.count {
            let t = tokens[i]
            if isAtbFieldValueToken(t) { i += 1; continue }
            if J.len(t) < 2 || reGluedStop.test(t) { break }
            let name = t
            i += 1
            var vals: [String] = []
            while i < tokens.count && vals.count < 2 && isAtbFieldValueToken(tokens[i]) {
                vals.append(tokens[i]); i += 1
            }
            if vals.isEmpty { continue }
            let interp = vals[vals.count - 1].uppercased()
            let mic = vals.count > 1 ? vals[0] : ""
            if reFieldInterp.test(interp) { out.append(SensCruda(med: name.uppercased(), mic: mic, interp: interp)) }
        }
        return out
    }

    static func parseSensCrudasAntibiogramaLines(_ lineasAb: [String]) -> [SensCruda] {
        let glued = parseSensCrudasAntibiogramaGlued(lineasAb)
        if !glued.isEmpty { return glued }
        let sliced = parseSensCrudasAntibiogramaSlice(lineasAb)
        if !sliced.isEmpty { return sliced }
        return parseSensCrudasAntibiogramaFieldRows(lineasAb)
    }
}
