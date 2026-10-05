import Foundation

/// One structured lab value. Parity target: the lab shape in packages/core/lib/lab-repo.
public struct LabValue: Equatable, Sendable {
    public let name: String
    public let value: Double
    public let unit: String

    public init(name: String, value: Double, unit: String) {
        self.name = name
        self.value = value
        self.unit = unit
    }
}
