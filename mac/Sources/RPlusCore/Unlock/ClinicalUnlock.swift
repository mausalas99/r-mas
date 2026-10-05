import Foundation
import GRDB

public enum UnlockError: Error, Equatable {
    case rateLimited
    case passphraseRequired
    case invalidPassphrase
    case invalidRecoveryCode
    case recoveryNotConfigured
    case metadataMissing
    case setupFailed
    case locked
    case passphraseTooShort
    case passphraseMismatch
}

/// 5 failed unlocks in 15 minutes lock out further tries (db-manager-auth-internals.mjs).
public struct UnlockRateLimiter {
    public static let maxFails = 5
    public static let window: TimeInterval = 15 * 60
    var fails: [Date] = []
    public init() {}

    mutating func isLimited(now: Date = Date()) -> Bool {
        fails = fails.filter { now.timeIntervalSince($0) < Self.window }
        return fails.count >= Self.maxFails
    }
    mutating func recordFail(now: Date = Date()) { fails.append(now) }
    mutating func clear() { fails = [] }
}

/// Unlock, recovery and passphrase change for the clinical DB.
/// Port of db-manager-auth-unlock-flows.mjs and db-manager-auth-internals.mjs.
/// Left out on purpose: audit rows (T4 owns the audit chain) and "remember me" (`wrapped_dek` is
/// Electron safeStorage; the Mac app will use Keychain later). This code never creates `wrapped_dek`.
public final class ClinicalUnlock {
    public let userData: URL
    public private(set) var database: DatabaseQueue?
    public private(set) var activeKeyHex: String?
    var limiter = UnlockRateLimiter()

    public var isUnlocked: Bool { database != nil }
    private var dbPath: String { UnlockMeta.dbURL(userData: userData).path }

    public init(userData: URL) { self.userData = userData }

    public func lock() {
        database = nil
        activeKeyHex = nil
    }

    // MARK: Passphrase

    /// `setup: true` starts a new database: old files are deleted, a new salt is made.
    /// Returns a new recovery code only the first time one is made. Show it once.
    @discardableResult
    public func unlock(passphrase: String, setup: Bool = false) throws -> String? {
        if limiter.isLimited() { throw UnlockError.rateLimited }
        if passphrase.isEmpty { limiter.recordFail(); throw UnlockError.passphraseRequired }

        var meta = UnlockMeta.read(userData: userData)
        let salt: Data
        if setup {
            lock()
            removeDbFiles()
            UnlockMeta.remove(userData: userData)
            meta = UnlockMeta()
            salt = Self.newSalt()
        } else if let b64 = meta.kdfSalt, let s = Data(base64Encoded: b64) {
            salt = s
        } else if FileManager.default.fileExists(atPath: dbPath) {
            limiter.recordFail()
            throw UnlockError.metadataMissing
        } else {
            salt = Self.newSalt()
        }

        let keyHex: String
        do { keyHex = try Passphrase.keyHex(passphrase: passphrase, salt: salt) } catch {
            limiter.recordFail()
            throw setup ? UnlockError.setupFailed : UnlockError.invalidPassphrase
        }
        do { try open(keyHex: keyHex) } catch {
            limiter.recordFail()
            throw setup ? UnlockError.setupFailed : UnlockError.invalidPassphrase
        }

        let saltB64 = salt.base64EncodedString()
        do {
            try database?.write { db in
                try Self.setAppMeta(db, "kdf_salt", saltB64)
                try Self.setAppMeta(db, "kdf_params_json", Self.kdfParamsJSON)
            }
            meta.kdfSalt = saltB64
            try meta.write(userData: userData)
        } catch {
            lock()
            throw setup ? UnlockError.setupFailed : error
        }

        // Best effort, like Node: unlock works even if recovery setup fails.
        let reveal = try? setupRecoveryKey(keyHex: keyHex)
        limiter.clear()
        return reveal ?? nil
    }

    // MARK: Recovery

    /// Returns a new recovery code when the old one was legacy or v1 (it is replaced).
    @discardableResult
    public func unlock(recoveryCode: String) throws -> String? {
        let normalized = Recovery.normalize(recoveryCode)
        if normalized.isEmpty { limiter.recordFail(); throw UnlockError.invalidRecoveryCode }
        if limiter.isLimited() { throw UnlockError.rateLimited }
        let meta = UnlockMeta.read(userData: userData)
        guard let blob = meta.recoveryBlob else {
            limiter.recordFail()
            throw UnlockError.recoveryNotConfigured
        }

        // v2 accepts only the user's code. Older files also accept the legacy code.
        let candidates = meta.recoveryVersion >= 2 ? [normalized] : [normalized, Recovery.legacyCode]
        var found: (keyHex: String, usedLegacy: Bool)?
        for c in candidates {
            if let wk = try? Recovery.wrappingKeyHex(salt: blob.salt, code: c),
               let key = Recovery.unwrap(blob.wrapped, wrappingKeyHex: wk) {
                found = (key, c == Recovery.legacyCode)
                break
            }
        }
        guard let (keyHex, usedLegacy) = found else {
            limiter.recordFail()
            throw UnlockError.invalidRecoveryCode
        }
        do { try open(keyHex: keyHex) } catch {
            limiter.recordFail()
            throw UnlockError.invalidRecoveryCode
        }

        var reveal: String?
        if usedLegacy || meta.recoveryVersion < 2 {
            reveal = try? setupRecoveryKey(keyHex: keyHex, forceRotate: true)
        }
        limiter.clear()
        return reveal
    }

