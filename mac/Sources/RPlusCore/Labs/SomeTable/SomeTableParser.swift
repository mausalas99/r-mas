import Foundation

/// Unit "SomeTable": port of parseSomeReportTables (labs-some-table-parse.mjs + labs-some-table-parse-loop.mjs).
public enum SomeTableParser {
    /// `parseSomeReportTables(text)`. Node never returns null; empty text gives `{ departments: [] }`.
    public static func parse(_ text: String) -> SomeReportTables? {
        if text.isEmpty { return SomeReportTables(departments: []) }
        let lines = stripReportFooters(crRe.replace(text, with: "").components(separatedBy: "\n"))
        let st = State()
        var i = 0
        while i < lines.count {
            let trimmed = cleanEstudio(lines[i])
            if !trimmed.isEmpty && !isMetadataLine(trimmed) { i = dispatchSomeParseLine(st, lines, i, trimmed) }
            i += 1
        }
        return SomeReportTables(departments: finalizeSomeDepartments(st.departments))
    }

    private static let crRe = JSRegex(#"\r"#, "g")
    private static let footerStartRe = JSRegex(#"Responsable\s+Sanitario"#, "i")
    private static let expedienteRe = JSRegex(#"^Expediente\s*:"#, "i")

    private static func stripReportFooters(_ lines: [String]) -> [String] {
        var out: [String] = []
        var i = 0
        while i < lines.count {
            if !footerStartRe.test(lines[i]) { out.append(lines[i]); i += 1; continue }
            while let last = out.last, cleanEstudio(last).isEmpty { out.removeLast() }
            if let last = out.last, cleanEstudio(last) == "&" { out.removeLast() }
            var j = i + 1
            while j < lines.count {
                let t = cleanEstudio(lines[j])
                if isDepartmentLine(t) || isTableHeaderLine(t) || expedienteRe.test(t) { break }
                j += 1
            }
            i = j
        }
        return out
    }

    final class State {
        var departments: [SomeDeptRef] = []
        var currentDept: SomeDeptRef?
        var currentGroup: SomeGroupRef?
        var skipSection = false

        func ensureDept(_ key: String) {
            if let d = currentDept, d.key == key { return }
            let d = SomeDeptRef(key: key)
            currentDept = d
            departments.append(d)
            currentGroup = nil
        }

        func ensureGroup(_ title: String) {
            guard let d = currentDept else { return }
            if let g = currentGroup, g.title == title { return }
            let g = SomeGroupRef(title: title, rows: [], tableVariant: SomeTableParser.isCitoGroupTitle(title) ? "cito" : "standard", fluidSource: "")
            currentGroup = g
            d.groups.append(g)
        }

        var groupTitle: String? { currentGroup?.title }
    }

    // MARK: labs-some-table-parse-loop.mjs

    private static func handleSomeCultureBlock(_ st: State, _ lines: [String], _ i: Int, _ trimmed: String) -> Int? {
        if normalizeDeptKey(st.currentDept!.key) != "BACTERIOLOGIA" { return nil }
        if !isCultureSampleTitle(trimmed, slice(lines, i + 1, i + 9)) { return nil }
        let cult = parseBacteriologiaCultureGroup(lines, i)
        st.ensureGroup(cult.title)
        st.currentGroup!.rows += cult.rows
        return cult.nextIdx - 1
    }

    /// Node bug kept: when this is the last line, it returns i - 1 and the Node loop never ends.
    private static func handleSomeTipoMuestra(_ st: State, _ lines: [String], _ i: Int) -> Int {
        var idx = i + 1
        while idx < lines.count {
            let tipoNext = cleanEstudio(lines[idx])
            idx += 1
            if tipoNext.isEmpty || isFlagToken(tipoNext) { continue }
            if isCitoGroupTitle(tipoNext) || citoGroupRe.test(tipoNext) { st.ensureGroup(tipoNext); continue }
            break
        }
        return idx - 2
    }

    private static func handleSomeComentario(_ st: State, _ lines: [String], _ i: Int) -> Int {
        var fluidVal = ""
        var fj = i + 1
        while fj < lines.count {
            let fline = cleanEstudio(lines[fj])
            fj += 1
            if fline.isEmpty { break }
            if isDepartmentLine(fline) || isTableHeaderLine(fline) { fj -= 1; break }
            if isFlagToken(fline) { continue }
            fluidVal = fline
            break
        }
        if let g = st.currentGroup {
            let fs = g.fluidSource ?? ""
            g.fluidSource = !fluidVal.isEmpty ? fluidVal : fs
        }
        return fj - 1
    }

    private static func handleSomeSkipResume(_ st: State, _ lines: [String], _ i: Int, _ trimmed: String) -> Int? {
        if !st.skipSection || isCommentNoiseEstudio(trimmed) { return nil }
        var resumeIdx = i
        let nextTrim = cleanEstudio(at(lines, i + 1))
        if !nextTrim.isEmpty && nextTrim.uppercased() == trimmed.uppercased() { resumeIdx = i + 1 }
        guard let p = readRowAt(lines, resumeIdx, st.groupTitle), !isCommentNoiseEstudio(p.row.estudio),
              !p.row.resultado.isEmpty, !isFlagToken(p.row.resultado) else { return nil }
        st.skipSection = false
        if st.currentGroup == nil { st.ensureGroup("") }
        st.currentGroup!.rows.append(p.row)
        return p.nextIdx - 1
    }

    /// pushGroupTitleRow and handleSomeFlattenCitoTitle share this shape; only the no-dup return differs.
    private static func pushDupTitleRow(_ st: State, _ lines: [String], _ i: Int, _ title: String, noDup: Int) -> Int {
        let dup = cleanEstudio(at(lines, i + 1))
        if !dup.isEmpty && dup.uppercased() == title.uppercased() {
            if let p = readRowAt(lines, i + 1, title) {
                st.currentGroup!.rows.append(p.row)
                return p.nextIdx - 1
            }
            return i + 1
        }
        return noDup
    }

    private static func handleSomeGroupTitle(_ st: State, _ lines: [String], _ i: Int, _ trimmed: String) -> Int? {
        if !isLikelyGroupTitle(trimmed, slice(lines, i + 1, i + 9), st.groupTitle) { return nil }
        if flattenDeptKeys.contains(normalizeDeptKey(st.currentDept!.key)) {
            if isCitoGroupTitle(trimmed) {
                st.ensureGroup(trimmed)
                return pushDupTitleRow(st, lines, i, trimmed, noDup: i)
            }
            st.ensureGroup("")
            if let p = readRowAt(lines, i, "") {
                st.currentGroup!.rows.append(p.row)
                return p.nextIdx - 1
            }
            return i
        }
        st.ensureGroup(trimmed)
        return pushDupTitleRow(st, lines, i, trimmed, noDup: i + 1)
    }

    private static func handleSomeFlatStudyRow(_ st: State, _ lines: [String], _ i: Int, _ trimmed: String) -> Int? {
        if !flattenDeptKeys.contains(normalizeDeptKey(st.currentDept!.key)) { return nil }
        if isCitoGroupTitle(trimmed) { return nil }
        let next8 = slice(lines, i + 1, i + 9)
        if !isStudyRowHeader(trimmed, next8) { return nil }
        if let g = st.currentGroup, isCitoGroupTitle(g.title), !isSerumQcAnalyte(trimmed) { return nil }
        if isLikelyGroupTitle(trimmed, next8, st.groupTitle) { return nil }
        st.ensureGroup("")
        guard let p = readRowAt(lines, i, "") else { return nil }
        st.currentGroup!.rows.append(p.row)
        return p.nextIdx - 1
    }

    private static func handleSomeDataRow(_ st: State, _ lines: [String], _ i: Int) -> Int? {
        let parsed = readRowAt(lines, i, st.groupTitle)
        if let p = parsed, isCitoGroupTitle(p.row.resultado) || citoGroupRe.test(p.row.resultado) {
            st.ensureGroup(p.row.resultado.jsTrim)
            return p.nextIdx - 1
        }
        guard let p = parsed else { return nil }
        if st.currentGroup == nil { st.ensureGroup("") }
        st.currentGroup!.rows.append(p.row)
        return p.nextIdx - 1
    }

    static func dispatchSomeParseLine(_ st: State, _ lines: [String], _ i: Int, _ trimmed: String) -> Int {
        if isDepartmentLine(trimmed) {
            st.ensureDept(departmentKey(trimmed))
            st.currentGroup = nil
            st.skipSection = false
            return i
        }
        if isTableHeaderLine(trimmed, cleanEstudio(at(lines, i + 1))) || st.currentDept == nil { return i }
        if trimmed == ":" || trimmed == "—" { return i }
        if isSectionDividerRow(SomeRow(estudio: trimmed, flag: "", resultado: "", unidades: "", ref: "", abnormal: false)) { return i }
        if isSectionDividerEstudio(trimmed) { return skipSectionDividerBlock(lines, i) - 1 }

        if let n = handleSomeCultureBlock(st, lines, i, trimmed) { return n }
        if tipoMuestraRe.test(trimmed) { return handleSomeTipoMuestra(st, lines, i) }
        if comentarioRe.test(trimmed) { return handleSomeComentario(st, lines, i) }
        if isSkippedGroupTitle(trimmed) {
            st.skipSection = true
            st.currentGroup = nil
            return i
        }
        if let n = handleSomeSkipResume(st, lines, i, trimmed) { return n }
        if st.skipSection { return i }
        if let n = handleSomeGroupTitle(st, lines, i, trimmed) { return n }
        if let n = handleSomeFlatStudyRow(st, lines, i, trimmed) { return n }
        if let n = handleSomeDataRow(st, lines, i) { return n }
        return i
    }

    static func finalizeSomeDepartments(_ departments: [SomeDeptRef]) -> [SomeDepartment] {
        for dept in departments {
            dept.groups.forEach(normalizeSomeGroup)
            dept.groups = dept.groups.filter { !$0.rows.isEmpty }
            if flattenDeptKeys.contains(normalizeDeptKey(dept.key)) { flattenDeptGroups(dept) }
            stripCommentNoiseFromDepartment(dept)
        }
        return departments.filter { !$0.groups.isEmpty }.map(\.value)
    }
}

// MARK: result types (encode to the same JSON as Node)

public struct SomeRow: Codable, Equatable, Sendable {
    public var estudio: String
    public var flag: String
    public var resultado: String
    public var unidades: String
    public var ref: String
    public var abnormal: Bool
}

/// Groups built by flatten have no `fluidSource` / `_someNormalized` keys in Node: nil = key absent.
public struct SomeGroup: Codable, Equatable, Sendable {
    public var title: String
    public var rows: [SomeRow]
    public var tableVariant: String
    public var fluidSource: String?
    public var _someNormalized: Bool?
}

public struct SomeDepartment: Codable, Equatable, Sendable {
    public var key: String
    public var label: String
    public var groups: [SomeGroup]
}

public struct SomeReportTables: Codable, Equatable, Sendable {
    public var departments: [SomeDepartment]
}

/// Mutable group while parsing (Node mutates group objects in place).
final class SomeGroupRef {
    var title: String
    var rows: [SomeRow]
    var tableVariant: String
    var fluidSource: String?
    var someNormalized: Bool?
    init(title: String, rows: [SomeRow], tableVariant: String, fluidSource: String?) {
        self.title = title; self.rows = rows; self.tableVariant = tableVariant; self.fluidSource = fluidSource
    }
    var value: SomeGroup {
        SomeGroup(title: title, rows: rows, tableVariant: tableVariant, fluidSource: fluidSource, _someNormalized: someNormalized)
    }
}

final class SomeDeptRef {
    let key: String
    var groups: [SomeGroupRef] = []
    init(key: String) { self.key = key }
    var value: SomeDepartment { SomeDepartment(key: key, label: key, groups: groups.map(\.value)) }
}
