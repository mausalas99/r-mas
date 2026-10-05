import Testing
@testable import RPlusCore

@Suite("JSRegex") struct LabsJSRegexTests {
    @Test func wordBoundaryIsAscii() {
        // ICU \b treats "ñ" as a word char; JS does not.
        #expect(JSRegex(#"\bos\b"#).test("años") == true)   // JS: "ñ" is not \w, so "os" is a word
        #expect(JSRegex(#"\bHb\b"#, "i").test("hb 12") == true)
    }
    @Test func digitsAndSpace() {
        #expect(JSRegex(#"^\d+$"#).test("١٢٣") == false)
        #expect(JSRegex(#"^\s$"#).test("\u{FEFF}") == true)
        #expect(JSRegex(#"^\s$"#).test("\u{0085}") == false)
    }
    @Test func dollarMeansEndOfInput() {
        #expect(JSRegex(#"x$"#).test("x\n") == false)
        #expect(JSRegex(#"x$"#, "m").test("x\ny") == true)
    }
    @Test func classEscapes() {
        #expect(JSRegex(#"^[\w.-]+$"#).test("a-b.c_9") == true)
        #expect(JSRegex(#"^[^\d\s]+$"#).test("abc") == true)
        #expect(JSRegex(#"^[\s\S]+$"#).test("a\nb") == true)
        #expect(JSRegex(#"^[a[b]+$"#).test("a[b") == true)
        #expect(JSRegex(#"^[a&&b]+$"#).test("a&b") == true)
    }
    @Test func groupsAndReplace() {
        let m = JSRegex(#"(Hb)\s+(\d+)(\.\d+)?"#, "i").firstMatch("x HB 12 y")!
        #expect(m[0] == "HB 12" && m[1] == "HB" && m[2] == "12" && m[3] == nil && m.index == 2)
        #expect(JSRegex(#"\s+"#, "g").replace("a  b \n c", with: " ") == "a b c")
        #expect(JSRegex(#"\d"#, "g").replace("a1b2") { String(Int($0.whole)! + 1) } == "a2b3")
    }
    @Test func splitKeepsCaptures() {
        #expect(JSRegex(#"\s*(,)\s*"#).split("a , b,c") == ["a", ",", "b", ",", "c"])
        #expect(JSRegex(#"\t+"#).split("a\t\tb") == ["a", "b"])
        #expect(JSRegex(#"x"#).split("") == [""])
    }
    @Test func emptyClasses() {
        #expect(JSRegex("a[^]b").test("a\nb") == true)
        #expect(JSRegex("a[]b").test("ab") == false)
    }
    @Test func unicodeEscape() {
        #expect(JSRegex(#"[áé]"#).test("é") == true)
    }
}
