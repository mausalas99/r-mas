import Foundation

/// String helpers that behave like the JavaScript ones the Node generators use.
/// Swift `String` compares by grapheme and canonical equivalence; JS compares UTF-16 units.
/// Every search here is literal, and trim/split work on Unicode scalars, so output matches Node.
enum JS {
    /// JS `trim()` set: Unicode White_Space, minus NEL (U+0085), plus BOM (U+FEFF).
    static func isSpace(_ u: Unicode.Scalar) -> Bool {
        u == "\u{FEFF}" || (u.properties.isWhitespace && u != "\u{85}")
    }

    static func trim(_ s: String) -> String { trim(s, start: true, end: true) }
    static func trimStart(_ s: String) -> String { trim(s, start: true, end: false) }
    static func trimEnd(_ s: String) -> String { trim(s, start: false, end: true) }

    private static func trim(_ s: String, start: Bool, end: Bool) -> String {
        let v = s.unicodeScalars
        var a = v.startIndex
        var b = v.endIndex
        if start { while a < b, isSpace(v[a]) { a = v.index(after: a) } }
        if end { while a < b, isSpace(v[v.index(before: b)]) { b = v.index(before: b) } }
        return String(v[a..<b])
    }

    /// JS `split('\n')`: keeps empty pieces, and "\r\n" is two scalars, not one Character.
    static func splitLines(_ s: String) -> [String] {
        s.unicodeScalars.split(separator: "\n", omittingEmptySubsequences: false).map { String($0) }
    }

    /// JS `str.replace(a, b)` with plain strings, where `b` holds no `$` pattern.
    static func replaceFirst(_ s: String, _ a: String, _ b: String) -> String {
        guard let r = s.range(of: a, options: .literal) else { return s }
        return s.replacingCharacters(in: r, with: b)
    }

    /// JS `s.split(a).join(b)`.
    static func replaceAll(_ s: String, _ a: String, _ b: String) -> String {
        s.replacingOccurrences(of: a, with: b, options: .literal)
    }

    static func upper(_ s: String) -> String { s.uppercased() }

    /// JS regex `\w`: ASCII letters, digits, underscore.
    static func isWordByte(_ u: Unicode.Scalar) -> Bool {
        (u.value >= 48 && u.value <= 57) || (u.value >= 65 && u.value <= 90)
            || (u.value >= 97 && u.value <= 122) || u == "_"
    }
}
