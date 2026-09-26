import UIKit

/// View-level observer backing `<FoldAwareView>`: reports folds and occlusions
/// intersecting the view, in its coordinate space.
///
/// The owning view forwards `setNeedsUpdate()` from layout, window and
/// layout-metrics changes; hinge and trait changes are tracked here.
@objc(FKFoldRegionsObserver)
@MainActor
public final class FoldRegionsObserver: NSObject {
  /// Delivers the regions dictionary. Return `false` if it could not be
  /// delivered (e.g. no event emitter yet) so the same state is retried.
  @objc public var onChange: (([String: Any]) -> Bool)?

  @objc public var includeInactive = false {
    didSet {
      if oldValue != includeInactive {
        setNeedsUpdate()
      }
    }
  }

  private weak var view: UIView?
  private var tracker: FoldViewTracker?
  private var lastDelivered: ViewRegionsSnapshot?
  private lazy var scheduler = UpdateScheduler { [weak self] in self?.update() ?? false }

  @objc public init(view: UIView) {
    self.view = view
    super.init()
    tracker = FoldViewTracker(view: view) { [weak self] in self?.setNeedsUpdate() }
  }

  @objc public func setNeedsUpdate() {
    scheduler.schedule()
  }

  /// Forget the last delivered state, e.g. when a view is recycled, so the
  /// next update is delivered even if regions did not change.
  @objc public func reset() {
    lastDelivered = nil
  }

  /// Returns `true` when a changed state was delivered.
  private func update() -> Bool {
    guard let view, view.window != nil else { return false }
    let snapshot = PlatformFoldAPI.readRegions(in: view, includeInactive: includeInactive)
    guard snapshot != lastDelivered, onChange?(snapshot.dictionary) == true else { return false }
    lastDelivered = snapshot
    return true
  }
}
