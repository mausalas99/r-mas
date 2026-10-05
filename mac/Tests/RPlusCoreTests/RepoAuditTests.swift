import Foundation
import GRDB
import Testing
@testable import RPlusCore

private struct NodeRow: Decodable {
    var id: Int64; var timestamp: String; var client_id: String; var event_type: String
    var payload_hash: String; var previous_hash: String; var current_hash: String
    var row: AuditRow {
        AuditRow(id: id, timestamp: timestamp, clientId: client_id, eventType: event_type,
                 payloadHash: payload_hash, previousHash: previous_hash, currentHash: current_hash)
    }
}
private struct Event: Decodable { var clientId: String; var eventType: String; var metaText: String?; var timestamp: String }
private struct VerifyCase: Decodable { var name: String; var rows: [NodeRow]; var expect: Int64? }
private struct AuditExpected: Decodable {
    var events: [Event]
    var payloadHashes: [String]
    var nodeRows: [NodeRow]
    var nodeVerify: Int64?
    var fixed: [NodeRow]
    var verifyCases: [VerifyCase]
}

private func date(_ iso: String) -> Date {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.date(from: iso)!
}

@Suite struct RepoAuditTests {
    fileprivate let want: AuditExpected
    init() throws { want = try repoFixture("audit-expected.json") }

    @Test func payloadHashesMatchNode() {
        for (e, hash) in zip(want.events, want.payloadHashes) {
            let meta = e.metaText.map { json($0) }
            #expect(ForensicAudit.hashPayload(meta) == hash, "meta \(e.metaText ?? "undefined")")
        }
    }

    @Test func blockHashesMatchNode() {
        for r in want.nodeRows { #expect(ForensicAudit.computeBlockHash(r.row) == r.current_hash, "row \(r.id)") }
    }

    @Test func verifyMatchesNode() {
        #expect(ForensicAudit.verify(want.nodeRows.map(\.row)) == want.nodeVerify)
        for c in want.verifyCases { #expect(ForensicAudit.verify(c.rows.map(\.row)) == c.expect, "\(c.name)") }
    }

    @Test func swiftAppendGivesNodeChain() throws {
        let queue = try freshQueue()
        try queue.write { db in
            for e in want.events {
                try ForensicAudit.append(db, clientId: e.clientId, eventType: e.eventType, meta: e.metaText.map { json($0) }, now: date(e.timestamp))
            }
        }
        let rows = try queue.read { try ForensicAudit.loadAll($0) }
        #expect(rows == want.fixed.map(\.row))
        #expect(ForensicAudit.verify(rows) == nil)
    }

    @Test func readsNodeMadeChainFromDisk() throws {
        let queue = try copyOfFixtureDB("audit.db")
        let rows = try queue.read { try ForensicAudit.loadAll($0) }
        #expect(rows == want.nodeRows.map(\.row))
        #expect(ForensicAudit.verify(rows) == nil)
    }

    @Test func swiftAppendContinuesNodeChain() throws {
        let queue = try copyOfFixtureDB("audit.db")
        try queue.write { try ForensicAudit.append($0, clientId: "mac", eventType: "LOGIN") }
        let rows = try queue.read { try ForensicAudit.loadAll($0) }
        #expect(rows.count == want.nodeRows.count + 1)
        #expect(rows.last?.previousHash == want.nodeRows.last?.current_hash)
        #expect(ForensicAudit.verify(rows) == nil)
    }

    @Test func editedRowIsFoundAfterAppend() throws {
        let queue = try freshQueue()
        try queue.write { db in
            for i in 0..<4 { try ForensicAudit.append(db, clientId: "c", eventType: "E", meta: .number(Double(i))) }
            try db.execute(sql: "UPDATE forensic_audit_chain SET event_type = 'X' WHERE id = 2")
        }
        #expect(try queue.read { ForensicAudit.verify(try ForensicAudit.loadAll($0)) } == 2)
    }

    @Test func firstBlockLinksToGenesis() throws {
        let queue = try freshQueue()
        try queue.write { try ForensicAudit.append($0, clientId: "c", eventType: "E") }
        let rows = try queue.read { try ForensicAudit.loadAll($0) }
        #expect(rows[0].previousHash == String(repeating: "0", count: 64))
    }
}
