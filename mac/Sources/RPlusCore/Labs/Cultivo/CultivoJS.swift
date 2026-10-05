import Foundation

/// UTF-16 string helpers with JS semantics, private to the Cultivo unit.
enum CultivoJS {
    static func len(_ s: String) -> Int { (s as NSString).length }

    /// JS `s.indexOf(sub)`.
    static func indexOf(_ s: String, _ sub: String) -> Int {
        let r = (s as NSString).range(of: sub, options: .literal)
        return r.location == NSNotFound ? -1 : r.location
    }

    /// JS `s.substring(a, b)` (clamps and swaps).
    static func substring(_ s: String, _ a: Int, _ b: Int? = nil) -> String {
        let n = s as NSString
        var x = max(0, min(a, n.length)), y = max(0, min(b ?? n.length, n.length))
        if x > y { swap(&x, &y) }
        return n.substring(with: NSRange(location: x, length: y - x))
    }

    /// JS `s.split(sep)` for a non-empty string separator.
    static func split(_ s: String, _ sep: String) -> [String] {
        let n = s as NSString
        var out: [String] = []
        var last = 0
        while true {
            let r = n.range(of: sep, options: .literal, range: NSRange(location: last, length: n.length - last))
            if r.location == NSNotFound { break }
            out.append(n.substring(with: NSRange(location: last, length: r.location - last)))
            last = r.location + r.length
        }
        out.append(n.substring(from: last))
        return out
    }

    /// JS `s.replace(/a/g, b)` for a literal `a`.
    static func replaceAll(_ s: String, _ a: String, _ b: String) -> String {
        (s as NSString).replacingOccurrences(of: a, with: b, options: .literal, range: NSRange(location: 0, length: len(s)))
    }

    /// JS `s.padStart(2, '0')`.
    static func pad2(_ s: String) -> String { len(s) < 2 ? String(repeating: "0", count: 2 - len(s)) + s : s }

    /// JS default `Array.sort()` order (UTF-16 code units).
    static func jsLess(_ a: String, _ b: String) -> Bool { a.utf16.lexicographicallyPrecedes(b.utf16) }

    /// Stable sort by a numeric key (JS `Array.sort` with `(a, b) => k(a) - k(b)`).
    static func stableSort(_ a: [String], _ key: (String) -> Int) -> [String] {
        a.enumerated().sorted { l, r in
            let kl = key(l.element), kr = key(r.element)
            return kl != kr ? kl < kr : l.offset < r.offset
        }.map(\.element)
    }
}
