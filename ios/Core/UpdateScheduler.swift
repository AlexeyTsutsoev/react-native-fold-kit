import QuartzCore
import UIKit

/// When to stop re-reading after an invalidation.
///
/// UIKit updates reserved regions *during* transitions (e.g. rotation) without
/// any notification, and layout — our main trigger — happens at the start of
/// the transition. So after every invalidation we keep re-reading until the
/// value has been quiet for `quietPeriod`, but never longer than `maxDuration`.
struct SettlePolicy {
  var quietPeriod: CFTimeInterval = 0.5
  var maxDuration: CFTimeInterval = 3

  private(set) var sessionStart: CFTimeInterval?
  private(set) var lastActivity: CFTimeInterval = 0

  var isSettling: Bool { sessionStart != nil }

  /// An invalidation or an observed change: (re)starts the quiet period.
  mutating func noteActivity(at now: CFTimeInterval) {
    if sessionStart == nil {
      sessionStart = now
    }
    lastActivity = now
  }

  /// Returns `true` if re-reading should continue after a tick at `now`.
  mutating func shouldContinue(at now: CFTimeInterval) -> Bool {
    guard let sessionStart else { return false }
    let isQuiet = now - lastActivity >= quietPeriod
    let isExhausted = now - sessionStart >= maxDuration
    if isQuiet || isExhausted {
      self.sessionStart = nil
      return false
    }
    return true
  }

  mutating func reset() {
    sessionStart = nil
  }
}

/// Runs `action` once per run loop turn after `schedule()` (coalescing bursts
/// of invalidations), then keeps running it on display frames while
/// `SettlePolicy` says values may still be settling. `action` returns `true`
/// when it observed a change.
@MainActor
final class UpdateScheduler {
  private let action: @MainActor () -> Bool
  private var policy = SettlePolicy()
  private var isScheduled = false
  private var displayLink: CADisplayLink?

  init(action: @escaping @MainActor () -> Bool) {
    self.action = action
  }

  func schedule() {
    policy.noteActivity(at: CACurrentMediaTime())
    startDisplayLinkIfNeeded()

    guard !isScheduled else { return }
    isScheduled = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.isScheduled = false
      self.run()
    }
  }

  func cancel() {
    policy.reset()
    stopDisplayLink()
  }

  private func run() {
    if action() {
      policy.noteActivity(at: CACurrentMediaTime())
    }
  }

  fileprivate func tick() {
    run()
    if !policy.shouldContinue(at: CACurrentMediaTime()) {
      stopDisplayLink()
    }
  }

  private func startDisplayLinkIfNeeded() {
    guard displayLink == nil else { return }
    let link = CADisplayLink(target: DisplayLinkTarget(owner: self), selector: #selector(DisplayLinkTarget.tick))
    // Region geometry doesn't need every frame; this keeps settling cheap.
    link.preferredFrameRateRange = CAFrameRateRange(minimum: 10, maximum: 30, preferred: 30)
    link.add(to: .main, forMode: .common)
    displayLink = link
  }

  private func stopDisplayLink() {
    displayLink?.invalidate()
    displayLink = nil
  }
}

/// CADisplayLink retains its target; this breaks the cycle.
private final class DisplayLinkTarget: NSObject {
  private weak var owner: UpdateScheduler?

  init(owner: UpdateScheduler) {
    self.owner = owner
  }

  @objc func tick(_ link: CADisplayLink) {
    MainActor.assumeIsolated {
      guard let owner else {
        link.invalidate()
        return
      }
      owner.tick()
    }
  }
}
