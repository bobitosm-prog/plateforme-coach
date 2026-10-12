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

    func testSeparateBackgroundInterruptionsRecoverSilentlyAfterSuccessfulLoads() {
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

            activity = .active
            coordinator.recoverIfNeeded()
            XCTAssertEqual(web.reloads, expectedReloads)
            coordinator.webView(web, didFinish: nil)
            XCTAssertFalse(state.loading)
            XCTAssertNil(state.error)
            coordinator.recoverIfNeeded()
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
    }

    func testForegroundInterruptionStillRequiresExplicitRetry() {
        let state = BrowserState()
        let coordinator = PrototypeWebView.Coordinator(state: state, applicationState: { .active })
        let web = RecoveryWebView()
        coordinator.webViewWebContentProcessDidTerminate(web)
        coordinator.recoverIfNeeded()
        XCTAssertEqual(web.reloads, 0)
        XCTAssertNotNil(state.error)
    }
}
