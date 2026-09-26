// swift-tools-version:5.9
// Test harness for the RN-independent Swift core in ios/Core. Not used by
// CocoaPods or npm consumers. Run with:
//   yarn test:ios

import PackageDescription

let package = Package(
  name: "FoldKitCore",
  platforms: [.iOS(.v15)],
  products: [
    .library(name: "FoldKitCore", targets: ["FoldKitCore"]),
  ],
  targets: [
    .target(name: "FoldKitCore", path: "ios/Core"),
    .testTarget(
      name: "FoldKitCoreTests",
      dependencies: ["FoldKitCore"],
      path: "ios-tests/FoldKitCoreTests"
    ),
  ]
)
