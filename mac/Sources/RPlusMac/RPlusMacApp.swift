import SwiftUI
import RPlusCore
import Sparkle

@main
struct RPlusMacApp: App {
    // Sparkle starts only when the build carries a feed key (build-app.sh sets
    // SUPublicEDKey in Info.plist when SU_PUBLIC_ED_KEY is set). Without it
    // (swift run, dev builds) Sparkle would show an error alert at launch.
    private static let updaterConfigured =
        Bundle.main.object(forInfoDictionaryKey: "SUPublicEDKey") != nil
    private let updater = SPUStandardUpdaterController(
        startingUpdater: updaterConfigured, updaterDelegate: nil, userDriverDelegate: nil)

    var body: some Scene {
        WindowGroup("R+") {
            Text("R+ Mac")
                .frame(minWidth: 480, minHeight: 320)
        }
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Buscar actualizaciones…") { updater.checkForUpdates(nil) }
                    .disabled(!Self.updaterConfigured)
            }
        }
    }
}
