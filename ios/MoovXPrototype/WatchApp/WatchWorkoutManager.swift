import Foundation
import HealthKit
import WatchConnectivity
import Combine

@MainActor
final class WatchWorkoutManager: NSObject, ObservableObject, WCSessionDelegate, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    static let shared = WatchWorkoutManager()
    @Published var status = "idle"
    @Published var heartRate: Double?
    @Published var calories: Double?
    @Published var startedAt: Date?
    @Published var authorizing = false
    @Published private(set) var healthAuthorized = false
    private let health = HKHealthStore()
    private let defaults = UserDefaults.standard
    private var workout: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var ready = false
    private var starting = false
    private var finalizing = false
    private var pending: WatchWorkoutCommand?
    private var endAction: WatchWorkoutCommand.Action? {
        get { defaults.string(forKey: "workoutEndAction").flatMap(WatchWorkoutCommand.Action.init(rawValue:)) }
        set { defaults.set(newValue?.rawValue, forKey: "workoutEndAction") }
    }
    private var ledger: WatchWorkoutLedger {
        get { defaults.data(forKey: "workoutLedger").flatMap { try? JSONDecoder().decode(WatchWorkoutLedger.self, from: $0) } ?? WatchWorkoutLedger() }
        set { defaults.set(try? JSONEncoder().encode(newValue), forKey: "workoutLedger") }
    }
    override init() {
        super.init()
        healthAuthorized = health.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
        WCSession.default.delegate = self
        WCSession.default.activate()
#if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--watch-workout-probe") {
            pending = WatchWorkoutCommand(id: UUID(uuidString: "11111111-1111-4111-8111-111111111113")!, action: .start)
        }
#endif
        recover()
    }
    func authorize() async {
        guard !authorizing else { return }
        authorizing = true
        defer { authorizing = false }
        guard HKHealthStore.isHealthDataAvailable() else { status = "error"; return }
        do {
            try await health.requestAuthorization(toShare: [HKObjectType.workoutType()], read: [HKObjectType.quantityType(forIdentifier: .heartRate)!, HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!])
            let permission = health.authorizationStatus(for: HKObjectType.workoutType())
            healthAuthorized = permission == .sharingAuthorized
#if DEBUG
            NSLog("MoovX Watch workout write permission: %ld", permission.rawValue)
#endif
            guard permission == .sharingAuthorized else {
                status = permission == .sharingDenied ? "denied" : "permission"
                return
            }
            status = "idle"
#if DEBUG && targetEnvironment(simulator)
            // The manual simulator permission step may exceed the production command TTL.
            if ProcessInfo.processInfo.arguments.contains("--watch-workout-probe") {
                pending = WatchWorkoutCommand(id: UUID(uuidString: "11111111-1111-4111-8111-111111111113")!, action: .start)
            }
#endif
            if let pending { receive(pending) }
        } catch { status = "permission" }
    }
    func refreshAuthorization() {
        healthAuthorized = health.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
        if healthAuthorized && ["permission", "denied"].contains(status) {
            status = "idle"
            if let pending, pending.canStart() { receive(pending) }
        }
    }
    func launchedForWorkout() {
        if let command = WatchWorkoutCommand(WCSession.default.receivedApplicationContext) { receive(command) }
    }
    private func recover() {
        health.recoverActiveWorkoutSession { [weak self] recovered, _ in
            Task { @MainActor in
                guard let self else { return }
                self.ready = true
                if let recovered, self.ledger.activeID != nil {
                    self.attach(recovered)
                    self.startedAt = recovered.startDate
                    if let action = self.endAction {
                        if recovered.state == .ended { self.finalize(at: Date(), action: action) }
                        else { recovered.end() }
                    } else { self.status = "running"; self.report() }
                } else if self.ledger.activeID != nil {
                    // Do not create a second HKWorkout after an ambiguous save/crash.
                    self.status = "interrupted"; self.report(as: "error")
                }
                if let pending = self.pending { self.receive(pending) }
            }
        }
    }
    private func attach(_ session: HKWorkoutSession) {
        workout = session; session.delegate = self
        let builder = session.associatedWorkoutBuilder()
        self.builder = builder; builder.delegate = self
        builder.dataSource = HKLiveWorkoutDataSource(healthStore: health, workoutConfiguration: session.workoutConfiguration)
    }
    private func receive(_ command: WatchWorkoutCommand) {
        pending = command
        guard ready else { return }
        if ledger.terminalIDs.contains(command.id) {
            if ledger.activeID == nil { status = ledger.terminalStatuses[command.id.uuidString] ?? "error" }
            report(id: command.id, as: ledger.terminalStatuses[command.id.uuidString] ?? "error")
#if DEBUG && targetEnvironment(simulator)
            if ["11111111-1111-4111-8111-111111111113", "11111111-1111-4111-8111-111111111114"].contains(command.id.uuidString) {
                // Query only this synthetic fixture; never enumerate personal workouts.
                let predicate = HKQuery.predicateForObjects(withMetadataKey: HKMetadataKeySyncIdentifier, allowedValues: ["moovx.watch.\(command.id.uuidString)"])
                health.execute(HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                    NSLog("MoovX Watch duplicate probe: count=%ld queryError=%d", samples?.count ?? -1, error != nil)
                })
            }
#endif
            return
        }
        if command.action != .start {
            // Retire even a not-yet-started ID, so delayed starts cannot resurrect it.
            if ledger.activeID == nil { var next = ledger; next.finish(command.id, status: "discarded"); ledger = next; report(id: command.id, as: "discarded"); return }
            guard ledger.activeID == command.id else { report(id: command.id, as: "busy"); return }
            stop(discard: command.action == .discard); return
        }
        if ledger.activeID == command.id { report(); return }
        guard ledger.activeID == nil, !starting else { report(id: command.id, as: "busy"); return }
        guard command.canStart() else { status = "expired"; report(id: command.id, as: "expired"); return }
        let permission = health.authorizationStatus(for: HKObjectType.workoutType())
