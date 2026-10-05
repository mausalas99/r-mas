import Foundation

/// labs-panel-defs.mjs: one field of a panel. `patterns != nil` = qualitative field (QualField), else numeric (NumField).
struct PanelField: Sendable {
    let key: String
    var labels: [String] = []
    var patterns: [JSRegex]? = nil
}

/// labs-panel-defs.mjs `PanelDef`. `mode` is "num" or "qual".
struct PanelDef: Sendable {
    let sectionKey: String
    let mode: String
    let gates: [JSRegex]
    let fields: [PanelField]
}

private func num(_ key: String, _ labels: [String]) -> PanelField { PanelField(key: key, labels: labels) }
private func qual(_ key: String, _ patterns: [String]) -> PanelField { PanelField(key: key, patterns: patterns.map { JSRegex($0, "i") }) }
private func gates(_ ps: [String]) -> [JSRegex] { ps.map { JSRegex($0, "i") } }

enum PanelDefs {
    /// `LAB_EXTENDED_PANEL_DEFS` (same order as Node).
    static let LAB_EXTENDED_PANEL_DEFS: [PanelDef] = [
        PanelDef(sectionKey: "TIR", mode: "num",
                 gates: gates([#"\bTSH\b"#, #"T4\s*LIBRE"#, #"TIROXINA\s+LIBRE"#, #"TIROIDES"#]),
                 fields: [
                    num("TSH", ["TSH", "HORMONA ESTIMULANTE DE LA TIROIDES", "HORMONA ESTIMULANTE DE TIROIDES"]),
                    num("T4L", ["T4 LIBRE", "TIROXINA LIBRE", "FT4"]),
                    num("T3L", ["T3 LIBRE", "TRIYODOTIRONINA LIBRE", "FT3"]),
                    num("T4T", ["T4 TOTAL", "TIROXINA TOTAL"]),
                    num("T3T", ["T3 TOTAL", "TRIYODOTIRONINA TOTAL"]),
                    num("AntiTPO", ["ANTI TPO", "ANTICUERPOS ANTI TPO", "ANTI-TPO"]),
                    num("AntiTg", ["ANTI TIROGLOBULINA", "ANTICUERPOS ANTI TIROGLOBULINA", "ANTI-TG"]),
                 ]),
        PanelDef(sectionKey: "ENDO", mode: "num",
                 gates: gates([#"HEMOGLOBINA\s+GLICOSILADA"#, #"\bHBA1C\b"#, #"\bCORTISOL\b"#, #"\bPTH\b"#,
                               #"VITAMINA\s+D"#, #"\bINSULINA\b"#, #"PEPTIDO\s+C"#, #"PROLACTINA"#]),
                 fields: [
                    num("HbA1c", ["HEMOGLOBINA GLICOSILADA", "HBA1C", "HB A1C"]),
                    num("Cortisol", ["CORTISOL"]),
                    num("PTH", ["PTH", "HORMONA PARATIROIDEA", "PARATHORMONA"]),
                    num("VitD", ["VITAMINA D 25 OH", "VITAMINA D 25-OH", "25-OH VITAMINA D", "VITAMINA D"]),
                    num("Insulina", ["INSULINA"]),
                    num("PepC", ["PEPTIDO C", "PÉPTIDO C"]),
                    num("PRL", ["PROLACTINA"]),
                    num("LH", ["HORMONA LUTEINIZANTE", "LH "]),
                    num("FSH", ["HORMONA FOLICULO ESTIMULANTE", "FSH "]),
                    num("E2", ["ESTRADIOL"]),
                    num("Testo", ["TESTOSTERONA"]),
                    num("bHCG", ["BETA HCG", "BHCG", "GONADOTROFINA CORIONICA"]),
                 ]),
        PanelDef(sectionKey: "CARD", mode: "num",
                 gates: gates([#"NT-?PROBNP"#, #"\bBNP\b"#, #"CK-?MB"#, #"MIOGLOBINA"#]),
                 fields: [
                    num("NTproBNP", ["NT-PROBNP", "NT PROBNP", "NTproBNP"]),
                    num("BNP", ["BNP ", "PEPTIDO NATRIURETICO"]),
                    num("CKMB", ["CK-MB", "CK MB", "CKMB"]),
                    num("Mio", ["MIOGLOBINA"]),
                 ]),
        PanelDef(sectionKey: "FE", mode: "num",
                 gates: gates([#"HIERRO\s+SERICO"#, #"\bFERRITINA\b"#, #"SATURACION\s+DE\s+TRANSFERRINA"#, #"FIJACION\s+DE\s+HIERRO"#]),
                 fields: [
                    num("Fe", ["HIERRO SERICO", "HIERRO SÉRICO", "HIERRO "]),
                    num("TIBC", ["CAPACIDAD DE FIJACION DE HIERRO", "TIBC", "CTFH"]),
                    num("Sat", ["% DE SATURACION DE TRANSFERRINA", "SATURACION DE TRANSFERRINA", "% SATURACION"]),
                    num("Ferr", ["FERRITINA"]),
                    num("Transf", ["TRANSFERRINA"]),
                 ]),
        PanelDef(sectionKey: "INFL", mode: "num",
                 gates: gates([#"FACTOR\s+REUMATOIDE"#, #"IGE\s+TOTAL"#, #"INMUNOGLOBULINA\s+E"#]),
                 fields: [
                    num("FR", ["FACTOR REUMATOIDE"]),
                    num("IgE", ["IGE TOTAL", "INMUNOGLOBULINA E"]),
                 ]),
        PanelDef(sectionKey: "INM", mode: "num",
                 gates: gates([#"COMPLEMENTO\s+C3"#, #"COMPLEMENTO\s+C4"#, #"\bC3\b"#, #"\bC4\b"#]),
                 fields: [
                    num("C3", ["COMPLEMENTO C3"]),
                    num("C4", ["COMPLEMENTO C4"]),
                    num("IgG", ["INMUNOGLOBULINA G"]),
                    num("IgA", ["INMUNOGLOBULINA A"]),
                    num("IgM", ["INMUNOGLOBULINA M"]),
                 ]),
        PanelDef(sectionKey: "META", mode: "num",
                 gates: gates([#"\bAMONIO\b"#, #"OSMOLARIDAD\s+SERICA"#, #"OSMOLALIDAD\s+SERICA"#, #"LACTATO\s+SERICO"#]),
                 fields: [
                    num("NH3", ["AMONIO"]),
                    num("Osm", ["OSMOLARIDAD SERICA", "OSMOLALIDAD SERICA", "OSMOLARIDAD"]),
                    num("LacS", ["LACTATO SERICO", "LACTATO SÉRICO"]),
                 ]),
        PanelDef(sectionKey: "NEF", mode: "num",
                 gates: gates([#"CISTATINA\s+C"#, #"MICROALBUMINURIA"#, #"ALBUMINA\s*\/\s*CREATININA"#, #"PROTEINA\s*\/\s*CREATININA"#]),
                 fields: [
                    num("CysC", ["CISTATINA C"]),
                    num("AlbCr", ["MICROALBUMINURIA", "ALBUMINA/CREATININA", "ALBUMINA / CREATININA", "RELACION ALBUMINA CREATININA"]),
                    num("ProtCr", ["PROTEINA/CREATININA", "PROTEINA / CREATININA", "RELACION PROTEINA CREATININA"]),
                 ]),
        PanelDef(sectionKey: "NIVEL", mode: "num",
                 gates: gates([#"VANCOMICINA"#, #"DIGOXINA"#, #"\bLITIO\b"#, #"ACIDO\s+VALPROICO"#,
                               #"CARBAMAZEPINA"#, #"FENITOINA"#, #"TACROLIMUS"#, #"CICLOSPORINA"#]),
                 fields: [
                    num("Vanco", ["VANCOMICINA"]),
                    num("Dig", ["DIGOXINA"]),
                    num("Li", ["LITIO"]),
                    num("VPA", ["ACIDO VALPROICO", "ÁCIDO VALPROICO", "VALPROATO"]),
                    num("Carb", ["CARBAMAZEPINA"]),
                    num("Fenit", ["FENITOINA", "FENITOÍNA"]),
                    num("Tacro", ["TACROLIMUS"]),
                    num("Ciclo", ["CICLOSPORINA"]),
                 ]),
        PanelDef(sectionKey: "TM", mode: "num",
                 gates: gates([#"\bAFP\b"#, #"\bCEA\b"#, #"CA\s*125"#, #"CA\s*19-?9"#, #"CA\s*15-?3"#, #"\bPSA\b"#]),
                 fields: [
                    num("AFP", ["AFP", "ALFA FETOPROTEINA", "ALFAFETOPROTEINA"]),
                    num("CEA", ["CEA", "ANTIGENO CARCINOEMBRIONARIO"]),
                    num("CA125", ["CA 125", "CA125"]),
                    num("CA199", ["CA 19-9", "CA 199", "CA19-9"]),
                    num("CA153", ["CA 15-3", "CA 153", "CA15-3"]),
                    num("PSA", ["PSA", "ANTIGENO PROSTATICO"]),
                 ]),
        PanelDef(sectionKey: "NUT", mode: "num",
                 gates: gates([#"VITAMINA\s+B12"#, #"ACIDO\s+FOLICO"#, #"ÁCIDO\s+FÓLICO"#, #"\bFOLATO\b"#]),
                 fields: [
                    num("B12", ["VITAMINA B12", "COBALAMINA"]),
                    num("Fol", ["ACIDO FOLICO", "ÁCIDO FÓLICO", "FOLATO"]),
                 ]),
        PanelDef(sectionKey: "GI", mode: "num",
                 gates: gates([#"CALPROTECTINA"#, #"ELASTASA\s+FECAL"#]),
                 fields: [
                    num("Calpro", ["CALPROTECTINA FECAL", "CALPROTECTINA"]),
                    num("Elast", ["ELASTASA FECAL", "ELASTASA PANCREATICA"]),
                 ]),
        PanelDef(sectionKey: "GI", mode: "qual",
                 gates: gates([#"SANGRE\s+OCULTA"#]),
                 fields: [
                    qual("SOH", [#"SANGRE\s+OCULTA\s+EN\s+HECES"#, #"SANGRE\s+OCULTA"#]),
                 ]),
        PanelDef(sectionKey: "TOX", mode: "num",
                 gates: gates([#"\bETANOL\b"#, #"PARACETAMOL"#, #"ACETAMINOFEN"#, #"SALICILATO"#, #"CARBOXIHEMOGLOBINA"#, #"METAHEMOGLOBINA"#]),
                 fields: [
                    num("EtOH", ["ETANOL"]),
                    num("APAP", ["PARACETAMOL", "ACETAMINOFEN", "ACETAMINOFÉN"]),
                    num("ASA", ["SALICILATOS", "SALICILATO"]),
                    num("COHb", ["CARBOXIHEMOGLOBINA", "COHB"]),
                    num("MetHb", ["METAHEMOGLOBINA", "METHB"]),
                 ]),
        PanelDef(sectionKey: "HEPB", mode: "qual",
                 gates: gates([#"ANTI-?HBS"#, #"ANTI-?HBC"#, #"HBEAG"#, #"ANTI-?HBE"#, #"ANTICUERPOS\s+ANTI-?HBS"#]),
                 fields: [
                    qual("AntiHBs", [#"ANTICUERPOS\s+ANTI-?HBS"#, #"ANTI-?HBS"#, #"ANTI\s+HBS"#]),
                    qual("AntiHBc", [#"ANTICUERPOS\s+ANTI-?HBC"#, #"ANTI-?HBC\s+IG\s*M"#, #"ANTI-?HBC"#]),
                    qual("HBeAg", [#"ANTIGENO\s+E.*HEPATITIS\s+B"#, #"\bHBEAG\b"#]),
                    qual("AntiHBe", [#"ANTICUERPOS\s+ANTI-?HBE"#, #"ANTI-?HBE"#]),
                 ]),
        PanelDef(sectionKey: "VIRAL", mode: "qual",
                 gates: gates([#"\bVDRL\b"#, #"RPR\b"#, #"TOXOPLASMA"#, #"\bCMV\b"#, #"\bEBV\b"#, #"RUBEOLA"#, #"HERPES"#]),
                 fields: [
                    qual("VDRL", [#"\bVDRL\b"#, #"\bRPR\b"#]),
                    qual("ToxoIgM", [#"IGM\s+TOXOPLASMA"#, #"TOXOPLASMA\s+IGM"#, #"ANTICUERPOS\s+IGM\s+TOXOPLASMA"#]),
                    qual("ToxoIgG", [#"IGG\s+TOXOPLASMA"#, #"TOXOPLASMA\s+IGG"#]),
                    qual("CMVIgM", [#"CMV\s+IGM"#, #"IGM\s+CITOMEGALOVIRUS"#]),
                    qual("EBVIgM", [#"EBV\s+IGM"#, #"VCA\s+IGM"#]),
                    qual("RubIgM", [#"RUBEOLA\s+IGM"#, #"IGM\s+RUBEOLA"#]),
                 ]),
        PanelDef(sectionKey: "FEB", mode: "qual",
                 gates: gates([#"FEBRILES\s+COMPLETAS"#, #"\bT[IÍ]FICO\s*["']?[OH]["']?"#, #"PARAT[IÍ]FICO\s+[AB]\b"#]),
                 fields: [
                    qual("TifO", [#"\bT[IÍ]FICO\s*["']?O["']?"#]),
                    qual("TifH", [#"\bT[IÍ]FICO\s*["']?H["']?"#]),
                    qual("ParaA", [#"PARAT[IÍ]FICO\s+A\b"#]),
                    qual("ParaB", [#"PARAT[IÍ]FICO\s+B\b"#]),
                    qual("Bru", [#"\bBRUCELLA\b"#]),
                    qual("ProtX", [#"\bPROTEUS\b"#]),
                 ]),
        PanelDef(sectionKey: "MICRO", mode: "qual",
                 gates: gates([#"LEGIONELLA\s+EN\s+ORINA"#, #"NEUMOCOCO\s+EN\s+ORINA"#, #"ESTREPTOCOCO\s+A"#,
                               #"INFLUENZA"#, #"CLOSTRIDIUM\s+DIFFICILE"#, #"C\.\s*DIFF"#]),
                 fields: [
                    qual("LegAg", [#"ANTIGENO\s+LEGIONELLA\s+EN\s+ORINA"#, #"LEGIONELLA\s+EN\s+ORINA"#]),
                    qual("PneuAg", [#"ANTIGENO\s+NEUMOCOCO\s+EN\s+ORINA"#, #"NEUMOCOCO\s+EN\s+ORINA"#]),
                    qual("StrepA", [#"ESTREPTOCOCO\s+DEL\s+GRUPO\s+A"#, #"ESTREPTOCOCO\s+A"#]),
                    qual("FluAg", [#"ANTIGENO\s+INFLUENZA"#, #"INFLUENZA\s+A\s*\/\s*B"#]),
                    qual("Cdiff", [#"CLOSTRIDIUM\s+DIFFICILE"#, #"C\.\s*DIFFICILE"#, #"TOXINA\s+C\.\s*DIFF"#]),
                 ]),
    ]

    /// `LAB_EXTENDED_SECTION_KEYS`: unique section keys, first-seen order.
    static let LAB_EXTENDED_SECTION_KEYS: [String] = {
        var seen = Set<String>(), keys: [String] = []
        for d in LAB_EXTENDED_PANEL_DEFS where seen.insert(d.sectionKey).inserted { keys.append(d.sectionKey) }
        return keys
    }()

    /// `labExtendedSectionAlt_()`: "TIR|ENDO|…".
    static func labExtendedSectionAlt() -> String { LAB_EXTENDED_SECTION_KEYS.joined(separator: "|") }
}
