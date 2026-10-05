import Foundation
import GRDB
import Testing
@testable import RPlusCore

private func tempDir() -> URL {
    let d = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("rplus-unlock-\(UUID().uuidString)")
    try! FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
    return d
}

private func blobJSON(_ w: Recovery.Wrapped) -> String {
    String(decoding: try! JSONEncoder().encode(w), as: UTF8.self)
}

/// A user-data folder as Electron leaves it: encrypted DB at the fixture key, plus the meta file.
/// `legacy` = a pre-v2 file wrapped with the legacy code (no recovery_version).
private func makeElectronFolder(legacy: Bool = false) throws -> URL {
    let dir = tempDir()
    let queue = try ClinicalDatabase.open(path: UnlockMeta.dbURL(userData: dir).path, keyHex: fx.keyHex)
    try Schema.apply(to: queue)
    var meta: [String: Any] = [
        "kdf_salt": fx.kdfSaltB64,
        "recovery_salt": fx.recoverySaltB64,
        "recovery_wrapped_key": blobJSON(legacy ? fx.legacyWrapped : fx.wrapped),
        "wrapped_dek": "electron-only-blob",
        "some_future_key": 7,
    ]
    if !legacy { meta["recovery_version"] = 2 }
    try JSONSerialization.data(withJSONObject: meta).write(to: UnlockMeta.metaURL(userData: dir))
    return dir
}

@Test func unlocksNodeMadeFolderWithPassphrase() throws {
    let dir = try makeElectronFolder()
    let u = ClinicalUnlock(userData: dir)
    let code = try u.unlock(passphrase: fx.passphrase)
    #expect(code == nil)  // v2 recovery already exists
    #expect(u.isUnlocked)
    #expect(u.activeKeyHex == fx.keyHex)
    // Unknown keys and the Electron blob survive.
    let meta = UnlockMeta.read(userData: dir)
    #expect(meta.raw["some_future_key"] as? Int == 7)
    #expect(meta.raw["wrapped_dek"] as? String == "electron-only-blob")
}

@Test func wrongPassphraseFails() throws {
    let u = ClinicalUnlock(userData: try makeElectronFolder())
    #expect(throws: UnlockError.invalidPassphrase) { try u.unlock(passphrase: "wrong horse") }
    #expect(!u.isUnlocked)
    #expect(throws: UnlockError.passphraseRequired) { try u.unlock(passphrase: "") }
}

@Test func lockoutAfterFiveFails() throws {
    let u = ClinicalUnlock(userData: try makeElectronFolder())
    for _ in 0..<5 { _ = try? u.unlock(passphrase: "nope") }
    #expect(throws: UnlockError.rateLimited) { try u.unlock(passphrase: fx.passphrase) }
}

@Test func missingSaltWithExistingDbFails() throws {
    let dir = try makeElectronFolder()
    UnlockMeta.remove(userData: dir)
    #expect(throws: UnlockError.metadataMissing) { try ClinicalUnlock(userData: dir).unlock(passphrase: "x") }
}

@Test func unlocksWithRecoveryCode() throws {
    let u = ClinicalUnlock(userData: try makeElectronFolder())
    let code = try u.unlock(recoveryCode: fx.recoveryCodeMessyInput)
    #expect(code == nil)
    #expect(u.activeKeyHex == fx.keyHex)
}

@Test func wrongRecoveryCodeFails() throws {
    let u = ClinicalUnlock(userData: try makeElectronFolder())
    #expect(throws: UnlockError.invalidRecoveryCode) { try u.unlock(recoveryCode: "R+WRONG2345") }
    // v2 files do not accept the legacy code.
    #expect(throws: UnlockError.invalidRecoveryCode) { try u.unlock(recoveryCode: Recovery.legacyCode) }
    #expect(throws: UnlockError.invalidRecoveryCode) { try u.unlock(recoveryCode: "  ") }
    #expect(!u.isUnlocked)
}

@Test func recoveryNotConfigured() throws {
    let dir = try makeElectronFolder()
    var meta = UnlockMeta.read(userData: dir)
    meta.raw["recovery_wrapped_key"] = nil
    try meta.write(userData: dir)
    #expect(throws: UnlockError.recoveryNotConfigured) { try ClinicalUnlock(userData: dir).unlock(recoveryCode: "R+ABCD2345") }
}

@Test func legacyCodeUnlocksAndRotates() throws {
    let dir = try makeElectronFolder(legacy: true)
    let u = ClinicalUnlock(userData: dir)
    let fresh = try u.unlock(recoveryCode: Recovery.legacyCode)
    let newCode = try #require(fresh)
    #expect(UnlockMeta.read(userData: dir).recoveryVersion == 2)
    // Old legacy code is dead now; the new code works.
    u.lock()
    #expect(throws: UnlockError.invalidRecoveryCode) { try u.unlock(recoveryCode: Recovery.legacyCode) }
    #expect(try u.unlock(recoveryCode: newCode) == nil)
    #expect(u.activeKeyHex == fx.keyHex)
}

@Test func setupMakesFolderThatNodeLayoutReads() throws {
    let dir = tempDir()
    let u = ClinicalUnlock(userData: dir)
    let code = try #require(try u.unlock(passphrase: "synthetic pass 1", setup: true))
    #expect(code.hasPrefix("R+") && code.count == 10)
    let meta = UnlockMeta.read(userData: dir)
    #expect(meta.recoveryVersion == 2)
    let salt = try #require(meta.kdfSalt)
    #expect(Data(base64Encoded: salt)?.count == 16)
    // app_meta mirrors the meta file.
    let stored = try u.database!.read { try String.fetchOne($0, sql: "SELECT value FROM app_meta WHERE key = 'kdf_salt'") }
    #expect(stored == salt)
    // A second unlock shows no new code.
    u.lock()
    #expect(try u.unlock(passphrase: "synthetic pass 1") == nil)
}

@Test func changePassphraseRekeysAndRotatesRecovery() throws {
    let dir = try makeElectronFolder()
    let u = ClinicalUnlock(userData: dir)
    try u.unlock(passphrase: fx.passphrase)
    try u.database!.write { try $0.execute(sql: "CREATE TABLE marker(x)") }

    #expect(throws: UnlockError.passphraseMismatch) { try u.changePassphrase(current: "bad", new: "brand new pass") }
    #expect(throws: UnlockError.passphraseTooShort) { try u.changePassphrase(current: fx.passphrase, new: "short") }

    let newCode = try #require(try u.changePassphrase(current: fx.passphrase, new: "brand new pass"))
    #expect(u.activeKeyHex != fx.keyHex)
    #expect(UnlockMeta.read(userData: dir).raw["wrapped_dek"] == nil)

    u.lock()
    #expect(throws: UnlockError.invalidPassphrase) { try u.unlock(passphrase: fx.passphrase) }
    try u.unlock(passphrase: "brand new pass")
    let n = try u.database!.read { try Int.fetchOne($0, sql: "SELECT count(*) FROM marker") }
    #expect(n == 0)  // data survived the rekey

    // The new recovery code opens the re-keyed file. The old code is dead.
    u.lock()
    #expect(throws: UnlockError.invalidRecoveryCode) { try u.unlock(recoveryCode: "R+ABCD2345") }
    try u.unlock(recoveryCode: newCode)
    #expect(u.isUnlocked)
}

@Test func changePassphraseNeedsUnlock() {
    #expect(throws: UnlockError.locked) {
        try ClinicalUnlock(userData: tempDir()).changePassphrase(current: "a", new: "bbbbbbbb")
    }
}
