import Foundation

struct SharedRoot: Codable {
    var patients: [SharedPatient]
    var notes: [String: String]
    var indicaciones: [String: String]
    var labHistory: [String: [SharedLabEntry]]
    var settings: [String: String]
}

struct SharedPatient: Codable {
    var id: String
    var name: String
}

struct SharedLabEntry: Codable {
    var date: String
    var rawText: String
}
