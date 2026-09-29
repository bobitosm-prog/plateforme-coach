import StoreKit
import WebKit

@MainActor
final class ApplePurchaseBridge: NSObject, WKScriptMessageHandlerWithReply {
    private var generation = UUID()
    func cancel() { generation = UUID() }

    func userContentController(_ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == "app.moovx.ch",
              [0, 443].contains(message.frameInfo.securityOrigin.port),
              NavigationPolicy.allows(message.webView?.url),
              UIApplication.shared.applicationState == .active,
              let body = message.body as? [String: String], let action = body["action"] else {
            replyHandler(nil, "apple_purchase_unavailable"); return
        }
        let requestGeneration = generation
        Task { [weak self] in
            do {
                guard self?.generation == requestGeneration else { throw ApplePurchaseManager.PurchaseError.invalid }
                let result: [String: Any]
                if action == "manage" {
                    guard let scene = message.webView?.window?.windowScene else { throw ApplePurchaseManager.PurchaseError.invalid }
                    try await AppStore.showManageSubscriptions(in: scene)
                    result = ["status": "success"]
                } else if action == "products" {
                    let products = try await AthenaCatalog.load()
                    result = ["status": "success", "products": products.map { ["id": $0.id, "displayPrice": $0.displayPrice] }]
                } else {
                    guard let value = body["appAccountToken"], let token = UUID(uuidString: value) else { throw ApplePurchaseManager.PurchaseError.invalid }
                    let manager = ApplePurchaseManager.shared
                    switch action {
                    case "purchase":
                        guard let productID = body["productId"], AthenaOffer(rawValue: productID) != nil else { throw ApplePurchaseManager.PurchaseError.invalid }
                        result = try await manager.purchase(productID: productID, token: token, canPresent: { [weak self] in
                            self?.generation == requestGeneration && UIApplication.shared.applicationState == .active
                        })
                    case "restore", "pending": result = try await manager.collect(token: token, restore: action == "restore")
                    case "finish":
                        guard let value = body["transactionId"], let id = UInt64(value) else { throw ApplePurchaseManager.PurchaseError.invalid }
                        try await manager.finish(id: id, token: token)
                        result = ["status": "success"]
                    default: throw ApplePurchaseManager.PurchaseError.invalid
                    }
                }
                guard self?.generation == requestGeneration else { replyHandler(nil, "apple_purchase_navigation_changed"); return }
                replyHandler(result, nil)
            } catch { replyHandler(nil, "apple_purchase_unavailable") }
        }
    }
}
