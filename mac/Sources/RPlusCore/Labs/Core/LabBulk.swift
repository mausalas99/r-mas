import Foundation

/// Port of lab-bulk-dedupe.mjs and the pure text parts of lab-bulk-paste.mjs.
public enum LabBulk {
    static let LAB_BULK_PATIENT_SEPARATOR = "--- PACIENTE ---"

    private static let sepRe = JSRegex(#"^\s*---\s*PACIENTE\s*---\s*$"#, "i")
    private static let nlRe = JSRegex(#"\r?\n"#)
    private static let expSplitRe = JSRegex(#"(?=^\s*Expediente\s*:)"#, "im")
    private static let wsRe = JSRegex(#"\s+"#, "g")

    static func isLabBulkPatientSeparatorLine(_ line: String) -> Bool { sepRe.test(line.jsTrim) }

    /// `splitBulkLabTextByPatient(text)`.
    public static func splitByPatient(_ text: String) -> [String] {
        if text.jsTrim.isEmpty { return [] }
        var blocks: [String] = [], current: [String] = []
        func flush() {
            let chunk = current.joined(separator: "\n").jsTrim
            if !chunk.isEmpty { blocks.append(chunk) }
            current = []
        }
        for line in nlRe.split(text) {
            if isLabBulkPatientSeparatorLine(line) {
                if !current.isEmpty { flush() }
                continue
            }
            current.append(line)
        }
        if !current.isEmpty { flush() }
        return blocks
    }

    /// `splitSomeReportsInBlock(blockText)`: one chunk per `Expediente:` header.
    static func splitSomeReportsInBlock(_ blockText: String) -> [String] {
        let raw = blockText.jsTrim
        if raw.isEmpty { return [] }
        return expSplitRe.split(raw).map { $0.jsTrim }.filter { !$0.isEmpty }
    }

    /// The fields of a bulk preview block that `mixedExpedienteWarning` reads.
    struct BlockInfo {
        var status = ""
        var expedientes: [String] = []
        var okReportCount = 0
        var primaryExpediente = ""
        /// `conflictReports[].expediente`.
        var conflictExpedientes: [String] = []
    }

    /// `mixedExpedienteWarning(blocks)`: Spanish warning, or nil.
    static func mixedExpedienteWarning(_ blocks: [BlockInfo]) -> String? {
        if let i = blocks.firstIndex(where: { $0.status == "mixed-expediente" }) {
            let mixed = blocks[i]
            let otherOk = blocks.indices.contains { $0 != i && blocks[$0].okReportCount > 0 }
            return "Un bloque del texto pegado tiene 2 expedientes distintos (" + mixed.expedientes.joined(separator: " y ")
                + "). Puede tener datos de otro paciente. Ese bloque se excluyó. "
                + (otherOk ? "El resto del pegado sí se procesó. " : "No se guardó nada. ")
                + "Separa los reportes por paciente y pega de nuevo."
        }
        guard let w = blocks.first(where: { !$0.conflictExpedientes.isEmpty }) else { return nil }
        var excluded: [String] = []
        for v in w.conflictExpedientes where !v.isEmpty && !excluded.contains(v) { excluded.append(v) }
        let kept = w.primaryExpediente
        return "Un bloque del texto pegado trae otro expediente (" + excluded.joined(separator: " y ")
            + (kept.isEmpty ? ") distinto del paciente conocido" : ") distinto del paciente conocido (" + kept + ")")
            + ". Ese reporte se excluyó, no se guardó. El resto del pegado sí se procesó."
    }

    private static let readNotStored: Set<String> = ["LYM", "MONO", "BASO", "RELACION A/G", "EX. BASE", "SAT 02", "SAT O2"]
    private static let tableHead = "Estudio\t\tResultado\tUnidades\tValor de Referencia"
    private static let headerLineRe = JSRegex(#"^[^\t]+:\t"#)
    private static let estudioRe = JSRegex(#"^Estudio\t"#, "i")
    private static let flagRe = JSRegex(#"^[*A-Z]$"#)

    /// `probeLabRows_`: "" when procesarLabs reads nothing. ponytail: no cache (Node caches per paste); add one if slow.
    /// The key compares bhExtras with sorted keys; Node uses insertion order (same content -> same answer here).
    private static func probeLabRows(_ header: [String], _ ctx: [String], _ rowLines: [String]) -> String {
        let mini = (header + ctx + [tableHead] + rowLines).joined(separator: "\n")
        let res = ProcesarLabs.run(mini, options: ProcesarLabsOptions())
        if res.resLabs.isEmpty && res.bhExtras.isEmpty { return "" }
        let extras = res.bhExtras.sorted { $0.key < $1.key }.map { $0.key + "\u{1}" + $0.value }
        return (res.resLabs + ["\u{2}"] + extras).joined(separator: "\u{0}")
    }

    /// `unknownLabRowNames(reportText)`: table rows with a number that procesarLabs reads nothing from.
    static func unknownLabRowNames(_ reportText: String) -> [String] {
        var header: [String] = [], titles: [String] = [], inTable = false
        var rows: [(name: String, line: String, ctx: [String], ctxKey: String, probe: String)] = []
        for line in nlRe.split(reportText) {
            let cells = line.components(separatedBy: "\t").map { $0.jsTrim }
            if headerLineRe.test(line) { header.append(line); continue }
            if estudioRe.test(line) { inTable = true; continue }
            if cells.count < 4 || cells[0].isEmpty {
                if !line.jsTrim.isEmpty && !line.contains("\t") { titles.append(line.jsTrim) }
                continue
            }
            if !inTable { continue }
            let result = cells.dropFirst().first { !($0.isEmpty || flagRe.test($0)) } ?? ""
            if readNotStored.contains(cells[0].uppercased()) || LabExtract.matchValorLab(result) == nil { continue }
            let ctx = Array(titles.suffix(2))
            rows.append((cells[0], line, ctx, ctx.joined(separator: "|"), probeLabRows(header, ctx, [line])))
        }
        var out: [String] = []
        for r in rows where r.probe.isEmpty && !out.contains(r.name) {
            let anchors = rows.filter { $0.ctxKey == r.ctxKey && !$0.probe.isEmpty }.map(\.line)
            if !anchors.isEmpty && probeLabRows(header, r.ctx, anchors) != probeLabRows(header, r.ctx, anchors + [r.line]) { continue }
            out.append(r.name)
        }
        return out
    }

    /// `unknownLabRowsWarning(blocks)` (each block = its `unknownRowNames`).
    static func unknownLabRowsWarning(_ blocks: [[String]]) -> String? {
        var names: [String] = []
        for b in blocks { for n in b where !names.contains(n) { names.append(n) } }
        if names.isEmpty { return nil }
        return String(names.count) + (names.count == 1 ? " fila no reconocida no se guardó: " : " filas no reconocidas no se guardaron: ")
            + names.prefix(3).joined(separator: ", ") + (names.count > 3 ? "…" : "")
    }

    // MARK: lab-bulk-dedupe.mjs

    private static let keyRe = JSRegex(#"^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)"#)
    private static let bhColonRe = JSRegex(#"^BH:"#, "i")
    private static let richRe = JSRegex(#"\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b"#, "gi")
    private static let digitRe = JSRegex(#"\d"#, "g")
    private static let interpGasoRe = JSRegex(#"INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A"#, "i")

    static func labRowSectionKey(_ row: String) -> String {
        let s = row.jsTrim
        if s.isEmpty { return "" }
        return keyRe.firstMatch(s).map { ($0[1] ?? "").uppercased() } ?? ""
    }

    static func labRowRichnessScore(_ s: String) -> Int {
        BaseJS.len(s) + richRe.allMatches(s).count * 8 + digitRe.allMatches(s).count + (interpGasoRe.test(s) ? 20 : 0)
    }

    private static func isPairMergeSectionKey(_ k: String) -> Bool { k == "QS" || k == "ESC" || k == "PFHS" || k == "LIPASA" }

    /// JS `Object.keys` order: array-index keys ascending first, then the others in insertion order.
    private static func jsObjectKeyOrder(_ keys: [String]) -> [String] {
        func index(_ k: String) -> UInt32? {
            guard let n = UInt32(k), n != UInt32.max, String(n) == k else { return nil }
            return n
        }
        return keys.compactMap { k in index(k).map { (k, $0) } }.sorted { $0.1 < $1.1 }.map(\.0) + keys.filter { index($0) == nil }
    }

    /// `dedupeConsolidatedLabRows(rows, tipo)`.
    public static func dedupeConsolidatedRows(_ rows: [String], tipo: String) -> [String] {
        var normalized: [String] = [], seen = Set<String>()
        for row in rows {
            let norm = wsRe.replace(row.jsTrim, with: " ")
            if norm.isEmpty || seen.contains(norm) { continue }
            seen.insert(norm)
            normalized.append(row)
        }
        if tipo != "labs" { return normalized }

        var bh: [String] = [], trop: [String] = [], qs: [String] = [], esc: [String] = [], pfh: [String] = []
        var lip: [String] = [], coag: [String] = [], other: [String] = []
        for row in normalized {
            let key = labRowSectionKey(row)
            if key == "BH" || bhColonRe.test(row.jsTrim) { bh.append(row); continue }
            switch key {
            case "TROP": trop.append(row)
            case "QS": qs.append(row)
            case "ESC": esc.append(row)
            case "PFHS": pfh.append(row)
            case "LIPASA": lip.append(row)
            case "COAG": coag.append(row)
            default: other.append(row)
            }
        }
        var order: [String] = [], best: [String: (row: String, idx: Int, score: Int)] = [:]
        for (idx, row) in other.enumerated() {
            let key = LabGaso.frotisPartKey(labRowSectionKey(row), row)
            if key.isEmpty || isPairMergeSectionKey(key) { continue }
            let score = labRowRichnessScore(row)
            if let prev = best[key] {
                if score > prev.score || (score == prev.score && idx > prev.idx) { best[key] = (row, idx, score) }
            } else {
                order.append(key)
                best[key] = (row, idx, score)
            }
        }
        var out = jsObjectKeyOrder(order).map { best[$0]!.row }
        for merged in [LabChem.mergeQsResLabRows(qs), LabChem.mergeEscResLabRows(esc), LabChem.mergePfhResLabRows(pfh),
                       LabChem.mergeLipasaResLabRows(lip), LabTroponin.mergeTroponinaResLabRows(trop)] where !merged.isEmpty {
            out.append(merged)
        }
        if !bh.isEmpty {
            let m = LabBH.mergeBhResLabRows(bh)
            if !m.bh.isEmpty { out.append(m.bh) }
            if !m.coag.isEmpty { coag.append(m.coag) }
        }
        let mergedCoag = LabBH.mergeCoagResLabRows(coag)
        if !mergedCoag.isEmpty { out.append(mergedCoag) }
        return LabResLabs.sortResLabsByClinicalOrder(out)
    }
}
