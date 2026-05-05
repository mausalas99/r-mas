import Foundation

struct SharedRoot: Codable {
    var format: String
    var version: Int
    var exportedAt: String
    var appVersion: String?
    var theme: String
    var guidedTourDoneForVersion: String?
    var data: SharedDataPayload
}

struct SharedDataPayload: Codable {
    var patients: [SharedPatient]
    var notes: [String: JSONValue]
    var indicaciones: [String: JSONValue]
    var labHistory: [String: [SharedLabEntry]]
    var medRecetaByPatient: [String: JSONValue]
    var settings: [String: JSONValue]
    var medCatalog: JSONValue
}

struct SharedPatient: Codable {
    var id: String
    var name: String
}

struct SharedLabEntry: Codable {
    var date: String
    var rawText: String
}
