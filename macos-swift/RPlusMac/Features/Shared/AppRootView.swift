import SwiftUI

struct AppRootView: View {
    @StateObject private var sessionStore = PatientSessionStore()
    @StateObject private var noteStore = NoteStore()
    @StateObject private var indicacionesStore = IndicacionesStore()

    var body: some View {
        HStack(spacing: 12) {
            PatientListView(sessionStore: sessionStore)
                .frame(minWidth: 220, maxWidth: 280)

            Divider()

            VStack(spacing: 12) {
                LabView(sessionStore: sessionStore)
                Divider()
                NotaView(sessionStore: sessionStore, store: noteStore)
                Divider()
                IndicacionesView(sessionStore: sessionStore, store: indicacionesStore)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .padding(12)
        .onReceive(sessionStore.$selectedPatient) { patient in
            guard let patient else { return }
            noteStore.load(patientId: patient.id)
            indicacionesStore.load(patientId: patient.id)
        }
    }
}
