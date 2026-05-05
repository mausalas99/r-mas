import CoreData

class PersistenceController {
    static let shared = PersistenceController()
    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "RPlusMacModel")
        let descriptions = container.persistentStoreDescriptions.isEmpty
            ? [NSPersistentStoreDescription()]
            : container.persistentStoreDescriptions

        descriptions.forEach { description in
            if inMemory {
                description.url = URL(fileURLWithPath: "/dev/null")
            }
            description.shouldAddStoreAsynchronously = false
        }
        container.persistentStoreDescriptions = descriptions

        container.loadPersistentStores { _, error in
            guard let error else { return }

            // Keep bootstrap/dev loops resilient: report and fall back to in-memory store.
            fputs("Persistent store load error for RPlusMacModel: \(error)\n", stderr)
            let fallback = NSPersistentStoreDescription()
            fallback.url = URL(fileURLWithPath: "/dev/null")
            fallback.shouldAddStoreAsynchronously = false
            self.container.persistentStoreDescriptions = [fallback]

            self.container.loadPersistentStores { _, fallbackError in
                if let fallbackError {
                    assertionFailure("Fallback in-memory persistent store failed: \(fallbackError)")
                }
            }
        }
    }

    var viewContext: NSManagedObjectContext {
        container.viewContext
    }

    func saveOrRollback() throws {
        guard viewContext.hasChanges else { return }

        do {
            try viewContext.save()
        } catch {
            viewContext.rollback()
            throw error
        }
    }
}
