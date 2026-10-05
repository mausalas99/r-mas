import Foundation

/// JavaScript regex semantics on top of NSRegularExpression (ICU).
/// Paste the JS pattern text as-is: `JSRegex(#"\bHb\s+(\d+)"#, "i")`.
/// It fixes the known gaps: `\b \w \d \s` are ASCII-only like JS (ICU is Unicode),
/// `\s` is the JS whitespace set, `$` without `m` means end of input only (ICU also
/// matches before a final newline), and `[`/`&` inside a class are escaped for ICU.
/// All offsets are UTF-16, the same unit JS uses.
public struct JSRegex: Sendable {
    public let source: String
    public let flags: String
    let re: NSRegularExpression

    public init(_ pattern: String, _ flags: String = "") {
        self.source = pattern
        self.flags = flags
        var opts: NSRegularExpression.Options = []
        if flags.contains("i") { opts.insert(.caseInsensitive) }
        if flags.contains("m") { opts.insert(.anchorsMatchLines) }
        if flags.contains("s") { opts.insert(.dotMatchesLineSeparators) }
        let icu = JSRegex.translate(pattern, multiline: flags.contains("m"))
        do { re = try NSRegularExpression(pattern: icu, options: opts) } catch {
            fatalError("JSRegex: bad pattern \(pattern) -> \(icu): \(error)")
        }
    }

    public var isGlobal: Bool { flags.contains("g") }

    // MARK: translate

    static let wordSet = "A-Za-z0-9_"
    static let spaceSet = #"\t\n\x{0B}\f\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}"#

