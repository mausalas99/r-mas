import Foundation

/// Lab paste parser entry points. Glue only: each call goes to its unit.
/// Node parity target: packages/core/public/js/labs.js (procesarLabs), labs-some-table.mjs,
/// lab-bulk-paste.mjs, lab-bulk-dedupe.mjs. Tests: Tests/RPlusCoreTests/Labs*Tests.swift.
public enum LabParser {
    public static func procesarLabs(_ text: String, options: ProcesarLabsOptions? = nil) -> ProcesarLabsResult {
        ProcesarLabs.run(text, options: options)
    }
    public static func parseSomeReportTables(_ text: String) -> SomeReportTables? { SomeTableParser.parse(text) }
    public static func splitBulkLabTextByPatient(_ text: String) -> [String] { LabBulk.splitByPatient(text) }
    public static func dedupeConsolidatedLabRows(_ rows: [String], tipo: String) -> [String] {
        LabBulk.dedupeConsolidatedRows(rows, tipo: tipo)
    }
    public static func parseCultivo(_ text: String) -> String { CultivoParser.parse(text) }
    public static func parsearCitoquimicoLiquidos(_ text: String) -> String { FluidParsers.parsearCitoquimicoLiquidos(text) }
    public static func parsearLCR(_ text: String) -> String { FluidParsers.parsearLCR(text) }
    public static func parseExtendedLabPanels(_ text: String) -> [String] { PanelParsers.parseExtendedLabPanels(text) }
}
