import Foundation

/// Unit "Core": port of labs-procesar.mjs (the procesarLabs pipeline). Refs, order, sanitize and bulk
/// helpers live in the other files of this dir.
public enum ProcesarLabs {
    typealias Refs = [String: [String: [Double]]]

    static let wsRe = JSRegex(#"\s+"#, "g")
    private static let expRe = JSRegex(#"Expediente:\s*([^\n\r]+)"#, "i")
    private static let expCutRe = JSRegex(#"\s+(?:Solicitud|Medico|Médico|Fecha|Sexo|Edad|Ubicaci)"#, "i")
    private static let nombreRe = JSRegex(#"Nombre:\s*([^\n\r]+)"#, "i")
    private static let nombreCutRe = JSRegex(#"Fecha|Sexo|Edad"#, "i")
    private static let sexoRe = JSRegex(#"Sexo:\s*([^\n\r]+)"#, "i")
    private static let sexoValRe = JSRegex(#"^(MASCULINO|FEMENINO|HOMBRE|MUJER|MALE|FEMALE|M\b|F\b)"#, "i")
    private static let edadRe = JSRegex(#"Edad:\s*([^\n\r]+)"#, "i")
    private static let edadNumRe = JSRegex(#"^\d+"#)
    private static let edadUnitRe = JSRegex(#"\b(años|meses|dias|días|semanas)\b"#, "i")
    private static let ubicRe = JSRegex(#"Ubicaci[oó]n:\s*([^\n\r]+)"#, "i")
    private static let tabsRe = JSRegex(#"\t+"#)
    private static let ubicCutRe = JSRegex(#"\s+(?:Medico|Médico|Edad)\s*:"#, "i")
    private static let gasoBlockRe = JSRegex(#"GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA|$)"#, "i")
    private static let egoBlockRe = JSRegex(#"(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)"#, "i")
    private static let hecesBlockRe = JSRegex(#"(?:PARASITOLOGIA|FISICOQUIMICO DE HECES).*?(?=HEMATOLOGIA|BIOMETRIA|QUIMICA CLINICA|GASOMETRIA|URIANALISIS|BACTERIOLOGIA|CULTIVO|COAGULACION|$)"#, "i")
    private static let gasoRe = JSRegex(#"GASOMETRIA"#, "i")
    private static let noGasoOnlyRe = JSRegex(#"BIOMETRIA|HEMATOLOGIA|RETICULOCITOS|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO"#, "i")

    /// JS `s.replace(sub, rep)` with a string pattern: first occurrence; "" inserts `rep` at the start.
    static func replaceFirst(_ s: String, _ sub: String, _ rep: String) -> String {
        if sub.isEmpty { return rep + s }
        let n = s as NSString
        let r = n.range(of: sub, options: .literal)
        return r.location == NSNotFound ? s : n.replacingCharacters(in: r, with: rep)
    }

    /// `extractLabExpedienteFromReport(textoBruto)`.
    static func extractLabExpedienteFromReport(_ textoBruto: String) -> String {
        guard let m = expRe.firstMatch(textoBruto) else { return "" }
        return (expCutRe.split(m[1] ?? "").first ?? "").jsTrim
    }

    private static func parseLabSexoNorm(_ m: JSRegex.Match?) -> String {
        guard let m, let sm = sexoValRe.firstMatch(m[1] ?? "") else { return "" }
        let sv = (sm[1] ?? "").uppercased()
        return sv == "MASCULINO" || sv == "HOMBRE" || sv == "MALE" || sv == "M" ? "M" : "F"
    }

    private static func parseLabEdadParts(_ m: JSRegex.Match?) -> (edadRaw: String, edadUnidad: String) {
        guard let m else { return ("", "años") }
        let v = m[1] ?? ""
        let raw = edadNumRe.firstMatch(v)?.whole ?? ""
        var unit = (edadUnitRe.firstMatch(v)?.whole ?? "años").lowercased()
        if unit == "dias" || unit == "días" { unit = "días" }
        return (raw, unit)
    }

    private static func parseLabUbicacion(_ textoBruto: String) -> String {
        guard let m = ubicRe.firstMatch(textoBruto) else { return "" }
        let uRaw = (m[1] ?? "").jsTrim
        let uTok = tabsRe.split(uRaw).map { $0.jsTrim }.filter { !$0.isEmpty }
        if let t = uTok.first { return t.jsTrim }
        let cut = ubicCutRe.split(uRaw).first ?? ""
        return (cut.isEmpty ? uRaw : cut).jsTrim
    }

    struct Blocks { var bloqueGaso: String; var textoQS: String; var textoParaBh: String; var esSoloGaso: Bool }

    static func segmentLabReportBlocks(_ textoBruto: String, _ tNorm: String) -> Blocks {
        let bloqueGaso = gasoBlockRe.firstMatch(tNorm)?.whole ?? ""
        let citoBlocksNorm = FluidParsers.citoquimicoBlocksNormText(textoBruto)
        let bloqueEGO = egoBlockRe.firstMatch(tNorm)?.whole ?? ""
        let bloqueHeces = hecesBlockRe.firstMatch(tNorm)?.whole ?? ""
        var tSinLiqCorp = tNorm
        for b in citoBlocksNorm { tSinLiqCorp = replaceFirst(tSinLiqCorp, b, " ") }
        let textoQS = replaceFirst(replaceFirst(replaceFirst(tSinLiqCorp, bloqueGaso, " "), bloqueEGO, " "), bloqueHeces, " ")
        var textoParaBh = tSinLiqCorp
        if !bloqueEGO.isEmpty { textoParaBh = replaceFirst(textoParaBh, bloqueEGO, " ") }
        if !bloqueHeces.isEmpty { textoParaBh = replaceFirst(textoParaBh, bloqueHeces, " ") }
        let esSoloGaso = gasoRe.test(tNorm) && !noGasoOnlyRe.test(tNorm)
        return Blocks(bloqueGaso: bloqueGaso, textoQS: textoQS, textoParaBh: textoParaBh, esSoloGaso: esSoloGaso)
    }

    private static func push(_ resLabs: inout [String], _ value: String?) {
        if let value, !value.isEmpty { resLabs.append(value) }
    }

    private static func collectCoreLabSections(_ resLabs: inout [String], _ blocks: Blocks, _ demograf: EgfrPatientCtx?,
                                               _ textoBruto: String, _ tNorm: String, _ prior: Refs,
                                               _ priorBhValues: [String: Double]) -> [String: String] {
        let bhRes = LabBH.parseBH(blocks.textoParaBh, priorRefs: prior["BH"], priorBhValues: priorBhValues)
        push(&resLabs, bhRes?.visible)
        push(&resLabs, bhRes?.coagVisible)
        push(&resLabs, LabChem.parseQS(blocks.textoQS, demograf: demograf, prior: prior["QS"]))
        push(&resLabs, LabChem.parseESC(blocks.textoQS, prior: prior["ESC"]))
        push(&resLabs, LabChem.parsePFH(blocks.textoParaBh, prior: prior["PFHs"]))
        push(&resLabs, LabChem.parseLipasa(blocks.textoQS, prior: prior["LIPASA"]))
        push(&resLabs, FluidParsers.parsePlaquetasCitrato(textoBruto, tNorm: tNorm, priorRefs: prior["PltCit"]))
        return bhRes?.extras ?? [:]
    }

    private static func collectLabSections(_ textoBruto: String, _ tNorm: String, _ blocks: Blocks, _ demograf: EgfrPatientCtx?,
                                           _ prior: Refs, _ priorBhValues: [String: Double]) -> (resLabs: [String], bhExtras: [String: String]) {
        var r: [String] = []
        let bhExtras = blocks.esSoloGaso ? [:] : collectCoreLabSections(&r, blocks, demograf, textoBruto, tNorm, prior, priorBhValues)
        push(&r, LabGaso.parseGaso(bloque: blocks.bloqueGaso, textoQS: blocks.textoQS, gasRefs: prior["GASES"]))
        push(&r, LabGaso.parsePIE(tNorm: tNorm))
        push(&r, FluidParsers.parsearLCR(textoBruto))
        push(&r, FluidParsers.parsearCitoquimicoLiquidos(textoBruto))
        push(&r, FluidParsers.citoquimicoInterpretacionLine(textoBruto))
        push(&r, FluidParsers.parseFisicoquimicoHeces(textoBruto))
        for line in FluidParsers.parseFrotisSangre(textoBruto).components(separatedBy: "\n") where !line.isEmpty { r.append(line) }
        push(&r, FluidParsers.parseEGO(textoBruto))
        push(&r, FluidParsers.parseElectrolitosOrina(textoBruto))
        push(&r, FluidParsers.parseDepuracionCreatinina(textoBruto))
        push(&r, FluidParsers.parseCuantOrina(textoBruto))
        push(&r, CultivoParser.parse(textoBruto))
        push(&r, FluidParsers.parseSerologiaBancoSangre(textoBruto))
        push(&r, FluidParsers.parseGrupoSangreCoombs(textoBruto))
        push(&r, LabChem.parseTroponina(textoBruto, prior: prior["TROP"]))
        for line in PanelParsers.parseExtendedLabPanels(textoBruto, priorBySec: prior) { push(&r, line) }
        return (r, bhExtras)
    }

    private static func parseLabPatientHeader(_ textoBruto: String) -> (patient: LabPatient, edadRaw: String, edadUnidad: String) {
        let mNombre = nombreRe.firstMatch(textoBruto)
        let edad = parseLabEdadParts(edadRe.firstMatch(textoBruto))
        var p = LabPatient()
        p.name = mNombre.map { (nombreCutRe.split($0[1] ?? "").first ?? "").jsTrim } ?? ""
        p.expediente = extractLabExpedienteFromReport(textoBruto)
        p.sexo = parseLabSexoNorm(sexoRe.firstMatch(textoBruto))
        p.edad = edad.edadRaw.isEmpty ? "" : edad.edadRaw + " " + edad.edadUnidad
        p.fecha = LabReportRefs.extractLabReportFechaDMY(textoBruto)
        p.hora = LabReportRefs.extractLabReportHora(textoBruto)
        p.ubicacion = parseLabUbicacion(textoBruto)
        return (p, edad.edadRaw, edad.edadUnidad)
    }

    /// `procesarLabs(textoBruto, options)`.
    public static func run(_ text: String, options: ProcesarLabsOptions? = nil) -> ProcesarLabsResult {
        let tNorm = wsRe.replace(text, with: " ")
        let hdr = parseLabPatientHeader(text)
        let blocks = segmentLabReportBlocks(text, tNorm)
        var prior: Refs = options?.priorRefsBySection ?? [:]
        if let gas = options?.gasRefs { prior["GASES"] = (prior["GASES"] ?? [:]).merging(gas) { _, b in b } }
        let egfrCtx = LabChem.buildEgfrPatientCtx(edadRaw: hdr.edadRaw, edadUnidad: hdr.edadUnidad, chartPatient: options?.patient)
        let sections = collectLabSections(text, tNorm, blocks, egfrCtx, prior, options?.priorBhValues ?? [:])
        let reportRefs = LabReportRefs.buildRefsBySectionFromReport(text)
        return ProcesarLabsResult(
            patient: hdr.patient,
            resLabs: LabResLabs.sanitizeResLabsChunks(LabResLabs.sortResLabsByClinicalOrder(LabGaso.dedupeSingletonSections(sections.resLabs))),
            bhExtras: sections.bhExtras,
            refsBySection: LabRefs.mergeRefsBySection(reportRefs, prior))
    }
}
