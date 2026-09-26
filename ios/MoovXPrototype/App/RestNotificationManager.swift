import Foundation
import UserNotifications

/// One local alert for the current rest period. No background-audio mode or server is needed.
@MainActor
final class RestNotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = RestNotificationManager()
    private static let requestID = "ch.moovx.rest-complete"
    private let center = UNUserNotificationCenter.current()
    private var revision = 0
    private var operation: Task<Void, Never>?

    private override init() { super.init() }

    func installDelegate() {
        center.delegate = self
    }

    func schedule(at deadline: Date, onUnavailable: @escaping @MainActor () -> Void) {
        revision += 1
        let currentRevision = revision
        let previous = operation
        operation = Task {
            await previous?.value
            guard currentRevision == revision else { return }
            var settings = await center.notificationSettings()
            if settings.authorizationStatus == .notDetermined {
                do { _ = try await center.requestAuthorization(options: [.alert, .sound]) }
                catch { /* Treat a failed permission request as unavailable. */ }
                settings = await center.notificationSettings()
            }
            guard currentRevision == revision else { return }
            guard settings.authorizationStatus == .authorized,
                  settings.soundSetting == .enabled else {
                onUnavailable()
                return
            }
            let seconds = deadline.timeIntervalSinceNow
            guard seconds > 1, seconds <= 30 * 60 else { return }
            let content = UNMutableNotificationContent()
            content.title = "MoovX"
            content.body = NSLocalizedString("restNotificationBody", comment: "Rest timer completion")
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
            let request = UNNotificationRequest(identifier: Self.requestID, content: content, trigger: trigger)
            do { try await center.add(request) }
            catch { if currentRevision == revision { onUnavailable() } }
        }
    }

    func cancel() {
        revision += 1
        let previous = operation
        operation = Task {
            await previous?.value
            center.removePendingNotificationRequests(withIdentifiers: [Self.requestID])
            center.removeDeliveredNotifications(withIdentifiers: [Self.requestID])
        }
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            willPresent notification: UNNotification,
                                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Web Audio owns the foreground cue; the system owns the locked-screen cue.
        completionHandler(notification.request.identifier == "ch.moovx.rest-complete" ? [] : [.banner, .sound])
    }
}
