import Foundation

/// Port of labs-default-refs.mjs. Ref maps are `[field: [min, max]]`.
enum LabRefs {
    static let DEFAULT_LAB_REFS: [String: [Double]] = [
        "Hb": [12, 17.5], "Hto": [36, 53], "Leu": [4, 11], "Plt": [150, 400], "VCM": [80, 100], "HCM": [27, 33],
        "RBC": [4.2, 5.4], "CHCM": [31.5, 34.5], "RDW": [11.5, 14.5], "MPV": [7.4, 10.4], "Neu": [1.5, 8],
        "Eos": [0, 0.6], "Lin": [0.6, 3.4], "Mono": [0, 0.9], "Baso": [0, 0.2], "NeuPct": [37, 80],
        "LinPct": [10, 50], "MonoPct": [0, 12], "EosPct": [0, 7], "BasoPct": [0, 2.5], "Bandas": [0, 5],
        "Mielo": [0, 1], "Metamielo": [0, 1], "Promielo": [0, 1], "Blastos": [0, 1], "Atipicos": [0, 5],
        "Ret": [0.5, 2.5], "TP": [11, 14], "TTP": [25, 35], "INR": [0.8, 1.2], "Fib": [150, 400], "DD": [0, 500],
        "Glu": [70, 100], "Cr": [0.5, 1.3], "BUN": [7, 20], "PCR": [0, 0.5], "PCT": [0, 0.05], "AU": [3.5, 7],
        "TGL": [0, 150], "COL": [0, 200], "HDL": [40, 60], "LDL": [0, 130], "VLDL": [2, 40], "IA": [0, 3.22],
        "CTHDL": [0, 3.1], "CPK": [30, 200], "Na": [136, 145], "K": [3.5, 5.0], "Cl": [96, 106], "HCO3": [22, 28],
        "Ca": [8.5, 10.5], "F": [2.5, 4.5], "Mg": [1.6, 2.6], "AST": [10, 40], "ALT": [7, 56], "FA": [44, 147],
        "GGT": [0, 55], "Prot": [6, 8.3], "BT": [0.1, 1.2], "Alb": [3.5, 5.2], "BD": [0, 0.3], "BI": [0.1, 1],
        "LDH": [120, 250], "Amil": [30, 110], "Lip": [8, 57], "TnI1": [0, 34], "TnI2": [0, 34], "TSH": [0.4, 4],
        "T4L": [0.8, 1.8], "HbA1c": [4, 5.6], "NTproBNP": [0, 125], "Fe": [50, 170], "Ferr": [30, 400],
        "CysC": [0.5, 1], "Vanco": [10, 20], "B12": [200, 900],
    ]

    /// Gasometry (arterial/capillary) defaults.
    static let DEFAULT_GASO_REFS: [String: [Double]] = [
        "pH": [7.35, 7.45], "pCO2": [35, 45], "pO2": [83, 100], "Lactato": [0.5, 2.2], "Na": [135, 148],
        "K": [3.5, 5.3], "GLU": [70, 110], "Hto": [34, 50], "Bica": [22, 28], "iCa": [1.12, 1.32],
    ]

    /// `isValidRangePair_(r)`. nil items are JS `null` (count as 0 and finite, like Node).
    static func isValidRangePair(_ a: Double?, _ b: Double?) -> Bool {
        BaseJS.isFiniteNull(a) && BaseJS.isFiniteNull(b) && (b ?? 0) > (a ?? 0)
    }

    static func isValidRangePair(_ r: [Double]?) -> Bool {
        guard let r, r.count == 2 else { return false }
        return isValidRangePair(r[0], r[1])
    }

    /// `collectPriorRefsFromHistory(history)`: each item is one history entry's `refsBySection` (nil = missing).
    /// A later entry wins per field.
    static func collectPriorRefsFromHistory(_ history: [[String: [String: [Double]]]?]) -> [String: [String: [Double]]] {
        var out: [String: [String: [Double]]] = [:]
        for refs in history {
            guard let refs else { continue }
            for (sec, row) in refs {
                if out[sec] == nil { out[sec] = [:] }
                for (k, r) in row where isValidRangePair(r) { out[sec]![k] = [r[0], r[1]] }
            }
        }
        return out
    }

    /// `collectPriorGasRefsFromHistory(history)` (deprecated in Node).
    static func collectPriorGasRefsFromHistory(_ history: [[String: [String: [Double]]]?]) -> [String: [Double]] {
        collectPriorRefsFromHistory(history)["GASES"] ?? [:]
    }

    /// One history entry for `collectPriorBhValuesFromHistory`: `fecha` and `parsedBySection.BH` (nil = missing).
    struct BhHistoryEntry: Sendable {
        var fecha: String?
        var bh: [String: Double]?
    }

    /// `collectPriorBhValuesFromHistory(history, fecha)`: BH numbers of the first entry of the SAME day.
    static func collectPriorBhValuesFromHistory(_ history: [BhHistoryEntry?], _ fecha: String?) -> [String: Double] {
        var out: [String: Double] = [:]
        let day = (fecha ?? "").jsTrim
        if history.isEmpty || day.isEmpty { return out }
        for entry in history {
            guard let entry, (entry.fecha ?? "").jsTrim == day, let bh = entry.bh else { continue }
            for (k, v) in bh where v.isFinite { out[k] = v }
            break
        }
        return out
    }

    /// `mergeRefsMap_(base, overlay)`: field by field, overlay wins.
    static func mergeRefsMap(_ base: [String: [Double]]?, _ overlay: [String: [Double]]?) -> [String: [Double]] {
        var out: [String: [Double]] = [:]
        for (k, r) in base ?? [:] where isValidRangePair(r) { out[k] = [r[0], r[1]] }
        for (k, r) in overlay ?? [:] where isValidRangePair(r) { out[k] = [r[0], r[1]] }
        return out
    }

    /// `mergeRefsBySection_(reportRefs, priorBySec)`: report wins per field, prior fills gaps.
    static func mergeRefsBySection(_ reportRefs: [String: [String: [Double]]]?, _ priorBySec: [String: [String: [Double]]]?) -> [String: [String: [Double]]] {
        var out: [String: [String: [Double]]] = [:]
        let keys = Set((priorBySec ?? [:]).keys).union((reportRefs ?? [:]).keys)
        for sec in keys {
            let merged = mergeRefsMap(priorBySec?[sec], reportRefs?[sec])
            if !merged.isEmpty { out[sec] = merged }
        }
        return out
    }

    /// `mergeGasRefs_(base, overlay)`.
    static func mergeGasRefs(_ base: [String: [Double]]?, _ overlay: [String: [Double]]?) -> [String: [Double]] {
        mergeRefsMap(base, overlay)
    }

    /// `resolveLabFieldRange_(data, fieldKey, priorRefs, defaults)`: report range -> prior refs -> defaults
    /// (`DEFAULT_LAB_REFS` when nil). Node quirk kept: a half range (min null, max > 0) counts as the report range.
    static func resolveLabFieldRange(_ data: LabValorRango?, _ fieldKey: String, _ priorRefs: [String: [Double]]?, _ defaults: [String: [Double]]? = nil) -> (min: Double?, max: Double?)? {
        if let data, isValidRangePair(data.min, data.max) { return (data.min, data.max) }
        if let p = priorRefs?[fieldKey], isValidRangePair(p) { return (p[0], p[1]) }
        if let d = (defaults ?? DEFAULT_LAB_REFS)[fieldKey], isValidRangePair(d) { return (d[0], d[1]) }
        return nil
    }
}
