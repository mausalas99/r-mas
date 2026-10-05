import Foundation
import GRDB
@testable import RPlusCore

/// Fixtures made by Fixtures/repo/make-repo-fixtures.mjs (Node is the source of truth).
let repoFixtures = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    .appendingPathComponent("Fixtures").appendingPathComponent("repo")

func repoFixture<T: Decodable>(_ name: String, as: T.Type = T.self) throws -> T {
    try JSONDecoder().decode(T.self, from: Data(contentsOf: repoFixtures.appendingPathComponent(name)))
}

/// Fresh in-memory DB with the full schema.
func freshQueue() throws -> DatabaseQueue {
    let queue = try DatabaseQueue()
    try Schema.apply(to: queue)
    return queue
}

/// Copy of a Node-made fixture DB, so tests never change the committed file.
func copyOfFixtureDB(_ name: String) throws -> DatabaseQueue {
    let path = NSTemporaryDirectory() + "rplus-repo-\(UUID().uuidString).db"
    try FileManager.default.copyItem(at: repoFixtures.appendingPathComponent(name), to: URL(fileURLWithPath: path))
    return try DatabaseQueue(path: path)
}

func json(_ text: String) -> JSON { try! JSON.parse(text) }
