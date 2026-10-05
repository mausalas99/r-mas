import Foundation

/// Unit "Fluids": labs-fluidos.mjs, labs-fluidos-misc.mjs, labs-citoquimico-*.mjs, labs-lcr-*.mjs,
/// labs-fluid-interpret-values.mjs, labs-ego-parse*.mjs, labs-grupo-sangre.mjs.
/// Every parse function returns "" when Node returns ''/null. Keep these signatures: Core calls them.
public enum FluidParsers {
    public static func parsearCitoquimicoLiquidos(_ text: String) -> String { FluidCito.parseCitoquimicoLiquidosParsed(text).line }
    public static func parsearLCR(_ text: String) -> String { FluidLcr.parsearLCR(text) }
    /// `formatCitoquimicoInterpretacionLine_(buildCitoquimicoInterpretAlerts_(text))`.
    public static func citoquimicoInterpretacionLine(_ text: String) -> String {
        FluidInterpret.formatCitoquimicoInterpretacionLine(FluidInterpret.buildCitoquimicoInterpretAlerts(text))
    }
    /// `citoquimicoBlocksNormText_(text)`.
    public static func citoquimicoBlocksNormText(_ text: String) -> [String] { FluidCito.citoquimicoBlocksNormText(text) }
    public static func parseEGO(_ text: String) -> String { FluidMisc.parseEGO(text) }
    public static func parseElectrolitosOrina(_ text: String) -> String { FluidMisc.parseElectrolitosOrina(text) }
    public static func parseDepuracionCreatinina(_ text: String) -> String { FluidMisc.parseDepuracionCreatinina(text) }
    public static func parseCuantOrina(_ text: String) -> String { FluidMisc.parseCuantOrina(text) }
    public static func parseFisicoquimicoHeces(_ text: String) -> String { FluidMisc.parseFisicoquimicoHeces(text) }
    /// Node returns a multi-line string; Core splits it on "\n".
    public static func parseFrotisSangre(_ text: String) -> String { FluidMisc.parseFrotisSangre(text) }
    /// `parsePlaquetasCitrato_(textoBruto, tNorm, priorRefs)`.
    public static func parsePlaquetasCitrato(_ text: String, tNorm: String, priorRefs: [String: [Double]]?) -> String {
        FluidMisc.parsePlaquetasCitrato(text, tNorm, priorRefs)
    }
    public static func parseSerologiaBancoSangre(_ text: String) -> String { FluidMisc.parseSerologiaBancoSangre(text) }
    public static func parseGrupoSangreCoombs(_ text: String) -> String { FluidMisc.parseGrupoSangreCoombs(text) }
}
