import Foundation
import CoreData

extension CDNoteDraft {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<CDNoteDraft> {
        NSFetchRequest<CDNoteDraft>(entityName: "CDNoteDraft")
    }

    @NSManaged public var patientId: String
    @NSManaged public var fecha: String
    @NSManaged public var hora: String
    @NSManaged public var interrogatorio: String
    @NSManaged public var evolucion: String
    @NSManaged public var estudios: String
    @NSManaged public var diagnosticosJSON: String
    @NSManaged public var ta: String
    @NSManaged public var fr: String
    @NSManaged public var fc: String
    @NSManaged public var temp: String
    @NSManaged public var peso: String
    @NSManaged public var tratamientoJSON: String
    @NSManaged public var medico: String
    @NSManaged public var profesor: String
}
