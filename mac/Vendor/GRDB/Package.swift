// swift-tools-version:6.1
// GRDB v7.11.1 built on SQLite3MultipleCiphers 2.5.1 (SQLite 3.53.4) instead of the system SQLite.
// Same engine as better-sqlite3-multiple-ciphers in Electron, so database files are shared as-is.
// Only this file and Sources/GRDBSQLite differ from upstream GRDB.
import PackageDescription

let package = Package(
    name: "GRDB",
    platforms: [.macOS(.v14)],
    products: [.library(name: "GRDB", targets: ["GRDB"])],
    targets: [
        .target(
            name: "GRDBSQLite",
            path: "Sources/GRDBSQLite",
            cSettings: [
                .define("SQLITE_ENABLE_FTS5"),
                .define("SQLITE_ENABLE_SNAPSHOT"),
                .define("SQLITE_THREADSAFE", to: "1"),
                .define("SQLITE_DQS", to: "0"),
                .unsafeFlags(["-w"]),
            ]),
        .target(
            name: "GRDB",
            dependencies: ["GRDBSQLite"],
            path: "GRDB",
            exclude: ["PrivacyInfo.xcprivacy"],
            swiftSettings: [
                .define("SQLITE_ENABLE_FTS5"),
                .define("SQLITE_ENABLE_SNAPSHOT"),
                .enableUpcomingFeature("MemberImportVisibility"),
            ]),
    ],
    swiftLanguageModes: [.v6]
)
