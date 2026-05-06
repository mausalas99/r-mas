import Foundation

enum DocxExportError: Error {
    case failedToCreateArchive
}

struct DocxDocumentExporter {
    func exportNota(_ draft: NoteDraft, patientName: String, outputURL: URL) throws {
        let lines: [String] = [
            "NOTA DE EVOLUCION",
            "Paciente: \(patientName)",
            "Fecha: \(draft.fecha) \(draft.hora)",
            "",
            "INTERROGATORIO",
            draft.interrogatorio,
            "",
            "EVOLUCION",
            draft.evolucion,
            "",
            "ESTUDIOS",
            draft.estudios,
            "",
            "DIAGNOSTICOS",
            draft.diagnosticos.joined(separator: " | "),
            "",
            "TRATAMIENTO",
            draft.tratamiento.joined(separator: " | "),
            "",
            "SIGNOS VITALES",
            "TA: \(draft.ta) FR: \(draft.fr) FC: \(draft.fc) TEMP: \(draft.temp) PESO: \(draft.peso)",
            "",
            "MEDICO: \(draft.medico)",
            "PROFESOR: \(draft.profesor)"
        ]
        try writeDocx(lines: lines, outputURL: outputURL)
    }

    func exportIndicaciones(_ draft: IndicacionesDraft, patientName: String, outputURL: URL) throws {
        var lines: [String] = [
            "INDICACIONES MEDICAS",
            "Paciente: \(patientName)",
            "Fecha: \(draft.fecha) \(draft.hora)",
            "",
            "DESCRIPCION",
            draft.descripcion,
            "",
            "MEDICOS",
            draft.medicos,
            "",
            "DIETA",
            draft.dieta,
            "",
            "CUIDADOS",
            draft.cuidados,
            "",
            "ESTUDIOS",
            draft.estudios,
            "",
            "MEDICAMENTOS",
            draft.medicamentos,
            "",
            "INTERCONSULTAS",
            draft.interconsultas
        ]

        if !draft.otros.isEmpty {
            lines.append("")
            lines.append("OTROS")
            for section in draft.otros {
                lines.append(section.titulo)
                lines.append(section.contenido)
            }
        }

        try writeDocx(lines: lines, outputURL: outputURL)
    }

    private func writeDocx(lines: [String], outputURL: URL) throws {
        let fileManager = FileManager.default
        let tempRoot = fileManager.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let relsDir = tempRoot.appendingPathComponent("_rels")
        let wordDir = tempRoot.appendingPathComponent("word")
        try fileManager.createDirectory(at: relsDir, withIntermediateDirectories: true)
        try fileManager.createDirectory(at: wordDir, withIntermediateDirectories: true)

        let contentTypes = """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>
        """

        let rootRels = """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>
        """

        let paragraphs = lines.map { line -> String in
            let escaped = xmlEscaped(line)
            return "<w:p><w:r><w:t xml:space=\"preserve\">\(escaped)</w:t></w:r></w:p>"
        }.joined()

        let documentXML = """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" mc:Ignorable="w14 wp14">
          <w:body>\(paragraphs)<w:sectPr/></w:body>
        </w:document>
        """

        try contentTypes.data(using: .utf8)?.write(to: tempRoot.appendingPathComponent("[Content_Types].xml"))
        try rootRels.data(using: .utf8)?.write(to: relsDir.appendingPathComponent(".rels"))
        try documentXML.data(using: .utf8)?.write(to: wordDir.appendingPathComponent("document.xml"))

        if fileManager.fileExists(atPath: outputURL.path) {
            try fileManager.removeItem(at: outputURL)
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/zip")
        process.currentDirectoryURL = tempRoot
        process.arguments = ["-qr", outputURL.path, "."]
        try process.run()
        process.waitUntilExit()

        try? fileManager.removeItem(at: tempRoot)

        guard process.terminationStatus == 0 else {
            throw DocxExportError.failedToCreateArchive
        }
    }

    private func xmlEscaped(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}
