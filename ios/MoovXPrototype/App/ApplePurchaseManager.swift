import StoreKit
import Foundation
import UIKit
import os

/// StoreKit owns the durable unfinished queue. No credentials or JWS are written to disk.
@MainActor
final class ApplePurchaseManager {
    static let shared = ApplePurchaseManager()
    static let changed = Notification.Name("MoovXAppleTransactionsAvailable")
    private var listener: Task<Void, Never>?
    private var pending: [UInt64: VerificationResult<Transaction>] = [:]
    private var purchasing = false
    private let logger = Logger(subsystem: "ch.moovx.app", category: "ApplePurchases")

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
    func purchase(productID: String, token: UUID, scene: UIWindowScene? = nil, canPresent: () -> Bool = { true }) async throws -> [String: Any] {
        guard !purchasing else { throw PurchaseError.busy }
        purchasing = true
        defer { purchasing = false }
        let products: [Product]
        do { products = try await AthenaCatalog.load() }
        catch {
            let failure = error as NSError
            logger.error("Catalog reload failed: \(failure.domain, privacy: .public) / \(failure.code, privacy: .public)")
            throw PurchaseError.catalogUnavailable
        }
        guard let product = products.first(where: { $0.id == productID }) else { throw PurchaseError.catalogUnavailable }
        guard canPresent() else { throw PurchaseError.presentationUnavailable }
        // UIKit must give StoreKit the scene that owns the tapped purchase button.
        // The no-scene path is retained for the StoreKit test harness only.
        let outcome: Product.PurchaseResult
        do {
            outcome = try await { () async throws -> Product.PurchaseResult in
                if let scene { return try await product.purchase(confirmIn: scene, options: [.appAccountToken(token)]) }
                return try await product.purchase(options: [.appAccountToken(token)])
            }()
        } catch {
            let failure = error as NSError
            logger.error("StoreKit purchase failed: \(failure.domain, privacy: .public) / \(failure.code, privacy: .public)")
            throw PurchaseError.storeKit(failure.code)
        }
        switch outcome {
        case .success(let result):
            guard case .verified(let transaction) = result else { throw PurchaseError.unverified }
            guard transaction.appAccountToken == token else {
                if let mismatch = archivedMismatchReason(transaction) {
                    logger.error("StoreKit returned another account's transaction; reason: \(mismatch.rawValue, privacy: .public)")
                    throw PurchaseError.accountMismatch(mismatch)
                }
                let jws = result.jwsRepresentation
                guard jws.utf8.count <= 32768 else { throw PurchaseError.invalid }
                remember(result)
                return ["status": "archivedCandidate", "transaction": ["id": String(transaction.id), "signedTransaction": jws]]
            }
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
    /// The server must first acknowledge recorded evidence from a deleted account.
    func finishArchived(id: UInt64, token: UUID) async throws {
        guard let result = pending[id], case .verified(let transaction) = result,
              transaction.appAccountToken != token,
              isExpiredSandboxSubscription(transaction) else { throw PurchaseError.invalid }
        await transaction.finish()
        pending.removeValue(forKey: id)
    }
    private func isExpiredSandboxSubscription(_ transaction: Transaction) -> Bool {
        archivedMismatchReason(transaction) == nil
    }
    private func archivedMismatchReason(_ transaction: Transaction) -> AccountMismatchReason? {
        if transaction.environment != .sandbox { return .environment }
        if transaction.productID != AthenaOffer.monthly.rawValue && transaction.productID != AthenaOffer.yearly.rawValue { return .product }
        guard let expiry = transaction.expirationDate else { return .noExpiry }
        if expiry >= Date().addingTimeInterval(-300) { return .notExpired }
        return nil
    }
    enum AccountMismatchReason: String {
        case environment, product, noExpiry = "no_expiry", notExpired = "not_expired"
    }
    enum PurchaseError: Error {
        case busy, invalid, catalogUnavailable, presentationUnavailable, unverified
        case accountMismatch(AccountMismatchReason)
        case storeKit(Int)
    }
}