    /// Makes (or rotates) the recovery code and stores the wrapped key in the meta file and app_meta.
    /// Returns the new code, or nil when a v2 blob exists and `forceRotate` is false.
    func setupRecoveryKey(keyHex: String, forceRotate: Bool = false) throws -> String? {
        var meta = UnlockMeta.read(userData: userData)
        if meta.recoveryVersion >= 2, meta.recoverySalt != nil, meta.recoveryWrappedKey != nil, !forceRotate {
            return nil
        }
        let salt = meta.recoverySalt.flatMap { Data(base64Encoded: $0) } ?? Self.newSalt()
        let code = Recovery.generate()
        let wrapped = try Recovery.wrap(
            keyHex: keyHex, wrappingKeyHex: try Recovery.wrappingKeyHex(salt: salt, code: code))
        let wrappedJSON = String(decoding: try JSONEncoder().encode(wrapped), as: UTF8.self)
        let saltB64 = salt.base64EncodedString()
        meta.recoveryVersion = 2
        meta.recoverySalt = saltB64
        meta.recoveryWrappedKey = wrappedJSON
        try meta.write(userData: userData)
        // Meta file is enough; the app_meta copy is best effort.
        try? database?.write { db in
            try Self.setAppMeta(db, "recovery_version", "2")
            try Self.setAppMeta(db, "recovery_salt", saltB64)
            try Self.setAppMeta(db, "recovery_wrapped_key", wrappedJSON)
        }
        return code
    }

    // MARK: Change passphrase

    /// Re-keys the open database. Same steps as Node `changePassphraseImpl`.
    /// Returns a new recovery code. Node does not make one here, and that leaves the old code
    /// unwrapping the OLD key, which no longer opens the file. This port rotates it. Show it once.
    @discardableResult
    public func changePassphrase(current: String, new newPassphrase: String) throws -> String? {
        guard let db = database else { throw UnlockError.locked }
        if current.isEmpty || newPassphrase.isEmpty { throw UnlockError.passphraseRequired }
        if newPassphrase.utf16.count < 8 { throw UnlockError.passphraseTooShort }  // JS length rule
        var meta = UnlockMeta.read(userData: userData)
        guard let saltB64 = meta.kdfSalt, let salt = Data(base64Encoded: saltB64) else {
            throw UnlockError.metadataMissing
        }
        let currentKey = try Passphrase.keyHex(passphrase: current, salt: salt)
        guard Self.constantTimeEqual(currentKey, activeKeyHex) else { throw UnlockError.passphraseMismatch }

        let newSalt = Self.newSalt()
        let newKey = try Passphrase.keyHex(passphrase: newPassphrase, salt: newSalt)
        let newSaltB64 = newSalt.base64EncodedString()

        try db.writeWithoutTransaction { db in
            _ = try String.fetchOne(db, sql: "PRAGMA journal_mode = DELETE")
            try db.execute(sql: "PRAGMA rekey = \"x'\(newKey)'\"")
            _ = try String.fetchOne(db, sql: "PRAGMA journal_mode = WAL")
            try db.inTransaction {
                try Self.setAppMeta(db, "kdf_salt", newSaltB64)
                try Self.setAppMeta(db, "kdf_params_json", Self.kdfParamsJSON)
                try db.execute(sql: "DELETE FROM app_meta WHERE key = 'wrapped_dek'")
                return .commit
            }
        }
        meta.kdfSalt = newSaltB64
        meta.removeWrappedDek()  // wrapped the old key
        try meta.write(userData: userData)
        activeKeyHex = newKey
        return try? setupRecoveryKey(keyHex: newKey, forceRotate: true)
    }

    // MARK: Internals

    private func open(keyHex: String) throws {
        lock()
        let queue = try ClinicalDatabase.open(path: dbPath, keyHex: keyHex)
        try Schema.apply(to: queue)
        database = queue
        activeKeyHex = keyHex
    }

    private func removeDbFiles() {
        for s in ["", "-wal", "-shm"] { try? FileManager.default.removeItem(atPath: dbPath + s) }
    }

    static func newSalt() -> Data { Data((0..<16).map { _ in UInt8.random(in: 0...255) }) }

    /// JSON.stringify(ARGON2_OPTS) in crypto.mjs.
    static let kdfParamsJSON = #"{"memoryCost":65536,"timeCost":3,"parallelism":4,"outputLen":32}"#

    static func setAppMeta(_ db: Database, _ key: String, _ value: String) throws {
        try db.execute(
            sql: "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            arguments: [key, value])
    }

    static func constantTimeEqual(_ a: String, _ b: String?) -> Bool {
        guard let b else { return false }
        let x = Array(a.utf8), y = Array(b.utf8)
        guard x.count == y.count else { return false }
        return zip(x, y).reduce(0) { $0 | ($1.0 ^ $1.1) } == 0
    }
}
