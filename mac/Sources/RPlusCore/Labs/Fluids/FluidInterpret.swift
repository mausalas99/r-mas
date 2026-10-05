import Foundation

/// Port of labs-citoquimico-interpret.mjs + labs-citoquimico-interpret-rules.mjs (line builders only, no serumOpts).
enum FluidInterpret {
    static let header = "INTERPRETACIÓN CITOQUÍMICO:"

    /// JS `'x' + n` where n may be null.
    private static func js(_ x: Double?) -> String { x.map(jsString) ?? "null" }

    static func formatCitoquimicoInterpretacionLine(_ alerts: [String]) -> String {
        let list = alerts.filter { !$0.isEmpty }
        return list.isEmpty ? "" : header + "\t" + list.joined(separator: " · ")
    }

    static func evaluarAscitisNoPortal(_ gasa: Double?, _ protGdl: Double?, _ tgl: Double?, _ amil: Double?, _ citologia: String?) -> String {
        guard let gasa, gasa < 1.1 else { return "" }
        guard let tgl else {
            return amil == nil ? "Solicitar triglicéridos y amilasa en líquido ascítico" : "Solicitar triglicéridos en líquido ascítico"
        }
        if tgl > 200 { return "Ascitis quilosa (TGL>200)" }
        guard let protGdl else { return "Evaluar proteínas totales en líquido ascítico" }
        if protGdl < 2.5 { return "Síndrome nefrótico? (Prot<2.5; proteinuria 24h)" }
        guard let amil else {
            if citologia == "positive" { return "Carcinomatosis peritoneal? (citología +)" }
            if citologia == "negative" { return "Peritonitis tuberculosa? (citología −; BAAR, ADA, biopsia)" }
            return "Solicitar amilasa y citología en líquido ascítico"
        }
        if amil > 1000 { return "Ascitis pancreática/perforación? (Amil>1000)" }
        guard let citologia else { return "Solicitar citología de líquido ascítico" }
        if citologia == "positive" { return "Carcinomatosis peritoneal? (citología +)" }
        return "Peritonitis tuberculosa? (citología −; BAAR, ADA, biopsia)"
    }

    static func evaluarPbeAscitis(_ leu: Double?, _ pmnInfo: FluidCito.PmnInfo, _ gram: String) -> [String] {
        var alerts: [String] = []
        var pmn = pmnInfo.pmnNum
        if pmn == nil, let leu, leu >= 250, pmnInfo.predominant { pmn = leu }
        if let p = pmn, p >= 250 {
            alerts.append("PMN " + jsString(p) + " ≥250/mm³ — peritonitis bacteriana espontánea? (cultivo + ATB empírico)")
        } else if let leu, leu >= 250 {
            alerts.append("Leu " + jsString(leu) + " ≥250/mm³ — descartar PBE (confirmar PMN absoluto)")
        }
        if FluidCito.gramIsPositive(gram) { alerts.append("Gram " + gram + " — infección bacteriana en líquido ascítico?") }
        return alerts
    }

    static func evaluarPleuralInfeccion(_ pH: Double?, _ glu: Double?, _ leu: Double?) -> [String] {
        var alerts: [String] = []
        if let pH, pH <= 7.2 { alerts.append("pH pleural " + jsString(pH) + " ≤7.20 — derrame complicado / empiema?") }
        if let glu, glu < 60 { alerts.append("Glu pleural " + jsString(glu) + " <60 mg/dL — derrame complicado / empiema?") }
        if let leu, leu >= 50000 { alerts.append("Leu " + jsString(leu) + " ≥50k/mm³ — empiema?") }
        return alerts
    }

    static func evaluarLcrPhSanity(_ pH: Double?) -> String {
        guard let pH, pH.isFinite else { return "" }
        if pH < 7.28 || pH > 7.42 {
            return "pH LCR " + jsString(pH) + " fuera de rango fisiológico (7.28–7.42) — verificar muestra/reporte"
        }
        return ""
    }

    private static func lcrGluLow(_ glu: Double?, _ serumGlu: Double?) -> Bool {
        guard let glu else { return false }
        if glu < 40 { return true }
        if let s = serumGlu, s > 0, glu / s < 0.4 { return true }
        return false
    }

    private static func pushBacterial(_ a: inout [String], _ leu: Double?, _ glu: Double?, _ gram: String) {
        if FluidCito.gramIsPositive(gram) { a.append("Meningitis bacteriana? (Gram " + gram + ")"); return }
        let gluTxt = glu != nil ? ", Glu LCR " + js(glu) : ""
        a.append("Meningitis bacteriana? (Leu " + js(leu) + gluTxt + " — cultivo/ATB empírico)")
    }

