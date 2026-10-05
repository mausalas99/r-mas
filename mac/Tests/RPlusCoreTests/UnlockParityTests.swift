import Foundation
import GRDB
import Testing
@testable import RPlusCore

/// Fixture from Fixtures/make-unlock-fixtures.mjs: Node's crypto.mjs wraps a key; Swift must unwrap it.
struct UnlockFixture: Decodable, Sendable {
    var passphrase, kdfSaltB64, keyHex, recoverySaltB64, recoveryCode, recoveryCodeMessyInput: String
    var wrappingKeyHex: String
    var wrapped: Recovery.Wrapped
    var legacyCode, legacyWrappingKeyHex: String
    var legacyWrapped: Recovery.Wrapped
    var sampleGeneratedCode: String
}

let fx: UnlockFixture = {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("Fixtures/unlock-fixtures.json")
    return try! JSONDecoder().decode(UnlockFixture.self, from: Data(contentsOf: url))
}()

private var recoverySalt: Data { Data(base64Encoded: fx.recoverySaltB64)! }

@Test func unwrapsNodeBlobWithRecoveryCode() throws {
    let wk = try Recovery.wrappingKeyHex(salt: recoverySalt, code: fx.recoveryCode)
    #expect(wk == fx.wrappingKeyHex)
    #expect(Recovery.unwrap(fx.wrapped, wrappingKeyHex: wk) == fx.keyHex)
}

@Test func messyRecoveryInputNormalizes() throws {
    #expect(Recovery.normalize(fx.recoveryCodeMessyInput) == fx.recoveryCode)
    let wk = try Recovery.wrappingKeyHex(salt: recoverySalt, code: fx.recoveryCodeMessyInput)
    #expect(Recovery.unwrap(fx.wrapped, wrappingKeyHex: wk) == fx.keyHex)
}

@Test func wrongRecoveryCodeFailsTag() throws {
    let wk = try Recovery.wrappingKeyHex(salt: recoverySalt, code: "R+WRONG2345")
    #expect(Recovery.unwrap(fx.wrapped, wrappingKeyHex: wk) == nil)
}

@Test func legacyCodeUnwrapsLegacyBlob() throws {
    #expect(Recovery.legacyCode == fx.legacyCode)
    let wk = try Recovery.wrappingKeyHex(salt: recoverySalt, code: Recovery.legacyCode)
    #expect(wk == fx.legacyWrappingKeyHex)
    #expect(Recovery.unwrap(fx.legacyWrapped, wrappingKeyHex: wk) == fx.keyHex)
    // The legacy code does not open a v2 blob.
    #expect(Recovery.unwrap(fx.wrapped, wrappingKeyHex: wk) == nil)
}

@Test func swiftWrapMatchesNodeByteForByte() throws {
    // GCM is deterministic for a fixed key and IV, so Swift's blob must equal Node's.
    let iv = Data(base64Encoded: fx.wrapped.iv)!
    let got = try Recovery.wrap(keyHex: fx.keyHex, wrappingKeyHex: fx.wrappingKeyHex, iv: iv)
    #expect(got == fx.wrapped)
}

@Test func tamperedBlobFails() {
    var bad = fx.wrapped
    bad.tag = Data(repeating: 0, count: 16).base64EncodedString()
    #expect(Recovery.unwrap(bad, wrappingKeyHex: fx.wrappingKeyHex) == nil)
    bad = fx.wrapped
    bad.iv = "!!"
    #expect(Recovery.unwrap(bad, wrappingKeyHex: fx.wrappingKeyHex) == nil)
}

@Test func generatedCodeShape() {
    let rule = #/^R\+[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/#
    #expect(fx.sampleGeneratedCode.wholeMatch(of: rule) != nil)
    for _ in 0..<50 { #expect(Recovery.generate().wholeMatch(of: rule) != nil) }
    #expect(Recovery.generate() != Recovery.generate())
}
