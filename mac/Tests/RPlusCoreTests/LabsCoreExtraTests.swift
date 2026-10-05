import Testing
@testable import RPlusCore

/// Core helpers vs Node. Generated from Node outputs by the scratchpad script core-extra-gen.mjs
/// (synthetic data only). 74 cases.
@Suite("Labs Core extra") struct LabsCoreExtraTests {
    @Test func extractExpediente() {
        #expect(ProcesarLabs.extractLabExpedienteFromReport("Expediente: SINT-01 Solicitud: 99") == "SINT-01")
        #expect(ProcesarLabs.extractLabExpedienteFromReport("Expediente:\tSINT-02  Fecha: 01/02/2026") == "SINT-02")
        #expect(ProcesarLabs.extractLabExpedienteFromReport("sin registro") == "")
        #expect(ProcesarLabs.extractLabExpedienteFromReport("Nombre: X\nExpediente: ABC123 M\u{e9}dico: Dr Prueba\n") == "ABC123")
        #expect(ProcesarLabs.extractLabExpedienteFromReport("EXPEDIENTE:   SINT-03   Sexo: F") == "SINT-03")
        #expect(ProcesarLabs.extractLabExpedienteFromReport("Expediente: SINT Ubicacion: 3A") == "SINT")
    }

    @Test func reportFechaDMY() {
        #expect(LabReportRefs.extractLabReportFechaDMY("Fecha Registro: Mar 5 2026 10:30 AM") == "05/03/2026")
        #expect(LabReportRefs.extractLabReportFechaDMY("Fecha Registro:\nAgo 12 2025 08:00") == "12/08/2025")
        #expect(LabReportRefs.extractLabReportFechaDMY("Fecha de resultado: 3/7/26") == "03/07/2026")
        #expect(LabReportRefs.extractLabReportFechaDMY("FECHA DEL ESTUDIO: 01-02-2024") == "01/02/2024")
        #expect(LabReportRefs.extractLabReportFechaDMY("Recepci\u{f3}n de muestra: 9/9/2025") == "09/09/2025")
        #expect(LabReportRefs.extractLabReportFechaDMY("Validaci\u{f3}n: 1/2/25") == "01/02/2025")
        #expect(LabReportRefs.extractLabReportFechaDMY("Encabezado\nFecha: 4/5/2026\n") == "04/05/2026")
        #expect(LabReportRefs.extractLabReportFechaDMY("Fecha Registro: Xyz 5 2026") == "")
        #expect(LabReportRefs.extractLabReportFechaDMY("Fecha Registro: 05/03/2026 14:05") == "05/03/2026")
        #expect(LabReportRefs.extractLabReportFechaDMY("Fecha muestra 7-8-123") == "07/08/123")
        #expect(LabReportRefs.extractLabReportFechaDMY("nada aqui") == "")
        #expect(LabReportRefs.extractLabReportFechaDMY("") == "")
        #expect(LabReportRefs.extractLabReportFechaDMY("Fecha Registro: dec 31 2025 11:59 PM") == "31/12/2025")
        #expect(LabReportRefs.extractLabReportFechaDMY("Reporte: 12/12/2012") == "12/12/2012")
    }

