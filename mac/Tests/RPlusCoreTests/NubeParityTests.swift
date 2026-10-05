import CommonCrypto
import CryptoKit
import Foundation
import Testing

/// Fixture from Fixtures/make-nube-fixtures.mjs: desktop cloud-sync crypto wraps a room key
/// and seals values. Swift must derive the same wrap key, unwrap the same key and open the same values.
/// The helpers below are the reference; the Mac Nube port (T9) and the iOS app must give the same bytes.
private struct NubeFixture: Decodable {
    struct Env: Decodable { var iv, ct: String }
    struct Value: Decodable { var plain: AnyJSON; var envelope: Env }
    var password, saltB64, wrapKeyHex, dekB64: String
    var wrapped: Env
    var values: [String: Value]
}

private struct AnyJSON: Decodable {
    var value: Any
    init(from d: Decoder) throws {
        let c = try d.singleValueContainer()
        if c.decodeNil() { value = NSNull() }
        else if let b = try? c.decode(Bool.self) { value = b }
        else if let i = try? c.decode(Int.self) { value = i }
        else if let s = try? c.decode(String.self) { value = s }
        else if let a = try? c.decode([AnyJSON].self) { value = a.map(\.value) }
        else { value = try c.decode([String: AnyJSON].self).mapValues(\.value) }
    }
}

nonisolated(unsafe) private let nfx: NubeFixture = {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("Fixtures/nube-fixtures.json")
    return try! JSONDecoder().decode(NubeFixture.self, from: Data(contentsOf: url))
}()

private func wrapKey() -> SymmetricKey {
    let pw = Array(nfx.password.utf8)
    let salt = [UInt8](Data(base64Encoded: nfx.saltB64)!)
    var out = [UInt8](repeating: 0, count: 32)
    let status = CCKeyDerivationPBKDF(
        CCPBKDFAlgorithm(kCCPBKDF2), pw.map { Int8(bitPattern: $0) }, pw.count, salt, salt.count,
        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), 210_000, &out, out.count)
    precondition(status == kCCSuccess)
    return SymmetricKey(data: out)
}

/// WebCrypto layout: ciphertext followed by the 16-byte tag.
private func open(_ e: NubeFixture.Env, key: SymmetricKey) throws -> Data {
    let ct = Data(base64Encoded: e.ct)!
    let box = try AES.GCM.SealedBox(
        nonce: AES.GCM.Nonce(data: Data(base64Encoded: e.iv)!), ciphertext: ct.dropLast(16), tag: ct.suffix(16))
    return try AES.GCM.open(box, using: key)
}

private func hex(_ k: SymmetricKey) -> String { k.withUnsafeBytes { $0.map { String(format: "%02x", $0) }.joined() } }

@Test func nubeWrapKeyMatchesNode() {
    #expect(hex(wrapKey()) == nfx.wrapKeyHex)
}

@Test func nubeUnwrapsRoomKey() throws {
    #expect(try open(nfx.wrapped, key: wrapKey()) == Data(base64Encoded: nfx.dekB64)!)
}

@Test func nubeWrongPasswordFails() {
    let wrong = SymmetricKey(data: Data(repeating: 1, count: 32))
    #expect(throws: (any Error).self) { try open(nfx.wrapped, key: wrong) }
}

@Test func nubeOpensEveryNodeValue() throws {
    let dek = SymmetricKey(data: Data(base64Encoded: nfx.dekB64)!)
    #expect(!nfx.values.isEmpty)
    for (name, v) in nfx.values {
        let got = try JSONSerialization.jsonObject(with: open(v.envelope, key: dek), options: .fragmentsAllowed)
        #expect(NSDictionary(dictionary: ["v": got]) == NSDictionary(dictionary: ["v": v.plain.value]), "\(name)")
    }
}
