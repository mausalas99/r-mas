import Foundation

// Result and option types of procesarLabs. Shared by every Labs unit and the tests.

public struct LabPatient: Codable, Equatable, Sendable {
    public var name = ""
    public var expediente = ""
    public var sexo = ""
    public var edad = ""
    public var fecha = ""
    public var hora = ""
    public var ubicacion = ""
    public init() {}
}

/// Same fields as Node's procesarLabs result. `refsBySection`: section -> field -> [low, high].
public struct ProcesarLabsResult: Codable, Equatable, Sendable {
    public var patient: LabPatient
    public var resLabs: [String]
    public var bhExtras: [String: String]
    public var refsBySection: [String: [String: [Double]]]
    public init(patient: LabPatient, resLabs: [String], bhExtras: [String: String], refsBySection: [String: [String: [Double]]]) {
        self.patient = patient
        self.resLabs = resLabs
        self.bhExtras = bhExtras
        self.refsBySection = refsBySection
    }
}

/// Node options: { patient?, priorRefsBySection?, gasRefs?, priorBhValues? }.
/// `patient.edad` can be a number or text in Node, so it stays LabJSON.
public struct ProcesarLabsOptions: Codable, Equatable, Sendable {
    public struct ChartPatient: Codable, Equatable, Sendable {
        public var sexo: String?
        public var edad: LabJSON?
    }
    public var patient: ChartPatient?
    public var priorRefsBySection: [String: [String: [Double]]]?
    public var gasRefs: [String: [Double]]?
    public var priorBhValues: [String: Double]?
}

/// Node `buildEgfrPatientCtx(...)` result: demographics used for eTFG in QS.
public struct EgfrPatientCtx: Codable, Equatable, Sendable {
    public var edad: String
    public var edadUnidad: String
    public var sexo: String
    public init(edad: String, edadUnidad: String, sexo: String) {
        self.edad = edad
        self.edadUnidad = edadUnidad
        self.sexo = sexo
    }
}

/// Node `parseBH_` result: `visible` is the BH row, `coagVisible` the COAG row ("" if none).
public struct BHResult: Codable, Equatable, Sendable {
    public var visible: String
    public var coagVisible: String
    public var extras: [String: String]
    public init(visible: String, coagVisible: String, extras: [String: String]) {
        self.visible = visible
        self.coagVisible = coagVisible
        self.extras = extras
    }
}
