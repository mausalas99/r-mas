// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "RPlusMac",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "RPlusMac", targets: ["RPlusMac"])],
    dependencies: [
        .package(path: "Vendor/GRDB"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.10.0"),
    ],
    targets: [
        // Argon2 reference implementation (P-H-C, tag 20190702, CC0/Apache-2.0).
        .target(
            name: "CArgon2",
            path: "Sources/CArgon2",
            exclude: ["LICENSE"],
            cSettings: [.unsafeFlags(["-w"])]),
        .target(name: "RPlusCore", dependencies: [
            "CArgon2",
            .product(name: "GRDB", package: "GRDB"),
        ]),
        .executableTarget(name: "RPlusMac", dependencies: [
            "RPlusCore",
            .product(name: "Sparkle", package: "Sparkle"),
        ]),
        .testTarget(name: "RPlusCoreTests", dependencies: ["RPlusCore"]),
    ]
)
