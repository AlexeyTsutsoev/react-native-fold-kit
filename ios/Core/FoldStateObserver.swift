import UIKit

/// Window-level observer backing the `FoldKit` TurboModule.
///
/// UIKit state is read on the main thread and cached; `currentState()` is
/// called synchronously from the JS thread and only reads the cache.
/// `@unchecked Sendable`: `cachedState` is guarded by `lock`, everything else
/// is only touched on the main thread.
@objc(FKFoldStateObserver)
public final class FoldStateObserver: NSObject, @unchecked Sendable {
  /// Called on the main thread with the new state dictionary.
  @objc public var onChange: (([String: Any]) -> Void)?

  private let lock = NSLock()
  private var cachedState: [String: Any] = FoldStateSnapshot.unsupported.dictionary

  // Main-thread state.
  private var probe: WindowProbeView?
  private var tracker: FoldViewTracker?
  private var lastSnapshot: FoldStateSnapshot?
  private var scheduler: UpdateScheduler?
  private var keyWindowObserver: NSObjectProtocol?

  /// Thread-safe; returns the last computed state (or the unsupported one).
  @objc public func currentState() -> [String: Any] {
    lock.lock()
    defer { lock.unlock() }
    return cachedState
  }

  /// Starts observing. Safe to call from any thread.
  @objc public func start() {
    DispatchQueue.main.async { [weak self] in
      self?.attachToWindow()
    }
  }

  /// Stops observing. Safe to call from any thread.
  @objc public func stop() {
    // Strong capture: the module may release us right after `invalidate`, and
    // the probe must still be removed from the window.
    DispatchQueue.main.async {
      self.detach()
    }
  }

  @MainActor
  private func attachToWindow() {
    if keyWindowObserver == nil {
      // The first window may not exist yet, and the window can be replaced.
      keyWindowObserver = NotificationCenter.default.addObserver(
        forName: UIWindow.didBecomeKeyNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        MainActor.assumeIsolated {
          guard let self, self.probe?.window == nil else { return }
          self.attachToWindow()
        }
      }
    }

    guard probe?.window == nil, let window = Self.findAppWindow() else { return }
    detachProbe()

    let probe = WindowProbeView(frame: window.bounds)
    let scheduler = UpdateScheduler { [weak self] in self?.update() ?? false }
    probe.onLayout = { scheduler.schedule() }
    window.insertSubview(probe, at: 0)

    self.probe = probe
    self.scheduler = scheduler
    tracker = FoldViewTracker(view: probe) { scheduler.schedule() }
    scheduler.schedule()
  }

  @MainActor
  private func detachProbe() {
    tracker?.detach()
    tracker = nil
    probe?.removeFromSuperview()
    probe = nil
    scheduler?.cancel()
    scheduler = nil
  }

  @MainActor
  private func detach() {
    detachProbe()
    if let keyWindowObserver {
      NotificationCenter.default.removeObserver(keyWindowObserver)
    }
    keyWindowObserver = nil
  }

  /// Returns `true` when the state changed.
  @MainActor
  private func update() -> Bool {
    guard let probe, probe.window != nil else { return false }
    let traits = probe.traitCollection
    let snapshot = FoldStateSnapshot(
      hinge: tracker?.hinge,
      horizontalSizeClass: traits.horizontalSizeClass,
      verticalSizeClass: traits.verticalSizeClass,
      verticalBarEdge: PlatformFoldAPI.verticalBarEdge(of: traits),
      regions: PlatformFoldAPI.readRegions(in: probe, includeInactive: false)
    )
    // Always deliver the first computed state: JS may hold only the
    // "unsupported" placeholder returned before the probe was attached.
    guard snapshot != lastSnapshot else { return false }
    lastSnapshot = snapshot

    let state = snapshot.dictionary
    lock.lock()
    cachedState = state
    lock.unlock()
    onChange?(state)
    return true
  }

  @MainActor
  private static func findAppWindow() -> UIWindow? {
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .sorted { rank($0.activationState) < rank($1.activationState) }
    for scene in scenes {
      if let window = scene.windows.first(where: \.isKeyWindow) ?? scene.windows.first {
        return window
      }
    }
    return nil
  }

  private static func rank(_ state: UIScene.ActivationState) -> Int {
    switch state {
    case .foregroundActive: return 0
    case .foregroundInactive: return 1
    case .background: return 2
    default: return 3
    }
  }
}

/// Invisible full-window view: follows window size via autoresizing, so its
/// `layoutSubviews` fires on every window resize, and its coordinate space is
/// the window's.
private final class WindowProbeView: UIView {
  var onLayout: (() -> Void)?

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    backgroundColor = .clear
    autoresizingMask = [.flexibleWidth, .flexibleHeight]
    accessibilityElementsHidden = true
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    onLayout?()
  }
}
