import Foundation

/// labs-panel-overlay.mjs `OverlayRecord`: a user/LAN patch over the built-in panel defs.
struct PanelOverlayRecord: Sendable, Equatable {
    struct Field: Sendable, Equatable {
        let key: String
        var labels: [String]? = nil
        var patterns: [String]? = nil
    }
    let panelId: String
    var baseSectionKey: String? = nil
    let sectionKey: String
    var mode: String? = nil
    var gates: [String] = []
    var fields: [Field] = []
    var updatedAt: Double = 0
    var updatedBy: String = ""
}

/// labs-panel-overlay.mjs (pure merge) + labs-panel-overlay-store.mjs (in-memory part only).
/// ponytail: no persistence (Node: localStorage key rpc-lab-panel-overlay); the app layer sets `overlays`.
enum PanelOverlay {
    nonisolated(unsafe) static var overlays: [PanelOverlayRecord] = []

    private static let metaRe = JSRegex(#"[\\^$*+?()|[\]{}]"#)

    /// `hydrateGate`: a string with regex syntax is a regex, else a literal; both case-insensitive.
    /// Note: an invalid pattern stops the app (JSRegex fatalError); Node throws from `new RegExp`.
    static func hydrateGate(_ g: String) -> JSRegex {
        metaRe.test(g) ? JSRegex(g, "i") : JSRegex(BaseJS.escapeRegex(g), "i")
    }

    static func overlayRecordToPanelDef(_ rec: PanelOverlayRecord) -> PanelDef {
        let fields = rec.fields.map { f -> PanelField in
            if let p = f.patterns { return PanelField(key: f.key, patterns: p.map(hydrateGate)) }
            return PanelField(key: f.key, labels: f.labels ?? [])
        }
        return PanelDef(sectionKey: rec.sectionKey, mode: rec.mode ?? "num", gates: rec.gates.map(hydrateGate), fields: fields)
    }

    private static func findBuiltinIndex(_ list: [PanelDef], _ rec: PanelOverlayRecord) -> Int {
        let baseKey = (rec.baseSectionKey ?? "").isEmpty ? rec.sectionKey : rec.baseSectionKey!
        let mode = rec.mode ?? "num"
        return list.firstIndex { $0.sectionKey == baseKey && $0.mode == mode } ?? -1
    }

    static func applyOverlayToBuiltins(_ builtins: [PanelDef], _ overlayArr: [PanelOverlayRecord]) -> [PanelDef] {
        var list = builtins
        for rec in overlayArr {
            if rec.panelId.hasPrefix("builtin:") {
                let idx = findBuiltinIndex(list, rec)
                if idx >= 0 { list[idx] = overlayRecordToPanelDef(rec) } else { list.append(overlayRecordToPanelDef(rec)) }
            } else {
                list.append(overlayRecordToPanelDef(rec))
            }
        }
        return list
    }

    private static func shouldReplaceOverlay(_ prev: PanelOverlayRecord, _ rec: PanelOverlayRecord) -> Bool {
        if rec.updatedAt > prev.updatedAt { return true }
        if rec.updatedAt < prev.updatedAt { return false }
        return rec.updatedBy > prev.updatedBy
    }

    /// `mergeLabPanelOverlayLww`: last-writer-wins by panelId, first-seen order.
    /// Node orders by Object.keys (integer-like panelIds first); panelIds are "builtin:…"/"user:…", so no difference.
    static func mergeLabPanelOverlayLww(_ localArr: [PanelOverlayRecord], _ incomingArr: [PanelOverlayRecord]) -> [PanelOverlayRecord] {
        var order: [String] = [], map: [String: PanelOverlayRecord] = [:]
        for rec in localArr + incomingArr where !rec.panelId.isEmpty {
            if let prev = map[rec.panelId] {
                if shouldReplaceOverlay(prev, rec) { map[rec.panelId] = rec }
            } else {
                map[rec.panelId] = rec
                order.append(rec.panelId)
            }
        }
        return order.map { map[$0]! }
    }

    /// `getEffectivePanelDefs()`.
    static func getEffectivePanelDefs() -> [PanelDef] {
        overlays.isEmpty ? PanelDefs.LAB_EXTENDED_PANEL_DEFS : applyOverlayToBuiltins(PanelDefs.LAB_EXTENDED_PANEL_DEFS, overlays)
    }
}
