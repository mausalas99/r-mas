import Foundation

/// JS string/number semantics the Base unit needs (UTF-16 offsets, like JS). Other units may use them.
enum BaseJS {
    /// JS `s.length`.
    static func len(_ s: String) -> Int { (s as NSString).length }

    /// JS `s.substring(a, b)`: clamps to [0, length], swaps when a > b.
    static func substring(_ s: String, _ a: Int, _ b: Int? = nil) -> String {
        let n = s as NSString
        var x = min(max(a, 0), n.length), y = min(max(b ?? n.length, 0), n.length)
        if x > y { swap(&x, &y) }
        return n.substring(with: NSRange(location: x, length: y - x))
    }

    /// JS `s.slice(a, b)`: negative offsets count from the end.
    static func slice(_ s: String, _ a: Int, _ b: Int? = nil) -> String {
        let n = s as NSString
        func norm(_ i: Int) -> Int { i < 0 ? max(n.length + i, 0) : min(i, n.length) }
        let x = norm(a), y = norm(b ?? n.length)
        return y <= x ? "" : n.substring(with: NSRange(location: x, length: y - x))
    }

    /// JS `s.indexOf(sub, from)` (code-unit compare).
    static func indexOf(_ s: String, _ sub: String, _ from: Int = 0) -> Int {
        let n = s as NSString
        let start = min(max(from, 0), n.length)
        let r = n.range(of: sub, options: .literal, range: NSRange(location: start, length: n.length - start))
        return r.location == NSNotFound ? -1 : r.location
    }

    /// JS `s.charAt(i)`: "" when out of range.
    static func charAt(_ s: String, _ i: Int) -> String {
        let n = s as NSString
        return i < 0 || i >= n.length ? "" : n.substring(with: NSRange(location: i, length: 1))
    }

    /// JS `s.replace("a", "b")` with a string pattern: first occurrence only.
    static func replaceFirst(_ s: String, _ a: String, _ b: String) -> String {
        guard let r = s.range(of: a, options: .literal) else { return s }
        return s.replacingCharacters(in: r, with: b)
    }

    /// JS `Math.round`: halves go toward +Infinity.
    static func round(_ x: Double) -> Double {
        if !x.isFinite { return x }
        let f = x.rounded(.down)
        return x - f >= 0.5 ? f + 1 : f
    }

    /// JS `isFinite(x)` where nil is JS `null` (coerces to 0, so it is finite).
    static func isFiniteNull(_ x: Double?) -> Bool { x.map { $0.isFinite } ?? true }

    /// JS `Number.EPSILON`.
    static let epsilon = Double.ulpOfOne

    /// JS `str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.
    static func escapeRegex(_ s: String) -> String { escapeRe.replace(s) { "\\" + $0.whole } }
    private static let escapeRe = JSRegex(#"[.*+?^${}()|[\]\\]"#, "g")
}
