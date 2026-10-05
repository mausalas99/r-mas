import Compression
import Foundation

public struct ZipEntry: Sendable, Equatable {
    public var name: String
    public var data: Data
    public init(name: String, data: Data) {
        self.name = name
        self.data = data
    }
}

public enum ZipError: Error, CustomStringConvertible {
    case notZip
    case unsupported(String)
    case corrupt(String)

    public var description: String {
        switch self {
        case .notZip: "No es un archivo zip."
        case .unsupported(let s): "Zip no soportado: \(s)"
        case .corrupt(let s): "Zip dañado: \(s)"
        }
    }
}

/// Minimal zip reader and writer for .docx files. No dependency: the Compression framework
/// does raw deflate (RFC 1951), which is what the zip format stores. No Zip64, no encryption.
public enum ZipArchive {
    // MARK: Read

    /// Files of the archive in central-directory order. Folder entries are skipped.
    public static func read(_ zip: Data) throws -> [ZipEntry] {
        let b = [UInt8](zip)
        guard let eocd = findEOCD(b) else { throw ZipError.notZip }
        let count = u16(b, eocd + 10)
        var p = u32(b, eocd + 16)
        var out: [ZipEntry] = []
        for _ in 0..<count {
            guard p + 46 <= b.count, u32(b, p) == 0x0201_4b50 else { throw ZipError.corrupt("central directory") }
            let flags = u16(b, p + 8)
            let method = u16(b, p + 10)
            let crc = UInt32(truncatingIfNeeded: u32(b, p + 16))
            let csize = u32(b, p + 20)
            let usize = u32(b, p + 24)
            let nlen = u16(b, p + 28), elen = u16(b, p + 30), clen = u16(b, p + 32)
            let lho = u32(b, p + 42)
            guard p + 46 + nlen <= b.count else { throw ZipError.corrupt("name") }
            let name = String(decoding: b[(p + 46)..<(p + 46 + nlen)], as: UTF8.self)
            p += 46 + nlen + elen + clen
            if flags & 1 != 0 { throw ZipError.unsupported("encrypted entry \(name)") }
            if csize == 0xFFFF_FFFF || usize == 0xFFFF_FFFF || lho == 0xFFFF_FFFF { throw ZipError.unsupported("Zip64") }
            if name.hasSuffix("/") { continue }
            guard lho + 30 <= b.count, u32(b, lho) == 0x0403_4b50 else { throw ZipError.corrupt("local header of \(name)") }
            let start = lho + 30 + u16(b, lho + 26) + u16(b, lho + 28)
            guard start + csize <= b.count else { throw ZipError.corrupt("data of \(name)") }
            let raw = b[start..<(start + csize)]
            let bytes: [UInt8]
            switch method {
            case 0: bytes = Array(raw)
            case 8:
                guard let inflated = inflate(raw, size: usize) else { throw ZipError.corrupt("deflate of \(name)") }
                bytes = inflated
            default: throw ZipError.unsupported("method \(method) in \(name)")
            }
            guard bytes.count == usize, crc32(bytes) == crc else { throw ZipError.corrupt("checksum of \(name)") }
            out.append(ZipEntry(name: name, data: Data(bytes)))
        }
        return out
    }

    // MARK: Write

    /// Deflates each file, or stores it when deflate does not help. Fixed 1980-01-01 time stamp,
    /// so the same input always gives the same bytes.
    public static func write(_ entries: [ZipEntry]) -> Data {
        var out: [UInt8] = []
        var central: [UInt8] = []
        for e in entries {
            let name = Array(e.name.utf8)
            let raw = [UInt8](e.data)
            let crc = crc32(raw)
            let packed = deflate(raw)
            let method = packed == nil ? 0 : 8
            let body = packed ?? raw
            let offset = out.count
            out.le32(0x0403_4b50); out.le16(20); out.le16(0x0800); out.le16(method)
            out.le16(0); out.le16(0x21); out.le32(Int(crc)); out.le32(body.count); out.le32(raw.count)
            out.le16(name.count); out.le16(0)
            out += name
            out += body
            central.le32(0x0201_4b50); central.le16(20); central.le16(20); central.le16(0x0800); central.le16(method)
            central.le16(0); central.le16(0x21); central.le32(Int(crc)); central.le32(body.count); central.le32(raw.count)
            central.le16(name.count); central.le16(0); central.le16(0); central.le16(0); central.le16(0)
            central.le32(0); central.le32(offset)
            central += name
        }
        let cdOffset = out.count
        out += central
        out.le32(0x0605_4b50); out.le16(0); out.le16(0); out.le16(entries.count); out.le16(entries.count)
        out.le32(central.count); out.le32(cdOffset); out.le16(0)
        return Data(out)
    }

    // MARK: Internals

    private static func findEOCD(_ b: [UInt8]) -> Int? {
        guard b.count >= 22 else { return nil }
        var i = b.count - 22
        let stop = max(0, b.count - 22 - 0xFFFF)
        while i >= stop {
            if b[i] == 0x50, b[i + 1] == 0x4b, b[i + 2] == 5, b[i + 3] == 6 { return i }
            i -= 1
        }
        return nil
    }

    private static func u16(_ b: [UInt8], _ i: Int) -> Int { Int(b[i]) | Int(b[i + 1]) << 8 }
    private static func u32(_ b: [UInt8], _ i: Int) -> Int { u16(b, i) | u16(b, i + 2) << 16 }

    private static func inflate(_ src: ArraySlice<UInt8>, size: Int) -> [UInt8]? {
        if size == 0 { return [] }
        var dst = [UInt8](repeating: 0, count: size)
        let n = src.withUnsafeBufferPointer { s in
            dst.withUnsafeMutableBufferPointer { d in
                compression_decode_buffer(d.baseAddress!, size, s.baseAddress!, s.count, nil, COMPRESSION_ZLIB)
            }
        }
        return n == size ? dst : nil
    }

    /// nil when empty or when deflate is not smaller than the input.
    private static func deflate(_ src: [UInt8]) -> [UInt8]? {
        if src.isEmpty { return nil }
        var dst = [UInt8](repeating: 0, count: src.count)
        let n = src.withUnsafeBufferPointer { s in
            dst.withUnsafeMutableBufferPointer { d in
                compression_encode_buffer(d.baseAddress!, d.count, s.baseAddress!, s.count, nil, COMPRESSION_ZLIB)
            }
        }
        return n == 0 ? nil : Array(dst[0..<n])
    }

    private static let crcTable: [UInt32] = (0..<256).map { n in
        var c = UInt32(n)
        for _ in 0..<8 { c = c & 1 != 0 ? 0xEDB8_8320 ^ (c >> 1) : c >> 1 }
        return c
    }

    static func crc32(_ bytes: [UInt8]) -> UInt32 {
        var c: UInt32 = 0xFFFF_FFFF
        for x in bytes { c = crcTable[Int((c ^ UInt32(x)) & 0xFF)] ^ (c >> 8) }
        return c ^ 0xFFFF_FFFF
    }
}

private extension Array where Element == UInt8 {
    mutating func le16(_ v: Int) { append(UInt8(v & 0xFF)); append(UInt8((v >> 8) & 0xFF)) }
    mutating func le32(_ v: Int) { le16(v & 0xFFFF); le16((v >> 16) & 0xFFFF) }
}
