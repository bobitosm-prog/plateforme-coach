import SwiftUI
import WebKit
import Combine
import AVFoundation
import OSLog

@MainActor
final class BrowserState: ObservableObject {
    @Published var loading = true
    @Published var error: String?
    @Published var blocked = false
    @Published var cameraDenied = false
    @Published var notificationUnavailable = false
    @Published var reloadID = 0
    @Published var recovered = false
}

struct PrototypeBrowser: View {
    @StateObject private var state = BrowserState()

    var body: some View {
            VStack(spacing: 0) {
                if state.recovered {
                    HStack {
                        Text(NSLocalizedString("browserRecovered", comment: "Recovery notice")).font(.caption)
                        Spacer(minLength: 8)
                        Button { state.recovered = false } label: {
                            Image(systemName: "xmark").frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(NSLocalizedString("browserDismissRecovery", comment: "Dismiss recovery notice"))
                    }.padding(.horizontal, 8)
                }
                if state.loading { ProgressView(NSLocalizedString("browserLoading", comment: "Loading state")).padding() }
                if let error = state.error {
                    ContentUnavailableView {
                        Label(NSLocalizedString("browserInterrupted", comment: "Loading error"), systemImage: "wifi.exclamationmark")
                    } description: { Text(error) } actions: {
                        Button(NSLocalizedString("browserRetry", comment: "Retry loading")) {
                            state.error = nil
                            state.recovered = false
                            state.loading = true
                            state.reloadID += 1
                        }
                    }
                } else {
                    PrototypeWebView(state: state).id(state.reloadID)
                        .alert(NSLocalizedString("browserNavigationBlocked", comment: "Blocked external navigation"), isPresented: $state.blocked) {
                            Button(NSLocalizedString("browserUnderstood", comment: "Dismiss navigation alert"), role: .cancel) {}
                        } message: {
                            Text(NSLocalizedString("browserNavigationMessage", comment: "External navigation explanation"))
                        }
                }
            }
            .background(Color(red: 0.045, green: 0.04, blue: 0.025))
            .alert(NSLocalizedString("cameraDeniedTitle", comment: "Camera access denied title"), isPresented: $state.cameraDenied) {
                Button(NSLocalizedString("cameraSettings", comment: "Open app settings")) {
                    guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                    UIApplication.shared.open(url)
                }
                Button(NSLocalizedString("cameraCancel", comment: "Dismiss camera alert"), role: .cancel) {}
            } message: {
                Text(NSLocalizedString("cameraDeniedMessage", comment: "How to enable camera access"))
            }
            .alert(NSLocalizedString("restNotificationDeniedTitle", comment: "Rest notification unavailable"), isPresented: $state.notificationUnavailable) {
                Button(NSLocalizedString("cameraSettings", comment: "Open app settings")) {
                    guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                    UIApplication.shared.open(url)
                }
                Button(NSLocalizedString("cameraCancel", comment: "Dismiss alert"), role: .cancel) {}
            } message: {
                Text(NSLocalizedString("restNotificationDeniedMessage", comment: "How to allow locked-screen rest alerts"))
            }
    }
}

struct PrototypeWebView: UIViewRepresentable {
    @ObservedObject var state: BrowserState

