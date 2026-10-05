import Foundation

/// Unit "Cultivo": port of labs-cultivo.mjs (parseCultivo_) and labs-cultivo-abbr.mjs.
/// labs-cultivo-atb.mjs is not ported: parseCultivo_ does not call it.
public enum CultivoParser {
    private typealias J = CultivoJS
    private typealias S = CultivoScan

    /// tend-core.mjs `TEND_MESES_MAP`.
    static let tendMesesMap: [String: String] = [
        "ene": "01", "feb": "02", "mar": "03", "abr": "04", "may": "05", "jun": "06",
        "jul": "07", "ago": "08", "sep": "09", "oct": "10", "nov": "11", "dic": "12",
        "jan": "01", "apr": "04", "aug": "08", "dec": "12",
    ]

    private static let reWs = JSRegex(#"\s+"#, "g")
    private static let reCr = JSRegex(#"\r"#, "g")
    private static let reStar = JSRegex(#"\*"#, "g")
    private static let reFecha = JSRegex(#"(\d{1,2})[/-](\d{1,2})[/-](\d{4})"#)
    private static let reFechaEn = JSRegex(#"([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})"#, "i")
    private static let rePreliminar = JSRegex(#"REPORTE\s+PRELIMINAR"#, "i")
    private static let reBacPos = JSRegex(#"BACILOSCOPIA[^.\n]*POSITIVO[^\n.]*"#, "i")

    /// `parseCultivo_(raw, raw.replace(/\s+/g, ' '))`. "" when none.
    public static func parse(_ raw: String) -> String {
        parseCultivo(raw, reWs.replace(raw, with: " "))
    }

    static func isCultivoReportText(_ tUpper: String) -> Bool {
        J.indexOf(tUpper, "HEMOCULTIVO") != -1 || J.indexOf(tUpper, "CULTIVO") != -1
            || J.indexOf(tUpper, "MICROORGANISMO") != -1 || J.indexOf(tUpper, "MYCOBACTERIAS") != -1
            || J.indexOf(tUpper, "BACILOSCOPIA") != -1
    }

    static func parseCultivoFecha(_ tNorm: String) -> String {
        if let m = reFecha.firstMatch(tNorm) { return J.pad2(m[1]!) + "/" + J.pad2(m[2]!) }
        if let m = reFechaEn.firstMatch(tNorm), let mon = tendMesesMap[J.substring(m[1]!.lowercased(), 0, 3)] {
            return J.pad2(m[2]!) + "/" + mon
        }
        return "N/D"
    }

    static func buildGermenChunk(_ run: CultivoScan.GermenRun, _ sliceLines: [String], _ sitio: String,
                                 _ fechaC: String, _ reportePreliminar: Bool) -> String {
        let subNorm = sliceLines.joined(separator: "\n")
        let idxAbLoc = J.indexOf(subNorm.uppercased(), "ANTIBIOGRAMA")
        var head = sitio + " " + fechaC + ": " + run.germen
        var headTags: [String] = []
        if reportePreliminar { headTags.append("Preliminar") }
        for m in S.detectMarcasResistenciaCultivoSlice(sliceLines) where !headTags.contains(m) { headTags.append(m) }
        if !headTags.isEmpty { head += " · " + headTags.joined(separator: " · ") }
        var chunk = head
        if idxAbLoc != -1 {
            let lineasAb = J.split(J.substring(subNorm, idxAbLoc), "\n").map {
                reStar.replace(reCr.replace($0, with: ""), with: "").jsTrim
            }
            let abCompact = S.compactarLineasAntibiograma(S.parseSensCrudasAntibiogramaLines(lineasAb), abreviarAbAtb)
            if !abCompact.isEmpty { chunk += "\n" + abCompact }
        }
        let cuentaRun = S.extractCuentaKassFromLineas(sliceLines)
        if !cuentaRun.isEmpty { chunk += "\nCuenta: " + cuentaRun }
        return chunk
    }

    static func parseCultivoGermenRuns(_ germenRuns: [CultivoScan.GermenRun], _ lineasTexto: [String], _ sitio: String,
                                       _ fechaC: String, _ reportePreliminar: Bool) -> String {
        germenRuns.map {
            buildGermenChunk($0, Array(lineasTexto[$0.i0..<$0.i1]), sitio, fechaC, reportePreliminar)
        }.joined(separator: "\n\n")
    }

    static func parseCultivoNegativo(_ tNorm: String, _ tUpper: String, _ sitio: String, _ fechaC: String) -> String {
        let up = tNorm.uppercased()
        if J.indexOf(up, "BACILOSCOPIA") != -1 && J.indexOf(up, "POSITIVO") != -1 {
            let mPos = reBacPos.firstMatch(tNorm)
            return "BACILOSCOPIA " + fechaC + ": " + (mPos.map { $0.whole.jsTrim } ?? "BACILOSCOPIA POSITIVA")
        }
        var estado = "NEGATIVO"
        let pEst = J.indexOf(tUpper, "ESTADO")
        if pEst != -1 {
            let frag = J.substring(tNorm, pEst + 17, pEst + 80)
            let parts = J.split(frag, "*")
            let fEst = parts.count > 1 && !parts[1].isEmpty ? parts[1] : frag
            estado = J.split(J.split(fEst, "MICROORGANISMO")[0], "PRODUCTO")[0].jsTrim.uppercased()
        }
        return sitio + " " + fechaC + ": " + estado
    }

    static func parseCultivo(_ textoBruto: String, _ tNorm: String) -> String {
        let tUpper = tNorm.uppercased()
        if !isCultivoReportText(tUpper) { return "" }
        let fechaC = parseCultivoFecha(tNorm)
        let lineasTexto = J.split(textoBruto, "\n").map { reCr.replace($0, with: "") }
        let germenRuns = S.findCultivoGermenRuns(lineasTexto)
        let mycoOut = S.parseMycobacteriasStudies(lineasTexto, fechaC)
        if !mycoOut.isEmpty && germenRuns.isEmpty { return mycoOut }
        let sitio = S.buildCultivoTipoDisplay(S.detectTipoCultivoLine(lineasTexto), S.detectMuestraDesdeProducto(lineasTexto))
        let reportePreliminar = rePreliminar.test(lineasTexto.joined(separator: "\n"))
        if !germenRuns.isEmpty {
            return parseCultivoGermenRuns(germenRuns, lineasTexto, sitio, fechaC, reportePreliminar)
        }
        return parseCultivoNegativo(tNorm, tUpper, sitio, fechaC)
    }

    // MARK: labs-cultivo-abbr.mjs

    private static let atbAbbrRules: [(JSRegex, String)] = [
        (JSRegex(#"PIPERACILINA|PIP\/TAZ"#), "PIP/TAZO"),
        (JSRegex(#"TRIMET|TMP\/SMX|TRIMET\/SULFA"#), "TMP/SMX"),
        (JSRegex(#"AMP\S*\/\s*SULB|AMPICILINA.*SULBACTAM|AMP\/SULB"#), "AMP-SULB"),
        (JSRegex(#"GENT\.?\s*SINERG|SINERG"#), "GENT-SIN"),
        (JSRegex(#"GENTAMICINA"#), "GENT"),
        (JSRegex(#"AMIKACINA"#), "AMIK"),
        (JSRegex(#"TOBRAMICINA"#), "TOBRA"),
        (JSRegex(#"TETRACICLINA"#), "TETRA"),
        (JSRegex(#"NITROFURANTOINA"#), "NITRO"),
        (JSRegex(#"CIPROFLOXACINA"#), "CIPRO"),
        (JSRegex(#"LEVOFLOXACINA"#), "LVX"),
        (JSRegex(#"MEROPENEM"#), "MERO"),
        (JSRegex(#"ERTAPENEM"#), "ERTA"),
        (JSRegex(#"IMIPENEM"#), "IMI"),
        (JSRegex(#"CEFTRIAXONA"#), "CFTX"),
        (JSRegex(#"CEFOTAXIMA"#), "CTX"),
        (JSRegex(#"CEFOXITINA"#), "CFXN"),
        (JSRegex(#"CEFAZOLINA"#), "CFZ"),
        (JSRegex(#"CEFEPIMA"#), "FEP"),
        (JSRegex(#"CEFTAZIDIM.*AVIBACT|AVIBACTAM"#), "CAZ-AVI"),
        (JSRegex(#"CEFTAZIDIM|CEFTAZIDIMA"#), "CAZ"),
        (JSRegex(#"DAPTOMICINA"#), "DAPTO"),
        (JSRegex(#"LINEZOLID"#), "LINEZ"),
        (JSRegex(#"VANCOMICINA"#), "VANCO"),
        (JSRegex(#"PENICILINA|BENZILPENICILINA"#), "PEN"),
        (JSRegex(#"AMPICILINA"#), "AMP"),
        (JSRegex(#"CLINDAMICINA"#), "CLINDA"),
    ]
    private static let reAmpicilina = JSRegex(#"AMPICILINA"#)
    private static let reSulb = JSRegex(#"SULB"#)
    private static let reSodico = JSRegex(#"\bSODICO\b|\bSODIUM\b|\bDISODICO\b"#, "g")
    private static let reWsSplit = JSRegex(#"\s+"#)

    static func abreviarAbAtb(_ raw: String) -> String {
        let n = raw.uppercased().jsTrim
        for (re, abbr) in atbAbbrRules where re.test(n) { return abbr }
        if reAmpicilina.test(n) && !reSulb.test(n) { return "AMP" }
        let noSod = J.split(reSodico.replace(n, with: "").jsTrim, "(")[0].jsTrim
        let base = reWsSplit.split(noSod).first ?? ""
        return J.len(base) > 10 ? J.substring(base, 0, 10) : base
    }
}
