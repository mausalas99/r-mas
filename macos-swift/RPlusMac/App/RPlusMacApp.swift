import SwiftUI

@main
struct RPlusMacApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            Text("R+ macOS Swift")
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