    func makeCoordinator() -> Coordinator { Coordinator(state: state) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        MobileViewport.configure(configuration)
        let denied = Self.cameraAccessDenied
        let script = """
        (() => {
          window.__moovxCameraDenied = \(denied ? "true" : "false");
          document.addEventListener('click', event => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.hasAttribute('capture')) return;
            if (!window.__moovxCameraDenied) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            window.webkit.messageHandlers.moovxCameraDenied.postMessage(true);
          }, true);
        })();
        """
        configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        configuration.userContentController.add(context.coordinator, name: "moovxCameraDenied")
        configuration.userContentController.add(context.coordinator, name: "moovxWorkoutActive")
        configuration.userContentController.add(context.coordinator, name: "moovxRestTimer")
        configuration.userContentController.addScriptMessageHandler(context.coordinator.dailyEnergy, contentWorld: .page, name: "moovxDailyEnergy")
        configuration.userContentController.addScriptMessageHandler(context.coordinator.watchWorkout, contentWorld: .page, name: "moovxWatchWorkout")
        configuration.userContentController.addScriptMessageHandler(context.coordinator.applePurchases, contentWorld: .page, name: "moovxApplePurchases")
        configuration.userContentController.addScriptMessageHandler(context.coordinator.appleAuth, contentWorld: .page, name: "moovxAppleAuth")
        // Separate app sandbox; Apple credentials return only to their requesting document.
        configuration.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = UIColor(red: 0.045, green: 0.04, blue: 0.025, alpha: 1)
        view.scrollView.backgroundColor = view.backgroundColor
        view.navigationDelegate = context.coordinator
        context.coordinator.observeCameraPermission(on: view)
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: NavigationPolicy.entryURL))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.stopLoading()
        uiView.navigationDelegate = nil
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "moovxCameraDenied")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "moovxWorkoutActive")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "moovxRestTimer")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "moovxWatchWorkout", contentWorld: .page)
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "moovxDailyEnergy", contentWorld: .page)
        coordinator.applePurchases.cancel()
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "moovxApplePurchases", contentWorld: .page)
        coordinator.appleAuth.cancel()
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "moovxAppleAuth", contentWorld: .page)
        coordinator.stopObservingCameraPermission()
        coordinator.stopObservingWorkoutScreenAwake()
    }

    private static var cameraAccessDenied: Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        return status == .denied || status == .restricted
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private let logger = Logger(subsystem: "ch.moovx.app", category: "WebRecovery")
        let state: BrowserState
        let watchWorkout = WatchWorkoutBridge()
        let dailyEnergy = DailyEnergyBridge()
        let appleAuth = AppleSignInBridge()
        let applePurchases = ApplePurchaseBridge()
        private var purchaseObserver: NSObjectProtocol?
        private weak var webView: WKWebView?
        private var cameraObserver: NSObjectProtocol?
        private var inactiveObserver: NSObjectProtocol?
        private var workoutActive = false
        private var recoveryPending = false
        private var automaticRecoveryUsed = false
        private let applicationState: () -> UIApplication.State
        init(state: BrowserState, applicationState: @escaping () -> UIApplication.State = { UIApplication.shared.applicationState }) {
            self.state = state
            self.applicationState = applicationState
        }

        func observeCameraPermission(on webView: WKWebView) {
            self.webView = webView
            purchaseObserver = NotificationCenter.default.addObserver(forName: ApplePurchaseManager.changed, object: nil, queue: .main) { [weak self] _ in
                guard let view = self?.webView, NavigationPolicy.allows(view.url) else { return }
                view.evaluateJavaScript("window.dispatchEvent(new Event('moovx:apple-transactions-available'))")
            }
            cameraObserver = NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
                self?.recoverIfNeeded()
                self?.refreshCameraPermission()
                self?.refreshWorkoutScreenAwake()
            }
            inactiveObserver = NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { _ in
                UIApplication.shared.isIdleTimerDisabled = false
            }
        }

        func stopObservingCameraPermission() {
            if let purchaseObserver { NotificationCenter.default.removeObserver(purchaseObserver) }
            purchaseObserver = nil
            if let cameraObserver { NotificationCenter.default.removeObserver(cameraObserver) }
            cameraObserver = nil
            webView = nil
        }

        func stopObservingWorkoutScreenAwake() {
            if let inactiveObserver { NotificationCenter.default.removeObserver(inactiveObserver) }
            inactiveObserver = nil
            workoutActive = false
            refreshWorkoutScreenAwake()
        }

        func recoverIfNeeded() {
            guard recoveryPending, let webView,
                  applicationState() == .active else { return }
            recoveryPending = false
            automaticRecoveryUsed = true
            logger.notice("Starting deferred WebContent recovery")
            state.loading = true
            // Reload the existing view to retain its URL and persistent data store.
            if webView.reload() == nil {
                webView.load(URLRequest(url: NavigationPolicy.entryURL))
            }
        }

        private func refreshWorkoutScreenAwake() {
            UIApplication.shared.isIdleTimerDisabled = workoutActive && UIApplication.shared.applicationState == .active
        }

        private func refreshCameraPermission() {
            let denied = PrototypeWebView.cameraAccessDenied
            webView?.evaluateJavaScript("window.__moovxCameraDenied = \(denied ? "true" : "false")")
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "moovxWorkoutActive" {
                guard message.frameInfo.isMainFrame,
                      message.frameInfo.securityOrigin.protocol == "https",
                      message.frameInfo.securityOrigin.host == "app.moovx.ch",
                      let active = message.body as? Bool else { return }
                workoutActive = active
                refreshWorkoutScreenAwake()
                if active { RestNotificationManager.shared.prepareAuthorization() }
                return
            }
            if message.name == "moovxRestTimer" {
                guard message.frameInfo.isMainFrame,
                      message.frameInfo.securityOrigin.protocol == "https",
                      message.frameInfo.securityOrigin.host == "app.moovx.ch",
                      let command = RestTimerMessagePolicy.parse(message.body) else { return }
                switch command {
                case .schedule(let deadline):
                    RestNotificationManager.shared.schedule(at: deadline, onUnavailable: { [weak self] in
                        self?.state.notificationUnavailable = true
                    })
                case .cancel:
                    RestNotificationManager.shared.cancel()
                }
                return
            }
            guard message.name == "moovxCameraDenied", message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.host == "app.moovx.ch",
                  PrototypeWebView.cameraAccessDenied else { return }
            state.cameraDenied = true
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard NavigationPolicy.allows(action.request.url), action.targetFrame != nil else {
                state.blocked = true
                if action.targetFrame?.isMainFrame != false { state.loading = false }
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            appleAuth.cancel()
            applePurchases.cancel()
            workoutActive = false
            refreshWorkoutScreenAwake()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            state.loading = false
            if automaticRecoveryUsed {
                logger.notice("WebContent recovery navigation completed")
                state.recovered = true
                // A completed reload ends this recovery attempt. A later background
                // eviction gets its own attempt; an interruption during reload does not.
                automaticRecoveryUsed = false
            }
            refreshCameraPermission()
#if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--rest-bridge-probe") {
                let deadline = Int(Date().addingTimeInterval(30).timeIntervalSince1970 * 1000)
                webView.evaluateJavaScript("window.webkit.messageHandlers.moovxRestTimer.postMessage({action:'schedule',deadlineMs:\(deadline)})")
            }
#endif
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            showFailure(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            showFailure(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            // Lifecycle metadata only: never log URLs, account details or page content.
            logger.notice("WebContent terminated; active: \(self.applicationState() == .active, privacy: .public); recovery in progress: \(self.automaticRecoveryUsed, privacy: .public)")
            appleAuth.cancel()
            applePurchases.cancel()
            workoutActive = false
            refreshWorkoutScreenAwake()
            state.recovered = false
            if applicationState() != .active && !automaticRecoveryUsed {
                recoveryPending = true
                state.loading = true
                return
            }
            recoveryPending = false
            state.loading = false
            state.error = "Le contenu a été interrompu. Recharge la page puis vérifie tes dernières saisies ; aucune sauvegarde hors ligne n’est garantie."
        }

        private func showFailure(_ error: Error) {
            if (error as NSError).code == NSURLErrorCancelled { return }
            state.loading = false
            state.error = "Vérifie ta connexion puis réessaie. Aucun détail de session n’est affiché dans les logs."
        }
    }
}
