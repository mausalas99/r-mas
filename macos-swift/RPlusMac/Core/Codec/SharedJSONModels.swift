import Foundation

struct SharedRoot: Codable {
    var patients: [SharedPatient]
}

struct SharedPatient: Codable {
    var id: String
    var name: String
    var labs: [SharedLabEntry]
}

struct SharedLabEntry: Codable {
    var date: String
    var rawText: String
}
