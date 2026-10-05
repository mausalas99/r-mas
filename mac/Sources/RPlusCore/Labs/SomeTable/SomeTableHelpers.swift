import Foundation

/// Port of labs-some-table-helpers.mjs (only what parseSomeReportTables needs).
extension SomeTableParser {
    static let someDepartments = [
        "HEMATOLOGIA", "QUIMICA CLINICA", "BACTERIOLOGIA", "GASOMETRIA", "GASOMETRIAS", "INMUNOLOGIA",
        "COAGULACION", "URIANALISIS", "EXAMEN GENERAL DE ORINA", "ANALISIS DE ORINA", "CULTIVO", "BANDEJA",
    ]
    static let wsRe = JSRegex(#"\s+"#, "g")
    static let deptRe = JSRegex(
        "^(" + someDepartments.map { wsRe.replace($0, with: #"\s+"#) }.joined(separator: "|") + ")$", "i")
    static let flattenDeptKeys: Set<String> = ["QUIMICA CLINICA", "EXAMEN GENERAL DE ORINA", "ANALISIS DE ORINA", "URIANALISIS"]
    static let citoGroupRe = JSRegex(#"CITOQUIMICO\s+DE\s+LIQUIDOS\s+CORPORALES"#, "i")

    private static let crRe = JSRegex(#"\r"#, "g")
    private static let leadStarsRe = JSRegex(#"^\*+\s*"#)
    private static let trailTabsRe = JSRegex(#"\t+$"#)
    private static let headerTokenRe = JSRegex(#"^(ESTUDIO|RESULTADO(\s+UNIDADES)?|UNIDADES|VALOR\s+DE\s+REFERENCIA)$"#)
    private static let estudioRe = JSRegex("ESTUDIO")
    private static let resultadoRe = JSRegex("RESULTADO")
    private static let flagRe = JSRegex(#"^(\*|A|B|CB|CA)$"#, "i")
    private static let observacionesRe = JSRegex(#"^OBSERVACIONES?\b"#)
    private static let noiseRes = [
        #"^COMENTARIOS?\s+DE(?:\s+LA)?\s+MUESTRA\b"#, #"^OBSERVACIONES?\b"#, #"^OBSERVACION\b"#, #"^OBS\b"#,
        #"^SIN\s+VALOR\b"#, #"^TEXTO\s+LIBRE\b"#, #"^VALOR\s+DE\s+REFERENCIA\b"#, #"^NOTA(?:S)?\s+(?:DE\s+)?MUESTRA\b"#,
    ].map { JSRegex($0) }
    private static let sectionDividerRe = JSRegex(#"^(FISICO|QUIMICO|SEDIMENTO|MICROSCOPICO)$"#)
    private static let ausenteRe = JSRegex(#"^AUSENTE$"#, "i")
    private static let cultPruneRe = JSRegex(#"^MICROORGANISMO|^CUENTA|^COMENTARIO"#, "i")
    private static let examenQuimicoRe = JSRegex(#"^EXAMEN\s+QUIMICO$"#)
    private static let citoDeEndRe = JSRegex(#"^CITOQUIMICO\s+DE\s*$"#)
    private static let examenRe = JSRegex(#"^EXAMEN\b"#)
    private static let metaFieldRe = JSRegex(#"^(Expediente|Solicitud|Nombre|Sexo|Edad|Ubicaci[oó]n|M[eé]dico|Fecha\s+Registro)\s*:"#, "i")
    private static let metaDateTabRe = JSRegex(#"^[A-Za-z]{3}\s+\d{1,2}\s+\d{4}"#)
    private static let metaPageRe = JSRegex(#"^(UNIVERSIDAD\b|Ced\.?\s*Profesional\b|REPORTE DE RESULTADOS\b|FEMENINO$|MASCULINO$|MEDICINA INTERNA\b)"#, "i")
    private static let metaStampRe = JSRegex(#"\b[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}\s*[AP]M\s*$"#)
    private static let inlineMetaStartRe = JSRegex(#"^(?:Expediente|Solicitud)\s*:"#, "i")
    private static let inlineMetaTailRe = JSRegex(#"\s*(?:Expediente|Solicitud)\s*:[\s\S]*$"#, "i")
    private static let inlineMetaAnyRe = JSRegex(#"\b(?:Expediente|Solicitud)\s*:"#, "i")
    static let numberOnlyRe = JSRegex(#"^\d+([.,]\d+)?$"#)
    static let upperLetterRe = JSRegex(#"[A-ZÁÉÍÓÚÑ]"#)
    private static let serumQcRe = JSRegex(#"^(ALBUMINA|COLESTEROL|TRIGLICERIDOS|VLDL|INDICE ATEROGENICO|ÍNDICE ATEROGÉNICO|COCIENTE COL)\b"#, "i")
    private static let comentarioOnlyRe = JSRegex(#"^COMENTARIO$"#, "i")
    private static let examenQuimicoIRe = JSRegex(#"^EXAMEN\s+QUIMICO$"#, "i")
    private static let sectionTitleRe = JSRegex(#"\b(CITOQUIMICO DE|LIQUIDOS CORPORALES|BIOMETRIA HEMATICA|TIEMPO DE|EXAMEN GENERAL DE ORINA|FISICOQUIMICO|FIBRAS VEGETALES|RELACION A\/G|PLAQUETAS CON|FROTIS|VELOCIDAD DE)\b"#, "i")
    private static let notTitleCharRe = JSRegex(#"[^A-ZÁÉÍÓÚÑ0-9\s/().-]"#, "g")
    private static let refWordRe = JSRegex(#"^(NEGATIVO|POSITIVO|AUSENTE|AUSENTES|N\/A|NA)$"#)
    static let leadDigitMinusRe = JSRegex(#"^-?\d"#)
    static let spacedDashRe = JSRegex(#"\s-\s"#)
    private static let rangeRe = JSRegex(#"^-?\d+([.,]\d+)?\s*-\s*-?\d+([.,]\d+)?(\/[A-Za-z]+)?$"#, "i")
    private static let qualitativeRe = JSRegex(#"^(negativo|positivo|ausente|ausentes|escasas?|abundantes?|moderadas?|claro|amarillo|turbi[do]a?|presente|no\s+detectado)$"#, "i")
    static let leadDigitRe = JSRegex(#"^\d"#)
    private static let digitRe = JSRegex(#"\d"#)
    private static let unitWordRe = JSRegex(#"^(g\/dL|mg\/dL|mmol\/L|K\/uL|M\/uL|mm\/hr|mm3|\/CAMPO|UI\/L|IU\/L|E\.U\.|Hem\/uL|Leucocitos\/uL|%|SEG\.?|fL|pg)$"#, "i")
    private static let unitSlashRe = JSRegex(#"^[A-Za-z][A-Za-z0-9/.%-]*\/[A-Za-z0-9/.%-]+$"#, "i")
    private static let threeLettersRe = JSRegex(#"[a-zA-Z]{3,}"#)

    // MARK: small JS helpers

    /// `lines[i] || ''`
    static func at(_ lines: [String], _ i: Int) -> String { i >= 0 && i < lines.count ? lines[i] : "" }
    /// `lines.slice(a, b)`
    static func slice(_ lines: [String], _ a: Int, _ b: Int) -> [String] {
        let lo = min(max(a, 0), lines.count), hi = min(max(b, lo), lines.count)
        return Array(lines[lo..<hi])
    }
    /// JS `===` on strings (code units, not canonical equivalence).
    static func same(_ a: String, _ b: String) -> Bool { a.utf16.elementsEqual(b.utf16) }

    // MARK: helpers

    static func normLine(_ raw: String) -> String { crRe.replace(raw, with: "").jsTrim }
    static func cleanValue(_ raw: String) -> String { leadStarsRe.replace(normLine(raw), with: "").jsTrim }
    static func cleanEstudio(_ raw: String) -> String { trailTabsRe.replace(normLine(raw), with: "").jsTrim }

    static func isTableHeaderLine(_ line: String, _ nextLine: String? = nil) -> Bool {
        let u = line.uppercased().jsTrim
        if estudioRe.test(u) && resultadoRe.test(u) { return true }
        if !headerTokenRe.test(u) { return false }
        if let n = nextLine, isFlagToken(n) { return false }
        return true
    }

    static func isDepartmentLine(_ line: String) -> Bool { deptRe.test(cleanEstudio(line).uppercased()) }

    static func departmentKey(_ line: String) -> String {
        let c = cleanEstudio(line).uppercased()
        guard let m = deptRe.firstMatch(c), let g1 = m.groups[1] else { return "" }
        let hit = someDepartments.first { same(wsRe.replace($0, with: " "), wsRe.replace(g1, with: " ")) }
        return hit ?? g1
    }

    static func isFlagToken(_ tok: String) -> Bool { flagRe.test(tok.jsTrim) }
    static func isAbnormalFlag(_ flag: String) -> Bool { flagRe.test(flag.jsTrim) && flag.jsTrim != "*" }

    static func normalizeDeptKey(_ key: String) -> String { wsRe.replace(key, with: " ").jsTrim.uppercased() }

    static func isSkippedGroupTitle(_ name: String) -> Bool {
        let u = cleanEstudio(name).uppercased()
        return isCommentNoiseEstudio(u) || observacionesRe.test(u)
    }

    static func isCommentNoiseEstudio(_ name: String) -> Bool {
        let u = cleanEstudio(name).uppercased()
        if u == "COMENTARIO" { return false }
        return noiseRes.contains { $0.test(u) }
    }

    static func isCitoGroupTitle(_ title: String) -> Bool { citoGroupRe.test(title) }

    static func isSectionDividerEstudio(_ name: String) -> Bool { sectionDividerRe.test(cleanEstudio(name).uppercased()) }

    static func skipSectionDividerBlock(_ lines: [String], _ startIdx: Int) -> Int {
        let label = cleanEstudio(at(lines, startIdx))
        var i = startIdx + 1
        while i < lines.count {
            let p = cleanEstudio(lines[i])
            i += 1
            if p.isEmpty { continue }
            if isTableHeaderLine(p) || isDepartmentLine(p) { i -= 1; break }
            if isFlagToken(p) { continue }
            if p.uppercased() == label.uppercased() { continue }
            if p == ":" || ausenteRe.test(p) { continue }
            break
        }
        return i
    }

    private static func emptyRes(_ res: String) -> Bool { res.isEmpty || res == ":" || res == "—" }

    static func pruneSomeCultureRows(_ rows: [SomeRow]) -> [SomeRow] {
        rows.filter { r in
            if r.estudio.isEmpty || isSectionDividerRow(r) { return false }
            let res = r.resultado.jsTrim
            if cultPruneRe.test(r.estudio) { return !emptyRes(res) }
            return !emptyRes(res)
        }
    }

    static func pruneSomeRows(_ rows: [SomeRow]) -> [SomeRow] {
        var out: [SomeRow] = []
        for r in rows {
            if r.estudio.isEmpty || isSectionDividerRow(r) { continue }
            if emptyRes(r.resultado.jsTrim) { continue }
            let key = r.estudio.uppercased()
            if let idx = out.firstIndex(where: { $0.estudio.uppercased() == key }) {
                let prev = out[idx].resultado.jsTrim
                if prev.isEmpty || prev == "—" { out[idx] = r }
                continue
            }
            out.append(r)
        }
        return out
    }

    static func isSectionDividerRow(_ row: SomeRow) -> Bool {
        let u = row.estudio.jsTrim.uppercased()
        if isSectionDividerEstudio(u) { return true }
        if examenQuimicoRe.test(u) { return true }
        if citoDeEndRe.test(u) { return true }
        let res = row.resultado.jsTrim
        if (res == ":" || res.isEmpty) && row.unidades.isEmpty && row.ref.isEmpty && examenRe.test(u) { return true }
        return false
    }

    static func isMetadataLine(_ line: String) -> Bool {
        let t = line.jsTrim
        if t.isEmpty { return true }
        if metaFieldRe.test(t) { return true }
        if metaDateTabRe.test(t) && t.contains("\t") { return true }
        if metaPageRe.test(t) { return true }
        if metaStampRe.test(t) { return true }
        return false
    }

    static func stripSomeInlineMetadata(_ raw: String) -> String {
        let t = raw.jsTrim
        if t.isEmpty { return "" }
        if inlineMetaStartRe.test(t) { return "" }
        return inlineMetaTailRe.replace(t, with: "").jsTrim
    }

    static func lineHasSomeMetadata(_ line: String) -> Bool {
        let t = line.jsTrim
        if t.isEmpty { return false }
        if isMetadataLine(t) { return true }
        return inlineMetaAnyRe.test(t)
    }

    private static func isInvalidStudyHeaderName(_ name: String, _ nextLine: String) -> Bool {
        name.isEmpty || isTableHeaderLine(name, nextLine) || isDepartmentLine(name) || isFlagToken(name)
            || numberOnlyRe.test(name) || name == ":" || isSkippedGroupTitle(name) || isCommentNoiseEstudio(name)
            || !upperLetterRe.test(name)
    }

    private static func studyHeaderMatchesNext(_ name: String, _ nextLines: [String]) -> Bool {
        let n0 = cleanEstudio(at(nextLines, 0))
        let n1 = cleanEstudio(at(nextLines, 1))
        if !n0.isEmpty && n0.uppercased() == name.uppercased() { return true }
        if isFlagToken(n0) { return true }
        return !n0.isEmpty && n0.uppercased() == name.uppercased() && isFlagToken(n1)
    }

    static func isStudyRowHeader(_ line: String, _ nextLines: [String]) -> Bool {
        let name = cleanEstudio(line)
        if isInvalidStudyHeaderName(name, cleanEstudio(at(nextLines, 0))) { return false }
        return studyHeaderMatchesNext(name, nextLines)
    }

    static func isSerumQcAnalyte(_ name: String) -> Bool { serumQcRe.test(name.jsTrim) }

    private static func isInvalidGroupTitleName(_ name: String) -> Bool {
        name.isEmpty || isTableHeaderLine(name) || isDepartmentLine(name) || comentarioOnlyRe.test(name)
            || examenQuimicoIRe.test(name) || isFlagToken(name) || numberOnlyRe.test(name) || name == ":"
            || looksLikeUnitsRefLine(name) || !upperLetterRe.test(name)
    }

    private static func groupTitleLooksLikeSection(_ name: String, _ nextLines: [String]) -> Bool {
        let upper = name.uppercased()
        for i in 0..<min(nextLines.count, 4) {
            let n = cleanEstudio(nextLines[i])
            if n.isEmpty { continue }
            if isTableHeaderLine(n) || isDepartmentLine(n) { return true }
            if n.uppercased().utf16.starts(with: (upper + " ").utf16) { return true }
            break
        }
        return sectionTitleRe.test(name)
    }

    /// `currentGroupTitle` is JS `state.currentGroup && state.currentGroup.title` ("" and nil are falsy).
    static func isLikelyGroupTitle(_ line: String, _ nextLines: [String], _ currentGroupTitle: String?) -> Bool {
        let name = cleanEstudio(line)
        if isInvalidGroupTitleName(name) { return false }
        if let c = currentGroupTitle, !c.isEmpty, name.uppercased() == c.uppercased() { return false }
        let upper = name.uppercased()
        if upper != name && notTitleCharRe.replace(upper, with: "") != upper { return false }
        return groupTitleLooksLikeSection(name, nextLines)
    }

    static func stripCommentNoiseFromDepartment(_ dept: SomeDeptRef) {
        dept.groups = dept.groups.compactMap { g -> SomeGroupRef? in
            let title = cleanEstudio(g.title)
            if isSkippedGroupTitle(title) || isCommentNoiseEstudio(title) { return nil }
            g.rows = g.rows.filter { !isCommentNoiseEstudio($0.estudio) && !isSkippedGroupTitle($0.estudio) }
            return g
        }.filter { !$0.rows.isEmpty }
    }

    static func looksLikeReferenceValue(_ line: String) -> Bool {
        let t = line.jsTrim
        if t.isEmpty { return false }
        if refWordRe.test(t) { return true }
        if leadDigitMinusRe.test(t) && spacedDashRe.test(t) { return true }
        if rangeRe.test(t) { return true }
        return false
    }

    static func looksLikeQualitativeResult(_ line: String) -> Bool {
        let t = line.jsTrim
        if t.isEmpty { return false }
        return qualitativeRe.test(t)
    }

    static func looksLikeUnitsRefLine(_ line: String) -> Bool {
        let t = line.jsTrim
        if t.isEmpty { return false }
        if looksLikeQualitativeResult(t) { return false }
        if t.contains("\t") {
            let left = String(t[..<t.range(of: "\t", options: .literal)!.lowerBound]).jsTrim
            if !left.isEmpty && !leadDigitRe.test(left) { return true }
            if digitRe.test(t) { return true }
        }
        if looksLikeReferenceValue(t) { return true }
        if leadDigitMinusRe.test(t) && spacedDashRe.test(t) { return true }
        if unitWordRe.test(t) { return true }
        if unitSlashRe.test(t) { return true }
        return false
    }

    static func parseUnitsRef(_ line: String) -> (unidades: String, ref: String) {
        let t = stripSomeInlineMetadata(line)
        if t.isEmpty { return ("", "") }
        if let tab = t.range(of: "\t", options: .literal) {
            return (stripSomeInlineMetadata(String(t[..<tab.lowerBound])), stripSomeInlineMetadata(String(t[tab.upperBound...])))
        }
        if looksLikeReferenceValue(t) { return ("", t) }
        if leadDigitRe.test(t) && spacedDashRe.test(t) && !threeLettersRe.test(spacedDashRe.split(t)[0]) { return ("", t) }
        return (t, "")
    }
}
