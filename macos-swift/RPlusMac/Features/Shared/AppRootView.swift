import SwiftUI

struct AppRootView: View {
    @StateObject private var sessionStore = PatientSessionStore()
    @StateObject private var drafts = ClinicalDraftStore()
    @StateObject private var labHistory = LabHistoryStore()

    var body: some View {
        NavigationSplitView {
            PatientListView(sessionStore: sessionStore)
                .navigationSplitViewColumnWidth(min: 220, ideal: 260, max: 320)
        } detail: {
            VStack(spacing: 0) {
                TabView {
                    LabView(sessionStore: sessionStore, drafts: drafts, labHistory: labHistory)
                        .tabItem {
                            Label("Laboratorio", systemImage: "cross.case")
                        }

                    ExpedienteView(sessionStore: sessionStore, drafts: drafts)
                        .tabItem {
                            Label("Expediente", systemImage: "doc.text")
                        }
                }
                .padding(16)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(nsColor: .windowBackgroundColor))
        }
        .navigationTitle("R+")
    }
}
