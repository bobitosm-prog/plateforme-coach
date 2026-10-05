import XCTest
@testable import MoovXPrototype

final class WatchWorkoutPolicyTests: XCTestCase {
    func testDelayedStartAndMalformedMessagesAreRejected() {
        let now = Date()
        XCTAssertNil(WatchWorkoutCommand(["id":"not-a-uuid","action":"start","issuedAt":now.timeIntervalSince1970]))
        XCTAssertNil(WatchWorkoutCommand(["id":UUID().uuidString,"action":"start","issuedAt":Double.infinity]))
        XCTAssertFalse(WatchWorkoutCommand(id:UUID(),action:.start,issuedAt:now.addingTimeInterval(-121)).canStart(now:now))
        XCTAssertFalse(WatchWorkoutCommand(id:UUID(),action:.start,issuedAt:now.addingTimeInterval(30)).canStart(now:now))
    }
    func testTerminalSessionCannotRestartAfterPersistenceRoundTrip() throws {
        let id = UUID()
        var ledger = WatchWorkoutLedger(activeID:id)
        ledger.finish(id,status:"discarded")
        let restored = try JSONDecoder().decode(WatchWorkoutLedger.self,from:JSONEncoder().encode(ledger))
        XCTAssertFalse(restored.accepts(WatchWorkoutCommand(id:id,action:.start)))
        XCTAssertNil(restored.activeID)
        XCTAssertEqual(restored.terminalStatuses[id.uuidString],"discarded")
    }
    func testDifferentSessionCannotTakeOverOrEndActiveWorkout() {
        let active = UUID(), other = UUID()
        let ledger = WatchWorkoutLedger(activeID:active)
        XCTAssertFalse(ledger.accepts(WatchWorkoutCommand(id:other,action:.start)))
        XCTAssertFalse(ledger.accepts(WatchWorkoutCommand(id:other,action:.finish)))
        XCTAssertTrue(ledger.accepts(WatchWorkoutCommand(id:active,action:.finish)))
    }
    func testCommandRoundTripAndRepeatedCompletionAreIdempotent() {
        let command=WatchWorkoutCommand(id:UUID(),action:.start)
        let restored = WatchWorkoutCommand(command.dictionary)!
        XCTAssertEqual(restored.id, command.id)
        XCTAssertEqual(restored.action, command.action)
        // Date epoch conversion may round sub-microsecond floating-point precision.
        XCTAssertEqual(restored.issuedAt.timeIntervalSince1970, command.issuedAt.timeIntervalSince1970, accuracy: 0.000001)
        var ledger=WatchWorkoutLedger(activeID:command.id)
        ledger.finish(command.id);ledger.finish(command.id)
        XCTAssertEqual(ledger.terminalIDs,[command.id])
    }
}
