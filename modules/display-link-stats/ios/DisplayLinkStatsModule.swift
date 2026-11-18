import ExpoModulesCore
import QuartzCore

public final class DisplayLinkStatsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DisplayLinkStats")

    OnCreate {
      DisplayLinkPauseStats.install()
    }

    Function("takeStats") { () -> [String: Double] in
      DisplayLinkPauseStats.take()
    }
  }
}

enum DisplayLinkPauseStats {
  private static let lock = NSLock()
  private static var isInstalled = false
  private static var calls = 0
  private static var mainThreadCalls = 0
  private static var nanoseconds: UInt64 = 0
  private static var mainThreadNanoseconds: UInt64 = 0

  static func install() {
    lock.lock()
    defer { lock.unlock() }

    guard !isInstalled,
      let original = class_getInstanceMethod(CADisplayLink.self, #selector(setter: CADisplayLink.isPaused)),
      let measured = class_getInstanceMethod(CADisplayLink.self, #selector(CADisplayLink.measuredSetPaused(_:)))
    else {
      return
    }

    method_exchangeImplementations(original, measured)
    isInstalled = true
  }

  static func record(duration: UInt64, isMainThread: Bool) {
    lock.lock()
    defer { lock.unlock() }

    calls += 1
    nanoseconds += duration

    if isMainThread {
      mainThreadCalls += 1
      mainThreadNanoseconds += duration
    }
  }

  static func take() -> [String: Double] {
    lock.lock()
    defer { lock.unlock() }

    let stats = [
      "calls": Double(calls),
      "mainThreadCalls": Double(mainThreadCalls),
      "milliseconds": Double(nanoseconds) / 1_000_000,
      "mainThreadMilliseconds": Double(mainThreadNanoseconds) / 1_000_000,
    ]

    calls = 0
    mainThreadCalls = 0
    nanoseconds = 0
    mainThreadNanoseconds = 0

    return stats
  }
}

extension CADisplayLink {
  @objc dynamic func measuredSetPaused(_ paused: Bool) {
    let start = DispatchTime.now().uptimeNanoseconds

    measuredSetPaused(paused)

    let duration = DispatchTime.now().uptimeNanoseconds - start
    DisplayLinkPauseStats.record(duration: duration, isMainThread: Thread.isMainThread)
  }
}
