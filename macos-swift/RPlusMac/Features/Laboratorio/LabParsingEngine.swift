import Foundation

enum LabSectionType: Equatable {
    case biometria
    case unknown
}

struct LabItem: Equatable {
    let key: String
    let value: String
}

struct LabSection: Equatable {
    let type: LabSectionType
    let items: [LabItem]
}

struct ParsedLabResult: Equatable {
    let sections: [LabSection]
}

final class LabParsingEngine {
    func parse(_ rawText: String) -> ParsedLabResult {
        let lines = rawText.split(separator: "\n").map(String.init)
        let header = lines.first?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard header == "BH" else {
            return ParsedLabResult(sections: [LabSection(type: .unknown, items: [])])
        }

        let items = lines.dropFirst().compactMap { line -> LabItem? in
            let parts = line.split(separator: " ", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { return nil }
            return LabItem(key: parts[0], value: parts[1])
        }

        return ParsedLabResult(sections: [LabSection(type: .biometria, items: items)])
    }
}
