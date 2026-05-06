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
    var noteDraft: SharedNoteDraft?
    var indicacionesDraft: SharedIndicacionesDraft?
}

struct SharedLabEntry: Codable {
    var date: String
    var rawText: String
}

struct SharedNoteDraft: Codable, Equatable {
    var fecha: String?
    var hora: String?
    var interrogatorio: String?
    var evolucion: String?
    var estudios: String?
    var diagnosticos: [String]?
    var tratamiento: [String]?
}

struct SharedIndicacionesDraft: Codable, Equatable {
    var fecha: String?
    var hora: String?
    var descripcion: String?
    var medicos: String?
    var dieta: String?
    var cuidados: String?
    var estudios: String?
    var medicamentos: String?
    var interconsultas: String?
}
