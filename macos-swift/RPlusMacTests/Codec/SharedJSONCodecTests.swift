import Foundation
import XCTest
@testable import RPlusMac

final class SharedJSONCodecTests: XCTestCase {
    private func fixtureURL() throws -> URL {
        let bundle = Bundle(for: SharedJSONCodecTests.self)
        return try XCTUnwrap(bundle.url(forResource: "minimal-patient", withExtension: "json"))
    }

    func testRoundTripPreservesPatientIdAndLabEntries() throws {
        let inputURL = try fixtureURL()
        let inputData = try Data(contentsOf: inputURL)

        let codec = SharedJSONCodec()
        let domain = try codec.importFromSharedJSON(inputData)
        let outputData = try codec.exportToSharedJSON(domain)
        let reparsed = try codec.importFromSharedJSON(outputData)

        XCTAssertEqual(reparsed.format, domain.format)
        XCTAssertEqual(reparsed.version, domain.version)
        XCTAssertEqual(reparsed.theme, domain.theme)
        XCTAssertEqual(reparsed.guidedTourDoneForVersion, domain.guidedTourDoneForVersion)
        XCTAssertEqual(reparsed.patients.count, domain.patients.count)
        XCTAssertEqual(reparsed.patients.first?.id, domain.patients.first?.id)
        XCTAssertEqual(reparsed.patients.first?.name, domain.patients.first?.name)
        XCTAssertEqual(
            reparsed.notesByPatientId["patient-001"],
            .object(["fecha": .string("05/05/2026"), "estudios": .string("BH de control")])
        )
        XCTAssertEqual(
            reparsed.indicacionesByPatientId["patient-001"],
            .object(["fecha": .string("05/05/2026"), "dieta": .string("Blanda")])
        )
        XCTAssertEqual(reparsed.labHistoryByPatientId["patient-001"]?.count, domain.labHistoryByPatientId["patient-001"]?.count)
        XCTAssertEqual(reparsed.labHistoryByPatientId["patient-001"]?.first?.date, domain.labHistoryByPatientId["patient-001"]?.first?.date)
        XCTAssertEqual(reparsed.labHistoryByPatientId["patient-001"]?.first?.rawText, domain.labHistoryByPatientId["patient-001"]?.first?.rawText)
        XCTAssertEqual(reparsed.medRecetaByPatient["patient-001"], domain.medRecetaByPatient["patient-001"])
        XCTAssertEqual(reparsed.settings["updateChannel"], .string("stable"))
    }

    func testImportThrowsForMalformedJSON() {
        let malformed = Data("{\"patients\": [".utf8)
        let codec = SharedJSONCodec()

        XCTAssertThrowsError(try codec.importFromSharedJSON(malformed))
    }

    func testRoundTripPreservesNoteAndIndicacionesDrafts() throws {
        let codec = SharedJSONCodec()
        let domain = SharedDomain(
            format: "rplus-shared-json",
            version: 1,
            exportedAt: "2026-05-06T00:00:00Z",
            appVersion: "1.0.0",
            theme: "system",
            guidedTourDoneForVersion: nil,
            patients: [DomainPatient(id: "p-1", name: "Paciente Demo")],
            notesByPatientId: [
                "p-1": .object([
                    "fecha": .string("06/05/2026"),
                    "interrogatorio": .string("Paciente estable")
                ])
            ],
            indicacionesByPatientId: [
                "p-1": .object([
                    "descripcion": .string("INDICACIONES POR MEDICINA INTERNA")
                ])
            ],
            labHistoryByPatientId: [:],
            medRecetaByPatient: [:],
            settings: [:],
            medCatalog: .object([:])
        )

        let output = try codec.exportToSharedJSON(domain)
        let exportedRoot = try JSONDecoder().decode(SharedRoot.self, from: output)
        XCTAssertEqual(exportedRoot.data.patients.first?.noteDraft?.interrogatorio, "Paciente estable")
        XCTAssertEqual(exportedRoot.data.patients.first?.indicacionesDraft?.descripcion, "INDICACIONES POR MEDICINA INTERNA")

        let reparsed = try codec.importFromSharedJSON(output)
        XCTAssertEqual(reparsed.notesByPatientId["p-1"], domain.notesByPatientId["p-1"])
        XCTAssertEqual(reparsed.indicacionesByPatientId["p-1"], domain.indicacionesByPatientId["p-1"])
    }

    func testImportMergePreservesUnknownDraftKeys() throws {
        let codec = SharedJSONCodec()
        let root = SharedRoot(
            format: "rplus-shared-json",
            version: 1,
            exportedAt: "2026-05-06T00:00:00Z",
            appVersion: "1.0.0",
            theme: "system",
            guidedTourDoneForVersion: nil,
            data: SharedDataPayload(
                patients: [
                    SharedPatient(
                        id: "p-1",
                        name: "Paciente Demo",
                        noteDraft: SharedNoteDraft(
                            fecha: "",
                            hora: nil,
                            interrogatorio: "Desde paciente.noteDraft",
                            evolucion: nil,
                            estudios: nil,
                            diagnosticos: nil,
                            tratamiento: nil
                        ),
                        indicacionesDraft: SharedIndicacionesDraft(
                            fecha: nil,
                            hora: nil,
                            descripcion: "Desde indicacionesDraft",
                            medicos: nil,
                            dieta: "",
                            cuidados: nil,
                            estudios: nil,
                            medicamentos: nil,
                            interconsultas: nil
                        )
                    )
                ],
                notes: [
                    "p-1": .object([
                        "fecha": .string("05/05/2026"),
                        "custom-note-key": .string("keep-me")
                    ])
                ],
                indicaciones: [
                    "p-1": .object([
                        "dieta": .string("Blanda"),
                        "custom-ind-key": .string("keep-too")
                    ])
                ],
                labHistory: [:],
                medRecetaByPatient: [:],
                settings: [:],
                medCatalog: .object([:])
            )
        )

        let input = try JSONEncoder().encode(root)
        let imported = try codec.importFromSharedJSON(input)
        let output = try codec.exportToSharedJSON(imported)
        let reparsed = try codec.importFromSharedJSON(output)

        XCTAssertEqual(
            reparsed.notesByPatientId["p-1"],
            .object([
                "fecha": .string("05/05/2026"),
                "custom-note-key": .string("keep-me"),
                "interrogatorio": .string("Desde paciente.noteDraft")
            ])
        )
        XCTAssertEqual(
            reparsed.indicacionesByPatientId["p-1"],
            .object([
                "dieta": .string("Blanda"),
                "custom-ind-key": .string("keep-too"),
                "descripcion": .string("Desde indicacionesDraft")
            ])
        )
    }
}
