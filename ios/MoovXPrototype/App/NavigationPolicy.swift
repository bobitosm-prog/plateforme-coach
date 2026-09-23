import Foundation

/// Prototype navigation boundary, not a network firewall or an IAP implementation.
enum NavigationPolicy {
    static let entryURL = URL(string: "https://app.moovx.ch/login")!

    static func allows(_ url: URL?) -> Bool {
        guard let url, url.scheme?.lowercased() == "https",
              url.host?.lowercased() == "app.moovx.ch",
              url.user == nil, url.password == nil,
              url.port == nil || url.port == 443 else { return false }
        return true
    }
}
