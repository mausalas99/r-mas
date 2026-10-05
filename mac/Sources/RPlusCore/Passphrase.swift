import Foundation
import CArgon2

public enum PassphraseError: Error, Equatable {
    case badSalt
    case kdfFailed(Int32)
}

/// Passphrase -> database key. Same as `deriveSqlcipherKeyHex` in
/// packages/core/lib/db/crypto.mjs: Argon2id v1.3, 64 MiB, 3 passes, 4 lanes, 32 bytes.
/// The passphrase is hashed as raw UTF-8, with no normalization, like Node does.
public enum Passphrase {
    public static let memoryKiB: UInt32 = 65536
    public static let timeCost: UInt32 = 3
    public static let parallelism: UInt32 = 4
    public static let outputLength = 32

    /// `kdf_salt` is stored base64 in app_meta and the bootstrap file.
    public static func keyHex(passphrase: String, saltBase64: String) throws -> String {
        guard let salt = Data(base64Encoded: saltBase64), salt.count >= 8 else {
            throw PassphraseError.badSalt
        }
        return try keyHex(passphrase: passphrase, salt: salt)
    }

    public static func keyHex(passphrase: String, salt: Data) throws -> String {
        let password = Array(passphrase.utf8)
        var out = [UInt8](repeating: 0, count: outputLength)
        let rc = salt.withUnsafeBytes { saltPtr in
            argon2id_hash_raw(
                timeCost, memoryKiB, parallelism,
                password, password.count,
                saltPtr.baseAddress, salt.count,
                &out, out.count)
        }
        guard rc == 0 else { throw PassphraseError.kdfFailed(rc) }
        return out.map { String(format: "%02x", $0) }.joined()
    }
}
