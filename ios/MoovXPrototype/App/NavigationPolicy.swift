import Foundation

/// Prototype navigation boundary, not a network firewall or an IAP implementation.
enum NavigationPolicy {
    static let entryURL = URL(string: "https://app.moovx.ch/login")!

    // Only the public registration landing may leave the app in the system browser.
    static func opensRegistration(_ url: URL?) -> Bool {
        guard let url, url.scheme == "https", url.host == "moovx.ch",
              url.user == nil, url.password == nil, url.port == nil,
              url.path.isEmpty || url.path == "/" else { return false }
        return URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains(URLQueryItem(name: "source", value: "ios")) == true
    }

    // Legal links leave the webview only after a user tap. Keep the allowlist
    // limited to public policy documents; never allow arbitrary external pages.
    static func opensPrivacyDocument(_ url: URL?) -> Bool {
        guard let url, url.scheme == "https", url.user == nil, url.password == nil,
              url.port == nil || url.port == 443, url.query == nil else { return false }
        if ["moovx.ch", "app.moovx.ch"].contains(url.host ?? "") {
            return ["/fr/privacy", "/en/privacy", "/de/privacy"].contains(url.path)
        }
        return url.host == "privacy.claude.com"
            && ["", "/", "/en", "/fr", "/de"].contains(url.path)
    }

    static func confirmationReturn(_ url: URL) -> URL? {
        guard url.scheme == "moovx", url.host == "auth", url.path == "/confirmed",
              url.user == nil, url.password == nil, url.port == nil else { return nil }
        // This is a navigation hint only; email/password login still validates identity.
        let join = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains(URLQueryItem(name: "next", value: "/join")) == true
        return URL(string: "https://app.moovx.ch/login?confirmed=1" + (join ? "&next=%2Fjoin" : ""))
    }

    static func allows(_ url: URL?) -> Bool {
        guard let url, url.scheme?.lowercased() == "https",
              url.host?.lowercased() == "app.moovx.ch",
              url.user == nil, url.password == nil,
              url.port == nil || url.port == 443 else { return false }
        return true
    }
}
