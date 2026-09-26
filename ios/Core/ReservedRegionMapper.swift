import UIKit

/// The subset of `UIView.ReservedRegion` we read. UIKit's type has no public
/// initializer, so tests feed fakes through this protocol.
protocol ReservedRegionRepresentable {
  var frame: CGRect { get }
  var margins: UIEdgeInsets { get }
  var isActive: Bool { get }
}

enum ReservedRegionMapper {
  /// Filters inactive regions (unless requested) and orders the result
  /// top-to-bottom, left-to-right so equal states compare equal.
  static func map<Region: ReservedRegionRepresentable>(
    _ regions: [Region],
    includeInactive: Bool
  ) -> [FoldRegion] {
    regions
      .filter { includeInactive || $0.isActive }
      .map { FoldRegion(frame: $0.frame.standardized, margins: $0.margins, isActive: $0.isActive) }
      .sorted { lhs, rhs in
        if lhs.frame.minY != rhs.frame.minY {
          return lhs.frame.minY < rhs.frame.minY
        }
        return lhs.frame.minX < rhs.frame.minX
      }
  }
}
