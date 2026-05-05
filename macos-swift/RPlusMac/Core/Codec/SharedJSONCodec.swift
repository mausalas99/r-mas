import Foundation

struct SharedDomain {
    var patients: [SharedPatient]
}

final class SharedJSONCodec {
    func importFromSharedJSON(_ data: Data) throws -> SharedDomain {
        let decoded = try JSONDecoder().decode(SharedRoot.self, from: data)
        return SharedDomain(patients: decoded.patients)
    }

    func exportToSharedJSON(_ domain: SharedDomain) throws -> Data {
        let root = SharedRoot(patients: domain.patients)
        return try JSONEncoder().encode(root)
    }
}
