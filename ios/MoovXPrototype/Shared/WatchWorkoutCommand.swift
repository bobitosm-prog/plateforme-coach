import Foundation

/// No account identifiers, exercise names or health samples cross this channel.
struct WatchWorkoutCommand: Codable, Equatable {
    enum Action: String, Codable { case start, finish, discard }
    let id: UUID
    let action: Action
    let issuedAt: Date
    var supersededIDs: [UUID]? = nil
    var dictionary: [String: Any] {
        var body: [String: Any] = ["id": id.uuidString, "action": action.rawValue, "issuedAt": issuedAt.timeIntervalSince1970]
        if let supersededIDs, !supersededIDs.isEmpty { body["supersededIDs"] = supersededIDs.map(\.uuidString) }
        return body
    }
    init(id: UUID, action: Action, issuedAt: Date = Date(), supersededIDs: [UUID] = []) {
        self.id = id; self.action = action; self.issuedAt = issuedAt
        self.supersededIDs = supersededIDs.isEmpty ? nil : supersededIDs
    }
    init?(_ body: [String: Any]) {
        guard let value = body["id"] as? String, let id = UUID(uuidString: value),
              let raw = body["action"] as? String, let action = Action(rawValue: raw),
              let timestamp = body["issuedAt"] as? Double, timestamp.isFinite else { return nil }
        var superseded: [UUID] = []
        if let rawIDs = body["supersededIDs"] {
            guard let strings = rawIDs as? [String] else { return nil }
            superseded = strings.compactMap(UUID.init(uuidString:))
            guard superseded.count == strings.count else { return nil }
        }
        self.init(id: id, action: action, issuedAt: Date(timeIntervalSince1970: timestamp), supersededIDs: superseded)
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
    /// Retire a request that never started only when no session needs recovery.
    mutating func reconcileInactive(_ id: UUID) -> String {
        guard activeID == nil else { return "busy" }
        if terminalIDs.contains(id) { return terminalStatuses[id.uuidString] ?? "error" }
        finish(id, status: "discarded")
        return "discarded"
    }
    /// Only the Watch may retire old requests, after recovery confirms no live workout.
    mutating func retireSupersededRequests(for command: WatchWorkoutCommand, now: Date = Date()) {
        guard activeID == nil, command.action != .start || accepts(command, now: now) else { return }
        for oldID in command.supersededIDs ?? [] where oldID != command.id && !terminalIDs.contains(oldID) {
            finish(oldID, status: "discarded")
        }
    }
    func accepts(_ command: WatchWorkoutCommand, now: Date = Date()) -> Bool {
        guard !terminalIDs.contains(command.id) else { return false }
        if command.action == .start {
            return (activeID == nil || activeID == command.id) && command.canStart(now: now)
        }
        return activeID == command.id
    }
}
