import Foundation

/// Port of labs-report-refs.mjs.
enum LabReportRefs {
    typealias Refs = [String: [String: [Double]]]
    private typealias X = LabExtract

    private static let meses: [String: String] = [
        "ene": "01", "feb": "02", "mar": "03", "abr": "04", "may": "05", "jun": "06", "jul": "07", "ago": "08",
        "sep": "09", "oct": "10", "nov": "11", "dic": "12", "jan": "01", "apr": "04", "aug": "08", "dec": "12",
    ]

    private static func pad2(_ s: String) -> String { (s as NSString).length < 2 ? String(repeating: "0", count: 2 - (s as NSString).length) + s : s }

    private static func padFechaDMY(_ d: String, _ m: String, _ yStr: String) -> String {
        let y = (yStr as NSString).length == 2 ? "20" + yStr : yStr
        return pad2(d) + "/" + pad2(m) + "/" + y
    }

    private static let registroMonRe = JSRegex(#"Fecha\s+Registro\s*:?\s*\r?\n?\s*([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})"#, "i")
    private static let patronesNum = [
        JSRegex(#"Fecha\s+(?:de\s+)?(?:Registro|resultado|Resultado|muestra|Muestra|emisi[oó]n|ingreso|extracci[oó]n)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})"#, "i"),
        JSRegex(#"(?:Fecha|FECHA)\s+DEL\s+ESTUDIO\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})"#, "i"),
        JSRegex(#"Recepci[oó]n\s*(?:de\s*)?(?:muestra)?\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})"#, "i"),
        JSRegex(#"(?:Captura|Validaci[oó]n|Reporte)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})"#, "i"),
    ]
    private static let fechaHeadRe = JSRegex(#"\bFecha\s*:\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b"#, "i")

    /// `extractLabReportFechaDMY(textoBruto)`: dd/mm/aaaa or "".
    static func extractLabReportFechaDMY(_ t: String) -> String {
        if t.isEmpty { return "" }
        if let m = registroMonRe.firstMatch(t), let mon = meses[BaseJS.slice((m[1] ?? "").lowercased(), 0, 3)] {
            return padFechaDMY(m[2] ?? "", mon, m[3] ?? "")
        }
        for re in patronesNum {
            if let m = re.firstMatch(t) { return padFechaDMY(m[1] ?? "", m[2] ?? "", m[3] ?? "") }
        }
        if let m = fechaHeadRe.firstMatch(BaseJS.slice(t, 0, 3200)) { return padFechaDMY(m[1] ?? "", m[2] ?? "", m[3] ?? "") }
        return ""
    }

    private static let expColonRe = JSRegex(#"Expediente\s*:"#, "i")
    private static let nombreColonRe = JSRegex(#"Nombre\s*:"#, "i")
    private static let registroRe = JSRegex(#"Fecha\s+Registro"#, "i")
    private static let someSectionRe = JSRegex(#"HEMATOLOG[IÍ]A|QU[IÍ]MICA|BIOMETR[IÍ]A|GASOMETR[IÍ]A|BANCO\s+DE\s+SANGRE|TROPONINA"#, "i")

    /// `looksLikeSomeLabReport(textoBruto)`.
    static func looksLikeSomeLabReport(_ t: String) -> Bool {
        if t.isEmpty || !expColonRe.test(t) || !nombreColonRe.test(t) { return false }
        return registroRe.test(t) || someSectionRe.test(t)
    }

    private static let dotRe = JSRegex(#"\."#, "g")
    private static let wsRe = JSRegex(#"\s+"#, "g")

    private static func applyMeridiemHour(_ hh: Int, _ raw: String?) -> Int {
        guard let raw, !raw.isEmpty else { return hh }
        let t = wsRe.replace(dotRe.replace(raw.lowercased(), with: ""), with: "")
        let isPm = t == "pm" || t == "p" || t.contains("pm")
        let isAm = t == "am" || t == "a" || t.contains("am")
        if isPm && !isAm { return hh < 12 ? hh + 12 : hh }
        if isAm && !isPm { return hh == 12 ? 0 : hh }
        return hh
    }

    private static func horaFromMatch(_ m: JSRegex.Match) -> String {
        guard var hh = jsParseInt(m[1] ?? ""), let mm = jsParseInt(m[2] ?? "") else { return "" }
        hh = applyMeridiemHour(hh, m[4])
        if hh < 0 || hh > 23 || mm < 0 || mm > 59 { return "" }
        return pad2(String(hh)) + ":" + pad2(String(mm))
    }

    private static let horaMonRe = JSRegex(#"Fecha\s+Registro\s*:?[\s\t]*[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?"#, "i")
    private static let horaNumRe = JSRegex(#"Fecha\s+Registro\s*:?[\s\t]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*((?:a|p)\.?\s*m\.?|AM|PM)?"#, "i")

    /// `extractLabReportHora(textoBruto)`: HH:MM (24 h) or "".
    static func extractLabReportHora(_ t: String) -> String {
        if t.isEmpty { return "" }
        let head = BaseJS.slice(t, 0, 4000)
        if let m = horaMonRe.firstMatch(head) { return horaFromMatch(m) }
        if let m = horaNumRe.firstMatch(head) { return horaFromMatch(m) }
        return ""
    }

    private static func put(_ refs: inout Refs, _ sec: String, _ field: String, _ d: LabValorRango) {
        guard let mn = d.min, let mx = d.max, d.valor != "---", mn.isFinite, mx.isFinite, mx > mn else { return }
        refs[sec, default: [:]][field] = [mn, mx]
    }

    private static let gasoRe = JSRegex(#"GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)"#, "i")
    private static let lcrRes = [
        JSRegex(#"CITOQUIMICO\s+DE\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)"#, "i"),
        JSRegex(#"CITOQUIMICO\s+LIQ\.?\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)"#, "i"),
        JSRegex(#"CITOQUIMICO\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)"#, "i"),
    ]
    private static let egoRe = JSRegex(#"(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)"#, "i")
    private static let crRe = JSRegex(#"\r"#, "g")
    private static let gasoTestRe = JSRegex(#"GASOMETRIA"#, "i")
    private static let noGasoOnlyRe = JSRegex(#"BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO"#, "i")

    /// `someReportBlocks_(textoBruto)`.
    private static func someReportBlocks(_ t: String) -> (tSinLiqCorp: String, textoQS: String, bloqueGaso: String, esSoloGaso: Bool) {
        let tNorm = wsRe.replace(t, with: " ")
        let bloqueGaso = gasoRe.firstMatch(tNorm)?.whole ?? ""
        let bloqueLCR = lcrRes.lazy.compactMap { $0.firstMatch(t) }.first?.whole ?? ""
        let bloqueCitoLC = FluidCito.bloqueCitoquimicoLiquidosFull(t)
        let bloqueEGO = egoRe.firstMatch(tNorm)?.whole ?? ""
        var tSin = tNorm
        if !bloqueCitoLC.isEmpty { tSin = ProcesarLabs.replaceFirst(tNorm, wsRe.replace(crRe.replace(bloqueCitoLC, with: ""), with: " "), " ") }
        let lcrNorm = bloqueLCR.isEmpty ? "" : wsRe.replace(bloqueLCR, with: " ")
        let textoQS = ProcesarLabs.replaceFirst(ProcesarLabs.replaceFirst(ProcesarLabs.replaceFirst(tSin, bloqueGaso, " "), bloqueEGO, " "), lcrNorm, " ")
        let esSoloGaso = gasoTestRe.test(tNorm) && !noGasoOnlyRe.test(tNorm)
        return (tSin, textoQS, bloqueGaso, esSoloGaso)
    }

    private static func putBh(_ r: inout Refs, _ t: String) {
        put(&r, "BH", "Hb", X.extraerConRangoSuero(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], t))
        put(&r, "BH", "Hto", X.extraerConRango(["HCT ", "HEMATOCRITO"], t))
        put(&r, "BH", "VCM", X.extraerConRango(["MCV ", "VCM "], t))
        put(&r, "BH", "HCM", X.extraerConRango(["MCH ", "HCM "], t))
        put(&r, "BH", "CHCM", X.extraerConRango(["MCHC", "CHCM"], t))
        put(&r, "BH", "RDW", X.extraerConRango(["RDW "], t))
        put(&r, "BH", "Leu", X.extraerConRango(["WBC "], t))
        put(&r, "BH", "Neu", X.extraerConRango(["NEU "], t))
        put(&r, "BH", "Eos", X.extraerConRango(["EOS "], t))
        put(&r, "BH", "Lin", X.extraerConRango(["LYM ", "LINFOCITOS"], t))
        put(&r, "BH", "Mono", X.extraerConRango(["MONO "], t))
        put(&r, "BH", "Baso", X.extraerConRango(["BASO "], t))
        put(&r, "BH", "Plt", X.extraerConRango(["PLT "], t))
        put(&r, "BH", "MPV", X.extraerConRango(["MPV ", "VPM "], t))
        put(&r, "BH", "RBC", X.extraerConRango(["RBC ", "ERITROCITOS", "HEMATIES"], t))
        put(&r, "BH", "Ret", X.extraerConRango(["RETICULOCITOS"], t))
        put(&r, "BH", "TP", X.extraerConRangoCoag(["TIEMPO DE PROTROMBINA"], t))
        put(&r, "BH", "TTP", X.extraerConRangoCoag(["TIEMPO DE TROMBOPLASTINA"], t))
        put(&r, "BH", "INR", X.extraerConRangoCoag(["INR "], t))
    }

    private static func putQsEscPfh(_ r: inout Refs, _ q: String, _ t: String) {
        put(&r, "QS", "Glu", X.extraerConRangoSuero(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], q))
        put(&r, "QS", "Cr", X.extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], q))
        put(&r, "QS", "BUN", X.extraerConRangoSuero(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], q))
        put(&r, "QS", "PCR", X.extraerConRangoSuero(["PROTEINA C REACTIVA", "PROTEÍNA C REACTIVA"], q))
        put(&r, "QS", "PCT", LabChem.extraerProcalcitonina(q))
        put(&r, "QS", "AU", X.extraerConRangoSuero(["ACIDO URICO EN SANGRE", "ACIDO URICO", "ÁCIDO ÚRICO"], q))
        put(&r, "QS", "COL", X.extraerConRangoSuero(["COLESTEROL"], q))
        put(&r, "QS", "HDL", X.extraerConRangoSuero(["COLESTEROL HDL", "HDL COLESTEROL"], q))
        put(&r, "QS", "LDL", X.extraerConRangoSuero(["COLESTEROL LDL", "LDL COLESTEROL"], q))
        put(&r, "QS", "VLDL", X.extraerConRangoSuero(["VLDL"], q))
        put(&r, "QS", "TGL", X.extraerConRangoSuero(["TRIGLICERIDOS", "TRIGLICÉRIDOS"], q))
        put(&r, "QS", "IA", X.extraerIndiceAterogenico(q))
        put(&r, "QS", "CTHDL", X.extraerConRangoSuero(["COCIENTE COL.TOT/HDL", "COCIENTE COL.TOT / HDL", "COCIENTE COL TOT/HDL"], q))
        put(&r, "QS", "VSG", X.extraerConRangoSuero(["VSG ", "VELOCIDAD DE SEDIMENTACION"], q))
        put(&r, "QS", "CPK", X.extraerConRangoSuero(["CPK CREATIN FOSFO QUINASA", "CPK "], q))
        put(&r, "ESC", "Na", X.extraerConRangoSuero(["SODIO"], q))
        put(&r, "ESC", "Cl", X.extraerConRangoSuero(["CLORO"], q))
        put(&r, "ESC", "K", X.extraerConRangoSuero(["POTASIO"], q))
        put(&r, "ESC", "Ca", X.extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], q))
        put(&r, "ESC", "F", X.extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "FÓSFORO"], q))
        put(&r, "ESC", "Mg", X.extraerConRangoSuero(["MAGNESIO"], q))
        put(&r, "PFHs", "Alb", X.extraerConRangoSuero(["ALBUMINA"], t))
        put(&r, "PFHs", "AST", X.extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], t))
        put(&r, "PFHs", "ALT", X.extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], t))
        put(&r, "PFHs", "FA", X.extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], t))
        put(&r, "PFHs", "BT", X.extraerConRango(["BILIRRUBINA TOTAL"], t))
        put(&r, "PFHs", "BD", X.extraerConRango(["BILIRRUBINA DIRECTA"], t))
        put(&r, "PFHs", "BI", X.extraerConRango(["BILIRRUBINA INDIRECTA"], t))
        put(&r, "PFHs", "LDH", X.extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH DESHIDROGENASA LAC", "LDH "], t))
        put(&r, "PFHs", "Amil", X.extraerConRango(["AMILASA SERICA", "AMILASA"], t))
        put(&r, "LIPASA", "Lip", X.extraerConRango(["LIPASA SERICA", "LIPASA "], q))
    }

    private static func putTrop(_ r: inout Refs, _ t: String) {
        let hits = LabTroponin.extractAllTroponinaFromText(t)
        guard let first = hits.first else { return }
        var mn = 0.0, mx = LabTroponin.troponinaHsNormalMaxNgL
        if let a = first.min, let b = first.max, b > a { mn = a; mx = b }
        put(&r, "TROP", "TnI1", LabValorRango(valor: first.valor, min: mn, max: mx))
        if hits.count > 1 { put(&r, "TROP", "TnI2", LabValorRango(valor: hits[hits.count - 1].valor, min: mn, max: mx)) }
    }

    private static func putGaso(_ r: inout Refs, _ b: String) {
        if b.isEmpty { return }
        put(&r, "GASES", "pH", X.extraerConRango(["PH "], b))
        put(&r, "GASES", "pCO2", X.extraerConRango(["PCO2"], b))
        put(&r, "GASES", "pO2", X.extraerConRango(["PO2 "], b))
        put(&r, "GASES", "Na", X.extraerConRango(["SODIO"], b))
        put(&r, "GASES", "K", X.extraerConRango(["POTASIO"], b))
        put(&r, "GASES", "GLU", X.extraerConRango(["GLUCOSA"], b))
        put(&r, "GASES", "Lactato", X.extraerConRango(["LACTATO"], b))
        put(&r, "GASES", "Bica", X.extraerConRango(["HCO3"], b))
        put(&r, "GASES", "Hto", X.extraerConRango(["HCT ", "HEMATOCRITO"], b))
        let ica = X.extraerConRango(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], b)
        put(&r, "GASES", "iCa", LabValorRango(valor: ica.valor, min: ica.min ?? 1.12, max: ica.max ?? 1.32))
    }

    /// `buildRefsBySectionFromReport(textoBruto)`: section -> field -> [min, max] from the report.
    static func buildRefsBySectionFromReport(_ t: String) -> Refs {
        if t.isEmpty { return [:] }
        let b = someReportBlocks(t)
        var refs: Refs = [:]
        if !b.esSoloGaso {
            putBh(&refs, b.tSinLiqCorp)
            putQsEscPfh(&refs, b.textoQS, b.tSinLiqCorp)
        }
        putTrop(&refs, t)
        putGaso(&refs, b.bloqueGaso)
        return refs
    }
}
