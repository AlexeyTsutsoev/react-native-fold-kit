import UIKit

// The only file that touches iOS 27.1 fold APIs.
//
// Two guards are needed:
// - `canImport(UIKit, _version:)` — compile-time: the SDK has the symbols
//   (UIKit 9127.0.85 ships with the iOS 27.1 SDK). Swift has no
//   `__IPHONE_OS_VERSION_MAX_ALLOWED`, and the Swift compiler is the same in
//   Xcode 27.0 and 27.1, so this is the reliable switch.
// - `#available(iOS 27.1, *)` — run-time: the device OS has them.
// Without either, every function returns the "unsupported" value.

#if canImport(UIKit, _version: 9127.0.85)
@available(iOS 27.1, *)
extension UIView.ReservedRegion: ReservedRegionRepresentable {}
#endif

enum PlatformFoldAPI {
  @MainActor
  static func readRegions(in view: UIView, includeInactive: Bool) -> ViewRegionsSnapshot {
    #if canImport(UIKit, _version: 9127.0.85)
    if #available(iOS 27.1, *) {
      // Always query inactive ones too; filtering happens in the mapper.
      let options: UIView.ReservedRegion.QueryOptions = [.includeInactive]
      return ViewRegionsSnapshot(
        folds: ReservedRegionMapper.map(
          view.reservedRegions(kind: .division, options: options),
          includeInactive: includeInactive
        ),
        occlusions: ReservedRegionMapper.map(
          view.reservedRegions(kind: .occlusion, options: options),
          includeInactive: includeInactive
        )
      )
    }
    #endif
    return .empty
  }

  @MainActor
  static func verticalBarEdge(of traits: UITraitCollection) -> String {
    #if canImport(UIKit, _version: 9127.0.85)
    if #available(iOS 27.1, *) {
      switch traits.verticalBarEdge {
      case .leading: return "leading"
      case .trailing: return "trailing"
      default: return "none"
      }
    }
    #endif
    return "none"
  }

  /// Traits whose change can affect `verticalBarEdge`.
  @available(iOS 17.0, *)
  @MainActor
  static var verticalBarTraits: [UITrait] {
    #if canImport(UIKit, _version: 9127.0.85)
    if #available(iOS 27.1, *) {
      return UITraitCollection.systemTraitsAffectingVerticalBarEdge
    }
    #endif
    return []
  }

  /// Returns an interaction reporting hinge updates (`nil` reading = no hinge
  /// in this hierarchy), or `nil` when hinge APIs are unavailable.
  @MainActor
  static func makeHingeInteraction(
    onUpdate: @escaping @MainActor (HingeReading?) -> Void
  ) -> UIInteraction? {
    #if canImport(UIKit, _version: 9127.0.85)
    if #available(iOS 27.1, *) {
      return UIHingeInteraction { _, update in
        let reading = update.hinge.map {
          HingeReading(
            status: HingeStatus(rawValue: $0.status.rawValue) ?? .unknown,
            angleRadians: Double($0.angle)
          )
        }
        onUpdate(reading)
      }
    }
    #endif
    return nil
  }
}
