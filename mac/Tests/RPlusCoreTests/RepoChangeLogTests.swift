import Foundation
import GRDB
import Testing
@testable import RPlusCore

private struct Input: Decodable {
    var commandType: String?
    var blobKeys: [String]
    var patientId: String?
    var actorId: String?
    var origin: String?
    var registro: String?
}
private struct NodeEntry: Decodable, Equatable {
    var change_id: String; var command_type: String; var blob_keys: String
    var patient_id: String?; var actor_id: String?; var origin: String; var created_at: String
    var synced_at: String?
    var entry: ChangeLogEntry {
        ChangeLogEntry(changeId: change_id, commandType: command_type, blobKeys: blob_keys, patientId: patient_id,
                       actorId: actor_id, origin: origin, createdAt: created_at)
    }
}
private struct ParseCase: Decodable {
    struct Expect: Decodable { var blobKeys: [String]; var registro: String }
    var rawText: String; var expect: Expect
}
private struct RegistroCase: Decodable { var registro: String; var expect: String }
private struct ListCases: Decodable {
    var `default`: [NodeEntry]; var zero: [NodeEntry]; var negative: [NodeEntry]; var two: [NodeEntry]; var huge: [NodeEntry]
    var noArg: [NodeEntry]; var byIds: [NodeEntry]; var byIdsWithLimit: [NodeEntry]; var emptyIds: [NodeEntry]
}
private struct LogExpected: Decodable {
    var inputs: [Input]
    var masked: [NodeEntry]
    var stamped: Int
    var again: Int
    var rawIds: [String]
    var list: ListCases
    var parse: [ParseCase]
    var registroKeys: [RegistroCase]
}

@Suite struct RepoChangeLogTests {
    fileprivate let want: LogExpected
    init() throws { want = try repoFixture("changelog-expected.json") }

    private func mask(_ e: ChangeLogEntry) -> ChangeLogEntry {
        var m = e
        m.changeId = e.changeId.range(of: #"^chg_[0-9a-f]{32}$"#, options: .regularExpression) != nil ? "<id>" : e.changeId
        m.createdAt = e.createdAt.range(of: #"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$"#, options: .regularExpression) != nil ? "<ts>" : e.createdAt
        return m
    }

    @Test func swiftRowsMatchNodeRows() throws {
        let queue = try freshQueue()
        try queue.write { db in
            for i in want.inputs {
                try ClinicalChangeLog.append(db, commandType: i.commandType ?? "", blobKeys: i.blobKeys, patientId: i.patientId,
                                             actorId: i.actorId, origin: i.origin, registro: i.registro)
            }
        }
        let got = try queue.read { try ClinicalChangeLog.listUnsynced($0).map(mask) }
        #expect(got == want.masked.map { mask($0.entry) })
    }

    @Test func listsNodeMadeLog() throws {
        let queue = try copyOfFixtureDB("changelog.db")
        func list(_ limit: Int = 100, _ ids: [String] = []) throws -> [ChangeLogEntry] {
            try queue.read { try ClinicalChangeLog.listUnsynced($0, limit: limit, changeIds: ids) }
        }
        let l = want.list, ids = want.rawIds
        #expect(try list() == l.default.map(\.entry))
        #expect(try list(0) == l.zero.map(\.entry))
        #expect(try list(-5) == l.negative.map(\.entry))
        #expect(try list(2) == l.two.map(\.entry))
        #expect(try list(9999) == l.huge.map(\.entry))
        #expect(try list(100, [ids[3], ids[0], " ", ids[1]]) == l.byIds.map(\.entry))
        #expect(try list(1, [ids[5]]) == l.byIdsWithLimit.map(\.entry))
        #expect(try list(2, []) == l.emptyIds.map(\.entry))
        #expect(l.default.count == want.inputs.count - 1, "one row was synced")
    }

    @Test func markSyncedMatchesNode() throws {
        let queue = try copyOfFixtureDB("changelog.db")
        // ids[1] is already synced in the Node file: stamping it again changes nothing.
        let again = try queue.write { try ClinicalChangeLog.markSynced($0, changeIds: [want.rawIds[1]], syncedAt: "2026-10-04T00:00:00.000Z") }
        #expect(again == want.again)
        let n = try queue.write { try ClinicalChangeLog.markSynced($0, changeIds: [want.rawIds[0], " ", "nope", want.rawIds[0]], syncedAt: "2026-10-05T00:00:00.000Z") }
        #expect(n == 1)
        let left = try queue.read { try ClinicalChangeLog.listUnsynced($0).map(\.changeId) }
        #expect(left == [want.rawIds[2], want.rawIds[3], want.rawIds[4], want.rawIds[5]])
        let stamp = try queue.read { try String.fetchOne($0, sql: "SELECT synced_at FROM clinical_change_log WHERE change_id = ?", arguments: [want.rawIds[1]]) }
        #expect(stamp == "2026-10-03T00:00:00.000Z", "first stamp is kept")
    }

    @Test func parseBlobKeysMatchesNode() {
        for c in want.parse {
            let got = ClinicalChangeLog.parseBlobKeysAndRegistro(json(c.rawText))
            #expect(got.blobKeys == c.expect.blobKeys && got.registro == c.expect.registro, "raw \(c.rawText)")
        }
        for c in want.registroKeys { #expect(ClinicalChangeLog.registroBlobKey(c.registro) == c.expect) }
    }

    @Test func changeIdLooksLikeNodes() throws {
        let queue = try freshQueue()
        let id = try queue.write { try ClinicalChangeLog.append($0, commandType: "t", blobKeys: []) }
        #expect(id.range(of: #"^chg_[0-9a-f]{32}$"#, options: .regularExpression) != nil)
    }
}
