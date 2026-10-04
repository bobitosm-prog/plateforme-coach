import SwiftUI

@main
struct MoovXPrototypeApp: App {
    init() {
        RestNotificationManager.shared.installDelegate()
        ApplePurchaseManager.shared.start()
#if DEBUG
        // Simulator-only probe: verifies the system delivers a local alert
        // without relying on an authenticated web workout.
        if ProcessInfo.processInfo.arguments.contains("--rest-notification-probe") {
            Task { @MainActor in
                RestNotificationManager.shared.schedule(at: Date().addingTimeInterval(20)) {}
            }
        }
#endif
    }

    var body: some Scene { WindowGroup {
#if STORAGE_PROBE
        StorageProbeView()
#else
        PrototypeBrowser().preferredColorScheme(.dark)
#endif
    } }
}
