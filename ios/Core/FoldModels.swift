import UIKit

/// A reserved region in some view's coordinate space. Mirrors `Region` in src/types.ts.
struct FoldRegion: Equatable {
  var frame: CGRect
  var margins: UIEdgeInsets
  var isActive: Bool

  var dictionary: [String: Any] {
    [
      "x": Double(frame.origin.x),
      "y": Double(frame.origin.y),
      "width": Double(frame.width),
      "height": Double(frame.height),
      "isActive": isActive,
      "margins": [
        "top": Double(margins.top),
        "left": Double(margins.left),
        "bottom": Double(margins.bottom),
        "right": Double(margins.right),
      ],
    ]
  }
}

/// Folds and occlusions intersecting a view. Mirrors `ViewRegions` in src/types.ts.
struct ViewRegionsSnapshot: Equatable {
  var folds: [FoldRegion]
  var occlusions: [FoldRegion]

  static let empty = ViewRegionsSnapshot(folds: [], occlusions: [])

  var dictionary: [String: Any] {
    [
      "folds": folds.map(\.dictionary),
      "occlusions": occlusions.map(\.dictionary),
    ]
  }
}

/// Platform-independent copy of `UIHinge.Status` (raw values match UIKit),
/// so the mapping is testable without iOS 27.1.
enum HingeStatus: Int {
  case unknown = 0
  case closed = 1
  case partiallyOpen = 2
  case fullyOpen = 3

  var posture: String {
    switch self {
    case .unknown: return "unknown"
    case .closed: return "folded"
    case .partiallyOpen: return "halfOpened"
    case .fullyOpen: return "flat"
    }
  }
}

struct HingeReading: Equatable {
  var status: HingeStatus
  var angleRadians: Double

  var angleDegrees: Double { angleRadians * 180 / .pi }
}

/// Window-level state. `dictionary` mirrors `NativeFoldState` in src/NativeFoldKit.ts.
struct FoldStateSnapshot: Equatable {
  var hinge: HingeReading?
  var horizontalSizeClass: UIUserInterfaceSizeClass
  var verticalSizeClass: UIUserInterfaceSizeClass
  /// "leading", "trailing" or "none".
  var verticalBarEdge: String
  var regions: ViewRegionsSnapshot

  static let unsupported = FoldStateSnapshot(
    hinge: nil,
    horizontalSizeClass: .unspecified,
    verticalSizeClass: .unspecified,
    verticalBarEdge: "none",
    regions: .empty
  )

  var dictionary: [String: Any] {
    [
      "posture": hinge?.status.posture ?? HingeStatus.unknown.posture,
      "hingeAngle": hinge.map { $0.angleDegrees as Any } ?? NSNull(),
      "horizontalSizeClass": Self.name(of: horizontalSizeClass),
      "verticalSizeClass": Self.name(of: verticalSizeClass),
      "verticalBarEdge": verticalBarEdge,
      "folds": regions.folds.map(\.dictionary),
      "occlusions": regions.occlusions.map(\.dictionary),
    ]
  }

  static func name(of sizeClass: UIUserInterfaceSizeClass) -> String {
    switch sizeClass {
    case .compact: return "compact"
    case .regular: return "regular"
    default: return "unknown"
    }
  }
}
