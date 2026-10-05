import Foundation

public struct JSONMember: Equatable, Sendable {
    public var key: String
    public var value: JSON
    public init(_ key: String, _ value: JSON) { self.key = key; self.value = value }
}

/// JSON value with JS semantics, so text written here matches what Node writes.
/// Objects keep insertion order (like a JS object); `canonical()` sorts keys.
public indirect enum JSON: Equatable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSON])
    case object([JSONMember])

    public struct ParseError: Error, Equatable { public let offset: Int }

    // MARK: Output

    /// Same text as JS `JSON.stringify(value)`.
    public func stringify() -> String { var out = ""; write(&out, sorted: false); return out }

    /// Same text as `canonicalStringify` in lib/db/canonical-json.mjs: keys sorted at every level.
    public func canonical() -> String { var out = ""; write(&out, sorted: true); return out }

    private func write(_ out: inout String, sorted: Bool) {
        switch self {
        case .null: out += "null"
        case .bool(let b): out += b ? "true" : "false"
        case .number(let d): out += JSON.jsNumber(d)
        case .string(let s): JSON.writeString(s, &out)
        case .array(let a):
            out += "["
            for (i, v) in a.enumerated() { if i > 0 { out += "," }; v.write(&out, sorted: sorted) }
            out += "]"
        case .object(let members):
            out += "{"
            for (i, m) in JSON.order(members, sorted: sorted).enumerated() {
                if i > 0 { out += "," }
                JSON.writeString(m.key, &out)
                out += ":"
                m.value.write(&out, sorted: sorted)
            }
            out += "}"
        }
    }

    /// JS own-key order: array-index keys ascending first, then the rest. Canonical sorts the rest by
    /// UTF-16 code units (JS default sort); plain keeps insertion order. Node's canonicalStringify
    /// rebuilds objects, so index-like keys ("2", "10") still come first there. Copied on purpose.
    private static func order(_ members: [JSONMember], sorted: Bool) -> [JSONMember] {
        let indexed = members.compactMap { m in arrayIndex(m.key).map { ($0, m) } }.sorted { $0.0 < $1.0 }.map(\.1)
        var rest = members.filter { arrayIndex($0.key) == nil }
        if sorted { rest.sort { Array($0.key.utf16).lexicographicallyPrecedes(Array($1.key.utf16)) } }
        return indexed + rest
    }

    private static func arrayIndex(_ s: String) -> UInt32? {
        guard let n = UInt32(s), n != UInt32.max, String(n) == s else { return nil }
        return n
    }

    private static func writeString(_ s: String, _ out: inout String) {
        out += "\""
        for u in s.unicodeScalars {
            switch u {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\u{08}": out += "\\b"
            case "\u{0C}": out += "\\f"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "\t": out += "\\t"
            default:
                if u.value < 0x20 {
                    let h = String(u.value, radix: 16)
                    out += "\\u" + String(repeating: "0", count: 4 - h.count) + h
                } else {
                    out.unicodeScalars.append(u)
                }
            }
        }
        out += "\""
    }

    /// JS `Number.prototype.toString` (what JSON.stringify prints). NaN and Infinity give "null".
    static func jsNumber(_ value: Double) -> String {
        if !value.isFinite { return "null" }
        if value == 0 { return "0" }
        // Swift prints the shortest round-trip digits too. Take digits and exponent, then lay them out the JS way.
        var text = "\(abs(value))"
        var exp = 0
        if let e = text.firstIndex(where: { $0 == "e" || $0 == "E" }) {
            exp = Int(text[text.index(after: e)...]) ?? 0
            text = String(text[..<e])
        }
        let parts = text.split(separator: ".", omittingEmptySubsequences: false)
        var digits = String(parts[0]) + (parts.count > 1 ? String(parts[1]) : "")
        var n = parts[0].count + exp
        while digits.hasPrefix("0") { digits.removeFirst(); n -= 1 }
        while digits.hasSuffix("0") { digits.removeLast() }
        let k = digits.count
        let sign = value < 0 ? "-" : ""
        let zeros = { (c: Int) in String(repeating: "0", count: c) }
        if k <= n && n <= 21 { return sign + digits + zeros(n - k) }
        if 0 < n && n <= 21 { return sign + digits.prefix(n) + "." + digits.dropFirst(n) }
        if -6 < n && n <= 0 { return sign + "0." + zeros(-n) + digits }
        let e = n - 1
        let tail = "e" + (e < 0 ? "-" : "+") + String(abs(e))
        return sign + (k == 1 ? digits : digits.prefix(1) + "." + digits.dropFirst()) + tail
    }

    // MARK: Parse (same grammar as JSON.parse)

    public static func parse(_ text: String) throws -> JSON {
        var p = Parser(bytes: Array(text.utf8))
        p.skipSpace()
        let v = try p.value()
        p.skipSpace()
        guard p.i == p.bytes.count else { throw ParseError(offset: p.i) }
        return v
    }

    private struct Parser {
        let bytes: [UInt8]
        var i = 0
        init(bytes: [UInt8]) { self.bytes = bytes }

        func fail() -> ParseError { ParseError(offset: i) }
        mutating func skipSpace() {
            while i < bytes.count, [0x20, 0x09, 0x0A, 0x0D].contains(bytes[i]) { i += 1 }
        }
        mutating func literal(_ word: String, _ v: JSON) throws -> JSON {
            let w = Array(word.utf8)
            guard i + w.count <= bytes.count, Array(bytes[i..<i + w.count]) == w else { throw fail() }
            i += w.count
            return v
        }

        mutating func value() throws -> JSON {
            guard i < bytes.count else { throw fail() }
            switch bytes[i] {
            case UInt8(ascii: "n"): return try literal("null", .null)
            case UInt8(ascii: "t"): return try literal("true", .bool(true))
            case UInt8(ascii: "f"): return try literal("false", .bool(false))
            case UInt8(ascii: "\""): return .string(try string())
            case UInt8(ascii: "["):
                i += 1
                var items: [JSON] = []
                skipSpace()
                if i < bytes.count, bytes[i] == UInt8(ascii: "]") { i += 1; return .array(items) }
                while true {
                    skipSpace()
                    items.append(try value())
                    skipSpace()
                    guard i < bytes.count else { throw fail() }
                    if bytes[i] == UInt8(ascii: ",") { i += 1; continue }
                    if bytes[i] == UInt8(ascii: "]") { i += 1; return .array(items) }
                    throw fail()
                }
            case UInt8(ascii: "{"):
                i += 1
                var members: [JSONMember] = []
                skipSpace()
                if i < bytes.count, bytes[i] == UInt8(ascii: "}") { i += 1; return .object(members) }
                while true {
                    skipSpace()
                    guard i < bytes.count, bytes[i] == UInt8(ascii: "\"") else { throw fail() }
                    let key = try string()
                    skipSpace()
                    guard i < bytes.count, bytes[i] == UInt8(ascii: ":") else { throw fail() }
                    i += 1
                    skipSpace()
                    let v = try value()
                    // Duplicate key: last value wins, first position stays (JS object assignment).
                    if let at = members.firstIndex(where: { $0.key == key }) { members[at].value = v }
                    else { members.append(JSONMember(key, v)) }
                    skipSpace()
                    guard i < bytes.count else { throw fail() }
                    if bytes[i] == UInt8(ascii: ",") { i += 1; continue }
                    if bytes[i] == UInt8(ascii: "}") { i += 1; return .object(members) }
                    throw fail()
                }
            default: return try number()
            }
        }

        mutating func number() throws -> JSON {
            let start = i
            func digits(_ p: inout Parser) -> Int {
                let s = p.i
                while p.i < p.bytes.count, (0x30...0x39).contains(p.bytes[p.i]) { p.i += 1 }
                return p.i - s
            }
            if i < bytes.count, bytes[i] == UInt8(ascii: "-") { i += 1 }
            guard i < bytes.count, (0x30...0x39).contains(bytes[i]) else { throw fail() }
            if bytes[i] == 0x30 { i += 1 } else { _ = digits(&self) }
            if i < bytes.count, bytes[i] == UInt8(ascii: ".") {
                i += 1
                guard digits(&self) > 0 else { throw fail() }
            }
            if i < bytes.count, bytes[i] == UInt8(ascii: "e") || bytes[i] == UInt8(ascii: "E") {
                i += 1
                if i < bytes.count, bytes[i] == UInt8(ascii: "+") || bytes[i] == UInt8(ascii: "-") { i += 1 }
                guard digits(&self) > 0 else { throw fail() }
            }
            guard let d = Double(String(decoding: bytes[start..<i], as: UTF8.self)) else { throw fail() }
            return .number(d)
        }

        mutating func hex4() throws -> UInt32 {
            guard i + 4 <= bytes.count,
                  let v = UInt32(String(decoding: bytes[i..<i + 4], as: UTF8.self), radix: 16) else { throw fail() }
            i += 4
            return v
        }

        mutating func string() throws -> String {
            i += 1  // opening quote
            var out: [UInt8] = []
            while true {
                guard i < bytes.count else { throw fail() }
                let b = bytes[i]
                if b == UInt8(ascii: "\"") { i += 1; return String(decoding: out, as: UTF8.self) }
                if b < 0x20 { throw fail() }
                if b != UInt8(ascii: "\\") { out.append(b); i += 1; continue }
                i += 1
                guard i < bytes.count else { throw fail() }
                let c = bytes[i]
                i += 1
                switch c {
                case UInt8(ascii: "\""): out.append(0x22)
                case UInt8(ascii: "\\"): out.append(0x5C)
                case UInt8(ascii: "/"): out.append(0x2F)
                case UInt8(ascii: "b"): out.append(0x08)
                case UInt8(ascii: "f"): out.append(0x0C)
                case UInt8(ascii: "n"): out.append(0x0A)
                case UInt8(ascii: "r"): out.append(0x0D)
                case UInt8(ascii: "t"): out.append(0x09)
                case UInt8(ascii: "u"):
                    var u = try hex4()
                    // ponytail: a lone surrogate becomes U+FFFD (Swift strings cannot hold one); JS keeps it.
                    if (0xD800...0xDBFF).contains(u), i + 6 <= bytes.count, bytes[i] == 0x5C, bytes[i + 1] == UInt8(ascii: "u") {
                        let save = i
                        i += 2
                        let lo = try hex4()
                        if (0xDC00...0xDFFF).contains(lo) { u = 0x10000 + ((u - 0xD800) << 10) + (lo - 0xDC00) } else { i = save }
                    }
                    out.append(contentsOf: Array(String(Unicode.Scalar(u) ?? "\u{FFFD}").utf8))
                default: throw fail()
                }
            }
        }
    }

    // MARK: Helpers

    /// `value[key]` for objects. nil when absent or not an object.
    public subscript(key: String) -> JSON? {
        guard case .object(let members) = self else { return nil }
        return members.first { $0.key == key }?.value
    }

    /// Copy with `key` set. Existing key keeps its position, new key goes last (JS assignment).
    public func setting(_ key: String, _ value: JSON) -> JSON {
        guard case .object(var members) = self else { return self }
        if let at = members.firstIndex(where: { $0.key == key }) { members[at].value = value }
        else { members.append(JSONMember(key, value)) }
        return .object(members)
    }

    /// JS truthiness (`x || fallback`).
    public var isTruthy: Bool {
        switch self {
        case .null: false
        case .bool(let b): b
        case .number(let d): d != 0 && !d.isNaN
        case .string(let s): !s.isEmpty
        case .array, .object: true
        }
    }

    /// JS `String(value)`.
    public var jsString: String {
        switch self {
        case .null: "null"
        case .bool(let b): b ? "true" : "false"
        case .number(let d): d.isFinite ? JSON.jsNumber(d) : (d.isNaN ? "NaN" : (d < 0 ? "-Infinity" : "Infinity"))
        case .string(let s): s
        case .array(let a): a.map { $0 == .null ? "" : $0.jsString }.joined(separator: ",")
        case .object: "[object Object]"
        }
    }
}
