import XCTest
import WebKit
@testable import MoovXPrototype

@MainActor
final class BrowserRecoveryTests: XCTestCase {
    private final class RecoveryWebView: WKWebView {
        var reloads = 0
        var loads = 0
        override func reload() -> WKNavigation? { reloads += 1; return nil }
        override func load(_ request: URLRequest) -> WKNavigation? { loads += 1; return nil }
    }

    func testSeparateBackgroundInterruptionsRecoverAfterSuccessfulLoads() {
        let state = BrowserState()
        var activity = UIApplication.State.background
        let coordinator = PrototypeWebView.Coordinator(state: state, applicationState: { activity })
        let web = RecoveryWebView()
        coordinator.observeCameraPermission(on: web)
        defer {
            coordinator.stopObservingCameraPermission()
            coordinator.stopObservingWorkoutScreenAwake()
        }

        for expectedReloads in 1...3 {
            activity = .background
            coordinator.webViewWebContentProcessDidTerminate(web)
            coordinator.recoverIfNeeded()
            XCTAssertEqual(web.reloads, expectedReloads - 1, "Never reload in background")
            XCTAssertNil(state.error)
            XCTAssertFalse(state.recovered)

            activity = .active
            coordinator.recoverIfNeeded()
            XCTAssertEqual(web.reloads, expectedReloads)
            XCTAssertFalse(state.recovered, "Do not claim recovery before load completes")
            coordinator.webView(web, didFinish: nil)
            XCTAssertTrue(state.recovered)
            XCTAssertFalse(state.loading)
            XCTAssertNil(state.error)
            state.recovered = false // The notice can be acknowledged.
            coordinator.recoverIfNeeded()
            XCTAssertFalse(state.recovered, "An ordinary return must not recreate a stale notice")
            XCTAssertEqual(web.reloads, expectedReloads)
        }
    }

    func testInterruptedRecoveryDoesNotLoop() {
        let state = BrowserState()
        var activity = UIApplication.State.background
        let coordinator = PrototypeWebView.Coordinator(state: state, applicationState: { activity })
        let web = RecoveryWebView()
        coordinator.observeCameraPermission(on: web)
        defer {
            coordinator.stopObservingCameraPermission()
            coordinator.stopObservingWorkoutScreenAwake()
        }
        coordinator.webViewWebContentProcessDidTerminate(web)
        activity = .active
        coordinator.recoverIfNeeded()
        activity = .background
        coordinator.webViewWebContentProcessDidTerminate(web)
        activity = .active
        coordinator.recoverIfNeeded()
        XCTAssertEqual(web.reloads, 1)
        XCTAssertNotNil(state.error)
        XCTAssertFalse(state.recovered)
    }

    func testForegroundInterruptionStillRequiresExplicitRetry() {
        let state = BrowserState()
        let coordinator = PrototypeWebView.Coordinator(state: state, applicationState: { .active })
        let web = RecoveryWebView()
        coordinator.webViewWebContentProcessDidTerminate(web)
        coordinator.recoverIfNeeded()
        XCTAssertEqual(web.reloads, 0)
        XCTAssertNotNil(state.error)
        XCTAssertFalse(state.recovered)
    }
}
