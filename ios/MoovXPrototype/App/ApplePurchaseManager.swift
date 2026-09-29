import StoreKit
import Foundation

/// StoreKit owns the durable unfinished queue. No credentials or JWS are written to disk.
@MainActor
final class ApplePurchaseManager {
    static let shared = ApplePurchaseManager()
    static let changed = Notification.Name("MoovXAppleTransactionsAvailable")
    private var listener: Task<Void, Never>?
    private var pending: [UInt64: VerificationResult<Transaction>] = [:]
    private var purchasing = false

    func start() {
        guard listener == nil else { return }
        listener = Task { [weak self] in
            for await result in Transaction.updates {
                guard !Task.isCancelled else { return }
                self?.remember(result)
            }
        }
    }
    private func remember(_ result: VerificationResult<Transaction>) {
        guard case .verified(let transaction) = result,
              AthenaOffer(rawValue: transaction.productID) != nil else { return }
        pending[transaction.id] = result
        NotificationCenter.default.post(name: Self.changed, object: nil)
    }
    func purchase(productID: String, token: UUID, canPresent: () -> Bool = { true }) async throws -> [String: Any] {
        guard !purchasing else { throw PurchaseError.busy }
        purchasing = true
        defer { purchasing = false }
        let products = try await AthenaCatalog.load()
        guard let product = products.first(where: { $0.id == productID }) else { throw PurchaseError.invalid }
        guard canPresent() else { throw PurchaseError.invalid }
        switch try await product.purchase(options: [.appAccountToken(token)]) {
        case .success(let result):
            guard case .verified(let transaction) = result, transaction.appAccountToken == token else { throw PurchaseError.invalid }
            remember(result)
            return ["status": "success", "transactions": try payloads(token: token)]
        case .pending: return ["status": "pending"]
        case .userCancelled: return ["status": "cancelled"]
        @unknown default: throw PurchaseError.invalid
        }
    }
    func collect(token: UUID, restore: Bool) async throws -> [String: Any] {
        // AppStore.sync may prompt for authentication: only explicit Restore invokes it.
        if restore { try await AppStore.sync() }
        for await result in Transaction.unfinished { remember(result) }
        if restore {
            for await result in Transaction.currentEntitlements { remember(result) }
        }
        return ["status": "success", "transactions": try payloads(token: token)]
    }
    func payloads(token: UUID) throws -> [[String: String]] {
        var values: [[String: String]] = []
        for id in pending.keys.sorted() {
            guard let result = pending[id], case .verified(let transaction) = result,
                  transaction.appAccountToken == token else { continue }
            let jws = result.jwsRepresentation
            guard jws.utf8.count <= 32768 else { throw PurchaseError.invalid }
            values.append(["id": String(transaction.id), "signedTransaction": jws])
            if values.count == 20 { break }
        }
        return values
    }
    /// Called only after the web coordinator receives the durable server acknowledgement.
    func finish(id: UInt64, token: UUID) async throws {
        guard let result = pending[id], case .verified(let transaction) = result,
              transaction.appAccountToken == token else { throw PurchaseError.invalid }
        await transaction.finish()
        pending.removeValue(forKey: id)
    }
    enum PurchaseError: Error { case busy, invalid }
}
