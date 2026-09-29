import AuthenticationServices
import WebKit

/// A reply belongs to the originating JS call, never to a global window callback.
@MainActor
final class AppleSignInBridge: NSObject, WKScriptMessageHandlerWithReply,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var reply: ((Any?, String?) -> Void)?
    private var controller: ASAuthorizationController?
    private weak var anchor: UIWindow?
    private var timeout: Task<Void, Never>?

    func userContentController(_ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any],
              let nonce = body["nonce"] as? String,
              AppleSignInPolicy.allows(isMainFrame: message.frameInfo.isMainFrame,
                  scheme: message.frameInfo.securityOrigin.protocol,
                  host: message.frameInfo.securityOrigin.host,
                  port: message.frameInfo.securityOrigin.port,
                  currentURL: message.webView?.url, nonce: nonce),
              let window = message.webView?.window,
              UIApplication.shared.applicationState == .active else {
            replyHandler(nil, "apple_sign_in_unavailable")
            return
        }
        guard reply == nil else { replyHandler(nil, "apple_sign_in_busy"); return }
        reply = replyHandler
        anchor = window
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email, .fullName]
        request.nonce = nonce
        let controller = ASAuthorizationController(authorizationRequests: [request])
        self.controller = controller
        controller.delegate = self
        controller.presentationContextProvider = self
        timeout = Task { [weak self] in
            try? await Task.sleep(for: .seconds(120))
            guard !Task.isCancelled else { return }
            self?.cancel()
        }
        controller.performRequests()
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        anchor ?? ASPresentationAnchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard controller === self.controller else { return }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken, let token = String(data: data, encoding: .utf8) else {
            finish(nil, error: "apple_sign_in_failed")
            return
        }
        var result: [String: Any] = ["status": "success", "identityToken": token]
        if let name = credential.fullName {
            let formatted = PersonNameComponentsFormatter().string(from: name)
            if !formatted.isEmpty { result["fullName"] = formatted }
        }
        finish(result)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard controller === self.controller else { return }
        if (error as? ASAuthorizationError)?.code == .canceled {
            finish(["status": "cancelled"])
        } else {
            finish(nil, error: "apple_sign_in_failed")
        }
    }

    // Navigation/teardown discards a late Apple credential from the old document.
    func cancel() {
        controller?.cancel()
        finish(nil, error: "apple_sign_in_cancelled")
    }

    private func finish(_ value: Any?, error: String? = nil) {
        let completion = reply
        reply = nil
        controller = nil
        anchor = nil
        timeout?.cancel()
        timeout = nil
        completion?(value, error)
    }
}
