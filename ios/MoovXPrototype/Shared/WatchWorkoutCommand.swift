import Foundation

/// No account identifiers, exercise names or health samples cross this channel.
struct WatchWorkoutCommand: Codable, Equatable {
    enum Action: String, Codable { case start, finish, discard }
    let id: UUID
    let action: Action
    let issuedAt: Date
    var dictionary: [String: Any] {
        ["id": id.uuidString, "action": action.rawValue, "issuedAt": issuedAt.timeIntervalSince1970]
    }
    init(id: UUID, action: Action, issuedAt: Date = Date()) {
        self.id = id; self.action = action; self.issuedAt = issuedAt
    }
    init?(_ body: [String: Any]) {
        guard let value = body["id"] as? String, let id = UUID(uuidString: value),
              let raw = body["action"] as? String, let action = Action(rawValue: raw),
              let timestamp = body["issuedAt"] as? Double, timestamp.isFinite else { return nil }
        self.init(id: id, action: action, issuedAt: Date(timeIntervalSince1970: timestamp))
    }
    func canStart(now: Date = Date()) -> Bool {
        action == .start && now.timeIntervalSince(issuedAt) >= -10 && now.timeIntervalSince(issuedAt) <= 120
    }
}

/// Terminal IDs are retained: delayed starts and repeated web mounts cannot restart a workout.
struct WatchWorkoutLedger: Codable {
    var activeID: UUID?
    var terminalIDs: [UUID] = []
    var terminalStatuses: [String: String] = [:]
    mutating func finish(_ id: UUID, status: String = "saved") {
        if !terminalIDs.contains(id) { terminalIDs.append(id) }
        terminalStatuses[id.uuidString] = status
        if activeID == id { activeID = nil }
    }
    func accepts(_ command: WatchWorkoutCommand, now: Date = Date()) -> Bool {
        guard !terminalIDs.contains(command.id) else { return false }
        if command.action == .start {
            return (activeID == nil || activeID == command.id) && command.canStart(now: now)
        }
        return activeID == command.id
    }
}
