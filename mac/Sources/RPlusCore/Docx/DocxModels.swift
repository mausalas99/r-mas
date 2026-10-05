import Foundation

// Inputs for the three documents. They decode the same JSON the Electron app passes to
// doc-export-service.js, with the same looseness: a field may be missing, null, a string or
// a number. A falsy value (null, "", 0, false) reads as "" like JS `x || ''`.

struct AnyKey: CodingKey {
    var stringValue: String
    var intValue: Int? { nil }
    init(_ s: String) { stringValue = s }
    init?(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { nil }
}

extension KeyedDecodingContainer where K == AnyKey {
    func loose(_ key: String) -> String {
        let k = AnyKey(key)
        if let s = try? decode(String.self, forKey: k) { return s }
        if let d = try? decode(Double.self, forKey: k), d != 0 {
            return d == d.rounded() && abs(d) < 1e15 ? String(Int64(d)) : String(d)
        }
        if let a = try? decode([String].self, forKey: k) { return a.joined(separator: ",") }
        return ""
    }

    /// For JS `normalizeStringList`: an array keeps its items, a string splits on newlines.
    func looseList(_ key: String) -> [String] {
        let k = AnyKey(key)
        if let a = try? decode([String].self, forKey: k) { return a }
        if let s = try? decode(String.self, forKey: k) { return JS.splitLines(s) }
        return []
    }
}

public struct DocxPatient: Decodable, Sendable, Equatable {
    public var nombre = "", registro = "", edad = "", sexo = "", area = "", servicio = "", cuarto = "", cama = ""
    public init() {}
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        nombre = c.loose("nombre"); registro = c.loose("registro"); edad = c.loose("edad")
        sexo = c.loose("sexo"); area = c.loose("area"); servicio = c.loose("servicio")
        cuarto = c.loose("cuarto"); cama = c.loose("cama")
    }
}

public struct DocxNote: Decodable, Sendable, Equatable {
    public var fecha = "", hora = "", interrogatorio = "", evolucion = "", estudios = ""
    public var diagnosticos: [String] = []
    public var ta = "", fr = "", fc = "", temp = "", peso = ""
    public var tratamiento: [String] = []
    public var medico = "", profesor = ""
    public init() {}
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        fecha = c.loose("fecha"); hora = c.loose("hora"); interrogatorio = c.loose("interrogatorio")
        evolucion = c.loose("evolucion"); estudios = c.loose("estudios")
        diagnosticos = c.looseList("diagnosticos")
        ta = c.loose("ta"); fr = c.loose("fr"); fc = c.loose("fc"); temp = c.loose("temp"); peso = c.loose("peso")
        tratamiento = c.looseList("tratamiento")
        medico = c.loose("medico"); profesor = c.loose("profesor")
    }
}

public struct DocxIndicaciones: Decodable, Sendable, Equatable {
    public struct Otro: Decodable, Sendable, Equatable {
        public var titulo = "", contenido = ""
        public init() {}
        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: AnyKey.self)
            titulo = c.loose("titulo"); contenido = c.loose("contenido")
        }
    }

    public var fecha = "", hora = "", medicos = "", descripcion = ""
    public var dieta = "", cuidados = "", estudios = "", medicamentos = "", interconsultas = ""
    public var otros: [Otro] = []
    public init() {}
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        fecha = c.loose("fecha"); hora = c.loose("hora"); medicos = c.loose("medicos")
        descripcion = c.loose("descripcion"); dieta = c.loose("dieta"); cuidados = c.loose("cuidados")
        estudios = c.loose("estudios"); medicamentos = c.loose("medicamentos")
        interconsultas = c.loose("interconsultas")
        otros = (try? c.decode([Otro].self, forKey: AnyKey("otros"))) ?? []
    }
}

public struct DocxListado: Decodable, Sendable, Equatable {
    public struct Problema: Decodable, Sendable, Equatable {
        public var fecha = "", descripcion = ""
        public init() {}
        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: AnyKey.self)
            fecha = c.loose("fecha"); descripcion = c.loose("descripcion")
        }
    }

    /// Only feeds the file name.
    public var fecha = ""
    public var activos: [Problema] = []
    public var inactivos: [Problema] = []
    public init() {}
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        fecha = c.loose("fecha")
        activos = (try? c.decode([Problema].self, forKey: AnyKey("activos"))) ?? []
        inactivos = (try? c.decode([Problema].self, forKey: AnyKey("inactivos"))) ?? []
    }
}

public struct DocxMedicos: Decodable, Sendable, Equatable {
    public var profesor = "", r4 = "", r2 = "", r1a = "", r1b = ""
    public init() {}
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        profesor = c.loose("profesor"); r4 = c.loose("r4"); r2 = c.loose("r2")
        r1a = c.loose("r1a"); r1b = c.loose("r1b")
    }
}
