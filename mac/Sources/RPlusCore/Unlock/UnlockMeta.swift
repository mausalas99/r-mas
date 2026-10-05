import Foundation

/// The plaintext bootstrap file `rplus-clinical.meta.json` next to the database
/// (packages/core/lib/db/db-path.mjs, db-manager-unlock-meta.mjs).
/// Keys: `kdf_salt` (base64), `recovery_version`, `recovery_salt` (base64),
/// `recovery_wrapped_key` (a JSON string of `Recovery.Wrapped`), `wrapped_dek` (Electron safeStorage).
/// Unknown keys are kept as they are, so a file shared with the Electron app is never trimmed.
public struct UnlockMeta {
    public var raw: [String: Any]

    public init(raw: [String: Any] = [:]) { self.raw = raw }

    public static func dbURL(userData: URL) -> URL { userData.appendingPathComponent("rplus-clinical.db") }
    public static func metaURL(userData: URL) -> URL { userData.appendingPathComponent("rplus-clinical.meta.json") }

    /// Empty meta when the file is missing or broken, like Node.
    public static func read(userData: URL) -> UnlockMeta {
        guard let data = try? Data(contentsOf: metaURL(userData: userData)),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return UnlockMeta() }
        return UnlockMeta(raw: obj)
    }

    public func write(userData: URL) throws {
        try FileManager.default.createDirectory(at: userData, withIntermediateDirectories: true)
        let data = try JSONSerialization.data(withJSONObject: raw)
        try data.write(to: UnlockMeta.metaURL(userData: userData), options: .atomic)
    }

    public static func remove(userData: URL) {
        try? FileManager.default.removeItem(at: metaURL(userData: userData))
    }

    public var kdfSalt: String? {
        get { raw["kdf_salt"] as? String }
        set { raw["kdf_salt"] = newValue }
    }
    public var recoverySalt: String? {
        get { raw["recovery_salt"] as? String }
        set { raw["recovery_salt"] = newValue }
    }
    public var recoveryWrappedKey: String? {
        get { raw["recovery_wrapped_key"] as? String }
        set { raw["recovery_wrapped_key"] = newValue }
    }
    public var recoveryVersion: Int {
        get { (raw["recovery_version"] as? NSNumber)?.intValue ?? Int(raw["recovery_version"] as? String ?? "") ?? 0 }
        set { raw["recovery_version"] = newValue }
    }
    public mutating func removeWrappedDek() { raw["wrapped_dek"] = nil }

    /// The recovery blob, if both salt and blob are present and the blob parses.
    public var recoveryBlob: (salt: Data, wrapped: Recovery.Wrapped)? {
        guard let s = recoverySalt, let salt = Data(base64Encoded: s), let w = recoveryWrappedKey,
              let wrapped = try? JSONDecoder().decode(Recovery.Wrapped.self, from: Data(w.utf8))
        else { return nil }
        return (salt, wrapped)
    }
}
