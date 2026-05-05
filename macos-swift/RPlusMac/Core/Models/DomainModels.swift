import Foundation

struct DomainLabEntry: Codable, Equatable {
    var date: String
    var rawText: String
}

struct DomainPatient: Codable, Equatable {
    var id: String
    var name: String
}

struct SharedDomain: Codable, Equatable {
    var patients: [DomainPatient]
    var notesByPatientId: [String: String]
    var indicacionesByPatientId: [String: String]
    var labHistoryByPatientId: [String: [DomainLabEntry]]
    var settings: [String: String]
}
