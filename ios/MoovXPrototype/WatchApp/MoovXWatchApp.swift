import SwiftUI
import WatchKit
import HealthKit

@main
struct MoovXWatchApp: App {
    @WKApplicationDelegateAdaptor(WatchDelegate.self) var delegate
    var body: some Scene { WindowGroup { WatchWorkoutView() } }
}
final class WatchDelegate: NSObject, WKApplicationDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        Task { @MainActor in WatchWorkoutManager.shared.launchedForWorkout() }
    }
    func handleActiveWorkoutRecovery() { Task { @MainActor in _ = WatchWorkoutManager.shared } }
}
struct WatchWorkoutView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var manager = WatchWorkoutManager.shared
    @State private var confirmStop = false
    private let gold = Color(red: 0.9, green: 0.76, blue: 0.35)
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("MoovX").font(.title2.bold()).foregroundStyle(gold)
                Text("watch.strength").font(.headline).multilineTextAlignment(.center)
                if let start = manager.startedAt {
                    Text(start, style: .timer).font(.title.monospacedDigit())
                    HStack {
                        Label(manager.heartRate.map { String(Int($0)) } ?? "—", systemImage: "heart.fill")
                        Text(manager.calories.map { "\(Int($0)) kcal" } ?? "— kcal")
                    }.font(.caption)
                }
                Text(LocalizedStringKey("watch." + manager.status)).font(.caption).multilineTextAlignment(.center)
                if !manager.healthAuthorized && ["idle","permission","expired"].contains(manager.status) {
                    Button("watch.authorize") { Task { await manager.authorize() } }
                        .tint(gold).disabled(manager.authorizing)
                }
                if manager.status == "running" || manager.status == "error" {
                    Button("watch.finish") { confirmStop = true }.tint(gold)
                }
                if manager.status == "interrupted" {
                    Button("watch.acknowledge") { manager.acknowledgeInterruption() }
                }
            }.padding(.horizontal, 4)
        }.background(Color.black)
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { manager.refreshAuthorization() }
        }
        .confirmationDialog("watch.finishQuestion", isPresented: $confirmStop) {
            Button("watch.finish") { manager.stop() }
            Button("watch.discard", role: .destructive) { manager.stop(discard: true) }
        }
    }
}
