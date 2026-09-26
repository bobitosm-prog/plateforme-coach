import SwiftUI
import WebKit
import Combine
import AVFoundation

@MainActor
final class BrowserState: ObservableObject {
    @Published var loading = true
    @Published var error: String?
    @Published var blocked = false
    @Published var cameraDenied = false
    @Published var notificationUnavailable = false
    @Published var reloadID = 0
}

struct PrototypeBrowser: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var state = BrowserState()

    var body: some View {
            VStack(spacing: 0) {
                HStack {
                    Text("MoovX · TEST / PRODUCTION").font(.caption.bold())
                    Spacer()
                    Button("Fermer") { dismiss() }.frame(minWidth: 60, minHeight: 44)
                }.padding(.horizontal, 12).background(.yellow.opacity(0.15))
                if state.loading { ProgressView("Chargement de MoovX…").padding() }
                if let error = state.error {
                    ContentUnavailableView {
                        Label("Chargement interrompu", systemImage: "wifi.exclamationmark")
                    } description: { Text(error) } actions: {
                        Button("Réessayer") {
                            state.error = nil
                            state.loading = true
                            state.reloadID += 1
                        }
                    }
                } else {
                    PrototypeWebView(state: state).id(state.reloadID)
                        .alert("Navigation non disponible", isPresented: $state.blocked) {
                            Button("Compris", role: .cancel) {}
                        } message: {
                            Text("Ce prototype reste sur app.moovx.ch. Les paiements et les connexions via un site externe ne sont pas encore intégrés.")
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
        // Separate app sandbox; no Safari credentials. Messages contain only
        // camera permission or workout visibility state, never workout data.
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
        coordinator.stopObservingCameraPermission()
        coordinator.stopObservingWorkoutScreenAwake()
    }

    private static var cameraAccessDenied: Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        return status == .denied || status == .restricted
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let state: BrowserState
        private weak var webView: WKWebView?
        private var cameraObserver: NSObjectProtocol?
        private var inactiveObserver: NSObjectProtocol?
        private var workoutActive = false
        init(state: BrowserState) { self.state = state }

        func observeCameraPermission(on webView: WKWebView) {
            self.webView = webView
            cameraObserver = NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
                self?.refreshCameraPermission()
                self?.refreshWorkoutScreenAwake()
            }
            inactiveObserver = NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { _ in
                UIApplication.shared.isIdleTimerDisabled = false
            }
        }

        func stopObservingCameraPermission() {
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
            workoutActive = false
            refreshWorkoutScreenAwake()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            state.loading = false
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
            workoutActive = false
            refreshWorkoutScreenAwake()
            state.loading = false
            state.error = "Le contenu a été interrompu. Recharge la page ; aucune sauvegarde hors ligne n’est garantie."
        }

        private func showFailure(_ error: Error) {
            if (error as NSError).code == NSURLErrorCancelled { return }
            state.loading = false
            state.error = "Vérifie ta connexion puis réessaie. Aucun détail de session n’est affiché dans les logs."
        }
    }
}
