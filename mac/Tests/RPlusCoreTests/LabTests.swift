import Testing
@testable import RPlusCore

@Test func labValueKeepsFields() {
    let lab = LabValue(name: "Hb", value: 12.5, unit: "g/dL")
    #expect(lab.name == "Hb")
    #expect(lab.value == 12.5)
}