    static func translate(_ p: String, multiline: Bool) -> String {
        let c = Array(p)
        var out = ""
        var i = 0
        var inClass = false
        // Last emitted thing in a class was a set escape (\w \d \s): a following "-" must be literal.
        var afterSetEscape = false
        while i < c.count {
            let ch = c[i]
            if ch == "\\", i + 1 < c.count {
                let n = c[i + 1]
                i += 2
                var emitted: String? = nil
                switch n {
                case "w": emitted = inClass ? wordSet : "[\(wordSet)]"
                case "W": emitted = "[^\(wordSet)]"
                case "d": emitted = inClass ? "0-9" : "[0-9]"
                case "D": emitted = "[^0-9]"
                case "s": emitted = inClass ? spaceSet : "[\(spaceSet)]"
                case "S": emitted = "[^\(spaceSet)]"
                case "b" where !inClass:
                    let w = "[\(wordSet)]"
                    out += "(?:(?<=\(w))(?!\(w))|(?<!\(w))(?=\(w)))"
                    afterSetEscape = false
                    continue
                case "B" where !inClass:
                    let w = "[\(wordSet)]"
                    out += "(?:(?<=\(w))(?=\(w))|(?<!\(w))(?!\(w)))"
                    afterSetEscape = false
                    continue
                case "b" where inClass: emitted = #"\x{08}"#
                case "/": emitted = "/"
                case "-": emitted = #"\-"#
                case "u":
                    // \uXXXX (JS) -> \x{XXXX}; \u{...} left for ICU.
                    if i + 4 <= c.count, c[i..<i + 4].allSatisfy({ $0.isHexDigit }) {
                        emitted = "\\x{" + String(c[i..<i + 4]) + "}"
                        i += 4
                    } else { emitted = "\\u" }
                default: emitted = "\\" + String(n)
                }
                let isSet = "wWdDsS".contains(n)
                if inClass, isSet, i < c.count, c[i] == "-" {
                    out += emitted!
                    out += #"\-"#
                    i += 1
                    afterSetEscape = false
                    continue
                }
                out += emitted!
                afterSetEscape = isSet
                continue
            }
            if inClass {
                if ch == "]" { inClass = false; out += "]" }
                else if ch == "[" { out += #"\["# }
                else if ch == "&" { out += #"\&"# }
                else if ch == "-", afterSetEscape { out += #"\-"# }
                else { out.append(ch) }
                afterSetEscape = false
                i += 1
                continue
            }
            switch ch {
            case "[":
                var j = i + 1
                let neg = j < c.count && c[j] == "^"
                if neg { j += 1 }
                if j < c.count, c[j] == "]" {
                    // JS: "[]" never matches, "[^]" matches anything. ICU rejects both.
                    out += neg ? #"[\s\S]"# : "(?!)"
                    i = j + 1
                } else {
                    inClass = true
                    afterSetEscape = false
                    out += neg ? "[^" : "["
                    i = j
                }
            case "$":
                out += multiline ? "$" : #"\z"#
                i += 1
            default:
                out.append(ch)
                i += 1
            }
        }
        return out
    }

    // MARK: matching

    private func ns(_ s: String) -> NSString { s as NSString }

    /// Capture groups of one match: index 0 = whole match, nil = group did not take part.
    public struct Match: Sendable {
        public let groups: [String?]
        public let range: NSRange
        public subscript(i: Int) -> String? { i < groups.count ? groups[i] : nil }
        public var whole: String { groups[0] ?? "" }
        /// UTF-16 offset of the match start (JS `m.index`).
        public var index: Int { range.location }
        public var end: Int { range.location + range.length }
    }

    private func make(_ r: NSTextCheckingResult, _ s: NSString) -> Match {
        var g: [String?] = []
        for k in 0..<r.numberOfRanges {
            let rg = r.range(at: k)
            g.append(rg.location == NSNotFound ? nil : s.substring(with: rg))
        }
        return Match(groups: g, range: r.range)
    }

    public func test(_ s: String) -> Bool {
        re.firstMatch(in: s, range: NSRange(location: 0, length: ns(s).length)) != nil
    }

    /// JS `s.match(re)` without `g`, or `re.exec(s)` from `from`.
    public func firstMatch(_ s: String, from: Int = 0) -> Match? {
        let n = ns(s)
        guard from <= n.length else { return nil }
        guard let r = re.firstMatch(in: s, range: NSRange(location: from, length: n.length - from)) else { return nil }
        return make(r, n)
    }

    /// JS `s.matchAll(re)` / `s.match(/g/)` with groups.
    public func allMatches(_ s: String) -> [Match] {
        let n = ns(s)
        return re.matches(in: s, range: NSRange(location: 0, length: n.length)).map { make($0, n) }
    }

    /// JS `s.replace(re, fn)`; replaces all if the regex has `g`, else the first match.
    public func replace(_ s: String, _ fn: (Match) -> String) -> String {
        let n = ns(s)
        let ms = isGlobal ? allMatches(s) : (firstMatch(s).map { [$0] } ?? [])
        var out = ""
        var last = 0
        for m in ms {
            out += n.substring(with: NSRange(location: last, length: m.range.location - last))
            out += fn(m)
            last = m.range.location + m.range.length
        }
        out += n.substring(from: last)
        return out
    }

    /// JS `s.replace(re, "text")` where text has no `$` templates (use the closure form for those).
    public func replace(_ s: String, with text: String) -> String { replace(s) { _ in text } }

    /// JS `s.split(re)`: capture groups are spliced into the result, like JS.
    public func split(_ s: String) -> [String] {
        let n = ns(s)
        if n.length == 0 { return test("") ? [] : [""] }
        var out: [String] = []
        var last = 0
        for m in allMatches(s) {
            if m.range.length == 0 && (m.range.location == 0 || m.range.location >= n.length) { continue }
            if m.range.length == 0 && m.range.location == last { continue }
            out.append(n.substring(with: NSRange(location: last, length: m.range.location - last)))
            for g in m.groups.dropFirst() { out.append(g ?? "") }
            last = m.range.location + m.range.length
        }
        out.append(n.substring(from: last))
        return out
    }
}

public extension String {
    /// JS `String.prototype.trim` (same whitespace set as `\s`).
    var jsTrim: String {
        let set = CharacterSet(charactersIn: "\t\n\u{0B}\u{0C}\r \u{A0}\u{1680}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}")
            .union(CharacterSet(charactersIn: "\u{2000}"..."\u{200A}"))
        return trimmingCharacters(in: set)
    }
    /// JS `s.split(/\r?\n/)`.
    var jsLines: [String] { components(separatedBy: "\n").map { $0.hasSuffix("\r") ? String($0.dropLast()) : $0 } }
}
