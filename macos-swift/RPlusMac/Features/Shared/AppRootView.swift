import SwiftUI

struct AppRootView: View {
    @StateObject private var sessionStore = PatientSessionStore()
    @StateObject private var drafts = ClinicalDraftStore()

    var body: some View {
        HStack(spacing: 12) {
            PatientListView(sessionStore: sessionStore)
                .frame(minWidth: 220, maxWidth: 280)

            Divider()

            VStack(spacing: 12) {
                LabView(sessionStore: sessionStore)
                Divider()
                ExpedienteView(sessionStore: sessionStore, drafts: drafts)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .padding(12)
    }
}
