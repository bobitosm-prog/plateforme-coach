import Foundation

enum AppleSignInPolicy {
    static func allows(isMainFrame: Bool, scheme: String, host: String, port: Int,
                       currentURL: URL?, nonce: String?) -> Bool {
        guard isMainFrame, scheme == "https", host == "app.moovx.ch",
              port == 0 || port == 443, NavigationPolicy.allows(currentURL),
              let nonce, nonce.count == 64,
              nonce.allSatisfy({ "0123456789abcdef".contains($0) }) else { return false }
        return true
    }
}
