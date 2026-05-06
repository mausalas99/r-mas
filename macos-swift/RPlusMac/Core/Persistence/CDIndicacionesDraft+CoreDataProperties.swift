import Foundation
import CoreData

extension CDIndicacionesDraft {
    @nonobjc public class func fetchRequest() -> NSFetchRequest<CDIndicacionesDraft> {
        NSFetchRequest<CDIndicacionesDraft>(entityName: "CDIndicacionesDraft")
    }

    @NSManaged public var patientId: String
    @NSManaged public var fecha: String
    @NSManaged public var hora: String
    @NSManaged public var descripcion: String
    @NSManaged public var medicos: String
    @NSManaged public var dieta: String
    @NSManaged public var cuidados: String
    @NSManaged public var estudios: String
    @NSManaged public var medicamentos: String
    @NSManaged public var interconsultas: String
    @NSManaged public var otrosJSON: String
}