    private static func pushTb(_ a: inout [String], _ leu: Double?, _ glu: Double?, _ prot: Double?) {
        var bits = ["Leu " + js(leu)]
        if glu != nil { bits.append("Glu " + js(glu)) }
        if prot != nil { bits.append("Prot " + js(prot)) }
        a.append("Meningitis tuberculosa? (" + bits.joined(separator: ", ") + " — ADA/BAAR/genXpert)")
    }

    private static let tintaRe = JSRegex(#"POSITIV|LEVADUR|COC"#, "i")

    private static func leu100Plus(_ a: inout [String], _ leu: Double?, _ glu: Double?, _ prot: Double?, _ gram: String, _ serumGlu: Double?) {
        if !lcrGluLow(glu, serumGlu) {
            a.append("Meningitis bacteriana parcialmente tratada vs viral? (Leu " + js(leu) + " — correlacionar clínica)")
            return
        }
        if let p = prot, p > 100 { pushTb(&a, leu, glu, prot); return }
        pushBacterial(&a, leu, glu, gram)
    }

    static func evaluarLcrEtiologia(_ leu: Double?, _ glu: Double?, _ prot: Double?, _ gram: String, _ tinta: String, _ serumGlu: Double?) -> [String] {
        var a: [String] = []
        if leu == nil && glu == nil && prot == nil { return a }
        if let l = leu, l <= 5, !lcrGluLow(glu, serumGlu), prot == nil || prot! <= 45 { return a }
        let tintaSug = !tinta.isEmpty && !FluidCito.isGramNegative(tinta) && tintaRe.test(tinta)
        if FluidCito.gramIsPositive(gram) || tintaSug {
            pushBacterial(&a, leu, glu, gram.isEmpty ? tinta : gram)
            return a
        }
        guard let l = leu else { return a }
        if l >= 1000 { pushBacterial(&a, leu, glu, gram); return a }
        if l >= 100 { leu100Plus(&a, leu, glu, prot, gram, serumGlu); return a }
        if l >= 10 {
            if lcrGluLow(glu, serumGlu) || (prot.map { $0 > 100 } ?? false) { leu100Plus(&a, leu, glu, prot, gram, serumGlu); return a }
            a.append("Meningitis viral/aséptica? (Leu " + js(leu) + " — correlacionar PCR/virología)")
            return a
        }
        if l > 5 { a.append("Pleocitosis leve LCR (Leu " + js(leu) + ") — correlacionar clínica") }
        return a
    }

    /// `buildCitoquimicoInterpretAlerts_(textoBruto)` without serumOpts.
    static func buildCitoquimicoInterpretAlerts(_ textoBruto: String) -> [String] {
        let parsed = FluidCito.parseCitoquimicoLiquidosParsed(textoBruto)
        var alerts: [String] = []
        if !parsed.line.isEmpty {
            if parsed.esAscitico {
                alerts += evaluarPbeAscitis(parsed.leu, parsed.pmnInfo, parsed.gram)
                // appendGasaAlerts_
                if let alb = parsed.alb, alb != 0 {
                    if parsed.serumAlb == nil {
                        alerts.append("Incluir albúmina sérica del mismo día para calcular GASA")
                    } else if let g = parsed.gasaVal {
                        if g >= 1.1 {
                            alerts.append("GASA " + jsString(g) + " ≥1.1 — probable hipertensión portal")
                        } else {
                            alerts.append("GASA " + jsString(g) + " <1.1 — ascitis no portal")
                            let dx = evaluarAscitisNoPortal(g, parsed.protGdl, parsed.tgl, parsed.amil, parsed.citologia)
                            if !dx.isEmpty { alerts.append(dx) }
                        }
                    }
                }
            }
            if parsed.esPleural {
                if !parsed.lightTxt.isEmpty { alerts.append(parsed.lightTxt) }
                alerts += evaluarPleuralInfeccion(parsed.pH, parsed.glu, parsed.leu)
            }
        }
        if let lcr = FluidLcr.parseLcrParsed(textoBruto) {
            let ph = evaluarLcrPhSanity(lcr.pH)
            if !ph.isEmpty { alerts.append(ph) }
            let serumGlu = FluidCito.resolveSerumGlucoseForInterpret(textoBruto)
            alerts += evaluarLcrEtiologia(lcr.leu, lcr.glu, lcr.protMgdl, lcr.gram, lcr.tinta, serumGlu)
        }
        return alerts
    }
}
