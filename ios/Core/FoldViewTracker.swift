import UIKit

/// Attaches to a view and reports when anything fold-related may have changed:
/// hinge updates and size-class / vertical-bar trait changes.
///
/// Reserved regions have no change notification in UIKit, so owners also call
/// their update on layout; this tracker covers the non-layout triggers.
@MainActor
final class FoldViewTracker {
  /// Latest hinge reading; `nil` when the hierarchy provides no hinge.
  private(set) var hinge: HingeReading?

  private weak var view: UIView?
  private var hingeInteraction: UIInteraction?
  private var traitRegistration: Any?
  private let onInvalidate: @MainActor () -> Void

  init(view: UIView, onInvalidate: @escaping @MainActor () -> Void) {
    self.view = view
    self.onInvalidate = onInvalidate

    if let interaction = PlatformFoldAPI.makeHingeInteraction(onUpdate: { [weak self] reading in
      guard let self else { return }
      self.hinge = reading
      self.onInvalidate()
    }) {
      view.addInteraction(interaction)
      hingeInteraction = interaction
    }

    if #available(iOS 17.0, *) {
      let traits: [UITrait] =
        [UITraitHorizontalSizeClass.self, UITraitVerticalSizeClass.self]
        + PlatformFoldAPI.verticalBarTraits
      traitRegistration = view.registerForTraitChanges(traits) { [weak self] (_: UIView, _: UITraitCollection) in
        self?.onInvalidate()
      }
    }
  }

  func detach() {
    if let hingeInteraction {
      view?.removeInteraction(hingeInteraction)
    }
    hingeInteraction = nil
    if #available(iOS 17.0, *), let registration = traitRegistration as? UITraitChangeRegistration {
      view?.unregisterForTraitChanges(registration)
    }
    traitRegistration = nil
    hinge = nil
  }
}
