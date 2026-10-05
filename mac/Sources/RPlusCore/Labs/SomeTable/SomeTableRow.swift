import Foundation

/// Port of labs-some-table-row-parse.mjs, labs-some-table-row.mjs and labs-some-table-normalize.mjs.
extension SomeTableParser {
    typealias ParsedRow = (row: SomeRow, nextIdx: Int)

    private static let cultureSampleRe = JSRegex(#"^(ASPIRADO|UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO|COPROCULTIVO|CATETER|LIQUIDO|SECRECION|ABSCESO|BRONCOALVEOLAR|CULTIVO)\b"#, "i")
    /// CULTURE_FIELD_RE (labs-some-table-row.mjs).
    private static let cultureFieldRe = JSRegex(#"^(PRODUCTO|TINCION|CALIDAD|ESTADO(\s+DE)?\s+CULTIVO|REPORTE\s+PRELIMINAR|MICROORGANISMO|COMENTARIO:?|CUENTA(\s+DE\s+KASS)?|ANTIBIOGRAMA|IDENTIFICACION)"#, "i")
    private static let fibrasRe = JSRegex(#"^FIBRAS\s+VEGETALES$"#, "i")
    private static let titleCaseRe = JSRegex(#"^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]"#)
    private static let productFollowRe = JSRegex(#"^PRODUCTO|^TINCION|^CALIDAD|^ESTADO(\s+DE)?\s+CULTIVO"#, "i")
    private static let microRe = JSRegex(#"^MICROORGANISMO$"#, "i")
    private static let cuentaRe = JSRegex(#"^CUENTA"#, "i")
    private static let cultBreakRe = JSRegex(#"^PRODUCTO$|^TINCION|^CALIDAD|^ESTADO|^REPORTE\s+PRELIMINAR"#, "i")
    private static let stopTitleRe = JSRegex(#"\b(FIBRAS VEGETALES|BIOMETRIA HEMATICA|TIEMPO DE|FROTIS)\b"#, "i")
    private static let comentarioPrefixRe = JSRegex(#"^COMENTARIO"#, "i")
    private static let cuentaMicroAtbRe = JSRegex(#"^(CUENTA|MICROORGANISMO|ANTIBIOGRAMA)\b"#, "i")
    private static let digitsDashRe = JSRegex(#"^\d+-\d+$"#)
    static let comentarioRe = JSRegex(#"^COMENTARIO$"#, "i")
    static let tipoMuestraRe = JSRegex(#"^TIPO\s+DE\s+MUESTRA$"#, "i")
    private static let liquidoDeRe = JSRegex(#"^LIQUIDO\s+DE\s+"#, "i")
    private static let citoDeEndIRe = JSRegex(#"^CITOQUIMICO\s+DE\s*$"#, "i")

    // MARK: culture rows

    static func isCultureFieldLine(_ line: String) -> Bool {
        let n = cleanEstudio(line)
        return !n.isEmpty && cultureFieldRe.test(n)
    }

    private static func isInvalidCultureSampleName(_ name: String) -> Bool {
        name.isEmpty || isFlagToken(name) || isDepartmentLine(name) || isTableHeaderLine(name)
            || isCitoGroupTitle(name) || fibrasRe.test(name) || titleCaseRe.test(name)
    }

    private static func cultureSampleHasProductFollow(_ nextLines: [String]) -> Bool {
        for i in 0..<min(nextLines.count, 8) {
            let n = cleanEstudio(nextLines[i])
            if n.isEmpty || isFlagToken(n) { continue }
            if productFollowRe.test(n) { return true }
            if n.uppercased() == cleanEstudio(at(nextLines, 0)).uppercased() { continue }
            break
        }
        return false
    }

    static func isCultureSampleTitle(_ line: String, _ nextLines: [String]) -> Bool {
        let name = cleanEstudio(line)
        if isInvalidCultureSampleName(name) || isCultureFieldLine(name) { return false }
        if cultureSampleRe.test(name) { return true }
        if name != name.uppercased() { return false }
        return cultureSampleHasProductFollow(nextLines)
    }

    private static func cultureRowShouldBreak(_ estudio: String, _ parts: [String]) -> Bool {
        if microRe.test(estudio) || cuentaRe.test(estudio) { return true }
        return cultBreakRe.test(estudio) && parts.count >= 1
    }

    // MARK: finalizeRow

    private static func assignRowPrimaryValue(_ value: String, _ p: String) -> String {
        if value.isEmpty && p != ":" && p != "—" { return p }
        if value == ":" && p != ":" && p != "—" { return p }
        return value
    }

    private static func mergeRowUnitsRef(_ unidades: String, _ ref: String, _ p: String, _ value: String) -> (String, String) {
        var unidades = unidades, ref = ref
        let ur = parseUnitsRef(p)
        if unidades.isEmpty && !ur.unidades.isEmpty { unidades = ur.unidades }
        if ref.isEmpty && !ur.ref.isEmpty { ref = ur.ref }
        if unidades.isEmpty && ref.isEmpty && !same(p, value) {
            if leadDigitRe.test(p) && spacedDashRe.test(p) { ref = p } else if unidades.isEmpty { unidades = p }
        }
        return (unidades, ref)
    }

    private static func renameProteinuriaRowName(_ estudio: String, _ unidades: String) -> String {
        if estudio.uppercased() == "RESULTADO" && unidades.lowercased() == "gr/vol" { return "Prot" }
        return estudio
    }

    static func finalizeRow(_ estudio: String, _ flag: String, _ valueParts: [String]) -> SomeRow? {
        let est = cleanEstudio(estudio)
        if est.isEmpty { return nil }
        let flagTok = isFlagToken(flag) ? flag.jsTrim : "*"
        var value = "", unidades = "", ref = ""
        for part in valueParts {
            let p = cleanValue(stripSomeInlineMetadata(part))
            if p.isEmpty || lineHasSomeMetadata(p) { continue }
            let nextValue = assignRowPrimaryValue(value, p)
            if !same(nextValue, value) { value = nextValue; continue }
            (unidades, ref) = mergeRowUnitsRef(unidades, ref, p, value)
        }
        return SomeRow(estudio: renameProteinuriaRowName(est, unidades), flag: flagTok, resultado: value,
                       unidades: unidades, ref: ref, abnormal: isAbnormalFlag(flagTok))
    }

    private static func shouldStopCultureRow(_ t: String, _ lines: [String], _ j: Int, _ parts: [String]) -> Bool {
        if isCultureFieldLine(t) || isCultureSampleTitle(t, slice(lines, j, j + 8)) { return true }
        if isDepartmentLine(t) || isTableHeaderLine(t) { return true }
        if parts.isEmpty && isFlagToken(t) {
            let peek = cleanEstudio(at(lines, j))
            return !peek.isEmpty && (isCultureFieldLine(peek) || isCultureSampleTitle(peek, slice(lines, j + 1, j + 9)))
        }
        return false
    }

    static func readCultureSomeRowAt(_ lines: [String], _ startIdx: Int, _ endIdx: Int) -> ParsedRow? {
        let estudio = cleanEstudio(at(lines, startIdx))
        if estudio.isEmpty || !isCultureFieldLine(estudio) { return nil }
        var j = startIdx + 1
        var flag = "*"
        var parts: [String] = []
        while j < endIdx {
            let t = cleanEstudio(at(lines, j))
            j += 1
            if t.isEmpty { continue }
            if shouldStopCultureRow(t, lines, j, parts) {
                if parts.isEmpty && isFlagToken(t) { break }
                j -= 1
                break
            }
            if parts.isEmpty && isFlagToken(t) { flag = t; continue }
            if t.uppercased() == estudio.uppercased() { continue }
            parts.append(t)
            if cultureRowShouldBreak(estudio, parts) { break }
        }
        guard let row = finalizeRow(estudio, flag, parts) else { return nil }
        return (row, j)
    }

    private static func cultureBlockEndIdx(_ lines: [String], _ startIdx: Int) -> Int {
        var k = startIdx + 1
        while k < lines.count {
            let t = cleanEstudio(lines[k])
            defer { k += 1 }
            if t.isEmpty || isFlagToken(t) { continue }
            if isDepartmentLine(t) || isTableHeaderLine(t) { return k }
            if k > startIdx + 1 && isCultureSampleTitle(t, slice(lines, k + 1, k + 9)) { return k }
        }
        return lines.count
    }

    static func parseBacteriologiaCultureGroup(_ lines: [String], _ startIdx: Int) -> (title: String, rows: [SomeRow], nextIdx: Int) {
        let title = cleanEstudio(at(lines, startIdx))
        let endIdx = cultureBlockEndIdx(lines, startIdx)
        var rows: [SomeRow] = []
        var i = startIdx + 1
        while i < endIdx {
            guard let parsed = readCultureSomeRowAt(lines, i, endIdx) else { i += 1; continue }
            rows.append(parsed.row)
            i = parsed.nextIdx
        }
        return (title, rows, endIdx)
    }

    static func isCultureGroupTitle(_ title: String) -> Bool {
        let t = cleanEstudio(title)
        if t.isEmpty { return false }
        return isCultureSampleTitle(t, ["PRODUCTO"])
    }

    // MARK: standard rows

    private static func isInvalidStandardRowHeader(_ estudio: String, _ nextLine: String) -> Bool {
        estudio.isEmpty || isFlagToken(estudio) || isTableHeaderLine(estudio, nextLine) || isDepartmentLine(estudio)
            || isSkippedGroupTitle(estudio) || isCommentNoiseEstudio(estudio) || isSectionDividerEstudio(estudio)
            || estudio == ":" || estudio == "—" || looksLikeReferenceValue(estudio)
    }

    private static func shouldStopAtGroupTitle(_ t: String, _ lines: [String], _ j: Int, _ parts: [String], _ cgt: String?) -> Bool {
        if !isLikelyGroupTitle(t, slice(lines, j, j + 9), cgt) { return false }
        return !parts.isEmpty || isCitoGroupTitle(t) || stopTitleRe.test(t)
    }

    private static func skipBlankLines(_ lines: [String], _ j: Int) -> Int {
        var j = j
        while j < lines.count && cleanEstudio(lines[j]).isEmpty { j += 1 }
        return j
    }

    private static func appendUnitsRefIfNext(_ parts: inout [String], _ lines: [String], _ j: Int) -> Int {
        if parts.count <= 1 || !looksLikeUnitsRefLine(parts[parts.count - 1]) { return j }
        let r = skipBlankLines(lines, j)
        let nxtRef = cleanEstudio(at(lines, r))
        let after = skipBlankLines(lines, r + 1)
        if !nxtRef.isEmpty && looksLikeReferenceValue(nxtRef) && !isFlagToken(cleanEstudio(at(lines, after))) {
            parts.append(nxtRef)
            return r + 1
        }
        return j
    }

    private static func shouldBreakStandardRowAtFlag(_ estudio: String, _ lines: [String], _ j: Int) -> Bool {
        let peek = cleanEstudio(at(lines, j))
        return comentarioPrefixRe.test(estudio) && !peek.isEmpty && cuentaMicroAtbRe.test(peek)
    }

    private enum Step { case stop(rewind: Bool), next(Int) }

    private static func consumeStandardRowPart(_ t: String, _ lines: [String], _ j: Int, _ parts: inout [String], _ cgt: String?) -> Step {
        if lineHasSomeMetadata(t) {
            let withoutMeta = stripSomeInlineMetadata(t)
            if withoutMeta.isEmpty || digitsDashRe.test(withoutMeta) { return .stop(rewind: true) }
            parts.append(withoutMeta)
            return .next(j)
        }
        if shouldStopAtGroupTitle(t, lines, j, parts, cgt) { return .stop(rewind: true) }
        parts.append(t)
        return .next(appendUnitsRefIfNext(&parts, lines, j))
    }

    private static func shouldBreakAfterParts(_ parts: [String], _ lines: [String], _ j: Int, _ t: String) -> Bool {
        if parts.count > 1 && looksLikeUnitsRefLine(t) { return true }
        if parts.count >= 1 {
            let nxt = skipBlankLines(lines, j)
            let nxtFlag = cleanEstudio(at(lines, skipBlankLines(lines, nxt + 1)))
            if !cleanEstudio(at(lines, nxt)).isEmpty && isFlagToken(nxtFlag) { return true }
        }
        return parts.count >= 4
    }

    private static func handleStandardRowToken(_ estudio: String, _ t: String, _ lines: [String], _ j: Int,
                                               _ parts: inout [String], _ cgt: String?, _ flag: inout String) -> Step {
        if isTableHeaderLine(t) || isDepartmentLine(t) { return .stop(rewind: true) }
        if parts.isEmpty && isFlagToken(t) {
            if shouldBreakStandardRowAtFlag(estudio, lines, j) { return .stop(rewind: false) }
            flag = t
            return .next(j)
        }
        if t.uppercased() == estudio.uppercased() { return .next(j) }
        return consumeStandardRowPart(t, lines, j, &parts, cgt)
    }

    static func readRowAt(_ lines: [String], _ startIdx: Int, _ cgt: String?) -> ParsedRow? {
        let estudio = cleanEstudio(at(lines, startIdx))
        if isInvalidStandardRowHeader(estudio, cleanEstudio(at(lines, startIdx + 1))) { return nil }
        var j = startIdx + 1
        var flag = "*"
        var parts: [String] = []
        while j < lines.count {
            let t = cleanEstudio(lines[j])
            j += 1
            if t.isEmpty { continue }
            switch handleStandardRowToken(estudio, t, lines, j, &parts, cgt, &flag) {
            case .stop(let rewind):
                if rewind { j -= 1 }
            case .next(let nj):
                j = nj
                if shouldBreakAfterParts(parts, lines, j, t) { break }
                continue
            }
            break
        }
        guard let row = finalizeRow(estudio, flag, parts) else { return nil }
        return (row, j)
    }

    // MARK: normalize (labs-some-table-normalize.mjs)

    static func normalizeSomeGroup(_ group: SomeGroupRef) {
        if group.someNormalized == true { return }
        let isCito = group.tableVariant == "cito" || isCitoGroupTitle(group.title)
        var fluidSource = group.fluidSource ?? ""
        var rows: [SomeRow] = []
        for r in group.rows {
            if comentarioRe.test(r.estudio) {
                let res = r.resultado.jsTrim
                fluidSource = res.isEmpty ? fluidSource : res
                continue
            }
            if tipoMuestraRe.test(r.estudio) { continue }
            if isCitoGroupTitle(r.resultado) || isCitoGroupTitle(r.estudio) { continue }
            if isSectionDividerRow(r) { continue }
            rows.append(r)
        }
        if isCito {
            let extracted = extractFluidSourceFromRows(rows)
            rows = extracted.rows
            if fluidSource.isEmpty { fluidSource = extracted.fluid }
        }
        group.rows = isCultureGroupTitle(group.title) ? pruneSomeCultureRows(rows) : pruneSomeRows(rows)
        group.fluidSource = fluidSource
        group.tableVariant = isCito ? "cito" : "standard"
        group.someNormalized = true
    }

    private static func flattenDeptGroupsSimple(_ dept: SomeDeptRef) {
        let rows = dept.groups.flatMap { $0.rows }
        dept.groups = rows.isEmpty ? [] : [SomeGroupRef(title: "", rows: rows, tableVariant: "standard", fluidSource: nil)]
    }

    static func extractFluidSourceFromRows(_ rows: [SomeRow]) -> (fluid: String, rows: [SomeRow]) {
        var fluid = ""
        var kept: [SomeRow] = []
        for r in rows {
            if comentarioRe.test(r.estudio) {
                let res = r.resultado.jsTrim
                if !res.isEmpty { fluid = res }
                continue
            }
            if liquidoDeRe.test(r.estudio) || citoDeEndIRe.test(r.estudio) {
                if fluid.isEmpty && !r.resultado.isEmpty { fluid = r.resultado }
                if liquidoDeRe.test(r.estudio) && r.resultado.isEmpty { fluid = r.estudio }
                continue
            }
            if !isSectionDividerRow(r) { kept.append(r) }
        }
        return (fluid, kept)
    }

    private static func flattenQuimicaClinica(_ dept: SomeDeptRef) {
        var normalRows: [SomeRow] = []
        var citoGroups: [SomeGroupRef] = []
        for g in dept.groups {
            if isCitoGroupTitle(g.title) || g.tableVariant == "cito" {
                let extracted = extractFluidSourceFromRows(g.rows)
                g.rows = extracted.rows
                let fs = g.fluidSource ?? ""
                g.fluidSource = !fs.isEmpty ? fs : extracted.fluid
                normalizeSomeGroup(g)
                if !g.rows.isEmpty { citoGroups.append(g) }
            } else {
                normalRows += g.rows.filter { !isSectionDividerRow($0) }
            }
        }
        var out: [SomeGroupRef] = []
        if !normalRows.isEmpty { out.append(SomeGroupRef(title: "", rows: normalRows, tableVariant: "standard", fluidSource: nil)) }
        out += citoGroups
        dept.groups = out
    }

    static func flattenDeptGroups(_ dept: SomeDeptRef) {
        if normalizeDeptKey(dept.key) == "QUIMICA CLINICA" { flattenQuimicaClinica(dept); return }
        flattenDeptGroupsSimple(dept)
    }
}