    @Test func reportHora() {
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: Mar 5 2026 12:15 AM") == "00:15")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: Mar 5 2026 1:05 PM") == "13:05")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: Mar 5 2026 12:40 PM") == "12:40")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: 05/03/2026 7:45 p.m.") == "19:45")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: 05/03/2026 25:00") == "")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: 05/03/2026 14:05:33") == "14:05")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro:\tMar 5 2026 09:07") == "09:07")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: 5-3-26 6:30 a. m.") == "06:30")
        #expect(LabReportRefs.extractLabReportHora("sin hora") == "")
        #expect(LabReportRefs.extractLabReportHora("Fecha Registro: Mar 5 2026") == "")
    }

    @Test func looksLikeSome() {
        #expect(LabReportRefs.looksLikeSomeLabReport("Expediente: SINT\nNombre: X\nFecha Registro: Mar 5 2026") == true)
        #expect(LabReportRefs.looksLikeSomeLabReport("Expediente: SINT\nNombre: X\nQU\u{cd}MICA CLINICA") == true)
        #expect(LabReportRefs.looksLikeSomeLabReport("Expediente: SINT\nQUIMICA") == false)
        #expect(LabReportRefs.looksLikeSomeLabReport("Nombre: X\nExpediente : SINT\nnada") == false)
        #expect(LabReportRefs.looksLikeSomeLabReport("") == false)
    }

    @Test func sortClinicalOrder() {
        #expect(LabResLabs.sortResLabsByClinicalOrder(["EGO: x", "CULTIVO a", "BH: 1", "GASES: 2", "QS: 3", "EU: 4", "pfhs: 5", "DEPCR\t6", "", "ESC: 7", "CUANTORINA: 8", "COAG: 9"]) == ["BH: 1", "QS: 3", "ESC: 7", "pfhs: 5", "GASES: 2", "CULTIVO a", "", "COAG: 9", "DEPCR\t6", "EU: 4", "CUANTORINA: 8", "EGO: x"])
        #expect(LabResLabs.sortResLabsByClinicalOrder(["TROP: 1", "Interpretaci\u{f3}n gasometr\u{ed}a: x", ":raro", "BH 2", "gases\tA"]) == ["BH 2", "gases\tA", "TROP: 1", "Interpretaci\u{f3}n gasometr\u{ed}a: x", ":raro"])
        #expect(LabResLabs.sortResLabsByClinicalOrder([]) == [])
    }

    @Test func sanitizeChunks() {
        #expect(LabResLabs.sanitizeResLabsChunks(["BH: 1\nUSER abc", "Expediente: SINT", "USER x", "QS: 2 Sistema SOME blah", "random text", "Cuenta: 10^5 UFC", "\u{2022} E. coli", "SECRECION BRONQUIAL 3/4: E. coli", "HEMOCULTIVO 1/2: E coli", "  ", "Labo -647* AB 12", "ESC: Na 140\nNombre: X\nK 4", "CULTIVO DE MICOBACTERIAS negativo", "EGO: pH 6 Expediente: SINT", "PFH: AST 20", "Universidad X"]) == ["BH: 1", "Cuenta: 10^5 UFC", "\u{2022} E. coli", "SECRECION BRONQUIAL 3/4: E. coli", "HEMOCULTIVO 1/2: E coli", "ESC: Na 140\nK 4", "CULTIVO DE MICOBACTERIAS negativo", "EGO: pH 6", "PFH: AST 20"])
        #expect(LabResLabs.sanitizeResLabsChunks(["TB: neg UNIVERSIDAD AUTONOMA", "GS: O+", "ATB: AMK S"]) == ["GS: O+", "ATB: AMK S"])
    }

    @Test func refsFromReport() {
        #expect(LabReportRefs.buildRefsBySectionFromReport("HEMATOLOGIA\nHGB\t\t13.5\tg/dL\t12.0 - 16.0\nPLT \t\t250\t10^3/uL\t150 - 450\nWBC \t\t8.1\t10^3/uL\t4.5 - 11.0") == ["BH": ["Hb": [12.0, 16.0], "Leu": [4.5, 11.0], "Plt": [150.0, 450.0]]])
        #expect(LabReportRefs.buildRefsBySectionFromReport("GASOMETRIA ARTERIAL\nPH \t\t7.30\t\t7.35 - 7.45\nPCO2\t\t30\tmmHg\t35 - 45\nLACTATO\t\t2.5\tmmol/L\t0.5 - 2.2") == ["GASES": ["pH": [7.35, 7.45], "pCO2": [35.0, 45.0], "Lactato": [0.5, 2.2]]])
        #expect(LabReportRefs.buildRefsBySectionFromReport("QUIMICA CLINICA\nGLUCOSA\t\t95\tmg/dL\t70 - 100\nCREATININA\t\t1.1\tmg/dL\t0.6 - 1.2\nSODIO\t\t140\tmmol/L\t135 - 145\nTRIGLICERIDOS\t\t150\tmg/dL\t0 - 150") == ["QS": ["Glu": [70.0, 100.0], "Cr": [0.6, 1.2], "TGL": [0.0, 150.0]], "ESC": ["Na": [135.0, 145.0]]])
        #expect(LabReportRefs.buildRefsBySectionFromReport("texto sin labs") == [:])
    }

    @Test func dedupeEdges() {
        #expect(LabBulk.dedupeConsolidatedRows(["EGO: pH 6", "BH: Hb 12", "EGO: pH 6 ", "  EGO:   pH 6", "GS: O+"], tipo: "notas") == ["EGO: pH 6", "BH: Hb 12", "GS: O+"])
        #expect(LabBulk.dedupeConsolidatedRows(["EGO: pH 6", "GS: O+", "GS: O+ Rh positivo", "EGO: pH 6 dens 1.020", "CULTIVO x"], tipo: "labs") == ["GS: O+ Rh positivo", "CULTIVO x", "EGO: pH 6 dens 1.020"])
        #expect(LabBulk.dedupeConsolidatedRows(["123 a", "45 bb", "ZZ c", "7 d", "45 bbbb"], tipo: "labs") == ["7 d", "45 bbbb", "123 a", "ZZ c"])
        #expect(LabBulk.dedupeConsolidatedRows(["", "   ", "PIE: x"], tipo: "labs") == ["PIE: x"])
        #expect(LabBulk.dedupeConsolidatedRows(["GS: A", "GS: B"], tipo: "labs") == ["GS: B"])
    }

    @Test func splitSomeReports() {
        #expect(LabBulk.splitSomeReportsInBlock("Expediente: SINT-A\nA\nExpediente: SINT-B\nB") == ["Expediente: SINT-A\nA", "Expediente: SINT-B\nB"])
        #expect(LabBulk.splitSomeReportsInBlock("  ") == [])
        #expect(LabBulk.splitSomeReportsInBlock("intro\n  Expediente: SINT-C\nC\n\nExpediente:SINT-D") == ["intro", "Expediente: SINT-C\nC", "Expediente:SINT-D"])
        #expect(LabBulk.splitSomeReportsInBlock("sin encabezado") == ["sin encabezado"])
    }

    @Test func splitByPatient() {
        #expect(LabBulk.splitByPatient("A\n--- PACIENTE ---\nB\r\n  --- paciente ---  \n\n---PACIENTE---\nC") == ["A", "B", "C"])
        #expect(LabBulk.splitByPatient("--- PACIENTE ---") == [])
        #expect(LabBulk.splitByPatient("") == [])
        #expect(LabBulk.splitByPatient("solo uno\n") == ["solo uno"])
        #expect(LabBulk.isLabBulkPatientSeparatorLine("--- PACIENTE ---") == true)
        #expect(LabBulk.isLabBulkPatientSeparatorLine(" --- Paciente --- ") == true)
        #expect(LabBulk.isLabBulkPatientSeparatorLine("-- PACIENTE --") == false)
        #expect(LabBulk.isLabBulkPatientSeparatorLine("x --- PACIENTE ---") == false)
    }

    @Test func mixedExpedienteWarning() {
        #expect(LabBulk.mixedExpedienteWarning([LabBulk.BlockInfo(status: "mixed-expediente", expedientes: ["SINT-A", "SINT-B"], okReportCount: 0, primaryExpediente: "", conflictExpedientes: []), LabBulk.BlockInfo(status: "ok", expedientes: [], okReportCount: 2, primaryExpediente: "", conflictExpedientes: [])]) == "Un bloque del texto pegado tiene 2 expedientes distintos (SINT-A y SINT-B). Puede tener datos de otro paciente. Ese bloque se excluy\u{f3}. El resto del pegado s\u{ed} se proces\u{f3}. Separa los reportes por paciente y pega de nuevo.")
        #expect(LabBulk.mixedExpedienteWarning([LabBulk.BlockInfo(status: "mixed-expediente", expedientes: ["SINT-A", "SINT-B"], okReportCount: 3, primaryExpediente: "", conflictExpedientes: [])]) == "Un bloque del texto pegado tiene 2 expedientes distintos (SINT-A y SINT-B). Puede tener datos de otro paciente. Ese bloque se excluy\u{f3}. No se guard\u{f3} nada. Separa los reportes por paciente y pega de nuevo.")
        #expect(LabBulk.mixedExpedienteWarning([LabBulk.BlockInfo(status: "ok", expedientes: [], okReportCount: 0, primaryExpediente: "SINT-A", conflictExpedientes: ["SINT-C", "SINT-C", "", "SINT-D"])]) == "Un bloque del texto pegado trae otro expediente (SINT-C y SINT-D) distinto del paciente conocido (SINT-A). Ese reporte se excluy\u{f3}, no se guard\u{f3}. El resto del pegado s\u{ed} se proces\u{f3}.")
        #expect(LabBulk.mixedExpedienteWarning([LabBulk.BlockInfo(status: "ok", expedientes: [], okReportCount: 0, primaryExpediente: "", conflictExpedientes: ["SINT-E"])]) == "Un bloque del texto pegado trae otro expediente (SINT-E) distinto del paciente conocido. Ese reporte se excluy\u{f3}, no se guard\u{f3}. El resto del pegado s\u{ed} se proces\u{f3}.")
        #expect(LabBulk.mixedExpedienteWarning([LabBulk.BlockInfo(status: "ok", expedientes: [], okReportCount: 1, primaryExpediente: "", conflictExpedientes: [])]) == nil)
    }

    @Test func unknownRowsWarning() {
        #expect(LabBulk.unknownLabRowsWarning([["A"]]) == "1 fila no reconocida no se guard\u{f3}: A")
        #expect(LabBulk.unknownLabRowsWarning([["A", "B"], ["B", "C", "D"]]) == "4 filas no reconocidas no se guardaron: A, B, C\u{2026}")
        #expect(LabBulk.unknownLabRowsWarning([]) == nil)
        #expect(LabBulk.unknownLabRowsWarning([["X"], []]) == "1 fila no reconocida no se guard\u{f3}: X")
    }

    @Test func unknownRowNames() {
        #expect(LabBulk.unknownLabRowNames("Campo:\tsintetico\nQUIMICA CLINICA\nQUIMICA SANGUINEA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nGLUCOSA\t\t95\tmg/dL\t70 - 100\nFOO BAR\t\t12\tU/L\t1 - 5\nTEXTO\t\tNEGATIVO\t\t") == ["FOO BAR"])
        #expect(LabBulk.unknownLabRowNames("Campo:\tsintetico\nHEMATOLOGIA\nBIOMETRIA HEMATICA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nHGB\t\t13.5\tg/dL\t12 - 16\nLYM\t\t30\t%\t20 - 40\nZETA\t*\t4.4\t%\t1 - 2") == ["ZETA"])
        #expect(LabBulk.unknownLabRowNames("Campo:\tsintetico\nGASOMETRIA\nGASES ARTERIALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nPH\t\t7.40\t\t7.35 - 7.45\nPCO2\t\t40\tmmHg\t35 - 45\nRARO GAS\t\t3\tu\t1 - 2") == ["RARO GAS"])
        #expect(LabBulk.unknownLabRowNames("sin tabla") == [])
    }
}
