import Foundation
import GRDB
import Testing
@testable import RPlusCore

private struct CmdMeta: Decodable { var actorId: String?; var source: String? }
private struct Step: Decodable {
    var cmdText: String
    var meta: CmdMeta?
    var ok: Bool
    var error: String?
    var changedKeys: [String]?
    var hasChangeId: Bool
    var patients: String?
    var notes: String?
    var indicaciones: String?
    var logCount: Int
}
private struct LogRow: Decodable {
    var command_type: String; var blob_keys: String; var patient_id: String?; var actor_id: String?
    var origin: String; var synced_at: String?
}
private struct CommandsExpected: Decodable {
    var results: [Step]
    var log: [LogRow]
    var patientsLoaded: String
    var censusIds: [String]
}
private struct CensusCase: Decodable { var raw: String; var ids: [String] }
private struct Assignments: Decodable {
    struct Active: Decodable { var patientId: String; var now: String; var team: String? }
    var patientIds: [String]
    var active: [Active]
}

@Suite struct RepoPatientsTests {
    fileprivate let want: CommandsExpected
    init() throws { want = try repoFixture("commands-expected.json") }

    private func blob(_ q: DatabaseQueue, _ key: String) throws -> String? { try q.read { try ClinicalBlobs.get($0, key: key) } }
    private func logCount(_ q: DatabaseQueue) throws -> Int {
        try q.read { try Int.fetchOne($0, sql: "SELECT count(*) FROM clinical_change_log") ?? -1 }
    }

    // MARK: Parity with Node

    @Test func commandSequenceMatchesNodeStepByStep() throws {
        let q = try freshQueue()
        for (i, step) in want.results.enumerated() {
            let meta = CommandMeta(actorId: step.meta?.actorId, source: step.meta?.source)
            let result = try ClinicalRepo.execute(q, json(step.cmdText), meta: meta)
            switch result {
            case .ok(let keys, let id):
                #expect(step.ok, "step \(i) \(step.cmdText): Swift ok, Node failed \(step.error ?? "")")
                #expect(keys == step.changedKeys, "step \(i) changedKeys")
                #expect(id.hasPrefix("chg_") && step.hasChangeId)
            case .failed(let e):
                #expect(!step.ok && e == step.error, "step \(i) \(step.cmdText): Swift \(e), Node \(step.error ?? "ok")")
            }
            #expect(try blob(q, "patients") == step.patients, "step \(i) patients text")
            #expect(try blob(q, "notes") == step.notes, "step \(i) notes text")
            #expect(try blob(q, "indicaciones") == step.indicaciones, "step \(i) indicaciones text")
            #expect(try logCount(q) == step.logCount, "step \(i) log count")
        }
        let rows = try q.read { try Row.fetchAll($0, sql: "SELECT * FROM clinical_change_log ORDER BY id") }
        #expect(rows.count == want.log.count)
        for (row, w) in zip(rows, want.log) {
            #expect(row["command_type"] as String == w.command_type)
            #expect(row["blob_keys"] as String == w.blob_keys)
            #expect(row["patient_id"] as String? == w.patient_id)
            #expect(row["actor_id"] as String? == w.actor_id)
            #expect(row["origin"] as String == w.origin)
            #expect(row["synced_at"] as String? == w.synced_at)
        }
        let loaded = try q.read { JSON.array(try ClinicalPatients.load($0)).canonical() }
        #expect(loaded == want.patientsLoaded)
        #expect(try q.read { try ClinicalPatients.censusIds($0) } == Set(want.censusIds))
    }

    @Test func censusIdsMatchNode() throws {
        for c in try repoFixture("census-expected.json", as: [CensusCase].self) {
            let q = try freshQueue()
            let ids = try q.write { db -> Set<String> in
                try ClinicalBlobs.upsert(db, key: "patients", json: c.raw)
                return try ClinicalPatients.censusIds(db)
            }
            #expect(ids == Set(c.ids), "raw \(c.raw)")
        }
    }

    @Test func activeTeamMatchesNode() throws {
        let want = try repoFixture("assignments-expected.json", as: Assignments.self)
        let q = try copyOfFixtureDB("assignments.db")
        try q.read { db in
            let ids = try String.fetchAll(db, sql: "SELECT id FROM patients ORDER BY id")
            #expect(ids == want.patientIds)
            for a in want.active {
                let team = try ClinicalPatients.activeTeamId(db, patientId: a.patientId, nowIso: a.now)
                #expect(team == a.team, "\(a.patientId) @ \(a.now)")
            }
        }
    }

    @Test func ensureRowMatchesNode() throws {
        let q = try freshQueue()
        try q.write { db in
            try ClinicalPatients.ensureRow(db, patientId: " p1 ")
            try ClinicalPatients.ensureRow(db, patientId: "p1")
            try ClinicalPatients.ensureRow(db, patientId: "  ")
        }
        #expect(try q.read { try String.fetchAll($0, sql: "SELECT id FROM patients") } == ["p1"])
    }

    // MARK: Write guards

