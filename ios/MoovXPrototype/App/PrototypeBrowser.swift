import SwiftUI
import WebKit
import Combine

@MainActor
final class BrowserState: ObservableObject {
    @Published var loading = true
    @Published var error: String?
    @Published var blocked = false
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
                }
            }
            .background(Color(red: 0.045, green: 0.04, blue: 0.025))
            .alert("Navigation non disponible", isPresented: $state.blocked) {
                Button("Compris", role: .cancel) {}
            } message: {
                Text("Ce prototype reste sur app.moovx.ch. Les paiements et les connexions via un site externe ne sont pas encore intégrés.")
            }
    }
}

struct PrototypeWebView: UIViewRepresentable {
    @ObservedObject var state: BrowserState

    func makeCoordinator() -> Coordinator { Coordinator(state: state) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        // Separate simulator app sandbox; no import of Safari credentials or JS bridge.
        configuration.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = UIColor(red: 0.045, green: 0.04, blue: 0.025, alpha: 1)
        view.scrollView.backgroundColor = view.backgroundColor
        view.navigationDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: NavigationPolicy.entryURL))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.stopLoading()
        uiView.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let state: BrowserState
        init(state: BrowserState) { self.state = state }

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
