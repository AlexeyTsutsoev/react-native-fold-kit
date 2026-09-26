import Testing
import UIKit

@testable import FoldKitCore

@Suite("Fold models")
struct FoldModelsTests {
  @Test(
    "Hinge status maps to posture",
    arguments: [
      (HingeStatus.unknown, "unknown"),
      (.closed, "folded"),
      (.partiallyOpen, "halfOpened"),
      (.fullyOpen, "flat"),
    ]
  )
  func hingeStatusMapsToPosture(status: HingeStatus, posture: String) {
    #expect(status.posture == posture)
  }

  #if canImport(UIKit, _version: 9127.0.85)
  @available(iOS 27.1, *)
  @Test("Hinge status raw values match UIKit")
  func hingeStatusRawValuesMatchUIKit() {
    #expect(HingeStatus(rawValue: UIHinge.Status.unknown.rawValue) == .unknown)
    #expect(HingeStatus(rawValue: UIHinge.Status.closed.rawValue) == .closed)
    #expect(HingeStatus(rawValue: UIHinge.Status.partiallyOpen.rawValue) == .partiallyOpen)
    #expect(HingeStatus(rawValue: UIHinge.Status.fullyOpen.rawValue) == .fullyOpen)
  }
  #endif

  @Test(
    "Hinge angle is converted to degrees",
    arguments: [(Double.pi, 180), (Double.pi / 2, 90), (0, 0)] as [(Double, Double)]
  )
  func hingeAngleIsConvertedToDegrees(radians: Double, degrees: Double) {
    let reading = HingeReading(status: .partiallyOpen, angleRadians: radians)
    #expect(abs(reading.angleDegrees - degrees) < 1e-9)
  }

  @Test("Hinge angle is rounded to 0.1° like on Android")
  func hingeAngleIsRounded() {
    let noisy = HingeReading(status: .partiallyOpen, angleRadians: 95.04 * .pi / 180)
    let slightlyDifferent = HingeReading(status: .partiallyOpen, angleRadians: 95.01 * .pi / 180)
    #expect(noisy.angleDegrees == 95.0)
    // Sub-0.1° noise produces equal readings, hence no new event.
    #expect(noisy == slightlyDifferent)
    #expect(HingeReading(status: .partiallyOpen, angleRadians: 95.06 * .pi / 180).angleDegrees == 95.1)
  }

  @Test("Region dictionary")
  func regionDictionary() {
    let region = FoldRegion(
      frame: CGRect(x: 1, y: 2, width: 3, height: 4),
      margins: UIEdgeInsets(top: 5, left: 6, bottom: 7, right: 8),
      isActive: true
    )
    #expect(
      region.dictionary as NSDictionary == [
        "x": 1.0, "y": 2.0, "width": 3.0, "height": 4.0,
        "isActive": true,
        "margins": ["top": 5.0, "left": 6.0, "bottom": 7.0, "right": 8.0],
      ] as NSDictionary
    )
  }

  /// Keys must match `NativeFoldState` in src/NativeFoldKit.ts.
  @Test("Unsupported state matches the JS contract")
  func unsupportedStateMatchesJSContract() throws {
    let dict = FoldStateSnapshot.unsupported.dictionary
    #expect(
      Set(dict.keys) == [
        "posture", "hingeAngle", "horizontalSizeClass", "verticalSizeClass",
        "verticalBarEdge", "folds", "occlusions",
      ]
    )
    #expect(dict["posture"] as? String == "unknown")
    #expect(dict["hingeAngle"] is NSNull)
    #expect(dict["horizontalSizeClass"] as? String == "unknown")
    #expect(dict["verticalSizeClass"] as? String == "unknown")
    #expect(dict["verticalBarEdge"] as? String == "none")
    #expect(try #require(dict["folds"] as? [Any]).isEmpty)
    #expect(try #require(dict["occlusions"] as? [Any]).isEmpty)
  }

  @Test("State dictionary with a hinge")
  func stateDictionaryWithHinge() throws {
    var snapshot = FoldStateSnapshot.unsupported
    snapshot.hinge = HingeReading(status: .partiallyOpen, angleRadians: .pi / 2)
    snapshot.horizontalSizeClass = .regular
    snapshot.verticalSizeClass = .compact
    snapshot.verticalBarEdge = "leading"

    let dict = snapshot.dictionary
    #expect(dict["posture"] as? String == "halfOpened")
    let angle = try #require(dict["hingeAngle"] as? Double)
    #expect(abs(angle - 90) < 1e-9)
    #expect(dict["horizontalSizeClass"] as? String == "regular")
    #expect(dict["verticalSizeClass"] as? String == "compact")
    #expect(dict["verticalBarEdge"] as? String == "leading")
  }

  /// Keys must match `NativeRegionsChangeEvent` in src/FoldAwareViewNativeComponent.ts.
  @Test("View regions dictionary keys")
  func viewRegionsDictionaryKeys() {
    #expect(Set(ViewRegionsSnapshot.empty.dictionary.keys) == ["folds", "occlusions"])
  }
}
