import HealthKit
import WatchConnectivity
import WebKit

@MainActor
final class PhoneWatchWorkout: NSObject, WCSessionDelegate {
    static let shared = PhoneWatchWorkout()
    private let store = HKHealthStore()
    private let defaults = UserDefaults.standard
    private var launching = false
    private var status: String {
        get { defaults.string(forKey: "watchWorkoutStatus") ?? "idle" }
        set { defaults.set(newValue, forKey: "watchWorkoutStatus") }
    }
    private var acknowledgedID: UUID? {
        get { defaults.string(forKey: "watchWorkoutAcknowledgedID").flatMap(UUID.init(uuidString:)) }
        set { defaults.set(newValue?.uuidString, forKey: "watchWorkoutAcknowledgedID") }
    }
    private var command: WatchWorkoutCommand? {
        get { defaults.data(forKey: "watchWorkoutCommand").flatMap { try? JSONDecoder().decode(WatchWorkoutCommand.self, from: $0) } }
        set { defaults.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: "watchWorkoutCommand") }
    }
    override init() {
        super.init()
        if WCSession.isSupported() { WCSession.default.delegate = self; WCSession.default.activate() }
    }
    func handle(action: String, id: UUID) async -> [String: Any] {
        let enabled = defaults.bool(forKey: "watchWorkoutEnabled")
        if action == "enable" { defaults.set(true, forKey: "watchWorkoutEnabled") }
        if action == "disable" {
            defaults.set(false, forKey: "watchWorkoutEnabled")
            // Disabling never silently discards an already running workout.
            if command?.id == id && command?.action == .start { send(WatchWorkoutCommand(id: id, action: .finish)) }
            return result(id)
        }
        if action == "finish" || action == "discard" {
            if command?.id == id { send(WatchWorkoutCommand(id: id, action: action == "finish" ? .finish : .discard)) }
            return result(id)
        }
        guard enabled || action == "enable" else { return result(id) }
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
            status = "unavailable"; return result(id)
        }
        guard WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else {
            status = "install"; return result(id)
        }
        if action == "status" { return result(id) }
        if let current = command, current.id == id {
            if current.action != .start || acknowledgedID == id && ["running","saved","discarded","saving"].contains(status) { return result(id) }
            if action != "enable" { return result(id) } // No automatic relaunch on reload.
        }
        if let current = command, current.id != id, status != "saved", status != "discarded" {
            return result(id) // Preserve the real state of the other workout.
        }
        guard !launching else { return result(id) }
        launching = true
        defer { launching = false }
        send(WatchWorkoutCommand(id: id, action: .start))
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining
        configuration.locationType = .indoor
        do { try await store.startWatchApp(toHandle: configuration) }
        catch { status = "unavailable" }
        return result(id)
    }
    private func result(_ id: UUID) -> [String: Any] {
        ["enabled": defaults.bool(forKey: "watchWorkoutEnabled"),
         "status": command?.id == id || command == nil ? status : "busy"]
    }
    private func send(_ next: WatchWorkoutCommand) {
        command = next; status = "pending"; acknowledgedID = nil
        transmit()
    }
    private func transmit() {
        guard let command, WCSession.default.activationState == .activated else { return }
        do { try WCSession.default.updateApplicationContext(command.dictionary) }
        catch { status = "unavailable"; return }
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(command.dictionary, replyHandler: nil, errorHandler: nil)
        }
    }
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        receive(session.receivedApplicationContext)
        Task { @MainActor in
            self.transmit()
#if DEBUG && targetEnvironment(simulator)
            let args = ProcessInfo.processInfo.arguments
            if args.contains("--watch-start-probe") || args.contains("--watch-finish-probe") {
                let id = UUID(uuidString: "11111111-1111-4111-8111-111111111114")!
                let result = await self.handle(action: args.contains("--watch-finish-probe") ? "finish" : "enable", id: id)
                NSLog("MoovX Watch phone probe: paired=%d installed=%d reachable=%d status=%@",
                      session.isPaired, session.isWatchAppInstalled, session.isReachable, result["status"] as? String ?? "unknown")
            }
#endif
        }
    }
    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}
    nonisolated func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) { receive(context) }
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) { receive(message) }
    private nonisolated func receive(_ payload: [String: Any]) {
        guard let raw = payload["id"] as? String, let id = UUID(uuidString: raw),
              let value = payload["status"] as? String,
              ["running","saved","discarded","saving","permission","busy","expired","error"].contains(value) else { return }
        Task { @MainActor in
            guard self.command?.id == id else { return }
            // Never let a late running acknowledgement overwrite a stop command.
            if self.command?.action != .start && value == "running" { self.transmit(); return }
            self.acknowledgedID = id; self.status = value
        }
    }
}

@MainActor
final class WatchWorkoutBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == "app.moovx.ch",
              [0,443].contains(message.frameInfo.securityOrigin.port), NavigationPolicy.allows(message.webView?.url),
              UIApplication.shared.applicationState == .active,
              let body = message.body as? [String: String], let action = body["action"],
              ["sync","status","enable","disable","finish","discard"].contains(action),
              let raw = body["id"], let id = UUID(uuidString: raw) else {
            replyHandler(nil,"watch_unavailable"); return
        }
        Task { replyHandler(await PhoneWatchWorkout.shared.handle(action: action, id: id), nil) }
    }
}
