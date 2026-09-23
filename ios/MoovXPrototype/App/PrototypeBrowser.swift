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
        // Separate app sandbox; no Safari credentials. The bridge only reports a denied camera tap.
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
        coordinator.stopObservingCameraPermission()
    }

    private static var cameraAccessDenied: Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        return status == .denied || status == .restricted
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let state: BrowserState
        private weak var webView: WKWebView?
        private var cameraObserver: NSObjectProtocol?
        init(state: BrowserState) { self.state = state }

        func observeCameraPermission(on webView: WKWebView) {
            self.webView = webView
            cameraObserver = NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
                self?.refreshCameraPermission()
            }
        }

        func stopObservingCameraPermission() {
            if let cameraObserver { NotificationCenter.default.removeObserver(cameraObserver) }
            cameraObserver = nil
            webView = nil
        }

        private func refreshCameraPermission() {
            let denied = PrototypeWebView.cameraAccessDenied
            webView?.evaluateJavaScript("window.__moovxCameraDenied = \(denied ? "true" : "false")")
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
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

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            state.loading = false
            refreshCameraPermission()
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            showFailure(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            showFailure(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
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
