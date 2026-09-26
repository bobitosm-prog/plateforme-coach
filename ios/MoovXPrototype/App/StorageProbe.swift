#if STORAGE_PROBE
import SwiftUI
import WebKit

/// Synthetic-only executable mode. Build with a separate bundle identifier.
/// No requests, credentials, real workout data or production website content.
struct StorageProbeView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.loadHTMLString("<html><body>MoovX synthetic storage probe</body></html>", baseURL: URL(string: "https://storage-probe.invalid/"))
        return view
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard Bundle.main.bundleIdentifier == "ch.moovx.storageprobe" else { return }
            let write = ProcessInfo.processInfo.arguments.contains("--write")
            let javascript = """
            (() => {
              const key = 'moovx_synthetic_storage_probe';
              try {
                if (\(write ? "true" : "false")) localStorage.setItem(key, JSON.stringify({version:2, completedSets:2, marker:'synthetic-only'}));
                const saved = JSON.parse(localStorage.getItem(key) || 'null');
                return {mode:'\(write ? "write" : "read")', found:saved?.marker === 'synthetic-only', completedSets:saved?.completedSets ?? null};
              } catch (error) { return {mode:'error', name:error.name}; }
            })()
            """
            webView.evaluateJavaScript(javascript) { result, error in
                var report = (result as? [String: Any]) ?? ["mode": "native-error", "failed": error != nil]
                report["recordedAt"] = ISO8601DateFormatter().string(from: Date())
                report["build"] = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion")
                guard let data = try? JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]),
                      let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
                try? data.write(to: documents.appendingPathComponent("storage-probe-result.json"), options: .atomic)
            }
        }
    }
}
#endif
