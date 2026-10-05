import XCTest
@testable import MoovXPrototype

final class DailyEnergyTests: XCTestCase {
    private let now = ISO8601DateFormatter().date(from: "2026-11-01T12:00:00Z")!
    func testDaylightSavingAndJournalTimezone() {
        let spring = EnergyDay.parse("2026-03-29", now: now)!
        let autumn = EnergyDay.parse("2026-10-25", now: now)!
        XCTAssertEqual(spring.end.timeIntervalSince(spring.start), 23 * 3600)
        XCTAssertEqual(autumn.end.timeIntervalSince(autumn.start), 25 * 3600)
        XCTAssertEqual(ISO8601DateFormatter().string(from: autumn.start), "2026-10-24T22:00:00Z")
    }
    func testTodayIsNotProjectedToFullDay() {
        XCTAssertEqual(EnergyDay.parse("2026-11-01", now: now)?.end, now)
    }
    func testRejectsInvalidAndFutureDates() {
        for invalid in ["2026-02-30", "2026-1-01", "2026-11-02", "invalid"] {
            XCTAssertNil(EnergyDay.parse(invalid, now: now))
        }
    }
}
