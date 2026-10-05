import Foundation

/// Entry points, same names and file names as lib/doc-export-service.js.
/// `Data` is a .docx; write it to the folder the user allowed (output-dir policy is the app's job).
public enum DocxExport {
    public struct Result: Sendable {
        public var data: Data
        public var fileName: String
    }

    public static func note(patient: DocxPatient, note: DocxNote, templates: DocxTemplates) throws -> Result {
        let data = try NoteDocx.build(patient: patient, note: note, templates: templates)
        return Result(data: data, fileName: "Nota_Evolucion_\(safeName(patient.nombre))_\(safeName(note.fecha)).docx")
    }

    public static func indicaciones(patient: DocxPatient, indicaciones: DocxIndicaciones, templates: DocxTemplates) throws -> Result {
        let data = try IndicacionesDocx.build(patient: patient, indicaciones: indicaciones, templates: templates)
        return Result(data: data, fileName: "Indicaciones_\(safeName(patient.nombre))_\(safeName(indicaciones.fecha)).docx")
    }

    /// `now` only feeds the HH-MM-SS part of the file name.
    public static func listado(
        patient: DocxPatient, listado: DocxListado, medicos: DocxMedicos = DocxMedicos(),
        templates: DocxTemplates, now: Date = Date()
    ) throws -> Result {
        let data = try ListadoDocx.build(patient: patient, listado: listado, medicos: medicos, templates: templates)
        let c = Calendar.current.dateComponents([.hour, .minute, .second], from: now)
        let stamp = String(format: "%02d-%02d-%02d", c.hour ?? 0, c.minute ?? 0, c.second ?? 0)
        return Result(data: data, fileName: "Listado_Problemas_\(safeName(patient.nombre))_\(safeName(listado.fecha))_\(stamp).docx")
    }

    /// File-name part: NFC so macOS "É" stays one letter; capped so the name fits the 255-byte limit.
    /// Works on UTF-16 units like the JS regex without the `u` flag, so an emoji becomes "__".
    public static func safeName(_ s: String) -> String {
        let allowed = Set("áéíóúüñÁÉÍÓÚÜÑ0123456789".utf16)
        let units = s.precomposedStringWithCanonicalMapping.utf16.prefix(80).map { u -> UInt16 in
            let ascii = (u >= 48 && u <= 57) || (u >= 65 && u <= 90) || (u >= 97 && u <= 122)
            return ascii || allowed.contains(u) ? u : 95
        }
        return String(decoding: units, as: UTF16.self)
    }
}
