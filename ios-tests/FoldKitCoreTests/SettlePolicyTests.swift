import Testing

@testable import FoldKitCore

@Suite("Settle policy")
struct SettlePolicyTests {
  private func makePolicy() -> SettlePolicy {
    var policy = SettlePolicy()
    policy.quietPeriod = 0.5
    policy.maxDuration = 3
    return policy
  }

  /// `#expect` evaluates its argument as immutable, so the mutating call
  /// happens here.
  private func continues(_ policy: inout SettlePolicy, at now: Double) -> Bool {
    policy.shouldContinue(at: now)
  }

  @Test("Idle by default")
  func idleByDefault() {
    var policy = makePolicy()
    #expect(!policy.isSettling)
    #expect(!continues(&policy, at: 10))
  }

  @Test("Continues until the quiet period elapses")
  func continuesUntilQuietPeriodElapses() {
    var policy = makePolicy()
    policy.noteActivity(at: 10)
    #expect(continues(&policy, at: 10.2))
    #expect(continues(&policy, at: 10.49))
    #expect(!continues(&policy, at: 10.5))
    #expect(!policy.isSettling)
  }

  /// The rotation case: a late change restarts the quiet period.
  @Test("A change extends settling")
  func changeExtendsSettling() {
    var policy = makePolicy()
    policy.noteActivity(at: 10)
    #expect(continues(&policy, at: 10.3))
    policy.noteActivity(at: 10.3)
    #expect(continues(&policy, at: 10.7))
    #expect(!continues(&policy, at: 10.8))
  }

  @Test("Stops at max duration even if values keep changing")
  func stopsAtMaxDurationEvenIfValuesKeepChanging() {
    var policy = makePolicy()
    policy.noteActivity(at: 10)
    var now = 10.0
    while now < 12.9 {
      now += 0.1
      policy.noteActivity(at: now)
      #expect(continues(&policy, at: now))
    }
    #expect(!continues(&policy, at: 13.0))
  }

  @Test("Starts a new session after stopping")
  func newSessionAfterStop() {
    var policy = makePolicy()
    policy.noteActivity(at: 10)
    #expect(!continues(&policy, at: 20))
    policy.noteActivity(at: 30)
    #expect(policy.isSettling)
    #expect(continues(&policy, at: 30.1))
  }

  @Test("Reset stops settling")
  func resetStopsSettling() {
    var policy = makePolicy()
    policy.noteActivity(at: 10)
    policy.reset()
    #expect(!continues(&policy, at: 10.1))
  }
}