#if DEBUG
        NSLog("MoovX Watch workout write permission: %ld", permission.rawValue)
#endif
        guard permission == .sharingAuthorized else {
            status = permission == .sharingDenied ? "denied" : "permission"
            report(id: command.id, as: "permission"); return
        }
        starting = true
        Task {
            defer { starting = false }
            do {
                let configuration = HKWorkoutConfiguration()
                configuration.activityType = .traditionalStrengthTraining; configuration.locationType = .indoor
                let session = try HKWorkoutSession(healthStore: health, configuration: configuration)
                var next = ledger; next.activeID = command.id; ledger = next; endAction = nil
                attach(session)
                guard let builder else { throw NSError(domain: "MoovXWatch", code: 1) }
                try await builder.addMetadata([HKMetadataKeySyncIdentifier: "moovx.watch.\(command.id.uuidString)", HKMetadataKeySyncVersion: 1])
                // A finish can arrive while HealthKit is preparing; never start it afterward.
                guard endAction == nil else {
                    endAction = .discard
                    session.end()
                    finalize(at: Date(), action: .discard)
                    return
                }
                let now = Date(); startedAt = now; heartRate = nil; calories = nil
                session.startActivity(with: now)
                try await builder.beginCollection(at: now)
                if endAction != nil { session.end() }
                else { status = "running"; report() }
            } catch {
                status = "error"; report(id: command.id)
                if let workout {
                    endAction = .discard
                    workout.end()
                    finalize(at: Date(), action: .discard)
                }
            }
        }
    }
    func stop(discard: Bool = false) {
        guard ledger.activeID != nil else { return }
        guard !finalizing else { return }
        endAction = discard ? .discard : .finish
        status = "saving"; report()
        // Let pending HealthKit setup finish before ending its collection.
        if starting { return }
        if let workout {
            if workout.state == .ended { finalize(at: Date(), action: endAction!) }
            else { workout.end() }
        } else { status = "interrupted"; report(as: "error") }
    }
    /// Explicit recovery acknowledgement; never recreates or overwrites a HealthKit record.
    func acknowledgeInterruption() {
        guard workout == nil, let id = ledger.activeID else { return }
        var next = ledger; next.finish(id, status: "error"); ledger = next; endAction = nil
        status = "idle"; report(id: id, as: "error")
    }
    private func finalize(at date: Date, action: WatchWorkoutCommand.Action) {
        guard !finalizing, let builder, let id = ledger.activeID else { return }
        finalizing = true; status = "saving"; report()
        Task {
            do {
                if action == .discard { builder.discardWorkout() }
                else {
                    if builder.endDate == nil { try await builder.endCollection(at: date) }
                    _ = try await builder.finishWorkout()
                }
                var next = ledger; next.finish(id, status: action == .discard ? "discarded" : "saved"); ledger = next
                workout = nil; self.builder = nil; endAction = nil; startedAt = nil
                status = action == .discard ? "discarded" : "saved"; report(id: id)
            } catch {
                // Keep the same builder/ID; no new session or second writer on iPhone.
                status = "error"; report()
            }
            finalizing = false
        }
    }
    private func report(id: UUID? = nil, as value: String? = nil) {
        guard let id = id ?? ledger.activeID else { return }
        let payload = ["id": id.uuidString, "status": value ?? status]
        try? WCSession.default.updateApplicationContext(payload)
        if WCSession.default.isReachable { WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: nil) }
    }
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        Task { @MainActor in self.launchedForWorkout() }
    }
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) { handle(context) }
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) { handle(message) }
    private nonisolated func handle(_ body: [String: Any]) {
        guard let command = WatchWorkoutCommand(body) else { return }
        Task { @MainActor in self.receive(command) }
    }
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        Task { @MainActor in
            guard self.workout === workoutSession else { return }
            if toState == .ended { self.finalize(at: date, action: self.endAction ?? .discard) }
        }
    }
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        Task { @MainActor in
            guard self.workout === workoutSession else { return }
            self.status = "error"; self.report()
        }
    }
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        Task { @MainActor in
            if let type = HKObjectType.quantityType(forIdentifier: .heartRate) {
                self.heartRate = workoutBuilder.statistics(for: type)?.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
            }
            if let type = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
                self.calories = workoutBuilder.statistics(for: type)?.sumQuantity()?.doubleValue(for: .kilocalorie())
            }
        }
    }
}
