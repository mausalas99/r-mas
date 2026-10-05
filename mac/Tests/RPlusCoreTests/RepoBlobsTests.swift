import Foundation
import GRDB
import Testing
@testable import RPlusCore

private struct CanonicalCase: Decodable { var input: String; var stringify: String; var canonical: String }
private struct BlobsExpected: Decodable {
    var loadAll: [String: String]
    var updatedAt: [String: String]
    var loaded: [String: String]
}

@Suite struct RepoBlobsTests {
    // MARK: Parity with Node

    @Test func canonicalAndStringifyMatchNode() throws {
        for c in try repoFixture("canonical.json", as: [CanonicalCase].self) {
            let v = try JSON.parse(c.input)
            #expect(v.canonical() == c.canonical, "canonical differs for \(c.input)")
            #expect(v.stringify() == c.stringify, "stringify differs for \(c.input)")
        }
    }

    @Test func parserRejectsWhatNodeRejects() throws {
        for text in try repoFixture("canonical-invalid.json", as: [String].self) {
            #expect(throws: JSON.ParseError.self, "accepted: \(text)") { try JSON.parse(text) }
        }
    }

    @Test func readsNodeMadeBlobs() throws {
        let want = try repoFixture("blobs-expected.json", as: BlobsExpected.self)
        let queue = try copyOfFixtureDB("blobs.db")
        try queue.read { db in
            #expect(try ClinicalBlobs.loadAll(db) == want.loadAll)
            for (key, canonical) in want.loaded {
                #expect(try ClinicalBlobs.loadValue(db, key: key).canonical() == canonical, "loadValue \(key)")
            }
            let stamps = try Row.fetchAll(db, sql: "SELECT blob_key, updated_at FROM clinical_blob")
            #expect(Dictionary(uniqueKeysWithValues: stamps.map { ($0["blob_key"] as String, $0["updated_at"] as String) }) == want.updatedAt)
        }
    }

    @Test func swiftWritesSameTextAsNode() throws {
        let want = try repoFixture("blobs-expected.json", as: BlobsExpected.self)
        let queue = try freshQueue()
        try queue.write { db in
            for key in ["patients", "notes", "indicaciones"] {
                // Round trip: Node text -> Swift value -> Swift text must be unchanged, including key order.
                let value = try JSON.parse(want.loadAll[key]!)
                try ClinicalBlobs.saveValue(db, key: key, value: value, updatedAt: "2026-10-01T10:00:00.000Z")
                #expect(try ClinicalBlobs.get(db, key: key) == want.loadAll[key])
            }
        }
    }

    // MARK: Write guards

    @Test func absentKeyKeepsStoredBlob() throws {
        // The note-wipe bug: a partial payload must not clear fields it does not carry.
        let queue = try freshQueue()
        try queue.write { db in
            try ClinicalBlobs.saveValues(db, snapshot: ["notes": json(#"{"p1":{"estado":"estable"}}"#), "patients": json(#"[{"id":"p1"}]"#)])
            try ClinicalBlobs.saveValues(db, snapshot: ["patients": json(#"[{"id":"p1"},{"id":"p2"}]"#)])
            #expect(try ClinicalBlobs.get(db, key: "notes") == #"{"p1":{"estado":"estable"}}"#)
            #expect(try ClinicalBlobs.get(db, key: "patients") == #"[{"id":"p1"},{"id":"p2"}]"#)
        }
    }

    @Test func explicitEmptyObjectDoesWrite() throws {
        // Present but empty is a real clear; only an absent key is skipped.
        let queue = try freshQueue()
        try queue.write { db in
            try ClinicalBlobs.saveValues(db, snapshot: ["notes": json(#"{"p1":{"estado":"estable"}}"#)])
            try ClinicalBlobs.saveValues(db, snapshot: ["notes": json("{}")])
            #expect(try ClinicalBlobs.get(db, key: "notes") == "{}")
        }
    }

    @Test func saveValuesIgnoresKeysOutsidePersistList() throws {
        let queue = try freshQueue()
        try queue.write { db in
            try ClinicalBlobs.saveValues(db, snapshot: ["medCatalog": json("{}"), "todos": json("{}"), "__reg:1": json("{}")])
            #expect(try ClinicalBlobs.loadAll(db).isEmpty)
        }
    }

    @Test func blankKeyWritesAndDeletesNothing() throws {
        let queue = try freshQueue()
        try queue.write { db in
            try ClinicalBlobs.saveValue(db, key: "  ", value: json("{}"))
            #expect(try ClinicalBlobs.loadAll(db).isEmpty)
            try ClinicalBlobs.upsert(db, key: "a", json: "{}")
            #expect(try ClinicalBlobs.delete(db, keys: ["", "  ", "nope"]) == 0)
            #expect(try ClinicalBlobs.loadAll(db).count == 1)
            #expect(try ClinicalBlobs.delete(db, keys: [" a "]) == 1)
        }
    }

    @Test func pickRejectsWrongShapes() {
        #expect(ClinicalBlobs.pickPersistSnapshot(json(#"{"patients":null}"#)) == .failed("invalid_patients"))
        #expect(ClinicalBlobs.pickPersistSnapshot(json(#"{"patients":{}}"#)) == .failed("invalid_patients"))
        #expect(ClinicalBlobs.pickPersistSnapshot(json(#"{"notes":[]}"#)) == .failed("invalid_notes"))
        #expect(ClinicalBlobs.pickPersistSnapshot(json(#"{"indicaciones":null}"#)) == .failed("invalid_indicaciones"))
        #expect(ClinicalBlobs.pickPersistSnapshot(json(#"{"vpoByPatient":"x"}"#)) == .failed("invalid_vpoByPatient"))
    }

    @Test func pickRejectsEmptyAndUnknown() {
        #expect(ClinicalBlobs.pickPersistSnapshot(json("{}")) == .failed("empty_snapshot"))
        #expect(ClinicalBlobs.pickPersistSnapshot(json("[]")) == .failed("empty_snapshot"))
        #expect(ClinicalBlobs.pickPersistSnapshot(json(#"{"medCatalog":{}}"#)) == .failed("empty_snapshot"))
    }

    @Test func pickKeepsOnlyPresentKeysInFixedOrder() {
        let p = ClinicalBlobs.pickPersistSnapshot(json(#"{"notes":{},"patients":[],"todos":{}}"#))
        #expect(p == .ok(changedKeys: ["patients", "notes"], snapshot: ["patients": .array([]), "notes": .object([])]))
    }

    @Test func badStoredTextFallsBackWithoutThrowing() throws {
        let queue = try freshQueue()
        try queue.write { db in
            try ClinicalBlobs.upsert(db, key: "notes", json: "not json")
            try ClinicalBlobs.upsert(db, key: "patients", json: #"{"a":1}"#)
            try ClinicalBlobs.upsert(db, key: "indicaciones", json: "[1]")
            #expect(try ClinicalBlobs.loadValue(db, key: "notes") == .object([]))
            #expect(try ClinicalBlobs.loadValue(db, key: "patients") == .array([]))
            #expect(try ClinicalBlobs.loadValue(db, key: "indicaciones") == .object([]))
            #expect(try ClinicalBlobs.loadValue(db, key: "labHistory") == .object([]))
        }
    }
}
