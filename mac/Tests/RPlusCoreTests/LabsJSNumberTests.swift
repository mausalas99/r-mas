import Testing
@testable import RPlusCore

@Suite("JSNumber") struct LabsJSNumberTests {
    @Test func parseFloat() {
        #expect(jsParseFloat("12abc") == 12 && jsParseFloat(" .5x") == 0.5 && jsParseFloat("5.") == 5)
        #expect(jsParseFloat("-1.5e2z") == -150 && jsParseFloat("abc") == nil && jsParseFloat("") == nil)
    }
    @Test func parseInt() {
        #expect(jsParseInt("12.9") == 12 && jsParseInt("-7x") == -7 && jsParseInt("x") == nil && jsParseInt("0x1f", radix: 16) == 31)
    }
    @Test func coerce() {
        #expect(jsNumber(parsing: "") == 0 && jsNumber(parsing: " 12 ") == 12 && jsNumber(parsing: "12a") == nil && jsNumber(parsing: "1e3") == 1000)
    }
    @Test func toStringRules() {
        #expect(jsString(7.3) == "7.3" && jsString(100000000) == "100000000" && jsString(1840.5) == "1840.5")
        #expect(jsString(0.000001) == "0.000001" && jsString(1e-7) == "1e-7" && jsString(1e21) == "1e+21" && jsString(-0.0) == "0")
        #expect(jsString(123456789012345680000) == "123456789012345680000" && jsString(0.1 + 0.2) == "0.30000000000000004")
    }
    @Test func toFixed() {
        #expect(jsToFixed(2.5, 0) == "3" && jsToFixed(0.125, 2) == "0.13" && jsToFixed(1.005, 2) == "1.00")
        #expect(jsToFixed(10.235, 2) == "10.23" && jsToFixed(-1.5, 0) == "-2" && jsToFixed(0, 2) == "0.00" && jsToFixed(-0.001, 2) == "-0.00")
        #expect(jsToFixed(1234.5678, 1) == "1234.6" && jsToFixed(9.995, 2) == "9.99")
    }
}
