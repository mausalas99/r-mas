import CryptoKit
import Foundation

public enum RecoveryError: Error, Equatable {
    case badWrappedBlob
}

/// Recovery code and the AES-256-GCM wrap of the database key.
/// Same as packages/core/lib/db/crypto.mjs. The wrapped blob is `{iv, tag, data}`, all base64.
/// Node uses a 16-byte IV (not the usual 12) and wraps the key as its 64-char hex text.
public enum Recovery {
    /// Fallback for databases wrapped before recovery v2. Deprecated in Node too.
    public static let legacyCode = "r+123"
    static let alphabet = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

    public struct Wrapped: Codable, Equatable, Sendable {
        public var iv: String
        public var tag: String
        public var data: String
        public init(iv: String, tag: String, data: String) {
            self.iv = iv; self.tag = tag; self.data = data
        }
    }

    /// Trim, upper-case, drop all white space. Same rule as `normalizeRecoveryCodeInput`.
    public static func normalize(_ code: String) -> String {
        code.uppercased().components(separatedBy: .whitespacesAndNewlines).joined()
    }

    /// `R+` and 8 characters from a 32-letter alphabet. 256 % 32 == 0, so no modulo bias.
    public static func generate() -> String {
        var rng = SystemRandomNumberGenerator()
        return "R+" + String((0..<8).map { _ in alphabet[Int(rng.next() as UInt8) % alphabet.count] })
    }

    /// Argon2id of the normalized code with the recovery salt. Same options as the passphrase.
    public static func wrappingKeyHex(salt: Data, code: String) throws -> String {
        try Passphrase.keyHex(passphrase: normalize(code), salt: salt)
    }

    public static func wrap(keyHex: String, wrappingKeyHex: String, iv: Data? = nil) throws -> Wrapped {
        let nonce = try AES.GCM.Nonce(data: iv ?? Data((0..<16).map { _ in UInt8.random(in: 0...255) }))
        let box = try AES.GCM.seal(Data(keyHex.utf8), using: try symmetricKey(wrappingKeyHex), nonce: nonce)
        return Wrapped(
            iv: Data(nonce).base64EncodedString(),
            tag: box.tag.base64EncodedString(),
            data: box.ciphertext.base64EncodedString())
    }

    /// Returns the database key hex, or nil when the code is wrong (the GCM tag fails).
    public static func unwrap(_ wrapped: Wrapped, wrappingKeyHex: String) -> String? {
        guard let iv = Data(base64Encoded: wrapped.iv), let tag = Data(base64Encoded: wrapped.tag),
              let data = Data(base64Encoded: wrapped.data),
              let key = try? symmetricKey(wrappingKeyHex),
              let nonce = try? AES.GCM.Nonce(data: iv),
              let box = try? AES.GCM.SealedBox(nonce: nonce, ciphertext: data, tag: tag),
              let plain = try? AES.GCM.open(box, using: key)
        else { return nil }
        return String(data: plain, encoding: .utf8)
    }

    private static func symmetricKey(_ hex: String) throws -> SymmetricKey {
        guard hex.count == 64, let bytes = Data(hexString: hex) else { throw RecoveryError.badWrappedBlob }
        return SymmetricKey(data: bytes)
    }
}

extension Data {
    init?(hexString: String) {
        guard hexString.count % 2 == 0 else { return nil }
        var out = Data(capacity: hexString.count / 2)
        var idx = hexString.startIndex
        while idx < hexString.endIndex {
            let next = hexString.index(idx, offsetBy: 2)
            guard let b = UInt8(hexString[idx..<next], radix: 16) else { return nil }
            out.append(b)
            idx = next
        }
        self = out
    }
}
