import HealthKit
import WebKit

/// The journal uses Zurich days, including 23/25-hour daylight-saving days.
struct EnergyDay {
    let start: Date
    let end: Date
    static func parse(_ key: String, now: Date = Date()) -> EnergyDay? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Zurich")!
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        guard key.count == 10, let start = formatter.date(from: key),
              formatter.string(from: start) == key, start <= now else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = formatter.timeZone
        guard let end = calendar.date(byAdding: .day, value: 1, to: start) else { return nil }
        return EnergyDay(start: start, end: min(end, now))
    }
}

@MainActor
final class DailyEnergyBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let health = HKHealthStore()
    private var busy = false
    private var lastRead = Date.distantPast

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == "app.moovx.ch",
              [0,443].contains(message.frameInfo.securityOrigin.port), NavigationPolicy.allows(message.webView?.url),
              UIApplication.shared.applicationState == .active,
              let body = message.body as? [String: String], let action = body["action"],
              ["read","connect","disconnect"].contains(action),
              let account = body["account"].flatMap(UUID.init(uuidString:)),
              let date = body["date"], let day = EnergyDay.parse(date) else {
            replyHandler(nil, "health_unavailable"); return
        }
        guard !busy else { replyHandler(["status":"busy"], nil); return }
        let key = "dailyEnergyEnabled." + account.uuidString
        if action == "disconnect" {
            UserDefaults.standard.removeObject(forKey: key)
            replyHandler(["status":"off"], nil); return
        }
        guard HKHealthStore.isHealthDataAvailable() else { replyHandler(["status":"unsupported"], nil); return }
        guard action == "connect" || UserDefaults.standard.bool(forKey: key) else {
            replyHandler(["status":"off"], nil); return
        }
        guard action == "connect" || Date().timeIntervalSince(lastRead) >= 1 else {
            replyHandler(["status":"busy"], nil); return
        }
        busy = true
        Task {
            defer { busy = false }
            do {
                if action == "connect" {
                    // Completion does not mean read access was granted. A denied read looks like missing data.
                    try await health.requestAuthorization(toShare: [], read: [
                        HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
                        HKObjectType.quantityType(forIdentifier: .basalEnergyBurned)!
                    ])
                    UserDefaults.standard.set(true, forKey: key)
                }
                lastRead = Date()
                async let active = sum(.activeEnergyBurned, day: day)
                async let resting = sum(.basalEnergyBurned, day: day)
                let values = try await (active, resting)
                // No workout totals are added: their energy is already part of active energy.
                replyHandler(["status":"ready", "date":date, "through":Date().timeIntervalSince1970 * 1000,
                              "active":values.0 as Any? ?? NSNull(), "resting":values.1 as Any? ?? NSNull()], nil)
            } catch { replyHandler(["status":"error"], nil) }
        }
    }

    private func sum(_ identifier: HKQuantityTypeIdentifier, day: EnergyDay) async throws -> Double? {
        try await withCheckedThrowingContinuation { continuation in
            var finished = false
            let type = HKObjectType.quantityType(forIdentifier: identifier)!
            let predicate = HKQuery.predicateForSamples(withStart: day.start, end: day.end, options: [.strictStartDate, .strictEndDate])
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, error in
                Task { @MainActor in
                    guard !finished else { return }; finished = true
                    if let error { continuation.resume(throwing: error) }
                    else { continuation.resume(returning: stats?.sumQuantity()?.doubleValue(for: .kilocalorie())) }
                }
            }
            health.execute(query)
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(10))
                guard !finished else { return }; finished = true
                health.stop(query)
                continuation.resume(throwing: URLError(.timedOut))
            }
        }
    }
}
