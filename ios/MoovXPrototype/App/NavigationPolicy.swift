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
