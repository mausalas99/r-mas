import Foundation
import Testing
@testable import RPlusCore

private let salt = Data((0..<16).map { UInt8($0) })

/// Expected values come from @node-rs/argon2 `hashRaw` with the Electron app's options.
@Test func matchesNodeKey() throws {
    #expect(try Passphrase.keyHex(passphrase: "correct horse", salt: salt)
        == "577f1ff37e9a3e52c97d39f8e83891c1b73b0e87ffe0429cee8ede2fb005fe44")
    #expect(try Passphrase.keyHex(passphrase: "contraseña ñ ✓", salt: salt)
        == "eac10058da947b8476054212d3242141559a11ddccb849247790cad502cb87e3")
}

@Test func acceptsBase64Salt() throws {
    #expect(try Passphrase.keyHex(passphrase: "correct horse", saltBase64: salt.base64EncodedString())
        == "577f1ff37e9a3e52c97d39f8e83891c1b73b0e87ffe0429cee8ede2fb005fe44")
}

@Test func rejectsBadSalt() {
    #expect(throws: PassphraseError.badSalt) {
        _ = try Passphrase.keyHex(passphrase: "x", saltBase64: "!!not base64!!")
    }
    #expect(throws: PassphraseError.badSalt) {
        _ = try Passphrase.keyHex(passphrase: "x", saltBase64: Data([1, 2, 3]).base64EncodedString())
    }
}

/// Full unlock path: passphrase -> key -> open the Electron-made fixture's twin.
@Test func derivedKeyOpensDatabase() throws {
    let path = NSTemporaryDirectory() + "rplus-\(UUID().uuidString).db"
    defer { for s in ["", "-wal", "-shm"] { try? FileManager.default.removeItem(atPath: path + s) } }
    let key = try Passphrase.keyHex(passphrase: "correct horse", salt: salt)
    let db = try ClinicalDatabase.open(path: path, keyHex: key)
    try db.write { try $0.execute(sql: "CREATE TABLE t(x)") }
    let again = try ClinicalDatabase.open(path: path, keyHex: key)
    #expect(try again.read { try Int.fetchOne($0, sql: "SELECT count(*) FROM t") } == 0)
}
