import Foundation

/// Only a finite, near-future deadline from the trusted main frame is accepted.
enum RestTimerMessagePolicy {
    enum Command: Equatable {
        case schedule(Date)
        case cancel
    }

    static func parse(_ body: Any, now: Date = Date()) -> Command? {
        guard let payload = body as? [String: Any], let action = payload["action"] as? String else { return nil }
        if action == "cancel" { return .cancel }
        guard action == "schedule", let milliseconds = payload["deadlineMs"] as? Double,
              milliseconds.isFinite else { return nil }
        let deadline = Date(timeIntervalSince1970: milliseconds / 1000)
        let interval = deadline.timeIntervalSince(now)
        guard interval > 1, interval <= 30 * 60 else { return nil }
        return .schedule(deadline)
    }
}