    @Test func upsertWithoutIdWritesNothing() throws {
        let q = try freshQueue()
        for cmd in [#"{"type":"patient.upsert","patient":{"nombre":"x"}}"#, #"{"type":"patient.upsert","patient":{"id":null}}"#,
                    #"{"type":"patient.upsert","patient":{"id":"  "}}"#, #"{"type":"patient.upsert","patient":[]}"#,
                    #"{"type":"patient.upsert","patient":null}"#, #"{"type":"patient.upsert"}"#] {
            #expect(try ClinicalRepo.execute(q, json(cmd)) == .failed("invalid_patient"), "\(cmd)")
        }
        #expect(try blob(q, "patients") == nil)
        #expect(try logCount(q) == 0)
    }

    @Test func deleteWithoutIdWritesNothing() throws {
        let q = try freshQueue()
        _ = try ClinicalRepo.execute(q, json(#"{"type":"patient.upsert","patient":{"id":"p1"}}"#))
        for cmd in [#"{"type":"patient.delete"}"#, #"{"type":"patient.delete","patientId":""}"#, #"{"type":"patient.delete","patientId":"  ","registro":"9"}"#] {
            #expect(try ClinicalRepo.execute(q, json(cmd)) == .failed("invalid_patient_id"), "\(cmd)")
        }
        #expect(try blob(q, "patients") == #"[{"id":"p1"}]"#)
        #expect(try logCount(q) == 1)
    }

    @Test func patientCommandNeverTouchesNotesOrIndicaciones() throws {
        // The note-wipe bug class: a patients-only write must leave every chart blob as it was.
        let q = try freshQueue()
        _ = try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot","patients":[{"id":"p1"}],"notes":{"p1":{"estado":"estable"}},"indicaciones":{"p1":{"texto":"dieta"}},"medRecetaByPatient":{"p1":[1]}}"#))
        let before = try q.read { try ClinicalBlobs.loadAll($0) }
        _ = try ClinicalRepo.execute(q, json(#"{"type":"patient.upsert","patient":{"id":"p2"}}"#))
        _ = try ClinicalRepo.execute(q, json(#"{"type":"patient.upsert","patient":{"id":"p1","cama":"3"}}"#))
        _ = try ClinicalRepo.execute(q, json(#"{"type":"patient.delete","patientId":"p2"}"#))
        _ = try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot","patients":[{"id":"p1"},{"id":"p3"}]}"#))
        let after = try q.read { try ClinicalBlobs.loadAll($0) }
        for key in ["notes", "indicaciones", "medRecetaByPatient"] { #expect(after[key] == before[key], "\(key) changed") }
    }

    @Test func partialSnapshotKeepsOtherBlobsAndLogsOnlyChangedKeys() throws {
        let q = try freshQueue()
        _ = try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot","notes":{"p1":{"estado":"estable"}},"indicaciones":{"p1":{}}}"#))
        let r = try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot","indicaciones":{"p1":{"texto":"nueva"}}}"#))
        guard case .ok(let keys, _) = r else { Issue.record("not ok: \(r)"); return }
        #expect(keys == ["indicaciones"])
        #expect(try blob(q, "notes") == #"{"p1":{"estado":"estable"}}"#)
        let last = try q.read { try String.fetchOne($0, sql: "SELECT blob_keys FROM clinical_change_log ORDER BY id DESC LIMIT 1") }
        #expect(last == #"["indicaciones"]"#)
    }

    @Test func invalidSnapshotWritesNothingAtAll() throws {
        // One bad key rejects the whole command: the valid keys next to it are not written either.
        let q = try freshQueue()
        #expect(try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot","patients":[{"id":"p1"}],"notes":[]}"#)) == .failed("invalid_notes"))
        #expect(try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot","patients":null}"#)) == .failed("invalid_patients"))
        #expect(try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot"}"#)) == .failed("empty_snapshot"))
        #expect(try q.read { try ClinicalBlobs.loadAll($0) }.isEmpty)
        #expect(try logCount(q) == 0)
    }

    @Test func blobAndLogAreOneTransaction() throws {
        // If the change-log insert fails, the blob write must roll back with it.
        let q = try freshQueue()
        try q.write { try $0.execute(sql: "DROP TABLE clinical_change_log") }
        #expect(throws: (any Error).self) {
            try ClinicalRepo.execute(q, json(#"{"type":"clinical.persistSnapshot","notes":{"p1":{}}}"#))
        }
        #expect(try blob(q, "notes") == nil)
        #expect(throws: (any Error).self) {
            try ClinicalRepo.execute(q, json(#"{"type":"patient.upsert","patient":{"id":"p1"}}"#))
        }
        #expect(try blob(q, "patients") == nil)
    }

    @Test func unknownAndUnportedCommandsWriteNothing() throws {
        let q = try freshQueue()
        #expect(try ClinicalRepo.execute(q, json(#"{"type":"nope"}"#)) == .failed("unknown_command"))
        #expect(try ClinicalRepo.execute(q, json("{}")) == .failed("unknown_command"))
        #expect(try ClinicalRepo.execute(q, json(#"{"type":"eventualidad.upsert"}"#)) == .failed("not_ported"))
        #expect(try logCount(q) == 0)
    }
}
