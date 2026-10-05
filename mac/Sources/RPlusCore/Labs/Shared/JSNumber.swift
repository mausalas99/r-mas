import Foundation

// JavaScript number rules. Node's parser output is built with these, so Swift must match them byte for byte.
// nil stands for NaN in the optional-returning functions.

private let floatPrefix = JSRegex(#"^[+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)"#)

/// JS `parseFloat(s)`: longest numeric prefix after leading whitespace. "12abc" -> 12. No prefix -> nil.
public func jsParseFloat(_ s: String) -> Double? {
    guard let m = floatPrefix.firstMatch(s.jsTrimStart) else { return nil }
    let t = m.whole
    if t.hasSuffix("Infinity") { return t.hasPrefix("-") ? -Double.infinity : Double.infinity }
    return Double(t.hasSuffix(".") ? String(t.dropLast()) : t)
}

/// JS `parseInt(s, radix)` for radix 10 (and 16 with or without 0x). No digits -> nil.
public func jsParseInt(_ s: String, radix: Int = 10) -> Int? {
    var t = Substring(s.jsTrimStart)
    var sign = 1
    if t.hasPrefix("-") { sign = -1; t = t.dropFirst() } else if t.hasPrefix("+") { t = t.dropFirst() }
    var r = radix
    if (r == 16 || r == 0) && (t.hasPrefix("0x") || t.hasPrefix("0X")) { t = t.dropFirst(2); r = 16 }
    if r == 0 { r = 10 }
    let digits = t.prefix { $0.isASCII && Int(String($0), radix: r) != nil }
    guard !digits.isEmpty, let v = Int(digits, radix: r) else { return nil }
    return sign * v
}

/// JS `Number(s)` for strings: trims, "" -> 0, decimal/exponent/Infinity/0x. Anything else -> nil (NaN).
public func jsNumber(parsing s: String) -> Double? {
    let t = s.jsTrim
    if t.isEmpty { return 0 }
    if t.hasPrefix("0x") || t.hasPrefix("0X") { return Int(t.dropFirst(2), radix: 16).map(Double.init) }
    guard let m = floatPrefix.firstMatch(t), m.whole == t else { return nil }
    return jsParseFloat(t)
}

/// JS `String(x)` / template literal of a number: 7.3 -> "7.3", 100000000 -> "100000000", 1e21 -> "1e+21", 1e-7 -> "1e-7".
public func jsString(_ x: Double) -> String {
    if x.isNaN { return "NaN" }
    if x == 0 { return "0" }
    if x.isInfinite { return x < 0 ? "-Infinity" : "Infinity" }
    if x < 0 { return "-" + jsString(-x) }
    // Shortest round-trip digits from Swift's description, then lay them out by the ECMAScript rules.
    let d = "\(x)"
    var mantissa = d, exp10 = 0
    if let e = d.firstIndex(where: { $0 == "e" || $0 == "E" }) {
        mantissa = String(d[..<e])
        exp10 = Int(d[d.index(after: e)...].replacingOccurrences(of: "+", with: "")) ?? 0
    }
    var intPart = mantissa, frac = ""
    if let dot = mantissa.firstIndex(of: ".") { intPart = String(mantissa[..<dot]); frac = String(mantissa[mantissa.index(after: dot)...]) }
    var digits = intPart + frac
    var n = intPart.count + exp10          // position of the decimal point relative to digits start
    let lead = digits.prefix { $0 == "0" }.count
    digits = String(digits.dropFirst(lead)); n -= lead
    while digits.hasSuffix("0") { digits.removeLast() }
    let k = digits.count
    if k <= n && n <= 21 { return digits + String(repeating: "0", count: n - k) }
    if 0 < n && n <= 21 { return String(digits.prefix(n)) + "." + String(digits.dropFirst(n)) }
    if -6 < n && n <= 0 { return "0." + String(repeating: "0", count: -n) + digits }
    let e = n - 1
    let es = (e < 0 ? "-" : "+") + String(abs(e))
    return k == 1 ? digits + "e" + es : String(digits.prefix(1)) + "." + String(digits.dropFirst()) + "e" + es
}

/// JS `x.toFixed(digits)`: exact decimal value of the double, ties round up (C printf rounds ties to even).
public func jsToFixed(_ x: Double, _ digits: Int) -> String {
    if x.isNaN { return "NaN" }
    if x.isInfinite || abs(x) >= 1e21 { return jsString(x) }
    let neg = x < 0
    // The exact binary expansion of a double has at most 1074 fractional digits; 60 is plenty for tie detection here.
    let exact = String(format: "%.60f", abs(x))
    let parts = exact.split(separator: ".", omittingEmptySubsequences: false)
    var intDigits = Array(parts[0]), frac = Array(parts[1])
    let keep = frac.prefix(digits)
    let next = frac.count > digits ? frac[digits] : "0"
    var all = intDigits + keep
    if next >= "5" {                         // tie or above: round up
        var i = all.count - 1
        while i >= 0 {
            if all[i] == "9" { all[i] = "0"; i -= 1 } else { all[i] = Character(String(all[i].wholeNumberValue! + 1)); break }
        }
        if i < 0 { all.insert("1", at: 0) }
    }
    intDigits = Array(all.prefix(all.count - digits))
    let fracOut = String(all.suffix(digits))
    var out = String(intDigits) + (digits > 0 ? "." + fracOut : "")
    if neg { out = "-" + out }
    return out
}

extension String {
    /// JS `trimStart`.
    var jsTrimStart: String {
        var s = Substring(self)
        while let f = s.first, JSRegex.isJSSpace(f) { s = s.dropFirst() }
        return String(s)
    }
}

extension JSRegex {
    static func isJSSpace(_ c: Character) -> Bool {
        c.unicodeScalars.allSatisfy { u in
            switch u.value {
            case 0x09...0x0D, 0x20, 0xA0, 0x1680, 0x2000...0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF: true
            default: false
            }
        }
    }
}
