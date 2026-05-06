import Foundation

enum JSONValue: Codable, Equatable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            throw DecodingError.typeMismatch(
                JSONValue.self,
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Unsupported JSON value")
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value):
            try container.encode(value)
        case .number(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

struct DomainLabEntry: Codable, Equatable {
    var date: String
    var rawText: String
}

struct DomainPatient: Codable, Equatable {
    var id: String
    var name: String
}

struct SharedDomain: Codable, Equatable {
    var format: String
    var version: Int
    var exportedAt: String
    var appVersion: String?
    var theme: String
    var guidedTourDoneForVersion: String?
    var patients: [DomainPatient]
    var notesByPatientId: [String: JSONValue]
    var indicacionesByPatientId: [String: JSONValue]
    var labHistoryByPatientId: [String: [DomainLabEntry]]
    var medRecetaByPatient: [String: JSONValue]
    var settings: [String: JSONValue]
    var medCatalog: JSONValue
}

struct NoteDraft: Equatable, Codable {
    var patientId: String
    var fecha: String
    var hora: String
    var interrogatorio: String
    var evolucion: String
    var estudios: String
    var diagnosticos: [String]
    var ta: String
    var fr: String
    var fc: String
    var temp: String
    var peso: String
    var tratamiento: [String]
    var medico: String
    var profesor: String

    static func empty(patientId: String) -> NoteDraft {
        NoteDraft(
            patientId: patientId,
            fecha: "",
            hora: "",
            interrogatorio: "",
            evolucion: "",
            estudios: "",
            diagnosticos: [],
            ta: "",
            fr: "",
            fc: "",
            temp: "",
            peso: "",
            tratamiento: [],
            medico: "",
            profesor: ""
        )
    }
}

struct IndicacionesExtraSection: Equatable, Codable {
    var titulo: String
    var contenido: String
}

struct IndicacionesDraft: Equatable, Codable {
    var patientId: String
    var fecha: String
    var hora: String
    var descripcion: String
    var medicos: String
    var dieta: String
    var cuidados: String
    var estudios: String
    var medicamentos: String
    var interconsultas: String
    var otros: [IndicacionesExtraSection]

    static func empty(patientId: String) -> IndicacionesDraft {
        IndicacionesDraft(
            patientId: patientId,
            fecha: "",
            hora: "",
            descripcion: "",
            medicos: "",
            dieta: "",
            cuidados: "",
            estudios: "",
            medicamentos: "",
            interconsultas: "",
            otros: []
        )
    }
}
