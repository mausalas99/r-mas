import Foundation

/// Loose JSON value. Used to compare Swift output with Node's JSON, and for options.
public enum LabJSON: Codable, Equatable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([LabJSON])
    case object([String: LabJSON])

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let d = try? c.decode(Double.self) { self = .number(d) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else if let a = try? c.decode([LabJSON].self) { self = .array(a) }
        else { self = .object(try c.decode([String: LabJSON].self)) }
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let b): try c.encode(b)
        case .number(let d): try c.encode(d)
        case .string(let s): try c.encode(s)
        case .array(let a): try c.encode(a)
        case .object(let o): try c.encode(o)
        }
    }

    public subscript(key: String) -> LabJSON? {
        if case .object(let o) = self { return o[key] }
        return nil
    }

    public var stringValue: String? { if case .string(let s) = self { return s }; return nil }
    public var numberValue: Double? { if case .number(let d) = self { return d }; return nil }

    /// Encode any Encodable value, then read it back as LabJSON.
    public static func of<T: Encodable>(_ value: T) throws -> LabJSON {
        try JSONDecoder().decode(LabJSON.self, from: JSONEncoder().encode(value))
    }
}
